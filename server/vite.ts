import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

const SPA_STATIC_PATHS = new Set([
  "/",
  "/about",
  "/admin",
  "/admin/categories",
  "/admin/main-page",
  "/admin/menu",
  "/admin/users",
  "/community",
  "/forgot-password",
  "/forums",
  "/login",
  "/logout",
  "/news",
  "/news/add",
  "/podcasts",
  "/podcasts/add",
  "/reset-password",
  "/resources",
  "/settings",
  "/toolbox",
  "/unsubscribe",
  "/verify-email",
  "/welcome",
]);

const SPA_DYNAMIC_PATHS = [
  /^\/forums\/[^/]+$/,
  /^\/news\/[^/]+$/,
  /^\/news\/[^/]+\/edit$/,
  /^\/podcasts\/[^/]+$/,
  /^\/podcasts\/[^/]+\/edit$/,
];

function normalizedSpaPath(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

function isKnownSpaPath(pathname: string) {
  const normalized = normalizedSpaPath(pathname);
  return (
    SPA_STATIC_PATHS.has(normalized) ||
    SPA_DYNAMIC_PATHS.some((pattern) => pattern.test(normalized))
  );
}

function applyHtmlResponseHeaders(res: express.Response, pathname: string) {
  res.setHeader("Cache-Control", "no-cache");
  if (!isKnownSpaPath(pathname)) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use("*", async (req, res, next) => {
    const pathname = new URL(req.originalUrl, "http://localhost").pathname;
    // Handle document navigations before Vite's middleware so unknown SPA
    // routes keep their real 404 status. Source-module and asset requests
    // continue to Vite below, even when their client sends a broad Accept
    // header.
    const isViteAssetRequest =
      path.extname(pathname) !== "" ||
      /^\/(?:@|src\/|node_modules\/)/.test(pathname);
    if (
      isViteAssetRequest &&
      !(req.headers.accept || "").includes("text/html")
    ) {
      return next();
    }

    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      applyHtmlResponseHeaders(res, pathname);
      res
        .status(isKnownSpaPath(pathname) ? 200 : 404)
        .set({ "Content-Type": "text/html" })
        .end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
  app.use(vite.middlewares);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(
    express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  // Serve the SPA shell for known routes and preserve the app's NotFound UI
  // with a real 404 status for unknown paths.
  app.use("*", (req, res) => {
    const pathname = new URL(req.originalUrl, "http://localhost").pathname;
    applyHtmlResponseHeaders(res, pathname);
    res
      .status(isKnownSpaPath(pathname) ? 200 : 404)
      .sendFile(path.resolve(distPath, "index.html"));
  });
}
