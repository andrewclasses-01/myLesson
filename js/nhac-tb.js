/* ============================================================
   js/nhac-tb.js — ⭐ web v1.224.0 (02/10/2026, thầy chốt) THÔNG BÁO KHI BỊ @NHẮC TÊN TRONG CHAT

   Thầy chốt:
   · Nhắc tên ở CẢ chat lớp (trang lớp/khóa, dashboard, nhóm lớp ở tab Tin nhắn) lẫn chat Tin nhắn (riêng/nhóm) đều báo.
   · @All: CHỈ THẦY mới báo cả lớp/cả phòng; học sinh gõ @All vẫn tô màu nhưng KHÔNG báo (chống spam).
   · Bấm chuông ⇒ danh sách; bấm thông báo nhắc tên ⇒ mở tab Tin nhắn đúng phòng, cuộn tới dòng chat đó, nháy ô 1 cái.

   Ghi vào hộp thông báo SẴN CÓ của myNetwork `nwUsers/{uid}/thongBao` (luật: người gửi đăng nhập + `tu` = mình,
   `tuTen` khớp hồ sơ, `link` chỉ trang trong site, ≤8 trường). Phòng + tin nhét vào link:
     tinnhan.html?phong=<id phòng, ':' viết %3A>&tin=<id tin>&luc=<mốc tin>
   Người nhận:
   · chat lớp: tên sau @ ⇒ học sinh cùng tên trong `data/lop.json` của lớp đó ⇒ mã ⇒ uid `hs_<id>` (chép y luật chọn bản
     ghi chính của myNetwork/tools/tao-tai-khoan.mjs: lớp thường trước, khóa sau) · "Thầy Andrew" ⇒ `quantri_thay`.
   · chat Tin nhắn: tên ⇒ uid theo bảng `tv` của phòng.
   ⛔ Tab "thầy đăng nhập thay em / xem như em" (window.__thayVao) KHÔNG gửi gì.
   ⛔ Viết ES5 như js/chung.js (máy học sinh có iPad đời cũ).
   ============================================================ */
