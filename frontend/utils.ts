import createMiddleware from "next-intl/middleware";

export const intlMiddleware = createMiddleware({
  locales: ["en", "ka", "ru"],
  defaultLocale: "ka",
  localePrefix: "always",
});