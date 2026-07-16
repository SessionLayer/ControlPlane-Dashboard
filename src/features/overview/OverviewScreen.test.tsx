import { screen, waitFor, within } from '@testing-library/react';
import { http, type HttpResponseResolver } from 'msw';
import { describe, expect, it } from 'vitest';

import { cp, ok, page, problem } from '../../test/msw';
import { server } from '../../test/server';
import { renderWithProviders } from '../../test/utils';
import { OverviewScreen } from './OverviewScreen';

const PERMS = ['rbac:read', 'audit:read'] as const;

interface Overrides {
  sessions?: HttpResponseResolver;
  jit?: HttpResponseResolver;
  locks?: HttpResponseResolver;
  bg?: HttpResponseResolver;
  nodes?: HttpResponseResolver;
  audit?: HttpResponseResolver;
}

/** Register all six overview reads; unset endpoints resolve to an empty list. */
function mockOverview(o: Overrides = {}): void {
  server.use(
    http.get(cp('/v1/sessions'), o.sessions ?? (() => page([]))),
    http.get(cp('/v1/jit-requests'), o.jit ?? (() => ok({ jitRequests: [] }))),
    http.get(cp('/v1/locks'), o.locks ?? (() => ok({ locks: [] }))),
    http.get(
      cp('/v1/breakglass/activations'),
      o.bg ?? (() => ok({ activations: [] })),
    ),
    http.get(cp('/v1/nodes'), o.nodes ?? (() => ok({ nodes: [] }))),
    http.get(cp('/v1/audit-events'), o.audit ?? (() => page([]))),
  );
}

const SESSIONS = [
  {
    id: 's1',
    identity: 'alice@corp.example',
    nodeName: 'web-01',
    principal: 'deploy',
    accessModel: 'standing',
    capabilities: ['shell'],
    startedAt: '2026-07-16T09:41:00Z',
  },
  {
    id: 's2',
    identity: 'bob@corp.example',
    nodeName: 'db-02',
    principal: 'postgres',
    accessModel: 'jit',
    capabilities: ['shell'],
    startedAt: '2026-07-16T10:12:00Z',
  },
];

const JIT = [
  {
    id: 'j1',
    requester: 'carol@corp.example',
    targetNodeName: 'db-02',
    principal: 'postgres',
    reason: 'INC-4821',
    state: 'PENDING_APPROVAL',
    requestedAt: '2026-07-16T10:05:00Z',
    approvalDeadline: '2026-07-16T10:35:00Z',
  },
];

const LOCKS = [
  {
    id: 'l1',
    target: { identities: ['mallory@corp.example'] },
    reason: 'Suspected compromise',
    createdAt: '2026-07-16T08:50:00Z',
  },
];

const BREAKGLASS = [
  {
    id: 'b1',
    identity: 'oncall@corp.example',
    principal: 'root',
    reason: 'IdP outage',
    reviewStatus: 'pending',
    activatedAt: '2026-07-16T07:20:00Z',
  },
  {
    id: 'b2',
    identity: 'dev@corp.example',
    principal: 'root',
    reason: 'earlier',
    reviewStatus: 'reviewed',
    activatedAt: '2026-07-15T07:20:00Z',
  },
];

const NODES_MIXED = [
  {
    id: 'n1',
    name: 'web-01',
    connectorKind: 'agent',
    status: 'active',
    health: 'healthy',
  },
  {
    id: 'n2',
    name: 'db-02',
    connectorKind: 'agentless',
    status: 'active',
    health: 'healthy',
  },
  {
    id: 'n3',
    name: 'app-03',
    connectorKind: 'agent',
    status: 'active',
    health: 'unhealthy',
  },
  {
    id: 'n4',
    name: 'cache-04',
    connectorKind: 'agent',
    status: 'quarantined',
    health: 'unreachable',
  },
];

const AUDIT = [
  {
    id: 'a1',
    occurredAt: '2026-07-16T10:12:00Z',
    actor: 'bob@corp.example',
    action: 'session.connect',
    outcome: 'allowed',
    subject: 'db-02',
  },
];

/** Text of a KPI tile's value, scoped to the metrics region (labels also appear
 *  as section titles). */
function kpiValue(label: string): string {
  const region = screen.getByRole('region', { name: 'Key metrics' });
  const card = within(region).getByText(label).closest('.metric-card');
  return card?.querySelector('.metric-value')?.textContent ?? '';
}

