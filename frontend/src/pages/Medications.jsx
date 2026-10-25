import { useState } from "react";

function Medications({
  medications = [],
  onAddMedication,
  onUpdateMedication,
  onDeleteMedication,
  onToggleStatus,
  onMarkTaken,
  onMarkMissed,
  onRefill,
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");
  const [sortBy, setSortBy] = useState("name");

  const emptyForm = () => ({
    medicine_name: "",
    dosage: "",
    reminder_time: "",
    frequency: "Daily",
    extra_times: [],
    weekdays: [],
    stock_remaining: "",
    stock_threshold: "",
    doses_per_intake: 1,
  });

  const [form, setForm] = useState(emptyForm());

  const WEEKDAYS = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ];

  const isLowStock = (medication) =>
    medication.stock_remaining != null &&
    medication.stock_threshold != null &&
    Number(medication.stock_remaining) <=
      Number(medication.stock_threshold);

  const allTimes = (medication) => {
    const times = [];

    if (medication.reminder_time) {
      times.push(medication.reminder_time);
    }

    for (const t of medication.dose_times ||
      []) {
      if (t && !times.includes(t)) {
        times.push(t);
      }
    }

    return times.sort();
  };

  const daysLabel = (medication) => {
    if (
      !medication.weekdays ||
      medication.weekdays.length === 0 ||
      medication.weekdays.length === 7
    ) {
      return "Every day";
    }

    return medication.weekdays
      .map((d) => WEEKDAYS[d] || d)
      .join(", ");
  };

  /* =======================================================
     OPEN ADD MODAL
  ======================================================= */

  const openAddModal = () => {
    setEditingMedication(null);

    setForm(emptyForm());

    setShowModal(true);
  };

  /* =======================================================
     OPEN EDIT MODAL
  ======================================================= */

  const openEditModal = (medication) => {
    setEditingMedication(medication);

    setForm({
      medicine_name: medication.medicine_name || "",
      dosage: medication.dosage || "",
      reminder_time: medication.reminder_time || "",
      frequency: medication.frequency || "Daily",
      extra_times: (
        medication.dose_times || []
      ).filter(
        (t) => t !== medication.reminder_time
      ),
      weekdays: medication.weekdays || [],
      stock_remaining:
        medication.stock_remaining ?? "",
      stock_threshold:
        medication.stock_threshold ?? "",
      doses_per_intake:
        medication.doses_per_intake || 1,
    });

    setShowModal(true);
  };

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeModal = () => {
    setShowModal(false);
    setEditingMedication(null);

    setForm(emptyForm());
  };

  /* =======================================================
     FORM CHANGE
  ======================================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const toggleWeekday = (day) => {
    setForm((previous) => ({
      ...previous,
      weekdays: previous.weekdays.includes(day)
        ? previous.weekdays.filter(
            (d) => d !== day
          )
        : [...previous.weekdays, day].sort(),
    }));
  };

  const updateExtraTime = (index, value) => {
    setForm((previous) => {
      const extra = [...previous.extra_times];
      extra[index] = value;
      return { ...previous, extra_times: extra };
    });
  };

  const addExtraTime = () => {
    setForm((previous) => ({
      ...previous,
      extra_times: [...previous.extra_times, ""],
    }));
  };

  const removeExtraTime = (index) => {
    setForm((previous) => ({
      ...previous,
      extra_times: previous.extra_times.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const buildPayload = () => {
    const toIntOrNull = (v) => {
      if (v === "" || v == null) {
        return null;
      }

      const n = Number(v);

      return Number.isFinite(n) && n >= 0
        ? Math.floor(n)
        : null;
    };

    return {
      medicine_name: form.medicine_name.trim(),
      dosage: form.dosage.trim(),
      reminder_time: form.reminder_time,
      frequency: form.frequency,
      dose_times: form.extra_times.filter(
        (t) => t
      ),
      weekdays: [...form.weekdays].sort(),
      stock_remaining: toIntOrNull(
        form.stock_remaining
      ),
      stock_threshold: toIntOrNull(
        form.stock_threshold
      ),
      doses_per_intake:
        Math.max(
          1,
          Math.floor(
            Number(form.doses_per_intake) || 1
          )
        ),
    };
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.medicine_name.trim()) {
      alert("Please enter medicine name");
      return;
    }

    if (!form.dosage.trim()) {
      alert("Please enter dosage");
      return;
    }

    if (!form.reminder_time) {
      alert("Please select reminder time");
      return;
    }

    /* ===================================================
       EDIT MEDICATION
    =================================================== */

    if (editingMedication) {
      if (typeof onUpdateMedication !== "function") {
        console.error(
          "onUpdateMedication is not a function:",
          onUpdateMedication
        );

        alert("Update function is not available");
        return;
      }

      const success = await onUpdateMedication(
        editingMedication.id,
        buildPayload()
      );

      if (success) {
        closeModal();
      }

      return;
    }

    /* ===================================================
       ADD MEDICATION
    =================================================== */

    if (typeof onAddMedication !== "function") {
      console.error(
        "ERROR: onAddMedication is not a function:",
        onAddMedication
      );

      alert(
        "Add medication function is not connected. Check App.jsx."
      );

      return;
    }

    const medicationData = buildPayload();

    console.log(
      "Sending medication:",
      medicationData
    );

    const success = await onAddMedication(
      medicationData
    );

    console.log(
      "Add medication result:",
      success
    );

    if (success) {
      closeModal();
    }
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const handleDelete = async (medication) => {
    const confirmed = window.confirm(
      `Delete ${medication.medicine_name}?`
    );

    if (!confirmed) {
      return;
    }

    if (typeof onDeleteMedication !== "function") {
      console.error(
        "onDeleteMedication is not a function"
      );
      return;
    }

    await onDeleteMedication(medication.id);
  };

  /* =======================================================
     COUNTS + FILTER / SORT
  ======================================================= */

  const total = medications.length;

  const active = medications.filter(
    (medication) => medication.active
  ).length;

  const inactive = medications.filter(
    (medication) => !medication.active
  ).length;

  const lowStockCount = medications.filter(
    isLowStock
  ).length;

  const scheduled = medications.filter(
    (medication) =>
      medication.active &&
      medication.reminder_time
  ).length;

  const visibleMedications = medications
    .filter((medication) => {
      if (statusFilter === "active") {
        return medication.active;
      }

      if (statusFilter === "inactive") {
        return !medication.active;
      }

      if (statusFilter === "low-stock") {
        return isLowStock(medication);
      }

      return true;
    })
    .filter((medication) => {
      const q = search.trim().toLowerCase();

      if (!q) {
        return true;
      }

      return (
        medication.medicine_name
          ?.toLowerCase()
          .includes(q) ||
        medication.dosage
          ?.toLowerCase()
          .includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "time") {
        return (a.reminder_time || "").localeCompare(
          b.reminder_time || ""
        );
      }

      if (sortBy === "newest") {
        return new Date(b.created_at || 0) -
          new Date(a.created_at || 0);
      }

      return (a.medicine_name || "").localeCompare(
        b.medicine_name || ""
      );
    });

  const handleRefill = async (medication) => {
    const raw = window.prompt(
      `Refill ${medication.medicine_name} — how many doses to add?`,
      "30"
    );

    if (raw == null) {
      return;
    }

    const amount = Number(raw);

    if (!Number.isFinite(amount) || amount < 1) {
      alert("Enter a number of 1 or more.");
      return;
    }

    if (typeof onRefill === "function") {
      await onRefill(medication.id, Math.floor(amount));
    }
  };

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="medications-page">

      {/* HEADER */}

      <div className="page-header">

        <div>
          <h1>💊 Medications</h1>

          <p>
            Manage your medications and reminder schedules.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openAddModal}
        >
          <span>＋</span>
          Add Medication
        </button>

      </div>

      {/* SUMMARY */}

      <div className="medication-summary">

        <div className="summary-card">
          <div className="summary-label">
            Total Medications
          </div>

          <div className="summary-value">
            {total}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-label">
            Active
          </div>

          <div className="summary-value">
            {active}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-label">
            Inactive
          </div>

          <div className="summary-value">
            {inactive}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-label">
            Scheduled
          </div>

          <div className="summary-value">
            {scheduled}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-label">
            Low Stock
          </div>

          <div className="summary-value">
            {lowStockCount}
          </div>
        </div>

      </div>

      {/* SEARCH / FILTER / SORT */}

      <div className="filter-row">
        <input
          className="search-input"
          type="text"
          placeholder="🔍 Search by name or dosage…"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="all">
            All statuses
          </option>
          <option value="active">Active</option>
          <option value="inactive">
            Inactive
          </option>
          <option value="low-stock">
            Low stock
          </option>
        </select>

        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value)
          }
        >
          <option value="name">
            Sort: Name
          </option>
          <option value="time">
            Sort: Time
          </option>
          <option value="newest">
            Sort: Newest
          </option>
        </select>
      </div>

      {/* MEDICATION TABLE */}

      <div className="medications-card">

        <div className="card-header">

          <div>
            <h2>Your Medications</h2>

            <p>
              Track medicines and reminder schedules.
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={openAddModal}
          >
            + Add
          </button>

        </div>

        {medications.length === 0 ? (

          <div className="empty-state">

            <div className="empty-icon">
              💊
            </div>

            <h3>
              No medications yet
            </h3>

            <p>
              Add your first medication to start
              receiving reminders.
            </p>

            <button
              className="primary-button"
              onClick={openAddModal}
            >
              + Add Medication
            </button>

          </div>

        ) : visibleMedications.length === 0 ? (

          <div className="empty-state">

            <div className="empty-icon">
              🔍
            </div>

            <h3>
              No matches
            </h3>

            <p>
              Try a different search or filter.
            </p>

          </div>

        ) : (

          <div className="table-wrapper">

            <table className="medications-table">

              <thead>

                <tr>
                  <th>Medicine</th>
                  <th>Dosage</th>
                  <th>Schedule</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>

              </thead>

              <tbody>

                {visibleMedications.map(
                  (medication) => (

                    <tr key={medication.id}>

                      <td>
                        <strong>
                          {medication.medicine_name}
                        </strong>
                        <div className="cell-sub">
                          {medication.frequency}
                        </div>
                      </td>

                      <td>
                        {medication.dosage}
                      </td>

                      <td>
                        ⏰{" "}
                        {allTimes(medication).join(
                          ", "
                        )}
                        <div className="cell-sub">
                          {daysLabel(medication)}
                        </div>
                      </td>

                      <td>
                        {medication.stock_remaining ==
                        null ? (
                          <span className="cell-sub">
                            Not tracked
                          </span>
                        ) : (
                          <span
                            className={
                              isLowStock(medication)
                                ? "status-badge low-stock"
                                : "status-badge active"
                            }
                          >
                            📦{" "}
                            {
                              medication.stock_remaining
                            }
                            {isLowStock(
                              medication
                            ) && " — refill!"}
                          </span>
                        )}
                      </td>

                      <td>

                        <span
                          className={
                            medication.active
                              ? "status-badge active"
                              : "status-badge inactive"
                          }
                        >
                          {medication.active
                            ? "Active"
                            : "Inactive"}
                        </span>

                      </td>

                      <td>

                        <div className="action-buttons">

                          <button
                            className="action-button"
                            onClick={() =>
                              openEditModal(
                                medication
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="action-button"
                            onClick={() =>
                              onToggleStatus(
                                medication.id,
                                !medication.active
                              )
                            }
                          >
                            {medication.active
                              ? "Disable"
                              : "Activate"}
                          </button>

                          <button
                            className="action-button"
                            onClick={() =>
                              onMarkTaken(
                                medication.id
                              )
                            }
                          >
                            Taken
                          </button>

                          <button
                            className="action-button"
                            onClick={() =>
                              onMarkMissed(
                                medication.id
                              )
                            }
                          >
                            Missed
                          </button>

                          <button
                            className="action-button"
                            onClick={() =>
                              handleRefill(
                                medication
                              )
                            }
                          >
                            📦 Refill
                          </button>

                          <button
                            className="action-button danger"
                            onClick={() =>
                              handleDelete(
                                medication
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ===================================================
          ADD / EDIT MODAL
      =================================================== */}

      {showModal && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>

                <h2>
                  {editingMedication
                    ? "Edit Medication"
                    : "Add Medication"}
                </h2>

                <p>
                  {editingMedication
                    ? "Update medication details."
                    : "Add a medicine and reminder schedule."}
                </p>

              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                type="button"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="medication-form"
            >

              {/* MEDICINE NAME */}

              <div className="form-group">

                <label>
                  Medicine Name
                </label>

                <input
                  type="text"
                  name="medicine_name"
                  value={form.medicine_name}
                  onChange={handleChange}
                  placeholder="e.g. Paracetamol"
                  required
                />

              </div>

              {/* DOSAGE */}

              <div className="form-group">

                <label>
                  Dosage
                </label>

                <input
                  type="text"
                  name="dosage"
                  value={form.dosage}
                  onChange={handleChange}
                  placeholder="e.g. 500 mg"
                  required
                />

              </div>

              {/* REMINDER TIME */}

              <div className="form-group">

                <label>
                  Reminder Time
                </label>

                <input
                  type="time"
                  name="reminder_time"
                  value={form.reminder_time}
                  onChange={handleChange}
                  required
                />

              </div>

              {/* FREQUENCY */}

              <div className="form-group">

                <label>
                  Frequency
                </label>

                <select
                  name="frequency"
                  value={form.frequency}
                  onChange={handleChange}
                >

                  <option value="Daily">
                    Daily
                  </option>

                  <option value="Twice Daily">
                    Twice Daily
                  </option>

                  <option value="Weekly">
                    Weekly
                  </option>

                  <option value="As Needed">
                    As Needed
                  </option>

                </select>

              </div>

              {/* EXTRA DOSE TIMES */}

              <div className="form-group">

                <label>
                  Extra dose times (optional)
                </label>

                {form.extra_times.map(
                  (t, i) => (
                    <div
                      key={i}
                      className="inline-row"
                    >
                      <input
                        type="time"
                        value={t}
                        onChange={(e) =>
                          updateExtraTime(
                            i,
                            e.target.value
                          )
                        }
                      />
                      <button
                        type="button"
                        className="action-button danger"
                        onClick={() =>
                          removeExtraTime(i)
                        }
                      >
                        ✕
                      </button>
                    </div>
                  )
                )}

                <button
                  type="button"
                  className="secondary-button"
                  onClick={addExtraTime}
                >
                  + Add time
                </button>

              </div>

              {/* WEEKDAYS */}

              <div className="form-group">

                <label>
                  Days (none selected = every day)
                </label>

                <div className="weekday-row">
                  {WEEKDAYS.map((label, day) => (
                    <button
                      key={day}
                      type="button"
                      className={`weekday-chip ${
                        form.weekdays.includes(day)
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        toggleWeekday(day)
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>

              </div>

              {/* STOCK */}

              <div className="form-row-2">
                <div className="form-group">
                  <label>
                    Stock (doses left)
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="stock_remaining"
                    value={form.stock_remaining}
                    onChange={handleChange}
                    placeholder="e.g. 30"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Low-stock alert at
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="stock_threshold"
                    value={form.stock_threshold}
                    onChange={handleChange}
                    placeholder="e.g. 5"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  Doses per intake
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  name="doses_per_intake"
                  value={form.doses_per_intake}
                  onChange={handleChange}
                />
              </div>

              {/* BUTTONS */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingMedication
                    ? "Update Medication"
                    : "Add Medication"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Medications;



