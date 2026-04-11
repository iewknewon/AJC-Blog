import { getAdminAuthConfig, shouldUseSecureAdminCookie } from '../../../lib/auth/config';
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, getAdminSessionMaxAge } from '../../../lib/auth/session';

export async function POST(context) {
  const formData = await context.request.formData();
  const password = String(formData.get('password') ?? '');
  const { adminPassword, sessionSecret, isConfigured } = getAdminAuthConfig(context.locals.runtime?.env);

  if (!isConfigured || !adminPassword || !sessionSecret) {
    console.error('[admin-auth] Admin authentication is not fully configured.');
    return context.redirect('/admin/login?error=config');
  }

  if (!password || password !== adminPassword) {
    return context.redirect('/admin/login?error=1');
  }

  const token = await createAdminSessionToken(sessionSecret);

  context.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureAdminCookie(context.request),
    path: '/',
    maxAge: getAdminSessionMaxAge(),
  });

  return context.redirect('/admin/posts');
}
