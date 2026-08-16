import API_BASE_URL from "../config/apiConfig";

export async function apiRequest(endpoint, options = {}) {

  const token =
    localStorage.getItem("token");

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization:
                `Bearer ${token}`
            }
          : {}),
        ...(options.headers || {})
      },
      ...options
    }
  );

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try { const body = await response.json(); message = body.message || message; } catch { /* non-JSON error */ }
    throw new Error(message);
  }

  if (options.responseType === "raw") {
    return response;
  }

  if (response.status === 204) return null;
  return response.json();
}
