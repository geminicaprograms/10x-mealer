# Product Requirements Document (PRD) - Mealer

## 1. Product Overview

Mealer is a Progressive Web Application (PWA) designed to help users manage their kitchen inventory and customize online food recipes based on personal dietary constraints and available ingredients. The application leverages AI technology to scan sales receipts, track product inventory, and suggest ingredient substitutions when cooking from online recipes.

### 1.1 Product Vision

Mealer bridges the gap between online recipes and real-world cooking by understanding what users have in their kitchen and adapting recipes accordingly. The MVP focuses on Polish-language users and integrates with popular Polish recipe websites.

### 1.2 Key Features

- AI-powered receipt scanning for inventory management
- Recipe link parsing from supported Polish websites
- AI-driven ingredient substitution suggestions
- User profile with dietary constraints and kitchen equipment
- Pantry staples management
- Cooking flow with inventory deduction

### 1.3 Platform Specifications

- Platform: Progressive Web App (PWA)
- Language: Polish only (MVP)
- Connectivity: Requires active internet connection
- Browser Support: iOS Safari and Android Chrome
- Offline Mode: Not supported in MVP

### 1.4 Technology Decisions

- Authentication: Email/Password via Backend-as-a-Service (BaaS)
- Data Storage: Hybrid approach
  - Server-side: User profile, inventory data, authentication
  - Client-side (IndexedDB): Recipe history and links
- Recipe Parsing: Server-side proxy to handle CORS restrictions
- AI Processing: Cloud-based with usage limits per user/day

---

## 2. User Problem

### 2.1 Problem Statement

Home cooks face significant challenges when trying to prepare meals from online recipes:

1. Recipes assume users have all listed ingredients, which is rarely the case
2. Manually checking pantry contents against recipe requirements is time-consuming
3. Tracking what products are available at home requires constant mental effort
4. Adapting recipes to dietary restrictions requires cooking expertise
5. Knowing what substitutions work requires culinary knowledge most users lack

### 2.2 Current User Pain Points

- Users waste time browsing recipes they cannot make with available ingredients
- Food goes unused and spoils because users forget what they have
- Dietary restrictions make recipe adaptation complex and error-prone
- Receipt-based shopping tracking is manual and tedious
- No single solution connects inventory management with recipe customization

### 2.3 Target Users

Primary users are Polish-speaking home cooks who:
- Regularly prepare meals using online recipes
- Want to reduce food waste by using available ingredients
- Have dietary restrictions or allergies that require recipe adaptation
- Shop regularly and want to track their purchases efficiently
- Seek AI assistance in kitchen management without technical complexity

### 2.4 User Goals

- Quickly know what meals can be prepared with current inventory
- Receive intelligent suggestions for ingredient substitutions
- Effortlessly maintain an accurate inventory of kitchen products
- Adapt any online recipe to personal dietary needs
- Spend less time planning and more time cooking

---

## 3. Functional Requirements

### 3.1 Authentication System

- FR-001: Email and password-based user registration
- FR-002: Email and password-based user login
- FR-003: Password reset functionality via email
- FR-004: Secure session management
- FR-005: User logout functionality

### 3.2 User Profile Management

- FR-006: Mandatory onboarding flow for hard constraints setup
- FR-007: Allergy specification (multiple selection from predefined list)
- FR-008: Dietary restrictions specification (e.g., vegetarian, vegan, gluten-free)
- FR-009: Kitchen equipment inventory (e.g., oven, microwave, blender)
- FR-010: Profile editing capability after initial setup

### 3.3 Inventory Management

#### 3.3.1 Receipt Scanning

- FR-011: Camera access for receipt photo capture
- FR-012: AI-powered OCR for Polish sales receipts
- FR-013: Mandatory verification screen after AI extraction
- FR-014: User correction capability for misidentified items
- FR-015: Quantity and unit extraction from receipts
- FR-016: Confirmation flow before database entry
- FR-017: Receipt image deletion after processing (not stored)

#### 3.3.2 Manual Entry

- FR-018: Quick Add feature for manual product entry
- FR-019: Autocomplete database for product names
- FR-020: Quantity and unit specification
- FR-021: Product category assignment

