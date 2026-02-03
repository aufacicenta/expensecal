import { AppProviders } from "../AppProviders";

/**
 * Layout for app routes (calendar, table, etc.)
 * Wraps children with AppProviders to initialize context controllers.
 * This is separate from the root layout to avoid triggering useEffects
 * on pages that don't need them (e.g., landing page).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
