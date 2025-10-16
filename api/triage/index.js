// api/triage/index.js
// Azure Function (Node.js ESM) — MARV Triage Endpoint
// - Parses multipart form (name, email, postcode, description, images[])
// - Sends text + images to Azure OpenAI Assistants (file_search-enabled Assistant)
// - Returns assistant result as JSON

import Busboy from "busboy";

/**
 * --- Environment variables required ---
 * AZURE_OPENAI_ENDPOINT      e.g. https://magroupai.openai.azure.com
 * AZURE_OPENAI_API_KEY       your Azure OpenAI key
 * AZURE_OPENAI_ASSISTANT_ID  the Assistant created with tools:[{type:"file_search"}]
 *
 * Optional:
 * AZURE_OPENAI_API_VERSION   defaults to "2024-05-01-preview"
 */

const endpoint =
  process.env.AZURE_OPENAI_ENDPOINT || "https://magroupai.openai.azure.com";
const apiKey =
  process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY;
const assistantId =
  process.env.AZURE_OPENAI_ASSISTANT_ID || "asst_REPLACE_ME";
const apiVersion =
  process.env.AZURE_OPENAI_API_VERSION || "2024-05-01-preview";

// ---- Helpers ----

/** Basic JSON response helper (adds CORS on every response) */
function json(context, status, body) {
  const origin =
    (context.req && context.req.headers && context.req.headers.origin) || "*";
  context.res = {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    },
    body
  };
}

/** Simple wait */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Azure OpenAI REST wrapper (uses global fetch) */
async function aoaiFetch(path, options = {}) {
  const url = `${endpoint}/openai${path}${
    path.includes("?") ? "&" : "?"
  }api-version=${encodeURIComponent(apiVersion)}`;

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
    throw new Error(
      `Azure OpenAI request failed: ${res.status} ${res.statusText} — ${text}`
    );
  }
  return res.json();
}

/** Parse multipart/form-data into { fields, files[] } using the raw body buffer */
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const headers = req.headers || {};
    const bb = Busboy({ headers });
    const fields = {};
    const files = [];

    bb.on("field", (name, val) => {
      fields[name] = val;
    });

    bb.on("file", (name, file, info) => {
      const { filename, mimeType } = info;
      const chunks = [];
      file.on("data", (d) => chunks.push(d));
      file.on("limit", () => reject(new Error("File too large or limit reached.")));
      file.on("end", () => {
        const buffer = Buffer.concat(chunks);
        files.push({ filename, mimeType, buffer });
      });
    });

    bb.on("error", reject);
    bb.on("finish", () => resolve({ fields, files }));

    // IMPORTANT: Azure Functions' req is not a stream. Feed Busboy the raw body.
    const body = req.body ?? req.rawBody;
    if (Buffer.isBuffer(body)) {
      bb.end(body);
    } else if (typeof body === "string") {
      bb.end(Buffer.from(body, "utf8"));
    } else {
      reject(new Error("No raw body available for multipart parsing."));
    }
  });
}

