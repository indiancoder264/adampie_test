

"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import getPool from './db';
import type { User } from "./auth";
import type { Recipe, Tip } from "./recipes";
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Post, Comment, Report } from "./community";
import { Resend } from 'resend';
import { redirect } from "next/navigation";
import { fetchUserById } from "./data";
import { randomUUID } from "crypto";
import { checkRateLimit } from "./rate-limiter";


// --- Helper Functions ---

/**
 * Creates a new session for a user and sets the session cookie.
 */
async function createSession(userId: string, currentSessionId?: string) {
    const pool = getPool();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const sessionToken = randomUUID();
    const headersList = await headers();
    const userAgent = headersList.get('user-agent');
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0].trim() || headersList.get('x-real-ip')?.trim();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Invalidate all other sessions for this user for security
        if (currentSessionId) {
            await client.query('DELETE FROM sessions WHERE user_id = $1 AND id != $2', [userId, currentSessionId]);
        } else {
            await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
        }

        await client.query(
            'INSERT INTO sessions (id, user_id, expires_at, user_agent, ip_address) VALUES ($1, $2, $3, $4, $5)',
            [sessionToken, userId, expiresAt, userAgent, ipAddress]
        );
        await client.query('COMMIT');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Failed to create session and clear old ones:", error);
        throw new Error("Session creation failed.");
    } finally {
        client.release();
    }


    (await cookies()).set("session_token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
    });
    return sessionToken;
}

/**
 * Sanitizes a string to be safely included in HTML content.
 */
function sanitizeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}


// --- Email Sending ---
async function sendEmail(email: string, subject: string, htmlContent: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Resend API key is not configured.");
      throw new Error("Server configuration error: Email service is not set up.");
    }
    
    const resend = new Resend(apiKey);

    try {
        await resend.emails.send({
            from: 'RecipeRadar <onboarding@resend.dev>',
            // The line below is a temporary workaround for development.
            // When a custom domain is configured with Resend, replace it with the commented-out line below.
            to: 'Bobby.ch6969@gmail.com',
            // to: email,
            subject: subject,
            html: htmlContent,
        });
    } catch (error) {
        console.error("Failed to send email:", error);
        throw new Error("Could not send email.");
    }
}

// --- Centralized Authorization Helpers ---

/**
 * Gets the currently authenticated user from the session cookie.
 * Throws an error if the user is not authenticated or the session is invalid.
 * @returns {Promise<User>} The authenticated user object.
 */
async function getAuthenticatedUser(): Promise<User> {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;
    if (!sessionToken) {
        throw new Error("Authentication required: No session token found.");
    }

    const pool = getPool();
    const sessionRes = await pool.query('SELECT user_id FROM sessions WHERE id = $1 AND expires_at > NOW()', [sessionToken]);
    if (sessionRes.rows.length === 0) {
        throw new Error("Authentication required: Invalid or expired session.");
    }

    const user = await fetchUserById(sessionRes.rows[0].user_id);
    if (!user) {
        throw new Error("Authentication required: User not found.");
    }
    return user;
}


/**
 * Gets the currently authenticated user and verifies they are an administrator.
 * Throws an error if the user is not authenticated or not an admin.
 * @returns {Promise<User>} The authenticated admin user object.
 */
async function getAdminUser(): Promise<User> {
    const user = await getAuthenticatedUser();
    if (!user.isAdmin) {
        throw new Error("Authorization failed: User is not an administrator.");
    }
    return user;
}


// --- Auth Actions ---
export async function loginAction(data: { email: string; password: string;}) {
    await checkRateLimit('login_attempt');
    const { email, password } = data;
    
    const pool = getPool();
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return { success: false, error: "No account found with this email address." };
        }

        const user = result.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return { success: false, error: "Incorrect password." };
        }

        if (!user.is_verified) {
            return { success: false, error: "Your email is not verified. Please check your inbox for a verification code." };
        }

        if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
             return { success: false, error: `Your account is suspended until ${new Date(user.suspended_until).toLocaleDateString()}.` };
        }

        await createSession(user.id);
        
        return { success: true, isAdmin: user.is_admin };

    } catch (error) {
        console.error(error);
        if (error instanceof Error && error.message.startsWith('Rate limit exceeded')) {
             return { success: false, error: error.message };
        }
        return { success: false, error: "An unexpected error occurred. Please try again." };
    } finally {
        client.release();
    }
}

export async function logoutAction() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;
    if (sessionToken) {
        const pool = getPool();
        await pool.query('DELETE FROM sessions WHERE id = $1', [sessionToken]);
    }
    cookieStore.delete("session_token");
    revalidatePath("/", "layout");
}

