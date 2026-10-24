/* ============================================================
   js/huy-hieu.js — ⭐ v1.418.0 (24/10/2026) HUY HIỆU SAU TÊN "Chiến binh A Show Speed · Mùa 1" (10 bạn chăm chỉ nhất giao hữu mùa 1).
   Danh sách: nwCauHinh/huyHieu.gh1 { ten, tu, den, ds:[{ so, uid, ma, ten, t, lop, lopSlug, tenSlug }] } — ghi bởi tools/gui-tb-giao-huu-mua1.js,
   hết hạn sau `den` (30 ngày). Luật có sẵn nwCauHinh: em đăng nhập đọc, thầy ghi.
   Gắn ở MỌI trang có tệp này bằng 2 đường:
     ① GẮN THẲNG: ACHuyHieu.sau({ uid, ma, so, ten, lop }, cỡ) ⇒ HTML huy hiệu ('' nếu không có) — khung chat (js/chat-ui.js, dòng tên người gửi).
     ② TỰ DÒ: avatar mang dấu người ([data-uid] · [data-ma-hs] · [data-av-em]+[data-av-lop] · ảnh assets/avatar/<lớp>/<tên>.jpg) của một em có huy hiệu
        ⇒ tìm CHỮ TÊN đúng của em trong khối gần avatar (≤ 4 tầng, khối ≤ 220px cao) ⇒ chèn huy hiệu ngay sau chữ. Theo dõi DOM (MutationObserver, gom 400 ms).
   Cỡ huy hiệu = theo cỡ chữ của tên, KHÔNG cao hơn tên (thầy chốt). Lớp `hhd-` (tự chèn). ⛔ ES5.
   ============================================================ */
