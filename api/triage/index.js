const Busboy = require("busboy");
const { buildTriageMessage } = require("../prompts.js");

const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "https://magroupai.openai.azure.com";
const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini-version2024-07-18";
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

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

async function aoaiFetch(deploymentName, options = {}) {
  const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
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

function makeDataUrl({ mimeType, buffer }) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function callChatCompletions(textPrompt, imageDataUrls) {
  const contentParts = [{ type: "text", text: textPrompt }];
  imageDataUrls.forEach(url => {
    contentParts.push({ type: "image_url", image_url: { url, detail: "auto" } });
  });

  return aoaiFetch(deploymentName, {
    method: "POST",
    body: JSON.stringify({
      messages: [{ role: "user", content: contentParts }],
      max_tokens: 1000,
      temperature: 0.7
    })
  });
}

module.exports = async function (context, req) {
  // Set CORS headers on ALL responses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*"
  };

  if (req.method === "OPTIONS") {
    context.res = {
      status: 204,
      headers: corsHeaders
    };
    return;
  }

  // DEBUG LOGGING
  context.log("=== MARV TRIAGE START ===");
  context.log("Endpoint:", endpoint);
  context.log("Deployment:", deploymentName);
  context.log("API Version:", apiVersion);
  context.log("API Key present:", !!apiKey);
  context.log("API Key first 10 chars:", apiKey ? apiKey.substring(0, 10) + "..." : "MISSING");
  context.log("Full URL will be:", `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`);
  context.log("=== MARV DEBUG END ===");

  try {
    if (!endpoint || !apiKey || !deploymentName) {
      context.log("ERROR: Missing config - endpoint:", !!endpoint, "apiKey:", !!apiKey, "deployment:", !!deploymentName);
      return json(context, 500, { error: "Missing Azure OpenAI config" });
    }

    const ct = (req.headers && req.headers["content-type"]) || "";
    if (!ct.includes("multipart/form-data")) {
      return json(context, 400, { error: "Content-Type must be multipart/form-data" });
    }

    const { fields, files } = await parseMultipart(req);
    const name = (fields.name || "").trim();
    const email = (fields.email || "").trim();
    const postcode = (fields.postcode || "").trim();
    const description = (fields.description || "").trim();
    
    // Get validated metadata from user confirmation
    const validatedMaterial = (fields.material || "").trim();
    const validatedDamageType = (fields.damageType || "").trim();
    const validatedNotes = (fields.notes || "").trim();

    const imageDataUrls = files
      .filter(f => f.buffer && f.buffer.length > 0)
      .map(f => makeDataUrl(f));

    context.log(`Parsed form: name=${name}, email=${email}, images=${imageDataUrls.length}`);
    context.log(`Validated data: material=${validatedMaterial}, damageType=${validatedDamageType}`);

    if (imageDataUrls.length === 0) {
      return json(context, 400, { error: "At least one image required" });
    }

    // Build prompt using centralized function
    const prompt = buildTriageMessage({
      name,
      email,
      postcode,
      description,
      material: validatedMaterial,
      damageType: validatedDamageType,
      notes: validatedNotes
    });

    context.log("Prompt built, calling Azure OpenAI...");
    const response = await callChatCompletions(prompt, imageDataUrls);
    context.log("Azure OpenAI responded successfully");
    
    const resultText = response.choices?.[0]?.message?.content || "No response";

    return json(context, 200, { ok: true, result_text: resultText });

  } catch (err) {
    context.log.error("ERROR:", err.message);
    context.log.error("Full error:", JSON.stringify(err, null, 2));
    return json(context, 500, { error: err.message });
  }
};
