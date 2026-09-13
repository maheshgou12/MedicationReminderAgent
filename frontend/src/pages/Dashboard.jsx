import React from "react";

export default function Dashboard({
  medications = [],
  reminders = [],
  adherence = null,
}) {

  // ----------------------------------------------------------
  // SAFE ADHERENCE DATA
  // ----------------------------------------------------------

  const safeAdherence = adherence || {};

  const total =
    Number(
      safeAdherence.total ??
      safeAdherence.total_records ??
      safeAdherence.total_doses ??
      0
    );

  const taken =
    Number(
      safeAdherence.taken ??
      safeAdherence.taken_count ??
      safeAdherence.total_taken ??
      0
    );

  const missed =
    Number(
      safeAdherence.missed ??
      safeAdherence.missed_count ??
      safeAdherence.total_missed ??
      0
    );

  const adherencePercentage =
    Number(
      safeAdherence.adherence_percentage ??
      safeAdherence.percentage ??
      (total > 0
        ? (taken / total) * 100
        : 0)
    );

  const safePercentage = Math.min(
    100,
    Math.max(
      0,
      adherencePercentage || 0
    )
  );


  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  let status = "No Data";
  let statusBackground = "#f1f5f9";
  let statusColor = "#64748b";

  if (safePercentage >= 90) {
    status = "Excellent";
    statusBackground = "#dcfce7";
    statusColor = "#15803d";
  } else if (safePercentage >= 75) {
    status = "Good";
    statusBackground = "#fef9c3";
    statusColor = "#a16207";
  } else if (safePercentage >= 50) {
    status = "Needs Attention";
    statusBackground = "#ffedd5";
    statusColor = "#c2410c";
  } else if (total > 0) {
    status = "Critical";
    statusBackground = "#fee2e2";
    statusColor = "#dc2626";
  }


  // ----------------------------------------------------------
  // ACTIVE MEDICATIONS
  // ----------------------------------------------------------

  const activeMedications =
    medications.filter(
      (medication) =>
        medication.active !== false
    );


  // ----------------------------------------------------------
  // RECENT DATA
  // ----------------------------------------------------------

  const recentMedications =
    [...medications]
      .sort(
        (a, b) =>
          new Date(
            b.created_at || 0
          ) -
          new Date(
            a.created_at || 0
          )
      )
      .slice(0, 5);


  const recentReminders =
    [...reminders]
      .sort(
        (a, b) =>
          new Date(
            b.scheduled_at || 0
          ) -
          new Date(
            a.scheduled_at || 0
          )
      )
      .slice(0, 5);


  // ----------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------

  const formatDateTime = (value) => {

    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  };


  const getReminderStatusStyle =
    (reminderStatus) => {

      const normalized =
        String(
          reminderStatus || ""
        ).toUpperCase();

      if (
        normalized === "TAKEN"
      ) {
        return {
          background: "#dcfce7",
          color: "#15803d",
        };
      }

      if (
        normalized === "MISSED"
      ) {
        return {
          background: "#fee2e2",
          color: "#dc2626",
        };
      }

      return {
        background: "#fef3c7",
        color: "#b45309",
      };
    };


  // ----------------------------------------------------------
  // DASHBOARD
  // ----------------------------------------------------------

  return (
    <div style={styles.container}>

      {/* HEADER */}

      <div style={styles.header}>

        <div>
          <h1 style={styles.title}>
            Dashboard
          </h1>

          <p style={styles.subtitle}>
            Overview of your medication
            management and adherence
          </p>
        </div>

        <div style={styles.statusBadge}>
          <span
            style={{
              ...styles.statusDot,
              background:
                statusColor,
            }}
          />

          <span
            style={{
              color:
                statusColor,
            }}
          >
            {status}
          </span>
        </div>

      </div>


      {/* STAT CARDS */}

      <div style={styles.statsGrid}>

        {/* MEDICATIONS */}

        <div style={styles.statCard}>

          <div
            style={{
              ...styles.statIcon,
              background: "#eef2ff",
            }}
          >
            💊
          </div>

          <div>
            <p style={styles.statLabel}>
              Medications
            </p>

            <h2 style={styles.statValue}>
              {activeMedications.length}
            </h2>

            <p style={styles.statDescription}>
              Active medications
            </p>
          </div>

        </div>


        {/* REMINDERS */}

        <div style={styles.statCard}>

          <div
            style={{
              ...styles.statIcon,
              background: "#ecfeff",
            }}
          >
            ⏰
          </div>

          <div>
            <p style={styles.statLabel}>
              Reminders
            </p>

            <h2 style={styles.statValue}>
              {reminders.length}
            </h2>

            <p style={styles.statDescription}>
              Scheduled events
            </p>
          </div>

        </div>


        {/* ADHERENCE */}

        <div style={styles.statCard}>

          <div
            style={{
              ...styles.statIcon,
              background: "#f0fdf4",
            }}
          >
            📈
          </div>

          <div>
            <p style={styles.statLabel}>
              Adherence
            </p>

            <h2 style={styles.statValue}>
              {safePercentage.toFixed(1)}%
            </h2>

            <p style={styles.statDescription}>
              Medication adherence
            </p>
          </div>

        </div>


        {/* MISSED */}

        <div style={styles.statCard}>

          <div
            style={{
              ...styles.statIcon,
              background: "#fff1f2",
            }}
          >
            ⚠️
          </div>

          <div>
            <p style={styles.statLabel}>
              Missed
            </p>

            <h2 style={styles.statValue}>
              {missed}
            </h2>

            <p style={styles.statDescription}>
              Missed medication doses
            </p>
          </div>

        </div>

      </div>


      {/* MAIN GRID */}

      <div style={styles.mainGrid}>

        {/* ADHERENCE CARD */}

        <div style={styles.card}>

          <div style={styles.cardHeader}>

            <div>
              <h2 style={styles.cardTitle}>
                Adherence Overview
              </h2>

              <p style={styles.cardSubtitle}>
                Your medication-taking performance
              </p>
            </div>

            <div
              style={{
                ...styles.percentageCircle,
                background:
                  statusBackground,
                color:
                  statusColor,
              }}
            >
              {safePercentage.toFixed(0)}%
            </div>

          </div>


          {/* PROGRESS */}

          <div style={styles.progressSection}>

            <div style={styles.progressHeader}>

              <span>
                Overall adherence
              </span>

              <strong>
                {safePercentage.toFixed(1)}%
              </strong>

            </div>

            <div style={styles.progressTrack}>

              <div
                style={{
                  ...styles.progressBar,
                  width:
                    `${safePercentage}%`,
                }}
              />

            </div>

          </div>


          {/* ADHERENCE NUMBERS */}

          <div style={styles.adherenceStats}>

            <div style={styles.adherenceItem}>

              <div
                style={{
                  ...styles.smallIcon,
                  background: "#dcfce7",
                }}
              >
                ✓
              </div>

              <div>

                <div style={styles.smallValue}>
                  {taken}
                </div>

                <div style={styles.smallLabel}>
                  Taken
                </div>

              </div>

            </div>


            <div style={styles.adherenceItem}>

              <div
                style={{
                  ...styles.smallIcon,
                  background: "#fee2e2",
                }}
              >
                ✕
              </div>

              <div>

                <div style={styles.smallValue}>
                  {missed}
                </div>

                <div style={styles.smallLabel}>
                  Missed
                </div>

              </div>

            </div>


            <div style={styles.adherenceItem}>

              <div
                style={{
                  ...styles.smallIcon,
                  background: "#e0e7ff",
                }}
              >
                #
              </div>

              <div>

                <div style={styles.smallValue}>
                  {total}
                </div>

                <div style={styles.smallLabel}>
                  Total
                </div>

              </div>

            </div>

          </div>

        </div>


        {/* AI CARD */}

        <div style={styles.aiCard}>

          <div style={styles.aiIcon}>
            🤖
          </div>

          <div>

            <h2 style={styles.aiTitle}>
              AI Medication Assistant
            </h2>

            <p style={styles.aiText}>
              Your medication data is being
              analyzed to provide personalized
              adherence insights and smarter
              reminders.
            </p>

            <div style={styles.aiFeatures}>

              <span>
                ✓ Adherence analysis
              </span>

              <span>
                ✓ Smart recommendations
              </span>

              <span>
                ✓ Reminder intelligence
              </span>

            </div>

          </div>

        </div>

      </div>


      {/* RECENT MEDICATIONS */}

      <div style={styles.card}>

        <div style={styles.cardHeader}>

          <div>
            <h2 style={styles.cardTitle}>
              Recent Medications
            </h2>

            <p style={styles.cardSubtitle}>
              Your latest medication records
            </p>
          </div>

        </div>


        {recentMedications.length === 0 ? (

          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              💊
            </div>

            <h3>
              No medications yet
            </h3>

            <p>
              Add your first medication
              from the Medications page.
            </p>
          </div>

        ) : (

          <div style={styles.tableWrapper}>

            <table style={styles.table}>

              <thead>

                <tr>

                  <th style={styles.th}>
                    Medicine
                  </th>

                  <th style={styles.th}>
                    Dosage
                  </th>

                  <th style={styles.th}>
                    Reminder
                  </th>

                  <th style={styles.th}>
                    Frequency
                  </th>

                  <th style={styles.th}>
                    Status
                  </th>

                </tr>

              </thead>

              <tbody>

                {recentMedications.map(
                  (medication) => (

                    <tr
                      key={
                        medication.id
                      }
                    >

                      <td style={styles.td}>
                        <strong>
                          {medication.medicine_name}
                        </strong>
                      </td>

                      <td style={styles.td}>
                        {medication.dosage}
                      </td>

                      <td style={styles.td}>
                        {medication.reminder_time}
                      </td>

                      <td style={styles.td}>
                        {medication.frequency}
                      </td>

                      <td style={styles.td}>

                        <span
                          style={{
                            ...styles.badge,
                            background:
                              medication.active
                                ? "#dcfce7"
                                : "#f1f5f9",
                            color:
                              medication.active
                                ? "#15803d"
                                : "#64748b",
                          }}
                        >
                          {medication.active
                            ? "Active"
                            : "Inactive"}
                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* RECENT REMINDERS */}

      <div style={styles.card}>

        <div style={styles.cardHeader}>

          <div>
            <h2 style={styles.cardTitle}>
              Recent Reminders
            </h2>

            <p style={styles.cardSubtitle}>
              Latest reminder events
            </p>
          </div>

        </div>


        {recentReminders.length === 0 ? (

          <div style={styles.emptyState}>

            <div style={styles.emptyIcon}>
              ⏰
            </div>

            <h3>
              No reminder events
            </h3>

            <p>
              Reminder events will appear
              here when scheduled.
            </p>

          </div>

        ) : (

          <div style={styles.reminderList}>

            {recentReminders.map(
              (reminder) => {

                const reminderStyle =
                  getReminderStatusStyle(
                    reminder.status
                  );

                const medication =
                  medications.find(
                    (item) =>
                      item.id ===
                      reminder.medication_id
                  );

                return (

                  <div
                    key={
                      reminder.id
                    }
                    style={styles.reminderRow}
                  >

                    <div
                      style={
                        styles.reminderLeft
                      }
                    >

                      <div
                        style={
                          styles.reminderIcon
                        }
                      >
                        💊
                      </div>

                      <div>

                        <div
                          style={
                            styles.reminderMedicine
                          }
                        >
                          {medication
                            ?.medicine_name ||
                            `Medication #${reminder.medication_id}`}
                        </div>

                        <div
                          style={
                            styles.reminderTime
                          }
                        >
                          {formatDateTime(
                            reminder.scheduled_at
                          )}
                        </div>

                      </div>

                    </div>


                    <span
                      style={{
                        ...styles.badge,
                        background:
                          reminderStyle.background,
                        color:
                          reminderStyle.color,
                      }}
                    >
                      {reminder.status ||
                        "PENDING"}
                    </span>

                  </div>

                );

              }
            )}

          </div>

        )}

      </div>


      {/* FOOTER */}

      <div style={styles.footer}>

        <span>
          💊 Medication Reminder Agent
        </span>

        <span>
          AI-powered medication management
        </span>

      </div>

    </div>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles = {

  container: {
    width: "100%",
  },


  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "28px",
  },


  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "800",
    color: "#111827",
  },


  subtitle: {
    margin:
      "7px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },


  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding:
      "10px 15px",
    borderRadius: "20px",
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    fontSize: "13px",
    fontWeight: "700",
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
    gap: "18px",
    marginBottom: "22px",
  },


  statCard: {
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 4px 15px rgba(15, 23, 42, 0.04)",
  },


  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "23px",
    flexShrink: 0,
  },


  statLabel: {
    margin: 0,
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "600",
  },


  statValue: {
    margin:
      "3px 0",
    fontSize: "25px",
    fontWeight: "800",
    color: "#111827",
  },


  statDescription: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "11px",
  },


  mainGrid: {
    display: "grid",
    gridTemplateColumns:
      "1.4fr 1fr",
    gap: "22px",
    marginBottom: "22px",
  },


  card: {
    background: "#ffffff",
    border:
      "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "22px",
    marginBottom: "22px",
    boxShadow:
      "0 4px 15px rgba(15, 23, 42, 0.04)",
  },


  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
  },


  cardTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "800",
    color: "#111827",
  },


  cardSubtitle: {
    margin:
      "5px 0 0",
    color: "#64748b",
    fontSize: "12px",
  },


  percentageCircle: {
    minWidth: "55px",
    height: "55px",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "800",
    fontSize: "14px",
  },


  progressSection: {
    marginBottom: "22px",
  },


  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "9px",
  },


  progressTrack: {
    height: "10px",
    background: "#e5e7eb",
    borderRadius: "20px",
    overflow: "hidden",
  },


  progressBar: {
    height: "100%",
    background:
      "linear-gradient(90deg, #4f46e5, #7c3aed)",
    borderRadius: "20px",
    transition:
      "width 0.5s ease",
  },


  adherenceStats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "10px",
  },


  adherenceItem: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "10px",
    background: "#f8fafc",
    borderRadius: "10px",
  },


  smallIcon: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "800",
    fontSize: "13px",
  },


  smallValue: {
    fontWeight: "800",
    fontSize: "15px",
    color: "#111827",
  },


  smallLabel: {
    fontSize: "10px",
    color: "#64748b",
  },


  aiCard: {
    background:
      "linear-gradient(135deg, #eef2ff, #f5f3ff)",
    border:
      "1px solid #ddd6fe",
    borderRadius: "16px",
    padding: "24px",
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
    marginBottom: "0",
  },


  aiIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "13px",
    background: "#ffffff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "23px",
    flexShrink: 0,
  },


  aiTitle: {
    margin:
      "2px 0 8px",
    fontSize: "17px",
    fontWeight: "800",
    color: "#312e81",
  },


  aiText: {
    margin: 0,
    color: "#5b21b6",
    fontSize: "12px",
    lineHeight: 1.6,
  },


  aiFeatures: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "15px",
    fontSize: "11px",
    color: "#4338ca",
    fontWeight: "600",
  },


  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },


  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "650px",
  },


  th: {
    textAlign: "left",
    padding:
      "12px 10px",
    fontSize: "11px",
    color: "#64748b",
    fontWeight: "700",
    borderBottom:
      "1px solid #e5e7eb",
    textTransform:
      "uppercase",
  },


  td: {
    padding:
      "14px 10px",
    fontSize: "13px",
    color: "#475569",
    borderBottom:
      "1px solid #f1f5f9",
  },


  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding:
      "5px 9px",
    borderRadius: "20px",
    fontSize: "10px",
    fontWeight: "800",
  },


  reminderList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },


  reminderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "13px",
    borderRadius: "11px",
    background: "#f8fafc",
  },


  reminderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },


  reminderIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    background: "#eef2ff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "18px",
  },


  reminderMedicine: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#1e293b",
  },


  reminderTime: {
    marginTop: "3px",
    fontSize: "11px",
    color: "#64748b",
  },


  emptyState: {
    textAlign: "center",
    padding: "35px 20px",
    color: "#64748b",
  },


  emptyIcon: {
    fontSize: "35px",
    marginBottom: "8px",
  },


  footer: {
    display: "flex",
    justifyContent: "space-between",
    padding:
      "10px 4px 20px",
    color: "#94a3b8",
    fontSize: "11px",
  },

};
