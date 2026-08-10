import { Express, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import {
  loginSchema,
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  User,
} from "@shared/schema";
import { IStorage } from "./storage";
import {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendGoogleSignInNoticeEmail,
} from "./emailService";

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
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_VERIFY_ATTEMPTS_PER_WINDOW = 5;

// Per-email rolling window of verify attempt timestamps. This survives
// code rotation (resend) so brute-force is bounded across the window.
const verifyAttemptLog = new Map<string, number[]>();

function recordAndCheckVerifyAttempt(email: string): { allowed: boolean; retryAfter: number } {
  const key = email.toLowerCase();
  const now = Date.now();
  const cutoff = now - VERIFY_WINDOW_MS;
  const arr = (verifyAttemptLog.get(key) || []).filter((t) => t > cutoff);
  arr.push(now);
  verifyAttemptLog.set(key, arr);
  if (arr.length > MAX_VERIFY_ATTEMPTS_PER_WINDOW) {
    const oldest = arr[arr.length - MAX_VERIFY_ATTEMPTS_PER_WINDOW - 1] || arr[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + VERIFY_WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfter };
  }
  return { allowed: true, retryAfter: 0 };
}

// Periodic cleanup so the map doesn't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - VERIFY_WINDOW_MS;
  for (const [k, arr] of verifyAttemptLog.entries()) {
    const kept = arr.filter((t) => t > cutoff);
    if (kept.length === 0) verifyAttemptLog.delete(k);
    else verifyAttemptLog.set(k, kept);
  }
}, 60 * 1000).unref?.();

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

async function issueVerificationCode(
  storage: IStorage,
  userId: string,
  email: string,
  firstName: string | null | undefined,
  options: { enforceCooldown?: boolean } = {},
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  if (options.enforceCooldown) {
    const existing = await storage.getActiveVerificationCode(userId);
    if (existing) {
      const elapsed = Date.now() - existing.lastSentAt.getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        return { ok: false, retryAfter: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000) };
      }
    }
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);

  await storage.deleteVerificationCodesForUser(userId);
  await storage.createVerificationCode({
    userId,
    codeHash,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
    attemptCount: 0,
    lastSentAt: new Date(),
  });

  sendVerificationEmail(email, firstName || "there", code).catch((err) => {
    console.error("Failed to send verification email:", err);
  });
  return { ok: true };
}

