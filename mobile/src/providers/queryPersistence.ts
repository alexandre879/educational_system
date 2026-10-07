import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

/** How long saved screens stay usable offline. */
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

/** Saves loaded data on the phone so the app opens instantly and works without a connection. */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "query-cache.v1",
  throttleTime: 1000,
});