(function () {
  'use strict';
  if (window.ACHuyHieu) return;
  var DS = [], DEN = 0, TEN = 'Chiến binh A Show Speed · Mùa 1', san = false;
  function khongDau(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function slugLop(s) { return khongDau(s).replace(/[^a-z0-9]/g, ''); }
  function slugTen(s) { return khongDau(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function chuanMa(s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); }
  function con() { return san && DEN > Date.now() && DS.length; }

  // ── hình (giống js/tb-gh.js) ──
  var _i = 0;
  function svg(h) {
    var w = Math.max(8, Math.round(h / 1.12)), id = 'hhd' + (++_i);
    return '<svg class="hhd-hh" width="' + w + '" height="' + Math.round(w * 1.12) + '" viewBox="0 0 64 72" role="img" aria-label="' + TEN + '"><title>' + TEN + '</title>' +
      '<defs><linearGradient id="' + id + 'a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF0A0"/><stop offset=".5" stop-color="#FFC531"/><stop offset="1" stop-color="#D88A00"/></linearGradient>' +
      '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E3A25"/><stop offset="1" stop-color="#03150C"/></linearGradient></defs>' +
      '<path d="M32 3 57 12v20c0 17-11 29-25 36C18 61 7 49 7 32V12z" fill="url(#' + id + 'a)" stroke="#FFF6CC" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M32 10 51 17v15c0 13-8 22.5-19 28.5C21 54.5 13 45 13 32V17z" fill="url(#' + id + 'b)"/>' +
      '<path d="M36 15 22 38h9l-4 17 15-25h-9z" fill="#C9FFE0" stroke="#3DF58A" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }
  function napCss() {
    if (document.getElementById('hhdCss')) return;
    var s = document.createElement('style'); s.id = 'hhdCss';
    s.textContent = '.hhd-hh{display:inline-block;vertical-align:-0.08em;margin-left:.25em;flex:none;overflow:visible}';
    document.head.appendChild(s);
  }

  // ── ai có huy hiệu? x = { uid, ma, so, ten, lop } (đủ một trong uid / ma / so, hoặc tên + lớp) ──
  function tim(x) {
    if (!con() || !x) return null;
    var uid = String(x.uid || ''), ma = chuanMa(x.ma), so = String(x.so || ''), tS = x.ten ? slugTen(x.ten) : '', lS = x.lop ? slugLop(x.lop) : '';
    for (var i = 0; i < DS.length; i++) {
      var e = DS[i];
      if ((uid && uid === e.uid) || (ma && ma === chuanMa(e.ma)) || (so && so === String(e.so))) return e;
      if (tS && lS && lS === e.lopSlug && (tS === e.tenSlug || tS === slugTen(e.ten))) return e;
    }
    return null;
  }
  function sau(x, h) { var e = tim(x); if (!e) return ''; napCss(); return svg(h || 13); }

  // ── ② tự dò quanh avatar ──
  var RE_ANH = /assets\/avatar\/([a-z0-9]+)\/([a-z0-9-]+)\.jpg/;
  function aiCuaAv(el) {
    var uid = el.getAttribute('data-uid'); if (uid) return tim({ uid: uid });
    var ma = el.getAttribute('data-ma-hs'); if (ma) return tim({ ma: ma });
    var em = el.getAttribute('data-av-em'); if (em) return tim({ ten: em, lop: el.getAttribute('data-av-lop') || '' });
    var im = el.tagName === 'IMG' ? el : null, m = im && RE_ANH.exec(im.getAttribute('src') || '');
    if (m) for (var i = 0; i < DS.length; i++) if (DS[i].lopSlug === m[1] && (DS[i].tenSlug === m[2] || slugTen(DS[i].ten) === m[2])) return DS[i];
    return null;
  }
  function laTen(chu, e) {
    var c = khongDau(chu).replace(/\s+/g, ' ').trim(); if (!c || c.length > 60) return false;
    var a = khongDau(e.ten), b = khongDau(e.t);
    return c === a || c === b || c === a + ' (em)' || (b && b.length > 3 && c === b);
  }
  var BO = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, OPTION: 1, INPUT: 1, TITLE: 1, svg: 1, SVG: 1 };
  function ganQuanh(av, e) {
    var p = av.parentElement;
    for (var t = 0; t < 4 && p && p !== document.body; t++, p = p.parentElement) {
      if (p.getBoundingClientRect().height > 220) return;
      if (p.querySelector('.hhd-hh')) return;   // khối này đã có huy hiệu
      var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null, false), n;
      while ((n = w.nextNode())) {
        var cha = n.parentElement; if (!cha || BO[cha.tagName] || cha.closest('[contenteditable="true"], .acm, .hhd-hh')) continue;
        if (!laTen(n.nodeValue, e)) continue;
        var co = parseFloat(getComputedStyle(cha).fontSize) || 13;
        var tam = document.createElement('span'); tam.innerHTML = svg(Math.round(co * 0.95));
        cha.insertBefore(tam.firstChild, n.nextSibling);
        return;
      }
    }
  }
  var hen = null;
  function quet() {
    hen = null; if (!con()) return;
    napCss();
    var ds = document.querySelectorAll('[data-uid], [data-ma-hs], [data-av-em], img[src*="assets/avatar/"]');
    for (var i = 0; i < ds.length; i++) {
      var av = ds[i]; if (av.closest('.hhd-xong, .acm, .ghk-phu, .tbp-phu')) continue;
      var r = av.getBoundingClientRect(); if (r.width > 180 || r.height > 180) continue;   // chỉ ô avatar (data-uid còn là nhãn khối lớn)
      var e = aiCuaAv(av); if (e) ganQuanh(av, e);
    }
  }
  function henQuet() { if (!hen) hen = setTimeout(quet, 400); }

  function kho() {
    if (window.NW && NW.fb) return NW.fb();
    if (window.AWChat && AWChat.kho) return AWChat.kho();
    if (window.AWChat && AWChat.db) return AWChat.db();
    return Promise.reject(new Error('khong-co-kho'));
  }
  function nap() {
    kho().then(function (f) { return f.fs.getDoc(f.fs.doc(f.db, 'nwCauHinh', 'huyHieu')); }).then(function (s) {
      var g = (s.exists() && s.data().gh1) || null;
      if (!g || !(g.den > Date.now())) return;
      DS = g.ds || []; DEN = g.den; TEN = g.ten || TEN; san = true;
      quet();
      try { new MutationObserver(henQuet).observe(document.body, { childList: true, subtree: true }); } catch (x) { setInterval(quet, 3000); }
      try { document.dispatchEvent(new CustomEvent('huyhieu-san')); } catch (x) { }
    })['catch'](function () { /* chưa đăng nhập / không đọc được ⇒ không có huy hiệu */ });
  }
  if (document.readyState === 'complete') setTimeout(nap, 1500); else window.addEventListener('load', function () { setTimeout(nap, 1500); });

  window.ACHuyHieu = { sau: sau, tim: tim, quet: quet, san: function () { return !!con(); } };
})();
