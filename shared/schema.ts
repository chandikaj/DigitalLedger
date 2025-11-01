import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"), // bcrypt hash for authentication
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  expertiseTags: text("expertise_tags").array(),
  title: varchar("title"),
  company: varchar("company"),
  bio: text("bio"),
  points: integer("points").default(0),
  badges: text("badges").array(),
  role: varchar("role").default("subscriber"), // subscriber, contributor, editor, admin
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User invitations for email-based user management
export const userInvitations = pgTable("user_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  role: varchar("role").notNull().default("subscriber"), // subscriber, contributor, editor, admin
  invitedBy: varchar("invited_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  revokedAt: timestamp("revoked_at"),
});

// Menu settings for admin control
export const menuSettings = pgTable("menu_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  menuKey: varchar("menu_key").unique().notNull(), // news, podcasts, forums, resources, community
  menuLabel: varchar("menu_label").notNull(), // Display name
  isVisible: boolean("is_visible").default(true), // Whether menu item is visible
  displayOrder: integer("display_order").default(0), // Order in menu
  updatedAt: timestamp("updated_at").defaultNow(),
});

// News categories
export const newsCategories = pgTable("news_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").unique().notNull(), // Display name: "Automation", "Fraud Detection", etc.
  slug: varchar("slug").unique().notNull(), // URL-friendly: "automation", "fraud-detection", etc.
  description: text("description"),
  icon: varchar("icon"), // Lucide icon name
  color: varchar("color"), // Hex color for UI
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// News articles
export const newsArticles = pgTable("news_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  imageUrl: varchar("image_url"),
  thumbnailUrl: varchar("thumbnail_url"),
  sourceUrl: varchar("source_url"),
  sourceName: varchar("source_name"),
  category: varchar("category").notNull(), // References newsCategories.name
  authorId: varchar("author_id").references(() => users.id),
  publishedAt: timestamp("published_at").defaultNow(),
  likes: integer("likes").default(0),
  isArchived: boolean("is_archived").default(false),
  isFeatured: boolean("is_featured").default(false),
  status: varchar("status").default("published").notNull(), // 'published' or 'draft'
  createdAt: timestamp("created_at").defaultNow(),
});

