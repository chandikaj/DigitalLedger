# The Digital Ledger Community Platform

## Overview

The Digital Ledger is a modern community platform focused on "AI in Accounting" designed to support over 10,000 members through interactive knowledge-sharing. The platform serves as a comprehensive hub for accounting professionals to stay updated on AI developments, engage in discussions, access educational resources, and listen to expert podcasts. Built with scalability in mind, it features a news aggregator, podcast hub, educational resource library, and robust community engagement tools including forums, polls, and gamification elements.

## Database Seeding & Production Synchronization

### Admin Credentials
- Email: admin@admin.com
- Password: admin123

### Automatic Database Seeding
The application now includes **automatic seeding on startup**:

**How it works:**
1. On every app start, checks if database is empty (<=2 users, 0 articles, 0 podcasts, or 0 forum discussions)
2. If empty, automatically seeds with complete sample data including forum discussions and replies
3. If already populated, skips seeding and logs current counts
4. **This ensures production gets seeded automatically when published!**

**Server log examples:**
```
[express] Checking database status...
[express] ✓ Database already populated (13 users, 11 articles, 10 podcasts, 9 discussions)
```

### Current Database Status
**Development Database:** ✅ Fully synchronized
- 13 users (10 community members + 3 admins)
- 11 news articles across 4 categories
- 10 podcast episodes (Episodes 3-12)
- 12 educational resources
- 3 forum categories
- **9 forum discussions with 21 replies** (NEW!)

**Production Database:** Will auto-seed on first deployment

### Sample Data Included
- **10 Community Contributors**: Sarah Mitchell (Deloitte), James Rodriguez (KPMG), Emily Chen (PwC), and 7 more with complete profiles
- **11 News Articles**: Automation, Fraud Detection, Regulatory, Generative AI categories
- **10 Podcast Episodes**: Full metadata, audio URLs, sorted by date
- **12 Educational Resources**: Guides, videos, templates, tools with ratings
- **3 Forum Categories**: AI Implementation, Regulatory Compliance, Learning & Development
- **9 Forum Discussions**: Real AI/accounting topics with threaded conversations
  - "Best practices for implementing GPT-4 in tax preparation workflows" (8 replies, pinned)
  - "Machine Learning model accuracy for audit sampling?" (12 replies)
  - "RPA vs. AI for AP automation?" (6 replies)
  - "SEC's new AI disclosure requirements" (15 replies, pinned)
  - "PCAOB guidance on AI and auditor independence" (9 replies)
  - "International AI regulations: GDPR vs. US" (7 replies)
  - "Recommended certifications for AI in Accounting?" (14 replies)
  - "Career pivot: Traditional auditor to AI specialist?" (11 replies)
  - "Python for accountants: Best resources?" (10 replies)
- **21 Forum Replies**: Realistic conversations with technical details, tool recommendations, and professional insights from community members

### Manual Rebuild Option
The admin panel still includes a **"Rebuild Database"** button (orange border) for manual control:
- Clears all seed data (preserves admin accounts)
- Re-inserts fresh sample data
- Useful for resetting data during development

### Production Deployment (Automatic)
1. **Publish to Replit** → Schema transfers, data does not
2. **App starts in production** → Detects empty database (checks forum discussions too!)
3. **Auto-seeding triggers** → Populates all sample data including 9 forum discussions with 21 replies
4. **Production ready!** → Same data as development

**No manual steps required!** Both environments automatically maintain identical seed data including community forums.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui components for consistent design system
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and data fetching
- **Theme Support**: Built-in light/dark mode theming with CSS custom properties
- **Mobile-First Design**: Responsive layout optimized for both desktop and mobile experiences

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful API endpoints with organized route handlers
- **Middleware**: Custom logging, error handling, and request processing
- **Development Tools**: Hot reload with Vite integration in development mode

### Database & Storage
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Schema Management**: Drizzle migrations with shared schema definitions
- **Session Storage**: PostgreSQL-backed session store for authentication

