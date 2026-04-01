import nodemailer from "nodemailer";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Subscriber } from "@shared/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "email-templates");

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP credentials not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS environment variables.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
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

    const mailOptions: any = {
      from,
      to: userEmail,
      subject: "Welcome to The Digital Ledger",
      html,
    };

    if (unsubscribeUrl) {
      mailOptions.headers = {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      };
    }

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${userEmail}`);
    return true;
  } catch (error: any) {
    console.error(`Error sending welcome email to ${userEmail}:`, error?.message ?? error);
    return false;
  }
}

export async function sendArticleNotification(
  subscribers: Subscriber[],
  article: { id: string; title: string; content: string; excerpt?: string | null; imageUrl?: string | null },
  appUrl: string,
): Promise<void> {
  if (subscribers.length === 0) return;

  let transporter: nodemailer.Transporter;
  try {
    transporter = createTransporter();
  } catch (err) {
    console.error("Article notification: failed to create SMTP transporter:", err);
    return;
  }

  const from = getSenderAddress();
  const template = loadTemplate("article");
  const articleUrl = `${appUrl}/news/${article.id}`;
  const preview = article.excerpt
    ? extractTextPreview(article.excerpt, 3)
    : extractTextPreview(article.content, 3);

  const imageUrl = article.imageUrl
    ? (article.imageUrl.startsWith("http") ? article.imageUrl : `${appUrl}${article.imageUrl}`)
    : null;

  const sends = subscribers.map((sub) => {
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?id=${sub.id}`;
    const html = template({
      title: article.title,
      preview,
      articleUrl,
      imageUrl,
      unsubscribeUrl,
    });

    return transporter.sendMail({
      from,
      to: sub.email,
      subject: `New Article: ${article.title}`,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    })
      .then(() => ({ ok: true, email: sub.email }))
      .catch((err: any) => {
        console.error(`Article notification failed for ${sub.email}:`, err?.message ?? err);
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
  if (subscribers.length === 0) return;

  let transporter: nodemailer.Transporter;
  try {
    transporter = createTransporter();
  } catch (err) {
    console.error("Podcast notification: failed to create SMTP transporter:", err);
    return;
  }

  const from = getSenderAddress();
  const template = loadTemplate("podcast");
  const podcastUrl = episode.audioUrl || appUrl;
  const preview = episode.description
    ? extractTextPreview(episode.description, 3)
    : "";

  const imageUrl = episode.imageUrl
    ? (episode.imageUrl.startsWith("http") ? episode.imageUrl : `${appUrl}${episode.imageUrl}`)
    : null;

  const sends = subscribers.map((sub) => {
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?id=${sub.id}`;
    const html = template({
      title: episode.title,
      preview,
      podcastUrl,
      imageUrl,
      unsubscribeUrl,
    });

    return transporter.sendMail({
      from,
      to: sub.email,
      subject: `New Podcast: ${episode.title}`,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    })
      .then(() => ({ ok: true, email: sub.email }))
      .catch((err: any) => {
        console.error(`Podcast notification failed for ${sub.email}:`, err?.message ?? err);
        return { ok: false, email: sub.email };
      });
  });

  const results = await Promise.allSettled(sends);
  const succeeded = results.filter((r) => r.status === "fulfilled" && (r.value as any).ok).length;
  console.log(`Podcast notification "${episode.title}": ${succeeded}/${subscribers.length} sent`);
}
