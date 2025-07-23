-- This script contains the complete SQL schema for the RecipeRadar application.
-- It can be executed directly in a PostgreSQL client (like psql or the Supabase SQL Editor)
-- to set up all necessary tables, types, functions, and triggers.

-- Enable the pgcrypto extension if not already enabled, for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ####################################################################
-- # 1. Automated Triggers & Functions
-- ####################################################################

-- Function to automatically update the 'updated_at' column on row modification
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update denormalized recipe ratings when a tip is added, updated, or deleted
CREATE OR REPLACE FUNCTION update_recipe_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle DELETE operation
    IF (TG_OP = 'DELETE') THEN
        UPDATE recipes
        SET
            rating_count = (SELECT COUNT(*) FROM tips WHERE recipe_id = OLD.recipe_id),
            average_rating = COALESCE((SELECT AVG(rating) FROM tips WHERE recipe_id = OLD.recipe_id), 0)
        WHERE id = OLD.recipe_id;
        RETURN OLD;
    -- Handle INSERT or UPDATE operation
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


-- ####################################################################
-- # 2. Enums (Custom Types)
-- ####################################################################

-- Enum for user dietary preferences
CREATE TYPE dietary_preference_enum AS ENUM ('All', 'Vegetarian', 'Non-Vegetarian', 'Vegan');

-- Enum for recipe dietary types
CREATE TYPE dietary_type_enum AS ENUM ('Vegetarian', 'Non-Vegetarian', 'Vegan');

-- Enum for post reaction types
CREATE TYPE reaction_type AS ENUM ('like', 'dislike');

-- Enum for reportable content types
CREATE TYPE reportable_content_type AS ENUM ('post', 'comment');


-- ####################################################################
-- # 3. Tables
-- ####################################################################

-- Stores user information and credentials
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
    
    -- Email Verification Fields
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

-- Stores active user sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores core recipe data
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    region VARCHAR(100) NOT NULL,
    description TEXT,
    prep_time VARCHAR(50),
    cook_time VARCHAR(50),
    servings VARCHAR(50),
    image_url VARCHAR(512),
    published BOOLEAN DEFAULT TRUE,
    dietary_type VARCHAR(50) CHECK (dietary_type IN ('Vegetarian', 'Non-Vegetarian', 'Vegan')),
    meal_category VARCHAR(100),
    consumption_time TEXT[],
    dietary_notes TEXT[],
    average_rating NUMERIC(3, 2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores ingredients for each recipe
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    quantity VARCHAR(100),
    name TEXT NOT NULL,
    display_order SMALLINT NOT NULL
);

-- Stores cooking steps for each recipe
CREATE TABLE steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number SMALLINT NOT NULL,
    description TEXT NOT NULL,
    UNIQUE(recipe_id, step_number)
);

-- Stores user-submitted tips and ratings for recipes
CREATE TABLE tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tip TEXT NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, recipe_id)
);

-- Junction table for user's favorite recipes
CREATE TABLE user_favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, recipe_id)
);

-- Junction table for user's favorite cuisines
CREATE TABLE user_favorite_cuisines (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    region VARCHAR(100) NOT NULL,
    PRIMARY KEY (user_id, region)
);

-- Stores community group information
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for group members
CREATE TABLE group_members (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, group_id)
);

-- Stores posts made within a group
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    shared_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores comments on posts
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores reactions (likes/dislikes) on posts
CREATE TABLE post_reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reaction reaction_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

-- Stores reports for various content types
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL,
    content_type reportable_content_type NOT NULL,
    reason VARCHAR(255) NOT NULL,
    details TEXT,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ####################################################################
-- # 4. Indexes
-- ####################################################################

-- Indexes for 'users' table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_otp ON users(verification_otp);
CREATE INDEX idx_users_new_email_otp ON users(new_email_otp);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX idx_users_read_history ON users USING GIN(read_history);

-- Index for 'sessions' table
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Index for 'recipes' table
CREATE INDEX idx_recipes_region ON recipes(region);

-- Index for 'ingredients' table
CREATE INDEX idx_ingredients_recipe_id ON ingredients(recipe_id);

-- Index for 'steps' table
CREATE INDEX idx_steps_recipe_id_step_number ON steps(recipe_id, step_number);

-- Indexes for 'tips' table
CREATE INDEX idx_tips_recipe_id ON tips(recipe_id);
CREATE INDEX idx_tips_user_id ON tips(user_id);

-- Index for 'posts' table
CREATE INDEX idx_posts_group_id ON posts(group_id);

-- Index for 'comments' table
CREATE INDEX idx_comments_post_id ON comments(post_id);

-- Index for 'reports' table
CREATE INDEX idx_reports_content ON reports(content_type, content_id);


-- ####################################################################
-- # 5. Triggers
-- ####################################################################

-- Trigger to auto-update the 'updated_at' column for the 'users' table
CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger for 'recipes' table
CREATE TRIGGER update_recipes_modtime
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger for 'tips' table
CREATE TRIGGER update_tips_modtime
    BEFORE UPDATE ON tips
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger to update recipe ratings when a tip changes
CREATE TRIGGER update_rating_on_tip_change
    AFTER INSERT OR UPDATE OR DELETE ON tips
    FOR EACH ROW
    EXECUTE FUNCTION update_recipe_rating();

-- Trigger for 'groups' table
CREATE TRIGGER update_groups_modtime
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger for 'posts' table
CREATE TRIGGER update_posts_modtime
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger for 'comments' table
CREATE TRIGGER update_comments_modtime
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
