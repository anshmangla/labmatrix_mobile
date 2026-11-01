import { openBrowserAsync } from "expo-web-browser";

export const PRIVACY_POLICY_URL = "https://surplus.labmatrixindia.com/privacy";

/** Opens the privacy policy in an in-app browser tab. */
export async function openPrivacyPolicy(): Promise<void> {
  try {
    await openBrowserAsync(PRIVACY_POLICY_URL);
  } catch {
    // Opening the browser can fail on unusual devices; nothing else to do here
  }
}
