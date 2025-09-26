

from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)
from asgiref.sync import sync_to_async
from api.models import User
import os
from dotenv import load_dotenv


load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")



async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.message.chat.id

    await context.bot.send_message(
        chat_id=chat_id,
        text=(
            "მოგესალმები! 👋\n"
            "მე სკოლის ბოტი ვარ. 🤖\n"
            "გთხოვ შეიყვანო შენი სკოლის მეილი 📩 ქვემოთ, რათა მოხდეს ავტორიზაცია."
        )
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.message.chat.id
    email = update.message.text.strip().lower()


    async def get_user(email: str):
        try:
            return await sync_to_async(User.objects.get)(email=email)
        except User.DoesNotExist:
            return None

    user = await get_user(email)

    if not user:
        await context.bot.send_message(
            chat_id=chat_id,
            text="❌ მეილი ვერ მოიძებნა სკოლის სისტემაში. გთხოვ გადაამოწმე."
        )
        return


    if user.chat_id and user.chat_id != str(chat_id):
        await context.bot.send_message(
            chat_id=chat_id,
            text="❌ შენ არ გაქვს უფლება შეცვალო მეილი, რადგან უკვე დაკავშირებულია სხვა Telegram-თან."
        )
        return


    if not user.chat_id:
        user.chat_id = str(chat_id)
        await sync_to_async(user.save)()
        await context.bot.send_message(
            chat_id=chat_id,
            text=f"✅ თქვენი Telegram ახლა დაკავშირებულია სახელით: {user.first_name} {user.last_name}."
        )
    else:

        await context.bot.send_message(
            chat_id=chat_id,
            text=f"⚠️Telegram უკვე დაკავშირებულია სახელით: ({user.first_name} {user.last_name})."
        )


def run_bot():
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    print("Telegram bot started...")
    app.run_polling()
