import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, isEditorOrAdmin } from "./simpleAuth";
import { getSession } from "./replitAuth"; // Keep session config
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
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
} from "@shared/schema";
import { seedDatabase } from "./seed";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(getSession());
  
  // Storage middleware - make storage accessible to auth middleware
  app.use((req: any, res, next) => {
    req.storage = storage;
    next();
  });
  
  // Auth middleware
  setupAuth(app, storage);

  // Auth route is now handled in simpleAuth.ts

  // User management routes (admin only)
  app.get('/api/admin/users', isAdmin, async (req: any, res) => {
    try {
      const { q, role, active } = req.query;
      const filters: any = {};
      if (q) filters.q = q as string;
      if (role) filters.role = role as string;
      if (active !== undefined) filters.active = active === 'true';
      
      const users = await storage.listUsers(filters);
      
      // Remove password hashes from all users
      const sanitizedUsers = users.map((user: any) => {
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users/invite', isAdmin, async (req: any, res) => {
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

  app.patch('/api/users/:id/role', isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { role } = req.body;
      const adminUserId = req.user.id;
      
      // Prevent demoting the last admin
      if (role !== 'admin') {
        const admins = await storage.listUsers({ role: 'admin', active: true });
        if (admins.length === 1 && admins[0].id === userId) {
          return res.status(400).json({ message: "Cannot demote the last admin" });
        }
      }
      
      // Prevent self-demotion if last admin
      if (userId === adminUserId && role !== 'admin') {
        const admins = await storage.listUsers({ role: 'admin', active: true });
        if (admins.length === 1) {
          return res.status(400).json({ message: "Cannot demote yourself as the last admin" });
        }
      }
      
      await storage.setUserRole(userId, role);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/users/:id/status', isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { isActive } = req.body;
      const adminUserId = req.user.id;
      
      // Prevent self-deactivation if last admin
      if (!isActive && userId === adminUserId) {
        const admins = await storage.listUsers({ role: 'admin', active: true });
        if (admins.length === 1) {
          return res.status(400).json({ message: "Cannot deactivate yourself as the last admin" });
        }
      }
      
      await storage.setUserActive(userId, isActive);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.get('/api/users/invitations', isAdmin, async (req: any, res) => {
    try {
      const invitations = await storage.listInvitations();
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.post('/api/users/invitations/:id/revoke', isAdmin, async (req: any, res) => {
    try {
      const invitationId = req.params.id;
      await storage.revokeInvitation(invitationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking invitation:", error);
      res.status(500).json({ message: "Failed to revoke invitation" });
    }
  });

  // Direct user management routes (admin only)
  app.post('/api/admin/users', isAdmin, async (req: any, res) => {
    try {
      const bcrypt = await import('bcrypt');
      const result = adminCreateUserSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      
      const { password, ...userData } = result.data;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists with this email" });
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

  app.patch('/api/admin/users/:id', isAdmin, async (req: any, res) => {
    try {
      const bcrypt = await import('bcrypt');
      const userId = req.params.id;
      const adminUserId = req.user.id;
      
      const result = adminUpdateUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      
      const { password, ...updates } = result.data;
      
      // Prevent self-demotion if last admin
      if (updates.role && updates.role !== 'admin' && userId === adminUserId) {
        const admins = await storage.listUsers({ role: 'admin', active: true });
        if (admins.length === 1) {
          return res.status(400).json({ message: "Cannot demote yourself as the last admin" });
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

  app.delete('/api/admin/users/:id', isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const adminUserId = req.user.id;
      
      // Prevent self-deletion if last admin
      const user = await storage.getUser(userId);
      if (user?.role === 'admin' && userId === adminUserId) {
        const admins = await storage.listUsers({ role: 'admin', active: true });
        if (admins.length === 1) {
          return res.status(400).json({ message: "Cannot delete yourself as the last admin" });
        }
      }
      
      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Database seeding endpoint (admin only)
  app.post('/api/admin/seed-database', isAdmin, async (req: any, res) => {
    try {
      const force = req.body.force === true;
      console.log("Seed database request from admin:", req.user.email, "Force:", force);
      const result = await seedDatabase(force);
      res.json(result);
    } catch (error) {
      console.error("Error seeding database:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to seed database", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Menu settings routes (admin only)
  app.get('/api/menu-settings', async (req, res) => {
    try {
      const settings = await storage.getMenuSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching menu settings:", error);
      res.status(500).json({ message: "Failed to fetch menu settings" });
    }
  });

  app.patch('/api/admin/menu-settings/:menuKey', isAdmin, async (req: any, res) => {
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
  });

  // News category routes
  app.get('/api/news-categories', async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const categories = await storage.getNewsCategories(activeOnly);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching news categories:", error);
      res.status(500).json({ message: "Failed to fetch news categories" });
    }
  });

  app.get('/api/news-categories/:id', async (req, res) => {
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

  app.post('/api/admin/news-categories', isAdmin, async (req: any, res) => {
    try {
      const categoryData = req.body;
      const category = await storage.createNewsCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating news category:", error);
      res.status(500).json({ message: "Failed to create news category" });
    }
  });

  app.patch('/api/admin/news-categories/:id', isAdmin, async (req: any, res) => {
    try {
      const updated = await storage.updateNewsCategory(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating news category:", error);
      res.status(500).json({ message: "Failed to update news category" });
    }
  });

  app.delete('/api/admin/news-categories/:id', isAdmin, async (req: any, res) => {
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
  });

  // News routes
  app.get('/api/news', async (req: any, res) => {
    try {
      const { category, categories, limit } = req.query;
      // Support both single category (legacy) and multiple categories (new)
      let categoryIds: string[] | undefined;
      if (categories) {
        // Split comma-separated string or handle array
        if (Array.isArray(categories)) {
          categoryIds = categories as string[];
        } else {
          categoryIds = (categories as string).split(',').map(id => id.trim()).filter(Boolean);
        }
      } else if (category) {
        categoryIds = [category as string];
      }
      // Pass user role to filter by status (admins/editors see all, regular users see only published)
      // Check session for authenticated user since this is a public route
      let userRole: string | undefined;
      if (req.session?.userId) {
        const user = await storage.getUser(req.session.userId);
        userRole = user?.role || undefined;
        console.log(`[GET /api/news] Authenticated user: ${user?.email}, role: ${userRole}`);
      } else {
        console.log(`[GET /api/news] Unauthenticated request (no session)`);
      }
      const articles = await storage.getNewsArticles(
        categoryIds,
        limit ? parseInt(limit as string) : undefined,
        userRole
      );
      console.log(`[GET /api/news] Returning ${articles.length} articles, userRole: ${userRole}, statuses: ${articles.map(a => a.status).join(', ')}`);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  app.get('/api/news/:id', async (req, res) => {
    try {
      const article = await storage.getNewsArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      console.error("Error fetching news article:", error);
      res.status(500).json({ message: "Failed to fetch news article" });
    }
  });

  app.post('/api/news', isEditorOrAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      // Extract categoryIds from request body (support both old and new format)
      const { categoryIds, category, ...articleFields } = req.body;
      const categoryIdsArray = categoryIds || (category ? [category] : []);
      
      const articleData = insertNewsArticleSchema.parse({
        ...articleFields,
        authorId: userId,
        category: 'general', // Legacy field, will be overwritten by storage layer
      });
      const article = await storage.createNewsArticle(articleData, categoryIdsArray);
      res.json(article);
    } catch (error) {
      console.error("Error creating news article:", error);
      res.status(500).json({ message: "Failed to create news article" });
    }
  });

  app.put('/api/news/:id', isAdmin, async (req: any, res) => {
    try {
      const articleId = req.params.id;
      // Extract categoryIds from request body (support both old and new format)
      const { categoryIds, category, ...articleFields } = req.body;
      const categoryIdsArray = categoryIds || (category ? [category] : undefined);
      
      const articleData = insertNewsArticleSchema.partial().parse(articleFields);
      const updatedArticle = await storage.updateNewsArticle(articleId, articleData, categoryIdsArray);
      if (!updatedArticle) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(updatedArticle);
    } catch (error) {
      console.error("Error updating news article:", error);
      res.status(500).json({ message: "Failed to update news article" });
    }
  });

  app.patch('/api/news/:id', isEditorOrAdmin, async (req: any, res) => {
    try {
      const articleId = req.params.id;
      // Extract categoryIds from request body (support both old and new format)
      const { categoryIds, category, ...articleFields } = req.body;
      const categoryIdsArray = categoryIds || (category ? [category] : undefined);
      
      const articleData = insertNewsArticleSchema.partial().parse(articleFields);
      const updatedArticle = await storage.updateNewsArticle(articleId, articleData, categoryIdsArray);
      if (!updatedArticle) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(updatedArticle);
    } catch (error) {
      console.error("Error updating news article:", error);
      res.status(500).json({ message: "Failed to update news article" });
    }
  });

  app.post('/api/news/:id/like', async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const articleId = req.params.id;
      
      // Only authenticated users can persist likes to database
      if (!userId) {
        // Anonymous users: likes stored in localStorage only, no database change
        return res.json({ success: true, anonymous: true });
      }
      
      // Authenticated users: increment like count in database (no toggle, always increment)
      await storage.incrementNewsArticleLikes(articleId, userId);
      res.json({ success: true, anonymous: false });
    } catch (error) {
      console.error("Error liking news article:", error);
      res.status(500).json({ message: "Failed to like news article" });
    }
  });

  app.delete('/api/news/:id', isAdmin, async (req: any, res) => {
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

  app.patch('/api/news/:id/archive', isAdmin, async (req: any, res) => {
    try {
      const articleId = req.params.id;
      const archivedArticle = await storage.archiveNewsArticle(articleId);
      if (!archivedArticle) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(archivedArticle);
    } catch (error) {
      console.error("Error archiving news article:", error);
      res.status(500).json({ message: "Failed to archive news article" });
    }
  });

  app.patch('/api/news/:id/status', isEditorOrAdmin, async (req: any, res) => {
    try {
      const articleId = req.params.id;
      const { status } = req.body;
      if (!status || (status !== 'published' && status !== 'draft')) {
        return res.status(400).json({ message: "Invalid status. Must be 'published' or 'draft'" });
      }
      const updatedArticle = await storage.toggleNewsArticleStatus(articleId, status);
      if (!updatedArticle) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(updatedArticle);
    } catch (error) {
      console.error("Error toggling news article status:", error);
      res.status(500).json({ message: "Failed to toggle news article status" });
    }
  });

  app.patch('/api/news/:id/featured', isEditorOrAdmin, async (req: any, res) => {
    try {
      const articleId = req.params.id;
      const { isFeatured } = req.body;
      if (typeof isFeatured !== 'boolean') {
        return res.status(400).json({ message: "Invalid isFeatured value. Must be boolean" });
      }
      const updatedArticle = await storage.toggleNewsArticleFeatured(articleId, isFeatured);
      if (!updatedArticle) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(updatedArticle);
    } catch (error) {
      console.error("Error toggling news article featured status:", error);
      res.status(500).json({ message: "Failed to toggle news article featured status" });
    }
  });

  // Forum routes
  app.get('/api/forum/categories', async (req, res) => {
    try {
      const categories = await storage.getForumCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching forum categories:", error);
      res.status(500).json({ message: "Failed to fetch forum categories" });
    }
  });

  app.post('/api/forum/categories', isAuthenticated, async (req: any, res) => {
    try {
      const categoryData = insertForumCategorySchema.parse(req.body);
      const category = await storage.createForumCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating forum category:", error);
      res.status(500).json({ message: "Failed to create forum category" });
    }
  });

  app.get('/api/forum/discussions', async (req: any, res) => {
    try {
      const { categoryId, newsCategories, limit } = req.query;
      let newsCategoryIds: string[] | undefined;
      if (newsCategories) {
        newsCategoryIds = Array.isArray(newsCategories) ? newsCategories as string[] : [newsCategories as string];
      }
      // Pass user role to filter by status
      const userRole = req.user?.role;
      const discussions = await storage.getForumDiscussions(
        categoryId as string,
        newsCategoryIds,
        limit ? parseInt(limit as string) : undefined,
        userRole
      );
      res.json(discussions);
    } catch (error) {
      console.error("Error fetching forum discussions:", error);
      res.status(500).json({ message: "Failed to fetch forum discussions" });
    }
  });

  app.get('/api/forum/discussions/:id', async (req, res) => {
    try {
      const discussion = await storage.getForumDiscussion(req.params.id);
      if (!discussion) {
        return res.status(404).json({ message: "Discussion not found" });
      }
      res.json(discussion);
    } catch (error) {
      console.error("Error fetching forum discussion:", error);
      res.status(500).json({ message: "Failed to fetch forum discussion" });
    }
  });

  app.post('/api/forum/discussions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { newsCategoryIds, ...discussionFields } = req.body;
      const newsCategoryIdsArray = newsCategoryIds || [];
      const discussionData = insertForumDiscussionSchema.parse({
        ...discussionFields,
        authorId: userId,
      });
      const discussion = await storage.createForumDiscussion(discussionData, newsCategoryIdsArray);
      res.json(discussion);
    } catch (error) {
      console.error("Error creating forum discussion:", error);
      res.status(500).json({ message: "Failed to create forum discussion" });
    }
  });

  app.patch('/api/forum/discussions/:id', isAdmin, async (req: any, res) => {
    try {
      const discussionId = req.params.id;
      const { newsCategoryIds, ...discussionFields } = req.body;
      const newsCategoryIdsArray = newsCategoryIds || undefined;
      const updates = insertForumDiscussionSchema.partial().parse(discussionFields);
      const updated = await storage.updateForumDiscussion(discussionId, updates, newsCategoryIdsArray);
      
      if (!updated) {
        return res.status(404).json({ message: "Discussion not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating forum discussion:", error);
      res.status(500).json({ message: "Failed to update forum discussion" });
    }
  });

  app.delete('/api/forum/discussions/:id', isAdmin, async (req: any, res) => {
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

  app.patch('/api/forum/discussions/:id/status', isEditorOrAdmin, async (req: any, res) => {
    try {
      const discussionId = req.params.id;
      const { status } = req.body;
      if (!status || (status !== 'published' && status !== 'draft')) {
        return res.status(400).json({ message: "Invalid status. Must be 'published' or 'draft'" });
      }
      const updatedDiscussion = await storage.toggleForumDiscussionStatus(discussionId, status);
      if (!updatedDiscussion) {
        return res.status(404).json({ message: "Discussion not found" });
      }
      res.json(updatedDiscussion);
    } catch (error) {
      console.error("Error toggling forum discussion status:", error);
      res.status(500).json({ message: "Failed to toggle forum discussion status" });
    }
  });

  app.patch('/api/forum/discussions/:id/featured', isEditorOrAdmin, async (req: any, res) => {
    try {
      const discussionId = req.params.id;
      const { isFeatured } = req.body;
      if (typeof isFeatured !== 'boolean') {
        return res.status(400).json({ message: "Invalid isFeatured value. Must be boolean" });
      }
      const updatedDiscussion = await storage.toggleForumDiscussionFeatured(discussionId, isFeatured);
      if (!updatedDiscussion) {
        return res.status(404).json({ message: "Discussion not found" });
      }
      res.json(updatedDiscussion);
    } catch (error) {
      console.error("Error toggling forum discussion featured status:", error);
      res.status(500).json({ message: "Failed to toggle forum discussion featured status" });
    }
  });

  app.post('/api/forum/discussions/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const discussionId = req.params.id;
      await storage.likeForumDiscussion(discussionId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error liking forum discussion:", error);
      res.status(500).json({ message: "Failed to like forum discussion" });
    }
  });

  app.post('/api/forum/replies', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/forum/replies/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const replyId = req.params.id;
      await storage.likeForumReply(replyId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error liking forum reply:", error);
      res.status(500).json({ message: "Failed to like forum reply" });
    }
  });

  // Resource routes
  app.get('/api/resources', async (req, res) => {
    try {
      const { type, category, limit, search } = req.query;
      
      if (search) {
        const resources = await storage.searchResources(search as string);
        res.json(resources);
      } else {
        const resources = await storage.getResources(
          type as string,
          category as string,
          limit ? parseInt(limit as string) : undefined
        );
        res.json(resources);
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  app.post('/api/resources', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/resources/:id', isAdmin, async (req: any, res) => {
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

  app.delete('/api/resources/:id', isAdmin, async (req: any, res) => {
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
  app.get('/api/podcasts', async (req: any, res) => {
    try {
      const { categories, limit } = req.query;
      let categoryIds: string[] | undefined;
      if (categories) {
        // Split comma-separated string or handle array
        if (Array.isArray(categories)) {
          categoryIds = categories as string[];
        } else {
          categoryIds = (categories as string).split(',').map(id => id.trim()).filter(Boolean);
        }
      }
      // Pass user role to filter by status (admins/editors see all, regular users see only published)
      // Check session for authenticated user since this is a public route
      let userRole: string | undefined;
      if (req.session?.userId) {
        const user = await storage.getUser(req.session.userId);
        userRole = user?.role || undefined;
        console.log(`[GET /api/podcasts] Authenticated user: ${user?.email}, role: ${userRole}`);
      } else {
        console.log(`[GET /api/podcasts] Unauthenticated request (no session)`);
      }
      const episodes = await storage.getPodcastEpisodes(
        categoryIds,
        limit ? parseInt(limit as string) : undefined,
        userRole
      );
      console.log(`[GET /api/podcasts] Returning ${episodes.length} episodes, userRole: ${userRole}, statuses: ${episodes.map(e => e.status).join(', ')}`);
      res.json(episodes);
    } catch (error) {
      console.error("Error fetching podcast episodes:", error);
      res.status(500).json({ message: "Failed to fetch podcast episodes" });
    }
  });

  app.get('/api/podcasts/featured', async (req, res) => {
    try {
      const episode = await storage.getFeaturedPodcastEpisode();
      res.json(episode);
    } catch (error) {
      console.error("Error fetching featured podcast:", error);
      res.status(500).json({ message: "Failed to fetch featured podcast" });
    }
  });

  app.get('/api/podcasts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const episode = await storage.getPodcastEpisode(id);
      if (!episode) {
        return res.status(404).json({ message: "Podcast episode not found" });
      }
      res.json(episode);
    } catch (error) {
      console.error("Error fetching podcast episode:", error);
      res.status(500).json({ message: "Failed to fetch podcast episode" });
    }
  });

  app.post('/api/podcasts', isEditorOrAdmin, async (req: any, res) => {
    try {
      const { categoryIds, ...episodeFields } = req.body;
      const categoryIdsArray = categoryIds || [];
      const episodeData = insertPodcastEpisodeSchema.parse(episodeFields);
      const episode = await storage.createPodcastEpisode(episodeData, categoryIdsArray);
      res.json(episode);
    } catch (error) {
      console.error("Error creating podcast episode:", error);
      res.status(500).json({ message: "Failed to create podcast episode" });
    }
  });

  app.patch('/api/podcasts/:id', isEditorOrAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { categoryIds, ...episodeFields } = req.body;
      const categoryIdsArray = categoryIds || undefined;
      const episodeData = insertPodcastEpisodeSchema.partial().parse(episodeFields);
      const episode = await storage.updatePodcastEpisode(id, episodeData, categoryIdsArray);
      if (!episode) {
        return res.status(404).json({ message: "Podcast episode not found" });
      }
      res.json(episode);
    } catch (error) {
      console.error("Error updating podcast episode:", error);
      res.status(500).json({ message: "Failed to update podcast episode" });
    }
  });

  app.delete('/api/podcasts/:id', isEditorOrAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deletePodcastEpisode(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting podcast episode:", error);
      res.status(500).json({ message: "Failed to delete podcast episode" });
    }
  });

  app.patch('/api/podcasts/:id/status', isEditorOrAdmin, async (req: any, res) => {
    try {
      const episodeId = req.params.id;
      const { status } = req.body;
      if (!status || (status !== 'published' && status !== 'draft')) {
        return res.status(400).json({ message: "Invalid status. Must be 'published' or 'draft'" });
      }
      const updatedEpisode = await storage.togglePodcastEpisodeStatus(episodeId, status);
      if (!updatedEpisode) {
        return res.status(404).json({ message: "Podcast episode not found" });
      }
      res.json(updatedEpisode);
    } catch (error) {
      console.error("Error toggling podcast episode status:", error);
      res.status(500).json({ message: "Failed to toggle podcast episode status" });
    }
  });

  app.patch('/api/podcasts/:id/featured', isEditorOrAdmin, async (req: any, res) => {
    try {
      const episodeId = req.params.id;
      const { isFeatured } = req.body;
      if (typeof isFeatured !== 'boolean') {
        return res.status(400).json({ message: "Invalid isFeatured value. Must be boolean" });
      }
      const updatedEpisode = await storage.togglePodcastEpisodeFeatured(episodeId, isFeatured);
      if (!updatedEpisode) {
        return res.status(404).json({ message: "Podcast episode not found" });
      }
      res.json(updatedEpisode);
    } catch (error) {
      console.error("Error toggling podcast episode featured status:", error);
      res.status(500).json({ message: "Failed to toggle podcast episode featured status" });
    }
  });

  app.post('/api/podcasts/:id/like', async (req: any, res) => {
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

  // Poll routes
  app.get('/api/polls', async (req, res) => {
    try {
      const polls = await storage.getActivePolls();
      res.json(polls);
    } catch (error) {
      console.error("Error fetching polls:", error);
      res.status(500).json({ message: "Failed to fetch polls" });
    }
  });

  app.post('/api/polls', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/polls/:id/vote', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/community/contributors', async (req, res) => {
    try {
      const { limit } = req.query;
      const contributors = await storage.getTopContributors(
        limit ? parseInt(limit as string) : undefined
      );
      res.json(contributors);
    } catch (error) {
      console.error("Error fetching top contributors:", error);
      res.status(500).json({ message: "Failed to fetch top contributors" });
    }
  });

  app.get('/api/community/stats', async (req, res) => {
    try {
      const stats = await storage.getCommunityStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching community stats:", error);
      res.status(500).json({ message: "Failed to fetch community stats" });
    }
  });

  // Object Storage routes
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
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

  const httpServer = createServer(app);
  return httpServer;
}
