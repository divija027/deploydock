# Coding Conventions

**Analysis Date:** 2026-02-26

## Naming Patterns

**Files:**
- PascalCase for component files: `DashboardHeader.tsx`, `QuickStartCard.tsx`, `BuildImageCard.tsx`, `RunContainerCard.tsx`, `ContainerStatusCard.tsx`
- camelCase for hook files: `use-mobile.tsx`, `use-toast.ts`
- kebab-case with `.tsx` extension for shadcn/ui components: `button.tsx`, `card.tsx`, `input.tsx`, `select.tsx`
- Lowercase for utility files: `utils.ts`

**Functions:**
- camelCase for all function names: `useIsMobile()`, `useToast()`, `genId()`, `cn()`, `addToRemoveQueue()`
- Exported functions are named, not anonymous
- React components use PascalCase: `DashboardHeader`, `Button`, `Card`, `Input`
- Private helper functions remain camelCase: `reducer()`, `dispatch()`, `toast()`

**Variables:**
- camelCase for constants and variables: `MOBILE_BREAKPOINT`, `TOAST_LIMIT`, `TOAST_REMOVE_DELAY`, `toastTimeouts`, `memoryState`
- All-caps with underscores for constant literals: `MOBILE_BREAKPOINT = 768`, `TOAST_LIMIT = 1`
- React state variables follow camelCase: `isMobile`, `state`, `listeners`, `count`

**Types:**
- PascalCase for interface names: `ToastActionElement`, `ToastProps`, `ToasterToast`, `ButtonProps`, `State`
- Generic type parameters use single capitals: `TFieldValues`, `TName`
- Type imports use `type` keyword: `import type { Metadata } from 'next'`

## Code Style

**Formatting:**
- No explicit linter/formatter configuration detected in `.eslintrc` or `.prettierrc`
- Next.js default linting configured in `next.config.mjs` with ESLint and TypeScript errors intentionally ignored during build
- Code appears to follow standard React/Next.js formatting conventions
- Imports organized with standard first-party then third-party pattern

**Linting:**
- ESLint errors ignored during build (see `next.config.mjs`: `eslint: { ignoreDuringBuilds: true }`)
- TypeScript errors ignored during build (`typescript: { ignoreBuildErrors: true }`)
- Code uses strict TypeScript mode as configured in `tsconfig.json`: `"strict": true`

## Import Organization

**Order:**
1. React/Next.js core imports: `import * as React from 'react'`, `import type { Metadata } from 'next'`
2. Third-party library imports: `import { clsx } from 'clsx'`, `import { twMerge } from 'tailwind-merge'`, `import * as LabelPrimitive from '@radix-ui/react-label'`
3. Local component imports using path alias: `import { DashboardHeader } from '@/components/dashboard-header'`
4. Local utility imports: `import { cn } from '@/lib/utils'`
5. Icon imports: `import { DockIcon as Docker } from 'lucide-react'`, `import { Download, Github, Terminal } from 'lucide-react'`

**Path Aliases:**
- `@/*` maps to project root (defined in `tsconfig.json`)
- `@/components` → component files
- `@/components/ui` → shadcn/ui components
- `@/lib` → utility functions
- `@/hooks` → custom hooks
- Used consistently throughout codebase for local imports

## Error Handling

**Patterns:**
- No explicit error boundaries or try-catch patterns in components
- Form validation via `react-hook-form` with `zod` schema validation (in dependencies)
- Default values used in controlled forms: `<Select defaultValue="web">`
- Component-level state management with `React.useState()` and context API
- Toast system for user feedback via `useToast()` hook and `Toaster` component

## Logging

**Framework:** No logging library detected. Uses browser `console` if needed.

**Patterns:**
- No console logs found in source code
- No explicit logging configuration
- Comments used for clarification in complex logic (see `use-toast.ts`: `// ! Side effects ! - This could be extracted into a dismissToast() action, but I'll keep it here for simplicity`)

## Comments

**When to Comment:**
- Comments used for design decisions and side effects in hooks (see `use-toast.ts`)
- Comments explain non-obvious logic or trade-offs
- No JSDoc/TSDoc comments found in feature components or hooks

**JSDoc/TSDoc:**
- Not used in application code
- shadcn/ui components have minimal documentation
- Types are self-documenting via TypeScript interfaces

## Function Design

**Size:**
- Components range from 6 lines (DashboardHeader) to ~37 lines (QuickStartCard)
- Utility functions are concise: `cn()` is 3 lines, `useIsMobile()` is 20 lines
- Hooks with complex logic (like `use-toast.ts`) can be 195 lines total but are split into logical sections

**Parameters:**
- Components destructure props: `({ children, ...props })`
- Functions use typed parameters: `(inputs: ClassValue[])`
- React.forwardRef used for DOM-exposing components: `React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>`
- Slot pattern used for composition: `const Comp = asChild ? Slot : "button"`

**Return Values:**
- Components return JSX
- Hooks return objects or primitives
- Utility functions return processed values directly
- React.forwardRef components explicitly return DOM elements or Slot

## Module Design

**Exports:**
- Named exports used for components: `export function DashboardHeader()`
- Named exports for utilities: `export function cn(...inputs)`
- Named exports for hooks: `export function useIsMobile()`, `export { useToast, toast }`
- Multiple related items can be exported from single file: Card exports 5 sub-components

**Barrel Files:**
- Not used in feature components
- `components/ui/` exports multiple UI primitives from single files (e.g., `card.tsx` exports Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent)
- Application components located individually in `components/` directory

## Component Patterns

**React Patterns:**
- Functional components with hooks
- `React.forwardRef()` for components that need DOM refs
- Context API for theme management (`ThemeProvider` wrapping `NextThemesProvider`)
- Custom hooks for reusable state logic
- Event handlers passed via standard props: `onClick`, `onChange`, `onOpenChange`

**Tailwind CSS:**
- Utility-first approach with class strings
- Dynamic classes merged via `cn()` utility function (combines `clsx` + `tailwind-merge`)
- CSS variables for theming: `--background`, `--foreground`, `--primary`, etc. (see `globals.css`)
- Class variance authority (`cva`) used for component variants (see `button.tsx`: `buttonVariants` with `variant` and `size` options)

**Shadcn/ui Integration:**
- Components added via `pnpm dlx shadcn@latest add <component>` (not manually)
- Located in `components/ui/` directory
- Never modified directly
- Re-exported and composed into feature components

---

*Convention analysis: 2026-02-26*
