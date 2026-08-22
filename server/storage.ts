import {
  users,
  emailVerificationCodes,
  passwordResetCodes,
  newsCategories,
  newsArticles,
  automationArticleImports,
  newsComments,
  articleCategories,
  podcastCategories,
  discussionNewsCategories,
  forumCategories,
  forumDiscussions,
  forumReplies,
  resources,
  podcastEpisodes,
  polls,
  userInteractions,
  userInvitations,
  menuSettings,
  subscribers,
  toolboxApps,
  contentEngagement,
  popupEvents,
  type User,
  type UpsertUser,
  type NewsCategory,
  type InsertNewsCategory,
  type NewsArticle,
  type InsertNewsArticle,
  type NewsComment,
  type InsertNewsComment,
  type ArticleCategory,
  type InsertArticleCategory,
  type PodcastCategory,
  type InsertPodcastCategory,
  type DiscussionNewsCategory,
  type InsertDiscussionNewsCategory,
  type ForumCategory,
  type InsertForumCategory,
  type ForumDiscussion,
  type InsertForumDiscussion,
  type ForumReply,
  type InsertForumReply,
  type Resource,
  type InsertResource,
  type PodcastEpisode,
  type InsertPodcastEpisode,
  type Poll,
  type InsertPoll,
  type UserInteraction,
  type InsertUserInteraction,
  type UserInvitation,
  type InsertUserInvitation,
  type MenuSetting,
  type InsertMenuSetting,
  type UpdateMenuSetting,
  type EmailVerificationCode,
  type InsertEmailVerificationCode,
  type PasswordResetCode,
  type InsertPasswordResetCode,
  type Subscriber,
  type InsertSubscriber,
  type UpdateSubscriber,
  type ToolboxApp,
  type InsertToolboxApp,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, ilike, inArray, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>; // Alias for getUser
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User management operations
  listUsers(filters?: { q?: string; role?: string; active?: boolean }): Promise<User[]>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(userId: string, updates: Partial<UpsertUser>): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  setUserRole(userId: string, role: string): Promise<void>;
  setUserActive(userId: string, isActive: boolean): Promise<void>;
  
  // User invitation operations
  createInvitation(invitation: InsertUserInvitation): Promise<UserInvitation>;
  revokeInvitation(id: string): Promise<void>;
  listInvitations(): Promise<UserInvitation[]>;
  findInvitationByEmail(email: string): Promise<UserInvitation | undefined>;
  markInvitationAccepted(id: string): Promise<void>;
  
  // Email verification code operations
  createVerificationCode(code: InsertEmailVerificationCode): Promise<EmailVerificationCode>;
  getActiveVerificationCode(userId: string): Promise<EmailVerificationCode | undefined>;
  deleteVerificationCodesForUser(userId: string): Promise<void>;
  incrementVerificationAttempt(codeId: string): Promise<number>;
  createPasswordResetCode(code: InsertPasswordResetCode): Promise<PasswordResetCode>;
  getActivePasswordResetCode(userId: string): Promise<PasswordResetCode | undefined>;
  deletePasswordResetCodesForUser(userId: string): Promise<void>;
  incrementPasswordResetAttempt(codeId: string): Promise<number>;

  // News category operations
  getNewsCategories(activeOnly?: boolean): Promise<NewsCategory[]>;
  getNewsCategory(id: string): Promise<NewsCategory | undefined>;
  createNewsCategory(category: InsertNewsCategory): Promise<NewsCategory>;
  updateNewsCategory(categoryId: string, updates: Partial<InsertNewsCategory>): Promise<NewsCategory | undefined>;
  deleteNewsCategory(categoryId: string): Promise<boolean>;
  initializeNewsCategories(): Promise<void>;
  
  // News operations
  getNewsArticles(categoryIds?: string[], limit?: number, userRole?: string, archivedOnly?: boolean): Promise<(NewsArticle & { categories: NewsCategory[]; commentCount: number })[]>;
  getNewsArticle(id: string): Promise<(NewsArticle & { categories: NewsCategory[]; commentCount: number }) | undefined>;
  createNewsArticle(article: InsertNewsArticle, categoryIds: string[]): Promise<NewsArticle & { categories: NewsCategory[] }>;
  getAutomationNewsDraft(
    externalId: string,
  ): Promise<{ article: NewsArticle; requestHash: string } | undefined>;
  createAutomationNewsDraft(params: {
    externalId: string;
    requestHash: string;
    article: InsertNewsArticle;
    categoryIds: string[];
  }): Promise<{ article: NewsArticle; created: boolean; requestHash: string }>;
  updateNewsArticle(articleId: string, updates: Partial<InsertNewsArticle>, categoryIds?: string[]): Promise<(NewsArticle & { categories: NewsCategory[] }) | undefined>;
  deleteNewsArticle(articleId: string): Promise<boolean>;
  archiveNewsArticle(articleId: string, isArchived: boolean): Promise<NewsArticle | undefined>;
  toggleNewsArticleStatus(articleId: string, status: 'published' | 'draft'): Promise<NewsArticle | undefined>;
  toggleNewsArticleFeatured(articleId: string, isFeatured: boolean): Promise<NewsArticle | undefined>;
  likeNewsArticle(articleId: string, userId: string): Promise<void>;
  incrementNewsArticleLikes(articleId: string, userId: string): Promise<void>;
  
  // News comments operations
  getNewsComments(articleId: string): Promise<(NewsComment & { author: Omit<User, 'passwordHash'> })[]>;
  createNewsComment(comment: InsertNewsComment): Promise<NewsComment & { author: Omit<User, 'passwordHash'> }>;
  deleteNewsComment(commentId: string, userId: string): Promise<boolean>;
  getArticleCommentCount(articleId: string): Promise<number>;
  
  // Forum operations
  getForumCategories(): Promise<ForumCategory[]>;
  createForumCategory(category: InsertForumCategory): Promise<ForumCategory>;
  getForumDiscussions(categoryId?: string, newsCategoryIds?: string[], limit?: number, userRole?: string): Promise<(ForumDiscussion & { author: User; category: ForumCategory; newsCategories: NewsCategory[] })[]>;
  createForumDiscussion(discussion: InsertForumDiscussion, newsCategoryIds?: string[]): Promise<ForumDiscussion & { newsCategories: NewsCategory[] }>;
  getForumDiscussion(id: string): Promise<(ForumDiscussion & { author: User; category: ForumCategory; newsCategories: NewsCategory[]; replies: (ForumReply & { author: User })[] }) | undefined>;
  updateForumDiscussion(discussionId: string, updates: Partial<InsertForumDiscussion>, newsCategoryIds?: string[]): Promise<(ForumDiscussion & { newsCategories: NewsCategory[] }) | undefined>;
  deleteForumDiscussion(discussionId: string): Promise<boolean>;
  toggleForumDiscussionStatus(discussionId: string, status: 'published' | 'draft'): Promise<ForumDiscussion | undefined>;
  toggleForumDiscussionFeatured(discussionId: string, isFeatured: boolean): Promise<ForumDiscussion | undefined>;
  createForumReply(reply: InsertForumReply): Promise<ForumReply>;
  likeForumDiscussion(discussionId: string, userId: string): Promise<void>;
  likeForumReply(replyId: string, userId: string): Promise<void>;
  
  // Resource operations
  getResources(type?: string, category?: string, limit?: number): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(resourceId: string, updates: Partial<InsertResource>): Promise<Resource | undefined>;
  deleteResource(resourceId: string): Promise<boolean>;
  searchResources(query: string): Promise<Resource[]>;
  
  // Podcast operations
  getPodcastEpisodes(categoryIds?: string[], limit?: number, userRole?: string, archivedOnly?: boolean): Promise<(PodcastEpisode & { categories: NewsCategory[] })[]>;
  getPodcastEpisode(id: string): Promise<(PodcastEpisode & { categories: NewsCategory[] }) | undefined>;
  createPodcastEpisode(episode: InsertPodcastEpisode, categoryIds: string[]): Promise<PodcastEpisode & { categories: NewsCategory[] }>;
  updatePodcastEpisode(episodeId: string, updates: Partial<InsertPodcastEpisode>, categoryIds?: string[]): Promise<(PodcastEpisode & { categories: NewsCategory[] }) | undefined>;
  deletePodcastEpisode(episodeId: string): Promise<boolean>;
  archivePodcastEpisode(episodeId: string, isArchived: boolean): Promise<PodcastEpisode | undefined>;
  togglePodcastEpisodeStatus(episodeId: string, status: 'published' | 'draft'): Promise<PodcastEpisode | undefined>;
  togglePodcastEpisodeFeatured(episodeId: string, isFeatured: boolean): Promise<PodcastEpisode | undefined>;
  likePodcastEpisode(episodeId: string, userId: string): Promise<void>;
  incrementPodcastEpisodeLikes(episodeId: string, userId: string): Promise<void>;
  incrementPodcastPlayCount(episodeId: string): Promise<void>;
  getFeaturedPodcastEpisode(): Promise<(PodcastEpisode & { categories: NewsCategory[] }) | undefined>;
  
  // Poll operations
  getActivePolls(): Promise<Poll[]>;
  createPoll(poll: InsertPoll): Promise<Poll>;
  votePoll(pollId: string, optionIndex: number, userId: string): Promise<void>;
  
  // User interaction operations
  getUserInteraction(userId: string, targetType: string, targetId: string, interactionType: string): Promise<UserInteraction | undefined>;
  createUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction>;
  deleteUserInteraction(userId: string, targetType: string, targetId: string, interactionType: string): Promise<void>;
  
  // Community operations
  getTopContributors(limit?: number): Promise<User[]>;
  getCommunityStats(): Promise<{
    activeMembers: number;
    discussionsThisWeek: number;
    questionsAnswered: number;
    resourcesShared: number;
    podcastListeners: number;
    certificationsEarned: number;
  }>;
  
  // Menu settings operations
  getMenuSettings(): Promise<MenuSetting[]>;
  updateMenuSetting(menuKey: string, updates: UpdateMenuSetting): Promise<MenuSetting | undefined>;
  initializeMenuSettings(): Promise<void>;
  
  // Subscriber operations
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  getSubscriberById(id: string): Promise<Subscriber | undefined>;
  updateSubscriber(id: string, updates: UpdateSubscriber): Promise<Subscriber | undefined>;
  deleteSubscriber(id: string): Promise<boolean>;
  getActiveSubscribers(): Promise<Subscriber[]>;
  getPublicCounts(): Promise<{ users: number; subscribers: number }>;
  
  // Toolbox app operations
  getToolboxApps(activeOnly?: boolean): Promise<ToolboxApp[]>;
  getToolboxApp(id: string): Promise<ToolboxApp | undefined>;
  createToolboxApp(app: InsertToolboxApp): Promise<ToolboxApp>;
  updateToolboxApp(id: string, updates: Partial<InsertToolboxApp>): Promise<ToolboxApp | undefined>;
  deleteToolboxApp(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async listUsers(filters?: { q?: string; role?: string; active?: boolean }): Promise<User[]> {
    const conditions = [];
    if (filters?.q) {
      conditions.push(
        or(
          ilike(users.email, `%${filters.q}%`),
          ilike(users.firstName, `%${filters.q}%`),
          ilike(users.lastName, `%${filters.q}%`)
        )
      );
    }
    if (filters?.role) {
      conditions.push(eq(users.role, filters.role));
    }
    if (filters?.active !== undefined) {
      conditions.push(eq(users.isActive, filters.active));
    }
    
    const query = db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    
    return await query;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUser(userId: string, updates: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async setUserRole(userId: string, role: string): Promise<void> {
    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async setUserActive(userId: string, isActive: boolean): Promise<void> {
    await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async createInvitation(invitation: InsertUserInvitation): Promise<UserInvitation> {
    const [created] = await db
      .insert(userInvitations)
      .values(invitation)
      .onConflictDoUpdate({
        target: userInvitations.email,
        set: {
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          createdAt: new Date(),
          revokedAt: null,
        },
      })
      .returning();
    return created;
  }

  async revokeInvitation(id: string): Promise<void> {
    await db
      .update(userInvitations)
      .set({ revokedAt: new Date() })
      .where(eq(userInvitations.id, id));
  }

  async listInvitations(): Promise<UserInvitation[]> {
    return await db
      .select()
      .from(userInvitations)
      .where(and(
        sql`${userInvitations.acceptedAt} IS NULL`,
        sql`${userInvitations.revokedAt} IS NULL`
      ))
      .orderBy(desc(userInvitations.createdAt));
  }

  async findInvitationByEmail(email: string): Promise<UserInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(userInvitations)
      .where(and(
        eq(userInvitations.email, email),
        sql`${userInvitations.acceptedAt} IS NULL`,
        sql`${userInvitations.revokedAt} IS NULL`
      ));
    return invitation;
  }

  async markInvitationAccepted(id: string): Promise<void> {
    await db
      .update(userInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(userInvitations.id, id));
  }

  async createVerificationCode(code: InsertEmailVerificationCode): Promise<EmailVerificationCode> {
    const [created] = await db.insert(emailVerificationCodes).values(code).returning();
    return created;
  }

  async getActiveVerificationCode(userId: string): Promise<EmailVerificationCode | undefined> {
    const [code] = await db
      .select()
      .from(emailVerificationCodes)
      .where(eq(emailVerificationCodes.userId, userId))
      .orderBy(desc(emailVerificationCodes.createdAt))
      .limit(1);
    return code;
  }

  async deleteVerificationCodesForUser(userId: string): Promise<void> {
    await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.userId, userId));
  }

  async incrementVerificationAttempt(codeId: string): Promise<number> {
    const [updated] = await db
      .update(emailVerificationCodes)
      .set({ attemptCount: sql`${emailVerificationCodes.attemptCount} + 1` })
      .where(eq(emailVerificationCodes.id, codeId))
      .returning();
    return updated?.attemptCount ?? 0;
  }

  async createPasswordResetCode(code: InsertPasswordResetCode): Promise<PasswordResetCode> {
    const [created] = await db.insert(passwordResetCodes).values(code).returning();
    return created;
  }

  async getActivePasswordResetCode(userId: string): Promise<PasswordResetCode | undefined> {
    const [code] = await db
      .select()
      .from(passwordResetCodes)
      .where(eq(passwordResetCodes.userId, userId))
      .orderBy(desc(passwordResetCodes.createdAt))
      .limit(1);
    return code;
  }

  async deletePasswordResetCodesForUser(userId: string): Promise<void> {
    await db.delete(passwordResetCodes).where(eq(passwordResetCodes.userId, userId));
  }

  async incrementPasswordResetAttempt(codeId: string): Promise<number> {
    const [updated] = await db
      .update(passwordResetCodes)
      .set({ attemptCount: sql`${passwordResetCodes.attemptCount} + 1` })
      .where(eq(passwordResetCodes.id, codeId))
      .returning();
    return updated?.attemptCount ?? 0;
  }

  // News category methods
  async getNewsCategories(activeOnly = false): Promise<NewsCategory[]> {
    if (activeOnly) {
      return await db
        .select()
        .from(newsCategories)
        .where(eq(newsCategories.isActive, true))
        .orderBy(newsCategories.displayOrder, newsCategories.name);
    }
    
    return await db
      .select()
      .from(newsCategories)
      .orderBy(newsCategories.displayOrder, newsCategories.name);
  }

  async getNewsCategory(id: string): Promise<NewsCategory | undefined> {
    const [category] = await db
      .select()
      .from(newsCategories)
      .where(eq(newsCategories.id, id))
      .limit(1);
    return category;
  }

  async createNewsCategory(category: InsertNewsCategory): Promise<NewsCategory> {
    const [newCategory] = await db
      .insert(newsCategories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateNewsCategory(categoryId: string, updates: Partial<InsertNewsCategory>): Promise<NewsCategory | undefined> {
    const [updated] = await db
      .update(newsCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(newsCategories.id, categoryId))
      .returning();
    return updated;
  }

  async deleteNewsCategory(categoryId: string): Promise<boolean> {
    const result = await db
      .delete(newsCategories)
      .where(eq(newsCategories.id, categoryId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async initializeNewsCategories(): Promise<void> {
    const existingCategories = await this.getNewsCategories();
    
    if (existingCategories.length === 0) {
      const defaultCategories: InsertNewsCategory[] = [
        {
          name: "Automation",
          slug: "automation",
          description: "AI-powered automation in accounting processes",
          icon: "Bot",
          color: "#3B82F6",
          displayOrder: 1,
          isActive: true,
        },
        {
          name: "Fraud Detection",
          slug: "fraud-detection",
          description: "AI systems for detecting financial fraud",
          icon: "Shield",
          color: "#EF4444",
          displayOrder: 2,
          isActive: true,
        },
        {
          name: "Regulatory",
          slug: "regulatory",
          description: "AI regulations and compliance updates",
          icon: "Scale",
          color: "#8B5CF6",
          displayOrder: 3,
          isActive: true,
        },
        {
          name: "Generative AI",
          slug: "generative-ai",
          description: "GPT and other generative AI applications",
          icon: "Sparkles",
          color: "#10B981",
          displayOrder: 4,
          isActive: true,
        },
        {
          name: "General",
          slug: "general",
          description: "General AI topics and updates",
          icon: "Newspaper",
          color: "#6B7280",
          displayOrder: 5,
          isActive: true,
        },
      ];

      for (const category of defaultCategories) {
        await this.createNewsCategory(category);
      }
      
      console.log("✓ Initialized news categories");
    }
  }

  async getNewsArticles(categoryIds?: string[], limit = 10, userRole?: string, archivedOnly = false): Promise<(NewsArticle & { categories: NewsCategory[]; commentCount: number })[]> {
    let articles: NewsArticle[];
    
    // Admins and editors can see all articles; regular users only see published
    const canSeeAllStatuses = userRole === 'admin' || userRole === 'editor';
    
    if (categoryIds && categoryIds.length > 0) {
      // Build the where clause with category, archived, and status filters
      const conditions = [inArray(articleCategories.categoryId, categoryIds)];
      
      // Filter by archived status
      conditions.push(eq(newsArticles.isArchived, archivedOnly));
      
      // Add status filter for non-admins
      if (!canSeeAllStatuses) {
        conditions.push(eq(newsArticles.status, 'published'));
      }
      
      const whereClause = and(...conditions);
      
      const results = await db
        .selectDistinct({ article: newsArticles })
        .from(newsArticles)
        .innerJoin(articleCategories, eq(articleCategories.articleId, newsArticles.id))
        .where(whereClause)
        .orderBy(desc(newsArticles.publishedAt))
        .limit(limit);
      articles = results.map(r => r.article);
    } else {
      // No category filter - apply archived and status filters
      const conditions = [eq(newsArticles.isArchived, archivedOnly)];
      
      if (!canSeeAllStatuses) {
        conditions.push(eq(newsArticles.status, 'published'));
      }
      
      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
      
      articles = await db
        .select()
        .from(newsArticles)
        .where(whereClause)
        .orderBy(desc(newsArticles.publishedAt))
        .limit(limit);
    }

    const articlesWithCategories = await Promise.all(
      articles.map(async (article) => {
        const categoryResults = await db
          .select({ category: newsCategories })
          .from(articleCategories)
          .innerJoin(newsCategories, eq(articleCategories.categoryId, newsCategories.id))
          .where(eq(articleCategories.articleId, article.id));

        const commentCount = await this.getArticleCommentCount(article.id);

        return {
          ...article,
          categories: categoryResults.map(r => r.category),
          commentCount,
        };
      })
    );

    return articlesWithCategories;
  }

  async getNewsArticle(id: string): Promise<(NewsArticle & { categories: NewsCategory[]; commentCount: number }) | undefined> {
    const [article] = await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.id, id));

    if (!article) return undefined;

    const categoryResults = await db
      .select({ category: newsCategories })
      .from(articleCategories)
      .innerJoin(newsCategories, eq(articleCategories.categoryId, newsCategories.id))
      .where(eq(articleCategories.articleId, article.id));

    const commentCount = await this.getArticleCommentCount(article.id);

    return {
      ...article,
      categories: categoryResults.map(r => r.category),
      commentCount,
    };
  }

  async createNewsArticle(article: InsertNewsArticle, categoryIds: string[]): Promise<NewsArticle & { categories: NewsCategory[] }> {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(newsArticles)
        .values({
          ...article,
          // Drafts do not have a publication date until an editor publishes.
          publishedAt: article.status === "draft" ? null : article.publishedAt,
        })
        .returning();

      if (categoryIds.length > 0) {
        await tx.insert(articleCategories).values(
          categoryIds.map(categoryId => ({
            articleId: created.id,
            categoryId,
          }))
        );
      }

      const categoryResults = await tx
        .select({ category: newsCategories })
        .from(articleCategories)
        .innerJoin(newsCategories, eq(articleCategories.categoryId, newsCategories.id))
        .where(eq(articleCategories.articleId, created.id));

      return {
        ...created,
        categories: categoryResults.map(r => r.category),
      };
    });
  }

  async getAutomationNewsDraft(
    externalId: string,
  ): Promise<{ article: NewsArticle; requestHash: string } | undefined> {
    const [existing] = await db
      .select({
        article: newsArticles,
        requestHash: automationArticleImports.requestHash,
      })
      .from(automationArticleImports)
      .innerJoin(
        newsArticles,
        eq(automationArticleImports.articleId, newsArticles.id),
      )
      .where(eq(automationArticleImports.externalId, externalId));
    return existing;
  }

  async createAutomationNewsDraft(params: {
    externalId: string;
    requestHash: string;
    article: InsertNewsArticle;
    categoryIds: string[];
  }): Promise<{ article: NewsArticle; created: boolean; requestHash: string }> {
    const existing = await this.getAutomationNewsDraft(params.externalId);
    if (existing) return { ...existing, created: false };

    try {
      const article = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(newsArticles)
          .values({
            ...params.article,
            status: "draft",
            publishedAt: params.article.publishedAt ?? new Date(),
            isArchived: false,
            isFeatured: false,
          })
          .returning();

        await tx.insert(articleCategories).values(
          params.categoryIds.map((categoryId) => ({
            articleId: created.id,
            categoryId,
          })),
        );

        await tx.insert(automationArticleImports).values({
          externalId: params.externalId,
          articleId: created.id,
          requestHash: params.requestHash,
        });

        return created;
      });
      return { article, created: true, requestHash: params.requestHash };
    } catch (error) {
      // Concurrent retries can race on externalId. The unique ledger row makes
      // one transaction win; return that result instead of creating a duplicate.
      const raced = await this.getAutomationNewsDraft(params.externalId);
      if (raced) return { ...raced, created: false };
      throw error;
    }
  }

  async updateNewsArticle(articleId: string, updates: Partial<InsertNewsArticle>, categoryIds?: string[]): Promise<(NewsArticle & { categories: NewsCategory[] }) | undefined> {
    return await db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          status: newsArticles.status,
          publishedAt: newsArticles.publishedAt,
        })
        .from(newsArticles)
        .where(eq(newsArticles.id, articleId));
      if (!current) return undefined;

      const publicationUpdates: Partial<InsertNewsArticle> = {};
      if (updates.status === "draft") {
        publicationUpdates.publishedAt = null;
      } else if (updates.status === "published" && current.status !== "published") {
        publicationUpdates.publishedAt = new Date();
      }

      if (categoryIds !== undefined) {
        // Delete existing category associations
        await tx
          .delete(articleCategories)
          .where(eq(articleCategories.articleId, articleId));

        // Insert new category associations if any
        if (categoryIds.length > 0) {
          await tx.insert(articleCategories).values(
            categoryIds.map(categoryId => ({
              articleId,
              categoryId,
            }))
          );
        }
      }

      const [updated] = await tx
        .update(newsArticles)
        .set({ ...updates, ...publicationUpdates })
        .where(eq(newsArticles.id, articleId))
        .returning();

      if (!updated) return undefined;

      const categoryResults = await tx
        .select({ category: newsCategories })
        .from(articleCategories)
        .innerJoin(newsCategories, eq(articleCategories.categoryId, newsCategories.id))
        .where(eq(articleCategories.articleId, updated.id));

      return {
        ...updated,
        categories: categoryResults.map(r => r.category),
      };
    });
  }

  async deleteNewsArticle(articleId: string): Promise<boolean> {
    const result = await db
      .delete(newsArticles)
      .where(eq(newsArticles.id, articleId));
    return (result.rowCount ?? 0) > 0;
  }

  async archiveNewsArticle(articleId: string, isArchived: boolean): Promise<NewsArticle | undefined> {
    const [updated] = await db
      .update(newsArticles)
      .set({ isArchived })
      .where(eq(newsArticles.id, articleId))
      .returning();
    return updated;
  }

  async toggleNewsArticleStatus(articleId: string, status: 'published' | 'draft'): Promise<NewsArticle | undefined> {
    const [current] = await db
      .select({
        status: newsArticles.status,
        publishedAt: newsArticles.publishedAt,
      })
      .from(newsArticles)
      .where(eq(newsArticles.id, articleId));
    if (!current) return undefined;

    const [updated] = await db
      .update(newsArticles)
      .set({
        status,
        ...(status === "draft"
          ? { publishedAt: null }
          : current.status !== "published"
            ? { publishedAt: new Date() }
            : {}),
      })
      .where(eq(newsArticles.id, articleId))
      .returning();
    return updated;
  }

  async toggleNewsArticleFeatured(articleId: string, isFeatured: boolean): Promise<NewsArticle | undefined> {
    const [updated] = await db
      .update(newsArticles)
      .set({ isFeatured })
      .where(eq(newsArticles.id, articleId))
      .returning();
    return updated;
  }

  async likeNewsArticle(articleId: string, userId: string): Promise<void> {
    const existing = await this.getUserInteraction(userId, 'news', articleId, 'like');
    
    if (existing) {
      await this.deleteUserInteraction(userId, 'news', articleId, 'like');
      await db
        .update(newsArticles)
        .set({ likes: sql`${newsArticles.likes} - 1` })
        .where(eq(newsArticles.id, articleId));
    } else {
      await this.createUserInteraction({
        userId,
        targetType: 'news',
        targetId: articleId,
        interactionType: 'like',
      });
      await db
        .update(newsArticles)
        .set({ likes: sql`${newsArticles.likes} + 1` })
        .where(eq(newsArticles.id, articleId));
    }
  }

  async incrementNewsArticleLikes(articleId: string, userId: string): Promise<void> {
    // Always increment, no toggle - users can give multiple likes
    await db
      .update(newsArticles)
      .set({ likes: sql`${newsArticles.likes} + 1` })
      .where(eq(newsArticles.id, articleId));
    
    // Track each like as a separate interaction for authenticated users
    await this.createUserInteraction({
      userId,
      targetType: 'news',
      targetId: articleId,
      interactionType: 'like',
    });
  }

  async getNewsComments(articleId: string): Promise<(NewsComment & { author: Omit<User, 'passwordHash'> })[]> {
    const comments = await db
      .select()
      .from(newsComments)
      .leftJoin(users, eq(newsComments.authorId, users.id))
      .where(eq(newsComments.articleId, articleId))
      .orderBy(desc(newsComments.createdAt));

    return comments.map(row => {
      const { passwordHash, ...safeAuthor } = row.users as User;
      return {
        ...row.news_comments,
        author: safeAuthor
      };
    });
  }

  async createNewsComment(comment: InsertNewsComment): Promise<NewsComment & { author: Omit<User, 'passwordHash'> }> {
    const [created] = await db
      .insert(newsComments)
      .values(comment)
      .returning();

    const [author] = await db
      .select()
      .from(users)
      .where(eq(users.id, comment.authorId));

    const { passwordHash, ...safeAuthor } = author;
    return { ...created, author: safeAuthor };
  }

  async deleteNewsComment(commentId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(newsComments)
      .where(and(
        eq(newsComments.id, commentId),
        eq(newsComments.authorId, userId)
      ))
      .returning();

    return result.length > 0;
  }

  async getArticleCommentCount(articleId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(newsComments)
      .where(eq(newsComments.articleId, articleId));

    return result[0]?.count || 0;
  }

  async getForumCategories(): Promise<ForumCategory[]> {
    return await db.select().from(forumCategories).orderBy(forumCategories.name);
  }

  async createForumCategory(category: InsertForumCategory): Promise<ForumCategory> {
    const [created] = await db
      .insert(forumCategories)
      .values(category)
      .returning();
    return created;
  }

  async getForumDiscussions(categoryId?: string, newsCategoryIds?: string[], limit = 20, userRole?: string): Promise<(ForumDiscussion & { author: User; category: ForumCategory; newsCategories: NewsCategory[] })[]> {
    let discussionIds: string[] = [];
    
    // Admins and editors can see all discussions; regular users only see published
    const canSeeAllStatuses = userRole === 'admin' || userRole === 'editor';
    
    if (newsCategoryIds && newsCategoryIds.length > 0) {
      const distinctResults = await db
        .selectDistinct({ id: forumDiscussions.id })
        .from(forumDiscussions)
        .innerJoin(discussionNewsCategories, eq(discussionNewsCategories.discussionId, forumDiscussions.id))
        .where(inArray(discussionNewsCategories.categoryId, newsCategoryIds));
      discussionIds = distinctResults.map(r => r.id);
      
      if (discussionIds.length === 0) {
        return [];
      }
    }
    
    let query = db
      .select()
      .from(forumDiscussions)
      .leftJoin(users, eq(forumDiscussions.authorId, users.id))
      .leftJoin(forumCategories, eq(forumDiscussions.categoryId, forumCategories.id))
      .orderBy(desc(forumDiscussions.lastReplyAt), desc(forumDiscussions.createdAt));
    
    // Build where conditions with status filter
    const whereConditions: any[] = [];
    if (!canSeeAllStatuses) {
      whereConditions.push(eq(forumDiscussions.status, 'published'));
    }
    if (categoryId) {
      whereConditions.push(eq(forumDiscussions.categoryId, categoryId));
    }
    if (newsCategoryIds && newsCategoryIds.length > 0) {
      whereConditions.push(inArray(forumDiscussions.id, discussionIds));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions)) as any;
    }
    
    const results = await query.limit(limit);
    const discussions = results.map(row => ({
      ...row.forum_discussions,
      author: row.users!,
      category: row.forum_categories!,
    }));

    const discussionsWithNewsCategories = await Promise.all(
      discussions.map(async (discussion) => {
        const categoryResults = await db
          .select({ category: newsCategories })
          .from(discussionNewsCategories)
          .innerJoin(newsCategories, eq(discussionNewsCategories.categoryId, newsCategories.id))
          .where(eq(discussionNewsCategories.discussionId, discussion.id));

        return {
          ...discussion,
          newsCategories: categoryResults.map(r => r.category),
        };
      })
    );

    return discussionsWithNewsCategories;
  }

  async createForumDiscussion(discussion: InsertForumDiscussion, newsCategoryIds?: string[]): Promise<ForumDiscussion & { newsCategories: NewsCategory[] }> {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(forumDiscussions)
        .values({
          ...discussion,
          lastReplyAt: new Date(),
        })
        .returning();
      
      if (discussion.categoryId) {
        await tx
          .update(forumCategories)
          .set({ discussionCount: sql`${forumCategories.discussionCount} + 1` })
          .where(eq(forumCategories.id, discussion.categoryId));
      }

      if (newsCategoryIds && newsCategoryIds.length > 0) {
        await tx.insert(discussionNewsCategories).values(
          newsCategoryIds.map(categoryId => ({
            discussionId: created.id,
            categoryId,
          }))
        );
      }

      const categoryResults = await tx
        .select({ category: newsCategories })
        .from(discussionNewsCategories)
        .innerJoin(newsCategories, eq(discussionNewsCategories.categoryId, newsCategories.id))
        .where(eq(discussionNewsCategories.discussionId, created.id));

      return {
        ...created,
        newsCategories: categoryResults.map(r => r.category),
      };
    });
  }

  async getForumDiscussion(id: string): Promise<(ForumDiscussion & { author: User; category: ForumCategory; newsCategories: NewsCategory[]; replies: (ForumReply & { author: User })[] }) | undefined> {
    const [discussion] = await db
      .select()
      .from(forumDiscussions)
      .leftJoin(users, eq(forumDiscussions.authorId, users.id))
      .leftJoin(forumCategories, eq(forumDiscussions.categoryId, forumCategories.id))
      .where(eq(forumDiscussions.id, id));
    
    if (!discussion) return undefined;
    
    const replies = await db
      .select()
      .from(forumReplies)
      .leftJoin(users, eq(forumReplies.authorId, users.id))
      .where(eq(forumReplies.discussionId, id))
      .orderBy(forumReplies.createdAt);

    const categoryResults = await db
      .select({ category: newsCategories })
      .from(discussionNewsCategories)
      .innerJoin(newsCategories, eq(discussionNewsCategories.categoryId, newsCategories.id))
      .where(eq(discussionNewsCategories.discussionId, id));
    
    return {
      ...discussion.forum_discussions,
      author: discussion.users!,
      category: discussion.forum_categories!,
      newsCategories: categoryResults.map(r => r.category),
      replies: replies.map(row => ({
        ...row.forum_replies,
        author: row.users!,
      })),
    };
  }

  async createForumReply(reply: InsertForumReply): Promise<ForumReply> {
    const [created] = await db
      .insert(forumReplies)
      .values(reply)
      .returning();
    
    // Update discussion reply count and last reply time
    if (reply.discussionId) {
      await db
        .update(forumDiscussions)
        .set({
          replyCount: sql`${forumDiscussions.replyCount} + 1`,
          lastReplyAt: new Date(),
        })
        .where(eq(forumDiscussions.id, reply.discussionId));
    }
    
    return created;
  }

  async likeForumDiscussion(discussionId: string, userId: string): Promise<void> {
    const existing = await this.getUserInteraction(userId, 'discussion', discussionId, 'like');
    
    if (existing) {
      await this.deleteUserInteraction(userId, 'discussion', discussionId, 'like');
      await db
        .update(forumDiscussions)
        .set({ likes: sql`${forumDiscussions.likes} - 1` })
        .where(eq(forumDiscussions.id, discussionId));
    } else {
      await this.createUserInteraction({
        userId,
        targetType: 'discussion',
        targetId: discussionId,
        interactionType: 'like',
      });
      await db
        .update(forumDiscussions)
        .set({ likes: sql`${forumDiscussions.likes} + 1` })
        .where(eq(forumDiscussions.id, discussionId));
    }
  }

  async likeForumReply(replyId: string, userId: string): Promise<void> {
    const existing = await this.getUserInteraction(userId, 'reply', replyId, 'like');
    
    if (existing) {
      await this.deleteUserInteraction(userId, 'reply', replyId, 'like');
      await db
        .update(forumReplies)
        .set({ likes: sql`${forumReplies.likes} - 1` })
        .where(eq(forumReplies.id, replyId));
    } else {
      await this.createUserInteraction({
        userId,
        targetType: 'reply',
        targetId: replyId,
        interactionType: 'like',
      });
      await db
        .update(forumReplies)
        .set({ likes: sql`${forumReplies.likes} + 1` })
        .where(eq(forumReplies.id, replyId));
    }
  }

  async updateForumDiscussion(discussionId: string, updates: Partial<InsertForumDiscussion>, newsCategoryIds?: string[]): Promise<(ForumDiscussion & { newsCategories: NewsCategory[] }) | undefined> {
    return await db.transaction(async (tx) => {
      if (newsCategoryIds && newsCategoryIds.length > 0) {
        await tx
          .delete(discussionNewsCategories)
          .where(eq(discussionNewsCategories.discussionId, discussionId));

        await tx.insert(discussionNewsCategories).values(
          newsCategoryIds.map(categoryId => ({
            discussionId,
            categoryId,
          }))
        );
      }

      const [updated] = await tx
        .update(forumDiscussions)
        .set(updates)
        .where(eq(forumDiscussions.id, discussionId))
        .returning();

      if (!updated) return undefined;

      const categoryResults = await tx
        .select({ category: newsCategories })
        .from(discussionNewsCategories)
        .innerJoin(newsCategories, eq(discussionNewsCategories.categoryId, newsCategories.id))
        .where(eq(discussionNewsCategories.discussionId, updated.id));

      return {
        ...updated,
        newsCategories: categoryResults.map(r => r.category),
      };
    });
  }

  async deleteForumDiscussion(discussionId: string): Promise<boolean> {
    // First get the discussion to find its category
    const [discussion] = await db
      .select()
      .from(forumDiscussions)
      .where(eq(forumDiscussions.id, discussionId));
    
    if (!discussion) return false;

    // Delete all replies first
    await db
      .delete(forumReplies)
      .where(eq(forumReplies.discussionId, discussionId));

    // Delete user interactions
    await db
      .delete(userInteractions)
      .where(sql`${userInteractions.targetType} = 'discussion' AND ${userInteractions.targetId} = ${discussionId}`);

    // Delete the discussion
    await db
      .delete(forumDiscussions)
      .where(eq(forumDiscussions.id, discussionId));

    // Update category discussion count
    if (discussion.categoryId) {
      await db
        .update(forumCategories)
        .set({ discussionCount: sql`${forumCategories.discussionCount} - 1` })
        .where(eq(forumCategories.id, discussion.categoryId));
    }

    return true;
  }

  async toggleForumDiscussionStatus(discussionId: string, status: 'published' | 'draft'): Promise<ForumDiscussion | undefined> {
    const [updated] = await db
      .update(forumDiscussions)
      .set({ status })
      .where(eq(forumDiscussions.id, discussionId))
      .returning();
    return updated;
  }

  async toggleForumDiscussionFeatured(discussionId: string, isFeatured: boolean): Promise<ForumDiscussion | undefined> {
    const [updated] = await db
      .update(forumDiscussions)
      .set({ isFeatured })
      .where(eq(forumDiscussions.id, discussionId))
      .returning();
    return updated;
  }

  async getResources(type?: string, category?: string, limit = 20): Promise<Resource[]> {
    const conditions = [];
    if (type) conditions.push(eq(resources.type, type));
    if (category) conditions.push(eq(resources.category, category));
    
    const query = db
      .select()
      .from(resources)
      .orderBy(desc(resources.createdAt))
      .limit(limit);
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    
    return await query;
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const [created] = await db
      .insert(resources)
      .values(resource)
      .returning();
    return created;
  }

  async searchResources(query: string): Promise<Resource[]> {
    return await db
      .select()
      .from(resources)
      .where(
        or(
          ilike(resources.title, `%${query}%`),
          ilike(resources.description, `%${query}%`)
        )
      )
      .orderBy(desc(resources.createdAt))
      .limit(20);
  }

  async updateResource(resourceId: string, updates: Partial<InsertResource>): Promise<Resource | undefined> {
    const [updated] = await db
      .update(resources)
      .set(updates)
      .where(eq(resources.id, resourceId))
      .returning();
    return updated;
  }

  async deleteResource(resourceId: string): Promise<boolean> {
    // Delete user interactions related to this resource
    await db
      .delete(userInteractions)
      .where(sql`${userInteractions.targetType} = 'resource' AND ${userInteractions.targetId} = ${resourceId}`);

    // Delete the resource
    const result = await db
      .delete(resources)
      .where(eq(resources.id, resourceId));
    
    return true;
  }

  async getPodcastEpisodes(categoryIds?: string[], limit = 10, userRole?: string, archivedOnly = false): Promise<(PodcastEpisode & { categories: NewsCategory[] })[]> {
    let episodes: PodcastEpisode[];
    
    // Admins and editors can see all episodes; regular users only see published
    const canSeeAllStatuses = userRole === 'admin' || userRole === 'editor';
    
    if (categoryIds && categoryIds.length > 0) {
      // Build the where clause with category, archived, and status filters
      const conditions = [inArray(podcastCategories.categoryId, categoryIds)];
      
      // Filter by archived status
      conditions.push(eq(podcastEpisodes.isArchived, archivedOnly));
      
      // Add status filter for non-admins
      if (!canSeeAllStatuses) {
        conditions.push(eq(podcastEpisodes.status, 'published'));
      }
      
      const whereClause = and(...conditions);
      
      const results = await db
        .selectDistinct({ episode: podcastEpisodes })
        .from(podcastEpisodes)
        .innerJoin(podcastCategories, eq(podcastCategories.podcastId, podcastEpisodes.id))
        .where(whereClause)
        .orderBy(desc(podcastEpisodes.publishedAt))
        .limit(limit);
      episodes = results.map(r => r.episode);
    } else {
      // No category filter - apply archived and status filters
      const conditions = [eq(podcastEpisodes.isArchived, archivedOnly)];
      
      if (!canSeeAllStatuses) {
        conditions.push(eq(podcastEpisodes.status, 'published'));
      }
      
      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
      
      episodes = await db
        .select()
        .from(podcastEpisodes)
        .where(whereClause)
        .orderBy(desc(podcastEpisodes.publishedAt))
        .limit(limit);
    }

    const episodesWithCategories = await Promise.all(
      episodes.map(async (episode) => {
        const categoryResults = await db
          .select({ category: newsCategories })
          .from(podcastCategories)
          .innerJoin(newsCategories, eq(podcastCategories.categoryId, newsCategories.id))
          .where(eq(podcastCategories.podcastId, episode.id));

        return {
          ...episode,
          categories: categoryResults.map(r => r.category),
        };
      })
    );

    return episodesWithCategories;
  }

  async getPodcastEpisode(id: string): Promise<(PodcastEpisode & { categories: NewsCategory[] }) | undefined> {
    const [episode] = await db
      .select()
      .from(podcastEpisodes)
      .where(eq(podcastEpisodes.id, id));

    if (!episode) return undefined;

    const categoryResults = await db
      .select({ category: newsCategories })
      .from(podcastCategories)
      .innerJoin(newsCategories, eq(podcastCategories.categoryId, newsCategories.id))
      .where(eq(podcastCategories.podcastId, episode.id));

    return {
      ...episode,
      categories: categoryResults.map(r => r.category),
    };
  }

  async createPodcastEpisode(episode: InsertPodcastEpisode, categoryIds: string[]): Promise<PodcastEpisode & { categories: NewsCategory[] }> {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(podcastEpisodes)
        .values(episode)
        .returning();

      if (categoryIds.length > 0) {
        await tx.insert(podcastCategories).values(
          categoryIds.map(categoryId => ({
            podcastId: created.id,
            categoryId,
          }))
        );
      }

      const categoryResults = await tx
        .select({ category: newsCategories })
        .from(podcastCategories)
        .innerJoin(newsCategories, eq(podcastCategories.categoryId, newsCategories.id))
        .where(eq(podcastCategories.podcastId, created.id));

      return {
        ...created,
        categories: categoryResults.map(r => r.category),
      };
    });
  }

  async updatePodcastEpisode(episodeId: string, updates: Partial<InsertPodcastEpisode>, categoryIds?: string[]): Promise<(PodcastEpisode & { categories: NewsCategory[] }) | undefined> {
    return await db.transaction(async (tx) => {
      if (categoryIds !== undefined) {
        // Delete existing category associations
        await tx
          .delete(podcastCategories)
          .where(eq(podcastCategories.podcastId, episodeId));

        // Insert new category associations if any
        if (categoryIds.length > 0) {
          await tx.insert(podcastCategories).values(
            categoryIds.map(categoryId => ({
              podcastId: episodeId,
              categoryId,
            }))
          );
        }
      }

      const [updated] = await tx
        .update(podcastEpisodes)
        .set(updates)
        .where(eq(podcastEpisodes.id, episodeId))
        .returning();

      if (!updated) return undefined;

      const categoryResults = await tx
        .select({ category: newsCategories })
        .from(podcastCategories)
        .innerJoin(newsCategories, eq(podcastCategories.categoryId, newsCategories.id))
        .where(eq(podcastCategories.podcastId, updated.id));

      return {
        ...updated,
        categories: categoryResults.map(r => r.category),
      };
    });
  }

  async deletePodcastEpisode(episodeId: string): Promise<boolean> {
    // Delete user interactions related to this podcast
    await db
      .delete(userInteractions)
      .where(sql`${userInteractions.targetType} = 'podcast' AND ${userInteractions.targetId} = ${episodeId}`);

    // Delete the podcast episode
    const result = await db
      .delete(podcastEpisodes)
      .where(eq(podcastEpisodes.id, episodeId));
    
    return true;
  }

  async archivePodcastEpisode(episodeId: string, isArchived: boolean): Promise<PodcastEpisode | undefined> {
    const [updated] = await db
      .update(podcastEpisodes)
      .set({ isArchived })
      .where(eq(podcastEpisodes.id, episodeId))
      .returning();
    return updated;
  }

  async togglePodcastEpisodeStatus(episodeId: string, status: 'published' | 'draft'): Promise<PodcastEpisode | undefined> {
    const [updated] = await db
      .update(podcastEpisodes)
      .set({ status })
      .where(eq(podcastEpisodes.id, episodeId))
      .returning();
    return updated;
  }

  async togglePodcastEpisodeFeatured(episodeId: string, isFeatured: boolean): Promise<PodcastEpisode | undefined> {
    const [updated] = await db
      .update(podcastEpisodes)
      .set({ isFeatured })
      .where(eq(podcastEpisodes.id, episodeId))
      .returning();
    return updated;
  }

  async likePodcastEpisode(episodeId: string, userId: string): Promise<void> {
    const existing = await this.getUserInteraction(userId, 'podcast', episodeId, 'like');
    
    if (existing) {
      await this.deleteUserInteraction(userId, 'podcast', episodeId, 'like');
      await db
        .update(podcastEpisodes)
        .set({ likes: sql`${podcastEpisodes.likes} - 1` })
        .where(eq(podcastEpisodes.id, episodeId));
    } else {
      await this.createUserInteraction({
        userId,
        targetType: 'podcast',
        targetId: episodeId,
        interactionType: 'like',
      });
      await db
        .update(podcastEpisodes)
        .set({ likes: sql`${podcastEpisodes.likes} + 1` })
        .where(eq(podcastEpisodes.id, episodeId));
    }
  }

  async incrementPodcastEpisodeLikes(episodeId: string, userId: string): Promise<void> {
    // Always increment, no toggle - users can give multiple likes
    await db
      .update(podcastEpisodes)
      .set({ likes: sql`${podcastEpisodes.likes} + 1` })
      .where(eq(podcastEpisodes.id, episodeId));
    
    // Track each like as a separate interaction for authenticated users
    await this.createUserInteraction({
      userId,
      targetType: 'podcast',
      targetId: episodeId,
      interactionType: 'like',
    });
  }

  async incrementPodcastPlayCount(episodeId: string): Promise<void> {
    // Increment play count - no authentication required
    await db
      .update(podcastEpisodes)
      .set({ playCount: sql`${podcastEpisodes.playCount} + 1` })
      .where(eq(podcastEpisodes.id, episodeId));
  }

  async getFeaturedPodcastEpisode(): Promise<(PodcastEpisode & { categories: NewsCategory[] }) | undefined> {
    const [episode] = await db
      .select()
      .from(podcastEpisodes)
      .orderBy(desc(podcastEpisodes.publishedAt))
      .limit(1);

    if (!episode) return undefined;

    const categoryResults = await db
      .select({ category: newsCategories })
      .from(podcastCategories)
      .innerJoin(newsCategories, eq(podcastCategories.categoryId, newsCategories.id))
      .where(eq(podcastCategories.podcastId, episode.id));

    return {
      ...episode,
      categories: categoryResults.map(r => r.category),
    };
  }

  async getActivePolls(): Promise<Poll[]> {
    return await db
      .select()
      .from(polls)
      .where(eq(polls.isActive, true))
      .orderBy(desc(polls.createdAt));
  }

  async createPoll(poll: InsertPoll): Promise<Poll> {
    const [created] = await db
      .insert(polls)
      .values(poll)
      .returning();
    return created;
  }

  async votePoll(pollId: string, optionIndex: number, userId: string): Promise<void> {
    // Check if user already voted
    const existing = await this.getUserInteraction(userId, 'poll', pollId, 'vote');
    if (existing) return;
    
    // Record the vote
    await this.createUserInteraction({
      userId,
      targetType: 'poll',
      targetId: pollId,
      interactionType: 'vote',
    });
    
    // Update poll option votes
    const [poll] = await db.select().from(polls).where(eq(polls.id, pollId));
    if (poll) {
      const options = poll.options as any[];
      if (options[optionIndex]) {
        options[optionIndex].votes = (options[optionIndex].votes || 0) + 1;
        
        await db
          .update(polls)
          .set({
            options: options,
            totalVotes: sql`${polls.totalVotes} + 1`,
          })
          .where(eq(polls.id, pollId));
      }
    }
  }

  async getUserInteraction(userId: string, targetType: string, targetId: string, interactionType: string): Promise<UserInteraction | undefined> {
    const [interaction] = await db
      .select()
      .from(userInteractions)
      .where(
        and(
          eq(userInteractions.userId, userId),
          eq(userInteractions.targetType, targetType),
          eq(userInteractions.targetId, targetId),
          eq(userInteractions.interactionType, interactionType)
        )
      );
    return interaction;
  }

  async createUserInteraction(interaction: InsertUserInteraction): Promise<UserInteraction> {
    const [created] = await db
      .insert(userInteractions)
      .values(interaction)
      .returning();
    return created;
  }

  async deleteUserInteraction(userId: string, targetType: string, targetId: string, interactionType: string): Promise<void> {
    await db
      .delete(userInteractions)
      .where(
        and(
          eq(userInteractions.userId, userId),
          eq(userInteractions.targetType, targetType),
          eq(userInteractions.targetId, targetId),
          eq(userInteractions.interactionType, interactionType)
        )
      );
  }

  async getTopContributors(limit = 10): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.points))
      .limit(limit);
  }

  async getCommunityStats(): Promise<{
    activeMembers: number;
    discussionsThisWeek: number;
    questionsAnswered: number;
    resourcesShared: number;
    podcastListeners: number;
    certificationsEarned: number;
  }> {
    const [memberCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    
    const [discussionCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(forumDiscussions)
      .where(sql`${forumDiscussions.createdAt} >= NOW() - INTERVAL '7 days'`);
    
    const [replyCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(forumReplies);
    
    const [resourceCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(resources);
    
    // Mock values for listeners and certifications
    return {
      activeMembers: memberCount.count,
      discussionsThisWeek: discussionCount.count,
      questionsAnswered: replyCount.count,
      resourcesShared: resourceCount.count,
      podcastListeners: Math.floor(memberCount.count * 0.7),
      certificationsEarned: Math.floor(memberCount.count * 0.04),
    };
  }

  async getMenuSettings(): Promise<MenuSetting[]> {
    return await db
      .select()
      .from(menuSettings)
      .orderBy(menuSettings.displayOrder);
  }

  async updateMenuSetting(menuKey: string, updates: UpdateMenuSetting): Promise<MenuSetting | undefined> {
    const [updated] = await db
      .update(menuSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(menuSettings.menuKey, menuKey))
      .returning();
    return updated;
  }

  async initializeMenuSettings(): Promise<void> {
    // Check if menu settings already exist
    const existing = await db.select().from(menuSettings).limit(1);
    if (existing.length > 0) {
      return; // Already initialized
    }

    // Initialize default menu settings
    const defaultMenus: InsertMenuSetting[] = [
      { menuKey: 'news', menuLabel: 'News', isVisible: true, displayOrder: 1 },
      { menuKey: 'podcasts', menuLabel: 'Podcasts', isVisible: true, displayOrder: 2 },
      { menuKey: 'forums', menuLabel: 'Forums', isVisible: true, displayOrder: 3 },
      { menuKey: 'resources', menuLabel: 'Resources', isVisible: true, displayOrder: 4 },
      { menuKey: 'community', menuLabel: 'Community', isVisible: true, displayOrder: 5 },
    ];

    await db.insert(menuSettings).values(defaultMenus);
    console.log('✓ Menu settings initialized');
  }

  // Subscriber operations
  async createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber> {
    const [newSubscriber] = await db
      .insert(subscribers)
      .values(subscriber)
      .returning();
    return newSubscriber;
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, email));
    return subscriber;
  }

  async getSubscriberById(id: string): Promise<Subscriber | undefined> {
    const [subscriber] = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.id, id));
    return subscriber;
  }

  async updateSubscriber(id: string, updates: UpdateSubscriber): Promise<Subscriber | undefined> {
    const [updated] = await db
      .update(subscribers)
      .set(updates)
      .where(eq(subscribers.id, id))
      .returning();
    return updated;
  }

  async deleteSubscriber(id: string): Promise<boolean> {
    const result = await db
      .delete(subscribers)
      .where(eq(subscribers.id, id))
      .returning();
    return result.length > 0;
  }

  async getActiveSubscribers(): Promise<Subscriber[]> {
    return await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.isActive, true));
  }

  async getPublicCounts(): Promise<{ users: number; subscribers: number }> {
    const [userCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    const [subscriberCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscribers)
      .where(eq(subscribers.isActive, true));

    return {
      users: userCount.count,
      subscribers: subscriberCount.count,
    };
  }

  // Toolbox app operations
  async getToolboxApps(activeOnly: boolean = false): Promise<ToolboxApp[]> {
    if (activeOnly) {
      return await db
        .select()
        .from(toolboxApps)
        .where(eq(toolboxApps.isActive, true))
        .orderBy(toolboxApps.displayOrder);
    }
    return await db
      .select()
      .from(toolboxApps)
      .orderBy(toolboxApps.displayOrder);
  }

  async getToolboxApp(id: string): Promise<ToolboxApp | undefined> {
    const [app] = await db
      .select()
      .from(toolboxApps)
      .where(eq(toolboxApps.id, id));
    return app;
  }

  async createToolboxApp(app: InsertToolboxApp): Promise<ToolboxApp> {
    const [newApp] = await db
      .insert(toolboxApps)
      .values(app)
      .returning();
    return newApp;
  }

  async updateToolboxApp(id: string, updates: Partial<InsertToolboxApp>): Promise<ToolboxApp | undefined> {
    const [updated] = await db
      .update(toolboxApps)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(toolboxApps.id, id))
      .returning();
    return updated;
  }

  async deleteToolboxApp(id: string): Promise<boolean> {
    const result = await db
      .delete(toolboxApps)
      .where(eq(toolboxApps.id, id));
    return true;
  }

  // --- Engagement tracking ---

  async upsertEngagement(params: {
    identity: string;
    userId: string | null;
    anonId: string | null;
    contentType: string;
    contentId: string;
    activityDate: string;
    seconds: number;
  }): Promise<void> {
    await db
      .insert(contentEngagement)
      .values({
        identity: params.identity,
        userId: params.userId,
        anonId: params.anonId,
        contentType: params.contentType,
        contentId: params.contentId,
        activityDate: params.activityDate,
        totalSeconds: params.seconds,
        lastActivityAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          contentEngagement.identity,
          contentEngagement.contentType,
          contentEngagement.contentId,
          contentEngagement.activityDate,
        ],
        set: {
          totalSeconds: sql`${contentEngagement.totalSeconds} + ${params.seconds}`,
          lastActivityAt: new Date(),
          // Fill in userId if the visitor has since logged in
          userId: sql`COALESCE(${contentEngagement.userId}, ${params.userId})`,
        },
      });
  }

  async createPopupEvent(params: {
    identity: string;
    userId: string | null;
    anonId: string | null;
    trigger: string;
    details?: unknown;
  }): Promise<{ id: string }> {
    const [row] = await db
      .insert(popupEvents)
      .values({
        identity: params.identity,
        userId: params.userId,
        anonId: params.anonId,
        trigger: params.trigger,
        details: params.details ?? null,
      })
      .returning({ id: popupEvents.id });
    return row;
  }

  async updatePopupEvent(
    id: string,
    identity: string,
    updates: { emailEntered?: boolean; subscribed?: boolean; details?: unknown },
  ): Promise<boolean> {
    const set: any = { updatedAt: new Date() };
    if (updates.emailEntered !== undefined) set.emailEntered = updates.emailEntered;
    if (updates.subscribed !== undefined) set.subscribed = updates.subscribed;
    if (updates.details !== undefined) set.details = updates.details;
    const result = await db
      .update(popupEvents)
      .set(set)
      .where(and(eq(popupEvents.id, id), eq(popupEvents.identity, identity)))
      .returning({ id: popupEvents.id });
    return result.length > 0;
  }

  // --- Public read-only analytics aggregates (never expose identifiers) ---

  async getEngagementSummary(params: {
    contentType?: string;
    from?: string;
    to?: string;
    limit: number;
    offset: number;
  }): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT content_type AS "contentType",
             content_id AS "contentId",
             SUM(total_seconds)::int AS "totalSeconds",
             COUNT(DISTINCT identity)::int AS "uniqueVisitors",
             MIN(activity_date) AS "firstActivity",
             MAX(activity_date) AS "lastActivity"
      FROM content_engagement
      WHERE (${params.contentType ?? null}::varchar IS NULL OR content_type = ${params.contentType ?? null})
        AND (${params.from ?? null}::varchar IS NULL OR activity_date >= ${params.from ?? null})
        AND (${params.to ?? null}::varchar IS NULL OR activity_date <= ${params.to ?? null})
      GROUP BY content_type, content_id
      ORDER BY SUM(total_seconds) DESC
      LIMIT ${params.limit} OFFSET ${params.offset}
    `);
    return result.rows as any[];
  }

  async getEngagementDaily(params: {
    contentType?: string;
    from?: string;
    to?: string;
  }): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT activity_date AS "date",
             SUM(total_seconds)::int AS "totalSeconds",
             COUNT(DISTINCT identity)::int AS "uniqueVisitors",
             COUNT(DISTINCT content_id)::int AS "contentItems"
      FROM content_engagement
      WHERE (${params.contentType ?? null}::varchar IS NULL OR content_type = ${params.contentType ?? null})
        AND (${params.from ?? null}::varchar IS NULL OR activity_date >= ${params.from ?? null})
        AND (${params.to ?? null}::varchar IS NULL OR activity_date <= ${params.to ?? null})
      GROUP BY activity_date
      ORDER BY activity_date ASC
      LIMIT 400
    `);
    return result.rows as any[];
  }

  async getPopupFunnel(params: { from?: string; to?: string }): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT trigger,
             COUNT(*)::int AS "opens",
             COUNT(*) FILTER (WHERE email_entered)::int AS "emailEntered",
             COUNT(*) FILTER (WHERE subscribed)::int AS "subscribed"
      FROM popup_events
      WHERE (${params.from ?? null}::varchar IS NULL OR created_at >= (${params.from ?? null})::timestamp)
        AND (${params.to ?? null}::varchar IS NULL OR created_at < ((${params.to ?? null})::timestamp + interval '1 day'))
      GROUP BY trigger
      ORDER BY COUNT(*) DESC
    `);
    return result.rows as any[];
  }

  async linkAnonToUser(anonId: string, userId: string): Promise<void> {
    // Merge anonymous engagement rows into the user's identity. Where a
    // user-identity row already exists for the same content+day, add the
    // seconds and drop the anonymous row; otherwise re-identify the row.
    await db.execute(sql`
      UPDATE content_engagement u
      SET total_seconds = u.total_seconds + a.total_seconds,
          last_activity_at = GREATEST(u.last_activity_at, a.last_activity_at)
      FROM content_engagement a
      WHERE u.identity = ${userId}
        AND a.identity = ${anonId}
        AND a.anon_id = ${anonId}
        AND (a.user_id IS NULL OR a.user_id = ${userId})
        AND u.content_type = a.content_type
        AND u.content_id = a.content_id
        AND u.activity_date = a.activity_date
    `);
    await db.execute(sql`
      DELETE FROM content_engagement a
      WHERE a.identity = ${anonId}
        AND a.anon_id = ${anonId}
        AND (a.user_id IS NULL OR a.user_id = ${userId})
        AND EXISTS (
          SELECT 1 FROM content_engagement u
          WHERE u.identity = ${userId}
            AND u.content_type = a.content_type
            AND u.content_id = a.content_id
            AND u.activity_date = a.activity_date
        )
    `);
    await db.execute(sql`
      UPDATE content_engagement
      SET identity = ${userId}, user_id = ${userId}
      WHERE identity = ${anonId}
        AND anon_id = ${anonId}
        AND (user_id IS NULL OR user_id = ${userId})
    `);
    // Popup events are append-only; re-identify them to the user
    await db.execute(sql`
      UPDATE popup_events
      SET identity = ${userId}, user_id = ${userId}
      WHERE anon_id = ${anonId}
        AND (user_id IS NULL OR user_id = ${userId})
    `);
  }
}

export const storage = new DatabaseStorage();
