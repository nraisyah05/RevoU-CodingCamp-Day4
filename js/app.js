// ===== Module-level state =====
let transactions = [];
let storageWarning = false;

const CATEGORY_COLORS = {
  Food: 'category-food',
  Transport: 'category-transport',
  Fun: 'category-fun',
};

// ===== Storage module =====

function loadTransactions() {
  try {
    const raw = localStorage.getItem('expense-transactions');
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(entry => {
      const validId       = typeof entry.id === 'string';
      const validName     = typeof entry.name === 'string';
      const validAmount   = typeof entry.amount === 'number';
      const validCategory = ['Food', 'Transport', 'Fun'].includes(entry.category);
      const validDate     = typeof entry.createdAt === 'number';
      return validId && validName && validAmount && validCategory && validDate;
    });
  } catch (err) {
    if (err instanceof DOMException) {
      storageWarning = true;
    }
    return [];
  }
}

function saveTransactions(list) {
  try {
    localStorage.setItem('expense-transactions', JSON.stringify(list));
  } catch (err) {
    if (err instanceof DOMException) {
      storageWarning = true;
    }
  }
}

// ===== Validation module =====

function validateForm(name, amount, category) {
  const errors = {};

  if (!name || !name.trim()) {
    errors.name = 'Item name is required.';
  }

  const parsed = parseFloat(amount);
  if (isNaN(parsed) || !isFinite(parsed) || parsed <= 0) {
    errors.amount = 'Amount must be a number greater than 0.';
  }

  if (!['Food', 'Transport', 'Fun'].includes(category)) {
    errors.category = 'Please select a valid category.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ===== Transaction module =====

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older Safari
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function addTransaction(name, amount, category) {
  const id = generateId();
  const entry = {
    id,
    name: name.trim(),
    amount: parseFloat(amount),
    category,
    createdAt: Date.now(),
  };
  transactions.push(entry);
  saveTransactions(transactions);
  return entry;
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions(transactions);
}

// ===== UI module =====

const totalDisplay   = document.getElementById('total-display');
const formErrors     = document.getElementById('form-errors');
const expenseForm    = document.getElementById('expense-form');
const expenseList    = document.getElementById('expense-list');

function formatCurrency(value) {
  return '$' + value.toFixed(2);
}

function renderTotal() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  totalDisplay.textContent = formatCurrency(total);
}

function renderList() {
  expenseList.innerHTML = '';

  if (transactions.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = 'No expenses yet.';
    empty.style.color = '#888';
    expenseList.appendChild(empty);
    return;
  }

  // Show newest first
  [...transactions].reverse().forEach(t => {
    const li = document.createElement('li');
    li.dataset.id = t.id;
    li.className = CATEGORY_COLORS[t.category] || '';

    li.innerHTML = `
      <div class="expense-info">
        <span class="expense-name">${escapeHtml(t.name)}</span>
        <span class="expense-category">${escapeHtml(t.category)}</span>
      </div>
      <div class="expense-right">
        <span class="expense-amount">${formatCurrency(t.amount)}</span>
        <button class="btn-delete" aria-label="Delete ${escapeHtml(t.name)}">✕</button>
      </div>
    `;

    li.querySelector('.btn-delete').addEventListener('click', () => {
      deleteTransaction(t.id);
      render();
    });

    expenseList.appendChild(li);
  });
}

function showErrors(errors) {
  const messages = Object.values(errors);
  formErrors.textContent = messages.join(' ');
}

function clearErrors() {
  formErrors.textContent = '';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function render() {
  renderTotal();
  renderList();
}

// ===== Form submit handler =====

expenseForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const name     = document.getElementById('item-name').value;
  const amount   = document.getElementById('item-amount').value;
  const category = document.getElementById('item-category').value;

  clearErrors();

  const { valid, errors } = validateForm(name, amount, category);

  if (!valid) {
    showErrors(errors);
    return;
  }

  addTransaction(name, amount, category);
  expenseForm.reset();
  render();
});

// ===== Init =====

transactions = loadTransactions();
render();

if (storageWarning) {
  formErrors.textContent = 'Warning: localStorage is unavailable. Data will not be saved.';
}
