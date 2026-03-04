import sgMail from "@sendgrid/mail";

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" +
      hostname +
      "/api/v2/connection?include_secrets=true&connector_names=sendgrid",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    },
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  if (
    !connectionSettings ||
    !connectionSettings.settings.api_key ||
    !connectionSettings.settings.from_email
  ) {
    throw new Error("SendGrid not connected");
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    email: connectionSettings.settings.from_email,
  };
}

async function getUncachableSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: email,
  };
}

const APP_URL = process.env.APP_URL || "https://thedigitalledger.org";

export async function sendWelcomeEmail(
  userEmail: string,
  firstName: string,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    const unsubscribeUrl = `${APP_URL}/unsubscribe?email=${encodeURIComponent(userEmail)}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #1a1a2e; font-size: 24px; margin-bottom: 4px;">The Digital Ledger</h1>
    <p style="color: #666; font-size: 14px; margin: 0;">AI &middot; Finance &middot; Accounting</p>
  </div>

  <h2 style="font-size: 22px; color: #1a1a2e;">Welcome, ${firstName}!</h2>
  <p style="font-size: 16px; line-height: 1.6;">
    Thank you for joining The Digital Ledger. Your account has been created and you're all set to explore our content — news articles, podcasts, forum discussions, and resources covering AI, Finance, and Accounting.
  </p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${APP_URL}" style="background-color: #1a1a2e; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
      Visit The Digital Ledger
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #999; text-align: center;">
    You received this email because you created an account at The Digital Ledger.<br>
    <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
  </p>
</body>
</html>`;

    const textBody = `Welcome to The Digital Ledger, ${firstName}!

Thank you for joining. Your account has been created and you're all set to explore our content — news articles, podcasts, forum discussions, and resources covering AI, Finance, and Accounting.

Visit us at: ${APP_URL}

---
You received this email because you created an account at The Digital Ledger.
To unsubscribe: ${unsubscribeUrl}`;

    const msg: any = {
      to: userEmail,
      from: fromEmail,
      subject: "Welcome to The Digital Ledger!",
      html: htmlBody,
      text: textBody,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };

    await client.send(msg);
    console.log(`Welcome email sent to ${userEmail}`);
    return true;
  } catch (error: any) {
    console.error(
      `Error sending welcome email to ${userEmail}. ` +
      `Check that the 'from' address is verified as a Sender Identity in SendGrid. ` +
      `Raw error:`,
      error?.response?.body ?? error
    );
    return false;
  }
}
