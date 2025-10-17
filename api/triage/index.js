const Busboy = require("busboy");

module.exports = async function (context, req) {
  context.log('Triage function called');
  
  // CORS preflight
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

  // Simple response for now
  context.res = {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      ok: true,
      message: "Triage function works!",
      busboy_available: typeof Busboy !== 'undefined'
    })
  };
};
