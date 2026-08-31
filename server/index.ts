import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { db } from "./db";
import { users, newsArticles, podcastEpisodes, forumDiscussions } from "@shared/schema";
import { storage } from "./storage";
import sanitizeHtml from "sanitize-html";

// ============================================
// SEO & Bot Detection Utilities
// ============================================

// Helper function to escape HTML special characters
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}

function serializeJsonForHtml(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(
    /[<>&]/g,
    (character) =>
      ({
        "<": "\\u003c",
        ">": "\\u003e",
        "&": "\\u0026",
      })[character]!,
  );
}

function escapeXml(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const UNSAFE_ORIGIN_CHARACTERS = /[\u0000-\u001f\u007f<>"'`\\]/;

function getPublicOrigin(req: Request): string {
  for (const configuredOrigin of [
    process.env.PUBLIC_ORIGIN,
    process.env.SITE_URL,
  ]) {
    if (!configuredOrigin || UNSAFE_ORIGIN_CHARACTERS.test(configuredOrigin)) {
      continue;
    }
    try {
      const url = new URL(configuredOrigin.trim());
      if (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        url.origin !== "null"
      ) {
        return url.origin.replace(/\/+$/, "");
      }
    } catch {
      // Try the next configured origin, then the validated request origin.
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("A valid HTTPS PUBLIC_ORIGIN or SITE_URL is required in production");
  }

  const requestOrigin = `${req.protocol}://${req.get("host") || ""}`;
  if (UNSAFE_ORIGIN_CHARACTERS.test(requestOrigin)) {
    throw new Error("Invalid request origin");
  }
  const url = new URL(requestOrigin);
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password ||
    url.origin === "null"
  ) {
    throw new Error("Invalid request origin");
  }
  return url.origin.replace(/\/+$/, "");
}

function resolveSafeHttpUrl(value: string | null | undefined, baseUrl: string): string | null {
  if (!value || UNSAFE_ORIGIN_CHARACTERS.test(value)) return null;

  try {
    const url = new URL(value, baseUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

const ARTICLE_CONTENT_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s",
    "blockquote", "ul", "ol", "li", "a", "code", "pre", "hr", "table",
    "thead", "tbody", "tr", "th", "td",
  ],
  allowedSchemes: ["https"],
  allowProtocolRelative: false,
  enforceHtmlBoundary: true,
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: "a",
      attribs: {
        ...attribs,
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      },
    }),
  },
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
};

