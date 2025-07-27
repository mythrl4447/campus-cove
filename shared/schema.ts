// all the db tables

import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  major: varchar("major", { length: 100 }),
  year: varchar("year", { length: 20 }),
  bio: text("bio"),
  graduationYear: varchar("graduation_year", { length: 4 }),
  location: varchar("location", { length: 255 }),
  profilePicture: varchar("profile_picture", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  instructor: varchar("instructor", { length: 255 }),
  department: varchar("department", { length: 100 }),
  level: varchar("level", { length: 50 }),
  semester: varchar("semester", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const courseMembers = pgTable("course_members", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull()
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  courseId: integer("course_id").references(() => courses.id).notNull(),
  uploaderId: integer("uploader_id").references(() => users.id).notNull(),
  downloads: integer("downloads").default(0).notNull(),
  rating: integer("rating").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const forumCategories = pgTable("forum_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const forumPosts = pgTable("forum_posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  categoryId: integer("category_id").references(() => forumCategories.id),
  upvotes: integer("upvotes").default(0).notNull(),
  downvotes: integer("downvotes").default(0).notNull(),
  views: integer("views").default(0).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  tags: jsonb("tags").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const forumReplies = pgTable("forum_replies", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  postId: integer("post_id").references(() => forumPosts.id).notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
  downvotes: integer("downvotes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const studyGroups = pgTable("study_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  courseId: integer("course_id").references(() => courses.id),
  creatorId: integer("creator_id").references(() => users.id).notNull(),
  maxMembers: integer("max_members").default(6).notNull(),
  schedule: text("schedule"),
  location: varchar("location", { length: 255 }),
  meetingDate: timestamp("meeting_date"),
  endDate: timestamp("end_date"),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurringPattern: varchar("recurring_pattern", { length: 50 }), // 'weekly', 'biweekly', 'monthly'
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const studyGroupMembers = pgTable("study_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => studyGroups.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull()
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 20 }).default("direct").notNull(), // 'direct' or 'group'
  name: varchar("name", { length: 255 }),
  description: text("description"),
  profilePicture: varchar("profile_picture", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const conversationParticipants = pgTable("conversation_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull()
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content"),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  fileUrl: varchar("file_url", { length: 500 }),
  fileName: varchar("file_name", { length: 255 }),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const postVotes = pgTable("post_votes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  postId: integer("post_id").references(() => forumPosts.id).notNull(),
  voteType: varchar("vote_type", { length: 10 }).notNull() // 'up' or 'down'
});

export const replyVotes = pgTable("reply_votes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  replyId: integer("reply_id").references(() => forumReplies.id).notNull(),
  voteType: varchar("vote_type", { length: 10 }).notNull() // 'up' or 'down'
});

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // 'deadline', 'study_group', 'assignment', 'exam', 'meeting'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  allDay: boolean("all_day").default(false).notNull(),
  location: varchar("location", { length: 255 }),
  userId: integer("user_id").references(() => users.id).notNull(),
  courseId: integer("course_id").references(() => courses.id),
  studyGroupId: integer("study_group_id").references(() => studyGroups.id),
  priority: varchar("priority", { length: 20 }).default("medium").notNull(), // 'low', 'medium', 'high'
  isCompleted: boolean("is_completed").default(false).notNull(),
  reminderMinutes: integer("reminder_minutes").default(60), // reminder time in minutes before event
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  courseMembers: many(courseMembers),
  resources: many(resources),
  forumPosts: many(forumPosts),
  forumReplies: many(forumReplies),
  studyGroups: many(studyGroups),
  studyGroupMembers: many(studyGroupMembers),
  conversationParticipants: many(conversationParticipants),
  messages: many(messages),
  postVotes: many(postVotes),
  replyVotes: many(replyVotes),
  calendarEvents: many(calendarEvents)
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  members: many(courseMembers),
  resources: many(resources),
  studyGroups: many(studyGroups),
  calendarEvents: many(calendarEvents)
}));

export const courseMembersRelations = relations(courseMembers, ({ one }) => ({
  course: one(courses, { fields: [courseMembers.courseId], references: [courses.id] }),
  user: one(users, { fields: [courseMembers.userId], references: [users.id] })
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  course: one(courses, { fields: [resources.courseId], references: [courses.id] }),
  uploader: one(users, { fields: [resources.uploaderId], references: [users.id] })
}));

export const forumPostsRelations = relations(forumPosts, ({ one, many }) => ({
  author: one(users, { fields: [forumPosts.authorId], references: [users.id] }),
  category: one(forumCategories, { fields: [forumPosts.categoryId], references: [forumCategories.id] }),
  replies: many(forumReplies),
  votes: many(postVotes)
}));

export const forumRepliesRelations = relations(forumReplies, ({ one, many }) => ({
  author: one(users, { fields: [forumReplies.authorId], references: [users.id] }),
  post: one(forumPosts, { fields: [forumReplies.postId], references: [forumPosts.id] }),
  votes: many(replyVotes)
}));

export const studyGroupsRelations = relations(studyGroups, ({ one, many }) => ({
  course: one(courses, { fields: [studyGroups.courseId], references: [courses.id] }),
  creator: one(users, { fields: [studyGroups.creatorId], references: [users.id] }),
  members: many(studyGroupMembers),
  calendarEvents: many(calendarEvents)
}));

export const studyGroupMembersRelations = relations(studyGroupMembers, ({ one }) => ({
  group: one(studyGroups, { fields: [studyGroupMembers.groupId], references: [studyGroups.id] }),
  user: one(users, { fields: [studyGroupMembers.userId], references: [users.id] })
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(conversationParticipants),
  messages: many(messages)
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] })
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, { fields: [calendarEvents.userId], references: [users.id] }),
  course: one(courses, { fields: [calendarEvents.courseId], references: [courses.id] }),
  studyGroup: one(studyGroups, { fields: [calendarEvents.studyGroupId], references: [studyGroups.id] })
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true
});

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  createdAt: true,
  downloads: true,
  rating: true
});

export const insertForumPostSchema = createInsertSchema(forumPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  upvotes: true,
  downvotes: true,
  views: true,
  isPinned: true
});

export const insertForumReplySchema = createInsertSchema(forumReplies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  upvotes: true,
  downvotes: true
});

export const insertStudyGroupSchema = createInsertSchema(studyGroups).omit({
  id: true,
  createdAt: true,
  isActive: true
}).extend({
  meetingDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true
}).extend({
  content: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional()
}).refine(data => data.content || data.fileUrl, {
  message: "Either content or fileUrl must be provided"
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isCompleted: true
}).extend({
  courseId: z.number().optional().nullable(),
  studyGroupId: z.number().optional().nullable(),
  startDate: z.date(),
  endDate: z.date().optional().nullable(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type ForumPost = typeof forumPosts.$inferSelect;
export type InsertForumPost = z.infer<typeof insertForumPostSchema>;
export type ForumReply = typeof forumReplies.$inferSelect;
export type InsertForumReply = z.infer<typeof insertForumReplySchema>;
export type StudyGroup = typeof studyGroups.$inferSelect;
export type InsertStudyGroup = z.infer<typeof insertStudyGroupSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

export const insertStudyGroupSessionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  location: z.string().optional()
});
export type InsertStudyGroupSession = z.infer<typeof insertStudyGroupSessionSchema>;
