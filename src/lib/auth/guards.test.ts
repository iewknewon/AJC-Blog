import test from 'node:test';
import assert from 'node:assert/strict';

import { isAdminAuthenticated } from './guards';
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from './session';

function createCookieStore(value?: string) {
  return {
    get(name: string) {
      if (name !== ADMIN_SESSION_COOKIE || !value) {
        return undefined;
      }

      return { value };
    },
  };
}

test('isAdminAuthenticated 在 SESSION_SECRET 缺失时返回 false', async () => {
  const token = await createAdminSessionToken('super-secret', 1_700_000_000_000);

  assert.equal(await isAdminAuthenticated(createCookieStore(token), { SESSION_SECRET: '' }), false);
  assert.equal(await isAdminAuthenticated(createCookieStore(token), {}), false);
});

test('isAdminAuthenticated 在 cookie 和 SESSION_SECRET 都有效时返回 true', async () => {
  const token = await createAdminSessionToken('super-secret');

  assert.equal(
    await isAdminAuthenticated(createCookieStore(token), {
      ADMIN_PASSWORD: 'gisgisgis',
      SESSION_SECRET: 'super-secret',
    }),
    true,
  );
});
