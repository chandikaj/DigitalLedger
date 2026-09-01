import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { createHash, timingSafeEqual } from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { storage } from "./storage";
import {
  setupAuth,
  isAuthenticated,
  isAdmin,
  isEditorOrAdmin,
} from "./simpleAuth";
import {
  sendArticleNotification,
  sendPodcastNotification,
} from "./emailService";
import { getSession } from "./replitAuth"; // Keep session config
import passport from "passport";
import { setupGoogleAuth } from "./googleAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import {
  optimizedImageDiscoveryHandler,
  optimizedImageVersionedHandler,
} from "./optimizedImages";
import {
  insertNewsArticleSchema,
  insertForumCategorySchema,
  insertForumDiscussionSchema,
  insertForumReplySchema,
  insertResourceSchema,
  insertPodcastEpisodeSchema,
  insertPollSchema,
  insertUserInvitationSchema,
  insertUserSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  insertToolboxAppSchema,
  trackEngagementSchema,
  trackPopupSchema,
  updatePopupSchema,
  automationNewsDraftSchema,
  decodeAutomationCoverImageDataUri,
} from "@shared/schema";
import { seedDatabase } from "./seed";

export async function registerRoutes(app: Express): Promise<Server> {
  const safeKeyCompare = (provided: string, expected: string): boolean => {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    // Always perform a timing-safe comparison, even when lengths differ.
    return a.length === b.length
      ? timingSafeEqual(a, b)
      : (timingSafeEqual(b, b), false);
  };

  const getActiveSessionUser = async (req: any) => {
    const userId = req.session?.userId;
    if (!userId) return undefined;
    const user = await storage.getUser(userId);
    return user?.isActive ? user : undefined;
  };

  const canViewPrivateContent = (user: any): boolean =>
    user?.isActive === true &&
    (user.role === "admin" || user.role === "editor");

  // Session middleware
  app.use(getSession());

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Setup Google OAuth strategy
  setupGoogleAuth(storage);

  // Storage middleware - make storage accessible to auth middleware
  app.use((req: any, res, next) => {
    req.storage = storage;
    next();
  });

  // Auth middleware
  setupAuth(app, storage);

  // Google OAuth routes
  app.get(
    "/api/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
    }),
  );

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/login?error=google_auth_failed",
    }),
    (req: any, res) => {
      // Successful authentication
      // Set session userId (same as other auth methods)
      req.session.userId = req.user.id;

      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error after Google auth:", err);
          return res.redirect("/login?error=session_error");
        }
        // New sign-ups go to welcome page; existing logins go straight home
        const isNewUser = (req as any).authInfo?.isNewUser;
        res.redirect(isNewUser ? "/welcome" : "/");
      });
    },
  );

  // Auth route is now handled in simpleAuth.ts

  // User management routes (admin only)
  app.get("/api/admin/users", isAdmin, async (req: any, res) => {
    try {
      const { q, role, active } = req.query;
      const filters: any = {};
      if (q) filters.q = q as string;
      if (role) filters.role = role as string;
      if (active !== undefined) filters.active = active === "true";

      const users = await storage.listUsers(filters);

      // Remove password hashes and add subscription status for all users
      const sanitizedUsers = await Promise.all(
        users.map(async (user: any) => {
          const { passwordHash, ...userWithoutPassword } = user;
          const subscriber = user.email
            ? await storage.getSubscriberByEmail(user.email)
            : null;
          return {
            ...userWithoutPassword,
            isSubscribed: !!subscriber,
          };
        }),
      );

      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users/invite", isAdmin, async (req: any, res) => {
    try {
      const adminUserId = req.user.id;
      const invitationData = insertUserInvitationSchema.parse({
        ...req.body,
        invitedBy: adminUserId,
      });

      const invitation = await storage.createInvitation(invitationData);
      res.json(invitation);
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  app.patch("/api/users/:id/role", isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { role } = req.body;
      const adminUserId = req.user.id;

      // Prevent demoting the last admin
      if (role !== "admin") {
        const admins = await storage.listUsers({ role: "admin", active: true });
        if (admins.length === 1 && admins[0].id === userId) {
          return res
            .status(400)
            .json({ message: "Cannot demote the last admin" });
        }
      }

      // Prevent self-demotion if last admin
      if (userId === adminUserId && role !== "admin") {
        const admins = await storage.listUsers({ role: "admin", active: true });
        if (admins.length === 1) {
          return res
            .status(400)
            .json({ message: "Cannot demote yourself as the last admin" });
        }
      }

      await storage.setUserRole(userId, role);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch("/api/users/:id/status", isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { isActive } = req.body;
      const adminUserId = req.user.id;

      // Prevent self-deactivation if last admin
      if (!isActive && userId === adminUserId) {
        const admins = await storage.listUsers({ role: "admin", active: true });
        if (admins.length === 1) {
          return res
            .status(400)
            .json({ message: "Cannot deactivate yourself as the last admin" });
        }
      }

      await storage.setUserActive(userId, isActive);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.get("/api/users/invitations", isAdmin, async (req: any, res) => {
    try {
      const invitations = await storage.listInvitations();
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.post(
    "/api/users/invitations/:id/revoke",
    isAdmin,
    async (req: any, res) => {
      try {
        const invitationId = req.params.id;
        await storage.revokeInvitation(invitationId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error revoking invitation:", error);
        res.status(500).json({ message: "Failed to revoke invitation" });
      }
    },
  );

  // Direct user management routes (admin only)
  app.post("/api/admin/users", isAdmin, async (req: any, res) => {
    try {
      const bcrypt = await import("bcrypt");
      const result = adminCreateUserSchema.safeParse(req.body);

      if (!result.success) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: result.error.errors });
      }

      const { password, ...userData } = result.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "User already exists with this email" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      const user = await storage.createUser({
        ...userData,
        passwordHash,
      });

      // Remove password hash from response
      const { passwordHash: _, ...userResponse } = user as any;
      res.json(userResponse);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/admin/users/:id", isAdmin, async (req: any, res) => {
    try {
      const bcrypt = await import("bcrypt");
      const userId = req.params.id;
      const adminUserId = req.user.id;

      const result = adminUpdateUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: result.error.errors });
      }

      const { password, ...updates } = result.data;

      // Prevent self-demotion if last admin
      if (updates.role && updates.role !== "admin" && userId === adminUserId) {
        const admins = await storage.listUsers({ role: "admin", active: true });
        if (admins.length === 1) {
          return res
            .status(400)
            .json({ message: "Cannot demote yourself as the last admin" });
        }
      }

      // Hash password if provided
      const finalUpdates: any = { ...updates };
      if (password) {
        finalUpdates.passwordHash = await bcrypt.hash(password, 12);
      }

      const user = await storage.updateUser(userId, finalUpdates);

      // Remove password hash from response
      const { passwordHash: _, ...userResponse } = user as any;
      res.json(userResponse);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const adminUserId = req.user.id;

      // Prevent self-deletion if last admin
      const user = await storage.getUser(userId);
      if (user?.role === "admin" && userId === adminUserId) {
        const admins = await storage.listUsers({ role: "admin", active: true });
        if (admins.length === 1) {
          return res
            .status(400)
            .json({ message: "Cannot delete yourself as the last admin" });
        }
      }

      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Admin endpoint to toggle user subscription
  app.post(
    "/api/admin/users/:id/subscription",
    isAdmin,
    async (req: any, res) => {
      try {
        const userId = req.params.id;
        const { subscribe } = req.body;

        const user = await storage.getUser(userId);
        if (!user || !user.email) {
          return res
            .status(404)
            .json({ message: "User not found or has no email" });
        }

        const existingSubscriber = await storage.getSubscriberByEmail(
          user.email,
        );

        if (subscribe) {
          if (!existingSubscriber) {
            await storage.createSubscriber({
              email: user.email,
              categories: [],
              frequency: "weekly",
            });
          }
          res.json({
            message: "User subscribed successfully",
            isSubscribed: true,
          });
        } else {
          if (existingSubscriber) {
            await storage.deleteSubscriber(existingSubscriber.id);
          }
          res.json({
            message: "User unsubscribed successfully",
            isSubscribed: false,
          });
        }
      } catch (error) {
        console.error("Error toggling subscription:", error);
        res.status(500).json({ message: "Failed to toggle subscription" });
      }
    },
  );

  // Database seeding endpoint (admin only)
  app.post("/api/admin/seed-database", isAdmin, async (req: any, res) => {
    try {
      const force = req.body.force === true;
      console.log(
        "Seed database request from admin:",
        req.user.email,
        "Force:",
        force,
      );
      const result = await seedDatabase(force);
      res.json(result);
    } catch (error) {
      console.error("Error seeding database:", error);
      res.status(500).json({
        success: false,
        message: "Failed to seed database",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Menu settings routes (admin only)
  app.get("/api/menu-settings", async (req, res) => {
    try {
      const settings = await storage.getMenuSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching menu settings:", error);
      res.status(500).json({ message: "Failed to fetch menu settings" });
    }
  });

  app.patch(
    "/api/admin/menu-settings/:menuKey",
    isAdmin,
    async (req: any, res) => {
      try {
        const { menuKey } = req.params;
        const { isVisible } = req.body;

        const updated = await storage.updateMenuSetting(menuKey, { isVisible });
        if (!updated) {
          return res.status(404).json({ message: "Menu item not found" });
        }

        res.json(updated);
      } catch (error) {
        console.error("Error updating menu setting:", error);
        res.status(500).json({ message: "Failed to update menu setting" });
      }
    },
  );

  // --- Engagement & popup tracking routes (anonymous + authenticated) ---
  const getTrackingIdentity = (req: any, anonId: string) => {
    const userId: string | null = req.session?.userId || null;
    return { userId, anonId, identity: userId || anonId };
  };

  app.post("/api/track/engagement", async (req: any, res) => {
    try {
      const parsed = trackEngagementSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid payload" });
      }
      const { anonId, contentType, contentId, seconds } = parsed.data;
      const { userId, identity } = getTrackingIdentity(req, anonId);
      const activityDate = new Date().toISOString().slice(0, 10);
      await storage.upsertEngagement({
        identity,
        userId,
        anonId,
        contentType,
        contentId,
        activityDate,
        seconds,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking engagement:", error);
      res.status(500).json({ message: "Failed to track engagement" });
    }
  });

  app.post("/api/track/popup", async (req: any, res) => {
    try {
      const parsed = trackPopupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid payload" });
      }
      const { anonId, trigger, details } = parsed.data;
      const { userId, identity } = getTrackingIdentity(req, anonId);
      const event = await storage.createPopupEvent({
        identity,
        userId,
        anonId,
        trigger,
        details,
      });
      res.json({ id: event.id });
    } catch (error) {
      console.error("Error tracking popup event:", error);
      res.status(500).json({ message: "Failed to track popup event" });
    }
  });

  app.patch("/api/track/popup/:id", async (req: any, res) => {
    try {
      const parsed = updatePopupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid payload" });
      }
      const anonId = typeof req.body.anonId === "string" ? req.body.anonId : "";
      const { identity } = getTrackingIdentity(req, anonId);
      const updated = await storage.updatePopupEvent(req.params.id, identity, parsed.data);
      if (!updated) return res.status(404).json({ message: "Event not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating popup event:", error);
      res.status(500).json({ message: "Failed to update popup event" });
    }
  });

  // Link anonymous history to the logged-in user
  app.post("/api/track/identify", isAuthenticated, async (req: any, res) => {
    try {
      const anonId = typeof req.body.anonId === "string" ? req.body.anonId : "";
      if (anonId.length < 8 || anonId.length > 64) {
        return res.status(400).json({ message: "Invalid anonId" });
      }
      await storage.linkAnonToUser(anonId, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error linking anonymous identity:", error);
      res.status(500).json({ message: "Failed to link identity" });
    }
  });

  // News category routes
  app.get("/api/news-categories", async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly === "true";
      const categories = await storage.getNewsCategories(activeOnly);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching news categories:", error);
      res.status(500).json({ message: "Failed to fetch news categories" });
    }
  });

  app.get("/api/news-categories/:id", async (req, res) => {
    try {
      const category = await storage.getNewsCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching news category:", error);
      res.status(500).json({ message: "Failed to fetch news category" });
    }
  });

  app.post("/api/admin/news-categories", isAdmin, async (req: any, res) => {
    try {
      const categoryData = req.body;
      const category = await storage.createNewsCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating news category:", error);
      res.status(500).json({ message: "Failed to create news category" });
    }
  });

  app.patch(
    "/api/admin/news-categories/:id",
    isAdmin,
    async (req: any, res) => {
      try {
        const updated = await storage.updateNewsCategory(
          req.params.id,
          req.body,
        );
        if (!updated) {
          return res.status(404).json({ message: "Category not found" });
        }
        res.json(updated);
      } catch (error) {
        console.error("Error updating news category:", error);
        res.status(500).json({ message: "Failed to update news category" });
      }
    },
  );

  app.delete(
    "/api/admin/news-categories/:id",
    isAdmin,
    async (req: any, res) => {
      try {
        const deleted = await storage.deleteNewsCategory(req.params.id);
        if (!deleted) {
          return res.status(404).json({ message: "Category not found" });
        }
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting news category:", error);
        res.status(500).json({ message: "Failed to delete news category" });
      }
    },
  );

  // News routes
  app.get("/api/news", async (req: any, res) => {
    try {
      const { category, categories, limit, archivedOnly } = req.query;
      // Support both single category (legacy) and multiple categories (new)
      let categoryIds: string[] | undefined;
      if (categories) {
        // Split comma-separated string or handle array
        if (Array.isArray(categories)) {
          categoryIds = categories as string[];
        } else {
          categoryIds = (categories as string)
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);
        }
      } else if (category) {
        categoryIds = [category as string];
      }
      // Pass user role to filter by status (admins/editors see all, regular users see only published)
      // Check session for authenticated user since this is a public route
      const user = await getActiveSessionUser(req);
      const userRole = user?.role || undefined;
      if (user) {
        console.log(
          `[GET /api/news] Authenticated request, role: ${userRole}`,
        );
      } else {
        console.log(`[GET /api/news] Unauthenticated request (no session)`);
      }

      const canViewArchived =
        userRole === "admin" || userRole === "editor";
      const requestedArchived = archivedOnly === "true";
      if (requestedArchived && !canViewArchived) {
        return res.status(403).json({ message: "Archived articles require editor access" });
      }

      const articles = await storage.getNewsArticles(
        categoryIds,
        limit ? parseInt(limit as string) : undefined,
        userRole,
        requestedArchived,
      );
      console.log(
        `[GET /api/news] Returning ${articles.length} articles, userRole: ${userRole}, archivedOnly: ${archivedOnly}, statuses: ${articles.map((a) => a.status).join(", ")}`,
      );
      // Prevent browser caching to ensure React Query gets fresh data after mutations
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.json(articles);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const article = await storage.getNewsArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Draft and archived article details are editor/admin previews only.
      // Return the same 404 as a missing article so existence is not leaked.
      if (article.status !== "published" || article.isArchived) {
        const user = await getActiveSessionUser(req);
        if (!canViewPrivateContent(user)) {
          return res.status(404).json({ message: "Article not found" });
        }
      }

      res.set("Cache-Control", "no-store");
      res.json(article);
    } catch (error) {
      console.error("Error fetching news article:", error);
      res.status(500).json({ message: "Failed to fetch news article" });
    }
  });

  // --- Isolated server-to-server news draft importer ---
  // The dedicated key grants exactly one capability: create a draft.
  const articleImportBuckets = new Map<
    string,
    { windowStart: number; count: number }
  >();
  const ARTICLE_IMPORT_LIMIT = 10;
  const articleImportRateLimited = (bucket: string): boolean => {
    const now = Date.now();
    let entry = articleImportBuckets.get(bucket);
    if (!entry || now - entry.windowStart >= 60_000) {
      if (!entry && articleImportBuckets.size >= 1_000) {
        // Strict memory bound. Map iteration order is insertion order.
        const oldest = articleImportBuckets.keys().next().value;
        if (oldest) articleImportBuckets.delete(oldest);
      }
      entry = { windowStart: now, count: 1 };
      articleImportBuckets.set(bucket, entry);
      return false;
    }
    if (entry.count >= ARTICLE_IMPORT_LIMIT) return true;
    entry.count++;
    return false;
  };

  const articleImportGuard = (req: any, res: any, next: any) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");

    if (articleImportRateLimited(req.ip || "unknown")) {
      return res.status(429).json({ message: "Rate limit exceeded" });
    }

    if (!req.is("application/json")) {
      return res.status(415).json({ message: "Content-Type must be application/json" });
    }

    const expectedKey = process.env.ARTICLE_IMPORT_API_KEY;
    // Refuse to run with a missing or weak secret.
    if (!expectedKey || expectedKey.length < 32) {
      return res.status(503).json({ message: "Article import API is not configured" });
    }

    const authorization = req.headers.authorization;
    const match =
      typeof authorization === "string"
        ? authorization.match(/^Bearer ([^\s]+)$/)
        : null;
    const providedKey = match?.[1];
    if (!providedKey || !safeKeyCompare(providedKey, expectedKey)) {
      return res.status(401).json({ message: "Invalid or missing credential" });
    }

    next();
  };

  const articleImportJsonParser = express.json({ limit: "12mb" });
  const parseArticleImportJson = (req: any, res: any, next: any) => {
    articleImportJsonParser(req, res, (error?: any) => {
      if (!error) return next();
      if (error.type === "entity.too.large") {
        return res.status(413).json({
          message: "Article import request exceeds the 12 MB body limit",
        });
      }
      if (error.status === 415) {
        return res.status(415).json({
          message: "Unsupported request encoding",
        });
      }
      return res.status(400).json({ message: "Malformed JSON body" });
    });
  };

  const escapeHtml = (value: string): string =>
    value.replace(
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

  app.post(
    "/api/automation/news/drafts",
    articleImportGuard,
    parseArticleImportJson,
    async (req, res) => {
      const parsed = automationNewsDraftSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid article draft",
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      try {
        const input = parsed.data;
        const activeCategories = await storage.getNewsCategories(true);
        const categoriesBySlug = new Map(
          activeCategories.map((category) => [
            category.slug.toLowerCase(),
            category,
          ]),
        );
        const missingCategorySlugs = input.categorySlugs.filter(
          (slug) => !categoriesBySlug.has(slug.toLowerCase()),
        );
        if (missingCategorySlugs.length > 0) {
          return res.status(400).json({
            message: "One or more categories are invalid or inactive",
            invalidCategorySlugs: missingCategorySlugs,
          });
        }

        const sanitizedBody = sanitizeHtml(input.content, {
          allowedTags: [
            "p",
            "br",
            "h2",
            "h3",
            "h4",
            "strong",
            "b",
            "em",
            "i",
            "u",
            "s",
            "blockquote",
            "ul",
            "ol",
            "li",
            "a",
            "code",
            "pre",
            "hr",
            "table",
            "thead",
            "tbody",
            "tr",
            "th",
            "td",
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
        });
        const bodyText = sanitizeHtml(sanitizedBody, {
          allowedTags: [],
          allowedAttributes: {},
        }).trim();
        if (!bodyText) {
          return res.status(400).json({
            message: "Article content is empty after security sanitization",
          });
        }

        const renderSourcesHtml = (
          sourceLinks: typeof input.sourceLinks,
        ): string =>
          sourceLinks
            .map(
              (source) =>
                `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(source.name)}</a></li>`,
            )
            .join("");
        const sourcesHtml = renderSourcesHtml(input.sourceLinks);
        const sourcesSection = sourcesHtml
          ? `\n<section data-article-sources="true"><h2>Sources</h2><ol>${sourcesHtml}</ol></section>`
          : "";
        const content = `${sanitizedBody}${sourcesSection}`;
        const categoryIds = input.categorySlugs.map(
          (slug) => categoriesBySlug.get(slug.toLowerCase())!.id,
        );

        const decodedCoverImage = input.coverImageData
          ? decodeAutomationCoverImageDataUri(input.coverImageData)
          : null;
        const coverImageFingerprint = decodedCoverImage
          ? `uploaded:${decodedCoverImage.contentType}:${createHash("sha256")
              .update(decodedCoverImage.data)
              .digest("hex")}`
          : input.coverImageUrl || null;

        const calculateRequestHash = (candidate: {
          content: string;
          coverImageReference: string | null;
          sourceLinks: typeof input.sourceLinks;
        }): string =>
          createHash("sha256")
            .update(
              JSON.stringify({
                title: input.title,
                content: candidate.content,
                excerpt: input.excerpt || null,
                coverImageUrl: candidate.coverImageReference,
                sourceLinks: candidate.sourceLinks,
                categoryIds,
              }),
            )
            .digest("hex");

        const requestHash = calculateRequestHash({
          content,
          coverImageReference: coverImageFingerprint,
          sourceLinks: input.sourceLinks,
        });

        // URL canonicalization was added after the importer ledger existed.
        // Recreate the prior hash shape as a compatibility check so an exact
        // retry of an older accepted request remains idempotent.
        const compatibleRequestHashes = new Set([requestHash]);
        if (!input.coverImageData && input.coverImageUrl) {
          const legacySourceLinks = input.sourceLinks.map((source, index) => ({
            ...source,
            url: String(req.body.sourceLinks[index].url).trim(),
          }));
          const legacySourcesHtml = renderSourcesHtml(legacySourceLinks);
          const legacyContent = `${sanitizedBody}\n<section data-article-sources="true"><h2>Sources</h2><ol>${legacySourcesHtml}</ol></section>`;
          compatibleRequestHashes.add(
            calculateRequestHash({
              content: legacyContent,
              coverImageReference: String(req.body.coverImageUrl).trim(),
              sourceLinks: legacySourceLinks,
            }),
          );
        }

        const existing = await storage.getAutomationNewsDraft(input.externalId);
        if (existing) {
          if (!compatibleRequestHashes.has(existing.requestHash)) {
            return res.status(409).json({
              message:
                "externalId was already used with different article content",
            });
          }
          return res.status(200).json({
            id: existing.article.id,
            externalId: input.externalId,
            status: "draft",
            reviewPath: `/news/${existing.article.id}/edit`,
            created: false,
          });
        }

        const objectStorageService = decodedCoverImage
          ? new ObjectStorageService()
          : null;
        let uploadedObjectPath: string | null = null;
        try {
          if (decodedCoverImage && objectStorageService) {
            uploadedObjectPath = await objectStorageService.uploadPublicObject({
              ...decodedCoverImage,
              owner: "automation-article-importer",
            });
          }

          const result = await storage.createAutomationNewsDraft({
            externalId: input.externalId,
            requestHash,
            categoryIds,
            article: {
              title: input.title,
              content,
              excerpt: input.excerpt || null,
              imageUrl: uploadedObjectPath
                ? `/public-objects${uploadedObjectPath}`
                : input.coverImageUrl || null,
              thumbnailUrl: null,
              sourceName: input.sourceLinks[0]?.name || null,
              sourceUrl: input.sourceLinks[0]?.url || null,
              authorId: null,
              publishedAt: new Date(),
              status: "draft",
              isArchived: false,
              isFeatured: false,
            },
          });

          if (!result.created && uploadedObjectPath && objectStorageService) {
            await objectStorageService.deleteObjectEntity(uploadedObjectPath);
            uploadedObjectPath = null;
          }

          if (
            !result.created &&
            !compatibleRequestHashes.has(result.requestHash)
          ) {
            return res.status(409).json({
              message:
                "externalId was already used with different article content",
            });
          }

          return res.status(result.created ? 201 : 200).json({
            id: result.article.id,
            externalId: input.externalId,
            status: "draft",
            reviewPath: `/news/${result.article.id}/edit`,
            created: result.created,
          });
        } catch (error) {
          if (uploadedObjectPath && objectStorageService) {
            await objectStorageService.deleteObjectEntity(uploadedObjectPath);
          }
          throw error;
        }
      } catch (error) {
        console.error("Article draft import failed:", error);
        return res.status(500).json({ message: "Failed to import article draft" });
      }
    },
  );

  app.post("/api/news", isEditorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      // Extract categoryIds from request body (support both old and new format)
      const { categoryIds, category, ...articleFields } = req.body;
      const categoryIdsArray = categoryIds || (category ? [category] : []);

      const articleData = insertNewsArticleSchema.parse({
        ...articleFields,
        authorId: userId,
        category: "general", // Legacy field, will be overwritten by storage layer
      });
      const article = await storage.createNewsArticle(
        articleData,
        categoryIdsArray,
      );
      res.json(article);
    } catch (error) {
      console.error("Error creating news article:", error);
      res.status(500).json({ message: "Failed to create news article" });
    }
  });

  app.put("/api/news/:id", isAdmin, async (req: any, res) => {
    try {
      const articleId = req.params.id;
      // Extract categoryIds from request body (support both old and new format)
      const { categoryIds, category, ...articleFields } = req.body;
      const categoryIdsArray =
        categoryIds || (category ? [category] : undefined);

      const articleData = insertNewsArticleSchema
        .partial()
        .parse(articleFields);

      // If imageUrl is being updated, delete the old image
      if (articleData.imageUrl) {
        const existingArticle = await storage.getNewsArticle(articleId);
        if (
          existingArticle?.imageUrl &&
          existingArticle.imageUrl !== articleData.imageUrl
        ) {
          const objectStorageService = new ObjectStorageService();
          await objectStorageService.deleteObjectEntity(
            existingArticle.imageUrl,
          );
        }
      }

      const updatedArticle = await storage.updateNewsArticle(
        articleId,
        articleData,
        categoryIdsArray,
      );
      if (!updatedArticle) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(updatedArticle);
    } catch (error) {
      console.error("Error updating news article:", error);
      res.status(500).json({ message: "Failed to update news article" });
    }
  });

  app.patch("/api/news/:id", isEditorOrAdmin, async (req: any, res) => {
    try {
      const articleId = req.params.id;
      // Extract categoryIds from request body (support both old and new format)
      const { categoryIds, category, ...articleFields } = req.body;
      const categoryIdsArray =
        categoryIds || (category ? [category] : undefined);

      const articleData = insertNewsArticleSchema
        .partial()
        .parse(articleFields);

      // If imageUrl is being updated, delete the old image
      if (articleData.imageUrl) {
        const existingArticle = await storage.getNewsArticle(articleId);
        if (
          existingArticle?.imageUrl &&
          existingArticle.imageUrl !== articleData.imageUrl
        ) {
          const objectStorageService = new ObjectStorageService();
          await objectStorageService.deleteObjectEntity(
            existingArticle.imageUrl,
          );
        }
      }

      const updatedArticle = await storage.updateNewsArticle(
        articleId,
        articleData,
        categoryIdsArray,
      );
      if (!updatedArticle) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(updatedArticle);
    } catch (error) {
      console.error("Error updating news article:", error);
      res.status(500).json({ message: "Failed to update news article" });
    }
  });

  app.post("/api/news/:id/like", async (req: any, res) => {
    try {
      const articleId = req.params.id;

      // Populate req.user from session if not already set (supports both auth systems)
      if (!req.user && req.session?.userId) {
        req.user = await storage.getUser(req.session.userId);
      }

      const userId = req.user?.id;

      console.log(
        `[POST /api/news/${articleId}/like] User: ${req.user?.email || "anonymous"}, userId: ${userId || "none"}`,
      );

      // Only authenticated users can persist likes to database
      if (!userId) {
        // Anonymous users: likes stored in localStorage only, no database change
        return res.json({ success: true, anonymous: true });
      }

      // Authenticated users: increment like count in database (no toggle, always increment)
      await storage.incrementNewsArticleLikes(articleId, userId);

      // Fetch updated article to get new like count
      const updatedArticle = await storage.getNewsArticle(articleId);
      const newLikeCount = updatedArticle?.likes || 0;

      console.log(
        `[POST /api/news/${articleId}/like] Successfully incremented for ${req.user.email}. New count: ${newLikeCount}`,
      );

      res.json({ success: true, anonymous: false, likes: newLikeCount });
    } catch (error) {
      console.error("Error liking news article:", error);
      res.status(500).json({ message: "Failed to like news article" });
    }
  });

  // Get comments for an article (public)
  app.get("/api/news/:id/comments", async (req, res) => {
    try {
      const articleId = req.params.id;
      const article = await storage.getNewsArticle(articleId);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      if (article.status !== "published" || article.isArchived) {
        const user = await getActiveSessionUser(req);
        if (!canViewPrivateContent(user)) {
          return res.status(404).json({ message: "Article not found" });
        }
      }

      const comments = await storage.getNewsComments(articleId);
      res.set("Cache-Control", "no-store");
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Create a comment (requires authentication)
  app.post("/api/news/:id/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const articleId = req.params.id;
      const { content } = req.body;

      const article = await storage.getNewsArticle(articleId);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      if (
        (article.status !== "published" || article.isArchived) &&
        !canViewPrivateContent(req.user)
      ) {
        return res.status(404).json({ message: "Article not found" });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content is required" });
      }

      const comment = await storage.createNewsComment({
        articleId,
        authorId: userId,
        content: content.trim(),
      });

      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Delete a comment (owner only)
  app.delete(
    "/api/news/comments/:commentId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user?.id;
        const commentId = req.params.commentId;

        const deleted = await storage.deleteNewsComment(commentId, userId);
        if (!deleted) {
          return res
            .status(404)
            .json({
              message:
                "Comment not found or you don't have permission to delete it",
            });
        }

        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ message: "Failed to delete comment" });
      }
    },
  );

  app.delete("/api/news/:id", isAdmin, async (req: any, res) => {
    try {
      const articleId = req.params.id;
      const deleted = await storage.deleteNewsArticle(articleId);
      if (!deleted) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting news article:", error);
      res.status(500).json({ message: "Failed to delete news article" });
    }
  });

  app.patch("/api/news/:id/archive", isEditorOrAdmin, async (req: any, res) => {
    try {
      const articleId = req.params.id;
      const { isArchived } = req.body;
      if (typeof isArchived !== "boolean") {
        return res
          .status(400)
          .json({ message: "Invalid isArchived value. Must be boolean" });
      }
      const archivedArticle = await storage.archiveNewsArticle(
        articleId,
        isArchived,
      );
      if (!archivedArticle) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(archivedArticle);
    } catch (error) {
      console.error("Error archiving news article:", error);
      res.status(500).json({ message: "Failed to archive news article" });
    }
  });

  app.patch("/api/news/:id/status", isEditorOrAdmin, async (req: any, res) => {
    try {
      const articleId = req.params.id;
      const { status } = req.body;
      if (!status || (status !== "published" && status !== "draft")) {
        return res
          .status(400)
          .json({ message: "Invalid status. Must be 'published' or 'draft'" });
      }
      const updatedArticle = await storage.toggleNewsArticleStatus(
        articleId,
        status,
      );
      if (!updatedArticle) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(updatedArticle);
    } catch (error) {
      console.error("Error toggling news article status:", error);
      res.status(500).json({ message: "Failed to toggle news article status" });
    }
  });

  app.post("/api/news/:id/notify", isEditorOrAdmin, async (req: any, res) => {
    try {
      const article = await storage.getNewsArticle(req.params.id);
      if (!article) return res.status(404).json({ message: "Article not found" });
      const appUrl = process.env.APP_URL || "https://thedigitalledger.org";
      const subs = await storage.getActiveSubscribers();
      if (subs.length > 0) await sendArticleNotification(subs, article, appUrl);
      res.json({ sent: subs.length });
    } catch (error) {
      console.error("Error sending article notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  app.patch(
    "/api/news/:id/featured",
    isEditorOrAdmin,
    async (req: any, res) => {
      try {
        const articleId = req.params.id;
        const { isFeatured } = req.body;
        if (typeof isFeatured !== "boolean") {
          return res
            .status(400)
            .json({ message: "Invalid isFeatured value. Must be boolean" });
        }
        const updatedArticle = await storage.toggleNewsArticleFeatured(
          articleId,
          isFeatured,
        );
        if (!updatedArticle) {
          return res.status(404).json({ message: "Article not found" });
        }
        res.json(updatedArticle);
      } catch (error) {
        console.error("Error toggling news article featured status:", error);
        res
          .status(500)
          .json({ message: "Failed to toggle news article featured status" });
      }
    },
  );

  // Forum routes
  app.get("/api/forum/categories", async (req, res) => {
    try {
      const categories = await storage.getForumCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching forum categories:", error);
      res.status(500).json({ message: "Failed to fetch forum categories" });
    }
  });

  app.post("/api/forum/categories", isAuthenticated, async (req: any, res) => {
    try {
      const categoryData = insertForumCategorySchema.parse(req.body);
      const category = await storage.createForumCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating forum category:", error);
      res.status(500).json({ message: "Failed to create forum category" });
    }
  });

  app.get("/api/forum/discussions", async (req: any, res) => {
    try {
      const { categoryId, newsCategories, limit } = req.query;
      let newsCategoryIds: string[] | undefined;
      if (newsCategories) {
        newsCategoryIds = Array.isArray(newsCategories)
          ? (newsCategories as string[])
          : [newsCategories as string];
      }
      // Only active editor/admin sessions may receive draft discussions.
      const userRole = (await getActiveSessionUser(req))?.role ?? undefined;
      const discussions = await storage.getForumDiscussions(
        categoryId as string,
        newsCategoryIds,
        limit ? parseInt(limit as string) : undefined,
        userRole,
      );
      res.json(discussions);
    } catch (error) {
      console.error("Error fetching forum discussions:", error);
      res.status(500).json({ message: "Failed to fetch forum discussions" });
    }
  });

  app.get("/api/forum/discussions/:id", async (req, res) => {
    try {
      const discussion = await storage.getForumDiscussion(req.params.id);
      if (!discussion) {
        return res.status(404).json({ message: "Discussion not found" });
      }

      if (discussion.status !== "published") {
        const user = await getActiveSessionUser(req);
        if (!canViewPrivateContent(user)) {
          return res.status(404).json({ message: "Discussion not found" });
        }
      }

      res.set("Cache-Control", "no-store");
      res.json(discussion);
    } catch (error) {
      console.error("Error fetching forum discussion:", error);
      res.status(500).json({ message: "Failed to fetch forum discussion" });
    }
  });

  app.post("/api/forum/discussions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { newsCategoryIds, ...discussionFields } = req.body;
      const newsCategoryIdsArray = newsCategoryIds || [];
      const discussionData = insertForumDiscussionSchema.parse({
        ...discussionFields,
        authorId: userId,
      });
      const discussion = await storage.createForumDiscussion(
        discussionData,
        newsCategoryIdsArray,
      );
      res.json(discussion);
    } catch (error) {
      console.error("Error creating forum discussion:", error);
      res.status(500).json({ message: "Failed to create forum discussion" });
    }
  });

  app.patch("/api/forum/discussions/:id", isAdmin, async (req: any, res) => {
    try {
      const discussionId = req.params.id;
      const { newsCategoryIds, ...discussionFields } = req.body;
      const newsCategoryIdsArray = newsCategoryIds || undefined;
      const updates = insertForumDiscussionSchema
        .partial()
        .parse(discussionFields);
      const updated = await storage.updateForumDiscussion(
        discussionId,
        updates,
        newsCategoryIdsArray,
      );

      if (!updated) {
        return res.status(404).json({ message: "Discussion not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating forum discussion:", error);
      res.status(500).json({ message: "Failed to update forum discussion" });
    }
  });

  app.delete("/api/forum/discussions/:id", isAdmin, async (req: any, res) => {
    try {
      const discussionId = req.params.id;
      const deleted = await storage.deleteForumDiscussion(discussionId);

      if (!deleted) {
        return res.status(404).json({ message: "Discussion not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting forum discussion:", error);
      res.status(500).json({ message: "Failed to delete forum discussion" });
    }
  });

  app.patch(
    "/api/forum/discussions/:id/status",
    isEditorOrAdmin,
    async (req: any, res) => {
      try {
        const discussionId = req.params.id;
        const { status } = req.body;
        if (!status || (status !== "published" && status !== "draft")) {
          return res
            .status(400)
            .json({
              message: "Invalid status. Must be 'published' or 'draft'",
            });
        }
        const updatedDiscussion = await storage.toggleForumDiscussionStatus(
          discussionId,
          status,
        );
        if (!updatedDiscussion) {
          return res.status(404).json({ message: "Discussion not found" });
        }
        res.json(updatedDiscussion);
      } catch (error) {
        console.error("Error toggling forum discussion status:", error);
        res
          .status(500)
          .json({ message: "Failed to toggle forum discussion status" });
      }
    },
  );

  app.patch(
    "/api/forum/discussions/:id/featured",
    isEditorOrAdmin,
    async (req: any, res) => {
      try {
        const discussionId = req.params.id;
        const { isFeatured } = req.body;
        if (typeof isFeatured !== "boolean") {
          return res
            .status(400)
            .json({ message: "Invalid isFeatured value. Must be boolean" });
        }
        const updatedDiscussion = await storage.toggleForumDiscussionFeatured(
          discussionId,
          isFeatured,
        );
        if (!updatedDiscussion) {
          return res.status(404).json({ message: "Discussion not found" });
        }
        res.json(updatedDiscussion);
      } catch (error) {
        console.error(
          "Error toggling forum discussion featured status:",
          error,
        );
        res
          .status(500)
          .json({
            message: "Failed to toggle forum discussion featured status",
          });
      }
    },
  );

  app.post(
    "/api/forum/discussions/:id/like",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const discussionId = req.params.id;
        await storage.likeForumDiscussion(discussionId, userId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error liking forum discussion:", error);
        res.status(500).json({ message: "Failed to like forum discussion" });
      }
    },
  );

  app.post("/api/forum/replies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const replyData = insertForumReplySchema.parse({
        ...req.body,
        authorId: userId,
      });
      const reply = await storage.createForumReply(replyData);
      res.json(reply);
    } catch (error) {
      console.error("Error creating forum reply:", error);
      res.status(500).json({ message: "Failed to create forum reply" });
    }
  });

  app.post(
    "/api/forum/replies/:id/like",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const replyId = req.params.id;
        await storage.likeForumReply(replyId, userId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error liking forum reply:", error);
        res.status(500).json({ message: "Failed to like forum reply" });
      }
    },
  );

  // Resource routes
  app.get("/api/resources", async (req, res) => {
    try {
      const { type, category, limit, search } = req.query;

      if (search) {
        const resources = await storage.searchResources(search as string);
        res.json(resources);
      } else {
        const resources = await storage.getResources(
          type as string,
          category as string,
          limit ? parseInt(limit as string) : undefined,
        );
        res.json(resources);
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  app.post("/api/resources", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const resourceData = insertResourceSchema.parse({
        ...req.body,
        authorId: userId,
      });
      const resource = await storage.createResource(resourceData);
      res.json(resource);
    } catch (error) {
      console.error("Error creating resource:", error);
      res.status(500).json({ message: "Failed to create resource" });
    }
  });

  app.patch("/api/resources/:id", isAdmin, async (req: any, res) => {
    try {
      const resourceId = req.params.id;
      const updates = insertResourceSchema.partial().parse(req.body);
      const updated = await storage.updateResource(resourceId, updates);

      if (!updated) {
        return res.status(404).json({ message: "Resource not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating resource:", error);
      res.status(500).json({ message: "Failed to update resource" });
    }
  });

  app.delete("/api/resources/:id", isAdmin, async (req: any, res) => {
    try {
      const resourceId = req.params.id;
      const deleted = await storage.deleteResource(resourceId);

      if (!deleted) {
        return res.status(404).json({ message: "Resource not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting resource:", error);
      res.status(500).json({ message: "Failed to delete resource" });
    }
  });

  // Podcast routes
  app.get("/api/podcasts", async (req: any, res) => {
    try {
      const { categories, limit, archivedOnly } = req.query;
      let categoryIds: string[] | undefined;
      if (categories) {
        // Split comma-separated string or handle array
        if (Array.isArray(categories)) {
          categoryIds = categories as string[];
        } else {
          categoryIds = (categories as string)
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);
        }
      }
      // Pass user role to filter by status (admins/editors see all, regular users see only published)
      // Check session for authenticated user since this is a public route
      const user = await getActiveSessionUser(req);
      const userRole = user?.role || undefined;
      if (user) {
        console.log(
          `[GET /api/podcasts] Authenticated request, role: ${userRole}`,
        );
      } else {
        console.log(`[GET /api/podcasts] Unauthenticated request (no session)`);
      }

      const canViewArchived =
        userRole === "admin" || userRole === "editor";
      const requestedArchived = archivedOnly === "true";
      if (requestedArchived && !canViewArchived) {
        return res.status(403).json({ message: "Archived podcasts require editor access" });
      }

      const episodes = await storage.getPodcastEpisodes(
        categoryIds,
        limit ? parseInt(limit as string) : undefined,
        userRole,
        requestedArchived,
      );
      console.log(
        `[GET /api/podcasts] Returning ${episodes.length} episodes, userRole: ${userRole}, archivedOnly: ${archivedOnly}, statuses: ${episodes.map((e) => e.status).join(", ")}`,
      );
      res.json(episodes);
    } catch (error) {
      console.error("Error fetching podcast episodes:", error);
      res.status(500).json({ message: "Failed to fetch podcast episodes" });
    }
  });

  app.get("/api/podcasts/featured", async (req, res) => {
    try {
      const episode = await storage.getFeaturedPodcastEpisode();
      res.json(episode);
    } catch (error) {
      console.error("Error fetching featured podcast:", error);
      res.status(500).json({ message: "Failed to fetch featured podcast" });
    }
  });

  app.get("/api/podcasts/:id", async (req: any, res) => {
    try {
      const { id } = req.params;
      const episode = await storage.getPodcastEpisode(id);
      if (!episode) {
        return res.status(404).json({ message: "Podcast episode not found" });
      }

      const user = await getActiveSessionUser(req);
      const canSeeUnpublished = canViewPrivateContent(user);

      if (
        !canSeeUnpublished &&
        (episode.status !== "published" || episode.isArchived)
      ) {
        return res.status(404).json({ message: "Podcast episode not found" });
      }

      res.json(episode);
    } catch (error) {
      console.error("Error fetching podcast episode:", error);
      res.status(500).json({ message: "Failed to fetch podcast episode" });
    }
  });

  app.post("/api/podcasts", isEditorOrAdmin, async (req: any, res) => {
    try {
      const { categoryIds, ...episodeFields } = req.body;
      const categoryIdsArray = categoryIds || [];
      const episodeData = insertPodcastEpisodeSchema.parse(episodeFields);
      const episode = await storage.createPodcastEpisode(
        episodeData,
        categoryIdsArray,
      );
      res.json(episode);
    } catch (error) {
      console.error("Error creating podcast episode:", error);
      res.status(500).json({ message: "Failed to create podcast episode" });
    }
  });

  app.patch("/api/podcasts/:id", isEditorOrAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { categoryIds, ...episodeFields } = req.body;
      const categoryIdsArray = categoryIds || undefined;
      const episodeData = insertPodcastEpisodeSchema
        .partial()
        .parse(episodeFields);

      // If imageUrl is being updated, delete the old image
      if (episodeData.imageUrl) {
        const existingEpisode = await storage.getPodcastEpisode(id);
        if (
          existingEpisode?.imageUrl &&
          existingEpisode.imageUrl !== episodeData.imageUrl
        ) {
          const objectStorageService = new ObjectStorageService();
          await objectStorageService.deleteObjectEntity(
            existingEpisode.imageUrl,
          );
        }
      }

      const episode = await storage.updatePodcastEpisode(
        id,
        episodeData,
        categoryIdsArray,
      );
      if (!episode) {
        return res.status(404).json({ message: "Podcast episode not found" });
      }
      res.json(episode);
    } catch (error) {
      console.error("Error updating podcast episode:", error);
      res.status(500).json({ message: "Failed to update podcast episode" });
    }
  });

  app.delete("/api/podcasts/:id", isEditorOrAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deletePodcastEpisode(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting podcast episode:", error);
      res.status(500).json({ message: "Failed to delete podcast episode" });
    }
  });

  app.patch(
    "/api/podcasts/:id/archive",
    isEditorOrAdmin,
    async (req: any, res) => {
      try {
        const episodeId = req.params.id;
        const { isArchived } = req.body;
        if (typeof isArchived !== "boolean") {
          return res
            .status(400)
            .json({ message: "Invalid isArchived value. Must be boolean" });
        }
        const archivedEpisode = await storage.archivePodcastEpisode(
          episodeId,
          isArchived,
        );
        if (!archivedEpisode) {
          return res.status(404).json({ message: "Podcast episode not found" });
        }
        res.json(archivedEpisode);
      } catch (error) {
        console.error("Error archiving podcast episode:", error);
        res.status(500).json({ message: "Failed to archive podcast episode" });
      }
    },
  );

  app.patch(
    "/api/podcasts/:id/status",
    isEditorOrAdmin,
    async (req: any, res) => {
      try {
        const episodeId = req.params.id;
        const { status } = req.body;
        if (!status || (status !== "published" && status !== "draft")) {
          return res
            .status(400)
            .json({
              message: "Invalid status. Must be 'published' or 'draft'",
            });
        }
        const updatedEpisode = await storage.togglePodcastEpisodeStatus(
          episodeId,
          status,
        );
        if (!updatedEpisode) {
          return res.status(404).json({ message: "Podcast episode not found" });
        }
        res.json(updatedEpisode);
      } catch (error) {
        console.error("Error toggling podcast episode status:", error);
        res
          .status(500)
          .json({ message: "Failed to toggle podcast episode status" });
      }
    },
  );

  app.post("/api/podcasts/:id/notify", isEditorOrAdmin, async (req: any, res) => {
    try {
      const episode = await storage.getPodcastEpisode(req.params.id);
      if (!episode) return res.status(404).json({ message: "Episode not found" });
      const appUrl = process.env.APP_URL || "https://thedigitalledger.org";
      const subs = await storage.getActiveSubscribers();
      if (subs.length > 0) await sendPodcastNotification(subs, episode, appUrl);
      res.json({ sent: subs.length });
    } catch (error) {
      console.error("Error sending podcast notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  app.patch(
    "/api/podcasts/:id/featured",
    isEditorOrAdmin,
    async (req: any, res) => {
      try {
        const episodeId = req.params.id;
        const { isFeatured } = req.body;
        if (typeof isFeatured !== "boolean") {
          return res
            .status(400)
            .json({ message: "Invalid isFeatured value. Must be boolean" });
        }
        const updatedEpisode = await storage.togglePodcastEpisodeFeatured(
          episodeId,
          isFeatured,
        );
        if (!updatedEpisode) {
          return res.status(404).json({ message: "Podcast episode not found" });
        }
        res.json(updatedEpisode);
      } catch (error) {
        console.error("Error toggling podcast episode featured status:", error);
        res
          .status(500)
          .json({
            message: "Failed to toggle podcast episode featured status",
          });
      }
    },
  );

  app.post("/api/podcasts/:id/like", async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const episodeId = req.params.id;

      // Only authenticated users can persist likes to database
      if (!userId) {
        // Anonymous users: likes stored in localStorage only, no database change
        return res.json({ success: true, anonymous: true });
      }

      // Authenticated users: increment like count in database (no toggle, always increment)
      await storage.incrementPodcastEpisodeLikes(episodeId, userId);
      res.json({ success: true, anonymous: false });
    } catch (error) {
      console.error("Error liking podcast episode:", error);
      res.status(500).json({ message: "Failed to like podcast episode" });
    }
  });

  app.post("/api/podcasts/:id/play", async (req: any, res) => {
    try {
      const episodeId = req.params.id;

      // Increment play count for all users (authenticated and anonymous)
      await storage.incrementPodcastPlayCount(episodeId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing play count:", error);
      res.status(500).json({ message: "Failed to increment play count" });
    }
  });

  // Poll routes
  app.get("/api/polls", async (req, res) => {
    try {
      const polls = await storage.getActivePolls();
      res.json(polls);
    } catch (error) {
      console.error("Error fetching polls:", error);
      res.status(500).json({ message: "Failed to fetch polls" });
    }
  });

  app.post("/api/polls", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const pollData = insertPollSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const poll = await storage.createPoll(pollData);
      res.json(poll);
    } catch (error) {
      console.error("Error creating poll:", error);
      res.status(500).json({ message: "Failed to create poll" });
    }
  });

  app.post("/api/polls/:id/vote", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const pollId = req.params.id;
      const { optionIndex } = req.body;
      await storage.votePoll(pollId, optionIndex, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error voting on poll:", error);
      res.status(500).json({ message: "Failed to vote on poll" });
    }
  });

  // Community routes
  app.get("/api/community/contributors", async (req, res) => {
    try {
      const { limit } = req.query;
      const contributors = await storage.getTopContributors(
        limit ? parseInt(limit as string) : undefined,
      );
      res.json(contributors);
    } catch (error) {
      console.error("Error fetching top contributors:", error);
      res.status(500).json({ message: "Failed to fetch top contributors" });
    }
  });

  app.get("/api/community/stats", async (req, res) => {
    try {
      const stats = await storage.getCommunityStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching community stats:", error);
      res.status(500).json({ message: "Failed to fetch community stats" });
    }
  });

  // Object Storage routes
  app.get(
    "/optimized-images/:width/v/:version/:filePath(*)",
    optimizedImageVersionedHandler,
  );
  app.get("/optimized-images/:width/:filePath(*)", optimizedImageDiscoveryHandler);

  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      let file = await objectStorageService.searchPublicObject(filePath);

      // Entity objects live in the private directory even when their custom
      // ACL marks them public. Never stream one based on path knowledge alone.
      if (!file && filePath.startsWith("objects/")) {
        try {
          const objectPath = `/${filePath}`;
          const entityFile =
            await objectStorageService.getObjectEntityFile(objectPath);
          const isPublic = await objectStorageService.canAccessObjectEntity({
            objectFile: entityFile,
          });
          if (isPublic) {
            file = entityFile;
          }
        } catch (error) {
          // Missing, private, and invalid-ACL objects are all indistinguishable
          // to anonymous callers.
        }
      }

      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // The endpoint for getting the upload URL for an object entity.
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Article image upload endpoint
  app.put("/api/articles/images", isAuthenticated, async (req: any, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = req.user?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting article image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Podcast audio upload endpoint
  app.put("/api/podcasts/audio", isAuthenticated, async (req: any, res) => {
    if (!req.body.audioURL) {
      return res.status(400).json({ error: "audioURL is required" });
    }

    const userId = req.user?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.audioURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting podcast audio:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get current user's subscription (authenticated)
  app.get("/api/subscribers/me", isAuthenticated, async (req: any, res) => {
    try {
      // Handle both auth methods:
      // - Simple auth: req.user is full User object with email property
      // - Replit OIDC: req.user.claims contains email
      const user = req.user;
      const userEmail = user?.email || user?.claims?.email;

      if (!userEmail) {
        console.error(
          "User email not available. User object:",
          JSON.stringify(user),
        );
        return res.status(400).json({ message: "User email not available" });
      }

      const subscriber = await storage.getSubscriberByEmail(userEmail);
      if (!subscriber) {
        return res.json({ subscribed: false });
      }

      res.json({ subscribed: true, subscriber });
    } catch (error) {
      console.error("Error fetching subscriber:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // --- Public read-only API (GET only, protected by PUBLIC_API_KEY) ---
  // Simple in-memory rate limit for public endpoints (per IP, 60 req/min).
  // Fixed-window counters: O(1) memory per IP regardless of request rate.
  const publicApiBuckets = new Map<string, { windowStart: number; count: number }>();
  const PUBLIC_API_LIMIT = 60;
  const publicRateLimited = (bucket: string): boolean => {
    const now = Date.now();
    const entry = publicApiBuckets.get(bucket);
    if (!entry || now - entry.windowStart >= 60_000) {
      // New window; also evict expired buckets to keep the map bounded
      if (publicApiBuckets.size > 1000) {
        for (const [k, v] of Array.from(publicApiBuckets.entries())) {
          if (now - v.windowStart >= 60_000) publicApiBuckets.delete(k);
        }
      }
      publicApiBuckets.set(bucket, { windowStart: now, count: 1 });
      return false;
    }
    if (entry.count >= PUBLIC_API_LIMIT) return true; // don't grow state past limit
    entry.count++;
    return false;
  };

  const publicApiGuard = (allowQueryKey: boolean) => (req: any, res: any, next: any) => {
    res.set("Access-Control-Allow-Origin", "*");
    const expectedKey = process.env.PUBLIC_API_KEY;
    if (!expectedKey) {
      return res.status(503).json({ message: "Public API is not configured" });
    }
    // Header preferred; query-string keys leak into logs (legacy counts endpoint only)
    const providedKey =
      (req.headers["x-api-key"] as string | undefined) ||
      (allowQueryKey && typeof req.query.key === "string" ? req.query.key : undefined);
    if (!providedKey || !safeKeyCompare(providedKey, expectedKey)) {
      return res.status(401).json({ message: "Invalid or missing API key" });
    }
    if (publicRateLimited(req.ip || "unknown")) {
      return res.status(429).json({ message: "Rate limit exceeded" });
    }
    next();
  };

  const publicApiPreflight = (_req: any, res: any) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "x-api-key, Content-Type");
    return res.sendStatus(204);
  };

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const isValidCalendarDate = (s: string): boolean => {
    if (!DATE_RE.test(s)) return false;
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  };
  const parseCanonicalInt = (raw: unknown, fallback: number): number | null => {
    if (raw === undefined) return fallback;
    if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
    return parseInt(raw, 10);
  };
  const parseAnalyticsQuery = (
    req: any,
  ): { error?: string; contentType?: string; from?: string; to?: string; limit: number; offset: number } => {
    const { contentType, from, to } = req.query as Record<string, string | undefined>;
    if (contentType !== undefined && contentType !== "article" && contentType !== "podcast") {
      return { error: "contentType must be 'article' or 'podcast'", limit: 0, offset: 0 };
    }
    if ((from !== undefined && !isValidCalendarDate(from)) || (to !== undefined && !isValidCalendarDate(to))) {
      return { error: "from/to must be valid YYYY-MM-DD dates", limit: 0, offset: 0 };
    }
    if (from !== undefined && to !== undefined && from > to) {
      return { error: "from must not be after to", limit: 0, offset: 0 };
    }
    const rawLimit = parseCanonicalInt(req.query.limit, 50);
    const rawOffset = parseCanonicalInt(req.query.offset, 0);
    if (rawLimit === null || rawLimit < 1 || rawLimit > 200) {
      return { error: "limit must be an integer between 1 and 200", limit: 0, offset: 0 };
    }
    if (rawOffset === null || rawOffset < 0 || rawOffset > 100_000) {
      return { error: "offset must be an integer between 0 and 100000", limit: 0, offset: 0 };
    }
    return { contentType, from, to, limit: rawLimit, offset: rawOffset };
  };

  // Engagement summary: top content by total seconds (aggregates only)
  app.options("/api/public/engagement/summary", publicApiPreflight);
  app.get("/api/public/engagement/summary", publicApiGuard(false), async (req, res) => {
    const q = parseAnalyticsQuery(req);
    if (q.error) return res.status(400).json({ message: q.error });
    try {
      const rows = await storage.getEngagementSummary(q);
      return res.json({ data: rows, limit: q.limit, offset: q.offset });
    } catch (error) {
      console.error("Error fetching engagement summary:", error);
      return res.status(500).json({ message: "Failed to fetch engagement summary" });
    }
  });

  // Daily engagement time series (aggregates only)
  app.options("/api/public/engagement/daily", publicApiPreflight);
  app.get("/api/public/engagement/daily", publicApiGuard(false), async (req, res) => {
    const q = parseAnalyticsQuery(req);
    if (q.error) return res.status(400).json({ message: q.error });
    try {
      const rows = await storage.getEngagementDaily(q);
      return res.json({ data: rows });
    } catch (error) {
      console.error("Error fetching daily engagement:", error);
      return res.status(500).json({ message: "Failed to fetch daily engagement" });
    }
  });

  // Popup funnel: opens → email entered → subscribed, per trigger source
  app.options("/api/public/popups/funnel", publicApiPreflight);
  app.get("/api/public/popups/funnel", publicApiGuard(false), async (req, res) => {
    const q = parseAnalyticsQuery(req);
    if (q.error) return res.status(400).json({ message: q.error });
    try {
      const rows = await storage.getPopupFunnel(q);
      return res.json({ data: rows });
    } catch (error) {
      console.error("Error fetching popup funnel:", error);
      return res.status(500).json({ message: "Failed to fetch popup funnel" });
    }
  });

  // CORS preflight for the public counts endpoint (allows browser dashboards)
  app.options("/api/public/counts", publicApiPreflight);

  // Public counts for external dashboards — protected by an API key
  // (query-string key kept for backward compatibility with existing callers)
  app.get("/api/public/counts", publicApiGuard(true), async (req, res) => {
    try {
      const counts = await storage.getPublicCounts();
      return res.json(counts);
    } catch (error) {
      console.error("Error fetching public counts:", error);
      return res.status(500).json({ message: "Failed to fetch counts" });
    }
  });

  // Public unsubscribe via link in email — redirect to frontend page
  app.get("/api/unsubscribe", (req, res) => {
    const { id } = req.query as { id?: string };
    if (!id) {
      return res.redirect("/unsubscribe");
    }
    return res.redirect(`/unsubscribe?id=${encodeURIComponent(id)}`);
  });

  // Public: get subscriber status by id (no auth required — used by unsubscribe page)
  app.get("/api/subscribers/info", async (req, res) => {
    const { id } = req.query as { id?: string };
    if (!id) {
      return res.status(400).json({ message: "id is required" });
    }
    try {
      const subscriber = await storage.getSubscriberById(id);
      if (!subscriber) {
        return res.status(404).json({ message: "Subscriber not found" });
      }
      return res.json({ isActive: subscriber.isActive, email: subscriber.email });
    } catch (error) {
      console.error("Error fetching subscriber info:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Public: toggle subscriber isActive (no auth required — used by unsubscribe page)
  app.post("/api/subscribers/toggle", async (req, res) => {
    const { id } = req.query as { id?: string };
    if (!id) {
      return res.status(400).json({ message: "id is required" });
    }
    try {
      const subscriber = await storage.getSubscriberById(id);
      if (!subscriber) {
        return res.status(404).json({ message: "Subscriber not found" });
      }
      const newActive = !subscriber.isActive;
      await storage.updateSubscriber(id, { isActive: newActive });
      return res.json({ isActive: newActive });
    } catch (error) {
      console.error("Error toggling subscriber:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Subscriber signup endpoint (public)
  app.post("/api/subscribers", async (req, res) => {
    try {
      const { email, categories, frequency } = req.body;

      if (!email || !frequency) {
        return res
          .status(400)
          .json({ message: "Email and frequency are required" });
      }

      // Check if already subscribed
      const existing = await storage.getSubscriberByEmail(email);
      if (existing) {
        // Reactivate if previously unsubscribed; set confirmedAt to track when reactivation occurred
        const updateData: any = { categories, frequency, isActive: true };
        if (!existing.isActive) updateData.confirmedAt = new Date();
        const updated = await storage.updateSubscriber(existing.id, updateData);
        return res.json({
          message: "Subscription updated",
          subscriber: updated,
        });
      }

      // Create new subscriber
      const subscriber = await storage.createSubscriber({
        email,
        categories,
        frequency,
      });
      res.status(201).json({ message: "Successfully subscribed", subscriber });
    } catch (error) {
      console.error("Error creating subscriber:", error);
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });

  // Unsubscribe endpoint (authenticated – from app UI)
  app.post(
    "/api/subscribers/unsubscribe",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const user = req.user;
        const userEmail = user?.email || user?.claims?.email;

        if (!userEmail) {
          return res.status(400).json({ message: "User email not available" });
        }

        const subscriber = await storage.getSubscriberByEmail(userEmail);
        if (!subscriber) {
          return res.status(404).json({ message: "Not subscribed" });
        }

        // Set isActive = false instead of deleting so the record is preserved
        await storage.updateSubscriber(subscriber.id, { isActive: false });
        res.json({ message: "Successfully unsubscribed" });
      } catch (error) {
        console.error("Error unsubscribing:", error);
        res.status(500).json({ message: "Failed to unsubscribe" });
      }
    },
  );

  // ============================================
  // Controller's Toolbox Routes
  // ============================================

  // Get all toolbox apps (public - active only, admin - all)
  app.get("/api/toolbox", async (req: any, res) => {
    try {
      const isAdminUser =
        req.user?.role === "admin" || req.user?.role === "editor";
      const apps = await storage.getToolboxApps(!isAdminUser);
      res.json(apps);
    } catch (error) {
      console.error("Error fetching toolbox apps:", error);
      res.status(500).json({ message: "Failed to fetch toolbox apps" });
    }
  });

  // Upload toolbox app image (admin/editor only) - Must be before :id route
  app.put("/api/toolbox/images", isEditorOrAdmin, async (req: any, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = req.user?.claims?.sub || req.user?.id;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting toolbox image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get single toolbox app
  app.get("/api/toolbox/:id", async (req, res) => {
    try {
      const app = await storage.getToolboxApp(req.params.id);
      if (!app) {
        return res.status(404).json({ message: "App not found" });
      }
      res.json(app);
    } catch (error) {
      console.error("Error fetching toolbox app:", error);
      res.status(500).json({ message: "Failed to fetch toolbox app" });
    }
  });

  // Create toolbox app (admin only)
  app.post("/api/toolbox", isEditorOrAdmin, async (req: any, res) => {
    try {
      const appData = insertToolboxAppSchema.parse(req.body);
      const newApp = await storage.createToolboxApp(appData);
      res.status(201).json(newApp);
    } catch (error) {
      console.error("Error creating toolbox app:", error);
      res.status(500).json({ message: "Failed to create toolbox app" });
    }
  });

  // Update toolbox app (admin only)
  app.put("/api/toolbox/:id", isEditorOrAdmin, async (req: any, res) => {
    try {
      const appData = insertToolboxAppSchema.partial().parse(req.body);
      const updated = await storage.updateToolboxApp(req.params.id, appData);
      if (!updated) {
        return res.status(404).json({ message: "App not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating toolbox app:", error);
      res.status(500).json({ message: "Failed to update toolbox app" });
    }
  });

  // Delete toolbox app (admin only)
  app.delete("/api/toolbox/:id", isAdmin, async (req: any, res) => {
    try {
      const deleted = await storage.deleteToolboxApp(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "App not found" });
      }
      res.json({ message: "App deleted successfully" });
    } catch (error) {
      console.error("Error deleting toolbox app:", error);
      res.status(500).json({ message: "Failed to delete toolbox app" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
