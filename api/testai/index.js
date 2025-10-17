module.exports = async function (context, req) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "https://magroupai.openai.azure.com";
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini-version2024-07-18";
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

  const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

  context.res = {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      config: {
        endpoint,
        deployment: deploymentName,
        apiVersion,
        hasApiKey: !!apiKey,
        apiKeyFirst10: apiKey ? apiKey.substring(0, 10) : "MISSING",
        fullUrl: url
      },
      envVars: {
        AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT || "NOT SET",
        AZURE_OPENAI_DEPLOYMENT: process.env.AZURE_OPENAI_DEPLOYMENT || "NOT SET",
        AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION || "NOT SET",
        hasKey: !!process.env.AZURE_OPENAI_API_KEY
      }
    })
  };
};
