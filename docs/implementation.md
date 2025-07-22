# RecipeRadar - Page Implementation Details

This document provides a technical breakdown of each page in the RecipeRadar application, detailing the technologies used, data sources, and key functionalities.

---

## 1. Homepage (`/`)

-   **File:** `src/app/page.tsx`
-   **Technique:**
    -   This page is a **Client Component** (`"use client"`) that wraps server-fetched data.
    -   It uses React Hooks (`useState`, `useEffect`, `useMemo`) to manage the display of recipes based on user state and search parameters.
    -   The initial data for all recipes is fetched on the server in `src/app/layout.tsx` and provided via React Context (`useRecipes`, `useAuth`).
-   **Data Fetching:**
    -   **Reads from:** `recipes`, `users` (for personalization), `user_favorites`.
    -   The data is pre-fetched on the server via the `fetchRecipes()` function in `src/lib/data.ts`.
-   **Functions Offered:**
    -   Displays a hero banner with a search and filter component.
    -   Shows a "Recommended For You" carousel for logged-in users, personalized based on their favorite cuisines, dietary preferences, and read history.
    -   Displays a "Worldwide Trending" carousel based on recipe favorite counts.
    -   Renders sections for different cuisine types, with links to view all recipes for that cuisine.
    -   If search parameters are present in the URL, it displays a search results view instead of the default homepage content.

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
    -   The core data is provided via the `useRecipes` and `useCommunity` contexts.
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
    -   A **Client Component** that heavily relies on React hooks (`useState`, `useEffect`, `useMemo`).
    -   Uses `react-hook-form` for robust form validation for password changes and profile updates.
    -   All data mutations are handled by **Server Actions** (`updateUserAction`, `changePasswordAction`, `updateFavoriteCuisinesAction`, `requestEmailChangeAction`).
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
    -   Uses React hooks (`useState`, `useMemo`) to filter and display groups based on the logged-in user's membership and creator status.
    -   Leverages **Server Actions** (`joinGroupAction`, `leaveGroupAction`, `deleteGroupAction`, `editGroupAction`) for all group interactions.
-   **Data Fetching:**
    -   **Reads from:** `groups`, `group_members`, `users`.
    -   Data is provided via the `useCommunity` and `useAuth` contexts.
-   **Functions Offered:**
    -   For logged-in users, displays three tabs: "My Groups" (created by the user), "Groups I'm In", and "Explore".
    -   For logged-out users, displays a single list of all available groups.
    -   Allows users to join or leave groups.
    -   Allows group creators to edit or delete their own groups.
    -   Provides a link to the "Create Group" page.

---

## 5. Group Detail Page (`/community/[id]`)

-   **File:** `src/app/community/[id]/page.tsx`
-   **Technique:**
    -   A complex **Client Component** that manages the entire lifecycle of a group discussion.
    -   Uses `react-hook-form` for post and comment submission.
    -   Manages local state for dialogs (editing, reporting) and filters.
    -   All interactions are handled by **Server Actions** (`addPostAction`, `deletePostAction`, `addCommentAction`, `deleteCommentAction`, `togglePostReactionAction`, `reportContentAction`, etc.).
-   **Data Fetching:**
    -   **Reads from:** `groups`, `posts`, `comments`, `post_reactions`, `users`, `reports`.
    -   Data is supplied by the `useCommunity` and `useAuth` contexts.
-   **Functions Offered:**
    -   Displays group name, description, and member list.
    -   Allows members to create new posts.
    -   Displays posts, including shared recipes, with author details and timestamps.
    -   Allows users to react (like/dislike) to posts.
    -   Allows users to comment on posts.
    -   Provides editing and deletion capabilities for a user's own posts and comments.
    -   Enables users to report inappropriate posts or comments.

---

## 6. Admin Dashboard (`/admin`)

-   **File:** `src/app/admin/page.tsx`
-   **Technique:**
    -   A **Client Component** that serves as an orchestrator for various admin-focused sub-components.
    -   Uses ShadCN `Tabs` to separate different management areas (Recipes, Tips, Community, Users, Analytics).
    -   Uses a server-side `redirect` check to enforce admin-only access before the page is rendered.
    -   All data manipulation is done via secure **Server Actions** (e.g., `createOrUpdateRecipeAction`, `deleteUserAction`, `suspendUserAction`).
-   **Data Fetching:**
    -   **Reads from:** All tables in the database (`users`, `recipes`, `tips`, `groups`, `posts`, `comments`, `reports`).
    -   Initial data is provided via the client-side contexts, which are populated on the server in `layout.tsx`.
-   **Functions Offered:**
    -   **Recipe Management:** Create, edit, delete, and publish/unpublish recipes.
    -   **Tip Management:** View and delete user-submitted tips.
    -   **Community Management:** View all groups and moderate reported content (posts/comments) by dismissing reports or deleting the content.
    -   **User Management:** View all users, inspect their activity, and perform moderation actions like suspending or deleting user accounts.
    -   **Analytics:** Displays charts and stats on total users, recipes, top-visited content, and more.

---

## 7. Auth Pages (`/login`, `/signup`, `/verify-otp`)

-   **Files:** `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/verify-otp/page.tsx`
-   **Technique:**
    -   All are **Client Components** using `react-hook-form` and `zod` for robust validation.
    -   All authentication logic is handled securely by **Server Actions** (`loginAction`, `signupAction`, `verifyOtpAction`).
    -   The `loginAction` sets a secure, `httpOnly` cookie for session management.
    -   The `signupAction` sends a verification email using the Resend service.
-   **Data Fetching:**
    -   **Reads from/Writes to:** `users` table.
-   **Functions Offered:**
    -   `/login`: Allows existing users to sign in. Handles special admin login via environment variables.
    -   `/signup`: Allows new users to create an account, which triggers an OTP verification email.
    -   `/verify-otp`: Allows a new user to enter their 6-digit OTP to verify their email address and activate their account.
