# RecipeRadar - Security Vulnerability Assessment

This document outlines potential security vulnerabilities and areas for improvement within the RecipeRadar application. While the app employs several security best practices, this assessment is intended to guide future hardening efforts for a production environment.

---

## 1. Authentication & Session Management

### 1.1. Session Token Vulnerabilities
- **Vulnerability:** The application now uses database-backed sessions, which is a major improvement. However, the session tokens themselves do not automatically rotate and old sessions are only cleaned out when they expire.
- **Risks:** While logout and password changes correctly invalidate sessions, a very long-lived session could still pose a risk if the database record is ever compromised.
- **Recommendation:** For extremely high-security applications, implement session token rotation, where the session ID is changed periodically during a user's active session.

### 1.2. Insecure Admin Authentication
- **Vulnerability:** ~~The primary administrator login is handled by comparing user input against plaintext environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).~~
- **Risks:**
    - ~~**Exposure of Credentials:** Storing a plaintext password in an environment variable is a high-risk practice. If the environment variables are ever exposed, the admin account is immediately compromised.~~
- **Mitigation:** **[FIXED]** The environment variable-based login has been removed. All users, including administrators, must now log in via the standard, secure database authentication flow. An admin is designated by an `is_admin = true` flag in the `users` table.

## 2. Authorization & Access Control

### 2.1. Decentralized Authorization Checks
- **Vulnerability:** Authorization logic (e.g., `if (!user?.isAdmin)`) is scattered across numerous server actions.
- **Risks:**
    - **Human Error:** It is very easy for a developer to forget to add an authorization check to a new server action, immediately creating a security hole. For example, if a new admin-only action is created without the `isAdmin` check, any logged-in user could potentially call it.
    - **Inconsistent Checks:** Different parts of the app might implement checks slightly differently, leading to subtle bugs and potential bypasses.
- **Recommendation:** Centralize authorization logic. This could be achieved by creating higher-order functions or middleware that wrap server actions, checking for required roles (e.g., `withAdminAuth(myAction)`) before executing the core logic.

## 3. Input Validation & Injection Attacks

### 3.1. Cross-Site Scripting (XSS)
- **Current Mitigation:** React's JSX rendering automatically escapes data, which is a strong defense against stored XSS in the primary UI.
- **Potential Risk:**
    - **Email Generation:** ~~The `sendVerificationEmail` function directly includes variables like `name` and `email` in the HTML body. An attacker with a malicious name like `<script>alert(1)</script>` could attempt to execute code in the user's email client.~~
- **Mitigation:** **[FIXED]** The `sendVerificationEmail` function now sanitizes all user-provided data before embedding it in the HTML email body, preventing the injection of malicious scripts.

### 3.2. SQL Injection (Largely Mitigated)
- **Current Mitigation:** The application consistently uses parameterized queries via the `pg` library (e.g., `client.query('... WHERE id = $1', [userId])`). This is the industry-standard defense against SQL Injection and is implemented correctly throughout the data access layer.
- **Potential Risk:** This is currently a low-risk area, but it's critical to maintain this discipline. Any future developer who deviates from this pattern and uses string concatenation to build a SQL query from user input would immediately introduce a critical SQL Injection vulnerability.
- **Recommendation:** Enforce a strict policy of using parameterized queries for all database interactions. Code reviews should specifically check for this.

## 4. Insecure Direct Object Reference (IDOR)

- **Vulnerability:** Several actions rely on the client to provide the correct ID for an object (e.g., `deleteCommentAction(commentId)`). The security relies entirely on the server-side check that ensures the logged-in user is the `author_id` of that comment.
- **Risks:** As with decentralized authorization, if this ownership check is ever missed or flawed in a server action, a user could potentially manipulate objects they don't own by simply guessing IDs. For example, a malicious user could try to call `deletePostAction('some-other-users-post-id')`.
- **Recommendation:** Continue to be vigilant with ownership checks in every server action that modifies data. Centralizing these checks where possible would further reduce risk.

## 5. Lack of Rate Limiting
- **Vulnerability:** Several sensitive actions do not have rate limits in place.
- **Risks:**
    - **Brute-Force Attacks:** An attacker could rapidly try to guess a user's password or an email verification OTP.
    - **Denial-of-Service (DoS):** An attacker could spam the email verification endpoint, potentially incurring costs or getting the service blocked.
- **Mitigation:** **[PARTIALLY FIXED]** Rate limiting has been added to the following actions:
    - **Password Changes:** Limited to 3 attempts per day.
    - **Name Changes:** Limited to 1 change per week.
    - **Email Change Requests:** Limited to 2 requests per day.
- **Recommendation:** Implement a more robust, IP-based rate-limiting solution using a middleware or a dedicated service like Upstash for more comprehensive protection.
    
## 6. Host Header Injection in Password Reset Flow

- **Vulnerability:** The application does not yet have a password reset feature, but when it is implemented, it could be vulnerable to Host Header Injection.
- **Risks:** An attacker could trick the server into generating a password reset link that points to a malicious domain. If they can get the legitimate user (e.g., an admin) to click this link, the attacker can intercept the password reset token and take over the account. This happens if the server action naively trusts the `Host` header from the incoming request to construct the link.
- **Prevention Guidance:**
    1.  **NEVER** use the `Host` header from the browser to construct absolute URLs.
    2.  **ALWAYS** use a canonical URL stored in an environment variable for generating links in emails or other services.
    3.  This application is pre-configured to use `process.env.NEXT_PUBLIC_BASE_URL` for this purpose. When building a password reset feature, ensure all links are constructed using this variable, like so:
        ```typescript
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
        ```
    4.  The `NEXT_PUBLIC_BASE_URL` variable **must be set** in the hosting environment (e.g., Vercel) for this protection to work.
