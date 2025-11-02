import {
  users,
  newsCategories,
  newsArticles,
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
  type User,
  type UpsertUser,
  type NewsCategory,
  type InsertNewsCategory,
  type NewsArticle,
  type InsertNewsArticle,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, ilike, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  
  // News category operations
  getNewsCategories(activeOnly?: boolean): Promise<NewsCategory[]>;
  getNewsCategory(id: string): Promise<NewsCategory | undefined>;
  createNewsCategory(category: InsertNewsCategory): Promise<NewsCategory>;
  updateNewsCategory(categoryId: string, updates: Partial<InsertNewsCategory>): Promise<NewsCategory | undefined>;
  deleteNewsCategory(categoryId: string): Promise<boolean>;
  initializeNewsCategories(): Promise<void>;
  
  // News operations
  getNewsArticles(categoryIds?: string[], limit?: number, userRole?: string): Promise<(NewsArticle & { categories: NewsCategory[] })[]>;
  getNewsArticle(id: string): Promise<(NewsArticle & { categories: NewsCategory[] }) | undefined>;
  createNewsArticle(article: InsertNewsArticle, categoryIds: string[]): Promise<NewsArticle & { categories: NewsCategory[] }>;
  updateNewsArticle(articleId: string, updates: Partial<InsertNewsArticle>, categoryIds?: string[]): Promise<(NewsArticle & { categories: NewsCategory[] }) | undefined>;
  deleteNewsArticle(articleId: string): Promise<boolean>;
  archiveNewsArticle(articleId: string): Promise<NewsArticle | undefined>;
  toggleNewsArticleStatus(articleId: string, status: 'published' | 'draft'): Promise<NewsArticle | undefined>;
  toggleNewsArticleFeatured(articleId: string, isFeatured: boolean): Promise<NewsArticle | undefined>;
  likeNewsArticle(articleId: string, userId: string): Promise<void>;
  incrementNewsArticleLikes(articleId: string, userId: string): Promise<void>;
  
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
  getPodcastEpisodes(categoryIds?: string[], limit?: number, userRole?: string): Promise<(PodcastEpisode & { categories: NewsCategory[] })[]>;
  getPodcastEpisode(id: string): Promise<(PodcastEpisode & { categories: NewsCategory[] }) | undefined>;
  createPodcastEpisode(episode: InsertPodcastEpisode, categoryIds: string[]): Promise<PodcastEpisode & { categories: NewsCategory[] }>;
  updatePodcastEpisode(episodeId: string, updates: Partial<InsertPodcastEpisode>, categoryIds?: string[]): Promise<(PodcastEpisode & { categories: NewsCategory[] }) | undefined>;
  deletePodcastEpisode(episodeId: string): Promise<boolean>;
  togglePodcastEpisodeStatus(episodeId: string, status: 'published' | 'draft'): Promise<PodcastEpisode | undefined>;
  togglePodcastEpisodeFeatured(episodeId: string, isFeatured: boolean): Promise<PodcastEpisode | undefined>;
  likePodcastEpisode(episodeId: string, userId: string): Promise<void>;
  incrementPodcastEpisodeLikes(episodeId: string, userId: string): Promise<void>;
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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async getNewsArticles(categoryIds?: string[], limit = 10, userRole?: string): Promise<(NewsArticle & { categories: NewsCategory[] })[]> {
    let articles: NewsArticle[];
    
    // Admins and editors can see all articles; regular users only see published
    const canSeeAllStatuses = userRole === 'admin' || userRole === 'editor';
    
    if (categoryIds && categoryIds.length > 0) {
      // Build the where clause - always include category filter, add status filter for non-admins
      const whereClause = canSeeAllStatuses
        ? inArray(articleCategories.categoryId, categoryIds)
        : and(
            inArray(articleCategories.categoryId, categoryIds),
            eq(newsArticles.status, 'published')
          );
      
      const results = await db
        .selectDistinct({ article: newsArticles })
        .from(newsArticles)
        .innerJoin(articleCategories, eq(articleCategories.articleId, newsArticles.id))
        .where(whereClause)
        .orderBy(desc(newsArticles.publishedAt))
        .limit(limit);
      articles = results.map(r => r.article);
    } else {
      // No category filter - admins see all, regular users see only published
      if (canSeeAllStatuses) {
        articles = await db
          .select()
          .from(newsArticles)
          .orderBy(desc(newsArticles.publishedAt))
          .limit(limit);
      } else {
        articles = await db
          .select()
          .from(newsArticles)
          .where(eq(newsArticles.status, 'published'))
          .orderBy(desc(newsArticles.publishedAt))
          .limit(limit);
      }
    }

    const articlesWithCategories = await Promise.all(
      articles.map(async (article) => {
        const categoryResults = await db
          .select({ category: newsCategories })
          .from(articleCategories)
          .innerJoin(newsCategories, eq(articleCategories.categoryId, newsCategories.id))
          .where(eq(articleCategories.articleId, article.id));

        return {
          ...article,
          categories: categoryResults.map(r => r.category),
        };
      })
    );

    return articlesWithCategories;
  }

  async getNewsArticle(id: string): Promise<(NewsArticle & { categories: NewsCategory[] }) | undefined> {
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

    return {
      ...article,
      categories: categoryResults.map(r => r.category),
    };
  }

  async createNewsArticle(article: InsertNewsArticle, categoryIds: string[]): Promise<NewsArticle & { categories: NewsCategory[] }> {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(newsArticles)
        .values(article)
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

  async updateNewsArticle(articleId: string, updates: Partial<InsertNewsArticle>, categoryIds?: string[]): Promise<(NewsArticle & { categories: NewsCategory[] }) | undefined> {
    return await db.transaction(async (tx) => {
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
        .set(updates)
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

  async archiveNewsArticle(articleId: string): Promise<NewsArticle | undefined> {
    const [updated] = await db
      .update(newsArticles)
      .set({ isArchived: true })
      .where(eq(newsArticles.id, articleId))
      .returning();
    return updated;
  }

  async toggleNewsArticleStatus(articleId: string, status: 'published' | 'draft'): Promise<NewsArticle | undefined> {
    const [updated] = await db
      .update(newsArticles)
      .set({ status })
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

  async getPodcastEpisodes(categoryIds?: string[], limit = 10, userRole?: string): Promise<(PodcastEpisode & { categories: NewsCategory[] })[]> {
    let episodes: PodcastEpisode[];
    
    // Admins and editors can see all episodes; regular users only see published
    const canSeeAllStatuses = userRole === 'admin' || userRole === 'editor';
    
    if (categoryIds && categoryIds.length > 0) {
      // Build the where clause - always include category filter, add status filter for non-admins
      const whereClause = canSeeAllStatuses
        ? inArray(podcastCategories.categoryId, categoryIds)
        : and(
            inArray(podcastCategories.categoryId, categoryIds),
            eq(podcastEpisodes.status, 'published')
          );
      
      const results = await db
        .selectDistinct({ episode: podcastEpisodes })
        .from(podcastEpisodes)
        .innerJoin(podcastCategories, eq(podcastCategories.podcastId, podcastEpisodes.id))
        .where(whereClause)
        .orderBy(desc(podcastEpisodes.publishedAt))
        .limit(limit);
      episodes = results.map(r => r.episode);
    } else {
      // No category filter - admins see all, regular users see only published
      if (canSeeAllStatuses) {
        episodes = await db
          .select()
          .from(podcastEpisodes)
          .orderBy(desc(podcastEpisodes.publishedAt))
          .limit(limit);
      } else {
        episodes = await db
          .select()
          .from(podcastEpisodes)
          .where(eq(podcastEpisodes.status, 'published'))
          .orderBy(desc(podcastEpisodes.publishedAt))
          .limit(limit);
      }
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
}

export const storage = new DatabaseStorage();
