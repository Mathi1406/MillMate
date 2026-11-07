(() => {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const error = document.getElementById('loginError');
      const button = form.querySelector('button[type="submit"]');
      error.hidden = true;
      button.disabled = true;
      button.textContent = 'Signing in…';
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ username, password })
        });
        if (!response.ok) {
          error.textContent = response.status === 429
            ? 'Too many attempts. Please wait and try again.'
            : 'Incorrect username or password.';
          error.hidden = false;
          document.getElementById('password').focus();
          return;
        }
        window.location.replace('/app/index.html');
      } catch (_) {
        error.textContent = 'Unable to sign in. Please try again.';
        error.hidden = false;
      } finally {
        button.disabled = false;
        button.textContent = 'Log in';
      }
    });
    return;
  }

  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
      } finally {
        window.location.replace('/app/login.html');
      }
    });
  });
})();
