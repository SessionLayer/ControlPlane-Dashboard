/**
 * The primary navigation model. Grouped by admin surface (Design §13 resource
 * inventory). `to` values are validated by the route tree at runtime (NavLink
 * bridges the dynamic string to the typed router). Kept as data so the shell and
 * the overview can share one source of truth.
 */
export interface NavItem {
  to: string;
  label: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Overview' }],
  },
  {
    title: 'Access & RBAC',
    items: [
      { to: '/rules', label: 'Rules' },
      { to: '/roles', label: 'Roles' },
      { to: '/role-bindings', label: 'Role bindings' },
      { to: '/service-accounts', label: 'Service accounts' },
      { to: '/cas', label: 'Certificate authorities' },
      { to: '/capability-defs', label: 'Capability defs' },
      { to: '/jit-policies', label: 'JIT policies' },
      { to: '/breakglass-policies', label: 'Break-glass policies' },
      { to: '/node-policies', label: 'Node policies' },
    ],
  },
  {
    title: 'Fleet',
    items: [
      { to: '/nodes', label: 'Nodes' },
      { to: '/sessions', label: 'Sessions' },
      { to: '/join-tokens', label: 'Join tokens' },
    ],
  },
  {
    title: 'Access requests & IR',
    items: [
      { to: '/jit-requests', label: 'JIT requests' },
      { to: '/locks', label: 'Locks' },
      { to: '/break-glass', label: 'Break-glass' },
      { to: '/pins', label: 'Pins' },
    ],
  },
  {
    title: 'Audit & recordings',
    items: [
      { to: '/audit-events', label: 'Audit search' },
      { to: '/recordings', label: 'Recordings' },
    ],
  },
];
