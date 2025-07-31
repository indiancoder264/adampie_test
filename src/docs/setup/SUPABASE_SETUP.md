# How to Connect and Configure Supabase

This guide will walk you through setting up a PostgreSQL database on Supabase, connecting it to your RecipeRadar application, and configuring the necessary real-time and security features.

---

## Part 1: Initial Database Setup

If you have already set up your database by running the `schema.sql` script, you can skip to Part 2.

### Step 1: Create a Supabase Project

1.  Go to [supabase.com](https://supabase.com) and create an account or log in.
2.  Click on **"New project"**.
3.  Choose an organization, give your project a **Name** (e.g., "RecipeRadar"), and generate a secure **Database Password**. Make sure to save this password somewhere safe!
4.  Choose the region closest to your users.
5.  Click **"Create new project"**.

### Step 2: Run the Database Schema Script

1.  Once your project is ready, navigate to the **SQL Editor** in the Supabase dashboard (it has a `SQL` icon).
2.  Click **"+ New query"**.
3.  Open the `database/schema.sql` file in this project.
4.  Copy the **entire content** of the `schema.sql` file.
5.  Paste the content into the Supabase SQL Editor and click the **"RUN"** button.

### Step 3: Get the Database Connection String

1.  In the Supabase dashboard, go to **Settings** (the gear icon) -> **Database**.
2.  Scroll down to the **Connection string** section.
3.  Make sure the **"Use connection pooling"** tab is selected.
4.  Copy the URI. It will look like `postgres://postgres.[your-project-ref]:[your-password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`.

### Step 4: Add the Connection String to Your Application

1.  In your project, find the `.env` file at the root.
2.  Add the following line, replacing `[your-password]` with your actual database password:
    ```
    POSTGRES_URL="[YOUR_COPIED_CONNECTION_STRING]"
    ```

---

## Part 2: Configuring Real-Time Functionality

These steps are required to make the instant updates work in the app.

### Step 5: Get Supabase API Keys

The application needs these keys to listen for database changes in real-time.

1.  In the Supabase dashboard, go to **Settings** (the gear icon) -> **API**.
2.  In the **Project API Keys** section, you will find two values you need.
    *   Copy the **Project URL**.
    *   Copy the **`anon` `public` key**.
3.  In your project's `.env` file, add these two values:
    ```
    NEXT_PUBLIC_SUPABASE_URL="[YOUR_PROJECT_URL]"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_ANON_PUBLIC_KEY]"
    ```

### Step 6: Enable Real-Time Broadcasting via Publications

You need to tell Supabase which tables it should broadcast changes for.

1.  In the Supabase dashboard, go to **Database** (the database icon) -> **Publication**.
2.  You will see a publication named `supabase_realtime`. By default, it has `0` tables. Click on `supabase_realtime` to edit it.
3.  Under **"Tables in publication"**, look for the section that says **"Tables not in publication"**.
4.  Toggle the switch **ON** for the following tables:
    *   `users`
    *   `recipes`
    *   `groups`
    *   `posts`
    *   `comments`
5.  Click **"Save"**. Supabase is now set to broadcast changes for these tables.

---

## Part 3: Securing Your Data with Row Level Security (RLS)

**This is the most important part.** Without these rules, your data is open for anyone to read or modify. RLS ensures that users can only access the data they are supposed to.

1.  In the Supabase dashboard, go to **Authentication** (the user icon) -> **Policies**.
2.  For each of the tables listed below, click on the table name and then **"New Policy"**.

### For the `users` table:

*   **Policy 1: Enable read access for everyone**
    *   Click **"New Policy"** -> **"Get started quickly"**.
    *   Choose the template: **"Enable read access for all users"**
    *   Review the policy and click **"Use this template"**.
*   **Policy 2: Enable users to update their own data**
    *   Click **"New Policy"** again.
    *   Choose **"Create a new policy from scratch"**.
    *   **Policy name:** `Allow users to update their own data`
    *   **Allowed operation:** Check the box for `UPDATE`
    *   **USING expression:** `(auth.uid() = id)`
    *   **WITH CHECK expression:** `(auth.uid() = id)`
    *   Click **"Review"** and then **"Save policy"**.

### For the `recipes` table:

*   **Enable read access for everyone:**
    *   Click **"New Policy"** -> **"Get started quickly"**.
    *   Template: **"Enable read access for all users"**
    *   Review and **"Use this template"**.

### For the `groups` table:

*   **Enable read access for everyone:**
    *   Click **"New Policy"** -> **"Get started quickly"**.
    *   Template: **"Enable read access for all users"**
    *   Review and **"Use this template"**.

After adding these policies, you must enable RLS for each table. Go back to the main **Policies** page, where you will see a list of your tables with "RLS is disabled". Click **"Enable RLS"** for each of the tables: `users`, `recipes`, and `groups`.

Your application is now fully configured for secure, real-time functionality!
