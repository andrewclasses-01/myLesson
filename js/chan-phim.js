/* ============================================================
   chan-phim.js — CHẶN PHÍM TẮT XEM MÃ (web v1.413.0, 24/10/2026, thầy chốt "chỉ chặn phím tắt")

   Chặn: F12 · Ctrl+U (xem nguồn) · Ctrl+S (lưu trang) · Ctrl+Shift+I / J / C / K (công cụ nhà phát triển)
   + bản Mac: Cmd+Opt+U / I / J / C · Cmd+S.
   KHÔNG chặn bôi đen / copy / chuột phải (em cần copy từ vựng, dán chat; chuột phải riêng ở js/chuot-phai.js).

   ⛔ ĐÂY KHÔNG PHẢI BẢO MẬT: chỉ cản người không rành. Gõ `view-source:` trước địa chỉ, mở công cụ từ menu trình duyệt,
   tắt JavaScript, curl… vẫn xem được. Trang "xem nguồn" là trang CỦA TRÌNH DUYỆT — code mình không chạy trong đó.
   Bảo mật thật nằm ở luật Firestore/Storage (xem QUY TAC BAO MAT.md).
   ⛔ Trang trong khung (AWord, myDocument…) là tên miền khác — phím bấm khi khung đó đang được chọn không qua đây.
   Gắn ở <head> mọi trang (22 trang), nghe ở pha BẮT (capture) để đi trước mọi tay bắt khác. ES5 như mọi file web này.
   ============================================================ */
(function () {
  'use strict';
  if (window.__chanPhim) return;
  window.__chanPhim = true;
  var CHU_CTRL_SHIFT = { i: 1, j: 1, c: 1, k: 1 };   // công cụ nhà phát triển (Chrome/Edge/Firefox)
  var CHU_CMD_OPT = { i: 1, j: 1, c: 1, u: 1 };      // Mac
  function chu(e) {
    var k = String(e.key || '').toLowerCase();
    if (k.length === 1 && k >= 'a' && k <= 'z') return k;
    var m = /^Key([A-Z])$/.exec(e.code || '');        // Mac Opt làm e.key ra ký tự lạ ⇒ đọc e.code
    return m ? m[1].toLowerCase() : k;
  }
  function phaiChan(e) {
    if (e.key === 'F12' || e.keyCode === 123) return true;
    var c = chu(e), ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return false;
    if (!e.shiftKey && !e.altKey && (c === 'u' || c === 's')) return true;      // Ctrl/Cmd + U, S
    if (e.ctrlKey && e.shiftKey && CHU_CTRL_SHIFT[c]) return true;              // Ctrl+Shift+I/J/C/K
    if (e.metaKey && e.altKey && CHU_CMD_OPT[c]) return true;                   // Cmd+Opt+I/J/C/U
    return false;
  }
  window.addEventListener('keydown', function (e) {
    try {
      if (!phaiChan(e)) return;
      e.preventDefault();
      e.stopPropagation();
    } catch (err) { /* hỏng gì cũng để trang chạy như thường */ }
  }, true);
})();
