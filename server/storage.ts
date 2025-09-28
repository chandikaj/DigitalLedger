import {
  users,
  newsArticles,
  forumCategories,
  forumDiscussions,
  forumReplies,
  resources,
  podcastEpisodes,
  polls,
  userInteractions,
  userInvitations,
  type User,
  type UpsertUser,
  type NewsArticle,
  type InsertNewsArticle,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
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
  
  // News operations
  getNewsArticles(category?: string, limit?: number): Promise<NewsArticle[]>;
  createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  likeNewsArticle(articleId: string, userId: string): Promise<void>;
  
  // Forum operations
  getForumCategories(): Promise<ForumCategory[]>;
  createForumCategory(category: InsertForumCategory): Promise<ForumCategory>;
  getForumDiscussions(categoryId?: string, limit?: number): Promise<(ForumDiscussion & { author: User; category: ForumCategory })[]>;
  createForumDiscussion(discussion: InsertForumDiscussion): Promise<ForumDiscussion>;
  getForumDiscussion(id: string): Promise<(ForumDiscussion & { author: User; category: ForumCategory; replies: (ForumReply & { author: User })[] }) | undefined>;
  createForumReply(reply: InsertForumReply): Promise<ForumReply>;
  likeForumDiscussion(discussionId: string, userId: string): Promise<void>;
  likeForumReply(replyId: string, userId: string): Promise<void>;
  
  // Resource operations
  getResources(type?: string, category?: string, limit?: number): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;
  searchResources(query: string): Promise<Resource[]>;
  
  // Podcast operations
  getPodcastEpisodes(limit?: number): Promise<PodcastEpisode[]>;
  createPodcastEpisode(episode: InsertPodcastEpisode): Promise<PodcastEpisode>;
  getFeaturedPodcastEpisode(): Promise<PodcastEpisode | undefined>;
  
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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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

  async getNewsArticles(category?: string, limit = 10): Promise<NewsArticle[]> {
    const query = db
      .select()
      .from(newsArticles)
      .orderBy(desc(newsArticles.publishedAt))
      .limit(limit);
    
    if (category) {
      query.where(eq(newsArticles.category, category));
    }
    
    return await query;
  }

  async createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle> {
    const [created] = await db
      .insert(newsArticles)
      .values(article)
      .returning();
    return created;
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

  async getForumDiscussions(categoryId?: string, limit = 20): Promise<(ForumDiscussion & { author: User; category: ForumCategory })[]> {
    const query = db
      .select()
      .from(forumDiscussions)
      .leftJoin(users, eq(forumDiscussions.authorId, users.id))
      .leftJoin(forumCategories, eq(forumDiscussions.categoryId, forumCategories.id))
      .orderBy(desc(forumDiscussions.lastReplyAt), desc(forumDiscussions.createdAt))
      .limit(limit);
    
    if (categoryId) {
      query.where(eq(forumDiscussions.categoryId, categoryId));
    }
    
    const results = await query;
    return results.map(row => ({
      ...row.forum_discussions,
      author: row.users!,
      category: row.forum_categories!,
    }));
  }

  async createForumDiscussion(discussion: InsertForumDiscussion): Promise<ForumDiscussion> {
    const [created] = await db
      .insert(forumDiscussions)
      .values({
        ...discussion,
        lastReplyAt: new Date(),
      })
      .returning();
    
    // Update category discussion count
    await db
      .update(forumCategories)
      .set({ discussionCount: sql`${forumCategories.discussionCount} + 1` })
      .where(eq(forumCategories.id, discussion.categoryId!));
    
    return created;
  }

  async getForumDiscussion(id: string): Promise<(ForumDiscussion & { author: User; category: ForumCategory; replies: (ForumReply & { author: User })[] }) | undefined> {
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
    
    return {
      ...discussion.forum_discussions,
      author: discussion.users!,
      category: discussion.forum_categories!,
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

  async getPodcastEpisodes(limit = 10): Promise<PodcastEpisode[]> {
    return await db
      .select()
      .from(podcastEpisodes)
      .orderBy(desc(podcastEpisodes.publishedAt))
      .limit(limit);
  }

  async createPodcastEpisode(episode: InsertPodcastEpisode): Promise<PodcastEpisode> {
    const [created] = await db
      .insert(podcastEpisodes)
      .values(episode)
      .returning();
    return created;
  }

  async getFeaturedPodcastEpisode(): Promise<PodcastEpisode | undefined> {
    const [episode] = await db
      .select()
      .from(podcastEpisodes)
      .orderBy(desc(podcastEpisodes.publishedAt))
      .limit(1);
    return episode;
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
}

export const storage = new DatabaseStorage();
