/* tn-pop-ds.js — DỮ LIỆU THẬT cho hộp tin nhắn thả xuống + hộp chat nhỏ (js/tn-pop.js). Web v1.232.0 (03/10/2026).
   Chạy được ở MỌI trang có thanh tab: trang lớp/khóa/dashboard (js/nw-thanh.js) và 8 trang nw/ (nw/js/thanh.js).

   DANH SÁCH (TnPop.nguon): đúng thứ thầy thấy ở trang Tin nhắn —
     · NHÓM LỚP  = chat lớp myLesson (kho classChat): HS = các lớp của em (claim `lops`), thầy = mọi lớp + khóa trong data/lop.json.
                    Tin cuối = 1 lượt đọc/lớp (getDocs limit 1, KHÔNG mở kênh sống). Chưa đọc = tin cuối của người khác mới hơn mốc
                    `mylesson_xemtin_<lớp>_<mã>` trong máy (CHUNG khoá với trang lớp + trang Tin nhắn).
     · CHAT RIÊNG/NHÓM THẦY LẬP = kho nwChats (thanhVien ∋ em). HS chưa bật chat riêng: chỉ cuộc với thầy (chưa có thì dòng "Thầy Andrew" chờ).
     Bộ nhớ đệm 45 giây ⇒ mở đi mở lại hộp không tốn thêm lượt đọc.
   HỘP CHAT NHỎ: mỗi dòng mang `hop` = địa chỉ nw/tinnhan.html?hop=1&… — một khung nhúng (iframe cùng nhà) chạy ĐÚNG khuôn trang Tin nhắn
     ⇒ gửi/nhận/cảm xúc/trả lời/thu hồi/đã xem y hệt, không viết lại luật.
   TIN MỚI: nghe nwChats (nw/ dùng chung kênh của thanh.js ⇒ 0 lượt đọc thêm; trang lớp/khóa/dashboard mở 1 kênh, tối đa 30 phòng).
     Tin của người khác đến phòng chat riêng (mới hơn lúc mở trang, chưa đọc, không tắt thông báo) ⇒ TnPop.tinMoi ⇒ hộp tự cuộn lên.
     ⬜ Nhóm LỚP chưa có kênh sống ở trang khác ⇒ chưa tự cuộn lên khi có tin lớp mới (chỉ hiện khi mở hộp thả xuống).
   ⭐ v1.253.0 (06/10): SỔ CHƯA ĐỌC CHUNG (khối dưới docXem) — tin cuối mỗi lớp nay có kênh sống limit 1, "đã xem" gộp mốc kho
     classChatXem (mọi máy), số đỏ tab Tin nhắn = số CUỘC chưa đọc; danh sách xếp TIN MỚI NHẤT lên đầu, dựng thẳng từ sổ (0 lượt đọc). */
