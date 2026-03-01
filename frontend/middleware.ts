// import { cookies } from "next/headers";
// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// export default async function middleware(request: NextRequest) {
//   const path = request.nextUrl.pathname;
//   const token = (await cookies()).get("access");

//   const publicRoutes = [
//     "/",
//     "/login",
//     "/register",
//     "/login/forgotpassword",
//   ];

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
//     "/((?!_next|api|favicon.ico).*)",
//   ],
// };



import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get("access")?.value;

  // Force root to /login
  if (path === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const publicRoutes = ["/login", "/register", "/login/forgotpassword"];
  const pathIsPublic = publicRoutes.includes(path);

  if (pathIsPublic && token) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (!token && !pathIsPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};