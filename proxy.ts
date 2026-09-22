export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/admin/:path*", "/conta/:path*"],
};
