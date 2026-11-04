"""Everything the bot says, in Georgian (the default), English and Russian. Values may contain HTML."""

DEFAULT_LANGUAGE = "ka"

# Shown on the language buttons in their own language.
LANGUAGE_NAMES = {"ka": "🇬🇪 ქართული", "en": "🇬🇧 English", "ru": "🇷🇺 Русский"}
# The first question the bot asks, in all three languages at once.
LANGUAGE_PROMPT = {"ka": "აირჩიეთ ენა", "en": "Choose your language", "ru": "Выберите язык"}

TEXTS: dict[str, dict[str, str]] = {
    "en": {
        "menu": "Menu",
        "back": "Back",
        "open_app": "Open the app",
        "cancel": "Cancel",
        "cancelled": "Cancelled. Whenever you're ready, tap Connect.",
        "role_student": "Student",
        "role_teacher": "Teacher",
        "role_parent": "Parent",
        "role_admin": "Administrator",
        "greet_morning": "Good morning",
        "greet_afternoon": "Good afternoon",
        "greet_evening": "Good evening",
        "greet_night": "Good night",
        "welcome_title": "Welcome to Blueapp!",
        "welcome_body": (
            "I'm your school assistant. Timetable, homework, marks, attendance and news, all right here "
            "in Telegram, plus your login codes.\n\nConnect your school account to get started."
        ),
        "connect": "Connect account",
        "ask_email": "Send me your school email.\nFor example: <code>name@school.edu</code>",
        "email_invalid": "That doesn't look like an email. Try again, or tap Cancel.",
        "email_unknown": "I couldn't find this email in the school system. Check the spelling and try again.",
        "email_taken": (
            "This email is already connected to another Telegram account. "
            "If that isn't you, contact the school administration."
        ),
        "already_linked": "This Telegram is already connected to <b>{name}</b>.",
        "linked_title": "You're connected!",
        "linked_body": "Hi, <b>{name}</b>! From now on your login codes and school notifications arrive here.",
        "server_error": "Something went wrong on our side. Please try again in a minute.",
        "not_linked": "Connect your school account first. It takes ten seconds.",
        "use_menu": "Tap a button below, or open the menu with /start.",
        "not_for_role": "This isn't available for your account.",
        "points": "Points",
        "streak": "Homework streak: <b>{n}</b> days",
        "homework_left": "Homework left",
        "average": "Average mark",
        "exam_running": "An exam is in progress. Finish it in the app.",
        "children": "Your children",
        "subjects_taught": "Subjects you teach",
        "lessons_today": "Lessons today",
        "school_stats": "The school at a glance",
        "stat_users": "People",
        "stat_grades": "Classes",
        "stat_subjects": "Subjects",
        "stat_exams": "Exams",
        "btn_today": "Today",
        "btn_week": "Week",
        "btn_homework": "Homework",
        "btn_marks": "Marks",
        "btn_attendance": "Attendance",
        "btn_exams": "Exams",
        "btn_news": "News",
        "btn_profile": "Profile",
        "btn_settings": "Settings",
        "btn_help": "Help",
        "today": "Today",
        "tomorrow": "Tomorrow",
        "yesterday": "Yesterday",
        "lessons": "Lessons",
        "due_that_day": "Due that day",
        "exams": "Exams",
        "no_lessons": "No lessons. Enjoy the day!",
        "room": "room {room}",
        "previous": "Previous",
        "next": "Next",
        "week_title": "The next 7 days",
        "marked_done": "✅ Done! Nice work.",
        "streak_toast": "🔥 {n} days in a row!",
        "free_day": "free day",
        "homework_title": "Homework",
        "homework_none": "Nothing due this week. Enjoy!",
        "due": "due {date}",
        "homework_done": "{done} of {total} done",
        "homework_tap": "Tap a task below to tick it off.",
        "marks_title": "Marks",
        "marks_none": "No marks yet.",
        "overall_average": "Overall average",
        "latest_marks": "Latest marks",
        "attendance_title": "Attendance",
        "present": "Present",
        "absent": "Absent",
        "missed_lessons": "Missed lessons",
        "attendance_none": "No attendance records for this month yet.",
        "exams_title": "Exams",
        "coming_up": "Coming up",
        "open_now": "Open now",
        "latest_results": "Latest results",
        "exams_none": "No exams coming up.",
        "minutes": "{n} min",
        "news_title": "Announcements",
        "news_none": "No announcements yet.",
        "profile_title": "Profile",
        "email": "Email",
        "telegram_connected": "Telegram is connected to this account.",
        "unlink": "Disconnect Telegram",
        "unlink_confirm": (
            "Disconnect this Telegram from <b>{email}</b>?\n\n"
            "Login codes are sent here, so you won't be able to sign in until you connect again."
        ),
        "unlink_yes": "Yes, disconnect",
        "unlinked": "Disconnected. Connect again any time with /start.",
        "settings_title": "Settings",
        "language": "Language",
        "notifications": "Notifications",
        "on": "On",
        "off": "Off",
        "notifications_hint": "New marks, homework, exams, announcements and replies to you also arrive here.",
        "help_title": "What I can do",
        "help_body": (
            "/today — today's lessons, homework and exams\n"
            "/week — the next 7 days\n"
            "/homework — homework; tick it off right here\n"
            "/marks — marks and averages\n"
            "/attendance — this month's attendance\n"
            "/exams — upcoming exams and results\n"
            "/news — the latest announcements\n"
            "/profile — your account\n"
            "/settings — language and notifications\n"
            "/language — switch between ქართული, English and Русский"
        ),
        "open": "Open",
        "code_title": "Your login code",
        "code_hint": "Valid for {minutes} minutes. Never share it with anyone: the school will never ask for it.",
        "copy_code": "Copy code",
        "short_description": "Your school in Telegram: timetable, homework, marks, attendance, news and login codes.",
        "description": (
            "Hi! I'm the Blueapp school assistant.\n\n"
            "• Today's lessons and the week ahead\n"
            "• Homework you can tick off right here\n"
            "• Marks, attendance and exams\n"
            "• Announcements and replies to you\n"
            "• Your login codes\n\n"
            "Tap Start and connect your school account."
        ),
        "cmd_start": "Main menu",
        "cmd_today": "Today",
        "cmd_week": "The next 7 days",
        "cmd_homework": "Homework",
        "cmd_marks": "Marks",
        "cmd_attendance": "Attendance",
        "cmd_exams": "Exams",
        "cmd_news": "Announcements",
        "cmd_profile": "Profile",
        "cmd_settings": "Language and notifications",
        "cmd_help": "Help",
        "cmd_language": "Language · ენა · Язык",
    },
    "ka": {
        "menu": "მენიუ",
        "back": "უკან",
        "open_app": "აპის გახსნა",
        "cancel": "გაუქმება",
        "cancelled": "გაუქმდა. როცა მზად იქნებით, დააჭირეთ „დაკავშირებას“.",
        "role_student": "მოსწავლე",
        "role_teacher": "მასწავლებელი",
        "role_parent": "მშობელი",
        "role_admin": "ადმინისტრატორი",
        "greet_morning": "დილა მშვიდობისა",
        "greet_afternoon": "შუადღე მშვიდობისა",
        "greet_evening": "საღამო მშვიდობისა",
        "greet_night": "ღამე მშვიდობისა",
        "welcome_title": "მოგესალმებით Blueapp-ში!",
        "welcome_body": (
            "მე ვარ თქვენი სკოლის ასისტენტი. ცხრილი, დავალებები, ნიშნები, დასწრება და სიახლეები — "
            "ყველაფერი აქ, Telegram-ში, და ასევე შესვლის კოდები.\n\nდასაწყებად დააკავშირეთ სკოლის ანგარიში."
        ),
        "connect": "ანგარიშის დაკავშირება",
        "ask_email": "გამომიგზავნეთ სკოლის ელ-ფოსტა.\nმაგალითად: <code>name@school.edu</code>",
        "email_invalid": "ეს ელ-ფოსტას არ ჰგავს. სცადეთ თავიდან ან დააჭირეთ „გაუქმებას“.",
        "email_unknown": "ეს ელ-ფოსტა სკოლის სისტემაში ვერ ვიპოვე. გადაამოწმეთ და სცადეთ თავიდან.",
        "email_taken": (
            "ეს ელ-ფოსტა უკვე დაკავშირებულია სხვა Telegram ანგარიშთან. "
            "თუ ეს თქვენ არ ხართ, მიმართეთ სკოლის ადმინისტრაციას."
        ),
        "already_linked": "ეს Telegram უკვე დაკავშირებულია ანგარიშთან: <b>{name}</b>.",
        "linked_title": "დაკავშირებულია!",
        "linked_body": "გამარჯობა, <b>{name}</b>! ამიერიდან შესვლის კოდები და სკოლის შეტყობინებები აქ მოვა.",
        "server_error": "ჩვენს მხარეს შეცდომა მოხდა. სცადეთ ერთ წუთში.",
        "not_linked": "ჯერ დააკავშირეთ სკოლის ანგარიში — ამას ათი წამი სჭირდება.",
        "use_menu": "აირჩიეთ ღილაკი ქვემოთ ან გახსენით მენიუ ბრძანებით /start.",
        "not_for_role": "ეს თქვენი ანგარიშისთვის ხელმისაწვდომი არ არის.",
        "points": "ქულები",
        "streak": "დავალებების სერია: <b>{n}</b> დღე",
        "homework_left": "დარჩენილი დავალებები",
        "average": "საშუალო ნიშანი",
        "exam_running": "გამოცდა მიმდინარეობს. დაასრულეთ აპში.",
        "children": "თქვენი შვილები",
        "subjects_taught": "თქვენი საგნები",
        "lessons_today": "დღევანდელი გაკვეთილები",
        "school_stats": "სკოლა მოკლედ",
        "stat_users": "მომხმარებლები",
        "stat_grades": "კლასები",
        "stat_subjects": "საგნები",
        "stat_exams": "გამოცდები",
        "btn_today": "დღეს",
        "btn_week": "კვირა",
        "btn_homework": "დავალებები",
        "btn_marks": "ნიშნები",
        "btn_attendance": "დასწრება",
        "btn_exams": "გამოცდები",
        "btn_news": "სიახლეები",
        "btn_profile": "პროფილი",
        "btn_settings": "პარამეტრები",
        "btn_help": "დახმარება",
        "today": "დღეს",
        "tomorrow": "ხვალ",
        "yesterday": "გუშინ",
        "lessons": "გაკვეთილები",
        "due_that_day": "ამ დღის დავალებები",
        "exams": "გამოცდები",
        "no_lessons": "გაკვეთილები არ არის. ისიამოვნეთ დღით!",
        "room": "ოთახი {room}",
        "previous": "წინა",
        "next": "შემდეგი",
        "week_title": "მომდევნო 7 დღე",
        "marked_done": "✅ შესრულებულია! ყოჩაღ.",
        "streak_toast": "🔥 {n} დღე ზედიზედ!",
        "free_day": "თავისუფალი დღე",
        "homework_title": "დავალებები",
        "homework_none": "ამ კვირაში დავალება არ გაქვთ. ისიამოვნეთ!",
        "due": "ვადა: {date}",
        "homework_done": "შესრულებულია {done} / {total}",
        "homework_tap": "დააჭირეთ დავალებას ქვემოთ, რომ შესრულებულად მონიშნოთ.",
        "marks_title": "ნიშნები",
        "marks_none": "ნიშნები ჯერ არ არის.",
        "overall_average": "საერთო საშუალო",
        "latest_marks": "ბოლო ნიშნები",
        "attendance_title": "დასწრება",
        "present": "დაესწრო",
        "absent": "გააცდინა",
        "missed_lessons": "გაცდენილი გაკვეთილები",
        "attendance_none": "ამ თვეში დასწრების ჩანაწერები ჯერ არ არის.",
        "exams_title": "გამოცდები",
        "coming_up": "მოახლოებული",
        "open_now": "ახლა ხელმისაწვდომი",
        "latest_results": "ბოლო შედეგები",
        "exams_none": "მოახლოებული გამოცდები არ არის.",
        "minutes": "{n} წთ",
        "news_title": "განცხადებები",
        "news_none": "განცხადებები ჯერ არ არის.",
        "profile_title": "პროფილი",
        "email": "ელ-ფოსტა",
        "telegram_connected": "Telegram დაკავშირებულია ამ ანგარიშთან.",
        "unlink": "Telegram-ის გათიშვა",
        "unlink_confirm": (
            "გავთიშოთ ეს Telegram ანგარიშიდან <b>{email}</b>?\n\n"
            "შესვლის კოდები აქ მოდის, ამიტომ ხელახლა დაკავშირებამდე შესვლას ვერ შეძლებთ."
        ),
        "unlink_yes": "დიახ, გათიშვა",
        "unlinked": "გაითიშა. ხელახლა დაკავშირება ნებისმიერ დროს შეგიძლიათ ბრძანებით /start.",
        "settings_title": "პარამეტრები",
        "language": "ენა",
        "notifications": "შეტყობინებები",
        "on": "ჩართული",
        "off": "გამორთული",
        "notifications_hint": "ახალი ნიშნები, დავალებები, გამოცდები, განცხადებები და თქვენზე პასუხები აქაც მოვა.",
        "help_title": "რა შემიძლია",
        "help_body": (
            "/today — დღევანდელი გაკვეთილები, დავალებები და გამოცდები\n"
            "/week — მომდევნო 7 დღე\n"
            "/homework — დავალებები; მონიშნეთ შესრულებულად აქვე\n"
            "/marks — ნიშნები და საშუალოები\n"
            "/attendance — ამ თვის დასწრება\n"
            "/exams — მოახლოებული გამოცდები და შედეგები\n"
            "/news — ბოლო განცხადებები\n"
            "/profile — თქვენი ანგარიში\n"
            "/settings — ენა და შეტყობინებები\n"
            "/language — ენის შეცვლა: ქართული, English, Русский"
        ),
        "open": "გახსნა",
        "code_title": "თქვენი შესვლის კოდი",
        "code_hint": "მოქმედებს {minutes} წუთი. არავის გაუზიაროთ — სკოლა მას არასდროს მოგთხოვთ.",
        "copy_code": "კოდის კოპირება",
        "short_description": "თქვენი სკოლა Telegram-ში: ცხრილი, დავალებები, ნიშნები, დასწრება, სიახლეები და შესვლის კოდები.",
        "description": (
            "გამარჯობა! მე ვარ Blueapp-ის სკოლის ასისტენტი.\n\n"
            "• დღევანდელი გაკვეთილები და მომავალი კვირა\n"
            "• დავალებები, რომლებსაც აქვე მონიშნავთ\n"
            "• ნიშნები, დასწრება და გამოცდები\n"
            "• განცხადებები და თქვენზე პასუხები\n"
            "• შესვლის კოდები\n\n"
            "დააჭირეთ Start-ს და დააკავშირეთ სკოლის ანგარიში."
        ),
        "cmd_start": "მთავარი მენიუ",
        "cmd_today": "დღეს",
        "cmd_week": "მომდევნო 7 დღე",
        "cmd_homework": "დავალებები",
        "cmd_marks": "ნიშნები",
        "cmd_attendance": "დასწრება",
        "cmd_exams": "გამოცდები",
        "cmd_news": "განცხადებები",
        "cmd_profile": "პროფილი",
        "cmd_settings": "ენა და შეტყობინებები",
        "cmd_help": "დახმარება",
        "cmd_language": "ენა · Language · Язык",
    },
    "ru": {
        "menu": "Меню",
        "back": "Назад",
        "open_app": "Открыть приложение",
        "cancel": "Отмена",
        "cancelled": "Отменено. Когда будете готовы, нажмите «Подключить».",
        "role_student": "Ученик",
        "role_teacher": "Учитель",
        "role_parent": "Родитель",
        "role_admin": "Администратор",
        "greet_morning": "Доброе утро",
        "greet_afternoon": "Добрый день",
        "greet_evening": "Добрый вечер",
        "greet_night": "Доброй ночи",
        "welcome_title": "Добро пожаловать в Blueapp!",
        "welcome_body": (
            "Я ваш школьный помощник. Расписание, домашние задания, оценки, посещаемость и новости — "
            "всё здесь, в Telegram, а ещё коды для входа.\n\nЧтобы начать, подключите школьный аккаунт."
        ),
        "connect": "Подключить аккаунт",
        "ask_email": "Отправьте мне свою школьную почту.\nНапример: <code>name@school.edu</code>",
        "email_invalid": "Это не похоже на почту. Попробуйте ещё раз или нажмите «Отмена».",
        "email_unknown": "Я не нашёл эту почту в школьной системе. Проверьте написание и попробуйте ещё раз.",
        "email_taken": (
            "Эта почта уже подключена к другому аккаунту Telegram. "
            "Если это не вы, обратитесь в администрацию школы."
        ),
        "already_linked": "Этот Telegram уже подключён к аккаунту <b>{name}</b>.",
        "linked_title": "Готово, вы подключены!",
        "linked_body": "Привет, <b>{name}</b>! Теперь коды для входа и школьные уведомления будут приходить сюда.",
        "server_error": "У нас что-то пошло не так. Попробуйте через минуту.",
        "not_linked": "Сначала подключите школьный аккаунт — это займёт десять секунд.",
        "use_menu": "Нажмите кнопку ниже или откройте меню командой /start.",
        "not_for_role": "Для вашего аккаунта это недоступно.",
        "points": "Баллы",
        "streak": "Серия домашних заданий: <b>{n}</b> дн.",
        "homework_left": "Осталось заданий",
        "average": "Средний балл",
        "exam_running": "Идёт экзамен. Завершите его в приложении.",
        "children": "Ваши дети",
        "subjects_taught": "Ваши предметы",
        "lessons_today": "Уроки сегодня",
        "school_stats": "Школа в цифрах",
        "stat_users": "Пользователи",
        "stat_grades": "Классы",
        "stat_subjects": "Предметы",
        "stat_exams": "Экзамены",
        "btn_today": "Сегодня",
        "btn_week": "Неделя",
        "btn_homework": "Задания",
        "btn_marks": "Оценки",
        "btn_attendance": "Посещаемость",
        "btn_exams": "Экзамены",
        "btn_news": "Новости",
        "btn_profile": "Профиль",
        "btn_settings": "Настройки",
        "btn_help": "Помощь",
        "today": "Сегодня",
        "tomorrow": "Завтра",
        "yesterday": "Вчера",
        "lessons": "Уроки",
        "due_that_day": "Сдать в этот день",
        "exams": "Экзамены",
        "no_lessons": "Уроков нет. Хорошего дня!",
        "room": "каб. {room}",
        "previous": "Назад",
        "next": "Вперёд",
        "week_title": "Ближайшие 7 дней",
        "marked_done": "✅ Готово! Так держать.",
        "streak_toast": "🔥 {n} дн. подряд!",
        "free_day": "свободный день",
        "homework_title": "Домашние задания",
        "homework_none": "На этой неделе заданий нет. Отдыхайте!",
        "due": "до {date}",
        "homework_done": "Выполнено {done} из {total}",
        "homework_tap": "Нажмите на задание ниже, чтобы отметить его выполненным.",
        "marks_title": "Оценки",
        "marks_none": "Оценок пока нет.",
        "overall_average": "Общий средний балл",
        "latest_marks": "Последние оценки",
        "attendance_title": "Посещаемость",
        "present": "Был(а)",
        "absent": "Пропустил(а)",
        "missed_lessons": "Пропущенные уроки",
        "attendance_none": "В этом месяце отметок посещаемости пока нет.",
        "exams_title": "Экзамены",
        "coming_up": "Скоро",
        "open_now": "Доступны сейчас",
        "latest_results": "Последние результаты",
        "exams_none": "Ближайших экзаменов нет.",
        "minutes": "{n} мин",
        "news_title": "Объявления",
        "news_none": "Объявлений пока нет.",
        "profile_title": "Профиль",
        "email": "Почта",
        "telegram_connected": "Telegram подключён к этому аккаунту.",
        "unlink": "Отключить Telegram",
        "unlink_confirm": (
            "Отключить этот Telegram от <b>{email}</b>?\n\n"
            "Коды для входа приходят сюда, поэтому войти не получится, пока вы не подключитесь снова."
        ),
        "unlink_yes": "Да, отключить",
        "unlinked": "Отключено. Подключиться снова можно в любой момент командой /start.",
        "settings_title": "Настройки",
        "language": "Язык",
        "notifications": "Уведомления",
        "on": "Вкл.",
        "off": "Выкл.",
        "notifications_hint": "Новые оценки, задания, экзамены, объявления и ответы вам будут приходить и сюда.",
        "help_title": "Что я умею",
        "help_body": (
            "/today — уроки, задания и экзамены на сегодня\n"
            "/week — ближайшие 7 дней\n"
            "/homework — задания; отмечайте выполненные прямо здесь\n"
            "/marks — оценки и средние баллы\n"
            "/attendance — посещаемость за месяц\n"
            "/exams — ближайшие экзамены и результаты\n"
            "/news — последние объявления\n"
            "/profile — ваш аккаунт\n"
            "/settings — язык и уведомления\n"
            "/language — сменить язык: ქართული, English, Русский"
        ),
        "open": "Открыть",
        "code_title": "Ваш код для входа",
        "code_hint": "Действует {minutes} мин. Никому его не сообщайте: школа никогда его не попросит.",
        "copy_code": "Скопировать код",
        "short_description": "Ваша школа в Telegram: расписание, задания, оценки, посещаемость, новости и коды для входа.",
        "description": (
            "Привет! Я школьный помощник Blueapp.\n\n"
            "• Уроки на сегодня и неделю вперёд\n"
            "• Задания, которые можно отметить прямо здесь\n"
            "• Оценки, посещаемость и экзамены\n"
            "• Объявления и ответы вам\n"
            "• Коды для входа\n\n"
            "Нажмите «Старт» и подключите школьный аккаунт."
        ),
        "cmd_start": "Главное меню",
        "cmd_today": "Сегодня",
        "cmd_week": "Ближайшие 7 дней",
        "cmd_homework": "Домашние задания",
        "cmd_marks": "Оценки",
        "cmd_attendance": "Посещаемость",
        "cmd_exams": "Экзамены",
        "cmd_news": "Объявления",
        "cmd_profile": "Профиль",
        "cmd_settings": "Язык и уведомления",
        "cmd_help": "Помощь",
        "cmd_language": "Язык · ენა · Language",
    },
}

COMMANDS = (
    "start", "today", "week", "homework", "marks", "attendance", "exams", "news", "profile", "settings", "language", "help",
)


def normalize_language(code: str | None) -> str:
    """One of the bot's languages for a Telegram/app language code such as "en-GB"."""
    short = (code or "").split("-")[0].lower()
    return short if short in TEXTS else DEFAULT_LANGUAGE


def tr(language: str, key: str, **values) -> str:
    text = TEXTS.get(language, TEXTS[DEFAULT_LANGUAGE]).get(key) or TEXTS[DEFAULT_LANGUAGE][key]
    return text.format(**values) if values else text
