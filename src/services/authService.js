import API_BASE_URL from "../config/apiConfig";

const AUTH_URL = `${API_BASE_URL}/api/v1/auth`;

export async function loginUser(email, password) {
  let response;
  try {
    response = await fetch(`${AUTH_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });
  } catch {
    throw new Error("Unable to reach the authentication service. Check that the API Gateway is running.");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(
      data?.message || `Login failed (${response.status})`
    );
  }

  return data;
}
