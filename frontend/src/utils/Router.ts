export class Router {
  private routes: Map<string, () => void> = new Map()
  private dynamicRoutes: Array<{ pattern: RegExp, handler: (params: any) => void }> = []

  addRoute(path: string, handler: () => void): void {
    this.routes.set(path, handler)
  }

  addDynamicRoute(pattern: RegExp, handler: (params: any) => void): void {
    this.dynamicRoutes.push({ pattern, handler })
  }

  navigate(path: string): void {
    // First try exact match
    const handler = this.routes.get(path)
    if (handler) {
      handler()
      return
    }

    // Then try dynamic routes
    for (const route of this.dynamicRoutes) {
      const match = path.match(route.pattern)
      if (match) {
        const params = match.groups || {}
        route.handler(params)
        return
      }
    }

    // Default to home page if route not found
    const homeHandler = this.routes.get('/')
    if (homeHandler) {
      homeHandler()
    }
  }
}
