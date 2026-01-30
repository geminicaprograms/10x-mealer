# Mealer Application - Comprehensive Test Plan

## 1. Introduction and Testing Objectives

### 1.1 Introduction

This test plan defines the testing strategy for Mealer, a Progressive Web Application (PWA) designed to help users manage kitchen inventory and adapt online recipes based on available ingredients. The application targets the Polish market and integrates AI-powered features for receipt scanning and ingredient substitution suggestions.

### 1.2 Testing Objectives

- Validate core functionality: authentication, inventory management, recipe parsing, and AI features
- Ensure reliability of external service integrations (Supabase, OpenRouter.ai)
- Verify security controls including authentication, SSRF protection, and rate limiting
- Confirm proper error handling and graceful degradation
- Validate data integrity across all database operations
- Ensure accessibility compliance for mobile browser usage
- Verify Polish language support throughout the application

## 2. Test Scope

### 2.1 In Scope

| Module                  | Features                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- |
| **Authentication**      | Registration, login, logout, password reset, session management, account deletion |
| **User Profile**        | Onboarding flow, dietary restrictions, equipment management                       |
| **Inventory**           | CRUD operations, batch operations, staples management, filtering, pagination      |
| **Receipt Scanning**    | Image upload, OCR processing, product matching, verification workflow             |
| **Recipe Intelligence** | URL parsing, text parsing, ingredient extraction, domain validation               |
| **AI Substitutions**    | Ingredient analysis, substitution suggestions, allergy warnings                   |
| **Cooking Flow**        | "Cooked This" action, inventory deduction, usage confirmation                     |
| **API Layer**           | All REST endpoints, error responses, validation                                   |
| **Security**            | Authentication, authorization, SSRF protection, rate limiting                     |

### 2.2 Out of Scope

- Native mobile applications (iOS/Android)
- Offline functionality
- Social login providers (Google/Facebook/Apple)
- Meal planning and calendar features
- Push notifications
- Multi-language support (Polish only for MVP)
- Performance testing under high load (beyond basic load testing)

## 3. Types of Tests

### 3.1 Unit Tests

**Scope:** Individual functions, services, and utility modules

**Target Modules:**

- `src/lib/services/auth.service.ts` - Password verification, confirmation text validation
- `src/lib/services/inventory.service.ts` - Validation schemas, mapping functions
- `src/lib/services/recipe.service.ts` - URL validation, domain checking, content extraction
- `src/lib/services/openrouter.service.ts` - Response parsing, retry logic, mock data
- `src/lib/services/ai.service.ts` - Rate limit checking, product matching
- `src/lib/api/errors.ts` - Error response formatting
- `src/lib/utils/db.ts` - Database helper functions

**Coverage Target:** 80% code coverage

### 3.2 Integration Tests

**Scope:** API route handlers with mocked Supabase and OpenRouter services

**Target Endpoints:**

- `POST /api/auth/delete-account`
- `GET/POST/PUT/DELETE /api/inventory/*`
- `POST /api/inventory/deduct`
- `POST /api/inventory/staples/init`
- `POST /api/ai/scan-receipt`
- `POST /api/ai/substitutions`
- `GET /api/ai/usage`
- `POST /api/recipes/parse`
- `POST /api/recipes/parse-text`
- `GET/PUT /api/profile`
- `GET /api/config`
- `GET /api/categories`, `/api/units`, `/api/staples`

### 3.3 End-to-End Tests

**Scope:** Critical user flows through the UI

**Target Flows:**

1. New user registration → onboarding → first inventory item
2. Receipt scanning → verification → inventory creation
3. Recipe URL import → substitution analysis → "Cooked This"
4. Account deletion with confirmation

### 3.4 Component Tests

**Scope:** React components in isolation

**Target Components:**

- Authentication forms (`LoginForm`, `RegisterForm`, `ResetPasswordForm`)
- Inventory components (`InventoryItemCard`, `QuickAddSheet`, `StaplesList`)
- Recipe components (`RecipeInputSection`, `IngredientsList`, `CookedThisDialog`)
- Shared UI components (`ErrorBoundary`, `OfflineIndicator`, `SessionExpiredDialog`)

