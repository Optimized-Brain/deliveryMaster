
import { createClient } from '@supabase/supabase-js';

// Log the environment variables as seen by the server process when this module is loaded
console.log("Supabase Client Init: NEXT_PUBLIC_SUPABASE_URL =", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Exists" : "MISSING_OR_EMPTY");
console.log("Supabase Client Init: NEXT_PUBLIC_SUPABASE_ANON_KEY =", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Exists" : "MISSING_OR_EMPTY");

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

// It's highly recommended to generate types from your Supabase schema
// and use them here, e.g., createClient<Database>(...).
// For now, we'll use a generic client.
// You can generate types using: supabase gen types typescript --project-id <your-project-id> > src/lib/database.types.ts
// Then import type { Database } from './database.types';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

