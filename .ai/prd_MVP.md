# **Product Requirements Document (PRD) \- Mealer**

## **1\. Product Overview**

Mealer is a Progressive Web App (PWA) designed to solve the "what's for dinner?" dilemma by intelligently matching online recipes with the user's current kitchen inventory. The application utilizes AI to digitize grocery receipts, track available ingredients, and suggest recipe modifications based on what is actually in the fridge.

The MVP targets the Polish market, operating entirely in the Polish language. It focuses on reducing food waste and simplifying the cooking process by acting as a smart bridge between grocery shopping and meal preparation. Unlike complex meal planners, Mealer focuses on the immediate reality of available ingredients.

## **2\. User Problem**

### **2.1 Core Problem**

Home cooks often struggle to utilize the food they buy, leading to waste and frustration. They find recipes online but lack specific ingredients, or they have ingredients expiring in the fridge but don't know how to use them.

### **2.2 Friction Points**

* **Manual Inventory Management:** Users do not want to manually type every item they buy into an app.  
* **Recipe Inflexibility:** Users find a recipe they like (e.g., on Kwestia Smaku) but realize they are missing one key ingredient (e.g., Cream) and don't know if they can substitute it with what they have (e.g., Yogurt).  
* **Disconnected Systems:** Shopping receipts and recipe books are completely separate entities.

## **3\. Functional Requirements**

### **3.1 Authentication & User Profile**

* The system must use a Backend-as-a-Service (BaaS) provider for secure Email/Password authentication.  
* Users must complete a mandatory onboarding flow defining "Hard Constraints" (Allergies, Diets) and available kitchen equipment to ensure AI relevance.  
* Profile data must sync to the cloud.

### **3.2 Inventory Management**

