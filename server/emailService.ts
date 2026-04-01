import nodemailer, { type Transporter, type SendMailOptions } from "nodemailer";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import type { Subscriber } from "@shared/schema";

const TEMPLATES_DIR = path.join(process.cwd(), "server", "email-templates");

const REQUIRED_TEMPLATES = ["welcome", "article", "podcast"] as const;

function validateTemplatesExist(): void {
  for (const name of REQUIRED_TEMPLATES) {
    const filePath = path.join(TEMPLATES_DIR, `${name}.html`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Email template not found: ${filePath}`);
    }
  }
}

validateTemplatesExist();

function createTransporter(): Transporter {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP credentials not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS environment variables.",
    );
  }

  const secure = port === 465;

  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

function getSenderAddress(): string {
  const email = process.env.SENDER_EMAIL || "info@thedigitalledger.org";
  const name = process.env.SENDER_NAME || "The Digital Ledger";
  return `"${name}" <${email}>`;
}

function loadTemplate(templateName: string): HandlebarsTemplateDelegate {
  const filePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  const source = fs.readFileSync(filePath, "utf-8");
  return Handlebars.compile(source);
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

function buildUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

type SendResult = { ok: boolean; email: string };

export async function sendWelcomeEmail(
  userEmail: string,
  firstName: string,
  subscriberId?: string,
): Promise<boolean> {
  try {
    const transporter = createTransporter();
    const from = getSenderAddress();
    const appUrl = process.env.APP_URL || "https://thedigitalledger.org";
    const unsubscribeUrl = subscriberId
      ? `${appUrl}/api/unsubscribe?id=${subscriberId}`
      : null;

    const template = loadTemplate("welcome");
    const html = template({ firstName, unsubscribeUrl });

    const mailOptions: SendMailOptions = {
      from,
      to: userEmail,
      subject: "Welcome to The Digital Ledger",
      html,
      ...(unsubscribeUrl
        ? { headers: buildUnsubscribeHeaders(unsubscribeUrl) }
        : {}),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${userEmail}`);
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error sending welcome email to ${userEmail}:`, message);
    return false;
  }
}

export async function sendArticleNotification(
  subscribers: Subscriber[],
  article: {
    id: string;
    title: string;
    content: string;
    excerpt?: string | null;
    imageUrl?: string | null;
  },
  appUrl: string,
): Promise<void> {
  if (subscribers.length === 0) return;

  let transporter: Transporter;
  try {
    transporter = createTransporter();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Article notification: failed to create SMTP transporter:", message);
    return;
  }

  const from = getSenderAddress();
  const template = loadTemplate("article");
  const articleUrl = `${appUrl}/news/${article.id}`;
  const preview = article.excerpt
    ? extractTextPreview(article.excerpt, 3)
    : extractTextPreview(article.content, 3);

  const imageUrl = article.imageUrl
    ? article.imageUrl.startsWith("http")
      ? article.imageUrl
      : `${appUrl}${article.imageUrl}`
    : null;

  const sends: Promise<SendResult>[] = subscribers.map((sub) => {
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?id=${sub.id}`;
    const html = template({ title: article.title, preview, articleUrl, imageUrl, unsubscribeUrl });

    return transporter
      .sendMail({
        from,
        to: sub.email,
        subject: `New Article: ${article.title}`,
        html,
        headers: buildUnsubscribeHeaders(unsubscribeUrl),
      })
      .then((): SendResult => ({ ok: true, email: sub.email }))
      .catch((err: unknown): SendResult => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Article notification failed for ${sub.email}:`, message);
        return { ok: false, email: sub.email };
      });
  });

  const results = await Promise.allSettled(sends);
  const succeeded = results.filter(
    (r): r is PromiseFulfilledResult<SendResult> => r.status === "fulfilled" && r.value.ok,
  ).length;
  console.log(`Article notification "${article.title}": ${succeeded}/${subscribers.length} sent`);
}

export async function sendPodcastNotification(
  subscribers: Subscriber[],
  episode: {
    id: string;
    title: string;
    description?: string | null;
    audioUrl?: string | null;
    imageUrl?: string | null;
  },
  appUrl: string,
): Promise<void> {
  if (subscribers.length === 0) return;

  let transporter: Transporter;
  try {
    transporter = createTransporter();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Podcast notification: failed to create SMTP transporter:", message);
    return;
  }

  const from = getSenderAddress();
  const template = loadTemplate("podcast");
  const podcastUrl = episode.audioUrl || appUrl;
  const preview = episode.description ? extractTextPreview(episode.description, 3) : "";

  const imageUrl = episode.imageUrl
    ? episode.imageUrl.startsWith("http")
      ? episode.imageUrl
      : `${appUrl}${episode.imageUrl}`
    : null;

  const sends: Promise<SendResult>[] = subscribers.map((sub) => {
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?id=${sub.id}`;
    const html = template({ title: episode.title, preview, podcastUrl, imageUrl, unsubscribeUrl });

    return transporter
      .sendMail({
        from,
        to: sub.email,
        subject: `New Podcast: ${episode.title}`,
        html,
        headers: buildUnsubscribeHeaders(unsubscribeUrl),
      })
      .then((): SendResult => ({ ok: true, email: sub.email }))
      .catch((err: unknown): SendResult => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Podcast notification failed for ${sub.email}:`, message);
        return { ok: false, email: sub.email };
      });
  });

  const results = await Promise.allSettled(sends);
  const succeeded = results.filter(
    (r): r is PromiseFulfilledResult<SendResult> => r.status === "fulfilled" && r.value.ok,
  ).length;
  console.log(`Podcast notification "${episode.title}": ${succeeded}/${subscribers.length} sent`);
}
