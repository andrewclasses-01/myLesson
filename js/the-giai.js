/* ============================================================
   js/the-giai.js — THẺ GIẢI ĐẤU "ĐẤU TRƯỜNG NEON" (web v1.371.0, 17/10/2026, Đợt 4 của "giải đấu tạo từ myLesson")
   Mẫu thầy chốt: D:\OTHERS\CLAUDE\GIAI DAU THE - thiet ke\mau-v8-the-neon\index.html · hợp đồng dữ liệu: HOP DONG DU LIEU - 3 kho.md

   Dùng chung lop.html · khoa.html · dashboard.html. Mỗi trang có ô cố định `#cumGiai` NẰM NGOÀI `#cotBai` và gọi:
       TheGiai.gan(document.getElementById('cumGiai'), { lop: function () { return <mã lớp gọn, vd 'A1A'>; } });
   Đổi lớp (dashboard) không cần gọi lại: mỗi giây thẻ so lại lop() và tự nạp lớp mới.

   Dữ liệu (cùng nguồn với DẢI GHIM vàng trong chat — js/the-td.js, số liệu hai nơi khớp, dải ghim KHÔNG đổi hành vi):
     · giaiDau where lops array-contains <lớp>  (TheTD.giaiCuaLop): đang · sắp (gần nhất) · đã đóng chưa thưởng sao ·
       thưởng sao xong thì còn 3 ngày (tính từ capNhat) rồi ẩn
     · giaiDau/{id}/bang/{lớp}.em[uid web] = {ten?, t, h, b} — điểm = thắng×2 + hòa (game aShowSpeed, hàm GAME.diem)
     · nwUsers where cacLop array-contains <lớp> — mọi em trong lớp có chấm trên đường đua, kể cả em 0 điểm
     · tranDau where lop==<lớp> && trangThai=='choi' — số trận đang đấu (như dải ghim)
   Bảng GAME = { aShowSpeed: {...} } để game khác sau này có bìa/thẻ/điểm riêng — chọn theo giaiDau.game.
   Thẻ KHÔNG mang class `.the`; mọi lớp CSS tiền tố `tg-` (css/the-giai.css).
   Bấm thẻ ⇒ nw/giaidau.html?giai=&lop= (em: cùng tab · thầy: tab mới, dashboard giữ chỗ). Thầy có thêm 2 nút icon
   (bảng kết quả · sửa | mở ngay | thưởng sao vàng) ⇒ cùng trang kèm &lam=sua|mo|thuong (trang Giải đấu tự bấm sẵn nút đó).
   Bàn thử (chỉ localhost): ?thu=1 (em) | ?thu=thay (thầy) + &tt=sap|dang|xong|thuong (trạng thái mẫu).
   ============================================================ */
