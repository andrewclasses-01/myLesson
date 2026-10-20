/* ============================================================
   js/thanh-giai.js — THANH GIẢI ĐẤU (web v1.381.0, 20/10/2026)
   Mẫu thầy duyệt "ok build" 20/10: D:\OTHERS\CLAUDE\GIAI DAU THE - thiet ke\mau-v11-thanh-giai\index.html
   Thầy chốt: thanh dưới thanh menu, hết bề ngang, dính khi cuộn · BỎ thẻ neon to đầu cột bài (js/the-giai.js không gắn nữa) ·
   BỎ dải ghim vàng giải trong chat lop/khoa/dashboard (nw/ tin nhắn vẫn giữ — ở đó không có thanh) · dashboard gom giải MỌI lớp.

   TRANG HỌC SINH (lop.html · khoa.html):
     ThanhGiai.gan(<div id="thanhGiai">, { lop: fn → mã lớp gọn, gui: fn(he, chu) → Promise (gửi thẻ ⚔ vào chat lớp), loi: fn(chu) })
       · chọn MỘT giải của lớp: đang diễn ra → sắp mở (≤ 7 ngày) → đã đóng chờ thưởng sao. Đã thưởng ⇒ không hiện gì.
       · thanh 48px: tên · trạng thái · hạng/điểm/trận của em · bạn online · đếm lùi · nút ⚔ THÁCH ĐẤU (hộp ⚔ của chat — TheTD.moChon).
       · bấm thanh ⇒ POP-UP 4 tab: Xếp hạng (đường đua cả lớp) · Thách đấu (mời thẳng từng bạn — TheTD.moiGiai) · Trận của em · Luật & bộ từ.
       · đặt `--cao-dai` trên <html> = chiều cao thanh (lop/khoa ≤1040px trừ đi khi tính chiều cao lưới bài+chat).
   DASHBOARD:
     ThanhGiai.ganThay(<div id="thanhGiaiGv">, { khiDoi: fn }) — chip mỗi (giải, lớp) chưa thưởng; bấm chip ⇒ GiaiPop.mo (js/giai-pop.js);
       chip chờ thưởng có nút THƯỞNG SAO ⇒ GiaiPop.mo(…, 'thuong'). khiDoi() gọi khi danh sách giải đổi (dashboard vẽ lại ô lớp/thẻ đặc biệt).
     ThanhGiai.giaiLop(mã lớp) ⇒ giải đang hiện của lớp đó (hoặc null) — ô lớp 3 trạng thái + cột "Bài còn hạn".
   THẺ ĐẶC BIỆT "chưa có bài · có giải đấu": trang/dashboard vẽ <div data-thg-db="<mã lớp>">…nội dung dự phòng…</div> rồi gọi
     ThanhGiai.dien(root): lớp có giải ⇒ thay bằng thẻ đặc biệt; không ⇒ giữ nội dung dự phòng.
   Kho + phiên: dùng của TheTD (js/the-td.js). Xếp hạng: GiaiGhi.sapXep (js/giai-ghi.js) — em đã đấu trước, em 0 trận xuống cuối.
   Mọi lớp CSS tiền tố `thg-` (css/thanh-giai.css).
   ============================================================ */
