// ============================================================
// SUPABASE API CONFIGURATION
// ============================================================

const SUPABASE_URL = "https://gpcbjjemdjsvcemlwett.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zqKU_oMWFISYwVu4i8BiGg_P4JcRUVU";

let supabaseClient = null;

if (typeof supabase === 'undefined') {
  console.error('Supabase JS SDK failed to load. Check the Supabase script tag in index.html.');
} else {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    window.supabaseClient = supabaseClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}