* **Receipt Scanning:** Users can take a photo of a Polish sales slip. The system uses AI (OCR \+ LLM) to extract items and quantities.  
* **Verification Workflow:** A mandatory "Verify Scan" screen must appear after scanning to allow users to correct AI errors before data is saved.  
* **Manual Entry:** A "Quick Add" feature with an autocomplete database for adding single items without a receipt.  
* **Staples Management:** A predefined list of common items (Salt, Pepper, Oil) that functions as a toggle (Have/Don't Have) rather than quantitative tracking.

### **3.3 Recipe Intelligence**

* **Link Parsing:** Users can paste a URL from supported Polish recipe sites. A server-side proxy fetches the content to bypass CORS.  
* **Text Parsing:** Fallback option for users to paste raw recipe text.  
* **Local Storage:** To minimize copyright liability, recipe text and links are stored in the user's browser (IndexedDB), not the central database.  
* **AI Tailoring:** The AI analyzes the recipe against the user's inventory to suggest specific ingredient substitutions. It does *not* rewrite cooking instructions.

### **3.4 Cooking Flow**

* **Cooked This Action:** A specific button to trigger inventory reduction.  
* **Usage Verification:** The system estimates ingredient usage and presents a confirmation screen where the user can adjust quantities before final deduction.

### **3.5 System Constraints**

* **Platform:** PWA (must work on mobile browsers, specifically iOS Safari and Android Chrome).  
* **Connectivity:** Application requires an active internet connection (no offline mode).  
* **Cost Control:** AI features (scanning and recipe tailoring) are rate-limited per user per day.

## **4\. Product Boundaries**

### **4.1 In Scope (MVP)**

* PWA development for Mobile usage.  
* Polish language interface and receipt recognition.  
* User Accounts (Email/Password).  
* Receipt Scanning (Camera access & Image upload).  
* Inventory CRUD (Create, Read, Update, Delete).  
* Recipe Link Parsing (Ingredients extraction).  
* AI Substitution Suggestions.  
* Local storage for recipe history.

### **4.2 Out of Scope (MVP)**

* Native Mobile Apps (App Store/Play Store).  
* Social Login (Google/Facebook/Apple).  
* Meal Planning features (Calendar/Schedule).  
* Social Sharing or Community features.  
* Food Image Recognition (taking photos of an apple to add it).  
* Nutritional Statistics and calorie tracking.  
* Offline Mode / offline functionality.  
* Soft Preferences (e.g., "I dislike cilantro" - only allergies/diets are tracked).  
* Multiple language support (Polish only for MVP).  
* AI-generated cooking instructions (substitutions only).  
* Shopping list generation.  
* Price tracking and comparison.  
* Recipe rating system.  
* Push notifications.  
* Integration with smart home devices.  
* Barcode scanning for products.  
* Expiration date tracking.  
* Recipe creation/authoring (import only).  
* Recipe sharing between users.  
* Statistics gathering and presentation.

### **4.3 Technical Constraints**

* Requires active internet connection for all features.  
* Receipt scanning accuracy dependent on image quality.  
* AI processing limited by daily quotas.  
* Recipe parsing limited to supported websites.  
* PWA limitations on iOS (camera access, notifications).  
* Client-side storage subject to browser limitations.

### **4.4 Legal Constraints**

* Recipe content stored client-side only (copyright protection).  
* No recipe text modification or republishing.  
* User data handling compliant with GDPR regulations.  
* AI suggestions provided as recommendations only (no liability).

## **5\. User Stories**

### **Authentication & Onboarding**

US-001  
Title: User Registration  
Description: As a new user, I want to create an account using my email and password so that my inventory data is saved securely.  
Acceptance Criteria:

* User can enter email and password.  
* Password strength validation is enforced.  
* User receives a success message upon account creation.  
* User is automatically redirected to the Onboarding Profile setup.

US-002  
Title: User Login  
Description: As a returning user, I want to log in with my credentials so I can access my inventory.  
Acceptance Criteria:

* User can input email and password.  
* Appropriate error messages for invalid credentials.  
* "Forgot Password" link is available.
* Failed login attempts are rate-limited for security.

US-003  
Title: Password Reset  
Description: As a user who forgot my password, I want to reset it via email so that I can regain access to my account.  
Acceptance Criteria:

* "Forgot Password" link is visible on login page.  
* User can enter email address to request reset.  
* Reset email is sent within 2 minutes.  
* Reset link expires after 24 hours.  
* User can set new password meeting security requirements.  
* User is notified of successful password change.

US-004  
Title: User Logout  
Description: As a logged-in user, I want to log out of the application so that my account is secure on shared devices.  
Acceptance Criteria:

* Logout option is accessible from main navigation.  
* Clicking logout ends user session immediately.  
* User is redirected to landing/login page after logout.  
* Local session data is cleared upon logout.

US-005  
Title: Mandatory Profile Setup  
Description: As a new user, I must select my dietary restrictions and available equipment before using the app so that suggestions are relevant.  
Acceptance Criteria:

* Screen is presented immediately after registration.  
* User cannot skip this step.  
* User must select from a list of Allergies (or select "None").  
* User must select from a list of Diets (e.g., Vegetarian) (or select "None").  
* User must toggle available equipment (Oven, Blender, etc.).

### **Inventory Management**

US-006  
Title: Scan Receipt  
Description: As a shopper, I want to take a photo of my grocery receipt so that the items are added to my inventory without typing.  
Acceptance Criteria:

* User can access the device camera or file gallery.  
* Image is sent to AI service for processing.  
* A loading state is shown during processing.  
* If the image is blurry/unusable, an error message prompts a retake.

US-007  
Title: Verify Scanned Items  
Description: As a user, I want to review the items extracted from my receipt before they are added to the database so I can fix any AI errors.  
Acceptance Criteria:

* User is shown a list of recognized items and quantities.  
* User can edit the name or quantity of any item.  
* User can delete an item that was incorrectly scanned.  
* User can add an item that was missed.  
* Clicking "Confirm" saves the list to the main Inventory.

US-008  
Title: View Inventory  
Description: As a user, I want to see a list of what food I have at home.  
Acceptance Criteria:

* List displays item names and quantities.  
* List is sortable or searchable.  
* Items added via "Staples" are separated from quantitative items.

US-009  
Title: Manage Pantry Staples  
Description: As a user, I want to toggle basic items like Salt and Oil so I don't have to track their exact milliliter usage.  
Acceptance Criteria:

* Dedicated section for "Staples".  
* Simple Toggle/Checkbox interface (Have / Don't Have).  
* These items are excluded from receipt scanning logic.

US-010  
Title: Manual Item Entry  
Description: As a user, I want to manually add a single item so I can track things I bought without a receipt.  
Acceptance Criteria:

* "Quick Add" button is accessible from the inventory screen.  
* Autocomplete suggests common Polish food items as user types.  
* User can define quantity and unit.

### **Recipe & Cooking**

US-011  
Title: Import Recipe via Link  
Description: As a cook, I want to paste a link to a recipe so the app can analyze the ingredients.  
Acceptance Criteria:

* Input field accepts URLs.  
* System validates the URL is from a supported domain or generic format.  
* Content is fetched via proxy.  
* Ingredients are extracted and displayed.

US-012  
Title: Analyze Recipe for Substitutions  
Description: As a cook, I want to know which ingredients I am missing and if I can substitute them with what I have.  
Acceptance Criteria:

* System compares recipe ingredients vs. User Inventory.  
* UI highlights missing items in red.  
* AI provides specific substitution advice based *only* on available inventory (e.g., "Use Greek Yogurt instead of Sour Cream").  
* AI warns if a Hard Constraint (Allergy) is violated.

US-013  
Title: Cooked This (Usage Deduction)  
Description: As a user, I want to tell the app I cooked a recipe so my inventory is updated.  
Acceptance Criteria:

* "Cooked This" button is available on the Recipe Detail view.  
* User is presented with a "Confirm Usage" modal.  
* Modal lists estimated deductions (e.g., \-500g Chicken, \-2 Onions).  
* User can modify the deduction amounts (e.g., changed to \-600g).  
* Confirming updates the backend database.

### **System & Settings**

US-014  
Title: Rate Limiting Notification  
Description: As a user, I need to know if I have reached my daily limit of AI scans/suggestions.  
Acceptance Criteria:

* If user attempts a scan after reaching the daily limit, a friendly modal explains the limit.  
* If user attempts AI substitution after limit, basic ingredient matching still works, but AI advice is disabled.

US-015  
Title: Data Privacy (Local Storage)  
Description: As a user, I want my recipe history to be available on my device, but I understand it is not saved to the cloud.  
Acceptance Criteria:

* Pasted recipes are saved to IndexedDB.  
* Clearing browser cache warns the user that recipe history will be lost.

### **Error Handling & Edge Cases**

US-016  
Title: Handle Network Errors  
Description: As a user experiencing network issues, I want clear error messages so that I understand why actions failed.  
Acceptance Criteria:

* Network errors show user-friendly message in Polish.  
* Retry option is provided where applicable.  
* Partial data is not corrupted.  
* User is not logged out on temporary failures.  
* Cached data (local recipes) remains accessible.

US-017  
Title: Handle Empty Inventory  
Description: As a user with an empty inventory, I want appropriate feedback when tailoring recipes so that I understand the limitation.  
Acceptance Criteria:

* Empty inventory triggers specific message.  
* Message suggests adding products first.  
* Recipe can still be viewed without tailoring.  
* Link to "Add Products" (Scan Receipt or Quick Add) is provided.  
* Flow does not crash or show generic error.

### **Account Management**

US-018  
Title: Delete User Account  
Description: As a user, I want to delete my account so that all my personal data is removed.  
Acceptance Criteria:

* Account deletion option is accessible in profile settings.  
* Deletion requires password confirmation.  
* Clear warning about permanent data loss is shown.  
* All server-side data is deleted upon confirmation.  
* User is logged out and redirected to landing page.  
* Deleted account email can be reused for new registration.

## **6\. Success Metrics**

### **6.1 User Engagement**

* **Profile Completion Rate:** 90% of registered users complete the "Hard Constraints" onboarding section.  
* **Weekly Active Usage:** 50% of monthly active users complete the "Cooked This" flow (generating a recipe and deducting inventory) at least once per week.

### **6.2 Technical Performance**

* **Scan Latency:** Time from photo upload to "Verify Scan" screen display is under 10 seconds.  
* **AI Accuracy:** Less than 15% of scanned items are manually edited by the user during the verification step.