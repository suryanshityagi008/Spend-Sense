
document.addEventListener("DOMContentLoaded", () => {
  const SESSION_KEY = "spendsense_demo_session";
  let session;

  try {
    session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  } catch {
    session = null;
  }

  if (!session || !session.email) {
    window.location.replace("login.html");
    return;
  }

  const userKey = encodeURIComponent(session.email.toLowerCase());
  const transactionsKey = `spendsense_transactions_${userKey}`;
  const goalsKey = `spendsense_goals_${userKey}`;
  const budgetKey = `spendsense_plan_${userKey}`;

  const $ = id => document.getElementById(id);

  const money = amount =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(amount);

  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const dateLabel = value =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

  const escapeHTML = value =>
    String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));

  let transactions = readJSON(transactionsKey, []);
  let goals = readJSON(goalsKey, []);
  let budget = Number(localStorage.getItem(budgetKey)) || 5000;
  let categoryChart = null;

  function readJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function saveData() {
    localStorage.setItem(transactionsKey, JSON.stringify(transactions));
    localStorage.setItem(goalsKey, JSON.stringify(goals));
    localStorage.setItem(budgetKey, String(budget));
  }

  const displayName = session.name || session.email.split("@")[0];

  $("userName").textContent = displayName;
  $("userEmail").textContent = session.email;
  $("userAvatar").textContent = displayName.charAt(0).toUpperCase();
  $("topAvatar").textContent = displayName.charAt(0).toUpperCase();

  $("todayLabel").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });

  $("transactionDate").value = todayISO();
  $("transactionDate").max = todayISO();
  $("budgetInput").value = budget;

  function render() {
    const income = transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const month = todayISO().slice(0, 7);

    const monthExpenses = transactions
      .filter(t => t.type === "expense" && t.date.startsWith(month))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    $("balanceValue").textContent = money(income - expenses);
    $("incomeValue").textContent = money(income);
    $("expenseValue").textContent = money(expenses);
    $("monthExpenseValue").textContent = money(monthExpenses);
    $("bannerBalance").textContent = money(income - expenses);

    $("budgetSpent").textContent = money(monthExpenses);

    const percent = budget > 0
      ? Math.min(100, Math.round(monthExpenses / budget * 100))
      : 0;

    $("budgetProgress").style.width = `${percent}%`;
    $("budgetProgress").classList.toggle(
      "over-budget",
      monthExpenses > budget
    );

    $("budgetRemaining").textContent = monthExpenses > budget
      ? `${money(monthExpenses - budget)} over budget`
      : `${money(budget - monthExpenses)} left`;

    $("budgetPercent").textContent = `${percent}% used`;
    $("budgetInput").value = budget;

    renderTransactions();
    renderChart();
    renderGoals();
  }

  function renderTransactions() {
    const search = $("searchInput").value.trim().toLowerCase();
    const filter = $("typeFilter").value;

    const visible = transactions
      .filter(t =>
        (filter === "all" || t.type === filter) &&
        `${t.title} ${t.category} ${t.date}`.toLowerCase().includes(search)
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

    if (!visible.length) {
      $("transactionRows").innerHTML = `
        <tr>
          <td colspan="5" class="empty-row">
            ${transactions.length
              ? "No transactions match your search."
              : "No transactions yet. Add your first transaction."}
          </td>
        </tr>`;
      return;
    }

    $("transactionRows").innerHTML = visible.map(t => `
      <tr>
        <td>
          <div class="transaction-name">
            <span class="transaction-icon ${t.type}">
              ${t.type === "income" ? "↗" : "↘"}
            </span>
            <span>
              <strong>${escapeHTML(t.title)}</strong>
              <small>${t.type === "income" ? "Income" : "Expense"}</small>
            </span>
          </div>
        </td>
        <td><span class="category-chip">${escapeHTML(t.category)}</span></td>
        <td class="date-cell">${dateLabel(t.date)}</td>
        <td class="amount-cell ${t.type}">
          ${t.type === "income" ? "+" : "−"}${money(Number(t.amount))}
        </td>
        <td>
          <button
            class="delete-btn"
            data-delete="${t.id}"
            aria-label="Delete ${escapeHTML(t.title)}"
            title="Delete transaction"
          >×</button>
        </td>
      </tr>
    `).join("");
  }

  function renderChart() {
    const totals = {};

    transactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + Number(t.amount);
      });

    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    const colors = [
      "#6d5dfc", "#22b07d", "#ff9f43", "#4e9bfa", "#ef6686",
      "#24b8c8", "#9a72d9", "#7d899b", "#d4b04a", "#8997a9"
    ];

    $("chartEmpty").style.display = entries.length ? "none" : "grid";

    $("categoryLegend").innerHTML = entries.slice(0, 5).map(([name, value], i) => `
      <div class="legend-row">
        <span>
          <i style="background:${colors[i % colors.length]}"></i>
          ${escapeHTML(name)}
        </span>
        <strong>${money(value)}</strong>
      </div>
    `).join("");

    if (typeof Chart === "undefined") return;

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart($("categoryChart"), {
      type: "doughnut",
      data: {
        labels: entries.map(e => e[0]),
        datasets: [{
          data: entries.map(e => e[1]),
          backgroundColor: entries.map((_, i) => colors[i % colors.length]),
          borderWidth: 0,
          hoverOffset: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${money(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  function renderGoals() {
    if (!goals.length) {
      $("goalList").innerHTML = `
        <div class="goal-empty">
          Your goals will appear here. Add one above to get started.
        </div>`;
      return;
    }

    $("goalList").innerHTML = goals.map(goal => {
      const percent = Math.min(
        100,
        Math.round(Number(goal.saved) / Number(goal.target) * 100)
      );

      return `
        <div class="goal-item">
          <div class="goal-item-top">
            <div class="goal-symbol">✧</div>
            <div class="goal-info">
              <strong>${escapeHTML(goal.name)}</strong>
              <small>
                ${money(Number(goal.saved))} of ${money(Number(goal.target))}
              </small>
            </div>
            <button
              class="delete-btn"
              data-goal-delete="${goal.id}"
              aria-label="Delete goal"
            >×</button>
          </div>

          <div class="progress-track goal-progress">
            <div class="progress-fill" style="width:${percent}%"></div>
          </div>

          <div class="goal-meta">
            <span>${percent}% saved</span>
            <span>${money(Math.max(0, Number(goal.target) - Number(goal.saved)))} to go</span>
          </div>
        </div>`;
    }).join("");
  }

  function openModal() {
    $("transactionModal").hidden = false;
    document.body.classList.add("modal-open");
    $("transactionTitle").focus();
  }

  function closeModal() {
    $("transactionModal").hidden = true;
    document.body.classList.remove("modal-open");
    $("transactionMessage").textContent = "";
    $("transactionForm").reset();
    $("transactionDate").value = todayISO();
  }

  $("addTransactionTop").addEventListener("click", openModal);
  $("closeModal").addEventListener("click", closeModal);

  $("transactionModal").addEventListener("click", event => {
    if (event.target === $("transactionModal")) closeModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("transactionModal").hidden) {
      closeModal();
    }
  });

  $("transactionForm").addEventListener("submit", event => {
    event.preventDefault();

    const title = $("transactionTitle").value.trim();
    const amount = Number($("transactionAmount").value);
    const category = $("transactionCategory").value;
    const date = $("transactionDate").value;
    const type = document.querySelector(
      'input[name="transactionType"]:checked'
    ).value;

    if (!title || !Number.isFinite(amount) || amount <= 0 ||
        !date || date > todayISO()) {
      $("transactionMessage").textContent =
        "Please enter a description, a positive amount, and a valid date (today or earlier).";
      $("transactionMessage").className = "form-message error";
      return;
    }

    transactions.push({
      id: Date.now(),
      title,
      amount,
      category,
      date,
      type
    });

    saveData();
    render();
    closeModal();
  });

  $("transactionRows").addEventListener("click", event => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;

    transactions = transactions.filter(
      t => String(t.id) !== button.dataset.delete
    );

    saveData();
    render();
  });

  $("goalList").addEventListener("click", event => {
    const button = event.target.closest("[data-goal-delete]");
    if (!button) return;

    goals = goals.filter(
      goal => String(goal.id) !== button.dataset.goalDelete
    );

    saveData();
    renderGoals();
  });

  $("searchInput").addEventListener("input", renderTransactions);
  $("typeFilter").addEventListener("change", renderTransactions);

  $("budgetForm").addEventListener("submit", event => {
    event.preventDefault();

    const value = Number($("budgetInput").value);

    if (!Number.isFinite(value) || value <= 0) {
      $("budgetMessage").textContent = "Enter a budget greater than zero.";
      $("budgetMessage").className = "form-message error";
      return;
    }

    budget = value;
    saveData();
    render();

    $("budgetMessage").textContent = "Monthly budget saved.";
    $("budgetMessage").className = "form-message success";
  });

  $("goalForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("goalName").value.trim();
    const target = Number($("goalTarget").value);
    const saved = Number($("goalSaved").value);

    if (!name || target <= 0 || saved < 0) return;

    goals.push({
      id: Date.now(),
      name,
      target,
      saved
    });

    saveData();
    renderGoals();
    $("goalForm").reset();
    $("goalSaved").value = 0;
  });

  $("exportBtn").addEventListener("click", () => {
    if (!transactions.length) {
      alert("There are no transactions to export yet.");
      return;
    }

    const csvCell = value =>
      `"${String(value).replace(/"/g, '""')}"`;

    const rows = [
      ["Description", "Type", "Category", "Date", "Amount"],
      ...transactions.map(t => [
        t.title, t.type, t.category, t.date, t.amount
      ])
    ];

    const csv = rows
      .map(row => row.map(csvCell).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "spendsense-transactions.csv";
    a.click();

    URL.revokeObjectURL(url);
  });

  $("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
  });

  $("menuBtn").addEventListener("click", () => {
    $("sidebar").classList.toggle("sidebar-open");
  });

  document.querySelectorAll(".side-link[href^='#']").forEach(link => {
    link.addEventListener("click", () => {
      $("sidebar").classList.remove("sidebar-open");
    });
  });

  render();
});
