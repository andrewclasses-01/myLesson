/* ⛔ FILE SINH TỰ ĐỘNG từ kho myPay v0.16.0 (d866402) bằng tools/dong-goi-web.js — ĐỪNG SỬA TAY (sửa ở kho myPay rồi đóng gói lại) */
/* ============================================================
   myPay WEB — KHO MẠNG (kho-may.js) · Đợt 1 (03/10/2026)

   Nối "máy ảo" (may-ao.js) với Firestore:
   • Nạp lúc mở trang (CHỈ THẦY — luật Firestore laThay()):
       payKho/*                    → E:\LAP TRINH APP\myPay-data\…   (dữ liệu riêng của myPay: cài đặt, gia đình, tháng…)
       mystudentRosterStudents/Classes → myStudent-data\shared\hoc_sinh.json + lop.json (lọc y như myStudent xuất)
       mystudentSoDiemDanh (từ mốc "Các tháng") → myData\Diem danh\<d-m-yyyy>.json (đổi id sang SỐ myPay)
       payMaHs/so + payMaHs/ngay-yyyy-MM → bảng số myPay + bảng nối danh tính từng ngày (xem nap-du-lieu.js)
   • Sau MỖI thao tác (mỗi kênh IPC): file nào myPay vừa ghi trong myPay-data ⇒ ghi lên payKho/<file> bằng
     GIAO DỊCH có số PHIÊN: máy khác vừa ghi trước (phiên lệch) ⇒ KHÔNG đè, nạp lại + báo thầy làm lại.
     Sao lưu (_backup-*) ⇒ payKhoSaoLuu (chỉ thêm).
   • Nghe payKho trực tiếp: điện thoại sửa ⇒ máy tính tự cập nhật (và ngược lại).
   Lượt đọc mỗi lần mở ≈ 12 (payKho) + ~6 (payMaHs) + ~276 (danh sách) + số ngày điểm danh từ mốc "Các tháng".
   ============================================================ */
