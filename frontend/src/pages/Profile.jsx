import { useEffect, useState } from "react";

import {
  API_URL,
  authFetch,
  clearTokens,
  getToken,
} from "../api";

function Profile({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const loadProfile = async () => {
    const token = getToken();

    if (!token) {
      return;
    }

    try {
      const res = await authFetch(
        `${API_URL}/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Could not load profile");
      }

      const data = await res.json();

      setProfile(data);
      setUsername(data.username || "");
      setEmail(data.email || "");
      setLoaded(true);
    } catch (err) {
      setError(
        err.message || "Could not load profile"
      );
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadProfile();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!loaded) {
    return (
      <div className="profile-page">
        <div className="page-header">
          <div>
            <h1>👤 Profile</h1>
            <p>Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await authFetch(
        `${API_URL}/profile`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
          }),
        }
      );

      const data = await res
        .json()
        .catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.detail || "Update failed"
        );
      }

      setProfile(data);
      localStorage.setItem(
        "user",
        JSON.stringify(data)
      );
      setMessage("Profile updated.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await authFetch(
        `${API_URL}/profile/password`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            current_password: currentPw,
            new_password: newPw,
          }),
        }
      );

      const data = await res
        .json()
        .catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.detail ||
            "Password change failed"
        );
      }

      // Backend revokes all sessions on password change
      clearTokens();
      onLogout();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <div>
          <h1>👤 Profile</h1>
          <p>
            Manage your account details and
            password.
          </p>
        </div>
      </div>

      {error && (
        <div className="login-error">
          {error}
        </div>
      )}

      {message && (
        <div
          className="message-banner success"
          style={{ marginBottom: "14px" }}
        >
          ✅ {message}
        </div>
      )}

      <div className="profile-grid">
        <div className="medications-card">
          <div className="card-header">
            <div>
              <h2>Account details</h2>
              <p>
                Joined:{" "}
                {profile?.created_at
                  ? new Date(
                      profile.created_at
                    ).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSave}
            className="medication-form"
          >
            <div className="form-group">
              <label>Username</label>
              <input
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />
            </div>

            <button
              type="submit"
              className="primary-button"
            >
              Save changes
            </button>
          </form>
        </div>

        <div className="medications-card">
          <div className="card-header">
            <div>
              <h2>Change password</h2>
              <p>
                You will be logged out on all
                devices.
              </p>
            </div>
          </div>

          <form
            onSubmit={handlePassword}
            className="medication-form"
          >
            <div className="form-group">
              <label>
                Current password
              </label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) =>
                  setCurrentPw(e.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label>New password</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) =>
                  setNewPw(e.target.value)
                }
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              className="secondary-button"
            >
              Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
