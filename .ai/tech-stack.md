# Recommended Tech Stack

## Frontend

- **Next.js 15** – Unified React framework with first-class PWA support, API routes for server-side proxy, and the largest ecosystem for interactive web applications.
- **React 19** – Industry-standard library for building interactive, stateful user interfaces with excellent mobile browser support.
- **TypeScript 5** – Provides compile-time type safety that reduces bugs and improves maintainability as the codebase grows.
- **Tailwind 4** – Utility-first CSS framework enabling rapid, consistent styling without context-switching between files.
- **Shadcn/ui** – Pre-built, accessible component library that accelerates UI development while remaining fully customizable.

## Backend

- **Supabase** – Provides authentication, PostgreSQL database, storage, and Row Level Security out of the box, dramatically reducing backend development time for MVPs.

## AI

- **OpenRouter.ai** – Abstracts multiple LLM providers (OpenAI, Anthropic, etc.) behind a single API, allowing cost optimization and avoiding vendor lock-in for OCR and recipe analysis features.

## CI/CD & Hosting

- **GitHub Actions** – Native integration with your repository for automated testing and deployment pipelines without additional tooling.
- **DigitalOcean** – Cost-effective hosting with straightforward scaling, well-suited for early-stage products targeting a single market (Poland).

## Testing

### Unit & Integration Tests

- **Vitest** – Fast, Vite-native test runner with excellent TypeScript and Next.js support, compatible with Jest APIs.
- **Testing Library** – React component testing utilities promoting accessible, user-centric test patterns.
- **MSW (Mock Service Worker)** – API mocking at the network level for realistic integration tests without backend dependencies.

### End-to-End Tests

- **Playwright** – Cross-browser E2E testing framework with built-in mobile device emulation, visual regression via snapshots, and parallel test execution.
- **@axe-core/playwright** – Automated accessibility testing integrated directly into E2E test flows for WCAG compliance verification.