// Strip HTML tags and clean text for meta descriptions
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&')  // Decode &amp;
    .replace(/&lt;/g, '<')   // Decode &lt;
    .replace(/&gt;/g, '>')   // Decode &gt;
    .replace(/&quot;/g, '"') // Decode &quot;
    .replace(/&#39;/g, "'")  // Decode &#39;
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

// Extract first paragraph or generate summary for description
function generateDescription(content: string, maxLength: number = 160): string {
  const plainText = stripHtml(content);
  if (plainText.length <= maxLength) return plainText;
  
  // Try to break at sentence end
  const truncated = plainText.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclaim = truncated.lastIndexOf('!');
  const breakPoint = Math.max(lastSentence, lastQuestion, lastExclaim);
  
  if (breakPoint > maxLength * 0.5) {
    return plainText.substring(0, breakPoint + 1);
  }
  
  // Break at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  return plainText.substring(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
}

// Extract keywords from content
function extractKeywords(title: string, content: string, categories: string[] = []): string[] {
  const keywords = new Set<string>([
    'finance', 'accounting', 'AI', 'artificial intelligence',
    ...categories
  ]);
  
  // Add words from title
  const titleWords = title.toLowerCase().split(/\s+/)
    .filter(word => word.length > 4 && !['about', 'their', 'these', 'those', 'which', 'would', 'could', 'should'].includes(word));
  titleWords.forEach(word => keywords.add(word));
  
  return Array.from(keywords).slice(0, 10);
}

// Calculate reading time
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = stripHtml(content).split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

// Comprehensive bot/crawler detection patterns
const botPatterns = [
  // AI Assistants
  'chatgpt', 'gptbot', 'chatgpt-user', 'oai-searchbot',
  'anthropic', 'claude', 'claudebot',
  'perplexity', 'perplexitybot',
  'google-extended', 'bard',
  // Search Engines
  'googlebot', 'bingbot', 'yandexbot', 'baiduspider', 'duckduckbot',
  'slurp', 'sogou', 'exabot', 'ia_archiver',
  // Social Media
  'facebookexternalhit', 'facebot', 'fb_iab',
  'linkedinbot', 'twitterbot', 'x-bot',
  'whatsapp', 'telegrambot', 'discordbot', 'slackbot',
  'pinterest', 'redditbot', 'tumblr',
  // Other Crawlers
  'applebot', 'mj12bot', 'semrushbot', 'ahrefsbot', 'dotbot',
  'bot', 'crawler', 'spider', 'scraper', 'fetcher'
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return botPatterns.some(pattern => ua.includes(pattern));
}

const app = express();

// Trust proxy - required for apps behind reverse proxy (like published Replit apps)
// This ensures Express correctly recognizes HTTPS connections and sets secure cookies
app.set("trust proxy", 1);

// Prevent private, authentication, editing, administrative, and utility
// responses from being indexed without changing how those routes function.
app.use((req, res, next) => {
  const noIndexPath =
    /^\/api(?:\/|$)/.test(req.path) ||
    /^\/(?:login|logout|signup|register|settings|welcome|verify-email|forgot-password|reset-password|unsubscribe|admin|editor)(?:\/|$)/.test(req.path) ||
    /^\/news\/(?:add|[^/]+\/edit)\/?$/.test(req.path) ||
    /^\/podcasts\/(?:add|[^/]+\/edit)\/?$/.test(req.path);
  if (noIndexPath) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
  next();
});

// ============================================
// Robots.txt - Allow all crawlers
// ============================================
app.get('/robots.txt', (req, res) => {
  const baseUrl = getPublicOrigin(req);
  res.type('text/plain');
  res.send(`# The Digital Ledger - Robots.txt
# Welcome crawlers! We want our content indexed and shared.

# Allow all crawlers by default
User-agent: *
Allow: /
Crawl-delay: 1

# OpenAI Crawlers - Explicitly allowed
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

# Anthropic Crawlers
User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

# Search Engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Yandex
Allow: /

User-agent: DuckDuckBot
Allow: /

# Social Media
User-agent: facebookexternalhit
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: Twitterbot
Allow: /

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml
`);
});

// ============================================
// Dynamic XML Sitemap for Google indexing
// ============================================
app.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = getPublicOrigin(req);
    const xmlBaseUrl = escapeXml(baseUrl);
    const articles = await storage.getNewsArticles();
    const podcasts = await storage.getPodcastEpisodes();
    
    const now = new Date().toISOString();
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Homepage -->
  <url>
    <loc>${xmlBaseUrl}/</loc>
    <lastmod>${escapeXml(now)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Static Pages -->
  <url>
    <loc>${xmlBaseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${xmlBaseUrl}/news</loc>
    <lastmod>${escapeXml(now)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${xmlBaseUrl}/podcasts</loc>
    <lastmod>${escapeXml(now)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${xmlBaseUrl}/forums</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${xmlBaseUrl}/resources</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${xmlBaseUrl}/community</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${xmlBaseUrl}/toolbox</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;

    // Add news articles
    for (const article of articles.filter(a => !a.isArchived && a.status === 'published')) {
      const lastMod = article.publishedAt ? new Date(article.publishedAt).toISOString() : now;
      const imageUrl = resolveSafeHttpUrl(article.imageUrl, baseUrl);
      const articleLoc = `${baseUrl}/news/${encodeURIComponent(article.id)}`;
      
      sitemap += `
  <url>
    <loc>${escapeXml(articleLoc)}</loc>
    <lastmod>${escapeXml(lastMod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <news:news>
      <news:publication>
        <news:name>The Digital Ledger</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(lastMod)}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>
    ${imageUrl ? `<image:image><image:loc>${escapeXml(imageUrl)}</image:loc><image:title>${escapeXml(article.title)}</image:title></image:image>` : ''}
  </url>`;
    }

    // Add podcast episodes
    for (const podcast of podcasts.filter(p => !p.isArchived && p.status === 'published')) {
      const lastMod = podcast.publishedAt ? new Date(podcast.publishedAt).toISOString() : now;
      const podcastLoc = `${baseUrl}/podcasts/${encodeURIComponent(podcast.id)}`;
      sitemap += `
  <url>
    <loc>${escapeXml(podcastLoc)}</loc>
    <lastmod>${escapeXml(lastMod)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    sitemap += `
</urlset>`;

    res.type('application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// ============================================
// Bot-friendly article pages for ChatGPT, social media, and search engines
// Must be FIRST middleware to intercept before Vite
// ============================================
app.use(async (req, res, next) => {
  // Only handle /news/:id routes (supports both numeric and UUID IDs)
  const match = req.path.match(/^\/news\/([a-zA-Z0-9-]+)$/);
  if (!match) {
    return next();
  }
  
  try {
    const articleId = match[1];
    const article = await storage.getNewsArticle(articleId);
    if (!article || article.status !== "published" || article.isArchived) {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return res.status(404).send("Article not found");
    }

    const userAgent = req.headers['user-agent'] || '';
    const signatureAgent = req.headers['signature-agent'] as string || '';
    const isChatGPTAgent = signatureAgent.includes('chatgpt.com');
    // Valid browser requests remain SPA-rendered, after the public visibility
    // check above has prevented SPA soft-404s for private content.
    if (!isBot(userAgent) && !isChatGPTAgent) {
      return next();
    }
    
    log(`Serving SEO-optimized HTML for article ${articleId} to crawler`);
    
    // Get article categories for keywords (optional)
    const categoryNames: string[] = [];
    
    // Get author info
    let authorName = 'The Digital Ledger Team';
    if (article.authorId) {
      try {
        const author = await storage.getUser(article.authorId);
        if (author) {
          authorName = `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'The Digital Ledger Team';
        }
      } catch (e) {
        // Author optional
      }
    }
    
    const baseUrl = getPublicOrigin(req);
    const articleUrl = `${baseUrl}/news/${encodeURIComponent(article.id)}`;
    
    // Generate optimized description
    const description = article.excerpt 
      ? generateDescription(article.excerpt, 160)
      : generateDescription(article.content || '', 160);
    
    // Generate longer description for Open Graph (300 chars)
    const ogDescription = article.excerpt 
      ? generateDescription(article.excerpt, 300)
      : generateDescription(article.content || '', 300);
    
    // Ensure image URL is absolute
    const storedImageUrl = resolveSafeHttpUrl(article.imageUrl, baseUrl);
    const imageUrl =
      storedImageUrl ||
      resolveSafeHttpUrl("/og-default.png", baseUrl) ||
      `${baseUrl}/og-default.png`;
    
    // Generate keywords
    const keywords = extractKeywords(article.title, article.content || '', categoryNames);
    
    // Calculate reading time
    const readingTime = calculateReadingTime(article.content || '');
    
    // Date formatting
    const publishedAt = article.publishedAt ? new Date(article.publishedAt) : new Date();
    const publishedAtISO = publishedAt.toISOString();
    const publishDateFormatted = publishedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // JSON-LD Structured Data for Google Rich Snippets
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": article.title,
      "description": description,
      "image": [imageUrl],
      "datePublished": publishedAtISO,
      "dateModified": publishedAtISO,
      "author": {
        "@type": "Person",
        "name": authorName,
        "url": baseUrl
      },
      "publisher": {
        "@type": "Organization",
        "name": "The Digital Ledger",
        "url": baseUrl,
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/logo.png`
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": articleUrl
      },
      "articleSection": categoryNames.length > 0 ? categoryNames[0] : "Finance & Accounting",
      "keywords": keywords.join(', '),
      "wordCount": stripHtml(article.content || '').split(/\s+/).length,
      "timeRequired": `PT${readingTime}M`,
      "isAccessibleForFree": true,
      "inLanguage": "en-US"
    };
    
    // Clean article content - keep HTML structure for readability
    const articleContent = sanitizeHtml(
      article.content || "",
      ARTICLE_CONTENT_SANITIZE_OPTIONS,
    );
    const hasEmbeddedSources = (article.content || '').includes('data-article-sources="true"');
    const safeSourceUrl = resolveSafeHttpUrl(article.sourceUrl, baseUrl);
    const escapedArticleUrl = escapeHtml(articleUrl);
    const escapedBaseUrl = escapeHtml(baseUrl);
    const escapedImageUrl = escapeHtml(imageUrl);
    const escapedKeywords = escapeHtml(keywords.join(', '));
    
    const html = `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns# article: https://ogp.me/ns/article#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${escapeHtml(article.title)} | The Digital Ledger</title>
  <meta name="title" content="${escapeHtml(article.title)} | The Digital Ledger">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapedKeywords}">
  <meta name="author" content="${escapeHtml(authorName)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="googlebot" content="index, follow">
  <link rel="canonical" href="${escapedArticleUrl}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapedArticleUrl}">
  <meta property="og:title" content="${escapeHtml(article.title)}">
  <meta property="og:description" content="${escapeHtml(ogDescription)}">
  <meta property="og:image" content="${escapedImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(article.title)}">
  <meta property="og:site_name" content="The Digital Ledger">
  <meta property="og:locale" content="en_US">
  
  <!-- Article-specific Open Graph -->
  <meta property="article:published_time" content="${publishedAtISO}">
  <meta property="article:modified_time" content="${publishedAtISO}">
  <meta property="article:author" content="${escapeHtml(authorName)}">
  <meta property="article:section" content="${categoryNames.length > 0 ? escapeHtml(categoryNames[0]) : 'Finance'}">
  ${categoryNames.map(cat => `<meta property="article:tag" content="${escapeHtml(cat)}">`).join('\n  ')}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapedArticleUrl}">
  <meta name="twitter:title" content="${escapeHtml(article.title)}">
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
  <meta name="twitter:image" content="${escapedImageUrl}">
  <meta name="twitter:image:alt" content="${escapeHtml(article.title)}">
  <meta name="twitter:site" content="@thedigitalledger">
  
  <!-- LinkedIn specific -->
  <meta property="og:image:secure_url" content="${escapedImageUrl}">
  
  <!-- JSON-LD Structured Data for Google -->
  <script type="application/ld+json">
${serializeJsonForHtml(jsonLd)}
  </script>
  
  <!-- Basic styling for crawlers that render HTML -->
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { font-size: 2em; margin-bottom: 0.5em; color: #1a1a1a; }
    h2 { font-size: 1.5em; margin-top: 1.5em; color: #2a2a2a; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 1.5em; }
    .excerpt { font-size: 1.1em; font-weight: 500; color: #444; margin-bottom: 1.5em; border-left: 3px solid #0066cc; padding-left: 1em; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    article { margin-bottom: 2em; }
    .source { margin-top: 2em; padding-top: 1em; border-top: 1px solid #eee; color: #666; }
    a { color: #0066cc; }
    ul, ol { margin: 1em 0; padding-left: 1.5em; }
    li { margin: 0.5em 0; }
    p { margin: 1em 0; }
  </style>
</head>
<body>
  <article itemscope itemtype="https://schema.org/NewsArticle">
    <header>
      <h1 itemprop="headline">${escapeHtml(article.title)}</h1>
      <div class="meta">
        <span itemprop="author" itemscope itemtype="https://schema.org/Person">
          By <span itemprop="name">${escapeHtml(authorName)}</span>
        </span>
        &bull; 
        <time itemprop="datePublished" datetime="${escapeHtml(publishedAtISO)}">${escapeHtml(publishDateFormatted)}</time>
        &bull; 
        ${readingTime} min read
        ${categoryNames.length > 0 ? `&bull; ${categoryNames.map(c => escapeHtml(c)).join(', ')}` : ''}
      </div>
    </header>
    
    ${article.excerpt ? `<p class="excerpt" itemprop="description">${escapeHtml(article.excerpt)}</p>` : ''}
    
    ${storedImageUrl ? `
    <figure>
      <img src="${escapedImageUrl}" alt="${escapeHtml(article.title)}" itemprop="image">
    </figure>
    ` : ''}
    
    <div itemprop="articleBody">
      ${articleContent}
    </div>
    
    ${safeSourceUrl && !hasEmbeddedSources ? `
    <footer class="source">
      <p>Source: <a href="${escapeHtml(safeSourceUrl)}" rel="noopener noreferrer nofollow" target="_blank">${escapeHtml(article.sourceName || 'Original Source')}</a></p>
    </footer>
    ` : ''}
    
    <nav>
      <p><a href="${escapedBaseUrl}/news">← Back to all articles</a> | <a href="${escapedBaseUrl}">Visit The Digital Ledger</a></p>
    </nav>
  </article>
  
  <footer>
    <p>&copy; ${new Date().getFullYear()} The Digital Ledger. All rights reserved.</p>
  </footer>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (error) {
    console.error('Error serving bot-friendly article:', error);
    next();
  }
});

// ============================================
// Bot-friendly podcast pages for ChatGPT, social media, and search engines
// ============================================
app.use(async (req, res, next) => {
  // Handle /podcasts/:id routes
  const match = req.path.match(/^\/podcasts\/([a-zA-Z0-9-]+)$/);
  if (!match) {
    return next();
  }
  
  try {
    const podcastId = match[1];
    const podcast = await storage.getPodcastEpisode(podcastId);
    if (!podcast || podcast.isArchived || podcast.status !== "published") {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return res.status(404).type("text/plain").send("Podcast episode not found");
    }

    const userAgent = req.headers['user-agent'] || '';
    const signatureAgent = req.headers['signature-agent'] as string || '';
    const isChatGPTAgent = signatureAgent.includes('chatgpt.com');
    if (!isBot(userAgent) && !isChatGPTAgent) {
      return next();
    }
    
    log(`Serving SEO-optimized HTML for podcast ${podcastId} to crawler`);
    
    const baseUrl = getPublicOrigin(req);
    const podcastUrl = `${baseUrl}/podcasts/${encodeURIComponent(podcast.id)}`;
    const escapedBaseUrl = escapeHtml(baseUrl);
    const escapedPodcastUrl = escapeHtml(podcastUrl);
    
    const description = generateDescription(podcast.description || '', 160);
    const ogDescription = generateDescription(podcast.description || '', 300);
    
    const storedImageUrl = resolveSafeHttpUrl(podcast.imageUrl, baseUrl);
    const imageUrl =
      storedImageUrl ||
      resolveSafeHttpUrl("/og-default.png", baseUrl) ||
      `${baseUrl}/og-default.png`;
    const audioUrl = resolveSafeHttpUrl(podcast.audioUrl, baseUrl);
    const escapedImageUrl = escapeHtml(imageUrl);
    const escapedAudioUrl = audioUrl ? escapeHtml(audioUrl) : null;
    
    const keywords = extractKeywords(podcast.title, podcast.description || '', []);
    keywords.push('podcast', 'audio', 'episode');
    
    const publishedAt = podcast.publishedAt ? new Date(podcast.publishedAt) : new Date();
    const publishedAtISO = publishedAt.toISOString();
    const publishDateFormatted = publishedAt.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "PodcastEpisode",
      "name": podcast.title,
      "description": description,
      "image": imageUrl,
      "datePublished": publishedAtISO,
      "url": podcastUrl,
      "duration": podcast.duration || undefined,
      "partOfSeries": {
        "@type": "PodcastSeries",
        "name": "The Digital Ledger Podcast",
        "url": `${baseUrl}/podcasts`
      },
      "publisher": {
        "@type": "Organization",
        "name": "The Digital Ledger",
        "url": baseUrl
      }
    };
    
    const html = `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>${escapeHtml(podcast.title)} | The Digital Ledger Podcast</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(keywords.join(', '))}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapedPodcastUrl}">
  
  <meta property="og:type" content="music.song">
  <meta property="og:url" content="${escapedPodcastUrl}">
  <meta property="og:title" content="${escapeHtml(podcast.title)}">
  <meta property="og:description" content="${escapeHtml(ogDescription)}">
  <meta property="og:image" content="${escapedImageUrl}">
  <meta property="og:image:alt" content="${escapeHtml(podcast.title)}">
  <meta property="og:locale" content="en_US">
  <meta property="og:site_name" content="The Digital Ledger">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(podcast.title)}">
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
  <meta name="twitter:image" content="${escapedImageUrl}">
  <meta name="twitter:image:alt" content="${escapeHtml(podcast.title)}">
  <meta name="twitter:url" content="${escapedPodcastUrl}">
  <meta name="twitter:site" content="@thedigitalledger">
  
  <script type="application/ld+json">
${serializeJsonForHtml(jsonLd)}
  </script>
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { font-size: 2em; margin-bottom: 0.5em; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 1.5em; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    .description { margin: 1.5em 0; }
    .listen-link { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 1em; }
  </style>
</head>
<body>
  <article itemscope itemtype="https://schema.org/PodcastEpisode">
    <header>
      <h1 itemprop="name">${escapeHtml(podcast.title)}</h1>
      <div class="meta">
        <time itemprop="datePublished" datetime="${escapeHtml(publishedAtISO)}">${escapeHtml(publishDateFormatted)}</time>
        ${podcast.duration ? `&bull; ${escapeHtml(podcast.duration)}` : ''}
        ${podcast.hostName ? `&bull; Host: ${escapeHtml(podcast.hostName)}` : ''}
        ${podcast.guestName ? `&bull; Guest: ${escapeHtml(podcast.guestName)}` : ''}
      </div>
    </header>
    
    ${storedImageUrl ? `<img src="${escapeHtml(storedImageUrl)}" alt="${escapeHtml(podcast.title)}" itemprop="image">` : ''}
    
    <div class="description" itemprop="description">
      ${escapeHtml(podcast.description || '')}
    </div>
    
    ${escapedAudioUrl ? `<a href="${escapedAudioUrl}" class="listen-link" target="_blank" rel="noopener">Listen Now</a>` : ''}
    
    <nav>
      <p><a href="${escapedBaseUrl}/podcasts">← Back to all podcasts</a> | <a href="${escapedBaseUrl}">Visit The Digital Ledger</a></p>
    </nav>
  </article>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (error) {
    console.error('Error serving bot-friendly podcast:', error);
    next();
  }
});

// Validate forum detail routes for every visitor and provide complete,
// server-rendered content to recognized crawlers.
app.use(async (req, res, next) => {
  const match = req.path.match(/^\/forums\/([a-zA-Z0-9-]+)$/);
  if (!match) return next();

  try {
    const discussion = await storage.getForumDiscussion(match[1]);
    if (!discussion || discussion.status !== "published") {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return res.status(404).type("text/plain").send("Discussion not found");
    }

    const userAgent = req.headers["user-agent"] || "";
    const signatureAgent = (req.headers["signature-agent"] as string) || "";
    if (!isBot(userAgent) && !signatureAgent.includes("chatgpt.com")) {
      return next();
    }

    const baseUrl = getPublicOrigin(req);
    const discussionUrl = `${baseUrl}/forums/${encodeURIComponent(discussion.id)}`;
    const escapedDiscussionUrl = escapeHtml(discussionUrl);
    const escapedBaseUrl = escapeHtml(baseUrl);
    const imageUrl = `${baseUrl}/og-default.png`;
    const description = generateDescription(discussion.content || "", 300);
    const authorName =
      `${discussion.author?.firstName || ""} ${discussion.author?.lastName || ""}`.trim() ||
      "The Digital Ledger Community";
    const publishedAt = discussion.createdAt ? new Date(discussion.createdAt) : new Date();
    const publishedAtIso = publishedAt.toISOString();
    const publishedDate = publishedAt.toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
    const categoryName = discussion.category?.name || "Community";
    const jsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "DiscussionForumPosting",
        "headline": discussion.title,
        "text": stripHtml(discussion.content || ""),
        "description": description,
        "url": discussionUrl,
        "datePublished": publishedAtIso,
        "author": { "@type": "Person", "name": authorName },
        "publisher": {
          "@type": "Organization",
          "name": "The Digital Ledger",
          "url": baseUrl,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
          { "@type": "ListItem", "position": 2, "name": "Forums", "item": `${baseUrl}/forums` },
          { "@type": "ListItem", "position": 3, "name": discussion.title, "item": discussionUrl },
        ],
      },
    ];
    const discussionContent = sanitizeHtml(discussion.content || "", ARTICLE_CONTENT_SANITIZE_OPTIONS);
    const repliesHtml = discussion.replies.map((reply) => {
      const replyAuthor =
        `${reply.author?.firstName || ""} ${reply.author?.lastName || ""}`.trim() ||
        "Community member";
      const replyDate = reply.createdAt
        ? escapeHtml(new Date(reply.createdAt).toLocaleDateString("en-US"))
        : "";
      return `<article class="reply"><p class="meta">${escapeHtml(replyAuthor)}${replyDate ? ` · ${replyDate}` : ""}</p><div>${sanitizeHtml(reply.content || "", ARTICLE_CONTENT_SANITIZE_OPTIONS)}</div></article>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(discussion.title)} | The Digital Ledger Forums</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapedDiscussionUrl}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapedDiscussionUrl}">
  <meta property="og:title" content="${escapeHtml(discussion.title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:alt" content="The Digital Ledger Community Forums">
  <meta property="og:site_name" content="The Digital Ledger">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapedDiscussionUrl}">
  <meta name="twitter:title" content="${escapeHtml(discussion.title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:image:alt" content="The Digital Ledger Community Forums">
  <meta name="twitter:site" content="@thedigitalledger">
  <script type="application/ld+json">${serializeJsonForHtml(jsonLd)}</script>
  <style>body{font-family:system-ui,sans-serif;max-width:800px;margin:auto;padding:20px;line-height:1.6}.meta{color:#666}.reply{border-top:1px solid #ddd;margin-top:1.5em;padding-top:1em}img{max-width:100%;height:auto}</style>
</head>
<body>
  <nav aria-label="Breadcrumb"><a href="${escapedBaseUrl}">Home</a> / <a href="${escapedBaseUrl}/forums">Forums</a> / ${escapeHtml(discussion.title)}</nav>
  <main><article><h1>${escapeHtml(discussion.title)}</h1><p class="meta">Posted by ${escapeHtml(authorName)} in ${escapeHtml(categoryName)} · <time datetime="${escapeHtml(publishedAtIso)}">${escapeHtml(publishedDate)}</time></p><div>${discussionContent}</div></article>
  <section><h2>Replies</h2>${repliesHtml || "<p>No replies yet.</p>"}</section></main>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.send(html);
  } catch (error) {
    console.error("Error serving bot-friendly forum discussion:", error);
    next();
  }
});

// Bot-friendly podcasts listing page
app.use(async (req, res, next) => {
  if (req.path !== '/podcasts') {
    return next();
  }
  
  const userAgent = req.headers['user-agent'] || '';
  const signatureAgent = req.headers['signature-agent'] as string || '';
  const isChatGPTAgent = signatureAgent.includes('chatgpt.com');
  
  if (!isBot(userAgent) && !isChatGPTAgent) {
    return next();
  }
  
  try {
    log('Serving SEO-optimized HTML for podcasts listing to crawler');
    
    const podcasts = await storage.getPodcastEpisodes();
    const publishedPodcasts = podcasts.filter(p => p.status === 'published' && !p.isArchived).slice(0, 20);
    
    const baseUrl = getPublicOrigin(req);
    const escapedBaseUrl = escapeHtml(baseUrl);
    const podcastListingUrl = `${baseUrl}/podcasts`;
    const escapedPodcastListingUrl = escapeHtml(podcastListingUrl);
    const defaultImageUrl = escapeHtml(`${baseUrl}/og-default.png`);
    
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "PodcastSeries",
      "name": "The Digital Ledger Podcast Hub",
      "description": "Expert interviews, industry insights, and practical discussions about the future of Corporate Finance and Accounting",
      "url": `${baseUrl}/podcasts`,
      "publisher": {
        "@type": "Organization",
        "name": "The Digital Ledger",
        "url": baseUrl
      }
    };
    
    const podcastListHtml = publishedPodcasts.map(p => {
      const imgUrl = resolveSafeHttpUrl(p.imageUrl, baseUrl);
      const episodeUrl = escapeHtml(`${baseUrl}/podcasts/${encodeURIComponent(p.id)}`);
      const description = escapeHtml(
        generateDescription(p.description || '', 200),
      );
      const publishedDate = p.publishedAt
        ? escapeHtml(new Date(p.publishedAt).toLocaleDateString())
        : '';
      const duration = p.duration ? ` • ${escapeHtml(p.duration)}` : '';
      return `
      <article>
        <h2><a href="${episodeUrl}">${escapeHtml(p.title)}</a></h2>
        ${imgUrl ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(p.title)}" style="max-width:200px;">` : ''}
        <p>${description}</p>
        <p><small>${publishedDate}${duration}</small></p>
      </article>`;
    }).join('\n');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>Podcast Hub | The Digital Ledger</title>
  <meta name="description" content="Listen to expert interviews, industry insights, and practical discussions about the future of Corporate Finance and Accounting.">
  <meta name="keywords" content="podcast, finance, accounting, AI, corporate finance, FP&A, CFO">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapedPodcastListingUrl}">
  
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapedPodcastListingUrl}">
  <meta property="og:title" content="The Digital Ledger Podcast Hub">
  <meta property="og:description" content="Expert interviews, industry insights, and practical discussions about the future of Corporate Finance and Accounting">
  <meta property="og:image" content="${defaultImageUrl}">
  <meta property="og:image:alt" content="The Digital Ledger Podcast Hub">
  <meta property="og:locale" content="en_US">
  <meta property="og:site_name" content="The Digital Ledger">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="The Digital Ledger Podcast Hub">
  <meta name="twitter:description" content="Expert interviews and insights on Corporate Finance and Accounting">
  <meta name="twitter:image" content="${defaultImageUrl}">
  <meta name="twitter:image:alt" content="The Digital Ledger Podcast Hub">
  <meta name="twitter:url" content="${escapedPodcastListingUrl}">
  <meta name="twitter:site" content="@thedigitalledger">
  
  <script type="application/ld+json">
${serializeJsonForHtml(jsonLd)}
  </script>
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { font-size: 2em; margin-bottom: 0.5em; }
    article { border-bottom: 1px solid #eee; padding: 1.5em 0; }
    article h2 { font-size: 1.3em; margin: 0 0 0.5em 0; }
    article h2 a { color: #0066cc; text-decoration: none; }
    img { border-radius: 8px; float: left; margin-right: 1em; margin-bottom: 0.5em; }
    article::after { content: ''; display: table; clear: both; }
  </style>
</head>
<body>
  <header>
    <h1>The Digital Ledger Podcast Hub</h1>
    <p>Listen to expert interviews, industry insights, and practical discussions about the future of Corporate Finance and Accounting</p>
  </header>
  
  <main>
    ${podcastListHtml || '<p>No podcast episodes available yet.</p>'}
  </main>
  
  <nav>
    <p><a href="${escapedBaseUrl}">← Back to The Digital Ledger</a></p>
  </nav>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (error) {
    console.error('Error serving bot-friendly podcasts listing:', error);
    next();
  }
});

// ============================================
// Bot-friendly Homepage
// ============================================
app.use(async (req, res, next) => {
  if (req.path !== '/') {
    return next();
  }
  
  const userAgent = req.headers['user-agent'] || '';
  const signatureAgent = req.headers['signature-agent'] as string || '';
  const isChatGPTAgent = signatureAgent.includes('chatgpt.com');
  
  if (!isBot(userAgent) && !isChatGPTAgent) {
    return next();
  }
  
  try {
    log('Serving SEO-optimized HTML for homepage to crawler');
    
    const articles = await storage.getNewsArticles();
    const podcasts = await storage.getPodcastEpisodes();
    const recentArticles = articles.filter(a => a.status === 'published' && !a.isArchived).slice(0, 6);
    const recentPodcasts = podcasts.filter(p => p.status === 'published' && !p.isArchived).slice(0, 3);
    
    const baseUrl = getPublicOrigin(req);
    const escapedBaseUrl = escapeHtml(baseUrl);
    const defaultImageUrl = escapeHtml(`${baseUrl}/og-default.png`);
    
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "The Digital Ledger",
      "description": "Where CFOs, Controllers, FP&A leaders, and senior finance professionals come to stay sharp and stay ahead.",
      "url": baseUrl,
      "publisher": {
        "@type": "Organization",
        "name": "The Digital Ledger"
      }
    };
    
    const articlesHtml = recentArticles.map(a => `<li><a href="${escapedBaseUrl}/news/${encodeURIComponent(a.id)}">${escapeHtml(a.title)}</a></li>`).join('\n');
    const podcastsHtml = recentPodcasts.map(p => `<li><a href="${escapedBaseUrl}/podcasts/${encodeURIComponent(p.id)}">${escapeHtml(p.title)}</a></li>`).join('\n');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>The Digital Ledger | Corporate Finance & Accounting Community</title>
  <meta name="description" content="Where CFOs, Controllers, FP&A leaders, and senior finance professionals come to stay sharp and stay ahead. Join a growing community focused on AI, finance transformation, and modern corporate finance.">
  <meta name="keywords" content="corporate finance, accounting, CFO, controller, FP&A, AI, finance transformation, digital ledger">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapedBaseUrl}">
  
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapedBaseUrl}">
  <meta property="og:title" content="The Digital Ledger | Corporate Finance & Accounting Community">
  <meta property="og:description" content="Where CFOs, Controllers, FP&A leaders, and senior finance professionals come to stay sharp and stay ahead.">
  <meta property="og:image" content="${defaultImageUrl}">
  <meta property="og:image:alt" content="The Digital Ledger">
  <meta property="og:locale" content="en_US">
  <meta property="og:site_name" content="The Digital Ledger">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="The Digital Ledger">
  <meta name="twitter:description" content="Where CFOs, Controllers, FP&A leaders, and senior finance professionals stay sharp and stay ahead.">
  <meta name="twitter:image" content="${defaultImageUrl}">
  <meta name="twitter:image:alt" content="The Digital Ledger">
  <meta name="twitter:url" content="${escapedBaseUrl}">
  <meta name="twitter:site" content="@thedigitalledger">
  
  <script type="application/ld+json">
 ${serializeJsonForHtml(jsonLd)}
  </script>
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { font-size: 2.5em; color: #1a365d; }
    h2 { font-size: 1.5em; margin-top: 2em; color: #2d3748; }
    .tagline { font-size: 1.2em; color: #4a5568; }
    ul { list-style: none; padding: 0; }
    li { padding: 0.5em 0; border-bottom: 1px solid #eee; }
    a { color: #2b6cb0; text-decoration: none; }
    nav { margin-top: 2em; padding-top: 1em; border-top: 2px solid #e2e8f0; }
    nav a { margin-right: 1em; }
  </style>
</head>
<body>
  <header>
    <h1>Welcome to The Digital Ledger</h1>
    <p class="tagline"><strong>Where CFOs, Controllers, FP&A leaders, and senior finance professionals come to stay sharp and stay ahead.</strong></p>
    <p>Join a growing community focused on AI, finance transformation, and modern corporate finance.</p>
  </header>
  
  <main>
    <section>
      <h2>Latest Insights in Corporate Finance, FP&A, Accounting and AI-Driven Operations</h2>
      <ul>${articlesHtml || '<li>No articles available yet.</li>'}</ul>
      <p><a href="${escapedBaseUrl}/news">View all articles →</a></p>
    </section>
    
    <section>
      <h2>The Digital Ledger Podcast Hub</h2>
      <ul>${podcastsHtml || '<li>No podcasts available yet.</li>'}</ul>
      <p><a href="${escapedBaseUrl}/podcasts">View all podcasts →</a></p>
    </section>
  </main>
  
  <nav>
    <a href="${escapedBaseUrl}/news">News & Insights</a>
    <a href="${escapedBaseUrl}/podcasts">Podcasts</a>
    <a href="${escapedBaseUrl}/forums">Forums</a>
    <a href="${escapedBaseUrl}/resources">Resources</a>
    <a href="${escapedBaseUrl}/about">About Us</a>
  </nav>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (error) {
    console.error('Error serving bot-friendly homepage:', error);
    next();
  }
});

// ============================================
// Bot-friendly News listing page
// ============================================
app.use(async (req, res, next) => {
  if (req.path !== '/news') {
    return next();
  }
  
  const userAgent = req.headers['user-agent'] || '';
  const signatureAgent = req.headers['signature-agent'] as string || '';
  const isChatGPTAgent = signatureAgent.includes('chatgpt.com');
  
  if (!isBot(userAgent) && !isChatGPTAgent) {
    return next();
  }
  
  try {
    log('Serving SEO-optimized HTML for news listing to crawler');
    
    const articles = await storage.getNewsArticles();
    const publishedArticles = articles.filter(a => a.status === 'published' && !a.isArchived).slice(0, 20);
    
    const baseUrl = getPublicOrigin(req);
    const escapedBaseUrl = escapeHtml(baseUrl);
    const defaultImageUrl = escapeHtml(`${baseUrl}/og-default.png`);
    
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Latest Insights in Corporate Finance, FP&A, Accounting and AI-Driven Operations",
      "description": "Stay up to date with concise, high-quality insights from trusted sources, academic research, and industry leaders.",
      "url": `${baseUrl}/news`,
      "publisher": { "@type": "Organization", "name": "The Digital Ledger", "url": baseUrl }
    };
    
    const articlesHtml = publishedArticles.map(a => {
      const imgUrl = resolveSafeHttpUrl(a.imageUrl, baseUrl);
      const articleUrl = `${baseUrl}/news/${encodeURIComponent(a.id)}`;
      return `
      <article>
        <h2><a href="${escapeHtml(articleUrl)}">${escapeHtml(a.title)}</a></h2>
        ${imgUrl ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(a.title)}" style="max-width:200px;">` : ''}
        <p>${escapeHtml(generateDescription(a.excerpt || a.content || '', 200))}</p>
        <p><small>${a.publishedAt ? escapeHtml(new Date(a.publishedAt).toLocaleDateString()) : ''}</small></p>
      </article>`;
    }).join('\n');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>News & Insights | The Digital Ledger</title>
  <meta name="description" content="Stay up to date with concise, high-quality insights from trusted sources, academic research, and industry leaders. Perfect for busy finance professionals.">
  <meta name="keywords" content="finance news, accounting news, corporate finance, FP&A, AI, CFO insights">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapedBaseUrl}/news">
  
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapedBaseUrl}/news">
  <meta property="og:title" content="News & Insights | The Digital Ledger">
  <meta property="og:description" content="Stay up to date with concise, high-quality insights for finance professionals.">
  <meta property="og:image" content="${defaultImageUrl}">
  <meta property="og:image:alt" content="News and Insights from The Digital Ledger">
  <meta property="og:locale" content="en_US">
  <meta property="og:site_name" content="The Digital Ledger">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="News & Insights | The Digital Ledger">
  <meta name="twitter:description" content="Stay up to date with concise, high-quality insights for finance professionals.">
  <meta name="twitter:image" content="${defaultImageUrl}">
  <meta name="twitter:image:alt" content="News and Insights from The Digital Ledger">
  <meta name="twitter:url" content="${escapedBaseUrl}/news">
  <meta name="twitter:site" content="@thedigitalledger">
  
  <script type="application/ld+json">
${serializeJsonForHtml(jsonLd)}
  </script>
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { text-align: center; }
    .subtitle { text-align: center; color: #666; max-width: 600px; margin: 0 auto 2em; }
    article { border-bottom: 1px solid #eee; padding: 1.5em 0; }
    article h2 { font-size: 1.3em; margin: 0 0 0.5em 0; }
    article h2 a { color: #0066cc; text-decoration: none; }
    img { border-radius: 8px; float: left; margin-right: 1em; margin-bottom: 0.5em; }
    article::after { content: ''; display: table; clear: both; }
  </style>
</head>
<body>
  <header>
    <h1>Latest Insights in Corporate Finance, FP&A, Accounting and AI-Driven Operations</h1>
    <p class="subtitle">Stay up to date with concise, high-quality insights from trusted sources, academic research, and industry leaders. Perfect for busy finance professionals who want clarity without the noise.</p>
  </header>
  
  <main>
    ${articlesHtml || '<p>No articles available yet.</p>'}
  </main>
  
  <nav>
    <p><a href="${escapedBaseUrl}">← Back to The Digital Ledger</a></p>
  </nav>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (error) {
    console.error('Error serving bot-friendly news listing:', error);
    next();
  }
});

// ============================================
// Bot-friendly About page
// ============================================
app.use(async (req, res, next) => {
  if (req.path !== '/about') {
    return next();
  }
  
  const userAgent = req.headers['user-agent'] || '';
  const signatureAgent = req.headers['signature-agent'] as string || '';
  const isChatGPTAgent = signatureAgent.includes('chatgpt.com');
  
  if (!isBot(userAgent) && !isChatGPTAgent) {
    return next();
  }
  
  try {
    log('Serving SEO-optimized HTML for about page to crawler');
    
    const baseUrl = getPublicOrigin(req);
    const escapedBaseUrl = escapeHtml(baseUrl);
    const defaultImageUrl = escapeHtml(`${baseUrl}/og-default.png`);
    
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "About The Digital Ledger",
      "description": "The Digital Ledger is a community platform for CFOs, Controllers, FP&A leaders, and senior finance professionals focused on AI, finance transformation, and modern corporate finance.",
      "url": `${baseUrl}/about`,
      "publisher": { "@type": "Organization", "name": "The Digital Ledger", "url": baseUrl }
    };
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>About Us | The Digital Ledger</title>
  <meta name="description" content="The Digital Ledger is a community platform for CFOs, Controllers, FP&A leaders, and senior finance professionals focused on AI, finance transformation, and modern corporate finance.">
  <meta name="keywords" content="about, digital ledger, finance community, CFO, controller, FP&A">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapedBaseUrl}/about">
  
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapedBaseUrl}/about">
  <meta property="og:title" content="About The Digital Ledger">
  <meta property="og:description" content="A community platform for finance professionals focused on AI and modern corporate finance.">
  <meta property="og:image" content="${defaultImageUrl}">
  <meta property="og:image:alt" content="About The Digital Ledger">
  <meta property="og:locale" content="en_US">
  <meta property="og:site_name" content="The Digital Ledger">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="About The Digital Ledger">
  <meta name="twitter:description" content="A community platform for finance professionals focused on AI and modern corporate finance.">
  <meta name="twitter:image" content="${defaultImageUrl}">
  <meta name="twitter:image:alt" content="About The Digital Ledger">
  <meta name="twitter:url" content="${escapedBaseUrl}/about">
  <meta name="twitter:site" content="@thedigitalledger">
  
  <script type="application/ld+json">
${serializeJsonForHtml(jsonLd)}
  </script>
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.8; }
    h1 { color: #1a365d; }
    h2 { color: #2d3748; margin-top: 2em; }
    .mission { font-size: 1.2em; color: #4a5568; border-left: 4px solid #2b6cb0; padding-left: 1em; margin: 1.5em 0; }
  </style>
</head>
<body>
  <header>
    <h1>About The Digital Ledger</h1>
  </header>
  
  <main>
    <p class="mission">The Digital Ledger is where CFOs, Controllers, FP&A leaders, and senior finance professionals come to stay sharp and stay ahead.</p>
    
    <h2>Our Mission</h2>
    <p>We're building a growing community focused on AI, finance transformation, and modern corporate finance. Our platform provides curated news, expert podcasts, educational resources, and collaborative forums for finance professionals navigating the digital transformation of their industry.</p>
    
    <h2>What We Offer</h2>
    <ul>
      <li><strong>News & Insights:</strong> Curated articles on corporate finance, FP&A, accounting, and AI-driven operations</li>
      <li><strong>Podcast Hub:</strong> Expert interviews and discussions about the future of finance</li>
      <li><strong>Community Forums:</strong> Connect with fellow professionals and share insights</li>
      <li><strong>Educational Resources:</strong> Learn about AI tools and technologies transforming finance</li>
    </ul>
    
    <h2>Join Our Community</h2>
    <p>Whether you're a CFO leading digital transformation, a controller modernizing processes, or an FP&A professional leveraging AI, The Digital Ledger is your hub for staying ahead in the rapidly evolving world of corporate finance.</p>
  </main>
  
  <nav>
    <p><a href="${escapedBaseUrl}">← Back to The Digital Ledger</a></p>
  </nav>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (error) {
    console.error('Error serving bot-friendly about page:', error);
    next();
  }
});

// ============================================
// Bot-friendly Forums page
// ============================================
app.use(async (req, res, next) => {
  if (req.path !== '/forums') {
    return next();
  }
  
  const userAgent = req.headers['user-agent'] || '';
  const signatureAgent = req.headers['signature-agent'] as string || '';
  const isChatGPTAgent = signatureAgent.includes('chatgpt.com');
  
  if (!isBot(userAgent) && !isChatGPTAgent) {
    return next();
  }
  
  try {
    log('Serving SEO-optimized HTML for forums page to crawler');
    
    const discussions = await storage.getForumDiscussions();
    const recentDiscussions = discussions.filter(d => d.status === "published").slice(0, 15);
    
    const baseUrl = getPublicOrigin(req);
    const escapedBaseUrl = escapeHtml(baseUrl);
    const defaultImageUrl = escapeHtml(`${baseUrl}/og-default.png`);
    
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "DiscussionForumPosting",
      "name": "Community Forums | The Digital Ledger",
      "description": "Engage with fellow finance professionals, share insights, and discuss AI in accounting.",
      "url": `${baseUrl}/forums`,
      "publisher": { "@type": "Organization", "name": "The Digital Ledger", "url": baseUrl }
    };
    
    const discussionsHtml = recentDiscussions.map(d => `
      <article>
        <h3><a href="${escapedBaseUrl}/forums/${encodeURIComponent(d.id)}">${escapeHtml(d.title)}</a></h3>
         <p>${escapeHtml(generateDescription(d.content || '', 150))}</p>
         <p><small>${d.createdAt ? escapeHtml(new Date(d.createdAt).toLocaleDateString()) : ''}</small></p>
      </article>`).join('\n');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>Community Forums | The Digital Ledger</title>
  <meta name="description" content="Engage with fellow finance professionals, share insights, and discuss AI in accounting and corporate finance.">
  <meta name="keywords" content="finance forum, accounting discussion, CFO community, FP&A forum, AI accounting">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapedBaseUrl}/forums">
  
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapedBaseUrl}/forums">
  <meta property="og:title" content="Community Forums | The Digital Ledger">
  <meta property="og:description" content="Engage with fellow finance professionals and share insights.">
  <meta property="og:image" content="${defaultImageUrl}">
  <meta property="og:image:alt" content="The Digital Ledger Community Forums">
  <meta property="og:locale" content="en_US">
  <meta property="og:site_name" content="The Digital Ledger">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Community Forums | The Digital Ledger">
  <meta name="twitter:description" content="Engage with fellow finance professionals and share insights.">
  <meta name="twitter:image" content="${defaultImageUrl}">
  <meta name="twitter:image:alt" content="The Digital Ledger Community Forums">
  <meta name="twitter:url" content="${escapedBaseUrl}/forums">
  <meta name="twitter:site" content="@thedigitalledger">
  
  <script type="application/ld+json">
${serializeJsonForHtml(jsonLd)}
  </script>
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1, h2 { text-align: center; }
    .subtitle { text-align: center; color: #666; margin-bottom: 2em; }
    article { border-bottom: 1px solid #eee; padding: 1em 0; }
    article h3 { margin: 0 0 0.5em 0; color: #2b6cb0; }
  </style>
</head>
<body>
  <header>
    <h1>Community Forums</h1>
    <p class="subtitle">Engage with fellow professionals, share insights, and get answers to your finance and AI challenges</p>
  </header>
  
  <main>
    <h2>Recent Discussions</h2>
    ${discussionsHtml || '<p>No discussions available yet.</p>'}
  </main>
  
  <nav>
    <p><a href="${escapedBaseUrl}">← Back to The Digital Ledger</a></p>
  </nav>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (error) {
    console.error('Error serving bot-friendly forums page:', error);
    next();
  }
});

// ============================================
// Bot-friendly Resources page
// ============================================
app.use(async (req, res, next) => {
  if (req.path !== '/resources') {
    return next();
  }
  
  const userAgent = req.headers['user-agent'] || '';
  const signatureAgent = req.headers['signature-agent'] as string || '';
  const isChatGPTAgent = signatureAgent.includes('chatgpt.com');
  
  if (!isBot(userAgent) && !isChatGPTAgent) {
    return next();
  }
  
  try {
    log('Serving SEO-optimized HTML for resources page to crawler');
    
    const resourcesList = await storage.getResources();
    const publishedResources = resourcesList.slice(0, 20);
    
    const baseUrl = getPublicOrigin(req);
    const escapedBaseUrl = escapeHtml(baseUrl);
    const defaultImageUrl = escapeHtml(`${baseUrl}/og-default.png`);
    
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Educational Resources | The Digital Ledger",
      "description": "Comprehensive learning materials for finance professionals on AI, automation, and modern accounting practices.",
      "url": `${baseUrl}/resources`,
      "publisher": { "@type": "Organization", "name": "The Digital Ledger", "url": baseUrl }
    };
    
    const resourcesHtml = publishedResources.map(r => `
      <article>
        <h3>${escapeHtml(r.title)}</h3>
        <p>${escapeHtml(generateDescription(r.description || '', 150))}</p>
        <p><small>Type: ${escapeHtml(r.type || 'Resource')}</small></p>
      </article>`).join('\n');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>Educational Resources | The Digital Ledger</title>
  <meta name="description" content="Comprehensive learning materials for finance professionals on AI, automation, and modern accounting practices.">
  <meta name="keywords" content="finance education, accounting resources, AI learning, CFO training, FP&A education">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapedBaseUrl}/resources">
  
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapedBaseUrl}/resources">
  <meta property="og:title" content="Educational Resources | The Digital Ledger">
  <meta property="og:description" content="Comprehensive learning materials for finance professionals.">
  <meta property="og:image" content="${defaultImageUrl}">
  <meta property="og:image:alt" content="Educational Resources from The Digital Ledger">
  <meta property="og:locale" content="en_US">
  <meta property="og:site_name" content="The Digital Ledger">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Educational Resources | The Digital Ledger">
  <meta name="twitter:description" content="Comprehensive learning materials for finance professionals.">
  <meta name="twitter:image" content="${defaultImageUrl}">
  <meta name="twitter:image:alt" content="Educational Resources from The Digital Ledger">
  <meta name="twitter:url" content="${escapedBaseUrl}/resources">
  <meta name="twitter:site" content="@thedigitalledger">
  
  <script type="application/ld+json">
${serializeJsonForHtml(jsonLd)}
  </script>
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { text-align: center; }
    .subtitle { text-align: center; color: #666; margin-bottom: 2em; }
    article { border-bottom: 1px solid #eee; padding: 1em 0; }
    article h3 { margin: 0 0 0.5em 0; color: #2b6cb0; }
  </style>
</head>
<body>
  <header>
    <h1>Educational Resources</h1>
    <p class="subtitle">Comprehensive learning materials for finance professionals on AI, automation, and modern accounting practices</p>
  </header>
  
  <main>
    ${resourcesHtml || '<p>No resources available yet.</p>'}
  </main>
  
  <nav>
    <p><a href="${escapedBaseUrl}">← Back to The Digital Ledger</a></p>
  </nav>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (error) {
    console.error('Error serving bot-friendly resources page:', error);
    next();
  }
});

// ============================================
// Bot-friendly Toolbox page
// ============================================
app.use(async (req, res, next) => {
  if (req.path !== "/toolbox") return next();
  const userAgent = req.headers["user-agent"] || "";
  const signatureAgent = (req.headers["signature-agent"] as string) || "";
  if (!isBot(userAgent) && !signatureAgent.includes("chatgpt.com")) return next();

  try {
    const baseUrl = getPublicOrigin(req);
    const toolboxUrl = `${baseUrl}/toolbox`;
    const escapedToolboxUrl = escapeHtml(toolboxUrl);
    const defaultImageUrl = escapeHtml(`${baseUrl}/og-default.png`);
    const apps = await storage.getToolboxApps(true);
    const appsHtml = apps.map((tool) => {
      const safeLink = resolveSafeHttpUrl(tool.link, baseUrl);
      const safeImage = resolveSafeHttpUrl(tool.imageUrl, baseUrl);
      const title = escapeHtml(tool.name);
      return `<article>${safeImage ? `<img src="${escapeHtml(safeImage)}" alt="${title}">` : ""}<h2>${safeLink ? `<a href="${escapeHtml(safeLink)}" rel="noopener noreferrer">${title}</a>` : title}</h2><p>${escapeHtml(tool.description)}</p>${tool.section ? `<p><small>${escapeHtml(tool.section)}</small></p>` : ""}</article>`;
    }).join("\n");
    const description = "Explore practical tools for controllers, FP&A leaders, and finance teams.";
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "name": "Controller's Toolbox | The Digital Ledger",
          "description": description,
          "url": toolboxUrl,
        },
        {
          "@type": "CollectionPage",
          "name": "Controller's Toolbox",
          "url": toolboxUrl,
          "mainEntity": {
            "@type": "ItemList",
            "itemListElement": apps.map((tool, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "name": tool.name,
              ...(resolveSafeHttpUrl(tool.link, baseUrl)
                ? { "url": resolveSafeHttpUrl(tool.link, baseUrl) }
                : {}),
            })),
          },
        },
      ],
    };
    const html = `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Controller's Toolbox | The Digital Ledger</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapedToolboxUrl}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapedToolboxUrl}">
  <meta property="og:title" content="Controller's Toolbox | The Digital Ledger">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${defaultImageUrl}">
  <meta property="og:image:alt" content="Controller's Toolbox from The Digital Ledger">
  <meta property="og:site_name" content="The Digital Ledger">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapedToolboxUrl}">
  <meta name="twitter:title" content="Controller's Toolbox | The Digital Ledger">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${defaultImageUrl}">
  <meta name="twitter:image:alt" content="Controller's Toolbox from The Digital Ledger">
  <meta name="twitter:site" content="@thedigitalledger">
  <script type="application/ld+json">${serializeJsonForHtml(jsonLd)}</script>
  <style>body{font-family:system-ui,sans-serif;max-width:900px;margin:auto;padding:20px;line-height:1.6}article{border-top:1px solid #ddd;padding:1em 0}img{max-width:200px;height:auto}a{color:#0656a6}</style>
</head>
<body><main><h1>Controller's Toolbox</h1><p>Practical tools to help finance leaders streamline planning, analysis, reporting, and modern accounting operations.</p>${appsHtml || "<p>New tools are being added soon.</p>"}</main><nav><a href="${escapeHtml(baseUrl)}">The Digital Ledger</a></nav></body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.send(html);
  } catch (error) {
    console.error("Error serving bot-friendly toolbox:", error);
    next();
  }
});

// ============================================
// Bot-friendly Community page
// ============================================
app.use(async (req, res, next) => {
  if (req.path !== '/community') {
    return next();
  }
  
  const userAgent = req.headers['user-agent'] || '';
  const signatureAgent = req.headers['signature-agent'] as string || '';
  const isChatGPTAgent = signatureAgent.includes('chatgpt.com');
  
  if (!isBot(userAgent) && !isChatGPTAgent) {
    return next();
  }
  
  try {
    log('Serving SEO-optimized HTML for community page to crawler');
    
    const baseUrl = getPublicOrigin(req);
    const escapedBaseUrl = escapeHtml(baseUrl);
    const defaultImageUrl = escapeHtml(`${baseUrl}/og-default.png`);
    
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Community | The Digital Ledger",
      "description": "Join thousands of finance professionals using AI and modern tools to transform how finance operates.",
      "url": `${baseUrl}/community`,
      "publisher": { "@type": "Organization", "name": "The Digital Ledger", "url": baseUrl }
    };
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>Community | The Digital Ledger</title>
  <meta name="description" content="Join thousands of finance professionals using AI and modern tools to transform how finance operates.">
  <meta name="keywords" content="finance community, accounting professionals, CFO network, FP&A community">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapedBaseUrl}/community">
  
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapedBaseUrl}/community">
  <meta property="og:title" content="Community | The Digital Ledger">
  <meta property="og:description" content="Join thousands of finance professionals transforming how finance operates.">
  <meta property="og:image" content="${defaultImageUrl}">
  <meta property="og:image:alt" content="The Digital Ledger Finance Community">
  <meta property="og:locale" content="en_US">
  <meta property="og:site_name" content="The Digital Ledger">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Community | The Digital Ledger">
  <meta name="twitter:description" content="Join thousands of finance professionals transforming how finance operates.">
  <meta name="twitter:image" content="${defaultImageUrl}">
  <meta name="twitter:image:alt" content="The Digital Ledger Finance Community">
  <meta name="twitter:url" content="${escapedBaseUrl}/community">
  <meta name="twitter:site" content="@thedigitalledger">
  
  <script type="application/ld+json">
${serializeJsonForHtml(jsonLd)}
  </script>
  
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.8; }
    h1 { text-align: center; color: #1a365d; }
    .cta { text-align: center; font-size: 1.2em; color: #4a5568; margin: 2em 0; }
    .features { margin: 2em 0; }
    .features h2 { color: #2d3748; }
  </style>
</head>
<body>
  <header>
    <h1>Join Our Community</h1>
    <p class="cta">Join thousands of finance professionals using AI and modern tools to transform how finance operates.</p>
  </header>
  
  <main>
    <div class="features">
      <h2>Why Join The Digital Ledger Community?</h2>
      <ul>
        <li><strong>Connect:</strong> Network with CFOs, Controllers, and FP&A leaders</li>
        <li><strong>Learn:</strong> Access curated insights and educational resources</li>
        <li><strong>Discuss:</strong> Participate in forums on AI and finance transformation</li>
        <li><strong>Stay Ahead:</strong> Get the latest news on corporate finance and accounting</li>
      </ul>
    </div>
  </main>
  
  <nav>
    <p><a href="${escapedBaseUrl}">← Back to The Digital Ledger</a></p>
  </nav>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (error) {
    console.error('Error serving bot-friendly community page:', error);
    next();
  }
});

const defaultJsonParser = express.json();
app.use((req, res, next) => {
  // The importer installs its own authenticated 12 MB parser. Skipping the
  // default 100 KB parser here keeps the larger limit isolated to that route.
  if (
    req.method === "POST" &&
    req.path === "/api/automation/news/drafts"
  ) {
    return next();
  }
  return defaultJsonParser(req, res, next);
});
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Ensure engagement/popup tracking tables exist BEFORE routes are
  // registered (idempotent DDL, safe for existing databases where drizzle
  // push hasn't been run). Retries briefly, then logs a warning and starts
  // anyway — a transient DB outage must never keep the whole site down.
  // Tracking requests fail soft on the client, so browsing is unaffected.
  const ensureTrackingTables = async () => {
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`CREATE TABLE IF NOT EXISTS content_engagement (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      identity varchar NOT NULL,
      user_id varchar REFERENCES users(id) ON DELETE SET NULL,
      anon_id varchar,
      content_type varchar NOT NULL,
      content_id varchar NOT NULL,
      activity_date varchar NOT NULL,
      total_seconds integer NOT NULL DEFAULT 0,
      last_activity_at timestamp NOT NULL DEFAULT NOW(),
      created_at timestamp NOT NULL DEFAULT NOW()
    )`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_identity_content_date ON content_engagement (identity, content_type, content_id, activity_date)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_engagement_user ON content_engagement (user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_engagement_anon ON content_engagement (anon_id)`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS popup_events (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      identity varchar NOT NULL,
      user_id varchar REFERENCES users(id) ON DELETE SET NULL,
      anon_id varchar,
      trigger varchar NOT NULL,
      email_entered boolean NOT NULL DEFAULT false,
      subscribed boolean NOT NULL DEFAULT false,
      details jsonb,
      created_at timestamp NOT NULL DEFAULT NOW(),
      updated_at timestamp NOT NULL DEFAULT NOW()
    )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_popup_events_user ON popup_events (user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_popup_events_anon ON popup_events (anon_id)`);
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await ensureTrackingTables();
      break;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (attempt === 3) {
        log(`Warning: tracking tables setup failed after ${attempt} attempts: ${errorMsg}. Starting anyway; tracking endpoints may return errors until the database is reachable.`);
      } else {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  const server = await registerRoutes(app);

  // One-time backfill: mark all accounts that existed at the moment the
  // email verification feature shipped as already verified, so legacy
  // users aren't forced through the new flow. We use a marker row in a
  // tiny `app_migrations` table so this runs exactly once and can never
  // auto-verify accounts created after the migration.
  try {
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`CREATE TABLE IF NOT EXISTS app_migrations (id text PRIMARY KEY, applied_at timestamp NOT NULL DEFAULT NOW())`);
    const inserted = await db.execute(sql`INSERT INTO app_migrations (id) VALUES ('email_verified_backfill_v1') ON CONFLICT (id) DO NOTHING RETURNING id`);
    const rowCount = (inserted as { rowCount?: number }).rowCount ?? 0;
    if (rowCount > 0) {
      await db.execute(sql`UPDATE users SET email_verified = true WHERE email_verified = false`);
      log("✓ One-time emailVerified backfill applied for legacy users");
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Warning: emailVerified backfill failed: ${errorMsg}`);
  }

  // Initialize menu settings
  try {
    await storage.initializeMenuSettings();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Warning: Menu settings initialization failed: ${errorMsg}`);
  }

  // Initialize news categories
  try {
    await storage.initializeNewsCategories();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Warning: News categories initialization failed: ${errorMsg}`);
  }

  // Auto-seed database on startup if empty
  try {
    log("Checking database status...");
    const userCount = await db.select().from(users).limit(10);
    const newsCount = await db.select().from(newsArticles).limit(5);
    const podcastCount = await db.select().from(podcastEpisodes).limit(5);
    const forumCount = await db.select().from(forumDiscussions).limit(5);

    // If database appears empty or minimal, auto-seed
    if (userCount.length <= 2 || newsCount.length === 0 || podcastCount.length === 0 || forumCount.length === 0) {
      log("Database appears empty. Auto-seeding with sample data...");
      const result = await seedDatabase(false);
      if (result.success) {
        log("✓ Database auto-seeded successfully!");
      }
    } else {
      log(`✓ Database already populated (${userCount.length} users, ${newsCount.length} articles, ${podcastCount.length} podcasts, ${forumCount.length} discussions)`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Warning: Auto-seed check failed: ${errorMsg}`);
    // Continue server startup even if seeding fails
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`[Error] ${status} - ${message}`, err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
