import logging

from asgiref.sync import sync_to_async
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.utils import OperationalError

from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
    ConversationHandler,
)

from api.models import User


logger = logging.getLogger(__name__)

ASK_EMAIL = 1


BTN_CONNECT = "🔗 Connect email"
BTN_HELP = "ℹ️ Help"
BTN_CANCEL = "❌ Cancel"

MAIN_KEYBOARD = ReplyKeyboardMarkup(
    [[BTN_CONNECT, BTN_HELP]],
    resize_keyboard=True,
    one_time_keyboard=False,
    input_field_placeholder="Tap a button 👇",
)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "მოგესალმები! 👋\n"
        "მე ვარ სკოლის ბოტი 🤖\n"
        "გთხოვ აირჩიე ღილაკი ქვემოთ:",
        reply_markup=MAIN_KEYBOARD,
    )


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📌 ინსტრუქცია:\n"
        f"1) დააჭირე '{BTN_CONNECT}'\n"
        "2) შემდეგ შეიყვანე სკოლის ელ-ფოსტა\n\n"
        "თუ რამე აგერიოდა, დააჭირე Cancel.",
        reply_markup=MAIN_KEYBOARD,
    )


async def begin_connect(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kb = ReplyKeyboardMarkup([[BTN_CANCEL]], resize_keyboard=True)
    await update.message.reply_text(
        "შეიყვანე შენი სკოლის ელ-ფოსტა 📩\n"
        "მაგალითად: name@school.edu\n\n"
        "გაუქმებისთვის დააჭირე Cancel.",
        reply_markup=kb,
    )
    return ASK_EMAIL


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "გაუქმდა ✅ აირჩიე ღილაკი:",
        reply_markup=MAIN_KEYBOARD,
    )
    return ConversationHandler.END


async def handle_email(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text:
        return ASK_EMAIL

    chat_id = update.message.chat.id
    text = (update.message.text or "").strip()

    if text == BTN_CANCEL:
        return await cancel(update, context)

    email = text.lower()

    if "@" not in email or "." not in email:
        await update.message.reply_text(
            "❌ ელ-ფოსტის ფორმატი არასწორია. სცადე ისევ ან დააჭირე Cancel."
        )
        return ASK_EMAIL

    try:
        user = await sync_to_async(User.objects.get)(email__iexact=email)

    except User.DoesNotExist:
        await update.message.reply_text(
            "❌ მეილი ვერ მოიძებნა სკოლის სისტემაში. გთხოვ გადაამოწმე ან დააჭირე Cancel."
        )
        return ASK_EMAIL

    except OperationalError:
        logger.exception("Database error while linking Telegram chat %s", chat_id)

        await context.bot.send_message(
            chat_id=chat_id,
            text="❌ სერვერის შეცდომა (DB). გთხოვ სცადო მოგვიანებით ან დაუკავშირდი ადმინისტრატორს.",
        )
        return ASK_EMAIL

    except Exception:
        logger.exception("Unexpected error while linking Telegram chat %s", chat_id)

        await context.bot.send_message(
            chat_id=chat_id,
            text="❌ სერვერის შეცდომა. გთხოვ სცადო მოგვიანებით.",
        )
        return ASK_EMAIL

    if user.chat_id and user.chat_id != str(chat_id):
        await update.message.reply_text(
            "❌ ეს მეილი უკვე დაკავშირებულია სხვა Telegram აქაუნთთან.",
            reply_markup=MAIN_KEYBOARD,
        )
        return ConversationHandler.END

    if not user.chat_id:
        user.chat_id = str(chat_id)
        await sync_to_async(user.save)(update_fields=["chat_id"])
        await update.message.reply_text(
            f"✅ თქვენი Telegram ახლა დაკავშირებულია სახელით: {user.first_name} {user.last_name}.",
            reply_markup=MAIN_KEYBOARD,
        )
    else:
        await update.message.reply_text(
            f"⚠️ Telegram უკვე დაკავშირებულია სახელით: ({user.first_name} {user.last_name}).",
            reply_markup=MAIN_KEYBOARD,
        )

    return ConversationHandler.END


async def block_free_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "⚠️ გთხოვ გამოიყენე მხოლოდ ღილაკები ქვემოთ 👇",
        reply_markup=MAIN_KEYBOARD,
    )


class Command(BaseCommand):
    help = "Run Telegram bot (polling)"

    def handle(self, *args, **options):
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            self.stderr.write("❌ BOT_TOKEN is missing. Set it in your .env file.")
            return

        app = ApplicationBuilder().token(token).build()

        conv = ConversationHandler(
            entry_points=[
                CommandHandler("start", start),
                MessageHandler(filters.TEXT & filters.Regex(f"^{BTN_CONNECT}$"), begin_connect),
                MessageHandler(filters.TEXT & filters.Regex(f"^{BTN_HELP}$"), help_cmd),
            ],
            states={
                ASK_EMAIL: [
                    MessageHandler(filters.TEXT & ~filters.COMMAND, handle_email),
                ],
            },
            fallbacks=[
                MessageHandler(filters.TEXT & filters.Regex(f"^{BTN_CANCEL}$"), cancel),
                CommandHandler("start", start),
            ],
            allow_reentry=True,
        )

        app.add_handler(conv)
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, block_free_text))

        self.stdout.write("✅ Telegram bot started...")
        app.run_polling()