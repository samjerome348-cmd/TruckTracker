// ---------- Login / Sign-up for the current Truck Tracker UI ----------
function clearAuthError() {
  const el = document.getElementById('auth-error');
  if (el) {
    el.textContent = '';
    el.style.display = 'none';
  }
}

function showAuthError(message) {
  const el = document.getElementById('auth-error');
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  clearAuthError();

  if (typeof supabaseClient === 'undefined' || !supabaseClient) {
    showAuthError('Supabase is not initialized. Please refresh the page.');
    return;
  }

  const email = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value;
  const button = document.getElementById('btn-login');

  if (!email || !password) {
    showAuthError('Please enter your email and password.');
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'Signing In...';
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showAuthError(error.message);
      return;
    }

    if (!data?.session) {
      showAuthError('Login succeeded, but no session was created. Please try again.');
    }
    // app.js listens for the auth-state change and opens the dashboard.
  } catch (err) {
    showAuthError(err?.message || 'Unable to sign in. Please try again.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Sign In';
    }
  }
}

async function handleSignUp() {
  clearAuthError();

  if (typeof supabaseClient === 'undefined' || !supabaseClient) {
    showAuthError('Supabase is not initialized. Please refresh the page.');
    return;
  }

  const email = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value;

  if (!email || !password) {
    showAuthError('Enter an email and password first, then click Sign Up.');
    return;
  }

  if (password.length < 8) {
    showAuthError('Password must be at least 8 characters.');
    return;
  }

  const button = document.querySelector('#form-auth button[onclick="handleSignUp()"]');
  if (button) {
    button.disabled = true;
    button.textContent = 'Creating...';
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
      showAuthError(error.message);
      return;
    }

    if (data?.session) {
      // app.js will react to the new session and open the dashboard.
      return;
    }

    const el = document.getElementById('auth-error');
    if (el) {
      el.textContent = 'Account created. Check your email to confirm it, then sign in.';
      el.style.display = 'block';
      el.style.color = '#22c55e';
    }
  } catch (err) {
    showAuthError(err?.message || 'Unable to create the account.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Sign Up';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  clearAuthError();
});
