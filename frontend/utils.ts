import createMiddleware from "next-intl/middleware";

export const intlMiddleware = createMiddleware({
  locales: ["en", "ka"],
  defaultLocale: "ka",
  localePrefix: "always",
});