
# RecipeRadar - PostgreSQL Database Schema

This document outlines the database schema for the RecipeRadar application using PostgreSQL. The schema is designed to be normalized and includes tables for users, recipes, community interactions, and administrative functions. It incorporates best practices such as automatic timestamp updates and performance optimizations like denormalization for ratings.

A complete, executable SQL script is available at `database/schema.sql`.

---

## Table of Contents

1. [Automated Triggers](#1-automated-triggers)
2. [Users](#2-users)
3. [Sessions](#3-sessions)
4. [Recipes](#4-recipes)
5. [Ingredients](#5-ingredients)
6. [Steps](#6-steps)
7. [Tips](#7-tips)
8. [User Favorites (Junction Table)](#8-user-favorites)
9. [User Favorite Cuisines (Junction Table)](#9-user-favorite-cuisines)
10. [Groups](#10-groups)
11. [Group Members (Junction Table)](#11-group-members)
12. [Posts](#12-posts)
13. [Comments](#13-comments)
14. [Post Reactions (Junction Table)](#14-post-reactions)
15. [Reports](#15-reports)
16. [Rate Limits](#16-rate-limits)


---

### 1. Automated Triggers

To ensure data integrity and reduce application-level logic, we use triggers for common tasks.

#### Function to Update `updated_at` Timestamp

This function is created once and reused across multiple tables to automatically update the `updated_at` column whenever a row is modified.

```sql
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

#### Function to Update Recipe Rating

This function denormalizes the average rating and rating count on the `recipes` table for performance. It is triggered whenever a tip is inserted, updated, or deleted.

```sql
CREATE OR REPLACE FUNCTION update_recipe_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        UPDATE recipes
        SET
            rating_count = (SELECT COUNT(*) FROM tips WHERE recipe_id = OLD.recipe_id),
            average_rating = COALESCE((SELECT AVG(rating) FROM tips WHERE recipe_id = OLD.recipe_id), 0)
        WHERE id = OLD.recipe_id;
        RETURN OLD;
    ELSE
        UPDATE recipes
        SET
            rating_count = (SELECT COUNT(*) FROM tips WHERE recipe_id = NEW.recipe_id),
            average_rating = COALESCE((SELECT AVG(rating) FROM tips WHERE recipe_id = NEW.recipe_id), 0)
        WHERE id = NEW.recipe_id;
        RETURN NEW;
    END IF;
END;
$$ language 'plpgsql';
```

---

### 2. `users`

Stores information about registered users, including fields for rate-limiting and personalization.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    suspended_until TIMESTAMPTZ,
    country VARCHAR(100),
    dietary_preference VARCHAR(50) CHECK (dietary_preference IN ('All', 'Vegetarian', 'Non-Vegetarian', 'Vegan')),
    avatar_seed VARCHAR(255) NOT NULL,
    
    -- Email Verification Fields (for initial signup)
    is_verified BOOLEAN DEFAULT FALSE,
    verification_otp CHAR(6),
    verification_otp_expires TIMESTAMPTZ,
    verification_emails_sent SMALLINT DEFAULT 0,
    last_verification_email_sent_at TIMESTAMPTZ,
    
    -- Email Change Fields
    pending_new_email VARCHAR(255),
    new_email_otp CHAR(6),
    new_email_otp_expires TIMESTAMPTZ,
    new_email_requests_sent SMALLINT DEFAULT 0,
    last_new_email_request_at TIMESTAMPTZ,

    -- Password Reset Fields
    password_reset_token CHAR(6),
    password_reset_token_expires TIMESTAMPTZ,
    password_reset_requests_sent SMALLINT DEFAULT 0,
    last_password_reset_request_at TIMESTAMPTZ,
    
    -- Rate Limiting Fields
    password_change_attempts SMALLINT DEFAULT 0,
    last_password_attempt_at TIMESTAMPTZ,
    name_last_changed_at TIMESTAMPTZ,

    -- Engagement & Personalization Fields
    read_history UUID[] DEFAULT ARRAY[]::UUID[],
    achievements TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- General Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX idx_users_email ON users(email);
-- Index for finding users by verification OTP
CREATE INDEX idx_users_verification_otp ON users(verification_otp);
-- Index for finding users by new email OTP
CREATE INDEX idx_users_new_email_otp ON users(new_email_otp);
-- Index for finding users by password reset token
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
-- GIN index for efficiently querying the read_history array
CREATE INDEX idx_users_read_history ON users USING GIN(read_history);


-- Trigger to auto-update the 'updated_at' column
CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
```

### 3. `sessions`

Stores stateful session data, allowing for server-side session invalidation. Includes user agent and IP address for security analysis.

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quickly finding a user's session
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

### 4. `recipes`

Stores all core recipe data.

```sql
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    region VARCHAR(100) NOT NULL,
    description TEXT,
    prep_time VARCHAR(50),
    cook_time VARCHAR(50),
    servings VARCHAR(50),
    image_url VARCHAR(512),
    -- This flag acts as a "soft-delete", allowing admins to unpublish recipes without deleting them.
    published BOOLEAN DEFAULT TRUE,
    dietary_type VARCHAR(50) CHECK (dietary_type IN ('Vegetarian', 'Non-Vegetarian', 'Vegan')),
    meal_category VARCHAR(100),
    consumption_time TEXT[], -- Array of strings like {'Dinner', 'Lunch'}
    dietary_notes TEXT[], -- Array of strings like {'Gluten-Free', 'Contains Nuts'}
    -- Denormalized for performance to avoid calculating on every read. Updated via trigger.
    average_rating NUMERIC(3, 2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching recipes by region
CREATE INDEX idx_recipes_region ON recipes(region);

-- Trigger to auto-update the 'updated_at' column
CREATE TRIGGER update_recipes_modtime
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
```

### 5. `ingredients`

Stores the ingredients for each recipe in a normalized way.

```sql
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    -- e.g., '1 cup', '200g', 'to taste'
    quantity VARCHAR(100),
    -- e.g., 'Flour, sifted', 'Onion, finely chopped'
    name TEXT NOT NULL,
    -- To maintain the order of ingredients
    display_order SMALLINT NOT NULL
);

-- Index for quickly fetching all ingredients for a recipe
CREATE INDEX idx_ingredients_recipe_id ON ingredients(recipe_id);
```

### 6. `steps`

Stores the cooking steps for each recipe.

```sql
CREATE TABLE steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number SMALLINT NOT NULL,
    description TEXT NOT NULL,
    UNIQUE(recipe_id, step_number) -- Ensures step numbers are unique per recipe
);

-- Index for fetching steps in the correct order
CREATE INDEX idx_steps_recipe_id_step_number ON steps(recipe_id, step_number);
```

### 7. `tips`

Stores user-submitted tips and ratings for recipes. This also serves as the basis for the recipe's average rating.

```sql
CREATE TABLE tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tip TEXT NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, recipe_id) -- A user can only leave one tip per recipe
);

-- Indexes for efficient querying
CREATE INDEX idx_tips_recipe_id ON tips(recipe_id);
CREATE INDEX idx_tips_user_id ON tips(user_id);

-- Trigger to auto-update the 'updated_at' column
CREATE TRIGGER update_tips_modtime
    BEFORE UPDATE ON tips
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger to update the denormalized ratings on the recipes table
CREATE TRIGGER update_rating_on_tip_change
    AFTER INSERT OR UPDATE OR DELETE ON tips
    FOR EACH ROW
    EXECUTE FUNCTION update_recipe_rating();
```

### 8. `user_favorites`

A junction table to manage the many-to-many relationship between users and their favorite recipes.

```sql
CREATE TABLE user_favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, recipe_id)
);
```

### 9. `user_favorite_cuisines`

A junction table for a user's favorite cuisines (regions).

```sql
CREATE TABLE user_favorite_cuisines (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    region VARCHAR(100) NOT NULL,
    PRIMARY KEY (user_id, region)
);
```

### 10. `groups`

Stores community group information.

```sql
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Keep group if creator deletes account
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update the 'updated_at' column
CREATE TRIGGER update_groups_modtime
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
```

### 11. `group_members`

A junction table to manage the many-to-many relationship between users and groups.

```sql
CREATE TABLE group_members (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, group_id)
);
```

### 12. `posts`

Stores posts made within a community group. Includes a field for shared recipes.

```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    shared_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL, -- For recipe sharing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for retrieving all posts for a group
CREATE INDEX idx_posts_group_id ON posts(group_id);

-- Trigger to auto-update the 'updated_at' column
CREATE TRIGGER update_posts_modtime
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
```

### 13. `comments`

Stores comments made on posts.

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for retrieving all comments for a post
CREATE INDEX idx_comments_post_id ON comments(post_id);

-- Trigger to auto-update the 'updated_at' column
CREATE TRIGGER update_comments_modtime
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
```

### 14. `post_reactions`

Manages likes and dislikes on posts.

```sql
CREATE TYPE reaction_type AS ENUM ('like', 'dislike');

CREATE TABLE post_reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reaction reaction_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id) -- A user can only have one reaction per post
);
```

### 15. `reports`

A polymorphic table to handle reports for different types of content (e.g., posts, comments).

```sql
CREATE TYPE reportable_content_type AS ENUM ('post', 'comment');

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL, -- The ID of the post or comment
    content_type reportable_content_type NOT NULL,
    reason VARCHAR(255) NOT NULL,
    details TEXT,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index to find all reports for a specific piece of content
CREATE INDEX idx_reports_content ON reports(content_type, content_id);
```

### 16. `rate_limits`

Stores records of actions performed by IP addresses for rate limiting purposes.

```sql
CREATE TABLE rate_limits (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for efficient querying of recent actions by IP and type
CREATE INDEX idx_rate_limits_ip_action_time ON rate_limits (ip_address, action_type, created_at);
```
