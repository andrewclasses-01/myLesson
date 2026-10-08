/* ============================================================
   tn-khung.js — KHUNG TIN NHẮN GIỮ SỐNG trên trang lớp / khóa / dashboard (web v1.280.0, 08/10/2026)

   Thầy chốt 08/10: chuyển qua lại TRANG BÀI TẬP/QUẢN LÝ ⇄ TIN NHẮN phải mượt, không tải lại trang
   (trước: sang nw/tinnhan.html tải ~630 KB mã + khởi động Firebase + đọc lại kho; quay về đi 3 trang
   tinnhan → index → lop). Thầy chọn "NẠP SẴN KHI TRANG RẢNH".

   Cách chạy: trang rảnh (load + 2,5 giây + requestIdleCallback) ⇒ tạo MỘT khung nhúng
   `nw/tinnhan.html?nhung=1` (cùng nhà ⇒ chung phiên đăng nhập) nằm ẨN ngoài màn hình.
     · TnKhung.mo(q)  — hiện khung ngay dưới thanh tab (q = 'phong=…' / 'voi=…' / 'phong=…&tin=…&luc=…' ⇒ mở đúng phòng)
     · TnKhung.an()   — ẩn khung, trang bài tập/dashboard còn nguyên chỗ đang cuộn
     · TnKhung.dangMo() · TnKhung.coThe()
   Địa chỉ đeo `#tin-nhan` khi khung mở ⇒ nút Back điện thoại = về trang bài tập; tải lại trang vẫn mở lại khung.

   Khung ẨN bằng cách đẩy ra ngoài màn (KHÔNG display:none) ⇒ khuôn chat vẫn đo được kích thước, và
   IntersectionObserver trong khung thấy "không hiện" ⇒ không ghi "đã xem" khi em chưa nhìn (js/chat-ui.js thuGhiXem;
   nw/js/chat.js hỏi NW.anTrongKhung() cho chat lớp + chat riêng). Khung mở lại ⇒ bắn sự kiện 'tk-hien' vào khung.

   Phía khung (nhung=1): không vẽ thanh, không mở kênh thông báo/nhịp online (trang mẹ lo), mượn SỔ CHƯA ĐỌC của trang
   mẹ (parent.TnPop.ngheSo — không mở thêm kênh tin cuối từng lớp), link/chuyển trang đi ở cửa sổ mẹ (base target _top + NW.di),
   lỗi phiên ⇒ báo 'loi' về đây chứ không tự chuyển trang. Báo 'san' khi đã dựng xong.
   ⛔ Không dùng khung ở tab "đăng nhập thay / xem như em" (window.__thayVao, ?nhu=) — giữ đường cũ sang trang.
   ⛔ Viết ES5 như js/chung.js (iPad đời cũ).
   ============================================================ */
