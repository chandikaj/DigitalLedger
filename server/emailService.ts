import sgMail from "@sendgrid/mail";
import type { Subscriber } from "@shared/schema";

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

function extractTextPreview(html: string, sentenceCount: number): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  return sentences.slice(0, sentenceCount).join(" ").trim() || text.slice(0, 300);
}

const WELCOME_EMAIL_TEMPLATE_ID = process.env.SENDGRID_WELCOME_TEMPLATE_ID;
const ARTICLE_EMAIL_TEMPLATE_ID = process.env.SENDGRID_ARTICLE_TEMPLATE_ID;
const PODCAST_EMAIL_TEMPLATE_ID = process.env.SENDGRID_PODCAST_TEMPLATE_ID;

export async function sendWelcomeEmail(
  userEmail: string,
  firstName: string,
  subscriberId?: string,
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();

    const appUrl = process.env.APP_URL || "https://thedigitalledger.org";
    const unsubscribeUrl = subscriberId
      ? `${appUrl}/api/unsubscribe?id=${subscriberId}`
      : null;

    const msg: any = {
      to: userEmail,
      from: fromEmail,
      templateId: WELCOME_EMAIL_TEMPLATE_ID,
      dynamicTemplateData: {
        firstName,
        ...(unsubscribeUrl ? { unsubscribeUrl } : {}),
      },
    };

    if (unsubscribeUrl) {
      msg.headers = {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      };
    }

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

export async function sendArticleNotification(
  subscribers: Subscriber[],
  article: { id: string; title: string; content: string; excerpt?: string | null; imageUrl?: string | null },
  appUrl: string,
): Promise<void> {
  if (!ARTICLE_EMAIL_TEMPLATE_ID) {
    console.warn("SENDGRID_ARTICLE_TEMPLATE_ID not set — skipping article notifications");
    return;
  }
  if (subscribers.length === 0) return;

  let sgClient: Awaited<ReturnType<typeof getUncachableSendGridClient>>;
  try {
    sgClient = await getUncachableSendGridClient();
  } catch (err) {
    console.error("Article notification: failed to get SendGrid client:", err);
    return;
  }

  const { client, fromEmail } = sgClient;
  const articleUrl = `${appUrl}/news/${article.id}`;
  const preview = article.excerpt
    ? extractTextPreview(article.excerpt, 3)
    : extractTextPreview(article.content, 3);

  const sends = subscribers.map((sub) => {
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?id=${sub.id}`;
    const msg: any = {
      to: sub.email,
      from: fromEmail,
      templateId: ARTICLE_EMAIL_TEMPLATE_ID,
      dynamicTemplateData: {
        title: article.title,
        preview,
        articleUrl,
        ...(article.imageUrl ? {
          imageUrl: article.imageUrl.startsWith('http')
            ? article.imageUrl
            : `${appUrl}${article.imageUrl}`,
        } : {}),
        unsubscribeUrl,
      },
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };
    return client.send(msg).then(() => ({ ok: true, email: sub.email })).catch((err: any) => {
      console.error(`Article notification failed for ${sub.email}:`, err?.response?.body ?? err);
      return { ok: false, email: sub.email };
    });
  });

  const results = await Promise.allSettled(sends);
  const succeeded = results.filter((r) => r.status === "fulfilled" && (r.value as any).ok).length;
  console.log(`Article notification "${article.title}": ${succeeded}/${subscribers.length} sent`);
}

export async function sendPodcastNotification(
  subscribers: Subscriber[],
  episode: { id: string; title: string; description?: string | null; audioUrl?: string | null; imageUrl?: string | null },
  appUrl: string,
): Promise<void> {
  if (!PODCAST_EMAIL_TEMPLATE_ID) {
    console.warn("SENDGRID_PODCAST_TEMPLATE_ID not set — skipping podcast notifications");
    return;
  }
  if (subscribers.length === 0) return;

  let sgClient: Awaited<ReturnType<typeof getUncachableSendGridClient>>;
  try {
    sgClient = await getUncachableSendGridClient();
  } catch (err) {
    console.error("Podcast notification: failed to get SendGrid client:", err);
    return;
  }

  const { client, fromEmail } = sgClient;
  const podcastUrl = episode.audioUrl || appUrl;
  const preview = episode.description
    ? extractTextPreview(episode.description, 3)
    : "";

  const sends = subscribers.map((sub) => {
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?id=${sub.id}`;
    const msg: any = {
      to: sub.email,
      from: fromEmail,
      templateId: PODCAST_EMAIL_TEMPLATE_ID,
      dynamicTemplateData: {
        title: episode.title,
        preview,
        podcastUrl,
        ...(episode.imageUrl ? {
          imageUrl: episode.imageUrl.startsWith('http')
            ? episode.imageUrl
            : `${appUrl}${episode.imageUrl}`,
        } : {}),
        unsubscribeUrl,
      },
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };
    return client.send(msg).then(() => ({ ok: true, email: sub.email })).catch((err: any) => {
      console.error(`Podcast notification failed for ${sub.email}:`, err?.response?.body ?? err);
      return { ok: false, email: sub.email };
    });
  });

  const results = await Promise.allSettled(sends);
  const succeeded = results.filter((r) => r.status === "fulfilled" && (r.value as any).ok).length;
  console.log(`Podcast notification "${episode.title}": ${succeeded}/${subscribers.length} sent`);
}
