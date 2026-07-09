import { expect, test } from '@playwright/test';

// Mock CP responses. The Control Plane is NOT running in Session One; we
// intercept its REST calls at the network layer. Because the built app calls the
// CP cross-origin (default base http://localhost:8080), fulfilled responses carry
// an `access-control-allow-origin` header so the browser lets the app read them.
const CORS = { 'access-control-allow-origin': '*' };

const versionBody = {
  component: 'SessionLayer Control Plane',
  version: '0.1.0',
  protocols: {
    controlPlaneGatewayGrpc: { min: '1.0', max: '1.0' },
    agentGatewayWire: { min: '1.0', max: '1.0' },
  },
};

test('health/version panel renders with the Control Plane API mocked', async ({
  page,
}) => {
  await page.route('**/v1/version', (route) =>
    route.fulfill({ json: versionBody, headers: CORS }),
  );
  await page.route('**/v1/healthz', (route) =>
    route.fulfill({ json: { status: 'pass' }, headers: CORS }),
  );

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Control Plane' }),
  ).toBeVisible();
  await expect(page.getByTestId('component')).toHaveText(
    'SessionLayer Control Plane',
  );
  await expect(page.getByTestId('version')).toHaveText('0.1.0');
  await expect(
    page.getByTestId('protocol-controlPlaneGatewayGrpc'),
  ).toContainText('1.0');
  await expect(page.getByTestId('health-badge')).toHaveText('Healthy');
});
