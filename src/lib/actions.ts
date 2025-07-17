"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import getPool from './db';
import type { User } from "./auth";
import type { Recipe, Tip } from "./recipes";
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Post, Comment, Report } from "./community";
import { Resend } from 'resend';
import { redirect } from "next/navigation";


// --- Email Sending ---
async function sendVerificationEmail(email: string, otp: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Resend API key is not configured.");
      throw new Error("Server configuration error: Email service is not set up.");
    }
    
    const resend = new Resend(apiKey);

    try {
        await resend.emails.send({
            from: 'RecipeRadar <onboarding@resend.dev>',
            // In sandbox mode, Resend only allows sending to the verified email address.
            // For this project, we will send all verification emails to a fixed address
            // specified in the environment variables to allow for testing the flow.
            to: process.env.RESEND_TO_EMAIL || 'bobby.ch6969@gmail.com',
            subject: `RecipeRadar Verification for ${email}`,
            html: `
                <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                    <h2>Welcome to RecipeRadar!</h2>
                    <p>A new account has been registered with the email: <strong>${email}</strong>.</p>
                    <p>Your verification code is:</p>
                    <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${otp}</p>
                    <p>This code will expire in 10 minutes.</p>
                </div>
            `,
        });
        console.log(`Verification email sent for ${email}`);
    } catch (error) {
        console.error("Failed to send verification email:", error);
        throw new Error("Could not send verification email.");
    }
}


// --- Auth Actions ---

export async function loginAction(data: { email: string; password: string;}) {
    const { email, password } = data;
    const pool = getPool();
    const client = await pool.connect();
    const cookieStore = await cookies();

    try {
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return { success: false, error: "Invalid email or password." };
        }

        const user = result.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return { success: false, error: "Invalid email or password." };
        }

        if (!user.is_verified) {
            return { success: false, error: "Your email is not verified. Please check your inbox for a verification code." };
        }

        if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
             return { success: false, error: `Your account is suspended until ${new Date(user.suspended_until).toLocaleDateString()}.` };
        }

        const favsResult = await client.query('SELECT recipe_id FROM user_favorites WHERE user_id = $1', [user.id]);
        const favoriteCuisinesResult = await client.query('SELECT region FROM user_favorite_cuisines WHERE user_id = $1', [user.id]);

        const userSessionData: User = {
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.is_admin,
            favorites: favsResult.rows.map(r => r.recipe_id),
            favoriteCuisines: favoriteCuisinesResult.rows.map(r => r.region),
            readHistory: [],
            country: user.country,
            dietaryPreference: user.dietary_preference,
            avatar: user.avatar_seed,
            suspendedUntil: user.suspended_until,
        };
        
        cookieStore.set("user", JSON.stringify(userSessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        });

        return { success: true, isAdmin: user.is_admin };

    } catch (error) {
        console.error(error);
        return { success: false, error: "An unexpected error occurred. Please try again." };
    } finally {
        client.release();
    }
}

export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete("user");
    revalidatePath("/", "layout");
}


