# AI Accounting Hub Community Platform

## Overview

AI Accounting Hub is a modern community platform focused on "AI in Accounting" designed to support over 10,000 members through interactive knowledge-sharing. The platform serves as a comprehensive hub for accounting professionals to stay updated on AI developments, engage in discussions, access educational resources, and listen to expert podcasts. Built with scalability in mind, it features a news aggregator, podcast hub, educational resource library, and robust community engagement tools including forums, polls, and gamification elements.

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
- **News Aggregation**: Curated feed system with categorization and filtering
- **Forum System**: Hierarchical discussion structure with categories, discussions, and replies
- **Resource Library**: Educational content management with type-based organization
- **Podcast Hub**: Audio content management with embedded player support
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