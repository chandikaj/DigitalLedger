# The Digital Ledger Community Platform

## Overview
The Digital Ledger is a community platform for "AI in Accounting" professionals, supporting over 10,000 members. It provides a hub for knowledge-sharing, discussions, educational resources, and podcasts, focusing on AI developments in accounting. Key features include a news aggregator, podcast hub, educational library, forums, polls, and gamification, all built for scalability.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript (Vite build tool)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state and data fetching
- **Theming**: Light/dark mode with CSS custom properties
- **Design**: Mobile-first, responsive layout

### Backend Architecture
- **Runtime**: Node.js with Express.js (TypeScript, ESM)
- **API Pattern**: RESTful API
- **Middleware**: Custom logging, error handling
- **Development**: Hot reload with Vite integration

### Database & Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Schema Management**: Drizzle migrations
- **Session Storage**: PostgreSQL-backed session store
- **Automatic Seeding**: Database automatically seeds with sample data on startup if empty, ensuring production readiness without manual steps. Includes users, articles, podcasts, educational resources, and forum discussions with replies.

### Authentication & Authorization
- **Provider**: Simple username/password auth with bcrypt hashing + Replit OIDC support
- **Session Management**: Express sessions with PostgreSQL storage
- **Security**: HTTP-only cookies, CSRF protection
- **User Profiles**: Rich profiles with expertise tags, points, badges
- **Welcome Email**: Automatic welcome email sent via SendGrid when new users sign up

### Email Services
- **Provider**: SendGrid (via Replit connector integration)
- **Email Service**: server/emailService.ts
- **Features**: Welcome email on user registration with HTML template

### User Settings & Preferences
- **Settings Page**: Accessible at /settings for authenticated users
- **Profile Information**: Display of user name, email, role, and account status
- **Notification Preferences**: Users can manage email notification subscriptions
  - Subscribe/unsubscribe to notifications
  - Select specific news categories to follow
  - Choose notification frequency (daily, weekly, bi-weekly, monthly)
  - API: GET /api/subscribers/me, POST /api/subscribers
- **Security Settings**: Password change functionality

### Content Management System
- **Multi-Category System**: Supports many-to-many relationships for all content types (news, podcasts, forums) using junction tables. Features color-coded badges, keyboard navigation, and multi-select filtering with OR logic. Filter selections persist in URL query parameters.
- **News Aggregation**: Curated feed with multi-category support and filtering. Includes dedicated "Add News" page (role-based access) and commenting system (authenticated users can post, all can view). Anonymous users can "like" content via localStorage.
- **Forum System**: Hierarchical discussions with categories and replies, linked to news categories.
- **Resource Library**: Educational content organized by type.
- **Podcast Hub**: Audio content management with multi-category support, embedded player, and dedicated "Add/Edit Podcast" pages (role-based access).
- **Polling System**: Community surveys and polls.

### File Upload & Media
- **Storage Provider**: Google Cloud Storage
- **Upload Interface**: Uppy.js for drag-and-drop uploads
- **Media Types**: Images, documents, audio files

### Performance & Scalability
- **Caching**: Memoization for expensive operations
- **Database**: Indexed queries, connection pooling
- **Asset Optimization**: Vite bundling, code splitting
- **Error Handling**: Comprehensive error boundaries and logging

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting
- **@neondatabase/serverless**: PostgreSQL connection management

### Authentication Services
- **Replit OIDC**: OpenID Connect provider
- **connect-pg-simple**: PostgreSQL session persistence

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **TanStack Query**: Data fetching and caching

### File Storage & Upload
- **Google Cloud Storage**: Cloud storage
- **Uppy**: File upload handling

### Development Tools
- **TypeScript**: Static typing
- **Drizzle Kit**: Database migration and schema management
- **ESBuild**: Fast JavaScript bundling

### Monitoring & Analytics
- **Replit Integration**: Development environment tools