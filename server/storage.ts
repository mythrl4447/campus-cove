// db stuff

import { 
  users, courses, courseMembers, resources, forumCategories, forumPosts, forumReplies,
  studyGroups, studyGroupMembers, conversations, conversationParticipants, messages,
  postVotes, replyVotes, calendarEvents,
  type User, type InsertUser, type Course, type InsertCourse, type Resource, type InsertResource,
  type ForumPost, type InsertForumPost, type ForumReply, type InsertForumReply,
  type StudyGroup, type InsertStudyGroup, type Message, type InsertMessage, type Conversation,
  type CalendarEvent, type InsertCalendarEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, like, count, ilike } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  authenticateUser(email: string, password: string): Promise<User | null>;
  searchUsers(query: string, currentUserId: number): Promise<User[]>;

  // Course operations
  getCourses(): Promise<Course[]>;
  getCourse(id: number): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  joinCourse(userId: number, courseId: number): Promise<void>;
  getUserCourses(userId: number): Promise<Course[]>;
  getCourseMembers(courseId: number): Promise<User[]>;

  // Resource operations
  getResources(courseId?: number, type?: string): Promise<(Resource & { uploader: User; course: Course })[]>;
  getResource(id: number): Promise<Resource | undefined>;
  createResource(resource: InsertResource): Promise<Resource>;
  downloadResource(id: number): Promise<void>;

  // Forum operations
  getForumCategories(): Promise<typeof forumCategories.$inferSelect[]>;
  getForumPosts(categoryId?: number, limit?: number): Promise<(ForumPost & { author: User; category?: typeof forumCategories.$inferSelect; replyCount: number })[]>;
  getForumPost(id: number): Promise<(ForumPost & { author: User; replies: (ForumReply & { author: User })[] }) | undefined>;
  createForumPost(post: InsertForumPost): Promise<ForumPost>;
  createForumReply(reply: InsertForumReply): Promise<ForumReply>;
  voteOnPost(userId: number, postId: number, voteType: 'up' | 'down'): Promise<void>;

  // Study group operations
  getStudyGroups(userId?: number): Promise<(StudyGroup & { creator: User; course?: Course; memberCount: number })[]>;
  getStudyGroup(id: number): Promise<(StudyGroup & { creator: User; course?: Course; members: User[] }) | undefined>;
  createStudyGroup(group: InsertStudyGroup): Promise<StudyGroup>;
  joinStudyGroup(userId: number, groupId: number): Promise<void>;
  getUserStudyGroups(userId: number): Promise<(StudyGroup & { course?: Course; memberCount: number })[]>;
  updateStudyGroup(id: number, data: Partial<StudyGroup>): Promise<StudyGroup>;
  leaveStudyGroup(userId: number, groupId: number): Promise<void>;
  createStudyGroupSession(groupId: number, sessionData: any): Promise<void>;

  // Message operations
  getUserConversations(userId: number): Promise<(Conversation & { participants: User[]; lastMessage?: Message & { sender: User } })[]>;
  getConversationMessages(conversationId: number): Promise<(Message & { sender: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  createConversation(participantIds: number[]): Promise<Conversation>;
  updateConversation(id: number, data: Partial<Conversation>): Promise<Conversation>;

  // Calendar operations
  getCalendarEvents(userId: number, startDate?: Date, endDate?: Date): Promise<(CalendarEvent & { course?: Course; studyGroup?: StudyGroup })[]>;
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<CalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: number): Promise<void>;
  markEventCompleted(id: number, completed: boolean): Promise<void>;

  // Dashboard operations
  getUserDashboardData(userId: number): Promise<{
    courseCount: number;
    groupCount: number;
    resourceCount: number;
    upcomingEvents: (CalendarEvent & { course?: Course; studyGroup?: StudyGroup })[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // get user by id
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    const user = result[0];
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [usr] = await db.select().from(users).where(eq(users.email, email));
    return usr || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // hash pw
    const pwHash = await bcrypt.hash(insertUser.password, 10);
    
    const userWithHash = { ...insertUser, password: pwHash };
    const [user] = await db
      .insert(users)
      .values(userWithHash)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async searchUsers(query: string, currentUserId: number): Promise<User[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    return await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        major: users.major,
        year: users.year,
        bio: users.bio,
        graduationYear: users.graduationYear,
        location: users.location,
        profilePicture: users.profilePicture,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(
        and(
          or(
            ilike(users.firstName, searchTerm),
            ilike(users.lastName, searchTerm),
            ilike(users.email, searchTerm)
          ),
          sql`${users.id} != ${currentUserId}`
        )
      )
      .limit(20);
  }

  async getCourses(): Promise<Course[]> {
    return await db.select().from(courses).orderBy(desc(courses.createdAt));
  }

  async getCourse(id: number): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course || undefined;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db.insert(courses).values(course).returning();
    return newCourse;
  }

  async joinCourse(userId: number, courseId: number): Promise<void> {
    await db.insert(courseMembers).values({ userId, courseId });
  }

  async getUserCourses(userId: number): Promise<Course[]> {
    return await db
      .select({
        id: courses.id,
        code: courses.code,
        name: courses.name,
        description: courses.description,
        instructor: courses.instructor,
        department: courses.department,
        level: courses.level,
        semester: courses.semester,
        createdAt: courses.createdAt
      })
      .from(courses)
      .innerJoin(courseMembers, eq(courses.id, courseMembers.courseId))
      .where(eq(courseMembers.userId, userId));
  }

  async getCourseMembers(courseId: number): Promise<User[]> {
    return await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        major: users.major,
        year: users.year,
        bio: users.bio,
        graduationYear: users.graduationYear,
        location: users.location,
        profilePicture: users.profilePicture,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .innerJoin(courseMembers, eq(users.id, courseMembers.userId))
      .where(eq(courseMembers.courseId, courseId));
  }

  async getResources(courseId?: number, type?: string): Promise<(Resource & { uploader: User; course: Course })[]> {
    const baseQuery = db
      .select({
        id: resources.id,
        title: resources.title,
        description: resources.description,
        type: resources.type,
        filename: resources.filename,
        fileSize: resources.fileSize,
        mimeType: resources.mimeType,
        courseId: resources.courseId,
        uploaderId: resources.uploaderId,
        downloads: resources.downloads,
        rating: resources.rating,
        createdAt: resources.createdAt,
        uploader: {
          id: users.id,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          major: users.major,
          year: users.year,
          bio: users.bio,
          graduationYear: users.graduationYear,
          location: users.location,
          profilePicture: users.profilePicture,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        },
        course: {
          id: courses.id,
          code: courses.code,
          name: courses.name,
          description: courses.description,
          instructor: courses.instructor,
          department: courses.department,
          level: courses.level,
          semester: courses.semester,
          createdAt: courses.createdAt
        }
      })
      .from(resources)
      .innerJoin(users, eq(resources.uploaderId, users.id))
      .innerJoin(courses, eq(resources.courseId, courses.id));

    let whereConditions = [];
    if (courseId) {
      whereConditions.push(eq(resources.courseId, courseId));
    }
    if (type) {
      whereConditions.push(eq(resources.type, type));
    }

    const query = whereConditions.length > 0 
      ? baseQuery.where(and(...whereConditions))
      : baseQuery;

    return await query.orderBy(desc(resources.createdAt));
  }

  async getResource(id: number): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id));
    return resource || undefined;
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const [newResource] = await db.insert(resources).values(resource).returning();
    return newResource;
  }

  async downloadResource(id: number): Promise<void> {
    await db
      .update(resources)
      .set({ downloads: sql`${resources.downloads} + 1` })
      .where(eq(resources.id, id));
  }

  async getForumCategories(): Promise<typeof forumCategories.$inferSelect[]> {
    return await db.select().from(forumCategories).orderBy(forumCategories.name);
  }

  async getForumPosts(categoryId?: number, limit = 50): Promise<(ForumPost & { author: User; category?: typeof forumCategories.$inferSelect; replyCount: number })[]> {
    const baseQuery = db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
        authorId: forumPosts.authorId,
        categoryId: forumPosts.categoryId,
        upvotes: forumPosts.upvotes,
        downvotes: forumPosts.downvotes,
        views: forumPosts.views,
        isPinned: forumPosts.isPinned,
        tags: forumPosts.tags,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
        author: {
          id: users.id,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          major: users.major,
          year: users.year,
          bio: users.bio,
          graduationYear: users.graduationYear,
          location: users.location,
          profilePicture: users.profilePicture,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        },
        category: {
          id: forumCategories.id,
          name: forumCategories.name,
          description: forumCategories.description,
          createdAt: forumCategories.createdAt
        },
        replyCount: count(forumReplies.id)
      })
      .from(forumPosts)
      .innerJoin(users, eq(forumPosts.authorId, users.id))
      .leftJoin(forumCategories, eq(forumPosts.categoryId, forumCategories.id))
      .leftJoin(forumReplies, eq(forumPosts.id, forumReplies.postId))
      .groupBy(forumPosts.id, users.id, forumCategories.id);

    const query = categoryId 
      ? baseQuery.where(eq(forumPosts.categoryId, categoryId))
      : baseQuery;

    const results = await query.orderBy(desc(forumPosts.isPinned), desc(forumPosts.createdAt)).limit(limit);
    
    return results.map((row: any) => ({
      ...row,
      category: row.category.id ? row.category : undefined
    }));
  }

  async getForumPost(id: number): Promise<(ForumPost & { author: User; category?: any; replies: (ForumReply & { author: User })[] }) | undefined> {
    const [post] = await db
      .select({
        id: forumPosts.id,
        title: forumPosts.title,
        content: forumPosts.content,
        authorId: forumPosts.authorId,
        categoryId: forumPosts.categoryId,
        upvotes: forumPosts.upvotes,
        downvotes: forumPosts.downvotes,
        views: forumPosts.views,
        isPinned: forumPosts.isPinned,
        tags: forumPosts.tags,
        createdAt: forumPosts.createdAt,
        updatedAt: forumPosts.updatedAt,
        author: {
          id: users.id,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          major: users.major,
          year: users.year,
          bio: users.bio,
          graduationYear: users.graduationYear,
          location: users.location,
          profilePicture: users.profilePicture,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        },
        category: {
          id: forumCategories.id,
          name: forumCategories.name,
          description: forumCategories.description,
          createdAt: forumCategories.createdAt
        }
      })
      .from(forumPosts)
      .innerJoin(users, eq(forumPosts.authorId, users.id))
      .leftJoin(forumCategories, eq(forumPosts.categoryId, forumCategories.id))
      .where(eq(forumPosts.id, id));

    if (!post) return undefined;

    const replies = await db
      .select({
        id: forumReplies.id,
        content: forumReplies.content,
        authorId: forumReplies.authorId,
        postId: forumReplies.postId,
        upvotes: forumReplies.upvotes,
        downvotes: forumReplies.downvotes,
        createdAt: forumReplies.createdAt,
        updatedAt: forumReplies.updatedAt,
        author: {
          id: users.id,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          major: users.major,
          year: users.year,
          bio: users.bio,
          graduationYear: users.graduationYear,
          location: users.location,
          profilePicture: users.profilePicture,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        }
      })
      .from(forumReplies)
      .innerJoin(users, eq(forumReplies.authorId, users.id))
      .where(eq(forumReplies.postId, id))
      .orderBy(forumReplies.createdAt);

    return { 
      ...post, 
      category: post.category?.id ? post.category : undefined,
      replies 
    };
  }

  async createForumPost(post: InsertForumPost): Promise<ForumPost> {
    const [newPost] = await db.insert(forumPosts).values([post]).returning();
    return newPost;
  }

  async createForumReply(reply: InsertForumReply): Promise<ForumReply> {
    const [newReply] = await db.insert(forumReplies).values(reply).returning();
    return newReply;
  }

  async voteOnPost(userId: number, postId: number, voteType: 'up' | 'down'): Promise<void> {
    // Check if user already voted
    const [existingVote] = await db
      .select()
      .from(postVotes)
      .where(and(eq(postVotes.userId, userId), eq(postVotes.postId, postId)));
    
    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Same vote type - remove the vote (toggle off)
        await db.delete(postVotes).where(and(eq(postVotes.userId, userId), eq(postVotes.postId, postId)));
      } else {
        // Different vote type - update the vote
        await db
          .update(postVotes)
          .set({ voteType })
          .where(and(eq(postVotes.userId, userId), eq(postVotes.postId, postId)));
      }
    } else {
      // No existing vote - create new vote
      await db.insert(postVotes).values({ userId, postId, voteType });
    }
    
    // Update post vote counts
    const upvoteCount = await db
      .select({ count: count() })
      .from(postVotes)
      .where(and(eq(postVotes.postId, postId), eq(postVotes.voteType, 'up')));
    
    const downvoteCount = await db
      .select({ count: count() })
      .from(postVotes)
      .where(and(eq(postVotes.postId, postId), eq(postVotes.voteType, 'down')));
    
    await db
      .update(forumPosts)
      .set({
        upvotes: upvoteCount[0].count,
        downvotes: downvoteCount[0].count
      })
      .where(eq(forumPosts.id, postId));
  }

  async getStudyGroups(userId?: number): Promise<(StudyGroup & { creator: User; course?: Course; memberCount: number })[]> {
    let query = db
      .select({
        id: studyGroups.id,
        name: studyGroups.name,
        description: studyGroups.description,
        courseId: studyGroups.courseId,
        creatorId: studyGroups.creatorId,
        maxMembers: studyGroups.maxMembers,
        schedule: studyGroups.schedule,
        location: studyGroups.location,
        meetingDate: studyGroups.meetingDate,
        endDate: studyGroups.endDate,
        isRecurring: studyGroups.isRecurring,
        recurringPattern: studyGroups.recurringPattern,
        isActive: studyGroups.isActive,
        createdAt: studyGroups.createdAt,
        creator: {
          id: users.id,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          major: users.major,
          year: users.year,
          bio: users.bio,
          graduationYear: users.graduationYear,
          location: users.location,
          profilePicture: users.profilePicture,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        },
        course: {
          id: courses.id,
          code: courses.code,
          name: courses.name,
          description: courses.description,
          instructor: courses.instructor,
          department: courses.department,
          level: courses.level,
          semester: courses.semester,
          createdAt: courses.createdAt
        },
        memberCount: count(studyGroupMembers.id)
      })
      .from(studyGroups)
      .innerJoin(users, eq(studyGroups.creatorId, users.id))
      .leftJoin(courses, eq(studyGroups.courseId, courses.id))
      .leftJoin(studyGroupMembers, eq(studyGroups.id, studyGroupMembers.groupId))
      .where(eq(studyGroups.isActive, true))
      .groupBy(studyGroups.id, users.id, courses.id);

    const results = await query.orderBy(desc(studyGroups.createdAt));
    return results.map(r => ({
      ...r,
      course: r.course && r.course.id ? r.course : undefined
    }));
  }

  async getStudyGroup(id: number): Promise<(StudyGroup & { creator: User; course?: Course; members: User[] }) | undefined> {
    const [group] = await db
      .select({
        id: studyGroups.id,
        name: studyGroups.name,
        description: studyGroups.description,
        courseId: studyGroups.courseId,
        creatorId: studyGroups.creatorId,
        maxMembers: studyGroups.maxMembers,
        schedule: studyGroups.schedule,
        location: studyGroups.location,
        meetingDate: studyGroups.meetingDate,
        endDate: studyGroups.endDate,
        isRecurring: studyGroups.isRecurring,
        recurringPattern: studyGroups.recurringPattern,
        isActive: studyGroups.isActive,
        createdAt: studyGroups.createdAt,
        creator: {
          id: users.id,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          major: users.major,
          year: users.year,
          bio: users.bio,
          graduationYear: users.graduationYear,
          location: users.location,
          profilePicture: users.profilePicture,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        },
        course: {
          id: courses.id,
          code: courses.code,
          name: courses.name,
          description: courses.description,
          instructor: courses.instructor,
          department: courses.department,
          level: courses.level,
          semester: courses.semester,
          createdAt: courses.createdAt
        }
      })
      .from(studyGroups)
      .innerJoin(users, eq(studyGroups.creatorId, users.id))
      .leftJoin(courses, eq(studyGroups.courseId, courses.id))
      .where(eq(studyGroups.id, id));

    if (!group) return undefined;

    const members = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        major: users.major,
        year: users.year,
        bio: users.bio,
        graduationYear: users.graduationYear,
        location: users.location,
        profilePicture: users.profilePicture,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .innerJoin(studyGroupMembers, eq(users.id, studyGroupMembers.userId))
      .where(eq(studyGroupMembers.groupId, id));

    return { 
      ...group, 
      course: group.course && group.course.id ? group.course : undefined,
      members 
    };
  }

  async createStudyGroup(group: InsertStudyGroup): Promise<StudyGroup> {
    const [newGroup] = await db.insert(studyGroups).values(group).returning();
    // Auto-add creator as member
    await db.insert(studyGroupMembers).values({ groupId: newGroup.id, userId: group.creatorId });

    // Create calendar events for the study group based on date settings
    try {
      if (group.meetingDate) {
        // Create initial calendar event
        await db.insert(calendarEvents).values({
          title: `${newGroup.name} - Study Session`,
          description: newGroup.description || `Study group session for ${newGroup.name}`,
          type: 'study_group',
          startDate: group.meetingDate,
          endDate: group.endDate,
          allDay: false,
          location: group.location || undefined,
          userId: group.creatorId,
          courseId: group.courseId || undefined,
          studyGroupId: newGroup.id,
          priority: 'medium',
          isCompleted: false,
          reminderMinutes: 30
        });

        // Create recurring events if specified
        if (group.isRecurring && group.recurringPattern && group.meetingDate) {
          const startDate = new Date(group.meetingDate);
          let interval = 7; // weekly by default
          
          if (group.recurringPattern === 'biweekly') interval = 14;
          if (group.recurringPattern === 'monthly') interval = 30;
          
          // Create next 8 recurring events
          for (let i = 1; i <= 8; i++) {
            const nextDate = new Date(startDate);
            nextDate.setDate(startDate.getDate() + (interval * i));
            
            const nextEndDate = group.endDate ? new Date(group.endDate) : undefined;
            if (nextEndDate && group.endDate) {
              nextEndDate.setDate(new Date(group.endDate).getDate() + (interval * i));
            }
            
            await db.insert(calendarEvents).values({
              title: `${newGroup.name} - Study Session`,
              description: newGroup.description || `Study group session for ${newGroup.name}`,
              type: 'study_group',
              startDate: nextDate,
              endDate: nextEndDate,
              allDay: false,
              location: group.location || undefined,
              userId: group.creatorId,
              courseId: group.courseId || undefined,
              studyGroupId: newGroup.id,
              priority: 'medium',
              isCompleted: false,
              reminderMinutes: 30
            });
          }
        }
      } else if (group.schedule) {
        // Fallback to schedule-based event (next week)
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + 7);
        
        await db.insert(calendarEvents).values({
          title: `${newGroup.name} - Study Session`,
          description: newGroup.description || `Study group session for ${newGroup.name}`,
          type: 'study_group',
          startDate: eventDate,
          allDay: false,
          location: group.location || undefined,
          userId: group.creatorId,
          courseId: group.courseId || undefined,
          studyGroupId: newGroup.id,
          priority: 'medium',
          isCompleted: false,
          reminderMinutes: 30
        });
      }
    } catch (error) {
      console.log('Failed to create calendar event for study group:', error);
      // Don't fail the group creation if calendar event creation fails
    }
    
    return newGroup;
  }

  async joinStudyGroup(userId: number, groupId: number): Promise<void> {
    await db.insert(studyGroupMembers).values({ userId, groupId });
    
    // Create calendar events for the new member for this study group
    const existingEvents = await db
      .select()
      .from(calendarEvents)
      .where(and(
        eq(calendarEvents.studyGroupId, groupId),
        eq(calendarEvents.type, 'study_group'),
        // Only copy future events
        sql`${calendarEvents.startDate} >= NOW()`
      ));

    for (const event of existingEvents) {
      // Create a copy of the event for the new member
      try {
        await db.insert(calendarEvents).values({
          title: event.title,
          description: event.description,
          type: event.type,
          startDate: event.startDate,
          endDate: event.endDate,
          allDay: event.allDay,
          location: event.location,
          userId: userId,
          courseId: event.courseId,
          studyGroupId: event.studyGroupId,
          priority: event.priority,
          isCompleted: false,
          reminderMinutes: event.reminderMinutes
        });
      } catch (error) {
        console.log('Failed to create calendar event for new member:', error);
      }
    }
  }

  async getUserStudyGroups(userId: number): Promise<(StudyGroup & { course?: Course; memberCount: number })[]> {
    const results = await db
      .select({
        id: studyGroups.id,
        name: studyGroups.name,
        description: studyGroups.description,
        courseId: studyGroups.courseId,
        creatorId: studyGroups.creatorId,
        maxMembers: studyGroups.maxMembers,
        schedule: studyGroups.schedule,
        location: studyGroups.location,
        meetingDate: studyGroups.meetingDate,
        endDate: studyGroups.endDate,
        isRecurring: studyGroups.isRecurring,
        recurringPattern: studyGroups.recurringPattern,
        isActive: studyGroups.isActive,
        createdAt: studyGroups.createdAt,
        course: {
          id: courses.id,
          code: courses.code,
          name: courses.name,
          description: courses.description,
          instructor: courses.instructor,
          department: courses.department,
          level: courses.level,
          semester: courses.semester,
          createdAt: courses.createdAt
        },
        memberCount: count(studyGroupMembers.id)
      })
      .from(studyGroups)
      .innerJoin(studyGroupMembers, eq(studyGroups.id, studyGroupMembers.groupId))
      .leftJoin(courses, eq(studyGroups.courseId, courses.id))
      .where(eq(studyGroupMembers.userId, userId))
      .groupBy(studyGroups.id, courses.id);

    return results.map(r => ({
      ...r,
      course: r.course && r.course.id ? r.course : undefined
    }));
  }

  async updateStudyGroup(id: number, data: Partial<StudyGroup>): Promise<StudyGroup> {
    const [updatedGroup] = await db
      .update(studyGroups)
      .set(data)
      .where(eq(studyGroups.id, id))
      .returning();
    
    if (!updatedGroup) {
      throw new Error('Study group not found');
    }
    
    return updatedGroup;
  }

  async leaveStudyGroup(userId: number, groupId: number): Promise<void> {
    await db
      .delete(studyGroupMembers)
      .where(
        and(
          eq(studyGroupMembers.userId, userId),
          eq(studyGroupMembers.groupId, groupId)
        )
      );
    
    // Also delete calendar events for this user and study group
    await db
      .delete(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, userId),
          eq(calendarEvents.studyGroupId, groupId)
        )
      );
  }



  async getUserConversations(userId: number): Promise<(Conversation & { participants: User[]; lastMessage?: Message & { sender: User } })[]> {
    // This is a complex query, simplified for now
    const userConversations = await db
      .select({
        id: conversations.id,
        type: conversations.type,
        name: conversations.name,
        createdAt: conversations.createdAt
      })
      .from(conversations)
      .innerJoin(conversationParticipants, eq(conversations.id, conversationParticipants.conversationId))
      .where(eq(conversationParticipants.userId, userId))
      .orderBy(desc(conversations.createdAt));

    // Get participants and last message for each conversation
    const result = [];
    for (const conv of userConversations) {
      const participants = await db
        .select({
          id: users.id,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          major: users.major,
          year: users.year,
          bio: users.bio,
          graduationYear: users.graduationYear,
          location: users.location,
          profilePicture: users.profilePicture,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .innerJoin(conversationParticipants, eq(users.id, conversationParticipants.userId))
        .where(eq(conversationParticipants.conversationId, conv.id));

      const [lastMessage] = await db
        .select({
          id: messages.id,
          content: messages.content,
          senderId: messages.senderId,
          conversationId: messages.conversationId,
          createdAt: messages.createdAt,
          sender: {
            id: users.id,
            email: users.email,
            password: users.password,
            firstName: users.firstName,
            lastName: users.lastName,
            major: users.major,
            year: users.year,
            bio: users.bio,
            graduationYear: users.graduationYear,
            location: users.location,
            profilePicture: users.profilePicture,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt
          }
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      result.push({ ...conv, participants, lastMessage });
    }

    return result;
  }

  async getConversationMessages(conversationId: number): Promise<(Message & { sender: User })[]> {
    return await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        conversationId: messages.conversationId,
        fileUrl: messages.fileUrl,
        fileName: messages.fileName,
        fileType: messages.fileType,
        fileSize: messages.fileSize,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          major: users.major,
          year: users.year,
          bio: users.bio,
          graduationYear: users.graduationYear,
          location: users.location,
          profilePicture: users.profilePicture,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        }
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async createConversation(participantIds: number[]): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({ type: participantIds.length > 2 ? 'group' : 'direct' })
      .returning();

    for (const userId of participantIds) {
      await db.insert(conversationParticipants).values({
        conversationId: conversation.id,
        userId
      });
    }

    return conversation;
  }

  async updateConversation(id: number, data: Partial<Conversation>): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set(data)
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async getCalendarEvents(userId: number, startDate?: Date, endDate?: Date): Promise<(CalendarEvent & { course?: Course; studyGroup?: StudyGroup })[]> {
    let query = db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        description: calendarEvents.description,
        type: calendarEvents.type,
        startDate: calendarEvents.startDate,
        endDate: calendarEvents.endDate,
        allDay: calendarEvents.allDay,
        location: calendarEvents.location,
        userId: calendarEvents.userId,
        courseId: calendarEvents.courseId,
        studyGroupId: calendarEvents.studyGroupId,
        priority: calendarEvents.priority,
        isCompleted: calendarEvents.isCompleted,
        reminderMinutes: calendarEvents.reminderMinutes,
        createdAt: calendarEvents.createdAt,
        updatedAt: calendarEvents.updatedAt,
        course: {
          id: courses.id,
          code: courses.code,
          name: courses.name,
          description: courses.description,
          instructor: courses.instructor,
          department: courses.department,
          level: courses.level,
          semester: courses.semester,
          createdAt: courses.createdAt
        },
        studyGroup: {
          id: studyGroups.id,
          name: studyGroups.name,
          description: studyGroups.description,
          courseId: studyGroups.courseId,
          creatorId: studyGroups.creatorId,
          maxMembers: studyGroups.maxMembers,
          schedule: studyGroups.schedule,
          location: studyGroups.location,
          meetingDate: studyGroups.meetingDate,
          endDate: studyGroups.endDate,
          isRecurring: studyGroups.isRecurring,
          recurringPattern: studyGroups.recurringPattern,
          isActive: studyGroups.isActive,
          createdAt: studyGroups.createdAt
        }
      })
      .from(calendarEvents)
      .leftJoin(courses, eq(calendarEvents.courseId, courses.id))
      .leftJoin(studyGroups, eq(calendarEvents.studyGroupId, studyGroups.id))
      .where(eq(calendarEvents.userId, userId));

    let finalQuery = query;
    if (startDate) {
      finalQuery = finalQuery.where(sql`${calendarEvents.startDate} >= ${startDate}`);
    }
    if (endDate) {
      finalQuery = finalQuery.where(sql`${calendarEvents.startDate} <= ${endDate}`);
    }

    const results = await finalQuery.orderBy(calendarEvents.startDate);
    return results.map(r => ({
      ...r,
      course: r.course && r.course.id ? r.course : undefined,
      studyGroup: r.studyGroup && r.studyGroup.id ? r.studyGroup : undefined
    }));
  }

  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return event || undefined;
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [newEvent] = await db.insert(calendarEvents).values(event).returning();
    return newEvent;
  }

  async updateCalendarEvent(id: number, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const [updatedEvent] = await db
      .update(calendarEvents)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(calendarEvents.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  async markEventCompleted(id: number, completed: boolean): Promise<void> {
    await db
      .update(calendarEvents)
      .set({ isCompleted: completed, updatedAt: new Date() })
      .where(eq(calendarEvents.id, id));
  }

  async createStudyGroupSession(groupId: number, sessionData: { 
    title: string, 
    description?: string, 
    startDate: Date, 
    endDate?: Date,
    location?: string 
  }): Promise<void> {
    // Get all members of the study group
    const members = await db
      .select({ userId: studyGroupMembers.userId })
      .from(studyGroupMembers)
      .where(eq(studyGroupMembers.groupId, groupId));

    const [group] = await db
      .select()
      .from(studyGroups)
      .where(eq(studyGroups.id, groupId));

    if (!group) throw new Error('Study group not found');

    // Create calendar events for all members
    for (const member of members) {
      await db.insert(calendarEvents).values({
        title: sessionData.title,
        description: sessionData.description || `Study session for ${group.name}`,
        type: 'study_group',
        startDate: sessionData.startDate,
        endDate: sessionData.endDate,
        allDay: false,
        location: sessionData.location || group.location,
        userId: member.userId,
        courseId: group.courseId,
        studyGroupId: groupId,
        priority: 'medium',
        isCompleted: false,
        reminderMinutes: 30
      });
    }
  }

  async getConversationMembers(conversationId: number) {
    const members = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        major: users.major,
        year: users.year,
        bio: users.bio,
        graduationYear: users.graduationYear,
        location: users.location,
        profilePicture: users.profilePicture,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .innerJoin(conversationParticipants, eq(users.id, conversationParticipants.userId))
      .where(eq(conversationParticipants.conversationId, conversationId));

    return members;
  }

  async addConversationMember(conversationId: number, userId: number): Promise<void> {
    // Check if the conversation exists
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );

    if (existingMember) {
      throw new Error('User is already a member of this conversation');
    }

    // Add the user to the conversation
    await db.insert(conversationParticipants).values({
      conversationId,
      userId,
      joinedAt: new Date()
    });
  }

  async removeConversationMember(conversationId: number, userId: number): Promise<void> {
    const result = await db
      .delete(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );

    if (!result) {
      throw new Error('Member not found in conversation');
    }
  }

  async getUserDashboardData(userId: number): Promise<{
    courseCount: number;
    groupCount: number;
    resourceCount: number;
    upcomingEvents: (CalendarEvent & { course?: Course; studyGroup?: StudyGroup })[];
  }> {
    const [courseCountResult] = await db
      .select({ count: count() })
      .from(courseMembers)
      .where(eq(courseMembers.userId, userId));

    const [groupCountResult] = await db
      .select({ count: count() })
      .from(studyGroupMembers)
      .where(eq(studyGroupMembers.userId, userId));

    const [resourceCountResult] = await db
      .select({ count: count() })
      .from(resources)
      .where(eq(resources.uploaderId, userId));

    // Get upcoming events (next 7 days)
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcomingEvents = await this.getCalendarEvents(userId, now, nextWeek);

    return {
      courseCount: courseCountResult.count,
      groupCount: groupCountResult.count,
      resourceCount: resourceCountResult.count,
      upcomingEvents: upcomingEvents.filter(event => !event.isCompleted)
    };
  }
}

export const storage = new DatabaseStorage();
