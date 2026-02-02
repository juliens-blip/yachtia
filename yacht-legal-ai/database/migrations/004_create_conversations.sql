-- Migration 004: Create conversations table
-- Description: Table pour stocker l'historique des conversations chat
-- Date: 2026-01-12

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title VARCHAR(255),
  started_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW(),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  document_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- Comments
COMMENT ON TABLE conversations IS 'Stores chat conversations with users';
COMMENT ON COLUMN conversations.messages IS 'Array of message objects: [{role: "user"|"assistant", content: "...", timestamp: "..."}]';
COMMENT ON COLUMN conversations.document_ids IS 'Array of document UUIDs referenced in conversation (for sources tracking)';
COMMENT ON COLUMN conversations.user_id IS 'User identifier (nullable for anonymous sessions)';