### 3.5 Security Tests

**Scope:** Authentication, authorization, and input validation

**Areas:**

- SSRF protection in recipe parsing
- SQL injection prevention (Supabase parameterized queries)
- XSS prevention in user inputs
- Rate limiting enforcement
- Session token handling
- CORS configuration

### 3.6 Accessibility Tests

**Scope:** WCAG 2.1 Level AA compliance

**Areas:**

- Keyboard navigation
- Screen reader compatibility
- Color contrast ratios
- Form label associations
- Focus management

## 4. Test Scenarios for Key Functionalities

### 4.1 Authentication Module

| ID       | Scenario                            | Steps                                                        | Expected Result                                       |
| -------- | ----------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| AUTH-001 | Successful registration             | Enter valid email, strong password, confirm password, submit | Account created, redirect to onboarding               |
| AUTH-002 | Registration with weak password     | Enter password without uppercase                             | Validation error: "Hasło musi zawierać wielką literę" |
| AUTH-003 | Registration with existing email    | Register with already used email                             | Error: "User already registered"                      |
| AUTH-004 | Successful login                    | Enter valid credentials                                      | Session created, redirect to inventory                |
| AUTH-005 | Login with invalid credentials      | Enter wrong password                                         | Error: "Invalid login credentials"                    |
| AUTH-006 | Password reset flow                 | Request reset, click email link, set new password            | Password updated, can login with new password         |
| AUTH-007 | Session expiration handling         | Wait for token expiry                                        | Session refresh occurs silently                       |
| AUTH-008 | Account deletion                    | Enter password, type "USUŃ MOJE KONTO", confirm              | Account deleted, redirect to landing page             |
| AUTH-009 | Account deletion wrong confirmation | Enter incorrect confirmation text                            | Validation error displayed                            |
| AUTH-010 | Protected route without auth        | Navigate to /inventory without login                         | Redirect to /login with redirect parameter            |

### 4.2 Inventory Management Module

| ID      | Scenario                         | Steps                                                    | Expected Result                                       |
| ------- | -------------------------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| INV-001 | Add product via Quick Add        | Open sheet, search product, select, set quantity, submit | Item appears in inventory list                        |
| INV-002 | Add custom product               | Open sheet, enter custom name, set quantity/unit         | Custom item created with custom_name                  |
| INV-003 | Update item quantity             | Click edit, change quantity, save                        | Quantity updated, updated_at changed                  |
| INV-004 | Delete single item               | Click delete, confirm                                    | Item removed from list, count decremented             |
| INV-005 | Batch delete items               | Select multiple, delete                                  | All selected items removed                            |
| INV-006 | Filter by category               | Select category from dropdown                            | Only items in category displayed                      |
| INV-007 | Search inventory                 | Type search term                                         | Matching items displayed                              |
| INV-008 | Load more pagination             | Scroll to bottom                                         | Next page loaded, items appended                      |
| INV-009 | Toggle staple availability       | Click staple toggle                                      | Optimistic UI update, server synced                   |
| INV-010 | Initialize staples               | Click initialize button                                  | Staple items created from definitions                 |
| INV-011 | Add item with invalid product_id | Send request with non-existent product_id                | Error: "product_id X not found in product_catalog"    |
| INV-012 | Staple with quantity             | Try to create staple with quantity                       | Validation error: "Staple items cannot have quantity" |

### 4.3 Receipt Scanning Module

