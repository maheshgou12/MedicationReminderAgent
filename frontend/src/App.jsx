

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

import "./App.css";

import Dashboard from "./pages/Dashboard";
import Medications from "./pages/Medications";
import Reminders from "./pages/Reminders";
import Analytics from "./pages/Analytics";
import AIInsights from "./pages/AIInsights";

const API_URL = "http://127.0.0.1:8000";

/* =========================================================
   ERROR MESSAGE HELPER
========================================================= */

const getErrorMessage = async (response) => {
  try {
    const data = await response.json();

    if (typeof data.detail === "string") {
      return data.detail;
    }

    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item) => item.msg || "Validation error")
        .join(", ");
    }

    return "Something went wrong";
  } catch {
    return "Something went wrong";
  }
};

/* =========================================================
   LOGIN PAGE
========================================================= */

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const formData = new URLSearchParams();

      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!response.ok) {
        const message =
          await getErrorMessage(response);

        throw new Error(message);
      }

      const data = await response.json();

      localStorage.setItem(
        "access_token",
        data.access_token
      );

      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );
      }

      onLogin(data);

    } catch (err) {
      setError(
        err.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-header">

          <div className="login-logo">
            💊
          </div>

          <h1>Welcome Back</h1>

          <p>
            Sign in to your Medication Reminder Agent
          </p>

        </div>

        {error && (
          <div className="login-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >

          <div className="form-group">

            <label htmlFor="email">
              Email Address
            </label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              autoComplete="email"
              required
            />

          </div>

          <div className="form-group">

            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="current-password"
              required
            />

          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >

            {loading ? (
              <>
                <span className="login-spinner"></span>
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <span>→</span>
              </>
            )}

          </button>

        </form>

        <div className="login-footer">
          <span>🔐</span>
          <span>
            Your account is securely protected
          </span>
        </div>

      </div>

    </div>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({ onLogout }) {
  const location = useLocation();

  const menuItems = [
    {
      path: "/dashboard",
      icon: "📊",
      label: "Dashboard",
    },
    {
      path: "/medications",
      icon: "💊",
      label: "Medications",
    },
    {
      path: "/reminders",
      icon: "⏰",
      label: "Reminders",
    },
    {
      path: "/analytics",
      icon: "📈",
      label: "Analytics",
    },
    {
      path: "/ai",
      icon: "🤖",
      label: "AI Insights",
    },
  ];

  return (
    <aside className="sidebar">

      <div className="sidebar-brand">

        <div className="brand-icon">
          💊
        </div>

        <div className="brand-text">

          <h2>MedAgent</h2>

          <span>
            Medication Assistant
          </span>

        </div>

      </div>

      <nav className="sidebar-nav">

        {menuItems.map((item) => {

          const active =
            location.pathname === item.path ||
            (
              item.path === "/dashboard" &&
              location.pathname === "/"
            );

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${
                active ? "active" : ""
              }`}
            >

              <span className="sidebar-icon">
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>

            </Link>
          );
        })}

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

function TopBar({ user }) {
  return (
    <header className="topbar">

      <div className="topbar-title">

        <h2>
          Medication Reminder Agent
        </h2>

        <p>
          Manage your medications and stay on schedule
        </p>

      </div>

      <div className="topbar-user">

        <button
          className="notification-icon"
          title="Notifications"
        >
          🔔
        </button>

        <div className="user-name">
          {user?.username || "User"}
        </div>

        <div className="user-avatar">

          {user?.username
            ? user.username
                .charAt(0)
                .toUpperCase()
            : "U"}

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
  onClose,
}) {
  if (!message) {
    return null;
  }

  return (
    <div className="message-banner">

      <span className="message-icon">
        ✓
      </span>

      <span className="message-text">
        {message}
      </span>

      <button
        className="message-close"
        onClick={onClose}
      >
        ×
      </button>

    </div>
  );
}

/* =========================================================
   APP CONTENT
========================================================= */

function AppContent() {

  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] =
    useState(
      !!localStorage.getItem(
        "access_token"
      )
    );

  const [user, setUser] = useState(() => {

    try {

      return (
        JSON.parse(
          localStorage.getItem("user")
        ) || null
      );

    } catch {

      return null;

    }

  });

  const [medications, setMedications] =
    useState([]);

  const [reminders, setReminders] =
    useState([]);

  const [adherence, setAdherence] =
    useState(null);

  const [
    aiRecommendations,
    setAiRecommendations,
  ] = useState([]);

  const [message, setMessage] =
    useState("");

  /* =======================================================
     TOKEN
  ======================================================= */

  const getToken = () => {
    return localStorage.getItem(
      "access_token"
    );
  };

  /* =======================================================
     USER ID
  ======================================================= */

  const getUserId = () => {

    if (
      user?.id !== undefined &&
      user?.id !== null
    ) {

      const id = Number(user.id);

      if (
        Number.isInteger(id) &&
        id > 0
      ) {
        return id;
      }
    }

    try {

      const token = getToken();

      if (!token) {
        return null;
      }

      const parts = token.split(".");

      if (parts.length !== 3) {
        return null;
      }

      let base64 = parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      while (
        base64.length % 4 !== 0
      ) {
        base64 += "=";
      }

      const payload = JSON.parse(
        atob(base64)
      );

      if (
        payload.sub === undefined ||
        payload.sub === null
      ) {
        return null;
      }

      const id = Number(
        payload.sub
      );

      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        return null;
      }

      return id;

    } catch (error) {

      console.error(
        "Unable to get user ID:",
        error
      );

      return null;
    }
  };

  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = (data) => {

    localStorage.setItem(
      "access_token",
      data.access_token
    );

    if (data.user) {

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      setUser(data.user);
    }

    setIsLoggedIn(true);

    navigate("/dashboard");
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {

    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem(
      "user"
    );

    setIsLoggedIn(false);

    setUser(null);

    setMedications([]);

    setReminders([]);

    setAdherence(null);

    setAiRecommendations([]);

    setMessage("");

    navigate("/login");
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

      const response =
        await fetch(
          `${API_URL}/medications`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (!response.ok) {

        const errorMessage =
          await getErrorMessage(
            response
          );

        throw new Error(
          errorMessage
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
        "Fetch medications error:",
        error
      );

      setMessage(
        error.message ||
          "Failed to load medications"
      );
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

      const response =
        await fetch(
          `${API_URL}/reminders`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (!response.ok) {

        const errorMessage =
          await getErrorMessage(
            response
          );

        throw new Error(
          errorMessage
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
        "Fetch reminders error:",
        error
      );

      setMessage(
        error.message ||
          "Failed to load reminders"
      );
    }
  };

  /* =======================================================
     FETCH ANALYTICS
  ======================================================= */

  const fetchAdherence = async () => {

    const token = getToken();

    if (!token) {
      return;
    }

    try {

      const response =
        await fetch(
          `${API_URL}/stats`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (!response.ok) {

        const errorMessage =
          await getErrorMessage(
            response
          );

        throw new Error(
          errorMessage
        );
      }

      const data =
        await response.json();

      setAdherence(data);

    } catch (error) {

      console.error(
        "Fetch analytics error:",
        error
      );

      setMessage(
        error.message ||
          "Failed to load analytics"
      );
    }
  };

  /* =======================================================
     ADD MEDICATION
  ======================================================= */

  const addMedication = async (
    medicationData
  ) => {

    const token = getToken();
    const userId = getUserId();

    if (!token) {

      setMessage(
        "Please login again"
      );

      return false;
    }

    if (
      !userId ||
      !Number.isInteger(userId)
    ) {

      setMessage(
        "User ID not found. Please logout and login again."
      );

      return false;
    }

    try {

      const response =
        await fetch(
          `${API_URL}/users/${userId}/medications`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify(
              medicationData
            ),
          }
        );

      if (!response.ok) {

        const errorMessage =
          await getErrorMessage(
            response
          );

        throw new Error(
          errorMessage
        );
      }

      await response.json();

      await fetchMedications();

      setMessage(
        "Medication added successfully"
      );

      return true;

    } catch (error) {

      console.error(
        "Add medication error:",
        error
      );

      setMessage(
        error.message ||
          "Failed to add medication"
      );

      return false;
    }
  };

  /* =======================================================
     UPDATE MEDICATION
  ======================================================= */

  const updateMedication = async (
    medicationId,
    medicationData
  ) => {

    const token = getToken();

    if (!token) {

      setMessage(
        "Please login again"
      );

      return false;
    }

    const id = Number(
      medicationId
    );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {

      setMessage(
        "Invalid medication ID"
      );

      return false;
    }

    try {

      const response =
        await fetch(
          `${API_URL}/medications/${id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify(
              medicationData
            ),
          }
        );

      if (!response.ok) {

        const errorMessage =
          await getErrorMessage(
            response
          );

        throw new Error(
          errorMessage
        );
      }

      await response.json();

      await fetchMedications();

      setMessage(
        "Medication updated successfully"
      );

      return true;

    } catch (error) {

      console.error(
        "Update medication error:",
        error
      );

      setMessage(
        error.message ||
          "Failed to update medication"
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

      setMessage(
        "Please login again"
      );

      return false;
    }

    const id = Number(
      medicationId
    );

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {

      setMessage(
        "Invalid medication ID"
      );

      return false;
    }

    try {

      const response =
        await fetch(
          `${API_URL}/medications/${id}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (!response.ok) {

        const errorMessage =
          await getErrorMessage(
            response
          );

        throw new Error(
          errorMessage
        );
      }

      await fetchMedications();

      setMessage(
        "Medication deleted successfully"
      );

      return true;

    } catch (error) {

      console.error(
        "Delete medication error:",
        error
      );

      setMessage(
        error.message ||
          "Failed to delete medication"
      );

      return false;
    }
  };

  /* =======================================================
     ACTIVATE / DEACTIVATE
     
     IMPORTANT:
     Backend expects:
     
     PATCH /medications/{id}/status?active=true
     
     NOT JSON body.
  ======================================================= */

  const toggleMedicationStatus =
    async (medication) => {

      const token = getToken();

      if (!token) {

        setMessage(
          "Please login again"
        );

        return false;
      }

      const medicationId =
        Number(
          medication?.id
        );

      if (
        !Number.isInteger(
          medicationId
        ) ||
        medicationId <= 0
      ) {

        console.error(
          "Invalid medication:",
          medication
        );

        setMessage(
          "Invalid medication ID"
        );

        return false;
      }

      try {

        const newStatus =
          !Boolean(
            medication.active
          );

        /*
          IMPORTANT:
          active is sent as a query parameter
          because FastAPI backend expects:

          active: bool
        */

        const url =
          `${API_URL}/medications/${medicationId}/status?active=${newStatus}`;

        console.log(
          "Updating medication:",
          medicationId
        );

        console.log(
          "New status:",
          newStatus
        );

        console.log(
          "Request URL:",
          url
        );

        const response =
          await fetch(
            url,
            {
              method: "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        if (!response.ok) {

          const errorMessage =
            await getErrorMessage(
              response
            );

          throw new Error(
            errorMessage
          );
        }

        const data =
          await response.json();

        console.log(
          "Status update response:",
          data
        );

        await fetchMedications();

        setMessage(
          newStatus
            ? "Medication activated successfully"
            : "Medication deactivated successfully"
        );

        return true;

      } catch (error) {

        console.error(
          "Activate/Deactivate error:",
          error
        );

        setMessage(
          error.message ||
            "Failed to update medication status"
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

      setMessage(
        "Please login again"
      );

      return false;
    }

    try {

      const id = Number(
        medicationId
      );

      const response =
        await fetch(
          `${API_URL}/medications/${id}/taken`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (!response.ok) {

        const errorMessage =
          await getErrorMessage(
            response
          );

        throw new Error(
          errorMessage
        );
      }

      await response.json();

      await Promise.all([
        fetchMedications(),
        fetchReminders(),
        fetchAdherence(),
      ]);

      setMessage(
        "Medicine marked as taken"
      );

      return true;

    } catch (error) {

      console.error(
        "Mark taken error:",
        error
      );

      setMessage(
        error.message ||
          "Failed to mark medicine as taken"
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

      setMessage(
        "Please login again"
      );

      return false;
    }

    try {

      const id = Number(
        medicationId
      );

      const response =
        await fetch(
          `${API_URL}/medications/${id}/missed`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (!response.ok) {

        const errorMessage =
          await getErrorMessage(
            response
          );

        throw new Error(
          errorMessage
        );
      }

      await response.json();

      await Promise.all([
        fetchMedications(),
        fetchReminders(),
        fetchAdherence(),
      ]);

      setMessage(
        "Medicine marked as missed"
      );

      return true;

    } catch (error) {

      console.error(
        "Mark missed error:",
        error
      );

      setMessage(
        error.message ||
          "Failed to mark medicine as missed"
      );

      return false;
    }
  };

  /* =======================================================
     AI RECOMMENDATIONS
  ======================================================= */

  const fetchAIRecommendations =
    async () => {

      const token = getToken();

      if (
        !token ||
        medications.length === 0
      ) {

        setAiRecommendations([]);

        return;
      }

      try {

        const results = [];

        for (
          const medication of medications
        ) {

          try {

            const response =
              await fetch(
                `${API_URL}/ai/medications/${medication.id}/recommendation`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              );

            if (response.ok) {

              const data =
                await response.json();

              results.push(data);
            }

          } catch (error) {

            console.error(
              `AI error for medication ${medication.id}:`,
              error
            );
          }
        }

        setAiRecommendations(
          results
        );

      } catch (error) {

        console.error(
          "AI recommendations error:",
          error
        );

        setMessage(
          error.message ||
            "Failed to load AI recommendations"
        );
      }
    };

  /* =======================================================
     INITIAL DATA
  ======================================================= */

  useEffect(() => {

    if (!isLoggedIn) {
      return;
    }

    fetchMedications();
    fetchReminders();
    fetchAdherence();

  }, [isLoggedIn]);

  /* =======================================================
     AI AFTER MEDICATIONS
  ======================================================= */

  useEffect(() => {

    if (
      !isLoggedIn ||
      medications.length === 0
    ) {

      setAiRecommendations([]);

      return;
    }

    fetchAIRecommendations();

  }, [
    isLoggedIn,
    medications,
  ]);

  /* =======================================================
     LOGIN SCREEN
  ======================================================= */

  if (!isLoggedIn) {

    return (
      <LoginPage
        onLogin={handleLogin}
      />
    );
  }

  /* =======================================================
     MAIN LAYOUT
  ======================================================= */

  return (
    <div className="app-layout">

      <Sidebar
        onLogout={handleLogout}
      />

      <div className="main-area">

        <TopBar
          user={user}
        />

        <MessageBanner
          message={message}
          onClose={() =>
            setMessage("")
          }
        />

        <main className="page-content">

          <Routes>

            {/* DASHBOARD */}

            <Route
              path="/"
              element={
                <Dashboard
                  medications={
                    medications
                  }
                  reminders={
                    reminders
                  }
                  adherence={
                    adherence
                  }
                  onRefresh={() => {
                    fetchMedications();
                    fetchReminders();
                    fetchAdherence();
                  }}
                />
              }
            />

            <Route
              path="/dashboard"
              element={
                <Dashboard
                  medications={
                    medications
                  }
                  reminders={
                    reminders
                  }
                  adherence={
                    adherence
                  }
                  onRefresh={() => {
                    fetchMedications();
                    fetchReminders();
                    fetchAdherence();
                  }}
                />
              }
            />

            {/* MEDICATIONS */}

            <Route
              path="/medications"
              element={
                <Medications
                  medications={
                    medications
                  }
                  onAddMedication={
                    addMedication
                  }
                  onUpdateMedication={
                    updateMedication
                  }
                  onDeleteMedication={
                    deleteMedication
                  }
                  onToggleStatus={
                    toggleMedicationStatus
                  }
                  onMarkTaken={
                    markTaken
                  }
                  onMarkMissed={
                    markMissed
                  }
                />
              }
            />

            {/* REMINDERS */}

            <Route
              path="/reminders"
              element={
                <Reminders
                  reminders={
                    reminders
                  }
                  medications={
                    medications
                  }
                  onRefresh={
                    fetchReminders
                  }
                />
              }
            />

            {/* ANALYTICS */}

            <Route
              path="/analytics"
              element={
                <Analytics
                  medications={
                    medications
                  }
                  adherence={
                    adherence
                  }
                  reminders={
                    reminders
                  }
                  onRefresh={() => {
                    fetchAdherence();
                    fetchReminders();
                  }}
                />
              }
            />

            {/* AI */}

            <Route
              path="/ai"
              element={
                <AIInsights
                  medications={
                    medications
                  }
                  recommendations={
                    aiRecommendations
                  }
                  onRefresh={
                    fetchAIRecommendations
                  }
                />
              }
            />

            {/* FALLBACK */}

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

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;



