import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

/**
 * Single source of truth for URL query param manipulation.
 *
 * Always reads from Next.js useSearchParams (never window.location.search,
 * which can be stale during navigation). Always preserves unrelated params
 * unless explicitly deleted.
 */
export const useQueryParams = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Set one or more params. Pass null/undefined/"" to delete a key.
   * All other existing params are preserved.
   *
   * @param {Record<string, string | null | undefined>} updates
   * @param {{ replace?: boolean }} options
   *   replace: true → router.replace (no history entry, good for filter changes)
   *   replace: false → router.push (default, good for navigation)
   */
  const setParams = useCallback(
    (updates, { replace = false } = {}) => {
      const current = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      });

      const search = current.toString();
      const url = `${pathname}${search ? `?${search}` : ""}`;

      if (replace) {
        router.replace(url, { scroll: false });
      } else {
        router.push(url);
      }
    },
    [searchParams, pathname, router]
  );

  /** Convenience for a single param update. */
  const setParam = useCallback((key, value, options) => setParams({ [key]: value }, options), [setParams]);

  /** Get the current value of a param (from Next.js state, never stale). */
  const getParam = useCallback((key) => searchParams.get(key), [searchParams]);

  /** Build a full URL string with the given overrides applied to current params. */
  const buildUrl = useCallback(
    (updates, targetPathname) => {
      const current = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      });

      const search = current.toString();
      return `${targetPathname ?? pathname}${search ? `?${search}` : ""}`;
    },
    [searchParams, pathname]
  );

  return { setParams, setParam, getParam, buildUrl, searchParams, pathname };
};