describe('OverviewScreen', () => {
  it('renders KPIs and recent items aggregated from the API', async () => {
    mockOverview({
      sessions: () => page(SESSIONS),
      jit: () => ok({ jitRequests: JIT }),
      locks: () => ok({ locks: LOCKS }),
      bg: () => ok({ activations: BREAKGLASS }),
      nodes: () => ok({ nodes: NODES_MIXED }),
      audit: () => page(AUDIT),
    });
    renderWithProviders(<OverviewScreen />, {
      authenticated: true,
      permissions: [...PERMS],
    });

    // Recent-item lists render from their endpoints.
    expect(
      await within(
        screen.getByRole('region', { name: 'Active sessions' }),
      ).findByText('alice@corp.example'),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('region', { name: 'Pending JIT approvals' }),
      ).getByText('carol@corp.example'),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('region', { name: 'Recent audit events' }),
      ).getByText('session.connect'),
    ).toBeInTheDocument();

    // KPI tiles compute the right numbers.
    await waitFor(() => {
      expect(kpiValue('Active sessions')).toBe('2');
    });
    expect(kpiValue('Pending JIT approvals')).toBe('1');
    expect(kpiValue('Active locks')).toBe('1');
    expect(kpiValue('Break-glass to review')).toBe('1'); // only the pending one
    expect(kpiValue('Nodes')).toBe('4');
    expect(kpiValue('Nodes needing attention')).toBe('2'); // unhealthy + unreachable
  });

  it('renders a per-section loading state while reads are in flight', () => {
    const hang: HttpResponseResolver = () =>
      new Promise<Response>(() => undefined);
    mockOverview({
      sessions: hang,
      jit: hang,
      locks: hang,
      bg: hang,
      nodes: hang,
      audit: hang,
    });
    renderWithProviders(<OverviewScreen />, {
      authenticated: true,
      permissions: [...PERMS],
    });

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(
      within(screen.getByRole('region', { name: 'Key metrics' })).getAllByText(
        '—',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('renders empty states when every section is empty', async () => {
    mockOverview();
    renderWithProviders(<OverviewScreen />, {
      authenticated: true,
      permissions: [...PERMS],
    });

    expect(await screen.findByText('No active sessions')).toBeInTheDocument();
    expect(
      screen.getByText('No requests awaiting approval'),
    ).toBeInTheDocument();
    expect(screen.getByText('No active locks')).toBeInTheDocument();
    expect(screen.getByText('No break-glass activations')).toBeInTheDocument();
    expect(screen.getByText('No nodes registered')).toBeInTheDocument();
    expect(screen.getByText('No audit events')).toBeInTheDocument();
  });

  it('surfaces an RFC 9457 problem as an alert for the failing section', async () => {
    mockOverview({
      audit: () =>
        problem(500, 'Search failed', 'Downstream store unavailable'),
    });
    renderWithProviders(<OverviewScreen />, {
      authenticated: true,
      permissions: [...PERMS],
    });

    const region = screen.getByRole('region', { name: 'Recent audit events' });
    expect(await within(region).findByRole('alert')).toBeInTheDocument();
    expect(within(region).getByText('Search failed')).toBeInTheDocument();
    // Unaffected sections still render their own state.
    expect(screen.getByText('No active sessions')).toBeInTheDocument();
  });

  it('renders a 403 gracefully as "Not permitted"', async () => {
    mockOverview({ nodes: () => problem(403, 'Forbidden') });
    renderWithProviders(<OverviewScreen />, {
      authenticated: true,
      permissions: ['audit:read'],
    });

    const region = screen.getByRole('region', { name: 'Node health' });
    expect(
      await within(region).findByText('Not permitted'),
    ).toBeInTheDocument();
    // The KPI tile degrades to an em dash rather than a wrong number.
    expect(kpiValue('Nodes')).toContain('—');
    expect(screen.getAllByText(/unavailable/).length).toBeGreaterThan(0);
  });

  it('summarizes node health with an accessible bar and text legend', async () => {
    mockOverview({ nodes: () => ok({ nodes: NODES_MIXED }) });
    renderWithProviders(<OverviewScreen />, {
      authenticated: true,
      permissions: [...PERMS],
    });

    const bar = await screen.findByRole('img', {
      name: /Node health across 4 nodes/,
    });
    expect(bar).toHaveAccessibleName(
      'Node health across 4 nodes: 2 healthy, 1 unhealthy, 1 unreachable',
    );

    // Counts are shown as text (not conveyed by color alone).
    const region = screen.getByRole('region', { name: 'Node health' });
    expect(within(region).getByText('Healthy')).toBeInTheDocument();
    expect(within(region).getByText('Unreachable')).toBeInTheDocument();
    expect(within(region).getByText('1 quarantined')).toBeInTheDocument();
  });

  it('shows Control Plane health and version', async () => {
    mockOverview();
    renderWithProviders(<OverviewScreen />, {
      authenticated: true,
      permissions: [...PERMS],
    });

    const region = await screen.findByRole('region', { name: 'Control Plane' });
    expect(
      await within(region).findByText('SessionLayer Control Plane'),
    ).toBeInTheDocument();
    expect(within(region).getByText('0.1.0')).toBeInTheDocument();
    expect(await within(region).findByText('Healthy')).toBeInTheDocument();
  });
});
