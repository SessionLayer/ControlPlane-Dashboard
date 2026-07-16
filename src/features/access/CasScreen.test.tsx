import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../../test/server';
import { renderWithProviders } from '../../test/utils';
import { cp, page, problem } from '../../test/msw';
import type { CaResource } from '../../api/types';
import { CasScreen } from './CasScreen';

const ca = (over: Partial<CaResource> = {}): CaResource => ({
  id: '44444444-4444-4444-4444-444444444444',
  name: 'user-ca',
  caKind: 'user',
  backend: 'aws_kms',
  keyReference: 'arn:aws:kms:key/abc',
  algorithm: 'ecdsa-p256',
  rotationState: 'active',
  origin: 'default',
  version: 7,
  ...over,
});

const MANAGE = ['ca:manage', 'ca:rotate'] as const;

describe('CasScreen', () => {
  it('renders a page of CAs', async () => {
    server.use(http.get(cp('/v1/cas'), () => page([ca()])));
    renderWithProviders(<CasScreen />, {
      authenticated: true,
      permissions: [...MANAGE],
    });
    expect(await screen.findByText('user-ca')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    server.use(http.get(cp('/v1/cas'), () => page([])));
    renderWithProviders(<CasScreen />, {
      authenticated: true,
      permissions: [...MANAGE],
    });
    expect(
      await screen.findByText('No certificate authorities yet'),
    ).toBeInTheDocument();
  });

  it('surfaces an RFC 9457 problem', async () => {
    server.use(http.get(cp('/v1/cas'), () => problem(500, 'CA down')));
    renderWithProviders(<CasScreen />, {
      authenticated: true,
      permissions: [...MANAGE],
    });
    expect(await screen.findByText('CA down')).toBeInTheDocument();
  });

  it('renders a 403 gracefully', async () => {
    server.use(http.get(cp('/v1/cas'), () => problem(403, 'no')));
    renderWithProviders(<CasScreen />, {
      authenticated: true,
      permissions: ['audit:read'],
    });
    expect(await screen.findByText('Not permitted')).toBeInTheDocument();
  });

  it('hides create/rotate without their permissions', async () => {
    server.use(http.get(cp('/v1/cas'), () => page([ca()])));
    renderWithProviders(<CasScreen />, {
      authenticated: true,
      permissions: ['audit:read'],
    });
    await screen.findByText('user-ca');
    expect(
      screen.queryByRole('button', { name: 'New CA…' }),
    ).not.toBeInTheDocument();
  });

  it('creates a CA and never offers a private-key field', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.get(cp('/v1/cas'), () => page([ca()])),
      http.post(cp('/v1/cas'), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(ca({ name: 'host-ca' }), { status: 201 });
      }),
    );
    renderWithProviders(<CasScreen />, {
      authenticated: true,
      permissions: [...MANAGE],
    });
    await screen.findByText('user-ca');
    fireEvent.click(screen.getByRole('button', { name: 'New CA…' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'host-ca' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Key reference' }), {
      target: { value: 'arn:aws:kms:key/xyz' },
    });
    expect(screen.queryByLabelText(/private key/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create CA' }));
    await waitFor(() => {
      expect(body?.name).toBe('host-ca');
    });
    expect(body?.keyReference).toBe('arn:aws:kms:key/xyz');
    expect(body).not.toHaveProperty('privateKey');
  });

  it('sends the version on edit', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.get(cp('/v1/cas'), () => page([ca({ version: 7 })])),
      http.put(cp('/v1/cas/:caId'), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(ca({ version: 8 }));
      }),
    );
    renderWithProviders(<CasScreen />, {
      authenticated: true,
      permissions: [...MANAGE],
    });
    fireEvent.click(await screen.findByText('user-ca'));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Save changes' }),
    );
    await waitFor(() => {
      expect(body?.version).toBe(7);
    });
  });

  it('rotates a CA after confirmation', async () => {
    let rotated = false;
    server.use(
      http.get(cp('/v1/cas'), () => page([ca()])),
      http.post(cp('/v1/cas/:caId/rotate'), () => {
        rotated = true;
        return HttpResponse.json(ca());
      }),
    );
    renderWithProviders(<CasScreen />, {
      authenticated: true,
      permissions: [...MANAGE],
    });
    fireEvent.click(await screen.findByText('user-ca'));
    fireEvent.click(await screen.findByRole('button', { name: 'Rotate' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Rotate' }));
    await waitFor(() => {
      expect(rotated).toBe(true);
    });
  });

  it('deletes a CA after confirmation', async () => {
    let deleted = false;
    server.use(
      http.get(cp('/v1/cas'), () => page([ca()])),
      http.delete(cp('/v1/cas/:caId'), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithProviders(<CasScreen />, {
      authenticated: true,
      permissions: [...MANAGE],
    });
    fireEvent.click(await screen.findByText('user-ca'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(deleted).toBe(true);
    });
  });
});
