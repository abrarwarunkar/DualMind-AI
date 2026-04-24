-- ═══════════════════════════════════════════════════════
-- DualMind — Supabase Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL)
-- ═══════════════════════════════════════════════════════

-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  github_token TEXT,
  subscription_type VARCHAR(10) DEFAULT 'basic' CHECK (subscription_type IN ('basic', 'pro')),
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Research Sessions table
CREATE TABLE research_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  gpt_response JSONB DEFAULT '{}',
  claude_response JSONB DEFAULT '{}',
  grounded_summary JSONB DEFAULT '{}',
  citations JSONB DEFAULT '[]',
  hallucination_report JSONB DEFAULT '{}',
  sources JSONB DEFAULT '[]',
  academic_sources JSONB DEFAULT '[]',
  entities JSONB DEFAULT '[]',
  parent_session_id UUID REFERENCES research_sessions(id) ON DELETE SET NULL,
  chain_depth INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  compare_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_user ON research_sessions(user_id, created_at DESC);

-- Notes table
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) DEFAULT 'Untitled Note',
  content JSONB DEFAULT '{}',
  markdown_version TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  last_edited TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_session ON notes(session_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON research_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
