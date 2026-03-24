import { createContext, useContext } from 'react';

/**
 * Tracks whether the admin workspace has completed its initial render.
 * After first render, page-level mount animations are skipped to prevent
 * the white flash when switching tabs.
 *
 * Drawer/floating-bar animations are NOT affected — only use this for
 * top-level page sections (stat cards, panels, tables).
 */
export const AdminMountedContext = createContext(false);

/**
 * Returns `false` for framer-motion `initial` prop when switching tabs
 * (skips mount animation). Returns the provided defaults on first load.
 */
export function useAdminPageAnimation(
  defaults: { opacity: number; y?: number } = { opacity: 0, y: 8 },
) {
  const isAlreadyMounted = useContext(AdminMountedContext);

  if (isAlreadyMounted) {
    // Tab switch — skip initial animation, start visible immediately
    return { initial: false as const };
  }

  // First load — play the entrance animation
  return { initial: defaults };
}