(function () {
  'use strict';
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
  var UID_THAY = 'quantri_thay';          // ⛔ khớp myLesson/app/tools/tai-khoan-quan-tri.js (hồ sơ nwUsers vaiTro gv)
  var TEN_THAY = 'Thầy Andrew';
  var TOI_DA = 40;                         // trần số người nhận một tin (một lớp ~25 em)

  function goc() { return location.pathname.indexOf('/nw/') >= 0 ? '../' : ''; }
  var _dl = null;
  function napDl() {
    if (!_dl) {
      _dl = fetch((window.AC_GOC_DL || goc()) + 'data/lop.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        ['catch'](function (e) { _dl = null; throw e; });
    }
    return _dl;
  }
  function chuanMa(s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); }
  function khongDau(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function uidTuMa(dl, ma) {
    ma = chuanMa(ma);
    if (!ma) return '';
    function tim(ds) {
      for (var i = 0; i < ds.length; i++) {
        var hs = ds[i].hocSinh || [];
        for (var j = 0; j < hs.length; j++) if (hs[j].id && chuanMa(hs[j].ma) === ma) return hs[j].id;
      }
      return '';
    }
    var id = tim(dl.lop || []) || tim(dl.khoa || []);
    return id ? 'hs_' + id : '';
  }
  function tenLopHien(l) { var g = String(l.tenGoc || l.maLop || ''); return /[a-z]{3,}/i.test(khongDau(g)) ? g : 'Lớp ' + g; }

  // Tên được nhắc trong chữ (y regex của js/chat-ui.js reNhac). Trả mảng tên, có thể có 'All'.
  function timTen(chu, dsTen) {
    var ten = ['All'].concat(dsTen || []).filter(Boolean).map(function (x) { return String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    ten.sort(function (a, b) { return b.length - a.length; });
    var re;
    try { re = new RegExp('@(' + ten.join('|') + ')(?![\\p{L}\\p{N}])', 'gu'); } catch (e) { return []; }
    var ra = [], co = {}, m;
    while ((m = re.exec(String(chu || '')))) { if (!co[m[1]]) { co[m[1]] = 1; ra.push(m[1]); } }
    return ra;
  }
  function trich(chu) {
    var s = String(chu || '').replace(/:([0-9a-f]+(?:-[0-9a-f]+)*):/g, '').replace(/\s+/g, ' ').trim();
    return s.length > 70 ? s.slice(0, 68) + '…' : s;
  }

  // ---------- Firebase: dùng CHUNG app đã khởi động (js/chat.js / nw-phien / thay.js) ----------
  var _fb = null;
  function fb() {
    if (!_fb) {
      // app Firebase do js/chat.js (AWChat.kho) hoặc nw/js/loi.js (NW.fb) khởi động — gọi trước để chắc chắn đã có app
      var choApp = window.AWChat && AWChat.kho ? AWChat.kho() : (window.NW && NW.fb ? NW.fb() : Promise.resolve());
      _fb = choApp.then(function () { return Promise.all([import(SDK + '/firebase-app.js'), import(SDK + '/firebase-firestore.js'), import(SDK + '/firebase-auth.js')]); })
        .then(function (m) {
          var app = m[0].getApp();
          var auth = m[2].getAuth(app);
          return (auth.authStateReady ? auth.authStateReady() : Promise.resolve()).then(function () {
            return { fs: m[1], db: m[1].getFirestore(app), auth: auth };
          });
        })['catch'](function (e) { _fb = null; throw e; });
    }
    return _fb;
  }
  // Tên + ảnh người gửi ĐÚNG hồ sơ nwUsers (luật nwTenDung). Đệm theo phiên trình duyệt.
  function hoSoToi(f, u) {
    var k = 'nhactb_ho_so_' + u.uid;
    try { var c = JSON.parse(sessionStorage.getItem(k) || 'null'); if (c && c.ten) return Promise.resolve(c); } catch (e) { }
    return f.fs.getDoc(f.fs.doc(f.db, 'nwUsers', u.uid)).then(function (s) {
      var x = s.exists() ? (s.data() || {}) : null;
      var c = x ? { ten: String(x.ten || ''), anh: String(x.anh || '') } : { ten: TEN_THAY, anh: '', thieu: true };
      try { sessionStorage.setItem(k, JSON.stringify(c)); } catch (e) { }
      return c;
    });
  }
  function ghi(dsUid, tb) {
    if (window.__thayVao) return Promise.resolve(0);
    return fb().then(function (f) {
      var u = f.auth.currentUser;
      if (!u) return 0;
      return hoSoToi(f, u).then(function (ho) {
        var nhan = {};
        dsUid.forEach(function (x) { if (x && x !== u.uid) nhan[x] = 1; });
        var ds = Object.keys(nhan).slice(0, TOI_DA);
        if (!ds.length) return 0;
        var b = f.fs.writeBatch(f.db), luc = Date.now();
        ds.forEach(function (uid) {
          b.set(f.fs.doc(f.fs.collection(f.db, 'nwUsers', uid, 'thongBao')), {
            loai: 'nhac', tu: u.uid, tuTen: ho.ten || TEN_THAY, tuAnh: ho.anh || '',
            chu: String(tb.chu || '').slice(0, 200), link: String(tb.link || '').slice(0, 300), luc: luc, daDoc: false
          });
        });
        return b.commit().then(function () { return ds.length; });
      });
    })['catch'](function (e) { console.warn('[nhac-tb] chưa gửi được thông báo nhắc tên', e); return 0; });
  }

  // ---------- chat LỚP (js/chat.js AWChat.gui gọi sau khi ghi tin thành công) ----------
  // tin = {ten, ma, vaiTro, chu, luc}
  function sauGuiLop(maLop, tinId, tin) {
    if (!tinId || !/@/.test(String(tin.chu || ''))) return Promise.resolve(0);
    return napDl().then(function (dl) {
      var l = (dl.lop || []).concat(dl.khoa || []).filter(function (x) { return x.maLop === maLop; })[0];
      if (!l) return 0;
      var hs = l.hocSinh || [], laThay = tin.vaiTro === 'gv';
      var ten = timTen(tin.chu, hs.map(function (h) { return h.ten; }).concat([TEN_THAY]));
      if (!ten.length) return 0;
      var uids = [];
      ten.forEach(function (t) {
        if (t === 'All') { if (laThay) hs.forEach(function (h) { uids.push(uidTuMa(dl, h.ma)); }); return; }
        if (t === TEN_THAY) { uids.push(UID_THAY); return; }
        hs.forEach(function (h) { if (h.ten === t) uids.push(uidTuMa(dl, h.ma)); });
      });
      if (laThay) uids = uids.filter(function (x) { return x !== UID_THAY; });
      else { var toi = uidTuMa(dl, tin.ma); uids = uids.filter(function (x) { return x !== toi; }); }
      return ghi(uids, {
        chu: 'trong ' + tenLopHien(l) + ': “' + trich(tin.chu) + '”',
        link: 'tinnhan.html?phong=lop%3A' + encodeURIComponent(maLop) + '&tin=' + encodeURIComponent(tinId) + '&luc=' + (Number(tin.luc) || 0)
      });
    })['catch'](function (e) { console.warn('[nhac-tb] lớp', e); return 0; });
  }

  // ---------- chat TIN NHẮN myNetwork (nw/js/chat.js gọi sau Chat.guiTin) ----------
  // p = phòng {id, loai, ten, thanhVien, tv{uid:{ten}}}, t = tin {id, chu, luc}, laThay = người gửi là thầy
  function sauGuiPhong(p, t, laThay) {
    if (!p || !p.id || !t || !t.id || !/@/.test(String(t.chu || ''))) return Promise.resolve(0);
    var tv = p.tv || {}, theoTen = {};
    Object.keys(tv).forEach(function (uid) { var n = (tv[uid] || {}).ten; if (n) (theoTen[n] = theoTen[n] || []).push(uid); });
    var ten = timTen(t.chu, Object.keys(theoTen));
    if (!ten.length) return Promise.resolve(0);
    var uids = [];
    ten.forEach(function (x) { if (x === 'All') { if (laThay) uids = uids.concat(p.thanhVien || []); } else uids = uids.concat(theoTen[x] || []); });
    var noi = p.loai === 'nhom' ? 'nhóm ' + (p.ten || 'chat') : 'tin nhắn riêng';
    return ghi(uids, {
      chu: 'trong ' + noi + ': “' + trich(t.chu) + '”',
      link: 'tinnhan.html?phong=' + encodeURIComponent(p.id) + '&tin=' + encodeURIComponent(t.id) + '&luc=' + (Number(t.luc) || 0)
    });
  }

  // ---------- số trên chuông ở trang lớp/khóa/dashboard (js/nw-thanh.js) — MỘT lượt đọc, chỉ đếm tối đa 10 ----------
  function demChuaDoc() {
    if (window.__thayVao) return Promise.resolve(0);
    return fb().then(function (f) {
      var u = f.auth.currentUser;
      if (!u) return 0;
      var q = f.fs.query(f.fs.collection(f.db, 'nwUsers', u.uid, 'thongBao'), f.fs.where('daDoc', '==', false), f.fs.limit(10));
      return f.fs.getDocs(q).then(function (s) { return s.size; });
    })['catch'](function () { return 0; });
  }
  function veSoChuong() {
    if (location.pathname.indexOf('/nw/') >= 0) return;                     // trang nw/ có chuông riêng (nw/js/thanh.js)
    if (!document.querySelector('.top.nwb') || !window.NWB) return;
    if (/[?&]somau=1/.test(location.search)) return;                       // bàn thử máy: giữ số mẫu
    demChuaDoc().then(function (n) { if (window.NWB) window.NWB.datSo('chuong', n); });
  }
  if (document.readyState === 'complete') setTimeout(veSoChuong, 1500);
  else window.addEventListener('load', function () { setTimeout(veSoChuong, 1500); });

  window.NhacTB = { timTen: timTen, sauGuiLop: sauGuiLop, sauGuiPhong: sauGuiPhong, demChuaDoc: demChuaDoc, uidTuMa: uidTuMa, UID_THAY: UID_THAY };
})();
