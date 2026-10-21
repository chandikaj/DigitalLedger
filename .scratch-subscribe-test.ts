// TEMPORARY local test harness — not part of the app. Deleted after the run.
// Boots the real registerRoutes() with storage swapped for an in-memory list
// and a tiny fake SMTP server that captures outgoing emails.
import net from "node:net";
import fs from "node:fs";
import express from "express";

// ---- fake SMTP server -------------------------------------------------------
const mails: { to: string; data: string }[] = [];
const smtp = net.createServer((sock) => {
  let to = "", inData = false, buf = "";
  sock.write("220 fake-smtp\r\n");
  sock.on("data", (chunk) => {
    buf += chunk.toString();
    let i;
    while ((i = buf.indexOf("\r\n")) >= 0 || (inData && buf.includes("\r\n.\r\n"))) {
      if (inData) {
        const end = buf.indexOf("\r\n.\r\n");
        if (end < 0) break;
        mails.push({ to, data: buf.slice(0, end) });
        buf = buf.slice(end + 5);
        inData = false;
        sock.write("250 queued\r\n");
        continue;
      }
      const line = buf.slice(0, i); buf = buf.slice(i + 2);
      const cmd = line.slice(0, 4).toUpperCase();
      if (cmd === "EHLO") sock.write("250-fake\r\n250 AUTH PLAIN LOGIN\r\n");
      else if (cmd === "AUTH") sock.write("235 ok\r\n");
      else if (cmd === "RCPT") { to = line.match(/<(.+)>/)?.[1] ?? ""; sock.write("250 ok\r\n"); }
      else if (cmd === "DATA") { inData = true; sock.write("354 go\r\n"); }
      else if (cmd === "QUIT") { sock.write("221 bye\r\n"); sock.end(); }
      else sock.write("250 ok\r\n");
    }
  });
});
await new Promise<void>((r) => smtp.listen(2525, r));

Object.assign(process.env, {
  DATABASE_URL: "postgres://fake:fake@127.0.0.1:1/fake",
  SESSION_SECRET: "test-secret",
  SMTP_HOST: "127.0.0.1", SMTP_PORT: "2525", SMTP_USER: "u", SMTP_PASS: "p",
  SENDER_EMAIL: "news@thedigitalledger.org", SENDER_NAME: "The Digital Ledger",
  APP_URL: "https://thedigitalledger.org",
});

// ---- in-memory storage --------------------------------------------------------
const { storage } = await import("./server/storage");
type Row = { id: string; email: string; categories: string[] | null; frequency: string; isActive: boolean; confirmedAt: Date | null };
const rows: Row[] = [
  // pre-existing subscriber with mixed-case email and custom preferences
  { id: "sub-existing", email: "Jane.Doe@Example.com", categories: ["cat-ai"], frequency: "monthly", isActive: true, confirmedAt: null },
  // previously unsubscribed
  { id: "sub-left", email: "left@example.com", categories: [], frequency: "weekly", isActive: false, confirmedAt: null },
];
let n = 0;
Object.assign(storage, {
  getSubscriberByEmail: async (e: string) => rows.find((r) => r.email.toLowerCase() === e.toLowerCase()),
  createSubscriber: async (s: any) => { const r = { id: `sub-new-${++n}`, isActive: true, confirmedAt: null, ...s }; rows.push(r); return r; },
  updateSubscriber: async (id: string, u: any) => { const r = rows.find((x) => x.id === id)!; Object.assign(r, u); return r; },
});

const { registerRoutes } = await import("./server/routes");
const app = express();
app.set("trust proxy", 1);
app.use(express.json());
const server = await registerRoutes(app);
await new Promise<void>((r) => server.listen(5055, r));

// ---- scenarios ---------------------------------------------------------------
const post = async (body: unknown, ip = "1.1.1.1") => {
  const res = await fetch("http://127.0.0.1:5055/api/subscribers", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": ip }, body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};
const results: any[] = [];
const run = async (name: string, body: unknown, ip?: string) => {
  const before = mails.length;
  const r = await post(body, ip);
  await new Promise((s) => setTimeout(s, 400)); // welcome email is fire-and-forget
  const sent = mails.slice(before).map((m) => m.to);
  results.push({ name, request: body, status: r.status, response: r.body, emailsSent: sent });
};

await run("New subscriber (popup, email only)", { email: "  New.Reader@Gmail.com " });
await run("Same person again", { email: "new.reader@gmail.com" });
await run("Existing subscriber, different capitals", { email: "jane.doe@example.com" });
await run("Previously unsubscribed comes back", { email: "left@example.com" });
await run("Invalid email", { email: "not-an-email" });
await run("Missing email", {});
await run("Bad frequency", { email: "x@example.com", frequency: "hourly" });
await run("Settings page with preferences", { email: "pref@example.com", categories: ["cat-ai"], frequency: "daily" });
for (let i = 0; i < 10; i++) await post({ email: `bot${i}@spam.com` }, "9.9.9.9");
await run("11th signup in a minute from one IP", { email: "bot10@spam.com" }, "9.9.9.9");
await run("Different visitor at the same time", { email: "real@person.com" }, "2.2.2.2");

const welcome = mails.find((m) => m.to === "new.reader@gmail.com");
fs.writeFileSync(".scratch-results.json", JSON.stringify({
  results,
  rows: rows.filter((r) => !r.email.startsWith("bot")),
  botRowsSaved: rows.filter((r) => r.email.startsWith("bot")).length,
  welcomeEmailRaw: welcome?.data ?? null,
}, null, 2));
console.log("DONE");
process.exit(0);
