import { useCallback, useState } from "react";

/**
 * Pull-to-refresh state that shows the spinner only for a refresh the user pulled for.
 * Background refreshes (e.g. updating data restored from the device on launch) stay silent.
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
