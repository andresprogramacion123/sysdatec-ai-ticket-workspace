import { api } from "./api.js";
import {
  translateStatus,
  STATUS_LABELS,
  translateCategory,
  CATEGORY_LABELS,
  translatePriority,
  PRIORITY_LABELS,
} from "./utils.js";

const PAGE_SIZE = 10;

const STATUS_SUMMARY_LABELS = {
  open: "abiertos",
  in_progress: "en progreso",
  resolved: "resueltos",
  closed: "cerrados",
};

// Static, trusted (non-user) SVG markup — safe to inject via innerHTML.
const STATUS_ICON_PATHS = {
  open: '<circle cx="12" cy="12" r="8"/>',
  in_progress: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
  resolved: '<path d="M20 6 9 17l-5-5"/>',
  closed: '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
};

const STATUS_ICON_COLORS = {
  open: "var(--color-ink)",
  in_progress: "#7a4b05",
  resolved: "#0b6e66",
  closed: "var(--color-text-secondary)",
};

const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };
const STATUS_ORDER = { open: 0, in_progress: 1, resolved: 2, closed: 3 };

const modalOverlay = document.getElementById("modal-overlay");
const openModalButton = document.getElementById("open-modal-button");
const closeModalButton = document.getElementById("modal-close-button");
const cancelModalButton = document.getElementById("modal-cancel-button");

const form = document.getElementById("create-ticket-form");
const formError = document.getElementById("form-error");
const submitButton = form.querySelector("button[type='submit']");

const ticketsBody = document.getElementById("tickets-body");
const ticketsError = document.getElementById("tickets-error");
const statusSummary = document.getElementById("status-summary");

const prevPageButton = document.getElementById("prev-page-button");
const nextPageButton = document.getElementById("next-page-button");
const paginationInfo = document.getElementById("pagination-info");

const searchInput = document.getElementById("search-input");
const categoryFilterSelect = document.getElementById("category-filter");
const priorityFilterSelect = document.getElementById("priority-filter");
const statusFilterSelect = document.getElementById("status-filter");
const clearFiltersButton = document.getElementById("clear-filters-button");
const sortButtons = document.querySelectorAll(".th-sort-button");

const DEFAULT_SORT_COLUMN = "created_at";
const DEFAULT_SORT_DIRECTION = "desc";

let allTickets = [];
let currentPage = 1;
let searchQuery = "";
let categoryFilter = "";
let priorityFilter = "";
let statusFilter = "";
let sortColumn = DEFAULT_SORT_COLUMN;
let sortDirection = DEFAULT_SORT_DIRECTION;

function populateSelectOptions(selectEl, labelsMap) {
  for (const [value, label] of Object.entries(labelsMap)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    selectEl.appendChild(option);
  }
}

function normalizeText(value) {
  return (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? isoString : date.toLocaleString();
}

function priorityBarClass(priority) {
  if (priority === "High") return "bar-high";
  if (priority === "Medium") return "bar-medium";
  if (priority === "Low") return "bar-low";
  return "";
}

function priorityBadgeClass(priority) {
  if (priority === "High") return "badge-priority-high";
  if (priority === "Medium") return "badge-priority-medium";
  if (priority === "Low") return "badge-priority-low";
  return "badge-priority-none";
}

function makeCustomerCell(ticket) {
  const cell = document.createElement("td");
  const barClass = priorityBarClass(ticket.priority);
  if (barClass) cell.classList.add(barClass);
  cell.textContent = ticket.customer_name;
  return cell;
}

function makeCategoryCell(ticket) {
  const cell = document.createElement("td");
  const span = document.createElement("span");
  span.className = "meta-text";
  span.textContent = ticket.category ? translateCategory(ticket.category) : "—";
  cell.appendChild(span);
  return cell;
}

function makePriorityCell(ticket) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `badge ${priorityBadgeClass(ticket.priority)}`;
  badge.textContent = ticket.priority ? translatePriority(ticket.priority) : "—";
  cell.appendChild(badge);
  return cell;
}

function makeStatusCell(ticket) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `badge badge-status-${ticket.status}`;
  badge.textContent = translateStatus(ticket.status);
  cell.appendChild(badge);
  return cell;
}

