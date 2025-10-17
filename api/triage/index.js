module.exports = async function (context, req) {
  context.log('Triage function called');
  
  context.res = {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      ok: true,
      message: "Triage function is alive!",
      method: req.method
    })
  };
};
