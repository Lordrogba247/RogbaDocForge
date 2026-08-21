import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This will show up in the browser console if the .env file is missing
  // VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
  console.error(
    "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Add them to your .env file (see .env.example)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