(function () {
  'use strict';
  var TP = window.TnPop; if (!TP) return;
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var GOC = SRC.replace(/js\/tn-pop-ds\.js.*$/, '');
  var THAY_UID = 'quantri_thay';        // hồ sơ thầy (nwUsers) — cuộc chat riêng của HS với thầy
  var T0 = Date.now() - 2000;           // chỉ tin ĐẾN SAU lúc mở trang mới tự cuộn lên
  var _tamDs = null;                    // { luc, ds }
  var NHOM_LOP = 'tp-lop';

  function laBanThu() { return !!(window.NW && NW.laBanThu && NW.laBanThu()); }
  function laLocal() { return /^(localhost|127\.0\.0\.1)$/.test(location.hostname); }
  function gocDl() {
    if (window.AC_GOC_DL) return window.AC_GOC_DL;
    var g = window.NW && NW.CFG && NW.CFG.GOC_DL;
    return g && /^https?:/.test(g) ? g : GOC;
  }
  function khongDau(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function avUrl(tenGoc, ten) {   // ⛔ chép y js/chung.js avUrl (slug phải khớp từng ký tự)
    return gocDl() + 'assets/avatar/' + (khongDau(tenGoc).replace(/[^a-z0-9]/g, '') || 'lop') + '/' + (khongDau(ten).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'hs') + '.jpg';
  }
  function urlAnh(a) { a = String(a || ''); return !a ? '' : /^(https?:|data:|blob:)/.test(a) ? a : GOC + 'nw/' + a.replace(/^\.?\//, ''); }
  function tenLopHien(l) { var g = String(l.tenGoc || l.maLop || ''); return /[a-z]{3,}/i.test(khongDau(g)) ? g : 'Lớp ' + g; }
  function gioNgan(ms) {
    if (!ms) return ''; var d = new Date(ms), n = new Date();
    if (d.toDateString() === n.toDateString()) return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
    if (n - d < 6 * 86400e3) return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
    return d.getDate() + '/' + (d.getMonth() + 1);
  }
  function chuGon(s) { return String(s || '').replace(/:[0-9a-f]{3,}(?:-[0-9a-f]{2,})*:/g, '🙂').replace(/\s+/g, ' ').trim().slice(0, 80); }
  function maRieng(a, b) { return a < b ? a + '__' + b : b + '__' + a; }

  // ---------- Firebase + người đang đăng nhập (dùng chung app với nw-phien.js / loi.js) ----------
  var _fb = null;
  function nap(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function fb() {
    if (window.NW && NW.fb) return NW.fb();
    if (window.NWP && NWP.fb) return NWP.fb();
    if (!_fb) _fb = nap(GOC + 'js/nw-phien.js?v=8').then(function () { return NWP.fb(); });
    return _fb;
  }
  function nguoiDangNhap() {
    return fb().then(function (f) {
      var lay = f.auth.currentUser ? Promise.resolve(f.auth.currentUser) : new Promise(function (res) { var stop = f.au.onAuthStateChanged(f.auth, function (u) { stop(); res(u || null); }); });
      return lay.then(function (u) {
        if (!u) return null;
        return u.getIdTokenResult().then(function (r) {
          var c = r.claims || {};
          var laThay = c.thay === true || (window.NW && NW.toi && NW.toi.uid === u.uid && NW.toi.laThay);
          var lops = c.lops ? String(c.lops).split(',').filter(Boolean) : ((window.NW && NW.toi && NW.toi.cacLop) || []);
          return { f: f, u: u, uid: u.uid, laThay: !!laThay, ma: laThay ? 'GV' : String(c.ma || ''), lops: lops };
        });
      });
    });
  }

  // ---------- danh sách lớp ----------
  function dsLopJson() {
    try { var o = JSON.parse(sessionStorage.getItem('tpDsLop') || 'null'); if (o && Date.now() - o.luc < 10 * 60e3) return Promise.resolve(o.ds); } catch (e) { }
    return fetch(gocDl() + 'data/lop.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (dl) {
      var ds = (dl.lop || []).concat(dl.khoa || []);
      try { sessionStorage.setItem('tpDsLop', JSON.stringify({ luc: Date.now(), ds: ds })); } catch (e) { }
      return ds;
    });
  }
  function docXem(ma, lop) { try { return Number(localStorage.getItem('mylesson_xemtin_' + lop + '_' + ma)) || 0; } catch (e) { return 0; } }

  // ============================================================
  // ⭐ v1.253.0 (06/10/2026, thầy chốt) — SỔ CHƯA ĐỌC CHUNG: "đã xem" đúng trên MỌI MÁY + số đỏ = số CUỘC chưa đọc.
  //   · Chat riêng/nhóm (nwChats): docLuc/chuaDoc nằm sẵn trên kho ⇒ vốn đồng bộ mọi máy.
  //   · Nhóm lớp (classChat): mốc "đã xem" của máy (localStorage mylesson_xemtin_<lớp>_<mã>) GỘP với mốc trên kho
  //     `classChatXem/<lớp>`[mã | 'GV'].luc (khuôn chat ghi khi người đó THẬT SỰ nhìn thấy tin cuối — js/chat-ui.js thuGhiXem).
  //     Kho mới hơn máy ⇒ chép xuống máy (các trang cũ chỉ đọc localStorage cũng đúng theo) + phát 'ac-tn-xem'.
  //   · Tin cuối mỗi lớp: kênh sống limit 1/lớp (1 lượt đọc lúc mở + 1 lượt mỗi tin mới). Mốc kho: getDoc lúc mở + khi trang
  //     quay lại màn hình (cách ≥ 20 giây) — KHÔNG nghe sống (cả lớp xem tin là cả lớp ghi ⇒ rất tốn lượt đọc).
  //   Ra: TnPop.soChay · số tab Tin nhắn (NWB.datSo / NW.datSoTin) · sự kiện 'ac-tn-so' {lop:{mã:{x,xem,chua}}, so} · TnPop.ngheSo(cb).
  // ============================================================
  var SO = { me: null, chay: false, lop: {}, phong: null, dsLop: [], docKhoLuc: 0, tatLop: [] };
  var ngheSoDs = [], henSo = null;
  function mocXem(me, lop) {
    var a = docXem(me.ma, lop), b = 0, o = SO.lop[lop];
    if (me.laThay) { try { b = Number(localStorage.getItem('mylesson_xemtin_' + lop)) || 0; } catch (e) { } }   // khoá cũ của dashboard
    return Math.max(a, b, (o && o.kho) || 0);
  }
  function ghiMay(me, lop, luc) {
    var doi = false;
    try {
      var k = 'mylesson_xemtin_' + lop + '_' + me.ma;
      if (luc > (Number(localStorage.getItem(k)) || 0)) { localStorage.setItem(k, String(luc)); doi = true; }
      if (me.laThay && luc > (Number(localStorage.getItem('mylesson_xemtin_' + lop)) || 0)) { localStorage.setItem('mylesson_xemtin_' + lop, String(luc)); doi = true; }
    } catch (e) { }
    return doi;
  }
  function lopChua(me, lop) {
    if (SO.tatLop.indexOf(lop) >= 0) return false;   // v1.255.0 — nhóm lớp đã TẮT thông báo không tính vào số đỏ (như chat riêng)
    var x = (SO.lop[lop] || {}).x, luc = x ? Number(x.createdAt) || 0 : 0;
    return luc > 0 && !(x.code && x.code === me.ma) && luc > mocXem(me, lop);
  }
  function phongChuaDs(me) {
    return SO.phong ? loc(me, SO.phong).filter(function (p) { return chuaDocP(me, p) && !((p.tat || {})[me.uid]); }) : [];
  }
  function trangThaiSo() {
    var me = SO.me, lop = {}, n = 0;
    SO.dsLop.forEach(function (l) {
      var ch = lopChua(me, l.maLop); if (ch) n++;
      lop[l.maLop] = { x: (SO.lop[l.maLop] || {}).x || null, xem: mocXem(me, l.maLop), chua: ch };
    });
    return { lop: lop, so: n + phongChuaDs(me).length };
  }
  function tinhSo() {
    henSo = null;
    if (!SO.chay) return;
    var st = trangThaiSo();
    if (window.NWB && NWB.datSo) NWB.datSo('tinNhan', st.so);
    if (window.NW && NW.datSoTin) NW.datSoTin(st.so);
    // v1.255.0 — số đỏ trên ICON APP (màn hình chính iPhone / app máy tính); trình duyệt thường bỏ qua
    try { if (navigator.setAppBadge) { if (st.so) navigator.setAppBadge(st.so).catch(function () { }); else navigator.clearAppBadge().catch(function () { }); } } catch (e) { }
    ngheSoDs.forEach(function (cb) { try { cb(st); } catch (e) { console.warn('[tn-so]', e); } });
    try { window.dispatchEvent(new CustomEvent('ac-tn-so', { detail: st })); } catch (e) { }
    if (TP.veLai) TP.veLai();
  }
  function henTinh() { if (!henSo) henSo = setTimeout(tinhSo, 60); }
  TP.ngheSo = function (cb) { ngheSoDs.push(cb); if (SO.chay) cb(trangThaiSo()); };
  function docKho(ep) {
    var me = SO.me; if (!me || !SO.dsLop.length) return;
    if (!ep && Date.now() - SO.docKhoLuc < 20000) return;
    SO.docKhoLuc = Date.now();
    var khoa = me.laThay ? 'GV' : me.ma;
    SO.dsLop.forEach(function (l) {
      me.f.fs.getDoc(me.f.fs.doc(me.f.db, 'classChatXem', l.maLop)).then(function (s) {
        var d = s.exists() ? (s.data() || {})[khoa] : null, luc = Number(d && d.luc) || 0, o = SO.lop[l.maLop] = SO.lop[l.maLop] || {};
        if (luc <= (o.kho || 0)) return;
        o.kho = luc;
        if (ghiMay(me, l.maLop, luc)) { try { window.dispatchEvent(new CustomEvent('ac-tn-xem', { detail: { lop: l.maLop } })); } catch (e) { } }
        henTinh();
      }).catch(function (e) { console.warn('[tn-so] mốc đã xem ' + l.maLop, e); });
    });
  }
  var _phongCb = [], _phongMo = false;
  function nghePhongChung(me, cb) {   // MỘT kênh nwChats cho cả trang (trang nw/: dùng kênh của thanh.js)
    _phongCb.push(cb);
    if (SO.phong) cb(SO.phong);
    if (_phongMo) return;
    _phongMo = true;
    var nhan = function (ds) { SO.phong = ds || []; _phongCb.forEach(function (f) { f(SO.phong); }); };
    if (window.NW && NW.nghePhong) { NW.nghePhong(nhan); return; }
    me.f.fs.onSnapshot(me.f.fs.query(me.f.fs.collection(me.f.db, 'nwChats'), me.f.fs.where('thanhVien', 'array-contains', me.uid), me.f.fs.orderBy('capNhat', 'desc'), me.f.fs.limit(30)),
      function (snap) { var a = []; snap.forEach(function (d) { a.push(Object.assign({ id: d.id }, d.data())); }); nhan(a); },
      function (e) { console.warn('[tn-pop] kênh phòng chat', e); });
  }
  function batSo(me) {
    SO.me = me;
    return dsLopJson().catch(function () { return []; }).then(function (tatCa) {
      SO.dsLop = me.laThay ? tatCa : me.lops.map(function (m) { return tatCa.filter(function (l) { return l.maLop === m; })[0]; }).filter(Boolean);
      SO.dsLop.forEach(function (l) {
        var o = SO.lop[l.maLop] = SO.lop[l.maLop] || {};
        me.f.fs.onSnapshot(me.f.fs.query(me.f.fs.collection(me.f.db, 'classChat', l.maLop, 'messages'), me.f.fs.orderBy('createdAt', 'desc'), me.f.fs.limit(1)),
          function (s) { var x = null; s.forEach(function (d) { x = d.data(); }); o.x = x; o.co = true; henTinh(); },
          function (e) { o.co = true; console.warn('[tn-so] tin cuối lớp ' + l.maLop, e); henTinh(); });
      });
      SO.chay = true; TP.soChay = true;
      docKho(true);
      if (window.ACDay) ACDay.tatLopDs().then(function (ds) { SO.tatLop = ds || []; henTinh(); });
      nghePhongChung(me, henTinh);
      henTinh();
    });
  }
  window.addEventListener('ac-tn-xem', function () { henTinh(); });
  window.addEventListener('ac-tn-tat', function (e) { SO.tatLop = ((e.detail || {}).ds) || []; henTinh(); });
  // xem trong KHUNG NHÚNG hộp chat nhỏ / tab khác (cùng nhà) ⇒ chỉ thấy qua sự kiện storage — báo lại thành 'ac-tn-xem' cho trang này
  window.addEventListener('storage', function (e) {
    if (!/^mylesson_xemtin_/.test(e.key || '')) return;
    try { window.dispatchEvent(new CustomEvent('ac-tn-xem', { detail: { lop: '' } })); } catch (x) { }
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') docKho(false); });
  window.addEventListener('focus', function () { docKho(false); });

  function itemLop(me, l, x) {
    var thay = { ten: 'Thầy Andrew', url: GOC + 'nw/assets/avatar-tron.jpg', mau: '#9C6ADE' };
    var anh = [thay].concat((l.hocSinh || []).filter(function (h) { return h.ma !== me.ma; }).slice(0, 3).map(function (h) { return { ten: h.ten, url: avUrl(l.tenGoc, h.ten) }; }));
    var cuoi = '', luc = 0, chua = false;
    if (x) {
      luc = Number(x.createdAt) || 0;
      var ai = x.code && x.code === me.ma ? (me.laThay ? 'Thầy: ' : 'Em: ') : (String(x.name || '').split(' ').pop() + ': ');
      var nd = x.thuHoi ? 'Tin nhắn đã bị thu hồi' : (x.hinh && x.text === '[Hình ảnh]' ? '📷 Ảnh' : (x.sticker && !x.text ? 'Nhãn dán' : chuGon(x.text)));
      cuoi = ai + nd;
      chua = luc > mocXem(me, l.maLop) && !(x.code && x.code === me.ma);   // v1.253.0: gộp mốc máy + mốc kho (mọi máy)
    }
    return { id: 'lop:' + l.maLop, ten: tenLopHien(l), loai: 'lop', anh: anh, cuoi: cuoi, gio: gioNgan(luc), chua: chua, luc: luc,
             q: 'phong=' + encodeURIComponent('lop:' + l.maLop), hop: 'nw/tinnhan.html?hop=1&phong=' + encodeURIComponent('lop:' + l.maLop) };
  }
  function nguoiKia(me, p) { var k = (p.thanhVien || []).filter(function (u) { return u !== me.uid; })[0] || me.uid; return Object.assign({ uid: k }, (p.tv || {})[k] || { ten: '?' }); }
  function chuaDocP(me, p) { var tc = p.tinCuoi || {}; return !!((p.chuaDoc || {})[me.uid]) || !!(tc.luc && tc.uid !== me.uid && tc.luc > ((p.docLuc || {})[me.uid] || 0)); }
  function itemPhong(me, p) {
    var tc = p.tinCuoi || {}, tv = p.tv || {};
    var nhom = p.loai === 'nhom', k = nhom ? null : nguoiKia(me, p);
    var thay = !!(k && k.vaiTro === 'gv');
    var anh = nhom ? (p.thanhVien || []).filter(function (u) { return u !== me.uid; }).slice(0, 4).map(function (u) { return { ten: (tv[u] || {}).ten || '?', url: urlAnh((tv[u] || {}).anh) }; })
                   : [{ ten: k.ten || '?', url: urlAnh(k.anh), mau: thay ? '#9C6ADE' : '' }];
    var cuoi = '';
    if (tc.luc) cuoi = (tc.uid === me.uid ? (me.laThay ? 'Thầy: ' : 'Em: ') : (nhom ? String(tc.ten || '').split(' ').pop() + ': ' : '')) + chuGon(tc.chu || (tc.hinh ? '📷 Ảnh' : ''));
    var it = { id: p.id, ten: nhom ? (p.ten || 'Nhóm') : (k.ten || '?'), loai: thay ? 'thay' : nhom ? 'nhom' : 'rieng', anh: anh, cuoi: cuoi, gio: gioNgan(tc.luc || p.capNhat), chua: chuaDocP(me, p),
              luc: tc.luc || p.capNhat || 0, lop: k && k.lop ? 'Lớp ' + k.lop : '', tat: !!((p.tat || {})[me.uid]), nhomThay: nhom };
    it.q = nhom ? 'phong=' + encodeURIComponent(p.id) : 'voi=' + encodeURIComponent(k.uid);
    it.hop = 'nw/tinnhan.html?hop=1&' + it.q;
    return it;
  }
  function loc(me, ds) {   // luật y trang Tin nhắn: cuộc em đã xoá giấu tới khi có tin mới; HS chưa bật chat riêng chỉ có cuộc với thầy
    var choRieng = !!(me.laThay || (window.NW && NW.CFG && NW.CFG.BAT_CHAT_RIENG));
    return ds.filter(function (p) {
      if (((p.anLuc || {})[me.uid] || 0) >= (p.capNhat || 0)) return false;
      if (p.loai !== 'nhom' && !p.tinCuoi) return false;   // 03/10: phòng riêng chưa có tin nào — không hiện
      if (!choRieng) return p.loai !== 'nhom' && nguoiKia(me, p).vaiTro === 'gv';
      return true;
    });
  }

  function layDs() {
    return nguoiDangNhap().then(function (me) {
      if (!me) throw new Error('chua-dang-nhap');
      return Promise.all([
        dsLopJson().catch(function () { return []; }),
        me.f.fs.getDocs(me.f.fs.query(me.f.fs.collection(me.f.db, 'nwChats'), me.f.fs.where('thanhVien', 'array-contains', me.uid), me.f.fs.orderBy('capNhat', 'desc'), me.f.fs.limit(30)))
          .then(function (s) { var a = []; s.forEach(function (d) { a.push(Object.assign({ id: d.id }, d.data())); }); return a; }).catch(function () { return []; })
      ]).then(function (kq) {
        var tatCaLop = kq[0], phongs = loc(me, kq[1]);
        var can = me.laThay ? tatCaLop : me.lops.map(function (m) { return tatCaLop.filter(function (l) { return l.maLop === m; })[0]; }).filter(Boolean);
        return Promise.all(can.map(function (l) {
          return me.f.fs.getDocs(me.f.fs.query(me.f.fs.collection(me.f.db, 'classChat', l.maLop, 'messages'), me.f.fs.orderBy('createdAt', 'desc'), me.f.fs.limit(1)))
            .then(function (s) { var x = null; s.forEach(function (d) { x = d.data(); }); return itemLop(me, l, x); }, function () { return itemLop(me, l, null); });
        })).then(function (lops) {
          return ghep(me, lops, phongs.map(function (p) { return itemPhong(me, p); }));
        });
      });
    });
  }
  // v1.253.0 (thầy chốt 06/10) — MỌI cuộc (nhóm lớp, nhóm, chat riêng, thầy) xếp chung: TIN MỚI NHẤT lên đầu, như Messenger.
  // Cuộc chưa có tin nào (luc 0) xuống cuối, giữ thứ tự cũ (lớp trước).
  function ghep(me, lops, rieng) {
    // HS: luôn có dòng Thầy Andrew (chưa nhắn lần nào ⇒ "Bắt đầu trò chuyện"; bấm mới tạo phòng)
    if (!me.laThay && !rieng.some(function (r) { return r.loai === 'thay'; })) {
      rieng.push({ id: maRieng(me.uid, THAY_UID), ten: 'Thầy Andrew', loai: 'thay', anh: [{ ten: 'Thầy Andrew', url: GOC + 'nw/assets/avatar-tron.jpg', mau: '#9C6ADE' }], cuoi: '', gio: '', chua: false, luc: 0,
        q: 'voi=' + THAY_UID, hop: 'nw/tinnhan.html?hop=1&voi=' + THAY_UID });
    }
    var ds = lops.concat(rieng);
    ds.forEach(function (c, i) { c._i = i; });
    return ds.sort(function (a, b) { return (b.luc || 0) - (a.luc || 0) || a._i - b._i; });
  }
  // Sổ chung đã đủ (tin cuối mọi lớp + kênh phòng chat) ⇒ dựng danh sách NGAY từ đó: 0 lượt đọc, luôn mới.
  function dsTuSo() {
    var me = SO.me;
    if (!SO.chay || !SO.phong || SO.dsLop.some(function (l) { return !(SO.lop[l.maLop] || {}).co; })) return null;
    return ghep(me, SO.dsLop.map(function (l) { return itemLop(me, l, SO.lop[l.maLop].x || null); }), loc(me, SO.phong).map(function (p) { return itemPhong(me, p); }));
  }

  // ---------- đầu vào cho TnPop ----------
  TP.nguon = function () {
    if (laBanThu()) return TP.mau();
    var song = dsTuSo(); if (song) return Promise.resolve(song);
    if (_tamDs && Date.now() - _tamDs.luc < 45000) return Promise.resolve(_tamDs.ds);
    return layDs().then(function (ds) { _tamDs = { luc: Date.now(), ds: ds }; return ds; }, function (e) {
      if (laLocal() && /chua-dang-nhap/.test(String(e && e.message))) return TP.mau();   // bàn thử localhost không đăng nhập ⇒ danh sách mẫu
      throw e;
    });
  };
  TP.lamMoi = function () { _tamDs = null; };


  // ---------- THÔNG BÁO (icon chuông): nwUsers/{uid}/thongBao, 20 tin mới nhất, đệm 30 giây ----------
  var _tamTB = null;
  TP.nguonTB = function () {
    if (laBanThu()) { var t = Date.now(); return Promise.resolve([
      { id: 't1', loai: 'camXuc', tuTen: 'MINH ANH', chu: '❤️ Được 3 sao bài Listening hôm nay', luc: t - 1500e3, daDoc: false, link: 'baidang.html?id=m0' },
      { id: 't2', loai: 'binhLuan', tuTen: 'Thầy Andrew', tuAnh: GOC + 'nw/assets/avatar-tron.jpg', chu: 'Cảm ơn em, đội em nói rất tự tin đó!', luc: t - 2700e3, daDoc: true, link: 'baidang.html?id=m6' }]); }
    if (_tamTB && Date.now() - _tamTB.luc < 30000) return Promise.resolve(_tamTB.ds);
    return nguoiDangNhap().then(function (me) {
      if (!me) throw new Error('chua-dang-nhap');
      return me.f.fs.getDocs(me.f.fs.query(me.f.fs.collection(me.f.db, 'nwUsers', me.uid, 'thongBao'), me.f.fs.orderBy('luc', 'desc'), me.f.fs.limit(20))).then(function (s) {
        var a = []; s.forEach(function (d) { a.push(Object.assign({ id: d.id }, d.data())); });
        _tamTB = { luc: Date.now(), ds: a }; return a;
      });
    }).catch(function (e) {
      if (laLocal() && /chua-dang-nhap/.test(String(e && e.message))) return [];
      throw e;
    });
  };
  TP.docTB = function (ids) {
    if (!ids || !ids.length || laBanThu()) return;
    _tamTB = null;
    nguoiDangNhap().then(function (me) {
      if (!me) return;
      var b = me.f.fs.writeBatch(me.f.db);
      ids.forEach(function (id) { b.update(me.f.fs.doc(me.f.db, 'nwUsers', me.uid, 'thongBao', id), { daDoc: true }); });
      return b.commit();
    }).catch(function (e) { console.warn('[tn-pop] đánh dấu đã đọc', e); });
  };

  // ---------- TIN MỚI: tự cuộn hộp chat lên ----------
  var daNghe = false, thay = {};   // thay[phongId] = mốc tin cuối đã xử lý
  TP.batNghe = function () {
    if (daNghe || laBanThu() || /[?&]hop=1(&|$)/.test(location.search)) return;   // khung nhúng hộp chat nhỏ: không đếm, không tự mở hộp
    daNghe = true;
    nguoiDangNhap().then(function (me) {
      if (!me) return;
      batSo(me);   // v1.253.0 — sổ chưa đọc chung (mọi trang, kể cả trang Tin nhắn)
      if (/\/nw\/tinnhan\.html$/.test(location.pathname)) return;   // trang Tin nhắn: không tự mở hộp chat nhỏ
      var xuLy = function (ds) {
        loc(me, ds).forEach(function (p) {
          var tc = p.tinCuoi || {}, truoc = thay[p.id] || 0;
          if (!tc.luc || tc.luc <= truoc) return;
          thay[p.id] = tc.luc;
          if (tc.luc < T0 || tc.uid === me.uid || ((p.tat || {})[me.uid]) || tc.luc <= ((p.docLuc || {})[me.uid] || 0)) return;
          _tamDs = null;
          TP.tinMoi(itemPhong(me, p));
        });
      };
      nghePhongChung(me, xuLy);   // v1.253.0: chung MỘT kênh với sổ chưa đọc
    }).catch(function (e) { console.warn('[tn-pop] không nghe được tin mới', e); });
  };
  TP.daNapDs = true;
  setTimeout(TP.batNghe, 2500);
})();