function makeCreatedCell(ticket) {
  const cell = document.createElement("td");
  cell.textContent = formatDate(ticket.created_at);
  return cell;
}

function makeActionsCell(ticket) {
  const cell = document.createElement("td");
  const link = document.createElement("a");
  link.href = `ticket.html?id=${encodeURIComponent(ticket.id)}`;
  link.textContent = "Ver detalle";
  link.className = "link-button";
  cell.appendChild(link);
  return cell;
}

function buildTicketRow(ticket) {
  const row = document.createElement("tr");
  row.appendChild(makeCustomerCell(ticket));
  row.appendChild(makeCategoryCell(ticket));
  row.appendChild(makePriorityCell(ticket));
  row.appendChild(makeStatusCell(ticket));
  row.appendChild(makeCreatedCell(ticket));
  row.appendChild(makeActionsCell(ticket));
  return row;
}

function createStatusIcon(status) {
  const wrapper = document.createElement("span");
  wrapper.className = "summary-icon";
  wrapper.style.color = STATUS_ICON_COLORS[status];
  wrapper.innerHTML =
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `${STATUS_ICON_PATHS[status]}</svg>`;
  return wrapper;
}

function renderStatusSummary(tickets) {
  const counts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
  for (const ticket of tickets) {
    if (counts[ticket.status] !== undefined) counts[ticket.status] += 1;
  }

  statusSummary.textContent = "";
  const activeStatuses = Object.entries(counts).filter(([, count]) => count > 0);

  if (activeStatuses.length === 0) {
    statusSummary.textContent = "Sin tickets todavía.";
    return;
  }

  activeStatuses.forEach(([status, count], index) => {
    if (index > 0) {
      const separator = document.createElement("span");
      separator.className = "summary-separator";
      separator.textContent = "·";
      statusSummary.appendChild(separator);
    }

    const item = document.createElement("span");
    item.className = "summary-item";
    item.appendChild(createStatusIcon(status));

    const text = document.createElement("span");
    text.textContent = `${count} ${STATUS_SUMMARY_LABELS[status]}`;
    item.appendChild(text);

    statusSummary.appendChild(item);
  });
}

function matchesFilters(ticket) {
  if (searchQuery && !normalizeText(ticket.customer_name).includes(normalizeText(searchQuery))) {
    return false;
  }
  if (categoryFilter && ticket.category !== categoryFilter) return false;
  if (priorityFilter && ticket.priority !== priorityFilter) return false;
  if (statusFilter && ticket.status !== statusFilter) return false;
  return true;
}

const SORT_COMPARATORS = {
  customer_name: (a, b) => (a.customer_name || "").localeCompare(b.customer_name || ""),
  category: (a, b) => (a.category ?? "").localeCompare(b.category ?? ""),
  priority: (a, b) => (PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0),
  status: (a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99),
  created_at: (a, b) => new Date(a.created_at) - new Date(b.created_at),
};

function compareTickets(a, b) {
  const comparator = SORT_COMPARATORS[sortColumn] || SORT_COMPARATORS.created_at;
  const result = comparator(a, b);
  return sortDirection === "desc" ? -result : result;
}

function getFilteredSortedTickets() {
  return allTickets.filter(matchesFilters).sort(compareTickets);
}

function renderTickets(tickets) {
  ticketsBody.textContent = "";

  if (tickets.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "empty-state";
    cell.textContent =
      allTickets.length === 0
        ? "No hay tickets todavía."
        : "No se encontraron tickets con estos filtros.";
    row.appendChild(cell);
    ticketsBody.appendChild(row);
    return;
  }

  for (const ticket of tickets) {
    ticketsBody.appendChild(buildTicketRow(ticket));
  }
}

function totalPages(count) {
  return Math.max(1, Math.ceil(count / PAGE_SIZE));
}

function renderPaginationControls(pages) {
  paginationInfo.textContent = `Página ${currentPage} de ${pages}`;
  prevPageButton.disabled = currentPage <= 1;
  nextPageButton.disabled = currentPage >= pages;
}

