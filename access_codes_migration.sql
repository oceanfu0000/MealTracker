-- Access Codes Table
CREATE TABLE access_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- RLS for access codes (anyone can read to verify, only admin implies manual insertion for now)
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to verify codes (simplest approach for registration)
CREATE POLICY "Public can read access codes"
  ON access_codes FOR SELECT
  USING (true);

-- Insert initial complex code
INSERT INTO access_codes (code) VALUES ('');