(function () {
  'use strict';
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
  var CAU_HINH = {
    apiKey: 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY', authDomain: 'aword-70dae.firebaseapp.com', projectId: 'aword-70dae',
    storageBucket: 'aword-70dae.firebasestorage.app', messagingSenderId: '399279049436', appId: '1:399279049436:web:b9b34dcfb34732aa744219'
  };
  var DUOI_QT = '@quantri.andrewclasses.com';
  var EMAIL_THAY = 'namdaptrai01@gmail.com';   // ⛔ phải khớp js/thay.js (đăng nhập Google của thầy trên Dashboard)
  var TEN_APP = 'mypay';                        // app Firebase RIÊNG cho phiên myPay (08/10/2026)
  var GOC_E = 'E:\\LAP TRINH APP';
  var DIR_DATA = GOC_E + '\\myPay-data';
  var DIR_SO = GOC_E + '\\myData\\Diem danh';
  var DIR_SHARED = GOC_E + '\\myStudent-data\\shared';
  var DIR_TAI = GOC_E + '\\_tai-len';
  var ND = window.NapDuLieu;
  var G = window.MyPayGoi;

  // ───────── màn chờ / màn chặn ─────────
  function man(chu, loi) {
    var m = document.getElementById('pyMan');
    if (!m) return;
    m.hidden = !chu;
    m.classList.toggle('loi', !!loi);
    var c = document.getElementById('pyManChu'); if (c) c.innerHTML = chu || '';
  }
  function bao(chu) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = chu; t.classList.add('on');
    clearTimeout(bao._h); bao._h = setTimeout(function () { t.classList.remove('on'); }, 3200);
  }

  // ───────── máy ảo + code myPay ─────────
  var hetSan; var loiSan;
  var san = new Promise(function (a, b) { hetSan = a; loiSan = b; });
  var dangDoi = new Set();          // file myPay-data vừa ghi, chưa lên mạng (đường tương đối)
  var daXoa = new Set();
  var saoLuu = [];                  // [{duong, noiDung}]
  var PHIEN = new Map();            // đường tương đối → phiên đang có trên mạng
  var K = null;                     // { fs, db, au, a, uid }

  function relCua(p) {
    var x = String(p); var d = DIR_DATA + '\\';
    if (x.toLowerCase().indexOf(d.toLowerCase()) !== 0) return null;
    return x.slice(d.length);
  }
  var tenDoc = function (rel) { return rel.replace(/\\/g, '__'); };
  var relTuDoc = function (id) { return id.replace(/__/g, '\\'); };
  function laDongBo(rel) {   // file nào được đồng bộ lên payKho
    return /^[^\\]+\.json$/i.test(rel) && rel.toLowerCase() !== 'cua-so.json' || /^thang\\\d{4}-\d{2}\.json$/i.test(rel);
  }

  // ───────── Đợt 2: file sao kê — đọc trong trình duyệt ─────────
  // Kéo-thả: giao diện myPay cần ĐƯỜNG DẪN ngay (đồng bộ) ⇒ cấp đường ảo ngay + đọc file song song; kênh kế tiếp
  // (saoke:nap) CHỜ đọc xong mới chạy (truocMoiKenh). File chỉ nằm trong bộ nhớ trang (không lên mạng) — y như app chỉ
  // giữ đường dẫn; kết quả đọc (giao dịch) mới được lưu vào payKho như app.
  var dangDocFile = [];
  function duongTai(ten) { return DIR_TAI + '\\' + String(ten || 'sao-ke.xlsx').replace(/[\\/:*?"<>|]+/g, '-'); }
  function docFileVaoMay(f) {
    var p = duongTai(f.name);
    var lan = f.arrayBuffer().then(function (b) { may.datFile(p, new Uint8Array(b)); });
    dangDocFile.push(lan);
    return { p: p, lan: lan };
  }
  // giải nén ZIP bên trong file .xlsx (thư viện pako — nạp ở pay.html)
  var zlibWeb = {
    inflateRawSync: function (raw) {
      if (!window.pako) throw new Error('Chưa tải được bộ giải nén (pako) — kiểm tra mạng rồi tải lại trang');
      return MayAo.BufferNho.from(window.pako.inflateRaw(raw));
    }
  };

  var may = MayAo.taoMay({
    chiDoc: [GOC_E + '\\myData', GOC_E + '\\myStudent-data'],
    cuaSo: window, phienBan: G.__PHIEN_BAN + ' web', san: san,
    sauMoiKenh: function (kenh, kq) { return luuLenMang().then(function () { return kq; }, function (e) { return loiLuu(e); }); },
    truocMoiKenh: function () { var ds = dangDocFile.splice(0); return Promise.all(ds); },
    chonFile: chonFileTuMay,
    duongFile: function (f) { return f && f.name && /\.(xlsx|xlsm)$/i.test(f.name) ? docFileVaoMay(f).p : ''; },
    zlib: zlibWeb
  });
  may.nghe(function (p, kieu) {
    var rel = relCua(p); if (!rel || /\.tmp$/i.test(rel)) return;
    if (/^_backup/i.test(rel)) { if (kieu === 'ghi') saoLuu.push({ duong: rel, noiDung: may.layFile(p) }); return; }
    if (!laDongBo(rel)) return;
    if (kieu === 'xoa') { daXoa.add(rel); dangDoi.delete(rel); } else { dangDoi.add(rel); daXoa.delete(rel); }
  });
  var nap = may.taoNap(G);
  nap(G.__CHINH);     // main.js: đăng ký mọi kênh IPC (y như app)
  nap(G.__CAU);       // preload.js: dựng window.mypay (y như app)

  // ───────── vài kênh riêng của web (thay chỗ chỉ có trên máy tính) ─────────
  function bocWeb(fn) { return function () { var a = Array.prototype.slice.call(arguments, 1); return Promise.resolve().then(function () { return fn.apply(null, a); }).then(function (d) { return { ok: true, data: d }; }, function (e) { return { ok: false, loi: String((e && e.message) || e) }; }); }; }
  function dataUrlRaBlob(u) {
    var m = /^data:([^;]+);base64,(.*)$/.exec(u); var bin = atob(m[2]); var b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return new Blob([b], { type: m[1] });
  }
  may.KENH['hoadon:ghi'] = bocWeb(function (tenFile, dataUrl) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(dataUrlRaBlob(dataUrl)); a.download = String(tenFile || 'hoa-don') .replace(/[\\/:*?"<>|]+/g, '-') + (/\.png$/i.test(tenFile) ? '' : '.png');
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return 'thư mục Tải xuống của máy';      // giao diện tự ghép thành "Đã lưu: thư mục Tải xuống của máy"
  });
  may.KENH['hoadon:saochep'] = bocWeb(function (dataUrl) {
    if (!navigator.clipboard || !window.ClipboardItem) throw new Error('Trình duyệt này không cho chép ảnh — bấm "Tải ảnh" thay thế');
    return navigator.clipboard.write([new ClipboardItem({ 'image/png': dataUrlRaBlob(dataUrl) })]).then(function () { return true; });
  });
  may.KENH['hoadon:moThuMuc'] = bocWeb(function () { throw new Error('Trên web ảnh hóa đơn nằm ở thư mục Tải xuống của máy'); });
  may.KENH['saoke:mo'] = bocWeb(function () { throw new Error('Trên web không mở lại được file Excel gốc'); });
  may.KENH['fs:trangthai'] = bocWeb(function () { return { coKhoa: true }; });
  may.KENH['app:thongtin'] = bocWeb(function () { return { version: G.__PHIEN_BAN + ' web', dataDir: 'Firestore (payKho)' }; });
  may.KENH['fs:day'] = bocWeb(function () { throw new Error('Đẩy hóa đơn lên trang học sinh: làm ở Đợt 3'); });

  // chọn file sao kê (Đợt 2 dùng): đọc file vào ổ ảo, trả đường dẫn giả
  // Mở hộp chọn file NGAY trong cú bấm (giao-dien-web.js gọi lúc bắt cú bấm nút "Chọn file sao kê") — iPhone/Safari chỉ cho
  // mở hộp chọn file khi đang trong cú bấm; kênh saoke:chon chạy sau (qua hàng đợi) chỉ việc NHẬN kết quả đã chờ sẵn.
  // ⛔ Bấm Hủy: trình duyệt mới có sự kiện 'cancel'; trình duyệt cũ thì đoán qua lúc cửa sổ lấy lại tiêu điểm — KHÔNG được
  //    treo lời hứa (treo là kẹt cả hàng đợi thao tác).
  var choChon = null;
  function moChonFileNgay() {
    choChon = new Promise(function (xong) {
      var daXong = false;
      var ket = function (ds) {
        if (daXong) return; daXong = true;
        window.removeEventListener('focus', khiVe);
        Promise.all(ds.map(function (x) { return x.lan; })).then(function () { xong({ canceled: !ds.length, filePaths: ds.map(function (x) { return x.p; }) }); },
          function () { xong({ canceled: true, filePaths: [] }); });
      };
      var i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = '.xlsx,.xlsm';
      i.onchange = function () { ket(Array.prototype.slice.call(i.files || []).map(docFileVaoMay)); };
      i.addEventListener('cancel', function () { ket([]); });
      var khiVe = function () { setTimeout(function () { if (!i.files || !i.files.length) ket([]); }, 1500); };
      window.addEventListener('focus', khiVe);
      i.click();
    });
    return choChon;
  }
  function chonFileTuMay() {
    var p = choChon || moChonFileNgay();
    choChon = null;
    return p;
  }

  // ───────── Firestore ─────────
  // ⭐ 06/10/2026 (thầy chốt) — PHIÊN myPay RIÊNG: vào bằng tài khoản quản trị ID + mật khẩu + mã 6 số; máy chủ (luật payPhien,
  // tools/dang-luat-pay-phien.js kho web) chỉ mở kho học phí cho phiên có mã 6 số (sign_in_second_factor 'totp') đăng nhập
  // trong 6 giờ ⇒ phiên dashboard / vé app ký uid 'thay' bị chặn.
  // ⭐ 08/10/2026 (thầy chốt, myPay v0.16.0) — MÁY NHỚ PHIÊN 6 GIỜ, kể cả đóng tab (trước: đóng tab = thoát). Phiên myPay nằm
  // trong app Firebase RIÊNG tên 'mypay' (IndexedDB khoá `…:mypay`) nên KHÔNG đụng phiên dashboard (app [DEFAULT]) — đăng xuất
  // bên này không đá bên kia. KHOÁ THÊM (thầy chọn "gắn với Dashboard"): chỉ vào thẳng khi Dashboard trên máy đó cũng đang
  // đăng nhập tài khoản thầy (đọc phiên [DEFAULT] — chỉ đọc); Dashboard đăng xuất ⇒ myPay thoát theo.
  // ⛔ App Check (js/app-check.js) chỉ gắn vào app [DEFAULT] ⇒ app 'mypay' mượn mã App Check đã cất ('awc_ac') qua CustomProvider.
  function moKho() {
    if (window.PayBanThu) return window.PayBanThu.san;     // bàn thử trên máy (ban-thu.js tự kiểm localhost + ?banthu)
    var acMod = import(SDK + '/firebase-app-check.js')['catch'](function () { return null; });
    return Promise.all([import(SDK + '/firebase-app.js'), import(SDK + '/firebase-auth.js'), import(SDK + '/firebase-firestore.js'), acMod]).then(function (m) {
      // [DEFAULT] tạo TRƯỚC (app-check.js gọi getApp() mặc định) — chỉ để đọc phiên Dashboard
      var coMacDinh = m[0].getApps().some(function (x) { return x.name === '[DEFAULT]'; });
      var appDash = coMacDinh ? m[0].getApp() : m[0].initializeApp(CAU_HINH);
      // phiên myPay cũ (≤ v0.15.0) nằm ở sessionStorage của [DEFAULT] — xoá kẻo getAuth() mặc định nhặt nó làm phiên Dashboard
      try { sessionStorage.removeItem('firebase:authUser:' + CAU_HINH.apiKey + ':[DEFAULT]'); } catch (e) { /* thôi */ }
      var aDash = m[1].getAuth(appDash);
      var app = m[0].getApps().filter(function (x) { return x.name === TEN_APP; })[0] || m[0].initializeApp(CAU_HINH, TEN_APP);
      ganAppCheck(m[3], app);
      var a;
      try { a = m[1].initializeAuth(app, { persistence: [m[1].indexedDBLocalPersistence, m[1].browserLocalPersistence] }); }
      catch (e) { a = m[1].getAuth(app); }   // đã có Auth (không nên xảy ra) — máy chủ vẫn chặn phiên không đủ điều kiện
      return { fs: m[2], db: m[2].getFirestore(app), au: m[1], a: a, aDash: aDash };
    });
  }
  // Mã App Check cho app 'mypay' = mã app-check.js đã cất cho [DEFAULT] (localStorage 'awc_ac' {t, het}); chưa có thì chờ tối đa 10 s.
  function ganAppCheck(c, app) {
    if (!c) return;
    function layMa() {
      return new Promise(function (xong, hong) {
        var bd = Date.now();
        (function thu() {
          var o = null; try { o = JSON.parse(localStorage.getItem('awc_ac') || 'null'); } catch (e) { o = null; }
          if (o && o.t && o.het > Date.now() + 60000) { xong({ token: o.t, expireTimeMillis: o.het }); return; }
          if (Date.now() - bd > 10000) { hong(new Error('chua-co-ma-app-check')); return; }
          setTimeout(thu, 500);
        })();
      });
    }
    try { c.initializeAppCheck(app, { provider: new c.CustomProvider({ getToken: layMa }), isTokenAutoRefreshEnabled: true }); }
    catch (e) { /* App Check hỏng thì chạy như cũ (máy chủ đang chỉ theo dõi) */ }
  }
  // Dashboard trên máy này có đang đăng nhập tài khoản THẦY? (quản trị ID+mã 6 số, hoặc Google của thầy — KHÔNG tính vé app uid 'thay')
  function laThayDash(u) {
    return !!(u && u.email && (u.email.slice(-DUOI_QT.length) === DUOI_QT || (u.email === EMAIL_THAY && u.emailVerified)));
  }
  function choDash(k) {
    if (window.PayBanThu) return Promise.resolve(window.PayBanThu.dash());
    return new Promise(function (xong) {
      var dung = k.au.onAuthStateChanged(k.aDash, function (u) { dung(); xong(laThayDash(u) ? u : null); });
    });
  }
  // Mở myPay lúc Dashboard đang đăng nhập thầy mà Dashboard đăng xuất (tab khác) ⇒ myPay thoát theo.
  function ngheDash() {
    if (window.PayBanThu || !K.aDash) return;
    K.au.onAuthStateChanged(K.aDash, function (u) {
      if (!laThayDash(u)) dangXuat('Dashboard trên máy này vừa đăng xuất — myPay cũng thoát. Thầy đăng nhập lại nhé.');
    });
  }
  var HAN_PHIEN = 6 * 3600 * 1000;   // ⛔ phải khớp luật payPhien (21600000 ms)
  var BIEN = 2 * 60 * 1000;          // hết sớm 2 phút cho khỏi lệch đồng hồ máy
  // Phiên hợp lệ ⇒ { u, het } (het = mốc hết hạn, ms) · không ⇒ null
  function kiemPhien(k, u) {
    if (!u) return Promise.resolve(null);
    if (window.PayBanThu) return Promise.resolve(window.PayBanThu.phien(u));
    if (!(u.email && u.email.slice(-DUOI_QT.length) === DUOI_QT)) return Promise.resolve(null);
    return u.getIdTokenResult().then(function (t) {
      var c = t.claims || {}; var f = c.firebase || {};
      var luc = Number(c.auth_time) * 1000;
      if (c.thay !== true || f.sign_in_second_factor !== 'totp' || !luc) return null;
      var het = luc + HAN_PHIEN - BIEN;
      return Date.now() < het ? { u: u, het: het } : null;
    }, function () { return null; });
  }
  function choPhien(k) {
    return new Promise(function (xong) {
      var dung = k.au.onAuthStateChanged(k.a, function (u) { dung(); kiemPhien(k, u).then(xong); });
    });
  }

  // ───────── đăng nhập (tài khoản quản trị: ID + mật khẩu + mã 6 số — cùng tài khoản dashboard, js/thay.js) ─────────
  function emailTuId(id) {
    var chuan = String(id || '').replace(/\s+/g, '').toUpperCase();
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(chuan)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('').slice(0, 24) + DUOI_QT;
    });
  }
  function maLoi(e) { return String((e && (e.code || e.message)) || ''); }
  function chuLoi(e) {
    var c = maLoi(e);
    if (/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(c)) return 'Sai ID hoặc mật khẩu.';
    if (/too-many-requests/.test(c)) return 'Sai quá nhiều lần — đợi vài phút rồi thử lại.';
    if (/user-disabled/.test(c)) return 'Tài khoản đang bị khoá.';
    if (/invalid-verification-code|invalid-code|missing-code/.test(c)) return 'Mã 6 số không đúng (hoặc đã quá 30 giây) — gõ mã mới.';
    if (/chua-co-ma/.test(c)) return 'Tài khoản chưa cài mã 6 số — cài trên Dashboard trước.';
    if (/chua-du-quyen/.test(c)) return 'Tài khoản này không mở được myPay.';
    if (/network/.test(c)) return 'Mất mạng — thử lại.';
    return 'Không đăng nhập được (' + c.replace(/</g, '&lt;') + ').';
  }
  // Hiện khung đăng nhập trong màn chờ; trả Promise<{u, het}> khi đăng nhập xong.
  function hoiDangNhap(k, loiDau) {
    return new Promise(function (xong) {
      var giai = null, goi = null;
      function ve(buoc, loi) {
        var m = document.getElementById('pyMan'); if (m) { m.classList.remove('loi'); m.classList.add('dn'); }
        man('<div class="py-dn-tieu">myPay · Học phí</div>' +
          '<div class="py-dn-phu">Đăng nhập một lần, máy này nhớ 6 giờ (kể cả đóng tab) khi Dashboard vẫn đăng nhập. Bấm Đăng xuất để thoát ngay.</div>' +
          '<form id="pyDn" class="py-dn" autocomplete="off">' +
          (buoc === 'ma'
            ? '<input id="pyDnMa" inputmode="numeric" maxlength="6" placeholder="Mã 6 số (Google Authenticator)" autocomplete="one-time-code">'
            : '<input id="pyDnId" placeholder="ID quản trị" autocapitalize="characters" autocomplete="username">' +
              '<input id="pyDnMk" type="password" placeholder="Mật khẩu" autocomplete="current-password">') +
          '<button type="submit" class="btn primary">' + (buoc === 'ma' ? 'Xác nhận' : 'Đăng nhập') + '</button>' +
          '<div class="py-dn-loi">' + (loi || '') + '</div></form>' +
          '<a class="py-dn-ve" href="dashboard.html">← Về Dashboard</a>');
        var f = document.getElementById('pyDn');
        var o = document.getElementById(buoc === 'ma' ? 'pyDnMa' : 'pyDnId'); if (o) o.focus();
        f.addEventListener('submit', function (ev) {
          ev.preventDefault();
          var nut = f.querySelector('button'); nut.disabled = true;
          var p = buoc === 'ma' ? nhapMa(document.getElementById('pyDnMa').value) : nhapMk(document.getElementById('pyDnId').value, document.getElementById('pyDnMk').value);
          p.then(function (ph) {
            if (!ph) throw new Error('chua-du-quyen');
            var m2 = document.getElementById('pyMan'); if (m2) m2.classList.remove('dn');
            xong(ph);
          })['catch'](function (e) {
            if (e && e.__daVe) return;                                   // đã chuyển sang bước mã 6 số
            var sai6 = /invalid-verification-code|invalid-code|missing-code/.test(maLoi(e));
            if (buoc === 'ma' && sai6) { ve('ma', chuLoi(e)); return; }   // gõ lại mã, giữ bước
            k.au.signOut(k.a)['catch'](function () {});
            ve('mk', chuLoi(e));
          });
        });
      }
      function nhapMk(id, mk) {
        return emailTuId(id).then(function (email) {
          return k.au.signInWithEmailAndPassword(k.a, email, mk).then(function () {
            throw new Error('chua-co-ma');   // vào được mà KHÔNG hỏi mã ⇒ tài khoản chưa cài mã 6 số (máy chủ cũng chặn)
          }, function (e) {
            if (!e || e.code !== 'auth/multi-factor-auth-required') throw e;
            giai = k.au.getMultiFactorResolver(k.a, e);
            goi = giai.hints.filter(function (h) { return h.factorId === k.au.TotpMultiFactorGenerator.FACTOR_ID; })[0];
            if (!goi) throw new Error('chua-co-ma');
            ve('ma');
            var d = new Error('da-ve'); d.__daVe = true; throw d;
          });
        });
      }
      function nhapMa(ma) {
        var kd = k.au.TotpMultiFactorGenerator.assertionForSignIn(goi.uid, String(ma || '').replace(/\D/g, ''));
        return giai.resolveSignIn(kd).then(function (r) { return kiemPhien(k, r.user); });
      }
      ve('mk', loiDau);
    });
  }
  // Hết 6 giờ / bấm Đăng xuất ⇒ thoát phiên + tải lại (= màn đăng nhập; dữ liệu trong bộ nhớ trang mất theo)
  var _hetLuc = 0;
  function dangXuat(lyDo) {
    try { sessionStorage.setItem('py_ly_do', lyDo || ''); } catch (e) { /* thôi */ }
    return Promise.resolve(K && K.au && K.au.signOut ? K.au.signOut(K.a) : null)['catch'](function () {}).then(function () { location.reload(); });
  }
  function canhGioHet(het) {
    _hetLuc = het;
    var kiem = function () { if (_hetLuc && Date.now() >= _hetLuc) { _hetLuc = 0; dangXuat('Phiên myPay đã quá 6 giờ — thầy đăng nhập lại nhé.'); } };
    setInterval(kiem, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kiem(); });
  }

  var bangSo = null;                // payMaHs/so
  var soHsTheoGid = new Map();      // hsSo/soCai: gid → số học sinh vĩnh viễn (Đợt 4, 06/10/2026)
  var bangThang = {};               // 'yyyy-MM' → { ngay: {...} }
  var thangDoi = new Set();         // bảng ngày tháng nào vừa dựng lại (cần ghi lên)
  var nguon = { hs: [], lop: [] };

  function docTatCa(q) { return K.fs.getDocs(q).then(function (s) { return s.docs.map(function (d) { var o = d.data(); o.__id = d.id; return o; }); }); }

  function napPayKho() {
    return docTatCa(K.fs.collection(K.db, 'payKho')).then(function (ds) {
      ds.forEach(function (d) {
        var rel = relTuDoc(d.__id);
        if (d.xoa) { may.xoaFile(DIR_DATA + '\\' + rel); } else may.datFile(DIR_DATA + '\\' + rel, String(d.json || ''));
        PHIEN.set(rel, Number(d.phien) || 0);
      });
      return ds.length;
    });
  }

  function napDiemDanh(tuIso) {
    return Promise.all([
      docTatCa(K.fs.collection(K.db, 'mystudentRosterStudents')),
      docTatCa(K.fs.collection(K.db, 'mystudentRosterClasses')),
      docTatCa(K.fs.collection(K.db, 'payMaHs')),
      docTatCa(K.fs.query(K.fs.collection(K.db, 'mystudentSoDiemDanh'), K.fs.where('ngay', '>=', tuIso))),
      // ⭐ 06/10/2026 (Đợt 4) — SỔ HỘ TỊCH: mỗi em MỘT số vĩnh viễn 100001+ (gid các dòng lớp/khóa/bổ sung ⇒ cùng số)
      K.fs.getDoc(K.fs.doc(K.db, 'hsSo', 'soCai')).then(function (s) { return s.exists() ? s.data() : null; }, function () { return null; })
    ]).then(function (r) {
      nguon.hs = r[0]; nguon.lop = r[1];
      soHsTheoGid = ND.bangSoHs(r[4]);
      r[2].forEach(function (d) {
        if (d.__id === 'so') bangSo = { so: d.so || {}, tiep: d.tiep || ND.SO_DAU };
        else if (/^ngay-/.test(d.__id)) bangThang[d.__id.slice(5)] = { ngay: d.ngay || {} };
      });
      if (!bangSo) bangSo = { so: {}, tiep: ND.SO_DAU };
      var soDocs = r[3];
      var rosterTheoGid = new Map(nguon.hs.map(function (h) { return [h.gid, h]; }));
      // bảng ngày đã có (mọi tháng) để học id
      var tatCaNgay = {};
      Object.keys(bangThang).forEach(function (t) { Object.assign(tatCaNgay, bangThang[t].ngay); });
      var idHoc = ND.hocIdTuBang(tatCaNgay);
      // ngày nào CHƯA nối hoặc sổ đã đổi từ lần nối trước ⇒ đọc AttRows đúng ngày đó (~50 lượt) rồi nối lại
      var canNoi = soDocs.filter(function (d) { var t = ND.thangCuaNgayHt(d.ngay_hien_thi); var b = bangThang[t] && bangThang[t].ngay[d.ngay_hien_thi]; return !b || b.luc !== (d.cap_nhat_luc || ''); });
      return canNoi.reduce(function (p, d) {
        return p.then(function () {
          var iso = ND.isoTuNgayHt(d.ngay_hien_thi);
          return docTatCa(K.fs.query(K.fs.collection(K.db, 'mystudentAttRows'), K.fs.where('date', '==', iso))).then(function (rows) {
            var kq = ND.noiMotNgay(JSON.parse(d.cac_lop || '[]'), rows, rosterTheoGid, idHoc);
            var t = ND.thangCuaNgayHt(d.ngay_hien_thi);
            (bangThang[t] = bangThang[t] || { ngay: {} }).ngay[d.ngay_hien_thi] = { luc: d.cap_nhat_luc || '', ids: kq.ids };
            thangDoi.add(t);
          });
        });
      }, Promise.resolve()).then(function () { return soDocs; });
    }).then(function (soDocs) {
      // cấp số myPay cho khoá mới (gid danh sách + khoá trong sổ) — giao dịch, máy khác cấp cùng lúc cũng không trùng
      var can = [];
      nguon.hs.filter(function (h) { return !h.deleted; }).forEach(function (h) { can.push(h.gid); });
      soDocs.forEach(function (d) { var t = bangThang[ND.thangCuaNgayHt(d.ngay_hien_thi)]; var b = t && t.ngay[d.ngay_hien_thi]; if (b) Object.keys(b.ids).forEach(function (k) { can.push(b.ids[k]); }); });
      var thieu = can.filter(function (k) { return k && !(k in bangSo.so); });
      var p = Promise.resolve();
      if (thieu.length) {
        var ref = K.fs.doc(K.db, 'payMaHs', 'so');
        p = K.fs.runTransaction(K.db, function (tx) {
          return tx.get(ref).then(function (s) {
            var b = s.exists() ? { so: Object.assign({}, s.data().so || {}), tiep: s.data().tiep || ND.SO_DAU } : { so: {}, tiep: ND.SO_DAU };
            ND.capSo(b, thieu.slice().sort(), soHsTheoGid);   // gid có trong sổ hộ tịch ⇒ SỐ HỌC SINH; còn lại 5000xx
            tx.set(ref, { so: b.so, tiep: b.tiep, luc: K.fs.serverTimestamp() });
            return b;
          });
        }).then(function (b) { bangSo = b; });
      }
      return p.then(function () {
        return Promise.all(Array.from(thangDoi).map(function (t) {
          return K.fs.setDoc(K.fs.doc(K.db, 'payMaHs', 'ngay-' + t), { ngay: bangThang[t].ngay, luc: K.fs.serverTimestamp() });
        }));
      }).then(function () {
        thangDoi.clear();
        may.datFile(DIR_SHARED + '\\hoc_sinh.json', JSON.stringify(ND.dungHocSinhJson(nguon.hs, nguon.lop, bangSo)));
        may.datFile(DIR_SHARED + '\\lop.json', JSON.stringify(ND.dungLopJson(nguon.lop)));
        soDocs.forEach(function (d) {
          var b = bangThang[ND.thangCuaNgayHt(d.ngay_hien_thi)].ngay[d.ngay_hien_thi];
          may.datFile(DIR_SO + '\\' + d.ngay_hien_thi + '.json', JSON.stringify(ND.dungSoNgay(d, b.ids, bangSo)));
        });
        return soDocs.length;
      });
    });
  }

  // ───────── LƯU sau mỗi thao tác ─────────
  var tenMay = (navigator.userAgent.match(/iPhone|iPad|Android|Windows|Mac/) || ['?'])[0];
  function luuLenMang() {
    if (!K || (!dangDoi.size && !daXoa.size && !saoLuu.length)) return Promise.resolve();
    var ds = Array.from(dangDoi).map(function (r) { return { rel: r, xoa: false }; }).concat(Array.from(daXoa).map(function (r) { return { rel: r, xoa: true }; }));
    var sl = saoLuu.splice(0);
    return ds.reduce(function (p, x) {
      return p.then(function () {
        var ref = K.fs.doc(K.db, 'payKho', tenDoc(x.rel));
        var nd = x.xoa ? null : may.layFile(DIR_DATA + '\\' + x.rel);
        var phienCu = PHIEN.get(x.rel) || 0;
        return K.fs.runTransaction(K.db, function (tx) {
          return tx.get(ref).then(function (s) {
            var tren = s.exists() ? (Number(s.data().phien) || 0) : 0;
            if (tren !== phienCu) { var e = new Error('XUNG_DOT'); e.rel = x.rel; throw e; }
            var moi = { json: x.xoa ? '' : String(nd), phien: tren + 1, luc: K.fs.serverTimestamp(), may: tenMay };
            if (x.xoa) moi.xoa = true;
            tx.set(ref, moi);
            return tren + 1;
          });
        }).then(function (ph) { PHIEN.set(x.rel, ph); dangDoi.delete(x.rel); daXoa.delete(x.rel); });
      });
    }, Promise.resolve()).then(function () {
      return Promise.all(sl.map(function (b) {
        var nd = typeof b.noiDung === 'string' ? b.noiDung : '';
        return K.fs.addDoc(K.fs.collection(K.db, 'payKhoSaoLuu'), { duong: b.duong, json: nd.slice(0, 900000), luc: K.fs.serverTimestamp(), may: tenMay }).catch(function () { /* sao lưu hỏng không cản việc chính */ });
      }));
    });
  }
  function loiLuu(e) {
    // Không lưu được ⇒ nạp lại TOÀN BỘ payKho từ mạng (bỏ thay đổi vừa làm trên máy này) rồi báo thầy.
    dangDoi.clear(); daXoa.clear();
    var chu = e && e.message === 'XUNG_DOT'
      ? 'Dữ liệu vừa được sửa ở máy khác — đã tải bản mới nhất, thầy làm lại thao tác vừa rồi giúp tôi.'
      : 'CHƯA LƯU được lên mạng (' + String((e && e.message) || e) + ') — đã tải lại bản trên mạng, thầy làm lại thao tác.';
    return napPayKho().then(function () { lamMoiGiaoDien(); return { ok: false, loi: chu }; }, function () { return { ok: false, loi: chu }; });
  }
  var henLamMoi = 0;
  function lamMoiGiaoDien() {
    clearTimeout(henLamMoi);
    henLamMoi = setTimeout(function () {
      var w = window.__mypay; if (!w) return;
      Promise.resolve(w.napThang && w.napThang()).then(function () { return w.napNoPhi && w.napNoPhi(); }).catch(function () {});
    }, 150);
  }

  // Máy khác (điện thoại ↔ máy tính) vừa sửa ⇒ cập nhật ổ ảo + vẽ lại.
  function ngheMayKhac() {
    var lanDau = true;
    K.fs.onSnapshot(K.fs.collection(K.db, 'payKho'), function (s) {
      if (lanDau) { lanDau = false; return; }
      var doi = 0;
      s.docChanges().forEach(function (c) {
        if (c.doc.metadata.hasPendingWrites) return;
        var d = c.doc.data(); var rel = relTuDoc(c.doc.id); var ph = Number(d.phien) || 0;
        if (ph <= (PHIEN.get(rel) || 0) || dangDoi.has(rel)) return;
        if (d.xoa) may.xoaFile(DIR_DATA + '\\' + rel); else may.datFile(DIR_DATA + '\\' + rel, String(d.json || ''));
        PHIEN.set(rel, ph); doi++;
      });
      if (doi) { bao('Vừa cập nhật thay đổi từ máy khác'); lamMoiGiaoDien(); }
    }, function () { /* mất quyền/mạng: thôi nghe, lần thao tác sau vẫn kiểm phiên */ });
  }

  // ───────── KHỞI ĐỘNG ─────────
  function khoiDong() {
    man('Đang kiểm tra phiên đăng nhập của thầy…');
    var lyDo = ''; try { lyDo = sessionStorage.getItem('py_ly_do') || ''; sessionStorage.removeItem('py_ly_do'); } catch (e) { /* thôi */ }
    var coDash = false;
    return moKho().then(function (k) { K = k; return Promise.all([choPhien(k), choDash(k)]); }).then(function (r) {
      var ph = r[0]; coDash = !!r[1];
      if (ph && coDash) return ph;     // phiên myPay còn hạn (≤ 6 giờ) + Dashboard đang đăng nhập thầy ⇒ vào thẳng
      if (ph && !lyDo) lyDo = 'Dashboard trên máy này chưa đăng nhập — thầy đăng nhập lại myPay nhé.';
      // chưa đăng nhập / phiên cũ không đủ điều kiện (quá 6 giờ, Dashboard đã thoát…) ⇒ thoát hẳn rồi hỏi đăng nhập
      return Promise.resolve(K.a && K.a.currentUser ? K.au.signOut(K.a) : null)['catch'](function () {}).then(function () { return hoiDangNhap(K, lyDo); });
    }).then(function (ph) {
      canhGioHet(ph.het);
      if (coDash) ngheDash();
      man('Đang tải dữ liệu học phí…');
      return napPayKho().then(function (n) {
        if (!n) throw new Error('Chưa có dữ liệu myPay trên mạng (chưa dời từ máy lên).');
        var cd = {}; try { cd = JSON.parse(may.layFile(DIR_DATA + '\\cai-dat.json') || '{}'); } catch (e) { cd = {}; }
        var t = cd.thangBatDau || { m: 6, y: 2026 };
        man('Đang tải điểm danh từ tháng ' + t.m + '/' + t.y + '…');
        return napDiemDanh(t.y + '-' + ('0' + t.m).slice(-2) + '-01');
      }).then(function () {
        man('');
        hetSan();
        ngheMayKhac();
        return true;
      });
    }).catch(function (e) {
      man('Không mở được myPay: ' + String((e && e.message) || e).replace(/</g, '&lt;') + '<br><a href="pay.html">Tải lại trang</a>', true);
      loiSan(e);
    });
  }
  window.PayWeb = { may: may, nap: nap, san: san, luuLenMang: luuLenMang, moChonFileNgay: moChonFileNgay, duongTai: duongTai, dangXuat: dangXuat };
  khoiDong();
})();
