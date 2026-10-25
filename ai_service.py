def generate_medication_advice(medicine_name: str, dosage: str, symptom: str):
    """
    Generate general medication-related information.
    """

    medicine_name = medicine_name.strip()
    dosage = dosage.strip()
    symptom = symptom.strip()

    if not medicine_name:
        return {"success": False, "message": "Medicine name is required."}

    if not dosage:
        return {"success": False, "message": "Dosage is required."}

    if not symptom:
        return {"success": False, "message": "Symptom is required."}

    ai_text, source = enhance_advice_with_llm(medicine_name, dosage, symptom)

    return {
        "success": True,
        "medicine": medicine_name,
        "dosage": dosage,
        "symptom": symptom,
        "advice": (
            f"Your medication reminder is scheduled for "
            f"{medicine_name} ({dosage}). "
            f"For {symptom}, follow the instructions provided "
            f"by your doctor or pharmacist."
        ),
        "ai_text": ai_text,
        "source": source,
        "llm_available": llm_available(),
        "safety": (
            "Do not change the dosage, frequency, or duration "
            "of medication without professional medical advice."
        ),
        "reminder_note": (
            "Take the medication according to your prescribed "
            "schedule and respond to the reminder when you have taken it."
        ),
    }


def generate_adherence_analysis(medication, logs):
    """
    Analyze medication adherence using medication logs.
    """

    total = len(logs)

    if total == 0:
        return {
            "success": True,
            "medication_id": medication.id,
            "medicine": medication.medicine_name,
            "dosage": medication.dosage,
            "total_records": 0,
            "taken_count": 0,
            "missed_count": 0,
            "adherence_percentage": 0,
            "status": "NO DATA",
            "recommendation": (
                "There is not enough medication history yet. "
                "Continue recording taken or missed doses."
            ),
        }

    taken_count = sum(1 for log in logs if log.taken)
    missed_count = total - taken_count

    adherence_percentage = round((taken_count / total) * 100, 2)

    if adherence_percentage >= 90:
        status = "EXCELLENT"
        recommendation = (
            "Excellent medication adherence. "
            "Continue following your prescribed schedule."
        )

    elif adherence_percentage >= 75:
        status = "GOOD"
        recommendation = (
            "Your adherence is good, but there are some missed doses. "
            "Try responding to reminders consistently."
        )

    elif adherence_percentage >= 50:
        status = "NEEDS IMPROVEMENT"
        recommendation = (
            "Several doses have been missed. Try responding to reminders consistently."
        )

    else:
        status = "LOW"
        recommendation = (
            "Your medication adherence is low. "
            "Consider discussing missed doses with your doctor "
            "or pharmacist."
        )

    return {
        "success": True,
        "medication_id": medication.id,
        "medicine": medication.medicine_name,
        "dosage": medication.dosage,
        "frequency": medication.frequency,
        "total_records": total,
        "taken_count": taken_count,
        "missed_count": missed_count,
        "adherence_percentage": adherence_percentage,
        "status": status,
        "recommendation": recommendation,
    }


def generate_ai_action(adherence_percentage: float, missed_count: int):
    if adherence_percentage >= 90:
        return {
            "action": "NORMAL_REMINDER",
            "priority": "LOW",
            "message": "Excellent adherence. Continue the normal reminder schedule.",
        }

    elif adherence_percentage >= 75:
        return {
            "action": "NORMAL_REMINDER",
            "priority": "MEDIUM",
            "message": "Some doses were missed. Continue normal reminders.",
        }

    elif adherence_percentage >= 50:
        return {
            "action": "STRONGER_REMINDER",
            "priority": "HIGH",
            "message": "Several doses were missed. Stronger reminders may help.",
        }

    else:
        return {
            "action": "ATTENTION_REQUIRED",
            "priority": "CRITICAL",
            "message": "Medication adherence is very low. Consider discussing missed doses with a doctor or pharmacist.",
        }


# ============================================================
# LLM PROVIDER (optional — graceful fallback to local logic)
# ============================================================

import json as _json
import os as _os
import urllib.request as _urlopen


def _openai_complete(prompt: str, system: str) -> str | None:
    api_key = _os.getenv("OPENAI_API_KEY")

    if not api_key:
        return None

    base_url = _os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")

    model = _os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    try:
        payload = _json.dumps(
            {
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.4,
                "max_tokens": 600,
            }
        ).encode()

        request = _urlopen.Request(
            f"{base_url}/chat/completions",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST",
        )

        with _urlopen.urlopen(request, timeout=30) as response:
            data = _json.loads(response.read().decode())

        return data["choices"][0]["message"]["content"].strip()

    except Exception as e:
        print(f"OpenAI request failed: {e}")

        return None


