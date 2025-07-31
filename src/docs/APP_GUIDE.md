
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
-   **PostgreSQL:** The application's relational database, managed via the `pg` library. The complete schema is designed for scalability and documented in `src/docs/DATABASE_SCHEMA.md`.
-   **Resend:** Used as the email provider for sending OTP verification emails.
-   **Supabase:** Provides the PostgreSQL database and real-time functionality for live UI updates.

---

## 2. Core Concept: State Management & Data Flow

### Server-Side Data Fetching & Rendering

To ensure fast load times and optimal SEO, the application primarily uses **Next.js Server Components**. The root layout (`src/app/layout.tsx`) is an `async` component that pre-fetches all critical data (users, recipes, groups) for the entire application on the server. This data is then passed down to client components via React Context.

### Data Mutations with Server Actions

All actions that modify data (e.g., adding a recipe, deleting a user, posting a comment) are handled by **Next.js Server Actions** located in `src/lib/actions.ts`. This is a critical architectural and security feature. Authorization is handled centrally within these actions using helper functions like `getAuthenticatedUser()` and `getAdminUser()`, ensuring that all permission checks and data validation happen securely on the server.

### Client-Side State Management & Real-Time Updates

-   **React Context:** Global client-side state is managed using React's built-in Context API. The `Providers` component in `src/app/providers.tsx` wraps the application and makes server-fetched data available to all client components.
-   **Supabase Real-Time:** The application subscribes to database changes using Supabase. When the database is updated (e.g., a new group is created), Supabase sends a message to the client. The relevant Context Provider (e.g., `CommunityProvider`) listens for these messages and updates its state, causing the UI to re-render in real-time without needing a page refresh.

---

## 3. Data Source & Setup

The application is powered by a **PostgreSQL database**, hosted on Supabase.

-   **Data Fetching:** All initial data fetching is centralized in `src/lib/data.ts`.
-   **Data Mutations:** All writes to the database are handled by server actions in `src/lib/actions.ts`.
-   **Connection:** The connection to the database is configured in `src/lib/db.ts` and relies on the `POSTGRES_URL` environment variable.
-   **Schema:**
    -   The complete database schema is documented in `src/docs/DATABASE_SCHEMA.md`.
    -   The full, executable script to set up a new database from scratch is located at `database/schema.sql`.

---

## 4. Page Breakdown & Functionality

A detailed breakdown of each page's technical implementation can be found in `src/docs/implementation.md`.

---

## 5. File Structure

A comprehensive guide to the project's file structure can be found in `src/docs/FILE_STRUCTURE.md`.
