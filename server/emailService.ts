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

const WELCOME_EMAIL_TEMPLATE_ID = "d-64ab79f349214e1f8ba8babefd5e6bad";

export async function sendWelcomeEmail(
  userEmail: string,
  firstName: string,
): Promise<boolean> {
  try {
    const { client } = await getUncachableSendGridClient();

    const msg = {
      to: userEmail,
      from: "team@thedigitalledger.org",
      templateId: WELCOME_EMAIL_TEMPLATE_ID,
      dynamicTemplateData: {
        firstName: firstName,
      },
    };

    await client.send(msg);
    console.log(`Welcome email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return false;
  }
}
