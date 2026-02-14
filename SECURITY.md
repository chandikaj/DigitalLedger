# Security Documentation

This document outlines the security measures implemented in the Digital Ledger application.

## Security Features Implemented

### 1. **Security Headers (Helmet)**
- Content Security Policy (CSP) to prevent XSS attacks
- HTTP Strict Transport Security (HSTS) for HTTPS enforcement
- X-Content-Type-Options to prevent MIME-type sniffing
- X-XSS-Protection for older browsers
- Referrer Policy for privacy
- Cross-Origin Resource Policy (CORP) configuration

### 2. **CORS (Cross-Origin Resource Sharing)**
- Strict origin validation in production
- Credentials support for authenticated requests
- Configurable allowed origins via environment variables
- Proper handling of preflight requests

### 3. **Rate Limiting**
- **General API**: 1000 requests per 15 minutes per IP
- **Login Attempts**: 5 attempts per 15 minutes per IP (strict)
- **Registration**: 3 attempts per hour per IP
- **Password Changes**: 5 attempts per 15 minutes per IP
- Prevents brute force attacks and DoS

### 4. **Strong Password Policy**
Passwords must meet the following requirements:
- Minimum 8 characters (maximum 128)
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- Server-side validation enforced

### 5. **Input Sanitization**
- Automatic sanitization of request body, query parameters, and URL parameters
- XSS prevention through script tag and javascript: protocol removal
- Event handler attribute removal (onclick, onerror, etc.)
- Maximum request body size: 10MB

### 6. **Session Security**
- HTTP-only cookies (prevents XSS cookie access)
- Secure flag in production (HTTPS only)
- SameSite=lax (CSRF protection)
- Session regeneration on login (prevents session fixation)
- Custom session cookie name (reduces fingerprinting)
- Rolling sessions (auto-refresh on activity)
- PostgreSQL session store for persistence

### 7. **Authentication & Authorization**
- bcrypt password hashing (12 rounds)
- Role-based access control (subscriber, contributor, editor, admin)
- Protected routes with middleware
- Active user validation
- OAuth 2.0 support (Google)

### 8. **Error Handling**
- Generic error messages in production (prevents information disclosure)
- Detailed errors only in development
- Proper error logging without exposing to clients
- No stack traces in production responses

### 9. **Database Security**
- Drizzle ORM (SQL injection protection)
- Parameterized queries
- Input validation with Zod schemas
- No raw SQL from user input

### 10. **File Upload Security**
- Authenticated uploads only
- ACL (Access Control List) for object storage
- File size limits
- Proper MIME type handling

## Environment Variables Required

### Critical Security Variables
```bash
# Session secret (generate a strong random string)
SESSION_SECRET=your-super-secure-random-string-here

# Database connection (use SSL in production)
DATABASE_URL=postgres://user:password@host:port/database

# Google OAuth (if using Google authentication)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# CORS allowed origins (comma-separated)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Replit-specific
REPLIT_DOMAINS=your-repl-domain.replit.app
```

## Security Best Practices

### For Developers

1. **Never commit secrets or credentials**
   - Use environment variables
   - Add sensitive files to `.gitignore`
   - Use Replit Secrets in production

2. **Keep dependencies updated**
   - Regularly run `npm audit`
   - Update packages with security patches
   - Review dependency vulnerabilities

3. **Validate all user input**
   - Use Zod schemas for validation
   - Sanitize input before processing
   - Never trust client-side validation alone

4. **Follow the principle of least privilege**
   - Users should only have access to what they need
   - Check permissions on every protected route
   - Validate authorization, not just authentication

5. **Secure error handling**
   - Don't expose internal errors to users
   - Log errors server-side for debugging
   - Return generic messages to clients in production

### For Administrators

1. **Use strong passwords**
   - Follow the password policy
   - Consider using a password manager
   - Don't reuse passwords

2. **Enable HTTPS**
   - Always use HTTPS in production
   - Configure SSL/TLS certificates properly
   - Enable HSTS headers

3. **Monitor logs**
   - Review authentication failures
   - Watch for unusual patterns
   - Set up alerts for suspicious activity

4. **Regular security audits**
   - Review user permissions periodically
   - Check for inactive accounts
   - Audit admin access logs

5. **Keep backups**
   - Regular database backups
   - Store backups securely
   - Test restore procedures

## Security Headers Explained

### Content-Security-Policy (CSP)
Prevents XSS attacks by controlling which resources can be loaded:
- Scripts: Only from same origin and trusted CDNs
- Styles: Same origin and inline styles (for UI components)
- Images: Allow from storage and data URLs
- Fonts: Same origin and Google Fonts
- Connections: Same origin and API endpoints

### HTTP Strict-Transport-Security (HSTS)
Forces browsers to use HTTPS:
- Max-Age: 1 year
- Include subdomains
- Preload eligible

### X-Content-Type-Options
Prevents MIME-type sniffing attacks by forcing browsers to respect declared content types.

### Referrer-Policy
Controls how much referrer information is sent:
- `strict-origin-when-cross-origin` balances privacy and functionality

## Incident Response

If you discover a security vulnerability:

1. **Do not disclose publicly** until it's fixed
2. **Contact the development team** immediately
3. **Provide detailed information**:
   - What the vulnerability is
   - How to reproduce it
   - Potential impact
   - Suggested fix (if any)

## Compliance Considerations

Depending on your use case, consider:

- **GDPR** (if handling EU user data)
  - User data deletion
  - Data export capabilities
  - Privacy policy
  - Cookie consent

- **CCPA** (if handling California residents' data)
  - Similar to GDPR requirements
  - "Do Not Sell" option

- **SOC 2** (for enterprise customers)
  - Security controls documentation
  - Regular audits
  - Access controls

## Security Checklist

- [x] Security headers configured (Helmet)
- [x] CORS properly configured
- [x] Rate limiting on all endpoints
- [x] Strong password policy enforced
- [x] Input sanitization middleware
- [x] Secure session configuration
- [x] Password hashing with bcrypt
- [x] SQL injection protection (ORM)
- [x] XSS prevention
- [x] CSRF protection (SameSite cookies)
- [x] Error handling (no info disclosure)
- [x] HTTPS redirect in production
- [x] Request size limits
- [x] Authentication & authorization
- [x] File upload security

## Updates and Maintenance

Security is an ongoing process. This implementation should be:
- Reviewed quarterly
- Updated when vulnerabilities are discovered
- Enhanced as new threats emerge
- Tested regularly

Last Updated: February 14, 2026
