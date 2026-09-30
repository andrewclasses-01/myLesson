/* ============================================================
   o-ngay.js — Ô CHỌN NGÀY kiểu Việt Nam (web v1.201.0, 30/09/2026 — thầy chốt "chỉ lịch bấm", dạng 21/12/2026).

   Chrome máy thầy để tiếng Anh ⇒ <input type="date"> TỰ VẼ 10/15/2026 (web không đổi được cách trình duyệt vẽ).
   Tệp này TỰ NÂNG mọi <input type="date"> / <input type="datetime-local"> — có sẵn trong trang hay vẽ sau bằng
   innerHTML (MutationObserver) — thành ô chữ CHỈ ĐỌC hiện "15/10/2026" (hoặc "15/10/2026 14:30");
   bấm vào ⇒ lịch tiếng Việt nhỏ (tuần bắt đầu Thứ 2, chọn tháng/năm nhanh, nút Hôm nay).

   ⭐ `.value` VẪN ĐỌC/GHI DẠNG MÁY như cũ ('2026-10-15' / '2026-10-15T14:30') ⇒ code cũ đọc/ghi ô KHÔNG phải sửa.
   Chọn xong bắn 'input' + 'change' (bubbles) như ô gốc.
   Lịch gắn vào <body> (position:fixed) — tránh bẫy position:fixed trong khối có backdrop-filter.
   Ô nào muốn giữ ô gốc của trình duyệt: thêm thuộc tính data-ong-bo.
   ============================================================ */