#### 3.3.3 Pantry Staples

- FR-022: Predefined list of common staples (salt, oil, basic spices)
- FR-023: Toggle mechanism for staples availability
- FR-024: Staples excluded from receipt tracking
- FR-025: Staples treated as always available in recipe matching

#### 3.3.4 Inventory Display

- FR-026: Current inventory view with quantities
- FR-027: Product search within inventory
- FR-028: Manual quantity adjustment
- FR-029: Product deletion from inventory

### 3.4 Recipe Intelligence

#### 3.4.1 Recipe Input

- FR-030: Paste Link functionality for recipe URLs
- FR-031: Server-side proxy for URL fetching (CORS bypass)
- FR-032: Support for Kwestia Smaku website
- FR-033: Support for Rozkoszny website
- FR-034: Paste Text fallback for unsupported sites
- FR-035: Ingredient extraction from recipe content
- FR-036: Recipe metadata extraction (title, servings)

#### 3.4.2 AI Tailoring

- FR-037: Inventory comparison against recipe ingredients
- FR-038: Missing ingredient identification
- FR-039: AI-powered substitution suggestions based on available inventory
- FR-040: Dietary constraint compliance check
- FR-041: Substitution display with clear reasoning
- FR-042: AI limited to substitutions only (no instruction rewriting)

#### 3.4.3 Recipe Storage

- FR-043: Local storage of recipe history (IndexedDB)
- FR-044: Recipe link preservation
- FR-045: Previously tailored recipes accessible offline-capable storage
- FR-046: Recipe deletion from history

### 3.5 Cooking Flow

- FR-047: "Cooked This" action button on recipes
- FR-048: Estimated ingredient usage calculation
- FR-049: User verification/adjustment of usage amounts
- FR-050: Inventory deduction after user confirmation
- FR-051: Partial cooking support (adjustable servings)

### 3.6 Cost Control

- FR-052: Daily AI usage limits per user (receipt scans)
- FR-053: Daily AI usage limits per user (recipe tailoring)
- FR-054: Usage limit notifications to users
- FR-055: Cost-effective AI model selection

### 3.7 Data Privacy

- FR-056: No server-side storage of raw receipt images
- FR-057: No server-side storage of recipe text content
- FR-058: User data deletion capability
- FR-059: Clear data handling communication to users

---

## 4. Product Boundaries

### 4.1 In Scope (MVP)

- Polish language interface only
- Email/password authentication
- Receipt scanning with AI OCR
- Manual product entry with autocomplete
- Pantry staples toggle list
- Recipe link parsing (Kwestia Smaku, Rozkoszny)
- Recipe text paste fallback
- AI ingredient substitution suggestions
- Hard constraints profile (allergies, diets, equipment)
- "Cooked This" flow with inventory deduction
- Local recipe history storage
- PWA functionality (iOS Safari, Android Chrome)
- Daily AI usage limits

### 4.2 Out of Scope (MVP)

- Statistics gathering and presentation
- Food pictures and media
- Recipe sharing between users
- Social media functions
- Meals planner / weekly meal planning
- Offline mode / offline functionality
- Social login (Google, Facebook, Apple)
- Multiple language support
- Native mobile applications
- Soft preferences (taste preferences, cuisine preferences)
- AI-generated cooking instructions
- Shopping list generation
- Price tracking and comparison
- Nutritional information calculation
- Recipe rating system
- Push notifications
- Integration with smart home devices
- Barcode scanning for products
- Expiration date tracking
- Recipe creation/authoring

### 4.3 Technical Constraints

- Requires active internet connection for all features
- Receipt scanning accuracy dependent on image quality
- AI processing limited by daily quotas
- Recipe parsing limited to supported websites
- PWA limitations on iOS (camera access, notifications)
- Client-side storage subject to browser limitations

### 4.4 Legal Constraints

- Recipe content stored client-side only (copyright protection)
- No recipe text modification or republishing
- User data handling compliant with applicable regulations
- AI suggestions provided as recommendations only

---

## 5. User Stories

### 5.1 Authentication

#### US-001: User Registration