(function () {
  'use strict';
  if (window.TheGiai) return;
  var H = 36e5, D = 864e5;
  var an = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var hai = function (n) { return (n < 10 ? '0' : '') + n; };
  var svg = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; };
  var IC = {
    cup: svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/>'),
    ket: svg('<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>'),
    sua: svg('<path d="M21.2 6.8a2.8 2.8 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8L2 21.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5z"/>'),
    sao: svg('<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'),
    mo: svg('<path d="M6 3l14 9-14 9z"/>')
  };
  var TT = { dang: 'ĐANG DIỄN RA', sap: 'SẮP MỞ', xong: 'ĐÃ ĐÓNG' };
  var MAU = ['#E0575B', '#3E7BFA', '#18A957', '#8E5CF2', '#E08A1E', '#0E9AA7', '#D6458F', '#5B6EE1'];

  /* ---------- bảng GAME: mỗi game một bộ bìa/điểm/số liệu; chưa khai ⇒ dùng aShowSpeed ---------- */
  var SAO = function (g) { var s = (g.sao || []).filter(function (x) { return x > 0; }); return s.length ? (g.sao || []).join(' · ') + ' ⭐' : ''; };
  var GAME = {
    aShowSpeed: {
      ten: 'A SHOW SPEED', lop: 'tg-g-ashow', cup: IC.cup, play: IC.cup,
      diem: function (r) { return r ? (r.t || 0) * 2 + (r.h || 0) : 0; },
      tran: function (r) { return r ? (r.t || 0) + (r.h || 0) + (r.b || 0) : 0; },
      /* c: { tt, g, thay, n, daDau, tong, dangDau, em (hàng của em hoặc null), hang (hạng em, 0 = chưa đấu), top1 } → chuỗi HTML các ô số liệu */
      thongSo: function (c) {
        var o = function (nhan, gt, cls) { return '<div><small>' + nhan + '</small><b' + (cls ? ' class="' + cls + '"' : '') + '>' + gt + '</b></div>'; };
        var g = c.g, sao = SAO(g), t = '';
        if (c.thay) {
          if (c.tt === 'sap') t = o('EM TRONG LỚP', c.n) + (sao ? o('THƯỞNG TOP 3', an(sao), 'tg-sao') : '');
          else if (c.tt === 'dang') t = o('ĐÃ ĐẤU', c.daDau + '/' + c.n) + o('ĐANG ĐẤU', c.dangDau) + o('TRẬN', c.tong);
          else t = o('ĐÃ ĐẤU', c.daDau + '/' + c.n) + o('TRẬN', c.tong) + (c.top1 ? o('TOP 1', an(c.top1)) : '') + (g.daThuong ? o('SAO', 'Đã thưởng', 'tg-sao') : '');
          return t;
        }
        if (c.tt === 'sap') return o('MỖI TRẬN', g.phut + ' phút') + (sao ? o('THƯỞNG TOP 3', an(sao), 'tg-sao') : '');
        var rk = c.hang ? '#' + c.hang : '–', diem = c.em ? GAME.aShowSpeed.diem(c.em.r) : 0, tr = c.em ? c.em.tr : 0;
        if (c.tt === 'dang') return o('HẠNG CỦA EM', rk) + o('ĐIỂM', diem) + o('TRẬN', tr) + (sao ? o('THƯỞNG TOP 3', an(sao), 'tg-sao') : '');
        var thuong = c.hang && c.hang <= 3 && (g.sao || [])[c.hang - 1] ? '+' + g.sao[c.hang - 1] + ' ⭐' : '';
        return o('HẠNG CUỐI', rk) + o('ĐIỂM', diem) + (thuong ? o(g.daThuong ? 'THƯỞNG' : 'SẼ THƯỞNG', thuong, 'tg-sao') : '');
      }
    }
  };
  function gameCua(g) { return GAME[g && g.game] || GAME.aShowSpeed; }

  /* ---------- bàn thử (chỉ localhost) ---------- */
  function tham(k) { try { return new URLSearchParams(location.search).get(k) || ''; } catch (e) { return ''; } }
  var THU = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /^(1|thay|gv)$/.test(tham('thu')) ? tham('thu') : '';
  function mauThu(lop) {
    var now = Date.now(), tt = tham('tt') || 'dang', xong = tt === 'xong' || tt === 'thuong';
    var mo = { sap: now + 27 * H, dang: now - 4 * H, xong: now - 5 * D, thuong: now - 5 * D }[tt], dong = { sap: now + 4 * D + 3 * H, dang: now + 2 * D + 5 * H, xong: now - 2 * H, thuong: now - 2 * H }[tt];
    var g = { id: 'thu1', ten: tham('ten') || 'Speed Cup tuần 3', lops: [lop], game: 'aShowSpeed', phut: 3, lv: 'easy', sao: [30, 20, 10], tu: mo, den: dong, dong: xong, daThuong: tt === 'thuong', capNhat: now - H, nguon: 'mylesson' };
    var POOL = ['Bảo Nam', 'Gia Bảo', 'Thảo Vy', 'Khánh Linh', 'Minh Quân', 'An Nhiên', 'Hoàng Long', 'Ngọc Hân', 'Quang Minh', 'Đức Anh', 'Phương Anh', 'Tuấn Kiệt', 'Mai Chi', 'Hải Đăng', 'Bích Ngọc', 'Thanh Trúc', 'Việt Cường', 'Gia Hân'];
    var PTS = [8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0], em = {}, ros = [];
    var nHs = +tham('n') || POOL.length;
    POOL.slice(0, nHs).forEach(function (ten, i) {
      var uid = 'hs_' + (i + 1);
      ros.push({ uid: uid, ten: ten, anh: '' });
      if (PTS[i] > 0) em[uid] = { ten: ten, t: Math.floor(PTS[i] / 2), h: PTS[i] % 2, b: i % 3 };
    });
    return { giai: [g], bang: tt === 'sap' ? null : { em: em }, roster: ros, toi: { uid: THU === '1' ? 'hs_2' : 'gv', laThay: THU !== '1' }, dang: 2 };
  }

  /* ---------- kho + danh tính: dùng lại của TheTD (cùng app Firebase/phiên của trang) ---------- */
  function T() { return window.TheTD || null; }
  function trangThai(g, bay) { if (g.dong || bay >= g.den) return 'xong'; if (bay < g.tu) return 'sap'; return 'dang'; }
  /* chọn thẻ cần hiện: đang → sắp (gần nhất 1) → đã đóng chưa thưởng / mới thưởng ≤ 3 ngày; tối đa 3 */
  function chonGiai(ds, bay, thay) {
    ds.forEach(function (g) { g._tt = trangThai(g, bay); });
    var dang = ds.filter(function (g) { return g._tt === 'dang'; }).sort(function (a, b) { return a.den - b.den; });
    var sap = ds.filter(function (g) { return g._tt === 'sap'; }).sort(function (a, b) { return a.tu - b.tu; }).slice(0, 1);
    var xong = ds.filter(function (g) { return g._tt === 'xong' && (!g.daThuong || bay - (g.capNhat || g.den || 0) <= 3 * D); }).sort(function (a, b) { return (b.den || 0) - (a.den || 0); });
    if (!thay) xong = xong.slice(0, 1);
    return dang.concat(sap, xong).slice(0, 3);
  }
  async function docRoster(lop, kho) {
    var s = await kho.fs.getDocs(kho.fs.query(kho.fs.collection(kho.db, 'nwUsers'), kho.fs.where('cacLop', 'array-contains', lop), kho.fs.limit(60))), ds = [];
    s.forEach(function (d) { var x = d.data(); if (x.vaiTro === 'gv' || x.vaiTro === 'doi' || x.nghiHoc) return; ds.push({ uid: d.id, ten: x.ten || '?', anh: x.anh || '' }); });
    return ds;
  }

  /* ---------- phân tích một giải thành bảng xếp hạng + số liệu ---------- */
  function phanTich(it, Hh) {
    var G = gameCua(it.g), em = (it.bang && it.bang.em) || {}, co = {}, rows = [];
    (Hh.roster || []).forEach(function (n) { co[n.uid] = 1; rows.push({ uid: n.uid, ten: n.ten, anh: n.anh, r: em[n.uid] || null }); });
    Object.keys(em).forEach(function (uid) { if (!co[uid]) rows.push({ uid: uid, ten: em[uid].ten || '?', anh: '', r: em[uid] }); });
    rows.forEach(function (x) { x.d = G.diem(x.r); x.tr = G.tran(x.r); });
    rows.sort(function (a, b) {
      return b.d - a.d || ((b.r && b.r.t) || 0) - ((a.r && a.r.t) || 0) || a.tr - b.tr || String(a.ten).localeCompare(String(b.ten), 'vi');
    });
    var daDau = rows.filter(function (x) { return x.tr > 0; }), tong = 0;
    rows.forEach(function (x) { tong += x.tr; });
    var vt = -1; rows.forEach(function (x, i) { if (x.uid === Hh.toi.uid) vt = i; });
    var hang = 0; if (vt >= 0 && rows[vt].tr > 0) hang = daDau.indexOf(rows[vt]) + 1;
    return { rows: rows, n: rows.length, daDau: daDau.length, tong: Math.round(tong / 2), em: vt >= 0 ? rows[vt] : null, hang: hang, top1: daDau[0] ? daDau[0].ten : '' };
  }

  /* ---------- vẽ ---------- */
  function vietTat(ten) { var w = String(ten || '?').trim().split(/\s+/); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); }
  function mauTen(ten) { var s = 0; ten = String(ten || ''); for (var i = 0; i < ten.length; i++) s += ten.charCodeAt(i); return MAU[s % MAU.length]; }
  function conGio(ms) { ms = Math.max(0, ms); var h = Math.floor(ms / H), m = Math.floor(ms % H / 6e4), s = Math.floor(ms % 6e4 / 1e3); return hai(h) + ':' + hai(m) + ':' + hai(s); }
  function tienDo(g, bay, tt) { return tt === 'sap' ? 0 : tt === 'xong' ? 100 : Math.max(0, Math.min(1, (bay - g.tu) / (g.den - g.tu))) * 100; }
  function theHtml(it, Hh, bay) {
    var g = it.g, tt = it._tt = trangThai(g, bay), G = gameCua(g), thay = !!Hh.toi.laThay, P = phanTich(it, Hh);
    var dem = tt === 'xong' ? '' : '<span class="tg-dem" data-t="' + (tt === 'dang' ? g.den : g.tu) + '" title="' + (tt === 'dang' ? 'Còn lại đến khi đóng giải' : 'Còn lại đến khi mở giải') + '">' + conGio((tt === 'dang' ? g.den : g.tu) - bay) + '</span>';
    var dua;
    if (tt === 'sap') dua = '<div class="tg-dua"><div class="tg-rong">Đường đua chạy khi giải bắt đầu</div></div>';
    else {
      dua = '<div class="tg-dua"><div class="tg-duong"></div>' + P.rows.map(function (x, i) {
        var anh = x.anh ? "background-image:url('" + an(x.anh) + "')" : 'background:' + mauTen(x.ten), laEm = !thay && x.uid === Hh.toi.uid;
        return '<div class="tg-run' + (x.tr > 0 && i < 3 ? ' l' + (i + 1) : '') + (laEm ? ' em' : '') + '" data-d="' + x.d + '" title="' + an(x.ten) + ' · ' + x.d + ' điểm"><span class="tg-av" style="' + anh + '">' + (x.anh ? '' : an(vietTat(x.ten))) + '</span>' + (laEm ? '<span class="tg-tag">EM</span>' : '') + '</div>';
      }).join('') + '</div>';
    }
    var st = (G.thongSo || GAME.aShowSpeed.thongSo)({ tt: tt, g: g, thay: thay, n: P.n, daDau: P.daDau, tong: P.tong, dangDau: Hh.dang, em: P.em, hang: P.hang, top1: P.top1 });
    var nut = '';
    if (thay) {
      var b = function (k, ic, tit, cls) { return '<button type="button" class="tg-bt' + (cls ? ' ' + cls : '') + '" data-tg="' + k + '" title="' + tit + '" aria-label="' + tit + '">' + ic + '</button>'; };
      nut = '<div class="tg-nut">' + (tt === 'dang' ? b('ket', IC.ket, 'Bảng kết quả', 'p') + b('sua', IC.sua, 'Sửa')
        : tt === 'sap' ? b('sua', IC.sua, 'Sửa') + b('mo', IC.mo, 'Mở ngay', 'p')
        : b('ket', IC.ket, 'Bảng kết quả') + (g.daThuong ? '' : b('thuong', IC.sao, 'Thưởng sao', 'g'))) + '</div>';
    }
    return '<div class="tg-in"><div class="tg-tb"><i style="width:' + tienDo(g, bay, tt) + '%"></i></div>' +
      '<div class="tg-h"><span class="tg-cup">' + G.cup + '</span><div class="tg-t"><div class="tg-nm" title="' + an(g.ten) + '">' + an(g.ten) + '</div><span class="tg-pill">' + TT[tt] + '</span></div>' + dem + '</div>' +
      dua + '<div class="tg-f"><div class="tg-st">' + st + '</div>' + nut + '</div><span class="tg-play">' + G.play + '</span></div>';
  }
  /* xếp chấm vào ba làn không chồng nhau (chép thuật toán mẫu v8): từ em thấp điểm nhất lên, mỗi chấm vào làn trống sớm nhất */
  function datCho(el) {
    el.querySelectorAll('.tg-dua').forEach(function (box) {
      var Wd = box.clientWidth, els = box.querySelectorAll('.tg-run'); if (!Wd || !els.length) return;
      var mx = (+els[0].getAttribute('data-d')) || 1, gap = 19, lanes = [-99, -99, -99], Y = [0, -21, 21], Hh = box.clientHeight / 2;
      for (var i = els.length - 1; i >= 0; i--) {
        var d = +els[i].getAttribute('data-d'), px = 12 + (Wd - 40) * d / mx, lane = 0, best = 1e9, l;
        if (i > 0) { for (l = 0; l < 3; l++) { if (lanes[l] < best) { best = lanes[l]; lane = l; } } }
        px = Math.min(Math.max(px, lanes[lane] + gap), Wd - 16); lanes[lane] = px;
        els[i].style.left = px + 'px'; els[i].style.top = (Hh + Y[lane]) + 'px';
      }
    });
  }

  /* ---------- một ô #cumGiai ---------- */
  var HOSTS = [];
  function urlTrang(it, Hh, lam) {
    var q = 'giai=' + encodeURIComponent(it.g.id) + '&lop=' + encodeURIComponent(Hh.lop) + (lam ? '&lam=' + lam : '') + (THU ? '&thu=' + THU : '');
    var h = (/\/nw\//.test(location.pathname) ? '' : 'nw/') + 'giaidau.html?' + q;
    try { return new URL(h, location.href).href; } catch (e) { return h; }
  }
  function di(u, thay) {
    if (thay) { var w = null; try { w = window.open(u, '_blank'); } catch (e) { } if (w) return; }
    location.href = u;
  }
  function ve(Hh) {
    var bay = Date.now(), items = Hh.items || [];
    var h = items.map(function (it, i) {
      var tt = trangThai(it.g, bay);
      return '<div class="tg tg-' + tt + ' ' + gameCua(it.g).lop + '" role="link" tabindex="0" data-i="' + i + '" aria-label="Giải ' + an(it.g.ten) + ', ' + TT[tt] + '">' + theHtml(it, Hh, bay) + '</div>';
    }).join('');
    if (Hh.el._h !== h) { Hh.el._h = h; Hh.el.innerHTML = h; }
    Hh.el.hidden = !items.length;
    datCho(Hh.el);
  }
  function huyNghe(Hh) { (Hh.huy || []).forEach(function (f) { try { f(); } catch (e) { } }); Hh.huy = []; }
  async function nap(Hh) {
    var seq = Hh.seq = (Hh.seq || 0) + 1, lop = Hh.opt.lop ? Hh.opt.lop() : '';
    Hh.lop = lop; Hh.nap = Date.now(); huyNghe(Hh); Hh.items = []; Hh.dang = 0; Hh.roster = [];
    if (!lop) { ve(Hh); return; }
    try {
      var ds, bang0 = null;
      if (THU) {
        var m = mauThu(lop); Hh.toi = m.toi; Hh.roster = m.roster; Hh.dang = m.dang; ds = m.giai; bang0 = m.bang;
      } else {
        var t = T(); if (!t) return;
        var f = await t.kho(); Hh.toi = await t.toi();
        if (seq !== Hh.seq) return;
        ds = await t.giaiCuaLop(f, lop);
        if (seq !== Hh.seq) return;
        Hh.kho = f;
      }
      var chon = chonGiai(ds, Date.now(), !!Hh.toi.laThay);
      Hh.items = chon.map(function (g) { return { g: g, bang: bang0 }; });
      if (!THU && chon.length) { try { Hh.roster = await docRoster(lop, Hh.kho); } catch (e) { console.warn('[thẻ giải] danh sách lớp', e); } if (seq !== Hh.seq) return; }
      ve(Hh);
      if (THU) return;
      Hh.items.forEach(function (it) {
        if (it.g._tt === 'sap') return;
        Hh.huy.push(Hh.kho.fs.onSnapshot(Hh.kho.fs.doc(Hh.kho.db, 'giaiDau', it.g.id, 'bang', lop), function (s) { it.bang = s.exists() ? s.data() : null; ve(Hh); }, function (e) { console.warn('[thẻ giải] bảng', e); }));
      });
      if (Hh.items.some(function (it) { return it.g._tt === 'dang'; })) {
        Hh.huy.push(Hh.kho.fs.onSnapshot(Hh.kho.fs.query(Hh.kho.fs.collection(Hh.kho.db, 'tranDau'), Hh.kho.fs.where('lop', '==', lop), Hh.kho.fs.where('trangThai', '==', 'choi'), Hh.kho.fs.limit(20)), function (s) {
          var n = 0, b2 = Date.now(); s.forEach(function (d) { if ((d.data().ketThuc || 0) > b2 - 15000) n++; });
          Hh.dang = n; ve(Hh);
        }, function (e) { console.warn('[thẻ giải] trận đang đấu', e); }));
      }
    } catch (e) { console.warn('[thẻ giải]', e); }
  }
  function gan(khung, opt) {
    if (!khung) return;
    napFont();
    var Hh = HOSTS.filter(function (x) { return x.el === khung; })[0];
    if (Hh) { Hh.opt = opt || Hh.opt; return Hh; }
    Hh = { el: khung, opt: opt || {}, lop: null, items: [], roster: [], dang: 0, toi: { uid: '', laThay: false }, huy: [] };
    HOSTS.push(Hh);
    khung.addEventListener('click', function (e) {
      var the = e.target.closest('.tg'); if (!the) return;
      var it = Hh.items[+the.getAttribute('data-i')]; if (!it) return;
      var nut = e.target.closest('[data-tg]');
      var lam = nut ? nut.getAttribute('data-tg') : '';
      di(urlTran(it, Hh, lam), !!Hh.toi.laThay);
    });
    khung.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var the = e.target.closest && e.target.closest('.tg'); if (!the || e.target.closest('[data-tg]')) return;
      e.preventDefault(); the.click();
    });
    if (window.ResizeObserver) { try { new ResizeObserver(function () { datCho(khung); }).observe(khung); } catch (e) { } }
    nap(Hh);
    return Hh;
  }
  function urlTran(it, Hh, lam) { return urlTrang(it, Hh, lam === 'ket' ? '' : lam); }

  /* phông Barlow Condensed (số/tên giải kiểu mẫu v8); chưa tải được ⇒ chữ hẹp dự phòng */
  function napFont() {
    if (document.getElementById('tgFont')) return;
    var l = document.createElement('link'); l.id = 'tgFont'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,800;1,900&display=swap';
    document.head.appendChild(l);
  }

  /* mỗi giây: đồng hồ đếm lùi + vạch thời gian; đổi lớp / giải đổi trạng thái / quá 5 phút ⇒ nạp lại */
  setInterval(function () {
    var bay = Date.now();
    HOSTS.forEach(function (Hh) {
      if (!Hh.el.isConnected) return;
      var lop = Hh.opt.lop ? Hh.opt.lop() : '';
      if (lop !== Hh.lop) return nap(Hh);
      var doi = false;
      (Hh.items || []).forEach(function (it) { if (trangThai(it.g, bay) !== it.g._tt) doi = true; });
      if (doi || (bay - Hh.nap > 5 * 60e3 && !document.hidden)) return nap(Hh);
      Hh.el.querySelectorAll('.tg-dem[data-t]').forEach(function (e) { e.textContent = conGio(+e.getAttribute('data-t') - bay); });
      Hh.el.querySelectorAll('.tg').forEach(function (the) {
        var it = Hh.items[+the.getAttribute('data-i')], i = the.querySelector('.tg-tb i');
        if (it && i && it.g._tt === 'dang') i.style.width = tienDo(it.g, bay, 'dang') + '%';
      });
    });
  }, 1000);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    HOSTS.forEach(function (Hh) { if (Hh.el.isConnected && Date.now() - Hh.nap > 30e3) nap(Hh); });
  });
  window.addEventListener('resize', function () { HOSTS.forEach(function (Hh) { datCho(Hh.el); }); });

  window.TheGiai = { gan: gan, lam: function (khung) { HOSTS.forEach(function (Hh) { if (Hh.el === khung) nap(Hh); }); }, GAME: GAME };
})();
