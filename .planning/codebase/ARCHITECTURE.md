# Architecture

**Analysis Date:** 2026-02-26

## Pattern Overview

**Overall:** Next.js 15 App Router with Client Component composition pattern

**Key Characteristics:**
- Single-page dashboard using Next.js App Router (React Server Components for layout/pages)
- Component-based UI built with Shadcn/ui (Radix UI + Tailwind CSS)
- Presentation-layer focus (no backend API or business logic layer detected)
- CSS variable-based theming with dark mode support
- Mobile-responsive grid layout

## Layers

**Presentation Layer:**
- Purpose: Render dashboard UI and handle user interactions
- Location: `app/`, `components/`
- Contains: Page layouts, feature cards, UI primitives, header
- Depends on: Shadcn/ui components, Lucide React icons, Tailwind CSS
- Used by: Browser/user

**UI Component Layer:**
- Purpose: Provide reusable styled components and design system primitives
- Location: `components/ui/` (50+ Shadcn/ui components)
- Contains: Button, Card, Input, Select, Dialog, Toast, and other Radix UI wrappers
- Depends on: @radix-ui/*, Tailwind CSS, class-variance-authority
- Used by: Feature components, page components

**Utilities Layer:**
- Purpose: Provide helper functions and utilities
- Location: `lib/utils.ts`, `hooks/`
- Contains: Tailwind class merging (`cn()`), custom hooks (`useIsMobile`, `useToast`)
- Depends on: clsx, tailwind-merge, React
- Used by: Components throughout codebase

**Theme Layer:**
- Purpose: Manage light/dark mode switching
- Location: `app/globals.css`, `components/theme-provider.tsx`, `tailwind.config.ts`
- Contains: CSS custom properties, Tailwind theme extensions, next-themes integration
- Depends on: next-themes, Tailwind CSS
- Used by: All styled components

## Data Flow

**Page Render Flow:**

1. User requests dashboard
2. `app/layout.tsx` (Server Component) loads root layout with metadata
3. `app/page.tsx` (Server Component) renders Dashboard component
4. Dashboard composes five feature card components:
   - DashboardHeader (sticky header with title)
   - QuickStartCard (pull/clone actions)
   - BuildImageCard (form inputs for building images)
   - RunContainerCard (form inputs for running containers)
   - ContainerStatusCard (empty state for container list)
5. Feature cards import and compose Shadcn/ui primitives (Button, Card, Input, Select)
6. Tailwind CSS applies styling based on theme variables
7. HTML rendered to browser
8. Client-side interactivity provided by React event handlers

**State Management:**

- **Page State:** None at page level (Server Components)
- **Local State:** Individual components manage their own state (form inputs, UI state)
- **Theme State:** Managed by `next-themes` provider (persisted to localStorage)
- **Toast State:** Global toast queue managed by `useToast` hook with reducer pattern

**User Interaction Flow:**

1. User interacts with form inputs or buttons
2. Components handle onChange/onClick events locally
3. Form values held in component state (no centralized form state detected)
4. Button clicks trigger undefined handlers (no API integration yet)
5. Toast notifications can be triggered via `useToast()` hook

## Key Abstractions

**Feature Cards:**
- Purpose: Self-contained UI sections for specific Docker management tasks
- Examples: `QuickStartCard`, `BuildImageCard`, `RunContainerCard`, `ContainerStatusCard` in `components/`
- Pattern: Functional React components that compose Shadcn/ui primitives and Lucide icons
- Responsibility: Render card structure, form inputs, and interactive elements for a specific feature

**Shadcn/ui Components:**
- Purpose: Provide accessible, styled UI primitives built on Radix UI
- Examples: `Button`, `Card`, `Input`, `Label`, `Select` in `components/ui/`
- Pattern: ForwardRef functional components with TypeScript props, using `cn()` utility for class merging
- Responsibility: Wrap Radix UI headless components with Tailwind styling and design system tokens

**Custom Hooks:**
- Purpose: Encapsulate reusable React logic
- Examples: `useToast()` (toast notification state), `useIsMobile()` (responsive breakpoint detection)
- Pattern: Hooks with reducer (useToast) or useEffect for lifecycle (useIsMobile)
- Responsibility: Manage state, side effects, and return utilities/values to components

**Theme System:**
- Purpose: Support light/dark mode with CSS variables
- Pattern: CSS custom properties (HSL format) defined in `app/globals.css`, extended in `tailwind.config.ts`
- Implementation: Tailwind theme colors reference CSS variables; next-themes handles mode switching
- Responsibility: Enable consistent styling across light/dark modes without component duplication

## Entry Points

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: Every page request
- Responsibilities: Wrap app with metadata, load global CSS

**Dashboard Page:**
- Location: `app/page.tsx`
- Triggers: GET `/`
- Responsibilities: Render main dashboard with responsive grid layout and all feature cards

**Theme Provider:**
- Location: `components/theme-provider.tsx`
- Triggers: Application startup (if wrapped in provider)
- Responsibilities: Initialize next-themes for dark mode support (currently not used in layout)

## Error Handling

**Strategy:** Not explicitly implemented; relies on React error boundaries (implicit)

**Patterns:**
- No error handling detected for failed API calls (no API integration yet)
- No loading states or error states visible in components
- Toast hook exists but not used for error display
- Form validation not implemented (empty inputs allowed)

## Cross-Cutting Concerns

**Logging:** No logging library detected; console object available but not used

**Validation:** No form validation library integrated; inputs accept any value

**Authentication:** No authentication detected; dashboard is public

**Dark Mode:** Implemented via next-themes provider (not wired to layout) + CSS variables in `app/globals.css` + Tailwind dark mode class

**Theming:** CSS custom properties (HSL format) in `app/globals.css` + Tailwind extensions in `tailwind.config.ts`

---

*Architecture analysis: 2026-02-26*
