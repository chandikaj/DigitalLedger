import { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";

/**
 * Security Middleware Configuration
 * Sets up comprehensive security measures for the application
 */

// CORS Configuration
export function setupCORS(app: Express) {
  const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        process.env.REPLIT_DOMAINS?.split(',') || [],
        process.env.ALLOWED_ORIGINS?.split(',') || [],
        'http://localhost:5000',
        'http://localhost:5173',
      ].flat().filter(Boolean);
      
      // In production, strictly validate origins
      if (process.env.NODE_ENV === 'production') {
        if (allowedOrigins.some(allowed => origin.includes(allowed))) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      } else {
        // In development, allow all localhost origins
        if (origin.includes('localhost') || allowedOrigins.some(allowed => origin.includes(allowed))) {
          callback(null, true);
        } else {
          callback(null, true); // Allow in development
        }
      }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // 24 hours
  };
  
  app.use(cors(corsOptions));
}

// Security Headers with Helmet
export function setupSecurityHeaders(app: Express) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Vite in development
            "'unsafe-eval'", // Required for Vite in development
            "https://storage.googleapis.com",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for styled components
            "https://fonts.googleapis.com",
          ],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https:",
            "http:",
            "https://storage.googleapis.com",
          ],
          fontSrc: [
            "'self'",
            "data:",
            "https://fonts.gstatic.com",
          ],
          connectSrc: [
            "'self'",
            "https://storage.googleapis.com",
            "wss:",
            "ws:",
          ],
          mediaSrc: [
            "'self'",
            "https://storage.googleapis.com",
            "blob:",
          ],
          objectSrc: ["'none'"],
          frameSrc: ["'self'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding resources
      crossOriginResourcePolicy: { policy: "cross-origin" },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );
}

// Rate Limiting Configuration
export function setupRateLimiting(app: Express) {
  // General API rate limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for health check endpoints
    skip: (req) => req.path === '/health' || req.path === '/api/health',
  });

  // Strict rate limiter for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: "Too many login attempts from this IP, please try again after 15 minutes.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  });

  // Moderate rate limiter for registration
  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 registration attempts per hour
    message: "Too many accounts created from this IP, please try again after an hour.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limiter for password change
  const passwordChangeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 password changes per 15 minutes
    message: "Too many password change attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply general limiter to all API routes
  app.use('/api/', apiLimiter);
  
  // Apply strict limiters to specific routes
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', registerLimiter);
  app.use('/api/auth/change-password', passwordChangeLimiter);
}

// Input Sanitization Middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Sanitize common input fields to prevent XSS
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    
    // Remove potentially dangerous characters and scripts
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized: any = {};
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        sanitized[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  };

  // Sanitize body, query, and params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

// Request Size Limits
export function setupRequestSizeLimits(app: Express) {
  const express = require('express');
  
  // JSON body parser with size limit
  app.use(express.json({ 
    limit: '10mb',
    strict: true,
  }));
  
  // URL-encoded body parser with size limit
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
  }));
}

// Global Error Handler
export function setupErrorHandler(app: Express) {
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Log error for debugging
    console.error('Error:', err);
    
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production') {
      // Generic error message for production
      if (err.status === 429) {
        return res.status(429).json({ 
          message: "Too many requests, please try again later." 
        });
      }
      
      return res.status(err.status || 500).json({ 
        message: "An error occurred. Please try again later." 
      });
    } else {
      // Detailed error in development
      return res.status(err.status || 500).json({ 
        message: err.message || "Internal server error",
        stack: err.stack,
      });
    }
  });
}

// HTTPS Redirect Middleware (for production)
export function httpsRedirect(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production') {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }
  next();
}

// Validation helpers for common inputs
export const validationRules = {
  email: () => body('email')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail()
    .trim(),
  
  password: () => body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  strongPassword: () => body('password')
    .isLength({ min: 12, max: 128 }).withMessage('Password must be between 12 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
};

// Validation result checker
export function checkValidation(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
}
