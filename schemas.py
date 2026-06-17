from pydantic import BaseModel

class MedicationCreate(BaseModel):
    medicine_name: str
    dosage: str
    reminder_time: str
    frequency: str