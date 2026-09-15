import React, { useEffect, useState } from "react";

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

import "./App.css";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

console.log("API URL:", API_URL);

/* =========================================================
   AUTH HELPERS
========================================================= */

const getToken = () => {
  return localStorage.getItem("access_token");
};

const getUserIdFromToken = (token) => {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));

    return Number(payload.sub);
  } catch (error) {
    console.error("Token decode error:", error);
    return null;
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

  const handleLogin = async (e) => {
    e.preventDefault();

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

function TopBar() {
  const [user, setUser] = useState(null);

  useEffect(() => {

    try {

      const storedUser =
        localStorage.getItem("user");

      if (storedUser) {

        setUser(
          JSON.parse(storedUser)
        );

      }

    } catch (error) {

      console.error(
        "User load error:",
        error
      );

    }

  }, []);

  return (
    <header className="topbar">

      <div className="topbar-title">
        Smart medication management system
      </div>

      <div className="topbar-user">

        <span className="notification-icon">
          🔔
        </span>

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

function MainApp() {

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

  const handleLogout = () => {

    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem(
      "user"
    );

    setMedications([]);
    setReminders([]);
    setAdherence(null);
    setAiRecommendations([]);

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

      setLoading(true);

      const response = await fetch(
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

      const response = await fetch(
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

      const response = await fetch(
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
            await fetch(
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
        await fetch(
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
        await fetch(
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
        await fetch(
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
          await fetch(
            `${API_URL}/medications/${medicationId}/status`,
            {
              method: "PATCH",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                active,
              }),
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
        await fetch(
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
        await fetch(
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
     INITIAL DATA LOAD
  ======================================================= */

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

      };

    loadData();

  }, []);

  /* =======================================================
     AI UPDATE WHEN MEDICATIONS CHANGE
  ======================================================= */

  useEffect(() => {

    if (medications.length > 0) {

      fetchAIRecommendations(
        medications
      );

    } else {

      setAiRecommendations([]);

    }

  }, [medications]);

  /* =======================================================
     REFRESH ALL
  ======================================================= */

  const refreshAll = async () => {

    await fetchMedications();

    await fetchReminders();

    await fetchAdherence();

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

        <TopBar />

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
      <MainApp />
    </BrowserRouter>
  );
}

export default RootApp;



