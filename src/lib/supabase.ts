
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("CRITICAL ERROR in src/lib/supabase.ts: Missing env.NEXT_PUBLIC_SUPABASE_URL. Ensure .env file is correct and server is restarted.");
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  console.error("CRITICAL ERROR in src/lib/supabase.ts: Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY. Ensure .env file is correct and server is restarted.");
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
