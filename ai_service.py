def generate_medication_advice(
    medicine_name: str,
    dosage: str,
    symptom: str
):
    """
    Generate general medication-related information.
    """

    medicine_name = medicine_name.strip()
    dosage = dosage.strip()
    symptom = symptom.strip()

    if not medicine_name:
        return {
            "success": False,
            "message": "Medicine name is required."
        }

    if not dosage:
        return {
            "success": False,
            "message": "Dosage is required."
        }

    if not symptom:
        return {
            "success": False,
            "message": "Symptom is required."
        }

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
        "safety": (
            "Do not change the dosage, frequency, or duration "
            "of medication without professional medical advice."
        ),
        "reminder_note": (
            "Take the medication according to your prescribed "
            "schedule and respond to the reminder when you have taken it."
        )
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
            )
        }

    taken_count = sum(1 for log in logs if log.taken)
    missed_count = total - taken_count

    adherence_percentage = round(
        (taken_count / total) * 100,
        2
    )

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
            "Several doses have been missed. "
            "Try responding to reminders consistently."
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
        "recommendation": recommendation
    }

def generate_ai_action(adherence_percentage: float, missed_count: int):
    if adherence_percentage >= 90:
        return {
            "action": "NORMAL_REMINDER",
            "priority": "LOW",
            "message": "Excellent adherence. Continue the normal reminder schedule."
        }

    elif adherence_percentage >= 75:
        return {
            "action": "NORMAL_REMINDER",
            "priority": "MEDIUM",
            "message": "Some doses were missed. Continue normal reminders."
        }

    elif adherence_percentage >= 50:
        return {
            "action": "STRONGER_REMINDER",
            "priority": "HIGH",
            "message": "Several doses were missed. Stronger reminders may help."
        }

    else:
        return {
            "action": "ATTENTION_REQUIRED",
            "priority": "CRITICAL",
            "message": "Medication adherence is very low. Consider discussing missed doses with a doctor or pharmacist."
        }

