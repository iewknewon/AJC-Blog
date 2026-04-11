import test from 'node:test';
import assert from 'node:assert/strict';

import { getAdminAuthConfig, shouldUseSecureAdminCookie } from './config';

test('getAdminAuthConfig 会读取完整的后台鉴权配置', () => {
  assert.deepEqual(getAdminAuthConfig({ ADMIN_PASSWORD: 'gisgisgis', SESSION_SECRET: '465465165165' }), {
    adminPassword: 'gisgisgis',
    sessionSecret: '465465165165',
    isConfigured: true,
  });
});

test('getAdminAuthConfig 会把空字符串视为未配置', () => {
  assert.deepEqual(getAdminAuthConfig({ ADMIN_PASSWORD: '   ', SESSION_SECRET: '' }), {
    adminPassword: null,
    sessionSecret: null,
    isConfigured: false,
  });
});

test('shouldUseSecureAdminCookie 会根据协议决定 cookie 是否为 secure', () => {
  assert.equal(shouldUseSecureAdminCookie('https://gisgis.eu.cc/admin/login'), true);
  assert.equal(shouldUseSecureAdminCookie('http://127.0.0.1:4321/admin/login'), false);
});
