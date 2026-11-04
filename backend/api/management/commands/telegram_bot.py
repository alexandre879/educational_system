"""
The school's Telegram bot (long polling). People connect their school account by email, then get
a role-aware menu: today's lessons, the week, homework they can tick off, marks, attendance,
exams, news, profile and settings. What each screen shows lives in api/bot/screens.py.
"""

import logging
from collections.abc import Callable

from asgiref.sync import sync_to_async
from django.conf import settings
from django.core.management.base import BaseCommand
from telegram import (
    BotCommand,
    BotCommandScopeChat,
    InlineKeyboardMarkup,
    LinkPreviewOptions,
    MenuButtonCommands,
    Update,
)
from telegram.constants import ChatAction, ParseMode
from telegram.error import BadRequest, NetworkError, TelegramError
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from api.bot import screens
from api.bot.emoji import premium_ids
from api.bot.screens import Ctx, Screen
from api.bot.texts import COMMANDS, DEFAULT_LANGUAGE, LANGUAGE_NAMES, TEXTS, normalize_language, tr
from api.models import User


logger = logging.getLogger(__name__)

NO_PREVIEW = LinkPreviewOptions(is_disabled=True)
# How far the day view may be paged from today.
MAX_DAY_OFFSET = 60

# Builds a screen for whoever is looking; the account is None when the chat isn't connected.
Build = Callable[[Ctx, User | None], Screen]

# Telegram refuses premium emoji once the bot owner's Premium lapses; then stop asking for them.
_premium = {"enabled": True}


# ---------------------------------------------------------------------------
# Account, language and preferences (sync: they touch the database)
# ---------------------------------------------------------------------------

def _context(chat_id: int, chat_data: dict, telegram_language: str | None, with_premium: bool) -> tuple[Ctx, User | None]:
    account = screens.active_account(chat_id, chat_data.get("account"))
    language = chat_data.get("lang") or (account.telegram_language if account else "") or telegram_language
    ids = premium_ids() if with_premium and _premium["enabled"] else {}
    return Ctx(normalize_language(language), ids, chat_data.get("child")), account


def _set_language(chat_id: int, language: str) -> None:
    User.objects.filter(chat_id=str(chat_id)).update(telegram_language=language)


def _language_chosen(chat_id: int, chat_data: dict) -> bool:
    """Whether this chat has picked a language (else the bot asks before anything else)."""
    if chat_data.get("lang"):
        return True
    return User.objects.filter(chat_id=str(chat_id)).exclude(telegram_language="").exists()


def _commands(language: str) -> list[BotCommand]:
    return [BotCommand(command, tr(language, f"cmd_{command}")) for command in COMMANDS]


def _toggle_notifications(chat_id: int, account_id: int | None) -> None:
    account = screens.active_account(chat_id, account_id)
    if account is not None:
        # Every account in this chat shares the setting: it's one person's Telegram.
        User.objects.filter(chat_id=str(chat_id)).update(telegram_notifications=not account.telegram_notifications)


def _unlink(chat_id: int, account_id: int | None) -> None:
    account = screens.active_account(chat_id, account_id)
    if account is not None:
        User.objects.filter(pk=account.pk).update(chat_id=None)


# ---------------------------------------------------------------------------
# Sending
# ---------------------------------------------------------------------------

def _markup(screen: Screen, bot) -> InlineKeyboardMarkup | None:
    # Unknown fields (button style and emoji icon) pass through as api_kwargs.
    return InlineKeyboardMarkup.de_json({"inline_keyboard": screen.buttons}, bot) if screen.buttons else None


async def _send(update: Update, context: ContextTypes.DEFAULT_TYPE, screen: Screen, edit: bool) -> None:
    markup = _markup(screen, context.bot)
    query = update.callback_query
    if edit and query and query.message:
        try:
            await query.edit_message_text(
                screen.text, parse_mode=ParseMode.HTML, reply_markup=markup, link_preview_options=NO_PREVIEW
            )
            return
        except BadRequest as error:
            # Old messages can't be edited any more; answer with a new one instead.
            if "can't be edited" not in str(error).lower() and "not found" not in str(error).lower():
                raise

    chat_id = update.effective_chat.id
    try:
        await context.bot.send_message(
            chat_id,
            screen.text,
            parse_mode=ParseMode.HTML,
            reply_markup=markup,
            link_preview_options=NO_PREVIEW,
            message_effect_id=screen.effect,
        )
    except BadRequest as error:
        if not screen.effect or "effect" not in str(error).lower():
            raise
        await context.bot.send_message(
            chat_id, screen.text, parse_mode=ParseMode.HTML, reply_markup=markup, link_preview_options=NO_PREVIEW
        )


