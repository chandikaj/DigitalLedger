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

const WELCOME_EMAIL_TEMPLATE_ID = process.env.SENDGRID_WELCOME_TEMPLATE_ID;

export async function sendWelcomeEmail(
  userEmail: string,
  firstName: string,
  subscriberId?: string,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    const appUrl = process.env.APP_URL;
    const unsubscribeUrl = subscriberId
      ? `${appUrl}/api/unsubscribe?id=${subscriberId}`
      : null;

    const msg = {
      to: userEmail,
      from: fromEmail,
      templateId: WELCOME_EMAIL_TEMPLATE_ID,
      dynamicTemplateData: {
        firstName,
        ...(unsubscribeUrl ? { unsubscribeUrl } : {}),
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
