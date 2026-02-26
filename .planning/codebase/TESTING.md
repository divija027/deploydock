# Testing Patterns

**Analysis Date:** 2026-02-26

## Test Framework

**Runner:**
- Not detected. No Jest, Vitest, or other test framework configured
- No test configuration files found (`jest.config.*`, `vitest.config.*`, etc.)
- No test files in source code (only in node_modules from dependencies)

**Assertion Library:**
- Not applicable - no testing framework configured

**Run Commands:**
```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint (currently configured to ignore errors during build)
```

Note: No dedicated test command exists in `package.json` scripts.

## Test File Organization

**Location:**
- No test files found in application source code
- No `__tests__` directories
- No `.test.ts` or `.spec.ts` files in `/app`, `/components`, `/hooks`, or `/lib`

**Naming:**
- Not applicable - no tests configured

**Structure:**
- Not applicable - no tests configured

## Test Structure

**Suite Organization:**
- Not applicable - no testing framework configured

**Patterns:**
- Not applicable - no testing framework configured

## Mocking

**Framework:**
- Not applicable - no testing framework configured

**Patterns:**
- Not applicable - no testing framework configured

**What to Mock:**
- Not applicable - no testing framework configured

**What NOT to Mock:**
- Not applicable - no testing framework configured

## Fixtures and Factories

**Test Data:**
- Not applicable - no testing framework configured

**Location:**
- Not applicable - no testing framework configured

## Coverage

**Requirements:**
- Not enforced. No coverage configuration detected.

**View Coverage:**
- Not applicable - no test runner configured

## Test Types

**Unit Tests:**
- Not implemented. The codebase does not include unit tests.
- Custom hooks like `useIsMobile()` and `useToast()` lack unit test coverage
- Utility functions like `cn()` lack test coverage

**Integration Tests:**
- Not implemented. The codebase does not include integration tests.
- Component interactions (e.g., form submission, state updates) are not tested
- No test fixtures or mocking for API calls or external dependencies

**E2E Tests:**
- Not implemented. No E2E testing framework detected (no Playwright, Cypress, etc.)
- Manual testing would be required to validate Dashboard flows

## Testing Status

**Critical Gap:** This codebase has zero test coverage. No testing framework, no test files, and no CI/CD test pipeline.

**Untested Areas:**
- `hooks/use-mobile.tsx` - Media query hook logic for responsive behavior
- `hooks/use-toast.ts` - Complex state management with reducer pattern, timeout handling
- `lib/utils.ts` - Class name merging utility (`cn()`)
- `components/dashboard-header.tsx` - Header rendering and styling
- `components/quick-start-card.tsx` - Card with button grid layout
- `components/build-image-card.tsx` - Form with Select and Input components
- `components/run-container-card.tsx` - Form with Input and Button components
- `components/container-status-card.tsx` - Container status display
- `app/layout.tsx` - Root layout structure
- `app/page.tsx` - Dashboard page composition

**Recommendation:** Implement a testing framework (Jest with React Testing Library or Vitest) to establish baseline coverage for critical paths:
1. Hook behavior (`useIsMobile`, `useToast`)
2. Component rendering and interactions
3. Utility function correctness
4. Form validation with `react-hook-form`

## Next Steps to Add Testing

**Setup Jest + React Testing Library:**
1. Install dev dependencies: `pnpm add -D jest @testing-library/react @testing-library/jest-dom @types/jest jest-environment-jsdom`
2. Create `jest.config.js` with Next.js preset
3. Create `jest.setup.js` to configure testing library
4. Add test scripts to `package.json`: `"test": "jest"`, `"test:watch": "jest --watch"`

**Setup file structure:**
- Place test files co-located with source: `components/button.test.tsx`, `hooks/use-mobile.test.tsx`
- Create `__tests__/` directory for integration and shared test utilities

**Suggested test patterns:**
- Mock Next.js Image and Link components
- Use userEvent for interactions instead of fireEvent
- Use screen queries for accessibility-first testing

---

*Testing analysis: 2026-02-26*
