-- Language Translation Feature Database Migration
-- Creates tables for user preferences, translation cache, and supported languages

-- Create supported languages table
CREATE TABLE supported_languages (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    flag_emoji VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial supported languages data
INSERT INTO supported_languages (code, name, native_name, flag_emoji) VALUES
('en', 'English', 'English', '🇺🇸'),
('es', 'Spanish', 'Español', '🇪🇸'),
('fr', 'French', 'Français', '🇫🇷'),
('de', 'German', 'Deutsch', '🇩🇪'),
('it', 'Italian', 'Italiano', '🇮🇹'),
('pt', 'Portuguese', 'Português', '🇵🇹'),
('ru', 'Russian', 'Русский', '🇷🇺'),
('ja', 'Japanese', '日本語', '🇯🇵'),
('ko', 'Korean', '한국어', '🇰🇷'),
('zh', 'Chinese', '中文', '🇨🇳'),
('ar', 'Arabic', 'العربية', '🇸🇦'),
('hi', 'Hindi', 'हिन्दी', '🇮🇳'),
('th', 'Thai', 'ไทย', '🇹🇭'),
('vi', 'Vietnamese', 'Tiếng Việt', '🇻🇳'),
('nl', 'Dutch', 'Nederlands', '🇳🇱'),
('sv', 'Swedish', 'Svenska', '🇸🇪'),
('da', 'Danish', 'Dansk', '🇩🇰'),
('no', 'Norwegian', 'Norsk', '🇳🇴'),
('fi', 'Finnish', 'Suomi', '🇫🇮'),
('pl', 'Polish', 'Polski', '🇵🇱');

-- Create user translation preferences table
CREATE TABLE user_translation_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    default_language VARCHAR(10) DEFAULT 'en',
    auto_translate BOOLEAN DEFAULT false,
    display_mode VARCHAR(20) DEFAULT 'side-by-side' CHECK (display_mode IN ('side-by-side', 'toggle')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create translation cache table
CREATE TABLE translation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    confidence_score FLOAT DEFAULT 0.0,
    text_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of original text for quick lookup
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    UNIQUE(text_hash, source_language, target_language, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_translation_preferences_user_id ON user_translation_preferences(user_id);
CREATE INDEX idx_translation_cache_user_id ON translation_cache(user_id);
CREATE INDEX idx_translation_cache_hash ON translation_cache(text_hash, source_language, target_language);
CREATE INDEX idx_translation_cache_expires ON translation_cache(expires_at);

-- Enable Row Level Security
ALTER TABLE user_translation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_translation_preferences
CREATE POLICY "Users can view own preferences" ON user_translation_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_translation_preferences
    FOR ALL USING (auth.uid() = user_id);

-- RLS policies for translation_cache
CREATE POLICY "Users can view own cache" ON translation_cache
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cache" ON translation_cache
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON supported_languages TO anon, authenticated;
GRANT SELECT ON user_translation_preferences TO anon;
GRANT ALL PRIVILEGES ON user_translation_preferences TO authenticated;
GRANT SELECT ON translation_cache TO anon;
GRANT ALL PRIVILEGES ON translation_cache TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_translation_preferences
CREATE TRIGGER update_user_translation_preferences_updated_at
    BEFORE UPDATE ON user_translation_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();