ID: US-001
Title: New User Registration
Description: As a new user, I want to create an account using my email and password so that I can access the application and save my data.

Acceptance Criteria:
- User can access registration form from the landing page
- Registration form requires email address and password
- Password must meet minimum security requirements (min. 8 characters, at least one number)
- Email format is validated before submission
- Duplicate email addresses are rejected with clear error message
- Successful registration redirects user to onboarding flow
- User receives confirmation that account was created

#### US-002: User Login

ID: US-002
Title: Existing User Login
Description: As a registered user, I want to log in with my email and password so that I can access my profile, inventory, and recipes.

Acceptance Criteria:
- User can access login form from the landing page
- Login form accepts email and password
- Invalid credentials display appropriate error message
- Successful login redirects to main dashboard
- User session persists across browser sessions until logout
- Failed login attempts are rate-limited for security

#### US-003: Password Reset

ID: US-003
Title: Password Reset Request
Description: As a user who forgot my password, I want to reset it via email so that I can regain access to my account.

Acceptance Criteria:
- "Forgot Password" link is visible on login page
- User can enter email address to request reset
- Reset email is sent within 2 minutes
- Reset link expires after 24 hours
- User can set new password meeting security requirements
- Old password becomes invalid after reset
- User is notified of successful password change

#### US-004: User Logout

ID: US-004
Title: User Logout
Description: As a logged-in user, I want to log out of the application so that my account is secure on shared devices.

Acceptance Criteria:
- Logout option is accessible from main navigation
- Clicking logout ends user session immediately
- User is redirected to landing/login page after logout
- Subsequent access requires new login
- Local session data is cleared upon logout

### 5.2 User Profile and Onboarding

#### US-005: Mandatory Onboarding Setup

ID: US-005
Title: First-time User Onboarding
Description: As a new user, I want to be guided through setting up my dietary constraints and kitchen equipment so that the app can personalize recommendations from the start.

Acceptance Criteria:
- Onboarding flow starts automatically after registration
- User cannot skip onboarding without completing required fields
- Onboarding includes allergy selection step
- Onboarding includes dietary restrictions selection step
- Onboarding includes kitchen equipment selection step
- User can select "None" if no constraints apply
- Progress indicator shows completion status
- Onboarding completion saves profile and redirects to dashboard

#### US-006: Allergy Specification

ID: US-006
Title: Set Allergy Information
Description: As a user with food allergies, I want to specify my allergies so that recipes with dangerous ingredients are flagged.

Acceptance Criteria:
- Predefined list of common allergies is available (nuts, dairy, gluten, shellfish, eggs, soy)
- User can select multiple allergies
- User can select "No allergies" option
- Selections are saved to user profile
- Allergies can be modified after initial setup
- Changes take effect immediately for recipe tailoring

#### US-007: Dietary Restrictions Setup

ID: US-007
Title: Set Dietary Restrictions
Description: As a user following a specific diet, I want to specify my dietary restrictions so that recipes are adapted accordingly.

Acceptance Criteria:
- Predefined list of diets is available (vegetarian, vegan, pescatarian, gluten-free, lactose-free)
- User can select multiple dietary restrictions
- User can select "No restrictions" option
- Selections are saved to user profile
- Restrictions can be modified after initial setup
- Changes take effect immediately for recipe tailoring

#### US-008: Kitchen Equipment Inventory

ID: US-008
Title: Set Available Kitchen Equipment
Description: As a user, I want to specify what kitchen equipment I have so that recipes requiring unavailable equipment are flagged.

Acceptance Criteria:
- Predefined list of common equipment (oven, microwave, blender, food processor, stand mixer, pressure cooker, air fryer)
- User can select multiple equipment items
- Selections are saved to user profile
- Equipment list can be modified after initial setup
- Recipes requiring unavailable equipment show warning

#### US-009: Profile Editing

ID: US-009
Title: Edit User Profile
Description: As a user, I want to edit my profile settings so that I can update my constraints as my situation changes.

Acceptance Criteria:
- Profile is accessible from main navigation
- All onboarding fields are editable
- Changes require confirmation before saving
- Updated constraints apply to future recipe tailoring
- User receives confirmation of successful update

