import assert from "node:assert/strict";
import {
  convertPipeTablesForCrawler,
  filterPublicContent,
  getConfiguredPublicOrigin,
  isRecognizedCrawler,
  renderLlmsTxt,
} from "./seo";

for (const userAgent of [
  "Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)",
  "ChatGPT-User/1.0",
  "PerplexityBot/1.0",
  "Claude-SearchBot/1.0",
  "Claude-User/1.0",
]) {
  assert.equal(isRecognizedCrawler(userAgent), true, userAgent);
}
assert.equal(isRecognizedCrawler("Mozilla/5.0 Chrome/124 Safari/537.36"), false);
assert.equal(isRecognizedCrawler("", "https://chatgpt.com"), true);

const records = [
  { id: "public", title: "Public", status: "published", isArchived: false },
  { id: "draft", title: "Draft", status: "draft", isArchived: false },
  { id: "archived", title: "Archived", status: "published", isArchived: true },
];
assert.deepEqual(filterPublicContent(records).map(({ id }) => id), ["public"]);

const llms = renderLlmsTxt("https://thedigitalledger.org", records, [
  { id: "episode", title: "Public episode", description: "Episode summary", status: "published", isArchived: false },
  { id: "private-episode", title: "Draft episode", status: "draft", isArchived: false },
]);
assert.match(llms, /\/news\/public/);
assert.doesNotMatch(llms, /\/news\/draft|\/news\/archived/);
assert.match(llms, /\/podcasts\/episode/);
assert.doesNotMatch(llms, /\/podcasts\/private-episode/);
assert.match(llms, /https:\/\/thedigitalledger\.org\/editorial-policy/);

assert.equal(
  getConfiguredPublicOrigin(["https://user:secret@example.test", "https://public.example.test/path"]),
  "https://public.example.test",
);
assert.equal(
  getConfiguredPublicOrigin(["http://unsafe.example.test"]),
  "https://thedigitalledger.org",
);

const table = convertPipeTablesForCrawler(
  "| Metric | Value |\n| --- | ---: |\n| Revenue & margin | $10 |",
);
assert.match(table, /<table><thead>/);
assert.match(table, /<th scope="col">Metric<\/th>/);
assert.match(table, /Revenue &amp; margin/);

console.log("SEO crawler recognition and public filtering passed");