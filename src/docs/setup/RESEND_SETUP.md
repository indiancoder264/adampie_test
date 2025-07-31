
# How to Connect the Resend Email Service

This guide explains how to set up the Resend email service to send verification and password reset emails for your RecipeRadar application.

---

### Step 1: Create a Resend Account

1.  Go to [resend.com](https://resend.com) and sign up for a free account.
2.  The free plan is generous and perfect for getting started, offering a substantial number of free emails per month.

---

### Step 2: Add and Verify Your Domain

For emails to be delivered reliably and not end up in spam folders, you must send them from a domain you own.

1.  In the Resend dashboard, go to the **"Domains"** section from the side navigation.
2.  Click **"Add Domain"** and enter a domain you have access to (e.g., `your-cool-app.com`).
3.  Resend will provide you with a few DNS records (usually `MX` and `TXT` records) that you need to add to your domain's DNS settings. This is done through your domain registrar (like GoDaddy, Namecheap, Google Domains, etc.).
4.  Follow the instructions provided by Resend and your registrar to add these records. It may take some time for the changes to propagate.
5.  Once Resend detects the DNS changes, your domain will be marked as **"Verified"**. You can now send emails from any address at that domain (e.g., `hello@your-cool-app.com`).

**Note:** For development, you can skip this and send emails from Resend's default `onboarding@resend.dev` address, but this is **not recommended for a live application.** The `actions.ts` file is currently configured to send emails to a hardcoded address for testing purposes. Remember to change this to the user's actual email for production.

---

### Step 3: Create an API Key

Your application needs a secret key to authenticate with Resend's servers.

1.  In the Resend dashboard, go to the **"API Keys"** section.
2.  Click **"+ Create API Key"**.
3.  Give the key a name (e.g., "RecipeRadar App").
4.  Set the **Permission** to **"Sending access"**. You do not need to give it full access.
5.  Click **"Add"**.
6.  Resend will show you your API key **one time only**. Copy it immediately and store it somewhere safe.

---

### Step 4: Add the API Key to Your Application

Just like the database connection string, your API key is a secret and must be handled securely.

1.  In your project, open the `.env` file at the root.
2.  Add a new line to this file:
    ```
    RESEND_API_KEY="[YOUR_COPIED_API_KEY]"
    ```
3.  Replace `[YOUR_COPIED_API_KEY]` with the key you just created in the Resend dashboard.
4.  The `.env` file is intentionally not tracked by Git, which prevents your secret key from being exposed.

The `sendEmail` function in `src/lib/actions.ts` is already configured to read this environment variable. Once you add the key, the email verification system will be fully operational.
