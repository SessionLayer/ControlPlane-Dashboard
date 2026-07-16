import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '../../api/client';
import { resourceKey } from '../../api/http';
import { unwrap } from '../../api/problem';
import type {
  AuditEventResource,
  BreakglassActivationResource,
  JitRequestResource,
  LockResource,
  NodeResource,
  SessionResource,
} from '../../api/types';

// Namespaced under 'overview' so these landing-page reads keep their own cache
// entries independent of the per-resource feature screens built in parallel.
const OVERVIEW = 'overview';

export interface ActiveSessions {
  items: SessionResource[];
  /** True when the first page did not exhaust the active set (count is a floor). */
  hasMore: boolean;
}

/** Active SSH sessions (`activeOnly`), first page only — enough for a KPI + list. */
export function useActiveSessions(limit = 100): UseQueryResult<ActiveSessions> {
  return useQuery({
    queryKey: resourceKey(OVERVIEW, 'sessions', limit),
    queryFn: async ({ signal }): Promise<ActiveSessions> => {
      const p = unwrap(
        await api.GET('/v1/sessions', {
          params: { query: { activeOnly: true, limit } },
          signal,
        }),
      );
      return { items: p.items, hasMore: p.nextCursor !== undefined };
    },
  });
}

/** JIT requests awaiting an approval decision. */
export function usePendingJit(): UseQueryResult<JitRequestResource[]> {
  return useQuery({
    queryKey: resourceKey(OVERVIEW, 'jit-pending'),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET('/v1/jit-requests', {
          params: { query: { state: 'PENDING_APPROVAL' } },
          signal,
        }),
      ).jitRequests,
  });
}

/** Current (unexpired) access locks. */
export function useActiveLocks(): UseQueryResult<LockResource[]> {
  return useQuery({
    queryKey: resourceKey(OVERVIEW, 'locks'),
    queryFn: async ({ signal }) =>
      unwrap(await api.GET('/v1/locks', { signal })).locks,
  });
}

/** Break-glass activations (newest first) — the incident-response signal. */
export function useBreakglassActivations(): UseQueryResult<
  BreakglassActivationResource[]
> {
  return useQuery({
    queryKey: resourceKey(OVERVIEW, 'breakglass'),
    queryFn: async ({ signal }) =>
      unwrap(await api.GET('/v1/breakglass/activations', { signal }))
        .activations,
  });
}

/** The node inventory, for health/status roll-ups. */
export function useNodes(): UseQueryResult<NodeResource[]> {
  return useQuery({
    queryKey: resourceKey(OVERVIEW, 'nodes'),
    queryFn: async ({ signal }) =>
      unwrap(await api.GET('/v1/nodes', { signal })).nodes,
  });
}

/** The most recent audit events (server returns newest-first). */
export function useRecentAudit(
  limit = 8,
): UseQueryResult<AuditEventResource[]> {
  return useQuery({
    queryKey: resourceKey(OVERVIEW, 'audit', limit),
    queryFn: async ({ signal }) =>
      unwrap(
        await api.GET('/v1/audit-events', {
          params: { query: { limit } },
          signal,
        }),
      ).items,
  });
}
