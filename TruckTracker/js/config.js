// ============================================================
// PASTE YOUR OWN SUPABASE PROJECT DETAILS HERE.
// Find these in: Supabase dashboard → Project Settings → API
//   - "Project URL"       -> SUPABASE_URL
//   - "anon public" key   -> SUPABASE_ANON_KEY
// The anon key is safe to expose in frontend code — it only ever
// acts within the permissions your Row Level Security policies allow.
// ============================================================
const SUPABASE_URL = "https://gpcbjjemdjsvcemlwett.supabase.co";
const SUPABASE_ANON_KEY = "
sb_publishable_zqKU_oMWFISYwVu4i8BiGg_P4JcRUVU";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);