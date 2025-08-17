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

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  expertiseTags: text("expertise_tags").array(),
  title: varchar("title"),
  company: varchar("company"),
  bio: text("bio"),
  points: integer("points").default(0),
  badges: text("badges").array(),
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
  sourceUrl: varchar("source_url"),
  sourceName: varchar("source_name"),
  category: varchar("category").notNull(), // automation, fraud-detection, regulatory, generative-ai
  authorId: varchar("author_id").references(() => users.id),
  publishedAt: timestamp("published_at").defaultNow(),
  likes: integer("likes").default(0),
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Forum replies
export const forumReplies = pgTable("forum_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  discussionId: varchar("discussion_id").references(() => forumDiscussions.id),
  authorId: varchar("author_id").references(() => users.id),
  parentReplyId: varchar("parent_reply_id").references(() => forumReplies.id),
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
}));

export const newsArticlesRelations = relations(newsArticles, ({ one }) => ({
  author: one(users, {
    fields: [newsArticles.authorId],
    references: [users.id],
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

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
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
