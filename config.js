// ============================================================
// SUPABASE API CONFIGURATION
// ============================================================

// 1. Your Supabase Project URL
const SUPABASE_URL = "https://gpcbjjemdjsvcemlwett.supabase.co";

// 2. Your Supabase ANON Public Key
// Paste your full 'anon' 'public' key between the quotes below.
// (Found in: Supabase Dashboard -> Project Settings -> API -> Project API keys -> anon public)
const SUPABASE_ANON_KEY = "sb_publishable_zqKU_oMWFISYwVu4i8BiGg_P4JcRUVU";

// 3. Client Initialization with Error Checking
let supabaseClient = null;

if (typeof supabase === 'undefined') {
  console.error("Supabase JS SDK failed to load. Check your <script> tag in HTML.");
} else if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "sb_publishable_zqKU_oMWFISYwVu4i8BiGg_P4JcRUVU") {
  console.warn("TruckTracker: SUPABASE_ANON_KEY is missing or using placeholder in js/config.js");
} else {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
}
