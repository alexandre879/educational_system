// import { cookies } from 'next/headers';
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// export default async function middleware(request: NextRequest) {
//   const path = request.nextUrl.pathname;
//   const token = (await cookies()).get('access')

//   const publicRoutes = ['/', '/login', '/register', '/login/forgotpassword'];
//   const pathIsPublic = publicRoutes.includes(path);

//   if (pathIsPublic && token) {
//     return NextResponse.redirect(new URL('/front/home', request.url));
//   }

//   if(path === '/' && !token) {
//     return NextResponse.redirect(new URL('/front/login', request.url));
//   }

//   if (!token && !pathIsPublic) {
//     return NextResponse.redirect(new URL('/front/login', request.url));
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: [
//     '/((?!api|_next/static|images|icons|searchIcon|_next/image|.*\\.png$).*)',
//   ],
// };




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

  // If user is not logged in, force login for protected pages
  if (!token && !pathIsPublic) {
    return NextResponse.redirect(new URL("/front/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run middleware only for frontend pages.
    // Do NOT touch /back (backend) or Next assets.
    "/front/:path*",
  ],
};