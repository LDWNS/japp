"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Must match CACHE in public/sw.js. */
const CACHE = "japp-v1";

/** Routes reached via router.push rather than a visible <Link>; prefetch so they work offline. */
const OFFLINE_ROUTES = ["/", "/study", "/summary", "/about"];

/**
 * Assets loaded on the very first visit arrive before the service worker
 * controls the page, so they never pass through its fetch handler. Copy them
 * into the cache explicitly.
 */
async function cacheLoadedAssets() {
  const urls = performance
    .getEntriesByType("resource")
    .map((e) => new URL(e.name))
    .filter((u) => u.origin === location.origin && u.pathname.startsWith("/_next/static/"))
    .map((u) => u.href);
  const cache = await caches.open(CACHE);
  await Promise.all(
    urls.map(async (url) => {
      if (!(await cache.match(url))) await cache.add(url).catch(() => {});
    }),
  );
}

export function ServiceWorker() {
  const router = useRouter();
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then(cacheLoadedAssets)
      .then(() => OFFLINE_ROUTES.forEach((r) => router.prefetch(r)))
      .catch(() => {
        // app works without offline support
      });
  }, [router]);
  return null;
}
