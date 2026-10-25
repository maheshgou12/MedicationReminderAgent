import { useState } from "react";

const TYPE_STYLE = {
  REMINDER: { icon: "💊", bg: "#eef2ff", color: "#4f46e5" },
  MISSED: { icon: "⚠️", bg: "#fee2e2", color: "#991b1b" },
  LOW_STOCK: { icon: "📦", bg: "#ffedd5", color: "#c2410c" },
  ESCALATION: { icon: "🚨", bg: "#fee2e2", color: "#dc2626" },
  INFO: { icon: "ℹ️", bg: "#f1f5f9", color: "#475569" },
};

function Notifications({
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onRefresh,
}) {
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const visible = notifications.filter((n) => {
    if (filter === "unread") {
      return !n.read;
    }

    if (filter !== "all") {
      return n.type === filter;
    }

    return true;
  });

  const unread = notifications.filter(
    (n) => !n.read
  ).length;

  const handleRefresh = async () => {
    if (!onRefresh) {
      return;
    }

    setLoading(true);

    try {
      await onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    try {
      return new Date(value).toLocaleString(
        "en-IN",
        { dateStyle: "medium", timeStyle: "short" }
      );
    } catch {
      return value;
    }
  };

  return (
    <div className="notifications-page">
      <div className="page-header">
        <div>
          <h1>🔔 Notifications</h1>
          <p>
            {unread} unread · reminders, missed
            doses, refills and escalations.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="secondary-button"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "⏳…" : "🔄 Refresh"}
          </button>

          <button
            className="primary-button"
            onClick={onMarkAllRead}
          >
            ✓ Mark all read
          </button>
        </div>
      </div>

      <div className="filter-row">
        {["all", "unread", "REMINDER", "MISSED", "LOW_STOCK", "ESCALATION"].map(
          (f) => (
            <button
              key={f}
              className={`filter-chip ${
                filter === f ? "active" : ""
              }`}
              onClick={() => setFilter(f)}
            >
              {f === "all"
                ? "All"
                : f === "unread"
                  ? "Unread"
                  : f
                      .toLowerCase()
                      .replace("_", " ")}
            </button>
          )
        )}
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <h3>No notifications</h3>
          <p>
            Reminder and alert activity will
            appear here.
          </p>
        </div>
      ) : (
        <div className="notif-list">
          {visible.map((n) => {
            const style =
              TYPE_STYLE[n.type] ||
              TYPE_STYLE.INFO;

            return (
              <div
                key={n.id}
                className={`notif-card ${
                  n.read ? "read" : ""
                }`}
              >
                <div
                  className="notif-card-icon"
                  style={{
                    background: style.bg,
                  }}
                >
                  {style.icon}
                </div>

                <div className="notif-card-body">
                  <div className="notif-card-top">
                    <strong>
                      {n.title}
                    </strong>
                    <span
                      className="type-badge"
                      style={{
                        background: style.bg,
                        color: style.color,
                      }}
                    >
                      {n.type}
                    </span>
                  </div>

                  <p>{n.message}</p>

                  <small>
                    {formatDate(n.created_at)}
                  </small>
                </div>

                {!n.read && (
                  <button
                    className="action-button"
                    onClick={() =>
                      onMarkRead(n.id)
                    }
                  >
                    Mark read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Notifications;
