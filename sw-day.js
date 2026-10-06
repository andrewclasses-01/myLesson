/* sw-day.js — SERVICE WORKER CHỈ ĐỂ NHẬN THÔNG BÁO ĐẨY (web v1.255.0, 06/10/2026).
   ⛔ CỐ Ý KHÔNG có 'fetch' — không lưu bản trang nào ⇒ không bao giờ kẹt bản cũ (lý do trước đây chưa dùng service worker).
   Gói từ máy chủ (myLesson-app may-chu/functions/day-thong-bao.js): { tieuDe, than, link (tương đối theo scope), tag }.
   iPhone: mỗi lượt đẩy PHẢI hiện thông báo (không được đẩy ngầm) — luôn showNotification. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { than: e.data ? e.data.text() : '' }; }
  var goc = self.registration.scope;
  e.waitUntil(self.registration.showNotification(d.tieuDe || 'Andrew Classes', {
    body: d.than || 'Có tin mới',
    icon: goc + 'assets/icons/icon-192.png?v=2',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { link: d.link || '' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var goc = self.registration.scope;
  var url = new URL((e.notification.data && e.notification.data.link) || '', goc).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (ds) {
    for (var i = 0; i < ds.length; i++) {
      var w = ds[i];
      if (w.url.indexOf(goc) === 0 && 'focus' in w) {
        return (w.navigate ? w.navigate(url).catch(function () { return null; }) : Promise.resolve(null)).then(function (w2) {
          return (w2 || w).focus();
        }).catch(function () { return self.clients.openWindow(url); });
      }
    }
    return self.clients.openWindow(url);
  }));
});