export async function signupAction(data: {name: string, email: string, password: string, country: string, dietaryPreference: string}) {
  const { name, email, password, country, dietaryPreference } = data;
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if email already exists
    const existingEmail = await client.query('SELECT id, is_verified FROM users WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
       if (!existingEmail.rows[0].is_verified) {
           await client.query('DELETE FROM users WHERE id = $1', [existingEmail.rows[0].id]);
       } else {
            return { success: false, error: "A user with this email already exists." };
       }
    }

    const existingName = await client.query('SELECT id FROM users WHERE name ILIKE $1', [name]);
    if (existingName.rows.length > 0) {
      return { success: false, error: "This name is already taken. Please choose another." };
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationOtp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await client.query(
      `INSERT INTO users (name, email, password_hash, country, dietary_preference, avatar_seed, is_admin, is_verified, verification_otp, verification_otp_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [name, email, passwordHash, country, dietaryPreference, name, false, false, verificationOtp, otpExpires]
    );

    await sendVerificationEmail(email, verificationOtp);
    
    await client.query('COMMIT');
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error(error);
    if (error.message === "Could not send verification email.") {
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
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }

    if (!user?.isAdmin) {
        return { success: false, error: "Unauthorized" };
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
                `UPDATE recipes SET
                    name = $1, region = $2, description = $3, prep_time = $4, cook_time = $5,
                    servings = $6, image_url = $7, published = $8, dietary_type = $9, meal_category = $10,
                    consumption_time = $11, dietary_notes = $12
                WHERE id = $13`,
                [name, region, description, prep_time, cook_time, servings, image_url, published, dietary_type, meal_category, consumption_time, dietary_notes, currentRecipeId]
            );
            await client.query('DELETE FROM ingredients WHERE recipe_id = $1', [currentRecipeId]);
            await client.query('DELETE FROM steps WHERE recipe_id = $1', [currentRecipeId]);
        } else {
            const recipeRes = await client.query(
                `INSERT INTO recipes (name, region, description, prep_time, cook_time, servings, image_url, published, dietary_type, meal_category, consumption_time, dietary_notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
                [name, region, description, prep_time, cook_time, servings, image_url, published, dietary_type, meal_category, consumption_time, dietary_notes]
            );
            currentRecipeId = recipeRes.rows[0].id;
        }

        for (let i = 0; i < ingredients.length; i++) {
            const { quantity, name: ingredientName } = parseIngredient(ingredients[i].value);
            await client.query(
                'INSERT INTO ingredients (recipe_id, quantity, name, display_order) VALUES ($1, $2, $3, $4)',
                [currentRecipeId, quantity, ingredientName, i + 1]
            );
        }

        for (let i = 0; i < steps.length; i++) {
            await client.query(
                'INSERT INTO steps (recipe_id, step_number, description) VALUES ($1, $2, $3)',
                [currentRecipeId, i + 1, steps[i].value]
            );
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
        const existingTipRes = await client.query(
            'SELECT id FROM tips WHERE recipe_id = $1 AND user_id = $2',
            [recipeId, user.id]
        );

        if (existingTipRes.rows.length > 0) {
            tipResult = await client.query(
                'UPDATE tips SET tip = $1, rating = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
                [tipData.tip, tipData.rating, existingTipRes.rows[0].id]
            );
        } else {
            tipResult = await client.query(
                'INSERT INTO tips (recipe_id, user_id, tip, rating) VALUES ($1, $2, $3, $4) RETURNING *',
                [recipeId, user.id, tipData.tip, tipData.rating]
            );
        }

        await client.query('COMMIT');

        const newTipData = tipResult.rows[0];

        revalidatePath(`/recipes/${recipeId}`);
        revalidatePath(`/admin`);

        return { 
          success: true, 
          newTip: {
            id: newTipData.id,
            user_id: newTipData.user_id,
            user_name: user.name,
            tip: newTipData.tip,
            rating: newTipData.rating,
            created_at: newTipData.created_at.toISOString(),
            updated_at: (newTipData.updated_at || newTipData.created_at).toISOString(),
          }
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in addOrUpdateTipAction:", error);
        return { success: false, error: 'Database error occurred while adding tip.' };
    } finally {
        client.release();
    }
}


export async function deleteRecipeAction(recipeId: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user?.isAdmin) return { success: false, error: "Unauthorized" };

    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM recipes WHERE id = $1', [recipeId]);
        revalidatePath("/admin", "layout");
        revalidatePath("/", "layout");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Failed to delete recipe.' };
    } finally {
        client.release();
    }
}

export async function togglePublishAction(recipeId: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user?.isAdmin) return { success: false, error: "Unauthorized" };

    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query(
        'UPDATE recipes SET published = NOT published WHERE id = $1',
        [recipeId]
        );
        revalidatePath("/admin", "layout");
        revalidatePath("/", "layout");
        revalidatePath(`/recipes/${recipeId}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Failed to toggle publish status.' };
    } finally {
        client.release();
    }
}

export async function deleteTipAction(recipeId: string, tipId: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user?.isAdmin) return { success: false, error: "Unauthorized" };
  
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM tips WHERE id = $1', [tipId]);
        revalidatePath("/admin");
        revalidatePath(`/recipes/${recipeId}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Failed to delete tip.' };
    } finally {
        client.release();
    }
}


