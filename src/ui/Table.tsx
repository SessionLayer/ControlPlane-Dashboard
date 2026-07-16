import type { ReactNode } from 'react';

import { Button } from './Button';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** Optional fixed/max width, e.g. `'12rem'`. */
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Screen-reader caption describing the table (required for a11y). */
  caption: string;
  onRowClick?: (row: T) => void;
}

/**
 * The table primitive. Always wrapped in an `overflow-x:auto` container so wide
 * tables scroll within themselves and never push a horizontal scrollbar onto the
 * page body (a11y/responsive rule). Every table carries a caption.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.header}
                scope="col"
                style={{
                  textAlign: c.align ?? 'left',
                  width: c.width,
                }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const clickable = onRowClick !== undefined;
            return (
              <tr
                key={rowKey(row)}
                className={clickable ? 'row-clickable' : undefined}
                // An actionable row must be keyboard-operable, not mouse-only
                // (WCAG 2.1.1): focusable + Enter/Space activate. `role=button`
                // announces it as interactive; focus returns here when a detail
                // dialog opened from the row closes.
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={
                  clickable
                    ? () => {
                        onRowClick(row);
                      }
                    : undefined
                }
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((c) => (
                  <td key={c.header} style={{ textAlign: c.align ?? 'left' }}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Forward-only "Load more" control for a cursor-paginated list. */
export function LoadMore({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}): ReactNode {
  if (!hasNextPage) return null;
  return (
    <div className="load-more">
      <Button onClick={onLoadMore} disabled={isFetchingNextPage}>
        {isFetchingNextPage ? 'Loading…' : 'Load more'}
      </Button>
    </div>
  );
}