export async function signupAction(data: {name: string, email: string, password: string, country: string, dietaryPreference: string}) {
  await checkRateLimit('signup_attempt');
  const { name, email, password, country, dietaryPreference } = data;
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const existingEmailRes = await client.query(
        'SELECT id, is_verified, verification_emails_sent, last_verification_email_sent_at FROM users WHERE email = $1', 
        [email]
    );

    let userId;
    const verificationOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    if (existingEmailRes.rows.length > 0) {
        const existingUser = existingEmailRes.rows[0];
        userId = existingUser.id;

        if (existingUser.is_verified) {
            await client.query('ROLLBACK');
            return { success: false, error: "A user with this email already exists." };
        }

        // Rate limiting logic
        const now = new Date();
        const lastSent = existingUser.last_verification_email_sent_at ? new Date(existingUser.last_verification_email_sent_at) : null;
        let emailsSent = existingUser.verification_emails_sent;
        
        // Check if the last request was within the 6-hour window
        if (lastSent && (now.getTime() - lastSent.getTime()) < 6 * 60 * 60 * 1000) {
            if (emailsSent >= 3) {
                await client.query('ROLLBACK');
                return { success: false, error: "You have requested too many verification codes. Please try again later." };
            }
            emailsSent += 1;
        } else {
            // It's been more than 6 hours, so reset the counter
            emailsSent = 1;
        }

        // Update the existing unverified user record with new details and OTP
        const passwordHash = await bcrypt.hash(password, 10);
        await client.query(
            `UPDATE users 
             SET name = $1, password_hash = $2, country = $3, dietary_preference = $4, avatar_seed = $5, 
                 verification_otp = $6, verification_otp_expires = $7, 
                 verification_emails_sent = $8, last_verification_email_sent_at = NOW()
             WHERE id = $9`,
            [name, passwordHash, country, dietaryPreference, sanitizeHtml(name), verificationOtp, otpExpires, emailsSent, userId]
        );

    } else {
        // No existing user, create a new one
        const existingName = await client.query('SELECT id FROM users WHERE name ILIKE $1', [name]);
        if (existingName.rows.length > 0) {
          await client.query('ROLLBACK');
          return { success: false, error: "This name is already taken. Please choose another." };
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        const newUserRes = await client.query(
          `INSERT INTO users (name, email, password_hash, country, dietary_preference, avatar_seed, verification_otp, verification_otp_expires, verification_emails_sent, last_verification_email_sent_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, NOW()) RETURNING id`,
          [name, sanitizeHtml(email), passwordHash, country, dietaryPreference, sanitizeHtml(name), verificationOtp, otpExpires]
        );
        userId = newUserRes.rows[0].id;
    }

    const emailHtml = `
        <div style="font-family: sans-serif; text-align: center; padding: 20px;">
            <h2>Welcome to RecipeRadar!</h2>
            <p>Your verification code is:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${verificationOtp}</p>
            <p>This code will expire in 10 minutes.</p>
        </div>
    `;
    await sendEmail(email, `RecipeRadar Verification for ${email}`, emailHtml);
    
    await client.query('COMMIT');
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error(error);
    if (error.message.startsWith('Rate limit exceeded')) {
        return { success: false, error: error.message };
    }
    if (error.message.includes("Could not send verification email")) {
        return { success: false, error: "Account created, but failed to send verification email. Please contact support." };
    }
    return { success: false, error: "Failed to create account. Please try again." };
  } finally {
    client.release();
  }
}

export async function verifyOtpAction(email: string, otp: string) {
    const pool = getPool();
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, verification_otp_expires FROM users WHERE email = $1 AND verification_otp = $2 AND is_verified = false',
            [email, otp]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'Invalid verification code. Please try again.' };
        }

        const user = result.rows[0];
        if (new Date(user.verification_otp_expires) < new Date()) {
            return { success: false, error: 'Verification code has expired. Please sign up again to get a new one.' };
        }
        
        await client.query(
            'UPDATE users SET is_verified = true, verification_otp = NULL, verification_otp_expires = NULL WHERE id = $1',
            [user.id]
        );

        return { success: true, message: 'Your account has been successfully verified. You can now log in.' };
    } catch (error) {
        console.error('Email verification error:', error);
        return { success: false, error: 'An unexpected error occurred during verification.' };
    } finally {
        client.release();
    }
}

