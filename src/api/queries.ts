import { queryOptions } from '@tanstack/react-query';

import { api } from './client';
import type { components } from './schema';

export type VersionInfo = components['schemas']['VersionInfo'];
export type HealthStatus = components['schemas']['HealthStatus'];
export type ProblemDetails = components['schemas']['ProblemDetails'];

/**
 * Error thrown when a Control Plane call fails or returns an RFC 9457
 * problem+json body. Carries the HTTP status and parsed problem so the UI can
 * surface a useful (but non-leaking) message.
 */
export class ProblemError extends Error {
  readonly status: number | undefined;
  readonly problem: ProblemDetails | undefined;

  constructor(status: number | undefined, problem: ProblemDetails | undefined) {
    const summary =
      problem?.title ??
      `Control Plane request failed${status !== undefined ? ` (HTTP ${String(status)})` : ''}`;
    super(summary);
    this.name = 'ProblemError';
    this.status = status;
    this.problem = problem;
  }
}

/** TanStack Query options for `GET /v1/version` (Design §13; FR-API-1). */
export const versionQueryOptions = queryOptions({
  queryKey: ['cp', 'version'] as const,
  queryFn: async ({ signal }): Promise<VersionInfo> => {
    const { data, error, response } = await api.GET('/v1/version', { signal });
    if (data !== undefined) return data;
    throw new ProblemError(response.status, error);
  },
});

/** TanStack Query options for `GET /v1/healthz` (liveness/readiness probe). */
export const healthQueryOptions = queryOptions({
  queryKey: ['cp', 'healthz'] as const,
  queryFn: async ({ signal }): Promise<HealthStatus> => {
    const { data, error, response } = await api.GET('/v1/healthz', { signal });
    if (data !== undefined) return data;
    throw new ProblemError(response.status, error);
  },
});
