import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Medications from "./pages/Medications";
import Reminders from "./pages/Reminders";
import Analytics from "./pages/Analytics";
import AIInsights from "./pages/AIInsights";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import {
  ForgotPassword,
  ResetPassword,
} from "./pages/PasswordReset";

import {
  API_URL,
  authFetch,
  clearTokens,
  getToken,
  getUserIdFromToken,
  setTokens,
} from "./api";

import { useTheme } from "./theme";

import "./App.css";

/* =========================================================
   API CONFIGURATION
========================================================= */

console.log("API URL:", API_URL);

/* =========================================================
   AUTH HELPERS
========================================================= */

/* LoginPage below uses shared auth helpers from ./api */

/* =========================================================
   LOGIN PAGE
========================================================= */

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const formData = new URLSearchParams();

      formData.append("username", email);
      formData.append("password", password);

      const response = await authFetch(
        `${API_URL}/login`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body: formData.toString(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Invalid email or password"
        );
      }

      setTokens(
        data.access_token,
        data.refresh_token
      );

      // Backend returns flat fields {user_id, username, email};
      // also support nested {user: {...}} for forward-compat.
      const userObj =
        data.user ||
        (data.user_id
          ? {
              id: data.user_id,
              user_id: data.user_id,
              username: data.username,
              email: data.email,
            }
          : null);

      if (userObj) {
        localStorage.setItem(
          "user",
          JSON.stringify(userObj)
        );
      }

      onLogin(data);

    } catch (error) {
      console.error("Login error:", error);

      setError(
        error.message ||
        "Login failed"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-logo">
          💊
        </div>

        <h1>
          Medication Reminder
        </h1>

        <p className="login-subtitle">
          Smart medication management system
        </p>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>

          <div className="form-group">

            <label>
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

          </div>

          <div className="form-group">

            <label>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
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
              ? "Logging in..."
              : "Login"}
          </button>

        </form>

        <p className="login-subtitle" style={{ marginTop: "14px" }}>
          No account?{" "}
          <a href="/register" style={{ fontWeight: 700 }}>
            Register
          </a>
          {"  ·  "}
          <a href="/forgot-password" style={{ fontWeight: 700 }}>
            Forgot password?
          </a>
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   REGISTER PAGE
======================================================== */

function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await authFetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Registration failed");
      }

      setSuccess("Registered successfully. Redirecting to login...");

      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">💊</div>
        <h1>Create account</h1>
        <p className="login-subtitle">Join the medication reminder system</p>

        {error && <div className="login-error">{error}</div>}
        {success && (
          <div className="message-banner success" style={{ marginBottom: "12px" }}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="login-subtitle" style={{ marginTop: "14px" }}>
          Already have an account?{" "}
          <a href="/login" style={{ fontWeight: 700 }}>
            Login
          </a>
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({ onLogout }) {
  return (
    <aside className="sidebar">

      <div className="sidebar-brand">

        <div className="brand-icon">
          💊
        </div>

        <div>

          <h2>
            MedAssist
          </h2>

          <span>
            Medication Agent
          </span>

        </div>

      </div>

      <nav className="sidebar-nav">

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `nav-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <span>📊</span>
          Dashboard
        </NavLink>

        <NavLink
          to="/medications"
          className={({ isActive }) =>
            `nav-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <span>💊</span>
          Medications
        </NavLink>

        <NavLink
          to="/reminders"
          className={({ isActive }) =>
            `nav-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <span>⏰</span>
          Reminders
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            `nav-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <span>📈</span>
          Analytics
        </NavLink>

        <NavLink
          to="/ai"
          className={({ isActive }) =>
            `nav-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <span>🤖</span>
          AI Insights
        </NavLink>

        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `nav-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <span>🔔</span>
          Notifications
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `nav-item ${
              isActive ? "active" : ""
            }`
          }
        >
          <span>👤</span>
          Profile
        </NavLink>

      </nav>

      <div className="sidebar-bottom">

        <button
          className="logout-button"
          onClick={onLogout}
        >
          <span>🚪</span>
          Logout
        </button>

      </div>

    </aside>
  );
}

/* =========================================================
   TOP BAR
========================================================= */

const NOTIF_ICONS = {
  REMINDER: "💊",
  MISSED: "⚠️",
  LOW_STOCK: "📦",
  ESCALATION: "🚨",
  INFO: "ℹ️",
};

function TopBar({
  unreadCount = 0,
  notifications = [],
  showNotifPanel = false,
  onToggleNotif,
  onMarkRead,
  onMarkAllRead,
}) {
  const [user] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("User load error:", error);
      return null;
    }
  });

  const { theme, toggleTheme } = useTheme();

  return (
    <header className="topbar">

      <div className="topbar-title">
        Smart medication management system
      </div>

      <div className="topbar-user">

        <button
          className="icon-button"
          onClick={toggleTheme}
          title={
            theme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        <div className="notif-wrap">
          <button
            className="icon-button notif-bell"
            onClick={onToggleNotif}
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span className="notif-badge">
                {unreadCount > 9
                  ? "9+"
                  : unreadCount}
              </span>
            )}
          </button>

          {showNotifPanel && (
            <div className="notif-panel">
              <div className="notif-panel-header">
                <strong>
                  Notifications
                </strong>
                <button
                  className="link-button"
                  onClick={onMarkAllRead}
                >
                  Mark all read
                </button>
              </div>

              {notifications.length === 0 ? (
                <p className="notif-empty">
                  No notifications yet.
                </p>
              ) : (
                notifications
                  .slice(0, 10)
                  .map((n) => (
                    <button
                      key={n.id}
                      className={`notif-item ${
                        n.read ? "read" : ""
                      }`}
                      onClick={() =>
                        onMarkRead(n.id)
                      }
                    >
                      <span className="notif-item-icon">
                        {NOTIF_ICONS[n.type] ||
                          "ℹ️"}
                      </span>
                      <span className="notif-item-body">
                        <strong>
                          {n.title}
                        </strong>
                        <small>
                          {n.message}
                        </small>
                      </span>
                      {!n.read && (
                        <span className="notif-dot" />
                      )}
                    </button>
                  ))
              )}
            </div>
          )}
        </div>

        <div className="user-avatar">

          {user?.username
            ? user.username
                .charAt(0)
                .toUpperCase()
            : "U"}

        </div>

        <div className="user-info">

          <strong>
            {user?.username || "User"}
          </strong>

          <span>
            Patient
          </span>

        </div>

      </div>

    </header>
  );
}

