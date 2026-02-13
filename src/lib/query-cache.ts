import { useCallback, useEffect, useMemo, useState } from 'react';

export type QueryKey = string | readonly unknown[];

interface CacheEntry<T> {
  data?: T;
  error?: string | null;
  updatedAt: number;
  promise?: Promise<T>;
}

interface UseCachedQueryOptions<T> {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  staleTime?: number;
  enabled?: boolean;
}

interface UseCachedQueryResult<T> {
  data: T | undefined;
  error: string | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
}

type Subscriber = () => void;

const cache = new Map<string, CacheEntry<unknown>>();
const subscribers = new Map<string, Set<Subscriber>>();

const serializeKey = (queryKey: QueryKey) =>
  typeof queryKey === 'string' ? queryKey : JSON.stringify(queryKey);

const notifyKey = (cacheKey: string) => {
  const keySubscribers = subscribers.get(cacheKey);
  if (!keySubscribers) return;
  keySubscribers.forEach((subscriber) => subscriber());
};

const readEntry = <T,>(cacheKey: string): CacheEntry<T> | undefined => {
  return cache.get(cacheKey) as CacheEntry<T> | undefined;
};

const writeEntry = <T,>(cacheKey: string, next: Partial<CacheEntry<T>>) => {
  const previous = readEntry<T>(cacheKey);
  cache.set(cacheKey, {
    data: next.data ?? previous?.data,
    error: next.error ?? previous?.error ?? null,
    updatedAt: next.updatedAt ?? previous?.updatedAt ?? 0,
    promise: next.promise,
  });
  notifyKey(cacheKey);
};

const subscribeKey = (cacheKey: string, subscriber: Subscriber) => {
  const keySubscribers = subscribers.get(cacheKey) ?? new Set<Subscriber>();
  keySubscribers.add(subscriber);
  subscribers.set(cacheKey, keySubscribers);

  return () => {
    const current = subscribers.get(cacheKey);
    if (!current) return;
    current.delete(subscriber);
    if (current.size === 0) {
      subscribers.delete(cacheKey);
    }
  };
};

export const setCachedQueryData = <T,>(
  queryKey: QueryKey,
  updater: T | ((previous: T | undefined) => T | undefined)
) => {
  const cacheKey = serializeKey(queryKey);
  const current = readEntry<T>(cacheKey)?.data;
  const nextValue =
    typeof updater === 'function' ? (updater as (value: T | undefined) => T | undefined)(current) : updater;

  if (nextValue === undefined) return;

  writeEntry<T>(cacheKey, {
    data: nextValue,
    error: null,
    updatedAt: Date.now(),
    promise: undefined,
  });
};

export const invalidateCachedQuery = (queryKey: QueryKey) => {
  const cacheKey = serializeKey(queryKey);
  const current = readEntry(cacheKey);
  if (!current) return;
  writeEntry(cacheKey, { updatedAt: 0 });
};

export const invalidateQueriesByPrefix = (queryKeyPrefix: QueryKey) => {
  const serializedPrefix = serializeKey(queryKeyPrefix);
  const arrayPrefix = Array.isArray(queryKeyPrefix) ? serializedPrefix.slice(0, -1) : null;

  Array.from(cache.keys()).forEach((cacheKey) => {
    const shouldInvalidate = arrayPrefix
      ? cacheKey === serializedPrefix || cacheKey.startsWith(`${arrayPrefix},`)
      : cacheKey.startsWith(serializedPrefix);

    if (shouldInvalidate) {
      writeEntry(cacheKey, { updatedAt: 0 });
    }
  });
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred.';
};

export const useCachedQuery = <T,>({
  queryKey,
  queryFn,
  staleTime = 60_000,
  enabled = true,
}: UseCachedQueryOptions<T>): UseCachedQueryResult<T> => {
  const cacheKey = useMemo(() => serializeKey(queryKey), [queryKey]);
  const entry = readEntry<T>(cacheKey);
  const [data, setData] = useState<T | undefined>(entry?.data);
  const [error, setError] = useState<string | null>(entry?.error ?? null);
  const [isFetching, setIsFetching] = useState(false);

  const executeFetch = useCallback(async () => {
    if (!enabled) return;

    const current = readEntry<T>(cacheKey);
    const hasFreshData = current?.updatedAt && Date.now() - current.updatedAt < staleTime;

    if (hasFreshData && current?.data !== undefined) {
      setData(current.data);
      setError(current.error ?? null);
      return;
    }

    if (current?.promise) {
      setIsFetching(true);
      try {
        await current.promise;
      } finally {
        const next = readEntry<T>(cacheKey);
        setData(next?.data);
        setError(next?.error ?? null);
        setIsFetching(false);
      }
      return;
    }

    setIsFetching(true);
    const promise = queryFn()
      .then((result) => {
        writeEntry<T>(cacheKey, {
          data: result,
          error: null,
          updatedAt: Date.now(),
          promise: undefined,
        });
        return result;
      })
      .catch((fetchError) => {
        writeEntry<T>(cacheKey, {
          error: getErrorMessage(fetchError),
          updatedAt: Date.now(),
          promise: undefined,
        });
        throw fetchError;
      });

    writeEntry<T>(cacheKey, { promise });

    try {
      await promise;
    } catch {
      // Errors are stored in cache for subscribers.
    } finally {
      const next = readEntry<T>(cacheKey);
      setData(next?.data);
      setError(next?.error ?? null);
      setIsFetching(false);
    }
  }, [cacheKey, enabled, queryFn, staleTime]);

  useEffect(() => {
    if (!enabled) return;

    const sync = () => {
      const next = readEntry<T>(cacheKey);
      setData(next?.data);
      setError(next?.error ?? null);
    };

    const unsubscribe = subscribeKey(cacheKey, sync);
    sync();
    executeFetch();

    return unsubscribe;
  }, [cacheKey, enabled, executeFetch]);

  return {
    data,
    error,
    isLoading: enabled && data === undefined && isFetching,
    isFetching,
    refetch: executeFetch,
  };
};
