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
  const [showModal, setShowModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);

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
    setEditingMedication(medication);

    setForm({
      medicine_name: medication.medicine_name || "",
      dosage: medication.dosage || "",
      reminder_time: medication.reminder_time || "",
      frequency: medication.frequency || "Daily",
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
    const { name, value } = e.target;

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

    /* STEP 1 DEBUG */
    console.log(
      "DEBUG onAddMedication:",
      typeof onAddMedication,
      onAddMedication
    );

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
        {
          medicine_name: form.medicine_name.trim(),
          dosage: form.dosage.trim(),
          reminder_time: form.reminder_time,
          frequency: form.frequency,
        }
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

    const medicationData = {
      medicine_name: form.medicine_name.trim(),
      dosage: form.dosage.trim(),
      reminder_time: form.reminder_time,
      frequency: form.frequency,
    };

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
     COUNTS
  ======================================================= */

  const total = medications.length;

  const active = medications.filter(
    (medication) => medication.active
  ).length;

  const inactive = medications.filter(
    (medication) => !medication.active
  ).length;

  const scheduled = medications.filter(
    (medication) =>
      medication.active &&
      medication.reminder_time
  ).length;

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

        ) : (

          <div className="table-wrapper">

            <table className="medications-table">

              <thead>

                <tr>
                  <th>Medicine</th>
                  <th>Dosage</th>
                  <th>Reminder</th>
                  <th>Frequency</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>

              </thead>

              <tbody>

                {medications.map(
                  (medication) => (

                    <tr key={medication.id}>

                      <td>
                        <strong>
                          {medication.medicine_name}
                        </strong>
                      </td>

                      <td>
                        {medication.dosage}
                      </td>

                      <td>
                        ⏰{" "}
                        {medication.reminder_time}
                      </td>

                      <td>
                        {medication.frequency}
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



