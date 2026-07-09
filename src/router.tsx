import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

import { HealthVersionPanel } from './components/HealthVersionPanel';
import { RootLayout } from './components/RootLayout';
import { RouteError } from './components/RouteError';

// Code-based route tree (no file-based router plugin). Keeping routing explicit
// means the only generated-and-drift-checked artifact in this repo is the API
// client (src/api/schema.d.ts) — there is no second codegen surface to keep in
// sync. Real screens are added here in Session 17.
const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HealthVersionPanel,
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultErrorComponent: RouteError,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