(function () {
  'use strict';
  if (window.ONgay) return;
  var GOC = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  var THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  var CHON = 'input[type="date"],input[type="datetime-local"]';

  function z(n) { return (n < 10 ? '0' : '') + n; }
  function tach(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(s || ''));
    if (!m) return null;
    var t = { y: +m[1], m: +m[2], d: +m[3], h: m[4] != null ? +m[4] : 0, p: m[5] != null ? +m[5] : 0 };
    var d = new Date(t.y, t.m - 1, t.d);
    return (d.getFullYear() === t.y && d.getMonth() === t.m - 1 && d.getDate() === t.d) ? t : null;
  }
  function may(el, t) {
    if (!t) return '';
    var s = t.y + '-' + z(t.m) + '-' + z(t.d);
    return el._ongGio ? s + 'T' + z(t.h) + ':' + z(t.p) : s;
  }
  function chu(el) {
    var t = tach(el._ongIso);
    if (!t) return '';
    var s = z(t.d) + '/' + z(t.m) + '/' + t.y;
    return el._ongGio ? s + ' ' + z(t.h) + ':' + z(t.p) : s;
  }

  // ---------- kiểu dáng (một lần) ----------
  function ganKieu() {
    if (document.getElementById('ongKieu')) return;
    var st = document.createElement('style');
    st.id = 'ongKieu';
    st.textContent =
      'input.ong-o.ong-o{cursor:pointer;caret-color:transparent;padding-right:34px;background-repeat:no-repeat;background-position:right 10px center;background-size:16px 16px;' +
        'background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235F7370%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Crect x=%273%27 y=%274%27 width=%2718%27 height=%2718%27 rx=%272%27/%3E%3Cpath d=%27M16 2v4M8 2v4M3 10h18%27/%3E%3C/svg%3E")}' +
      'input.ong-o.ong-o:disabled{cursor:default}' +
      '.ong-lich{position:fixed;z-index:2147482500;width:280px;box-sizing:border-box;background:#fff;color:#16232A;border:1px solid #E1EAE8;border-radius:14px;' +
        'box-shadow:0 14px 36px rgba(16,30,28,.24);padding:10px;font:600 13px/1.2 Montserrat,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;user-select:none;-webkit-user-select:none}' +
      '.ong-lich *{box-sizing:border-box;font-family:inherit}' +
      '.ong-dau{display:flex;align-items:center;gap:6px;margin-bottom:8px}' +
      '.ong-dau button{flex:0 0 30px;height:30px;border:0;border-radius:8px;background:#F1F5F4;color:#16232A;cursor:pointer;font-size:17px;font-weight:700;line-height:1}' +
      '.ong-dau button:hover{background:#E7F2F0}' +
      '.ong-dau select{flex:1;min-width:0;height:30px;border:1px solid #CFDCD9;border-radius:8px;padding:0 4px;background:#fff;color:#16232A;font-size:13px;font-weight:700;cursor:pointer}' +
      '.ong-luoi{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}' +
      '.ong-thu{font-size:11px;font-weight:700;color:#8AA09C;text-align:center;padding:4px 0}' +
      '.ong-thu.cn{color:#E36B5C}' +
      '.ong-ngay{height:32px;border:0;border-radius:8px;background:none;color:#16232A;cursor:pointer;font-size:13px;font-weight:600;padding:0}' +
      '.ong-ngay:hover{background:#E7F2F0}' +
      '.ong-ngay.cn{color:#E36B5C}' +
      '.ong-ngay.ngoai{color:#C4D0CD}' +
      '.ong-ngay.nay{box-shadow:inset 0 0 0 1.5px #0E7C6E}' +
      '.ong-ngay.chon,.ong-ngay.chon:hover{background:#0E7C6E;color:#fff}' +
      '.ong-gio{display:flex;align-items:center;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid #E1EAE8}' +
      '.ong-gio span{font-size:12px;color:#5F7370;margin-right:auto}' +
      '.ong-gio select{height:30px;border:1px solid #CFDCD9;border-radius:8px;padding:0 4px;background:#fff;color:#16232A;font-size:13px;font-weight:700;cursor:pointer}' +
      '.ong-chan{display:flex;gap:6px;margin-top:8px}' +
      '.ong-chan button{height:30px;border:1px solid #CFDCD9;border-radius:8px;background:#fff;color:#16232A;padding:0 10px;cursor:pointer;font-size:12px;font-weight:700}' +
      '.ong-chan button:hover{background:#F1F5F4}' +
      '.ong-chan .ong-xong{margin-left:auto;background:#0E7C6E;border-color:#0E7C6E;color:#fff}' +
      '.ong-chan .ong-xong:hover{background:#0B6A5E}';
    (document.head || document.documentElement).appendChild(st);
  }

  // ---------- nâng một ô ----------
  function nang(el) {
    if (el._ongIso !== undefined || el.hasAttribute('data-ong-bo')) return;
    var loai = String(el.getAttribute('type') || '').toLowerCase();
    if (loai !== 'date' && loai !== 'datetime-local') return;
    ganKieu();
    var cu = GOC.get.call(el) || el.getAttribute('value') || '';
    el._ongGio = loai === 'datetime-local';
    el._ongIso = '';
    el.setAttribute('type', 'text');
    el.readOnly = true;
    el.setAttribute('inputmode', 'none');
    el.setAttribute('autocomplete', 'off');
    el.classList.add('ong-o');
    if (!el.placeholder) el.placeholder = el._ongGio ? 'dd/mm/yyyy hh:mm' : 'dd/mm/yyyy';
    Object.defineProperty(el, 'value', {
      configurable: true,
      get: function () { return el._ongIso; },
      set: function (v) { el._ongIso = may(el, tach(v)); GOC.set.call(el, chu(el)); }
    });
    el.value = cu;
    el.addEventListener('click', function () { if (!el.disabled) mo(el); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); if (!el.disabled) mo(el); }
    });
  }
  function quet(n) {
    if (!n || n.nodeType !== 1) return;
    if (n.matches && n.matches(CHON)) nang(n);
    if (n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll(CHON), nang);
  }

  // ---------- lịch ----------
  var P = null, EL = null, XEM = null, TAM = null;   // TAM = {y,m,d,h,p} đang chọn trong lịch
  function homNay() { var d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), p: d.getMinutes() }; }
  function ghi(t) {
    if (!EL) return;
    EL.value = t ? may(EL, t) : '';
    EL.dispatchEvent(new Event('input', { bubbles: true }));
    EL.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function ve() {
    var nay = homNay(), y = XEM.y, m = XEM.m;
    var dau = new Date(y, m - 1, 1), lech = (dau.getDay() + 6) % 7;      // Thứ 2 = cột đầu
    var bd = new Date(y, m - 1, 1 - lech);
    var nam0 = Math.min(nay.y - 40, y - 5), nam1 = Math.max(nay.y + 5, y + 5);
    var h = '<div class="ong-dau"><button type="button" data-ong="lui" aria-label="Tháng trước">‹</button>' +
      '<select data-ong="thang" aria-label="Tháng">';
    for (var i = 1; i <= 12; i++) h += '<option value="' + i + '"' + (i === m ? ' selected' : '') + '>Tháng ' + i + '</option>';
    h += '</select><select data-ong="nam" aria-label="Năm">';
    for (var n = nam1; n >= nam0; n--) h += '<option value="' + n + '"' + (n === y ? ' selected' : '') + '>' + n + '</option>';
    h += '</select><button type="button" data-ong="toi" aria-label="Tháng sau">›</button></div><div class="ong-luoi">';
    THU.forEach(function (t, k) { h += '<div class="ong-thu' + (k === 6 ? ' cn' : '') + '">' + t + '</div>'; });
    for (var k = 0; k < 42; k++) {
      var d = new Date(bd.getFullYear(), bd.getMonth(), bd.getDate() + k);
      var dy = d.getFullYear(), dm = d.getMonth() + 1, dd = d.getDate();
      if (k === 35 && dm !== m) break;                                        // tháng gọn trong 5 hàng
      var lop = 'ong-ngay' + (dm !== m ? ' ngoai' : '') + (k % 7 === 6 ? ' cn' : '') +
        (dy === nay.y && dm === nay.m && dd === nay.d ? ' nay' : '') +
        (TAM && dy === TAM.y && dm === TAM.m && dd === TAM.d ? ' chon' : '');
      h += '<button type="button" class="' + lop + '" data-ong="ngay" data-y="' + dy + '" data-m="' + dm + '" data-d="' + dd + '">' + dd + '</button>';
    }
    h += '</div>';
    if (EL._ongGio) {
      var g = TAM || homNay();
      h += '<div class="ong-gio"><span>Giờ</span><select data-ong="h" aria-label="Giờ">';
      for (var a = 0; a < 24; a++) h += '<option value="' + a + '"' + (a === g.h ? ' selected' : '') + '>' + z(a) + '</option>';
      h += '</select>:<select data-ong="p" aria-label="Phút">';
      for (var b = 0; b < 60; b++) h += '<option value="' + b + '"' + (b === g.p ? ' selected' : '') + '>' + z(b) + '</option>';
      h += '</select></div>';
    }
    h += '<div class="ong-chan"><button type="button" data-ong="homnay">Hôm nay</button>' +
      (EL.required ? '' : '<button type="button" data-ong="xoa">Xoá</button>') +
      (EL._ongGio ? '<button type="button" class="ong-xong" data-ong="xong">Xong</button>' : '') + '</div>';
    P.innerHTML = h;
  }
  function datCho() {
    if (!P || !EL) return;
    var r = EL.getBoundingClientRect(), w = P.offsetWidth, c = P.offsetHeight;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var top = r.bottom + 6;
    if (top + c > vh - 8 && r.top - 6 - c >= 8) top = r.top - 6 - c;
    top = Math.max(8, Math.min(top, vh - c - 8));
    var left = Math.max(8, Math.min(r.left, vw - w - 8));
    P.style.top = top + 'px'; P.style.left = left + 'px';
  }
  function mo(el) {
    if (P && EL === el) return;
    dong();
    EL = el;
    TAM = tach(el._ongIso);
    var g = TAM || homNay();
    XEM = { y: g.y, m: g.m };
    P = document.createElement('div');
    P.className = 'ong-lich';
    P.setAttribute('role', 'dialog');
    P.setAttribute('aria-label', 'Chọn ngày');
    P.addEventListener('click', bamLich);
    P.addEventListener('change', doiLich);
    document.body.appendChild(P);
    ve();
    datCho();
  }
  function dong() {
    if (P) { P.remove(); P = null; }
    var e = EL; EL = null; TAM = null;
    return e;
  }
  function doiThang(k) {
    var d = new Date(XEM.y, XEM.m - 1 + k, 1);
    XEM = { y: d.getFullYear(), m: d.getMonth() + 1 };
    ve(); datCho();
  }
  function bamLich(e) {
    var b = e.target.closest('[data-ong]');
    if (!b || b.tagName === 'SELECT') return;
    var v = b.getAttribute('data-ong');
    if (v === 'lui') return doiThang(-1);
    if (v === 'toi') return doiThang(1);
    if (v === 'xoa') { ghi(null); var e1 = dong(); if (e1) e1.focus(); return; }
    if (v === 'xong') { if (!TAM) { TAM = homNay(); ghi(TAM); } var e2 = dong(); if (e2) e2.focus(); return; }
    var t = null;
    if (v === 'homnay') t = homNay();
    else if (v === 'ngay') t = { y: +b.getAttribute('data-y'), m: +b.getAttribute('data-m'), d: +b.getAttribute('data-d') };
    if (!t) return;
    if (EL._ongGio) {                                   // ngày + giờ: giữ giờ đang chọn, lịch còn mở tới khi bấm Xong
      var g = TAM || homNay();
      if (v === 'ngay') { t.h = g.h; t.p = g.p; }
      TAM = t; XEM = { y: t.y, m: t.m };
      ghi(TAM); ve(); datCho();
      return;
    }
    t.h = 0; t.p = 0;
    ghi(t);
    var e3 = dong(); if (e3) e3.focus();
  }
  function doiLich(e) {
    var s = e.target, v = s.getAttribute('data-ong');
    if (v === 'thang') { XEM.m = +s.value; ve(); datCho(); }
    else if (v === 'nam') { XEM.y = +s.value; ve(); datCho(); }
    else if (v === 'h' || v === 'p') {
      if (!TAM) { var n = homNay(); TAM = { y: n.y, m: n.m, d: n.d, h: n.h, p: n.p }; }
      TAM[v] = +s.value;
      ghi(TAM); ve(); datCho();
    }
  }

  // bấm ra ngoài / Esc / cuộn / đổi cỡ
  document.addEventListener('pointerdown', function (e) {
    if (P && !P.contains(e.target) && e.target !== EL) dong();
  }, true);
  window.addEventListener('keydown', function (e) {
    if (P && e.key === 'Escape') {                     // Esc chỉ đóng lịch, không đóng hộp bên dưới
      e.preventDefault(); e.stopImmediatePropagation();
      var el = dong(); if (el) el.focus();
    }
  }, true);
  window.addEventListener('scroll', function (e) { if (P && !P.contains(e.target)) datCho(); }, true);
  window.addEventListener('resize', function () { if (P) dong(); });

  new MutationObserver(function (ds) {
    for (var i = 0; i < ds.length; i++) for (var j = 0; j < ds[i].addedNodes.length; j++) quet(ds[i].addedNodes[j]);
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.body) quet(document.body);
  document.addEventListener('DOMContentLoaded', function () { quet(document.body); });

  window.ONgay = {
    nang: quet,
    dangMo: function () { return !!P; },
    trong: function (n) { return !!(P && n && P.contains(n)); },
    // 'yyyy-mm-dd…' ⇒ 'dd/mm/yyyy' (chuỗi khác trả nguyên)
    chu: function (s) { var t = tach(s); return t ? z(t.d) + '/' + z(t.m) + '/' + t.y : String(s || ''); }
  };
})();
