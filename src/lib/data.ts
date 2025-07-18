
import getPool from './db';
import type { Recipe } from './recipes';
import type { User } from './auth';
import type { Group } from './community';

// Type guards to ensure data integrity from DB
function isUser(user: any): user is User {
    return user && typeof user.id === 'string' && typeof user.name === 'string' && typeof user.email === 'string';
}

function isRecipe(recipe: any): recipe is Recipe {
    return recipe && typeof recipe.id === 'string' && typeof recipe.name === 'string';
}

function isGroup(group: any): group is Group {
    return group && typeof group.id === 'string' && typeof group.name === 'string';
}

function formatUser(dbUser: any): User {
    return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        isAdmin: dbUser.is_admin,
        suspendedUntil: dbUser.suspended_until ? new Date(dbUser.suspended_until).toISOString() : undefined,
        country: dbUser.country,
        dietaryPreference: dbUser.dietary_preference,
        avatar: dbUser.avatar_seed,
        // Rate limiting and state fields
        passwordChangeAttempts: dbUser.password_change_attempts,
        lastPasswordAttemptAt: dbUser.last_password_attempt_at ? new Date(dbUser.last_password_attempt_at).toISOString() : undefined,
        nameLastChangedAt: dbUser.name_last_changed_at ? new Date(dbUser.name_last_changed_at).toISOString() : undefined,
        newEmailRequestsSent: dbUser.new_email_requests_sent,
        lastNewEmailRequestAt: dbUser.last_new_email_request_at ? new Date(dbUser.last_new_email_request_at).toISOString() : undefined,
        // JSONB/Array fields with defaults
        favorites: dbUser.favorites || [],
        favoriteCuisines: dbUser.favorite_cuisines || [],
        readHistory: dbUser.read_history || [],
        achievements: dbUser.achievements || [],
    };
}


export async function fetchUserById(userId: string): Promise<User | null> {
    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT 
                u.*,
                COALESCE(favs.favorites, '[]'::jsonb) as favorites,
                COALESCE(fav_cuisines.favorite_cuisines, '[]'::jsonb) as favorite_cuisines
            FROM users u
            LEFT JOIN (
                SELECT user_id, jsonb_agg(recipe_id) as favorites
                FROM user_favorites
                GROUP BY user_id
            ) favs ON u.id = favs.user_id
            LEFT JOIN (
                SELECT user_id, jsonb_agg(region) as favorite_cuisines
                FROM user_favorite_cuisines
                GROUP BY user_id
            ) fav_cuisines ON u.id = fav_cuisines.user_id
            WHERE u.id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return null;
        }
        
        // This renames columns from snake_case to camelCase for the app
        return formatUser(result.rows[0]);

    } catch (error) {
        console.error(`Failed to fetch user with id ${userId}:`, error);
        return null;
    }
}

