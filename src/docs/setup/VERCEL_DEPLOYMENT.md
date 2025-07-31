
# How to Deploy to Vercel

Vercel is the creator of Next.js and provides a seamless, zero-configuration hosting experience for Next.js applications. This guide will walk you through deploying your RecipeRadar project.

---

### Prerequisites

Before deploying, ensure you have:

1.  **A Supabase Project:** You must have your PostgreSQL database set up. See the `SUPABASE_SETUP.md` guide. You will need your full `POSTGRES_URL` connection string.
2.  **A Resend Account:** You must have your email provider configured. See the `RESEND_SETUP.md` guide. You will need your `RESEND_API_KEY`.
3.  **A GitHub Account:** Your project code should be pushed to a GitHub repository.

---

### Step 1: Push Your Project to GitHub

Vercel works by connecting directly to a Git repository.

1.  Create a new repository on [GitHub](https://github.com/new).
2.  In your local project terminal, link your project to the new GitHub repository and push your code:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    git branch -M main
    git push -u origin main
    ```

---

### Step 2: Create a Vercel Project

1.  Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.
2.  On your Vercel dashboard, click **"Add New..."** and select **"Project"**.
3.  The **"Import Git Repository"** screen will appear. Find your project's repository and click **"Import"**.

---

### Step 3: Configure Environment Variables

This is the most important step for connecting your database and email service securely.

1.  After importing, Vercel will show you a **"Configure Project"** screen.
2.  Expand the **"Environment Variables"** section.
3.  Add the following secrets, one by one. Click "Add" after entering each one.

    *   **Name:** `POSTGRES_URL`
    *   **Value:** Paste your full database connection string from Supabase here (the one that includes your password).

    *   **Name:** `RESEND_API_KEY`
    *   **Value:** Paste your API key from Resend here.
    
    *   **Name:** `NEXT_PUBLIC_SUPABASE_URL`
    *   **Value:** Paste your Supabase Project URL here.

    *   **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   **Value:** Paste your Supabase `anon` `public` key here.

    *   **Name:** `NEXT_PUBLIC_BASE_URL`
    *   **Value:** Enter the final, public URL of your site (e.g., `https://my-recipe-app.vercel.app`). 
    *   **Security Note:** This variable is **critical for security**. It is used to generate password reset links, sitemaps, and other absolute URLs. Using a fixed, trusted URL from this variable prevents "Host Header Injection" attacks. Never construct these links dynamically from request headers.

    **Security Note:** Vercel encrypts these environment variables, ensuring they are never exposed to the client-side code. This is the correct and secure way to handle secrets.

4.  Click the **"Deploy"** button.

---

### Step 4: All Done!

That's it! Vercel will now build your application and deploy it to its global network. The process usually takes a minute or two. Once complete, you'll be given a URL where you can see your live RecipeRadar application.

From now on, every time you `git push` a new change to your `main` branch on GitHub, Vercel will automatically trigger a new build and deploy the update for you.
