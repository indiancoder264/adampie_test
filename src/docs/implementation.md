
# RecipeRadar - Page Implementation Details

This document provides a technical breakdown of each page in the RecipeRadar application, detailing the technologies used, data sources, and key functionalities.

---

## 1. Homepage (`/`)

-   **File:** `src/app/page.tsx`
-   **Technique:**
    -   This is a **Client Component** (`"use client"`) that consumes data provided by server-fetched contexts.
    -   It uses React Hooks (`useState`, `useEffect`, `useMemo`) to manage the display of recipes based on user state and search parameters.
    -   The `Suspense` boundary ensures a smooth loading experience, showing a skeleton UI while data is being prepared.
-   **Data Fetching:**
    -   **Reads from:** `recipes`, `users` (for personalization), `user_favorites`.
    -   All initial data is fetched on the server in `src/app/layout.tsx` and provided via React Context (`useRecipes`, `useAuth`).
-   **Functions Offered:**
    -   Displays a hero banner with a search and filter component.
    -   Shows a "Recommended For You" carousel for logged-in users, personalized based on their favorite cuisines and dietary preferences.
    -   Displays a "Worldwide Trending" carousel based on recipe favorite counts.
    -   Renders sections for different cuisine types with links to view all recipes for that region.
    -   If search parameters are present in the URL, it displays a dedicated search results view.

---

## 2. Recipe Detail Page (`/recipes/[id]`)

-   **File:** `src/app/recipes/[id]/page.tsx`
-   **Technique:**
    -   This page is a **Client Component** that orchestrates various interactive sub-components.
    -   Uses the `useParams` hook to get the recipe ID from the URL.
    -   State is managed with `useState` and `useEffect` to handle the interactive cooking guide and tip submission process.
    -   Leverages **Server Actions** (`logRecipeViewAction`, `addPostAction`) for background tasks and sharing to the community.
-   **Data Fetching:**
    -   **Reads from:** `recipes`, `ingredients`, `steps`, `tips`, `users`, `groups`.
    -   The core recipe data is provided via the `useRecipes` context, which is populated on the server.
-   **Functions Offered:**
    -   Displays all recipe details: description, prep/cook times, servings, dietary info, ingredients, and steps.
    -   Allows users to favorite/unfavorite the recipe.
    -   Provides a "Share to Community" feature for logged-in users to post the recipe to a group they are a member of.
    -   Features an interactive step-by-step cooking guide.
    -   Allows logged-in users to submit or update a rating and a helpful tip after completing the cooking guide.

---

## 3. User Profile (`/profile`)

-   **File:** `src/app/profile/page.tsx`
-   **Technique:**
    -   A **Client Component** that relies on React hooks (`useState`, `useEffect`).
    -   Uses `react-hook-form` and `zod` for robust form validation for password changes and profile updates.
    -   All data mutations are handled by **Server Actions** which include centralized authorization checks (e.g., `updateUserAction`, `changePasswordAction`, `requestEmailChangeAction`).
-   **Data Fetching:**
    -   **Reads from:** `users`, `recipes`, `user_favorites`, `user_favorite_cuisines`, `groups`, `tips`.
    -   Relies entirely on the client-side `useAuth`, `useRecipes`, and `useCommunity` contexts for its data.
-   **Functions Offered:**
    -   Displays user's name, email, and avatar.
    -   Shows earned achievements.
    -   Allows users to update their personal information (name, country, dietary preference).
    -   Allows users to securely change their password with validation.
    -   Provides a secure flow for changing the account's email address via OTP verification.
    -   Lists all of the user's favorite recipes and favorite cuisines.
    -   Shows user's activity, including submitted tips and community groups they have created or joined.

---

## 4. Community Hub (`/community`)

-   **File:** `src/app/community/page.tsx`
-   **Technique:**
    -   A **Client Component** that uses a tabbed interface (`Tabs` from ShadCN) to organize groups.
    -   Uses `react-hook-form` and `zod` for the "Edit Group" dialog.
    -   Relies on the `useCommunity` context, which uses a **Supabase Realtime** subscription to keep the list of groups synchronized across all clients.
    -   Leverages secure **Server Actions** (`joinGroupAction`, `leaveGroupAction`, `deleteGroupAction`, `editGroupAction`) for all group interactions, which use centralized authorization helpers.
