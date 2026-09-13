function Reminders({ reminders, medications }) {
  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1>⏰ Reminders</h1>
          <p style={styles.subtitle}>
            Track your medication reminder events
          </p>
        </div>

        <div style={styles.count}>
          {reminders.length} Events
        </div>
      </div>

      {reminders.length === 0 ? (
        <div style={styles.empty}>
          <h2>⏰ No reminders yet</h2>
          <p>
            Your medication reminders will appear here.
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {reminders.map((reminder) => {
            const medication = medications.find(
              (med) =>
                med.id === reminder.medication_id
            );

            return (
              <div
                key={reminder.id}
                style={styles.card}
              >
                <div style={styles.top}>
                  <h2>
                    💊{" "}
                    {medication
                      ? medication.medicine_name
                      : `Medication #${reminder.medication_id}`}
                  </h2>

                  <span
                    style={getStatusStyle(
                      reminder.status
                    )}
                  >
                    {reminder.status}
                  </span>
                </div>

                {medication && (
                  <>
                    <p>
                      <strong>Dosage:</strong>{" "}
                      {medication.dosage}
                    </p>

                    <p>
                      <strong>Frequency:</strong>{" "}
                      {medication.frequency}
                    </p>
                  </>
                )}

                <p>
                  <strong>Scheduled:</strong>
                </p>

                <p style={styles.date}>
                  {new Date(
                    reminder.scheduled_at
                  ).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getStatusStyle(status) {
  if (status === "TAKEN") {
    return {
      ...styles.status,
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "MISSED") {
    return {
      ...styles.status,
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    ...styles.status,
    background: "#fef3c7",
    color: "#92400e",
  };
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },

  subtitle: {
    color: "#777",
  },

  count: {
    padding: "10px 16px",
    background: "#eef2ff",
    color: "#4f46e5",
    borderRadius: "20px",
    fontWeight: "600",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "22px",
  },

  card: {
    background: "white",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
  },

  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
  },

  status: {
    padding: "6px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
  },

  date: {
    color: "#555",
    fontSize: "15px",
  },

  empty: {
    background: "white",
    padding: "50px",
    textAlign: "center",
    borderRadius: "12px",
  },
};

export default Reminders;



