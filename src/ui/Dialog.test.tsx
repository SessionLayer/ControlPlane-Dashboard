import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('is an accessible, labelled modal', () => {
    render(
      <Dialog title="Terminate session" onClose={() => undefined}>
        body
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Terminate session');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Dialog title="Confirm" onClose={onClose}>
        body
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Dialog title="Confirm" onClose={onClose}>
        body
      </Dialog>,
    );
    fireEvent.click(screen.getByLabelText('Close dialog'));
    expect(onClose).toHaveBeenCalled();
  });
});
