/* =========================================================
   Shared API client with silent refresh-token renewal
======================================================== */

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.hostname
    ? `http://${window.location.hostname}:8000`
    : "http://127.0.0.1:8000");

export const getToken = () => {
  return localStorage.getItem("access_token");
};

export const getRefreshToken = () => {
  return localStorage.getItem("refresh_token");
};

export const setTokens = (
  accessToken,
  refreshToken
) => {
  if (accessToken) {
    localStorage.setItem(
      "access_token",
      accessToken
    );
  }

  if (refreshToken) {
    localStorage.setItem(
      "refresh_token",
      refreshToken
    );
  }
};

export const clearTokens = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
};

export const getUserIdFromToken = (
  token
) => {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(
      atob(parts[1])
    );

    return Number(payload.sub);
  } catch (error) {
    console.error(
      "Token decode error:",
      error
    );
    return null;
  }
};

const tryRefresh = async () => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_URL}/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data =
      await response.json();

    setTokens(
      data.access_token,
      data.refresh_token
    );

    return data.access_token;
  } catch (error) {
    console.error(
      "Token refresh error:",
      error
    );
    return null;
  }
};

/* Same signature as fetch(). On 401 it tries one silent
   refresh and retries the original request a single time. */
export const authFetch = async (
  url,
  options = {},
  retry = true
) => {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (
    response.status === 401 &&
    retry &&
    getRefreshToken()
  ) {
    const newToken = await tryRefresh();

    if (newToken) {
      return authFetch(url, options, false);
    }
  }

  return response;
};
