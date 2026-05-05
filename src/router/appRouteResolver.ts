// author: Bob
export interface AppRouteInfo {
  mode: 'editor' | 'share'
  shareToken: string | null
}

export function resolveAppRoute(pathname: string = window.location.pathname): AppRouteInfo {
  const match = pathname.match(/^\/share\/([^/]+)\/?$/)
  if (match?.[1]) {
    return {
      mode: 'share',
      shareToken: decodeURIComponent(match[1]),
    }
  }

  return {
    mode: 'editor',
    shareToken: null,
  }
}
