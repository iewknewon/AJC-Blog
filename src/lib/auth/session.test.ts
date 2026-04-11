import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from './session';

test('createAdminSessionToken 会生成可验证的管理员会话', async () => {
  const token = await createAdminSessionToken('super-secret', 1_700_000_000_000);

  assert.ok(token.includes('.'));
  assert.equal(await verifyAdminSessionToken(token, 'super-secret', 1_700_000_000_000), true);
});

test('verifyAdminSessionToken 会拒绝过期 token', async () => {
  const token = await createAdminSessionToken('super-secret', 1_700_000_000_000);

  assert.equal(await verifyAdminSessionToken(token, 'super-secret', 1_700_000_000_000 + 8 * 24 * 60 * 60 * 1000), false);
});

test('verifyAdminSessionToken 会拒绝被篡改的 token', async () => {
  const token = await createAdminSessionToken('super-secret', 1_700_000_000_000);
  const tamperedToken = `${token}x`;

  assert.equal(await verifyAdminSessionToken(tamperedToken, 'super-secret', 1_700_000_000_000), false);
});

test('ADMIN_SESSION_COOKIE 暴露统一 cookie 名称', () => {
  assert.equal(ADMIN_SESSION_COOKIE, 'ajc_admin_session');
});
