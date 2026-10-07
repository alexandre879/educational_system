"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/interceptors";

export interface ApiState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/**
 * GET `url` (skipped while it's null) and refetch whenever it or `params` change.
 * The previous data stays visible while the next request is in flight.
 */
export function useApi<T>(url: string | null, params?: Record<string, string | number | undefined>): ApiState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(url !== null);
  const [version, setVersion] = useState(0);

  // A stable key, so callers can pass a fresh params object on every render.
  const paramsKey = JSON.stringify(params ?? {});

  useEffect(() => {
    if (url === null) return;
    let cancelled = false;
    setLoading(true);

    api
      .get<T>(url, { params: JSON.parse(paramsKey) })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, paramsKey, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { data, error, loading, reload };
}
