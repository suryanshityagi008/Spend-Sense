
const USERS_KEY = "spendsense_demo_users";
const SESSION_KEY = "spendsense_demo_session";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("authForm");
  if (!form) return;

  const title = document.getElementById("authTitle");
  const subtitle = document.getElementById("authSubtitle");
  const nameField = document.getElementById("nameField");
  const nameLabel = document.getElementById("nameLabel");
  const passwordField = document.getElementById("passwordField");
  const submit = document.getElementById("authSubmit");
  const message = document.getElementById("authMessage");
  const switchText = document.getElementById("authSwitch");

  let mode = "login";

  function setMode(nextMode) {
    mode = nextMode;
    const signup = mode === "signup";

    title.textContent = signup ? "Create your account" : "Welcome back";
    subtitle.textContent = signup
      ? "Start building better money habits today."
      : "Enter your details to access your dashboard.";

    nameField.classList.toggle("hidden", !signup);
    nameLabel.classList.toggle("hidden", !signup);
    nameField.required = signup;

    passwordField.autocomplete = signup ? "new-password" : "current-password";

    submit.innerHTML = signup
      ? "Create account <span>→</span>"
      : "Log in <span>→</span>";

    switchText.innerHTML = signup
      ? 'Already have an account? <button type="button" data-mode="login">Log in</button>'
      : 'New to SpendSense? <button type="button" data-mode="signup">Create an account</button>';

    document.querySelectorAll(".auth-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.mode === mode);
    });

    message.textContent = "";
    message.className = "form-message";
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-mode]");
    if (button) {
      setMode(button.dataset.mode);
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();

    const email = document.getElementById("emailField").value.trim().toLowerCase();
    const password = passwordField.value;
    const name = nameField.value.trim();

    let users = [];

    try {
      users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    } catch {
      users = [];
    }

    if (mode === "signup") {
      if (name.length < 2) {
        return showMessage("Please enter your name.", true);
      }

      if (password.length < 6) {
        return showMessage(
          "Use at least 6 characters for this demo password.",
          true
        );
      }

      if (users.some(user => user.email === email)) {
        return showMessage(
          "An account with this email already exists. Please log in.",
          true
        );
      }

      users.push({ name, email, password });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ name, email })
      );

      window.location.href = "index.html";
    } else {
      const user = users.find(
        item => item.email === email && item.password === password
      );

      if (!user) {
        return showMessage(
          "Email or password is incorrect. If you're new, create an account first.",
          true
        );
      }

      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ name: user.name, email: user.email })
      );

      window.location.href = "index.html";
    }
  });

  function showMessage(text, isError) {
    message.textContent = text;
    message.className = "form-message " + (isError ? "error" : "success");
  }
});
