/* ⛔ FILE SINH TỰ ĐỘNG từ kho myPay v0.20.0 (4d2bb40) bằng tools/dong-goi-web.js — ĐỪNG SỬA TAY (sửa ở kho myPay rồi đóng gói lại) */
/* ============================================================
   myPay WEB — CHỈNH GIAO DIỆN CHO WEB + ĐIỆN THOẠI (giao-dien-web.js) · Đợt 1 (03/10/2026)
   Giao diện myPay (mypay-app.js) giữ NGUYÊN; file này chỉ bù chỗ màn cảm ứng thiếu:
   • BẤM GIỮ ~0,55 giây = CHUỘT PHẢI (4 mục thầy đã chốt — không thêm mục nào). Android tự bắn chuột phải khi
     giữ ⇒ chặn bản tự bắn để không mở 2 lần.
   • CHẠM ĐÚP = NHÁY ĐÚP (mở hóa đơn) — trình duyệt điện thoại tự bắn nháy đúp thì bỏ bản trùng.
   • Nút "← Dashboard" ở cột/thanh tab.
   ============================================================ */
(function () {
  'use strict';
  var GIU_MS = 550, DUP_MS = 320, XA = 14;
  var giu = null, lanCham = null, vuaGiuLuc = 0, vuaDupLuc = 0;

  function phat(el, kieu, x, y) {
    el.dispatchEvent(new MouseEvent(kieu, { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window }));
  }
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { clearTimeout(giu && giu.hen); giu = null; return; }
    var t = e.touches[0]; var el = e.target;
    if (el.closest('input,textarea,select')) return;
    clearTimeout(giu && giu.hen);
    giu = { x: t.clientX, y: t.clientY, el: el, xong: false };
    giu.hen = setTimeout(function () {
      if (!giu) return;
      giu.xong = true; vuaGiuLuc = Date.now();
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (er) { /* thôi */ } }
      phat(giu.el, 'contextmenu', giu.x, giu.y);
    }, GIU_MS);
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!giu) return; var t = e.touches[0];
    if (Math.abs(t.clientX - giu.x) > XA || Math.abs(t.clientY - giu.y) > XA) { clearTimeout(giu.hen); giu = null; }
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    var g = giu; giu = null;
    if (g) clearTimeout(g.hen);
    if (g && g.xong) { e.preventDefault(); lanCham = null; return; }   // vừa giữ ⇒ không tính là chạm
    var t = e.changedTouches[0]; var el = e.target; var bay = Date.now();
    if (lanCham && bay - lanCham.luc < DUP_MS && lanCham.el === el && Math.abs(t.clientX - lanCham.x) < XA * 2 && Math.abs(t.clientY - lanCham.y) < XA * 2) {
      lanCham = null; vuaDupLuc = bay;
      setTimeout(function () { phat(el, 'dblclick', t.clientX, t.clientY); }, 0);
      return;
    }
    lanCham = { el: el, x: t.clientX, y: t.clientY, luc: bay };
  }, { passive: false });
  document.addEventListener('touchcancel', function () { if (giu) clearTimeout(giu.hen); giu = null; }, { passive: true });
  // chặn bản TRÌNH DUYỆT tự bắn (trùng với bản mình vừa bắn)
  document.addEventListener('contextmenu', function (e) {
    if (e.isTrusted && Date.now() - vuaGiuLuc < 1200) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('dblclick', function (e) {
    if (e.isTrusted && Date.now() - vuaDupLuc < 600) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  // ⭐ 07/10/2026 (thầy chốt) — CUỘN CHUỘT CHỈ ĐỂ CUỘN TRANG: ô số đang được chọn mà cuộn chuột thì trình duyệt tự tăng/giảm số
  //   (dễ sửa nhầm tiền). Rời ô đó NGAY trước khi trình duyệt đổi số ⇒ số giữ nguyên, trang cuộn bình thường.
  document.addEventListener('wheel', function (e) {
    var t = e.target;
    if (t && t.tagName === 'INPUT' && t.type === 'number' && document.activeElement === t) t.blur();
  }, { capture: true, passive: true });
  // ⭐ 07/10/2026 (thầy chốt) — GÕ XONG BẤM ENTER = NHẬN Ô ĐÓ (như bấm ra ngoài). Chạy SAU các xử lý Enter sẵn có của ô
  //   (setTimeout) để không cắt ngang việc ô đó tự làm khi Enter (gửi form đăng nhập…). Ô nhiều dòng (textarea) giữ Enter xuống dòng.
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.key !== 'Enter' || e.isComposing || e.shiftKey || !t || t.tagName !== 'INPUT') return;
    if (/^(button|submit|checkbox|radio|file|range|color)$/.test(t.type)) return;
    setTimeout(function () { if (document.activeElement === t) t.blur(); }, 0);
  });

  // Đợt 2 — nút "Chọn file sao kê": mở hộp chọn file NGAY trong cú bấm (iPhone/Safari bắt buộc), giao diện myPay vẫn chạy
  // đường cũ (kênh saoke:chon) và nhận đúng file vừa chọn.
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#nutChonSaoKe') && window.PayWeb) window.PayWeb.moChonFileNgay();
  }, true);

  // nút về Dashboard
  document.addEventListener('DOMContentLoaded', function () {
    var rail = document.querySelector('.rail'); if (!rail) return;
    var a = document.createElement('a');
    a.className = 'tab py-ve'; a.href = 'dashboard.html'; a.title = 'Về trang quản lý';
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Dashboard';
    var brand = rail.querySelector('.brand');
    rail.insertBefore(a, brand || null);
    // 06/10/2026 — nút Đăng xuất (phiên myPay riêng trong tab; dashboard KHÔNG bị đăng xuất theo)
    var x = document.createElement('button');
    x.className = 'tab py-ra'; x.type = 'button'; x.title = 'Thoát myPay trên máy này (Dashboard vẫn giữ đăng nhập)';
    x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Đăng xuất';
    x.addEventListener('click', function () { if (window.PayWeb) window.PayWeb.dangXuat('Đã đăng xuất myPay.'); });
    rail.insertBefore(x, brand || null);
  });
})();
