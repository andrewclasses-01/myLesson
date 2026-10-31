/* ============================================================
   js/td-xem.js — THEO DÕI A SHOW SPEED trong hộp "Quản lý giải đấu" (dashboard, web v1.446.0, 29/10/2026).
   Mẫu thầy duyệt: D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\quan-tri-ass-v2\index.html (4 thẻ → dải + ⚙ → các tab).
   js/td-ql.js dựng khung hộp; tệp này vẽ PHẦN TAB và số liệu trên thẻ/dải:
     TdXem.TAB[the]              → [[mã tab, chữ]]   (the = gh · giai · luyen · xh)
     TdXem.thongKe(o)            → Promise { gh, giai, xh: {homNay, dang, em, bo, tong}, mua, dsGiai }   (o = { kho, laThu })
     TdXem.ve(el, o)             → vẽ tab o.tab của thẻ o.the vào el (o = { the, tab, kho, laThu, doi(tab) })

   Đọc kho (KHÔNG cần chỉ mục ghép — khoá quản trị không tạo được chỉ mục):
     · trận theo ngày: tranDau where taoLuc trong [a, b) orderBy taoLuc (một trường) — lọc loại/lớp/tên ở máy thầy.
     · chi tiết: tranDau/{id} + tranDau/{id}/tu (id `zg…`/`zhet…` = xin gợi ý/đổi bàn, bỏ qua).
     · một em: tranDau where nguoi array-contains-any [các uid của em] (gộp uid cũ hs_<id cũ> cùng tên + lớp — đánh lại số 10/2026).
     · xếp hạng mùa: xhMua/{mua}/em (cả trường). Mọi thời đại: tài liệu TỔNG `nwCauHinh/tdTong` (thầy ghi, em đăng nhập đọc —
       luật nwCauHinh có sẵn) — mỗi lần mở tab cộng dồn các trận chốt SAU mốc `moc` (tranDau where xongLuc > moc), lần đầu đọc hết.
       { moc, n{xh,giai,gh,gv}, em{uid: {ten, lop, l{xh|giai|gh|gv: [t,h,b]}, bo, cuoi}}, capNhat }
   Bàn thử (localhost + ?thu=): số liệu mẫu, không đọc kho.  Lớp CSS tiền tố `tdx-` (css/td-ql.css).
   ============================================================ */