// Forum categories
export const forumCategories = pgTable("forum_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  icon: varchar("icon"),
  color: varchar("color"),
  discussionCount: integer("discussion_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Forum discussions
export const forumDiscussions = pgTable("forum_discussions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  categoryId: varchar("category_id").references(() => forumCategories.id),
  authorId: varchar("author_id").references(() => users.id),
  isPinned: boolean("is_pinned").default(false),
  isLocked: boolean("is_locked").default(false),
  replyCount: integer("reply_count").default(0),
  likes: integer("likes").default(0),
  lastReplyAt: timestamp("last_reply_at"),
  isFeatured: boolean("is_featured").default(false),
  status: varchar("status").default("published").notNull(), // 'published' or 'draft'
  createdAt: timestamp("created_at").defaultNow(),
});

// Forum replies
export const forumReplies = pgTable("forum_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  discussionId: varchar("discussion_id").references(() => forumDiscussions.id),
  authorId: varchar("author_id").references(() => users.id),
  parentReplyId: varchar("parent_reply_id").references((): any => forumReplies.id),
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Educational resources
export const resources = pgTable("resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // ebook, webinar, case-study, certification
  category: varchar("category").notNull(), // taxation, financial-reporting, audit-automation, ethical-ai
  url: varchar("url"),
  fileUrl: varchar("file_url"),
  imageUrl: varchar("image_url"),
  duration: varchar("duration"), // for webinars/videos
  difficulty: varchar("difficulty"), // beginner, intermediate, advanced
  rating: integer("rating").default(0),
  ratingCount: integer("rating_count").default(0),
  downloadCount: integer("download_count").default(0),
  isFree: boolean("is_free").default(true),
  authorId: varchar("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Podcast episodes
export const podcastEpisodes = pgTable("podcast_episodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  episodeNumber: integer("episode_number"),
  audioUrl: varchar("audio_url"),
  imageUrl: varchar("image_url"),
  duration: varchar("duration"),
  hostName: varchar("host_name"),
  guestName: varchar("guest_name"),
  guestTitle: varchar("guest_title"),
  playCount: integer("play_count").default(0),
  likes: integer("likes").default(0),
  publishedAt: timestamp("published_at").defaultNow(),
  isFeatured: boolean("is_featured").default(false),
  status: varchar("status").default("published").notNull(), // 'published' or 'draft'
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table: Article Categories (many-to-many)
export const articleCategories = pgTable("article_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").references(() => newsArticles.id, { onDelete: 'cascade' }).notNull(),
  categoryId: varchar("category_id").references(() => newsCategories.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table: Podcast Categories (many-to-many)
export const podcastCategories = pgTable("podcast_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  podcastId: varchar("podcast_id").references(() => podcastEpisodes.id, { onDelete: 'cascade' }).notNull(),
  categoryId: varchar("category_id").references(() => newsCategories.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table: Discussion News Categories (many-to-many)
export const discussionNewsCategories = pgTable("discussion_news_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discussionId: varchar("discussion_id").references(() => forumDiscussions.id, { onDelete: 'cascade' }).notNull(),
  categoryId: varchar("category_id").references(() => newsCategories.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community polls
export const polls = pgTable("polls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  options: jsonb("options").notNull(), // array of {text: string, votes: number}
  totalVotes: integer("total_votes").default(0),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// User interactions (likes, votes, etc.)
export const userInteractions = pgTable("user_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  targetType: varchar("target_type").notNull(), // news, discussion, reply, podcast, resource
  targetId: varchar("target_id").notNull(),
  interactionType: varchar("interaction_type").notNull(), // like, bookmark, vote
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  newsArticles: many(newsArticles),
  discussions: many(forumDiscussions),
  replies: many(forumReplies),
  resources: many(resources),
  interactions: many(userInteractions),
  sentInvitations: many(userInvitations),
}));

export const userInvitationsRelations = relations(userInvitations, ({ one }) => ({
  invitedBy: one(users, {
    fields: [userInvitations.invitedBy],
    references: [users.id],
  }),
}));

export const newsArticlesRelations = relations(newsArticles, ({ one, many }) => ({
  author: one(users, {
    fields: [newsArticles.authorId],
    references: [users.id],
  }),
  articleCategories: many(articleCategories),
}));

export const newsCategoriesRelations = relations(newsCategories, ({ many }) => ({
  articles: many(articleCategories),
  podcasts: many(podcastCategories),
  discussions: many(discussionNewsCategories),
}));

export const articleCategoriesRelations = relations(articleCategories, ({ one }) => ({
  article: one(newsArticles, {
    fields: [articleCategories.articleId],
    references: [newsArticles.id],
  }),
  category: one(newsCategories, {
    fields: [articleCategories.categoryId],
    references: [newsCategories.id],
  }),
}));

export const podcastEpisodesRelations = relations(podcastEpisodes, ({ many }) => ({
  podcastCategories: many(podcastCategories),
}));

export const podcastCategoriesRelations = relations(podcastCategories, ({ one }) => ({
  podcast: one(podcastEpisodes, {
    fields: [podcastCategories.podcastId],
    references: [podcastEpisodes.id],
  }),
  category: one(newsCategories, {
    fields: [podcastCategories.categoryId],
    references: [newsCategories.id],
  }),
}));

export const discussionNewsCategoriesRelations = relations(discussionNewsCategories, ({ one }) => ({
  discussion: one(forumDiscussions, {
    fields: [discussionNewsCategories.discussionId],
    references: [forumDiscussions.id],
  }),
  category: one(newsCategories, {
    fields: [discussionNewsCategories.categoryId],
    references: [newsCategories.id],
  }),
}));

export const forumCategoriesRelations = relations(forumCategories, ({ many }) => ({
  discussions: many(forumDiscussions),
}));

export const forumDiscussionsRelations = relations(forumDiscussions, ({ one, many }) => ({
  category: one(forumCategories, {
    fields: [forumDiscussions.categoryId],
    references: [forumCategories.id],
  }),
  author: one(users, {
    fields: [forumDiscussions.authorId],
    references: [users.id],
  }),
  replies: many(forumReplies),
  discussionNewsCategories: many(discussionNewsCategories),
}));

export const forumRepliesRelations = relations(forumReplies, ({ one, many }) => ({
  discussion: one(forumDiscussions, {
    fields: [forumReplies.discussionId],
    references: [forumDiscussions.id],
  }),
  author: one(users, {
    fields: [forumReplies.authorId],
    references: [users.id],
  }),
  parentReply: one(forumReplies, {
    fields: [forumReplies.parentReplyId],
    references: [forumReplies.id],
  }),
  childReplies: many(forumReplies),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  author: one(users, {
    fields: [resources.authorId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: true, // Don't expose password hash in regular inserts
});

// Auth schemas for login/register
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const insertNewsCategorySchema = createInsertSchema(newsCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNewsArticleSchema = createInsertSchema(newsArticles).omit({
  id: true,
  createdAt: true,
  likes: true,
});

export const insertForumCategorySchema = createInsertSchema(forumCategories).omit({
  id: true,
  createdAt: true,
  discussionCount: true,
});

export const insertForumDiscussionSchema = createInsertSchema(forumDiscussions).omit({
  id: true,
  createdAt: true,
  replyCount: true,
  likes: true,
  lastReplyAt: true,
  isPinned: true,
  isLocked: true,
});

export const insertForumReplySchema = createInsertSchema(forumReplies).omit({
  id: true,
  createdAt: true,
  likes: true,
});

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  createdAt: true,
  rating: true,
  ratingCount: true,
  downloadCount: true,
});

export const insertPodcastEpisodeSchema = createInsertSchema(podcastEpisodes).omit({
  id: true,
  createdAt: true,
  playCount: true,
  likes: true,
});

export const insertPollSchema = createInsertSchema(polls).omit({
  id: true,
  createdAt: true,
  totalVotes: true,
});

export const insertUserInteractionSchema = createInsertSchema(userInteractions).omit({
  id: true,
  createdAt: true,
});

export const insertUserInvitationSchema = createInsertSchema(userInvitations).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  revokedAt: true,
});

export const insertMenuSettingSchema = createInsertSchema(menuSettings).omit({
  id: true,
  updatedAt: true,
});

export const updateMenuSettingSchema = z.object({
  isVisible: z.boolean(),
});

export const insertArticleCategorySchema = createInsertSchema(articleCategories).omit({
  id: true,
  createdAt: true,
});

export const insertPodcastCategorySchema = createInsertSchema(podcastCategories).omit({
  id: true,
  createdAt: true,
});

export const insertDiscussionNewsCategorySchema = createInsertSchema(discussionNewsCategories).omit({
  id: true,
  createdAt: true,
});

// Admin user management schemas
export const adminCreateUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["subscriber", "contributor", "editor", "admin"]).default("subscriber"),
  title: z.string().optional(),
  company: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const adminUpdateUserSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  role: z.enum(["subscriber", "contributor", "editor", "admin"]).optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type AdminCreateUser = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUser = z.infer<typeof adminUpdateUserSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type NewsCategory = typeof newsCategories.$inferSelect;
export type InsertNewsCategory = z.infer<typeof insertNewsCategorySchema>;
export type NewsArticle = typeof newsArticles.$inferSelect;
export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;
export type ForumCategory = typeof forumCategories.$inferSelect;
export type InsertForumCategory = z.infer<typeof insertForumCategorySchema>;
export type ForumDiscussion = typeof forumDiscussions.$inferSelect;
export type InsertForumDiscussion = z.infer<typeof insertForumDiscussionSchema>;
export type ForumReply = typeof forumReplies.$inferSelect;
export type InsertForumReply = z.infer<typeof insertForumReplySchema>;
export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type PodcastEpisode = typeof podcastEpisodes.$inferSelect;
export type InsertPodcastEpisode = z.infer<typeof insertPodcastEpisodeSchema>;
export type Poll = typeof polls.$inferSelect;
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type UserInteraction = typeof userInteractions.$inferSelect;
export type InsertUserInteraction = z.infer<typeof insertUserInteractionSchema>;
export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = z.infer<typeof insertUserInvitationSchema>;
export type MenuSetting = typeof menuSettings.$inferSelect;
export type InsertMenuSetting = z.infer<typeof insertMenuSettingSchema>;
export type UpdateMenuSetting = z.infer<typeof updateMenuSettingSchema>;
export type ArticleCategory = typeof articleCategories.$inferSelect;
export type InsertArticleCategory = z.infer<typeof insertArticleCategorySchema>;
export type PodcastCategory = typeof podcastCategories.$inferSelect;
export type InsertPodcastCategory = z.infer<typeof insertPodcastCategorySchema>;
export type DiscussionNewsCategory = typeof discussionNewsCategories.$inferSelect;
export type InsertDiscussionNewsCategory = z.infer<typeof insertDiscussionNewsCategorySchema>;
