const AUTH_URL = "http://localhost:8081";

export async function loginUser(email, password) {
  const response = await fetch(
    `${AUTH_URL}/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Login failed"
    );
  }

  return data;
}
