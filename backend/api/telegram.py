import requests
from pathlib import Path
from dotenv import load_dotenv
import os



BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=True)

TELEGRAM_BOT_TOKEN = os.getenv("BOT_TOKEN")

def tg_send(chat_id: str, text: str) -> None:
    token = TELEGRAM_BOT_TOKEN
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    requests.post(url, json={"chat_id": chat_id, "text": text}, timeout=10)