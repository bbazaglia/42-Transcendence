export class Router {
  private routes: Map<string, () => void> = new Map()

  addRoute(path: string, handler: () => void): void {
    this.routes.set(path, handler)
  }

  navigate(path: string): void {
    const handler = this.routes.get(path)
    if (handler) {
      handler()
    } else {
      // Default to home page if route not found
      const homeHandler = this.routes.get('/')
      if (homeHandler) {
        homeHandler()
      }
    }
  }
} 