### 5.3 Inventory Management - Receipt Scanning

#### US-010: Capture Receipt Photo

ID: US-010
Title: Take Receipt Photo
Description: As a user returning from shopping, I want to take a photo of my receipt so that my inventory is updated automatically.

Acceptance Criteria:
- "Scan Receipt" action is prominent on dashboard
- App requests camera permission if not granted
- Camera interface opens for photo capture
- User can retake photo before submission
- Photo is submitted for AI processing
- Loading indicator shows during processing
- Processing completes within 10 seconds

#### US-011: Verify Scanned Products

ID: US-011
Title: Review and Correct Scanned Items
Description: As a user, I want to review and correct the AI-extracted products from my receipt so that my inventory is accurate.

Acceptance Criteria:
- Verification screen displays all extracted items
- Each item shows: product name, quantity, unit
- User can edit any field for each item
- User can delete incorrectly identified items
- User can add missed items manually
- Clear "Confirm" and "Cancel" actions available
- Confirmation adds items to inventory
- Cancel discards entire scan

#### US-012: Handle Poor Quality Receipt Scan

ID: US-012
Title: Manage Unsuccessful Receipt Scan
Description: As a user, I want clear feedback when my receipt scan fails so that I can retry or use manual entry.

Acceptance Criteria:
- Failed scan shows clear error message
- Error suggests possible causes (lighting, focus, receipt condition)
- User can retry with new photo
- Alternative to manual entry is offered
- Partial results can be displayed if some items were recognized

### 5.4 Inventory Management - Manual Entry

#### US-013: Quick Add Product

ID: US-013
Title: Manually Add Product to Inventory
Description: As a user, I want to manually add a product to my inventory so that I can track items not from receipts.

Acceptance Criteria:
- "Quick Add" action is accessible from inventory view
- Product name field with autocomplete from database
- Quantity input field (numeric)
- Unit selection dropdown (pieces, grams, ml, kg, liters)
- Form validates all required fields
- Successful add shows confirmation
- New product appears in inventory immediately

#### US-014: Autocomplete Product Search

ID: US-014
Title: Product Name Autocomplete
Description: As a user adding products manually, I want autocomplete suggestions so that I can enter products faster and consistently.

Acceptance Criteria:
- Autocomplete activates after 2 characters typed
- Suggestions appear within 500ms
- Suggestions show product names in Polish
- User can select from suggestions or enter custom name
- Selected suggestion auto-fills the product name field
- Maximum 10 suggestions displayed at once

### 5.5 Inventory Management - Pantry Staples

#### US-015: View Pantry Staples List

ID: US-015
Title: Access Pantry Staples
Description: As a user, I want to see a list of common pantry staples so that I can indicate which ones I always have.

Acceptance Criteria:
- Staples section is accessible from inventory view
- Predefined list includes: salt, pepper, sugar, olive oil, vegetable oil, flour, butter, garlic, onion
- Each staple has toggle switch for availability
- List is displayed separately from main inventory
- Staples are labeled as "always available" items

#### US-016: Toggle Staple Availability

ID: US-016
Title: Mark Staple as Available/Unavailable
Description: As a user, I want to toggle staples on or off so that recipes know what basics I have.

Acceptance Criteria:
- Toggle switch changes staple status immediately
- Enabled staples are treated as always in stock
- Disabled staples are treated as not available
- Toggle state persists across sessions
- Changes affect recipe ingredient matching immediately
- Visual distinction between enabled/disabled staples

### 5.6 Inventory Management - Display and Maintenance

#### US-017: View Current Inventory

ID: US-017
Title: Browse Inventory
Description: As a user, I want to see all products in my inventory so that I know what I have available.

Acceptance Criteria:
- Inventory view shows all tracked products
- Each product displays: name, quantity, unit
- Products are organized by category or alphabetically
- Empty inventory shows appropriate message
- Inventory count is visible (total items)

#### US-018: Search Inventory

ID: US-018
Title: Search Products in Inventory
Description: As a user with many products, I want to search my inventory so that I can quickly find specific items.

