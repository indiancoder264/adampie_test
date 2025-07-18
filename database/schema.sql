
-- Enable the pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Automated function to update the 'updated_at' timestamp on row modification
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Automated function to update denormalized ratings on the recipes table
CREATE OR REPLACE FUNCTION update_recipe_rating()
RETURNS TRIGGER AS $$
DECLARE
    recipe_to_update UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        recipe_to_update := OLD.recipe_id;
    ELSE
        recipe_to_update := NEW.recipe_id;
    END IF;

    UPDATE recipes
    SET
        rating_count = (SELECT COUNT(*) FROM tips WHERE recipe_id = recipe_to_update),
        average_rating = COALESCE((SELECT AVG(rating) FROM tips WHERE recipe_id = recipe_to_update), 0)
    WHERE id = recipe_to_update;

    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$ language 'plpgsql';


-- Table for users
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
    
    -- Rate Limiting Fields
    password_change_attempts SMALLINT DEFAULT 0,
    last_password_attempt_at TIMESTAMPTZ,
    name_last_changed_at TIMESTAMPTZ,
    
    -- General Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_otp ON users(verification_otp);

-- Trigger for users table
CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- Table for recipes
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

-- Index for recipes table
CREATE INDEX idx_recipes_region ON recipes(region);

-- Trigger for recipes table
CREATE TRIGGER update_recipes_modtime
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- Table for ingredients
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    quantity VARCHAR(100),
    name TEXT NOT NULL,
    display_order SMALLINT NOT NULL
);

-- Index for ingredients table
CREATE INDEX idx_ingredients_recipe_id ON ingredients(recipe_id);


-- Table for steps
CREATE TABLE steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number SMALLINT NOT NULL,
    description TEXT NOT NULL,
    UNIQUE(recipe_id, step_number)
);

-- Index for steps table
CREATE INDEX idx_steps_recipe_id_step_number ON steps(recipe_id, step_number);


-- Table for tips
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

-- Indexes for tips table
CREATE INDEX idx_tips_recipe_id ON tips(recipe_id);
CREATE INDEX idx_tips_user_id ON tips(user_id);

-- Triggers for tips table
CREATE TRIGGER update_tips_modtime
    BEFORE UPDATE ON tips
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_rating_on_tip_change
    AFTER INSERT OR UPDATE OR DELETE ON tips
    FOR EACH ROW
    EXECUTE FUNCTION update_recipe_rating();


-- Junction table for user favorites
CREATE TABLE user_favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, recipe_id)
);


-- Junction table for user favorite cuisines
CREATE TABLE user_favorite_cuisines (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    region VARCHAR(100) NOT NULL,
    PRIMARY KEY (user_id, region)
);


-- Table for community groups
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for groups table
CREATE TRIGGER update_groups_modtime
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- Junction table for group members
CREATE TABLE group_members (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, group_id)
);


-- Table for posts in groups
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for posts table
CREATE INDEX idx_posts_group_id ON posts(group_id);

-- Trigger for posts table
CREATE TRIGGER update_posts_modtime
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- Table for comments on posts
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for comments table
CREATE INDEX idx_comments_post_id ON comments(post_id);

-- Trigger for comments table
CREATE TRIGGER update_comments_modtime
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- Table for post reactions
CREATE TYPE reaction_type AS ENUM ('like', 'dislike');
CREATE TABLE post_reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reaction reaction_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);


-- Table for content reports
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

-- Index for reports table
CREATE INDEX idx_reports_content ON reports(content_type, content_id);
