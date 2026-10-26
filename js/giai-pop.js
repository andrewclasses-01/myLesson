/* ============================================================
   js/giai-pop.js — POP-UP CHI TIẾT GIẢI ĐẤU trên DASHBOARD (web v1.380.0, 20/10/2026)
   Mẫu thầy duyệt "ok build" 20/10: D:\OTHERS\CLAUDE\GIAI DAU THE - thiet ke\mau-v10-popup-giai\index.html
   Kế hoạch: cùng thư mục, "KE HOACH - an the + pop-up giai.md".

   Mở:  GiaiPop.mo(<id giải>, <mã lớp>, <lam?>)  — lam: '' | 'ket' (Xếp hạng) | 'sua' (hộp đổi giờ) | 'mo' | 'thuong'
        Gọi từ thẻ neon #cumGiai (js/the-giai.js, chỉ khi người xem là THẦY) và hàng TOURNAMENT trong Kho bài.
   4 tab: XẾP HẠNG (vừa một màn 1080p, không cuộn — hàng tự co, dưới 28px thì chia hai cột bảng) · TRẬN ĐẤU · HOẠT ĐỘNG · THÔNG SỐ GIẢI.
   ⚙ làm THẬT trong pop-up: đổi giờ (mở lại/kéo dài) · đổi sao · mở ngay · đóng sớm · thưởng sao (thầy sửa sao từng em) · huỷ kết quả trận.
   Mọi lượt ghi đi qua js/giai-ghi.js (CHUNG với trang Giải đấu nw/giaidau.html) — không có đường ghi thứ hai.
   Giải tạo từ app myLesson (nguon 'mylesson'): web chỉ đổi giờ/sao/đóng/thưởng (hợp đồng 3 kho) — thông số trận chỉ xem.

   Dữ liệu (kho + phiên của trang qua TheTD.kho()):
     giaiDau/{id} (nghe) · giaiDau/{id}/bang/{lop} (nghe) · nwUsers cacLop∋lop (tên, ảnh, online) ·
     tranDau giai==id && trangThai=='choi' (nghe, đang đấu) · tranDau giai==id (đọc MỘT lần khi mở tab Hoạt động — đếm đủ mọi trận).
   Mọi lớp CSS tiền tố `gpz-` (css/giai-pop.css).
   ============================================================ */
