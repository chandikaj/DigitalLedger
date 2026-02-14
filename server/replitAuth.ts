import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Don't use default 'connect.sid' - makes it harder to fingerprint
    cookie: {
      httpOnly: true, // Prevent XSS access to cookie
      secure: process.env.NODE_ENV === "production", // Only use secure cookies in production (HTTPS)
      sameSite: "lax", // Prevent CSRF while allowing some cross-site navigation
      maxAge: sessionTtl,
      domain: undefined, // Let the browser set the domain
      path: '/', // Cookie available on all paths
    },
    rolling: true, // Reset cookie expiration on every request
    proxy: true, // Trust the reverse proxy
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  const userId = claims["sub"];
  const email = claims["email"];
  
  // Check if user exists by ID first
  let existingUser = await storage.getUser(userId);
  
  // If no user found by ID, check by email (for cases where ID changed but email is same)
  if (!existingUser) {
    existingUser = await storage.getUserByEmail(email);
  }
  
  // If user exists (by either ID or email), update their information
  if (existingUser) {
    await storage.updateUser(existingUser.id, {
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      // role and isActive are intentionally not included to preserve existing values
    });
    return;
  }
  
  // For new users, determine role from invitation or environment variable
  const invitation = await storage.findInvitationByEmail(email);
  let role = "member"; // default role
  
  if (invitation) {
    role = invitation.role;
    await storage.markInvitationAccepted(invitation.id);
  } else if (process.env.NODE_ENV === "development" && claims["role"]) {
    // Only allow OIDC role claims in development environment for testing
    role = claims["role"];
  }

  await storage.upsertUser({
    id: userId,
    email: email,
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: role,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Check if user is still active in database
    const userId = user.claims.sub;
    const dbUser = await storage.getUser(userId);
    if (!dbUser || !dbUser.isActive) {
      return res.status(401).json({ message: "Account deactivated" });
    }
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    
    // Check if user is still active after token refresh
    const userId = user.claims.sub;
    const dbUser = await storage.getUser(userId);
    if (!dbUser || !dbUser.isActive) {
      return res.status(401).json({ message: "Account deactivated" });
    }
    
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  // First check if user is authenticated
  try {
    await new Promise<void>((resolve, reject) => {
      isAuthenticated(req, res, (err) => {
        if (res.headersSent) {
          reject(new Error("Authentication failed"));
          return;
        }
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (error) {
    // If headers are already sent, authentication middleware handled the response
    if (res.headersSent) return;
    return res.status(401).json({ message: "Authentication required" });
  }

  // Check if user has admin role
  const user = req.user as any;
  const userId = user.claims.sub;
  const dbUser = await storage.getUser(userId);
  
  if (!dbUser || dbUser.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};
