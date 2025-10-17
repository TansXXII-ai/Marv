const Busboy = require("busboy");

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

async function validateImages(imageDataUrls, description) {
  const contentParts = [{ 
    type: "text", 
    text: `You are a surface repair expert. Analyze these images to identify:
1. The surface material type (e.g., wood, laminate, granite, marble, etc.)
2. The type of damage visible (e.g., scratch, dent, crack, chip, burn, stain, wear)
3. A brief description of what you see (one sentence)

User's description: "${description}"

Respond ONLY in this exact JSON format:
{
  "material": "detected material type",
  "damageType": "detected damage type",
  "summary": "brief one-sentence description of what's visible"
}` 
  }];
  
  imageDataUrls.forEach(url => {
    contentParts.push({ type: "image_url", image_url: { url, detail: "low" } });
  });

  const response = await aoaiFetch({
    method: "POST",
    body: JSON.stringify({
      messages: [{ role: "user", content: contentParts }],
      max_tokens: 200,
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
  });

  const resultText = response.choices?.[0]?.message?.content || "{}";
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

  context.log("=== VALIDATE ENDPOINT ===");

  try {
    if (!endpoint || !apiKey || !deploymentName) {
      return json(context, 500, { error: "Missing Azure OpenAI config" });
    }

    const ct = (req.headers && req.headers["content-type"]) || "";
    if (!ct.includes("multipart/form-data")) {
      return json(context, 400, { error: "Content-Type must be multipart/form-data" });
    }

    const { fields, files } = await parseMultipart(req);
    const description = (fields.description || "").trim();

    const imageDataUrls = files
      .filter(f => f.buffer && f.buffer.length > 0)
      .map(f => makeDataUrl(f));

    context.log(`Validating ${imageDataUrls.length} images`);

    if (imageDataUrls.length === 0) {
      return json(context, 400, { error: "At least one image required" });
    }

    const validation = await validateImages(imageDataUrls, description);
    
    context.log("Validation result:", JSON.stringify(validation));

    return json(context, 200, {
      ok: true,
      validation: {
        material: validation.material || "Unknown",
        damageType: validation.damageType || "Unknown",
        summary: validation.summary || "Unable to determine from images",
        notes: ""
      }
    });

  } catch (err) {
    context.log.error("Validation error:", err.message);
    return json(context, 500, { error: err.message });
  }
};
