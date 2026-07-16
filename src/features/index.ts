import type { AnyRoute } from '@tanstack/react-router';
import type { RequestHandler } from 'msw';

/**
 * Integration seam for the feature screen-groups (Parts B–F). Each feature area
 * owns files under `src/features/<area>/` and exports a route factory
 * `createXRoutes(parent): AnyRoute[]` plus its MSW handlers; they are composed
 * here so the shared router (`router.tsx`) and test server (`test/handlers.ts`)
 * never need per-feature edits that would collide across parallel authors.
 */
export function buildFeatureRoutes(parent: AnyRoute): AnyRoute[] {
  void parent;
  return [];
}

export const featureHandlers: RequestHandler[] = [];
