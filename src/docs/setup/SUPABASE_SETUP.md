# How to Connect to Supabase

This guide will walk you through the process of setting up a PostgreSQL database on Supabase and connecting it to your RecipeRadar application.

---

### Step 1: Create a Supabase Project

1.  Go to [supabase.com](https://supabase.com) and create an account or log in.
2.  Click on **"New project"**.
3.  Choose an organization, give your project a **Name** (e.g., "RecipeRadar"), and generate a secure **Database Password**. Make sure to save this password somewhere safe!
4.  Choose the region closest to your users.
5.  Click **"Create new project"**. It will take a few minutes for your new Supabase backend to be provisioned.

---

### Step 2: Run the Database Schema Script

Your project needs the correct database tables, functions, and triggers to work. We have a script that does all of this for you.

1.  Once your project is ready, navigate to the **SQL Editor** in the Supabase dashboard (it has a `SQL` icon).
2.  Click **"+ New query"**.
3.  Open the `database/schema.sql` file in this project.
4.  Copy the **entire content** of the `schema.sql` file.
5.  Paste the content into the Supabase SQL Editor.
6.  Click the **"RUN"** button. You should see a "Success. No rows returned" message.

Your database is now fully set up with all the necessary tables.

---

### Step 3: Get the Database Connection String

The application needs a secure way to connect to your new database.

1.  In the Supabase dashboard, go to **Settings** (the gear icon).
2.  In the sidebar, click on **Database**.
3.  Scroll down to the **Connection string** section.
4.  Make sure the **"Use connection pooling"** tab is selected. This is essential for performance and managing connections in a serverless environment.
5.  You will see a URI (a URL). **Copy this connection string.** It will look something like `postgres://postgres.[your-project-ref]:[your-password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`.

---

### Step 4: Add the Connection String to Your Application

**This is the most critical security step.** You must never write the connection string directly in your code. We will use an environment variable.

1.  In your project, find the `.env` file at the root.
2.  Add a new line to this file:
    ```
    POSTGRES_URL="[YOUR_COPIED_CONNECTION_STRING]"
    ```
3.  **Important:** Replace `[your-password]` in the string you pasted with the actual database password you saved in Step 1.
4.  The `.env` file is **never** committed to version control (it's listed in `.gitignore`), ensuring your secret keys and connection strings do not get exposed.

Your application is now fully connected to your Supabase database! When you run the app, it will read this environment variable to establish a secure connection.