function renderTicketsPage() {
  const filtered = getFilteredSortedTickets();
  const pages = totalPages(filtered.length);
  if (currentPage > pages) currentPage = pages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  renderTickets(filtered.slice(start, start + PAGE_SIZE));
  renderPaginationControls(pages);
}

async function loadTickets() {
  ticketsError.textContent = "";
  try {
    allTickets = await api.listTickets();
    renderStatusSummary(allTickets);
    renderTicketsPage();
  } catch (err) {
    ticketsError.textContent = err.message;
  }
}

prevPageButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    renderTicketsPage();
  }
});

nextPageButton.addEventListener("click", () => {
  const filtered = getFilteredSortedTickets();
  if (currentPage < totalPages(filtered.length)) {
    currentPage += 1;
    renderTicketsPage();
  }
});

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value;
  currentPage = 1;
  renderTicketsPage();
});

categoryFilterSelect.addEventListener("change", () => {
  categoryFilter = categoryFilterSelect.value;
  currentPage = 1;
  renderTicketsPage();
});

priorityFilterSelect.addEventListener("change", () => {
  priorityFilter = priorityFilterSelect.value;
  currentPage = 1;
  renderTicketsPage();
});

statusFilterSelect.addEventListener("change", () => {
  statusFilter = statusFilterSelect.value;
  currentPage = 1;
  renderTicketsPage();
});

function updateSortHeaderUI() {
  sortButtons.forEach((button) => {
    const key = button.dataset.sortKey;
    const th = button.closest("th");
    const arrow = button.querySelector(".sort-arrow");

    if (key === sortColumn) {
      th.setAttribute("aria-sort", sortDirection === "asc" ? "ascending" : "descending");
      button.classList.add("active");
      arrow.textContent = sortDirection === "asc" ? "▲" : "▼";
    } else {
      th.setAttribute("aria-sort", "none");
      button.classList.remove("active");
      arrow.textContent = "";
    }
  });
}

function handleSortClick(event) {
  const key = event.currentTarget.dataset.sortKey;
  if (sortColumn === key) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    sortColumn = key;
    sortDirection = "asc";
  }
  currentPage = 1;
  updateSortHeaderUI();
  renderTicketsPage();
}

sortButtons.forEach((button) => button.addEventListener("click", handleSortClick));

clearFiltersButton.addEventListener("click", () => {
  searchInput.value = "";
  categoryFilterSelect.value = "";
  priorityFilterSelect.value = "";
  statusFilterSelect.value = "";

  searchQuery = "";
  categoryFilter = "";
  priorityFilter = "";
  statusFilter = "";
  sortColumn = DEFAULT_SORT_COLUMN;
  sortDirection = DEFAULT_SORT_DIRECTION;

  currentPage = 1;
  updateSortHeaderUI();
  renderTicketsPage();
});

function handleModalKeydown(event) {
  if (event.key === "Escape") closeModal();
}

function openModal() {
  modalOverlay.hidden = false;
  document.body.classList.add("modal-open");
  document.addEventListener("keydown", handleModalKeydown);
  document.getElementById("customer_name").focus();
}

function closeModal() {
  modalOverlay.hidden = true;
  document.body.classList.remove("modal-open");
  document.removeEventListener("keydown", handleModalKeydown);
  form.reset();
  formError.textContent = "";
}

openModalButton.addEventListener("click", openModal);
closeModalButton.addEventListener("click", closeModal);
cancelModalButton.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) closeModal();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";

  const formData = new FormData(form);
  const payload = {
    customer_name: formData.get("customer_name"),
    request_text: formData.get("request_text"),
    attachment_url: formData.get("attachment_url") || null,
  };

  submitButton.disabled = true;
  submitButton.textContent = "Creando...";

  try {
    await api.createTicket(payload);
    closeModal();
    currentPage = 1;
    await loadTickets();
  } catch (err) {
    formError.textContent = err.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Crear ticket";
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    loadTickets();
  }
});

populateSelectOptions(categoryFilterSelect, CATEGORY_LABELS);
populateSelectOptions(priorityFilterSelect, PRIORITY_LABELS);
populateSelectOptions(statusFilterSelect, STATUS_LABELS);
updateSortHeaderUI();
loadTickets();
