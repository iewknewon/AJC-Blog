import { getAdminAuthConfig, type AdminAuthRuntimeEnv } from './config';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from './session';

type CookieValue = {
  value: string;
};

type CookieStore = {
  get(name: string): CookieValue | undefined;
};

export async function isAdminAuthenticated(cookies: CookieStore, env?: AdminAuthRuntimeEnv | null) {
  const sessionCookie = cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const { sessionSecret } = getAdminAuthConfig(env);

  if (!sessionCookie || !sessionSecret) {
    return false;
  }

  return verifyAdminSessionToken(sessionCookie, sessionSecret);
}

export async function requireAdminApiAuth(request: {
  cookies: CookieStore;
  env?: AdminAuthRuntimeEnv | null;
}) {
  const authenticated = await isAdminAuthenticated(request.cookies, request.env);

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