def _gemini_complete(prompt: str, system: str) -> str | None:
    api_key = _os.getenv("GEMINI_API_KEY")

    if not api_key:
        return None

    model = _os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    try:
        payload = _json.dumps(
            {
                "system_instruction": {"parts": [{"text": system}]},
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.4,
                    "maxOutputTokens": 600,
                },
            }
        ).encode()

        request = _urlopen.Request(
            "https://generativelanguage.googleapis.com/v1beta/"
            f"models/{model}:generateContent?key={api_key}",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with _urlopen.urlopen(request, timeout=30) as response:
            data = _json.loads(response.read().decode())

        return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    except Exception as e:
        print(f"Gemini request failed: {e}")

        return None


def llm_complete(prompt: str, system: str) -> tuple:
    """Return (text, source). Source is 'openai', 'gemini' or 'local'."""

    text = _openai_complete(prompt, system)

    if text:
        return text, "openai"

    text = _gemini_complete(prompt, system)

    if text:
        return text, "gemini"

    return "", "local"


def llm_available() -> bool:
    return bool(_os.getenv("OPENAI_API_KEY") or _os.getenv("GEMINI_API_KEY"))


ASSISTANT_SYSTEM = (
    "You are a medication adherence assistant inside a reminder app. "
    "Give short, practical, non-diagnostic guidance. Always remind the "
    "user to follow their doctor or pharmacist for medical decisions. "
    "Never prescribe, diagnose, or change dosages."
)

DISCLAIMER = (
    "This is general information only, not medical advice. "
    "Follow your doctor or pharmacist for medical decisions."
)


def enhance_advice_with_llm(medicine_name: str, dosage: str, symptom: str):
    prompt = (
        f"Medication: {medicine_name} ({dosage}). "
        f"User context: {symptom}. "
        "In 3-4 sentences, give general adherence guidance "
        "(timing, consistency, what to track) without diagnosing "
        "or changing the prescription."
    )

    text, source = llm_complete(prompt, ASSISTANT_SYSTEM)

    return text, source


# ============================================================
# DRUG INTERACTION CHECK (rule-based + optional LLM review)
# ============================================================

KNOWN_INTERACTIONS = [
    {
        "pair": ("warfarin", "aspirin"),
        "severity": "HIGH",
        "message": "Higher bleeding risk when combined.",
    },
    {
        "pair": ("warfarin", "ibuprofen"),
        "severity": "HIGH",
        "message": "Higher bleeding risk when combined.",
    },
    {
        "pair": ("lisinopril", "potassium"),
        "severity": "MEDIUM",
        "message": "May raise potassium levels; monitoring is common.",
    },
    {
        "pair": ("simvastatin", "clarithromycin"),
        "severity": "HIGH",
        "message": "Can raise statin levels and muscle-injury risk.",
    },
    {
        "pair": ("metformin", "alcohol"),
        "severity": "MEDIUM",
        "message": "Alcohol can affect blood sugar and lactate risk.",
    },
    {
        "pair": ("sertraline", "ibuprofen"),
        "severity": "MEDIUM",
        "message": "May raise bleeding risk; take with food and tell your doctor about bruising.",
    },
    {
        "pair": ("levothyroxine", "calcium"),
        "severity": "LOW",
        "message": "Calcium can reduce absorption; usually separated by a few hours.",
    },
    {
        "pair": ("amlodipine", "grapefruit"),
        "severity": "LOW",
        "message": "Grapefruit can raise levels in some people.",
    },
]


def check_drug_interactions(medications: list) -> dict:
    names = [
        str(m.get("name", "")).strip().lower()
        for m in medications
        if str(m.get("name", "")).strip()
    ]

    findings = []

    for entry in KNOWN_INTERACTIONS:
        a, b = entry["pair"]

        has_a = any(a in n for n in names)
        has_b = any(b in n for n in names)

        if has_a and has_b:
            findings.append(
                {
                    "medications": list(entry["pair"]),
                    "severity": entry["severity"],
                    "message": entry["message"],
                    "source": "local",
                }
            )

    ai_analysis = ""
    source = "local"

    if names:
        prompt = (
            f"Medication list: {', '.join(names)}. "
            "List any widely-known major interactions in one short "
            "paragraph, then advise talking to a pharmacist. "
            "Do not diagnose or prescribe."
        )

        ai_analysis, source = llm_complete(prompt, ASSISTANT_SYSTEM)

    highest = "NONE"

    for level in ("LOW", "MEDIUM", "HIGH"):
        if any(f["severity"] == level for f in findings):
            highest = level

    return {
        "success": True,
        "medications_checked": len(names),
        "interactions": findings,
        "highest_severity": highest,
        "ai_analysis": ai_analysis,
        "source": source,
        "llm_available": llm_available(),
        "disclaimer": DISCLAIMER,
    }


# ============================================================
# AI CHAT ASSISTANT
# ============================================================


def chat_with_assistant(
    message: str,
    medications: list,
    taken_count: int,
    missed_count: int,
) -> dict:
    med_summary = (
        ", ".join(
            f"{m.medicine_name} ({m.dosage}) at {m.reminder_time}"
            for m in medications[:15]
        )
        or "no medications scheduled"
    )

    total = taken_count + missed_count
    adherence = round(taken_count / total * 100, 1) if total else 0

    context = (
        f"Schedule: {med_summary}. "
        f"Adherence: {adherence}% ({taken_count} taken, "
        f"{missed_count} missed)."
    )

    reply, source = llm_complete(
        f"{context}\nUser: {message}",
        ASSISTANT_SYSTEM
        + " Answer in 2-4 short sentences about their schedule or adherence.",
    )

    if not reply:
        lowered = message.lower()

        if "miss" in lowered:
            reply = (
                f"You missed {missed_count} dose(s) recently "
                f"({adherence}% adherence). Try linking doses to a daily "
                "routine and respond to reminders right away."
            )
        elif "schedule" in lowered or "when" in lowered:
            reply = f"Your current schedule: {med_summary}."
        elif "adherence" in lowered or "progress" in lowered:
            reply = (
                f"Adherence is {adherence}% "
                f"({taken_count} taken, {missed_count} missed). "
                "Keep marking doses taken to improve insights."
            )
        else:
            reply = (
                "I can help with your schedule, reminders, and adherence. "
                f"Current adherence: {adherence}%. "
                "Ask about doses, timing, or missed medications."
            )

        source = "local"

    return {
        "success": True,
        "reply": reply,
        "source": source,
        "disclaimer": DISCLAIMER,
    }
