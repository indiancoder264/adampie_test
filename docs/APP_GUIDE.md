# RecipeRadar Application Guide

This document provides a detailed walkthrough of the RecipeRadar web application, its architecture, key functionalities, and file structure.

---

## 1. Project Overview & Tech Stack

RecipeRadar is a feature-rich web application for discovering, sharing, and discussing recipes. It is built using a modern tech stack, designed for performance, security, and a great developer experience.

**Key Technologies:**

-   **Next.js:** A React framework for building full-stack web applications. We leverage its key features:
    -   **App Router:** For file-based routing and clear project structure.
    -   **Server Components:** To fetch data and render content on the server, significantly improving performance and SEO.
    -   **Server Actions:** For all data mutations, ensuring that business logic and permission checks run securely on the server.
-   **React:** The core library for building the user interface.
-   **TypeScript:** Adds static typing to JavaScript for improved code quality and robustness.
-   **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
-   **ShadCN UI:** A collection of beautifully designed, accessible, and reusable UI components built on top of Tailwind CSS.
-   **PostgreSQL:** The application's relational database, managed via the `pg` library. The complete schema is designed for scalability and can be found in `docs/DATABASE_SCHEMA.md`.

---

## 2. Core Concept: State Management & Data Flow

### Server-Side Data Fetching & Rendering

To ensure fast load times and optimal SEO, the application primarily uses **Next.js Server Components**. Pages like the Homepage and Recipe Detail page are `async` components that fetch their data directly from the PostgreSQL database on the server using functions from `src/lib/data.ts`. The complete, content-rich HTML is then sent to the browser, making it immediately visible to users and search engines.

### Data Mutations with Server Actions

All actions that modify data (e.g., adding a recipe, deleting a user, posting a comment) are handled by **Next.js Server Actions** located in `src/lib/actions.ts`. This is a critical architectural and security feature. It ensures that all permission checks (e.g., "is this user an admin?") and data validation happen on the server, preventing unauthorized users from performing sensitive operations.

### Client-Side State Management with React Context

While most data is handled on the server, some global client-side state is managed using React's built-in **Context API**. This lightweight approach is used for data that needs to be shared across many components on the client, such as the current user's session.

-   **`src/lib/auth.tsx` (`AuthProvider`):** Manages the state of the currently logged-in user.
-   **`src/lib/recipes.tsx`, `src/lib/users.tsx`, `src/lib/community.tsx`:** These providers receive initial data fetched on the server and make it available to all client components, avoiding the need for redundant client-side fetching.

---

## 3. Data Source

The application is powered by a **PostgreSQL database**. All data fetching is centralized in `src/lib/data.ts`, and all data mutations are handled by server actions in `src/lib/actions.ts`. The connection to the database is configured in `src/lib/db.ts` and relies on the `POSTGRES_URL` environment variable.

The complete database schema, including tables, columns, and relationships, is documented in `docs/DATABASE_SCHEMA.md`.

---

## 4. Page Breakdown & Functionality

The application uses the Next.js App Router, where each folder in `src/app/` corresponds to a URL path.

| Page / Feature            | File Location                               | Description                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Homepage**              | `src/app/page.tsx`                          | The main landing page. As a Server Component, it pre-renders a hero section, search bar, and carousels of trending and regional recipes for fast loading and excellent SEO.                               |
| **Recipe Detail Page**    | `src/app/recipes/[id]/page.tsx`             | A Server Component that pre-renders all recipe details, including ingredients and steps. Interactive elements like the "Favorite" button and the step-by-step guide are handled by client components.  |
| **User Profile**          | `src/app/profile/page.tsx`                  | A client-side page allowing a logged-in user to view and edit their profile, see their favorite recipes, manage preferred cuisines, and track their community activity.                                  |
| **Cuisine-Specific Page** | `src/app/cuisine/[region]/page.tsx`         | A page that lists all recipes for a specific cuisine. The list of recipes is fetched and rendered on the server.                                                                                       |
| **Login & Signup**        | `src/app/login/page.tsx` & `signup/page.tsx`| Secure forms that use Server Actions (`loginAction`, `signupAction`) to handle authentication against the database, including password hashing with `bcryptjs`.                                         |
| **Community Hub**         | `src/app/community/page.tsx`                | The main entry point for the community section. It displays a tabbed interface for a logged-in user to see groups they've created, groups they are a member of, and to explore all other available groups. |
| **Group Detail Page**     | `src/app/community/[id]/page.tsx`           | The discussion board for a single group. All interactions (creating posts, commenting, reacting) are handled by secure Server Actions that update the database in real-time.                             |
| **Admin Dashboard**       | `src/app/admin/page.tsx`                    | A protected page for administrators. All functions—managing recipes, moderating users, viewing analytics, and overseeing community groups—are directly connected to the database via server actions.     |
| **Sitemap**               | `src/app/sitemap.ts`                        | A special file that dynamically generates a `sitemap.xml` file by fetching all published recipes and groups from the database, ensuring search engines can efficiently index the entire site.           |

---

## 5. Key Components

While there are many components, here are a few of the most important ones:

| Component                 | File Location                       | Description                                                                                                          |
| ------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Header & Footer**       | `src/components/layout/`            | The main navigation and footer for the site. The header dynamically shows links based on the user's auth state.      |
| **RecipeCard**            | `src/components/recipe-card.tsx`    | A reusable card component used to display a recipe's summary on the homepage and other listing pages.                |
| **RecipeInteraction**     | `src/components/recipe-interaction.tsx` | A client component that manages all interactive parts of the recipe page, including the cooking guide and tip submission. |
| **ShadCN UI Components**  | `src/components/ui/`                | The base UI components like `Button`, `Card`, `Input`, etc., that form the application's design system.              |
| **Admin Components**      | `src/components/admin/`             | Components specifically built for the various tabs within the Admin Dashboard, all powered by server actions.        |

This guide should provide a solid foundation for understanding how the RecipeRadar application is built and where to find the relevant code for each piece of its functionality.
