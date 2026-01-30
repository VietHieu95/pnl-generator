# PNL Generator

## Overview

A web application that creates professional trading PNL (Profit/Loss) images similar to Binance Futures. Users can customize trade parameters and download generated screenshots for their trades. Built with a React frontend and Express backend using TypeScript throughout.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, React useState for local state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Build Tool**: Vite with hot module replacement
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints prefixed with `/api`
- **Development Server**: Vite middleware integration for HMR during development
- **Production Build**: esbuild bundles server code, Vite builds client assets

### Data Layer
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Location**: `shared/schema.ts` contains both database schemas and Zod validation schemas
- **Migrations**: Drizzle Kit manages database migrations in `/migrations` folder
- **Current Storage**: In-memory storage implementation (`MemStorage`) as placeholder until database is provisioned

### Project Structure
```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/   # UI components including shadcn/ui
│   │   ├── pages/        # Route pages
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and query client
├── server/          # Express backend
│   ├── routes.ts    # API route definitions
│   ├── storage.ts   # Data access layer
│   └── vite.ts      # Vite dev server integration
├── shared/          # Shared code between client/server
│   └── schema.ts    # Zod schemas and types
└── migrations/      # Database migrations
```

### Key Design Patterns
- **Shared Schemas**: Zod schemas in `shared/schema.ts` provide type safety and validation across frontend and backend
- **Path Aliases**: `@/` maps to client source, `@shared/` maps to shared code
- **Component Library**: Full shadcn/ui installation with Radix UI primitives
- **Image Export**: html2canvas library for capturing PNL card as downloadable PNG

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)
- **Drizzle ORM**: Database toolkit with type-safe queries
- **connect-pg-simple**: Session storage for PostgreSQL

### UI Framework
- **Radix UI**: Comprehensive accessible component primitives
- **shadcn/ui**: Pre-built component collection using Radix
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### Build & Development
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Server bundling for production
- **TypeScript**: Type checking across entire codebase

### Client Libraries
- **html2canvas**: Captures DOM elements as images for PNL export
- **TanStack React Query**: Data fetching and caching
- **React Hook Form**: Form state management
- **Wouter**: Lightweight routing
- **date-fns**: Date utilities

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development environment indicator