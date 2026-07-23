import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../api/client';
import {
  resourceKey,
  useCursorList,
  type CursorListResult,
} from '../../api/http';
import { idempotencyHeader } from '../../api/idempotency';
import { unwrap } from '../../api/problem';
import type {
  AccessModel,
  IssueJoinTokenRequest,
  IssuedJoinToken,
  JoinTokenResource,
  NodeResource,
  QuarantineNodeRequest,
  RegisterNodeRequest,
  SessionResource,
  TerminateSessionRequest,
} from '../../api/types';

const NODES_KEY = resourceKey('nodes');
const JOIN_TOKENS_KEY = resourceKey('joinTokens');
const SESSIONS_KEY = resourceKey('sessions');

// ---- Nodes -----------------------------------------------------------------

export function useNodes() {
  return useQuery({
    queryKey: NODES_KEY,
    queryFn: async ({ signal }): Promise<NodeResource[]> =>
      unwrap(await api.GET('/v1/nodes', { signal })).nodes,
  });
}

/** Fresh single-node detail; only fetched while the detail dialog is open. */
export function useNode(nodeId: string | undefined) {
  return useQuery({
    queryKey: resourceKey('nodes', nodeId),
    enabled: nodeId !== undefined,
    queryFn: async ({ signal }): Promise<NodeResource> =>
      unwrap(
        await api.GET('/v1/nodes/{nodeId}', {
          params: { path: { nodeId: nodeId ?? '' } },
          signal,
        }),
      ),
  });
}

// NB: no contract-defined Idempotency-Key parameter on this operation — OBS-1
// (see the session report; same gap as the S17-post-dating IR/access mutations).
export function useRegisterNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: RegisterNodeRequest): Promise<NodeResource> =>
      unwrap(await api.POST('/v1/nodes', { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: NODES_KEY }),
  });
}

export function useRemoveNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nodeId: string): Promise<void> => {
      unwrap(
        await api.DELETE('/v1/nodes/{nodeId}', {
          params: { path: { nodeId } },
        }),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NODES_KEY }),
  });
}

export function useQuarantineNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      nodeId: string;
      body: QuarantineNodeRequest;
    }): Promise<NodeResource> =>
      unwrap(
        await api.POST('/v1/nodes/{nodeId}/quarantine', {
          params: { path: { nodeId: input.nodeId } },
          body: input.body,
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: NODES_KEY }),
  });
}

export function useReleaseQuarantine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nodeId: string): Promise<NodeResource> =>
      unwrap(
        await api.DELETE('/v1/nodes/{nodeId}/quarantine', {
          params: { path: { nodeId } },
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: NODES_KEY }),
  });
}

// ---- Join tokens -----------------------------------------------------------

export function useJoinTokens() {
  return useQuery({
    queryKey: JOIN_TOKENS_KEY,
    queryFn: async ({ signal }): Promise<JoinTokenResource[]> =>
      unwrap(await api.GET('/v1/join-tokens', { signal })).joinTokens,
  });
}

export function useIssueJoinToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: IssueJoinTokenRequest): Promise<IssuedJoinToken> =>
      unwrap(await api.POST('/v1/join-tokens', { body })),
    onSuccess: () => qc.invalidateQueries({ queryKey: JOIN_TOKENS_KEY }),
  });
}

export function useRevokeJoinToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (joinTokenId: string): Promise<void> => {
      unwrap(
        await api.DELETE('/v1/join-tokens/{joinTokenId}', {
          params: { path: { joinTokenId } },
        }),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: JOIN_TOKENS_KEY }),
  });
}

// ---- Sessions --------------------------------------------------------------

export interface SessionFilters {
  identity?: string;
  accessModel?: AccessModel;
  activeOnly?: boolean;
}

export function useSessions(
  filters: SessionFilters,
): CursorListResult<SessionResource> {
  return useCursorList(
    resourceKey('sessions', filters),
    async (cursor, signal) =>
      unwrap(
        await api.GET('/v1/sessions', {
          params: {
            query: {
              cursor,
              ...(filters.identity !== undefined && filters.identity !== ''
                ? { identity: filters.identity }
                : {}),
              ...(filters.accessModel !== undefined
                ? { accessModel: filters.accessModel }
                : {}),
              ...(filters.activeOnly === true ? { activeOnly: true } : {}),
            },
          },
          signal,
        }),
      ),
  );
}

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: resourceKey('sessions', 'one', sessionId),
    enabled: sessionId !== undefined,
    queryFn: async ({ signal }): Promise<SessionResource> =>
      unwrap(
        await api.GET('/v1/sessions/{sessionId}', {
          params: { path: { sessionId: sessionId ?? '' } },
          signal,
        }),
      ),
  });
}

export function useTerminateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      sessionId: string;
      body: TerminateSessionRequest;
    }): Promise<SessionResource> =>
      unwrap(
        await api.POST('/v1/sessions/{sessionId}/terminate', {
          params: {
            path: { sessionId: input.sessionId },
            header: idempotencyHeader(),
          },
          body: input.body,
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSIONS_KEY }),
  });
}