// --- Group Actions ---

export async function createGroupAction(data: { name: string; description: string }, user: User) {
    if (!user) return { success: false, error: "You must be logged in." };
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const groupRes = await client.query(
            'INSERT INTO groups (name, description, creator_id) VALUES ($1, $2, $3) RETURNING id',
            [data.name, data.description, user.id]
        );
        const groupId = groupRes.rows[0].id;
        await client.query(
            'INSERT INTO group_members (user_id, group_id) VALUES ($1, $2)',
            [user.id, groupId]
        );
        await client.query('COMMIT');
        revalidatePath('/community', 'layout');
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
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user?.isAdmin) {
        return { success: false, error: "Unauthorized" };
    }
  
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM groups WHERE id = $1', [groupId]);
        revalidatePath('/community', 'layout');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to delete group." };
    } finally {
        client.release();
    }
}

export async function editGroupAction(groupId: string, data: { name: string, description: string }) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user) return { success: false, error: "Unauthorized" };

    const pool = getPool();
    const client = await pool.connect();
    try {
        const groupRes = await client.query('SELECT creator_id FROM groups WHERE id = $1', [groupId]);
        if (groupRes.rows.length === 0 || groupRes.rows[0].creator_id !== user.id) {
        return { success: false, error: "You do not have permission to edit this group." };
        }
        
        await client.query(
        'UPDATE groups SET name = $1, description = $2 WHERE id = $3',
        [data.name, data.description, groupId]
        );
        revalidatePath(`/community`, 'layout');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to edit group." };
    } finally {
        client.release();
    }
}

// --- Community Content Actions ---

export async function addPostAction(groupId: string, content: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user) return { success: false, error: "You must be logged in." };
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query(
            'INSERT INTO posts (group_id, author_id, content) VALUES ($1, $2, $3)',
            [groupId, user.id, content]
        );
        revalidatePath(`/community/${groupId}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to add post." };
    } finally {
        client.release();
    }
}

export async function editPostAction(postId: string, content: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user) return { success: false, error: "Unauthorized" };

    const pool = getPool();
    const client = await pool.connect();
    try {
        const postRes = await client.query('SELECT author_id, group_id FROM posts WHERE id = $1', [postId]);
        if (postRes.rows.length === 0 || postRes.rows[0].author_id !== user.id) {
            return { success: false, error: "You don't have permission to edit this post." };
        }

        await client.query('UPDATE posts SET content = $1, updated_at = NOW() WHERE id = $2', [content, postId]);
        revalidatePath(`/community/${postRes.rows[0].group_id}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to edit post." };
    } finally {
        client.release();
    }
}

export async function deletePostAction(postId: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user) return { success: false, error: "Unauthorized" };

    const pool = getPool();
    const client = await pool.connect();
    try {
        const postRes = await client.query('SELECT author_id, group_id FROM posts WHERE id = $1', [postId]);
        const isAuthor = postRes.rows[0]?.author_id === user.id;

        if (!user.isAdmin && !isAuthor) {
            return { success: false, error: "You don't have permission to delete this post." };
        }
        
        await client.query('DELETE FROM posts WHERE id = $1', [postId]);
        revalidatePath(`/community/${postRes.rows[0].group_id}`);
        revalidatePath('/admin', 'layout');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to delete post." };
    } finally {
        client.release();
    }
}

export async function addCommentAction(postId: string, content: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user) return { success: false, error: "You must be logged in." };
    const pool = getPool();
    const client = await pool.connect();
    try {
        const postRes = await client.query('SELECT group_id FROM posts WHERE id = $1', [postId]);
        if (postRes.rows.length === 0) {
            return { success: false, error: "Post not found." };
        }

        await client.query(
            'INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3)',
            [postId, user.id, content]
        );
        revalidatePath(`/community/${postRes.rows[0].group_id}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to add comment." };
    } finally {
        client.release();
    }
}

export async function editCommentAction(commentId: string, content: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user) return { success: false, error: "Unauthorized" };
    const pool = getPool();
    const client = await pool.connect();
    try {
        const commentRes = await client.query('SELECT c.author_id, p.group_id FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.id = $1', [commentId]);
        if (commentRes.rows.length === 0 || commentRes.rows[0].author_id !== user.id) {
            return { success: false, error: "You don't have permission to edit this comment." };
        }
        
        await client.query('UPDATE comments SET content = $1, updated_at = NOW() WHERE id = $2', [content, commentId]);
        revalidatePath(`/community/${commentRes.rows[0].group_id}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to edit comment." };
    } finally {
        client.release();
    }
}

