/* ============================================================
   js/nhap-so.js — Ô NHẬP SỐ LIỆU AN TOÀN (07/10/2026, thầy chốt)
   1. CUỘN CHUỘT CHỈ ĐỂ CUỘN TRANG: ô số (type=number) đang được chọn mà cuộn chuột thì trình duyệt tự tăng/giảm số
      ⇒ rời ô NGAY trước khi trình duyệt đổi số (số giữ nguyên, trang vẫn cuộn).
   2. GÕ XONG BẤM ENTER = NHẬN Ô (như bấm ra ngoài) — chỉ cho ô SỐ LIỆU: number / date / time / datetime-local / month và
      mọi ô trong hộp Quản lý (#qcThan, #qmThan). ⛔ KHÔNG áp ô chat (Enter = gửi rồi gõ tiếp) — nên không áp mọi ô chữ.
      Chạy SAU xử lý Enter sẵn có của ô (setTimeout) để không cắt ngang việc ô tự làm.
   Bản myPay riêng ở kho myPay `web/giao-dien-web.js` (áp mọi ô).
   ============================================================ */
(function () {
  'use strict';
  if (window.__nhapSo) return;
  window.__nhapSo = true;
  document.addEventListener('wheel', function (e) {
    var t = e.target;
    if (t && t.tagName === 'INPUT' && t.type === 'number' && document.activeElement === t) t.blur();
  }, { capture: true, passive: true });
  var KIEU = /^(number|date|time|datetime-local|month)$/;
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.key !== 'Enter' || e.isComposing || e.shiftKey || !t || t.tagName !== 'INPUT') return;
    if (/^(button|submit|checkbox|radio|file|range|color|password)$/.test(t.type)) return;
    if (!KIEU.test(t.type) && !(t.closest && t.closest('#qcThan,#qmThan'))) return;
    setTimeout(function () { if (document.activeElement === t) t.blur(); }, 0);
  });
})();