(function () {
  'use strict';
  if (window.TnKhung) return;
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var GOC = SRC.replace(/js\/tn-khung\.js.*$/, '');
  var TRANG = GOC + 'nw/tinnhan.html';
  var HASH = '#tin-nhan';
  var TK = window.TnKhung = {};
  var khung = null, fr = null, cho = null, san = false, hien = false, daDay = false, choQ = '', henCho = null, tabCu = [];

  function dau() { return document.querySelector('.top.nwb'); }
  function dungDuoc() {
    if (!dau()) return false;
    if (window.__thayVao || /[?&]nhu=/.test(location.search)) return false;   // tab thầy đăng nhập thay / xem như em: đi đường cũ
    return true;
  }
  TK.coThe = dungDuoc;
  TK.dangMo = function () { return hien; };

  // ---------- CSS (tự chèn — 3 trang dùng chung, không đụng CSS riêng từng trang) ----------
  var st = document.createElement('style');
  st.textContent =
    '.tk-khung{position:fixed;left:0;right:0;top:var(--tk-tren,62px);bottom:var(--cao-dai,0px);z-index:38;background:#F7FAF9;' +
      'visibility:hidden;pointer-events:none;transform:translateX(-200vw)}' +
    'html.tk-mo .tk-khung{visibility:visible;pointer-events:auto;transform:none}' +
    // ⛔ CHỈ khoá cuộn ở <html>: thêm cả body ⇒ body thành khung cuộn riêng ⇒ thanh tab sticky trôi mất khỏi màn (trang đang cuộn dở)
    'html.tk-mo{overflow:hidden}' +
    'html.tk-mo .top.nwb{z-index:39}' +
    'html.tk-mo .tp-khu,html.tk-mo .tp-min{display:none}' +   // hộp chat nhỏ góc dưới: khung đã là trang Tin nhắn đầy đủ
    '.tk-fr{display:block;width:100%;height:100%;border:0;background:transparent}' +
    '.tk-cho{position:absolute;inset:0;display:grid;place-items:center;font:600 14px/1.4 "Segoe UI",system-ui,sans-serif;color:#65707F;text-align:center;padding:16px}' +
    '.tk-cho a{color:#0E7C6E;font-weight:700}' +
    '.tk-khung.san .tk-cho{display:none}';
  document.head.appendChild(st);

  // ---------- dựng khung ----------
  function tao(q) {
    if (fr) return false;
    san = false;
    khung = document.createElement('div');
    khung.className = 'tk-khung';
    khung.setAttribute('aria-hidden', 'true');
    cho = document.createElement('div');
    cho.className = 'tk-cho';
    cho.textContent = 'Đang mở tin nhắn…';
    fr = document.createElement('iframe');
    fr.className = 'tk-fr';
    fr.title = 'Tin nhắn';
    fr.setAttribute('allow', 'clipboard-write');
    // bàn thử trên máy (localhost + ?thu=1 / ?thu=thay): khung chạy dữ liệu mẫu của trang Tin nhắn (NW.laBanThu)
    var thu = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]thu=(1|thay)(&|$)/.exec(location.search);
    fr.src = TRANG + '?nhung=1' + (thu ? '&thu=' + thu[1] : '') + (q ? '&' + q : '');
    khung.appendChild(cho);
    khung.appendChild(fr);
    document.body.appendChild(khung);
    return true;
  }
  function boKhung() {
    if (khung && khung.parentNode) khung.parentNode.removeChild(khung);
    khung = fr = cho = null; san = false; choQ = '';
  }
  function gui(q) {
    if (!q) return;
    if (san && fr && fr.contentWindow) { try { fr.contentWindow.postMessage({ tk: 'mo', q: q }, location.origin); } catch (e) { } }
    else choQ = q;
  }
  function baoKhung(ten) { try { if (fr && fr.contentWindow) fr.contentWindow.dispatchEvent(new Event(ten)); } catch (e) { } }

  window.addEventListener('message', function (e) {
    if (!fr || e.source !== fr.contentWindow || e.origin !== location.origin) return;
    var d = e.data || {};
    if (d.tk === 'san') {
      san = true; clearTimeout(henCho);
      khung.classList.add('san');
      if (choQ) { var q = choQ; choQ = ''; gui(q); }
      if (hien) baoKhung('tk-hien');
    } else if (d.tk === 'loi') {
      // phiên/hồ sơ có vấn đề (chưa đăng nhập, phải đổi mật khẩu, bị khoá…) ⇒ trang Tin nhắn riêng biết cách xử lý
      var dangHien = hien, q2 = choQ;
      boKhung();
      if (dangHien) location.href = TRANG + (q2 ? '?' + q2 : '');
    }
  });

  // ---------- hiện / ẩn ----------
  function datTren() {
    var d = dau(); if (!d) return;
    var b = Math.max(0, Math.round(d.getBoundingClientRect().bottom));
    document.documentElement.style.setProperty('--tk-tren', b + 'px');
  }
  function sangTab(bat) {
    var d = dau(); if (!d) return;
    var tn = d.querySelector('.nwb-tab[data-ma="tinNhan"]');
    if (bat) {
      tabCu = [].slice.call(d.querySelectorAll('.nwb-tab.chon')).filter(function (x) { return x !== tn; });
      tabCu.forEach(function (x) { x.classList.remove('chon'); });
      if (tn) tn.classList.add('chon');
    } else {
      if (tn) tn.classList.remove('chon');
      tabCu.forEach(function (x) { x.classList.add('chon'); });
      tabCu = [];
    }
  }
  // ⛔ iPhone: bàn phím ĐẨY cả trang, khung fixed bị che nửa dưới ⇒ khi bàn phím bật, khung bám visualViewport (như hộp tn-pop.js)
  function vvKhop() {
    var vv = window.visualViewport; if (!vv || !khung) return;
    var ks = khung.style, banPhim = window.innerHeight - vv.height > 120;
    if (!hien || !banPhim) { ks.removeProperty('top'); ks.removeProperty('height'); ks.removeProperty('bottom'); ks.removeProperty('z-index'); return; }
    ks.setProperty('top', Math.round(vv.offsetTop) + 'px');
    ks.setProperty('height', Math.round(vv.height) + 'px');
    ks.setProperty('bottom', 'auto');
    ks.setProperty('z-index', '45');
  }
  if (window.visualViewport) { visualViewport.addEventListener('resize', vvKhop); visualViewport.addEventListener('scroll', vvKhop); }
  window.addEventListener('resize', function () { if (hien) datTren(); });

  function hienKhung() {
    if (hien) return;
    hien = true;
    if (window.TnPop && TnPop.dong) TnPop.dong();
    datTren();
    document.documentElement.classList.add('tk-mo');
    khung.setAttribute('aria-hidden', 'false');
    sangTab(true);
    if (location.hash !== HASH) { try { history.pushState({ tk: 1 }, '', HASH); daDay = true; } catch (e) { } }
    vvKhop();
    if (san) baoKhung('tk-hien');
    else {   // khung chưa sẵn (trang vừa mở đã bấm ngay) — quá 15 giây thì cho lối sang trang riêng
      clearTimeout(henCho);
      henCho = setTimeout(function () {
        if (san || !cho) return;
        cho.innerHTML = 'Tin nhắn mở hơi lâu…<br><a href="' + TRANG + '">Bấm vào đây để mở trang Tin nhắn</a>';
      }, 15000);
    }
  }
  function anKhung(tuLui) {
    if (!hien) return;
    hien = false;
    document.documentElement.classList.remove('tk-mo');
    if (khung) khung.setAttribute('aria-hidden', 'true');
    sangTab(false);
    vvKhop();
    baoKhung('tk-an');
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) { }   // bàn phím điện thoại đang bật thì cụp
    if (!tuLui && location.hash === HASH) {
      try {
        if (daDay) history.back();   // bỏ mục #tin-nhan vừa đẩy ⇒ Back lần sau không quay lại khung
        else history.replaceState(null, '', location.pathname + location.search);
      } catch (e) { }
    }
    daDay = false;
  }

  TK.mo = function (q) {
    if (!dungDuoc()) return false;
    q = String(q || '').replace(/^[?&]+/, '');
    if (!tao(q)) gui(q);
    hienKhung();
    return true;
  };
  TK.an = function () { anKhung(false); };

  window.addEventListener('popstate', function () {
    if (location.hash === HASH) { if (!hien) { daDay = false; TK.mo(''); } }
    else if (hien) { daDay = false; anKhung(true); }
  });

  // tin chat riêng mới đến ⇒ tn-pop-ds.js tự bật hộp chat nhỏ; khung đang mở thì thôi (em đang ở trang Tin nhắn rồi)
  if (window.TnPop && TnPop.tinMoi) {
    var tinMoiGoc = TnPop.tinMoi;
    TnPop.tinMoi = function () { if (hien) return; return tinMoiGoc.apply(this, arguments); };
  }

  // ---------- nạp sẵn khi trang rảnh ----------
  function napSan() { if (!fr && dungDuoc()) tao(''); }
  function henNap() {
    setTimeout(function () {
      if (window.requestIdleCallback) requestIdleCallback(napSan, { timeout: 5000 }); else napSan();
    }, 2500);
  }
  function batDau() {
    if (location.hash === HASH && dungDuoc()) { daDay = false; TK.mo(''); return; }   // tải lại trang lúc đang ở Tin nhắn
    henNap();
  }
  if (document.readyState === 'complete') batDau(); else window.addEventListener('load', batDau);
})();
