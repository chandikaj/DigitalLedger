import assert from "node:assert/strict";
import { classifyAiReferrer } from "./aiReferralTracking";

const recognized = [
  ["https://chatgpt.com/c/example?private=query", "chatgpt"],
  ["https://share.chatgpt.com/c/example", "chatgpt"],
  ["https://chat.openai.com/c/example", "chatgpt"],
  ["https://sub.chat.openai.com/path", "chatgpt"],
  ["https://www.perplexity.ai/search?q=private", "perplexity"],
  ["https://claude.ai/chat/example", "claude"],
  ["https://app.claude.ai/chat/example", "claude"],
  ["https://copilot.microsoft.com/chats/example", "copilot"],
  ["https://gemini.google.com/app/example", "gemini"],
] as const;

for (const [referrer, source] of recognized) {
  assert.equal(classifyAiReferrer(referrer), source);
}

const rejected = [
  "",
  "not a URL",
  "javascript://chatgpt.com/example",
  "https://chatgpt.com.evil.example/path",
  "https://fakechatgpt.com/path",
  "https://openai.com/path",
  "https://microsoft.com/path",
  "https://bing.com/chat",
  "https://google.com/path",
  "https://example.com/?next=https://claude.ai",
];

for (const referrer of rejected) {
  assert.equal(classifyAiReferrer(referrer), null);
}

assert.equal(
  classifyAiReferrer("HTTPS://GEMINI.GOOGLE.COM./app/example"),
  "gemini",
);

console.log("AI referrer classifier tests passed");