export async function deleteCommentAction(commentId: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user) return { success: false, error: "Unauthorized" };
    const pool = getPool();
    const client = await pool.connect();
    try {
        const commentRes = await client.query('SELECT c.author_id, p.group_id FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.id = $1', [commentId]);
        const isAuthor = commentRes.rows[0]?.author_id === user.id;

        if (!user.isAdmin && !isAuthor) {
             return { success: false, error: "You don't have permission to delete this comment." };
        }
        
        await client.query('DELETE FROM comments WHERE id = $1', [commentId]);
        revalidatePath(`/community/${commentRes.rows[0].group_id}`);
        revalidatePath('/admin', 'layout');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to delete comment." };
    } finally {
        client.release();
    }
}

export async function togglePostReactionAction(postId: string, reaction: 'like' | 'dislike') {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user) return { success: false, error: "You must be logged in." };
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const postRes = await client.query('SELECT group_id FROM posts WHERE id = $1', [postId]);
        if (postRes.rows.length === 0) return { success: false, error: "Post not found." };
        
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
        return { success: false, error: "Failed to react to post." };
    } finally {
        client.release();
    }
}

export async function reportContentAction(contentId: string, contentType: 'post' | 'comment', reason: string, details?: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user) return { success: false, error: "You must be logged in." };
    const pool = getPool();
    const client = await pool.connect();
    try {
        const postRes = await client.query(
            contentType === 'post' 
                ? 'SELECT group_id FROM posts WHERE id = $1' 
                : 'SELECT p.group_id FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.id = $1',
            [contentId]
        );
        if (postRes.rows.length === 0) return { success: false, error: "Content not found." };

        await client.query(
            'INSERT INTO reports (reporter_id, content_id, content_type, reason, details) VALUES ($1, $2, $3, $4, $5)',
            [user.id, contentId, contentType, reason, details]
        );
        revalidatePath(`/community/${postRes.rows[0].group_id}`);
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to submit report." };
    } finally {
        client.release();
    }
}


// --- User Actions ---

export async function deleteUserAction(userId: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user?.isAdmin) return { success: false, error: "Unauthorized" };
  
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
        revalidatePath("/admin", "layout");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Failed to delete user.' };
    } finally {
        client.release();
    }
}

export async function suspendUserAction(userId: string, days: number) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user?.isAdmin) return { success: false, error: "Unauthorized" };

    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query(
            'UPDATE users SET suspended_until = NOW() + ($1 * INTERVAL \'1 day\') WHERE id = $2',
            [days, userId]
        );
        revalidatePath("/admin", "layout");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Failed to suspend user.' };
    } finally {
        client.release();
    }
}

export async function unsuspendUserAction(userId: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user?.isAdmin) return { success: false, error: "Unauthorized" };
    
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('UPDATE users SET suspended_until = NULL WHERE id = $1', [userId]);
        revalidatePath("/admin", "layout");
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Failed to unsuspend user.' };
    } finally {
        client.release();
    }
}


export async function joinGroupAction(groupId: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user) return { success: false, error: "You must be logged in." };
    
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query(
            'INSERT INTO group_members (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [user.id, groupId]
        );
        revalidatePath(`/community/${groupId}`);
        revalidatePath('/community', 'layout');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to join group." };
    } finally {
        client.release();
    }
}


