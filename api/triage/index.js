const Busboy = require("busboy");
const { buildTriageMessage, API_CONFIG } = require("../prompts.js");

const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "https://magroupai.openai.azure.com";
const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";
const assistantId = process.env.AZURE_OPENAI_ASSISTANT_ID; // Your trained assistant ID

function json(context, status, body) {
  context.res = {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Credentials": "false"
    },
    body
  };
}

async function aoaiFetch(path, options = {}) {
  const url = `${endpoint}${path}?api-version=${encodeURIComponent(apiVersion)}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure OpenAI request failed: ${res.status} ${res.statusText} — ${text}`);
  }
  return res.json();
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const headers = req.headers || {};
    const bb = Busboy({ headers });
    const fields = {};
    const files = [];

    bb.on("field", (name, val) => { fields[name] = val; });
    bb.on("file", (name, file, info) => {
      const { filename, mimeType } = info;
      const chunks = [];
      file.on("data", (d) => chunks.push(d));
      file.on("limit", () => reject(new Error("File too large")));
      file.on("end", () => {
        files.push({ filename, mimeType, buffer: Buffer.concat(chunks) });
      });
    });
    bb.on("error", reject);
    bb.on("finish", () => resolve({ fields, files }));

    const body = req.body ?? req.rawBody;
    if (Buffer.isBuffer(body)) {
      bb.end(body);
    } else if (typeof body === "string") {
      bb.end(Buffer.from(body, "utf8"));
    } else {
      reject(new Error("No raw body available"));
    }
  });
}

/**
 * Upload file to Azure OpenAI for use with Assistant
 */
async function uploadFile(fileBuffer, filename, mimeType) {
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  formData.append('file', blob, filename);
  formData.append('purpose', 'assistants');

  const url = `${endpoint}/openai/files?api-version=${apiVersion}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': apiKey
    },
    body: formData
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`File upload failed: ${res.status} - ${text}`);
  }

  const result = await res.json();
  return result.id; // Returns file ID
}

/**
 * Create a thread with the Assistant
 */
async function createThread() {
  return await aoaiFetch('/openai/threads', {
    method: 'POST',
    body: JSON.stringify({})
  });
}

/**
 * Add a message to the thread with file attachments
 */
async function addMessage(threadId, content, fileIds = []) {
  const attachments = fileIds.map(fileId => ({
    file_id: fileId,
    tools: [{ type: "file_search" }]
  }));

  return await aoaiFetch(`/openai/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      role: "user",
      content: content,
      attachments: attachments.length > 0 ? attachments : undefined
    })
  });
}

/**
 * Run the assistant on the thread
 */
async function runAssistant(threadId) {
  return await aoaiFetch(`/openai/threads/${threadId}/runs`, {
    method: 'POST',
    body: JSON.stringify({
      assistant_id: assistantId,
      instructions: API_CONFIG.triage.instructions,
      temperature: API_CONFIG.triage.temperature,
      max_tokens: API_CONFIG.triage.maxTokens
    })
  });
}

/**
 * Poll for run completion
 */
async function waitForRunCompletion(threadId, runId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const run = await aoaiFetch(`/openai/threads/${threadId}/runs/${runId}`, {
      method: 'GET'
    });

    if (run.status === 'completed') {
      return run;
    } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
      throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
    }

    // Wait 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Run timed out after 60 seconds');
}

/**
 * Get assistant's response from thread
 */
async function getAssistantResponse(threadId) {
  const messages = await aoaiFetch(`/openai/threads/${threadId}/messages`, {
    method: 'GET'
  });

  // Get the last assistant message
  const assistantMessages = messages.data.filter(m => m.role === 'assistant');
  if (assistantMessages.length === 0) {
    throw new Error('No assistant response found');
  }

  const lastMessage = assistantMessages[0];
  const textContent = lastMessage.content.find(c => c.type === 'text');
  
  return textContent ? textContent.text.value : 'No text response';
}

module.exports = async function (context, req) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    context.res = {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      }
    };
    return;
  }

  context.log("=== MARV TRIAGE (ASSISTANT API) START ===");
  context.log("Endpoint:", endpoint);
  context.log("Assistant ID:", assistantId);
  context.log("API Version:", apiVersion);
  context.log("API Key present:", !!apiKey);

  try {
    if (!endpoint || !apiKey || !assistantId) {
      context.log("ERROR: Missing config - endpoint:", !!endpoint, "apiKey:", !!apiKey, "assistantId:", !!assistantId);
      return json(context, 500, { 
        error: "Missing Azure OpenAI configuration. Please set AZURE_OPENAI_ASSISTANT_ID in environment variables." 
      });
    }

    const ct = (req.headers && req.headers["content-type"]) || "";
    if (!ct.includes("multipart/form-data")) {
      return json(context, 400, { error: "Content-Type must be multipart/form-data" });
    }

    // Parse form data
    const { fields, files } = await parseMultipart(req);
    const name = (fields.name || "").trim();
    const email = (fields.email || "").trim();
    const postcode = (fields.postcode || "").trim();
    const description = (fields.description || "").trim();
    const material = (fields.material || "").trim();
    const damageType = (fields.damageType || "").trim();
    const notes = (fields.notes || "").trim();

    context.log(`Processing triage for: ${name} (${email})`);
    context.log(`Images received: ${files.length}`);

    if (files.length === 0) {
      return json(context, 400, { error: "At least one image required" });
    }

    // Step 1: Upload all images to Azure OpenAI
    context.log("Uploading images to Azure OpenAI...");
    const fileIds = [];
    for (const file of files) {
      try {
        const fileId = await uploadFile(file.buffer, file.filename, file.mimeType);
        fileIds.push(fileId);
        context.log(`Uploaded: ${file.filename} -> ${fileId}`);
      } catch (err) {
        context.log.error(`Failed to upload ${file.filename}:`, err.message);
      }
    }

    if (fileIds.length === 0) {
      throw new Error("Failed to upload any images");
    }

    // Step 2: Create a thread
    context.log("Creating thread...");
    const thread = await createThread();
    context.log(`Thread created: ${thread.id}`);

    // Step 3: Build message with context
    const message = buildTriageMessage({
      name,
      email,
      postcode,
      description,
      material,
      damageType,
      notes
    });

    // Step 4: Add message with image attachments
    context.log("Adding message to thread...");
    await addMessage(thread.id, message, fileIds);

    // Step 5: Run the assistant
    context.log("Running assistant...");
    const run = await runAssistant(thread.id);
    context.log(`Run started: ${run.id}`);

    // Step 6: Wait for completion
    context.log("Waiting for assistant response...");
    await waitForRunCompletion(thread.id, run.id);

    // Step 7: Get the response
    context.log("Retrieving assistant response...");
    const response = await getAssistantResponse(thread.id);

    context.log("=== MARV TRIAGE (ASSISTANT API) SUCCESS ===");

    return json(context, 200, { 
      ok: true, 
      result_text: response,
      thread_id: thread.id,
      run_id: run.id
    });

  } catch (err) {
    context.log.error("ERROR:", err.message);
    context.log.error("Stack:", err.stack);
    return json(context, 500, { error: err.message });
  }
};
