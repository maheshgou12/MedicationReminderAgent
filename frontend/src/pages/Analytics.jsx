import { useEffect, useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  API_URL,
  authFetch,
  getToken,
} from "../api";

export default function Analytics({
  medications = [],
  reminders = [],
  adherence = null,
}) {
  const [trend, setTrend] = useState([]);
  const [trendDays, setTrendDays] = useState(30);
  const [trendLoading, setTrendLoading] =
    useState(false);

  const loadTrend = async (days) => {
    const token = getToken();

    if (!token) {
      return;
    }

    setTrendLoading(true);

    try {
      const res = await authFetch(
        `${API_URL}/analytics/trend?days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();

        setTrend(
          Array.isArray(data.trend)
            ? data.trend
            : []
        );
      }
    } catch (error) {
      console.error(
        "Trend fetch error:",
        error
      );
    } finally {
      setTrendLoading(false);
    }
  };

  const handleExportCsv = async () => {
    const token = getToken();

    if (!token) {
      return;
    }

    try {
      const res = await authFetch(
        `${API_URL}/logs/export`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "medication_logs.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Export error:",
        error
      );
      alert("CSV export failed.");
    }
  };

  const handlePrintDoctorReport = () => {
    let user = { username: "Patient", email: "" };
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        user = JSON.parse(userStr);
      }
    } catch {
      // fallback
    }

    const printWindow = window.open("", "_blank", "width=850,height=1000");
    if (!printWindow) {
      alert("Please allow popups to view and print the doctor's report.");
      return;
    }

    const reportDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const totalDoses = adherence?.total_doses ?? 0;
    const takenDoses = adherence?.taken_doses ?? 0;
    const missedDoses = adherence?.missed_doses ?? 0;
    const adherenceRate = adherence?.percentage ?? 0;

    const medRows = (medications || [])
      .map((m, idx) => {
        let timesStr = "N/A";
        try {
          if (m.dose_times) {
            const parsed = typeof m.dose_times === "string" ? JSON.parse(m.dose_times) : m.dose_times;
            timesStr = Array.isArray(parsed) ? parsed.join(", ") : String(parsed);
          }
        } catch {
          timesStr = String(m.dose_times || "N/A");
        }

        return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${idx + 1}. ${m.medicine_name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.dosage || "N/A"}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.frequency || "Daily"} (${timesStr})</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.stock_remaining ?? "N/A"} units</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: ${m.is_active ? "#16a34a" : "#94a3b8"}">${m.is_active ? "ACTIVE" : "INACTIVE"}</td>
        </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Clinical Medication & Adherence Report - ${user.username || "Patient"}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; line-height: 1.5; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 14px; margin-bottom: 20px; }
    .header-title h1 { margin: 0; font-size: 22px; color: #1e3a8a; letter-spacing: -0.5px; }
    .header-title p { margin: 4px 0 0; color: #64748b; font-size: 12px; }
    .badge { display: inline-block; padding: 4px 10px; background: #eff6ff; color: #1d4ed8; border-radius: 9999px; font-weight: 700; font-size: 11px; text-transform: uppercase; }
    .grid-2 { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; margin-bottom: 20px; }
    .patient-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
    .patient-card h3 { margin: 0 0 8px; font-size: 12px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; }
    .metric-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; }
    .metric-row:last-child { border-bottom: none; }
    .table-container { margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #f1f5f9; padding: 9px; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; border-bottom: 2px solid #cbd5e1; }
    .score-box { background: ${adherenceRate >= 80 ? "#ecfdf5" : adherenceRate >= 50 ? "#fffbeb" : "#fef2f2"}; border: 1px solid ${adherenceRate >= 80 ? "#6ee7b7" : adherenceRate >= 50 ? "#fde68a" : "#fecaca"}; border-radius: 8px; padding: 14px; text-align: center; }
    .score-num { font-size: 32px; font-weight: 800; color: ${adherenceRate >= 80 ? "#047857" : adherenceRate >= 50 ? "#b45309" : "#b91c1c"}; margin: 0; }
    .footer-notes { margin-top: 35px; border-top: 1px solid #cbd5e1; padding-top: 14px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
    .sig-box { width: 220px; border-top: 1px solid #0f172a; margin-top: 40px; text-align: center; font-size: 11px; padding-top: 4px; }
    .no-print-bar { background: #1e293b; color: white; padding: 10px 16px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .no-print-bar button { background: #2563eb; color: white; border: none; padding: 8px 16px; font-weight: 600; border-radius: 6px; cursor: pointer; }
    @media print {
      .no-print-bar { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <span>🩺 <strong>Clinical Medication & Adherence Summary</strong> — Ready to Print or Save as PDF</span>
    <button onclick="window.print()">📥 Print / Save as PDF</button>
  </div>

  <div class="header">
    <div class="header-title">
      <h1>MedAssist · Clinical Adherence Report</h1>
      <p>Official Patient Medication Regimen & Compliance Record</p>
    </div>
    <div style="text-align: right;">
      <span class="badge">Official Clinical Summary</span>
      <p style="margin: 6px 0 0; color: #64748b; font-size: 11px;">Generated on: ${reportDate}</p>
    </div>
  </div>

  <div class="grid-2">
    <div class="patient-card">
      <h3>👤 Patient Identification</h3>
      <div class="metric-row"><span>Patient Name:</span> <strong>${user.username || "Patient"}</strong></div>
      <div class="metric-row"><span>Registered Account:</span> <span>${user.email || "Confidential"}</span></div>
      <div class="metric-row"><span>Active Prescriptions:</span> <strong>${(medications || []).filter((m) => m.is_active).length} medicines</strong></div>
      <div class="metric-row"><span>Total Tracked Doses:</span> <strong>${totalDoses} doses</strong></div>
    </div>

    <div class="score-box">
      <h3 style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Adherence Compliance Score</h3>
      <div class="score-num">${adherenceRate}%</div>
      <p style="margin: 4px 0 0; font-size: 12px; font-weight: 600; color: #334155;">
        ${takenDoses} Taken &nbsp;•&nbsp; ${missedDoses} Missed
      </p>
      <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">
        Evaluation: ${adherenceRate >= 85 ? "Optimal Therapeutic Compliance" : adherenceRate >= 65 ? "Moderate Compliance - Review Advised" : "High Risk / Non-Compliant"}
      </p>
    </div>
  </div>

  <div class="table-container">
    <h3 style="font-size: 13px; text-transform: uppercase; color: #1e3a8a; margin: 0 0 8px;">📋 Active Medication Regimen</h3>
    <table>
      <thead>
        <tr>
          <th>Medication Name</th>
          <th>Dosage</th>
          <th>Schedule & Times</th>
          <th>Inventory</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${medRows || '<tr><td colspan="5" style="padding: 14px; text-align: center; color: #64748b;">No medication records on file.</td></tr>'}
      </tbody>
    </table>
  </div>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
    <h3 style="margin: 0 0 6px; font-size: 12px; color: #1e3a8a; text-transform: uppercase;">🤖 AI Clinical Insights & Caregiver Notes</h3>
    <p style="margin: 0; font-size: 12px; color: #334155; line-height: 1.6;">
      ${adherenceRate >= 90
        ? "Patient demonstrates exemplary schedule adherence. All doses are confirmed within the target therapeutic window. Regimen recommended to continue as prescribed."
        : adherenceRate >= 75
        ? "Patient exhibits satisfactory adherence with sporadic missed doses. Recommend adjusting reminder time offsets to coincide with patient daily meal routines."
        : "Patient adherence has fallen below clinically safe parameters. High risk of therapeutic failure or rebound symptoms. Immediate consultation and dosage regimen re-evaluation is strongly indicated."}
    </p>
  </div>

  <div class="footer-notes">
    <div>
      <p style="margin: 0; font-weight: 600;">Physician / Clinical Notes:</p>
      <p style="margin: 4px 0 0; color: #94a3b8; font-style: italic;">_________________________________________________________________</p>
    </div>
    <div>
      <div class="sig-box">Doctor / Provider Signature</div>
    </div>
  </div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadTrend(trendDays);
  }, [trendDays]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const heatColor = (point) => {    if (!point || point.total === 0) {
      return "var(--border-soft)";
    }

    if (point.adherence >= 90) {
      return "#22c55e";
    }

    if (point.adherence >= 75) {
      return "#a3e635";
    }

    if (point.adherence >= 50) {
      return "#f59e0b";
    }

    return "#ef4444";
  };
  // ==========================================================
  // SAFE DATA
  // ==========================================================

  const stats = adherence || {};

  const total = Number(
    stats.total ??
      stats.total_logs ??
      stats.total_records ??
      stats.total_doses ??
      0
  );

  const taken = Number(
    stats.taken ??
      stats.taken_logs ??
      stats.taken_count ??
      stats.total_taken ??
      0
  );

  const missed = Number(
    stats.missed ??
      stats.missed_logs ??
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
  let statusColor = "var(--muted)";
  let statusBackground = "var(--border-soft)";

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
          ADHERENCE TREND
      ==================================================== */}

      <div style={styles.card}>

        <div style={styles.cardHeader}>

          <div>
            <h2 style={styles.cardTitle}>
              Adherence Trend
            </h2>

            <p style={styles.cardSubtitle}>
              Taken vs missed doses per day
            </p>
          </div>

          <div style={styles.trendControls}>
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                className={`filter-chip ${
                  trendDays === d ? "active" : ""
                }`}
                onClick={() =>
                  setTrendDays(d)
                }
              >
                {d}d
              </button>
            ))}

            <button
              className="secondary-button"
              onClick={handleExportCsv}
            >
              ⬇ CSV
            </button>

            <button
              className="primary-button"
              onClick={handlePrintDoctorReport}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              title="Download or Print Clinical Summary Report for your Doctor"
            >
              📄 Doctor's Report (PDF)
            </button>
          </div>

        </div>

        {trendLoading ? (
          <p style={styles.cardSubtitle}>
            Loading trend…
          </p>
        ) : trend.length === 0 ? (
          <p style={styles.cardSubtitle}>
            No data for this range yet.
          </p>
        ) : (
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={trend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) =>
                    d.slice(5)
                  }
                  tick={{
                    fontSize: 10,
                    fill: "var(--muted)",
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{
                    fontSize: 10,
                    fill: "var(--muted)",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background:
                      "var(--card)",
                    border:
                      "1px solid var(--border)",
                    borderRadius: "10px",
                    color: "var(--text)",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="taken"
                  name="Taken"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="missed"
                  name="Missed"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>


      {/* ====================================================
          CONSISTENCY HEATMAP
      ==================================================== */}

      <div style={styles.card}>

        <div style={styles.cardHeader}>

          <div>
            <h2 style={styles.cardTitle}>
              Consistency Heatmap
            </h2>

            <p style={styles.cardSubtitle}>
              Last {trendDays} days — green is
              better
            </p>
          </div>

        </div>

        <div style={styles.heatmap}>
          {trend.map((point) => (
            <div
              key={point.date}
              title={`${point.date}: ${
                point.total === 0
                  ? "no doses"
                  : `${point.adherence}% (${point.taken}✓/${point.missed}✕)`
              }`}
              style={{
                ...styles.heatmapCell,
                background: heatColor(point),
              }}
            />
          ))}
        </div>

        <div style={styles.heatmapLegend}>
          <span>Less</span>
          {[
            "var(--border-soft)",
            "#ef4444",
            "#f59e0b",
            "#a3e635",
            "#22c55e",
          ].map((c) => (
            <span
              key={c}
              style={{
                ...styles.heatmapKey,
                background: c,
              }}
            />
          ))}
          <span>More</span>
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
    color: "var(--heading)",
  },

  subtitle: {
    margin: "7px 0 0",
    color: "var(--muted)",
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
    background: "var(--card)",
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
    color: "var(--muted)",
    fontSize: "11px",
    fontWeight: "600",
  },

  statValue: {
    color: "var(--heading)",
    fontSize: "24px",
    fontWeight: "800",
    marginTop: "3px",
  },

  statDescription: {
    color: "var(--faint)",
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
    background: "var(--card)",
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
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },

  trendControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  heatmap: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(22px, 1fr))",
    gap: "6px",
  },

  heatmapCell: {
    aspectRatio: "1",
    borderRadius: "6px",
    minWidth: "22px",
  },

  heatmapLegend: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    marginTop: "12px",
    fontSize: "11px",
    color: "var(--muted)",
  },

  heatmapKey: {
    width: "14px",
    height: "14px",
    borderRadius: "4px",
    display: "inline-block",
  },

  cardTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "800",
    color: "var(--heading)",
  },

  cardSubtitle: {
    margin: "5px 0 0",
    fontSize: "12px",
    color: "var(--muted)",
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
    background: "var(--card)",
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
    color: "var(--muted)",
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
    color: "var(--text-soft)",
  },

  barTrack: {
    height: "9px",
    background: "var(--border)",
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
    background: "var(--bg-soft)",
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
    color: "var(--heading)",
  },

  medicationDosage: {
    marginTop: "3px",
    color: "var(--muted)",
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
    color: "var(--muted)",
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
    color: "var(--heading)",
  },

  emptyText: {
    margin: 0,
    color: "var(--muted)",
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
    background: "var(--card)",
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




