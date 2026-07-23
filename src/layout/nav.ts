/**
 * The primary navigation model — the Session 27 operator-console IA (SESSION.md
 * §1.1-B), grouped by admin surface rather than by backing resource shape. `to`
 * values are validated by the route tree at runtime (NavLink bridges the dynamic
 * string to the typed router). Kept as data so the shell and the overview can
 * share one source of truth. Route paths are unchanged from the prior IA so deep
 * links and e2e selectors survive the reskin.
 */
export interface NavItem {
  to: string;
  label: string;
  /** Key into the live badge-count map the shell computes from real queries. */
  badgeKey?: string;
}

export interface NavSection {
  /** `undefined` renders no group heading (the Overview item). */
  title?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ to: '/', label: 'Overview' }],
  },
  {
    title: 'Runtime',
    items: [
      { to: '/nodes', label: 'Nodes', badgeKey: 'quarantinedNodes' },
      { to: '/sessions', label: 'Sessions' },
      { to: '/recordings', label: 'Recordings' },
      { to: '/locks', label: 'Locks', badgeKey: 'activeLocks' },
    ],
  },
  {
    title: 'Access',
    items: [
      { to: '/jit-requests', label: 'JIT requests', badgeKey: 'pendingJit' },
      { to: '/break-glass', label: 'Break-glass', badgeKey: 'unreviewedBg' },
    ],
  },
  {
    title: 'Access config',
    items: [
      { to: '/rules', label: 'Rules' },
      { to: '/roles', label: 'Platform roles' },
      { to: '/role-bindings', label: 'Role bindings' },
      { to: '/cas', label: 'Certificate authorities' },
      { to: '/service-accounts', label: 'Service accounts' },
      { to: '/join-tokens', label: 'Join tokens' },
      { to: '/pins', label: 'Pins & OTP' },
    ],
  },
  {
    title: 'Policies',
    items: [
      { to: '/node-policies', label: 'Node policies' },
      { to: '/capability-defs', label: 'Capability definitions' },
      { to: '/jit-policies', label: 'JIT policies' },
      { to: '/breakglass-policies', label: 'Break-glass policies' },
      { to: '/session-limit-policies', label: 'Session-limit policies' },
    ],
  },
  {
    items: [{ to: '/audit-events', label: 'Audit log' }],
  },
];
