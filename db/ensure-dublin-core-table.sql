-- Check if the dublin_core_metadata table exists, if not create it
CREATE TABLE IF NOT EXISTS dublin_core_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id UUID REFERENCES manifests(id) ON DELETE CASCADE,
  title TEXT,
  creator TEXT,
  subject TEXT,
  description TEXT,
  publisher TEXT,
  contributor TEXT,
  date TEXT,
  type TEXT,
  format TEXT,
  identifier TEXT,
  source TEXT,
  language TEXT,
  relation TEXT,
  coverage TEXT,
  rights TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add a trigger to update the updated_at timestamp if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_dublin_core_metadata_updated_at'
  ) THEN
    CREATE TRIGGER update_dublin_core_metadata_updated_at
    BEFORE UPDATE ON dublin_core_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION
  WHEN undefined_function THEN
    -- Create the function if it doesn't exist
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Then create the trigger
    CREATE TRIGGER update_dublin_core_metadata_updated_at
    BEFORE UPDATE ON dublin_core_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
END;
$$;
