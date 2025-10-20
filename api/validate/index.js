const Busboy = require("busboy");
const { buildValidationPrompt, API_CONFIG } = require("../prompts.js");

const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "https://magroupai.openai.azure.com";
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

function json(context, status, body) {
  context.res = {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    },
    body
  };
}

async function aoaiFetch(options = {}) {
  const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
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

async function validateImages(imageDataUrls, description, context) {
  context.log("Building validation prompt...");
  const promptText = buildValidationPrompt(description);
  context.log("Prompt built, length:", promptText.length);
  
  const contentParts = [{ 
    type: "text", 
    text: promptText
  }];
  
  context.log("Adding", imageDataUrls.length, "images to content");
  imageDataUrls.forEach((url, index) => {
    contentParts.push({ type: "image_url", image_url: { url, detail: "high" } });
    context.log(`Image ${index + 1}: ${url.substring(0, 50)}...`);
  });

  context.log("Calling Azure OpenAI with config:", JSON.stringify(API_CONFIG.validation));
  
  const response = await aoaiFetch({
    method: "POST",
    body: JSON.stringify({
      messages: [{ role: "user", content: contentParts }],
      ...API_CONFIG.validation
    })
  });

  context.log("Azure OpenAI responded successfully");
  const resultText = response.choices?.[0]?.message?.content || "{}";
  context.log("Result text:", resultText);
  
  return JSON.parse(resultText);
}

module.exports = async function (context, req) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*"
  };

  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders };
    return;
  }

  context.log("=== VALIDATE ENDPOINT START ===");
  context.log("Endpoint:", endpoint);
  context.log("Deployment:", deploymentName);
  context.log("API Version:", apiVersion);
  context.log("API Key present:", !!apiKey);

  try {
    if (!endpoint || !apiKey || !deploymentName) {
      context.log("ERROR: Missing config");
      return json(context, 500, { error: "Missing Azure OpenAI config" });
    }

    const ct = (req.headers && req.headers["content-type"]) || "";
    if (!ct.includes("multipart/form-data")) {
      context.log("ERROR: Wrong content type:", ct);
      return json(context, 400, { error: "Content-Type must be multipart/form-data" });
    }

    context.log("Parsing multipart form data...");
    const { fields, files } = await parseMultipart(req);
    const description = (fields.description || "").trim();
    context.log("Description:", description);
    context.log("Files received:", files.length);

    const imageDataUrls = files
      .filter(f => f.buffer && f.buffer.length > 0)
      .map(f => makeDataUrl(f));

    context.log(`Processing ${imageDataUrls.length} valid images`);

    if (imageDataUrls.length === 0) {
      context.log("ERROR: No valid images");
      return json(context, 400, { error: "At least one image required" });
    }

    context.log("Starting validation...");
    const validation = await validateImages(imageDataUrls, description, context);
    
    context.log("Validation complete:", JSON.stringify(validation));

    return json(context, 200, {
      ok: true,
      validation: {
        itemDescription: validation.itemDescription || "Unable to determine item from images",
        damageDescription: validation.damageDescription || "Unable to determine damage from images",
        material: validation.material || "Unknown",
        damageType: validation.damageType || "Unknown",
        summary: validation.summary || "Unable to analyze images",
        notes: ""
      }
    });

  } catch (err) {
    context.log.error("=== VALIDATION ERROR ===");
    context.log.error("Error message:", err.message);
    context.log.error("Error stack:", err.stack);
    return json(context, 500, { error: err.message });
  }
};
