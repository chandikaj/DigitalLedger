const DEFAULT_PUBLIC_ORIGIN = "https://thedigitalledger.org";
const UNSAFE_ORIGIN_CHARACTERS = /[\u0000-\u001f\u007f<>"'`\\]/;

const CRAWLER_TOKENS = [
  "chatgpt",
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "anthropic",
  "claude",
  "claudebot",
  "claude-searchbot",
  "claude-user",
  "perplexity",
  "perplexitybot",
  "google-extended",
  "bard",
  "googlebot",
  "bingbot",
  "yandexbot",
  "baiduspider",
  "duckduckbot",
  "slurp",
  "sogou",
  "exabot",
  "ia_archiver",
  "facebookexternalhit",
  "facebot",
  "fb_iab",
  "linkedinbot",
  "twitterbot",
  "x-bot",
  "whatsapp",
  "telegrambot",
  "discordbot",
  "slackbot",
  "pinterest",
  "redditbot",
  "tumblr",
  "applebot",
  "mj12bot",
  "semrushbot",
  "ahrefsbot",
  "dotbot",
  "bot",
  "crawler",
  "spider",
  "scraper",
  "fetcher",
];

export function getConfiguredPublicOrigin(
  candidates: Array<string | undefined> = [
    process.env.PUBLIC_ORIGIN,
    process.env.SITE_URL,
  ],
): string {
  for (const candidate of candidates) {
    if (!candidate || UNSAFE_ORIGIN_CHARACTERS.test(candidate)) continue;
    try {
      const url = new URL(candidate.trim());
      if (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        url.origin !== "null"
      ) {
        return url.origin;
      }
    } catch {
      // Ignore invalid configuration and use the verified canonical fallback.
    }
  }
  return DEFAULT_PUBLIC_ORIGIN;
}

export function isRecognizedCrawler(
  userAgent: string | undefined,
  signatureAgent?: string,
): boolean {
  const ua = (userAgent || "").toLowerCase();
  const signature = (signatureAgent || "").toLowerCase();
  return (
    CRAWLER_TOKENS.some((token) => ua.includes(token)) ||
    signature.includes("chatgpt.com")
  );
}

export type PublicContentStatus = {
  status: string | null | undefined;
  isArchived: boolean | null | undefined;
};

export function isPublicContent(item: PublicContentStatus): boolean {
  return item.status === "published" && item.isArchived !== true;
}

export function filterPublicContent<T extends PublicContentStatus>(
  items: readonly T[],
): T[] {
  return items.filter(isPublicContent);
}

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

function parsePipeRow(line: string): string[] {
  const cells = line.split("|").map((cell) => cell.trim());
  if (cells[0] === "") cells.shift();
  if (cells[cells.length - 1] === "") cells.pop();
  return cells;
}

function isPipeSeparator(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.includes("|") &&
    trimmed.includes("-") &&
    /^[\s\-:|]+$/.test(trimmed)
  );
}

function renderPipeTable(lines: string[], start: number): {
  html: string;
  nextIndex: number;
} | null {
  if (
    !lines[start]?.includes("|") ||
    !lines[start + 1] ||
    !isPipeSeparator(lines[start + 1])
  ) {
    return null;
  }

  const header = parsePipeRow(lines[start]);
  const separator = parsePipeRow(lines[start + 1]);
  if (
    header.length === 0 ||
    header.length !== separator.length ||
    separator.some((cell) => !/^:?-{3,}:?$/.test(cell))
  ) {
    return null;
  }

  const rows: string[][] = [];
  let index = start + 2;
  while (index < lines.length && lines[index].trim().includes("|")) {
    const row = parsePipeRow(lines[index]);
    if (row.length !== header.length || isPipeSeparator(lines[index])) break;
    rows.push(row);
    index += 1;
  }

  const head = header.map((cell) => `<th scope="col">${escapeHtml(cell)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("");
  return {
    html: `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`,
    nextIndex: index,
  };
}

function convertTextPipeTables(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let output = "";
  let textStart = 0;
  let index = 0;
  while (index < lines.length) {
    const table = renderPipeTable(lines, index);
    if (!table) {
      index += 1;
      continue;
    }
    output += lines.slice(textStart, index).join("\n");
    output += `${textStart < index ? "\n" : ""}${table.html}`;
    index = table.nextIndex;
    textStart = index;
  }
  output += `${textStart > 0 && textStart < lines.length ? "\n" : ""}${lines
    .slice(textStart)
    .join("\n")}`;
  return output || text;
}

export function convertPipeTablesForCrawler(content: string): string {
  if (!content.includes("|")) return content;
  if (!/<[a-z][\s\S]*>/i.test(content)) return convertTextPipeTables(content);

  return content.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (paragraph, attributes, body) => {
    if (!/\|/.test(body) || !/(?:<br\s*\/?>|\n)/i.test(body)) return paragraph;
    const plainText = body
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "");
    const converted = convertTextPipeTables(plainText);
    return converted.includes("<table>") ? converted : `<p${attributes}>${body}</p>`;
  });
}

export type LlmsArticle = PublicContentStatus & {
  id: string;
  title: string;
  excerpt?: string | null;
};

export type LlmsPodcast = PublicContentStatus & {
  id: string;
  title: string;
  description?: string | null;
};

function singleLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

export function renderLlmsTxt(
  origin: string,
  articles: readonly LlmsArticle[],
  podcasts: readonly LlmsPodcast[] = [],
): string {
  const publicArticles = filterPublicContent(articles).slice(0, 100);
  const articleLines = publicArticles.map((article) => {
    const title = singleLine(article.title) || "Untitled article";
    const summary = article.excerpt ? singleLine(article.excerpt) : "";
    const url = `${origin}/news/${encodeURIComponent(article.id)}`;
    return `- [${title.replace(/[[\]]/g, "")}](${url})${summary ? `: ${summary}` : ""}`;
  });
  const publicPodcasts = filterPublicContent(podcasts).slice(0, 100);
  const podcastLines = publicPodcasts.map((podcast) => {
    const title = singleLine(podcast.title) || "Untitled podcast episode";
    const summary = podcast.description ? singleLine(podcast.description) : "";
    const url = `${origin}/podcasts/${encodeURIComponent(podcast.id)}`;
    return `- [${title.replace(/[[\]]/g, "")}](${url})${summary ? `: ${summary}` : ""}`;
  });

  return [
    "# The Digital Ledger",
    "",
    "> Finance and accounting news, podcasts, resources, and community.",
    "",
    "## Public sections",
    `- [News](${origin}/news)`,
    `- [Podcasts](${origin}/podcasts)`,
    `- [Resources](${origin}/resources)`,
    `- [Editorial policy](${origin}/editorial-policy)`,
    "",
    "## Recent published articles",
    ...(articleLines.length ? articleLines : ["- No published articles are currently listed."]),
    "",
    "## Recent published podcast episodes",
    ...(podcastLines.length ? podcastLines : ["- No published podcast episodes are currently listed."]),
    "",
  ].join("\n");
}