Acceptance Criteria:
- Search input is visible on inventory view
- Search filters products as user types
- Search matches product names (partial match)
- No results shows appropriate message
- Clear search resets to full inventory view

#### US-019: Adjust Product Quantity

ID: US-019
Title: Manually Adjust Product Quantity
Description: As a user, I want to adjust the quantity of a product so that my inventory stays accurate.

Acceptance Criteria:
- Each product has edit option
- Quantity can be increased or decreased
- Quantity cannot go below zero
- Zero quantity prompts for deletion confirmation
- Changes save immediately
- Confirmation message shows after adjustment

#### US-020: Delete Product from Inventory

ID: US-020
Title: Remove Product from Inventory
Description: As a user, I want to delete a product from my inventory so that I can remove items I no longer have.

Acceptance Criteria:
- Each product has delete option
- Deletion requires confirmation
- Confirmed deletion removes product immediately
- Undo option available for 5 seconds after deletion
- Inventory updates to reflect removal

### 5.7 Recipe Intelligence - Input

#### US-021: Add Recipe via Link

ID: US-021
Title: Import Recipe from URL
Description: As a user who found a recipe online, I want to paste the recipe link so that the app can analyze it.

Acceptance Criteria:
- "Add Recipe" action is prominent on dashboard
- Link input field accepts URL paste
- Supported sites (Kwestia Smaku, Rozkoszny) are processed
- Loading indicator shows during parsing
- Successful parse shows recipe title and ingredients
- Unsupported site shows error with "Paste Text" alternative
- Invalid URL shows appropriate error message

#### US-022: Add Recipe via Text Paste

ID: US-022
Title: Import Recipe from Copied Text
Description: As a user with a recipe from an unsupported site, I want to paste the recipe text so that the app can analyze ingredients.

Acceptance Criteria:
- "Paste Text" option is available as fallback
- Text area accepts multi-line paste
- AI extracts ingredients from pasted text
- Extracted ingredients are displayed for verification
- User can correct or add ingredients manually
- Recipe title can be entered manually
- Successful extraction saves to recipe history

#### US-023: Handle Unsupported Recipe Site

ID: US-023
Title: Manage Unsupported Recipe URL
Description: As a user, I want clear guidance when I paste a link from an unsupported site so that I know my alternatives.

Acceptance Criteria:
- Unsupported site detection happens before extensive processing
- Error message clearly states site is not supported
- List of supported sites is displayed
- "Paste Text" alternative is prominently offered
- User can copy text from original site and use fallback

### 5.8 Recipe Intelligence - AI Tailoring

#### US-024: Compare Recipe to Inventory

ID: US-024
Title: Check Ingredient Availability
Description: As a user viewing a recipe, I want to see which ingredients I have and which I'm missing so that I can decide whether to cook it.

Acceptance Criteria:
- Recipe view shows ingredient list
- Each ingredient marked as: available, missing, or partially available
- Available ingredients show checkmark
- Missing ingredients are highlighted
- Partial availability shows current quantity vs required
- Pantry staples are automatically marked as available

#### US-025: Get Substitution Suggestions

ID: US-025
Title: Receive AI Substitution Recommendations
Description: As a user missing ingredients, I want AI-suggested substitutions from my inventory so that I can still cook the recipe.

Acceptance Criteria:
- "Tailor Recipe" action is available on recipe view
- AI analyzes missing ingredients against inventory
- Substitutions are suggested with reasoning
- Each suggestion shows: original ingredient, substitute, explanation
- Multiple substitutes may be offered per ingredient
- User can accept or reject each suggestion
- Dietary constraints are respected in suggestions
- "No suitable substitute" is shown when applicable

#### US-026: Dietary Constraint Compliance Check

ID: US-026
Title: Verify Recipe Against Dietary Restrictions
Description: As a user with dietary restrictions, I want recipes checked against my constraints so that I avoid incompatible dishes.

Acceptance Criteria:
- Recipe analysis includes dietary check
- Incompatible ingredients are flagged
- Allergens matching user allergies show warning
- Diet violations (e.g., meat for vegetarian) are highlighted
- Substitutions to resolve conflicts are suggested where possible
- Clear warning if recipe cannot be made compliant