async function ensureWelcomeSubscriberAndSend(
  storage: IStorage,
  email: string,
  firstName: string | null | undefined,
): Promise<void> {
  try {
    const existing = await storage.getSubscriberByEmail(email);
    let subscriberId: string | undefined = existing?.id;
    if (!existing) {
      try {
        const sub = await storage.createSubscriber({
          email,
          categories: [],
          frequency: "weekly",
          isActive: true,
        });
        subscriberId = sub.id;
      } catch (e) {
        console.error("Failed to create subscriber for welcome email:", e);
      }
    }
    sendWelcomeEmail(email, firstName || "there", subscriberId).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });
  } catch (err) {
    console.error("Failed to look up subscriber for welcome email:", err);
    sendWelcomeEmail(email, firstName || "there").catch(() => {});
  }
}

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
      const normalizedEmail = email.toLowerCase();

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        // Allow re-issuing a code for an unverified existing account, but
        // honor the resend cooldown so register can't be used to spam.
        if (existingUser.emailVerified === false) {
          const result = await issueVerificationCode(
            storage,
            existingUser.id,
            existingUser.email!,
            existingUser.firstName,
            { enforceCooldown: true },
          );
          if (!result.ok) {
            return res.status(429).json({
              verificationRequired: true,
              email: normalizedEmail,
              retryAfter: result.retryAfter,
              message: `Please wait ${result.retryAfter}s before requesting another code.`,
            });
          }
          return res.status(200).json({
            verificationRequired: true,
            email: normalizedEmail,
            message: "Verification code re-sent to your email",
          });
        }
        return res
          .status(409)
          .json({ message: "User already exists with this email" });
      }

      const invitations = await storage.listInvitations();
      const invitation = invitations.find(
        (inv: any) =>
          inv.email.toLowerCase() === normalizedEmail && !inv.revokedAt,
      );

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await storage.createUser({
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        role: invitation?.role || "member",
        isActive: true,
        emailVerified: false,
      });

      if (invitation) {
        await storage.markInvitationAccepted(invitation.id);
      }

      await issueVerificationCode(storage, user.id, user.email!, user.firstName);

      return res.status(201).json({
        verificationRequired: true,
        email: normalizedEmail,
        message: "Verification code sent to your email",
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Verify email endpoint
  app.post("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const result = verifyEmailSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: result.error.errors });
      }

      const { email, code } = result.data;
      const invalidMsg = { message: "Invalid or expired code" };

      // Per-email rolling 15-min rate limit (independent of code rotation)
      const gate = recordAndCheckVerifyAttempt(email);
      if (!gate.allowed) {
        return res.status(429).json({
          message: `Too many attempts. Try again in ${gate.retryAfter}s.`,
          retryAfter: gate.retryAfter,
        });
      }

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(400).json(invalidMsg);
      }

      // Already verified accounts must sign in via the login endpoint;
      // never issue a session here without validating a code.
      if (user.emailVerified) {
        return res.status(400).json({
          message: "Email already verified. Please sign in.",
          alreadyVerified: true,
        });
      }

      const stored = await storage.getActiveVerificationCode(user.id);
      if (!stored) {
        return res.status(400).json(invalidMsg);
      }

      if (stored.expiresAt.getTime() < Date.now()) {
        await storage.deleteVerificationCodesForUser(user.id);
        return res.status(400).json(invalidMsg);
      }

      if (stored.attemptCount >= MAX_VERIFY_ATTEMPTS) {
        return res.status(429).json({
          message: "Too many attempts. Please request a new code.",
        });
      }

      const ok = await bcrypt.compare(code, stored.codeHash);
      if (!ok) {
        await storage.incrementVerificationAttempt(stored.id);
        return res.status(400).json(invalidMsg);
      }

      // Mark verified, delete codes, send welcome, create session
      await storage.updateUser(user.id, { emailVerified: true });
      await storage.deleteVerificationCodesForUser(user.id);

      ensureWelcomeSubscriberAndSend(storage, user.email!, user.firstName);

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Internal server error" });
        }
        req.session.userId = user.id;
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Internal server error" });
          }
          const { passwordHash: _passwordHash, ...userResponse } = user;
          res.json({ verified: true, user: { ...userResponse, emailVerified: true } });
        });
      });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Resend verification code
  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    try {
      const result = resendVerificationSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: result.error.errors });
      }

      const email = result.data.email.toLowerCase();
      const user = await storage.getUserByEmail(email);

      // Always respond success-shaped to avoid email enumeration
      if (!user || user.emailVerified) {
        return res.json({ message: "If an account needs verification, a new code has been sent." });
      }

      const existing = await storage.getActiveVerificationCode(user.id);
      if (existing) {
        const elapsed = Date.now() - existing.lastSentAt.getTime();
        if (elapsed < RESEND_COOLDOWN_MS) {
          const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
          return res.status(429).json({
            message: `Please wait ${retryAfter}s before requesting another code.`,
            retryAfter,
          });
        }
      }

      await issueVerificationCode(storage, user.id, user.email!, user.firstName);
      res.json({ message: "Verification code sent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Forgot password — issue a 6-digit reset code
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const result = forgotPasswordSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: result.error.errors });
      }

      const email = result.data.email.toLowerCase();
      // Always respond success-shaped to prevent email enumeration
      const successResponse = {
        message: "If an account exists for that email, a reset code has been sent.",
      };

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json(successResponse);
      }

      // Reuse 60s cooldown so this can't be used to spam
      const existing = await storage.getActivePasswordResetCode(user.id);
      if (existing) {
        const elapsed = Date.now() - existing.lastSentAt.getTime();
        if (elapsed < RESEND_COOLDOWN_MS) {
          // Silent cooldown — still return success-shaped to avoid leaking state
          return res.json(successResponse);
        }
      }

      // Google-auth accounts have no password to reset. Tell the owner why
      // no code arrives (only they receive the email, so nothing leaks).
      // A throwaway code row is stored purely to drive the resend cooldown;
      // it can never be redeemed because reset-password rejects accounts
      // without a passwordHash.
      if (!user.passwordHash) {
        const throwawayHash = await bcrypt.hash(generateCode() + generateCode(), SALT_ROUNDS);
        await storage.deletePasswordResetCodesForUser(user.id);
        await storage.createPasswordResetCode({
          userId: user.id,
          codeHash: throwawayHash,
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
          attemptCount: 0,
          lastSentAt: new Date(),
        });
        sendGoogleSignInNoticeEmail(user.email!, user.firstName || "there").catch((err) => {
          console.error("Failed to send Google sign-in notice email:", err);
        });
        return res.json(successResponse);
      }

      const code = generateCode();
      const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
      await storage.deletePasswordResetCodesForUser(user.id);
      await storage.createPasswordResetCode({
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
        attemptCount: 0,
        lastSentAt: new Date(),
      });

      sendPasswordResetEmail(user.email!, user.firstName || "there", code).catch((err) => {
        console.error("Failed to send password reset email:", err);
      });

      res.json(successResponse);
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Reset password — validate code and set new password
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const result = resetPasswordSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ message: "Invalid input", errors: result.error.errors });
      }

      const { email, code, newPassword } = result.data;
      const invalidMsg = { message: "Invalid or expired code" };

      // Per-email rolling 15-min rate limit (shared with verify flow)
      const gate = recordAndCheckVerifyAttempt(`pwreset:${email}`);
      if (!gate.allowed) {
        return res.status(429).json({
          message: `Too many attempts. Try again in ${gate.retryAfter}s.`,
          retryAfter: gate.retryAfter,
        });
      }

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user || !user.passwordHash) {
        return res.status(400).json(invalidMsg);
      }

      const stored = await storage.getActivePasswordResetCode(user.id);
      if (!stored) {
        return res.status(400).json(invalidMsg);
      }

      if (stored.expiresAt.getTime() < Date.now()) {
        await storage.deletePasswordResetCodesForUser(user.id);
        return res.status(400).json(invalidMsg);
      }

      if (stored.attemptCount >= MAX_VERIFY_ATTEMPTS) {
        return res.status(429).json({
          message: "Too many attempts. Please request a new code.",
        });
      }

      const ok = await bcrypt.compare(code, stored.codeHash);
      if (!ok) {
        await storage.incrementPasswordResetAttempt(stored.id);
        return res.status(400).json(invalidMsg);
      }

      const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await storage.updateUser(user.id, { passwordHash: newHash });
      await storage.deletePasswordResetCodesForUser(user.id);

      // Invalidate all existing sessions for this user so any attacker
      // already holding a session cookie is logged out by the reset.
      try {
        const { sql: dsql } = await import("drizzle-orm");
        const { db: database } = await import("./db");
        await database.execute(
          dsql`DELETE FROM sessions WHERE sess->>'userId' = ${user.id}`,
        );
      } catch (err) {
        console.error("Failed to invalidate sessions after password reset:", err);
      }

      res.json({ success: true, message: "Password updated. Please sign in." });
    } catch (error) {
      console.error("Reset password error:", error);
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

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is inactive" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Block unverified email users
      if (!user.emailVerified) {
        // Re-issue code if no active one (or expired)
        const existing = await storage.getActiveVerificationCode(user.id);
        const expired = !existing || existing.expiresAt.getTime() < Date.now();
        if (expired) {
          await issueVerificationCode(storage, user.id, user.email!, user.firstName);
        }
        return res.status(403).json({
          verificationRequired: true,
          email: user.email,
          message: "Please verify your email to continue",
        });
      }

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Internal server error" });
        }

        req.session.userId = user.id;

        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Internal server error" });
          }

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

  // Get current user endpoint
  app.get("/api/auth/user", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user || !user.isActive) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { passwordHash: _, ...userResponse } = user as any;
      res.json(userResponse);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

// Middleware to check if user is authenticated
export async function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const storage: IStorage = (req as any).storage;
    const user = await storage.getUser(req.session.userId);

    if (!user || !user.isActive) {
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
