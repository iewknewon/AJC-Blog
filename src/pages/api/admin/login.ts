import { ADMIN_SESSION_COOKIE, createAdminSessionToken, getAdminSessionMaxAge } from '../../../lib/auth/session';

export async function POST(context) {
  const formData = await context.request.formData();
  const password = String(formData.get('password') ?? '');
  const expectedPassword = context.locals.runtime.env.ADMIN_PASSWORD;
  const sessionSecret = context.locals.runtime.env.SESSION_SECRET;

  if (!password || password !== expectedPassword) {
    return context.redirect('/admin/login?error=1');
  }

  const token = await createAdminSessionToken(sessionSecret);

  context.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: getAdminSessionMaxAge(),
  });

  return context.redirect('/admin/posts');
}
