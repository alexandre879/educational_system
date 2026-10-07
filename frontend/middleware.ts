import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { intlMiddleware } from "./utils";
import { routing } from "./i18n/routing";

const PUBLIC_ROUTES = ["/login", "/register", "/login/forgotpassword"] as const;

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Let next-intl do its thing (rewrite/redirect/add headers if needed)
  // BUT do not return early, otherwise auth logic won't run.
  const intlResponse = intlMiddleware(request);

  const token = request.cookies.get("access")?.value;

  const segments = pathname.split("/"); // ["", "ka", "login"]
  const maybeLocale = segments[1];
  const locale = hasLocale(routing.locales, maybeLocale) ? maybeLocale : routing.defaultLocale;

  const pathWithoutLocale = hasLocale(routing.locales, maybeLocale)
    ? "/" + segments.slice(2).join("/")
    : pathname;

  // /ka or /en or /ru -> send to /{locale}/login
  if (pathWithoutLocale === "/" || pathWithoutLocale === "") {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  const pathIsPublic = (PUBLIC_ROUTES as readonly string[]).includes(pathWithoutLocale);

  // if logged in, block public pages
  if (pathIsPublic && token) {
    return NextResponse.redirect(new URL(`/${locale}/home`, request.url));
  }

  // if NOT logged in, block private pages
  if (!token && !pathIsPublic) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // 2) If next-intl produced a response (it often adds important headers),
  // return it; otherwise allow request through.
  return intlResponse ?? NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|api|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml|webmanifest|woff|woff2|ttf|eot)$|robots\\.txt|sitemap\\.xml).*)",
  ],
};