export async function fetchUsers(): Promise<User[]> {
    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT 
                u.*,
                COALESCE(favs.favorites, '[]'::jsonb) as favorites,
                COALESCE(fav_cuisines.favorite_cuisines, '[]'::jsonb) as favorite_cuisines
            FROM users u
            LEFT JOIN (
                SELECT user_id, jsonb_agg(recipe_id) as favorites
                FROM user_favorites
                GROUP BY user_id
            ) favs ON u.id = favs.user_id
            LEFT JOIN (
                SELECT user_id, jsonb_agg(region) as favorite_cuisines
                FROM user_favorite_cuisines
                GROUP BY user_id
            ) fav_cuisines ON u.id = fav_cuisines.user_id
        `);
        return result.rows.map(formatUser).filter(isUser);
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
    }
}

export async function fetchRecipes(): Promise<Recipe[]> {
    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT
                r.id,
                r.name,
                r.region,
                r.description,
                r.prep_time,
                r.cook_time,
                r.servings,
                r.image_url,
                r.published,
                r.dietary_type,
                r.meal_category,
                r.consumption_time,
                r.dietary_notes,
                r.average_rating,
                r.rating_count,
                COALESCE(fav_counts.favorite_count, 0) as favorite_count,
                COALESCE(i.ingredients, '[]'::jsonb) as ingredients,
                COALESCE(s.steps, '[]'::jsonb) as steps,
                COALESCE(t.tips, '[]'::jsonb) as tips
            FROM recipes r
            LEFT JOIN (
                SELECT recipe_id, jsonb_agg(jsonb_build_object('id', id, 'quantity', quantity, 'name', name) ORDER BY display_order) as ingredients
                FROM ingredients
                GROUP BY recipe_id
            ) i ON r.id = i.recipe_id
            LEFT JOIN (
                SELECT recipe_id, jsonb_agg(jsonb_build_object('id', id, 'step_number', step_number, 'description', description) ORDER BY step_number) as steps
                FROM steps
                GROUP BY recipe_id
            ) s ON r.id = s.recipe_id
            LEFT JOIN (
                SELECT recipe_id, jsonb_agg(jsonb_build_object('id', t.id, 'user_id', t.user_id, 'user_name', u.name, 'tip', t.tip, 'rating', t.rating, 'created_at', t.created_at, 'updated_at', t.updated_at)) as tips
                FROM tips t
                JOIN users u ON t.user_id = u.id
                GROUP BY recipe_id
            ) t ON r.id = t.recipe_id
            LEFT JOIN (
                SELECT recipe_id, COUNT(*)::int as favorite_count
                FROM user_favorites
                GROUP BY recipe_id
            ) fav_counts ON r.id = fav_counts.recipe_id
        `);
        return result.rows.map(row => ({
            ...row,
            average_rating: parseFloat(row.average_rating),
            rating_count: parseInt(row.rating_count, 10),
            favorite_count: parseInt(row.favorite_count, 10),
            ingredients: row.ingredients || [],
            steps: row.steps || [],
            tips: row.tips || [],
        })).filter(isRecipe);
    } catch (error) {
        console.error('Failed to fetch recipes:', error);
        return [];
    }
}


