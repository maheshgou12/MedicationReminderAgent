import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Medications from "./pages/Medications";
import Reminders from "./pages/Reminders";
import Analytics from "./pages/Analytics";
import AIInsights from "./pages/AIInsights";

import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("token");
}

function getUserId() {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Number(payload.sub);
  } catch (error) {
    console.error("Unable to decode token:", error);
    return null;
  }
}

function Sidebar({ onLogout }) {
  const location = useLocation();

  const links = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: "📊",
    },
    {
      path: "/medications",
      label: "Medications",
      icon: "💊",
    },
    {
      path: "/reminders",
      label: "Reminders",
      icon: "⏰",
    },
    {
      path: "/analytics",
      label: "Analytics",
      icon: "📈",
    },
    {
      path: "/ai",
      label: "AI Insights",
      icon: "🤖",
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">💊</div>

        <div>
          <h2>MedAgent</h2>
          <span>Medication Assistant</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => {
          const active =
            location.pathname === link.path ||
            (link.path === "/dashboard" &&
              location.pathname === "/");

          return (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${
                active ? "nav-link-active" : ""
              }`}
            >
              <span className="nav-icon">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-info">
          <div className="info-icon">🛡️</div>

          <div>
            <strong>Secure</strong>
            <span>JWT protected</span>
          </div>
        </div>

        <button
          className="logout-button"
          onClick={onLogout}
        >
          <span>↪</span>
          Logout
        </button>
      </div>
    </aside>
  );
}

function TopBar({ username }) {
  const location = useLocation();

  const titles = {
    "/": "Dashboard",
    "/dashboard": "Dashboard",
    "/medications": "Medications",
    "/reminders": "Reminders",
    "/analytics": "Analytics",
    "/ai": "AI Insights",
  };

  const title = titles[location.pathname] || "Dashboard";

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <p>
          Welcome back{username ? `, ${username}` : ""}
        </p>
      </div>

      <div className="topbar-user">
        <div className="user-avatar">
          {username
            ? username.charAt(0).toUpperCase()
            : "U"}
        </div>

        <div>
          <strong>{username || "User"}</strong>
          <span>Patient Account</span>
        </div>
      </div>
    </header>
  );
}

function MessageBanner({ message, type = "success", onClose }) {
  if (!message) {
    return null;
  }

  return (
    <div className={`message-banner ${type}`}>
      <span>
        {type === "error" ? "⚠️" : "✓"}
      </span>

      <p>{message}</p>

      <button onClick={onClose}>×</button>
    </div>
  );
}

function Login({ onLogin }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const formData = new URLSearchParams();

      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch(
        `${API_URL}/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Login failed"
        );
      }

      localStorage.setItem(
        "token",
        data.access_token
      );

      localStorage.setItem(
        "username",
        data.user?.username || "User"
      );

      onLogin();

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the server"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <div className="brand-icon">💊</div>

          <div>
            <h2>MedAgent</h2>
            <span>Medication Assistant</span>
          </div>
        </div>

        <div className="login-content">
          <div className="login-icon">💊</div>

          <h1>
            Your medication,
            <br />
            <span>smarter.</span>
          </h1>

          <p>
            Track your medicines, receive timely
            reminders, monitor adherence, and get
            intelligent AI-powered insights.
          </p>

          <div className="login-features">
            <div>
              <span>⏰</span>
              <p>Smart reminders</p>
            </div>

            <div>
              <span>📈</span>
              <p>Adherence analytics</p>
            </div>

            <div>
              <span>🤖</span>
              <p>AI insights</p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <h1>Welcome back</h1>
            <p>
              Sign in to manage your medications.
            </p>
          </div>

          {error && (
            <div className="login-error">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "Sign in"}
            </button>
          </form>

          <div className="login-footer">
            <span>Medication Reminder Agent</span>
            <span>•</span>
            <span>Secure JWT Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppLayout({ onLogout, username, children }) {
  return (
    <div className="app-shell">
      <Sidebar onLogout={onLogout} />

      <main className="main-content">
        <TopBar username={username} />

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] =
    useState(Boolean(getToken()));

  const [username, setUsername] = useState(
    localStorage.getItem("username") || "User"
  );

  const [medications, setMedications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [adherenceData, setAdherenceData] =
    useState({});

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("success");

  function showMessage(
    text,
    type = "success"
  ) {
    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage("");
    }, 3500);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");

    setIsAuthenticated(false);
    setMedications([]);
    setReminders([]);
    setAdherenceData({});
  }

  async function apiFetch(
    endpoint,
    options = {}
  ) {
    const token = getToken();

    const headers = {
      ...(options.headers || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,
        headers,
      }
    );

    if (response.status === 401) {
      logout();

      throw new Error(
        "Session expired. Please login again."
      );
    }

    const contentType =
      response.headers.get("content-type") || "";

    let data = null;

    if (
      contentType.includes("application/json")
    ) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data ||
          "Request failed"
      );
    }

    return data;
  }

  async function fetchMedications() {
    try {
      const data = await apiFetch(
        "/medications"
      );

      setMedications(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Fetch medications error:",
        error
      );
    }
  }

  async function fetchReminders() {
    try {
      const data = await apiFetch(
        "/reminders"
      );

      setReminders(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Fetch reminders error:",
        error
      );
    }
  }

  async function fetchAdherence() {
    if (!medications.length) {
      setAdherenceData({});
      return;
    }

    const results = {};

    for (const medication of medications) {
      try {
        const data = await apiFetch(
          `/ai/medications/${medication.id}/adherence`
        );

        results[medication.id] = data;
      } catch (error) {
        console.error(
          `Adherence error for medication ${medication.id}:`,
          error
        );
      }
    }

    setAdherenceData(results);
  }

  async function addMedication(
    medication
  ) {
    try {
      const data = await apiFetch(
        `/users/${getUserId()}/medications`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(medication),
        }
      );

      setMedications((previous) => [
        ...previous,
        data,
      ]);

      showMessage(
        "Medication added successfully."
      );

      return data;
    } catch (error) {
      showMessage(
        error.message ||
          "Unable to add medication.",
        "error"
      );

      throw error;
    }
  }

  async function updateMedication(
    medicationId,
    medication
  ) {
    try {
      const data = await apiFetch(
        `/medications/${medicationId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(medication),
        }
      );

      setMedications((previous) =>
        previous.map((item) =>
          item.id === medicationId
            ? data
            : item
        )
      );

      showMessage(
        "Medication updated successfully."
      );

      return data;
    } catch (error) {
      showMessage(
        error.message ||
          "Unable to update medication.",
        "error"
      );

      throw error;
    }
  }

  async function deleteMedication(
    medicationId
  ) {
    try {
      await apiFetch(
        `/medications/${medicationId}`,
        {
          method: "DELETE",
        }
      );

      setMedications((previous) =>
        previous.filter(
          (item) =>
            item.id !== medicationId
        )
      );

      showMessage(
        "Medication deleted successfully."
      );
    } catch (error) {
      showMessage(
        error.message ||
          "Unable to delete medication.",
        "error"
      );
    }
  }

  async function updateMedicationStatus(
    medicationId,
    active
  ) {
    try {
      const data = await apiFetch(
        `/medications/${medicationId}/status?active=${active}`,
        {
          method: "PATCH",
        }
      );

      setMedications((previous) =>
        previous.map((item) =>
          item.id === medicationId
            ? {
                ...item,
                active:
                  data.active ?? active,
              }
            : item
        )
      );

      showMessage(
        active
          ? "Medication activated."
          : "Medication deactivated."
      );
    } catch (error) {
      showMessage(
        error.message ||
          "Unable to update medication status.",
        "error"
      );
    }
  }

  async function markTaken(
    medicationId
  ) {
    try {
      await apiFetch(
        `/medications/${medicationId}/taken`,
        {
          method: "POST",
        }
      );

      showMessage(
        "Medicine marked as taken."
      );

      await fetchReminders();
      await fetchMedications();
      await fetchAdherence();
    } catch (error) {
      showMessage(
        error.message ||
          "Unable to mark medicine as taken.",
        "error"
      );
    }
  }

  async function markMissed(
    medicationId
  ) {
    try {
      await apiFetch(
        `/medications/${medicationId}/missed`,
        {
          method: "POST",
        }
      );

      showMessage(
        "Medicine marked as missed.",
        "error"
      );

      await fetchReminders();
      await fetchMedications();
      await fetchAdherence();
    } catch (error) {
      showMessage(
        error.message ||
          "Unable to mark medicine as missed.",
        "error"
      );
    }
  }

  async function refreshData() {
    if (!isAuthenticated) {
      return;
    }

    await fetchMedications();
    await fetchReminders();
  }

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const storedUsername =
      localStorage.getItem("username");

    if (storedUsername) {
      setUsername(storedUsername);
    }

    fetchMedications();
    fetchReminders();
  }, [isAuthenticated]);

  useEffect(() => {
    if (medications.length > 0) {
      fetchAdherence();
    }
  }, [medications]);

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route
            path="*"
            element={
              <Login
                onLogin={() =>
                  setIsAuthenticated(true)
                }
              />
            }
          />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        <Route
          path="/dashboard"
          element={
            <AppLayout
              onLogout={logout}
              username={username}
            >
              <Dashboard
                medications={medications}
                reminders={reminders}
                adherenceData={adherenceData}
                onRefresh={refreshData}
              />

              <MessageBanner
                message={message}
                type={messageType}
                onClose={() =>
                  setMessage("")
                }
              />
            </AppLayout>
          }
        />

        <Route
          path="/medications"
          element={
            <AppLayout
              onLogout={logout}
              username={username}
            >
              <Medications
                medications={medications}
                onAdd={addMedication}
                onUpdate={updateMedication}
                onDelete={deleteMedication}
                onStatusChange={
                  updateMedicationStatus
                }
                onTaken={markTaken}
                onMissed={markMissed}
              />

              <MessageBanner
                message={message}
                type={messageType}
                onClose={() =>
                  setMessage("")
                }
              />
            </AppLayout>
          }
        />

        <Route
          path="/reminders"
          element={
            <AppLayout
              onLogout={logout}
              username={username}
            >
              <Reminders
                reminders={reminders}
                medications={medications}
                onRefresh={refreshData}
              />

              <MessageBanner
                message={message}
                type={messageType}
                onClose={() =>
                  setMessage("")
                }
              />
            </AppLayout>
          }
        />

        <Route
          path="/analytics"
          element={
            <AppLayout
              onLogout={logout}
              username={username}
            >
              <Analytics
                medications={medications}
                reminders={reminders}
                adherenceData={adherenceData}
              />

              <MessageBanner
                message={message}
                type={messageType}
                onClose={() =>
                  setMessage("")
                }
              />
            </AppLayout>
          }
        />

        <Route
          path="/ai"
          element={
            <AppLayout
              onLogout={logout}
              username={username}
            >
              <AIInsights
                medications={medications}
                adherenceData={adherenceData}
                apiFetch={apiFetch}
              />

              <MessageBanner
                message={message}
                type={messageType}
                onClose={() =>
                  setMessage("")
                }
              />
            </AppLayout>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;




