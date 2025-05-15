
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// It's highly recommended to generate types from your Supabase schema
// and use them here, e.g., createClient<Database>(...).
// For now, we'll use a generic client.
// You can generate types using: supabase gen types typescript --project-id <your-project-id> > src/lib/database.types.ts
// Then import type { Database } from './database.types';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
