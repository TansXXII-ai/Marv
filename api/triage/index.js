const Busboy = require("busboy");

const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "https://magroupai.openai.azure.com";
const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini-version2024-07-18";
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

function json(context, status, body) {
  const origin = (context.req && context.req.headers && context.req.headers.origin) || "*";
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
  if (req.method === "OPTIONS") {
    context.res = {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    };
    return;
  }

  try {
    if (!endpoint || !apiKey || !deploymentName) {
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

    const imageDataUrls = files
      .filter(f => f.buffer && f.buffer.length > 0)
      .map(f => makeDataUrl(f));

    if (imageDataUrls.length === 0) {
      return json(context, 400, { error: "At least one image required" });
    }

    const prompt = `You are a surface repair triage assistant for Magicman.

Submitter: ${name} (${email}), Postcode: ${postcode}
Description: ${description}

Analyze the images and provide:
DECISION: [REPAIRABLE_SPOT, REPAIRABLE_FULL_RESURFACE, NCD, or NEEDS_MORE_INFO]
CONFIDENCE: [0.0 to 1.0]
REASONS: [bullet points]`;

    const response = await callChatCompletions(prompt, imageDataUrls);
    const resultText = response.choices?.[0]?.message?.content || "No response";

    return json(context, 200, { ok: true, result_text: resultText });

  } catch (err) {
    context.log.error(err);
    return json(context, 500, { error: err.message });
  }
};