/** Convert file buffers to data URLs for Assistants input_image */
function makeDataUrl({ mimeType, buffer }) {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

/** Create a thread */
async function createThread() {
  return aoaiFetch(`/assistants/threads`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

/** Create a user message with mixed content (text + images) */
async function createMessage(threadId, contentParts) {
  return aoaiFetch(`/assistants/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      role: "user",
      content: contentParts
    })
  });
}

/** Start a run */
async function createRun(threadId) {
  return aoaiFetch(`/assistants/threads/${threadId}/runs`, {
    method: "POST",
    body: JSON.stringify({
      assistant_id: assistantId
    })
  });
}

/** Get run status */
async function getRun(threadId, runId) {
  return aoaiFetch(`/assistants/threads/${threadId}/runs/${runId}`, {
    method: "GET"
  });
}

/** Get latest message(s) */
async function listMessages(threadId, limit = 10) {
  return aoaiFetch(
    `/assistants/threads/${threadId}/messages?order=desc&limit=${limit}`,
    { method: "GET" }
  );
}

/** Extract readable text from assistant message content parts */
function extractAssistantText(message) {
  if (!message || !message.content) return "";
  const parts = message.content;
  const texts = parts
    .filter((p) => p.type === "text" && p.text && p.text.value)
    .map((p) => p.text.value.trim());
  return texts.join("\n").trim();
}

// ---- Azure Function entrypoint ----

export default async function (context, req) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin || "*";
    context.res = {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    };
    return;
  }

  try {
    // Env validation
    if (!endpoint || !apiKey || !assistantId) {
      return json(context, 500, {
        error:
          "Missing AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, or AZURE_OPENAI_ASSISTANT_ID."
      });
    }

    // 🔎 Extra guard: make sure we're not about to send garbage
    context.log(`MARV env: endpoint=${endpoint}, assistantId=${assistantId}`);
    if (!assistantId.startsWith("asst_")) {
      return json(context, 500, {
        error: `Invalid assistant id resolved at runtime: "${assistantId}". Expected it to start with "asst_".`
      });
    }

    // Basic content-type validation
    const ct = (req.headers && req.headers["content-type"]) || "";
    if (!ct.includes("multipart/form-data")) {
      return json(context, 400, {
        error:
          "Content-Type must be multipart/form-data with fields and image files."
      });
    }

    // Parse multipart using raw body buffer (function.json sets dataType: binary)
    const { fields, files } = await parseMultipart(req);
    const name = (fields.name || "").trim();
    const email = (fields.email || "").trim();
    const postcode = (fields.postcode || "").trim();
    const description = (fields.description || fields.text || "").trim();

    // Convert uploaded files to data URLs for Assistants vision
    const imageDataUrls = (files || [])
      .filter((f) => f.buffer && f.buffer.length > 0)
      .map((f) => makeDataUrl({ mimeType: f.mimeType, buffer: f.buffer }));

    context.log(
      `Parsed form: name=${name}, email=${email}, postcode=${postcode}, description length=${description.length}, images=${imageDataUrls.length}`
    );

    // Build message content (text + input_image parts)
    const contentParts = [
      {
        type: "text",
        text:
          `Submitter: ${name || "N/A"} (${email || "N/A"})\n` +
          `Postcode: ${postcode || "N/A"}\n\n` +
          `Customer damage description:\n${description || "N/A"}\n\n` +
          `Please analyse these image(s) and description for surface repair triage.\n` +
          `Return a clear decision and rationale. If critical details are missing (material or finish), ask up to 2 concise clarifying questions.`
      },
      ...imageDataUrls.map((url) => ({
        type: "input_image",
        image_url: { url, detail: "auto" }
      }))
    ];

    // 1) Create thread
    const thread = await createThread();

    // 2) Post message
    await createMessage(thread.id, contentParts);

    // 3) Run with your Assistant (must be tools:[{type:"file_search"}])
    let run = await createRun(thread.id);

    // 4) Poll until completed (or timeout)
    const startedAt = Date.now();
    const timeoutMs = 60_000;
    const pollInterval = 800;

    while (run.status === "queued" || run.status === "in_progress") {
      if (Date.now() - startedAt > timeoutMs) {
        return json(context, 504, {
          error: "Run timed out waiting for completion.",
          status: run.status
        });
      }
      await sleep(pollInterval);
      run = await getRun(thread.id, run.id);
    }

    if (run.status !== "completed") {
      return json(context, 500, {
        error: "Run did not complete successfully.",
        status: run.status,
        last_error: run.last_error || null
      });
    }

    // 5) Read latest assistant message
    const messages = await listMessages(thread.id, 5);
    const assistantMsg = messages.data.find((m) => m.role === "assistant");
    const text = extractAssistantText(assistantMsg);

    return json(context, 200, {
      ok: true,
      thread_id: thread.id,
      run_id: run.id,
      result_text: text
    });
  } catch (err) {
    context.log.error(err);
    return json(context, 500, { error: err.message || "Unexpected error." });
  }
}
