import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { IStorage } from "./storage";
import type { User } from "@shared/schema";

export function setupGoogleAuth(storage: IStorage) {
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

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("Google OAuth credentials not configured. Google login will be disabled.");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists by Google ID
          let user = await storage.getUserByGoogleId(profile.id);

          if (user) {
            // User already exists, return them
            return done(null, user);
          }

          // Check if user exists by email
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await storage.getUserByEmail(email.toLowerCase());

            if (user) {
              // Link Google account to existing user
              const updatedUser = await storage.updateUser(user.id, {
                googleId: profile.id,
                authProvider: "google",
                profileImageUrl: user.profileImageUrl || profile.photos?.[0]?.value,
              });
              return done(null, updatedUser);
            }
          }

          // Create new user from Google profile
          const newUser = await storage.createUser({
            email: email?.toLowerCase(),
            googleId: profile.id,
            authProvider: "google",
            firstName: profile.name?.givenName || profile.displayName?.split(" ")[0],
            lastName: profile.name?.familyName || profile.displayName?.split(" ").slice(1).join(" "),
            profileImageUrl: profile.photos?.[0]?.value,
            passwordHash: null, // No password for OAuth users
            role: "subscriber",
            isActive: true,
          });

          return done(null, newUser);
        } catch (error) {
          console.error("Google OAuth error:", error);
          return done(error as Error, undefined);
        }
      }
    )
  );

  return passport;
}
