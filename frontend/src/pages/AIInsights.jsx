import React, { useMemo, useState } from "react";

function AIInsights({
  medications = [],
  aiRecommendations = [],
  onRefresh,
}) {
  const [loading, setLoading] = useState(false);

  const recommendations = Array.isArray(aiRecommendations)
    ? aiRecommendations
    : [];

  const summary = useMemo(() => {
    const total = recommendations.reduce(
      (sum, item) => sum + Number(item.total_records || 0),
      0
    );

    const taken = recommendations.reduce(
      (sum, item) => sum + Number(item.taken_count || 0),
      0
    );

    const missed = recommendations.reduce(
      (sum, item) => sum + Number(item.missed_count || 0),
      0
    );

    const percentage =
      total > 0 ? Number(((taken / total) * 100).toFixed(2)) : 0;

    const critical = recommendations.filter(
      (item) =>
        item.ai_recommendation?.priority === "CRITICAL"
    ).length;

    const high = recommendations.filter(
      (item) =>
        item.ai_recommendation?.priority === "HIGH"
    ).length;

    return {
      total,
      taken,
      missed,
      percentage,
      critical,
      high,
    };
  }, [recommendations]);

  const getPriorityClass = (priority) => {
    switch (priority) {
      case "CRITICAL":
        return "priority critical";

      case "HIGH":
        return "priority high";

      case "MEDIUM":
        return "priority medium";

      default:
        return "priority low";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "CRITICAL":
        return "🚨";

      case "HIGH":
        return "⚠️";

      case "MEDIUM":
        return "🔔";

      default:
        return "✅";
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case "STRONGER_REMINDER":
        return "Stronger Reminder";

      case "ATTENTION_REQUIRED":
        return "Attention Required";

      case "NORMAL_REMINDER":
        return "Normal Reminder";

      default:
        return action || "Normal Reminder";
    }
  };

  const getAdherenceStatus = (percentage) => {
    if (percentage >= 90) {
      return {
        label: "Excellent",
        className: "excellent",
        icon: "🌟",
      };
    }

    if (percentage >= 75) {
      return {
        label: "Good",
        className: "good",
        icon: "👍",
      };
    }

    if (percentage >= 50) {
      return {
        label: "Needs Attention",
        className: "attention",
        icon: "⚠️",
      };
    }

    return {
      label: "Critical",
      className: "critical",
      icon: "🚨",
    };
  };

  const overallStatus = getAdherenceStatus(summary.percentage);

  const handleRefresh = async () => {
    if (!onRefresh) return;

    setLoading(true);

    try {
      await onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-page">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>AI Insights</h1>
          <p>
            AI-powered medication adherence analysis and recommendations.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? "⏳ Refreshing..." : "🔄 Refresh AI"}
        </button>
      </div>

      {/* AI SUMMARY */}
      <div className="ai-summary-grid">

        <div className="ai-summary-card">
          <div className="ai-card-icon">🤖</div>

          <div>
            <span>AI Analyzed</span>
            <strong>{recommendations.length}</strong>
            <small>medications</small>
          </div>
        </div>

        <div className="ai-summary-card">
          <div className="ai-card-icon">📊</div>

          <div>
            <span>Overall Adherence</span>
            <strong>{summary.percentage}%</strong>
            <small>{overallStatus.label}</small>
          </div>
        </div>

        <div className="ai-summary-card">
          <div className="ai-card-icon">💊</div>

          <div>
            <span>Doses Taken</span>
            <strong>{summary.taken}</strong>
            <small>completed doses</small>
          </div>
        </div>

        <div className="ai-summary-card">
          <div className="ai-card-icon">⚠️</div>

          <div>
            <span>Doses Missed</span>
            <strong>{summary.missed}</strong>
            <small>missed doses</small>
          </div>
        </div>
      </div>

      {/* OVERALL AI STATUS */}
      <div className="ai-overview-card">

        <div className="ai-overview-left">
          <div className="ai-brain-icon">
            🤖
          </div>

          <div>
            <span className="section-label">
              AI ADHERENCE STATUS
            </span>

            <h2>
              {overallStatus.icon} {overallStatus.label}
            </h2>

            <p>
              Your current medication adherence is{" "}
              <strong>{summary.percentage}%</strong>.
              The AI system analyzed your medication records
              and generated personalized reminder recommendations.
            </p>
          </div>
        </div>

        <div className="ai-progress-container">
          <div className="ai-progress-header">
            <span>Adherence</span>
            <strong>{summary.percentage}%</strong>
          </div>

          <div className="ai-progress-bar">
            <div
              className="ai-progress-fill"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, summary.percentage)
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* PRIORITY ALERT */}
      {(summary.critical > 0 || summary.high > 0) && (
        <div className="ai-alert-card">
          <div className="alert-icon">🚨</div>

          <div>
            <h3>AI Attention Required</h3>

            <p>
              {summary.critical > 0 &&
                `${summary.critical} medication${
                  summary.critical > 1 ? "s" : ""
                } require${
                  summary.critical === 1 ? "s" : ""
                } critical attention. `}

              {summary.high > 0 &&
                `${summary.high} medication${
                  summary.high > 1 ? "s" : ""
                } have high-priority adherence issues.`}
            </p>
          </div>
        </div>
      )}

      {/* MEDICATION INSIGHTS */}
      <div className="ai-section-card">

        <div className="section-heading">
          <div>
            <h2>Medication AI Recommendations</h2>
            <p>
              Individual AI analysis for your medications.
            </p>
          </div>
        </div>

        {recommendations.length === 0 ? (
          <div className="ai-empty-state">
            <div className="empty-icon">🤖</div>

            <h3>No AI insights available</h3>

            <p>
              Add medications and record taken or missed doses
              to generate AI-powered adherence insights.
            </p>
          </div>
        ) : (
          <div className="ai-recommendation-list">

            {recommendations.map((item) => {
              const recommendation =
                item.ai_recommendation || {};

              const priority =
                recommendation.priority || "LOW";

              const percentage =
                Number(item.adherence_percentage || 0);

              const status =
                getAdherenceStatus(percentage);

              return (
                <div
                  className="ai-recommendation-card"
                  key={item.medication_id}
                >

                  {/* MEDICATION INFO */}
                  <div className="recommendation-top">

                    <div className="medicine-info">
                      <div className="medicine-icon">
                        💊
                      </div>

                      <div>
                        <h3>
                          {item.medicine ||
                            "Unknown Medicine"}
                        </h3>

                        <span>
                          {item.dosage || "Dosage not available"}
                        </span>
                      </div>
                    </div>

                    <div
                      className={getPriorityClass(
                        priority
                      )}
                    >
                      {getPriorityIcon(priority)}{" "}
                      {priority}
                    </div>
                  </div>

                  {/* STATS */}
                  <div className="recommendation-stats">

                    <div>
                      <span>Adherence</span>
                      <strong>
                        {percentage}%
                      </strong>
                    </div>

                    <div>
                      <span>Total Records</span>
                      <strong>
                        {item.total_records || 0}
                      </strong>
                    </div>

                    <div>
                      <span>Taken</span>
                      <strong className="taken-text">
                        {item.taken_count || 0}
                      </strong>
                    </div>

                    <div>
                      <span>Missed</span>
                      <strong className="missed-text">
                        {item.missed_count || 0}
                      </strong>
                    </div>

                  </div>

                  {/* PROGRESS */}
                  <div className="recommendation-progress">

                    <div className="progress-label">
                      <span>
                        {status.icon}{" "}
                        {status.label}
                      </span>

                      <strong>
                        {percentage}%
                      </strong>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, percentage)
                          )}%`,
                        }}
                      />
                    </div>

                  </div>

                  {/* AI RECOMMENDATION */}
                  <div className="ai-recommendation-box">

                    <div className="recommendation-icon">
                      🧠
                    </div>

                    <div>
                      <span>
                        AI RECOMMENDATION
                      </span>

                      <h4>
                        {getActionLabel(
                          recommendation.action
                        )}
                      </h4>

                      <p>
                        {recommendation.message ||
                          "Continue monitoring medication adherence."}
                      </p>
                    </div>

                  </div>

                </div>
              );
            })}

          </div>
        )}
      </div>

      {/* AI INFORMATION */}
      <div className="ai-info-card">

        <div className="info-icon">
          🧠
        </div>

        <div>
          <h3>How the AI recommendation works</h3>

          <p>
            The system evaluates medication adherence
            using recorded taken and missed doses.
            Based on the adherence percentage, it assigns
            a priority level and recommends an appropriate
            reminder action.
          </p>

          <div className="ai-rules">

            <span>≥ 90% → Normal</span>
            <span>75–89% → Monitor</span>
            <span>50–74% → Stronger Reminder</span>
            <span>&lt; 50% → Attention Required</span>

          </div>
        </div>

      </div>

    </div>
  );
}

export default AIInsights;



