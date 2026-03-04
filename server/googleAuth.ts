import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { IStorage } from "./storage";
import type { User } from "@shared/schema";
import { sendWelcomeEmail } from "./emailService";

export function setupGoogleAuth(storage: IStorage) {
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user || false);
    } catch (error) {
      console.error("Failed to deserialize user from session, treating as unauthenticated:", error);
      done(null, false);
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
          let user = await storage.getUserByGoogleId(profile.id);

          if (user) {
            return done(null, user);
          }

          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await storage.getUserByEmail(email.toLowerCase());

            if (user) {
              const updatedUser = await storage.updateUser(user.id, {
                googleId: profile.id,
                authProvider: "google",
                profileImageUrl: user.profileImageUrl || profile.photos?.[0]?.value,
              });
              return done(null, updatedUser);
            }
          }

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

          // Look up or create a subscriber record so the welcome email unsubscribe link works
          storage.getSubscriberByEmail(newUser.email!).then(async (existing) => {
            let subscriberId: string | undefined;
            if (existing) {
              subscriberId = existing.id;
            } else {
              try {
                const sub = await storage.createSubscriber({
                  email: newUser.email!,
                  categories: [],
                  frequency: "weekly",
                  isActive: false,
                });
                subscriberId = sub.id;
              } catch (e) {
                console.error("Failed to create subscriber record for welcome email:", e);
              }
            }
            sendWelcomeEmail(newUser.email!, newUser.firstName || "there", subscriberId).catch((err) => {
              console.error("Failed to send welcome email after Google sign-up:", err);
            });
          }).catch((err) => {
            console.error("Failed to look up subscriber for welcome email:", err);
            sendWelcomeEmail(newUser.email!, newUser.firstName || "there").catch(() => {});
          });

          // Pass isNewUser flag so the route handler can redirect to welcome page
          return done(null, newUser, { isNewUser: true } as any);
        } catch (error) {
          console.error("Google OAuth error:", error);
          return done(error as Error, undefined);
        }
      }
    )
  );

  return passport;
}
