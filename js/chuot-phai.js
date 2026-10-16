/* ============================================================
   js/chuot-phai.js — ⭐ web v1.364.0 (16/10/2026, thầy yêu cầu) CHUỘT PHẢI + NHẤN GIỮ CỦA RIÊNG HỆ SINH THÁI
   Nạp ở MỌI trang học sinh + dashboard + 10 trang nw/ (trang thật lẫn trang thử — trang thử là bản chép). KHÔNG nạp ở pay.html
   (myPay có menu chuột phải riêng).

   1. Tắt HẲN menu chuột phải của trình duyệt. Máy tính: chuột phải ⇒ menu riêng theo chỗ bấm (avatar · biểu tượng nhóm lớp ·
      link · chữ đang chọn · ô gõ) + Quay lại / Tải lại trang. Màn cảm ứng: NHẤN GIỮ 0,5 giây trên avatar / nhóm lớp / link ⇒
      menu trượt từ đáy (chữ thường giữ để bôi đen như cũ; ô gõ giữ nguyên menu dán của máy).
      Chỗ đã có nhấn giữ riêng (bong bóng chat, dòng Tin nhắn, nút cảm xúc, thẻ lớp dashboard, bảng xếp hạng) ⇒ để nguyên.
      Thành phần nào tự `preventDefault()` chuột phải (vd bong bóng chat mở menu tin) ⇒ menu này đứng yên.
   2. BẤM AVATAR ⇒ TRANG CÁ NHÂN (nw/canhan.html?uid=…) ở mọi nơi có avatar người:
        [data-uid] (NW.avHtml, avatar thầy) · [data-av-em][data-av-lop] (avatar trang lớp/khóa/dashboard, js/chung.js gaAvatar /
        veAv) · [data-ma-hs] (tin chat lớp ở trang nw/). Tra uid qua data/lop.json (+ js/hs-uid.js).
      Avatar nằm TRONG một nút/link có việc riêng (dòng chat, ô chọn bạn) ⇒ bỏ qua. Dashboard: chờ 330 ms — bấm đúp vẫn là
      việc cũ (hộp quản lý em) — rồi mở TAB MỚI (không rời dashboard). Trang trận (tran.html) không bấm avatar.
   3. BẤM BIỂU TƯỢNG NHÓM LỚP ([data-nhom-lop="<mã lớp | tên gốc | lop:MÃ>"]) ⇒ pop-up bên cạnh: danh sách thành viên
      (Thầy Andrew + các em, không gồm em học thử). Bấm avatar/tên ⇒ trang cá nhân; nút tin nhắn cuối dòng ⇒ "Tính năng tin nhắn
      riêng sẽ sớm được ra mắt!" (dòng Thầy Andrew của học sinh ⇒ mở chat với thầy, tính năng đã có).
   API: ACMenu.them(fn(ctx) → [mục]) · ACMenu.mo(muc, x, y) · ACMenu.moCaNhan(uid) · ACMenu.moThanhVien(lop, neo) ·
        ACMenu.bao(chu) · ACMenu.timLop(key) · ACMenu.loiMoiDau(id, t) (lời mời thách đấu bấm từ hộp thông báo).
   mục = { chu, ic?, lam(), nguy? } hoặc '-' (vạch ngăn) hoặc { dau: html } (đầu menu).
   ⛔ ES5 (iPad đời cũ) như js/chung.js.
   ============================================================ */
