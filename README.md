# Mealer

A Progressive Web App (PWA) that intelligently matches online recipes with your kitchen inventory,
using AI to digitize grocery receipts, track available ingredients,
and suggest recipe modifications based on what you actually have in your fridge.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

Mealer solves the "what's for dinner?" dilemma by acting as a smart bridge between grocery shopping and meal preparation. The MVP targets the Polish market, operating entirely in the Polish language.

### Key Features

- **Receipt Scanning** – Take a photo of your grocery receipt and let AI (OCR + LLM) extract items and quantities automatically
- **Inventory Management** – Track your kitchen inventory with manual entry, quick-add autocomplete, and pantry staples toggles
- **Recipe Intelligence** – Paste a recipe URL from supported Polish recipe sites and get ingredient analysis
- **AI Substitution Suggestions** – Get smart recommendations for ingredient substitutions based on what you have available
- **Cooking Flow** – Mark recipes as cooked and automatically deduct ingredients from your inventory

### Problem It Solves

Home cooks often struggle to utilize the food they buy, leading to waste and frustration. Mealer bridges the gap between shopping receipts and recipe books, helping users:

- Avoid manual inventory management through AI-powered receipt scanning
- Find substitutions for missing recipe ingredients using available items
- Reduce food waste by cooking with what they already have

## Tech Stack

| Category     | Technology      | Purpose                                            |
| ------------ | --------------- | -------------------------------------------------- |
| **Frontend** | Next.js 15      | React framework with PWA support and API routes    |
|              | React 19        | Interactive, stateful user interfaces              |
|              | TypeScript 5    | Compile-time type safety                           |
|              | Tailwind 4      | Utility-first CSS framework                        |
|              | Shadcn/ui       | Accessible, customizable component library         |
| **Backend**  | Supabase        | Authentication, PostgreSQL database, storage, RLS  |
| **AI**       | OpenRouter.ai   | Multi-LLM provider API for OCR and recipe analysis |
| **CI/CD**    | GitHub Actions  | Automated testing and deployment                   |
| **Hosting**  | DigitalOcean    | Cost-effective hosting infrastructure              |
| **Testing**  | Vitest          | Unit & integration test runner for Next.js/TS      |
|              | Testing Library | React component testing utilities                  |
|              | MSW             | API mocking for integration tests                  |
|              | Playwright      | Cross-browser E2E testing with mobile emulation    |

## Getting Started Locally

### Prerequisites

- Node.js **22.22.0** (use [nvm](https://github.com/nvm-sh/nvm) for version management)
- [pnpm](https://pnpm.io/) package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/mealer.git
   cd mealer
   ```

2. **Set Node.js version**

   ```bash
   nvm use
   ```

3. **Install dependencies**

   ```bash
   pnpm install
   ```

4. **Start the development server**

   ```bash
   pnpm dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

| Script             | Command                 | Description                                            |
| ------------------ | ----------------------- | ------------------------------------------------------ |
| `dev`              | `pnpm dev`              | Start the development server with hot reload           |
| `build`            | `pnpm build`            | Create an optimized production build                   |
| `start`            | `pnpm start`            | Start the production server                            |
| `lint`             | `pnpm lint`             | Run ESLint to check code quality                       |
| `prepare`          | `pnpm prepare`          | Set up Husky git hooks (runs automatically on install) |
| `test`             | `pnpm test`             | Run unit tests with Vitest                             |
| `test:watch`       | `pnpm test:watch`       | Run unit tests in watch mode                           |
| `test:ui`          | `pnpm test:ui`          | Open Vitest UI for visual test navigation              |
| `test:coverage`    | `pnpm test:coverage`    | Run unit tests with coverage report                    |
| `test:e2e`         | `pnpm test:e2e`         | Run E2E tests with Playwright                          |
| `test:e2e:ui`      | `pnpm test:e2e:ui`      | Open Playwright UI mode for interactive testing        |
| `test:e2e:headed`  | `pnpm test:e2e:headed`  | Run E2E tests with visible browser                     |
| `test:e2e:debug`   | `pnpm test:e2e:debug`   | Debug E2E tests step by step                           |
| `test:e2e:codegen` | `pnpm test:e2e:codegen` | Record new E2E tests with Playwright codegen           |

## Project Scope

### In Scope (MVP)

- PWA development for mobile usage
- Polish language interface and receipt recognition
- User accounts with Email/Password authentication
- Receipt scanning via camera and image upload
- Inventory CRUD operations
- Recipe link parsing and ingredient extraction
- AI-powered substitution suggestions
- Local storage for recipe history (IndexedDB)
- Mandatory onboarding for dietary restrictions and kitchen equipment

### Out of Scope (MVP)

- Native mobile apps (App Store/Play Store)
- Social login providers (Google/Facebook/Apple)
- Meal planning features (calendar/schedule)
- Social sharing or community features
- Food image recognition
- Nutritional statistics and calorie tracking
- Offline mode
- Multiple language support
- Shopping list generation
- Push notifications
- Barcode scanning
- Expiration date tracking

### Technical Constraints

- Requires active internet connection for all features
- Receipt scanning accuracy depends on image quality
- AI processing limited by daily quotas per user
- Recipe parsing limited to supported websites
- PWA limitations on iOS (camera access, notifications)
- Client-side storage subject to browser limitations

## Project Status

🚧 **MVP In Development**

This project is currently in the MVP development phase.

## License

This is a private project. All rights reserved.
