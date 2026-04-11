import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from './session';

type CookieValue = {
  value: string;
};

type CookieStore = {
  get(name: string): CookieValue | undefined;
};

export async function isAdminAuthenticated(cookies: CookieStore, secret: string) {
  const sessionCookie = cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    return false;
  }

  return verifyAdminSessionToken(sessionCookie, secret);
}

export async function requireAdminApiAuth(request: { cookies: CookieStore; secret: string }) {
  const authenticated = await isAdminAuthenticated(request.cookies, request.secret);

  if (!authenticated) {
    return new Response(JSON.stringify({ message: '未登录或登录已失效' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }

  return null;
}
