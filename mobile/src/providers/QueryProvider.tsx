import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";
import { useEffect, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";

import { errorStatus } from "@/api/client";

import { CACHE_MAX_AGE, queryPersister } from "./queryPersistence";

// Requests pause while the phone is offline and resume when it reconnects.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false))
);

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Kept at least as long as the saved copy so it can be restored.
        gcTime: CACHE_MAX_AGE,
        // Client errors (403/404…) won't fix themselves; retry only network/server failures.
        retry: (failureCount, error) => {
          const status = errorStatus(error);
          if (status !== undefined && status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  // Refetch stale data when the app comes back to the foreground.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });
    return () => subscription.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: CACHE_MAX_AGE,
        // A new app version may change the data's shape: start fresh.
        buster: Constants.expoConfig?.version ?? "1",
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