(function () {
  'use strict';
  if (window.TdXem) return;
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var hai = function (n) { return (n < 10 ? '0' : '') + n; };
  var NG = 864e5;
  var MAU = ['#E0A11B', '#E5587A', '#12A58F', '#1C7FD6', '#8B5CF6', '#E07B2C', '#2BAE66', '#3B82F6', '#C2410C', '#0891B2'];
  var HANG = { dong: ['Đồng', '#C27C4A'], bac: ['Bạc', '#8A97A6'], vang: ['Vàng', '#E0A11B'], bk: ['Bạch kim', '#1FAE98'], kc: ['Kim cương', '#3B82F6'], ct: ['Cao thủ', '#8B5CF6'], ht: ['Huyền thoại', '#E5385A'] };
  var SUAT_MAC = [{ t: 'ht', n: 1, san: 2000 }, { t: 'ct', n: 2, san: 1600 }, { t: 'kc', n: 3, san: 1400 }, { t: 'bk', n: 6, san: 1100 }];
  var TEN_LOAI = { xh: 'XẾP HẠNG', giai: 'ĐẤU GIẢI', gh: 'GIAO HỮU', gv: 'VỚI THẦY' };
  var TAB = {
    gh: [['tran', 'Tất cả trận'], ['hs', 'Học sinh'], ['bxh', 'Bảng xếp hạng']],
    giai: [['giai', 'Giải đang chạy'], ['tran', 'Tất cả trận'], ['hs', 'Học sinh'], ['bxh', 'Bảng xếp hạng']],
    luyen: [['luyen', 'Thông tin']],
    xh: [['tran', 'Tất cả trận'], ['hs', 'Học sinh'], ['bxh', 'Bảng xếp hạng'], ['mua', 'Các mùa']]
  };
  // trạng thái xem (giữ khi đổi thẻ/tab)
  var S = { ngay: 'hom', ngayChon: '', lop: '', tim: '', bo: false, tranId: '', uid: '', loaiHs: '', muaXem: '', bxh: 'mua', cache: {}, tong: null };
  var O = null;

  // ---------- tiện ích ----------
  function laThu() { return !!(O && O.laThu); }
  function loai(t) { return t.xh ? 'xh' : t.giai ? 'giai' : t.gv ? 'gv' : 'gh'; }
  var thuoc = function (t, the) { var l = loai(t); return the === 'gh' ? (l === 'gh' || l === 'gv') : l === the; };
  function dauNgay(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function gio(ms) { var d = new Date(ms); return hai(d.getHours()) + ':' + hai(d.getMinutes()); }
  function ngayGio(ms) { var d = new Date(ms); return gio(ms) + ' ' + hai(d.getDate()) + '/' + hai(d.getMonth() + 1); }
  function so(n) { return Number(n || 0).toLocaleString('vi-VN'); }
  function tat(t) { var w = String(t || '?').trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase(); }
  function av(ten, anh, thay) {
    var mau = thay ? '#0F7A6C' : MAU[(String(ten || '').length + String(ten || '?').charCodeAt(0)) % MAU.length];
    return '<span class="tdx-av" style="background:' + mau + '">' + E(tat(ten)) + (anh ? '<img src="' + E(anh) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</span>';
  }
  function ben(t, k) {   // một bên của trận ⇒ { uid, ten, lop, anh, thay }
    var uid = t[k], thay = !!t.gv && uid === t.gv;
    return { uid: uid, ten: thay ? 'Thầy Andrew' : (k === 'a' ? t.tenA : t.tenB) || '?', lop: thay ? 'GV' : (k === 'a' ? t.lopA : t.lopB) || t.lop || '', anh: (k === 'a' ? t.anhA : t.anhB) || '', thay: thay };
  }
  function ng(b, bam) {
    return '<span class="tdx-ng' + (bam && !b.thay ? ' bam" data-hs="' + E(b.uid) + '" title="Xem hồ sơ' : '') + '">' + av(b.ten, b.anh, b.thay) + '<span><b>' + E(b.ten) + '</b><small>' + E(b.lop) + '</small></span></span>';
  }
  function tySo(t) { var d = t.diem || {}; return '<span class="tdx-ty"><i>' + (d.a || 0) + '</i><s>–</s><u>' + (d.b || 0) + '</u></span>'; }
  function coTran(t) {
    var ly = t.ly || '', ten = function (k) { return ben(t, k).ten; };
    if (t.trangThai === 'choi') return '<span class="tdx-co live">ĐANG ĐẤU</span>';
    var h = '';
    if (/^roi/.test(ly)) h += '<span class="tdx-co">' + E(ten(ly.slice(3).toLowerCase())) + ' rời trận</span>';
    else if (/^mat/.test(ly)) h += '<span class="tdx-co">' + E(ten(ly.slice(3).toLowerCase())) + ' mất kết nối</span>';
    var kt = t.khongTinh || {};
    if (kt.a || kt.b) h += '<span class="tdx-co x">Không tính điểm' + (kt.a && kt.b ? '' : ' (' + E(ten(kt.a ? 'a' : 'b')) + ')') + '</span>';
    if (t.nghi && (t.nghi.a || t.nghi.b)) h += '<span class="tdx-co x" title="Gửi quá 12 từ/10 giây — máy chủ bỏ qua">Gửi quá nhanh</span>';
    return h;
  }
  function boDo(t) { return /^(roi|mat)/.test(t.ly || ''); }
  function doiHang(x) { if (!x || x.doi == null) return '<span class="tdx-mo">—</span>'; return '<span class="' + (x.doi >= 0 ? 'tdx-tang' : 'tdx-giam') + '">' + (x.doi >= 0 ? '+' : '−') + Math.abs(x.doi) + '</span>'; }
  function chipHang(ma, chu) { var h = HANG[ma]; return h ? '<span class="tdx-hang" style="background:' + h[1] + '">' + E(chu || h[0]) + '</span>' : '<span class="tdx-hang xam">' + E(chu || 'Chưa xếp') + '</span>'; }
  function hangDiem(d) { return d >= 800 ? 'vang' : d >= 300 ? 'bac' : 'dong'; }
  function rong(chu) { return '<div class="tdq-rong nho">' + chu + '</div>'; }
  function dangTai(el) { el.innerHTML = '<div class="tdq-rong">Đang tải…</div>'; }
  function loi(el, e) { el.innerHTML = '<div class="tdq-rong">Chưa tải được: ' + E(String((e && (e.code || e.message)) || e).slice(0, 160)) + '</div>'; console.warn('[td-xem]', e); }

  // ---------- số liệu mẫu (bàn thử) ----------
  var THU = null;
  function mauThu() {
    if (THU) return THU;
    var EM = [['Thiên Phúc', 'B2-A'], ['Khôi Nguyên', 'B1-B'], ['Hải Đăng', 'A2-B'], ['Minh Châu', 'B1-B'], ['Gia Huy', 'A1-C'], ['Ngọc Hà', 'B2-B'], ['Thảo My', 'NT K9'], ['Đức Minh', 'A1-A'], ['Bảo Châu', 'A2-B'], ['Nhật Huy', 'NT 4'], ['Phương Vy', 'B1-A'], ['Khánh Linh', 'B2-A']];
    var b = Date.now(), ds = [], r = 7;
    var nn = function (n) { r = (r * 9301 + 49297) % 233280; return Math.floor(r / 233280 * n); };
    for (var i = 0; i < 90; i++) {
      var a = nn(12), c = (a + 1 + nn(11)) % 12, l = ['xh', 'xh', 'xh', 'giai', 'gh', 'gv'][nn(6)], luc = i < 2 ? b - 40000 : b - i * 37 * 60000 - nn(600000);
      var t = { id: 'thu' + i, a: 'u' + a, b: 'u' + c, nguoi: ['u' + a, 'u' + c], tenA: EM[a][0], tenB: EM[c][0], lopA: EM[a][1], lopB: EM[c][1], lop: EM[a][1].replace('-', ''),
        taoLuc: luc, batDau: luc + 5000, ketThuc: luc + 125000, xongLuc: luc + 126000, phut: 2, trangThai: i < 2 ? 'choi' : 'xong', diem: { a: 5 + nn(40), b: 5 + nn(40) } };
      if (l === 'xh') { t.xh = 'thu'; t.xhKq = { a: { doi: nn(25) - 9, diem: 900 + nn(700) }, b: { doi: nn(25) - 12, diem: 900 + nn(700) } }; }
      if (l === 'giai') { t.giai = 'g1'; t.lop = 'B1B'; }
      if (l === 'gv') { t.gv = 'thay'; t.a = 'thay'; t.nguoi[0] = 'thay'; }
      if (i === 5) t.ly = 'roiA'; if (i === 9) t.ly = 'matB'; if (i === 12) t.khongTinh = { a: true };
      t.kq = { a: t.diem.a > t.diem.b ? 'thang' : t.diem.a < t.diem.b ? 'thua' : 'hoa' }; t.kq.b = t.kq.a === 'thang' ? 'thua' : t.kq.a === 'thua' ? 'thang' : 'hoa';
      ds.push(t);
    }
    var em = EM.map(function (e, i) { var d = 1990 - i * 120; return { uid: 'u' + i, ten: e[0], lop: e[1], diem: i === 11 ? null : d, cao: d + 40, tran: 90 - i * 6, thang: 50 - i * 3, hoa: 2, thua: 38 - i * 3, xl: i === 11 ? 3 : 5, ds: [{ kq: 'thang' }, { kq: 'thua' }, { kq: 'thang' }, { kq: i % 2 ? 'hoa' : 'thang' }, { kq: 'thua' }] }; });
    var tong = { moc: b, n: { xh: 3120, giai: 2304, gh: 1032, gv: 74 }, em: {} };
    EM.forEach(function (e, i) { tong.em['u' + i] = { ten: e[0], lop: e[1], l: { xh: [60 - i * 3, 2, 30], giai: [30 - i, 1, 14], gh: [10, 0, 8] }, bo: i % 4, cuoi: b - i * 3e6 }; });
    THU = { ds: ds, em: em, tong: tong, mua: [{ id: 'thu', ten: 'Mùa 2', tu: b - 3 * NG, den: b + 25 * NG, tt: 'mo' }, { id: 'thu1', ten: 'Mùa 1', tu: b - 10 * NG, den: b - 3 * NG, tt: 'chot', thuong: { sao: 1240, em: 171 } }],
      giai: [{ id: 'g1', ten: 'Speed Cup tuần 3', tu: b - 2 * NG, den: b + 2 * NG + 5 * 36e5, lops: ['A1C', 'B1B', 'B2A', 'NTK9'] }] };
    return THU;
  }

  // ---------- đọc kho ----------
  async function napKhoang(a, b) {
    var k = a + '_' + b, c = S.cache[k];
    if (c && (b < Date.now() - 6e5 || Date.now() - c.luc < 30000)) return c.ds;   // ngày đã qua: giữ · hôm nay: hỏi lại sau 30 giây
    var ds;
    if (laThu()) ds = mauThu().ds.filter(function (t) { return t.taoLuc >= a && t.taoLuc < b; });
    else {
      var f = await O.kho();
      var s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'tranDau'), f.fs.where('taoLuc', '>=', a), f.fs.where('taoLuc', '<', b), f.fs.orderBy('taoLuc', 'desc'), f.fs.limit(3000)));
      ds = []; s.forEach(function (d) { var t = d.data(); t.id = d.id; ds.push(t); });
    }
    ds = ds.filter(function (t) { return t.trangThai === 'xong' || t.trangThai === 'choi'; });
    S.cache[k] = { ds: ds, luc: Date.now() };
    return ds;
  }
  function khoangNgay() {
    var h = dauNgay(Date.now());
    if (S.ngay === 'qua') return [h - NG, h];
    if (S.ngay === '7') return [h - 6 * NG, h + NG];
    if (S.ngay === 'chon' && S.ngayChon) { var d = new Date(S.ngayChon + 'T00:00:00').getTime(); return [d, d + NG]; }
    return [h, h + NG];
  }
  async function napMua() {
    if (S.dsMua) return S.dsMua;
    if (laThu()) { S.muaHien = 'thu'; return (S.dsMua = mauThu().mua); }
    var f = await O.kho();
    var c = await f.fs.getDoc(f.fs.doc(f.db, 'caiDat', 'xepHang')); S.muaHien = c.exists() ? String(c.data().mua || '') : '';
    var s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'xhMua'), f.fs.orderBy('tu', 'desc'), f.fs.limit(20)));
    var ds = []; s.forEach(function (d) { var x = d.data(); x.id = d.id; ds.push(x); });
    return (S.dsMua = ds);
  }
  async function napEmMua(mua) {
    var k = 'em_' + mua, c = S.cache[k];
    if (c && Date.now() - c.luc < 60000) return c.ds;
    var ds = [];
    if (laThu()) ds = mauThu().em.slice();
    else { var f = await O.kho(), s = await f.fs.getDocs(f.fs.collection(f.db, 'xhMua', mua, 'em')); s.forEach(function (d) { var x = d.data(); x.uid = d.id; ds.push(x); }); }
    S.cache[k] = { ds: ds, luc: Date.now() };
    return ds;
  }
  // xếp hạng hiện (giống js/xh-ql.js chiaSuat): Bạch kim → Huyền thoại theo SUẤT thứ hạng + điểm sàn, còn lại theo điểm (tối đa Vàng)
  function xepMua(ds, M) {
    var xep = ds.filter(function (x) { return x.diem != null; }).sort(function (a, b) { return (b.diem - a.diem) || ((b.diemT || 0) - (a.diemT || 0)); });
    var suat = M && Array.isArray(M.suat) && M.suat.length ? M.suat : SUAT_MAC, o = {}, i = 0;
    suat.forEach(function (s) { for (var k = 0; k < s.n && i < xep.length && xep[i].diem >= s.san; k++) o[xep[i++].uid] = s.t; });
    xep.forEach(function (x, j) { x._hang = o[x.uid] || hangDiem(x.diem); x._so = j + 1; });
    var cho = ds.filter(function (x) { return x.diem == null; }).sort(function (a, b) { return (b.xl || 0) - (a.xl || 0); });
    return xep.concat(cho);
  }
  // ⭐ tài liệu TỔNG mọi thời đại: cộng dồn trận chốt sau mốc
  function congTran(T, t) {
    var l = loai(t), kq = t.kq || {};
    T.n[l] = (T.n[l] || 0) + 1;
    ['a', 'b'].forEach(function (k) {
      var uid = t[k]; if (!uid || (t.gv && uid === t.gv)) return;   // thầy không vào bảng
      var b = ben(t, k), e = T.em[uid] = T.em[uid] || { ten: b.ten, lop: b.lop, l: {}, bo: 0, cuoi: 0 };
      var lm = (t.xongLuc || 0) >= (e.cuoi || 0);
      if (lm) { e.ten = b.ten || e.ten; e.lop = b.lop || e.lop; e.cuoi = t.xongLuc || e.cuoi; }
      var m = e.l[l] = e.l[l] || [0, 0, 0], j = kq[k] === 'thang' ? 0 : kq[k] === 'hoa' ? 1 : 2; m[j]++;
      if (t.ly === 'roi' + k.toUpperCase() || t.ly === 'mat' + k.toUpperCase()) e.bo = (e.bo || 0) + 1;
    });
  }
  async function napTong(capNhat) {
    if (laThu()) return (S.tong = mauThu().tong);
    var f = await O.kho(), ref = f.fs.doc(f.db, 'nwCauHinh', 'tdTong');
    var s = await f.fs.getDoc(ref), T = s.exists() ? s.data() : null;
    if (!capNhat) return (S.tong = T);
    T = T || { moc: 0, n: {}, em: {} }; T.n = T.n || {}; T.em = T.em || {};
    var moc0 = T.moc || 0, them = 0;
    for (var vong = 0; vong < 40; vong++) {   // tối đa 40 × 800 trận mỗi lần mở
      var q = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'tranDau'), f.fs.where('xongLuc', '>', T.moc || 0), f.fs.orderBy('xongLuc'), f.fs.limit(800)));
      if (q.empty) break;
      q.forEach(function (d) { var t = d.data(); if (t.trangThai === 'xong') { congTran(T, t); them++; } T.moc = Math.max(T.moc || 0, t.xongLuc || 0); });
      if (q.size < 800) break;
    }
    if (them) {
      var lai = await f.fs.getDoc(ref);   // máy khác vừa cộng ⇒ thôi ghi (lần mở sau tự cộng tiếp từ mốc mới)
      if (!lai.exists() || (lai.data().moc || 0) === moc0) { T.capNhat = Date.now(); await f.fs.setDoc(ref, T); }
    }
    return (S.tong = T);
  }
  // em trong tài liệu tổng gộp theo (tên + lớp) — gom uid cũ
  function emTong(T, the) {
    var g = {};
    Object.keys((T && T.em) || {}).forEach(function (uid) {
      var e = T.em[uid], k = String(e.ten || '').toLowerCase() + '|' + String(e.lop || '').toLowerCase();
      var x = g[k] = g[k] || { uids: [], ten: e.ten, lop: e.lop, t: 0, h: 0, b: 0, bo: 0, cuoi: 0, l: {} };
      x.uids.push(uid); x.bo += e.bo || 0; if ((e.cuoi || 0) > x.cuoi) { x.cuoi = e.cuoi; x.uid = uid; }
      Object.keys(e.l || {}).forEach(function (l) {
        var m = e.l[l], c = x.l[l] = x.l[l] || [0, 0, 0]; c[0] += m[0]; c[1] += m[1]; c[2] += m[2];
        if (!the || the === l || (the === 'gh' && l === 'gv')) { x.t += m[0]; x.h += m[1]; x.b += m[2]; }
      });
    });
    return Object.keys(g).map(function (k) { var x = g[k]; x.uid = x.uid || x.uids[0]; x.n = x.t + x.h + x.b; return x; });
  }

  // ---------- thống kê cho thẻ + dải ----------
  async function thongKe(o) {
    O = Object.assign({}, O || {}, o);
    var h = dauNgay(Date.now()), bay = Date.now();
    var r = await Promise.all([napKhoang(h, h + NG), napTong(false).catch(function () { return null; }), napMua().catch(function () { return []; }), napGiai().catch(function () { return []; })]);
    var ds = r[0], T = r[1] || { n: {} }, kq = {};
    ['gh', 'giai', 'xh'].forEach(function (the) {
      var x = ds.filter(function (t) { return thuoc(t, the); }), em = {};
      x.forEach(function (t) { [t.a, t.b].forEach(function (u) { if (u && u !== t.gv) em[u] = 1; }); });
      kq[the] = { homNay: x.length, dang: x.filter(function (t) { return t.trangThai === 'choi' && (t.ketThuc || 0) > bay - 5000; }).length,
        em: Object.keys(em).length, bo: x.filter(boDo).length, tong: the === 'gh' ? ((T.n.gh || 0) + (T.n.gv || 0)) : (T.n[the] || 0), thay: the === 'gh' ? (T.n.gv || 0) : 0, coTong: !!r[1] };
    });
    var M = (r[2] || []).filter(function (m) { return m.id === S.muaHien; })[0] || null;
    kq.mua = M ? { ten: M.ten, tu: M.tu, den: M.den, tt: M.tt, conLai: Math.max(0, Math.ceil((M.den - bay) / NG)) } : null;
    var g = (r[3] || []).filter(function (x) { return !x.dong && x.tu <= bay && bay < x.den; });
    kq.dsGiai = { dang: g.length, ten: g.map(function (x) { return x.ten || 'Giải'; }).join(' · ') };
    if (M && !laThu()) {
      try { var f = await O.kho(); if (f.fs.getCountFromServer) { var c = await f.fs.getCountFromServer(f.fs.collection(f.db, 'xhMua', S.muaHien, 'em')); kq.mua.em = c.data().count; } } catch (e) { }
      try { var f2 = await O.kho(), tp = await f2.fs.getDoc(f2.fs.doc(f2.db, 'xhMua', S.muaHien, 'bang', 'top')); var d1 = tp.exists() ? (tp.data().ds || [])[0] : null; if (d1) kq.mua.so1 = d1; } catch (e) { }
    } else if (M) { kq.mua.em = 186; kq.mua.so1 = { ten: 'Thiên Phúc', diem: 1990 }; }
    return kq;
  }
  async function napGiai() {
    if (S.dsGiai && Date.now() - S.dsGiai.luc < 60000) return S.dsGiai.ds;
    var ds = [];
    if (laThu()) ds = mauThu().giai;
    else { var f = await O.kho(), s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'giaiDau'), f.fs.orderBy('tu', 'desc'), f.fs.limit(40))); s.forEach(function (d) { var x = d.data(); x.id = d.id; ds.push(x); }); }
    S.dsGiai = { ds: ds, luc: Date.now() };
    return ds;
  }

  // ---------- vẽ ----------
  async function ve(el, o) {
    O = Object.assign({}, O || {}, o);
    var tab = O.tab;
    if (tab === 'ct') return veCt(el);
    if (tab === 'tran') return veTran(el);
    if (tab === 'hs') return veHs(el);
    if (tab === 'bxh') return veBxh(el);
    if (tab === 'giai') return veGiai(el);
    if (tab === 'mua') return veMuaDs(el);
    if (tab === 'luyen') { el.innerHTML = '<div class="tdq-the" style="max-width:680px"><div class="tdq-the-dau"><div><b>Luyện tập = chơi với máy, không tính điểm</b><small>Chế độ này không ghi lại gì nên không có số liệu để xem — thầy chỉ bật / tắt / hẹn giờ ở nút ⚙ Cài đặt.</small></div></div></div>'; return; }
    el.innerHTML = '';
  }
  function boLoc(el, conLop, them) {
    var NGAY = [['hom', 'Hôm nay'], ['qua', 'Hôm qua'], ['7', '7 ngày']];
    return '<div class="tdx-loc"><label class="tdq-tim"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input type="search" class="tdq-o" data-x-tim placeholder="Tìm tên em" value="' + E(S.tim) + '"></label>' +
      '<div class="tdq-chips">' + NGAY.map(function (n) { return '<button type="button" data-x-ngay="' + n[0] + '"' + (S.ngay === n[0] ? ' class="chon"' : '') + '>' + n[1] + '</button>'; }).join('') + '</div>' +
      '<input type="date" class="tdq-o tdx-ngay" data-x-ngaychon value="' + E(S.ngay === 'chon' ? S.ngayChon : '') + '" title="Chọn ngày">' +
      (conLop.length > 1 ? '<select class="tdq-o tdx-lop" data-x-lop><option value="">Mọi lớp</option>' + conLop.map(function (l) { return '<option' + (S.lop === l ? ' selected' : '') + '>' + E(l) + '</option>'; }).join('') + '</select>' : '') +
      (them || '') + '<div class="tdq-chips"><button type="button" data-x-bo' + (S.bo ? ' class="chon"' : '') + '>⚠ Chỉ trận bỏ dở</button></div></div>';
  }
  function ganLoc(el, veLai) {
    var i = el.querySelector('[data-x-tim]');
    if (i) i.oninput = function () { S.tim = i.value; var vt = i.selectionStart; veLai().then(function () { var n = el.querySelector('[data-x-tim]'); if (n) { n.focus(); try { n.setSelectionRange(vt, vt); } catch (e) { } } }); };
    $$('[data-x-ngay]', el).forEach(function (b) { b.onclick = function () { S.ngay = b.getAttribute('data-x-ngay'); veLai(); }; });
    var c = el.querySelector('[data-x-ngaychon]'); if (c) c.onchange = function () { if (c.value) { S.ngay = 'chon'; S.ngayChon = c.value; veLai(); } };
    var l = el.querySelector('[data-x-lop]'); if (l) l.onchange = function () { S.lop = l.value; veLai(); };
    var b = el.querySelector('[data-x-bo]'); if (b) b.onclick = function () { S.bo = !S.bo; veLai(); };
  }
  function ganMo(el) {   // bấm dòng trận ⇒ chi tiết · bấm tên ⇒ hồ sơ em
    $$('[data-hs]', el).forEach(function (x) { x.onclick = function (e) { e.stopPropagation(); S.uid = x.getAttribute('data-hs'); S.uids = null; O.doi('hs'); }; });
    $$('[data-tran]', el).forEach(function (x) { x.onclick = function () { S.tranId = x.getAttribute('data-tran'); S.tranTu = O.tab; O.doi('ct'); }; });
  }
  function bangTran(ds, gon) {
    var xh = O.the === 'xh', giai = O.the === 'giai';
    if (!ds.length) return rong('Không có trận nào khớp bộ lọc.');
    return '<div class="tdx-cuon"><table class="tdx-bang"><thead><tr><th>Giờ</th>' + (gon ? '<th>Loại</th>' : '') + (giai ? '<th>Lớp</th>' : '') + '<th>Em A</th><th class="so">Tỉ số</th><th>Em B</th><th>Ghi chú</th>' + (xh ? '<th class="so">Điểm hạng</th>' : '') + '</tr></thead><tbody>' +
      ds.map(function (t) {
        var k = t.xhKq || {};
        return '<tr class="bam" data-tran="' + E(t.id) + '"><td class="tdx-gio">' + ngayGio(t.taoLuc || t.xongLuc || 0) + '</td>' + (gon ? '<td><span class="tdx-loai ' + loai(t) + '">' + TEN_LOAI[loai(t)] + '</span></td>' : '') +
          (giai ? '<td>' + E(t.lop || '') + '</td>' : '') + '<td>' + ng(ben(t, 'a'), 1) + '</td><td class="so">' + tySo(t) + '</td><td>' + ng(ben(t, 'b'), 1) + '</td><td>' + coTran(t) + '</td>' +
          (xh ? '<td class="so">' + doiHang(k.a) + ' / ' + doiHang(k.b) + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function khopTim(t) {
    var q = S.tim.trim().toLowerCase(); if (!q) return true;
    return (String(t.tenA || '') + ' ' + String(t.tenB || '')).toLowerCase().indexOf(q) >= 0;
  }
  function lopCua(t) { return [ben(t, 'a').lop, ben(t, 'b').lop].filter(function (x) { return x && x !== 'GV'; }); }
  async function veTran(el) {
    if (!el.firstChild || !el.querySelector('.tdx-loc')) dangTai(el);
    try {
      var k = khoangNgay(), ds = (await napKhoang(k[0], k[1])).filter(function (t) { return thuoc(t, O.the); });
      var lops = {}; ds.forEach(function (t) { lopCua(t).forEach(function (l) { lops[l] = 1; }); });
      var loc = ds.filter(function (t) { return khopTim(t) && (!S.lop || lopCua(t).indexOf(S.lop) >= 0) && (!S.bo || boDo(t)); });
      el.innerHTML = boLoc(el, Object.keys(lops).sort()) + '<div class="tdx-dem">' + so(loc.length) + ' trận' + (loc.length !== ds.length ? ' (lọc từ ' + so(ds.length) + ')' : '') + '</div>' + bangTran(loc);
      ganLoc(el, function () { return veTran(el); }); ganMo(el);
    } catch (e) { loi(el, e); }
  }

  // ---------- chi tiết trận ----------
  async function veCt(el) {
    dangTai(el);
    try {
      var t, tu = [];
      if (laThu()) {
        t = mauThu().ds.filter(function (x) { return x.id === S.tranId; })[0];
        var W = ['CAT', 'DOG', 'STAR', 'TREE', 'RAIN', 'MOON', 'BIRD', 'FISH', 'SAND', 'WIND', 'LAMP', 'ROSE', 'SUN', 'BOOK', 'DESK', 'MILK', 'CAKE', 'SHIP'];
        W.forEach(function (w, i) { tu.push({ id: w, uid: i % 3 ? t.a : t.b, ok: i !== 4 && i !== 13, d: w.length - 1, luc: t.batDau + 4000 + i * 6500 }); });
      } else {
        var f = await O.kho(), s = await f.fs.getDoc(f.fs.doc(f.db, 'tranDau', S.tranId));
        if (!s.exists()) { el.innerHTML = rong('Không tìm thấy trận này.'); return; }
        t = s.data(); t.id = s.id;
        var q = await f.fs.getDocs(f.fs.collection(f.db, 'tranDau', S.tranId, 'tu'));
        q.forEach(function (d) { var x = d.data(); x.id = d.id; x.luc = x.luc && x.luc.toMillis ? x.luc.toMillis() : +x.luc || 0; tu.push(x); });
      }
      tu = tu.filter(function (x) { return !/^(zg|zhet)/.test(x.id); }).sort(function (a, b) { return a.luc - b.luc; });
      var A = ben(t, 'a'), B = ben(t, 'b'), dai = Math.max(1, (t.ketThuc || 0) - (t.batDau || 0)), k = t.xhKq || {};
      var chuTu = function (x) { return String(x.id || '').split('_')[0].toUpperCase(); };
      var tl = '<div class="tdx-tl"><i class="tdx-truc"></i>' + [0, .25, .5, .75, 1].map(function (p) { return '<span class="tdx-giay" style="left:' + (2 + p * 96) + '%">' + Math.round(p * dai / 1000) + 's</span>'; }).join('');
      var lan = { a: 0, b: 0 };
      tu.forEach(function (x) {
        var kb = x.uid === t.a ? 'a' : x.uid === t.b ? 'b' : ''; if (!kb) return;
        var p = Math.min(1, Math.max(0, ((x.luc || 0) - (t.batDau || 0)) / dai)), ln = lan[kb]++ % 3;
        tl += '<span class="tdx-m ' + kb + (x.ok ? '' : ' sai') + '" style="left:' + (2 + p * 96) + '%;' + (kb === 'a' ? 'top:' + (8 + ln * 24) : 'bottom:' + (8 + ln * 24)) + 'px" title="' + E(chuTu(x) + ' · ' + Math.round(((x.luc || 0) - (t.batDau || 0)) / 1000) + 's' + (x.ok ? ' · +' + (x.d || 0) : x.ly === 'nhanh' ? ' · gửi quá nhanh' : ' · sai')) + '">' + E(chuTu(x)) + '</span>';
      });
      tl += '</div>';
      var cot = function (kb) {
        var ds = tu.filter(function (x) { return x.uid === t[kb]; }), dung = ds.filter(function (x) { return x.ok; }).length;
        return '<div class="tdq-the"><div class="tdq-the-dau"><div><b>' + E(ben(t, kb).ten) + '</b><small>' + dung + ' từ đúng · ' + (ds.length - dung) + ' sai</small></div></div>' +
          (ds.length ? '<ol class="tdx-tu">' + ds.map(function (x) { return '<li' + (x.ok ? '' : ' class="sai"') + '><b>' + E(chuTu(x)) + '</b><small>' + Math.max(0, Math.round(((x.luc || 0) - (t.batDau || 0)) / 1000)) + 's · ' + (x.ok ? '+' + (x.d || 0) : x.ly === 'nhanh' ? 'quá nhanh' : 'sai') + '</small></li>'; }).join('') + '</ol>' : rong('Không gửi từ nào.')) + '</div>';
      };
      var kq = t.kq || {}, ketQua = t.trangThai === 'choi' ? 'ĐANG ĐẤU' : kq.a === 'hoa' ? 'HOÀ' : (kq.a === 'thang' ? A.ten : B.ten).toUpperCase() + ' THẮNG';
      el.innerHTML = '<button type="button" class="tdx-lui" data-x-lui>← Quay lại</button>' +
        '<div class="tdx-dd">' + ng(A, 1) + '<div class="tdx-giua">' + tySo(t) + '<div class="tdx-kq ' + (t.trangThai === 'choi' ? 'live' : '') + '">' + E(ketQua) + '</div>' +
          '<small>' + TEN_LOAI[loai(t)] + ' · ' + ngayGio(t.taoLuc || 0) + ' · ' + (t.phut || 2) + ' phút' + (t.boTen ? ' · ' + E(t.boTen) : '') + (t.xh ? ' · điểm hạng ' + doiHang(k.a) + (k.a && k.a.diem != null ? ' (' + so(k.a.diem) + ')' : '') + ' / ' + doiHang(k.b) + (k.b && k.b.diem != null ? ' (' + so(k.b.diem) + ')' : '') : '') + '</small>' +
          (t.trangThai === 'choi' ? '' : '<div>' + coTran(t) + '</div>') + '</div>' + ng(B, 1) + '</div>' +
        '<div class="tdq-the"><div class="tdq-the-dau"><div><b>Dòng thời gian từng từ</b><small>Trên: ' + E(A.ten) + ' · dưới: ' + E(B.ten) + ' · gạch ngang = từ sai · rê chuột xem giây</small></div></div>' + tl + '</div>' +
        '<div class="tdx-hai">' + cot('a') + cot('b') + '</div>' +
        ((t.lo && t.lo.length) ? '<div class="tdq-the"><div class="tdq-the-dau"><div><b>Bỏ lỡ ở bàn cuối</b></div></div><div class="tdx-lo">' + t.lo.map(function (x) { return '<span title="' + E(x.m || '') + '">' + E(x.w) + '</span>'; }).join('') + '</div></div>' : '') +
        (t.xh ? '<div class="tdx-nut"><a class="tdq-nut phu nho" target="_blank" rel="noopener" href="nw/xhtran.html?id=' + encodeURIComponent(t.id) + (laThu() ? '&thu=1&xem=1' : '') + '">👁 Xem như khán giả</a></div>' : '');
      el.querySelector('[data-x-lui]').onclick = function () { O.doi(S.tranTu && S.tranTu !== 'ct' ? S.tranTu : 'tran'); };
      ganMo(el);
    } catch (e) { loi(el, e); }
  }

  // ---------- học sinh ----------
  async function veHs(el) {
    dangTai(el);
    try {
      var T = S.tong || await napTong(true).catch(function () { return null; }), ds = emTong(T, '');
      var q = S.tim.trim().toLowerCase();
      var chon = S.uid ? ds.filter(function (x) { return x.uids.indexOf(S.uid) >= 0; })[0] || { uid: S.uid, uids: [S.uid], ten: '', lop: '' } : null;
      var goiY = ds.filter(function (x) { return !q || String(x.ten).toLowerCase().indexOf(q) >= 0; }).sort(function (a, b) { return b.cuoi - a.cuoi; }).slice(0, q ? 40 : 24);
      var dau = '<div class="tdx-loc"><label class="tdq-tim"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input type="search" class="tdq-o" data-x-tim placeholder="Tìm tên em" value="' + E(S.tim) + '"></label>' +
        (chon ? '<button type="button" class="tdq-nut phu nho" data-x-boem>✕ Chọn em khác</button>' : '') + '</div>';
      if (!chon) {
        el.innerHTML = dau + (T ? '' : '<p class="tdq-goi">Chưa có tài liệu tổng — gõ tên vẫn tìm trong danh sách em đã đấu.</p>') +
          '<div class="tdx-goiy">' + (goiY.length ? goiY.map(function (x) { return '<button type="button" class="tdx-hs" data-hs="' + E(x.uid) + '">' + av(x.ten) + '<span><b>' + E(x.ten) + '</b><small>' + E(x.lop) + ' · ' + so(x.n) + ' trận</small></span></button>'; }).join('') : rong('Không thấy em nào.')) + '</div>';
        ganHsTim(el); ganMo(el); return;
      }
      el.innerHTML = dau + '<div class="tdq-rong">Đang tải trận của em…</div>';
      ganHsTim(el);
      var tran = await napTranEm(chon.uids), the = S.loaiHs || '';
      tran.sort(function (a, b) { return (b.xongLuc || b.taoLuc || 0) - (a.xongLuc || a.taoLuc || 0); });
      var kb = function (t) { return chon.uids.indexOf(t.a) >= 0 ? 'a' : 'b'; };
      if (!chon.ten && tran[0]) { var bb = ben(tran[0], kb(tran[0])); chon.ten = bb.ten; chon.lop = bb.lop; }
      var loc = tran.filter(function (t) { return !the || thuoc(t, the); });
      var dem = { t: 0, h: 0, b: 0, bo: 0 }, vs = {};
      loc.forEach(function (t) {
        var k = kb(t), r = (t.kq || {})[k]; if (r === 'thang') dem.t++; else if (r === 'hoa') dem.h++; else dem.b++;
        if (t.ly === 'roi' + k.toUpperCase() || t.ly === 'mat' + k.toUpperCase()) dem.bo++;
        var o = ben(t, k === 'a' ? 'b' : 'a'), v = vs[o.uid] = vs[o.uid] || { b: o, n: 0, t: 0, h: 0, x: 0 }; v.n++; if (r === 'thang') v.t++; else if (r === 'hoa') v.h++; else v.x++;
      });
      var n = loc.length, emM = null, M = null;
      try {
        var dsM = await napMua(); M = dsM.filter(function (m) { return m.id === S.muaHien; })[0];
        if (M) { var xm = xepMua(await napEmMua(M.id), M); emM = xm.filter(function (x) { return chon.uids.indexOf(x.uid) >= 0; })[0] || null; }
      } catch (e) { }
      // điểm hạng mùa hiện theo từng trận (xhKq.<bên>.diem)
      var duong = tran.filter(function (t) { return t.xh && M && t.xh === M.id && t.xhKq; }).slice().reverse()
        .map(function (t) { var x = t.xhKq[kb(t)]; return x && x.diem != null ? x.diem : null; }).filter(function (d) { return d != null; });
      var bd = '';
      if (duong.length > 1) {
        var mx = Math.max.apply(null, duong), mn = Math.min.apply(null, duong), rg = Math.max(1, mx - mn);
        bd = '<svg class="tdx-bd" viewBox="0 0 100 40" preserveAspectRatio="none"><polyline fill="none" stroke="#12A58F" stroke-width="2" vector-effect="non-scaling-stroke" points="' +
          duong.map(function (d, i) { return (i / (duong.length - 1) * 100).toFixed(2) + ',' + (37 - (d - mn) / rg * 34).toFixed(2); }).join(' ') + '"/></svg><div class="tdx-bd-chu"><span>' + so(mn) + '</span><span>' + so(mx) + '</span></div>';
      }
      var doiThu = Object.keys(vs).map(function (u) { return vs[u]; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
      var LOAI_HS = [['', 'Tất cả'], ['xh', 'Xếp hạng'], ['giai', 'Đấu giải'], ['gh', 'Giao hữu']];
      el.innerHTML = dau +
        '<div class="tdx-hs-dau">' + av(chon.ten) + '<div><b>' + E(chon.ten || '?') + '</b><small>' + E(chon.lop || '') + (tran[0] ? ' · lần cuối ' + ngayGio(tran[0].xongLuc || tran[0].taoLuc) : '') + (chon.uids.length > 1 ? ' · gộp ' + chon.uids.length + ' tài khoản' : '') + '</small></div>' +
          (emM ? (emM.diem != null ? chipHang(emM._hang, HANG[emM._hang][0] + ' · ' + so(emM.diem) + ' · #' + emM._so) : chipHang('', 'Phân hạng ' + (emM.xl || 0) + '/5')) : '') + '</div>' +
        '<div class="tdq-chips" style="margin:4px 0 12px">' + LOAI_HS.map(function (l) { return '<button type="button" data-x-loaihs="' + l[0] + '"' + (the === l[0] ? ' class="chon"' : '') + '>' + l[1] + '</button>'; }).join('') + '</div>' +
        '<div class="tdx-oso"><div><b>' + so(n) + '</b><small>Trận</small></div><div><b>' + (n ? Math.round(100 * dem.t / n) : 0) + '%</b><small>Thắng ' + dem.t + ' · Hoà ' + dem.h + ' · Thua ' + dem.b + '</small></div>' +
          '<div><b>' + dem.bo + '</b><small>Trận bỏ dở</small></div><div><b>' + (emM && emM.cao != null ? so(emM.cao) : '—') + '</b><small>Điểm hạng cao nhất mùa</small></div></div>' +
        '<div class="tdx-hai"><div class="tdq-the"><div class="tdq-the-dau"><div><b>Điểm hạng mùa này theo từng trận</b><small>' + (duong.length ? duong.length + ' trận đã có điểm' : 'Chưa có (đang phân hạng hoặc chưa đấu xếp hạng mùa này)') + '</small></div></div>' + bd + '</div>' +
          '<div class="tdq-the"><div class="tdq-the-dau"><div><b>Đối thủ hay gặp</b></div></div>' + (doiThu.length ? '<table class="tdx-bang"><tbody>' + doiThu.map(function (v) { return '<tr><td>' + ng(v.b, 1) + '</td><td class="so">' + v.n + ' trận</td><td class="so">' + v.t + '–' + v.h + '–' + v.x + '</td></tr>'; }).join('') + '</tbody></table>' : rong('Chưa có.')) + '</div></div>' +
        '<div class="tdq-the"><div class="tdq-the-dau"><div><b>Toàn bộ lịch sử trận</b><small>' + so(loc.length) + ' trận' + (loc.length > 200 ? ' · hiện 200 trận mới nhất' : '') + '</small></div></div>' + bangTran(loc.slice(0, 200), true) + '</div>';
      ganHsTim(el); ganMo(el);
      $$('[data-x-loaihs]', el).forEach(function (b) { b.onclick = function () { S.loaiHs = b.getAttribute('data-x-loaihs'); veHs(el); }; });
      var bo = el.querySelector('[data-x-boem]'); if (bo) bo.onclick = function () { S.uid = ''; veHs(el); };
    } catch (e) { loi(el, e); }
  }
  function ganHsTim(el) {
    var i = el.querySelector('[data-x-tim]'); if (!i) return;
    i.oninput = function () { S.tim = i.value; if (S.uid) S.uid = ''; var vt = i.selectionStart; veHs(el).then(function () { var n = el.querySelector('[data-x-tim]'); if (n) { n.focus(); try { n.setSelectionRange(vt, vt); } catch (e) { } } }); };
  }
  async function napTranEm(uids) {
    var k = 'hs_' + uids.join(','), c = S.cache[k];
    if (c && Date.now() - c.luc < 60000) return c.ds;
    var ds = [];
    if (laThu()) ds = mauThu().ds.filter(function (t) { return uids.indexOf(t.a) >= 0 || uids.indexOf(t.b) >= 0; });
    else {
      var f = await O.kho();
      for (var i = 0; i < uids.length; i += 10) {
        var s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'tranDau'), f.fs.where('nguoi', 'array-contains-any', uids.slice(i, i + 10)), f.fs.limit(2000)));
        s.forEach(function (d) { var t = d.data(); t.id = d.id; ds.push(t); });
      }
    }
    ds = ds.filter(function (t) { return t.trangThai === 'xong' || t.trangThai === 'choi'; });
    S.cache[k] = { ds: ds, luc: Date.now() };
    return ds;
  }

  // ---------- bảng xếp hạng ----------
  async function veBxh(el) {
    dangTai(el);
    try {
      var xh = O.the === 'xh', che = xh ? S.bxh : 'md', dsM = xh ? await napMua() : [];
      var muaXem = S.muaXem || S.muaHien;
      var chips = xh ? '<div class="tdq-chips">' + dsM.slice(0, 6).map(function (m) { return '<button type="button" data-x-mua="' + E(m.id) + '"' + (che === 'mua' && m.id === muaXem ? ' class="chon"' : '') + '>' + E(m.ten || m.id) + (m.id === S.muaHien ? ' (hiện tại)' : '') + '</button>'; }).join('') +
        '<button type="button" data-x-md' + (che === 'md' ? ' class="chon"' : '') + '>Mọi thời đại</button></div>' : '';
      var h = '';
      if (che === 'mua') {
        var M = dsM.filter(function (m) { return m.id === muaXem; })[0];
        if (!M) { el.innerHTML = '<div class="tdx-loc">' + chips + '</div>' + rong('Chưa có mùa xếp hạng.'); ganBxh(el); return; }
        var ds = xepMua(await napEmMua(M.id), M), lops = {};
        ds.forEach(function (x) { if (x.lop) lops[x.lop] = 1; });
        var loc = ds.filter(function (x) { return (!S.lop || x.lop === S.lop) && (!S.tim.trim() || String(x.ten).toLowerCase().indexOf(S.tim.trim().toLowerCase()) >= 0); });
        h = '<div class="tdx-dem">' + so(ds.filter(function (x) { return x.diem != null; }).length) + ' em đã xếp hạng · ' + so(ds.filter(function (x) { return x.diem == null; }).length) + ' em đang phân hạng</div>' +
          '<div class="tdx-cuon dai"><table class="tdx-bang" data-x-xuat><thead><tr><th>#</th><th>Học sinh</th><th>Lớp</th><th>Hạng</th><th class="so">Điểm</th><th class="so">Cao nhất</th><th class="so">Trận</th><th class="so">% thắng</th><th>Phong độ</th></tr></thead><tbody>' +
          loc.map(function (x) {
            var ph = (x.ds || []).slice(0, 5).map(function (r) { var c = r.kq === 'thang' ? 'T' : r.kq === 'thua' ? 'B' : 'H'; return '<i class="' + c + '">' + c + '</i>'; }).join('');
            return '<tr class="bam" data-hs="' + E(x.uid) + '"><td class="tdx-so">' + (x._so || '') + '</td><td>' + ng({ uid: x.uid, ten: x.ten, lop: '', anh: x.anh }) + '</td><td>' + E(x.lop || '') + '</td><td>' +
              (x.diem != null ? chipHang(x._hang) : chipHang('', 'Phân hạng ' + (x.xl || 0) + '/5')) + '</td><td class="so tdx-diem">' + (x.diem != null ? so(x.diem) : '—') + '</td><td class="so">' + (x.cao != null ? so(x.cao) : '—') + '</td>' +
              '<td class="so">' + so(x.tran) + '</td><td class="so">' + (x.tran ? Math.round(100 * (x.thang || 0) / x.tran) : 0) + '%</td><td class="tdx-ph">' + ph + '</td></tr>';
          }).join('') + '</tbody></table></div>';
        el.innerHTML = '<div class="tdx-loc">' + chips + locTen(lops) + '<button type="button" class="tdq-nut phu nho" data-x-tai>⬇ Tải Excel</button></div>' + h;
      } else {
        var T = await napTong(true), the = O.the === 'xh' && che === 'md' ? '' : O.the, ds2 = emTong(T, the === 'xh' ? '' : the).filter(function (x) { return x.n > 0; }), lops2 = {};
        ds2.sort(function (a, b) { return (b.t - a.t) || (b.n - a.n); });
        ds2.forEach(function (x, i) { x._so = i + 1; if (x.lop) lops2[x.lop] = 1; });
        var loc2 = ds2.filter(function (x) { return (!S.lop || x.lop === S.lop) && (!S.tim.trim() || String(x.ten).toLowerCase().indexOf(S.tim.trim().toLowerCase()) >= 0); });
        var cot = function (x, l) { var m = x.l[l]; return m ? m[0] + m[1] + m[2] : 0; };
        var ghiChu = (O.the === 'gh' ? 'Giao hữu (cả trận với thầy)' : O.the === 'giai' ? 'Đấu giải' : 'Mọi loại trận') + ' · sắp theo số trận THẮNG · cập nhật ' + (T && T.capNhat ? ngayGio(T.capNhat) : 'vừa xong');
        el.innerHTML = '<div class="tdx-loc">' + chips + locTen(lops2) + '<button type="button" class="tdq-nut phu nho" data-x-tai>⬇ Tải Excel</button></div><div class="tdx-dem">' + so(ds2.length) + ' em · ' + ghiChu + '</div>' +
          '<div class="tdx-cuon dai"><table class="tdx-bang" data-x-xuat><thead><tr><th>#</th><th>Học sinh</th><th>Lớp</th><th class="so">Trận</th><th class="so">Thắng</th><th class="so">Hoà</th><th class="so">Thua</th><th class="so">% thắng</th>' +
          (the ? '' : '<th class="so">Xếp hạng</th><th class="so">Giải</th><th class="so">Giao hữu</th>') + '<th class="so">Bỏ dở</th></tr></thead><tbody>' +
          loc2.map(function (x) {
            return '<tr class="bam" data-hs="' + E(x.uid) + '"><td class="tdx-so">' + x._so + '</td><td>' + ng({ uid: x.uid, ten: x.ten, lop: '' }) + '</td><td>' + E(x.lop || '') + '</td><td class="so tdx-diem">' + so(x.n) + '</td><td class="so">' + x.t + '</td><td class="so">' + x.h + '</td><td class="so">' + x.b + '</td>' +
              '<td class="so">' + (x.n ? Math.round(100 * x.t / x.n) : 0) + '%</td>' + (the ? '' : '<td class="so">' + cot(x, 'xh') + '</td><td class="so">' + cot(x, 'giai') + '</td><td class="so">' + (cot(x, 'gh') + cot(x, 'gv')) + '</td>') + '<td class="so">' + (x.bo || 0) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      ganBxh(el); ganMo(el);
    } catch (e) { loi(el, e); }
  }
  function locTen(lops) {
    var ds = Object.keys(lops).sort();
    return '<label class="tdq-tim"><svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input type="search" class="tdq-o" data-x-tim placeholder="Tìm tên em" value="' + E(S.tim) + '"></label>' +
      (ds.length > 1 ? '<select class="tdq-o tdx-lop" data-x-lop><option value="">Mọi lớp</option>' + ds.map(function (l) { return '<option' + (S.lop === l ? ' selected' : '') + '>' + E(l) + '</option>'; }).join('') + '</select>' : '');
  }
  function ganBxh(el) {
    $$('[data-x-mua]', el).forEach(function (b) { b.onclick = function () { S.bxh = 'mua'; S.muaXem = b.getAttribute('data-x-mua'); veBxh(el); }; });
    var md = el.querySelector('[data-x-md]'); if (md) md.onclick = function () { S.bxh = 'md'; veBxh(el); };
    var i = el.querySelector('[data-x-tim]');
    if (i) i.oninput = function () { S.tim = i.value; var vt = i.selectionStart; veBxh(el).then(function () { var n = el.querySelector('[data-x-tim]'); if (n) { n.focus(); try { n.setSelectionRange(vt, vt); } catch (e) { } } }); };
    var l = el.querySelector('[data-x-lop]'); if (l) l.onchange = function () { S.lop = l.value; veBxh(el); };
    var tai = el.querySelector('[data-x-tai]'); if (tai) tai.onclick = function () { taiExcel(el.querySelector('[data-x-xuat]')); };
  }
  // Excel = bảng HTML lưu .xls (Excel mở được, không cần thư viện)
  function taiExcel(bang) {
    if (!bang) return;
    var html = '<html><head><meta charset="utf-8"></head><body><table border="1">' + [].slice.call(bang.rows).map(function (r) {
      return '<tr>' + [].slice.call(r.cells).map(function (c) { return '<td>' + E(c.textContent.trim()) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</table></body></html>';
    var a = document.createElement('a'), d = new Date();
    a.href = URL.createObjectURL(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }));
    a.download = 'A Show Speed - xep hang ' + d.getDate() + '-' + (d.getMonth() + 1) + '-' + d.getFullYear() + '.xls';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- giải đang chạy · các mùa ----------
  async function veGiai(el) {
    dangTai(el);
    try {
      var bay = Date.now(), ds = (await napGiai()).filter(function (g) { return !(g.dong || bay >= g.den) || !g.daThuong; });
      var tt = function (g) { return g.dong || bay >= g.den ? (g.daThuong ? 'Đã thưởng' : 'Đã đóng · chờ thưởng sao') : bay < g.tu ? 'Sắp mở ' + ngayGio(g.tu) : 'Đang mở · đóng ' + ngayGio(g.den); };
      el.innerHTML = (ds.length ? '<div class="tdx-giai">' + ds.map(function (g) {
        return '<div class="tdq-the"><div class="tdq-the-dau"><div><b>' + E(g.ten || 'Giải') + '</b><small>' + E(tt(g)) + (g.bo && g.bo.ten ? ' · bộ từ ' + E(g.bo.ten) : '') + '</small></div></div>' +
          '<div class="tdq-chips">' + (g.lops || []).map(function (l) { return '<button type="button" data-x-giai="' + E(g.id) + '" data-x-lopg="' + E(l) + '">' + E((window.GiaiPop && GiaiPop.tenLop && GiaiPop.tenLop(l)) || l) + ' ↗</button>'; }).join('') + '</div></div>';
      }).join('') + '</div>' : rong('Không có giải nào đang mở hoặc chờ thưởng.')) +
        '<p class="tdq-goi" style="margin-top:12px">Bấm tên lớp ⇒ bảng xếp hạng + thưởng sao của giải (hộp giải sẵn có). Tạo giải mới, sửa bộ từ, giới hạn chơi: <a href="nw/giaidau.html" target="_blank" rel="noopener">trang Giải đấu ↗</a></p>';
      $$('[data-x-giai]', el).forEach(function (b) { b.onclick = function () { if (window.GiaiPop) GiaiPop.mo(b.getAttribute('data-x-giai'), b.getAttribute('data-x-lopg')); }; });
    } catch (e) { loi(el, e); }
  }
  async function veMuaDs(el) {
    dangTai(el);
    try {
      var ds = await napMua(), bay = Date.now();
      el.innerHTML = ds.length ? '<div class="tdx-cuon"><table class="tdx-bang"><thead><tr><th>Mùa</th><th>Thời gian</th><th>Trạng thái</th><th class="so">Thưởng</th></tr></thead><tbody>' + ds.map(function (m) {
        var tt = m.tt === 'chot' ? 'Đã chốt · đã phát sao' : bay < m.tu ? 'Sắp mở' : bay >= m.den ? 'Hết mùa · chờ chốt' : m.tt === 'dung' ? 'TẠM DỪNG' : 'Đang chạy';
        return '<tr class="bam" data-x-mua="' + E(m.id) + '"><td><b>' + E(m.ten || m.id) + '</b>' + (m.id === S.muaHien ? ' <span class="tdx-co live">HIỆN TẠI</span>' : '') + '</td><td>' + ngayGio(m.tu).slice(6) + ' → ' + ngayGio(m.den).slice(6) + '</td><td>' + tt + '</td>' +
          '<td class="so">' + (m.thuong ? so(m.thuong.sao) + ' ⭐ · ' + so(m.thuong.em) + ' em' : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="tdq-goi" style="margin-top:10px">Bấm một mùa ⇒ bảng xếp hạng của mùa đó. Tạo mùa · tạm dừng · chốt &amp; phát sao: nút ⚙ Cài đặt.</p>' : rong('Chưa có mùa nào.');
      $$('[data-x-mua]', el).forEach(function (r) { r.onclick = function () { S.bxh = 'mua'; S.muaXem = r.getAttribute('data-x-mua'); O.doi('bxh'); }; });
    } catch (e) { loi(el, e); }
  }

  // ⭐ v1.463.0 — màn CHI TIẾT MỘT TRẬN vẽ ở chỗ khác (pop-up Giải đấu của em, js/hs-gd.js): o = { id, kho, laThu, lui() }
  function veTranRieng(el, o) {
    O = { kho: o.kho, laThu: o.laThu, the: '', tab: 'ct', doi: function (tab) { if (tab !== 'hs' && o.lui) o.lui(); } };
    S.tranId = o.id; S.tranTu = '';
    return veCt(el);
  }
  window.TdXem = { TAB: TAB, ve: ve, thongKe: thongKe, veTran: veTranRieng, xoaNho: function () { S.cache = {}; S.dsMua = null; S.dsGiai = null; } };
})();