(function () {
  'use strict';
  if (window.ThanhGiai) return;
  var H = 36e5, NG = 864e5, ONLINE_MS = 150e3;
  var an = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var hai = function (n) { return (n < 10 ? '0' : '') + n; };
  var THU = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  var ngay = function (ms) { var d = new Date(ms); return THU[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1); };
  var gio = function (ms) { var d = new Date(ms); return hai(d.getHours()) + ':' + hai(d.getMinutes()); };
  var conGio = function (ms) { ms = Math.max(0, ms); return hai(Math.floor(ms / H)) + ':' + hai(Math.floor(ms % H / 6e4)) + ':' + hai(Math.floor(ms % 6e4 / 1e3)); };
  var MAU = ['#E0575B', '#3E7BFA', '#18A957', '#8E5CF2', '#E08A1E', '#0E9AA7', '#D6458F', '#5B6EE1'];
  var mauTen = function (t) { var s = 0; t = String(t || ''); for (var i = 0; i < t.length; i++) s += t.charCodeAt(i); return MAU[s % MAU.length]; };
  var vietTat = function (t) { var w = String(t || '?').trim().split(/\s+/); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };
  var nenAv = function (x) { return x.anh ? "background-image:url('" + an(x.anh) + "')" : 'background:' + mauTen(x.ten); };
  var av = function (x, cls) { return '<span class="thg-av' + (cls ? ' ' + cls : '') + '" style="' + nenAv(x) + '">' + (x.anh ? '' : an(vietTat(x.ten))) + '</span>'; };
  var sv = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; };
  var IC = {
    cup: sv('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/>'),
    kiem: sv('<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>'),
    xuong: sv('<path d="M6 9l6 6 6-6"/>'), dong: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
    may: sv('<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
    xh: sv('<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>'), dh: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
    luat: sv('<path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h5"/>')
  };
  var CHE = { one: 'One word', list: 'Word list', free: 'Free words' }, LV = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  var NHAN = { dang: 'ĐANG DIỄN RA', sap: 'SẮP MỞ', cho: 'ĐÃ ĐÓNG · CHỜ THẦY THƯỞNG SAO' };
  var GG = function () { return window.GiaiGhi; };
  var soTran = function (r) { return r ? (r.t || 0) + (r.h || 0) + (r.b || 0) : 0; };

  function trangThai(g, bay) { bay = bay || Date.now(); if (g.dong || bay >= g.den) return g.daThuong ? 'xong' : 'cho'; if (bay < g.tu) return 'sap'; return 'dang'; }
  /* một lớp ⇒ MỘT giải để hiện: đang (đóng sớm nhất) → sắp (≤ 7 ngày, gần nhất) → chờ thưởng (đóng gần nhất) */
  function chonGiai(ds, bay) {
    bay = bay || Date.now();
    var dang = ds.filter(function (g) { return trangThai(g, bay) === 'dang'; }).sort(function (a, b) { return a.den - b.den; })[0];
    if (dang) return dang;
    var sap = ds.filter(function (g) { return trangThai(g, bay) === 'sap' && g.tu - bay <= 7 * NG; }).sort(function (a, b) { return a.tu - b.tu; })[0];
    if (sap) return sap;
    return ds.filter(function (g) { return trangThai(g, bay) === 'cho'; }).sort(function (a, b) { return b.den - a.den; })[0] || null;
  }
  function cachDau(g) { return g.bo ? (CHE[g.bo.che] || 'Bộ từ') + ' · ' + (g.bo.tu || []).length + ' từ' : (LV[g.lv] || g.lv || 'Easy'); }
  function urlWeb(h) { var u = (/\/nw\//.test(location.pathname) ? '' : 'nw/') + h; try { return new URL(u, location.href).href; } catch (e) { return u; } }

  var TOAST = null;
  function bao(chu) {
    if (!TOAST) { TOAST = document.createElement('div'); TOAST.className = 'thg-toast'; document.body.appendChild(TOAST); }
    TOAST.textContent = chu; TOAST.classList.add('mo'); clearTimeout(TOAST._h); TOAST._h = setTimeout(function () { TOAST.classList.remove('mo'); }, 3200);
  }
  function napFont() {
    if (document.getElementById('tgFont') || document.getElementById('tdFont') || document.getElementById('thgFont')) return;
    var l = document.createElement('link'); l.id = 'thgFont'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,800;1,900&display=swap';
    document.head.appendChild(l);
  }

  /* =================================================================
     TRANG HỌC SINH
     ================================================================= */
  var HS = null;   // { el, opt, lop, g, bang, roster[], dang[], toi, f, huy[], nap, seq, ph }
  function caoDai() { var h = HS && HS.g && HS.el.firstChild ? HS.el.offsetHeight : 0; document.documentElement.style.setProperty('--cao-dai', h + 'px'); }
  function huyNghe(o) { (o.huy || []).forEach(function (f) { try { f(); } catch (e) { } }); o.huy = []; }
  async function napHs() {
    var o = HS, seq = o.seq = (o.seq || 0) + 1, lop = o.opt.lop ? o.opt.lop() : '';
    o.lop = lop; o.nap = Date.now(); huyNghe(o);
    if (!lop || !window.TheTD) { o.g = null; veHs(); return; }
    try {
      o.f = await TheTD.kho(); o.toi = await TheTD.toi();
      if (seq !== o.seq) return;
      var ds = await TheTD.giaiCuaLop(o.f, lop);
      if (seq !== o.seq) return;
      o.g = chonGiai(ds);
      o.bang = null; o.dang = [];
      veHs();
      if (!o.g) return;
      var f = o.f, g = o.g;
      if (trangThai(g) !== 'sap') o.huy.push(f.fs.onSnapshot(f.fs.doc(f.db, 'giaiDau', g.id, 'bang', lop), function (s) { o.bang = s.exists() ? s.data() : { em: {}, tran: [] }; veHs(); }, function (e) { console.warn('[thanh giải] bảng', e); }));
      if (trangThai(g) === 'dang') o.huy.push(f.fs.onSnapshot(f.fs.query(f.fs.collection(f.db, 'tranDau'), f.fs.where('lop', '==', lop), f.fs.where('trangThai', '==', 'choi'), f.fs.limit(20)), function (q) {
        var ds2 = [], b = Date.now(); q.forEach(function (d) { var t = d.data(); if ((t.ketThuc || 0) > b - 15000) ds2.push(Object.assign({ id: d.id }, t)); });
        o.dang = ds2; veHs();
      }, function (e) { console.warn('[thanh giải] đang đấu', e); }));
      napRoster();
      if (!o.toi.laThay && window.GioiHan) { GioiHan.napCai().then(function () { return GioiHan.phieu(o.toi.uid); }).then(function (p) { o.ph = p; if (POP.mo) vePop(); })['catch'](function () { }); }
    } catch (e) { console.warn('[thanh giải]', e); }
  }
  async function napRoster() {
    var o = HS, lop = o.lop, f = o.f;
    try {
      var q = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'nwUsers'), f.fs.where('cacLop', 'array-contains', lop), f.fs.limit(80))), ds = [], b = Date.now();
      q.forEach(function (d) { var x = d.data(); if (x.vaiTro === 'gv' || x.vaiTro === 'doi' || x.nghiHoc) return; ds.push({ uid: d.id, ten: x.ten || '?', anh: x.anh || '', on: !!(x.hoatDongLuc && b - x.hoatDongLuc < ONLINE_MS) }); });
      if (lop !== o.lop) return;
      o.roster = ds; o.rosterLuc = Date.now(); veHs();
    } catch (e) { console.warn('[thanh giải] danh sách lớp', e); }
  }
  // bảng xếp hạng cả lớp (mọi em trong lớp, em chưa đấu xuống cuối)
  function bangHs() {
    var o = HS, em = (o.bang && o.bang.em) || {}, co = {}, rows = [];
    (o.roster || []).forEach(function (n) { co[n.uid] = 1; rows.push({ uid: n.uid, ten: n.ten, anh: n.anh, on: n.on, r: em[n.uid] || null }); });
    Object.keys(em).forEach(function (uid) { if (!co[uid]) rows.push({ uid: uid, ten: em[uid].ten || '?', anh: '', on: false, r: em[uid] }); });
    if (GG()) GG().sapXep(rows);
    var hang = 0;
    rows.forEach(function (x) { x.t = (x.r || {}).t || 0; x.h = (x.r || {}).h || 0; x.b = (x.r || {}).b || 0; x.d = x.t * 2 + x.h; x.tr = x.t + x.h + x.b; x.hg = x.tr ? ++hang : 0; });
    var toi = rows.filter(function (x) { return o.toi && x.uid === o.toi.uid; })[0] || null;
    return { rows: rows, toi: toi, daDau: hang };
  }
  function veHs() {
    var o = HS; if (!o) return;
    var g = o.g, el = o.el;
    if (!g) { if (el._h !== '') { el._h = ''; el.innerHTML = ''; } el.hidden = true; caoDai(); dien(document); return; }
    var tt = o.tt = trangThai(g), P = bangHs(), bay = Date.now(), thay = !!(o.toi && o.toi.laThay);
    var pc = tt === 'sap' ? 0 : tt === 'dang' ? Math.max(0, Math.min(1, (bay - g.tu) / Math.max(1, g.den - g.tu))) * 100 : 100;
    var so;
    if (tt === 'sap') so = '<div><small>MỞ LÚC</small><b>' + ngay(g.tu) + ' ' + gio(g.tu) + '</b></div><div><small>THƯỞNG TOP 3</small><b class="sao">' + an((g.sao || []).join(' · ')) + ' ⭐</b></div>';
    else if (thay || !P.toi) so = '<div><small>ĐÃ ĐẤU</small><b>' + P.daDau + '/' + P.rows.length + '</b></div><div><small>ĐANG ĐẤU</small><b>' + o.dang.length + '</b></div>';
    else so = '<div><small>HẠNG CỦA EM</small><b>' + (P.toi.hg ? '#' + P.toi.hg : '–') + '</b></div><div><small>ĐIỂM</small><b>' + P.toi.d + '</b></div><div><small>TRẬN</small><b>' + P.toi.tr + '</b></div>';
    var on = P.rows.filter(function (x) { return x.on && (!o.toi || x.uid !== o.toi.uid); });
    var phai;
    if (tt === 'dang') phai = (on.length ? '<div class="thg-ban"><div class="thg-avs">' + on.slice(0, 3).map(function (x) { return '<span style="' + nenAv(x) + '">' + (x.anh ? '' : an(vietTat(x.ten))) + '</span>'; }).join('') + '</div>' + on.length + ' bạn online</div>' : '') +
      '<span class="thg-dem' + (on.length ? '' : ' ngoai') + '" data-dem="' + g.den + '" title="Còn lại đến khi đóng giải">' + conGio(g.den - bay) + '</span>' +
      (thay ? '' : '<button type="button" class="thg-td" data-thg="td" title="Thách đấu bạn đang online">' + IC.kiem + '<span>THÁCH ĐẤU</span></button>');
    else if (tt === 'sap') phai = '<span class="thg-dem ngoai" data-dem="' + g.tu + '" title="Còn lại đến khi mở giải">' + conGio(g.tu - bay) + '</span>';
    else phai = '<span class="thg-dem ngoai chu">' + (P.toi && P.toi.hg && !thay ? 'HẠNG CUỐI #' + P.toi.hg : 'CHỜ CÔNG BỐ') + '</span>';
    var h = '<div class="thg ' + tt + '" role="button" tabindex="0" data-thg="mo" aria-label="Giải ' + an(g.ten) + ', ' + NHAN[tt] + '. Bấm để xem chi tiết">' +
      '<span class="thg-vach" style="width:' + pc.toFixed(2) + '%"></span><span class="thg-cup">' + IC.cup + '</span>' +
      '<div class="thg-ten"><b title="' + an(g.ten) + '">' + an(g.ten) + '</b><small>' + NHAN[tt] + '</small></div><div class="thg-so">' + so + '</div>' + phai + '<span class="thg-mo">' + IC.xuong + '</span></div>';
    if (el._h !== h) { el._h = h; el.innerHTML = h; }
    el.hidden = false;
    caoDai(); dien(document);
    if (POP.mo) vePop();
  }
  function bamHs(e) {
    var o = HS; if (!o || !o.g) return;
    var x = e.target.closest('[data-thg]'); if (!x) return;
    if (x.getAttribute('data-thg') === 'td') { e.stopPropagation(); return moHopTd(x); }
    moPop();
  }
  function moHopTd(nut) {
    var o = HS; if (!o || !window.TheTD || !o.opt.gui) return;
    TheTD.moChon(nut, o.lop, o.opt.gui, o.opt.loi || bao);
  }
  function gan(el, opt) {
    if (!el) return;
    napFont();
    HS = { el: el, opt: opt || {}, lop: null, g: null, roster: [], dang: [], huy: [] };
    el.addEventListener('click', bamHs);
    el.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-thg="mo"]') && !e.target.closest('button')) { e.preventDefault(); moPop(); } });
    window.addEventListener('resize', caoDai);
    napHs();
    return HS;
  }

  /* ---------- POP-UP HỌC SINH ---------- */
  var POP = { mo: false, tab: 'xh', nen: null, hop: null };
  function dungPop() {
    if (POP.hop) return;
    POP.nen = document.createElement('div'); POP.nen.className = 'thg-nen';
    POP.hop = document.createElement('div'); POP.hop.className = 'thg-hop'; POP.hop.setAttribute('role', 'dialog'); POP.hop.setAttribute('aria-modal', 'true');
    document.body.appendChild(POP.nen); document.body.appendChild(POP.hop);
    POP.nen.addEventListener('click', dongPop);
    POP.hop.addEventListener('click', bamPop);
    document.addEventListener('keydown', function (e) { if (POP.mo && e.key === 'Escape') dongPop(); });
  }
  function moPop() {
    var o = HS; if (!o || !o.g) return;
    if (o.toi && o.toi.laThay) { try { window.open(urlWeb('giaidau.html?giai=' + encodeURIComponent(o.g.id) + '&lop=' + encodeURIComponent(o.lop)), '_blank'); } catch (e) { } return; }
    dungPop(); POP.mo = true; POP.tab = 'xh'; vePop();
    POP.nen.classList.add('mo'); POP.hop.classList.add('mo');
    if (o.rosterLuc && Date.now() - o.rosterLuc > 60e3) napRoster();
    napLichSu();
  }
  function dongPop() { if (!POP.hop) return; POP.mo = false; POP.nen.classList.remove('mo'); POP.hop.classList.remove('mo'); }
  async function napLichSu() {
    var o = HS; if (!o.toi || !o.toi.uid) return;
    try { var s = await o.f.fs.getDoc(o.f.fs.doc(o.f.db, 'tdLichSu', o.toi.uid)); o.lichSu = s.exists() ? (s.data().ds || []) : []; }
    catch (e) { o.lichSu = []; }
    if (POP.mo && POP.tab === 'tr') vePop();
  }
  function vePop() {
    var o = HS, g = o.g; if (!g || !POP.hop) return;
    var tt = trangThai(g), P = bangHs(), bay = Date.now(), toi = P.toi;
    if (tt === 'xong') { dongPop(); return; }
    var pc = tt === 'sap' ? 0 : tt === 'dang' ? Math.max(0, Math.min(1, (bay - g.tu) / Math.max(1, g.den - g.tu))) * 100 : 100;
    var dem = tt === 'dang' ? '<small>CÒN LẠI</small><b data-dem="' + g.den + '">' + conGio(g.den - bay) + '</b>' : tt === 'sap' ? '<small>MỞ SAU</small><b data-dem="' + g.tu + '">' + conGio(g.tu - bay) + '</b>' : '<small>ĐÃ ĐÓNG</small><b style="font-size:22px">CHỜ THƯỞNG</b>';
    var sao = (g.sao || []).join(' · ');
    var h = '<div class="thg-pd ' + tt + '"><div class="r1"><span class="cup">' + IC.cup + '</span><div style="min-width:0"><h2 title="' + an(g.ten) + '">' + an(g.ten) + '</h2><span class="pill">● ' + NHAN[tt] + '</span></div>' +
      '<div class="demb">' + dem + '</div><button type="button" class="x" data-p="dong" aria-label="Đóng">' + IC.dong + '</button></div>' +
      '<div class="luat"><span>A Show Speed · đấu 1–1</span><span>' + g.phut + ' phút / trận</span><span>' + an(cachDau(g)) + '</span><span>Thắng +2 · Hòa +1</span><span>' + (tt === 'sap' ? 'Mở ' + gio(g.tu) + ' ' + ngay(g.tu) : 'Đóng ' + gio(g.den) + ' ' + ngay(g.den)) + '</span>' +
      (sao ? '<span class="v">Top 3: ' + an(sao) + ' ⭐</span>' : '') + '</div><div class="tb"><i style="width:' + pc.toFixed(2) + '%"></i></div></div>';
    // cột trái: của em
    var trai = '<div class="thg-em"><div class="thg-k"><h4>Của em<small>' + an(toi ? toi.ten : '') + '</small></h4>';
    if (tt === 'sap' || !toi) trai += '<p style="margin:0;font-size:12.5px;color:#5F7370">' + (tt === 'sap' ? 'Giải chưa mở — em luyện tập với máy trước cho quen tay nhé!' : 'Đang đọc bảng điểm…') + '</p>';
    else {
      var top3 = P.rows.filter(function (x) { return x.tr; })[2];
      var cach = toi.hg && toi.hg <= 3 ? 'Em đang trong <b>top 3</b>!' : top3 ? 'Còn <b>' + Math.max(1, top3.d - toi.d + 1) + ' điểm</b> nữa là vào top 3' : 'Đấu thêm để vào top 3 nhé!';
      trai += '<div class="thg-toi"><div class="hg">' + (toi.hg ? '#' + toi.hg + '<small>/' + P.rows.length + '</small>' : '–') + '</div><div class="ds"><b>' + toi.d + ' điểm</b><br>' + toi.t + ' thắng · ' + toi.h + ' hòa · ' + toi.b + ' thua<br>' + cach + '</div></div>';
      if (o.ph && window.GioiHan && GioiHan.cai.bat && tt === 'dang') {
        var con = GioiHan.conTran(o.ph), cg = GioiHan.conGiai(o.ph, g.id);
        trai += '<div class="thg-han"><div><small>HÔM NAY CÒN</small><b>' + con + '/' + GioiHan.cai.tranNgay + '</b> trận</div><div><small>TÍNH ĐIỂM</small><b>' + cg + '/' + GioiHan.cai.giaiNgay + '</b> trận</div></div>';
      }
    }
    trai += '</div>' + (tt === 'dang' ? '<button type="button" class="thg-nutto v" data-p="tab" data-tab="td">' + IC.kiem + 'THÁCH ĐẤU BẠN</button>' : '') +
      '<button type="button" class="thg-nutto x" data-p="luyen">' + IC.may + 'Luyện tập với máy</button>';
    if (tt === 'dang') trai += '<div class="thg-k"><h4>Đang đấu<small>' + o.dang.length + ' trận</small></h4>' + (o.dang.length ? o.dang.map(function (t) {
      return '<div class="thg-tr" style="grid-template-columns:minmax(0,1fr) auto auto;border:0;padding:6px 0"><div>' + an(t.tenA) + ' <span style="color:#8AA09C">vs</span> ' + an(t.tenB) + '</div><span class="ty" style="color:#E5484D">' + ((t.diem || {}).a || 0) + '–' + ((t.diem || {}).b || 0) + '</span>' +
        (toi && (t.a === toi.uid || t.b === toi.uid) ? '<span></span>' : '<button type="button" class="thg-xem" data-p="xem" data-id="' + an(t.id) + '">Xem</button>') + '</div>';
    }).join('') : '<div class="thg-trong">Chưa có trận nào đang đấu.</div>') + '</div>';
    trai += '</div>';
    // cột phải: 4 tab
    var on = P.rows.filter(function (x) { return x.on && (!toi || x.uid !== toi.uid); }).length;
    var tab = function (k, ic, t, so) { return '<button type="button" class="thg-tab' + (POP.tab === k ? ' on' : '') + '" data-p="tab" data-tab="' + k + '">' + ic + '<span class="chu">' + t + '</span>' + (so != null ? '<span class="so">' + so + '</span>' : '') + '</button>'; };
    var phai = '<div class="thg-ph"><div class="thg-tabs">' + tab('xh', IC.xh, 'Xếp hạng', P.rows.length) + (tt === 'dang' ? tab('td', IC.kiem, 'Thách đấu', on + ' online') : '') +
      tab('tr', IC.dh, 'Trận của em', null) + tab('luat', IC.luat, 'Luật & bộ từ', null) + '</div><div class="thg-ruot">' + ruot(P, tt) + '</div></div>';
    var cuon = POP.hop.querySelector('.thg-ruot'), y = cuon ? cuon.scrollTop : 0;
    POP.hop.innerHTML = h + '<div class="thg-pt">' + trai + phai + '</div>';
    var c2 = POP.hop.querySelector('.thg-ruot'); if (c2) c2.scrollTop = y;
    if (POP.tab === 'xh') datDua(POP.hop);
  }
  function ruot(P, tt) {
    var o = HS, g = o.g, toi = P.toi;
    if (POP.tab === 'td' && tt !== 'dang') POP.tab = 'xh';
    if (POP.tab === 'xh') {
      if (tt === 'sap') return '<div class="thg-trong">Giải chưa mở — bảng xếp hạng chạy khi giải bắt đầu.</div>';
      if (!P.rows.length) return '<div class="thg-trong">Đang đọc bảng xếp hạng…</div>';
      var dua = '<div class="thg-dua"><div class="duong"></div>' + P.rows.map(function (x, i) {
        return '<div class="run' + (x.tr && x.hg === 1 ? ' l1' : '') + (toi && x.uid === toi.uid ? ' em' : '') + '" data-d="' + x.d + '" title="' + an(x.ten) + ' · ' + x.d + ' điểm"><span style="' + nenAv(x) + '">' + (x.anh ? '' : an(vietTat(x.ten))) + '</span></div>';
      }).join('') + '</div>';
      return dua + P.rows.map(function (x) {
        var co = x.tr > 0, s = co && x.hg <= 3 && (g.sao || [])[x.hg - 1] ? '+' + g.sao[x.hg - 1] + ' ⭐' : '';
        return '<div class="thg-dg' + (toi && x.uid === toi.uid ? ' toi' : '') + (co ? '' : ' chua') + '"><span class="h' + (co && x.hg <= 3 ? ' h' + x.hg : '') + '">' + (co ? x.hg : '–') + '</span>' + av(x, x.on ? 'on' : '') +
          '<b>' + an(x.ten) + (toi && x.uid === toi.uid ? ' (em)' : '') + '</b><span class="thb">' + (co ? x.t + ' thắng · ' + x.h + ' hòa · ' + x.b + ' thua' : 'chưa đấu') + '</span><span class="d">' + x.d + '</span><span class="s">' + s + '</span></div>';
      }).join('');
    }
    if (POP.tab === 'td') {
      var dangDau = {}; o.dang.forEach(function (t) { dangDau[t.a] = 1; dangDau[t.b] = 1; });
      var ds = P.rows.filter(function (x) { return !toi || x.uid !== toi.uid; }).sort(function (a, b) { return (b.on && !dangDau[b.uid]) - (a.on && !dangDau[a.uid]) || b.on - a.on || String(a.ten).localeCompare(String(b.ten), 'vi'); });
      return '<div class="thg-ban2">' + ds.map(function (x) {
        var dd = !!dangDau[x.uid], duoc = x.on && !dd;
        return '<div class="b' + (x.on ? '' : ' vang') + '">' + av(x, x.on ? 'on' : '') + '<div><b>' + an(x.ten) + '</b><small>' + (dd ? '⚔ Đang đấu' : x.on ? 'Đang online' + (x.hg ? ' · hạng #' + x.hg : '') : 'Chưa online') + '</small></div>' +
          '<button type="button" data-p="moi" data-uid="' + an(x.uid) + '"' + (duoc ? '' : ' disabled') + '>' + IC.kiem + 'Thách đấu</button></div>';
      }).join('') + '</div>';
    }
    if (POP.tab === 'tr') {
      if (!o.lichSu) return '<div class="thg-trong">Đang đọc trận của em…</div>';
      var cua = o.lichSu.filter(function (m) { return m.giai === g.id; });
      if (!cua.length) return '<div class="thg-trong">Em chưa có trận nào trong giải này.</div>';
      return cua.map(function (m) {
        var k = m.kq === 'thang' ? 't' : m.kq === 'thua' ? 'b' : 'h';
        return '<div class="thg-tr"><div class="g">' + ngay(m.luc) + '<br>' + gio(m.luc) + '</div><div><span class="thg-kq ' + k + '">' + (k === 't' ? 'THẮNG' : k === 'h' ? 'HÒA' : 'THUA') + '</span> gặp <b>' + an(m.vsTen || '?') + '</b>' +
          (m.ly || m.kt ? '<small>' + [m.ly ? (/^roi/.test(m.ly) ? 'có bạn rời trận' : 'có bạn mất kết nối') : '', m.kt ? 'không tính điểm (đã đủ trận hôm nay)' : ''].filter(Boolean).join(' · ') + '</small>' : '') + '</div>' +
          '<span class="ty">' + (m.toi || 0) + '–' + (m.ban || 0) + '</span><span class="thg-kq ' + k + '">' + (m.kt ? '—' : '+' + ({ t: 2, h: 1, b: 0 }[k])) + '</span></div>';
      }).join('');
    }
    var GH = window.GioiHan && GioiHan.cai, b = g.bo;
    return '<ul class="thg-luat"><li>Mỗi trận A Show Speed ' + g.phut + ' phút' + (b ? ', ' + (CHE[b.che] || '') + (b.che === 'free' && b.chiBo !== false ? ' — chỉ tính từ trong bộ' : '') : ', độ khó ' + (LV[g.lv] || g.lv)) + '.</li>' +
      '<li>Thắng +2 · Hòa +1 · Thua 0. Bằng điểm thì ai thắng nhiều hơn, rồi ai ít trận hơn đứng trên.</li>' +
      (GH && GH.bat ? '<li>Mỗi ngày tối đa ' + GH.tranNgay + ' trận; giải chỉ tính ' + GH.giaiNgay + ' trận đầu; cùng một bạn tối đa ' + GH.capNgay + ' trận tính điểm. Nghỉ đêm ' + GH.nghiTu + 'h – ' + GH.nghiDen + 'h.</li>' : '') +
      ((g.sao || []).some(function (x) { return x > 0; }) ? '<li>Đóng giải xong, thầy thưởng top 3: ' + an((g.sao || []).join(' · ')) + ' ⭐.</li>' : '') + '</ul>' +
      (b && (b.tu || []).length ? '<h4 style="margin:0 0 8px">Bộ từ · ' + an(b.ten || '') + '</h4><div class="thg-tu">' + b.tu.map(function (x) { return '<div title="' + an(x.m) + '"><b>' + an(x.w) + '</b>' + (b.giong ? '' : an(x.m)) + '</div>'; }).join('') + '</div>' : '');
  }
  /* chấm trên đường đua: ba làn không chồng nhau (cùng thuật toán thẻ neon v1.371.0) */
  function datDua(root) {
    var box = root.querySelector('.thg-dua'); if (!box) return;
    var W = box.clientWidth, els = box.querySelectorAll('.run'); if (!W || !els.length) return;
    var mx = 1; els.forEach(function (e) { mx = Math.max(mx, +e.getAttribute('data-d') || 0); });
    var gap = 19, lanes = [-99, -99, -99], Y = [0, -21, 21], Hh = box.clientHeight / 2;
    for (var i = els.length - 1; i >= 0; i--) {
      var d = +els[i].getAttribute('data-d'), px = 22 + (W - 50) * d / mx, lane = 0, best = 1e9, l;
      if (i > 0) { for (l = 0; l < 3; l++) { if (lanes[l] < best) { best = lanes[l]; lane = l; } } }
      px = Math.min(Math.max(px, lanes[lane] + gap), W - 16); lanes[lane] = px;
      els[i].style.left = px + 'px'; els[i].style.top = (Hh + Y[lane]) + 'px';
    }
  }
  function bamPop(e) {
    var x = e.target.closest('[data-p]'); if (!x) return;
    var k = x.getAttribute('data-p'), o = HS;
    if (k === 'dong') return dongPop();
    if (k === 'tab') { POP.tab = x.getAttribute('data-tab'); if (POP.tab === 'td' && o.rosterLuc && Date.now() - o.rosterLuc > 30e3) napRoster(); return vePop(); }
    if (k === 'xem') { if (TheTD.moXem) TheTD.moXem(x.getAttribute('data-id')); return; }
    if (k === 'luyen') {
      if (window.GioiHan && GioiHan.dem && GioiHan.dem()) return GioiHan.hopNgu();
      location.href = urlWeb('tran.html?luyen=1&may=2&phut=' + (o.g.phut || 2) + '&bo=g&giai=' + encodeURIComponent(o.g.id) + '&lop=' + encodeURIComponent(o.lop));
      return;
    }
    if (k === 'moi') {
      var P = bangHs(), ban = P.rows.filter(function (r) { return r.uid === x.getAttribute('data-uid'); })[0]; if (!ban || !o.opt.gui) return;
      x.disabled = true;
      dongPop();
      TheTD.moiGiai({ uid: ban.uid, ten: ban.ten }, o.lop, o.g, o.opt.gui, o.opt.loi || bao);
    }
  }

  /* =================================================================
     DASHBOARD — chip giải mọi lớp
     ================================================================= */
  var GV = null;   // { el, opt, ds[], bang{}, huy[] }
  var THEO_LOP = {};
  function ganThay(el, opt) {
    if (!el || !window.TheTD) return;
    napFont();
    GV = { el: el, opt: opt || {}, ds: [], bang: {}, huy: [] };
    el.addEventListener('click', function (e) {
      var c = e.target.closest('[data-chip]'); if (!c || !window.GiaiPop) return;
      var lam = e.target.closest('[data-lam]') ? e.target.closest('[data-lam]').getAttribute('data-lam') : '';
      GiaiPop.mo(c.getAttribute('data-chip'), c.getAttribute('data-lop'), lam);
    });
    (async function () {
      try {
        var f = await TheTD.kho();
        GV.f = f;
        GV.huy.push(f.fs.onSnapshot(f.fs.query(f.fs.collection(f.db, 'giaiDau'), f.fs.orderBy('tu', 'desc'), f.fs.limit(60)), function (q) {
          var ds = []; q.forEach(function (d) { ds.push(Object.assign({ id: d.id }, d.data())); });
          GV.ds = ds; tinhLop(); veGv(); demDaDau();
          if (GV.opt.khiDoi) { try { GV.opt.khiDoi(); } catch (e) { console.warn(e); } }
        }, function (e) { console.warn('[thanh giải thầy]', e); }));
      } catch (e) { console.warn('[thanh giải thầy]', e); }
    })();
  }
  function tinhLop() {
    var theoLop = {}, bay = Date.now();
    GV.ds.forEach(function (g) { (g.lops || []).forEach(function (l) { (theoLop[l] = theoLop[l] || []).push(g); }); });
    THEO_LOP = {};
    Object.keys(theoLop).forEach(function (l) { var g = chonGiai(theoLop[l], bay); if (g) THEO_LOP[l] = g; });
  }
  // số em đã đấu của chip đang/chờ (đọc bảng MỘT lần mỗi 5 phút)
  async function demDaDau() {
    var f = GV.f, can = [];
    Object.keys(THEO_LOP).forEach(function (l) { var g = THEO_LOP[l]; if (trangThai(g) !== 'sap') can.push([g, l]); });
    for (var i = 0; i < can.length; i++) {
      var k = can[i][0].id + '/' + can[i][1], c = GV.bang[k];
      if (c && Date.now() - c.luc < 5 * 60e3) continue;
      try { var s = await f.fs.getDoc(f.fs.doc(f.db, 'giaiDau', can[i][0].id, 'bang', can[i][1])), em = s.exists() ? (s.data().em || {}) : {}; GV.bang[k] = { luc: Date.now(), n: Object.keys(em).filter(function (u) { return soTran(em[u]) > 0; }).length }; }
      catch (e) { GV.bang[k] = { luc: Date.now(), n: null }; }
    }
    veGv();
  }
  function veGv() {
    var el = GV.el, bay = Date.now(), lops = Object.keys(THEO_LOP);
    var TT = { dang: 0, cho: 1, sap: 2 };
    lops.sort(function (a, b) { var ga = THEO_LOP[a], gb = THEO_LOP[b]; return TT[trangThai(ga)] - TT[trangThai(gb)] || a.localeCompare(b); });
    if (!lops.length) { if (el._h !== '') { el._h = ''; el.innerHTML = ''; } el.hidden = true; return; }
    var ten = function (l) { try { return (GV.opt.tenLop && GV.opt.tenLop(l)) || l; } catch (e) { return l; } };
    var h = '<div class="thg nhieu dang"><span class="thg-nhan">' + IC.cup + '<span>GIẢI ĐẤU</span></span><div class="thg-chips">' + lops.map(function (l) {
      var g = THEO_LOP[l], tt = trangThai(g, bay), c = GV.bang[g.id + '/' + l];
      var em = tt === 'dang' ? '<em data-dem="' + g.den + '">' + conGio(g.den - bay) + '</em>' : tt === 'sap' ? '<em>mở ' + ngay(g.tu) + ' ' + gio(g.tu) + '</em>' : '';
      var phu = tt === 'sap' ? 'sắp mở' : (c && c.n != null ? c.n + ' em đã đấu' : '') + (tt === 'cho' ? (c && c.n != null ? ' · ' : '') + 'đã đóng' : '');
      return '<div class="thg-chip ' + tt + '" role="button" tabindex="0" data-chip="' + an(g.id) + '" data-lop="' + an(l) + '" title="' + an(g.ten) + ' · lớp ' + an(ten(l)) + ' — bấm để xem chi tiết">' +
        '<span class="lp">' + an(ten(l)) + '</span><b>' + an(g.ten) + '</b>' + em + (phu ? '<span class="phu">' + phu + '</span>' : '') +
        (tt === 'cho' ? '<button type="button" class="bt" data-lam="thuong">THƯỞNG SAO</button>' : '') + '</div>';
    }).join('') + '</div></div>';
    if (el._h !== h) { el._h = h; el.innerHTML = h; }
    el.hidden = false;
  }
  function giaiLop(lop) {
    if (GV) return THEO_LOP[lop] || null;
    if (HS && HS.lop === lop) return HS.g || null;
    return null;
  }

  /* =================================================================
     THẺ ĐẶC BIỆT "chưa có bài · có giải"
     ================================================================= */
  function theDb(g, lop) {
    var tt = trangThai(g), thay = !!GV || !!(HS && HS.toi && HS.toi.laThay), bay = Date.now();
    var con = g.den - bay, chuCon = Math.floor(con / NG) ? Math.floor(con / NG) + ' ngày ' + Math.floor(con % NG / H) + ' giờ' : Math.floor(con / H) + ' giờ ' + Math.floor(con % H / 6e4) + ' phút';
    var p = tt === 'dang' ? 'Giải đang diễn ra, còn ' + chuCon + '. ' + (thay ? 'Bấm để xem bảng xếp hạng, trận đấu, thưởng sao.' : 'Thách đấu bạn cùng lớp để leo hạng' + ((g.sao || []).some(function (x) { return x > 0; }) ? ' — top 3 nhận ' + an((g.sao || []).join(' · ')) + ' ⭐' : '') + '.')
      : tt === 'sap' ? 'Giải mở lúc ' + gio(g.tu) + ' ' + ngay(g.tu) + '.' + (thay ? '' : ' Luyện tập với máy trước cho quen tay nhé!')
      : 'Giải đã đóng — ' + (thay ? 'chờ thầy thưởng sao.' : 'chờ thầy công bố và thưởng sao.');
    var nut = thay ? '<button type="button" class="nut v" data-thg-db-mo>' + IC.cup + 'Xem giải</button>'
      : (tt === 'dang' ? '<button type="button" class="nut v" data-thg-db-td>' + IC.kiem + 'Thách đấu</button>' : '') + '<button type="button" class="nut x" data-thg-db-mo>' + IC.cup + 'Xem giải</button>';
    return '<div class="thg-db ' + tt + '" role="button" tabindex="0" data-thg-db-mo data-giai="' + an(g.id) + '" data-lop="' + an(lop) + '"><svg class="cupl" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/></svg>' +
      '<div class="k">' + (thay ? 'LỚP CHƯA CÓ BÀI MỚI · ĐANG CÓ GIẢI ĐẤU' : 'CHƯA CÓ BÀI MỚI · NHƯNG CÓ GIẢI ĐẤU NÈ!') + '</div><h3>' + an(g.ten) + '</h3><p>' + p + '</p><div class="hang">' + nut + '</div></div>';
  }
  function dien(root) {
    (root || document).querySelectorAll('[data-thg-db]').forEach(function (el) {
      var lop = el.getAttribute('data-thg-db'), g = giaiLop(lop);
      if (el._goc == null) el._goc = el.innerHTML;
      var h = g ? theDb(g, lop) : el._goc;
      if (el._h !== h) { el._h = h; el.innerHTML = h; }
    });
  }
  document.addEventListener('click', function (e) {
    var td = e.target.closest && e.target.closest('[data-thg-db-td]');
    if (td) { e.stopPropagation(); return moHopTd(td); }
    var x = e.target.closest && e.target.closest('[data-thg-db-mo]'); if (!x) return;
    var the = x.closest('.thg-db'); if (!the) return;
    e.stopPropagation();
    if (GV && window.GiaiPop) return GiaiPop.mo(the.getAttribute('data-giai'), the.getAttribute('data-lop'));
    moPop();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var the = e.target.classList && e.target.classList.contains('thg-db') ? e.target : null; if (!the) return;
    e.preventDefault(); the.click();
  });

  /* mỗi giây: đếm lùi; đổi trạng thái theo giờ ⇒ vẽ lại; 5 phút ⇒ nạp lại */
  setInterval(function () {
    var bay = Date.now();
    document.querySelectorAll('.thg [data-dem], .thg-hop [data-dem]').forEach(function (e) { e.textContent = conGio(+e.getAttribute('data-dem') - bay); });
    if (HS && HS.el.isConnected) {
      var lop = HS.opt.lop ? HS.opt.lop() : '';
      if (lop !== HS.lop || (HS.g && trangThai(HS.g, bay) !== HS.tt) || (bay - HS.nap > 5 * 60e3 && !document.hidden)) napHs();
      else if (HS.g && HS.tt === 'dang') { var v = HS.el.querySelector('.thg-vach'); if (v) v.style.width = (Math.max(0, Math.min(1, (bay - HS.g.tu) / Math.max(1, HS.g.den - HS.g.tu))) * 100).toFixed(2) + '%'; }
    }
    if (GV && bay % 60e3 < 1000) { tinhLop(); veGv(); demDaDau(); if (GV.opt.khiDoi) { try { GV.opt.khiDoi(); } catch (e) { } } }
  }, 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && HS && HS.el.isConnected && Date.now() - HS.nap > 30e3) napHs(); });

  window.ThanhGiai = { gan: gan, ganThay: ganThay, giaiLop: giaiLop, dien: dien, trangThai: trangThai };
})();
