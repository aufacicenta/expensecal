import { AppProviders } from "../AppProviders";

import { stackServerApp } from "@/stack/server";

/**
 * Layout for app routes (calendar, table, etc.)
 * Wraps children with AppProviders to initialize context controllers.
 * This is separate from the root layout to avoid triggering useEffects
 * on pages that don't need them (e.g., landing page).
 *
 * Auth is checked server-side before any context controllers mount,
 * preventing API calls from firing before auth is ready.
 * Using Stack's { or: "redirect" } handles the auth flow properly.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Stack's { or: "redirect" } properly handles the auth flow,
  // including the case where cookies are being set during OAuth callback
  await stackServerApp.getUser({ or: "redirect" });

  return <AppProviders>{children}</AppProviders>;
}
