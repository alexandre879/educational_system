

// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";
// import { intlMiddleware } from "./utils";

// const PUBLIC_ROUTES = ["/login", "/register", "/login/forgotpassword"] as const;

// const SUPPORTED = ["en", "ka", "ru"] as const;
// type Locale = (typeof SUPPORTED)[number];

// function isLocale(v: string | undefined): v is Locale {
//   return !!v && (SUPPORTED as readonly string[]).includes(v);
// }

// export default function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl;

//   // next-intl middleware first (adds locale handling)
//   const intlResponse = intlMiddleware(request);
//   if (intlResponse) return intlResponse;

//   const token = request.cookies.get("access")?.value;

//   const segments = pathname.split("/"); // ["", "en", "login"]
//   const maybeLocale = segments[1];
//   const locale: Locale = isLocale(maybeLocale) ? maybeLocale : "ka";

//   const pathWithoutLocale = isLocale(maybeLocale)
//     ? "/" + segments.slice(2).join("/")
//     : pathname;

//   // If user goes to /en or /ka or /ru => redirect to /{locale}/login
//   if (pathWithoutLocale === "/" || pathWithoutLocale === "") {
//     return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
//   }

//   const pathIsPublic = (PUBLIC_ROUTES as readonly string[]).includes(pathWithoutLocale);

//   if (pathIsPublic && token) {
//     return NextResponse.redirect(new URL(`/${locale}/home`, request.url));
//   }

//   if (!token && !pathIsPublic) {
//     return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: [
//     "/((?!_next|api|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml|woff|woff2|ttf|eot)$|robots\\.txt|sitemap\\.xml).*)",
//   ],
// };



import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { intlMiddleware } from "./utils";

const PUBLIC_ROUTES = ["/login", "/register", "/login/forgotpassword"] as const;

const SUPPORTED = ["en", "ka", "ru"] as const;
type Locale = (typeof SUPPORTED)[number];

function isLocale(v: string | undefined): v is Locale {
  return !!v && (SUPPORTED as readonly string[]).includes(v);
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Let next-intl do its thing (rewrite/redirect/add headers if needed)
  // BUT do not return early, otherwise auth logic won't run.
  const intlResponse = intlMiddleware(request);

  const token = request.cookies.get("access")?.value;

  const segments = pathname.split("/"); // ["", "ka", "login"]
  const maybeLocale = segments[1];
  const locale: Locale = isLocale(maybeLocale) ? maybeLocale : "ka";

  const pathWithoutLocale = isLocale(maybeLocale)
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
    "/((?!_next|api|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml|woff|woff2|ttf|eot)$|robots\\.txt|sitemap\\.xml).*)",
  ],
};