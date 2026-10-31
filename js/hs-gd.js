/* ============================================================
   js/hs-gd.js — POP-UP "GIẢI ĐẤU" CỦA MỘT EM trên DASHBOARD (web v1.463.0, 31/10/2026, thầy "ok làm luôn")
   Mẫu thầy duyệt: D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\ho-so-giai-dau-em-v1\index.html · CSS css/hs-gd.css (tiền tố `hgd-`).
   Mở: chuột phải avatar học sinh (js/chuot-phai.js mucNguoi ⇒ "Giải đấu", CHỈ THẦY) ⇒ HsGd.mo({ uid, ma, ten, lop, anh }).
   5 tab: TỔNG QUAN (ô số · phong độ 30 trận · theo chế độ · lịch chăm đấu 13 tuần · kỷ lục · toàn bộ lịch sử) · XẾP HẠNG (đường điểm mùa
   có nền theo hạng · mùa này · các mùa) · ĐẤU GIẢI (các giải đã dự + hạng trong bảng lớp · biểu đồ hạng qua các giải · đối thủ) ·
   GIAO HỮU (đối đầu từng bạn + thầy) · LUYỆN TẬP (phiếu tdLuyen — chỉ có từ 31/10/2026, nw/js/tran.js ghiLuyen).
   Bấm dòng trận ⇒ màn chi tiết trận của hộp Quản lý giải đấu (TdXem.veTran). Bấm thẻ giải ⇒ GiaiPop.mo(giải, lớp).

   Đọc kho (phiên thầy qua TheTD.kho(); không cần chỉ mục ghép):
     · uid của em: uid menu + uid cũ cùng tên + lớp trong `nwCauHinh/tdTong` (trận trước đợt đánh lại số mang `hs_<id cũ>`).
     · trận: tranDau where nguoi array-contains-any uids (y td-xem napTranEm) — chỉ trận `xong`.
     · mùa: xhMua orderBy tu desc (≤12) + xhMua/{mua}/em/{uid} (diem, cao, tran/thang/hoa/thua, chuoi, baoVe, xl, hang, s) + đếm em mùa hiện tại.
     · giải: giaiDau/{id} + giaiDau/{id}/bang/{lớp} (hạng = GiaiGhi.sapXep + hangCung, y pop-up giải).
     · kỷ lục chữ: tranDau/{id}/tu của 25 trận gần nhất (đọc sau khi vẽ — từ dài nhất, từ đúng/phút).
     · luyện tập: tdLuyen where uid in uids.
   Bàn thử (localhost + ?thu=): số liệu mẫu cùng khuôn kho, không đọc kho.
   ============================================================ */