export async function requestPasswordResetAction(email: string) {
    await checkRateLimit('otp_request');
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const userRes = await client.query('SELECT * FROM users WHERE email = $1 AND is_verified = TRUE', [email]);
        if (userRes.rows.length === 0) {
            // Do not reveal if an email exists or not for security reasons
            await client.query('COMMIT');
            return { success: true };
        }
        const user = userRes.rows[0];

        // Rate Limiting Logic
        const now = new Date();
        const lastRequest = user.last_password_reset_request_at ? new Date(user.last_password_reset_request_at) : null;
        let requestsSent = user.password_reset_requests_sent;

        if (lastRequest && lastRequest.toDateString() === now.toDateString()) {
            if (requestsSent >= 3) {
                await client.query('ROLLBACK');
                return { success: false, error: "You have requested too many password resets today. Please try again tomorrow." };
            }
        } else {
            requestsSent = 0;
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await client.query(
            'UPDATE users SET password_reset_token = $1, password_reset_token_expires = $2, password_reset_requests_sent = $3, last_password_reset_request_at = NOW() WHERE id = $4',
            [otp, otpExpires, requestsSent + 1, user.id]
        );
        
        const emailHtml = `
            <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                <h2>Password Reset Request</h2>
                <p>You requested a password reset for your RecipeRadar account. Your 6-digit code is:</p>
                <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${otp}</p>
                <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
        `;
        await sendEmail(user.email, 'Your RecipeRadar Password Reset Code', emailHtml);
        
        await client.query('COMMIT');
        return { success: true };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in requestPasswordResetAction:", error);
         if (error instanceof Error && error.message.startsWith('Rate limit exceeded')) {
             return { success: false, error: error.message };
        }
        return { success: false, error: "An unexpected error occurred. Please try again." };
    } finally {
        client.release();
    }
}

export async function resetPasswordAction(data: { email: string, otp: string, password: string}) {
    const { email, otp, password } = data;
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const userRes = await client.query('SELECT * FROM users WHERE email = $1 AND password_reset_token = $2', [email, otp]);
        if (userRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, error: "Invalid password reset code. Please try again." };
        }
        const user = userRes.rows[0];

        if (new Date(user.password_reset_token_expires) < new Date()) {
            await client.query('ROLLBACK');
            return { success: false, error: "This password reset code has expired. Please request a new one." };
        }

        const newPasswordHash = await bcrypt.hash(password, 10);
        await client.query(
            'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_token_expires = NULL WHERE id = $2',
            [newPasswordHash, user.id]
        );
        
        // Invalidate all active sessions for this user for security
        await client.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);

        await client.query('COMMIT');
        return { success: true };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in resetPasswordAction:", error);
        return { success: false, error: "An unexpected error occurred while resetting your password." };
    } finally {
        client.release();
    }
}


// --- Recipe Actions ---

const recipeFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  region: z.string().min(2, "Region is required"),
  description: z.string().min(10, "Description must be at least 10 characters long"),
  prep_time: z.string().min(1, "Prep time is required"),
  cook_time: z.string().min(1, "Cook time is required"),
  servings: z.string().min(1, "Servings are required"),
  image_url: z.string().url("Must be a valid image URL"),
  published: z.boolean().default(true),
  dietary_type: z.enum(["Vegetarian", "Non-Vegetarian", "Vegan"]),
  meal_category: z.string().min(1, "Meal category is required."),
  consumption_time: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one consumption time.",
  }),
  dietary_notes: z.array(z.string()).optional(),
  ingredients: z.array(z.object({ value: z.string().min(1, "Ingredient cannot be empty") })).min(1, "At least one ingredient is required"),
  steps: z.array(z.object({ value: z.string().min(1, "Step cannot be empty") })).min(1, "At least one step is required"),
});

function parseIngredient(ingredientString: string): { quantity: string, name: string } {
    const parts = ingredientString.trim().split(' ');
    if (parts.length <= 1) {
        return { quantity: '', name: ingredientString.trim() };
    }
    const quantity = parts.shift() as string;
    const name = parts.join(' ');
    return { quantity, name };
}