(function () {
  'use strict';
  if (window.GiaiPop) return;
  var H = 36e5, NG = 864e5, ONLINE_MS = 3 * 60e3;
  var $ = function (s, g) { return (g || document).querySelector(s); };
  var an = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var hai = function (n) { return (n < 10 ? '0' : '') + n; };
  var THU = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  var fmt = function (ms) { var d = new Date(ms); return THU[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + ' · ' + hai(d.getHours()) + ':' + hai(d.getMinutes()); };
  var gio = function (ms) { var d = new Date(ms); return hai(d.getHours()) + ':' + hai(d.getMinutes()); };
  var ngay = function (ms) { var d = new Date(ms); return THU[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1); };
  var oNgay = function (ms) { var d = new Date(ms); return d.getFullYear() + '-' + hai(d.getMonth() + 1) + '-' + hai(d.getDate()); };
  var MAU = ['#E0575B', '#3E7BFA', '#18A957', '#8E5CF2', '#E08A1E', '#0E9AA7', '#D6458F', '#5B6EE1'];
  var mauTen = function (t) { var s = 0; t = String(t || ''); for (var i = 0; i < t.length; i++) s += t.charCodeAt(i); return MAU[s % MAU.length]; };
  var vietTat = function (t) { var w = String(t || '?').trim().split(/\s+/); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };
  var av = function (x) { return x.anh ? '<span class="gpz-av" style="background-image:url(\'' + an(x.anh) + '\')"></span>' : '<span class="gpz-av" style="background:' + mauTen(x.ten) + '">' + an(vietTat(x.ten)) + '</span>'; };
  var sv = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; };
  var IC = {
    cup: sv('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/>'),
    xh: sv('<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>'),
    tran: sv('<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>'),
    hd: sv('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
    ts: sv('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'),
    ngoai: sv('<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
    gear: sv('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
    dong: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
    dh: sv('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>'),
    sao: sv('<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'),
    khoa: sv('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    mo: sv('<path d="M6 3l14 9-14 9z"/>')
  };
  var CHE = { one: 'One word', list: 'Word list', free: 'Free words' }, LV = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  var NHAN = { dang: 'ĐANG DIỄN RA', sap: 'SẮP MỞ', cho: 'ĐÃ ĐÓNG · CHƯA THƯỞNG SAO', xong: 'ĐÃ THƯỞNG SAO' };
  var GG = function () { return window.GiaiGhi; };

  function trangThai(g, bay) { bay = bay || Date.now(); if (g.dong || bay >= g.den) return g.daThuong ? 'xong' : 'cho'; if (bay < g.tu) return 'sap'; return 'dang'; }
  // tên lớp đẹp: dashboard gắn GiaiPop.tenLop (A.lopTheoMa(DL, ma).tenGoc); chưa gắn ⇒ mã lớp
  function tenLop(ma) { try { var f = window.GiaiPop && GiaiPop.tenLop; return (f && f(ma)) || ma; } catch (e) { return ma; } }

  /* ---------- trạng thái pop-up (một pop-up một lúc) ---------- */
  var S = null;   // { id, lop, g, bang, roster, dang[], tab, locTran, huy[], tatCa(null|[]), f, toi }
  var EL = null;

  function dung() {
    if (EL) return EL;
    var nen = document.createElement('div'); nen.className = 'gpz-nen';
    var hop = document.createElement('div'); hop.className = 'gpz-hop'; hop.setAttribute('role', 'dialog'); hop.setAttribute('aria-modal', 'true');
    hop.innerHTML = '<div class="gpz-dau"><div class="gpz-trai"><img src="assets/avatar-tron.jpg" alt=""><div><b>Thầy Andrew</b><small>Giáo viên</small></div></div>' +
      '<div class="gpz-giua" data-g="giua"></div>' +
      '<div class="gpz-phai"><div class="gpz-tag" data-g="tag"></div><div class="gpz-nutp"><button type="button" class="gpz-x cd-dt" data-cd title="Cài đặt giải">' + IC.gear + '</button>' +
      '<button type="button" class="gpz-x" data-dong title="Đóng (Esc)">' + IC.dong + '</button></div></div></div>' +
      '<div class="gpz-tabs" data-g="tabs"></div><div class="gpz-than" data-g="than"></div>' +
      '<div class="gpz-menu" data-g="menu"></div><div class="gpz-phu" data-g="phu"><div class="gpz-hn" data-g="hn"></div></div>';
    var toast = document.createElement('div'); toast.className = 'gpz-toast';
    document.body.appendChild(nen); document.body.appendChild(hop); document.body.appendChild(toast);
    EL = { nen: nen, hop: hop, toast: toast, g: function (k) { return hop.querySelector('[data-g="' + k + '"]'); } };
    nen.addEventListener('click', dong);
    hop.addEventListener('click', bam);
    document.addEventListener('keydown', function (e) {
      if (!S || e.key !== 'Escape') return;
      if (EL.g('phu').classList.contains('mo')) return dongPhu();
      if (EL.g('menu').classList.contains('mo')) return EL.g('menu').classList.remove('mo');
      dong();
    });
    window.addEventListener('resize', function () { if (S && S.tab === 'xh') vuaXH(); });
    return EL;
  }
  function baoNho(chu, loi) {
    var t = EL.toast; t.textContent = chu; t.classList.toggle('loi', !!loi); t.classList.add('mo');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('mo'); }, loi ? 4200 : 2600);
  }
  function chuLoi(e) { var m = (e && (e.code || e.message)) || String(e); return /permission/i.test(m) ? 'Kho từ chối (không đủ quyền) — thử tải lại trang.' : 'Lỗi: ' + m; }
  function huyNghe() { if (S) (S.huy || []).forEach(function (f) { try { f(); } catch (e) { } }); }

  /* ---------- MỞ / ĐÓNG ---------- */
  async function mo(id, lop, lam) {
    dung(); huyNghe();
    if (!window.TheTD || !GG()) return;
    S = { id: id, lop: lop, g: null, bang: null, roster: [], dang: [], tab: 'xh', locTran: 'all', huy: [], tatCa: null };
    EL.g('than').innerHTML = '<div class="gpz-trong">Đang đọc giải…</div>'; EL.g('tabs').innerHTML = ''; EL.g('giua').innerHTML = ''; EL.g('tag').innerHTML = '';
    EL.nen.classList.add('mo'); EL.hop.classList.add('mo');
    var s0 = S;
    try {
      S.f = await TheTD.kho(); S.toi = await TheTD.toi();
      if (s0 !== S) return;
      if (window.GioiHan && GioiHan.napCai) GioiHan.napCai().then(function () { if (s0 === S && S.tab === 'hd') ve(); });
      var f = S.f;
      S.huy.push(f.fs.onSnapshot(f.fs.doc(f.db, 'giaiDau', id), function (d) {
        if (s0 !== S) return;
        if (!d.exists()) { EL.g('than').innerHTML = '<div class="gpz-trong">Giải này không còn trong kho.</div>'; return; }
        var cu = S.g; S.g = Object.assign({ id: d.id }, d.data());
        if (!cu) { if (S.g.lops && S.g.lops.length && S.g.lops.indexOf(S.lop) < 0) S.lop = S.g.lops[0]; ngheLop(); napRoster(); }
        ve();
        if (!cu && lam) { var k = { sua: 'gio', mo: 'mo', thuong: 'thuong' }[lam]; if (k) hopCd(k); }
      }, function (e) { EL.g('than').innerHTML = '<div class="gpz-trong">' + an(chuLoi(e)) + '</div>'; }));
      S.huy.push(f.fs.onSnapshot(f.fs.query(f.fs.collection(f.db, 'tranDau'), f.fs.where('giai', '==', id), f.fs.where('trangThai', '==', 'choi'), f.fs.limit(30)), function (q) {
        if (s0 !== S) return;
        var ds = [], b = Date.now(); q.forEach(function (d) { var t = d.data(); if ((t.ketThuc || 0) > b - 15000) ds.push(Object.assign({ id: d.id }, t)); });
        S.dang = ds; ve();
      }, function (e) { console.warn('[pop giải] đang đấu', e); }));
    } catch (e) { EL.g('than').innerHTML = '<div class="gpz-trong">' + an(chuLoi(e)) + '</div>'; }
  }
  // bảng của lớp đang xem (đổi chip lớp ⇒ nghe lớp khác)
  function ngheLop() {
    var s0 = S, f = S.f; if (S._huyBang) { try { S._huyBang(); } catch (e) { } }
    S.bang = null;
    S._huyBang = f.fs.onSnapshot(f.fs.doc(f.db, 'giaiDau', S.id, 'bang', S.lop), function (d) { if (s0 !== S) return; S.bang = d.exists() ? d.data() : { em: {}, tran: [] }; ve(); },
      function (e) { console.warn('[pop giải] bảng', e); });
    S.huy.push(function () { if (s0._huyBang) s0._huyBang(); });
  }
  async function napRoster() {
    var s0 = S, f = S.f, lop = S.lop;
    try {
      var q = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'nwUsers'), f.fs.where('cacLop', 'array-contains', lop), f.fs.limit(80))), ds = [];
      q.forEach(function (d) { var x = d.data(); if (x.vaiTro === 'gv' || x.vaiTro === 'doi' || x.nghiHoc) return; ds.push({ uid: d.id, ten: x.ten || '?', anh: x.anh || '', on: !!(x.hoatDongLuc && Date.now() - x.hoatDongLuc < ONLINE_MS) }); });
      if (s0 !== S || lop !== S.lop) return;
      S.roster = ds; ve();
    } catch (e) { console.warn('[pop giải] danh sách lớp', e); }
  }
  function dong() {
    if (!EL) return;
    huyNghe(); S = null;
    EL.nen.classList.remove('mo'); EL.hop.classList.remove('mo'); EL.g('menu').classList.remove('mo'); dongPhu();
  }

  /* ---------- tính bảng ---------- */
  function phanTich() {
    var em = (S.bang && S.bang.em) || {}, co = {}, rows = [];
    S.roster.forEach(function (n) { co[n.uid] = 1; rows.push({ uid: n.uid, ten: n.ten, anh: n.anh, on: n.on, r: em[n.uid] || null }); });
    Object.keys(em).forEach(function (uid) { if (!co[uid]) rows.push({ uid: uid, ten: em[uid].ten || '?', anh: '', on: false, r: em[uid] }); });
    GG().sapXep(rows);
    var tran = (S.bang && S.bang.tran) || [], theoEm = {};
    tran.forEach(function (m) { [m.a, m.b].forEach(function (u) { (theoEm[u] = theoEm[u] || []).push(m); }); });
    var tong = 0, hang = 0, daDau = 0;
    var dsH = GG().hangCung(rows.filter(function (x) { return GG().soTran(x.r) > 0; })), hangCua = {};
    dsH.forEach(function (x) { hangCua[x.uid] = x.hang; });
    rows.forEach(function (x) {
      x.t = (x.r || {}).t || 0; x.h = (x.r || {}).h || 0; x.b = (x.r || {}).b || 0; x.d = x.t * 2 + x.h; x.tr = x.t + x.h + x.b; tong += x.tr;
      if (x.tr) daDau++;
      x.hg = hangCua[x.uid] || 0;
      x.ds = theoEm[x.uid] || [];
      x.cuoi = x.ds.length ? Math.max.apply(null, x.ds.map(function (m) { return m.luc || 0; })) : 0;
    });
    return { rows: rows, n: rows.length, daDau: daDau, tong: Math.round(tong / 2), top: dsH[0] || null };
  }

  /* ---------- VẼ ---------- */
  function ve() {
    if (!S || !S.g) return;
    var g = S.g, tt = S.tt = trangThai(g), P = S.bang ? phanTich() : null;
    veDau(); veTabs(P);
    var th = EL.g('than'), tab = S.tab;
    th.className = 'gpz-than' + (tab === 'xh' && tt !== 'sap' && P ? ' vua' : '');
    var cuon = th.scrollTop;
    if (!P && tt !== 'sap' && tab !== 'ts') th.innerHTML = '<div class="gpz-trong">Đang đọc bảng điểm…</div>';
    else th.innerHTML = tab === 'xh' ? tabXH(P) : tab === 'tran' ? tabTran(P) : tab === 'hd' ? tabHD(P) : tabTS();
    th.scrollTop = cuon;
    if (tab === 'xh') vuaXH(P);
    if (tab === 'hd' && S.tatCa === null) napTatCa();
    veMenu();
  }
  function veDau() {
    var g = S.g, tt = S.tt, bay = Date.now();
    var pc = tt === 'sap' ? 0 : tt === 'dang' ? Math.max(0, Math.min(1, (bay - g.tu) / Math.max(1, g.den - g.tu))) * 100 : 100;
    var dem;
    if (tt === 'dang' || tt === 'sap') dem = '<div class="gpz-dem"><small>' + (tt === 'dang' ? 'CÒN LẠI' : 'MỞ SAU') + '</small><span data-dem="' + (tt === 'dang' ? g.den : g.tu) + '">' + conGio((tt === 'dang' ? g.den : g.tu) - bay) + '</span></div>';
    else dem = '<div class="gpz-dem"><small>ĐÃ ĐÓNG</small>' + (tt === 'xong' ? 'ĐÃ THƯỞNG' : 'CHỜ THƯỞNG') + '</div>';
    EL.g('giua').innerHTML = '<div class="gpz-han' + (tt === 'cho' || tt === 'xong' ? ' ket' : '') + '"><div class="gpz-moc"><small>MỞ</small><b>' + fmt(g.tu) + '</b></div><div class="gpz-tg"><i style="width:' + pc.toFixed(2) + '%"></i></div>' +
      '<div class="gpz-moc phai"><small>ĐÓNG</small><b>' + fmt(g.den) + '</b></div>' + dem + '</div>';
    var tag = EL.g('tag'); tag.className = 'gpz-tag ' + tt;
    tag.innerHTML = '<span class="gpz-cup">' + IC.cup + '</span><div class="gpz-tag-t"><b title="' + an(g.ten) + '">' + an(g.ten) + '</b><small>' + NHAN[tt] + ' · ' + an(tenLop(S.lop)) + '</small></div>';
  }
  function conGio(ms) { ms = Math.max(0, ms); var h = Math.floor(ms / H), m = Math.floor(ms % H / 6e4), s = Math.floor(ms % 6e4 / 1e3); return hai(h) + ':' + hai(m) + ':' + hai(s); }
  function veTabs(P) {
    var tt = S.tt, t = function (k, ic, ten, so) { return '<button type="button" class="gpz-tab' + (S.tab === k ? ' mo' : '') + '" data-tab="' + k + '" title="' + ten + '">' + ic + '<span class="chu">' + ten + '</span>' + (so != null ? '<span class="so">' + so + '</span>' : '') + '</button>'; };
    var lops = S.g.lops || [];
    EL.g('tabs').innerHTML = t('xh', IC.xh, 'Xếp hạng', P && tt !== 'sap' ? P.daDau + '/' + P.n : null) + t('tran', IC.tran, 'Trận đấu', P && tt !== 'sap' ? P.tong : null) + t('hd', IC.hd, 'Hoạt động') + t('ts', IC.ts, 'Thông số giải') +
      (lops.length > 1 ? '<div class="gpz-chip">' + lops.map(function (l) { return '<button type="button" data-lopc="' + an(l) + '"' + (l === S.lop ? ' class="on"' : '') + '>' + an(tenLop(l)) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="gpz-tphai"><button type="button" class="gpz-web" data-web title="Mở trang Giải đấu đầy đủ ở tab mới">' + IC.ngoai + 'Trang Giải đấu</button><button type="button" class="gpz-cd" data-cd title="Cài đặt giải">' + IC.gear + '</button></div>';
  }
  function oSo(P) {
    var g = S.g, tt = S.tt, sao = (g.sao || []).join(' · ') + ' ⭐';
    var o = function (n, v, cls, chu) { return '<div' + (cls ? ' class="' + cls + '"' : '') + '><small>' + n + '</small><b' + (chu ? ' class="chu"' : '') + '>' + v + '</b></div>'; };
    if (tt === 'sap') return '<div class="gpz-so">' + o('Em trong lớp', P ? P.n : '–') + o('Mỗi trận', g.phut + ' phút', '', 1) + o('Độ khó', LV[g.lv] || g.lv || '–', '', 1) + o('Bộ từ', g.bo ? (g.bo.tu || []).length + ' từ' : '16 chữ', '', 1) + o('Thưởng top 3', sao, 'sao', 1) + o('Mở sau', conGio(g.tu - Date.now()).slice(0, 5) + ' giờ', '', 1) + '</div>';
    return '<div class="gpz-so">' + o('Đã đấu', P.daDau + '<span class="xa">/' + P.n + '</span>') + o('Tổng trận', P.tong) +
      (tt === 'dang' ? o('Đang đấu', S.dang.length) : o('Trận / em', P.daDau ? (P.tong * 2 / P.daDau).toFixed(1) : '0')) +
      o('Top 1', P.top ? an(P.top.ten) : '–', '', 1) + o('Chưa đấu', P.n - P.daDau) + o(tt === 'xong' ? 'Đã thưởng' : 'Thưởng top 3', sao, 'sao', 1) + '</div>';
  }

  /* ----- tab XẾP HẠNG ----- */
  function dongEm(x, gon) {
    var co = x.tr > 0, w = Math.max(1, x.tr), sao = co && x.hg <= 3 && (S.g.sao || [])[x.hg - 1] ? '+' + S.g.sao[x.hg - 1] + ' ⭐' : '';
    return '<tr class="dong' + (co ? '' : ' chua') + '" data-em="' + an(x.uid) + '"><td><span class="gpz-hg' + (co && x.hg <= 3 ? ' h' + x.hg : '') + '">' + (co ? x.hg : '–') + '</span></td>' +
      '<td><div class="gpz-em">' + av(x) + '<b>' + an(x.ten) + '</b>' + (x.on ? '<span class="gpz-on" title="Đang online"></span>' : '') + '</div></td>' +
      '<td class="an-dt">' + x.tr + '</td>' +
      '<td>' + (co ? '<div class="gpz-thb"><i class="t" style="width:' + x.t / w * 100 + '%"></i><i class="h" style="width:' + x.h / w * 100 + '%"></i><i class="b" style="width:' + x.b / w * 100 + '%"></i></div><div class="gpz-thbs">' + x.t + ' · ' + x.h + ' · ' + x.b + '</div>' : '–') + '</td>' +
      (gon ? '' : '<td class="an-dt">' + (co ? Math.round(x.t / x.tr * 100) + '%' : '–') + '</td>') +
      '<td><span class="gpz-diem">' + x.d + '</span></td><td><span class="gpz-sao">' + sao + '</span></td>' +
      (gon ? '' : '<td class="an-dt gpz-nho">' + (x.cuoi ? ngay(x.cuoi) + ' ' + gio(x.cuoi) : '–') + '</td>') + '</tr>';
  }
  function bangXH(ds, gon) {
    return '<table class="gpz-bxh"><thead><tr><th style="width:44px">#</th><th>Học sinh</th><th class="an-dt">Trận</th><th>Thắng · Hòa · Thua</th>' + (gon ? '' : '<th class="an-dt">Tỉ lệ thắng</th>') +
      '<th>Điểm</th><th>' + (S.tt === 'xong' ? 'Đã thưởng' : 'Thưởng') + '</th>' + (gon ? '' : '<th class="an-dt">Trận gần nhất</th>') + '</tr></thead><tbody>' +
      ds.map(function (x) { return dongEm(x, gon); }).join('') + '</tbody></table>';
  }
  function tabXH(P) {
    if (S.tt === 'sap') return oSo(P) + '<div class="gpz-trong">Giải chưa mở — bảng xếp hạng chạy khi giải bắt đầu.</div>';
    S._P = P;
    return '<div class="gpz-xh">' + oSo(P) + '<div class="gpz-bangk" data-g="bangk">' + (P.n ? bangXH(P.rows, false) : '<div class="gpz-trong">Lớp chưa có học sinh nào trên mạng.</div>') + '</div></div>' +
      '<p class="gpz-chan">Bấm một em để xem các trận của em. Xếp hạng: điểm (thắng ×2 + hòa) → số trận thắng → ít trận hơn → tên; em chưa đấu xuống cuối.</p>';
  }
  /* đo khung rồi co chiều cao hàng cho VỪA (máy tính); hàng < 28px thì chia HAI CỘT bảng */
  function vuaXH(P) {
    P = P || S._P; var hop = EL.g('bangk'); if (!hop || !P || !P.n || window.innerWidth <= 640) return;
    hop.classList.remove('hai'); hop.innerHTML = bangXH(P.rows, false);
    var cao = hop.clientHeight - 34, h = Math.floor(cao / P.n);
    if (h < 28) {
      var nua = Math.ceil(P.n / 2); hop.classList.add('hai');
      hop.innerHTML = bangXH(P.rows.slice(0, nua), true) + bangXH(P.rows.slice(nua), true);
      h = Math.floor(cao / nua);
    }
    hop.style.setProperty('--hang', Math.max(24, Math.min(46, h)) + 'px');
  }

  /* ----- tab TRẬN ĐẤU ----- */
  function tabTran(P) {
    if (S.tt === 'sap') return '<div class="gpz-trong">Giải chưa mở — chưa có trận nào.</div>';
    var g = S.g, tran = ((S.bang && S.bang.tran) || []).slice().sort(function (a, b) { return (b.luc || 0) - (a.luc || 0); });
    var roi = tran.filter(function (m) { return m.ly; }), ds = S.locTran === 'roi' ? roi : tran, duocHuy = !g.daThuong;
    var dang = S.dang.filter(function (t) { return !t.lop || t.lop === S.lop; });
    var trai = '<div class="gpz-khoi"><h3>' + (dang.length ? '<span class="gpz-nhay"></span>' : '') + 'Đang đấu<small>' + (S.tt === 'dang' ? dang.length + ' trận' : 'giải đã đóng') + '</small></h3>' +
      (dang.length ? dang.map(function (t) {
        var con = Math.max(0, Math.round(((t.ketThuc || 0) - Date.now()) / 1000));
        return '<div class="gpz-tran"><div class="gio">còn<br>' + Math.floor(con / 60) + ':' + hai(con % 60) + '</div><div class="cap">' + an(t.tenA) + ' <span class="vs">vs</span> ' + an(t.tenB) + '</div>' +
          '<span class="gpz-ty" style="color:#E5484D">' + ((t.diem || {}).a || 0) + '–' + ((t.diem || {}).b || 0) + '</span><button type="button" class="gpz-bn xem" data-xem="' + an(t.id) + '">Theo dõi</button></div>';
      }).join('') : '<div class="gpz-trong">Không có trận nào đang đấu.</div>') + '</div>' +
      '<div class="gpz-khoi"><h3>Cặp đấu nhiều nhất<small>' + tran.length + ' trận gần nhất</small></h3>' + capNhieu(tran) + '</div>';
    var phai = '<div class="gpz-khoi"><h3>Trận gần đây<small>' + tran.length + ' trận gần nhất · tổng ' + P.tong + '</small></h3>' +
      '<div class="gpz-loc"><button type="button" data-loc="all"' + (S.locTran === 'all' ? ' class="on"' : '') + '>Tất cả</button><button type="button" data-loc="roi"' + (S.locTran === 'roi' ? ' class="on"' : '') + '>Có bạn rời / mất kết nối (' + roi.length + ')</button></div>' +
      (ds.length ? ds.map(function (m) {
        var tA = m.kq === 'thang', tB = m.kq === 'thua', ly = m.ly ? (/^roi/.test(m.ly) ? 'có bạn rời trận' : 'có bạn mất kết nối') : '';
        var kt = m.ka && m.kb ? 'không tính điểm' : m.ka || m.kb ? 'không tính điểm cho ' + (m.ka ? m.tenA : m.tenB) : '';
        return '<div class="gpz-tran' + (m.huy ? ' huy' : '') + '"><div class="gio">' + ngay(m.luc) + '<br>' + gio(m.luc) + '</div><div class="cap"><span class="' + (tA ? 'th' : '') + '">' + an(m.tenA) + '</span><span class="vs">vs</span><span class="' + (tB ? 'th' : '') + '">' + an(m.tenB) + '</span>' +
          (m.kq === 'hoa' ? '<span class="vs">· hòa</span>' : '') + (ly || kt ? '<small>' + an([ly, kt].filter(Boolean).join(' · ')) + '</small>' : '') + '</div><span class="gpz-ty">' + (m.da || 0) + '–' + (m.db || 0) + '</span>' +
          (m.huy ? '<span class="gpz-huy-nhan">ĐÃ HUỶ</span>' : duocHuy && m.id ? '<button type="button" class="gpz-bn" data-huy="' + an(m.id) + '">Huỷ kết quả</button>' : '<span></span>') + '</div>';
      }).join('') : '<div class="gpz-trong">' + (S.locTran === 'roi' ? 'Không có trận nào có bạn rời.' : 'Chưa có trận nào.') + '</div>') + '</div>';
    return '<div class="gpz-2c"><div>' + trai + '</div>' + phai + '</div>';
  }
  function capNhieu(tran) {
    var dem = {}; tran.forEach(function (m) { if (m.huy) return; var k = [m.tenA, m.tenB].sort().join(' – '); dem[k] = (dem[k] || 0) + 1; });
    var ds = Object.keys(dem).map(function (k) { return { k: k, n: dem[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5), mx = ds.length ? ds[0].n : 1;
    return ds.length ? '<div class="gpz-cap">' + ds.map(function (x) { return '<div><span>' + an(x.k) + '</span><i style="width:' + x.n / mx * 90 + 'px"></i><small>' + x.n + ' trận</small></div>'; }).join('') + '</div>' : '<div class="gpz-trong">Chưa có trận nào.</div>';
  }

  /* ----- tab HOẠT ĐỘNG (đếm ĐỦ mọi trận: đọc tranDau theo giải MỘT lần khi mở tab) ----- */
  async function napTatCa() {
    var s0 = S; S.tatCa = 'dang';
    try {
      var q = await S.f.fs.getDocs(S.f.fs.query(S.f.fs.collection(S.f.db, 'tranDau'), S.f.fs.where('giai', '==', S.id), S.f.fs.limit(600))), ds = [];
      q.forEach(function (d) { var t = d.data(); if (t.trangThai !== 'choi') ds.push({ lop: t.lop || '', luc: t.xongLuc || t.ketThuc || t.batDau || 0 }); });
      if (s0 !== S) return;
      S.tatCa = ds;
    } catch (e) { console.warn('[pop giải] mọi trận', e); if (s0 === S) S.tatCa = []; }
    if (s0 === S && S.tab === 'hd') ve();
  }
  function tabHD(P) {
    if (S.tt === 'sap') return '<div class="gpz-trong">Giải chưa mở.</div>';
    var g = S.g, du = Array.isArray(S.tatCa) && S.tatCa.length;
    var tr = du ? S.tatCa.filter(function (t) { return !t.lop || t.lop === S.lop; }) : ((S.bang && S.bang.tran) || []).map(function (m) { return { luc: m.luc }; });
    var nd = {}, gh = []; for (var i = 0; i < 24; i++) gh.push(0);
    tr.forEach(function (m) { if (!m.luc) return; var d = new Date(m.luc), k = d.getDate() + '/' + (d.getMonth() + 1); nd[k] = (nd[k] || 0) + 1; gh[d.getHours()]++; });
    var ks = [], t0 = new Date(g.tu); t0.setHours(0, 0, 0, 0);
    var het = Math.min(g.dong ? (g.capNhat || g.den) : g.den, Date.now() + NG);
    for (var t = t0.getTime(); t <= het && ks.length < 21; t += NG) { var d = new Date(t); ks.push({ k: d.getDate() + '/' + (d.getMonth() + 1), th: THU[d.getDay()] }); }
    var mx = Math.max.apply(null, ks.map(function (x) { return nd[x.k] || 0; }).concat([1])), mg = Math.max.apply(null, gh.concat([1]));
    var chua = P.rows.filter(function (x) { return x.tr === 0; }), it = P.rows.filter(function (x) { return x.tr > 0 && x.tr <= 2; });
    var GH = window.GioiHan && GioiHan.cai;
    var nguon = du ? 'đủ ' + tr.length + ' trận' : S.tatCa === 'dang' ? 'đang đếm đủ mọi trận…' : tr.length + ' trận gần nhất';
    return '<div class="gpz-2c" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)"><div>' +
      '<div class="gpz-khoi"><h3>Số trận theo ngày<small>' + nguon + '</small></h3><div class="gpz-cot">' + ks.map(function (x) { var n = nd[x.k] || 0; return '<div><b>' + (n || '') + '</b><i style="height:' + (n / mx * 130) + 'px"></i></div>'; }).join('') + '</div>' +
        '<div class="gpz-cotn">' + ks.map(function (x) { return '<span>' + x.th + ' ' + x.k + '</span>'; }).join('') + '</div></div>' +
      '<div class="gpz-khoi"><h3>Giờ các em hay đấu<small>đậm = nhiều trận · sọc = giờ nghỉ đêm</small></h3><div class="gpz-gio">' + gh.map(function (n, h) {
        var dem = GH && GH.bat ? (GH.nghiTu > GH.nghiDen ? (h >= GH.nghiTu || h < GH.nghiDen) : (h >= GH.nghiTu && h < GH.nghiDen)) : (h >= 23 || h < 6);
        return '<i title="' + h + 'h: ' + n + ' trận" style="background:' + (n ? 'rgba(14,124,110,' + (.18 + .82 * n / mg).toFixed(2) + ')' : dem ? 'repeating-linear-gradient(45deg,#EEF3F2 0 3px,#E2EAE8 3px 6px)' : '#EEF3F2') + '"></i>';
      }).join('') + '</div><div class="gpz-gion">' + gh.map(function (n, h) { return '<span>' + (h % 3 === 0 ? h : '') + '</span>'; }).join('') + '</div></div>' +
      '</div><div>' +
      '<div class="gpz-khoi"><h3>Chưa đấu trận nào<small>' + chua.length + ' em</small></h3>' + (chua.length ? '<div class="gpz-chips">' + chua.map(function (x) { return '<span>' + av(x) + an(x.ten) + '</span>'; }).join('') + '</div>' : '<div class="gpz-trong">Cả lớp đã đấu ít nhất một trận.</div>') + '</div>' +
      '<div class="gpz-khoi"><h3>Mới đấu 1–2 trận<small>' + it.length + ' em</small></h3>' + (it.length ? '<div class="gpz-chips">' + it.map(function (x) { return '<span>' + av(x) + an(x.ten) + ' · ' + x.tr + '</span>'; }).join('') + '</div>' : '<div class="gpz-trong">Không có.</div>') + '</div>' +
      (GH ? '<div class="gpz-khoi"><h3>Giới hạn chơi<small>' + (GH.bat ? 'đang bật' : 'đang tắt') + '</small></h3><div class="gpz-cap">' +
        '<div>Mỗi em tối đa<small>' + GH.tranNgay + ' trận / ngày</small></div><div>Giải tính điểm<small>' + GH.giaiNgay + ' trận đầu / ngày</small></div><div>Cùng một bạn<small>' + GH.capNgay + ' trận / ngày</small></div>' +
        '<div>Nghỉ đêm<small>' + (window.GioiHan ? GioiHan.gioChu(GH.nghiTu) + ' – ' + GioiHan.gioChu(GH.nghiDen) : GH.nghiTu + 'h – ' + GH.nghiDen + 'h') + '</small></div></div></div>' : '') +
      '</div></div>';
  }

  /* ----- tab THÔNG SỐ ----- */
  function tabTS() {
    var g = S.g, b = g.bo, tuApp = g.nguon === 'mylesson', o = function (n, v, k) { return '<div' + (k && tuApp ? ' class="khoa"' : '') + '><small>' + n + '</small><b>' + v + '</b></div>'; };
    var h = '<div class="gpz-ts">' + o('Game', 'A Show Speed <em>· đấu cặp 1–1</em>', 1) + o('Mỗi trận', g.phut + ' phút', 1) +
      (b ? o('Chế độ', (CHE[b.che] || b.che) + (b.che === 'one' ? ' <em>· ' + (b.o || 12) + ' ô</em>' : '') + (b.che === 'free' ? (b.chiBo !== false ? ' <em>· chỉ từ trong bộ</em>' : ' <em>· mọi từ có nghĩa</em>') : ''), 1)
        : o('Độ khó', LV[g.lv] || g.lv, 1)) +
      (b ? o('Gợi ý / giọng đọc', 'Bộ gợi ý ' + an(b.bienTen || 'mặc định') + ' <em>· lật chữ ' + (b.goiY !== false ? 'bật' : 'tắt') + ' · giọng ' + (b.giong ? 'bật' : 'tắt') + '</em>', 1) : o('Bộ chữ', '16 chữ ngẫu nhiên', 1)) +
      o('Lớp', (g.lops || []).map(tenLop).map(an).join(', '), 1) + o('Tính điểm', 'Thắng +2 · Hòa +1 · Thua 0') +
      o('Mở', fmt(g.tu)) + o('Đóng', fmt(g.den) + (g.dong ? ' <em>· đóng sớm</em>' : '')) + o('Thưởng top 3', (g.sao || []).join(' · ') + ' ⭐' + (g.daThuong ? ' <em>· đã thưởng</em>' : '')) +
      (g.assignment ? o('Assignment AWord', an(g.assignment) + ' <em>· Tournament</em>') : '') + o('Tạo từ', tuApp ? 'App myLesson' + (g.buoi && g.buoi.lop ? ' <em>· buổi ' + an(g.buoi.lop) + '</em>' : '') : 'Trang Giải đấu (web)') + '</div>';
    if (b && (b.tu || []).length) h += '<div class="gpz-khoi"><h3>Bộ từ · ' + an(b.ten || '') + '<small>' + b.tu.length + ' từ</small></h3><div class="gpz-tu">' +
      b.tu.map(function (x) { return '<div><b>' + an(x.w) + '</b><span title="' + an(x.m) + '">' + an(x.m) + '</span></div>'; }).join('') + '</div></div>';
    return h;
  }

  /* ---------- menu ⚙ + hộp con ---------- */
  function veMenu() {
    var tt = S.tt, d = function (k, ic, t, s, c) { return '<button type="button" class="' + (c || '') + '" data-cdk="' + k + '">' + ic + '<span>' + t + (s ? '<small>' + s + '</small>' : '') + '</span></button>'; };
    EL.g('menu').innerHTML = (tt === 'sap' ? d('mo', IC.mo, 'Mở giải ngay', 'báo vào nhóm chat lớp') : '') +
      (tt !== 'xong' ? d('gio', IC.dh, tt === 'cho' ? 'Mở lại / kéo dài giờ đóng' : 'Đổi giờ mở / đóng', S.g.nguon === 'mylesson' ? 'giải từ myLesson: web chỉ đổi giờ + sao' : '') : '') +
      (tt !== 'xong' ? d('sao', IC.sao, 'Đổi số sao thưởng', '') : '') +
      (tt === 'cho' ? d('thuong', IC.sao, 'Thưởng sao', 'thầy chọn sao từng em · cộng vào ví', 'vang') : '') +
      (tt === 'dang' ? '<hr>' + d('dong', IC.khoa, 'Đóng giải sớm', 'bảng điểm giữ nguyên', 'do') : '') +
      '<hr>' + d('web', IC.ngoai, 'Mở trang Giải đấu (tab mới)', '');
  }
  function moMenu(nut) {
    var m = EL.g('menu'); if (m.classList.contains('mo')) return m.classList.remove('mo');
    var r = nut.getBoundingClientRect(), rh = EL.hop.getBoundingClientRect();
    m.classList.add('mo');
    m.style.top = (r.bottom - rh.top + 6) + 'px';
    m.style.left = Math.max(8, Math.min(rh.width - m.offsetWidth - 8, r.right - rh.left - m.offsetWidth)) + 'px';
  }
  function hop(html, rong) { var h = EL.g('hn'); h.className = 'gpz-hn' + (rong ? ' rong' : ''); h.innerHTML = html; EL.g('phu').classList.add('mo'); var i = h.querySelector('input:not(:disabled)'); if (i) setTimeout(function () { i.focus(); }, 30); return h; }
  function dongPhu() { if (EL) EL.g('phu').classList.remove('mo'); }
  function urlWeb() { return new URL('nw/giaidau.html?giai=' + encodeURIComponent(S.id) + '&lop=' + encodeURIComponent(S.lop), location.href).href; }
  function oSoNguyen(v, max) { v = String(v).trim(); return /^\d{1,3}$/.test(v) && +v <= max ? +v : NaN; }
  function msTu(n, g) { var a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(n || ''), b = /^(\d{1,2}):(\d{2})/.exec(g || ''); return a && b ? new Date(+a[1], +a[2] - 1, +a[3], +b[1], +b[2]).getTime() : NaN; }
  // nút xác nhận 2 lần ngay trên nút (như trang Giải đấu)
  function haiLan(nut, chu) {
    if (nut.getAttribute('data-xn')) return true;
    nut.setAttribute('data-xn', '1'); var cu = nut.textContent; nut.textContent = chu;
    setTimeout(function () { if (nut.isConnected && !nut.disabled) { nut.removeAttribute('data-xn'); nut.textContent = cu; } }, 4000);
    return false;
  }

  function hopCd(k) {
    EL.g('menu').classList.remove('mo');
    var g = S.g, tt = S.tt, f = S.f;
    if (k === 'web') { try { window.open(urlWeb(), '_blank'); } catch (e) { } return; }
    if (k === 'gio') {
      var daMo = Date.now() >= g.tu;
      var h = hop('<h4>' + IC.dh + (tt === 'cho' ? 'Mở lại / kéo dài giải' : 'Đổi giờ') + '</h4><p>' + (g.nguon === 'mylesson' ? 'Giải tạo từ app myLesson: trên web chỉ đổi được giờ và sao. Phút, bộ từ, lớp đổi ở dòng TOURNAMENT trong app. ' : '') +
        (tt === 'cho' ? 'Đặt giờ đóng mới SAU bây giờ là giải mở lại, bảng điểm giữ nguyên.' : 'Trận đang đấu không bị ảnh hưởng.') + '</p>' +
        '<div class="gpz-nhap"><label>Mở lúc' + (daMo ? ' · đã mở' : '') + '<span class="hai"><input type="date" data-i="tuN" value="' + oNgay(g.tu) + '"' + (daMo ? ' disabled' : '') + '><input type="time" data-i="tuG" value="' + gio(g.tu) + '"' + (daMo ? ' disabled' : '') + '></span></label>' +
        '<label>Đóng lúc<span class="hai"><input type="date" data-i="denN" value="' + oNgay(g.den) + '"><input type="time" data-i="denG" value="' + gio(g.den) + '"></span></label></div>' +
        '<p class="loi" data-i="loi" role="alert"></p><div class="chan"><button type="button" class="gpz-nut" data-phu-dong>Thôi</button><button type="button" class="gpz-nut chinh" data-i="ok">Lưu</button></div>');
      var q = function (n) { return h.querySelector('[data-i="' + n + '"]'); };
      q('ok').onclick = async function () {
        var tu = daMo ? g.tu : msTu(q('tuN').value, q('tuG').value), den = msTu(q('denN').value, q('denG').value), loi = q('loi');
        if (!(tu > 0) || !(den > 0)) return void (loi.textContent = 'Ngày giờ chưa đúng.');
        if (den <= tu) return void (loi.textContent = 'Giờ đóng phải sau giờ mở.');
        if (tt === 'cho' && den <= Date.now()) return void (loi.textContent = 'Muốn mở lại thì giờ đóng phải sau bây giờ.');
        // một lớp không có hai giải trùng khoảng thời gian (luật như form web + app)
        try {
          for (var i = 0; i < (g.lops || []).length; i++) {
            var khac = (await TheTD.giaiCuaLop(f, g.lops[i])).filter(function (x) { return x.id !== g.id && !x.dong && x.tu < den && tu < x.den; })[0];
            if (khac) return void (loi.textContent = 'Lớp ' + tenLop(g.lops[i]) + ' đã có giải "' + khac.ten + '" trùng khoảng thời gian này.');
          }
        } catch (e) { }
        var doi = { den: den }; if (!daMo) doi.tu = tu; if (g.dong && den > Date.now()) doi.dong = false;
        this.disabled = true;
        try { await GG().sua(f, g.id, doi); dongPhu(); baoNho('Đã lưu giờ giải.'); }
        catch (e) { this.disabled = false; loi.textContent = chuLoi(e); }
      };
      return;
    }
    if (k === 'sao') {
      var h2 = hop('<h4>' + IC.sao + 'Sao thưởng top 3</h4><p>Mỗi lớp trong giải: hạng 1, 2, 3 được điền sẵn số sao này khi thầy bấm Thưởng sao (thầy vẫn sửa được từng em).</p>' +
        '<div class="gpz-nhap ba">' + ['Hạng 1', 'Hạng 2', 'Hạng 3'].map(function (t, i) { return '<label>' + t + '<input type="text" inputmode="numeric" data-i="s' + i + '" value="' + ((g.sao || [])[i] || 0) + '"></label>'; }).join('') + '</div>' +
        '<p class="loi" data-i="loi" role="alert"></p><div class="chan"><button type="button" class="gpz-nut" data-phu-dong>Thôi</button><button type="button" class="gpz-nut chinh" data-i="ok">Lưu</button></div>');
      var q2 = function (n) { return h2.querySelector('[data-i="' + n + '"]'); };
      q2('ok').onclick = async function () {
        var s = [0, 1, 2].map(function (i) { return oSoNguyen(q2('s' + i).value, 200); });
        if (s.some(isNaN)) return void (q2('loi').textContent = 'Số sao từ 0 đến 200.');
        this.disabled = true;
        try { await GG().sua(f, g.id, { sao: s }); dongPhu(); baoNho('Đã lưu sao thưởng.'); }
        catch (e) { this.disabled = false; q2('loi').textContent = chuLoi(e); }
      };
      return;
    }
    if (k === 'mo' || k === 'dong') {
      var laMo = k === 'mo';
      var h3 = hop('<h4>' + (laMo ? IC.mo + 'Mở giải ngay?' : IC.khoa + 'Đóng giải sớm?') + '</h4><p>' + (laMo ? 'Giờ mở đổi thành bây giờ; học sinh thấy thẻ đang diễn ra và thách đấu được ngay. Báo vào nhóm chat các lớp.'
        : 'Học sinh không đấu tính điểm giải này được nữa. Bảng xếp hạng được giữ lại. Đóng xong thầy bấm "Thưởng sao".') + '</p>' +
        '<p class="loi" data-i="loi" role="alert"></p><div class="chan"><button type="button" class="gpz-nut" data-phu-dong>Thôi</button><button type="button" class="gpz-nut ' + (laMo ? 'chinh' : 'do') + '" data-i="ok">' + (laMo ? 'Mở ngay' : 'Đóng giải') + '</button></div>');
      h3.querySelector('[data-i="ok"]').onclick = async function () {
        this.disabled = true;
        try {
          if (laMo) {
            await GG().sua(f, g.id, { tu: Date.now() });
            var chu = '🏆 Giải đấu "' + g.ten + '" đã mở! Mỗi trận A Show Speed ' + g.phut + ' phút · ' + (g.bo ? (CHE[g.bo.che] || 'Bộ từ') + ' · ' + (g.bo.ten || '') : (LV[g.lv] || g.lv)) +
              ' · thắng +2, hòa +1. Vào Khám phá → Giải đấu, hoặc bấm ⚔ ngay trong nhóm chat để thách đấu bạn đang online. Giải đóng lúc ' + gio(g.den) + ' ngày ' + new Date(g.den).getDate() + '/' + (new Date(g.den).getMonth() + 1) + '.';
            for (var i = 0; i < (g.lops || []).length; i++) { try { await GG().guiNhom(f, g.lops[i], chu); } catch (e) { console.warn('[pop giải] báo nhóm', e); } }
          } else await GG().sua(f, g.id, { dong: true });
          dongPhu(); baoNho(laMo ? 'Đã mở ' + g.ten + '.' : 'Đã đóng ' + g.ten + '.');
        } catch (e) { this.disabled = false; h3.querySelector('[data-i="loi"]').textContent = chuLoi(e); }
      };
      return;
    }
    if (k === 'thuong') return hopThuong();
  }

  /* THƯỞNG SAO — như trang Giải đấu: mỗi lớp các em ĐÃ ĐẤU theo hạng (cùng điểm+thắng+trận = cùng hạng), điền sẵn top 3, thầy sửa từng em */
  async function hopThuong() {
    var g = S.g, f = S.f, s0 = S;
    var h = hop('<h4>' + IC.sao + 'Thưởng sao · ' + an(g.ten) + '</h4><div class="gpz-trong">Đang tải bảng xếp hạng…</div>', true);
    var lopDs = [], timSo;
    try {
      var goc = (window.MYLESSON_CONFIG && MYLESSON_CONFIG.GOC_DL) || window.AC_GOC_DL || '';
      timSo = await GG().soCuaUid(f, goc);
      for (var i = 0; i < (g.lops || []).length; i++) {
        var d = await f.fs.getDoc(f.fs.doc(f.db, 'giaiDau', g.id, 'bang', g.lops[i])), em = d.exists() ? (d.data().em || {}) : {};
        var ds = Object.keys(em).map(function (uid) { return { uid: uid, ten: em[uid].ten || '?', r: em[uid] }; }).filter(function (x) { return GG().soTran(x.r) > 0; });
        ds.forEach(function (x) { var n = (S.roster || []).filter(function (r) { return r.uid === x.uid; })[0]; if (n) { x.ten = n.ten || x.ten; x.anh = n.anh; } });
        lopDs.push({ lop: g.lops[i], ds: GG().hangCung(GG().sapXep(ds)) });
      }
    } catch (e) { if (s0 === S) h.innerHTML = '<h4>Thưởng sao</h4><p class="loi">' + an(chuLoi(e)) + '</p><div class="chan"><button type="button" class="gpz-nut" data-phu-dong>Đóng</button></div>'; return; }
    if (s0 !== S) return;
    var sao = g.sao || [0, 0, 0];
    h.innerHTML = '<h4>' + IC.sao + 'Thưởng sao · ' + an(g.ten) + '</h4><p>Điền sẵn top 3 mỗi lớp (' + sao.join(' · ') + ' sao). Thầy sửa số sao từng em — để 0 là không thưởng. Thưởng xong, thẻ giải ẩn khỏi dashboard, trang học sinh và app myLesson; giải vào Kho bài.</p>' +
      lopDs.map(function (L) {
        return '<div class="gpz-th-lop"><b>' + an(tenLop(L.lop)) + '</b>' + (L.ds.length ? L.ds.map(function (x) {
          var so = timSo(x.uid), mac = x.hang <= 3 ? (sao[x.hang - 1] || 0) : 0;
          return '<div class="gpz-th" data-lop="' + an(L.lop) + '" data-so="' + an(so) + '" data-hang="' + x.hang + '"><span class="gpz-hg' + (x.hang <= 3 ? ' h' + x.hang : '') + '">' + x.hang + '</span>' + av(x) +
            '<span class="ten"><b>' + an(x.ten) + '</b><small>' + GG().diem(x.r) + ' điểm · ' + (x.r.t || 0) + ' thắng · ' + GG().soTran(x.r) + ' trận' + (so ? '' : ' · ⚠ chưa có số HS') + '</small></span>' +
            '<span class="o"><input type="text" inputmode="numeric" value="' + (so ? mac : 0) + '"' + (so ? '' : ' disabled') + ' aria-label="Sao cho ' + an(x.ten) + '">⭐</span></div>';
        }).join('') : '<p>Lớp chưa có trận nào.</p>') + '</div>';
      }).join('') +
      '<label class="gpz-tich"><input type="checkbox" data-i="bao" checked> Báo kết quả vào nhóm chat các lớp</label>' +
      '<p class="loi" data-i="loi" role="alert"></p><div class="chan"><span class="tong" data-i="tong"></span><button type="button" class="gpz-nut" data-phu-dong>Thôi</button><button type="button" class="gpz-nut vang" data-i="ok">Thưởng sao</button></div>';
    var q = function (n) { return h.querySelector('[data-i="' + n + '"]'); };
    var tong = function () {
      var n = 0, em = 0;
      h.querySelectorAll('.gpz-th input').forEach(function (i) { var v = +i.value || 0; if (v > 0 && !i.disabled) { n += v; em++; } });
      q('tong').textContent = em ? n + ' ⭐ cho ' + em + ' em' : 'Chưa chọn em nào';
      return { n: n, em: em };
    };
    h.querySelectorAll('.gpz-th input').forEach(function (i) {
      i.oninput = function () {
        i.value = i.value.replace(/\D/g, '').slice(0, 3); if (+i.value > 200) i.value = '200'; tong();
        var ok = q('ok'); if (ok.getAttribute('data-xn')) { ok.removeAttribute('data-xn'); ok.textContent = 'Thưởng sao'; q('loi').textContent = ''; }
      };
      i.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } };
    });
    tong();
    q('ok').onclick = async function () {
      var t = tong(); if (!t.em) return void (q('loi').textContent = 'Thầy chưa điền sao cho em nào.');
      var nut = this;
      if (nut.getAttribute('data-xn') !== t.n + '/' + t.em) {
        nut.setAttribute('data-xn', t.n + '/' + t.em); nut.textContent = 'Bấm lần nữa: thưởng ' + t.n + ' ⭐';
        q('loi').textContent = 'Sao vào ví các em ngay, không tự hoàn lại được (muốn bớt thì trừ tay ở hộp Sao trên dashboard).';
        return;
      }
      nut.disabled = true;
      var theoLop = {};
      h.querySelectorAll('.gpz-th').forEach(function (d) {
        var v = +d.querySelector('input').value || 0, so = d.getAttribute('data-so'); if (v <= 0 || !so) return;
        var hg = +d.getAttribute('data-hang'), lop = d.getAttribute('data-lop');
        (theoLop[lop] = theoLop[lop] || []).push({ so: so, n: v, viec: (hg <= 3 ? 'Hạng ' + hg + ' ' : 'Thưởng ') + g.ten + ' · ' + tenLop(lop), app: 'Giải đấu', _ten: d.querySelector('.ten b').textContent, _hang: hg });
      });
      try {
        await GG().thuong(f, g, theoLop);
        if (q('bao').checked) GG().baoKetQua(f, g, theoLop);
        dongPhu(); baoNho('Đã thưởng ' + t.n + ' ⭐ cho ' + t.em + ' em — thẻ giải ẩn, giải vào Kho bài.');
        lamMoiThe();
      } catch (e) { nut.disabled = false; q('loi').textContent = chuLoi(e); }
    };
  }
  function lamMoiThe() {
    try { var c = document.getElementById('cumGiai'); if (c && window.TheGiai && TheGiai.lam) TheGiai.lam(c); } catch (e) { }
    KHO = {}; document.querySelectorAll('[data-gpz-kho]').forEach(function (el) { veKho(el, el.getAttribute('data-gpz-kho'), true); });
  }

  /* pop-up một em: các trận của em (trong các trận gần nhất của lớp) */
  function popEm(uid) {
    var P = S._P || phanTich(), x = P.rows.filter(function (r) { return r.uid === uid; })[0]; if (!x) return;
    var ds = x.ds.slice().sort(function (a, b) { return (b.luc || 0) - (a.luc || 0); }), doi = {};
    ds.forEach(function (m) { if (m.huy) return; var t = m.a === x.uid ? m.tenB : m.tenA; doi[t] = (doi[t] || 0) + 1; });
    var nhieu = Object.keys(doi).sort(function (a, b) { return doi[b] - doi[a]; }).slice(0, 3).map(function (t) { return an(t) + ' (' + doi[t] + ')'; }).join(', ');
    hop('<h4>' + av(x) + an(x.ten) + '</h4><p>' + (x.tr ? 'Hạng ' + (x.hg || '–') + ' · ' + x.d + ' điểm' : 'Chưa đấu trận nào') + (x.on ? ' · đang online' : '') + '</p>' +
      '<div class="gpz-emso"><div><small>TRẬN</small><b>' + x.tr + '</b></div><div><small>THẮNG</small><b>' + x.t + '</b></div><div><small>HÒA</small><b>' + x.h + '</b></div><div><small>THUA</small><b>' + x.b + '</b></div></div>' +
      (nhieu ? '<p>Đấu nhiều nhất với: <b>' + nhieu + '</b></p>' : '') +
      (ds.length ? ds.map(function (m) {
        var laA = m.a === x.uid, k = m.kq === 'hoa' ? 'h' : ((m.kq === 'thang') === laA ? 't' : 'b');
        return '<div class="gpz-tran' + (m.huy ? ' huy' : '') + '"><div class="gio">' + ngay(m.luc) + '<br>' + gio(m.luc) + '</div><div class="cap"><span class="gpz-kq ' + k + '">' + (k === 't' ? 'THẮNG' : k === 'h' ? 'HÒA' : 'THUA') + '</span> ' + an(laA ? m.tenB : m.tenA) +
          (m.ly ? '<small>' + (/^roi/.test(m.ly) ? 'có bạn rời trận' : 'có bạn mất kết nối') + '</small>' : '') + '</div><span class="gpz-ty">' + (laA ? m.da : m.db) + '–' + (laA ? m.db : m.da) + '</span></div>';
      }).join('') : '<div class="gpz-trong">' + (x.tr ? 'Các trận của em không nằm trong ' + ((S.bang && S.bang.tran) || []).length + ' trận gần nhất của lớp.' : 'Em chưa đấu trận nào.') + '</div>') +
      '<div class="chan"><button type="button" class="gpz-nut" data-phu-dong>Đóng</button></div>', true);
  }

  /* ---------- bấm trong hộp ---------- */
  function bam(e) {
    var x, t = e.target;
    if (t.closest('[data-dong]')) return dong();
    if (t.closest('[data-phu-dong]') || t === EL.g('phu')) return dongPhu();
    if (!t.closest('.gpz-menu') && !t.closest('[data-cd]')) EL.g('menu').classList.remove('mo');
    if (!S || !S.g) return;
    if ((x = t.closest('[data-cd]'))) return moMenu(x);
    if ((x = t.closest('[data-cdk]'))) return hopCd(x.getAttribute('data-cdk'));
    if (t.closest('[data-web]')) return hopCd('web');
    if ((x = t.closest('[data-tab]'))) { S.tab = x.getAttribute('data-tab'); EL.g('than').scrollTop = 0; return ve(); }
    if ((x = t.closest('[data-lopc]'))) { var l = x.getAttribute('data-lopc'); if (l !== S.lop) { S.lop = l; S.roster = []; ngheLop(); napRoster(); ve(); } return; }
    if ((x = t.closest('[data-loc]'))) { S.locTran = x.getAttribute('data-loc'); return ve(); }
    if ((x = t.closest('[data-xem]'))) { if (TheTD.moXem) TheTD.moXem(x.getAttribute('data-xem')); return; }
    if ((x = t.closest('[data-huy]'))) {
      if (!haiLan(x, 'Bấm lần nữa để huỷ')) return;
      x.disabled = true;
      GG().huyTran(S.f, S.id, S.lop, x.getAttribute('data-huy')).then(function () { baoNho('Đã huỷ kết quả trận, điểm 2 bạn đã trừ lại.'); })['catch'](function (er) { x.disabled = false; baoNho(chuLoi(er), true); });
      return;
    }
    if ((x = t.closest('[data-em]')) && EL.g('than').contains(x)) return popEm(x.getAttribute('data-em'));
  }

  /* đồng hồ đếm lùi + vạch; đổi trạng thái theo giờ ⇒ vẽ lại */
  setInterval(function () {
    if (!S || !S.g || !EL) return;
    if (trangThai(S.g) !== S.tt) return ve();
    EL.hop.querySelectorAll('[data-dem]').forEach(function (e) { e.textContent = conGio(+e.getAttribute('data-dem') - Date.now()); });
    var i = EL.hop.querySelector('.gpz-tg i'); if (i && S.tt === 'dang') i.style.width = (Math.max(0, Math.min(1, (Date.now() - S.g.tu) / Math.max(1, S.g.den - S.g.tu))) * 100).toFixed(2) + '%';
  }, 1000);

  /* ---------- HÀNG TOURNAMENT TRONG KHO BÀI ----------
     GiaiPop.veKho(<ô>, <mã lớp>) — điền các giải của lớp (mới nhất trên cùng) vào ô; đọc kho tối đa mỗi 2 phút một lần mỗi lớp.
     Bấm hàng ⇒ GiaiPop.mo. Dashboard gọi trong veKho() (kho nhỏ) và danh sách "Tất cả bài" của kho lớn. */
  var KHO = {};
  function nhanKho(g) {
    var tt = trangThai(g);
    return tt === 'xong' ? ['ĐÃ THƯỞNG SAO', 'xanh'] : tt === 'cho' ? ['CHỜ THƯỞNG SAO', 'vang'] : tt === 'dang' ? ['ĐANG DIỄN RA', ''] : ['SẮP MỞ', ''];
  }
  async function veKho(el, lop, ep) {
    if (!el || !lop || !window.TheTD) return;
    el.setAttribute('data-gpz-kho', lop);
    var c = KHO[lop];
    if (!c || ep || Date.now() - c.luc > 2 * 60e3) {
      if (!c || ep) el.innerHTML = '';
      try {
        var f = await TheTD.kho(), ds = await TheTD.giaiCuaLop(f, lop);
        c = KHO[lop] = { luc: Date.now(), ds: ds.sort(function (a, b) { return (b.tu || 0) - (a.tu || 0); }) };
      } catch (e) { console.warn('[kho giải]', e); return; }
    }
    if (!el.isConnected) return;
    el.innerHTML = c.ds.length ? '<div class="gpz-kho-nhom">' + c.ds.map(function (g) {
      var n = nhanKho(g);
      return '<div class="gpz-kho-hang" data-giai-kho="' + an(g.id) + '" data-lop="' + an(lop) + '" role="button" tabindex="0" title="Bấm để xem chi tiết giải">' +
        '<span class="d">TOURNAMENT</span><div class="kt"><b>' + an(g.ten) + '</b><span class="gpz-kho-nhan ' + n[1] + '">' + n[0] + '</span>' +
        '<span>A Show Speed · ' + g.phut + ' phút' + (g.bo ? ' · ' + (g.bo.tu || []).length + ' từ' : '') + ' · ' + ngay(g.tu) + ' → ' + ngay(g.den) + '</span></div></div>';
    }).join('') + '</div>' : '';
  }
  document.addEventListener('click', function (e) {
    var x = e.target.closest && e.target.closest('[data-giai-kho]'); if (!x) return;
    e.stopPropagation(); mo(x.getAttribute('data-giai-kho'), x.getAttribute('data-lop'));
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var x = e.target.closest && e.target.closest('[data-giai-kho]'); if (!x) return;
    e.preventDefault(); mo(x.getAttribute('data-giai-kho'), x.getAttribute('data-lop'));
  });

  // điền mọi ô `<div data-gpz-kho="<mã lớp>">` trong root (dashboard gọi sau mỗi lần vẽ kho nhỏ / kho lớn)
  function dien(root) { (root || document).querySelectorAll('[data-gpz-kho]').forEach(function (el) { veKho(el, el.getAttribute('data-gpz-kho')); }); }

  window.GiaiPop = { mo: mo, dong: dong, veKho: veKho, dien: dien, tenLop: null };
})();
