# Blueapp mobile (iOS & Android)

The school system as a native app, built with Expo (SDK 57) and Expo Router. It talks to the same Django API as the web app.

| Role | Tabs |
|---|---|
| Student | Home · Exams (available + results with answer review) · Exercises (tick off, streaks) · News · More (marks, calendar, schedule, books, leaderboard, search, AI assistant) |
| Teacher | Home · Attendance · Exercises (create, see who's done) · News (post) · More (gradebook, exam builder, calendar, search) |
| Parent | Home (children: average mark, attendance %, homework; tap for a month of attendance, marks and exam results) · Schedule · Exercises · News · More |
| Admin | Home (stats) · News · More |

Push notifications: new announcements, exercises and exams reach a grade's students (and parents), new marks reach the student and their parents, teachers hear about comments on their announcements, and parents get attendance updates. Notifications arrive in the language the app is set to.

Also built in: data is saved on the phone, so screens open instantly and still work offline (a banner says so); an optional Face ID / fingerprint lock (Settings → Security); confetti for a score of 80% or more.

## Run it on your phone

Requirements: Node 22 (run `nvm use` inside `mobile/`, it reads `.nvmrc`) and the **Expo Go** app on your phone (same Wi-Fi as your computer). After switching Wi-Fi or hotspot, run `./set-dev-ip.sh` in the repository root.

1. Start the backend so the phone can reach it:
   ```bash
   cd ../backend
   myenv/bin/python manage.py runserver 0.0.0.0:8000
   ```
   The app finds it automatically on the computer running Expo; set `EXPO_PUBLIC_API_URL` in `.env.local` (see `.env.example`) only to use another backend.
2. Start the app:
   ```bash
   npm install
   npx expo start
   ```
3. Open it on the phone:
   - **iPhone:** sign in to the same Expo account on the computer (`npx expo login`) and in Expo Go (account icon, top right); the project then appears on Expo Go's home screen.
   - **Android:** in Expo Go, tap *Scan QR code* and scan the code in the terminal.
   - **No phone handy:** press `w` in the terminal to open the app in your computer's browser.

### Demo data

A fresh development database makes most screens empty. Fill it (lessons, homework, exams with results, marks, attendance, announcements) for the classes that already have students:

```bash
cd ../backend && myenv/bin/python manage.py seed_demo
```

It uses your existing teacher accounts, only adds what's missing when run again, and refuses to run when `DEBUG` is off.

### Face ID

The lock works with a fingerprint on Android in Expo Go, but **Face ID on iPhone needs a development build** (Expo Go can't use it).

## Push notifications

Push needs an (free) Expo account and an EAS project:

1. `npx eas-cli@latest login`
2. `npx eas-cli@latest init` and paste the printed project id into `EAS_PROJECT_ID` in `app.config.ts`.
3. **iPhone:** push already works in Expo Go once step 2 is done.
   **Android:** Expo Go can't receive push (since SDK 53), so install a development build:
   ```bash
   npx expo install expo-dev-client
   npx eas-cli@latest build --profile development --platform android
   ```
   then run `npx expo start` and open the project from the installed "Blueapp (Dev)" app.
   (With `expo-dev-client` installed, `npx expo start` opens in development-build mode; press `s` to switch back to Expo Go.)
4. Credentials (EAS walks you through it): iOS needs an Apple Developer account (EAS creates the APNs key); Android needs Firebase Cloud Messaging V1 credentials (`npx eas-cli@latest credentials`).

The backend needs nothing extra; set `EXPO_ACCESS_TOKEN` only if you enable "enhanced push security" for the Expo project.

## Store builds

1. Check `EXPO_PUBLIC_API_URL` for the `preview`/`production` profiles in `eas.json` (it must be the HTTPS URL of the deployed API).
2. The icon and splash (`assets/images/`) are generated from the brand gradient and graduation cap; replace them if the school has its own logo.
3. Build and submit:
   ```bash
   npx eas-cli@latest build --profile production --platform all
   npx eas-cli@latest submit --platform ios      # App Store Connect (Apple Developer account, $99/year)
   npx eas-cli@latest submit --platform android  # Google Play (developer account, $25 once)
   ```

Bundle/package id: `store.blueapp.school` (`store.blueapp.school.dev` for development builds); change it in `app.config.ts` before the first store build if you prefer another.

### Crash reporting (Sentry)

Off until configured. For store builds:

1. Create a React Native project at sentry.io.
2. Add `EXPO_PUBLIC_SENTRY_DSN` to the build profile's `env` in `eas.json`.
3. For readable stack traces, set `SENTRY_ORG` and `SENTRY_PROJECT` (in `eas.json`) and a `SENTRY_AUTH_TOKEN` EAS secret; the Sentry config plugin is only added when org and project are set.

The backend reports errors when `SENTRY_DSN` is set in its environment.

## Checks

```bash
npx tsc --noEmit      # types (including every route used in navigation)
npx expo lint         # lint, with the React Compiler rules
npm test              # unit tests: API token refresh, translations, dates and calendars
npx expo-doctor       # dependency/config health
```

## Project layout

```
src/app/            screens (Expo Router: every file is a route)
  sign-in.tsx       Telegram-code login
  (app)/(tabs)/     the five tabs, each with its own stack
  (app)/exam/[id]   full-screen exam with server-driven timer
src/api/            API client (token refresh, secure token storage), endpoints, types
src/auth/           session state (restores offline with the cached profile)
src/i18n/           ka / en / ru messages (type-checked against English)
src/notifications/  push registration and notification-tap routing
src/providers/      data fetching, saved offline copy
src/security/       Face ID / fingerprint lock
src/components/     shared UI kit
src/features/       larger screen sections shared between routes
```
