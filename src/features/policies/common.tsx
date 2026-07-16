import type { ReactNode } from 'react';

import {
  PageHeader,
  Button,
  AsyncList,
  DataTable,
  LoadMore,
  Badge,
  Dialog,
  ProblemAlert,
  type Column,
  type BadgeTone,
} from '../../ui';
import type { CursorListResult } from '../../api/http';
import type { Origin } from '../../api/types';
import { conflictHint } from './helpers';

const ORIGIN_TONE: Record<Origin, BadgeTone> = {
  api: 'info',
  ui: 'accent',
  default: 'neutral',
};

/** The read-only provenance pill every config resource carries (Design §13). */
export function OriginBadge({ origin }: { origin: Origin }) {
  return <Badge tone={ORIGIN_TONE[origin]}>{origin}</Badge>;
}

/**
 * The uniform config-resource list scaffold: header (+ gated "New"), async
 * states, the wide-table + "Load more". Detail/create/edit/delete dialogs are
 * owned by each screen because their fields differ.
 */
export function CrudScreen<T>({
  title,
  description,
  newLabel,
  canWrite,
  onNew,
  list,
  columns,
  rowKey,
  caption,
  emptyTitle,
  onRowClick,
}: {
  title: string;
  description?: ReactNode;
  newLabel: string;
  canWrite: boolean;
  onNew: () => void;
  list: CursorListResult<T>;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  caption: string;
  emptyTitle: string;
  onRowClick: (row: T) => void;
}) {
  return (
    <section>
      <PageHeader
        title={title}
        description={description}
        actions={
          canWrite ? (
            <Button variant="primary" onClick={onNew}>
              {newLabel}
            </Button>
          ) : undefined
        }
      />
      <AsyncList
        isPending={list.isPending}
        isError={list.isError}
        error={list.error}
        isEmpty={list.items.length === 0}
        emptyTitle={emptyTitle}
      >
        <DataTable
          columns={columns}
          rows={list.items}
          rowKey={rowKey}
          caption={caption}
          onRowClick={onRowClick}
        />
        <LoadMore
          hasNextPage={list.hasNextPage}
          isFetchingNextPage={list.isFetchingNextPage}
          onLoadMore={list.fetchNextPage}
        />
      </AsyncList>
    </section>
  );
}

/**
 * A create/edit form dialog: renders the fields, a Save/Cancel footer, and a
 * failed-mutation problem inline (with a hint on a 409 stale-`version` conflict).
 */
export function FormDialog({
  title,
  pending,
  error,
  submitLabel = 'Save',
  submitDisabled = false,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  pending: boolean;
  error: unknown;
  submitLabel?: string;
  submitDisabled?: boolean;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const hint = conflictHint(error);
  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={pending || submitDisabled}
          >
            {pending ? 'Saving…' : submitLabel}
          </Button>
        </>
      }
    >
      {children}
      {error !== undefined && error !== null && <ProblemAlert error={error} />}
      {hint !== undefined && (
        <p className="muted" role="note">
          {hint}
        </p>
      )}
    </Dialog>
  );
}
