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

// Live posture: always refetch when the overview (re)mounts. The 'overview'
// namespace isn't invalidated by IR/fleet mutations on other screens, so without
// this a just-released lock / just-approved JIT could linger on the incident
// dashboard for up to the global staleTime when the operator navigates back.
const LIVE = { staleTime: 0 } as const;

export interface ActiveSessions {
  items: SessionResource[];
  /** True when the first page did not exhaust the active set (count is a floor). */
  hasMore: boolean;
}

/** Active SSH sessions (`activeOnly`), first page only — enough for a KPI + list. */
export function useActiveSessions(limit = 100): UseQueryResult<ActiveSessions> {
  return useQuery({
    ...LIVE,
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
    ...LIVE,
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
    ...LIVE,
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
    ...LIVE,
    queryKey: resourceKey(OVERVIEW, 'breakglass'),
    queryFn: async ({ signal }) =>
      unwrap(await api.GET('/v1/breakglass/activations', { signal }))
        .activations,
  });
}

/** The node inventory, for health/status roll-ups. */
export function useNodes(): UseQueryResult<NodeResource[]> {
  return useQuery({
    ...LIVE,
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
    ...LIVE,
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
