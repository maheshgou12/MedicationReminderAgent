import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { API_URL } from "../api";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSent(false);
    setResetUrl("");

    try {
      const res = await fetch(
        `${API_URL}/password-reset/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (data.reset_url) {
        setResetUrl(data.reset_url);
      }
      setEmailSent(Boolean(data.email_sent));
      setSent(true);
    } catch {
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
                marginTop: "20px",
                padding: "16px",
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "10px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#166534",
                  fontWeight: 700,
                  fontSize: "1rem",
                  marginBottom: "6px",
                }}
              >
                <span>✅</span>
                <span>Reset Request Generated</span>
              </div>

              <p
                style={{
                  margin: "0 0 12px 0",
                  color: "#1e293b",
                  fontSize: "0.92rem",
                  lineHeight: 1.45,
                }}
              >
                A password reset request has been processed for{" "}
                <strong>{email}</strong>.
              </p>

              {resetUrl && (
                <div style={{ marginTop: "12px", marginBottom: "12px" }}>
                  <a
                    href={resetUrl}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "12px 18px",
                      background:
                        "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                      color: "#ffffff",
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      textDecoration: "none",
                      boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.25)",
                    }}
                  >
                    👉 Click Here to Set Your New Password Now
                  </a>
                </div>
              )}

              <p
                style={{
                  margin: "8px 0 0 0",
                  color: "#64748b",
                  fontSize: "0.82rem",
                  lineHeight: 1.4,
                  borderTop: "1px dashed #cbd5e1",
                  paddingTop: "8px",
                }}
              >
                {emailSent
                  ? "An email was also dispatched to your inbox. You can also use the direct button above."
                  : "If your email provider delays delivery or filters to spam, click the instant button above to set your password immediately."}
              </p>
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
