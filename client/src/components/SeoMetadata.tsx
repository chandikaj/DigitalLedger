import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";

const SITE_NAME = "The Digital Ledger";
const DEFAULT_TITLE =
  "The Digital Ledger | Corporate Finance & Accounting Community";
const DEFAULT_DESCRIPTION =
  "The Digital Ledger is a community platform for corporate finance and accounting professionals. Access news, podcasts, forums, and educational resources.";
const INDEX_ROBOTS =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const NOINDEX_ROBOTS = "noindex, nofollow";
const FALLBACK_PUBLIC_ORIGIN = "https://thedigitalledger.org";

export type StructuredData = Record<string, unknown>;

export interface SeoMetadata {
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  type?: string;
  image?: string | null;
  author?: string | null;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  structuredData?: StructuredData[];
}

interface MetadataEntry {
  metadata: SeoMetadata;
  priority: number;
}

const entries = new Map<symbol, MetadataEntry>();

export function getSeoOrigin() {
  const configuredOrigin =
    import.meta.env.VITE_PUBLIC_ORIGIN || FALLBACK_PUBLIC_ORIGIN;
  try {
    const url = new URL(configuredOrigin);
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.origin !== "null"
    ) {
      return url.origin;
    }
  } catch {
    // The verified production origin below remains the fail-closed fallback.
  }
  return FALLBACK_PUBLIC_ORIGIN;
}

function absoluteUrl(value: string) {
  return new URL(value, getSeoOrigin()).toString();
}

function setMeta(
  attribute: "name" | "property",
  key: string,
  value?: string | null,
) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!value) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = value;
}

function applyMetadata(metadata: SeoMetadata) {
  const canonicalUrl = absoluteUrl(metadata.canonical || window.location.pathname);
  const imageUrl = metadata.image ? absoluteUrl(metadata.image) : null;

  document.title = metadata.title;
  setMeta("name", "description", metadata.description);
  setMeta("name", "robots", metadata.robots || INDEX_ROBOTS);
  setMeta("name", "googlebot", metadata.robots || INDEX_ROBOTS);
  setMeta("name", "bingbot", metadata.robots || INDEX_ROBOTS);
  setMeta("name", "author", metadata.author);

  setMeta("property", "og:type", metadata.type || "website");
  setMeta("property", "og:url", canonicalUrl);
  setMeta("property", "og:title", metadata.title);
  setMeta("property", "og:description", metadata.description);
  setMeta("property", "og:site_name", SITE_NAME);
  setMeta("property", "og:locale", "en_US");
  setMeta("property", "og:image", imageUrl);
  setMeta("property", "article:published_time", metadata.publishedTime);
  setMeta("property", "article:modified_time", metadata.modifiedTime);

  setMeta("name", "twitter:card", imageUrl ? "summary_large_image" : "summary");
  setMeta("name", "twitter:url", canonicalUrl);
  setMeta("name", "twitter:title", metadata.title);
  setMeta("name", "twitter:description", metadata.description);
  setMeta("name", "twitter:image", imageUrl);

  let canonical = document.head.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;

  document.head
    .querySelectorAll('script[type="application/ld+json"][data-route-seo]')
    .forEach((script) => script.remove());
  metadata.structuredData?.forEach((value) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.routeSeo = "true";
    script.text = JSON.stringify(value).replace(/</g, "\\u003c");
    document.head.appendChild(script);
  });
}

function renderHighestPriorityEntry() {
  const active = Array.from(entries.values()).sort(
    (a, b) => b.priority - a.priority,
  )[0];
  applyMetadata(
    active?.metadata || {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      robots: INDEX_ROBOTS,
    },
  );
}

export function useSeoMetadata(
  metadata: SeoMetadata | null | undefined,
  priority = 10,
) {
  const key = useMemo(() => Symbol("seo-metadata"), []);
  const serialized = metadata ? JSON.stringify(metadata) : "";

  useEffect(() => {
    if (!metadata) return;
    entries.set(key, { metadata, priority });
    renderHighestPriorityEntry();
    return () => {
      entries.delete(key);
      renderHighestPriorityEntry();
    };
  }, [key, priority, serialized]);
}

const routeMetadata: Record<string, Pick<SeoMetadata, "title" | "description">> = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  "/news": {
    title: "Finance & Accounting Articles | The Digital Ledger",
    description:
      "Read practical articles on the changes shaping corporate finance, accounting, FP&A, and the work of today's finance leaders.",
  },
  "/podcasts": {
    title: "Finance & Accounting Podcast | The Digital Ledger",
    description:
      "Listen to weekly conversations about what is changing in corporate finance, accounting, FP&A, and the modern finance function.",
  },
  "/resources": {
    title: "Finance & Accounting Resources | The Digital Ledger",
    description:
      "Explore educational resources, guides, webinars, case studies, and certifications for finance and accounting professionals.",
  },
  "/forums": {
    title: "Finance & Accounting Forums | The Digital Ledger",
    description:
      "Join discussions with finance and accounting professionals about technology, compliance, careers, and the changing profession.",
  },
  "/toolbox": {
    title: "Finance & Accounting Toolbox | The Digital Ledger",
    description:
      "Access practical tools for finance and accounting professionals from The Digital Ledger.",
  },
  "/community": {
    title: "Finance & Accounting Community | The Digital Ledger",
    description:
      "Connect with The Digital Ledger community of corporate finance and accounting professionals.",
  },
  "/about": {
    title: "About The Digital Ledger",
    description:
      "Learn about The Digital Ledger, a weekly brief and community for corporate finance and accounting leaders.",
  },
};

function isPrivateOrUtilityRoute(pathname: string) {
  return (
    /^\/(login|logout|verify-email|forgot-password|reset-password|welcome|unsubscribe|settings)(\/|$)/.test(
      pathname,
    ) ||
    /^\/admin(\/|$)/.test(pathname) ||
    /^\/(news|podcasts)\/(add|[^/]+\/edit)$/.test(pathname)
  );
}

export function RouteSeoMetadata() {
  const [location] = useLocation();
  const pathname = location.split("?")[0] || "/";
  const isContentDetail =
    /^\/news\/[^/]+$/.test(pathname) || /^\/podcasts\/[^/]+$/.test(pathname);
  const configured = routeMetadata[pathname];
  const isIndexable =
    !!configured || /^\/forums\/[^/]+$/.test(pathname);
  const title =
    configured?.title ||
    (isContentDetail ? DEFAULT_TITLE : `Page | ${SITE_NAME}`);
  const description = configured?.description || DEFAULT_DESCRIPTION;

  useSeoMetadata(
    {
      title,
      description,
      canonical: pathname,
      robots:
        isPrivateOrUtilityRoute(pathname) || (!isIndexable && !isContentDetail)
          ? NOINDEX_ROBOTS
          : INDEX_ROBOTS,
    },
    0,
  );

  return null;
}