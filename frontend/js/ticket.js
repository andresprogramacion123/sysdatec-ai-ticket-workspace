import { api } from "./api.js";
import {
  translateStatus,
  translateCategory,
  translatePriority,
  getInitials,
  avatarColor,
} from "./utils.js";

const params = new URLSearchParams(window.location.search);
const ticketId = params.get("id");

const els = {
  loadError: document.getElementById("load-error"),
  detail: document.getElementById("ticket-detail"),
  avatar: document.getElementById("client-avatar"),
  customerName: document.getElementById("detail-customer-name"),
  requestText: document.getElementById("detail-request-text"),
  attachmentUrl: document.getElementById("detail-attachment-url"),
  category: document.getElementById("detail-category"),
  priority: document.getElementById("detail-priority"),
  aiSummary: document.getElementById("detail-ai-summary"),
  createdAt: document.getElementById("detail-created-at"),
  updatedAt: document.getElementById("detail-updated-at"),
  statusBadge: document.getElementById("status-badge"),
  statusSelect: document.getElementById("status-select"),
  ownerInput: document.getElementById("owner-input"),
  saveButton: document.getElementById("save-button"),
  saveError: document.getElementById("save-error"),
  saveSuccess: document.getElementById("save-success"),
  commentsList: document.getElementById("comments-list"),
  commentForm: document.getElementById("comment-form"),
  commentError: document.getElementById("comment-error"),
};

function formatDate(isoString) {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? isoString : date.toLocaleString();
}

function renderAvatar(customerName) {
  els.avatar.textContent = getInitials(customerName);
  els.avatar.style.backgroundColor = avatarColor(customerName);
}

const SAFE_URL_SCHEMES = ["http:", "https:"];

function isSafeUrl(value) {
  try {
    return SAFE_URL_SCHEMES.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function renderAttachment(attachmentUrl) {
  els.attachmentUrl.textContent = "";
  if (!attachmentUrl) {
    els.attachmentUrl.textContent = "Sin adjunto";
    return;
  }
  if (!isSafeUrl(attachmentUrl)) {
    // Defense in depth: the backend already rejects non-http(s) URLs on
    // creation, but never render an unsafe href (e.g. javascript:) even if
    // such data reached the database through another path.
    els.attachmentUrl.textContent = attachmentUrl;
    return;
  }
  const link = document.createElement("a");
  link.href = attachmentUrl;
  link.textContent = attachmentUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  els.attachmentUrl.appendChild(link);
}

function buildCommentItem(comment) {
  const item = document.createElement("li");
  item.className = "comment-item";

  const meta = document.createElement("div");
  meta.className = "comment-meta";
  meta.textContent = formatDate(comment.created_at);

  const content = document.createElement("p");
  content.className = "comment-content";
  content.textContent = comment.content;

  item.appendChild(meta);
  item.appendChild(content);
  return item;
}

function renderComments(comments) {
  els.commentsList.textContent = "";

  if (comments.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Todavía no hay comentarios.";
    empty.className = "comment-empty";
    els.commentsList.appendChild(empty);
    return;
  }

  for (const comment of comments) {
    els.commentsList.appendChild(buildCommentItem(comment));
  }
}

function renderStatusBadge(status) {
  els.statusBadge.className = `badge badge-status-${status}`;
  els.statusBadge.textContent = translateStatus(status);
}

function renderTicket(ticket) {
  renderAvatar(ticket.customer_name);
  els.customerName.textContent = ticket.customer_name;
  els.createdAt.textContent = `Creado: ${formatDate(ticket.created_at)}`;
  els.updatedAt.textContent = `Última actualización: ${formatDate(ticket.updated_at)}`;

  els.requestText.textContent = ticket.request_text;
  renderAttachment(ticket.attachment_url);

  els.category.textContent = ticket.category ? translateCategory(ticket.category) : "Sin clasificar";
  els.priority.textContent = ticket.priority ? translatePriority(ticket.priority) : "Sin clasificar";
  els.aiSummary.textContent = ticket.ai_summary ?? "Sin resumen de IA todavía.";

  renderStatusBadge(ticket.status);
  els.statusSelect.value = ticket.status;
  els.ownerInput.value = ticket.owner ?? "";

  renderComments(ticket.comments || []);
}

async function loadTicket() {
  els.loadError.textContent = "";
  try {
    const ticket = await api.getTicket(ticketId);
    renderTicket(ticket);
    els.detail.hidden = false;
  } catch (err) {
    els.loadError.textContent = err.message;
    els.detail.hidden = true;
  }
}

if (!ticketId) {
  els.loadError.textContent = "No se especificó un ticket (falta ?id= en la URL).";
} else {
  loadTicket();

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      loadTicket();
    }
  });

  els.saveButton.addEventListener("click", async () => {
    els.saveError.textContent = "";
    els.saveSuccess.textContent = "";

    const payload = {
      status: els.statusSelect.value,
      owner: els.ownerInput.value.trim() || null,
    };

    els.saveButton.disabled = true;
    try {
      await api.updateTicket(ticketId, payload);
      await loadTicket();
      els.saveSuccess.textContent = "Cambios guardados.";
    } catch (err) {
      els.saveError.textContent = err.message;
    } finally {
      els.saveButton.disabled = false;
    }
  });

  els.commentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    els.commentError.textContent = "";

    const formData = new FormData(els.commentForm);
    const content = formData.get("content");
    const submitButton = els.commentForm.querySelector("button[type='submit']");

    submitButton.disabled = true;
    try {
      await api.addComment(ticketId, { content });
      els.commentForm.reset();
      await loadTicket();
    } catch (err) {
      els.commentError.textContent = err.message;
    } finally {
      submitButton.disabled = false;
    }
  });
}
