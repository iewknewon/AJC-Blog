export type AdminAuthRuntimeEnv = {
  ADMIN_PASSWORD?: unknown;
  SESSION_SECRET?: unknown;
};

export type AdminAuthConfig = {
  adminPassword: string | null;
  sessionSecret: string | null;
  isConfigured: boolean;
};

function readConfiguredValue(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  return value.trim() ? value : null;
}

export function getAdminAuthConfig(env?: AdminAuthRuntimeEnv | null): AdminAuthConfig {
  const adminPassword = readConfiguredValue(env?.ADMIN_PASSWORD);
  const sessionSecret = readConfiguredValue(env?.SESSION_SECRET);

  return {
    adminPassword,
    sessionSecret,
    isConfigured: Boolean(adminPassword && sessionSecret),
  };
}

export function shouldUseSecureAdminCookie(request: Pick<Request, 'url'> | URL | string) {
  const url =
    typeof request === 'string' ? request : request instanceof URL ? request.href : request.url;

  return new URL(url).protocol === 'https:';
}
