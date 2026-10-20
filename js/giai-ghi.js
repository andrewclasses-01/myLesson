/* ============================================================
   js/giai-ghi.js — CÁC LƯỢT GHI GIẢI ĐẤU DÙNG CHUNG (web v1.380.0, 20/10/2026)

   MỘT đường ghi cho cả hai nơi thầy thao tác giải:
     · trang Giải đấu  nw/giaidau.html (nw/js/giaidau.js)
     · POP-UP GIẢI trên dashboard     (js/giai-pop.js)
   Trước v1.380.0 các hàm này nằm trong nw/js/giaidau.js — chuyển ra đây NGUYÊN VĂN để pop-up không phải viết đường ghi thứ hai.
   Mọi hàm nhận `f` = { fs: <module firestore>, db } (NW.fb() hoặc TheTD.kho()); không tự mở kho, không vẽ gì.

   Luật Firestore không đổi (tools/dang-luat-giai-dau*.js): thầy updateDoc giaiDau/{id} · transaction bảng lớp · addDoc saoDot · tin classChat role 'gv'.
   ============================================================ */
(function () {
  'use strict';
  if (window.GiaiGhi) return;

  var diem = function (r) { return r ? (r.t || 0) * 2 + (r.h || 0) : 0; };
  var soTran = function (r) { return r ? (r.t || 0) + (r.h || 0) + (r.b || 0) : 0; };
  var khongDau = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); };

  /* Xếp hạng một lớp: em ĐÃ ĐẤU trước (v1.380.0 — trước đây em 0 trận đứng trên em đấu 1 trận thua) · điểm ↓ · thắng ↓ · số trận ↑ · tên.
     ds = [{ ten | n:{ten}, r:{t,h,b} }] — sắp TẠI CHỖ và trả lại chính mảng đó. */
  function sapXep(ds) {
    var ten = function (x) { return khongDau(x.n ? x.n.ten : x.ten); };
    return ds.sort(function (a, b) {
      return (soTran(b.r) > 0) - (soTran(a.r) > 0) || diem(b.r) - diem(a.r) || ((b.r || {}).t || 0) - ((a.r || {}).t || 0) ||
        soTran(a.r) - soTran(b.r) || ten(a).localeCompare(ten(b));
    });
  }
  /* cùng điểm + cùng thắng + cùng số trận = CÙNG HẠNG (thầy chốt Đợt 4) — ds đã sapXep, chỉ em đã đấu */
  function hangCung(ds) {
    var r = 0;
    return ds.map(function (x, i) {
      var tr = ds[i - 1];
      if (!tr || diem(tr.r) !== diem(x.r) || (tr.r || {}).t !== (x.r || {}).t || soTran(tr.r) !== soTran(x.r)) r = i + 1;
      return Object.assign({ hang: r }, x);
    });
  }

  /* trừ một trận khỏi bảng em { uid: {t,h,b} }: kq của A (thang|hoa|thua) ⇒ A trừ ô đó, B trừ ô ngược lại; không xuống dưới 0
     v1.375.0 — bên "không tính điểm" (ka/kb: đã đủ trận hôm nay) chưa từng được cộng ⇒ không trừ */
  function truTran(em, m) {
    var K = { thang: 't', hoa: 'h', thua: 'b' }, nguoc = { thang: 'thua', hoa: 'hoa', thua: 'thang' };
    [[m.a, m.kq, m.ka], [m.b, nguoc[m.kq], m.kb]].forEach(function (x) { var r = em[x[0]]; if (!x[2] && r && K[x[1]]) r[K[x[1]]] = Math.max(0, (r[K[x[1]]] || 0) - 1); });
  }
  /* thầy HUỶ KẾT QUẢ một trận (v1.350.0): trận gạch ngang, trừ lại điểm 2 em trong bảng lớp. Lịch sử riêng tdLichSu giữ nguyên. */
  async function huyTran(f, gid, lop, id) {
    var ref = f.fs.doc(f.db, 'giaiDau', gid, 'bang', lop);
    await f.fs.runTransaction(f.db, async function (tx) {
      var s = await tx.get(ref); if (!s.exists()) throw new Error('Không thấy bảng của lớp.');
      var d = s.data(), tran = (d.tran || []).slice(), em = Object.assign({}, d.em || {});
      var i = -1; tran.forEach(function (x, k) { if (x.id === id) i = k; });
      if (i < 0 || tran[i].huy) return;
      tran[i] = Object.assign({}, tran[i], { huy: true, huyLuc: Date.now() });
      em[tran[i].a] = Object.assign({}, em[tran[i].a]); em[tran[i].b] = Object.assign({}, em[tran[i].b]);
      truTran(em, tran[i]);
      tx.set(ref, { em: em, tran: tran, capNhat: Date.now() });
    });
  }
  /* đổi vài trường của giải (giờ, sao, dong, tu…) — luôn kèm capNhat */
  async function sua(f, gid, doi) {
    doi = Object.assign({}, doi, { capNhat: Date.now() });
    await f.fs.updateDoc(f.fs.doc(f.db, 'giaiDau', gid), doi);
    return doi;
  }

  function ngayVN() { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); }
  /* uid web ⇒ số học sinh 6 chữ số (để phiếu sao cộng đúng ví). Nguồn: hsSo/soCai + đường phụ data/lop.json (id myStudent → mã đăng nhập).
     gocDl = gốc thư mục data ('../' ở nw/, '' ở dashboard, 'https://andrewclasses.com/' ở trang thử). */
  async function soCuaUid(f, gocDl) {
    var s = await f.fs.getDoc(f.fs.doc(f.db, 'hsSo', 'soCai')), nguoi = s.exists() ? (s.data().nguoi || {}) : {}, theoMa = {}, idMa = {};
    var chuan = function (x) { return String(x || '').replace(/\s+/g, '').toUpperCase(); };
    Object.keys(nguoi).forEach(function (so) {
      var P = nguoi[so] || {};
      if (P.ma) theoMa[chuan(P.ma)] = so;
      (P.maCu || []).forEach(function (x) { if (!theoMa[chuan(x)]) theoMa[chuan(x)] = so; });
    });
    try {
      var dl = await fetch((gocDl || '') + 'data/lop.json', { cache: 'no-cache' }).then(function (r) { return r.json(); });
      (dl.lop || []).concat(dl.khoa || []).forEach(function (L) { ((L && L.hocSinh) || []).forEach(function (h) { if (h && h.id != null && h.ma) idMa[String(h.id)] = chuan(h.ma); }); });
    } catch (e) { console.warn('[giải đấu] lop.json', e); }
    return function (uid) { var id = window.ACHsUid.idTuUid(uid); return id == null ? '' : (window.ACHsUid.soTuUid(nguoi, String(uid)) || theoMa[idMa[String(id)]] || ''); };
  }
  /* THƯỞNG SAO (Đợt 4): theoLop = { lop: [{ so, n, viec, app }] } ⇒ MỘT phiếu saoDot mỗi lớp (hàm apDotSao cộng ví) rồi giaiDau.daThuong = true */
  async function thuong(f, g, theoLop) {
    var luc = Date.now();
    for (var lop in theoLop) {
      await f.fs.addDoc(f.fs.collection(f.db, 'saoDot'), { nguon: 'dashboard', lop: lop, ngay: ngayVN(), bai: 'giai:' + g.id, maBai: '',
        nhom: 'Giải đấu: ' + g.ten, ai: 'Thầy Andrew', dong: theoLop[lop].map(function (x) { return { so: x.so, n: x.n, viec: x.viec, app: x.app }; }), tao: luc });
    }
    await f.fs.updateDoc(f.fs.doc(f.db, 'giaiDau', g.id), { daThuong: true, capNhat: Date.now() });
  }
  async function guiNhom(f, lop, chu) {
    await f.fs.addDoc(f.fs.collection(f.db, 'classChat', lop, 'messages'), { name: 'Thầy Andrew', code: 'GV', role: 'gv', text: String(chu).slice(0, 300), createdAt: Date.now(), may: 'gd' + Math.random().toString(36).slice(2, 10) });
  }
  /* tin chúc mừng vào nhóm chat từng lớp — theoLop[lop][i] có thêm _ten, _hang */
  async function baoKetQua(f, g, theoLop) {
    var HC = ['🥇', '🥈', '🥉'];
    for (var lop in theoLop) {
      var ds = theoLop[lop].slice().sort(function (a, b) { return a._hang - b._hang; });
      var chu = '🏆 Kết quả "' + g.ten + '": ' + ds.map(function (x) { return (x._hang <= 3 ? HC[x._hang - 1] + ' ' : '') + x._ten + ' +' + x.n + '⭐'; }).join(' · ') + '. Chúc mừng các em! 👏';
      try { await guiNhom(f, lop, chu); } catch (e) { console.warn('[giải đấu] báo kết quả', lop, e); }
    }
  }

  window.GiaiGhi = { diem: diem, soTran: soTran, sapXep: sapXep, hangCung: hangCung, truTran: truTran, huyTran: huyTran, sua: sua,
    soCuaUid: soCuaUid, thuong: thuong, baoKetQua: baoKetQua, guiNhom: guiNhom, ngayVN: ngayVN };
})();
