import test from 'node:test';
import assert from 'node:assert/strict';

import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from './session';
import { POST } from '../../pages/api/admin/login';

type LoginTestEnv = {
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
};

type CookieSetCall = {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    sameSite: string;
    secure: boolean;
    path: string;
    maxAge: number;
  };
};

function createLoginContext({
  password,
  env,
  url = 'https://gisgis.eu.cc/api/admin/login',
}: {
  password: string;
  env: LoginTestEnv;
  url?: string;
}) {
  const formData = new FormData();
  formData.set('password', password);

  const cookieSetCalls: CookieSetCall[] = [];

  return {
    context: {
      request: new Request(url, {
        method: 'POST',
        body: formData,
      }),
      locals: {
        runtime: {
          env,
        },
      },
      cookies: {
        set(name: string, value: string, options: CookieSetCall['options']) {
          cookieSetCalls.push({ name, value, options });
        },
      },
      redirect(location: string) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: location,
          },
        });
      },
    },
    cookieSetCalls,
  };
}

async function runWithoutConsoleError(action: () => Promise<void>) {
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await action();
  } finally {
    console.error = originalConsoleError;
  }
}

test('POST 在 SESSION_SECRET 缺失时跳转到配置错误提示', async () => {
  await runWithoutConsoleError(async () => {
    const { context, cookieSetCalls } = createLoginContext({
      password: 'gisgisgis',
      env: {
        ADMIN_PASSWORD: 'gisgisgis',
      },
    });

    const response = await POST(context);

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), '/admin/login?error=config');
    assert.equal(cookieSetCalls.length, 0);
  });
});

test('POST 在 ADMIN_PASSWORD 缺失时不会伪装成密码错误', async () => {
  await runWithoutConsoleError(async () => {
    const { context, cookieSetCalls } = createLoginContext({
      password: 'gisgisgis',
      env: {
        SESSION_SECRET: '465465165165',
      },
    });

    const response = await POST(context);

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), '/admin/login?error=config');
    assert.equal(cookieSetCalls.length, 0);
  });
});

test('POST 在密码错误时返回密码错误提示', async () => {
  const { context, cookieSetCalls } = createLoginContext({
    password: 'wrong-password',
    env: {
      ADMIN_PASSWORD: 'gisgisgis',
      SESSION_SECRET: '465465165165',
    },
  });

  const response = await POST(context);

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), '/admin/login?error=1');
  assert.equal(cookieSetCalls.length, 0);
});

test('POST 在 https 请求下会写入 secure cookie 并跳转后台', async () => {
  const { context, cookieSetCalls } = createLoginContext({
    password: 'gisgisgis',
    env: {
      ADMIN_PASSWORD: 'gisgisgis',
      SESSION_SECRET: '465465165165',
    },
  });

  const response = await POST(context);

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), '/admin/posts');
  assert.equal(cookieSetCalls.length, 1);
  assert.equal(cookieSetCalls[0].name, ADMIN_SESSION_COOKIE);
  assert.equal(cookieSetCalls[0].options.secure, true);
  assert.equal(
    await verifyAdminSessionToken(cookieSetCalls[0].value, '465465165165'),
    true,
  );
});

test('POST 在本地 http 请求下会写入非 secure cookie', async () => {
  const { context, cookieSetCalls } = createLoginContext({
    password: 'gisgisgis',
    env: {
      ADMIN_PASSWORD: 'gisgisgis',
      SESSION_SECRET: '465465165165',
    },
    url: 'http://127.0.0.1:4321/api/admin/login',
  });

  const response = await POST(context);

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), '/admin/posts');
  assert.equal(cookieSetCalls.length, 1);
  assert.equal(cookieSetCalls[0].options.secure, false);
});
