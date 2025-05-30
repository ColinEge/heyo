const { GoogleAuth } = require('google-auth-library');

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, body: "", headers };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed", headers };
  }
  
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"]
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const { to, title, body } = JSON.parse(event.body);

  const fcmRes = await fetch("https://fcm.googleapis.com/v1/projects/heyo-7df13/messages:send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: to,
        notification: {
          title, body
        },
        data: {
          timestamp: new Date().toISOString(),
        }
      }
    }),
  });

  const responseText = await fcmRes.text();

  return { statusCode: fcmRes.status, body: responseText, headers };
};