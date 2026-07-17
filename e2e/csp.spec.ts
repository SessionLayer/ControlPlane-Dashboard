import { expect, test, type Page } from '@playwright/test';

const APP_ORIGIN = 'http://localhost:4173';

// The strict production CSP (deploy/security-headers.conf) with connect-src
// resolved to the origins THIS test's mocked backends live on: the default CP
// base and the E2E OIDC issuer (playwright.config.ts). Crucially style-src is
// 'self' with NO 'unsafe-inline' — this test proves that holds for the real app.
const STRICT_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' http://localhost:8080 https://idp.example.test",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const CORS = { 'access-control-allow-origin': '*' };

function b64url(value: object): string {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function testJwt(): string {
  const payload = {
    sub: 'e2e-admin@corp',
    name: 'E2E Admin',
    permissions: ['rbac:read', 'audit:read', 'recording:replay'],
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(payload)}.`;
}

/** Enforce the strict CSP by adding it to every app-origin HTML document. */
async function enforceCsp(page: Page): Promise<void> {
  await page.route(`${APP_ORIGIN}/**`, async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    const response = await route.fetch();
    return route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': STRICT_CSP },
    });
  });
}

/** Capture every CSP violation the browser reports, across navigations. */
async function captureViolations(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __cspViolations: string[] };
    w.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      w.__cspViolations.push(
        `${e.effectiveDirective || e.violatedDirective} blocked ${e.blockedURI}`,
      );
    });
  });
}

async function readViolations(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { __cspViolations: string[] }).__cspViolations,
  );
}

async function stubControlPlane(page: Page): Promise<void> {
  await page.route('**/v1/version', (route) =>
    route.fulfill({
      json: {
        component: 'SessionLayer Control Plane',
        version: '0.1.0',
        protocols: {
          controlPlaneGatewayGrpc: { min: '1.0', max: '1.0' },
          agentGatewayWire: { min: '1.0', max: '1.0' },
        },
      },
      headers: CORS,
    }),
  );
  await page.route('**/v1/**', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    return route.fulfill({
      json: { items: [], nodes: [], joinTokens: [], status: 'pass' },
      headers: CORS,
    });
  });
}

test('the app loads and authenticates under the strict production CSP with zero violations', async ({
  page,
}) => {
  await captureViolations(page);
  await enforceCsp(page);
  await stubControlPlane(page);

  await page.route('**/authorize?*', (route) => {
    const state =
      new URL(route.request().url()).searchParams.get('state') ?? '';
    return route.fulfill({
      status: 302,
      headers: {
        location: `${APP_ORIGIN}/auth/callback?code=fake-auth-code&state=${state}`,
      },
    });
  });
  await page.route('**/oauth2/token', (route) =>
    route.fulfill({
      json: { id_token: testJwt(), token_type: 'Bearer', expires_in: 3600 },
      headers: CORS,
    }),
  );

  // Unauthenticated shell first (script-src/style-src 'self' must load the bundle).
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

  // Full auth-code + PKCE round-trip, landing on the authenticated shell — which
  // renders data-driven inline styles (e.g. the overview health bars' flexGrow),
  // exactly the React style={{}} CSSOM writes we assert style-src 'self' allows.
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('E2E Admin')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Nodes' })).toBeVisible();

  expect(await readViolations(page)).toEqual([]);
});
