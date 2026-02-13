import requests

TELEGRAM_BOT_TOKEN = "8239669176:AAHCmtWOAE4t9rc4OGCLZ7cTO5yOPtrcdYc"

def tg_send(chat_id: str, text: str) -> None:
    token = TELEGRAM_BOT_TOKEN
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    requests.post(url, json={"chat_id": chat_id, "text": text}, timeout=10)