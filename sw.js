/* 生活手账 Service Worker
 *
 * 作用只有两个：
 *   1. 让浏览器认为这是「可安装的应用」（安卓 Chrome 的安装条件要求有 fetch 处理）
 *   2. 给 JS/CSS 加一层缓存，弱网时打开快一点
 *
 * 故意不缓存页面和接口：登录态、今日数据都必须实时，缓存了反而会看到旧内容。
 */

const CACHE = 'lifelog-static-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // 只碰带哈希的静态资源，它们内容不会变，缓存最安全
  if (!url.pathname.startsWith('/_next/static/') && !url.pathname.startsWith('/icon')) return;

  event.respondWith(
    (async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) {
          const copy = res.clone();
          const cache = await caches.open(CACHE);
          cache.put(req, copy);
        }
        return res;
      } catch {
        return hit || Response.error();
      }
    })()
  );
});