export async function fetchGroups(): Promise<Group[]> {
    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT
                g.id,
                g.name,
                g.description,
                g.creator_id,
                u_creator.name as creator_name,
                g.created_at,
                COALESCE(m.members, '[]'::jsonb) as members,
                COALESCE(p.posts, '[]'::jsonb) as posts
            FROM groups g
            LEFT JOIN users u_creator ON g.creator_id = u_creator.id
            LEFT JOIN (
                SELECT group_id, jsonb_agg(user_id) as members
                FROM group_members
                GROUP BY group_id
            ) m ON g.id = m.group_id
            LEFT JOIN (
                SELECT
                    p.group_id,
                    jsonb_agg(
                        jsonb_build_object(
                            'id', p.id,
                            'author_id', p.author_id,
                            'author_name', u.name,
                            'content', p.content,
                            'created_at', p.created_at,
                            'updated_at', p.updated_at,
                            'shared_recipe', CASE WHEN p.shared_recipe_id IS NOT NULL THEN jsonb_build_object(
                                'id', r.id,
                                'name', r.name,
                                'image_url', r.image_url,
                                'description', r.description
                            ) ELSE NULL END,
                            'likes', COALESCE(l.likes, '[]'::jsonb),
                            'dislikes', COALESCE(dl.dislikes, '[]'::jsonb),
                            'comments', COALESCE(c.comments, '[]'::jsonb)
                        ) ORDER BY p.created_at DESC
                    ) as posts
                FROM posts p
                JOIN users u ON p.author_id = u.id
                LEFT JOIN recipes r ON p.shared_recipe_id = r.id
                LEFT JOIN (
                    SELECT post_id, jsonb_agg(user_id) as likes FROM post_reactions WHERE reaction = 'like' GROUP BY post_id
                ) l ON p.id = l.post_id
                LEFT JOIN (
                    SELECT post_id, jsonb_agg(user_id) as dislikes FROM post_reactions WHERE reaction = 'dislike' GROUP BY post_id
                ) dl ON p.id = dl.post_id
                LEFT JOIN (
                    SELECT
                        c.post_id,
                        jsonb_agg(
                            jsonb_build_object(
                                'id', c.id,
                                'author_id', c.author_id,
                                'author_name', cu.name,
                                'content', c.content,
                                'created_at', c.created_at,
                                'updated_at', c.updated_at
                            ) ORDER BY c.created_at ASC
                        ) as comments
                    FROM comments c
                    JOIN users cu ON c.author_id = cu.id
                    GROUP BY c.post_id
                ) c ON p.id = c.post_id
                GROUP BY p.group_id
            ) p ON g.id = p.group_id
            WHERE g.creator_id IS NOT NULL
        `);
        return result.rows.map(row => ({
            ...row,
            members: row.members || [],
            posts: row.posts || [],
        })).filter(isGroup);
    } catch (error) {
        console.error('Failed to fetch groups:', error);
        return [];
    }
}

export async function fetchRecipeById(id: string): Promise<Recipe | null> {
    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT
                r.id,
                r.name,
                r.region,
                r.description,
                r.prep_time,
                r.cook_time,
                r.servings,
                r.image_url,
                r.published,
                r.dietary_type,
                r.meal_category,
                r.consumption_time,
                r.dietary_notes,
                r.average_rating,
                r.rating_count,
                COALESCE(fav_counts.favorite_count, 0) as favorite_count,
                COALESCE(i.ingredients, '[]'::jsonb) as ingredients,
                COALESCE(s.steps, '[]'::jsonb) as steps
            FROM recipes r
            LEFT JOIN (
                SELECT recipe_id, jsonb_agg(jsonb_build_object('id', id, 'quantity', quantity, 'name', name) ORDER BY display_order) as ingredients
                FROM ingredients
                GROUP BY recipe_id
            ) i ON r.id = i.recipe_id
            LEFT JOIN (
                SELECT recipe_id, jsonb_agg(jsonb_build_object('id', id, 'step_number', step_number, 'description', description) ORDER BY step_number) as steps
                FROM steps
                GROUP BY recipe_id
            ) s ON r.id = s.recipe_id
            LEFT JOIN (
                SELECT recipe_id, COUNT(*)::int as favorite_count
                FROM user_favorites
                GROUP BY recipe_id
            ) fav_counts ON r.id = fav_counts.recipe_id
            WHERE r.id = $1 AND r.published = true
        `, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const recipe = result.rows[0];
        return {
            ...recipe,
            average_rating: parseFloat(recipe.average_rating),
            rating_count: parseInt(recipe.rating_count, 10),
            favorite_count: parseInt(recipe.favorite_count, 10),
            ingredients: recipe.ingredients || [],
            steps: recipe.steps || [],
            tips: [], // Tips are fetched separately for dynamic loading
        };
    } catch (error) {
        console.error(`Failed to fetch recipe with id ${id}:`, error);
        return null;
    }
}

export async function fetchTipsForRecipe(recipeId: string): Promise<Recipe['tips']> {
    try {
        const pool = getPool();
        const result = await pool.query(`
            SELECT t.id, t.user_id, u.name as user_name, t.tip, t.rating, t.created_at, t.updated_at
            FROM tips t
            JOIN users u ON t.user_id = u.id
            WHERE t.recipe_id = $1
            ORDER BY t.created_at DESC
        `, [recipeId]);
        return result.rows;
    } catch (error) {
        console.error(`Failed to fetch tips for recipe ${recipeId}:`, error);
        return [];
    }
}

export async function fetchRecipesForHomepage() {
    try {
        const publicRecipes = await fetchRecipes(); // Re-use the main fetch function

        const trendingRecipes = [...publicRecipes]
            .sort((a, b) => b.rating_count - a.rating_count)
            .slice(0, 8);
        
        const regions = [...new Set(publicRecipes.map((recipe) => recipe.region))];

        const recipesByRegion = publicRecipes.reduce((acc, recipe) => {
            const { region } = recipe;
            if (!acc[region]) acc[region] = [];
            acc[region].push(recipe);
            return acc;
        }, {} as Record<string, Recipe[]>);

        return {
            trendingRecipes,
            recipesByRegion,
            regions,
        }

    } catch (error) {
        console.error('Failed to fetch data for homepage:', error);
        return {
            trendingRecipes: [],
            recipesByRegion: {},
            regions: [],
        }
    }
}
