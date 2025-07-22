--
-- PostgreSQL database schema for the RecipeRadar application.
-- This script sets up all tables, functions, and triggers.
--

-- Function to automatically update the 'updated_at' timestamp on row modification.
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update denormalized recipe ratings and counts.
-- This is triggered by changes to the 'tips' table.
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

--
-- Table structure for table 'users'
--
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

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_otp ON users(verification_otp);
CREATE INDEX idx_users_new_email_otp ON users(new_email_otp);
CREATE INDEX idx_users_read_history ON users USING GIN(read_history);

CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

--
-- Table structure for table 'recipes'
--
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

CREATE INDEX idx_recipes_region ON recipes(region);

CREATE TRIGGER update_recipes_modtime
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

--
-- Table structure for table 'ingredients'
--
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    quantity VARCHAR(100),
    name TEXT NOT NULL,
    display_order SMALLINT NOT NULL
);

CREATE INDEX idx_ingredients_recipe_id ON ingredients(recipe_id);

--
-- Table structure for table 'steps'
--
CREATE TABLE steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number SMALLINT NOT NULL,
    description TEXT NOT NULL,
    UNIQUE(recipe_id, step_number)
);

CREATE INDEX idx_steps_recipe_id_step_number ON steps(recipe_id, step_number);

--
-- Table structure for table 'tips'
--
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

CREATE INDEX idx_tips_recipe_id ON tips(recipe_id);
CREATE INDEX idx_tips_user_id ON tips(user_id);

CREATE TRIGGER update_tips_modtime
    BEFORE UPDATE ON tips
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_rating_on_tip_change
    AFTER INSERT OR UPDATE OR DELETE ON tips
    FOR EACH ROW
    EXECUTE FUNCTION update_recipe_rating();

--
-- Table structure for table 'user_favorites'
--
CREATE TABLE user_favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, recipe_id)
);

--
-- Table structure for table 'user_favorite_cuisines'
--
CREATE TABLE user_favorite_cuisines (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    region VARCHAR(100) NOT NULL,
    PRIMARY KEY (user_id, region)
);

--
-- Table structure for table 'groups'
--
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_groups_modtime
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

--
-- Table structure for table 'group_members'
--
CREATE TABLE group_members (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, group_id)
);

--
-- Table structure for table 'posts'
--
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    shared_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL, -- For recipe sharing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_group_id ON posts(group_id);

CREATE TRIGGER update_posts_modtime
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

--
-- Table structure for table 'comments'
--
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON comments(post_id);

CREATE TRIGGER update_comments_modtime
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

--
-- Table structure for table 'post_reactions'
--
CREATE TYPE reaction_type AS ENUM ('like', 'dislike');
CREATE TABLE post_reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reaction reaction_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

--
-- Table structure for table 'reports'
--
CREATE TYPE reportable_content_type AS ENUM ('post', 'comment');
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

CREATE INDEX idx_reports_content ON reports(content_type, content_id);