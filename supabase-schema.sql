-- 错题举一反三APP - Supabase数据库Schema
-- 运行此SQL创建所有表、视图和RLS策略

-- ============================================
-- 1. profiles 表 - 用户资料
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- profiles表索引
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- ============================================
-- 2. folders 表 - 文件夹（支持树形结构）
-- ============================================
CREATE TABLE IF NOT EXISTS folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- folders表索引
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);

-- ============================================
-- 3. questions 表 - 题目
-- ============================================
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  extracted_text TEXT,
  question_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- questions表索引
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_folder_id ON questions(folder_id);

-- ============================================
-- 4. practices 表 - 练习记录
-- ============================================
CREATE TABLE IF NOT EXISTS practices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  question_ids UUID[] NOT NULL,
  generated_content JSONB NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- practices表索引
CREATE INDEX IF NOT EXISTS idx_practices_user_id ON practices(user_id);

-- ============================================
-- 5. Row Level Security (RLS) 策略
-- ============================================

-- 启用RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;

-- profiles表RLS策略
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- folders表RLS策略
CREATE POLICY "Users can view own folders"
  ON folders FOR SELECT
  USING (user_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own folders"
  ON folders FOR INSERT
  WITH CHECK (user_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own folders"
  ON folders FOR UPDATE
  USING (user_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own folders"
  ON folders FOR DELETE
  USING (user_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

-- questions表RLS策略
CREATE POLICY "Users can view own questions"
  ON questions FOR SELECT
  USING (user_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own questions"
  ON questions FOR INSERT
  WITH CHECK (user_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own questions"
  ON questions FOR UPDATE
  USING (user_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own questions"
  ON questions FOR DELETE
  USING (user_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

-- practices表RLS策略
CREATE POLICY "Users can view own practices"
  ON practices FOR SELECT
  USING (user_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own practices"
  ON practices FOR INSERT
  WITH CHECK (user_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own practices"
  ON practices FOR UPDATE
  USING (user_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own practices"
  ON practices FOR DELETE
  USING (user_id IN (SELECT user_id FROM profiles WHERE user_id = auth.uid()));

-- ============================================
-- 6. Storage Buckets
-- ============================================

-- 题目图片存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', false)
ON CONFLICT (id) DO NOTHING;

-- 练习PDF存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('practice-pdfs', 'practice-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS策略
CREATE POLICY "Users can upload own question images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'question-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own question images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'question-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own practice pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'practice-pdfs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own practice pdfs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'practice-pdfs' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 7. 触发器 - 自动更新updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. 创建管理员账号
-- ============================================
-- 注意：这需要在Supabase Dashboard中创建用户后执行
-- 创建管理员profile：
-- INSERT INTO profiles (user_id, username, role)
-- VALUES ('your-admin-user-id', 'admin', 'admin');