#### US-027: Handle AI Usage Limit

ID: US-027
Title: Manage Daily AI Limit Reached
Description: As a user who reached my daily AI limit, I want clear notification so that I understand why tailoring is unavailable.

Acceptance Criteria:
- Notification appears when limit is reached
- Message explains daily limit policy
- Time until limit reset is shown
- Manual comparison (without AI) is still available
- User can still view recipes without AI tailoring

### 5.9 Recipe Management

#### US-028: View Recipe History

ID: US-028
Title: Access Previously Added Recipes
Description: As a user, I want to see my recipe history so that I can return to recipes I've added before.

Acceptance Criteria:
- Recipe history is accessible from main navigation
- Recipes displayed with title and date added
- Most recent recipes appear first
- Clicking recipe opens full detail view
- Empty history shows appropriate message

#### US-029: View Recipe Details

ID: US-029
Title: Open Recipe Detail View
Description: As a user, I want to view full recipe details so that I can see ingredients and access the original.

Acceptance Criteria:
- Recipe title is displayed prominently
- Full ingredient list is shown
- Link to original recipe is available (if added via URL)
- Previous substitution suggestions are visible (if tailored)
- "Cooked This" action is accessible
- "Tailor Recipe" action is accessible

#### US-030: Delete Recipe from History

ID: US-030
Title: Remove Recipe from History
Description: As a user, I want to delete recipes from my history so that I can keep my list relevant.

Acceptance Criteria:
- Delete option is available on recipe detail view
- Deletion requires confirmation
- Confirmed deletion removes recipe from local storage
- Recipe list updates immediately
- Undo option available for 5 seconds

### 5.10 Cooking Flow

#### US-031: Initiate Cooking Flow

ID: US-031
Title: Start "Cooked This" Process
Description: As a user about to cook a recipe, I want to start the cooking flow so that my inventory is updated afterward.

Acceptance Criteria:
- "Cooked This" button is visible on recipe view
- Clicking initiates inventory deduction workflow
- System calculates estimated usage per ingredient
- User is not required to complete flow immediately

#### US-032: Review Ingredient Usage

ID: US-032
Title: Verify Estimated Ingredient Usage
Description: As a user who just cooked, I want to review and adjust the estimated ingredient usage so that my inventory accurately reflects what I used.

Acceptance Criteria:
- Verification screen shows all recipe ingredients
- Each ingredient shows estimated usage amount
- User can adjust each quantity up or down
- Adjustments respect product units
- Ingredients not in inventory are skipped
- Clear "Confirm" and "Cancel" actions

#### US-033: Adjust Servings Cooked

ID: US-033
Title: Specify Partial Recipe Cooking
Description: As a user who made half a recipe, I want to adjust servings so that ingredient deductions are proportional.

Acceptance Criteria:
- Servings selector is available before usage review
- Default is recipe's full serving amount
- Adjusting servings recalculates all ingredient amounts
- Fractional servings are supported
- Zero servings cancels the flow

#### US-034: Confirm Inventory Deduction

ID: US-034
Title: Finalize Cooking and Update Inventory
Description: As a user who finished cooking, I want to confirm the deductions so that my inventory is updated.

Acceptance Criteria:
- Confirmation triggers inventory update
- Each ingredient quantity is reduced accordingly
- Products reaching zero prompt for removal decision
- Success message confirms inventory update
- User is returned to recipe or dashboard
- Inventory view reflects new quantities

#### US-035: Cancel Cooking Flow

ID: US-035
Title: Abort Cooking Flow
Description: As a user who changed my mind, I want to cancel the cooking flow so that no inventory changes are made.

Acceptance Criteria:
- Cancel option is available throughout flow
- Cancellation requires confirmation
- No inventory changes are made on cancel
- User is returned to previous view
- Recipe remains in history unchanged

### 5.11 Error Handling and Edge Cases

#### US-036: Handle Network Errors

ID: US-036
Title: Manage Connectivity Issues
Description: As a user experiencing network issues, I want clear error messages so that I understand why actions failed.

