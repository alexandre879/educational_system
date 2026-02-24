import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = (await cookies()).get("access");

  const publicRoutes = [
    "/front",
    "/front/",
    "/front/login",
    "/front/register",
    "/front/login/forgotpassword",
  ];

  const pathIsPublic = publicRoutes.includes(path);

  if (pathIsPublic && token) {
    return NextResponse.redirect(new URL("/front/home", request.url));
  }

  if (!token && !pathIsPublic) {
    return NextResponse.redirect(new URL("/front/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/front/:path*",
  ],
};