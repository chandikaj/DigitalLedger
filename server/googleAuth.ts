import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { IStorage } from "./storage";
import type { User } from "@shared/schema";
import { sendWelcomeEmail } from "./emailService";

export function setupGoogleAuth(storage: IStorage) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log("Google OAuth not configured: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing. Skipping Google auth setup.");
    return passport;
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          console.log(`[Google Auth] Processing login for email: ${email}, googleId: ${profile.id}`);

          let user = await storage.getUserByGoogleId(profile.id);

          if (user) {
            console.log(`[Google Auth] Existing user found by Google ID: ${user.id}`);
            return done(null, user);
          }

          if (email) {
            user = await storage.getUserByEmail(email.toLowerCase());

            if (user) {
              console.log(`[Google Auth] Existing user found by email, linking Google account: ${user.id}`);
              const updatedUser = await storage.updateUser(user.id, {
                googleId: profile.id,
                authProvider: "google",
                profileImageUrl: user.profileImageUrl || profile.photos?.[0]?.value,
              });
              return done(null, updatedUser);
            }
          }

          console.log(`[Google Auth] Creating new user for email: ${email}`);
          const newUser = await storage.createUser({
            email: email?.toLowerCase(),
            googleId: profile.id,
            authProvider: "google",
            firstName: profile.name?.givenName || profile.displayName?.split(" ")[0],
            lastName: profile.name?.familyName || profile.displayName?.split(" ").slice(1).join(" "),
            profileImageUrl: profile.photos?.[0]?.value,
            passwordHash: null,
            role: "subscriber",
            isActive: true,
          });

          console.log(`[Google Auth] New user created: ${newUser.id}, email: ${newUser.email}`);

          if (newUser.email) {
            console.log(`[Google Auth] Sending welcome email to: ${newUser.email}`);
            try {
              const result = await sendWelcomeEmail(newUser.email, newUser.firstName || "there");
              console.log(`[Google Auth] Welcome email result: ${result}`);
            } catch (emailErr) {
              console.error("[Google Auth] Failed to send welcome email:", emailErr);
            }
          } else {
            console.log("[Google Auth] No email found for new user, skipping welcome email");
          }

          return done(null, newUser);
        } catch (error) {
          console.error("[Google Auth] Error during authentication:", error);
          return done(error as Error, undefined);
        }
      }
    )
  );

  return passport;
}
