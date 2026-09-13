

import React, { useState } from "react";

function Medications({
  medications = [],
  onAddMedication,
  onUpdateMedication,
  onDeleteMedication,
  onToggleStatus,
  onMarkTaken,
  onMarkMissed,
}) {
  const [showModal, setShowModal] =
    useState(false);

  const [editingMedication, setEditingMedication] =
    useState(null);

  const [form, setForm] = useState({
    medicine_name: "",
    dosage: "",
    reminder_time: "",
    frequency: "Daily",
  });

  /* =======================================================
     OPEN ADD MODAL
  ======================================================= */

  const openAddModal = () => {

    setEditingMedication(null);

    setForm({
      medicine_name: "",
      dosage: "",
      reminder_time: "",
      frequency: "Daily",
    });

    setShowModal(true);
  };

  /* =======================================================
     OPEN EDIT MODAL
  ======================================================= */

  const openEditModal = (medication) => {

    setEditingMedication(
      medication
    );

    setForm({
      medicine_name:
        medication.medicine_name || "",

      dosage:
        medication.dosage || "",

      reminder_time:
        medication.reminder_time || "",

      frequency:
        medication.frequency || "Daily",
    });

    setShowModal(true);
  };

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeModal = () => {

    setShowModal(false);

    setEditingMedication(null);

    setForm({
      medicine_name: "",
      dosage: "",
      reminder_time: "",
      frequency: "Daily",
    });
  };

  /* =======================================================
     FORM CHANGE
  ======================================================= */

  const handleChange = (e) => {

    const {
      name,
      value,
    } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!form.medicine_name.trim()) {
      return;
    }

    if (!form.dosage.trim()) {
      return;
    }

    if (!form.reminder_time) {
      return;
    }

    if (editingMedication) {

      const success =
        await onUpdateMedication(
          editingMedication.id,
          {
            medicine_name:
              form.medicine_name.trim(),

            dosage:
              form.dosage.trim(),

            reminder_time:
              form.reminder_time,

            frequency:
              form.frequency,
          }
        );

      if (success) {
        closeModal();
      }

    } else {

      const success =
        await onAddMedication({
          medicine_name:
            form.medicine_name.trim(),

          dosage:
            form.dosage.trim(),

          reminder_time:
            form.reminder_time,

          frequency:
            form.frequency,
        });

      if (success) {
        closeModal();
      }
    }
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const handleDelete = async (
    medication
  ) => {

    const confirmed =
      window.confirm(
        `Delete ${medication.medicine_name}?`
      );

    if (!confirmed) {
      return;
    }

    await onDeleteMedication(
      medication.id
    );
  };

  /* =======================================================
     COUNTS
  ======================================================= */

  const total =
    medications.length;

  const active =
    medications.filter(
      (medication) =>
        medication.active
    ).length;

  const inactive =
    medications.filter(
      (medication) =>
        !medication.active
    ).length;

  const scheduled =
    medications.filter(
      (medication) =>
        medication.active &&
        medication.reminder_time
    ).length;

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="medications-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="page-header">

        <div>

          <h1>
            💊 Medications
          </h1>

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

      {/* ===================================================
          SUMMARY
      =================================================== */}

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

      </div>

      {/* ===================================================
          MEDICATION LIST
      =================================================== */}

      {medications.length === 0 ? (

        <div className="empty-state">

          <div className="empty-icon">
            💊
          </div>

          <h3>
            No medications yet
          </h3>

          <p>
            Add your first medication to start tracking reminders.
          </p>

          <button
            className="primary-button"
            onClick={openAddModal}
          >
            ＋ Add Medication
          </button>

        </div>

      ) : (

        <div className="table-container">

          <table className="medication-table">

            <thead>

              <tr>

                <th>
                  MEDICINE
                </th>

                <th>
                  DOSAGE
                </th>

                <th>
                  REMINDER
                </th>

                <th>
                  FREQUENCY
                </th>

                <th>
                  STATUS
                </th>

                <th>
                  ACTIONS
                </th>

              </tr>

            </thead>

            <tbody>

              {medications.map(
                (medication) => (

                  <tr
                    key={
                      medication.id
                    }
                  >

                    {/* MEDICINE */}

                    <td>

                      <div className="medicine-cell">

                        <div className="medicine-icon">
                          💊
                        </div>

                        <div>

                          <div className="medicine-name">
                            {
                              medication.medicine_name
                            }
                          </div>

                          <div className="medicine-id">
                            ID #{medication.id}
                          </div>

                        </div>

                      </div>

                    </td>

                    {/* DOSAGE */}

                    <td>
                      {
                        medication.dosage
                      }
                    </td>

                    {/* REMINDER */}

                    <td>

                      <span className="reminder-time">
                        ⏰{" "}
                        {
                          medication.reminder_time
                        }
                      </span>

                    </td>

                    {/* FREQUENCY */}

                    <td>
                      {
                        medication.frequency
                      }
                    </td>

                    {/* STATUS */}

                    <td>

                      <span
                        className={`status-badge ${
                          medication.active
                            ? "active"
                            : "inactive"
                        }`}
                      >

                        <span className="status-dot"></span>

                        {medication.active
                          ? "ACTIVE"
                          : "INACTIVE"}

                      </span>

                    </td>

                    {/* ACTIONS */}

                    <td>

                      <div className="action-buttons">

                        {/* EDIT */}

                        <button
                          className="action-button edit"
                          onClick={() =>
                            openEditModal(
                              medication
                            )
                          }
                        >
                          Edit
                        </button>

                        {/* ACTIVATE / DEACTIVATE */}

                        <button
                          className={`action-button ${
                            medication.active
                              ? "deactivate"
                              : "activate"
                          }`}
                          onClick={() =>
                            onToggleStatus(
                              medication
                            )
                          }
                        >
                          {medication.active
                            ? "Disable"
                            : "Activate"}
                        </button>

                        {/* TAKEN */}

                        <button
                          className="action-button taken"
                          onClick={() =>
                            onMarkTaken(
                              medication.id
                            )
                          }
                        >
                          Taken
                        </button>

                        {/* MISSED */}

                        <button
                          className="action-button missed"
                          onClick={() =>
                            onMarkMissed(
                              medication.id
                            )
                          }
                        >
                          Missed
                        </button>

                        {/* DELETE */}

                        <button
                          className="action-button delete"
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

      {/* ===================================================
          ADD / EDIT MODAL
      =================================================== */}

      {showModal && (

        <div
          className="modal-overlay"
          onClick={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {
              closeModal();
            }

          }}
        >

          <div className="modal">

            <div className="modal-header">

              <h2>
                {editingMedication
                  ? "Edit Medication"
                  : "Add Medication"}
              </h2>

              <button
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>

            </div>

            <form
              className="modal-form"
              onSubmit={handleSubmit}
            >

              {/* MEDICINE */}

              <label>

                Medicine Name

                <input
                  type="text"
                  name="medicine_name"
                  value={
                    form.medicine_name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter medicine name"
                  required
                />

              </label>

              {/* DOSAGE */}

              <label>

                Dosage

                <input
                  type="text"
                  name="dosage"
                  value={
                    form.dosage
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. 500 mg"
                  required
                />

              </label>

              {/* REMINDER */}

              <label>

                Reminder Time

                <input
                  type="time"
                  name="reminder_time"
                  value={
                    form.reminder_time
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

              </label>

              {/* FREQUENCY */}

              <label>

                Frequency

                <select
                  name="frequency"
                  value={
                    form.frequency
                  }
                  onChange={
                    handleChange
                  }
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

              </label>

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
                    ? "Save Changes"
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


