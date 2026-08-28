// ============================================================
// SUPABASE API CONFIGURATION
// ============================================================

// 1. Your Supabase Project URL
const SUPABASE_URL = "https://gpcbjjemdjsvcemlwett.supabase.co";

// 2. Your Supabase ANON Public Key (JWT starting with eyJ...)
const SUPABASE_ANON_KEY = "PASTE_YOUR_EYJ_JWT_KEY_HERE";

// 3. Client Initialization with Error Checking
let supabaseClient = null;

if (typeof supabase === 'undefined') {
  console.error("Supabase JS SDK failed to load. Check your <script> tag in HTML.");
} else if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "PASTE_YOUR_EYJ_JWT_KEY_HERE") {
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
