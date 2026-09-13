import streamlit as st
import requests

st.title("💊 Medication Reminder Agent")

st.header("Add Medication")

medicine_name = st.text_input("Medicine Name")
dosage = st.text_input("Dosage")
reminder_time = st.text_input("Reminder Time")
frequency = st.selectbox(
    "Frequency",
    ["Daily", "Weekly", "Monthly"]
)

if st.button("Add Medication"):

    response = requests.post(
        "http://127.0.0.1:8000/add-medication",
        params={
            "medicine_name": medicine_name,
            "dosage": dosage,
            "reminder_time": reminder_time,
            "frequency": frequency
        }
    )

    st.success("Medication Added Successfully")

st.header("Saved Medications")

response = requests.get("http://127.0.0.1:8000/medications")

medications = response.json()

for med in medications:
    st.write(f"💊 {med['medicine_name']}")
    st.write(f"Dosage: {med['dosage']}")
    st.write(f"Reminder Time: {med['reminder_time']}")
    st.write(f"Frequency: {med['frequency']}")
    st.write("-------------------")



    