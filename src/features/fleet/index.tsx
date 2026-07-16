import { createRoute, type AnyRoute } from '@tanstack/react-router';
import { http, HttpResponse, type RequestHandler } from 'msw';

import { CP_BASE_URL } from '../../api/client';
import type {
  IssuedJoinToken,
  JoinTokenResource,
  NodeResource,
  SessionResource,
} from '../../api/types';
import { NodeList } from './NodeList';
import { SessionPage } from './SessionPage';
import { JoinTokenList } from './JoinTokenList';

export function createFleetRoutes(parent: AnyRoute): AnyRoute[] {
  return [
    createRoute({
      getParentRoute: () => parent,
      path: '/nodes',
      component: NodeList,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: '/sessions',
      component: SessionPage,
    }),
    createRoute({
      getParentRoute: () => parent,
      path: '/join-tokens',
      component: JoinTokenList,
    }),
  ];
}

// ---- Optional demo/E2E handlers -------------------------------------------

const demoNodes: NodeResource[] = [
  {
    id: '018f9c00-0000-7000-8000-0000000000a1',
    name: 'web-01',
    connectorKind: 'agentless',
    status: 'active',
    health: 'healthy',
    address: '10.0.1.11:22',
    labels: { env: 'prod', tier: 'web' },
    createdAt: '2026-07-01T09:00:00Z',
    updatedAt: '2026-07-10T09:00:00Z',
  },
  {
    id: '018f9c00-0000-7000-8000-0000000000a2',
    name: 'db-01',
    connectorKind: 'agent',
    status: 'quarantined',
    health: 'unreachable',
    address: '10.0.2.20:22',
    labels: { env: 'prod', tier: 'db' },
    owningGateway: 'gw-eu-1',
    statusReason: 'clone detected',
    createdAt: '2026-07-02T09:00:00Z',
    updatedAt: '2026-07-15T09:00:00Z',
  },
];

const demoTokens: JoinTokenResource[] = [
  {
    id: '018f9c00-0000-7000-8000-0000000000b1',
    nodeName: 'worker-07',
    joinMethod: 'token',
    singleUse: true,
    expiresAt: '2026-07-16T12:00:00Z',
    createdAt: '2026-07-16T11:00:00Z',
    createdBy: 'admin@test',
  },
];

const demoSessions: SessionResource[] = [
  {
    id: '018f9c00-0000-7000-8000-0000000000c1',
    identity: 'alice@corp',
    nodeName: 'web-01',
    principal: 'deploy',
    accessModel: 'standing',
    capabilities: ['shell', 'sftp'],
    startedAt: '2026-07-16T10:30:00Z',
  },
  {
    id: '018f9c00-0000-7000-8000-0000000000c2',
    identity: 'bob@corp',
    nodeName: 'db-01',
    principal: 'readonly',
    accessModel: 'jit',
    capabilities: ['shell'],
    startedAt: '2026-07-16T09:00:00Z',
    endedAt: '2026-07-16T09:45:00Z',
    endReason: 'client disconnect',
  },
];

export const fleetHandlers: RequestHandler[] = [
  http.get(`${CP_BASE_URL}/v1/nodes`, () =>
    HttpResponse.json({ nodes: demoNodes }),
  ),
  http.get(`${CP_BASE_URL}/v1/nodes/:nodeId`, ({ params }) => {
    const node = demoNodes.find((n) => n.id === params.nodeId);
    return node !== undefined
      ? HttpResponse.json(node)
      : HttpResponse.json({ title: 'Not found', status: 404 }, { status: 404 });
  }),
  http.get(`${CP_BASE_URL}/v1/join-tokens`, () =>
    HttpResponse.json({ joinTokens: demoTokens }),
  ),
  http.post(`${CP_BASE_URL}/v1/join-tokens`, async ({ request }) => {
    const body = (await request.json()) as { nodeName: string };
    const issued: IssuedJoinToken = {
      id: '018f9c00-0000-7000-8000-0000000000bf',
      token: 'sl-join-demo-6f3a9c2e0b17',
      nodeName: body.nodeName,
      joinMethod: 'token',
      singleUse: true,
      expiresAt: '2026-07-16T12:00:00Z',
    };
    return HttpResponse.json(issued, { status: 201 });
  }),
  http.get(`${CP_BASE_URL}/v1/sessions`, () =>
    HttpResponse.json({ items: demoSessions }),
  ),
  http.get(`${CP_BASE_URL}/v1/sessions/:sessionId`, ({ params }) => {
    const s = demoSessions.find((x) => x.id === params.sessionId);
    return s !== undefined
      ? HttpResponse.json(s)
      : HttpResponse.json({ title: 'Not found', status: 404 }, { status: 404 });
  }),
];
