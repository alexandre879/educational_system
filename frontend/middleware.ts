import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = (await cookies()).get('access')

  const publicRoutes = ['/', '/login', '/register', '/login/forgotpassword'];
  const pathIsPublic = publicRoutes.includes(path);

  if (pathIsPublic && token) {
    return NextResponse.redirect(new URL('/front/home', request.url));
  }

  if(path === '/' && !token) {
    return NextResponse.redirect(new URL('/front/login', request.url));
  }

  if (!token && !pathIsPublic) {
    return NextResponse.redirect(new URL('/front/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|images|icons|searchIcon|_next/image|.*\\.png$).*)',
  ],
};