(function () {
  'use strict';
  if (window.ACMenu) return;
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var GOC = SRC.replace(/js\/chuot-phai\.js.*$/, '');   // thư mục gốc web (chứa nw/, data/)
  var TRONG_NW = /\/nw\//.test(location.pathname);
  var THAY_UID = 'quantri_thay';
  var M = window.ACMenu = {};

  function an(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function khongDau(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function chuan(s) { return khongDau(s).replace(/^lop:/, '').replace(/[^a-z0-9]/g, '').toUpperCase(); }
  function tat(s) { var w = String(s || '?').trim().split(/\s+/); return (w.length > 1 ? w[w.length - 2][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase(); }
  var MAU = ['#B3541E', '#0E7C6E', '#8CC63F', '#E5705F', '#9C6ADE', '#2F80ED'];
  function mau(ten) { var s = 0; ten = String(ten || ''); for (var i = 0; i < ten.length; i++) s += ten.charCodeAt(i); return MAU[s % MAU.length]; }
  function gocDl() { return (window.NW && NW.CFG && NW.CFG.GOC_DL) || window.AC_GOC_DL || GOC; }
  function laDash() { return /\/dashboard\.html$/.test(location.pathname) || !!document.querySelector('.top.nwb[data-vai="thay"]'); }
  function laCham() { return !!(window.matchMedia && matchMedia('(hover:none)').matches); }
  function toiLaThay() { return laDash() || !!(window.NW && NW.toi && NW.toi.laThay); }
  function uidToi() { return (window.NW && NW.toi && NW.toi.uid) || (laDash() ? THAY_UID : ''); }
  var P = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; };
  var IC = {
    nguoi: P('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
    tin: P('<path d="M8.2 3h7.6c3.8 0 5.4 1.6 5.4 5.4v3.4c0 3.8-1.6 5.4-5.4 5.4h-2.1l-4.9 3.4c-.7.5-1.6-.1-1.4-.9l.2-.9c.2-.8-.3-1.6-1.1-1.6h-.3c-2.8 0-3.4-1.6-3.4-5.4V8.4C2.8 4.6 4.4 3 8.2 3z"/>'),
    nhom: P('<circle cx="9" cy="8" r="3.2"/><path d="M3.2 19.5c0-3.3 2.6-5.4 5.8-5.4s5.8 2.1 5.8 5.4"/><circle cx="17.2" cy="9" r="2.5"/><path d="M16.5 14.2c2.6.2 4.3 2 4.3 4.8"/>'),
    lui: P('<path d="M15 5l-7 7 7 7"/>'),
    taiLai: P('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
    chep: P('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
    cat: P('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 20 20M8.1 15.9 20 4"/>'),
    dan: P('<rect x="6" y="4" width="12" height="17" rx="2.5"/><path d="M9 4.5V3h6v1.5"/><path d="M9.5 11h5M9.5 15h5"/>'),
    chonHet: P('<rect x="4" y="4" width="16" height="16" rx="2.5" stroke-dasharray="3 2.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.9"/>'),
    link: P('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L12 5.6"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>'),
    tab: P('<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/>'),
    dong: P('<path d="M6 6l12 12M18 6L6 18"/>')
  };

  // ---------- CSS (tự chèn — một file cho mọi trang) ----------
  function napCss() {
    if (document.getElementById('acmCss')) return;
    var s = document.createElement('style'); s.id = 'acmCss';
    s.textContent =
      // iOS: tắt khung "xem trước link / lưu ảnh" của máy khi nhấn giữ (ô gõ vẫn như cũ)
      'body{-webkit-touch-callout:none}input,textarea,[contenteditable="true"]{-webkit-touch-callout:default}' +
      '[data-uid],[data-av-em],[data-ma-hs],[data-nhom-lop]{-webkit-user-select:none;user-select:none}' +
      '[data-uid],[data-av-em],[data-ma-hs],[data-nhom-lop]{cursor:pointer}' +
      '.acm-nen{position:fixed;inset:0;z-index:10049;background:transparent}.acm-nen.toi{background:rgba(22,35,42,.28)}' +
      '.acm{position:fixed;z-index:10050;min-width:210px;max-width:290px;background:#fff;border:1px solid #E0EAE7;border-radius:14px;box-shadow:0 14px 40px rgba(22,35,42,.2);' +
      'padding:6px;font:600 14px/1.3 var(--sans,Montserrat,"Segoe UI",system-ui,sans-serif);color:#16232A;opacity:0;transform:scale(.97);transform-origin:top left;transition:opacity .12s,transform .12s}' +
      '.acm.mo{opacity:1;transform:none}' +
      '.acm button{display:flex;gap:10px;align-items:center;width:100%;padding:9px 10px;border:0;background:none;border-radius:9px;color:inherit;text-align:left;cursor:pointer;font:inherit}' +
      '.acm button:hover,.acm button:focus-visible{background:#E8F4F1;color:#0E7C6E;outline:0}.acm button.nguy{color:#C2412D}.acm button.nguy:hover{background:#FDECE8}' +
      '.acm svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}' +
      '.acm hr{border:0;border-top:1px solid #EDF2F1;margin:5px 4px}' +
      '.acm .acm-dau{display:flex;gap:10px;align-items:center;padding:6px 10px 10px;border-bottom:1px solid #EDF2F1;margin-bottom:5px}.acm .acm-dau b{display:block;font-size:14.5px}.acm .acm-dau small{display:block;color:#5F7370;font-size:12px}' +
      '.acm.day{left:8px!important;right:8px;top:auto!important;bottom:8px;max-width:none;border-radius:18px;padding:8px 8px calc(8px + env(safe-area-inset-bottom));transform:translateY(24px);transform-origin:bottom}' +
      '.acm.day.mo{transform:none}.acm.day button{padding:12px;font-size:15px}' +
      '.acm-av{position:relative;width:36px;height:36px;border-radius:50%;flex:none;display:grid;place-items:center;color:#fff;font:800 12.5px/1 var(--sans,Montserrat,sans-serif);overflow:hidden}' +
      '.acm-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}' +
      // pop-up thành viên lớp
      '.acm-tv{position:fixed;z-index:10050;width:300px;max-width:calc(100vw - 16px);max-height:min(560px,calc(100vh - 24px));display:flex;flex-direction:column;background:#fff;border:1px solid #E0EAE7;' +
      'border-radius:16px;box-shadow:0 18px 48px rgba(22,35,42,.22);font:600 14px/1.3 var(--sans,Montserrat,"Segoe UI",system-ui,sans-serif);color:#16232A;opacity:0;transform:translateX(-6px);transition:opacity .14s,transform .14s}' +
      '.acm-tv.mo{opacity:1;transform:none}.acm-tv.day{left:8px!important;right:8px;top:auto!important;bottom:8px;width:auto;max-height:72vh;border-radius:18px;transform:translateY(24px)}.acm-tv.day.mo{transform:none}' +
      '.acm-tv-dau{display:flex;align-items:center;gap:10px;padding:12px 12px 10px 14px;border-bottom:1px solid #EDF2F1}.acm-tv-dau b{display:block;font-size:15px}.acm-tv-dau small{display:block;color:#5F7370;font-size:12px;margin-top:2px}' +
      '.acm-tv-dau .x{margin-left:auto;width:32px;height:32px;border:0;border-radius:50%;background:#F1F5F4;color:#5F7370;display:grid;place-items:center;cursor:pointer;flex:none}.acm-tv-dau .x:hover{background:#E8F4F1;color:#0E7C6E}' +
      '.acm-tv-dau .x svg,.acm-tv .nt svg{width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}' +
      '.acm-tv-ds{overflow:auto;padding:6px;overscroll-behavior:contain}' +
      '.acm-tv-hang{display:flex;align-items:center;gap:4px;border-radius:11px}.acm-tv-hang:hover{background:#F4F9F8}' +
      '.acm-tv .ai{flex:1;min-width:0;display:flex;align-items:center;gap:10px;padding:7px 8px;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:11px}' +
      '.acm-tv .ai span.t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.acm-tv .ai:hover span.t{color:#0E7C6E}.acm-tv .ai small{color:#5F7370;font-size:11.5px;font-weight:600;margin-left:4px}' +
      '.acm-tv .nhan{font-size:10px;font-weight:800;letter-spacing:.04em;color:#fff;background:#0E7C6E;border-radius:6px;padding:2px 6px;margin-left:6px}' +
      '.acm-tv .nt{width:34px;height:34px;border:0;border-radius:50%;background:none;color:#5F7370;display:grid;place-items:center;cursor:pointer;flex:none;margin-right:4px}.acm-tv .nt:hover{background:#E8F4F1;color:#0E7C6E}' +
      '.acm-tv-trong{padding:22px 14px;text-align:center;color:#5F7370}' +
      '.acm-bao{position:fixed;z-index:10060;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translate(-50%,16px);opacity:0;max-width:calc(100vw - 32px);background:#16232A;color:#fff;' +
      'padding:11px 18px;border-radius:12px;font:600 14px/1.35 var(--sans,Montserrat,"Segoe UI",system-ui,sans-serif);box-shadow:0 10px 30px rgba(0,0,0,.25);transition:opacity .2s,transform .2s;text-align:center}' +
      '.acm-bao.mo{opacity:1;transform:translate(-50%,0)}.acm-bao a{color:#9BFFC4}';
    document.head.appendChild(s);
  }

  // ---------- báo nhanh ----------
  var _bao = null, _baoHen = null;
  M.bao = function (chu, html) {
    napCss();
    if (!_bao) { _bao = document.createElement('div'); _bao.className = 'acm-bao'; _bao.setAttribute('role', 'status'); document.body.appendChild(_bao); }
    if (html) _bao.innerHTML = chu; else _bao.textContent = chu;
    void _bao.offsetWidth; _bao.classList.add('mo');
    clearTimeout(_baoHen); _baoHen = setTimeout(function () { _bao.classList.remove('mo'); }, html ? 6000 : 2800);
  };
  M.sapRaMat = function () { M.bao('Tính năng tin nhắn riêng sẽ sớm được ra mắt!'); };

  // ---------- danh sách lớp (data/lop.json) ----------
  var _dl = null;
  function napDl() {
    if (!_dl) _dl = fetch(gocDl() + 'data/lop.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      ['catch'](function (e) { _dl = null; throw e; });
    return _dl;
  }
  function tatCaLop(dl) { return (dl.lop || []).concat((dl.khoa || []).map(function (k) { return Object.assign({ khoa: true }, k); })); }
  M.timLop = function (key) {
    var k = chuan(key);
    return napDl().then(function (dl) {
      return tatCaLop(dl).filter(function (l) { return chuan(l.maLop) === k || chuan(l.tenGoc) === k; })[0] || null;
    });
  };
  function uidHs(h) { return window.ACHsUid ? ACHsUid.uidCuaHs(h) : (h.uid || (h.id != null && h.id !== '' ? 'hs_' + h.id : '')); }
  function avUrl(l, ten) {
    if (!l || !ten) return '';
    var lop = khongDau(l.tenGoc || l.maLop).replace(/[^a-z0-9]/g, '') || 'lop', em = khongDau(ten).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'hs';
    return gocDl() + 'assets/avatar/' + lop + '/' + em + '.jpg';
  }
  function avHtml(ten, url) { return '<span class="acm-av" style="background:' + mau(ten) + '">' + an(tat(ten)) + (url ? '<img src="' + an(url) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</span>'; }

  // ---------- AI là chủ avatar này? → Promise<{uid, ten, thay}|null> ----------
  var AV_SEL = '[data-uid], [data-av-em], [data-ma-hs]';
  function tenCua(el) { return el.getAttribute('data-ten') || el.getAttribute('data-av-em') || el.getAttribute('title') || ''; }
  function nguoiCua(el) {
    var uid = el.getAttribute('data-uid');
    if (uid) return Promise.resolve({ uid: uid, ten: tenCua(el) || (uid === THAY_UID ? 'Thầy Andrew' : ''), thay: uid === THAY_UID });
    var ma = chuan(el.getAttribute('data-ma-hs')), em = el.getAttribute('data-av-em'), lop = el.getAttribute('data-av-lop');
    return napDl().then(function (dl) {
      var ds = tatCaLop(dl), h = null;
      if (ma) ds.some(function (l) { h = (l.hocSinh || []).filter(function (x) { return chuan(x.ma) === ma; })[0] || null; return !!h; });
      else if (em) {
        var k = chuan(lop), tenK = khongDau(em).replace(/\s+/g, ' ').trim();
        var gan = ds.filter(function (l) { return !lop || chuan(l.maLop) === k || chuan(l.tenGoc) === k; });
        gan.some(function (l) { h = (l.hocSinh || []).filter(function (x) { return khongDau(x.ten).replace(/\s+/g, ' ').trim() === tenK; })[0] || null; return !!h; });
      }
      return h ? { uid: uidHs(h), ten: h.ten, thay: false } : null;
    });
  }

  // ---------- mở trang cá nhân / nhắn tin ----------
  M.moCaNhan = function (uid) {
    if (!uid) return;
    var h = 'canhan.html?uid=' + encodeURIComponent(uid);
    if (TRONG_NW && window.NW && NW.di) {
      if (NW.toi && NW.toi.laThay && !NW.laNhung && !(NW.laBanThu && NW.laBanThu())) { var w0 = null; try { w0 = window.open(NW.duong ? NW.duong(h) : h, '_blank'); } catch (e) { } if (w0) return; }
      NW.di(h); return;
    }
    var url = GOC + 'nw/' + h;
    if (laDash()) {   // thầy: không rời dashboard
      var w = null; try { w = window.open(url, '_blank'); } catch (e) { }
      if (!w) M.bao('Trình duyệt chặn tab mới — <a href="' + an(url) + '" target="_blank" rel="noopener">bấm vào đây để mở trang cá nhân</a>.', true);
      return;
    }
    if (window.__thayVao && !window.__thayVao.co()) { alert('Đang đăng nhập thay em — chờ dải đỏ báo xong rồi bấm lại nhé.'); return; }
    location.href = url;
  };
  M.nhanTin = function (ng) {
    // Thầy là người duy nhất đã có phòng chat riêng với mọi em (tính năng cũ) ⇒ học sinh bấm Thầy Andrew là mở chat với thầy.
    if (ng && ng.uid === THAY_UID && !toiLaThay()) {
      if (TRONG_NW && window.NW && NW.di) return NW.di('tinnhan.html?voi=' + THAY_UID);
      if (window.TnKhung && TnKhung.coThe && TnKhung.coThe()) return TnKhung.mo('voi=' + THAY_UID);
      location.href = GOC + 'nw/tinnhan.html?voi=' + THAY_UID; return;
    }
    M.sapRaMat();
  };
  function moNguoiCua(el) {
    nguoiCua(el).then(function (ng) {
      if (ng && ng.uid) M.moCaNhan(ng.uid);
      else M.bao('Chưa mở được trang cá nhân' + (tenCua(el) ? ' của ' + tenCua(el) : '') + '.');
    }, function () { M.bao('Chưa tải được danh sách lớp. Em thử lại nhé.'); });
  }

  // ---------- MENU ----------
  var _mo = null;   // { el, nen }
  function dong() {
    if (!_mo) return;
    var m = _mo; _mo = null;
    if (m.nen.parentNode) m.nen.parentNode.removeChild(m.nen);
    m.el.classList.remove('mo');
    setTimeout(function () { if (m.el.parentNode) m.el.parentNode.removeChild(m.el); }, 140);
    document.removeEventListener('keydown', m.phim, true);
    window.removeEventListener('resize', dong); window.removeEventListener('blur', dong);
  }
  M.dong = function () { dong(); dongTv(); };
  M.mo = function (muc, x, y, day) {
    dong(); dongTv(); napCss();
    muc = (muc || []).filter(Boolean);
    while (muc.length && muc[0] === '-') muc.shift();
    while (muc.length && muc[muc.length - 1] === '-') muc.pop();
    if (!muc.length) return;
    var nen = document.createElement('div'); nen.className = 'acm-nen' + (day ? ' toi' : '');
    var el = document.createElement('div'); el.className = 'acm' + (day ? ' day' : ''); el.setAttribute('role', 'menu');
    var ds = [];
    el.innerHTML = muc.map(function (m, i) {
      if (m === '-') return (muc[i - 1] === '-' ? '' : '<hr>');
      if (m.dau) return '<div class="acm-dau">' + m.dau + '</div>';
      ds.push(m); return '<button type="button" role="menuitem" data-i="' + (ds.length - 1) + '"' + (m.nguy ? ' class="nguy"' : '') + '>' + (m.ic || '') + '<span>' + an(m.chu) + '</span></button>';
    }).join('');
    document.body.appendChild(nen); document.body.appendChild(el);
    if (!day) {
      var W = document.documentElement.clientWidth, H = window.innerHeight, w = el.offsetWidth, h = el.offsetHeight;
      var l = x + w > W - 8 ? Math.max(8, x - w) : x, t = y + h > H - 8 ? Math.max(8, y - h) : y;
      el.style.left = l + 'px'; el.style.top = t + 'px';
      el.style.transformOrigin = (l < x ? 'right' : 'left') + ' ' + (t < y ? 'bottom' : 'top');
    }
    requestAnimationFrame(function () { el.classList.add('mo'); });
    var m = _mo = { el: el, nen: nen, phim: function (e) { if (e.key === 'Escape') { e.stopPropagation(); dong(); } } };
    nen.addEventListener('pointerdown', function (e) { e.preventDefault(); dong(); });
    nen.addEventListener('contextmenu', function (e) { e.preventDefault(); dong(); });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]'); if (!b) return;
      var it = ds[+b.getAttribute('data-i')]; dong();
      try { it.lam(); } catch (x) { console.warn('[menu]', x); }
    });
    document.addEventListener('keydown', m.phim, true);
    window.addEventListener('resize', dong); window.addEventListener('blur', dong);
    var dau = el.querySelector('button'); if (dau && !day) dau.focus({ preventScroll: true });
  };

  // ---------- nguồn mục menu ----------
  var NGUON = [];
  M.them = function (fn) { NGUON.push(fn); };
  var EDIT_SEL = 'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]):not([type=file]), textarea, [contenteditable="true"], [contenteditable=""]';
  // chỗ đã có NHẤN GIỮ riêng (cảm ứng): để nguyên
  var GIU_RIENG = '.cu-bong, .cu-w, .cu-cong, .cu-cxn, .tn-muc, .lop-btn, .bxh-dong, .bd-dong, canvas, [data-giu-rieng], .wsg, .acm, .acm-tv';
  var KHONG_AV = '.nwb, header.top, .thanh-in, #nwbAv, #nutMenu, .td-cho, .td-moi, .tk-moi, .acm, .acm-tv, [data-khong-cn]';
  function laTrangTran() { return /\/tran\.html$/.test(location.pathname); }
  function avCua(t) {
    var av = t.closest && t.closest(AV_SEL);
    if (!av || av.closest(KHONG_AV) || laTrangTran()) return null;
    return av;
  }
  function nhomCua(t) { var n = t.closest && t.closest('[data-nhom-lop]'); return n && !n.closest('.acm, .acm-tv') ? n : null; }
  function mucRieng(t) {   // mục theo CHỖ bấm (không gồm Quay lại / Tải lại)
    var muc = [];
    NGUON.forEach(function (fn) { try { var r = fn({ el: t }); if (r && r.length) muc = muc.concat(r, ['-']); } catch (e) { } });
    var nhom = nhomCua(t);
    if (nhom) muc.push({ chu: 'Xem thành viên lớp', ic: IC.nhom, lam: function () { M.moThanhVien(nhom.getAttribute('data-nhom-lop'), nhom); } }, '-');
    var av = !nhom && avCua(t);
    if (av) {
      var ten = tenCua(av), anh = av.querySelector('img'), uid0 = av.getAttribute('data-uid');
      if (ten) muc.push({ dau: '<span class="acm-av" style="background:' + mau(ten) + '">' + an(tat(ten)) + (anh && anh.getAttribute('src') ? '<img src="' + an(anh.getAttribute('src')) + '" alt="" onerror="this.remove()">' : '') + '</span><div><b>' + an(ten) + '</b><small>' + (uid0 === THAY_UID ? 'Giáo viên' : 'Học sinh') + '</small></div>' });
      muc.push({ chu: 'Xem trang cá nhân', ic: IC.nguoi, lam: function () { moNguoiCua(av); } });
      if (uid0 !== uidToi() || !uid0) muc.push({ chu: 'Nhắn tin riêng', ic: IC.tin, lam: function () { nguoiCua(av).then(function (ng) { M.nhanTin(ng); }, function () { M.sapRaMat(); }); } });
      muc.push('-');
    }
    var a = t.closest && t.closest('a[href]');
    if (a && !av && !nhom) {
      var href = a.getAttribute('href') || '';
      if (href && href.charAt(0) !== '#' && !/^javascript:/i.test(href)) {
        var tuyet = a.href;
        if (!/^(tel|mailto|sms):/i.test(href)) muc.push({ chu: 'Mở trong tab mới', ic: IC.tab, lam: function () { window.open(tuyet, '_blank', 'noopener'); } });
        muc.push({ chu: 'Sao chép link', ic: IC.link, lam: function () { chep(tuyet, 'Đã sao chép link.'); } }, '-');
      }
    }
    return muc;
  }
  function chep(chu, bao) {
    function cu() { var o = document.createElement('textarea'); o.value = chu; o.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(o); o.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) { } o.remove(); return ok; }
    var p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(chu) : Promise.reject();
    p.then(function () { M.bao(bao || 'Đã sao chép.'); }, function () { M.bao(cu() ? (bao || 'Đã sao chép.') : 'Máy chưa cho sao chép — dùng Ctrl+C nhé.'); });
  }
  function mucO(o) {   // ô gõ (chỉ máy tính — màn cảm ứng giữ menu dán của máy)
    var laO = o.tagName === 'INPUT' || o.tagName === 'TEXTAREA';
    var chon = laO ? String(o.value || '').slice(o.selectionStart || 0, o.selectionEnd || 0) : String(getSelection() || '');
    var khoa = laO ? (o.readOnly || o.disabled) : false;
    var muc = [];
    if (chon && !khoa) muc.push({ chu: 'Cắt', ic: IC.cat, lam: function () { o.focus(); try { document.execCommand('cut'); } catch (e) { } } });
    if (chon) muc.push({ chu: 'Sao chép', ic: IC.chep, lam: function () { chep(chon); } });
    if (!khoa && navigator.clipboard && navigator.clipboard.readText) muc.push({ chu: 'Dán', ic: IC.dan, lam: function () {
      navigator.clipboard.readText().then(function (s) {
        o.focus();
        if (!document.execCommand('insertText', false, s) && laO) { var a = o.selectionStart || 0, b = o.selectionEnd || 0; o.value = o.value.slice(0, a) + s + o.value.slice(b); o.selectionStart = o.selectionEnd = a + s.length; o.dispatchEvent(new Event('input', { bubbles: true })); }
      }, function () { o.focus(); M.bao('Máy chưa cho dán từ menu — bấm Ctrl+V nhé.'); });
    } });
    muc.push({ chu: 'Chọn hết', ic: IC.chonHet, lam: function () { o.focus(); if (laO) o.select(); else document.execCommand('selectAll'); } });
    return muc;
  }
  function mucChung() {
    var muc = [];
    if (history.length > 1) muc.push({ chu: 'Quay lại', ic: IC.lui, lam: function () { history.back(); } });
    muc.push({ chu: 'Tải lại trang', ic: IC.taiLai, lam: function () { location.reload(); } });
    return muc;
  }

  // ---------- CHUỘT PHẢI (máy tính) ----------
  var _cham = 0;   // mốc lần chạm cuối — chuột phải do NHẤN GIỮ cảm ứng sinh ra (Android) thì không mở menu thứ hai
  // Bắt ở `window` (pha nổi, sau mọi bộ nghe trên document/phần tử): thành phần nào đã tự xử lý (preventDefault) thì đứng yên.
  window.addEventListener('contextmenu', function (e) {
    var t = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentElement) || document.body;
    var o = t.closest && t.closest(EDIT_SEL);
    var tuCham = e.pointerType === 'touch' || Date.now() - _cham < 1200;
    if (o && (tuCham || laCham())) return;   // ô gõ trên màn cảm ứng: menu dán của máy
    if (e.defaultPrevented) return;
    e.preventDefault();
    if (tuCham) return;   // nhấn giữ cảm ứng: bộ GIỮ bên dưới lo
    var muc = o ? mucO(o) : mucRieng(t);
    var chon = !o && String(getSelection() || '').trim();
    if (chon) muc = [{ chu: 'Sao chép', ic: IC.chep, lam: function () { chep(chon); } }, '-'].concat(muc);
    M.mo(muc.concat(['-'], mucChung()), e.clientX, e.clientY, false);
  });

  // ---------- NHẤN GIỮ (cảm ứng) ----------
  var giu = null, nuotClick = 0;
  function huyGiu() { if (giu) { clearTimeout(giu.hen); giu = null; } }
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch') return;
    _cham = Date.now(); huyGiu();
    var t = e.target;
    if (!t || !t.closest || t.closest(EDIT_SEL) || t.closest(GIU_RIENG)) return;
    var muc = mucRieng(t);
    if (!muc.filter(function (m) { return m !== '-'; }).length) return;   // chỉ chỗ có việc riêng — chữ thường giữ để bôi đen
    var x = e.clientX, y = e.clientY;
    giu = { x: x, y: y, hen: setTimeout(function () {
      giu = null; nuotClick = Date.now();
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (z) { }
      try { getSelection().removeAllRanges(); } catch (z) { }
      M.mo(muc, x, y, true);
    }, 500) };
  }, true);
  document.addEventListener('pointermove', function (e) { if (giu && Math.abs(e.clientX - giu.x) + Math.abs(e.clientY - giu.y) > 10) huyGiu(); }, true);
  ['pointerup', 'pointercancel'].forEach(function (ev) { document.addEventListener(ev, huyGiu, true); });
  window.addEventListener('scroll', huyGiu, true);
  // cú bấm ngay sau khi GIỮ mở menu: không rơi xuống phần tử bên dưới
  document.addEventListener('click', function (e) {
    if (nuotClick && Date.now() - nuotClick < 800 && !(e.target.closest && e.target.closest('.acm'))) { nuotClick = 0; e.preventDefault(); e.stopPropagation(); }
  }, true);

  // ---------- BẤM: avatar ⇒ trang cá nhân · biểu tượng nhóm lớp ⇒ thành viên ----------
  var cho = null;   // dashboard: chờ xem có phải bấm đúp
  document.addEventListener('click', function (e) {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var t = e.target; if (!t || !t.closest) return;
    var nhom = nhomCua(t);
    if (nhom) { e.preventDefault(); e.stopPropagation(); M.moThanhVien(nhom.getAttribute('data-nhom-lop'), nhom); return; }
    var av = avCua(t);
    if (!av) return;
    var bao = av.parentElement && av.parentElement.closest('button, a[href], label, select, [role="button"], [role="menuitem"], [contenteditable="true"]');
    if (bao && !av.contains(bao)) return;   // avatar trong dòng/nút có việc riêng (mở chat, chọn bạn…)
    if (av.getAttribute('data-uid') && av.getAttribute('data-uid') === uidToi() && TRONG_NW && /\/canhan\.html$/.test(location.pathname)) return;
    if (laDash()) {
      // cú thứ 2 trong 470 ms ⇒ bấm đúp, để việc cũ (dashboard tự đo đúp 450 ms và hay VẼ LẠI ô giữa 2 cú ⇒ so theo giờ, không so phần tử)
      if (cho && Date.now() - cho.luc < 470) { clearTimeout(cho.hen); cho = null; return; }
      if (cho) clearTimeout(cho.hen);
      cho = { luc: Date.now(), hen: setTimeout(function () { cho = null; moNguoiCua(av); }, 470) };   // ô có thể đã bị vẽ lại — vẫn đọc được thuộc tính từ phần tử cũ
      return;
    }
    e.preventDefault();
    moNguoiCua(av);
  }, true);

  // ---------- POP-UP THÀNH VIÊN LỚP ----------
  var _tv = null;
  function dongTv() {
    if (!_tv) return;
    var m = _tv; _tv = null;
    m.el.classList.remove('mo');
    setTimeout(function () { if (m.el.parentNode) m.el.parentNode.removeChild(m.el); }, 150);
    if (m.nen.parentNode) m.nen.parentNode.removeChild(m.nen);
    document.removeEventListener('keydown', m.phim, true);
    window.removeEventListener('resize', m.datViTri);
  }
  M.dongThanhVien = dongTv;
  M.moThanhVien = function (key, neo) {
    if (_tv && _tv.key === key && _tv.neo === neo) { dongTv(); return; }
    dong(); dongTv(); napCss();
    var hep = window.innerWidth <= 640;
    var nen = document.createElement('div'); nen.className = 'acm-nen' + (hep ? ' toi' : '');
    var el = document.createElement('div'); el.className = 'acm-tv' + (hep ? ' day' : ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Thành viên lớp');
    el.innerHTML = '<div class="acm-tv-dau">' + IC.nhom.replace('<svg', '<svg style="width:22px;height:22px;stroke:#0E7C6E;fill:none;stroke-width:1.8;flex:none"') +
      '<div><b>Thành viên</b><small>Đang tải…</small></div><button type="button" class="x" aria-label="Đóng">' + IC.dong + '</button></div><div class="acm-tv-ds"><div class="acm-tv-trong">Đang tải…</div></div>';
    document.body.appendChild(nen); document.body.appendChild(el);
    var m = _tv = { el: el, nen: nen, key: key, neo: neo, ds: [] };
    m.datViTri = function () {
      if (hep || !neo || !neo.isConnected) return;
      var r = neo.getBoundingClientRect(), W = document.documentElement.clientWidth, H = window.innerHeight, w = el.offsetWidth, h = el.offsetHeight;
      var l = r.right + 10; if (l + w > W - 8) l = r.left - w - 10; if (l < 8) l = Math.max(8, Math.min(W - w - 8, r.left));
      var t = Math.min(Math.max(8, r.top - 8), H - h - 8);
      if (l === Math.max(8, Math.min(W - w - 8, r.left))) t = Math.min(r.bottom + 8, H - h - 8);   // không đủ chỗ hai bên ⇒ nằm dưới
      el.style.left = l + 'px'; el.style.top = Math.max(8, t) + 'px';
    };
    m.phim = function (e) { if (e.key === 'Escape') { e.stopPropagation(); dongTv(); } };
    nen.addEventListener('pointerdown', function (e) { e.preventDefault(); dongTv(); });
    el.querySelector('.x').onclick = dongTv;
    document.addEventListener('keydown', m.phim, true);
    window.addEventListener('resize', m.datViTri);
    m.datViTri();
    requestAnimationFrame(function () { el.classList.add('mo'); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tv]'); if (!b) return;
      var ng = m.ds[+b.getAttribute('data-tv')]; if (!ng) return;
      if (b.classList.contains('nt')) { dongTv(); M.nhanTin(ng); return; }
      dongTv(); M.moCaNhan(ng.uid);
    });
    M.timLop(key).then(function (l) {
      if (_tv !== m) return;
      if (!l) { el.querySelector('.acm-tv-dau small').textContent = ''; el.querySelector('.acm-tv-ds').innerHTML = '<div class="acm-tv-trong">Không tìm thấy danh sách lớp này.</div>'; return; }
      var toi = uidToi(), ten = String(l.tenGoc || l.maLop);
      var hs = (l.hocSinh || []).filter(function (h) { return !h.thu; }).slice().sort(function (a, b) { return String(a.ten).localeCompare(String(b.ten), 'vi'); });
      m.ds = [{ uid: THAY_UID, ten: 'Thầy Andrew', thay: true, anh: gocDl() + 'assets/avatar-tron.jpg' }].concat(hs.map(function (h) { return { uid: uidHs(h), ten: h.ten, anh: avUrl(l, h.ten) }; }));
      el.querySelector('.acm-tv-dau b').textContent = (l.khoa || /[a-z]{3,}/i.test(khongDau(ten)) ? '' : 'Lớp ') + ten;
      el.querySelector('.acm-tv-dau small').textContent = m.ds.length + ' thành viên';
      el.querySelector('.acm-tv-ds').innerHTML = m.ds.map(function (ng, i) {
        var laToi = ng.uid && ng.uid === toi;
        return '<div class="acm-tv-hang"><button type="button" class="ai" data-tv="' + i + '" title="Trang cá nhân của ' + an(ng.ten) + '">' + avHtml(ng.ten, ng.anh) +
          '<span class="t">' + an(ng.ten) + (laToi ? '<small>(' + (ng.thay ? 'thầy' : 'em') + ')</small>' : '') + '</span>' + (ng.thay ? '<span class="nhan">THẦY</span>' : '') + '</button>' +
          (laToi ? '' : '<button type="button" class="nt" data-tv="' + i + '" title="Nhắn tin riêng" aria-label="Nhắn tin riêng với ' + an(ng.ten) + '">' + IC.tin + '</button>') + '</div>';
      }).join('');
      m.datViTri();
    }, function () { if (_tv === m) el.querySelector('.acm-tv-ds').innerHTML = '<div class="acm-tv-trong">Chưa tải được danh sách lớp. Thử lại nhé.</div>'; });
  };

  // nạp sẵn danh sách lớp lúc trang rảnh ⇒ bấm avatar mở trang cá nhân ngay trong cú bấm (dashboard mở tab mới — trình duyệt chỉ cho
  // mở tab trong vài giây sau cú bấm)
  setTimeout(function () { napDl()['catch'](function () { }); }, 3000);

  // ---------- LỜI MỜI THÁCH ĐẤU bấm từ hộp thông báo ----------
  // t = tài liệu tranDau/{id} (null = không đọc được). Trả về { di: 'giaidau.html?moi=…' | 'tran.html?id=…' } hoặc { bao: '…' }.
  M.loiMoiDau = function (id, t) {
    if (!t) return { bao: 'Không mở được lời mời này (có thể đã bị huỷ).' };
    var tt = t.trangThai;
    if (tt === 'moi' && (t.het || 0) > Date.now()) return { di: 'giaidau.html?moi=' + encodeURIComponent(id), conHieuLuc: true };
    if (tt === 'nhan' || tt === 'choi') return { di: 'tran.html?id=' + encodeURIComponent(id) };
    if (tt === 'xong') return { bao: 'Trận này đã kết thúc.' };
    return { bao: 'Lời mời thách đấu này đã hết hiệu lực.' };
  };
  // Chữ hiện của thông báo thách đấu (cũ ghi "⚔ mời thầy giao hữu — A Show Speed 2 phút" ⇒ dòng phụ gọn: "⚔ Giao hữu · A Show Speed 2 phút")
  M.chuThachDau = function (t, laThay) {
    // máy chủ (tran-dau.js tdTao) ghi: "⚔ mời thầy|em giao hữu — A Show Speed N phút[ · bộ từ]" · "⚔ thách đấu em · giao hữu|<tên giải> — A Show Speed N phút"
    var chu = String((t && t.chu) || '').replace(/^⚔\s*/, '');
    var giao = /^mời (thầy|em) giao hữu/i.test(chu);
    var phu = chu.replace(/^(mời (thầy|em) giao hữu|thách đấu (em|bạn|thầy))\s*/i, '').replace(/^[·—]\s*/, '');
    if (/^giao hữu\s*—/i.test(phu)) { phu = phu.replace(/^giao hữu\s*—\s*/i, ''); giao = true; }
    phu = phu.replace(/\s*—\s*/, ' · ');
    return { loai: 'thách đấu ' + (laThay ? 'thầy' : 'bạn'), phu: phu ? '⚔ ' + (giao ? 'Giao hữu · ' : '') + phu : '' };
  };
})();