| ID       | Scenario                             | Steps                                | Expected Result                               |
| -------- | ------------------------------------ | ------------------------------------ | --------------------------------------------- |
| SCAN-001 | Successful receipt scan              | Upload clear receipt image           | Items extracted with confidence scores        |
| SCAN-002 | Verify and edit scanned items        | Review items, edit name, delete item | Modified items ready for save                 |
| SCAN-003 | Add missing item during verification | Click "Add missing", enter item      | Item added to verification list               |
| SCAN-004 | Save verified items to inventory     | Confirm verification                 | Items created in inventory                    |
| SCAN-005 | Scan with rate limit exceeded        | Attempt scan after daily limit       | Error: "Daily scan limit exceeded"            |
| SCAN-006 | Scan blurry/unreadable image         | Upload poor quality image            | LLM returns empty/low-confidence results      |
| SCAN-007 | Product catalog matching             | Scan receipt with known products     | Products matched with IDs and suggested units |
| SCAN-008 | Mock mode operation                  | Scan with USE_AI_MOCKS=true          | Mock data returned successfully               |

### 4.4 Recipe Intelligence Module

| ID         | Scenario                      | Steps                           | Expected Result                                      |
| ---------- | ----------------------------- | ------------------------------- | ---------------------------------------------------- |
| RECIPE-001 | Parse recipe from valid URL   | Enter kwestiasmaku.com URL      | Title and ingredients extracted                      |
| RECIPE-002 | Parse from unsupported domain | Enter unsupported URL           | Error: "Domain not supported for recipe parsing"     |
| RECIPE-003 | Parse from HTTP URL           | Enter http:// URL               | Error: "Only HTTPS URLs are allowed"                 |
| RECIPE-004 | Parse from private IP         | Enter http://192.168.1.1/...    | SSRF blocked: "Private IP addresses are not allowed" |
| RECIPE-005 | Parse raw text                | Paste ingredient list           | Ingredients extracted from text                      |
| RECIPE-006 | JSON-LD extraction            | Parse page with Recipe schema   | Structured data extracted accurately                 |
| RECIPE-007 | Fallback DOM extraction       | Parse page without JSON-LD      | CSS selectors extract ingredients                    |
| RECIPE-008 | 404 recipe page               | Enter URL to deleted recipe     | Error: "Recipe page not found"                       |
| RECIPE-009 | Timeout handling              | Parse very slow responding site | Error: "Request timeout while fetching recipe page"  |

### 4.5 AI Substitutions Module

| ID        | Scenario                | Steps                                      | Expected Result                           |
| --------- | ----------------------- | ------------------------------------------ | ----------------------------------------- |
| SUBST-001 | Available ingredient    | Analyze recipe with all items in inventory | Status: "available" for all               |
| SUBST-002 | Missing ingredient      | Analyze with missing item                  | Status: "missing", substitution suggested |
| SUBST-003 | Partial quantity        | Analyze with insufficient quantity         | Status: "partial", suggestion provided    |
| SUBST-004 | Allergy warning         | Recipe contains user's allergen            | allergy_warning populated                 |
| SUBST-005 | Substitution rate limit | Exceed daily limit                         | Error: "Rate limit exceeded"              |
| SUBST-006 | Empty inventory         | Analyze with no inventory                  | All items marked "missing"                |

### 4.6 Cooking Flow Module

| ID       | Scenario                 | Steps                                | Expected Result                          |
| -------- | ------------------------ | ------------------------------------ | ---------------------------------------- |
| COOK-001 | Successful deduction     | Click "Cooked This", confirm amounts | Quantities deducted from inventory       |
| COOK-002 | Modify deduction amounts | Edit amounts in modal, confirm       | Custom amounts deducted                  |
| COOK-003 | Deduction to zero        | Deduct entire quantity               | Item deleted from inventory              |
| COOK-004 | Insufficient quantity    | Try to deduct more than available    | Error: "Insufficient quantity"           |
| COOK-005 | Staple deduction attempt | Try to deduct from staple            | Error: "Cannot deduct from staple items" |

### 4.7 User Profile Module

| ID          | Scenario              | Steps                              | Expected Result                    |
| ----------- | --------------------- | ---------------------------------- | ---------------------------------- |
| PROFILE-001 | Complete onboarding   | Select allergies, diets, equipment | Profile saved, status: "completed" |
| PROFILE-002 | Skip all selections   | Select "None" for all              | Valid profile with empty arrays    |
| PROFILE-003 | Update allergies      | Add/remove allergen                | Profile updated                    |
| PROFILE-004 | Invalid allergy value | Send unsupported allergy           | Validation error returned          |