### Authentication & Authorization
- **Provider**: Replit OIDC (OpenID Connect) authentication
- **Session Management**: Express sessions with PostgreSQL storage
- **Security**: HTTP-only cookies, CSRF protection, and secure session handling
- **User Profiles**: Rich user profiles with expertise tags, points, and badges

### Content Management System
- **Multi-Category System**: Full many-to-many category support across all content types
  - **Architecture**: Junction tables (article_categories, podcast_categories, discussion_categories) enable multiple category assignments per item
  - **Categories**: 5 default categories - automation (blue), fraud-detection (red), regulatory (amber), generative-ai (violet), general (gray fallback)
  - **UI Pattern**: Color-coded badges with category.color, multi-select toggles in forms
  - **Accessibility**: Full keyboard navigation (Tab, Enter, Space), aria-pressed states, focus rings, screen reader support
  - **Filtering**: Multi-select category filtering on News and Podcasts pages with "Clear Filters" option
  - **Backwards Compatibility**: Legacy single category field auto-populated with first category slug, defaults to "general"
- **News Aggregation**: Curated feed system with multi-category support and filtering
  - **Dedicated Add News Page** (/news/add): Streamlined article creation interface for editors and admins
  - Role-based "Add News" button visible only to editors and admins on News page
  - Form validation enforces required fields (title, content, at least one category)
  - Multi-select category badges with keyboard accessibility (Tab, Enter, Space)
  - Auto-redirect to news feed after successful article creation
  - Multi-category filtering on News page with color-coded badges
- **Forum System**: Hierarchical discussion structure with categories, discussions, and replies
  - Forum discussions display associated news category badges with colors
- **Resource Library**: Educational content management with type-based organization
- **Podcast Hub**: Audio content management with multi-category support and embedded player
  - **Dedicated Add Podcast Page** (/podcasts/add): Streamlined episode creation interface for editors and admins
  - **Dedicated Edit Podcast Page** (/podcasts/:id/edit): Full episode editing and deletion capability for editors and admins
  - Role-based "Add Podcast" button visible only to editors and admins on Podcasts page
  - Role-based "Edit" buttons visible only to editors and admins on all podcast cards (featured and regular)
  - **Delete functionality** with confirmation dialog to prevent accidental deletions
  - Form validation enforces required field (title), at least one category
  - Multi-select category badges with full keyboard accessibility
  - Optional fields: description, episode number, duration, audio URL, host/guest information, cover image
  - Auto-redirect to podcast hub after successful creation, update, or deletion
  - Smart cache invalidation ensures featured episode and lists reflect changes immediately
  - Multi-category filtering with color-coded badges
- **Polling System**: Community engagement through surveys and polls

### File Upload & Media
- **Storage Provider**: Google Cloud Storage for file and media uploads
- **Upload Interface**: Uppy.js integration for drag-and-drop file uploads
- **Media Types**: Support for images, documents, and audio files

### Performance & Scalability
- **Caching Strategy**: Memoization for expensive operations and OIDC configuration
- **Database Optimization**: Indexed queries and connection pooling for high concurrency
- **Asset Optimization**: Vite-based bundling with code splitting and tree shaking
- **Error Handling**: Comprehensive error boundaries and logging system

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with automatic scaling
- **Connection Management**: @neondatabase/serverless for optimized connections

### Authentication Services
- **Replit OIDC**: OpenID Connect provider for seamless authentication
- **Session Store**: connect-pg-simple for PostgreSQL session persistence

### UI/UX Libraries
- **Radix UI**: Accessible component primitives for complex UI elements
- **Lucide React**: Comprehensive icon library for consistent iconography
- **TanStack Query**: Advanced data fetching and caching for optimal UX

### File Storage & Upload
- **Google Cloud Storage**: Scalable cloud storage for user-uploaded content
- **Uppy**: Advanced file upload handling with progress tracking and validation

### Development Tools
- **TypeScript**: Strong typing throughout the application stack
- **Drizzle Kit**: Database migration and schema management tools
- **ESBuild**: Fast JavaScript bundling for production builds

### Monitoring & Analytics
- **Replit Integration**: Development environment optimization and error tracking
- **Runtime Error Overlay**: Development-time error reporting and debugging