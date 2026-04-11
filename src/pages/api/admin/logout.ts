import { ADMIN_SESSION_COOKIE } from '../../../lib/auth/session';

export async function POST(context) {
  context.cookies.delete(ADMIN_SESSION_COOKIE, {
    path: '/',
  });

  return context.redirect('/admin/login');
}