async def show(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    build: Build,
    *,
    edit: bool = False,
    needs_account: bool = True,
) -> Screen | None:
    """
    Renders a screen and sends it (or, for a button press, replaces the message it's on). If
    Telegram refuses the premium emoji, it's rendered again with plain ones.
    """
    chat_id = update.effective_chat.id
    telegram_language = update.effective_user.language_code if update.effective_user else None

    def render(with_premium: bool) -> Screen:
        ctx, account = _context(chat_id, context.chat_data, telegram_language, with_premium)
        if account is None and needs_account:
            return screens.not_linked(ctx)
        return build(ctx, account)

    refused: BadRequest | None = None
    for with_premium in (True, False):
        if with_premium and not _premium["enabled"]:
            continue
        screen = await sync_to_async(render)(with_premium)
        try:
            await _send(update, context, screen, edit)
        except BadRequest as error:
            if "not modified" in str(error).lower():
                return screen
            if not with_premium:
                raise
            refused = error
            continue
        if refused is not None:
            # Plain emoji went through where premium ones didn't.
            logger.warning("Telegram refused premium emoji (%s); using plain ones from now on.", refused)
            _premium["enabled"] = False
        return screen
    return None


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def _screen_command(build: Build):
    async def handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        context.chat_data.pop("awaiting_email", None)
        await context.bot.send_chat_action(update.effective_chat.id, ChatAction.TYPING)
        await show(update, context, build)

    return handler


def _start_screen(ctx: Ctx, account: User | None) -> Screen:
    return screens.home(ctx, account) if account else screens.welcome(ctx)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    context.chat_data.pop("awaiting_email", None)
    chosen = await sync_to_async(_language_chosen)(update.effective_chat.id, context.chat_data)
    build = _start_screen if chosen else (lambda ctx, account: screens.language_picker(ctx))
    await show(update, context, build, needs_account=False)


async def language_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await show(update, context, lambda ctx, account: screens.language_picker(ctx), needs_account=False)


async def _localize_commands(bot, chat_id: int, language: str) -> None:
    """Shows this chat's "/" menu in the language picked here, whatever the phone's language."""
    try:
        await bot.set_my_commands(_commands(language), scope=BotCommandScopeChat(chat_id))
    except TelegramError as error:
        logger.warning("Couldn't set the commands for chat %s: %s", chat_id, error)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await show(update, context, lambda ctx, account: screens.help_screen(ctx, account is not None), needs_account=False)


async def settings_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await show(update, context, screens.settings_screen, needs_account=False)


# ---------------------------------------------------------------------------
# Buttons
# ---------------------------------------------------------------------------

def _int(value: str, default: int = 0) -> int:
    try:
        return int(value)
    except ValueError:
        return default


async def on_button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    name, _, arg = (query.data or "").partition(":")
    chat_id = update.effective_chat.id
    chat_data = context.chat_data
    toast: str | None = None
    needs_account = True
    build: Build

    # Changes happen here, once; the screen after them may be rendered twice (premium fallback).
    if name == "home":
        build = screens.home
    elif name == "day":
        offset = max(-MAX_DAY_OFFSET, min(MAX_DAY_OFFSET, _int(arg)))
        build = lambda ctx, account: screens.day(ctx, account, offset)
    elif name == "week":
        build = screens.week
    elif name == "hw":
        if arg:
            telegram_language = update.effective_user.language_code if update.effective_user else None
            ctx, account = await sync_to_async(_context)(chat_id, chat_data, telegram_language, False)
            if account is not None:
                toast = await sync_to_async(screens.complete_homework)(account, _int(arg), ctx.lang)
        build = screens.homework
    elif name == "marks":
        build = screens.marks
    elif name == "att":
        build = lambda ctx, account: screens.attendance(ctx, account, arg or None)
    elif name == "exams":
        build = screens.exams
    elif name == "news":
        build = screens.news
    elif name == "profile":
        build = lambda ctx, account: screens.profile(ctx, account, screens.accounts_for_chat(chat_id))
    elif name == "child":
        chat_data["child"] = _int(arg) or None
        build = screens.home
    elif name == "account":
        chat_data["account"] = _int(arg) or None
        chat_data.pop("child", None)
        build = screens.home
    elif name == "settings":
        build, needs_account = screens.settings_screen, False
    elif name == "language":
        build, needs_account = (lambda ctx, account: screens.language_picker(ctx)), False
    elif name == "lang" and arg.partition(":")[0] in TEXTS:
        # "lang:en" from Settings returns there; "lang:en:start" (the picker) carries on to the start.
        language, _, then = arg.partition(":")
        chat_data["lang"] = language
        await sync_to_async(_set_language)(chat_id, language)
        await _localize_commands(context.bot, chat_id, language)
        toast = f"✅ {LANGUAGE_NAMES[language]}"
        build = _start_screen if then == "start" else screens.settings_screen
        needs_account = False
    elif name == "notif":
        await sync_to_async(_toggle_notifications)(chat_id, chat_data.get("account"))
        build, needs_account = screens.settings_screen, False
    elif name == "unlink" and arg == "yes":
        await sync_to_async(_unlink)(chat_id, chat_data.get("account"))
        chat_data.pop("account", None)
        chat_data.pop("child", None)
        build, needs_account = (lambda ctx, account: screens.unlinked(ctx)), False
    elif name == "unlink":
        build = screens.unlink_confirm
    elif name == "link":
        chat_data["awaiting_email"] = True
        build, needs_account = (lambda ctx, account: screens.ask_email(ctx)), False
    elif name == "cancel":
        chat_data.pop("awaiting_email", None)
        build, needs_account = (lambda ctx, account: screens.cancelled(ctx)), False
    elif name == "help":
        build, needs_account = (lambda ctx, account: screens.help_screen(ctx, account is not None)), False
    else:  # "start", or a button from an older version of the bot
        build, needs_account = _start_screen, False

    screen = await show(update, context, build, edit=True, needs_account=needs_account)
    await query.answer(toast or (screen.toast if screen else None))


