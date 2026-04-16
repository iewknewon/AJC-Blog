export type EditorialRouteKind = 'none' | 'home' | 'article';

export function getEditorialRouteKind(pathname: string): EditorialRouteKind {
  if (pathname === '/') {
    return 'home';
  }

  if (/^\/blog\/[^/]+\/?$/.test(pathname)) {
    return 'article';
  }

  return 'none';
}

export function isEditorialRoute(pathname: string): boolean {
  return getEditorialRouteKind(pathname) !== 'none';
}
