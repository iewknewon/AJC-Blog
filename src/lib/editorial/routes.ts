export function isEditorialRoute(pathname: string): boolean {
  if (pathname === '/') {
    return true;
  }

  return /^\/blog\/[^/]+\/?$/.test(pathname);
}
