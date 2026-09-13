import React from "react";

export default function Analytics({
  medications = [],
  reminders = [],
  adherence = null,
}) {
  // ==========================================================
  // SAFE DATA
  // ==========================================================

  const stats = adherence || {};

  const total = Number(
    stats.total ??
      stats.total_records ??
      stats.total_doses ??
      0
  );

  const taken = Number(
    stats.taken ??
      stats.taken_count ??
      stats.total_taken ??
      0
  );

  const missed = Number(
    stats.missed ??
      stats.missed_count ??
      stats.total_missed ??
      0
  );

  const percentageFromStats = Number(
    stats.adherence_percentage ??
      stats.percentage ??
      0
  );

  const calculatedPercentage =
    total > 0
      ? (taken / total) * 100
      : 0;

  const adherencePercentage =
    percentageFromStats > 0
      ? percentageFromStats
      : calculatedPercentage;

  const safePercentage = Math.min(
    100,
    Math.max(0, adherencePercentage)
  );


  // ==========================================================
  // MEDICATION COUNTS
  // ==========================================================

  const activeMedications =
    medications.filter(
      (medication) =>
        medication.active !== false
    ).length;

  const inactiveMedications =
    medications.filter(
      (medication) =>
        medication.active === false
    ).length;


  // ==========================================================
  // REMINDER COUNTS
  // ==========================================================

  const pendingReminders =
    reminders.filter(
      (reminder) =>
        String(
          reminder.status || "PENDING"
        ).toUpperCase() === "PENDING"
    ).length;

  const takenReminders =
    reminders.filter(
      (reminder) =>
        String(
          reminder.status || ""
        ).toUpperCase() === "TAKEN"
    ).length;

  const missedReminders =
    reminders.filter(
      (reminder) =>
        String(
          reminder.status || ""
        ).toUpperCase() === "MISSED"
    ).length;


  // ==========================================================
  // STATUS
  // ==========================================================

  let status = "No Data";
  let statusColor = "#64748b";
  let statusBackground = "#f1f5f9";

  if (safePercentage >= 90) {
    status = "Excellent";
    statusColor = "#15803d";
    statusBackground = "#dcfce7";
  } else if (safePercentage >= 75) {
    status = "Good";
    statusColor = "#a16207";
    statusBackground = "#fef9c3";
  } else if (safePercentage >= 50) {
    status = "Needs Attention";
    statusColor = "#c2410c";
    statusBackground = "#ffedd5";
  } else if (total > 0) {
    status = "Critical";
    statusColor = "#dc2626";
    statusBackground = "#fee2e2";
  }


  // ==========================================================
  // MEDICATION PERFORMANCE
  // ==========================================================

  const getMedicationPerformance = (
    medication
  ) => {
    const medicationReminders =
      reminders.filter(
        (reminder) =>
          reminder.medication_id ===
          medication.id
      );

    const medicationTaken =
      medicationReminders.filter(
        (reminder) =>
          String(
            reminder.status || ""
          ).toUpperCase() === "TAKEN"
      ).length;

    const medicationMissed =
      medicationReminders.filter(
        (reminder) =>
          String(
            reminder.status || ""
          ).toUpperCase() === "MISSED"
      ).length;

    const medicationTotal =
      medicationTaken +
      medicationMissed;

    const medicationPercentage =
      medicationTotal > 0
        ? (medicationTaken /
            medicationTotal) *
          100
        : 0;

    return {
      total: medicationTotal,
      taken: medicationTaken,
      missed: medicationMissed,
      percentage: medicationPercentage,
    };
  };


  // ==========================================================
  // FORMAT PERCENTAGE
  // ==========================================================

  const formatPercentage = (value) => {
    return `${Math.round(value)}%`;
  };


  return (
    <div style={styles.page}>

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div style={styles.header}>

        <div>
          <h1 style={styles.title}>
            Analytics
          </h1>

          <p style={styles.subtitle}>
            Understand your medication adherence
            and reminder performance.
          </p>
        </div>

        <div
          style={{
            ...styles.overallBadge,
            background:
              statusBackground,
            color:
              statusColor,
          }}
        >
          <span
            style={{
              ...styles.statusDot,
              background:
                statusColor,
            }}
          />

          {status}
        </div>

      </div>


      {/* ====================================================
          TOP STATISTICS
      ==================================================== */}

      <div style={styles.statsGrid}>

        <div style={styles.statCard}>

          <div
            style={{
              ...styles.statIcon,
              background: "#eef2ff",
            }}
          >
            📊
          </div>

          <div>

            <div style={styles.statLabel}>
              Overall Adherence
            </div>

            <div style={styles.statValue}>
              {formatPercentage(
                safePercentage
              )}
            </div>

            <div style={styles.statDescription}>
              Medication compliance
            </div>

          </div>

        </div>


        <div style={styles.statCard}>

          <div
            style={{
              ...styles.statIcon,
              background: "#dcfce7",
            }}
          >
            ✓
          </div>

          <div>

            <div style={styles.statLabel}>
              Doses Taken
            </div>

            <div style={styles.statValue}>
              {taken}
            </div>

            <div style={styles.statDescription}>
              Successfully completed
            </div>

          </div>

        </div>


        <div style={styles.statCard}>

          <div
            style={{
              ...styles.statIcon,
              background: "#fee2e2",
            }}
          >
            !
          </div>

          <div>

            <div style={styles.statLabel}>
              Doses Missed
            </div>

            <div style={styles.statValue}>
              {missed}
            </div>

            <div style={styles.statDescription}>
              Require attention
            </div>

          </div>

        </div>


        <div style={styles.statCard}>

          <div
            style={{
              ...styles.statIcon,
              background: "#ecfeff",
            }}
          >
            💊
          </div>

          <div>

            <div style={styles.statLabel}>
              Active Medicines
            </div>

            <div style={styles.statValue}>
              {activeMedications}
            </div>

            <div style={styles.statDescription}>
              Currently scheduled
            </div>

          </div>

        </div>

      </div>


      {/* ====================================================
          ADHERENCE + REMINDERS
      ==================================================== */}

      <div style={styles.twoColumnGrid}>

        {/* ADHERENCE */}

        <div style={styles.card}>

          <div style={styles.cardHeader}>

            <div>
              <h2 style={styles.cardTitle}>
                Adherence Performance
              </h2>

              <p style={styles.cardSubtitle}>
                Overall medication-taking performance
              </p>
            </div>

          </div>


          <div style={styles.adherenceContent}>

            {/* CIRCLE */}

            <div
              style={{
                ...styles.progressCircle,
                background: `conic-gradient(
                  #4f46e5
                  ${safePercentage * 3.6}deg,
                  #e5e7eb
                  ${safePercentage * 3.6}deg
                )`,
              }}
            >

              <div style={styles.progressInner}>

                <strong>
                  {formatPercentage(
                    safePercentage
                  )}
                </strong>

                <span>
                  adherence
                </span>

              </div>

            </div>


            {/* DETAILS */}

            <div style={styles.performanceDetails}>

              <div style={styles.performanceRow}>

                <span>
                  Total doses
                </span>

                <strong>
                  {total}
                </strong>

              </div>

              <div style={styles.performanceRow}>

                <span>
                  Taken
                </span>

                <strong
                  style={{
                    color: "#15803d",
                  }}
                >
                  {taken}
                </strong>

              </div>

              <div style={styles.performanceRow}>

                <span>
                  Missed
                </span>

                <strong
                  style={{
                    color: "#dc2626",
                  }}
                >
                  {missed}
                </strong>

              </div>

              <div style={styles.performanceRow}>

                <span>
                  Status
                </span>

                <strong
                  style={{
                    color: statusColor,
                  }}
                >
                  {status}
                </strong>

              </div>

            </div>

          </div>

        </div>


        {/* REMINDER BREAKDOWN */}

        <div style={styles.card}>

          <div style={styles.cardHeader}>

            <div>
              <h2 style={styles.cardTitle}>
                Reminder Breakdown
              </h2>

              <p style={styles.cardSubtitle}>
                Status of your reminder events
              </p>
            </div>

          </div>


          <div style={styles.reminderStats}>

            {/* PENDING */}

            <div style={styles.reminderStat}>

              <div style={styles.reminderStatTop}>

                <span>
                  Pending
                </span>

                <strong>
                  {pendingReminders}
                </strong>

              </div>

              <div style={styles.barTrack}>

                <div
                  style={{
                    ...styles.bar,
                    width:
                      reminders.length > 0
                        ? `${(
                            pendingReminders /
                            reminders.length
                          ) * 100}%`
                        : "0%",
                    background:
                      "#f59e0b",
                  }}
                />

              </div>

            </div>


            {/* TAKEN */}

            <div style={styles.reminderStat}>

              <div style={styles.reminderStatTop}>

                <span>
                  Taken
                </span>

                <strong>
                  {takenReminders}
                </strong>

              </div>

              <div style={styles.barTrack}>

                <div
                  style={{
                    ...styles.bar,
                    width:
                      reminders.length > 0
                        ? `${(
                            takenReminders /
                            reminders.length
                          ) * 100}%`
                        : "0%",
                    background:
                      "#22c55e",
                  }}
                />

              </div>

            </div>


            {/* MISSED */}

            <div style={styles.reminderStat}>

              <div style={styles.reminderStatTop}>

                <span>
                  Missed
                </span>

                <strong>
                  {missedReminders}
                </strong>

              </div>

              <div style={styles.barTrack}>

                <div
                  style={{
                    ...styles.bar,
                    width:
                      reminders.length > 0
                        ? `${(
                            missedReminders /
                            reminders.length
                          ) * 100}%`
                        : "0%",
                    background:
                      "#ef4444",
                  }}
                />

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* ====================================================
          MEDICATION PERFORMANCE
      ==================================================== */}

      <div style={styles.card}>

        <div style={styles.cardHeader}>

          <div>
            <h2 style={styles.cardTitle}>
              Medication Performance
            </h2>

            <p style={styles.cardSubtitle}>
              Adherence breakdown by medication
            </p>
          </div>

        </div>


        {medications.length === 0 ? (

          <div style={styles.emptyState}>

            <div style={styles.emptyIcon}>
              📊
            </div>

            <h3 style={styles.emptyTitle}>
              No medication data
            </h3>

            <p style={styles.emptyText}>
              Add medications and complete
              reminder events to see analytics.
            </p>

          </div>

        ) : (

          <div style={styles.performanceList}>

            {medications.map(
              (medication) => {

                const performance =
                  getMedicationPerformance(
                    medication
                  );

                return (

                  <div
                    key={
                      medication.id
                    }
                    style={
                      styles.medicationRow
                    }
                  >

                    {/* NAME */}

                    <div
                      style={
                        styles.medicationInfo
                      }
                    >

                      <div
                        style={
                          styles.medicationIcon
                        }
                      >
                        💊
                      </div>

                      <div>

                        <div
                          style={
                            styles.medicationName
                          }
                        >
                          {
                            medication.medicine_name
                          }
                        </div>

                        <div
                          style={
                            styles.medicationDosage
                          }
                        >
                          {
                            medication.dosage
                          }{" "}
                          •{" "}
                          {
                            medication.frequency
                          }
                        </div>

                      </div>

                    </div>


                    {/* PROGRESS */}

                    <div
                      style={
                        styles.medicationProgress
                      }
                    >

                      <div
                        style={
                          styles.progressHeader
                        }
                      >

                        <span>
                          Adherence
                        </span>

                        <strong>
                          {formatPercentage(
                            performance.percentage
                          )}
                        </strong>

                      </div>

                      <div
                        style={
                          styles.barTrack
                        }
                      >

                        <div
                          style={{
                            ...styles.bar,
                            width:
                              `${performance.percentage}%`,
                            background:
                              performance.percentage >=
                              75
                                ? "#22c55e"
                                : performance.percentage >=
                                  50
                                  ? "#f59e0b"
                                  : "#ef4444",
                          }}
                        />

                      </div>

                    </div>


                    {/* COUNTS */}

                    <div
                      style={
                        styles.medicationCounts
                      }
                    >

                      <span
                        style={
                          styles.takenText
                        }
                      >
                        ✓{" "}
                        {performance.taken}
                      </span>

                      <span
                        style={
                          styles.missedText
                        }
                      >
                        !{" "}
                        {performance.missed}
                      </span>

                    </div>

                  </div>

                );

              }
            )}

          </div>

        )}

      </div>


      {/* ====================================================
          SUMMARY
      ==================================================== */}

      <div style={styles.insightCard}>

        <div style={styles.insightIcon}>
          🤖
        </div>

        <div>

          <h3 style={styles.insightTitle}>
            Analytics Insight
          </h3>

          <p style={styles.insightText}>

            {total === 0
              ? "Start tracking your medication doses to generate personalized adherence analytics."
              : safePercentage >= 90
                ? "Excellent work! Your medication adherence is very strong. Continue following your scheduled reminders."
                : safePercentage >= 75
                  ? "Your adherence is good, but there is room for improvement. Try to stay consistent with your reminder schedule."
                  : safePercentage >= 50
                    ? "Your adherence needs attention. Consider responding to reminders promptly and maintaining a consistent routine."
                    : "Your adherence is currently low. Please pay close attention to your medication schedule and consider discussing missed doses with a healthcare professional."}

          </p>

        </div>

      </div>

    </div>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = {

  page: {
    width: "100%",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  overallBadge: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 13px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "800",
  },

  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: "16px",
    marginBottom: "22px",
  },

  statCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "15px",
    padding: "19px",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    boxShadow:
      "0 3px 12px rgba(15,23,42,0.04)",
  },

  statIcon: {
    width: "46px",
    height: "46px",
    borderRadius: "12px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "21px",
    fontWeight: "800",
  },

  statLabel: {
    color: "#64748b",
    fontSize: "11px",
    fontWeight: "600",
  },

  statValue: {
    color: "#111827",
    fontSize: "24px",
    fontWeight: "800",
    marginTop: "3px",
  },

  statDescription: {
    color: "#94a3b8",
    fontSize: "10px",
    marginTop: "2px",
  },

  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "22px",
    marginBottom: "22px",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "22px",
    boxShadow:
      "0 4px 15px rgba(15,23,42,0.04)",
    marginBottom: "22px",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  cardTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "800",
    color: "#111827",
  },

  cardSubtitle: {
    margin: "5px 0 0",
    fontSize: "12px",
    color: "#64748b",
  },

  adherenceContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    gap: "30px",
    padding: "10px",
  },

  progressCircle: {
    width: "160px",
    height: "160px",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  progressInner: {
    width: "125px",
    height: "125px",
    borderRadius: "50%",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },

  performanceDetails: {
    width: "100%",
    maxWidth: "220px",
  },

  performanceRow: {
    display: "flex",
    justifyContent: "space-between",
    padding:
      "11px 0",
    borderBottom:
      "1px solid #f1f5f9",
    color: "#64748b",
    fontSize: "12px",
  },

  reminderStats: {
    display: "flex",
    flexDirection: "column",
    gap: "25px",
  },

  reminderStat: {
    width: "100%",
  },

  reminderStatTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
    fontSize: "12px",
    color: "#475569",
  },

  barTrack: {
    height: "9px",
    background: "#e5e7eb",
    borderRadius: "20px",
    overflow: "hidden",
    width: "100%",
  },

  bar: {
    height: "100%",
    borderRadius: "20px",
    transition:
      "width 0.5s ease",
  },

  performanceList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  medicationRow: {
    display: "grid",
    gridTemplateColumns:
      "1.2fr 1.4fr auto",
    alignItems: "center",
    gap: "25px",
    padding: "14px",
    borderRadius: "11px",
    background: "#f8fafc",
  },

  medicationInfo: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  medicationIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "#eef2ff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "18px",
  },

  medicationName: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#1e293b",
  },

  medicationDosage: {
    marginTop: "3px",
    color: "#64748b",
    fontSize: "10px",
  },

  medicationProgress: {
    width: "100%",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
    fontSize: "10px",
    color: "#64748b",
  },

  medicationCounts: {
    display: "flex",
    gap: "10px",
    fontSize: "11px",
    fontWeight: "800",
  },

  takenText: {
    color: "#15803d",
  },

  missedText: {
    color: "#dc2626",
  },

  emptyState: {
    textAlign: "center",
    padding: "50px 20px",
  },

  emptyIcon: {
    width: "62px",
    height: "62px",
    borderRadius: "17px",
    background: "#eef2ff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "29px",
    margin:
      "0 auto 14px",
  },

  emptyTitle: {
    margin:
      "0 0 7px",
    fontSize: "17px",
    fontWeight: "800",
    color: "#1e293b",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
  },

  insightCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "15px",
    background:
      "linear-gradient(135deg, #eef2ff, #f5f3ff)",
    border: "1px solid #ddd6fe",
    borderRadius: "15px",
    padding: "20px",
    marginBottom: "10px",
  },

  insightIcon: {
    width: "43px",
    height: "43px",
    borderRadius: "11px",
    background: "#ffffff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "21px",
    flexShrink: 0,
  },

  insightTitle: {
    margin:
      "2px 0 6px",
    fontSize: "15px",
    fontWeight: "800",
    color: "#312e81",
  },

  insightText: {
    margin: 0,
    color: "#5b21b6",
    fontSize: "12px",
    lineHeight: 1.6,
  },
};




