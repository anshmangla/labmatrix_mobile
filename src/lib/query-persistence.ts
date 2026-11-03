import Constants from "expo-constants";
import Storage from "expo-sqlite/kv-store";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { Query, QueryClient } from "@tanstack/react-query";

/**
 * Saves loaded server data on the device so screens show their last data instantly when the app
 * is reopened (Android often closes backgrounded apps), then refresh in the background.
 * Only server responses are cached here; the sign-in token stays in secure storage.
 */

/** How long saved data may be shown after the app was last used. */
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

// Bump when the shape of cached API data changes, so an old cache is dropped instead of misread
const CACHE_FORMAT = "1";
/** Saved data from a different app version or cache format is discarded. */
export const PERSIST_BUSTER = `${Constants.expoConfig?.version ?? "0"}-${CACHE_FORMAT}`;

// Data worth showing instantly on the next launch. Admin data (other users' contact details) and
// the account profile are never written to the device.
const PERSISTED_QUERIES = new Set([
  "listings",
  "requirements",
  "listing",
  "requirement",
  "myItems",
  "inquiries",
  "notifications",
]);

// Identical for every viewer; everything else is personal or depends on who is signed in
// (e.g. listing details carry "you own this" / admin flags).
const PUBLIC_QUERIES = new Set(["listings", "requirements"]);

export function shouldPersistQuery(query: Query): boolean {
  return query.state.status === "success" && PERSISTED_QUERIES.has(String(query.queryKey[0]));
}

export const queryPersister = createAsyncStoragePersister({
  storage: Storage,
  key: "labmatrix-query-cache",
});

/** Removes data that belongs to, or depends on, the previously signed-in account. */
export function removeViewerSpecificQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ predicate: (query) => !PUBLIC_QUERIES.has(String(query.queryKey[0])) });
}

/** Deletes the saved cache from the device (sign-out, rejected session). */
export async function clearPersistedQueries() {
  try {
    await queryPersister.removeClient();
  } catch (error) {
    console.warn("Could not clear saved data:", error);
  }
}
