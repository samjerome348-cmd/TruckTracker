// ============================================================
// SUPABASE API CONFIGURATION
// ============================================================

// 1. Your Supabase Project URL
const SUPABASE_URL = "https://gpcbjjemdjsvcemlwett.supabase.co";

// 2. Your Supabase Publishable Key
const SUPABASE_ANON_KEY = "sb_publishable_zqKU_oMWFISYwVu4i8BiGg_P4JcRUVU";

// 3. Client Initialization
let supabaseClient = null;

if (typeof supabase === 'undefined') {
  console.error("Supabase JS SDK failed to load. Check your <script> tag in HTML.");
} else {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    try {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  window.supabaseClient = supabaseClient; // <--- ADD THIS LINE
} catch (err) {
  console.error("Failed to initialize Supabase client:", err);
}
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
}
