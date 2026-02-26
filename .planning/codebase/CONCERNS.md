# Codebase Concerns

**Analysis Date:** 2026-02-26

## Tech Debt

**Build Configuration Ignores Type and Lint Errors:**
- Issue: `next.config.mjs` intentionally suppresses TypeScript and ESLint errors during build
- Files: `next.config.mjs` (lines 16-21)
- Impact: Broken code can be deployed to production without detection. Type safety errors are silently masked, making the codebase more fragile over time
- Fix approach: Remove `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` flags. Address actual errors instead of suppressing them. If intentional, document the specific errors being ignored

**No Linting Configuration:**
- Issue: No `.eslintrc`, `eslint.config.js`, or biome config present despite ESLint being runnable
- Files: Root directory (missing config)
- Impact: Code style inconsistencies not caught. No enforced best practices. PR reviews must catch style issues manually
- Fix approach: Create `.eslintrc.json` or `eslint.config.js` with Next.js/React recommended rules. Add pre-commit hooks to enforce linting

**Missing Environment Configuration:**
- Issue: No `.env.example`, `.env.local.example`, or documented environment variables
- Files: Root directory (missing file)
- Impact: Developers cannot set up the project without guessing which env vars are needed. No clear indication of required secrets or configuration
- Fix approach: Create `.env.example` documenting all required variables with placeholder values

## Known Issues

**Interactive Components Without Handlers:**
- Symptoms: Buttons and form inputs appear clickable but do nothing (no handlers attached)
- Files: `components/quick-start-card.tsx` (lines 17-32), `components/build-image-card.tsx` (lines 35), `components/run-container-card.tsx` (line 26), `components/container-status-card.tsx` (line 16)
- Trigger: Click any button; select any dropdown; type in any input field
- Workaround: None currently - these are UI placeholders

**Unimplemented Container Status Display:**
- Symptoms: Container Status card shows static "No active containers" placeholder
- Files: `components/container-status-card.tsx` (lines 20-27)
- Trigger: Navigate to dashboard page
- Workaround: None - requires API integration to fetch real container status

**Incomplete Dashboard Functionality:**
- Symptoms: Dashboard displays UI but no actual Docker operations execute
- Files: `app/page.tsx`, all feature cards in `components/`
- Trigger: Any user interaction with cards
- Workaround: Manual Docker operations via CLI required

## Test Coverage Gaps

**Zero Test Coverage:**
- What's not tested: Entire codebase - no test files exist
- Files: All `.ts` and `.tsx` files have no corresponding `.test.ts`, `.spec.ts`, or `.test.tsx` files
- Risk: Regressions introduced silently. Component refactoring may break functionality undetected. UI changes could affect accessibility or usability
- Priority: High - even basic component render tests would help catch breaking changes

**No Integration Tests:**
- What's not tested: Component interaction with external systems (Docker API, authentication)
- Files: All feature components in `components/` directory
- Risk: API integration bugs discovered only in production. Serialization/deserialization errors not caught
- Priority: High - required for backend integration

**No End-to-End Tests:**
- What's not tested: Full user workflows (build image → run container → view status)
- Files: Entire application
- Risk: Common user flows may be broken without detection. UI-level bugs missed
- Priority: Medium - necessary before production deployment

## Security Considerations

**No Input Validation:**
- Risk: Unvalidated user input in form fields could be injected into Docker commands
- Files: `components/build-image-card.tsx` (Input at line 33), `components/run-container-card.tsx` (Inputs at lines 20, 24)
- Current mitigation: None - inputs pass through directly
- Recommendations: Implement zod schema validation before sending to backend API. Sanitize container names to alphanumeric + dashes/underscores only

**Missing CSRF Protection:**
- Risk: Cross-site request forgery attacks if dashboard is accessed via browser
- Files: All form-submitting components lack token verification
- Current mitigation: None detected
- Recommendations: Implement SameSite cookie attributes. Add CSRF token validation on backend API endpoints

**Unencrypted Credentials:**
- Risk: Docker daemon connection credentials (if passed via env vars) may be exposed
- Files: `next.config.mjs`, environment configuration (not visible but risk exists)
- Current mitigation: Unknown - no evidence of credential masking
- Recommendations: Use Docker socket over TCP with mTLS. Never log credentials. Implement secret rotation

**No Rate Limiting:**
- Risk: Endpoints accepting Docker operations (build image, run container) are unlimited
- Files: Feature cards trigger backend calls (not yet implemented)
- Current mitigation: None
- Recommendations: Implement rate limiting on API endpoints. Track resource usage per user/session

## Performance Bottlenecks

