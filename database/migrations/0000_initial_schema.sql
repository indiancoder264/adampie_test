-- The complete initial schema for the application.
-- This file is for reference and to be used in the composite schema.sql

-- Automated Triggers
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- users table
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
    
    is_verified BOOLEAN DEFAULT FALSE,
    verification_otp CHAR(6),
    verification_otp_expires TIMESTAMPTZ,
    verification_emails_sent SMALLINT DEFAULT 0,
    last_verification_email_sent_at TIMESTAMPTZ,
    
    pending_new_email VARCHAR(255),
    new_email_otp CHAR(6),
    new_email_otp_expires TIMESTAMPTZ,
    new_email_requests_sent SMALLINT DEFAULT 0,
    last_new_email_request_at TIMESTAMPTZ,

    password_reset_token CHAR(6),
    password_reset_token_expires TIMESTAMPTZ,
    password_reset_requests_sent SMALLINT DEFAULT 0,
    last_password_reset_request_at TIMESTAMPTZ,
    
    password_change_attempts SMALLINT DEFAULT 0,
    last_password_attempt_at TIMESTAMPTZ,
    name_last_changed_at TIMESTAMPTZ,

    read_history UUID[] DEFAULT ARRAY[]::UUID[],
    achievements TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_otp ON users(verification_otp);
CREATE INDEX idx_users_new_email_otp ON users(new_email_otp);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX idx_users_read_history ON users USING GIN(read_history);

CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- recipes table
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

-- ingredients table
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    quantity VARCHAR(100),
    name TEXT NOT NULL,
    display_order SMALLINT NOT NULL
);

CREATE INDEX idx_ingredients_recipe_id ON ingredients(recipe_id);

-- steps table
CREATE TABLE steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number SMALLINT NOT NULL,
    description TEXT NOT NULL,
    UNIQUE(recipe_id, step_number)
);

CREATE INDEX idx_steps_recipe_id_step_number ON steps(recipe_id, step_number);

-- tips table
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

-- user_favorites junction table
CREATE TABLE user_favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, recipe_id)
);

-- user_favorite_cuisines junction table
CREATE TABLE user_favorite_cuisines (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    region VARCHAR(100) NOT NULL,
    PRIMARY KEY (user_id, region)
);

-- groups table
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

-- group_members junction table
CREATE TABLE group_members (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, group_id)
);

-- posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    shared_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_group_id ON posts(group_id);

CREATE TRIGGER update_posts_modtime
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- comments table
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

-- post_reactions table
CREATE TYPE reaction_type AS ENUM ('like', 'dislike');

CREATE TABLE post_reactions (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reaction reaction_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

-- reports table
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