/* =========================================================
   MESSAGE BANNER
========================================================= */

function MessageBanner({
  message,
  type = "success",
  onClose,
}) {

  if (!message) {
    return null;
  }

  return (
    <div
      className={`message-banner ${type}`}
    >

      <span>
        {type === "error"
          ? "❌"
          : "✅"}
      </span>

      <span>
        {message}
      </span>

      <button
        onClick={onClose}
      >
        ×
      </button>

    </div>
  );
}

/* =========================================================
   MAIN APPLICATION
========================================================= */

function MainApp({ onLogout }) {

  const navigate = useNavigate();

  const [medications, setMedications] =
    useState([]);

  const [reminders, setReminders] =
    useState([]);

  const [adherence, setAdherence] =
    useState(null);

  const [aiRecommendations, setAiRecommendations] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("success");

  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [showNotifPanel, setShowNotifPanel] =
    useState(false);

  /* =======================================================
     MESSAGE
  ======================================================= */

  const showMessage = (
    text,
    type = "success"
  ) => {

    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage("");
    }, 4000);
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = async () => {

    try {
      const token = getToken();

      if (token) {
        await fetch(`${API_URL}/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refresh_token:
              localStorage.getItem(
                "refresh_token"
              ),
          }),
        });
      }
    } catch {
      /* best effort — local cleanup matters most */
    }

    clearTokens();

    setMedications([]);
    setReminders([]);
    setAdherence(null);
    setAiRecommendations([]);
    setNotifications([]);
    setUnreadCount(0);

    // Notify RootApp so it switches to the login router.
    // (Navigating to /login inside the authed router would just
    // fall through to * -> /dashboard, so state must change.)
    if (typeof onLogout === "function") {
      onLogout();
    } else {
      navigate("/login");
    }
  };

  /* =======================================================
     FETCH NOTIFICATIONS
  ======================================================= */

  const fetchNotifications = async (
    silent = false
  ) => {
    const token = getToken();

    if (!token) {
      return;
    }

    try {
      const [listRes, countRes] =
        await Promise.all([
          authFetch(
            `${API_URL}/notifications?limit=20`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),
          authFetch(
            `${API_URL}/notifications/unread-count`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),
        ]);

      if (
        listRes.status === 401 ||
        countRes.status === 401
      ) {
        handleLogout();
        return;
      }

      if (listRes.ok) {
        setNotifications(
          await listRes.json()
        );
      }

      if (countRes.ok) {
        const data =
          await countRes.json();

        setUnreadCount(
          Number(data.unread) || 0
        );
      }
    } catch (error) {
      if (!silent) {
        console.error(
          "Notification fetch error:",
          error
        );
      }
    }
  };

  const markNotificationRead = async (
    id
  ) => {
    const token = getToken();

    if (!token) {
      return;
    }

    try {
      await authFetch(
        `${API_URL}/notifications/${id}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      await fetchNotifications(true);
    } catch (error) {
      console.error(
        "Mark-read error:",
        error
      );
    }
  };

  const markAllNotificationsRead =
    async () => {
      const token = getToken();

      if (!token) {
        return;
      }

      try {
        await authFetch(
          `${API_URL}/notifications/read-all`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        await fetchNotifications(true);
      } catch (error) {
        console.error(
          "Mark-all-read error:",
          error
        );
      }
    };

  /* =======================================================
     FETCH MEDICATIONS
  ======================================================= */

  const fetchMedications = async () => {

    const token = getToken();

    if (!token) {
      return;
    }

    try {

      setLoading(true);

      const response = await authFetch(
        `${API_URL}/medications`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {

        handleLogout();
        return;

      }

      if (!response.ok) {

        const data =
          await response.json()
            .catch(() => ({}));

        throw new Error(
          data.detail ||
          "Failed to fetch medications"
        );

      }

      const data =
        await response.json();

      setMedications(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {

      console.error(
        "Medication fetch error:",
        error
      );

      showMessage(
        error.message ||
        "Unable to load medications",
        "error"
      );

    } finally {

      setLoading(false);

    }
  };

  /* =======================================================
     FETCH REMINDERS
  ======================================================= */

  const fetchReminders = async () => {

    const token = getToken();

    if (!token) {
      return;
    }

    try {

      const response = await authFetch(
        `${API_URL}/reminders`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {

        handleLogout();
        return;

      }

      if (!response.ok) {

        const data =
          await response.json()
            .catch(() => ({}));

        throw new Error(
          data.detail ||
          "Failed to fetch reminders"
        );

      }

      const data =
        await response.json();

      setReminders(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {

      console.error(
        "Reminder fetch error:",
        error
      );

      showMessage(
        error.message ||
        "Unable to load reminders",
        "error"
      );

    }
  };

  /* =======================================================
     FETCH ADHERENCE
  ======================================================= */

  const fetchAdherence = async () => {

    const token = getToken();

    if (!token) {
      return;
    }

    try {

      const response = await authFetch(
        `${API_URL}/stats`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {

        handleLogout();
        return;

      }

      if (!response.ok) {

        const data =
          await response.json()
            .catch(() => ({}));

        throw new Error(
          data.detail ||
          "Failed to fetch adherence"
        );

      }

      const data =
        await response.json();

      setAdherence(data);

    } catch (error) {

      console.error(
        "Adherence fetch error:",
        error
      );

      setAdherence(null);

    }
  };

  /* =======================================================
     FETCH AI RECOMMENDATIONS
  ======================================================= */

  const fetchAIRecommendations = async (
    medicationList = medications
  ) => {

    const token = getToken();

    if (!token) {
      return;
    }

    if (!Array.isArray(medicationList)) {
      return;
    }

    try {

      const recommendations = [];

      for (
        const medication of medicationList
      ) {

        try {

          const response =
            await authFetch(
              `${API_URL}/ai/medications/${medication.id}/recommendation`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (
            response.status === 401
          ) {

            handleLogout();
            return;

          }

          if (!response.ok) {
            continue;
          }

          const data =
            await response.json();

          recommendations.push(data);

        } catch (error) {

          console.error(
            `AI error for medication ${medication.id}:`,
            error
          );

        }
      }

      setAiRecommendations(
        recommendations
      );

    } catch (error) {

      console.error(
        "AI recommendation error:",
        error
      );

      setAiRecommendations([]);

    }
  };

  /* =======================================================
     ADD MEDICATION
  ======================================================= */

  const addMedication = async (
    medication
  ) => {

    console.log(
      "APP addMedication called:",
      medication
    );

    const token = getToken();

    if (!token) {

      showMessage(
        "Please login again",
        "error"
      );

      return false;
    }

    try {

      const userId =
        getUserIdFromToken(token);

      console.log(
        "APP user ID:",
        userId
      );

      if (!userId) {

        throw new Error(
          "User ID not found in authentication token"
        );

      }

      console.log(
        "APP POST URL:",
        `${API_URL}/users/${userId}/medications`
      );

      const response =
        await authFetch(
          `${API_URL}/users/${userId}/medications`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              medication
            ),
          }
        );

      const data =
        await response.json()
          .catch(() => ({}));

      console.log(
        "APP ADD RESPONSE:",
        response.status,
        data
      );

      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to add medication"
        );

      }

      await fetchMedications();

      await fetchReminders();

      showMessage(
        "Medication added successfully"
      );

      return true;

    } catch (error) {

      console.error(
        "Add medication error:",
        error
      );

      showMessage(
        error.message ||
        "Failed to add medication",
        "error"
      );

      return false;
    }
  };

  /* =======================================================
     UPDATE MEDICATION
  ======================================================= */

  const updateMedication = async (
    medicationId,
    medication
  ) => {

    const token = getToken();

    if (!token) {
      return false;
    }

    try {

      const response =
        await authFetch(
          `${API_URL}/medications/${medicationId}`,
          {
            method: "PUT",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              medication
            ),
          }
        );

      const data =
        await response.json()
          .catch(() => ({}));

      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to update medication"
        );

      }

      await fetchMedications();

      await fetchReminders();

      showMessage(
        "Medication updated successfully"
      );

      return true;

    } catch (error) {

      console.error(
        "Update medication error:",
        error
      );

      showMessage(
        error.message ||
        "Failed to update medication",
        "error"
      );

      return false;
    }
  };

  /* =======================================================
     DELETE MEDICATION
  ======================================================= */

  const deleteMedication = async (
    medicationId
  ) => {

    const token = getToken();

    if (!token) {
      return false;
    }

    try {

      const response =
        await authFetch(
          `${API_URL}/medications/${medicationId}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json()
          .catch(() => ({}));

      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to delete medication"
        );

      }

      await fetchMedications();

      await fetchReminders();

      showMessage(
        "Medication deleted successfully"
      );

      return true;

    } catch (error) {

      console.error(
        "Delete medication error:",
        error
      );

      showMessage(
        error.message ||
        "Failed to delete medication",
        "error"
      );

      return false;
    }
  };

  /* =======================================================
     TOGGLE MEDICATION STATUS
  ======================================================= */

  const toggleMedicationStatus =
    async (
      medicationId,
      active
    ) => {

      const token = getToken();

      if (!token) {
        return false;
      }

      try {

        const response =
          await authFetch(
            `${API_URL}/medications/${medicationId}/status?active=${active}`,
            {
              method: "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json()
            .catch(() => ({}));

        if (!response.ok) {

          throw new Error(
            data.detail ||
            "Failed to update status"
          );

        }

        await fetchMedications();

        showMessage(
          active
            ? "Medication activated"
            : "Medication deactivated"
        );

        return true;

      } catch (error) {

        console.error(
          "Status update error:",
          error
        );

        showMessage(
          error.message ||
          "Failed to update medication status",
          "error"
        );

        return false;
      }
    };

  /* =======================================================
     MARK TAKEN
  ======================================================= */

  const markTaken = async (
    medicationId
  ) => {

    const token = getToken();

    if (!token) {
      return false;
    }

    try {

      const response =
        await authFetch(
          `${API_URL}/medications/${medicationId}/taken`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json()
          .catch(() => ({}));

      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to mark medication as taken"
        );

      }

      await Promise.all([
        fetchMedications(),
        fetchReminders(),
        fetchAdherence(),
        fetchNotifications(true),
      ]);

      showMessage(
        "Medicine marked as taken"
      );

      return true;

    } catch (error) {

      console.error(
        "Taken error:",
        error
      );

      showMessage(
        error.message ||
        "Failed to mark medicine as taken",
        "error"
      );

      return false;
    }
  };

  /* =======================================================
     MARK MISSED
  ======================================================= */

  const markMissed = async (
    medicationId
  ) => {

    const token = getToken();

    if (!token) {
      return false;
    }

    try {

      const response =
        await authFetch(
          `${API_URL}/medications/${medicationId}/missed`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json()
          .catch(() => ({}));

      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to mark medication as missed"
        );

      }

      await Promise.all([
        fetchMedications(),
        fetchReminders(),
        fetchAdherence(),
        fetchNotifications(true),
      ]);

      showMessage(
        "Medicine marked as missed"
      );

      return true;

    } catch (error) {

      console.error(
        "Missed error:",
        error
      );

      showMessage(
        error.message ||
        "Failed to mark medicine as missed",
        "error"
      );

      return false;
    }
  };

  /* =======================================================
     REFILL STOCK
  ======================================================= */

  const refillMedication = async (
    medicationId,
    amount
  ) => {

    const token = getToken();

    if (!token) {
      return false;
    }

    try {

      const response =
        await authFetch(
          `${API_URL}/medications/${medicationId}/refill`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              amount,
            }),
          }
        );

      const data =
        await response.json()
          .catch(() => ({}));

      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to refill"
        );

      }

      await Promise.all([
        fetchMedications(),
        fetchNotifications(true),
      ]);

      showMessage(
        `Refilled. Stock: ${data.stock_remaining}`
      );

      return true;

    } catch (error) {

      console.error(
        "Refill error:",
        error
      );

      showMessage(
        error.message ||
        "Failed to refill",
        "error"
      );

      return false;
    }
  };

  /* =======================================================
     INITIAL DATA LOAD
  ======================================================= */

  // Initial data load — runs once on mount by design.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {

    const token = getToken();

    if (!token) {
      return;
    }

    const loadData =
      async () => {

        await fetchMedications();

        await fetchReminders();

        await fetchAdherence();

        await fetchNotifications(true);

      };

    loadData();

    // Poll notifications every minute for new reminders
    const pollId = setInterval(() => {
      fetchNotifications(true);
    }, 60000);

    return () => clearInterval(pollId);

  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  /* =======================================================
     AI UPDATE WHEN MEDICATIONS CHANGE
  ======================================================= */

  // Server fetch on medication-list change + clear when empty.
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {

    if (medications.length > 0) {

      fetchAIRecommendations(
        medications
      );

    } else {

      setAiRecommendations([]);

    }

  }, [medications]);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  /* =======================================================
     REFRESH ALL
  ======================================================= */

  const refreshAll = async () => {

    await fetchMedications();

    await fetchReminders();

    await fetchAdherence();

    await fetchNotifications(true);

  };

  /* =======================================================
     APPLICATION LAYOUT
  ======================================================= */

  return (
    <div className="app-layout">

      <Sidebar
        onLogout={handleLogout}
      />

      <div className="main-area">

        <TopBar
          unreadCount={unreadCount}
          notifications={notifications}
          showNotifPanel={showNotifPanel}
          onToggleNotif={() =>
            setShowNotifPanel((v) => !v)
          }
          onMarkRead={markNotificationRead}
          onMarkAllRead={
            markAllNotificationsRead
          }
        />

        <MessageBanner
          message={message}
          type={messageType}
          onClose={() =>
            setMessage("")
          }
        />

        {loading && (
          <div className="global-loading">
            Loading...
          </div>
        )}

        <main className="content-area">

          <Routes>

            {/* =================================================
                DASHBOARD
            ================================================= */}

            <Route
              path="/dashboard"
              element={
                <Dashboard
                  medications={medications}
                  reminders={reminders}
                  adherence={adherence}
                  onRefresh={refreshAll}
                  onMarkTaken={markTaken}
                  onMarkMissed={markMissed}
                />
              }
            />

            {/* =================================================
                MEDICATIONS
            ================================================= */}

            <Route
              path="/medications"
              element={
                <Medications
                  medications={medications}

                  /*
                    IMPORTANT:
                    Explicit wrapper for Add Medication
                  */

                  onAddMedication={(
                    medication
                  ) => {

                    console.log(
                      "ROUTE → onAddMedication:",
                      medication
                    );

                    return addMedication(
                      medication
                    );
                  }}

                  onUpdateMedication={(
                    id,
                    medication
                  ) => {

                    return updateMedication(
                      id,
                      medication
                    );

                  }}

                  onDeleteMedication={(
                    id
                  ) => {

                    return deleteMedication(
                      id
                    );

                  }}

                  onToggleStatus={(
                    id,
                    active
                  ) => {

                    return toggleMedicationStatus(
                      id,
                      active
                    );

                  }}

                  onMarkTaken={(
                    id
                  ) => {

                    return markTaken(id);

                  }}

                  onMarkMissed={(
                    id
                  ) => {

                    return markMissed(id);

                  }}

                  onRefill={(
                    id,
                    amount
                  ) => {

                    return refillMedication(
                      id,
                      amount
                    );

                  }}
                />
              }
            />

            {/* =================================================
                REMINDERS
            ================================================= */}

            <Route
              path="/reminders"
              element={
                <Reminders
                  reminders={reminders}
                  medications={medications}
                  onRefresh={fetchReminders}
                />
              }
            />

            {/* =================================================
                ANALYTICS
            ================================================= */}

            <Route
              path="/analytics"
              element={
                <Analytics
                  medications={medications}
                  reminders={reminders}
                  adherence={adherence}
                />
              }
            />

            {/* =================================================
                AI INSIGHTS
            ================================================= */}

            <Route
              path="/ai"
              element={
                <AIInsights
                  medications={medications}
                  aiRecommendations={
                    aiRecommendations
                  }
                  onRefresh={() =>
                    fetchAIRecommendations(
                      medications
                    )
                  }
                />
              }
            />

            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            <Route
              path="/notifications"
              element={
                <Notifications
                  notifications={notifications}
                  onMarkRead={markNotificationRead}
                  onMarkAllRead={
                    markAllNotificationsRead
                  }
                  onRefresh={() =>
                    fetchNotifications(true)
                  }
                />
              }
            />

            {/* =================================================
                PROFILE
            ================================================= */}

            <Route
              path="/profile"
              element={
                <Profile
                  onLogout={handleLogout}
                />
              }
            />

            {/* =================================================
                DEFAULT
            ================================================= */}

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

        </main>

      </div>

    </div>
  );
}

/* =========================================================
   ROOT APP
========================================================= */

function RootApp() {

  const [isLoggedIn, setIsLoggedIn] =
    useState(
      Boolean(getToken())
    );

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {

    return (
      <BrowserRouter>

        <Routes>

          <Route
            path="/login"
            element={
              <LoginPage
                onLogin={handleLogin}
              />
            }
          />

          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/login"
                replace
              />
            }
          />

        </Routes>

      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <MainApp onLogout={() => setIsLoggedIn(false)} />
    </BrowserRouter>
  );
}

export default RootApp;



