import os
from openai import OpenAI
from dotenv import load_dotenv


load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

def generate_reminder_message(medicine_name, dosage):

    prompt = f"""
    Generate a short friendly medication reminder
    for medicine {medicine_name}
    with dosage {dosage}.
    Keep it motivating and caring.
    """

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content



