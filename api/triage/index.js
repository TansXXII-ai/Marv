// api/triage/index.js
// Azure Function (Node.js ESM) — MARV Triage Endpoint (RESPONSES API)
// - Parses multipart form (name, email, postcode, description, images[])
// - Sends text + images to Azure OpenAI Responses API (supports vision)
// - Returns assistant result as JSON

import Busboy from "busboy";

/**
 * --- Environment variables required ---
 * AZURE_OPENAI_ENDPOINT      e.g. https://magroupai.openai.azure.com
 * AZURE_OPENAI_API_KEY       your Azure OpenAI key
 * AZURE_OPENAI_DEPLOYMENT    your GPT-4o deployment name (e.g. "gpt-4o")
 *
 * Optional:
 * AZURE_OPENAI_API_VERSION   defaults to "2024-10-01-preview"
 */

const endpoint =
  process.env.AZURE_OPENAI_ENDPOINT || "https://magroupai.openai.azure.com";
const apiKey =
  process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY;
const deploymentName =
  process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";
const apiVersion =
  process.env.AZURE_OPENAI_API_VERSION || "2024-10-01-preview";

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

/** Azure OpenAI REST wrapper for Responses API */
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

    // Feed Busboy the raw body
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

/** Convert file buffers to data URLs for vision API */
function makeDataUrl({ mimeType, buffer }) {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

/** Call Responses API with text + images */
async function callResponsesAPI(textPrompt, imageDataUrls) {
  const contentParts = [
    { type: "input_text", text: textPrompt }
  ];

  // Add all images
  imageDataUrls.forEach(url => {
    contentParts.push({
      type: "input_image",
      image_url: url
    });
  });

  const payload = {
    model: deploymentName,
    input: [{
      role: "user",
      content: contentParts
    }]
  };

  return aoaiFetch("/v1/responses", {
    method: "POST",
    body: JSON.stringify(payload)
  });
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
    if (!endpoint || !apiKey || !deploymentName) {
      return json(context, 500, {
        error:
          "Missing AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, or AZURE_OPENAI_DEPLOYMENT."
      });
    }

    context.log(`MARV env: endpoint=${endpoint}, deployment=${deploymentName}`);

    // Basic content-type validation
    const ct = (req.headers && req.headers["content-type"]) || "";
    if (!ct.includes("multipart/form-data")) {
      return json(context, 400, {
        error:
          "Content-Type must be multipart/form-data with fields and image files."
      });
    }

    // Parse multipart
    const { fields, files } = await parseMultipart(req);
    const name = (fields.name || "").trim();
    const email = (fields.email || "").trim();
    const postcode = (fields.postcode || "").trim();
    const description = (fields.description || fields.text || "").trim();

    // Convert uploaded files to data URLs
    const imageDataUrls = (files || [])
      .filter((f) => f.buffer && f.buffer.length > 0)
      .map((f) => makeDataUrl({ mimeType: f.mimeType, buffer: f.buffer }));

    context.log(
      `Parsed form: name=${name}, email=${email}, postcode=${postcode}, description length=${description.length}, images=${imageDataUrls.length}`
    );

    // Build the prompt
    const prompt = 
      `You are a surface repair triage assistant for Magicman, a specialist repair company.

Submitter Details:
- Name: ${name || "N/A"}
- Email: ${email || "N/A"}
- Postcode: ${postcode || "N/A"}

Customer Damage Description:
${description || "N/A"}

Task:
Analyze the provided images and description to determine the repair classification. Consider:
1. Size and severity of damage
2. Material type (worktop, furniture, flooring, etc.)
3. Whether it's surface-level or structural
4. Feasibility of spot repair vs full resurface

Provide your response in the following format:

DECISION: [One of: REPAIRABLE_SPOT, REPAIRABLE_FULL_RESURFACE, NCD, NEEDS_MORE_INFO]

CONFIDENCE: [0.0 to 1.0]

REASONS:
- [Reason 1]
- [Reason 2]
- [Reason 3]

If critical details are missing (material type, finish, exact location), set DECISION to NEEDS_MORE_INFO and ask up to 2 specific clarifying questions.`;

    // Call the Responses API
    const response = await callResponsesAPI(prompt, imageDataUrls);

    // Extract the result text
    const resultText = response.output_text || response.output?.[0]?.text || "No response";

    context.log(`Response API result: ${resultText.substring(0, 200)}...`);

    return json(context, 200, {
      ok: true,
      result_text: resultText
    });

  } catch (err) {
    context.log.error(err);
    return json(context, 500, { error: err.message || "Unexpected error." });
  }
}
