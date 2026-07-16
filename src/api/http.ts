import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';

export { ProblemError, unwrap, type ProblemDetails } from './problem';

/** A cursor-paginated page as returned by every `*Page` contract schema. */
export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
}

/** Root query-key namespace so all Control Plane cache entries share a prefix. */
export const CP_KEY = 'cp' as const;

/** Build a stable, namespaced query key for a resource area. */
export function resourceKey(
  area: string,
  ...rest: readonly unknown[]
): readonly unknown[] {
  return [CP_KEY, area, ...rest] as const;
}

export interface CursorListResult<T> {
  items: T[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}

/**
 * Cursor pagination over a `*Page` contract endpoint. `fetchPage` receives the
 * opaque `nextCursor` from the prior page (or `undefined` for the first) and the
 * request abort signal; it returns `{ items, nextCursor }`. The hook flattens all
 * loaded pages and exposes `fetchNextPage`/`hasNextPage` for a "Load more"
 * control — forward-only, matching the contract's opaque cursor.
 */
export function useCursorList<T>(
  key: readonly unknown[],
  fetchPage: (
    cursor: string | undefined,
    signal: AbortSignal,
  ) => Promise<CursorPage<T>>,
  options?: { enabled?: boolean },
): CursorListResult<T> {
  const query: UseInfiniteQueryResult<InfiniteData<CursorPage<T>>> =
    useInfiniteQuery({
      queryKey: key,
      queryFn: ({ pageParam, signal }) => fetchPage(pageParam, signal),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.nextCursor,
      enabled: options?.enabled,
    });

  return {
    items: query.data?.pages.flatMap((p) => p.items) ?? [],
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
    refetch: () => void query.refetch(),
  };
}
