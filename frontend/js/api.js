// Base URL of the backend API. Change this if the backend runs elsewhere.
const API_BASE_URL = "http://localhost:8000";

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function extractErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((err) => {
        const field = Array.isArray(err.loc) ? err.loc.slice(1).join(".") : "campo";
        return `${field}: ${err.msg}`;
      })
      .join(" | ");
  }
  return fallback;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (networkError) {
    throw new ApiError(
      "No se pudo conectar con el servidor. Verifica que el backend esté disponible.",
      0,
      null
    );
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(data, `Error ${response.status}`),
      response.status,
      data
    );
  }

  return data;
}

export const api = {
  listTickets: () => request("/tickets"),
  createTicket: (payload) =>
    request("/tickets", { method: "POST", body: JSON.stringify(payload) }),
  getTicket: (id) => request(`/tickets/${id}`),
  updateTicket: (id, payload) =>
    request(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  addComment: (id, payload) =>
    request(`/tickets/${id}/comments`, { method: "POST", body: JSON.stringify(payload) }),
};

export { ApiError };