export async function createOrUpdateRecipeAction(data: z.infer<typeof recipeFormSchema>, recipeId: string | null) {
    try {
        await getAdminUser();
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }

    const validation = recipeFormSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const {
        name, region, description, prep_time, cook_time, servings, image_url, published,
        dietary_type, meal_category, consumption_time, dietary_notes, ingredients, steps
    } = validation.data;
    
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let currentRecipeId = recipeId;
        if (currentRecipeId) {
            await client.query(
                `UPDATE recipes SET name = $1, region = $2, description = $3, prep_time = $4, cook_time = $5, servings = $6, image_url = $7, published = $8, dietary_type = $9, meal_category = $10, consumption_time = $11, dietary_notes = $12 WHERE id = $13`,
                [name, region, description, prep_time, cook_time, servings, image_url, published, dietary_type, meal_category, consumption_time, dietary_notes, currentRecipeId]
            );
            await client.query('DELETE FROM ingredients WHERE recipe_id = $1', [currentRecipeId]);
            await client.query('DELETE FROM steps WHERE recipe_id = $1', [currentRecipeId]);
        } else {
            const recipeRes = await client.query(
                `INSERT INTO recipes (name, region, description, prep_time, cook_time, servings, image_url, published, dietary_type, meal_category, consumption_time, dietary_notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
                [name, region, description, prep_time, cook_time, servings, image_url, published, dietary_type, meal_category, consumption_time, dietary_notes]
            );
            currentRecipeId = recipeRes.rows[0].id;
        }

        for (let i = 0; i < ingredients.length; i++) {
            const { quantity, name: ingredientName } = parseIngredient(ingredients[i].value);
            await client.query('INSERT INTO ingredients (recipe_id, quantity, name, display_order) VALUES ($1, $2, $3, $4)', [currentRecipeId, quantity, ingredientName, i + 1]);
        }
        for (let i = 0; i < steps.length; i++) {
            await client.query('INSERT INTO steps (recipe_id, step_number, description) VALUES ($1, $2, $3)', [currentRecipeId, i + 1, steps[i].value]);
        }

        await client.query('COMMIT');
        revalidatePath("/admin", "layout");
        if(currentRecipeId) revalidatePath(`/recipes/${currentRecipeId}`);
        revalidatePath("/", "layout");
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in createOrUpdateRecipeAction:", error);
        return { success: false, error: 'Database error occurred.' };
    } finally {
        client.release();
    }
}

export async function addOrUpdateTipAction(recipeId: string, tipData: { tip: string; rating: number }, user: User): Promise<{ success: boolean; error?: string; newTip?: Tip}> {
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let tipResult;
        const existingTipRes = await client.query('SELECT id FROM tips WHERE recipe_id = $1 AND user_id = $2', [recipeId, user.id]);
        
        // Gamification: Unlock "First Tip" achievement
        const achievementToUnlock = !user.achievements.includes('first_tip');

        if (existingTipRes.rows.length > 0) {
            tipResult = await client.query('UPDATE tips SET tip = $1, rating = $2, updated_at = NOW() WHERE id = $3 RETURNING *', [tipData.tip, tipData.rating, existingTipRes.rows[0].id]);
        } else {
            tipResult = await client.query('INSERT INTO tips (recipe_id, user_id, tip, rating) VALUES ($1, $2, $3, $4) RETURNING *', [recipeId, user.id, tipData.tip, tipData.rating]);
            if (achievementToUnlock) {
                await client.query(`UPDATE users SET achievements = array_append(achievements, 'first_tip') WHERE id = $1`, [user.id]);
            }
        }
        await client.query('COMMIT');

        const newTipData = tipResult.rows[0];

        revalidatePath(`/recipes/${recipeId}`);
        revalidatePath(`/admin`);
        revalidatePath(`/profile`);
        return { success: true, newTip: { id: newTipData.id, user_id: newTipData.user_id, user_name: user.name, tip: newTipData.tip, rating: newTipData.rating, created_at: newTipData.created_at.toISOString(), updated_at: (newTipData.updated_at || newTipData.created_at).toISOString() }};
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in addOrUpdateTipAction:", error);
        return { success: false, error: 'Database error occurred while adding tip.' };
    } finally {
        client.release();
    }
}

export async function deleteRecipeAction(recipeId: string) {
    try {
        await getAdminUser();
        const pool = getPool();
        await pool.query('DELETE FROM recipes WHERE id = $1', [recipeId]);
        revalidatePath("/admin", "layout");
        revalidatePath("/", "layout");
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete recipe.';
        return { success: false, error: errorMessage };
    }
}

export async function togglePublishAction(recipeId: string) {
    try {
        await getAdminUser();
        const pool = getPool();
        await pool.query('UPDATE recipes SET published = NOT published WHERE id = $1', [recipeId]);
        revalidatePath("/admin", "layout");
        revalidatePath("/", "layout");
        revalidatePath(`/recipes/${recipeId}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to toggle publish status.';
        return { success: false, error: errorMessage };
    }
}

export async function deleteTipAction(recipeId: string, tipId: string) {
    try {
        await getAdminUser();
        const pool = getPool();
        await pool.query('DELETE FROM tips WHERE id = $1', [tipId]);
        revalidatePath("/admin");
        revalidatePath(`/recipes/${recipeId}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete tip.';
        return { success: false, error: errorMessage };
    }
}


// --- Group Actions ---
export async function createGroupAction(data: { name: string; description: string }, user: User) {
    if (!user) return { success: false, error: "You must be logged in." };
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const groupRes = await client.query('INSERT INTO groups (name, description, creator_id) VALUES ($1, $2, $3) RETURNING id', [data.name, data.description, user.id]);
        const groupId = groupRes.rows[0].id;
        await client.query('INSERT INTO group_members (user_id, group_id) VALUES ($1, $2)', [user.id, groupId]);

        // Gamification: Unlock "Community Starter" achievement
        if (!user.achievements.includes('community_starter')) {
             await client.query(`UPDATE users SET achievements = array_append(achievements, 'community_starter') WHERE id = $1`, [user.id]);
        }

        await client.query('COMMIT');
        revalidatePath('/community', 'layout');
        revalidatePath('/profile');
        return { success: true, groupId };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return { success: false, error: 'Failed to create group.' };
    } finally {
        client.release();
    }
}

export async function deleteGroupAction(groupId: string) {
    try {
        const user = await getAuthenticatedUser();
        const pool = getPool();
        
        // Admins can delete any group. Creators can delete their own group.
        const result = await pool.query(
            'DELETE FROM groups WHERE id = $1 AND ($2 OR creator_id = $3) RETURNING id',
            [groupId, user.isAdmin, user.id]
        );

        if (result.rowCount === 0) {
            return { success: false, error: "Unauthorized. You are not the creator or an admin." };
        }

        revalidatePath('/community', 'layout');
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete group.';
        return { success: false, error: errorMessage };
    }
}

export async function editGroupAction(groupId: string, data: { name: string, description: string }) {
    try {
        const user = await getAuthenticatedUser();
        const pool = getPool();
        const result = await pool.query(
            'UPDATE groups SET name = $1, description = $2 WHERE id = $3 AND creator_id = $4 RETURNING id',
            [data.name, data.description, groupId, user.id]
        );

        if (result.rowCount === 0) {
            return { success: false, error: "You do not have permission to edit this group." };
        }
        revalidatePath(`/community`, 'layout');
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to edit group.';
        return { success: false, error: errorMessage };
    }
}

// --- Community Content Actions ---
export async function addPostAction(groupId: string, content: string, recipeId?: string) {
    try {
        const user = await getAuthenticatedUser();
        const pool = getPool();
        await pool.query(
            'INSERT INTO posts (group_id, author_id, content, shared_recipe_id) VALUES ($1, $2, $3, $4)',
            [groupId, user.id, content, recipeId || null]
        );
        revalidatePath(`/community/${groupId}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to add post.';
        return { success: false, error: errorMessage };
    }
}

export async function editPostAction(postId: string, content: string) {
    try {
        const user = await getAuthenticatedUser();
        const pool = getPool();
        const result = await pool.query(
            'UPDATE posts SET content = $1, updated_at = NOW() WHERE id = $2 AND author_id = $3 RETURNING group_id',
            [content, postId, user.id]
        );
        
        if (result.rowCount === 0) {
            return { success: false, error: "You don't have permission to edit this post." };
        }
        revalidatePath(`/community/${result.rows[0].group_id}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to edit post.';
        return { success: false, error: errorMessage };
    }
}

export async function deletePostAction(postId: string) {
    try {
        const user = await getAuthenticatedUser();
        const pool = getPool();
        const postRes = await pool.query('SELECT author_id, group_id FROM posts WHERE id = $1', [postId]);
        if (postRes.rows.length === 0) {
            return { success: false, error: "Post not found." };
        }

        const isAuthor = postRes.rows[0].author_id === user.id;
        if (!user.isAdmin && !isAuthor) {
            return { success: false, error: "You don't have permission to delete this post." };
        }

        await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
        revalidatePath(`/community/${postRes.rows[0].group_id}`);
        revalidatePath('/admin', 'layout');
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete post.';
        return { success: false, error: errorMessage };
    }
}

export async function addCommentAction(postId: string, content: string) {
    try {
        const user = await getAuthenticatedUser();
        const pool = getPool();
        const postRes = await pool.query('SELECT group_id FROM posts WHERE id = $1', [postId]);
        if (postRes.rows.length === 0) {
            return { success: false, error: "Post not found." };
        }
        await pool.query('INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3)', [postId, user.id, content]);
        revalidatePath(`/community/${postRes.rows[0].group_id}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to add comment.';
        return { success: false, error: errorMessage };
    }
}

export async function editCommentAction(commentId: string, content: string) {
    try {
        const user = await getAuthenticatedUser();
        const pool = getPool();
        const result = await pool.query(
            `UPDATE comments SET content = $1, updated_at = NOW() 
             FROM posts 
             WHERE comments.post_id = posts.id AND comments.id = $2 AND comments.author_id = $3 
             RETURNING posts.group_id`,
            [content, commentId, user.id]
        );
        
        if (result.rowCount === 0) {
            return { success: false, error: "You don't have permission to edit this comment." };
        }
        revalidatePath(`/community/${result.rows[0].group_id}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to edit comment.';
        return { success: false, error: errorMessage };
    }
}

export async function deleteCommentAction(commentId: string) {
    try {
        const user = await getAuthenticatedUser();
        const pool = getPool();
        const commentRes = await pool.query('SELECT c.author_id, p.group_id FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.id = $1', [commentId]);
        if(commentRes.rows.length === 0) {
            return { success: false, error: "Comment not found."};
        }
        
        const isAuthor = commentRes.rows[0].author_id === user.id;
        if (!user.isAdmin && !isAuthor) {
            return { success: false, error: "You don't have permission to delete this comment." };
        }

        await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
        revalidatePath(`/community/${commentRes.rows[0].group_id}`);
        revalidatePath('/admin', 'layout');
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete comment.';
        return { success: false, error: errorMessage };
    }
}

export async function togglePostReactionAction(postId: string, reaction: 'like' | 'dislike') {
    const user = await getAuthenticatedUser();
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const postRes = await client.query('SELECT group_id FROM posts WHERE id = $1', [postId]);
        if (postRes.rows.length === 0) {
             await client.query('ROLLBACK');
             return { success: false, error: "Post not found." };
        }
        
        const existingReaction = await client.query('SELECT reaction FROM post_reactions WHERE user_id = $1 AND post_id = $2', [user.id, postId]);
        if (existingReaction.rows.length > 0) {
            if (existingReaction.rows[0].reaction === reaction) {
                await client.query('DELETE FROM post_reactions WHERE user_id = $1 AND post_id = $2', [user.id, postId]);
            } else {
                await client.query('UPDATE post_reactions SET reaction = $1 WHERE user_id = $2 AND post_id = $3', [reaction, user.id, postId]);
            }
        } else {
            await client.query('INSERT INTO post_reactions (user_id, post_id, reaction) VALUES ($1, $2, $3)', [user.id, postId, reaction]);
        }
        await client.query('COMMIT');
        revalidatePath(`/community/${postRes.rows[0].group_id}`);
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to react to post.';
        return { success: false, error: errorMessage };
    } finally {
        client.release();
    }
}

export async function reportContentAction(contentId: string, contentType: 'post' | 'comment', reason: string, details?: string) {
    try {
        const user = await getAuthenticatedUser();
        const pool = getPool();
        const postRes = await pool.query(contentType === 'post' ? 'SELECT group_id FROM posts WHERE id = $1' : 'SELECT p.group_id FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.id = $1', [contentId]);
        if (postRes.rows.length === 0) {
            return { success: false, error: "Content not found." };
        }
        await pool.query('INSERT INTO reports (reporter_id, content_id, content_type, reason, details) VALUES ($1, $2, $3, $4, $5)', [user.id, contentId, contentType, reason, details]);
        revalidatePath(`/community/${postRes.rows[0].group_id}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to submit report.';
        return { success: false, error: errorMessage };
    }
}

export async function dismissReportAction(contentId: string, contentType: 'post' | 'comment') {
    try {
        await getAdminUser();
        const pool = getPool();
        await pool.query('UPDATE reports SET is_dismissed = TRUE WHERE content_id = $1 AND content_type = $2', [contentId, contentType]);
        revalidatePath('/admin', 'layout');
        return { success: true };
    } catch (error) {
        console.error("Error dismissing report:", error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to dismiss report.';
        return { success: false, error: errorMessage };
    }
}


// --- User Actions ---
export async function deleteUserAction(userId: string) {
    try {
        await getAdminUser();
        const pool = getPool();
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        revalidatePath("/admin", "layout");
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete user.';
        return { success: false, error: errorMessage };
    }
}

export async function suspendUserAction(userId: string, days: number) {
    try {
        await getAdminUser();
        const pool = getPool();
        await pool.query('UPDATE users SET suspended_until = NOW() + ($1 * INTERVAL \'1 day\') WHERE id = $2', [days, userId]);
        revalidatePath("/admin", "layout");
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to suspend user.';
        return { success: false, error: errorMessage };
    }
}

export async function unsuspendUserAction(userId: string) {
    try {
        await getAdminUser();
        const pool = getPool();
        await pool.query('UPDATE users SET suspended_until = NULL WHERE id = $1', [userId]);
        revalidatePath("/admin", "layout");
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to unsuspend user.';
        return { success: false, error: errorMessage };
    }
}

export async function joinGroupAction(groupId: string) {
    try {
        const user = await getAuthenticatedUser();
        const pool = getPool();
        await pool.query('INSERT INTO group_members (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, groupId]);
        revalidatePath(`/community/${groupId}`);
        revalidatePath('/community', 'layout');
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to join group.';
        return { success: false, error: errorMessage };
    }
}

export async function leaveGroupAction(groupId: string) {
    try {
        const user = await getAuthenticatedUser();
        const pool = getPool();
        await pool.query('DELETE FROM group_members WHERE user_id = $1 AND group_id = $2', [user.id, groupId]);
        revalidatePath(`/community/${groupId}`);
        revalidatePath('/community', 'layout');
        return { success: true };
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to leave group.';
        return { success: false, error: errorMessage };
    }
}

export async function requestEmailChangeAction(newEmail: string) {
    const user = await getAuthenticatedUser();
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const dbUserRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [user.id]);
        const dbUser = dbUserRes.rows[0];

        const existingEmail = await client.query('SELECT id FROM users WHERE email = $1 AND is_verified = TRUE AND id != $2', [newEmail, user.id]);
        if (existingEmail.rows.length > 0) {
            await client.query('ROLLBACK');
            return { success: false, error: "This email address is already in use by another account." };
        }

        const now = new Date();
        const lastRequest = dbUser.last_new_email_request_at ? new Date(dbUser.last_new_email_request_at) : null;
        let requestsSent = dbUser.new_email_requests_sent;

        if (lastRequest && lastRequest.toDateString() === now.toDateString()) {
            if (requestsSent >= 2) {
                await client.query('ROLLBACK');
                return { success: false, error: "You have requested too many email changes today. Please try again tomorrow." };
            }
        } else {
            requestsSent = 0;
        }

        const verificationOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        await client.query(
            'UPDATE users SET pending_new_email = $1, new_email_otp = $2, new_email_otp_expires = $3, new_email_requests_sent = $4, last_new_email_request_at = NOW() WHERE id = $5',
            [newEmail, verificationOtp, otpExpires, requestsSent + 1, user.id]
        );
        
        const emailHtml = `
            <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                <h2>You requested to change your email address on RecipeRadar.</h2>
                <p>Your verification code is:</p>
                <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${verificationOtp}</p>
                <p>This code will expire in 10 minutes.</p>
            </div>
        `;
        await sendEmail(newEmail, 'Verify Your New RecipeRadar Email', emailHtml);
        
        await client.query('COMMIT');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error requesting email change:", error);
        const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
        return { success: false, error: errorMessage };
    } finally {
        client.release();
    }
}


export async function updateUserAction(data: Partial<Pick<User, 'name' | 'country' | 'dietaryPreference'>>, otp?: string) {
    const user = await getAuthenticatedUser();
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const updates = [];
        const values = [];
        let valueIndex = 1;

        if (data.name && data.name !== user.name) {
            const dbUserRes = await client.query('SELECT name_last_changed_at FROM users WHERE id = $1', [user.id]);
            const dbUser = dbUserRes.rows[0];
            if (dbUser.name_last_changed_at) {
                const lastChange = new Date(dbUser.name_last_changed_at);
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                if (lastChange > oneWeekAgo) {
                    await client.query('ROLLBACK');
                    return { success: false, error: "You can only change your name once every 7 days." };
                }
            }
            updates.push(`name = $${valueIndex++}`, `avatar_seed = $${valueIndex++}`, `name_last_changed_at = NOW()`);
            values.push(data.name, data.name);
        }

        if (otp) {
            const result = await client.query(
                'SELECT pending_new_email, new_email_otp_expires FROM users WHERE id = $1 AND new_email_otp = $2',
                [user.id, otp]
            );

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, error: "Invalid verification code." };
            }
            const pendingData = result.rows[0];
            if (new Date(pendingData.new_email_otp_expires) < new Date()) {
                await client.query('ROLLBACK');
                return { success: false, error: "Verification code has expired." };
            }
            
            updates.push(`email = $${valueIndex++}`, `pending_new_email = NULL`, `new_email_otp = NULL`, `new_email_otp_expires = NULL`);
            values.push(pendingData.pending_new_email);
        }

        if (data.country && data.country !== user.country) {
            updates.push(`country = $${valueIndex++}`);
            values.push(data.country);
        }
        if (data.dietaryPreference && data.dietaryPreference !== user.dietaryPreference) {
            updates.push(`dietary_preference = $${valueIndex++}`);
            values.push(data.dietaryPreference);
        }

        if (updates.length > 0) {
            values.push(user.id);
            const queryText = `UPDATE users SET ${updates.join(', ')} WHERE id = $${valueIndex} RETURNING *`;
            await client.query(queryText, values);
            await client.query('COMMIT');
        } else {
            await client.query('ROLLBACK');
        }

        revalidatePath('/profile');
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error updating user:", error);
        return { success: false, error: "Database error occurred." };
    } finally {
        client.release();
    }
}

export async function changePasswordAction(data: {currentPassword: string, newPassword: string}) {
    const user = await getAuthenticatedUser();
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const dbUserRes = await client.query('SELECT * FROM users WHERE id = $1', [user.id]);
        if (dbUserRes.rows.length === 0) return { success: false, error: "User not found." };
        const dbUser = dbUserRes.rows[0];

        const now = new Date();
        const lastAttempt = dbUser.last_password_attempt_at ? new Date(dbUser.last_password_attempt_at) : null;
        if (lastAttempt && lastAttempt.toDateString() === now.toDateString()) {
            if (dbUser.password_change_attempts >= 3) {
                await client.query('ROLLBACK');
                return { success: false, error: "You have exceeded the maximum password change attempts for today." };
            }
        } else {
            await client.query('UPDATE users SET password_change_attempts = 0 WHERE id = $1', [user.id]);
            dbUser.password_change_attempts = 0;
        }

        const isPasswordValid = await bcrypt.compare(data.currentPassword, dbUser.password_hash);
        if (!isPasswordValid) {
            await client.query(
                'UPDATE users SET password_change_attempts = password_change_attempts + 1, last_password_attempt_at = NOW() WHERE id = $1',
                [user.id]
            );
            await client.query('COMMIT');
            return { success: false, error: `Incorrect password. You have ${2 - dbUser.password_change_attempts} attempts remaining today.` };
        }
        
        const isNewPasswordSame = await bcrypt.compare(data.newPassword, dbUser.password_hash);
        if (isNewPasswordSame) {
            await client.query('ROLLBACK');
            return { success: false, error: "Your new password cannot be the same as your old password."};
        }

        const newPasswordHash = await bcrypt.hash(data.newPassword, 10);
        await client.query(
            'UPDATE users SET password_hash = $1, password_change_attempts = 0, last_password_attempt_at = NOW() WHERE id = $2',
            [newPasswordHash, user.id]
        );

        // Invalidate all sessions for this user for security, except the current one
        const cookieStore = await cookies();
        const currentSessionId = cookieStore.get('session_token')?.value;
        await client.query('DELETE FROM sessions WHERE user_id = $1 AND id != $2', [user.id, currentSessionId]);
        
        await client.query('COMMIT');
        
        revalidatePath('/profile');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return { success: false, error: errorMessage };
    } finally {
        client.release();
    }
}

