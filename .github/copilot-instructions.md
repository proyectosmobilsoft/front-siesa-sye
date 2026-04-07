# Dashboard SaaS - Development Guide

This is a React + TypeScript + Vite SaaS dashboard for analytics and business management, consuming backend APIs from SIESA ERP.

## Build, Test, and Lint Commands

```bash
# Development server (with Vite proxy to backend)
npm run dev

# Type checking and production build
npm run build

# Lint code (TypeScript/React with ESLint)
npm run lint

# Preview production build locally
npm run preview
```

**Note**: There are no test scripts configured. If adding tests, integrate with the existing ESLint configuration.

## Architecture Overview

### Data Flow & State Management

- **API Layer**: Centralized in `src/api/` with TypeScript types in `types.ts`
  - `client.ts`: Axios instance with authentication interceptors and error handling
  - Individual API modules (e.g., `clients.ts`, `companies.ts`, `products.ts`)
  
- **State Management**:
  - **React Query (@tanstack/react-query)**: All server state (API data)
  - **Zustand**: UI state only (`uiStore.ts` - dark mode, sidebar, filters)
  - Custom hooks in `src/hooks/` wrap React Query for each resource (e.g., `useClients`, `useCompanies`)

- **Routing**: React Router v6 with protected routes in `App.tsx`
  - Authentication check via `useAuth` hook
  - Inactivity timeout via `useInactivityTimeout` hook

### Component Architecture

- **UI Components** (`src/components/ui/`): shadcn/ui base components (Button, Dialog, Table, etc.)
- **Layout** (`src/components/layout/`): Sidebar, Header, ThemeToggle
- **Feature Components** (`src/components/dashboard/`, `src/components/financiero/`, etc.): Domain-specific components
- **Pages** (`src/pages/`): Route-level components that compose smaller components

### Environment Configuration

- **Development**: API requests go to `/api`, Vite proxy redirects to `localhost:3010` (configured in `vite.config.ts`)
- **Production**: API requests go directly to `https://softwareqa.dev` (no proxy)
- Configuration logic in `src/config/api.ts` handles environment detection

**Important**: Backend port is `3010` (not 3000) - check `vite.config.ts` proxy settings

## Key Conventions

### API Integration

1. **Authentication Token**: Stored in `localStorage` as `auth_token`, automatically injected by axios interceptor
2. **API Response Structure**: All endpoints return `{ success: boolean, data: T[] }`
3. **React Query Keys**: Use descriptive arrays, e.g., `['clients']`, `['client', id]`, `['clients', 'search', query]`
4. **Query Configuration**: Default staleTime is 5 minutes, 3 retries, no refetch on window focus

### TypeScript Types

- All API types are defined in `src/api/types.ts`
- Backend field naming uses Spanish snake_case (e.g., `f010_razon_social`, `ind_compra`)
- Frontend components use these types directly - do not rename/transform unless necessary

### Styling

- **Tailwind CSS** with custom theme in `tailwind.config.js`
- **Dark Mode**: Implemented via `class` strategy, toggled through Zustand store
- **shadcn/ui**: Design system using Radix UI primitives with custom theming
- **CSS Variables**: Theme colors defined in `src/index.css` as HSL values
- **Class Merging**: Use `cn()` utility from `src/lib/utils.ts` for conditional classes

### Custom Hooks Pattern

Follow this structure when creating new hooks:

```typescript
// src/hooks/useResource.ts
import { useQuery } from '@tanstack/react-query'
import { resourceApi } from '@/api/resource'
import { Resource } from '@/api/types'

export const useResources = () => {
  return useQuery<Resource[]>({
    queryKey: ['resources'],
    queryFn: resourceApi.getAll,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  })
}
```

### UI Components

- **Radix UI**: Use for accessible primitives (Dialog, DropdownMenu, Select, etc.)
- **Framer Motion**: For animations (fade-in, slide-in) on page transitions
- **Lucide React**: Icon library - import only icons you need
- **TanStack Table**: For data tables with search, sort, pagination

### Error Handling

- **401 Unauthorized**: Automatically clears token and redirects to `/login` (see `src/api/client.ts`)
- **Network Errors**: Logged to console with context (URL, method, status)
- **React Query**: Uses error boundaries and retry logic (3 attempts by default)

### Path Aliases

Use `@/` for all imports from `src/`:
```typescript
import { Button } from '@/components/ui/button'
import { useClients } from '@/hooks/useClients'
import { API_CONFIG } from '@/config/api'
```

## CORS & Proxy Setup

- **Development**: Vite proxy handles CORS by forwarding `/api/*` to backend (see `vite.config.ts`)
- **Production**: Backend must have CORS configured to allow `softwareqa.dev` origin
- Detailed CORS troubleshooting notes in `CORS_SOLUTION.md`

## Data Visualization

- **Nivo Charts**: Primary charting library (`@nivo/bar`, `@nivo/line`, `@nivo/pie`, etc.)
- **Recharts**: Secondary option for simpler charts
- Charts use theme colors via CSS variables for dark/light mode consistency

## Form Handling

- **React Hook Form** + **Zod** validation
- Forms should integrate with existing error handling patterns
- Use shadcn/ui Form components for consistent styling

## ESlint Rules

- Unused variables starting with `_` are ignored
- `@typescript-eslint/no-explicit-any` is a warning (not error) - use sparingly
- React component exports must be safe for Fast Refresh (enforce via `react-refresh` plugin)