## 5. Test Environment

### 5.1 Development Environment

- **OS:** macOS/Linux/Windows
- **Node.js:** Version specified in `.nvmrc`
- **Package Manager:** pnpm
- **Database:** Local Supabase instance (Docker)
- **AI Services:** Mock mode (`USE_AI_MOCKS=true`)

### 5.2 Staging Environment

- **Hosting:** DigitalOcean App Platform
- **Database:** Supabase Cloud (staging project)
- **AI Services:** OpenRouter.ai (sandbox API key)
- **URL:** `https://staging.mealer.app`

### 5.3 Production Environment

- **Hosting:** DigitalOcean App Platform
- **Database:** Supabase Cloud (production project)
- **AI Services:** OpenRouter.ai (production API key)
- **URL:** `https://mealer.app`

### 5.4 Browser Support Matrix

| Browser           | Version           | Priority |
| ----------------- | ----------------- | -------- |
| Chrome (Android)  | Latest 2 versions | P0       |
| Safari (iOS)      | Latest 2 versions | P0       |
| Firefox (Android) | Latest version    | P1       |
| Samsung Internet  | Latest version    | P2       |

## 6. Testing Tools

### 6.1 Unit & Integration Testing

| Tool                          | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| **Vitest**                    | Test runner compatible with Next.js and TypeScript |
| **c8**                        | Code coverage reporting (built into Vitest)        |
| **Testing Library**           | React component testing utilities                  |
| **MSW (Mock Service Worker)** | API mocking for integration tests                  |

### 6.2 End-to-End Testing

| Tool                     | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| **Playwright**           | Cross-browser E2E testing with mobile emulation     |
| **Playwright Test**      | Built-in test runner and assertions                 |
| **Playwright Snapshots** | Visual regression testing with `toHaveScreenshot()` |

### 6.3 Code Quality

| Tool           | Purpose              |
| -------------- | -------------------- |
| **ESLint**     | Static code analysis |
| **TypeScript** | Type checking        |
| **Prettier**   | Code formatting      |
| **Husky**      | Pre-commit hooks     |

### 6.4 Accessibility Testing

| Tool                     | Purpose                                                   |
| ------------------------ | --------------------------------------------------------- |
| **axe-core**             | Automated accessibility testing                           |
| **@axe-core/playwright** | E2E accessibility checks integrated with Playwright tests |

### 6.5 API Testing

| Tool                             | Purpose                                                         |
| -------------------------------- | --------------------------------------------------------------- |
| **Bruno**                        | Git-native API collection management (alternative: Hurl for CI) |
| **scripts/test-ai-endpoints.sh** | AI endpoint testing script                                      |

### 6.6 Database Testing

| Tool             | Purpose                                |
| ---------------- | -------------------------------------- |
| **Supabase CLI** | Local database management              |
| **pgTAP**        | PostgreSQL unit testing (RLS policies) |

### 6.7 CI/CD Integration

| Tool                         | Purpose                                      |
| ---------------------------- | -------------------------------------------- |
| **GitHub Actions**           | CI pipeline for automated testing            |
| **Playwright HTML Reporter** | E2E test result visualization and artifacts  |
| **Vitest JSON Reporter**     | Unit/integration test results for CI parsing |

## 7. Test Schedule

### Phase 1: Foundation

- Set up test infrastructure (Vitest, Playwright, MSW)
- Configure code coverage with c8 (80% threshold)
- Implement unit tests for utility functions and services
- Configure CI pipeline with GitHub Actions and test reporters

### Phase 2: API Testing

- Implement integration tests for all API endpoints
- Test authentication flows
- Test error handling and validation

### Phase 3: Component Testing

- Test authentication components
- Test inventory components
- Test recipe components

### Phase 4: E2E Testing

- Implement critical user journey tests
- Set up visual regression baselines with Playwright snapshots
- Cross-browser testing
- Mobile device testing