**Tailwind CSS with 50+ UI Components:**
- Problem: All 50+ Shadcn UI components imported/bundled even if unused
- Files: `components/ui/` directory (4841 total lines across 50+ component files)
- Cause: Wildcard imports and full component library installed via `pnpm dlx shadcn@latest add`
- Improvement path: Audit actual component usage. Remove unused components from `components/ui/`. Use dynamic imports for rarely-used components

**No Image Optimization:**
- Problem: Image optimization disabled in Next.js config
- Files: `next.config.mjs` (line 23: `unoptimized: true`)
- Cause: Suitable for static export but impacts page load performance
- Improvement path: If not doing static export, enable `next/image` optimization. Implement image compression pipeline

**Toast System Memory Leak Risk:**
- Problem: Toast timeouts may accumulate if toasts dismissed before timeout completes
- Files: `hooks/use-toast.ts` (lines 59-75, 145-172)
- Cause: `toastTimeouts` Map is never cleared on cleanup; timeouts added to queue but mapping could grow unbounded with rapid toast creation/dismissal
- Improvement path: Implement cleanup of dangling timeouts. Add garbage collection for old toast IDs. Cap Map size with LRU eviction

## Fragile Areas

**Theme Provider Wrapper Pattern:**
- Files: `components/theme-provider.tsx` (11 lines)
- Why fragile: Bare wrapper around NextThemesProvider with no error boundary or fallback. If NextThemesProvider fails to initialize, entire app becomes unstyled
- Safe modification: Add ErrorBoundary wrapper. Test with next-themes disabled. Provide CSS fallbacks in globals.css
- Test coverage: No tests for dark mode theme switching

**Dynamic Mobile Breakpoint:**
- Files: `hooks/use-mobile.tsx` (line 3: `MOBILE_BREAKPOINT = 768`)
- Why fragile: Hardcoded breakpoint duplicates Tailwind's `md` breakpoint. If Tailwind config changes, logic silently breaks
- Safe modification: Extract to constants file. Validate against Tailwind config at build time
- Test coverage: No tests for breakpoint logic or SSR mismatch

**Component Composition in Page Layout:**
- Files: `app/page.tsx` (lines 12-17)
- Why fragile: Direct component imports with no error boundaries. Single card crash breaks entire dashboard
- Safe modification: Wrap each card in error boundary. Add try-catch around component renders
- Test coverage: No tests for component composition or error states

**CSS Variables Color System:**
- Files: `app/globals.css` (lines 15-84)
- Why fragile: 15+ CSS variables for light/dark modes. Changes to one var could break multiple components silently
- Safe modification: Create comprehensive color palette documentation. Test color contrast ratios. Add automated WCAG validation
- Test coverage: No visual regression tests

## Scaling Limits

**Current Capacity:**
- Single-page dashboard with hardcoded component layout
- No pagination or virtualization for large lists
- No caching strategy for container status queries

**Where It Breaks:**
- ContainerStatusCard with hundreds of containers will render all at once (no virtualization)
- BuildImageCard will block UI while building (no async operation feedback)
- RunContainerCard offers no indication of container creation progress

**Scaling Path:**
- Implement React Suspense boundaries for long-running operations
- Add virtualization with react-window for container lists exceeding 50 items
- Implement request caching with stale-while-revalidate strategy
- Add request queue to prevent simultaneous Docker operations overwhelming host

## Dependencies at Risk

**next-themes ^0.4.4:**
- Risk: Older theme provider, newer versions may have breaking changes
- Impact: Dark mode switching could fail in next major version
- Migration plan: Upgrade to 0.5+ when available. Test theme persistence. Check for API changes in NextThemesProvider

**recharts 2.15.0:**
- Risk: Floating dependency version without patch lock may introduce breaking changes
- Impact: Chart rendering could break if minor update includes breaking changes
- Migration plan: Pin to exact version. Test chart rendering after upgrades. Consider alternative charting libraries

**Radix UI 1.x (Multiple Packages):**
- Risk: Large number of Radix UI dependencies (20+ packages) create complex dependency tree
- Impact: Version conflicts possible. Security updates across all packages needed
- Migration plan: Consolidate to latest Radix versions. Implement dependabot alerts

## Missing Critical Features

**Docker Integration:**
- Problem: No actual Docker API connection implemented
- Blocks: All core functionality (building images, running containers, viewing status)

**Authentication & Authorization:**
- Problem: No user auth or permission system
- Blocks: Multi-user deployments. Access control

**Real-time Updates:**
- Problem: Container status card is static placeholder
- Blocks: Live monitoring of running containers

**Error Handling & User Feedback:**
- Problem: No error boundaries. No loading states. No success/failure notifications
- Blocks: Production deployment. User experience

**Form State Management:**
- Problem: Forms accept input but don't validate or submit anywhere
- Blocks: Functional dashboard interactions

---

*Concerns audit: 2026-02-26*
