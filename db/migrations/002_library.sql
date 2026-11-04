CREATE TABLE IF NOT EXISTS user_libraries (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  document jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
