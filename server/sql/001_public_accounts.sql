-- Applied on 2026-09-24 to project still-dream-28471092, branch br-misty-king-b4a7jfuq.
-- Better Auth's user/session/account/verification tables were created first.
CREATE TABLE profiles (
  user_id text PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_daily_usage (
  scope text NOT NULL CHECK (scope IN ('global', 'user')),
  user_id text NOT NULL,
  day date NOT NULL,
  units integer NOT NULL DEFAULT 0 CHECK (units >= 0),
  PRIMARY KEY (scope, user_id, day),
  CHECK ((scope = 'global' AND user_id = '') OR (scope = 'user' AND user_id <> ''))
);