Acceptance Criteria:
- Network errors show user-friendly message
- Retry option is provided where applicable
- Partial data is not corrupted
- User is not logged out on temporary failures
- Cached data (local recipes) remains accessible

#### US-037: Handle Empty Inventory Matching

ID: US-037
Title: Tailor Recipe with Empty Inventory
Description: As a user with an empty inventory, I want appropriate feedback when tailoring recipes so that I understand the limitation.

Acceptance Criteria:
- Empty inventory triggers specific message
- Message suggests adding products first
- Recipe can still be viewed without tailoring
- Link to "Add Products" is provided
- Flow does not crash or show generic error

#### US-038: Handle Concurrent Sessions

ID: US-038
Title: Manage Multiple Device Access
Description: As a user accessing from multiple devices, I want my data to sync correctly so that I have consistent information.

Acceptance Criteria:
- Server-side data (profile, inventory) syncs across devices
- Local data (recipes) is device-specific
- Login on new device loads latest server data
- Conflicting changes handled gracefully (last write wins)
- User notified if sync issues occur

### 5.12 Account Management

#### US-039: Delete User Account

ID: US-039
Title: Permanently Delete Account
Description: As a user, I want to delete my account so that all my personal data is removed.

Acceptance Criteria:
- Account deletion option is in profile settings
- Deletion requires password confirmation
- Clear warning about permanent data loss
- All server-side data is deleted
- Local data deletion is recommended to user
- User is logged out and redirected to landing page
- Deleted account email can be reused for new registration

---

## 6. Success Metrics

### 6.1 Primary Success Criteria

#### 6.1.1 Profile Completion Rate

Target: 90% of registered users complete the hard constraints profile section

Measurement:
- Count users who completed all mandatory onboarding steps
- Divide by total registered users
- Track weekly and monthly trends

Rationale: High profile completion ensures the app can provide personalized, safe recommendations. The mandatory onboarding flow is designed to achieve this target.

#### 6.1.2 Weekly Recipe Generation Usage

Target: 50% of active users complete the "Cooked This" flow at least once per week

Measurement:
- Count unique users completing cooking flow per week
- Divide by total active users (logged in that week)
- Track as rolling 7-day metric

Rationale: This metric indicates users are deriving real value from the app by actually cooking recipes they've added and tracked.

### 6.2 Technical Performance Metrics

#### 6.2.1 Receipt Processing Speed

Target: Receipt scanning to verification screen transition under 10 seconds

Measurement:
- Track time from photo submission to verification screen display
- Calculate 95th percentile response time
- Monitor daily averages

#### 6.2.2 Recipe Parsing Success Rate

Target: 85% of links from supported sites successfully parsed

Measurement:
- Count successful parses vs. total attempts for supported sites
- Track by site to identify specific issues
- Monitor weekly trends

### 6.3 User Engagement Metrics

#### 6.3.1 Inventory Activity

Indicator: Users actively manage their inventory

Measurements:
- Average products per user inventory
- Receipt scans per user per week
- Manual entries per user per week

#### 6.3.2 Recipe Engagement

Indicator: Users actively use recipe features

Measurements:
- Recipes added per user per week
- Tailoring requests per user per week
- Cooking flows completed per user per week

### 6.4 Quality Metrics

#### 6.4.1 Scan Accuracy (User-reported)

Indicator: AI receipt scanning is sufficiently accurate

Measurement:
- Track corrections made during verification
- Calculate average corrections per scan
- Target: fewer than 2 corrections per scan on average

#### 6.4.2 Substitution Acceptance Rate

Indicator: AI substitutions are useful to users

Measurement:
- Track accepted vs. rejected substitution suggestions
- Target: 60% acceptance rate

### 6.5 Retention Metrics

#### 6.5.1 Weekly Active Users (WAU)

Indicator: Users return to the app regularly

Measurement:
- Count unique users with at least one session per week
- Track week-over-week retention
- Monitor 4-week retention cohorts

#### 6.5.2 Feature Adoption

Indicator: Users discover and use key features

Measurements:
- Percentage of users who have scanned at least one receipt
- Percentage of users who have added at least one recipe
- Percentage of users who have used AI tailoring
- Percentage of users who have completed cooking flow
