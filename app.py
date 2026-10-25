"""Lightweight Streamlit client for the Medication Reminder Agent API.

Uses the same JWT endpoints as the React frontend:
  POST /register (JSON) -> create account
  POST /login (OAuth2 form) -> access_token
  GET  /medications (Bearer) -> list own medications
  POST /users/{id}/medications (Bearer) -> add
  POST /medications/{id}/taken | /missed (Bearer)
"""

import os

import requests
import streamlit as st

API_URL = os.getenv("API_URL", "http://127.0.0.1:8000")


def auth_headers() -> dict:
    token = st.session_state.get("access_token")
    return {"Authorization": f"Bearer {token}"} if token else {}


def decode_user_id(token: str):
    try:
        import base64
        import json

        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return int(json.loads(base64.b64decode(payload))["sub"])
    except Exception:
        return None


st.title("💊 Medication Reminder Agent")

# ----------------------------------------------------------
# AUTH
# ----------------------------------------------------------
if "access_token" not in st.session_state:
    tab_login, tab_register = st.tabs(["Login", "Register"])

    with tab_login:
        email = st.text_input("Email", key="login_email")
        password = st.text_input("Password", type="password", key="login_pw")
        if st.button("Login"):
            try:
                r = requests.post(
                    f"{API_URL}/login",
                    data={"username": email, "password": password},
                    timeout=10,
                )
                if not r.ok:
                    st.error(r.json().get("detail", "Login failed"))
                else:
                    data = r.json()
                    st.session_state["access_token"] = data["access_token"]
                    st.session_state["user_id"] = data.get("user_id")
                    st.success("Logged in. Rerunning…")
                    st.rerun()
            except Exception as e:
                st.error(f"API unreachable at {API_URL}: {e}")

    with tab_register:
        username = st.text_input("Username", key="reg_user")
        email = st.text_input("Email", key="reg_email")
        password = st.text_input("Password", type="password", key="reg_pw")
        if st.button("Register"):
            try:
                r = requests.post(
                    f"{API_URL}/register",
                    json={
                        "username": username,
                        "email": email,
                        "password": password,
                    },
                    timeout=10,
                )
                if not r.ok:
                    st.error(r.json().get("detail", "Registration failed"))
                else:
                    st.success("Registered. Please log in.")
            except Exception as e:
                st.error(f"API unreachable at {API_URL}: {e}")
    st.stop()

# ----------------------------------------------------------
# LOGGED-IN VIEW
# ----------------------------------------------------------
user_id = st.session_state.get("user_id") or decode_user_id(
    st.session_state["access_token"]
)

col_a, col_b = st.columns([3, 1])
col_a.subheader("Your Medications")
if col_b.button("Logout"):
    st.session_state.clear()
    st.rerun()

# --- Add medication ---
st.header("Add Medication")
with st.form("add_med"):
    medicine_name = st.text_input("Medicine Name")
    dosage = st.text_input("Dosage (e.g. 500 mg)")
    reminder_time = st.time_input("Reminder Time")
    frequency = st.selectbox(
        "Frequency", ["Daily", "Twice Daily", "Weekly", "As Needed"]
    )
    submitted = st.form_submit_button("Add Medication")

if submitted:
    if not medicine_name.strip() or not dosage.strip():
        st.warning("Medicine name and dosage are required.")
    elif not user_id:
        st.error("Could not determine user id from token. Log in again.")
    else:
        try:
            r = requests.post(
                f"{API_URL}/users/{user_id}/medications",
                json={
                    "medicine_name": medicine_name.strip(),
                    "dosage": dosage.strip(),
                    "reminder_time": reminder_time.strftime("%H:%M"),
                    "frequency": frequency,
                },
                headers=auth_headers(),
                timeout=10,
            )
            if r.ok:
                st.success("Medication added.")
            else:
                st.error(r.json().get("detail", "Add failed"))
        except Exception as e:
            st.error(f"API error: {e}")

# --- List medications ---
st.header("Saved Medications")
try:
    r = requests.get(f"{API_URL}/medications", headers=auth_headers(), timeout=10)
    if r.status_code == 401:
        st.error("Session expired. Logging out…")
        st.session_state.clear()
        st.rerun()
    meds = r.json() if r.ok else []
except Exception as e:
    st.error(f"Could not load medications: {e}")
    meds = []

for med in meds:
    status = "🟢 Active" if med.get("active") else "⚪ Inactive"
    st.write(
        f"💊 **{med['medicine_name']}** ({med['dosage']}) "
        f"⏰ {med['reminder_time']} · {med['frequency']} · {status}"
    )
    c1, c2 = st.columns(2)
    if c1.button("Taken ✅", key=f"taken-{med['id']}"):
        requests.post(
            f"{API_URL}/medications/{med['id']}/taken",
            headers=auth_headers(),
            timeout=10,
        )
        st.rerun()
    if c2.button("Missed ❌", key=f"missed-{med['id']}"):
        requests.post(
            f"{API_URL}/medications/{med['id']}/missed",
            headers=auth_headers(),
            timeout=10,
        )
        st.rerun()
    st.write("---")
