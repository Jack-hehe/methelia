import { NextResponse, type NextRequest } from "next/server";
import { demoAccess } from "./server/deployment";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/health") return NextResponse.next();
  return demoAccess(request.headers) || NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
