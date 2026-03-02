
// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// export default function middleware(request: NextRequest) {
//   const path = request.nextUrl.pathname;
//   const token = request.cookies.get("access")?.value;

//   if (path === "/") {
//     return NextResponse.redirect(new URL("/login", request.url));
//   }

//   const publicRoutes = ["/login", "/register", "/login/forgotpassword"];
//   const pathIsPublic = publicRoutes.includes(path);

//   if (pathIsPublic && token) {
//     return NextResponse.redirect(new URL("/home", request.url));
//   }

//   if (!token && !pathIsPublic) {
//     return NextResponse.redirect(new URL("/login", request.url));
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: [
//     "/((?!_next|api|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml|woff|woff2|ttf|eot)$|robots\\.txt|sitemap\\.xml).*)",
//   ],
// };




import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware({
  locales: ["en", "ka"],
  defaultLocale: "ka",
  localePrefix: "always",
});

// If you add more later, keep them here
const PUBLIC_ROUTES = ["/login", "/register", "/login/forgotpassword"] as const;

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) First: make sure locale exists in URL (/en/... or /ka/...)
  const intlResponse = intlMiddleware(request);
  if (intlResponse) return intlResponse;

  // 2) Now: run your auth logic on locale-aware path
  // pathname example: /en/login, /ka/home, etc.
  const token = request.cookies.get("access")?.value;

  const segments = pathname.split("/"); // ["", "en", "login"]
  const locale = segments[1]; // "en" | "ka"
  const pathWithoutLocale = "/" + segments.slice(2).join("/"); // "/login" | "/home" | "/"

  // If user goes to /en, /ka => redirect to /{locale}/login
  if (pathWithoutLocale === "/" || pathWithoutLocale === "") {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  const pathIsPublic = (PUBLIC_ROUTES as readonly string[]).includes(pathWithoutLocale);

  if (pathIsPublic && token) {
    return NextResponse.redirect(new URL(`/${locale}/home`, request.url));
  }

  if (!token && !pathIsPublic) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|api|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml|woff|woff2|ttf|eot)$|robots\\.txt|sitemap\\.xml).*)",
  ],
};