import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import {
  loginSchema,
  registerSchema,
  LoginRequest,
  RegisterRequest,
  User,
} from "@shared/schema";
import { IStorage } from "./storage";
import { sendWelcomeEmail } from "./emailService";

// Extend session type to include userId
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const SALT_ROUNDS = 12;

export function setupAuth(app: Express, storage: IStorage) {
  // Register endpoint
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: result.error.errors });
      }

      const { email, password, firstName, lastName } = result.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "User already exists with this email" });
      }

      // Check for invitation
      const invitations = await storage.listInvitations();
      const invitation = invitations.find(
        (inv: any) =>
          inv.email.toLowerCase() === email.toLowerCase() && !inv.revokedAt,
      );

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const userData = {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: invitation?.role || "member",
        isActive: true,
      };

      const user = await storage.createUser(userData);

      // Mark invitation as accepted if exists
      if (invitation) {
        await storage.markInvitationAccepted(invitation.id);
      }

      // Set session
      req.session.userId = user.id;

      // Send welcome email (don't block registration if email fails)
      sendWelcomeEmail(user.email!, user.firstName || "there").catch((err) => {
        console.error("Failed to send welcome email:", err);
      });

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Internal server error" });
        }

        // Return user without password
        const { passwordHash: _, ...userResponse } = user;
        res.status(201).json(userResponse);
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: result.error.errors });
      }

      const { email, password } = result.data;

      // Get user by email
      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is inactive" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Regenerate session for security
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Internal server error" });
        }

        // Set session
        req.session.userId = user.id;

        // Save session explicitly
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Internal server error" });
          }

          // Return user without password
          const { passwordHash: _, ...userResponse } = user;
          res.json(userResponse);
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Change password endpoint
  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ message: "Current and new password are required" });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: "New password must be at least 6 characters" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.passwordHash,
      );
      if (!isValidPassword) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await storage.updateUser(user.id, { passwordHash: newPasswordHash });

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user endpoint - supports both simple auth and Replit OIDC
  app.get("/api/auth/user", async (req: Request, res: Response) => {
    try {
      let user = null;
      
      // Check for simple auth (session.userId)
      if (req.session.userId) {
        user = await storage.getUser(req.session.userId);
      }
      // Check for Replit OIDC auth (passport session)
      else if (req.isAuthenticated?.() && (req.user as any)?.claims?.sub) {
        const userId = (req.user as any).claims.sub;
        user = await storage.getUser(userId);
      }
      
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (!user.isActive) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Return user without password
      const { passwordHash: _, ...userResponse } = user as any;
      res.json(userResponse);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

// Middleware to check if user is authenticated - supports both simple auth and Replit OIDC
export async function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const storage: IStorage = (req as any).storage;
    let user = null;
    
    // Check for simple auth (session.userId)
    if (req.session.userId) {
      user = await storage.getUser(req.session.userId);
    }
    // Check for Replit OIDC auth (passport session)
    else if (req.isAuthenticated?.() && (req.user as any)?.claims?.sub) {
      const userId = (req.user as any).claims.sub;
      user = await storage.getUser(userId);
    }
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!user.isActive) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Middleware to check if user is admin
export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    // First run authentication middleware
    return isAuthenticated(req, res, () => {
      if ((req.user as any)?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    });
  }

  if ((req.user as any)?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
}

// Middleware to check if user is editor or admin
export async function isEditorOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    // First run authentication middleware
    return isAuthenticated(req, res, () => {
      const userRole = (req.user as any)?.role;
      if (userRole !== "editor" && userRole !== "admin") {
        return res
          .status(403)
          .json({ message: "Editor or admin access required" });
      }
      next();
    });
  }

  const userRole = (req.user as any)?.role;
  if (userRole !== "editor" && userRole !== "admin") {
    return res.status(403).json({ message: "Editor or admin access required" });
  }

  next();
}
