export { proxy } from './middleware/proxy';

// Next.js requires matcher configuration to be declared in the root proxy file.
export const config = {
  matcher: [
    /*
     * Match all request paths except framework assets and public static files.
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|eot)$).*)',
  ],
};
