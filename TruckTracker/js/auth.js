// ---------- Small helpers ----------
function showMsg(el, text, type) {
  el.textContent = text;
  el.className = 'msg show ' + (type === 'error' ? 'msg-error' : 'msg-success');
}
function hideMsg(el) {
  el.className = 'msg';
}
function setLoading(btn, loading, labelWhenIdle) {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="spinner"></span> Working...'
    : labelWhenIdle;
}

// ---------- Redirect straight to app if already logged in ----------
async function redirectIfLoggedIn() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) window.location.href = 'app.html';
}

// ---------- Views on index.html: login / signup / forgot ----------
const viewLogin = document.getElementById('view-login');
const viewSignup = document.getElementById('view-signup');
const viewForgot = document.getElementById('view-forgot');

function switchView(view) {
  [viewLogin, viewSignup, viewForgot].forEach(v => v && v.classList.add('hidden'));
  if (view) view.classList.remove('hidden');
}

if (viewLogin) {
  redirectIfLoggedIn();

  document.getElementById('link-to-signup').addEventListener('click', (e) => {
    e.preventDefault(); switchView(viewSignup);
  });
  document.getElementById('link-to-forgot').addEventListener('click', (e) => {
    e.preventDefault(); switchView(viewForgot);
  });
  document.getElementById('link-to-login-1').addEventListener('click', (e) => {
    e.preventDefault(); switchView(viewLogin);
  });
  document.getElementById('link-to-login-2').addEventListener('click', (e) => {
    e.preventDefault(); switchView(viewLogin);
  });

  // ---- Log in ----
  const loginForm = document.getElementById('form-login');
  const loginMsg = document.getElementById('login-msg');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMsg(loginMsg);
    const btn = loginForm.querySelector('button[type=submit]');
    setLoading(btn, true, 'Log in');

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    setLoading(btn, false, 'Log in');
    if (error) {
      showMsg(loginMsg, error.message, 'error');
    } else {
      window.location.href = 'app.html';
    }
  });

  // ---- Sign up ----
  const signupForm = document.getElementById('form-signup');
  const signupMsg = document.getElementById('signup-msg');
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMsg(signupMsg);
    const btn = signupForm.querySelector('button[type=submit]');
    setLoading(btn, true, 'Create account');

    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const password2 = document.getElementById('signup-password2').value;

    if (password !== password2) {
      setLoading(btn, false, 'Create account');
      showMsg(signupMsg, "Passwords don't match.", 'error');
      return;
    }
    if (password.length < 8) {
      setLoading(btn, false, 'Create account');
      showMsg(signupMsg, 'Password must be at least 8 characters.', 'error');
      return;
    }

    const { error } = await supabaseClient.auth.signUp({ email, password });

    setLoading(btn, false, 'Create account');
    if (error) {
      showMsg(signupMsg, error.message, 'error');
    } else {
      showMsg(signupMsg, 'Account created. Check your email to confirm, then log in.', 'success');
      signupForm.reset();
    }
  });

  // ---- Forgot password ----
  const forgotForm = document.getElementById('form-forgot');
  const forgotMsg = document.getElementById('forgot-msg');
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMsg(forgotMsg);
    const btn = forgotForm.querySelector('button[type=submit]');
    setLoading(btn, true, 'Send reset link');

    const email = document.getElementById('forgot-email').value.trim();
    const redirectTo = window.location.origin + window.location.pathname.replace('index.html', '') + 'reset-password.html';

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });

    setLoading(btn, false, 'Send reset link');
    if (error) {
      showMsg(forgotMsg, error.message, 'error');
    } else {
      showMsg(forgotMsg, 'If that email has an account, a reset link is on its way.', 'success');
    }
  });
}

// ---------- reset-password.html ----------
const resetForm = document.getElementById('form-reset');
if (resetForm) {
  const resetMsg = document.getElementById('reset-msg');

  // Supabase puts the recovery token in the URL and creates a temporary
  // session automatically when the page loads via the emailed link.
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      document.getElementById('reset-ready').classList.remove('hidden');
    }
  });

  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMsg(resetMsg);
    const btn = resetForm.querySelector('button[type=submit]');
    setLoading(btn, true, 'Set new password');

    const password = document.getElementById('reset-password').value;
    const password2 = document.getElementById('reset-password2').value;

    if (password !== password2) {
      setLoading(btn, false, 'Set new password');
      showMsg(resetMsg, "Passwords don't match.", 'error');
      return;
    }
    if (password.length < 8) {
      setLoading(btn, false, 'Set new password');
      showMsg(resetMsg, 'Password must be at least 8 characters.', 'error');
      return;
    }

    const { error } = await supabaseClient.auth.updateUser({ password });

    setLoading(btn, false, 'Set new password');
    if (error) {
      showMsg(resetMsg, error.message, 'error');
    } else {
      showMsg(resetMsg, 'Password updated. Redirecting to login...', 'success');
      await supabaseClient.auth.signOut();
      setTimeout(() => window.location.href = 'index.html', 1800);
    }
  });
}