(function () {
  'use strict';
  if (window.HsGd) return;
  var NG = 864e5;
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var hai = function (n) { return (n < 10 ? '0' : '') + n; };
  var so = function (n) { return Number(n || 0).toLocaleString('vi-VN'); };
  var le1 = function (n) { return (Math.round(n * 10) / 10).toLocaleString('vi-VN'); };
  function ngay(ms) { var d = new Date(ms); return hai(d.getDate()) + '/' + hai(d.getMonth() + 1); }
  function gio(ms) { var d = new Date(ms); return hai(d.getHours()) + ':' + hai(d.getMinutes()); }
  function ngayDu(ms) { var d = new Date(ms); return ngay(ms) + '/' + d.getFullYear(); }
  function luc(ms) { var d = new Date(ms), h = new Date(); h.setHours(0, 0, 0, 0); return gio(ms) + (d >= h ? ' hôm nay' : ' ' + ngay(ms)); }
  function thoiLuong(ms) { var p = Math.round(ms / 60000); return p < 60 ? p + ' phút' : Math.floor(p / 60) + ' giờ ' + hai(p % 60); }
  function chuan(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function tat(t) { var w = String(t || '?').trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase(); }
  var MAU_AV = ['#E0A11B', '#E5587A', '#12A58F', '#1C7FD6', '#8B5CF6', '#E07B2C', '#2BAE66', '#3B82F6', '#C2410C', '#0891B2'];
  function av(ten, anh, thay, cao) {
    var m = thay ? '#0F7A6C' : MAU_AV[(String(ten || '').length + String(ten || '?').charCodeAt(0)) % MAU_AV.length];
    return '<span class="hgd-av" style="background:' + m + (cao ? ';width:' + cao + 'px;height:' + cao + 'px;font-size:' + Math.round(cao * .36) + 'px' : '') + '">' + E(tat(ten)) +
      (anh ? '<img src="' + E(anh) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</span>';
  }
  // hạng (cùng bảng màu td-xem.js HANG) — sàn hạng thường theo điểm; bk/kc/ct/ht là SUẤT (sàn lấy ở xhMua.suat)
  var HANG = { dong: ['Đồng', '#C27C4A'], bac: ['Bạc', '#8A97A6'], vang: ['Vàng', '#E0A11B'], bk: ['Bạch kim', '#1FAE98'], kc: ['Kim cương', '#3B82F6'], ct: ['Cao thủ', '#8B5CF6'], ht: ['Huyền thoại', '#E5385A'] };
  var THU_TU = ['dong', 'bac', 'vang', 'bk', 'kc', 'ct', 'ht'];
  var SUAT_MAC = [{ t: 'ht', n: 2, san: 1800 }, { t: 'ct', n: 2, san: 1600 }, { t: 'kc', n: 3, san: 1400 }, { t: 'bk', n: 6, san: 1100 }];
  function hangDiem(d) { return d >= 800 ? 'vang' : d >= 300 ? 'bac' : 'dong'; }
  function sanCac(M) {   // [[mã, sàn]] tăng dần
    var suat = M && Array.isArray(M.suat) && M.suat.length ? M.suat : SUAT_MAC, o = [['dong', 0], ['bac', 300], ['vang', 800]];
    suat.slice().sort(function (a, b) { return a.san - b.san; }).forEach(function (s) { o.push([s.t, s.san]); });
    return o;
  }
  function khien(c, sz) {
    return '<svg viewBox="0 0 32 32" width="' + (sz || 26) + '" height="' + (sz || 26) + '" aria-hidden="true"><path d="M16 2l11 4v9c0 7-5 12-11 15C10 27 5 22 5 15V6z" fill="' + c + '"/>' +
      '<path d="M16 5.5l8 3v6.6c0 5-3.6 8.8-8 11.2-4.4-2.4-8-6.2-8-11.2V8.5z" fill="rgba(255,255,255,.22)"/><path d="M16 10l1.9 3.9 4.3.6-3.1 3 .7 4.2L16 19.7l-3.8 2 .7-4.2-3.1-3 4.3-.6z" fill="#fff"/></svg>';
  }
  var LOAI = { xh: ['Xếp hạng', 'var(--c-xh)', '#8B5CF6'], giai: ['Đấu giải', 'var(--c-giai)', '#E07B2C'], gh: ['Giao hữu', 'var(--c-gh)', '#1C7FD6'], gv: ['Với thầy', 'var(--c-gv)', '#0F7A6C'] };
  var P = function (d) { return '<svg class="i" viewBox="0 0 24 24">' + d + '</svg>'; };
  var IC = {
    dong: P('<path d="M6 6l12 12M18 6L6 18"/>'),
    kiem: P('<path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/>'),
    cup: P('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
    lua: P('<path d="M12 22c4 0 7-2.7 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4.3 3 7 7 7z"/>'),
    gio: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    chu: P('<path d="M4 7V5h16v2M9 19h6M12 5v14"/>'),
    ngon: P('<path d="M12 2v6M12 16v6M4.9 4.9l4.2 4.2M14.9 14.9l4.2 4.2M2 12h6M16 12h6"/>'),
    canh: P('<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'),
    ban: P('<circle cx="9" cy="8" r="3.2"/><path d="M3.2 19.5c0-3.3 2.6-5.4 5.8-5.4s5.8 2.1 5.8 5.4"/><circle cx="17.2" cy="9" r="2.5"/><path d="M16.5 14.2c2.6.2 4.3 2 4.3 4.8"/>'),
    may: P('<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6"/>')
  };

  function laThu() { return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]thu=/.test(location.search); }
  var _f = null;
  function kho() {
    if (_f) return Promise.resolve(_f);
    var p = window.TheTD && TheTD.kho ? TheTD.kho() : window.AWChat && AWChat.db ? AWChat.db() : Promise.reject(new Error('chưa có kho'));
    return p.then(function (f) { _f = f; return f; });
  }
  function ms(v) { return v && v.toMillis ? v.toMillis() : +v || 0; }

  // ---------- trận ⇒ dòng của em ----------
  function loaiTran(t) { return t.xh ? 'xh' : t.giai ? 'giai' : t.gv ? 'gv' : 'gh'; }
  function dong(t, uids) {
    var k = uids.indexOf(t.a) >= 0 ? 'a' : 'b', o = k === 'a' ? 'b' : 'a', d = t.diem || {}, kq = (t.kq || {})[k];
    var uidO = t[o], thay = !!t.gv && uidO === t.gv;
    return {
      id: t.id, luc: t.xongLuc || t.taoLuc || 0, l: loaiTran(t), k: k, a: d[k] || 0, b: d[o] || 0,
      kq: kq === 'thang' ? 'T' : kq === 'hoa' ? 'H' : 'B',
      ban: { uid: uidO, ten: thay ? 'Thầy Andrew' : (o === 'a' ? t.tenA : t.tenB) || '?', lop: thay ? 'GV' : (o === 'a' ? t.lopA : t.lopB) || '', anh: (o === 'a' ? t.anhA : t.anhB) || '', thay: thay },
      anh: (k === 'a' ? t.anhA : t.anhB) || '', ten: (k === 'a' ? t.tenA : t.tenB) || '', lopEm: (k === 'a' ? t.lopA : t.lopB) || '',
      xh: (t.xhKq || {})[k] || null, mua: t.xh || '', giai: t.giai || '', lopGiai: t.lop || '', khong: !!(t.khongTinh && t.khongTinh[k]),
      bo: t.ly === 'roi' + k.toUpperCase() || t.ly === 'mat' + k.toUpperCase(), roiBan: t.ly === 'roi' + o.toUpperCase() || t.ly === 'mat' + o.toUpperCase(),
      dai: Math.max(0, (t.ketThuc || 0) - (t.batDau || 0)) || (t.phut || 2) * 60000, boTen: t.boTen || '', thayHo: !!(t.hoTro || t.daHoTro)
    };
  }
  function dem(ds) { var o = { n: ds.length, t: 0, h: 0, b: 0 }; ds.forEach(function (x) { o[x.kq === 'T' ? 't' : x.kq === 'H' ? 'h' : 'b']++; }); o.ty = o.n ? Math.round(o.t * 100 / o.n) : 0; return o; }

  // ---------- nạp ----------
  async function nap(em) {
    if (laThu()) return mau(em);
    var f = await kho(), fs = f.fs, db = f.db;
    var uids = [em.uid].filter(Boolean);
    try {   // uid cũ cùng tên + lớp (tdTong)
      var tg = await fs.getDoc(fs.doc(db, 'nwCauHinh', 'tdTong')), T = tg.exists() ? tg.data() : null, kt = chuan(em.ten), kl = chuan(em.lop);
      Object.keys((T && T.em) || {}).forEach(function (u) { var e = T.em[u]; if (uids.indexOf(u) < 0 && kt && chuan(e.ten) === kt && (!kl || chuan(e.lop) === kl)) uids.push(u); });
    } catch (e) { }
    if (!uids.length) throw new Error('chưa tìm thấy tài khoản của em');
    var raw = [];
    for (var i = 0; i < uids.length; i += 10) {
      var s = await fs.getDocs(fs.query(fs.collection(db, 'tranDau'), fs.where('nguoi', 'array-contains-any', uids.slice(i, i + 10)), fs.limit(3000)));
      s.forEach(function (d) { var t = d.data(); t.id = d.id; if (t.trangThai === 'xong') raw.push(t); });
    }
    // mùa
    var mua = [];
    try {
      var sm = await fs.getDocs(fs.query(fs.collection(db, 'xhMua'), fs.orderBy('tu', 'desc'), fs.limit(12)));
      sm.forEach(function (d) { var x = d.data(); x.id = d.id; mua.push(x); });
      await Promise.all(mua.map(async function (M) {
        var tot = null;
        for (var j = 0; j < uids.length; j++) { var d = await fs.getDoc(fs.doc(db, 'xhMua', M.id, 'em', uids[j])); if (d.exists() && (!tot || (d.data().tran || 0) > (tot.tran || 0))) tot = d.data(); }
        M.em = tot;
      }));
      var Mh = mua.filter(function (m) { return m.em && laMuaHien(m); })[0];
      if (Mh && fs.getCountFromServer) { try { var c = await fs.getCountFromServer(fs.query(fs.collection(db, 'xhMua', Mh.id, 'em'), fs.where('diem', '>=', 0))); Mh.soEm = c.data().count; } catch (e) { } }
    } catch (e) { console.warn('[hs-gd] mùa', e); }
    // giải
    var giai = {}, ids = {};
    raw.forEach(function (t) { if (t.giai) ids[t.giai] = ids[t.giai] || t.lop || ''; });
    await Promise.all(Object.keys(ids).slice(0, 40).map(async function (gid) {
      try {
        var g = await fs.getDoc(fs.doc(db, 'giaiDau', gid)); if (!g.exists()) return;
        var G = g.data(); G.id = gid; G.lopEm = ids[gid];
        var lop = ids[gid] || ((G.lops || []).length === 1 ? G.lops[0] : '');
        if (lop) { var b = await fs.getDoc(fs.doc(db, 'giaiDau', gid, 'bang', lop)); G.bang = b.exists() ? b.data() : null; G.lopEm = lop; }
        giai[gid] = G;
      } catch (e) { }
    }));
    // luyện tập
    var luyen = [];
    try {
      var sl = await fs.getDocs(fs.query(fs.collection(db, 'tdLuyen'), fs.where('uid', 'in', uids.slice(0, 10)), fs.limit(1000)));
      sl.forEach(function (d) { var x = d.data(); x.id = d.id; x.luc = ms(x.luc); luyen.push(x); });
    } catch (e) { console.warn('[hs-gd] luyện tập', e); }
    return { uids: uids, raw: raw, mua: mua, giai: giai, luyen: luyen };
  }
  function laMuaHien(M) { var b = Date.now(); return M.tt !== 'chot' && (M.tu || 0) <= b && b < (M.den || 9e15); }
  // từ của em trong một trận: uid em, hoặc đuôi _a|_b của bên em (thầy gửi hộ — benGui)
  async function napTu(D) {
    var ds = D.tran.slice(0, 25), kq = [];
    if (laThu()) return ds.map(function (r, i) { var W = ['EXTRAORDINARY', 'BEAUTIFUL', 'ORANGE', 'STAR', 'PLANET', 'RAINBOW']; return { r: r, w: W.slice(0, 2 + i % 4), n: 6 + i % 9 }; });
    var f = await kho();
    await Promise.all(ds.map(async function (r) {
      try {
        var q = await f.fs.getDocs(f.fs.collection(f.db, 'tranDau', r.id, 'tu')), w = [];
        q.forEach(function (d) { var x = d.data(), id = d.id; if (/^(zg|zhet)/.test(id) || !x.ok) return; if (D.uids.indexOf(x.uid) >= 0 || new RegExp('_' + r.k + '$').test(id)) w.push(id.split('_')[0].toUpperCase()); });
        kq.push({ r: r, w: w, n: w.length });
      } catch (e) { }
    }));
    return kq;
  }

  // ---------- khung ----------
  var S = null;
  function dongHop() {
    if (!S) return;
    S.nen.remove(); document.removeEventListener('keydown', S.phim, true); S = null;
  }
  async function mo(em) {
    em = em || {}; dongHop();
    var nen = document.createElement('div'); nen.className = 'hgd-nen';
    nen.innerHTML = '<div class="hgd-hop" role="dialog" aria-label="Giải đấu của ' + E(em.ten || '') + '"><button type="button" class="hgd-x" aria-label="Đóng">' + IC.dong + '</button>' +
      '<div class="hgd-dau">' + av(em.ten, em.anh) + '<div class="hgd-ten"><h2>' + E(em.ten || '?') + '</h2><div class="phu">' + (em.lop ? 'Lớp <b>' + E(em.lop) + '</b>' : '') + '</div></div><div></div></div>' +
      '<div class="hgd-tabs"></div><div class="hgd-than"><div class="hgd-tai">Đang tải các trận của em…</div></div></div>';
    document.body.appendChild(nen);
    S = { nen: nen, em: em, tab: 'tong', loc: '', soDong: 40, phim: function (e) { if (e.key === 'Escape') { e.stopPropagation(); dongHop(); } } };
    var s0 = S;
    nen.addEventListener('mousedown', function (e) { if (e.target === nen) dongHop(); });
    nen.querySelector('.hgd-x').onclick = dongHop;
    document.addEventListener('keydown', S.phim, true);
    try {
      var D = await nap(em);
      if (s0 !== S) return;
      D.tran = D.raw.map(function (t) { return dong(t, D.uids); }).sort(function (a, b) { return b.luc - a.luc; });
      if (!em.ten && D.tran[0]) em.ten = D.tran[0].ten;
      if (!em.anh && D.tran[0]) em.anh = D.tran[0].anh;
      D.muaHien = D.mua.filter(function (m) { return m.em && laMuaHien(m); })[0] || null;
      D.dsGiai = tinhGiai(D);
      S.D = D;
      veDau(); veTabs(); ve();
      napTu(D).then(function (x) { if (s0 !== S) return; S.tu = x; if (S.tab === 'tong') veKyLuc(); }).catch(function () { });
    } catch (e) {
      if (s0 !== S) return;
      console.warn('[hs-gd]', e);
      nen.querySelector('.hgd-than').innerHTML = '<div class="hgd-tai">Chưa tải được: ' + E(String((e && (e.code || e.message)) || e).slice(0, 160)) + '</div>';
    }
  }

  // ---------- đầu hộp ----------
  function hangHien(D) {
    var M = D.muaHien, e = M && M.em;
    if (!e) return null;
    if (e.diem == null) return { cho: true, xl: e.xl || 0, M: M, e: e };
    var ma = e.s || hangDiem(e.diem), sc = sanCac(M), i = THU_TU.indexOf(ma), ke = null;
    sc.forEach(function (x) { if (!ke && THU_TU.indexOf(x[0]) > i && x[1] > e.diem) ke = x; });
    var san = (sc.filter(function (x) { return x[0] === ma; })[0] || [ma, 0])[1];
    return { ma: ma, M: M, e: e, ke: ke, san: Math.min(san, e.diem) };
  }
  function chuoiHien(ds) { if (!ds.length) return ''; var k = ds[0].kq, n = 0; while (ds[n] && ds[n].kq === k) n++; return (k === 'T' ? 'Thắng ' : k === 'B' ? 'Thua ' : 'Hoà ') + n; }
  function veDau() {
    var D = S.D, em = S.em, ds = D.tran, o = dem(ds), h = hangHien(D), mau = h && h.ma ? HANG[h.ma][1] : '#8AA09C';
    var buc = D.dsGiai.filter(function (g) { return g.hang && g.hang <= 3; }).length;
    var chip = '', tien = '';
    if (h && h.cho) chip = '<span class="hgd-chip">' + khien('#8AA09C', 26) + 'Đang phân hạng ' + h.xl + '/5</span>';
    else if (h) {
      chip = '<span class="hgd-chip">' + khien(mau, 26) + E(HANG[h.ma][0]) + ' · ' + so(h.e.diem) + ' điểm' + (h.e.hang ? ' · <span class="so1">#' + h.e.hang + ' toàn trường</span>' : '') + '</span>';
      if (h.ke) {
        var pt = Math.max(3, Math.min(100, (h.e.diem - h.san) / Math.max(1, h.ke[1] - h.san) * 100));
        tien = '<div class="hgd-tien"><div class="vach"><i style="width:' + pt + '%"></i></div><small><span>' + E(HANG[h.ma][0]) + ' ' + so(h.san) + '</span><span>còn <b>' + so(h.ke[1] - h.e.diem) + '</b> lên ' + E(HANG[h.ke[0]][0]) + (THU_TU.indexOf(h.ke[0]) >= 3 ? ' (cần lọt suất)' : '') + '</span></small></div>';
      }
    } else chip = '<span class="hgd-chip">' + khien('#8AA09C', 26) + 'Chưa đấu xếp hạng mùa này</span>';
    var dau = S.nen.querySelector('.hgd-dau');
    dau.style.setProperty('--hc', mau); dau.style.setProperty('--hc-mo', mau + '59');
    dau.innerHTML = av(em.ten, em.anh) +
      '<div class="hgd-ten"><h2>' + E(em.ten || '?') + '</h2><div class="phu">' + (em.lop ? '<span>Lớp <b>' + E(em.lop) + '</b></span>' : '') +
        (ds.length ? '<span>·</span><span>Trận cuối <b>' + luc(ds[0].luc) + '</b></span><span>·</span><span>Đấu từ <b>' + ngayDu(ds[ds.length - 1].luc) + '</b></span>' : '<span>· chưa đấu trận nào</span>') +
        (D.uids.length > 1 ? '<span>·</span><span>gộp ' + D.uids.length + ' tài khoản</span>' : '') + '</div>' +
        '<div class="hgd-hang">' + chip + tien + '</div></div>' +
      '<div class="hgd-so"><div><b>' + so(o.n) + '</b><small>Trận</small></div><div><b>' + o.ty + '%</b><small>Thắng</small></div><div><b>' + (chuoiHien(ds) || '—') + '</b><small>Chuỗi</small></div><div><b>' + buc + '</b><small>Lên bục</small></div>' +
        '<div style="grid-column:1/-1"><div class="hgd-phong" title="10 trận gần nhất (phải = cũ hơn)">' + ds.slice(0, 10).map(function (r) { return '<i style="background:' + (r.kq === 'T' ? '#12A58F' : r.kq === 'H' ? '#E0A11B' : '#E5587A') + '">' + (r.kq === 'T' ? 'T' : r.kq === 'H' ? 'H' : 'B') + '</i>'; }).join('') + '</div></div></div>';
    dau.querySelector('.hgd-av').style.cssText += ';width:78px;height:78px;font-size:26px';
  }

  // ---------- tab ----------
  function veTabs() {
    var D = S.D, n = function (f) { return D.tran.filter(f).length; };
    var T = [['tong', 'Tổng quan', 'var(--xanh)', D.tran.length], ['xh', 'Xếp hạng', 'var(--c-xh)', n(function (r) { return r.l === 'xh'; })],
      ['giai', 'Đấu giải', 'var(--c-giai)', n(function (r) { return r.l === 'giai'; })], ['gh', 'Giao hữu', 'var(--c-gh)', n(function (r) { return r.l === 'gh' || r.l === 'gv'; })],
      ['luyen', 'Luyện tập', 'var(--c-luyen)', D.luyen.length]];
    var el = S.nen.querySelector('.hgd-tabs');
    el.innerHTML = T.map(function (t) { return '<button type="button" class="hgd-tab' + (t[0] === S.tab ? ' chon' : '') + '" style="--m:' + t[2] + '" data-t="' + t[0] + '"><span class="dot"></span>' + t[1] + '<span class="so">' + so(t[3]) + '</span></button>'; }).join('');
    $$('[data-t]', el).forEach(function (b) { b.onclick = function () { S.tab = b.getAttribute('data-t'); S.soDong = 40; veTabs(); ve(); }; });
  }
  function than() { return S.nen.querySelector('.hgd-than'); }
  function ve() {
    var el = than(); el.scrollTop = 0;
    ({ tong: veTong, xh: veXh, giai: veGiai, gh: veGh, luyen: veLuyen })[S.tab](el);
    ganTran(el);
  }

  // ---------- mảnh dùng chung ----------
  function wdl(o) { var n = o.n || 1; return '<div class="hgd-wdl"><i style="width:' + (o.t / n * 100) + '%;background:var(--thang)"></i><i style="width:' + (o.h / n * 100) + '%;background:var(--hoa)"></i><i style="width:' + (o.b / n * 100) + '%;background:var(--thua)"></i></div>'; }
  function wdlChu(o) { return '<div class="hgd-cwdl"><span style="--c:var(--thang)">Thắng ' + o.t + '</span><span style="--c:var(--hoa)">Hoà ' + o.h + '</span><span style="--c:var(--thua)">Thua ' + o.b + '</span></div>'; }
  function oso(ic, m, b, chu, phu) { return '<div class="hgd-oso"><span class="ic" style="background:' + m + '1A;color:' + m + '">' + ic + '</span><div><b>' + b + '</b><small>' + chu + (phu ? ' · ' + phu : '') + '</small></div></div>'; }
  function the(tieu, phu, noi, phai) { return '<div class="hgd-the"><div class="hgd-the-dau"><div><b>' + tieu + '</b>' + (phu ? '<small>' + phu + '</small>' : '') + '</div>' + (phai || '') + '</div>' + noi + '</div>'; }
  function cotDiem(r) {
    var x = r.xh; if (!x) return '<span class="mo">—</span>';
    if (x.diem == null) return '<span class="hgd-nhan" style="background:#F1EAFE;color:#7C3AED">Phân hạng ' + (x.xl || '?') + '/5</span>';
    return '<b class="' + ((x.doi || 0) >= 0 ? 'hgd-len' : 'hgd-xuong') + '">' + ((x.doi || 0) >= 0 ? '+' : '−') + Math.abs(x.doi || 0) + '</b> <span class="mo">→ ' + so(x.diem) + '</span>';
  }
  function bangTran(ds, coDiem, coLoai) {
    if (!ds.length) return '<div class="hgd-rong">Chưa có trận nào.</div>';
    var hien = ds.slice(0, S.soDong);
    return '<table class="hgd-bang"><thead><tr><th>Lúc</th>' + (coLoai ? '<th>Chế độ</th>' : '') + '<th>Đối thủ</th><th class="so">Tỉ số</th><th>KQ</th>' + (coDiem ? '<th class="so">Điểm hạng</th>' : '') + '</tr></thead><tbody>' +
      hien.map(function (r) {
        var nhan = (r.bo ? ' <span class="hgd-nhan" style="background:#FDECEF;color:#C0264A">Bỏ dở</span>' : r.roiBan ? ' <span class="hgd-nhan" style="background:#EEF3F2;color:#5F7370">Bạn bỏ</span>' : '') +
          (r.khong ? ' <span class="hgd-nhan" style="background:#EEF3F2;color:#5F7370">Không tính</span>' : '') + (r.thayHo ? ' <span class="hgd-nhan" style="background:#E7F2F0;color:#0E7C6E">Thầy hỗ trợ</span>' : '');
        var gt = r.giai && S.D.giai[r.giai] ? S.D.giai[r.giai].ten || '' : '';
        return '<tr data-tran="' + E(r.id) + '" title="Bấm xem chi tiết trận"><td><b>' + gio(r.luc) + '</b> <span class="mo">' + ngay(r.luc) + '</span></td>' +
          (coLoai ? '<td><span class="hgd-loai" style="--c:' + LOAI[r.l][1] + '">' + LOAI[r.l][0] + '</span></td>' : '') +
          '<td><div class="hgd-ng">' + av(r.ban.ten, r.ban.anh, r.ban.thay) + '<span><b>' + E(r.ban.ten) + '</b><small>' + E(r.ban.lop) + (gt ? ' · ' + E(gt) : r.boTen ? ' · ' + E(r.boTen) : '') + '</small></span></div></td>' +
          '<td class="so hgd-ty">' + r.a + '<s>–</s>' + r.b + '</td><td style="white-space:nowrap"><span class="hgd-kq ' + r.kq + '">' + r.kq + '</span>' + nhan + '</td>' +
          (coDiem ? '<td class="so">' + cotDiem(r) + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table>' +
      (ds.length > hien.length ? '<button type="button" class="hgd-them" data-them>Xem thêm ' + Math.min(60, ds.length - hien.length) + ' trận (còn ' + so(ds.length - hien.length) + ')</button>' : '');
  }
  function ganTran(el) {
    $$('[data-tran]', el).forEach(function (tr) { tr.onclick = function () { moTran(tr.getAttribute('data-tran')); }; });
    var t = el.querySelector('[data-them]'); if (t) t.onclick = function () { var y = el.scrollTop; S.soDong += 60; ve(); el.scrollTop = y; };
    $$('[data-giai]', el).forEach(function (g) { g.onclick = function () { if (window.GiaiPop) GiaiPop.mo(g.getAttribute('data-giai'), g.getAttribute('data-lop') || ''); }; });
  }
  function moTran(id) {
    if (laThu() || !window.TdXem || !TdXem.veTran) return;
    var el = than(), y = el.scrollTop, s0 = S;
    el.innerHTML = '<div class="hgd-ct"></div>'; el.scrollTop = 0;
    TdXem.veTran(el.firstChild, { id: id, kho: kho, laThu: false, lui: function () { if (s0 !== S) return; ve(); than().scrollTop = y; } });
  }
  function tip(el) { var t = el.querySelector('.hgd-tip'); if (!t) { t = document.createElement('div'); t.className = 'hgd-tip'; el.appendChild(t); } return t; }
  function doiThu(ds, hep) {
    var vs = {};
    ds.forEach(function (r) { var k = r.ban.uid || r.ban.ten, v = vs[k] = vs[k] || { b: r.ban, n: 0, t: 0, h: 0, x: 0 }; v.n++; if (r.kq === 'T') v.t++; else if (r.kq === 'H') v.h++; else v.x++; });
    var a = Object.keys(vs).map(function (k) { return vs[k]; }).sort(function (p, q) { return q.n - p.n; }).slice(0, 7);
    if (!a.length) return '<div class="hgd-rong">Chưa có.</div>';
    return a.map(function (v) { return '<div class="hgd-dt' + (hep ? ' hep' : '') + '"><div class="hgd-ng">' + av(v.b.ten, v.b.anh, v.b.thay) + '<span><b>' + E(v.b.ten) + '</b><small>' + E(v.b.lop) + ' · ' + v.n + ' trận</small></span></div><div>' + wdl({ n: v.n, t: v.t, h: v.h, b: v.x }) + '</div><div class="so">' + v.t + '–' + v.h + '–' + v.x + '</div></div>'; }).join('');
  }

  // ---------- biểu đồ ----------
  function bdPhong(el, ds) {
    ds = ds.slice(0, 30).reverse();
    if (!ds.length) { el.innerHTML = '<div class="hgd-rong">Chưa có trận.</div>'; return; }
    var W = 640, H = 150, M = H / 2, mx = Math.max(10, Math.max.apply(null, ds.map(function (r) { return Math.abs(r.a - r.b); }))), bw = (W - 20) / Math.max(ds.length, 12);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '"><line x1="10" x2="' + (W - 10) + '" y1="' + M + '" y2="' + M + '" stroke="#CFDCD9"/>';
    ds.forEach(function (r, i) {
      var d = r.a - r.b, h = Math.max(3, Math.abs(d) / mx * (M - 14));
      s += '<rect data-i="' + i + '" x="' + (10 + i * bw + 2) + '" y="' + (d >= 0 ? M - h : M) + '" width="' + Math.max(2, bw - 4) + '" height="' + h + '" rx="3" fill="' + (r.kq === 'T' ? '#12A58F' : r.kq === 'H' ? '#E0A11B' : '#E5587A') + '" style="cursor:pointer"/>';
    });
    s += '<text class="hgd-truc" x="10" y="11">Thắng cách biệt</text><text class="hgd-truc" x="10" y="' + (H - 3) + '">Thua cách biệt</text><text class="hgd-truc" x="' + (W - 10) + '" y="11" text-anchor="end">mới nhất →</text></svg>';
    el.innerHTML = s;
    var tp = tip(el), sv = el.querySelector('svg');
    $$('rect[data-i]', el).forEach(function (rc) {
      rc.addEventListener('mouseenter', function () {
        var r = ds[+rc.getAttribute('data-i')], bx = sv.getBoundingClientRect();
        tp.style.left = ((+rc.getAttribute('x') + bw / 2) / W * bx.width) + 'px'; tp.style.top = (+rc.getAttribute('y') / H * bx.height) + 'px'; tp.style.opacity = 1;
        tp.innerHTML = '<b>' + r.a + '–' + r.b + '</b> với ' + E(r.ban.ten) + '<br>' + LOAI[r.l][0] + ' · ' + gio(r.luc) + ' ' + ngay(r.luc);
      });
      rc.addEventListener('mouseleave', function () { tp.style.opacity = 0; });
      rc.addEventListener('click', function () { moTran(ds[+rc.getAttribute('data-i')].id); });
    });
  }
  function bdVanh(el, ds) {
    var ks = ['xh', 'giai', 'gh', 'gv'], n = ds.length || 1, R = 62, C = 2 * Math.PI * R, o = 0;
    var s = '<svg viewBox="0 0 160 160" style="width:150px;flex:none"><circle cx="80" cy="80" r="' + R + '" fill="none" stroke="#EEF3F2" stroke-width="20"/>';
    ks.forEach(function (k) {
      var f = ds.filter(function (r) { return r.l === k; }).length / n; if (!f) return;
      s += '<circle cx="80" cy="80" r="' + R + '" fill="none" stroke="' + LOAI[k][2] + '" stroke-width="20" stroke-dasharray="' + Math.max(0, f * C - 2) + ' ' + C + '" stroke-dashoffset="' + (-o * C) + '" transform="rotate(-90 80 80)"/>'; o += f;
    });
    s += '<text x="80" y="80" text-anchor="middle" font-size="28" font-weight="900" fill="#16232A">' + so(ds.length) + '</text><text x="80" y="99" text-anchor="middle" font-size="11" font-weight="700" fill="#8AA09C">TRẬN</text></svg>';
    var dsh = '<div style="flex:1;display:grid;gap:10px;min-width:0">' + ks.map(function (k) {
      var o2 = dem(ds.filter(function (r) { return r.l === k; }));
      return '<div><div style="display:flex;justify-content:space-between;gap:8px;font:700 12.5px var(--font)"><span class="hgd-loai" style="--c:' + LOAI[k][1] + ';color:var(--chu)">' + LOAI[k][0] + '</span><span>' + o2.n + ' trận' + (o2.n ? ' · <b style="color:var(--thang)">' + o2.ty + '%</b> thắng' : '') + '</span></div><div style="margin-top:6px">' + wdl(o2) + '</div></div>';
    }).join('') + '</div>';
    el.innerHTML = '<div style="display:flex;gap:20px;align-items:center">' + s + dsh + '</div>';
  }
  function bdNhiet(el, ds) {
    var dm = {}; ds.forEach(function (r) { var k = new Date(r.luc).toDateString(); dm[k] = (dm[k] || 0) + 1; });
    var cuoi = new Date(); cuoi.setHours(0, 0, 0, 0);
    var dau = new Date(cuoi.getTime() - (13 * 7 - 1) * NG); while (dau.getDay() !== 1) dau = new Date(dau.getTime() - NG);
    var THU = ['T2', '', 'T4', '', 'T6', '', 'CN'], mau = ['#EEF3F2', '#C7EDE5', '#7FD3C2', '#2FB39B', '#0E7C6E'], best = [0, 0];
    var s = '<div class="hgd-nhiet">';
    for (var h = 0; h < 7; h++) {
      s += '<span>' + THU[h] + '</span>';
      for (var c = 0; c < 13; c++) {
        var d = new Date(dau.getTime() + (c * 7 + h) * NG + 3600e3); d.setHours(0, 0, 0, 0);
        var n = dm[d.toDateString()] || 0, lv = n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : 4;
        if (n > best[0]) best = [n, d.getTime()];
        s += '<i title="' + ngay(d.getTime()) + ': ' + n + ' trận" style="background:' + (d > cuoi ? 'transparent' : mau[lv]) + '"></i>';
      }
    }
    s += '</div><div class="hgd-nhiet-chu"><span>13 tuần gần nhất' + (best[0] ? ' · ngày chăm nhất: <b>' + best[0] + ' trận</b> (' + ngay(best[1]) + ')' : '') + '</span><span class="mau">Ít' + mau.map(function (m) { return '<i style="background:' + m + '"></i>'; }).join('') + 'Nhiều</span></div>';
    el.innerHTML = s;
  }
  function bdDiem(el, xs, M) {
    if (xs.length < 2) { el.innerHTML = '<div class="hgd-rong">' + (xs.length ? 'Mới có 1 trận có điểm — đấu thêm để thấy đường điểm.' : 'Chưa có trận có điểm hạng mùa này (đang phân hạng hoặc chưa đấu).') + '</div>'; return; }
    var W = 640, H = 250, L = 44, R = 12, T = 12, B = 26;
    var ds = xs.map(function (r) { return r.xh.diem; }), lo = Math.min.apply(null, ds), hi = Math.max.apply(null, ds), pad = Math.max(40, (hi - lo) * .15);
    var mn = Math.max(0, Math.floor((lo - pad) / 50) * 50), mx = Math.ceil((hi + pad) / 50) * 50;
    var X = function (i) { return L + i / (xs.length - 1) * (W - L - R); }, Y = function (d) { return T + (1 - (d - mn) / (mx - mn)) * (H - T - B); };
    var sc = sanCac(M), s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
    sc.forEach(function (h, j) {
      var a = Math.max(h[1], mn), b = Math.min(j < sc.length - 1 ? sc[j + 1][1] : 1e9, mx); if (b <= a) return;
      var c = HANG[h[0]][1];
      s += '<rect x="' + L + '" y="' + Y(b) + '" width="' + (W - L - R) + '" height="' + (Y(a) - Y(b)) + '" fill="' + c + '" opacity=".08"/>';
      if (Y(a) - Y(b) > 16) s += '<text class="hgd-bang-chu" x="' + (L + 8) + '" y="' + (Y(b) + 13) + '" fill="' + c + '">' + HANG[h[0]][0].toUpperCase() + '</text>';
      if (h[1] > mn) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(a) + '" y2="' + Y(a) + '" stroke="' + c + '" stroke-opacity=".4" stroke-dasharray="3 4"/><text class="hgd-truc" x="' + (L - 6) + '" y="' + (Y(a) + 3) + '" text-anchor="end">' + so(a) + '</text>';
    });
    s += '<text class="hgd-truc" x="' + (L - 6) + '" y="' + (Y(mn) + 3) + '" text-anchor="end">' + so(mn) + '</text>';
    var p = xs.map(function (r, i) { return X(i).toFixed(1) + ',' + Y(r.xh.diem).toFixed(1); }).join(' ');
    s += '<defs><linearGradient id="hgdGd" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3B82F6" stop-opacity=".28"/><stop offset="1" stop-color="#3B82F6" stop-opacity="0"/></linearGradient></defs>';
    s += '<polygon points="' + L + ',' + (H - B) + ' ' + p + ' ' + X(xs.length - 1) + ',' + (H - B) + '" fill="url(#hgdGd)"/><polyline points="' + p + '" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linejoin="round"/>';
    var cao = 0; xs.forEach(function (r, i) { if (r.xh.diem > xs[cao].xh.diem) cao = i; });
    s += '<circle cx="' + X(cao) + '" cy="' + Y(xs[cao].xh.diem) + '" r="5" fill="#fff" stroke="#E0A11B" stroke-width="2.5"/><text x="' + Math.min(W - R - 40, Math.max(L + 40, X(cao))) + '" y="' + (Y(xs[cao].xh.diem) - 10) + '" text-anchor="middle" font-size="10.5" font-weight="800" fill="#B7791F">Cao nhất ' + so(xs[cao].xh.diem) + '</text>';
    s += '<circle cx="' + X(xs.length - 1) + '" cy="' + Y(xs[xs.length - 1].xh.diem) + '" r="5.5" fill="#2563EB" stroke="#fff" stroke-width="2"/>';
    var nhan = xs.length > 2 ? [0, Math.floor(xs.length / 2), xs.length - 1] : [0, xs.length - 1];
    nhan.forEach(function (i) { s += '<text class="hgd-truc" x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + ngay(xs[i].luc) + '</text>'; });
    s += '<line class="vd" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="#16232A" stroke-opacity=".25" opacity="0"/><circle class="cd" r="5" fill="#2563EB" stroke="#fff" stroke-width="2" opacity="0"/>';
    s += '<rect class="bat" x="' + L + '" y="0" width="' + (W - L - R) + '" height="' + H + '" fill="transparent" style="cursor:pointer"/></svg>';
    el.innerHTML = s;
    var sv = el.querySelector('svg'), tp = tip(el), v = el.querySelector('.vd'), c = el.querySelector('.cd'), bat = el.querySelector('.bat'), cur = -1;
    bat.addEventListener('mousemove', function (e) {
      var bx = sv.getBoundingClientRect(), x = (e.clientX - bx.left) / bx.width * W, i = Math.round((x - L) / (W - L - R) * (xs.length - 1));
      i = cur = Math.max(0, Math.min(xs.length - 1, i));
      var r = xs[i], d = r.xh.diem; v.setAttribute('x1', X(i)); v.setAttribute('x2', X(i)); v.setAttribute('opacity', 1); c.setAttribute('cx', X(i)); c.setAttribute('cy', Y(d)); c.setAttribute('opacity', 1);
      tp.style.left = (X(i) / W * bx.width) + 'px'; tp.style.top = (Y(d) / H * bx.height) + 'px'; tp.style.opacity = 1;
      tp.innerHTML = '<b>' + so(d) + '</b> điểm<br>' + ((r.xh.doi || 0) >= 0 ? '+' : '−') + Math.abs(r.xh.doi || 0) + ' sau trận với ' + E(r.ban.ten) + ' (' + r.a + '–' + r.b + ')<br><span style="opacity:.7">' + gio(r.luc) + ' ' + ngay(r.luc) + ' · bấm xem trận</span>';
    });
    bat.addEventListener('mouseleave', function () { tp.style.opacity = 0; v.setAttribute('opacity', 0); c.setAttribute('opacity', 0); });
    bat.addEventListener('click', function () { if (cur >= 0) moTran(xs[cur].id); });
  }

  // ---------- TỔNG QUAN ----------
  function veTong(el) {
    var D = S.D, ds = D.tran, o = dem(ds), tuan = ds.filter(function (r) { return r.luc > Date.now() - 7 * NG; }).length;
    var tg = ds.reduce(function (s, r) { return s + r.dai; }, 0), tb = ds.length ? ds.reduce(function (s, r) { return s + r.a; }, 0) / ds.length : 0;
    var thang30 = ds.filter(function (r) { return r.luc > Date.now() - 30 * NG; }), tb30 = thang30.length ? thang30.reduce(function (s, r) { return s + r.a; }, 0) / thang30.length : 0;
    var LOC = [['', 'Tất cả'], ['xh', 'Xếp hạng'], ['giai', 'Đấu giải'], ['gh', 'Giao hữu'], ['gv', 'Với thầy']];
    var loc = ds.filter(function (r) { return !S.loc || r.l === S.loc; });
    el.innerHTML = '<div class="hgd-luoi hgd-c4">' +
        oso(IC.kiem, '#0E7C6E', so(o.n), 'Trận đã đấu', tuan ? '<span class="hgd-len">+' + tuan + ' tuần này</span>' : 'tuần này chưa đấu') +
        oso(IC.lua, '#12A58F', o.ty + '%', 'Tỉ lệ thắng', o.t + 'T · ' + o.h + 'H · ' + o.b + 'B') +
        oso(IC.chu, '#8B5CF6', le1(tb), 'Điểm TB mỗi trận', thang30.length ? '30 ngày qua ' + le1(tb30) : '') +
        oso(IC.gio, '#E07B2C', thoiLuong(tg), 'Tổng thời gian đấu', ds.length ? '≈ ' + le1(tg / ds.length / 60000) + ' phút/trận' : '') + '</div>' +
      '<div class="hgd-luoi hgd-c2">' + the('Phong độ 30 trận gần nhất', 'Mỗi cột = một trận · cao = thắng cách biệt lớn · rê chuột xem, bấm mở trận', '<div class="hgd-bd" data-bd="phong"></div>') +
        the('Theo chế độ', 'Số trận và tỉ lệ thắng mỗi chế độ', '<div data-bd="vanh"></div>') + '</div>' +
      '<div class="hgd-luoi hgd-c2">' + the('Độ chăm đấu', 'Số trận mỗi ngày', '<div data-bd="nhiet"></div>') +
        the('Kỷ lục của em', 'Từ dài nhất + tốc độ tính trên 25 trận gần nhất', '<div class="hgd-kl" data-kl></div>') + '</div>' +
      the('Toàn bộ lịch sử trận', so(loc.length) + ' trận · mới nhất trước · bấm dòng xem chi tiết trận', bangTran(loc, true, true),
        '<div class="hgd-chips" data-loc>' + LOC.map(function (x) { return '<button type="button" data-l="' + x[0] + '"' + (S.loc === x[0] ? ' class="chon"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>');
    bdPhong(el.querySelector('[data-bd="phong"]'), ds); bdVanh(el.querySelector('[data-bd="vanh"]'), ds); bdNhiet(el.querySelector('[data-bd="nhiet"]'), ds);
    veKyLuc();
    $$('[data-loc] button', el).forEach(function (b) { b.onclick = function () { S.loc = b.getAttribute('data-l'); S.soDong = 40; var y = el.scrollTop; ve(); el.scrollTop = y; }; });
  }
  function veKyLuc() {
    var el = S && S.nen.querySelector('[data-kl]'); if (!el) return;
    var ds = S.D.tran, cu = ds.slice().reverse(), cao = null, cach = null, ch = [0, 0, 0], c = 0, c0 = 0;
    cu.forEach(function (r) {
      if (!cao || r.a > cao.a) cao = r;
      if (r.kq === 'T' && (!cach || r.a - r.b > cach.a - cach.b)) cach = r;
      if (r.kq === 'T') { if (!c) c0 = r.luc; c++; if (c > ch[0]) ch = [c, c0, r.luc]; } else c = 0;
    });
    var bo = ds.filter(function (r) { return r.bo; }).length, dai = null, nhanh = null;
    (S.tu || []).forEach(function (x) {
      x.w.forEach(function (w) { if (!dai || w.length > dai.w.length) dai = { w: w, r: x.r }; });
      var p = x.n / Math.max(.5, x.r.dai / 60000); if (x.n && (!nhanh || p > nhanh.p)) nhanh = { p: p, r: x.r };
    });
    var o = function (t, b, phu) { return '<div><small>' + t + '</small><b>' + b + '</b><em>' + (phu || '&nbsp;') + '</em></div>'; };
    el.innerHTML = !ds.length ? '<div class="hgd-rong" style="grid-column:1/-1">Chưa có trận.</div>' :
      o('Điểm cao nhất 1 trận', cao ? cao.a : '—', cao ? 'vs ' + E(cao.ban.ten) + ' · ' + ngay(cao.luc) : '') +
      o('Chuỗi thắng dài nhất', ch[0] ? ch[0] + ' trận' : '—', ch[0] ? ngay(ch[1]) + (ch[0] > 1 ? '–' + ngay(ch[2]) : '') : '') +
      o('Thắng cách biệt nhất', cach ? '+' + (cach.a - cach.b) : '—', cach ? cach.a + '–' + cach.b + ' · vs ' + E(cach.ban.ten) : '') +
      o('Từ dài nhất', dai ? E(dai.w) : S.tu ? '—' : '…', dai ? dai.w.length + ' chữ · ' + ngay(dai.r.luc) : S.tu ? '' : 'đang đọc') +
      o('Tốc độ nhanh nhất', nhanh ? le1(nhanh.p) + ' từ/phút' : S.tu ? '—' : '…', nhanh ? LOAI[nhanh.r.l][0] + ' · ' + ngay(nhanh.r.luc) : '') +
      o('Trận bỏ dở', bo, bo ? 'bỏ trận / mất mạng' : 'chưa bỏ trận nào');
  }

  // ---------- XẾP HẠNG ----------
  function veXh(el) {
    var D = S.D, ds = D.tran.filter(function (r) { return r.l === 'xh'; }), h = hangHien(D), M = D.muaHien, e = M && M.em;
    var muaDs = M ? ds.filter(function (r) { return r.mua === M.id; }) : [], o = dem(muaDs);
    var xs = muaDs.filter(function (r) { return r.xh && r.xh.diem != null; }).slice().reverse();
    var cao = null; xs.forEach(function (r) { if (!cao || r.xh.diem > cao.xh.diem) cao = r; });
    var tbT = xs.filter(function (r) { return r.kq === 'T'; }), tbB = xs.filter(function (r) { return r.kq === 'B'; });
    var tb = function (a) { return a.length ? a.reduce(function (s, r) { return s + (r.xh.doi || 0); }, 0) / a.length : null; };
    var mau = h && h.ma ? HANG[h.ma][1] : '#8AA09C';
    var ten = M ? (M.ten || 'Mùa này') : 'Mùa này';
    var cacMua = D.mua.filter(function (m) { return m.em; }).map(function (m) {
      var x = m.em, ma = x.diem != null ? x.s || hangDiem(x.diem) : '', c = ma ? HANG[ma][1] : '#B8C6C3';
      return '<div>' + khien(c, 40) + '<b>' + E(m.ten || m.id) + '</b><small>' + (ma ? E(HANG[ma][0]) + ' · ' + so(x.diem) + (x.hang ? ' · #' + x.hang : '') : 'Phân hạng ' + (x.xl || 0) + '/5') +
        '</small><small>' + (laMuaHien(m) ? 'Đang đấu' : 'Đã chốt') + ' · ' + (x.tran || 0) + ' trận</small></div>';
    }).join('');
    el.innerHTML = '<div class="hgd-luoi hgd-c4">' +
        oso(khien(mau, 24), mau, h && !h.cho ? so(e.diem) : '—', 'Điểm hạng ' + E(ten), h && h.ma ? HANG[h.ma][0] : h && h.cho ? 'phân hạng ' + h.xl + '/5' : 'chưa đấu') +
        oso(IC.cup, '#E0A11B', e && e.hang ? '#' + e.hang : '—', 'Thứ hạng toàn trường', M && M.soEm ? '/ ' + so(M.soEm) + ' em có hạng' : '') +
        oso(IC.lua, '#8B5CF6', e && e.cao != null ? so(e.cao) : '—', 'Cao nhất mùa này', cao ? gio(cao.luc) + ' ' + ngay(cao.luc) : '') +
        oso(IC.kiem, '#12A58F', o.ty + '%', 'Thắng mùa này', o.n + ' trận') + '</div>' +
      '<div class="hgd-luoi hgd-c2">' + the('Đường điểm hạng ' + E(ten), 'Sau 5 trận phân hạng · nền màu = khoảng điểm từng hạng · rê chuột xem, bấm mở trận', '<div class="hgd-bd" data-bd="diem"></div>',
          xs.length ? '<span class="hgd-nhan" style="background:#EAF1FE;color:#2563EB">' + xs.length + ' trận có điểm</span>' : '') +
        '<div style="display:grid;gap:14px;align-content:start">' +
          the(E(ten) + (M ? ' · ' + ngay(M.tu) + ' – ' + ngay(M.den) : ''), 'Thắng / hoà / thua trận xếp hạng mùa này', wdl(o) + wdlChu(o) +
            '<div class="hgd-o4"><div>Điểm TB khi thắng<br><b class="hgd-len">' + (tb(tbT) != null ? '+' + le1(tb(tbT)) : '—') + '</b></div><div>Điểm TB khi thua<br><b class="hgd-xuong">' + (tb(tbB) != null ? '−' + le1(Math.abs(tb(tbB))) : '—') + '</b></div>' +
            '<div>🛡 Khiên còn<br><b>' + (e ? (e.baoVe || 0) + ' lần' : '—') + '</b></div><div>Chuỗi hiện tại<br><b>' + (e && e.chuoi ? 'Thắng ' + e.chuoi : '—') + '</b></div>' +
            '<div>Phân hạng<br><b>' + (e ? (e.xlThang || 0) + 'T · ' + Math.max(0, (Math.min(e.xl || 0, 5)) - (e.xlThang || 0)) + 'B' : '—') + '</b></div><div>Ngày đấu liền nhất<br><b>' + (e && e.ddMax ? e.ddMax + ' ngày' : '—') + '</b></div></div>') +
          the('Các mùa', 'Hạng của em mỗi mùa', cacMua ? '<div class="hgd-mua">' + cacMua + '</div>' : '<div class="hgd-rong">Chưa đấu mùa nào.</div>') + '</div></div>' +
      the('Lịch sử trận xếp hạng', so(ds.length) + ' trận (mọi mùa) · bấm dòng xem chi tiết', bangTran(ds, true, false));
    bdDiem(el.querySelector('[data-bd="diem"]'), xs, M);
  }

  // ---------- ĐẤU GIẢI ----------
  function tinhGiai(D) {
    var GG = window.GiaiGhi;
    return Object.keys(D.giai).map(function (gid) {
      var g = D.giai[gid], tr = D.tran.filter(function (r) { return r.giai === gid; }), o = dem(tr.filter(function (r) { return !r.khong; }));
      var x = { id: gid, ten: g.ten || 'Giải', tu: g.tu || (tr[tr.length - 1] || {}).luc || 0, den: g.den || 0, lop: g.lopEm || '', t: o.t, h: o.h, b: o.b, n: tr.length, hang: 0, tong: 0, sao: 0, dang: !g.dong && Date.now() < (g.den || 0) };
      var em = (g.bang && g.bang.em) || {};
      if (GG && Object.keys(em).length) {
        var rows = Object.keys(em).map(function (u) { return { uid: u, ten: em[u].ten || '', r: em[u] }; }).filter(function (r) { return GG.soTran(r.r) > 0; });
        var xep = GG.hangCung(GG.sapXep(rows)), toi = xep.filter(function (r) { return D.uids.indexOf(r.uid) >= 0; })[0];
        x.tong = xep.length;
        if (toi) { x.hang = toi.hang; x.t = toi.r.t || 0; x.h = toi.r.h || 0; x.b = toi.r.b || 0; }
        if (g.daThuong && x.hang && x.hang <= 3) x.sao = (g.sao || [])[x.hang - 1] || 0;
      }
      return x;
    }).sort(function (a, b) { return b.tu - a.tu; });
  }
  function bdGiai(el, gs) {
    var ds = gs.filter(function (g) { return g.hang; }).slice(0, 10).reverse();
    if (!ds.length) { el.innerHTML = '<div class="hgd-rong">Chưa có hạng giải nào.</div>'; return; }
    var W = 560, H = 190, L = 34, B = 40, T = 16, bw = (W - L - 10) / ds.length, mx = Math.max(5, Math.max.apply(null, ds.map(function (g) { return g.tong || g.hang; })));
    var Y = function (h) { return T + (h - 1) / Math.max(1, mx - 1) * (H - T - B); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
    [1, Math.ceil(mx / 3), Math.ceil(mx * 2 / 3), mx].filter(function (v, i, a) { return a.indexOf(v) === i; }).forEach(function (h) { s += '<line x1="' + L + '" x2="' + (W - 10) + '" y1="' + Y(h) + '" y2="' + Y(h) + '" stroke="#EEF3F2"/><text class="hgd-truc" x="' + (L - 6) + '" y="' + (Y(h) + 3) + '" text-anchor="end">#' + h + '</text>'; });
    if (ds.length > 1) s += '<polyline points="' + ds.map(function (g, i) { return (L + i * bw + bw / 2) + ',' + Y(g.hang); }).join(' ') + '" fill="none" stroke="#E07B2C" stroke-width="2.5"/>';
    ds.forEach(function (g, i) {
      var x = L + i * bw + bw / 2, c = g.hang === 1 ? '#E0A11B' : g.hang === 2 ? '#94A3B8' : g.hang === 3 ? '#C27C4A' : '#E07B2C', ten = g.ten.length > 14 ? g.ten.slice(0, 13) + '…' : g.ten;
      s += '<circle cx="' + x + '" cy="' + Y(g.hang) + '" r="' + (g.hang <= 3 ? 12 : 7) + '" fill="' + c + '" stroke="#fff" stroke-width="2.5"><title>' + E(g.ten) + ' · hạng ' + g.hang + '/' + g.tong + '</title></circle>' +
        (g.hang <= 3 ? '<text x="' + x + '" y="' + (Y(g.hang) + 4) + '" text-anchor="middle" font-size="11" font-weight="900" fill="#fff" pointer-events="none">' + g.hang + '</text>' : '') +
        '<text class="hgd-truc" x="' + x + '" y="' + (H - 22) + '" text-anchor="middle" style="font-weight:800;fill:#5F7370">' + E(ten) + '</text><text class="hgd-truc" x="' + x + '" y="' + (H - 8) + '" text-anchor="middle">#' + g.hang + '/' + g.tong + '</text>';
    });
    el.innerHTML = s + '</svg>';
  }
  function veGiai(el) {
    var D = S.D, ds = D.tran.filter(function (r) { return r.l === 'giai'; }), o = dem(ds), gs = D.dsGiai;
    var v = [0, 0, 0]; gs.forEach(function (g) { if (g.hang >= 1 && g.hang <= 3) v[g.hang - 1]++; });
    var sao = gs.reduce(function (s, g) { return s + g.sao; }, 0), mc = { 1: '#E0A11B', 2: '#94A3B8', 3: '#C27C4A' };
    el.innerHTML = '<div class="hgd-luoi hgd-c4">' +
        oso(IC.cup, '#E07B2C', gs.length, 'Giải đã dự', gs.filter(function (g) { return g.dang; }).length ? gs.filter(function (g) { return g.dang; }).length + ' đang diễn ra' : '') +
        oso(khien('#E0A11B', 22), '#E0A11B', v.join(' · '), 'Vàng · Bạc · Đồng', (v[0] + v[1] + v[2]) + ' lần lên bục') +
        oso(IC.kiem, '#12A58F', o.ty + '%', 'Thắng trận giải', o.n + ' trận') +
        oso('<span style="font-size:18px">⭐</span>', '#E0A11B', so(sao), 'Sao thưởng top 3', 'theo mức thưởng của giải') + '</div>' +
      '<div class="hgd-luoi hgd-c2">' + the('Các giải đã dự', 'Hạng trong bảng lớp · bấm mở pop-up giải',
          gs.length ? gs.map(function (g) {
            var c = mc[g.hang] || '#DCE5E3';
            return '<div class="hgd-giai" data-giai="' + E(g.id) + '" data-lop="' + E(g.lop) + '"><span class="hgd-huy" style="background:' + c + (g.hang > 3 || !g.hang ? ';color:#5F7370' : '') + '">' + (g.hang ? (g.hang <= 3 ? '#' : '') + g.hang : '—') + '</span>' +
              '<div><b>' + E(g.ten) + (g.dang ? ' <span class="hgd-nhan" style="background:#E7F7EE;color:#15803D">ĐANG DIỄN RA</span>' : '') + '</b><small>' + (g.tu ? ngay(g.tu) : '') + (g.den ? '–' + ngay(g.den) : '') + (g.lop ? ' · bảng ' + E(g.lop) : '') + (g.hang ? ' · hạng ' + g.hang + '/' + g.tong : '') + '</small></div>' +
              '<div>' + wdl({ n: g.t + g.h + g.b, t: g.t, h: g.h, b: g.b }) + '<span class="wdl-chu">' + g.t + 'T · ' + g.h + 'H · ' + g.b + 'B</span></div><span class="sao">' + (g.sao ? '+' + g.sao + ' ⭐' : '—') + '</span></div>';
          }).join('') : '<div class="hgd-rong">Em chưa dự giải nào.</div>') +
        the('Thứ hạng qua các giải', 'Càng cao càng tốt · huy chương = lên bục', '<div data-bd="giai"></div><div style="margin-top:10px;padding-top:12px;border-top:1px solid var(--vien)"><b style="font:800 13px var(--font)">Đối thủ trong giải</b>' + doiThu(ds, true) + '</div>') + '</div>' +
      the('Lịch sử trận đấu giải', so(ds.length) + ' trận · bấm dòng xem chi tiết', bangTran(ds, false, false));
    bdGiai(el.querySelector('[data-bd="giai"]'), gs);
  }

  // ---------- GIAO HỮU ----------
  function veGh(el) {
    var D = S.D, ds = D.tran.filter(function (r) { return r.l === 'gh' || r.l === 'gv'; }), o = dem(ds), gv = dem(ds.filter(function (r) { return r.l === 'gv'; }));
    var ban = {}; ds.forEach(function (r) { if (!r.ban.thay) ban[r.ban.uid || r.ban.ten] = 1; });
    var tuan = ds.filter(function (r) { return r.luc > Date.now() - 7 * NG; }).length;
    el.innerHTML = '<div class="hgd-luoi hgd-c4">' +
        oso(IC.kiem, '#1C7FD6', so(o.n), 'Trận giao hữu', tuan ? tuan + ' trận tuần này' : '') +
        oso(IC.lua, '#12A58F', o.ty + '%', 'Tỉ lệ thắng', o.t + 'T · ' + o.h + 'H · ' + o.b + 'B') +
        oso(IC.ban, '#1C7FD6', Object.keys(ban).length, 'Bạn đã đấu cùng', '') +
        oso(av('Thầy Andrew', '', true, 24), '#0F7A6C', gv.n ? gv.t + '/' + gv.n : '—', 'Thắng thầy Andrew', gv.n ? 'hoà ' + gv.h + ' · thua ' + gv.b : 'chưa đấu với thầy') + '</div>' +
      '<div class="hgd-luoi hgd-c2">' + the('Đối đầu với từng bạn', 'Thắng–hoà–thua · người hay gặp nhất trước', doiThu(ds)) +
        the('Phong độ giao hữu', '30 trận gần nhất', '<div class="hgd-bd" data-bd="phong"></div><div style="margin-top:12px">' + wdl(o) + wdlChu(o) + '</div>') + '</div>' +
      the('Lịch sử trận giao hữu', so(ds.length) + ' trận · bấm dòng xem chi tiết', bangTran(ds, false, false));
    bdPhong(el.querySelector('[data-bd="phong"]'), ds);
  }

  // ---------- LUYỆN TẬP ----------
  var MAY = { 1: 'Máy chậm', 2: 'Máy vừa', 3: 'Máy nhanh' };
  function veLuyen(el) {
    var ds = S.D.luyen.slice().sort(function (a, b) { return b.luc - a.luc; });
    var ghi = '<div class="hgd-ghi">' + IC.canh + '<div><b>Lượt luyện tập bắt đầu được ghi từ 31/10/2026.</b> Mỗi ván luyện với máy chơi hết giờ là một lượt; thoát giữa chừng không ghi.</div></div>';
    if (!ds.length) { el.innerHTML = ghi + '<div class="hgd-the" style="margin-top:14px"><div class="hgd-rong">Em chưa có lượt luyện tập nào từ ngày bắt đầu ghi.</div></div>'; return; }
    var tg = ds.reduce(function (s, x) { return s + (x.lam || 0); }, 0), dung = ds.reduce(function (s, x) { return s + (x.dung || 0); }, 0), sai = ds.reduce(function (s, x) { return s + (x.sai || 0); }, 0);
    var tocDo = function (x) { return (x.dung || 0) / Math.max(.5, (x.lam || 60000) / 60000); };
    var cu = ds.slice().reverse(), dau5 = cu.slice(0, 5), cuoi5 = cu.slice(-5), tb = function (a) { return a.reduce(function (s, x) { return s + tocDo(x); }, 0) / Math.max(1, a.length); };
    var o = { n: ds.length, t: 0, h: 0, b: 0 }; ds.forEach(function (x) { o[x.kq === 'thang' ? 't' : x.kq === 'hoa' ? 'h' : 'b']++; });
    var bo = {}; ds.forEach(function (x) { var k = x.bo === 'g' ? (x.boTen || 'Bộ từ giải') : '16 chữ ngẫu nhiên', v = bo[k] = bo[k] || { n: 0, d: 0 }; v.n++; v.d += x.diem || 0; });
    var boDs = Object.keys(bo).map(function (k) { return [k, bo[k].n, bo[k].d / bo[k].n]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 6), boMax = boDs.length ? boDs[0][1] : 1;
    var may = [1, 2, 3].map(function (m) { var a = ds.filter(function (x) { return x.may === m; }), w = a.filter(function (x) { return x.kq === 'thang'; }).length; return { m: m, n: a.length, w: w }; });
    var tuan = ds.filter(function (x) { return x.luc > Date.now() - 7 * NG; }).length;
    el.innerHTML = ghi + '<div class="hgd-luoi hgd-c4">' +
        oso(IC.ngon, '#2BAE66', so(ds.length), 'Lượt luyện', tuan ? '<span class="hgd-len">+' + tuan + ' tuần này</span>' : '') +
        oso(IC.gio, '#2BAE66', thoiLuong(tg), 'Tổng thời gian luyện', 'TB ' + le1(tg / ds.length / 60000) + ' phút/lượt') +
        oso(IC.chu, '#8B5CF6', le1(tb(ds)), 'Từ đúng mỗi phút', ds.length >= 6 ? (tb(cuoi5) >= tb(dau5) ? '<span class="hgd-len">↑' : '<span class="hgd-xuong">↓') + ' từ ' + le1(tb(dau5)) + ' lúc đầu</span>' : '') +
        oso(IC.kiem, '#12A58F', (dung + sai ? Math.round(dung * 100 / (dung + sai)) : 0) + '%', 'Độ chính xác', so(dung) + ' đúng · ' + so(sai) + ' sai') + '</div>' +
      '<div class="hgd-luoi hgd-c2">' + the('Tốc độ qua từng lượt luyện', 'Từ đúng mỗi phút — thấy em có tiến bộ không', '<div class="hgd-bd" data-bd="luyen"></div>') +
        '<div style="display:grid;gap:14px;align-content:start">' + the('Bộ từ luyện nhiều nhất', 'Số lượt · điểm TB', boDs.map(function (x) { return '<div class="hgd-dt" style="grid-template-columns:minmax(0,1fr) 110px 70px"><b style="font:700 13px var(--font);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + E(x[0]) + '</b><div class="hgd-wdl"><i style="width:' + (x[1] / boMax * 100) + '%;background:#2BAE66"></i></div><div class="so">' + x[1] + ' · ' + le1(x[2]) + 'đ</div></div>'; }).join('')) +
          the('Thắng máy', wdlChu(o).replace('hgd-cwdl', 'hgd-cwdl" style="margin:0'), may.map(function (x) { return '<div class="hgd-dt" style="grid-template-columns:minmax(0,1fr) 110px 70px"><span class="hgd-ng">' + IC.may + '<b>' + MAY[x.m] + '</b></span><div class="hgd-wdl"><i style="width:' + (x.n ? x.w / x.n * 100 : 0) + '%;background:var(--thang)"></i></div><div class="so">' + (x.n ? x.w + '/' + x.n : '—') + '</div></div>'; }).join('')) + '</div></div>' +
      the('Các lượt luyện', so(ds.length) + ' lượt · mới nhất trước', '<table class="hgd-bang"><thead><tr><th>Lúc</th><th>Đối thủ</th><th>Bộ từ</th><th class="so">Tỉ số</th><th>KQ</th><th class="so">Từ đúng</th><th class="so">Từ/phút</th></tr></thead><tbody>' +
        ds.slice(0, S.soDong).map(function (x) {
          var k = x.kq === 'thang' ? 'T' : x.kq === 'hoa' ? 'H' : 'B';
          return '<tr><td><b>' + gio(x.luc) + '</b> <span class="mo">' + ngay(x.luc) + '</span></td><td>' + MAY[x.may] + ' · ' + x.phut + ' phút</td><td>' + E(x.bo === 'g' ? x.boTen || 'Bộ từ giải' : '16 chữ') + '</td><td class="so hgd-ty">' + (x.diem || 0) + '<s>–</s>' + (x.dm || 0) + '</td><td><span class="hgd-kq ' + k + '">' + k + '</span></td><td class="so">' + (x.dung || 0) + (x.sai ? ' <span class="mo">· ' + x.sai + ' sai</span>' : '') + (x.dai ? ' <span class="mo">· ' + E(x.dai) + '</span>' : '') + '</td><td class="so">' + le1(tocDo(x)) + '</td></tr>';
        }).join('') + '</tbody></table>' + (ds.length > S.soDong ? '<button type="button" class="hgd-them" data-them>Xem thêm (còn ' + so(ds.length - S.soDong) + ')</button>' : ''));
    // đường tốc độ
    var e2 = el.querySelector('[data-bd="luyen"]'), W = 640, H = 180, pts = cu.map(tocDo);
    if (pts.length < 2) { e2.innerHTML = '<div class="hgd-rong">Cần ít nhất 2 lượt để vẽ đường.</div>'; return; }
    var mx = Math.max(4, Math.ceil(Math.max.apply(null, pts) + 1)), X = function (i) { return 30 + i / (pts.length - 1) * (W - 50); }, Y = function (v) { return H - 22 - v / mx * (H - 40); };
    var n = pts.length, sx = 0, sy = 0, sxy = 0, sxx = 0; pts.forEach(function (v, i) { sx += i; sy += v; sxy += i * v; sxx += i * i; });
    var k = n * sxx - sx * sx ? (n * sxy - sx * sy) / (n * sxx - sx * sx) : 0, b0 = (sy - k * sx) / n;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
    [0, mx / 2, mx].forEach(function (v) { s += '<line x1="30" x2="' + (W - 20) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#EEF3F2"/><text class="hgd-truc" x="24" y="' + (Y(v) + 3) + '" text-anchor="end">' + le1(v) + '</text>'; });
    s += '<line x1="' + X(0) + '" x2="' + X(n - 1) + '" y1="' + Y(b0) + '" y2="' + Y(b0 + k * (n - 1)) + '" stroke="#2BAE66" stroke-dasharray="5 5" opacity=".6"/>';
    s += '<polyline points="' + pts.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ') + '" fill="none" stroke="#2BAE66" stroke-width="2.5" stroke-linejoin="round"/>';
    pts.forEach(function (v, i) { s += '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="3" fill="#2BAE66"><title>' + ngay(cu[i].luc) + ' ' + gio(cu[i].luc) + ': ' + le1(v) + ' từ/phút · ' + MAY[cu[i].may] + '</title></circle>'; });
    s += '<text class="hgd-truc" x="30" y="' + (H - 4) + '">' + ngay(cu[0].luc) + '</text><text class="hgd-truc" x="' + (W - 20) + '" y="' + (H - 4) + '" text-anchor="end">' + ngay(cu[n - 1].luc) + '</text></svg>';
    e2.innerHTML = s;
  }

  // ---------- bàn thử: số liệu mẫu cùng khuôn kho ----------
  function mau(em) {
    var r = 11, nn = function (n) { r = (r * 9301 + 49297) % 233280; return Math.floor(r / 233280 * n); };
    var BAN = [['Thiên Phúc', 'B2-A'], ['Khôi Nguyên', 'B1-B'], ['Hải Đăng', 'A2-B'], ['Minh Châu', 'B1-B'], ['Gia Huy', 'B2-B'], ['Thảo My', 'B2-B'], ['Đức Minh', 'B2-A'], ['Bảo Châu', 'B2-B']];
    var b = Date.now(), raw = [], uid = em.uid || 'toi', diem = 820, xl = 0;
    for (var i = 0; i < 160; i++) {
      var l = i % 9 === 0 ? 'gv' : ['xh', 'xh', 'xh', 'giai', 'giai', 'gh'][nn(6)], luc = b - (159 - i) * (45 * NG / 160) - nn(3e6), o = BAN[nn(BAN.length)];
      var a1 = 10 + nn(32), b1 = 10 + nn(30); if (i % 17 === 3) b1 = a1;
      var t = { id: 'm' + i, a: uid, b: l === 'gv' ? 'thay' : 'u' + nn(8), tenA: em.ten || 'Em', lopA: em.lop || 'B2-B', tenB: l === 'gv' ? 'Thầy Andrew' : o[0], lopB: l === 'gv' ? 'GV' : o[1],
        diem: { a: a1, b: b1 }, kq: { a: a1 > b1 ? 'thang' : a1 < b1 ? 'thua' : 'hoa' }, trangThai: 'xong', taoLuc: luc - 130000, xongLuc: luc, batDau: luc - 125000, ketThuc: luc - 5000, phut: 2 };
      if (l === 'gv') t.gv = 'thay';
      if (l === 'giai') { t.giai = 'g' + Math.min(3, Math.floor(i / 40)); t.lop = 'B2B'; }
      if (l === 'xh') {
        t.xh = luc > b - 7 * NG ? 'mHien' : 'mCu';
        if (t.xh === 'mHien') { xl++; if (xl <= 5) t.xhKq = { a: { diem: null, xl: xl, doi: 0 } }; else { var d0 = t.kq.a === 'thang' ? 14 + nn(12) : t.kq.a === 'hoa' ? 2 : -(6 + nn(9)); diem += d0; t.xhKq = { a: { diem: diem, doi: d0 } }; } }
        else t.xhKq = { a: { diem: 600 + i * 3, doi: t.kq.a === 'thang' ? 12 : -8 } };
      }
      if (i === 40) t.ly = 'roiA';
      raw.push(t);
    }
    var giai = {};
    ['Giải khai mạc', 'Speed Cup tuần 1', 'Speed Cup tuần 2', 'Cúp Halloween'].forEach(function (ten, j) {
      var em0 = {}; em0[uid] = { ten: em.ten, t: 6 + j, h: 1, b: 4 - j };
      for (var k = 0; k < 14; k++) em0['x' + k] = { ten: 'B' + k, t: nn(11), h: nn(2), b: nn(8) };
      giai['g' + j] = { id: 'g' + j, ten: ten, tu: b - (40 - j * 12) * NG, den: b - (37 - j * 12) * NG + (j === 3 ? 6 * NG : 0), lops: ['B2B'], lopEm: 'B2B', sao: [120, 80, 50], daThuong: j < 3, bang: { em: em0 } };
    });
    var luyen = [];
    for (var q = 0; q < 24; q++) { var dn = 12 + q + nn(10); luyen.push({ id: 'l' + q, uid: uid, luc: b - (24 - q) * NG / 2, phut: 2, may: 1 + nn(3), bo: q % 3 ? 'n' : 'g', boTen: q % 3 ? '' : 'Speed Cup 3', diem: 20 + nn(30), dm: 15 + nn(30), kq: ['thang', 'thua', 'thang', 'hoa'][nn(4)], dung: dn, sai: nn(5), dai: 'RAINBOW', lam: 120000 }); }
    var mua = [{ id: 'mHien', ten: 'Mùa 2', tu: b - 7 * NG, den: b + 21 * NG, tt: 'mo', soEm: 112, em: { diem: diem, cao: diem + 12, tran: 40, thang: 26, hoa: 2, thua: 12, chuoi: 2, baoVe: 1, xl: 5, xlThang: 4, hang: 3, s: diem >= 1100 ? 'bk' : '', ddMax: 6 } },
      { id: 'mCu', ten: 'Mùa 1', tu: b - 40 * NG, den: b - 8 * NG, tt: 'chot', em: { diem: 980, cao: 1010, tran: 60, xl: 5, hang: 6, s: '' } }];
    return Promise.resolve({ uids: [uid], raw: raw, mua: mua, giai: giai, luyen: luyen });
  }

  window.HsGd = { mo: mo, dong: dongHop };
})();