# ---------------------------------------------------------------------------
# Text messages: the email while connecting, otherwise a nudge towards the menu
# ---------------------------------------------------------------------------

async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    chat_data = context.chat_data
    telegram_language = update.effective_user.language_code if update.effective_user else None

    if not chat_data.get("awaiting_email"):
        await show(
            update,
            context,
            lambda ctx, account: Screen(
                f"{ctx.e('👇')} {ctx.t('use_menu')}",
                [screens.menu_row(ctx)] if account else [[ctx.button(ctx.t("connect"), emoji="🔗", data="link", style="primary")]],
            ),
            needs_account=False,
        )
        return

    ctx, _ = await sync_to_async(_context)(chat_id, chat_data, telegram_language, False)
    outcome = await sync_to_async(screens.link_account)(chat_id, update.message.text or "", ctx.lang)
    if not outcome.retry:
        chat_data.pop("awaiting_email", None)
    if outcome.account is not None:
        chat_data["account"] = outcome.account.pk
        chat_data.pop("child", None)

    await show(update, context, lambda ctx, account: screens.link_result(ctx, outcome), needs_account=False)
    if outcome.status == "linked":
        await show(update, context, screens.home)


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    if isinstance(context.error, NetworkError) and not isinstance(update, Update):
        # The connection dropped while polling; the bot reconnects by itself.
        logger.warning("Telegram unreachable, retrying: %s", context.error)
        return
    logger.error("Telegram bot error", exc_info=context.error)
    if isinstance(update, Update) and update.effective_chat:
        language = normalize_language(
            context.chat_data.get("lang") if context.chat_data else
            (update.effective_user.language_code if update.effective_user else DEFAULT_LANGUAGE)
        )
        try:
            if update.callback_query:
                await update.callback_query.answer(tr(language, "server_error"), show_alert=True)
            else:
                await context.bot.send_message(update.effective_chat.id, f"⚠️ {tr(language, 'server_error')}")
        except TelegramError:
            pass


# ---------------------------------------------------------------------------
# Startup: the bot's profile in every language
# ---------------------------------------------------------------------------

async def setup_profile(application: Application) -> None:
    bot = application.bot
    ids = await sync_to_async(premium_ids)()
    logger.info("Premium emoji available: %s", len(ids))

    for language in TEXTS:
        commands = _commands(language)
        # Georgian is also the default for every other app language.
        for code in ([language, None] if language == DEFAULT_LANGUAGE else [language]):
            try:
                await bot.set_my_commands(commands, language_code=code)
                await bot.set_my_short_description(tr(language, "short_description"), language_code=code)
                await bot.set_my_description(tr(language, "description"), language_code=code)
            except TelegramError as error:
                logger.warning("Couldn't update the bot profile (%s): %s", code or "default", error)
    await bot.set_chat_menu_button(menu_button=MenuButtonCommands())


class Command(BaseCommand):
    help = "Run the school's Telegram bot (long polling)"

    def handle(self, *args, **options):
        token = settings.TELEGRAM_BOT_TOKEN
        if not token:
            self.stderr.write("❌ BOT_TOKEN is missing. Set it in your .env file.")
            return

        app = ApplicationBuilder().token(token).post_init(setup_profile).build()

        app.add_handler(CommandHandler(["start", "menu"], start))
        app.add_handler(CommandHandler("help", help_command))
        app.add_handler(CommandHandler("settings", settings_command))
        app.add_handler(CommandHandler(["language", "lang"], language_command))
        for command, build in {
            "today": lambda ctx, account: screens.day(ctx, account, 0),
            "week": screens.week,
            "homework": screens.homework,
            "marks": screens.marks,
            "attendance": lambda ctx, account: screens.attendance(ctx, account),
            "exams": screens.exams,
            "news": screens.news,
            "profile": lambda ctx, account: screens.profile(ctx, account, screens.accounts_for_chat(account.chat_id)),
        }.items():
            app.add_handler(CommandHandler(command, _screen_command(build)))
        app.add_handler(CallbackQueryHandler(on_button))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
        app.add_error_handler(on_error)

        self.stdout.write("✅ Telegram bot started...")
        app.run_polling(allowed_updates=[Update.MESSAGE, Update.CALLBACK_QUERY])