export async function leaveGroupAction(groupId: string) {
    const cookieStore = await cookies();
    let user: User | null = null;
    const userCookie = cookieStore.get("user");
    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value) as User;
        } catch (e) {
            user = null;
        }
    }
    if (!user) return { success: false, error: "You must be logged in." };
    
    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query(
            'DELETE FROM group_members WHERE user_id = $1 AND group_id = $2',
            [user.id, groupId]
        );
        revalidatePath(`/community/${groupId}`);
        revalidatePath('/community', 'layout');
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to leave group." };
    } finally {
        client.release();
    }
}

export async function updateUserAction(data: Partial<Pick<User, 'name' | 'email' | 'country' | 'dietaryPreference'>>) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");
    if (!userCookie) return { success: false, error: "Unauthorized" };
    
    let user: User;
    try {
        user = JSON.parse(userCookie.value);
    } catch (e) {
        return { success: false, error: "Invalid session." };
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
        const newName = data.name || user.name;
        const newEmail = data.email || user.email;
        const newCountry = data.country || user.country;
        const newDietaryPreference = data.dietaryPreference || user.dietaryPreference;

        await client.query(
            `UPDATE users SET name = $1, email = $2, country = $3, dietary_preference = $4, avatar_seed = $5 WHERE id = $6`,
            [newName, newEmail, newCountry, newDietaryPreference, newName, user.id]
        );

        const updatedUser = { ...user, ...data };
         if (data.name) {
            updatedUser.avatar = data.name;
        }
        cookieStore.set("user", JSON.stringify(updatedUser), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        revalidatePath('/profile');
        return { success: true };
    } catch (error) {
        console.error("Error updating user:", error);
        return { success: false, error: "Database error occurred." };
    } finally {
        client.release();
    }
}

export async function updateFavoriteCuisinesAction(cuisines: string[]) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");
    if (!userCookie) return { success: false, error: "Unauthorized" };

    let user: User;
    try {
        user = JSON.parse(userCookie.value);
    } catch (e) {
        return { success: false, error: "Invalid session." };
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM user_favorite_cuisines WHERE user_id = $1', [user.id]);
        if (cuisines.length > 0) {
            const valuesPlaceholder = cuisines.map((_, index) => `($1, $${index + 2})`).join(', ');
            const queryText = `INSERT INTO user_favorite_cuisines (user_id, region) VALUES ${valuesPlaceholder}`;
            const queryValues = [user.id, ...cuisines];
            await client.query(queryText, queryValues);
        }
        await client.query('COMMIT');

        const updatedUser = { ...user, favoriteCuisines: cuisines };
        cookieStore.set("user", JSON.stringify(updatedUser), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        revalidatePath('/profile');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error updating favorite cuisines:", error);
        return { success: false, error: "Database error occurred." };
    } finally {
        client.release();
    }
}

export async function toggleFavoriteAction(recipeId: string) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");
    if (!userCookie) return { success: false, isFavorite: false, error: "Unauthorized" };

    let user: User;
    try {
        user = JSON.parse(userCookie.value);
    } catch (e) {
        return { success: false, isFavorite: false, error: "Invalid session." };
    }

    const pool = getPool();
    const client = await pool.connect();
    let isCurrentlyFavorite = user.favorites.includes(recipeId);

    try {
        await client.query('BEGIN');
        if (isCurrentlyFavorite) {
            await client.query('DELETE FROM user_favorites WHERE user_id = $1 AND recipe_id = $2', [user.id, recipeId]);
        } else {
            await client.query('INSERT INTO user_favorites (user_id, recipe_id) VALUES ($1, $2)', [user.id, recipeId]);
        }
        
        const updatedFavorites = isCurrentlyFavorite
            ? user.favorites.filter(id => id !== recipeId)
            : [...user.favorites, recipeId];
        
        const updatedUser = { ...user, favorites: updatedFavorites };
        cookieStore.set("user", JSON.stringify(updatedUser), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });
        
        await client.query('COMMIT');

        revalidatePath(`/recipes/${recipeId}`);
        revalidatePath('/profile');
        revalidatePath('/');
        return { success: true, isFavorite: !isCurrentlyFavorite };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error toggling favorite:", error);
        return { success: false, isFavorite: isCurrentlyFavorite, error: "Database error occurred." };
    } finally {
        client.release();
    }
}