### Phase 5: Security & Accessibility

- SSRF protection verification
- Rate limiting tests
- Accessibility audit
- Security review

### Phase 6: Regression & Polish

- Full regression suite
- Bug fixes
- Documentation updates

## 8. Test Acceptance Criteria

### 8.1 Unit Tests

- Minimum 80% code coverage for services and utilities
- All critical paths covered
- No skipped tests in CI

### 8.2 Integration Tests

- 100% API endpoint coverage
- All error responses validated
- Authentication/authorization verified

### 8.3 E2E Tests

- All critical user journeys passing
- Mobile browser compatibility confirmed
- Performance within acceptable thresholds

### 8.4 Release Criteria

- All P0 and P1 tests passing
- No critical or high-severity bugs open
- Accessibility audit passed (WCAG 2.1 AA)
- Security review completed
- Performance metrics within SLA:
  - Scan latency < 10 seconds
  - Page load time < 3 seconds

## 9. Roles and Responsibilities

| Role               | Responsibilities                                                    |
| ------------------ | ------------------------------------------------------------------- |
| **QA Lead**        | Test plan creation and maintenance, test strategy, release sign-off |
| **Test Engineers** | Test case design, test automation, test execution, bug reporting    |
| **Developers**     | Unit test implementation, bug fixes, code review                    |
| **Product Owner**  | Acceptance criteria definition, UAT sign-off, priority decisions    |
| **DevOps**         | CI/CD pipeline maintenance, test environment management             |

### RACI Matrix

| Activity          | QA Lead | Test Engineers | Developers | PO  |
| ----------------- | ------- | -------------- | ---------- | --- |
| Test Plan         | A       | R              | C          | I   |
| Unit Tests        | I       | C              | R          | -   |
| Integration Tests | A       | R              | C          | I   |
| E2E Tests         | A       | R              | C          | I   |
| Bug Triage        | A       | R              | C          | R   |
| Release Sign-off  | R       | C              | C          | A   |

_R = Responsible, A = Accountable, C = Consulted, I = Informed_

## 10. Bug Reporting Procedures

### 10.1 Bug Tracking System

GitHub Issues with project-specific labels

### 10.2 Bug Report Template

```markdown
## Summary

[Brief description of the issue]

## Environment

- Browser: [e.g., Chrome 120, iOS Safari 17]
- Device: [e.g., iPhone 14, Samsung Galaxy S23]
- Environment: [staging/production]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Result

[What should happen]

## Actual Result

[What actually happened]

## Screenshots/Videos

[Attach visual evidence]

## Logs

[Relevant console/server logs]

## Severity

- [ ] Critical - Application crash, data loss
- [ ] High - Core functionality broken
- [ ] Medium - Feature partially working
- [ ] Low - Minor UI/UX issues

## Labels

test/bug, module/[module-name], priority/[p0-p3]
```

### 10.3 Severity Definitions

| Severity     | Definition                                           | Response Time   |
| ------------ | ---------------------------------------------------- | --------------- |
| **Critical** | Application crash, data loss, security vulnerability | Immediate       |
| **High**     | Core functionality broken, no workaround             | Within 24 hours |
| **Medium**   | Feature partially working, workaround exists         | Within 3 days   |
| **Low**      | Minor UI/UX issues, cosmetic defects                 | Next sprint     |

### 10.4 Bug Lifecycle

1. **New** - Bug reported, awaiting triage
2. **Triaged** - Severity and priority assigned
3. **In Progress** - Developer working on fix
4. **In Review** - Fix submitted for code review
5. **Ready for Test** - Fix merged, ready for verification
6. **Verified** - QA confirmed fix works
7. **Closed** - Bug resolved and deployed

### 10.5 Regression Testing

- All bug fixes require regression test case
- Critical and high bugs require E2E test coverage
- Regression suite runs on every PR and deployment

---

**Document Version:** 1.0  
**Last Updated:** January 30, 2026  
**Approved By:** [QA Lead]
