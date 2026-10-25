import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { API_URL } from "../api";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSent(false);

    try {
      await fetch(
        `${API_URL}/password-reset/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🔑</div>
        <h1>Reset password</h1>
        <p className="login-subtitle">
          Enter your email to receive a password reset link.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              required
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Sending link…" : "Send Reset Link"}
          </button>

          {sent && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                background: "#ecfdf5",
                color: "#065f46",
                border: "1px solid #a7f3d0",
                borderRadius: "8px",
                fontSize: "0.95rem",
                textAlign: "center",
                fontWeight: 600,
              }}
            >
              ✅ Reset link sent! Please check your email inbox.
            </div>
          )}
        </form>

        <p
          className="login-subtitle"
          style={{ marginTop: "16px" }}
        >
          <a href="/login">← Back to login</a>
        </p>
      </div>
    </div>
  );
}

export function ResetPassword() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("No reset token found. Please click the link sent to your email.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify and try again.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/password-reset/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: token.trim(),
            new_password: password,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || "Reset failed. The link may have expired.");
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">⚠️</div>
          <h1>Reset link required</h1>
          <p className="login-subtitle">
            Please check your email and click the password reset button we sent to your inbox.
          </p>
          <p style={{ marginTop: "24px" }}>
            <a
              href="/login"
              className="login-button"
              style={{ display: "inline-block", textDecoration: "none" }}
            >
              Back to Login
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🔑</div>
        <h1>Create new password</h1>
        <p className="login-subtitle">
          Enter your new password below.
        </p>

        {success ? (
          <div className="message-banner success">
            ✅ Password updated successfully! Redirecting to login…
          </div>
        ) : (
          <>
            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? "Saving…" : "Save New Password"}
              </button>
            </form>
          </>
        )}

        <p className="login-subtitle" style={{ marginTop: "14px" }}>
          <a href="/login">← Back to login</a>
        </p>
      </div>
    </div>
  );
}
