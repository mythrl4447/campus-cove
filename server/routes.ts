// all the api routes

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, loginSchema, insertCourseSchema, insertResourceSchema,
  insertForumPostSchema, insertForumReplySchema, insertStudyGroupSchema, insertMessageSchema,
  insertCalendarEventSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Extend Express Request interface to include session
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

interface AuthenticatedRequest extends Request {
  userId: number; // Required after auth middleware
}

// file upload setup
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 10mb max
const tenMegabytes = 10 * 1024 * 1024;
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: tenMegabytes }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // signup endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // check if email taken
      const alreadyExists = await storage.getUserByEmail(userData.email);
      
      if (alreadyExists) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      const newUser = await storage.createUser(userData);
      
      // dont send password back
      const { password, ...safeUser } = newUser;
      
      req.session.userId = newUser.id;
      
      res.json({ user: safeUser });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.authenticateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      
      // Set session
      req.session.userId = user.id;
      
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });

  // auth check
  const requireAuth = async (req: any, res: Response, next: any) => {
    const uid = req.session?.userId;
    if (!uid) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    req.userId = uid;
    next();
  };

  app.put("/api/users/profile", requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;
      const updateData = req.body;
      
      // Remove any fields that shouldn't be updated
      const allowedFields = ['firstName', 'lastName', 'major', 'year', 'bio', 'graduationYear'];
      const filteredData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {});

      const updatedUser = await storage.updateUser(userId, filteredData);
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/users/profile-picture", requireAuth, upload.single('profilePicture'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.userId;
      const profilePicturePath = `/uploads/${req.file.filename}`;
      
      const updatedUser = await storage.updateUser(userId, { profilePicture: profilePicturePath });
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Course routes
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/courses/my", requireAuth, async (req: any, res) => {
    try {
      const courses = await storage.getUserCourses(req.userId);
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/courses", requireAuth, async (req: any, res) => {
    try {
      const courseData = insertCourseSchema.parse(req.body);
      const course = await storage.createCourse(courseData);
      res.json(course);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/courses/:id/join", requireAuth, async (req: any, res) => {
    try {
      const courseId = parseInt(req.params.id);
      await storage.joinCourse(req.userId, courseId);
      res.json({ message: "Joined course successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/courses/:id/members", async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const members = await storage.getCourseMembers(courseId);
      
      // Remove password from response
      const membersWithoutPassword = members.map(member => {
        const { password, ...memberWithoutPassword } = member;
        return memberWithoutPassword;
      });
      
      res.json(membersWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Resource routes
  app.get("/api/resources", async (req, res) => {
    try {
      const courseId = req.query.courseId ? parseInt(req.query.courseId as string) : undefined;
      const type = req.query.type as string;
      const resources = await storage.getResources(courseId, type);
      res.json(resources);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/resources", requireAuth, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const resourceData = {
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        filename: req.file.filename,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        courseId: parseInt(req.body.courseId),
        uploaderId: req.userId
      };

      const validatedData = insertResourceSchema.parse(resourceData);
      const resource = await storage.createResource(validatedData);
      res.json(resource);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/resources/:id/download", async (req, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const resource = await storage.getResource(resourceId);
      
      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }

      const filePath = path.join(uploadDir, resource.filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      await storage.downloadResource(resourceId);
      
      res.download(filePath, resource.title);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Forum routes
  app.get("/api/forum/categories", async (req, res) => {
    try {
      const categories = await storage.getForumCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/forum/posts", async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const posts = await storage.getForumPosts(categoryId, limit);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/forum/posts/:id", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getForumPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/forum/posts", requireAuth, async (req: any, res) => {
    try {
      const postData = { ...req.body, authorId: req.userId };
      const validatedData = insertForumPostSchema.parse(postData);
      const post = await storage.createForumPost(validatedData);
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/forum/posts/:id/replies", requireAuth, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const replyData = { ...req.body, authorId: req.userId, postId };
      const validatedData = insertForumReplySchema.parse(replyData);
      const reply = await storage.createForumReply(validatedData);
      res.json(reply);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/forum/posts/:id/vote", requireAuth, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { voteType } = req.body;
      
      if (!['up', 'down'].includes(voteType)) {
        return res.status(400).json({ message: "Invalid vote type" });
      }

      await storage.voteOnPost(req.userId, postId, voteType);
      res.json({ message: "Vote recorded" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Study group routes
  app.get("/api/study-groups", async (req, res) => {
    try {
      const groups = await storage.getStudyGroups();
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/study-groups/my", requireAuth, async (req: any, res) => {
    try {
      const groups = await storage.getUserStudyGroups(req.userId);
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/study-groups", requireAuth, async (req: any, res) => {
    try {
      const groupData = { ...req.body, creatorId: req.userId };
      
      // Convert date strings to Date objects if they exist
      if (groupData.meetingDate && typeof groupData.meetingDate === 'string') {
        groupData.meetingDate = new Date(groupData.meetingDate);
      }
      if (groupData.endDate && typeof groupData.endDate === 'string') {
        groupData.endDate = new Date(groupData.endDate);
      }
      
      const validatedData = insertStudyGroupSchema.parse(groupData);
      const group = await storage.createStudyGroup(validatedData);
      
      // Auto-create calendar event for study group
      if (group.schedule) {
        try {
          const eventData = {
            title: `Study Group: ${group.name}`,
            description: group.description || `Study group meeting for ${group.name}`,
            type: 'study_group',
            startDate: new Date(), // This should be parsed from schedule
            allDay: false,
            location: group.location || undefined,
            userId: req.userId,
            studyGroupId: group.id,
            priority: 'medium',
            isCompleted: false
          };
          await storage.createCalendarEvent(eventData);
        } catch (calendarError) {
          console.log('Failed to create calendar event:', calendarError);
          // Don't fail the study group creation if calendar event fails
        }
      }
      
      res.json(group);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/study-groups/:id/members", requireAuth, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getStudyGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ message: "Study group not found" });
      }
      
      res.json(group.members);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/study-groups/:id/join", requireAuth, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.id);
      await storage.joinStudyGroup(req.userId, groupId);
      res.json({ message: "Joined study group successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/study-groups/:id/sessions", requireAuth, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { title, description, startDate, endDate, location } = req.body;
      
      await storage.createStudyGroupSession(groupId, {
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        location
      });
      
      res.json({ message: "Study session scheduled successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/study-groups/:id", requireAuth, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { name, description, courseId } = req.body;
      
      // Check if user is the creator of the group
      const group = await storage.getStudyGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Study group not found" });
      }
      
      if (group.creatorId !== req.userId) {
        return res.status(403).json({ message: "Only the group creator can update the group" });
      }
      
      const updatedGroup = await storage.updateStudyGroup(groupId, {
        name,
        description,
        courseId
      });
      
      res.json(updatedGroup);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/study-groups/:id/leave", requireAuth, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.id);
      await storage.leaveStudyGroup(req.userId, groupId);
      res.json({ message: "Left study group successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // User search route
  app.get("/api/users/search", requireAuth, async (req: any, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.json([]);
      }
      
      const users = await storage.searchUsers(q, req.userId);
      const usersWithoutPassword = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Message routes
  app.get("/api/conversations", requireAuth, async (req: any, res) => {
    try {
      const conversations = await storage.getUserConversations(req.userId);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/conversations/:id/messages", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getConversationMessages(conversationId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/conversations", requireAuth, async (req: any, res) => {
    try {
      const { participantIds } = req.body;
      const allParticipants = [...participantIds, req.userId];
      const conversation = await storage.createConversation(allParticipants);
      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/messages", requireAuth, async (req: any, res) => {
    try {
      const messageData = { 
        ...req.body,
        senderId: req.userId 
      };
      
      const validatedData = insertMessageSchema.parse(messageData);
      const message = await storage.createMessage(validatedData);
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // File upload message route
  app.post("/api/messages/file", requireAuth, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { conversationId } = req.body;
      if (!conversationId) {
        return res.status(400).json({ message: "Conversation ID is required" });
      }

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExt = path.extname(req.file.originalname);
      const fileName = `${path.basename(req.file.originalname, fileExt)}-${uniqueSuffix}${fileExt}`;
      const newPath = path.join(uploadDir, fileName);

      // Move file to final location
      fs.renameSync(req.file.path, newPath);

      // Create message with file information
      const messageData = {
        content: `Sent a file: ${req.file.originalname}`,
        senderId: req.userId,
        conversationId: parseInt(conversationId),
        fileUrl: `/uploads/${fileName}`,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size
      };

      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error: any) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/conversations/:id", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { name, description } = req.body;
      
      const conversation = await storage.updateConversation(conversationId, {
        name,
        description,
        updatedAt: new Date()
      });
      
      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/conversations/:id/members", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const members = await storage.getConversationMembers(conversationId);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/conversations/:id/members", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { userId } = req.body;
      await storage.addConversationMember(conversationId, userId);
      res.json({ message: "Member added successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/conversations/:id/members/:userId", requireAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      await storage.removeConversationMember(conversationId, userId);
      res.json({ message: "Member removed successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Calendar routes
  app.get("/api/calendar/events", requireAuth, async (req: any, res) => {
    try {
      const { start, end } = req.query;
      const startDate = start ? new Date(start as string) : undefined;
      const endDate = end ? new Date(end as string) : undefined;
      
      const events = await storage.getCalendarEvents(req.userId, startDate, endDate);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/calendar/events", requireAuth, async (req: any, res) => {
    try {
      const eventData = {
        ...req.body,
        userId: req.userId,
        // Convert string dates to Date objects
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
        // Convert string IDs to numbers if they exist
        courseId: req.body.courseId ? parseInt(req.body.courseId) : null,
        studyGroupId: req.body.studyGroupId ? parseInt(req.body.studyGroupId) : null,
      };
      
      const validatedData = insertCalendarEventSchema.parse(eventData);
      const event = await storage.createCalendarEvent(validatedData);
      res.json(event);
    } catch (error: any) {
      console.error("Calendar event creation error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/calendar/events/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getCalendarEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Check if user owns the event
      if (event.userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(event);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/calendar/events/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getCalendarEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedEvent = await storage.updateCalendarEvent(id, req.body);
      res.json(updatedEvent);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/calendar/events/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getCalendarEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteCalendarEvent(id);
      res.json({ message: "Event deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/calendar/events/:id/complete", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { completed } = req.body;
      const event = await storage.getCalendarEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      if (event.userId !== req.userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.markEventCompleted(id, completed);
      res.json({ message: "Event status updated" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dashboard route
  app.get("/api/dashboard", requireAuth, async (req: any, res) => {
    try {
      const dashboardData = await storage.getUserDashboardData(req.userId);
      res.json(dashboardData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