-   **Data Fetching:**
    -   **Reads from:** `groups`, `group_members`, `users`.
    -   Initial data is provided via the `useCommunity` and `useAuth` contexts, which are populated on the server. Real-time updates for new or deleted groups are handled by the `CommunityProvider`.
-   **Functions Offered:**
    -   For logged-in users, displays three tabs: "My Groups" (created by the user), "Groups I'm In", and "Explore".
    -   Allows users to join or leave groups.
    -   Allows group creators to edit or delete their own groups.
    -   Provides a link to the "Create Group" page.

---

## 5. Group Detail Page (`/community/[id]`)

-   **File:** `src/app/community/[id]/page.tsx`
-   **Technique:**
    -   A complex **Client Component** that manages the entire lifecycle of a group discussion board.
    -   This component contains its own dedicated **Supabase Realtime** listeners for `posts` and `comments` to ensure that all interactions within the group are reflected instantly for all members. This localized approach is more robust and efficient.
    -   Uses `react-hook-form` for post and comment submission.
    -   All interactions (posting, commenting, reacting, reporting) are handled by secure **Server Actions** with centralized authorization checks via `getAuthenticatedUser()`.
-   **Data Fetching:**
    -   **Reads from:** `groups`, `posts`, `comments`, `post_reactions`, `users`, `reports`.
    -   Initial data is supplied by the `useCommunity` and `useAuth` contexts. Real-time updates for posts and comments are handled locally within this component.
-   **Functions Offered:**
    -   Displays group name, description, and member list.
    -   Allows members to create new posts (including sharing recipes).
    -   Allows users to react (like/dislike) to posts, comment on posts, and report inappropriate content.
    -   Provides editing and deletion capabilities for a user's own posts and comments.

---

## 6. Admin Dashboard (`/admin`)

-   **File:** `src/app/admin/page.tsx`
-   **Technique:**
    -   A **Client Component** that serves as an orchestrator for various admin-focused sub-components.
    -   Uses ShadCN `Tabs` to separate different management areas (Recipes, Tips, Community, Users, Analytics).
    -   Access is protected by a server-side redirect that checks for admin status via the `useAuth` hook before rendering.
    -   All data manipulation is done via secure **Server Actions** that use the centralized `getAdminUser()` authorization check, ensuring only admins can perform these operations.
-   **Data Fetching:**
    -   **Reads from:** All tables in the database.
    -   Initial data is provided via the client-side contexts, which are populated on the server in `layout.tsx`.
-   **Functions Offered:**
    -   **Recipe Management:** Create, edit, delete, and publish/unpublish recipes.
    -   **Tip Management:** View and delete user-submitted tips.
    -   **Community Management:** View all groups and moderate reported content by dismissing reports or deleting the content.
    -   **User Management:** View all users, inspect their activity, and perform moderation actions like suspending or deleting user accounts.
    -   **Analytics:** Displays charts and stats on total users, recipes, top-visited content, and more.

---

## 7. Auth Pages (`/login`, `/signup`, `/verify-otp`, etc.)

-   **Files:** `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/verify-otp/page.tsx`, `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`
-   **Technique:**
    -   All are **Client Components** using `react-hook-form` and `zod` for robust client-side validation.
    -   All authentication logic is handled securely by **Server Actions** (`loginAction`, `signupAction`, `verifyOtpAction`, etc.).
    -   These actions are protected by the new IP-based **Rate Limiting** system to prevent brute-force attacks.
    -   The `loginAction` sets a secure, `httpOnly` cookie containing a session token and invalidates all other active sessions for that user, a key security feature.
-   **Functions Offered:**
    -   `/login`: Allows existing users to sign in.
    -   `/signup`: Allows new users to create an account, which triggers an OTP verification email.
    -   `/verify-otp`: Allows a new user to enter their 6-digit OTP to complete registration.
    -   `/forgot-password`: Allows a user to request a password reset OTP.
    -   `/reset-password`: Allows a user to set a new password using their email and OTP.
