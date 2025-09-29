import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
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
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes (admin only)
  app.get('/api/users', isAdmin, async (req: any, res) => {
    try {
      const { q, role, active } = req.query;
      const filters: any = {};
      if (q) filters.q = q as string;
      if (role) filters.role = role as string;
      if (active !== undefined) filters.active = active === 'true';
      
      const users = await storage.listUsers(filters);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users/invite', isAdmin, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
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
      const adminUserId = req.user.claims.sub;
      
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
      const adminUserId = req.user.claims.sub;
      
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
  app.post('/api/users/create', isAdmin, async (req: any, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/users/:id', isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const adminUserId = req.user.claims.sub;
      const updates = insertUserSchema.partial().parse(req.body);
      
      // Prevent self-demotion if last admin
      if (updates.role && updates.role !== 'admin' && userId === adminUserId) {
        const admins = await storage.listUsers({ role: 'admin', active: true });
        if (admins.length === 1) {
          return res.status(400).json({ message: "Cannot demote yourself as the last admin" });
        }
      }
      
      const user = await storage.updateUser(userId, updates);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const adminUserId = req.user.claims.sub;
      
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

  // News routes
  app.get('/api/news', async (req, res) => {
    try {
      const { category, limit } = req.query;
      const articles = await storage.getNewsArticles(
        category as string,
        limit ? parseInt(limit as string) : undefined
      );
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

  app.post('/api/news', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const articleData = insertNewsArticleSchema.parse({
        ...req.body,
        authorId: userId,
      });
      const article = await storage.createNewsArticle(articleData);
      res.json(article);
    } catch (error) {
      console.error("Error creating news article:", error);
      res.status(500).json({ message: "Failed to create news article" });
    }
  });

  app.put('/api/news/:id', isAdmin, async (req: any, res) => {
    try {
      const articleId = req.params.id;
      const articleData = insertNewsArticleSchema.partial().parse(req.body);
      const updatedArticle = await storage.updateNewsArticle(articleId, articleData);
      if (!updatedArticle) {
        return res.status(404).json({ message: "Article not found" });
      }
      res.json(updatedArticle);
    } catch (error) {
      console.error("Error updating news article:", error);
      res.status(500).json({ message: "Failed to update news article" });
    }
  });

  app.post('/api/news/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const articleId = req.params.id;
      await storage.likeNewsArticle(articleId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error liking news article:", error);
      res.status(500).json({ message: "Failed to like news article" });
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

  app.get('/api/forum/discussions', async (req, res) => {
    try {
      const { categoryId, limit } = req.query;
      const discussions = await storage.getForumDiscussions(
        categoryId as string,
        limit ? parseInt(limit as string) : undefined
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
      const userId = req.user.claims.sub;
      const discussionData = insertForumDiscussionSchema.parse({
        ...req.body,
        authorId: userId,
      });
      const discussion = await storage.createForumDiscussion(discussionData);
      res.json(discussion);
    } catch (error) {
      console.error("Error creating forum discussion:", error);
      res.status(500).json({ message: "Failed to create forum discussion" });
    }
  });

  app.post('/api/forum/discussions/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Podcast routes
  app.get('/api/podcasts', async (req, res) => {
    try {
      const { limit } = req.query;
      const episodes = await storage.getPodcastEpisodes(
        limit ? parseInt(limit as string) : undefined
      );
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

  app.post('/api/podcasts', isAuthenticated, async (req: any, res) => {
    try {
      const episodeData = insertPodcastEpisodeSchema.parse(req.body);
      const episode = await storage.createPodcastEpisode(episodeData);
      res.json(episode);
    } catch (error) {
      console.error("Error creating podcast episode:", error);
      res.status(500).json({ message: "Failed to create podcast episode" });
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