export async function updateFavoriteCuisinesAction(cuisines: string[]) {
    try {
        const user = await getAuthenticatedUser();
        const pool = getPool();
        const client = await pool.connect();
        await client.query('BEGIN');
        await client.query('DELETE FROM user_favorite_cuisines WHERE user_id = $1', [user.id]);
        if (cuisines.length > 0) {
            const valuesPlaceholder = cuisines.map((_, index) => `($1, $${index + 2})`).join(', ');
            const queryText = `INSERT INTO user_favorite_cuisines (user_id, region) VALUES ${valuesPlaceholder}`;
            const queryValues = [user.id, ...cuisines];
            await client.query(queryText, queryValues);
        }
        await client.query('COMMIT');
        client.release();
        revalidatePath('/profile');
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error("Error updating favorite cuisines:", error);
        const errorMessage = error instanceof Error ? error.message : 'Database error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function toggleFavoriteAction(recipeId: string) {
    const user = await getAuthenticatedUser();
    const pool = getPool();
    const client = await pool.connect();
    let isCurrentlyFavorite = user.favorites.includes(recipeId);

    try {
        await client.query('BEGIN');
        if (isCurrentlyFavorite) {
            await client.query('DELETE FROM user_favorites WHERE user_id = $1 AND recipe_id = $2', [user.id, recipeId]);
        } else {
            await client.query('INSERT INTO user_favorites (user_id, recipe_id) VALUES ($1, $2)', [user.id, recipeId]);
            if (!user.achievements.includes('first_favorite')) {
                await client.query(`UPDATE users SET achievements = array_append(achievements, 'first_favorite') WHERE id = $1`, [user.id]);
            }
        }
        await client.query('COMMIT');
        revalidatePath(`/recipes/${recipeId}`);
        revalidatePath('/profile');
        revalidatePath('/');
        return { success: true, isFavorite: !isCurrentlyFavorite };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error toggling favorite:", error);
        const errorMessage = error instanceof Error ? error.message : 'Database error occurred.';
        return { success: false, isFavorite: isCurrentlyFavorite, error: errorMessage };
    } finally {
        client.release();
    }
}

export async function logRecipeViewAction(recipeId: string) {
    try {
        const user = await getAuthenticatedUser();
        const pool = getPool();
        await pool.query(
            `UPDATE users 
             SET read_history = read_history || $1::uuid 
             WHERE id = $2 AND NOT (read_history @> ARRAY[$1::uuid])`,
            [recipeId, user.id]
        );
        return { success: true };
    } catch (error) {
        // This is a non-critical action, so we don't need to show an error to the user.
        // We log it on the server for debugging.
        console.error("Error logging recipe view:", error);
        return { success: false };
    }
}