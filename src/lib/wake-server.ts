import { api } from "./api";

// At most one wake-up call per minute (the server also rate-limits /api/health per IP)
const MIN_INTERVAL_MS = 60_000;
let lastWake = 0;

/**
 * Starts waking the server's database in the background (GET /api/health), so a sleeping Neon
 * database is awake by the time the user's real request arrives. Called on launch, when the app
 * returns to the foreground, and when the sign-in screen opens. Never throws.
 */
export function wakeServer() {
  const now = Date.now();
  if (now - lastWake < MIN_INTERVAL_MS) return;
  lastWake = now;
  api.get("/api/health").catch(() => {});
}
