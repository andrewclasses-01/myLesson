/* ============================================================
   nw-phien.js — PHIÊN ĐĂNG NHẬP CỦA HỌC SINH (Firebase Auth) — web v1.158.0 (27/09/2026)

   VÌ SAO CÓ FILE NÀY (sau tấn công Tr0ngX 26–27/09): mã học sinh đã lộ vĩnh viễn (lop.json công khai +
   lịch sử git), kẻ lạ gửi chat bằng mã em khác qua REST. Từ bản này em vào bằng ID + MẬT KHẨU thật
   (Firebase Auth), luật chat đòi `request.auth.token.ma == code` — không có mật khẩu thì không gửi được.

   Tài khoản do `myNetwork/tools/tao-tai-khoan.mjs` tạo sẵn cho từng em (DÙNG CHUNG với myNetwork):
     email giả = sha256(mã đăng nhập)[0..24] + DUOI_EMAIL · uid = hs_<mã số myStudent>
     mật khẩu ban đầu = MẬT KHẨU LỚP thầy phát · hồ sơ nwUsers/{uid} có phaiDoiMk:true
   ⇒ lần đầu vào, màn đăng nhập bắt em đặt mật khẩu riêng (datMatKhau).

   `gac(ma)` — CANH CỬA các trang lớp/bài: máy nhớ em (localStorage) nhưng Firebase KHÔNG còn phiên đúng
   em đó (máy cũ từ trước v1.158.0, tài khoản bị khoá, thầy đặt lại mật khẩu…) ⇒ xoá nhớ, về màn đăng nhập
   (điền sẵn ID). Đây là cách "đăng xuất mọi máy" khi bản này lên.

   ⛔ chuanMa + cách băm PHẢI khớp tools/tao-tai-khoan.mjs (myNetwork) và andrewclasses-thu/js/nw-phien.js.
   ⛔ Dùng CHUNG app Firebase với chat.js/thay.js (ai đến trước tạo, ai đến sau dùng lại) — bẫy duplicate-app v1.17.0.
   ⛔ Cùng một trình duyệt chỉ giữ MỘT phiên: em đăng nhập sẽ đẩy phiên Google của thầy ra (và ngược lại).
   ============================================================ */
(function () {
  'use strict';

  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';   // ⛔ PHẢI trùng chat.js/thay.js — khác bản là 2 app riêng
  var CAU_HINH = {
    apiKey: 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY',
    authDomain: 'aword-70dae.firebaseapp.com',
    projectId: 'aword-70dae',
    storageBucket: 'aword-70dae.firebasestorage.app',
    messagingSenderId: '399279049436',
    appId: '1:399279049436:web:b9b34dcfb34732aa744219'
  };
  var DUOI_EMAIL = '@id.andrewclasses.com';

  var _p = null;
  function fb() {
    if (!_p) {
      _p = (async function () {
        var appMod = await import(SDK + '/firebase-app.js');
        var au = await import(SDK + '/firebase-auth.js');
        var fs = await import(SDK + '/firebase-firestore.js');
        var app = (appMod.getApps && appMod.getApps().length) ? appMod.getApp() : appMod.initializeApp(CAU_HINH);
        var auth = au.getAuth(app);
        try { await au.setPersistence(auth, au.browserLocalPersistence); } catch (e) { }
        return { au: au, auth: auth, fs: fs, db: fs.getFirestore(app) };
      })();
      _p['catch'](function () { _p = null; });   // mạng lỗi lúc tải SDK ⇒ lần sau thử lại
    }
    return _p;
  }

  function chuanMa(s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); }
  async function emailTuMa(ma) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chuanMa(ma)));
    var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    return hex.slice(0, 24) + DUOI_EMAIL;
  }
  function laHocSinh(u) { return !!(u && u.email && u.email.slice(-DUOI_EMAIL.length) === DUOI_EMAIL); }

  // Đợi Firebase khôi phục phiên cũ (nhớ trong máy) rồi mới trả — không nháy "chưa đăng nhập".
  function userHienTai() {
    return fb().then(function (f) {
      if (f.auth.currentUser) return f.auth.currentUser;
      return new Promise(function (res) {
        var stop = f.au.onAuthStateChanged(f.auth, function (u) { stop(); res(u || null); });
      });
    });
  }

  // Phiên HỌC SINH đúng mã này (null nếu chưa đăng nhập / đang là người khác / là thầy).
  async function phienCuaMa(ma) {
    var u = await userHienTai();
    if (!laHocSinh(u)) return null;
    return u.email === await emailTuMa(ma) ? u : null;
  }

  async function dangNhap(ma, mk) {
    var f = await fb();
    var r = await f.au.signInWithEmailAndPassword(f.auth, await emailTuMa(ma), mk);
    return r.user;
  }

  // Hồ sơ nwUsers/{uid} — 1 lượt đọc, chỉ ở màn đăng nhập / lúc canh cửa lần đầu trong tab.
  async function hoSo(u) {
    var f = await fb();
    var s = await f.fs.getDoc(f.fs.doc(f.db, 'nwUsers', u.uid));
    return s.exists() ? s.data() : null;
  }

  // Đặt mật khẩu riêng. Giờ đổi thật lấy ở MÁY CHỦ Auth (passwordUpdatedAt — công cụ --trang-thai đọc),
  // cờ phaiDoiMk chỉ để web biết khỏi hỏi lại.
  async function datMatKhau(mkMoi) {
    var f = await fb();
    var u = f.auth.currentUser;
    if (!u) throw new Error('chua-dang-nhap');
    await f.au.updatePassword(u, mkMoi);
    // Mật khẩu ĐÃ đổi xong ở máy chủ. Ghi cờ hỏng (mạng/luật) thì KHÔNG được làm em kẹt ở màn này:
    // nhớ trong tab là đã qua (gac bỏ qua), lần sau vào máy chủ còn cờ thì em đặt lại — không mất gì.
    try {
      await f.fs.updateDoc(f.fs.doc(f.db, 'nwUsers', u.uid), { phaiDoiMk: false, capNhat: Date.now() });
    } catch (e) {
      console.warn('[phien] đã đổi mật khẩu nhưng chưa ghi được cờ phaiDoiMk', e);
    }
    try { sessionStorage.setItem(KHOA_DA_GAC, u.uid); } catch (e) { }
  }

  // Chỉ đăng xuất phiên HỌC SINH — không đụng phiên Google của thầy (dashboard).
  async function thoat() {
    var f = await fb();
    if (laHocSinh(f.auth.currentUser)) await f.au.signOut(f.auth);
  }

  // ---------- CANH CỬA trang lớp/bài ----------
  // Chạy SAU khi trang đã vẽ (không chặn em đọc bài). Không có phiên đúng em ⇒ về màn đăng nhập.
  // Còn phaiDoiMk ⇒ về màn đăng nhập để đặt mật khẩu (index.html tự mở màn đặt mật khẩu).
  // Lỗi MẠNG khi tải SDK/đọc hồ sơ ⇒ KHÔNG đá em ra (mạng chập chờn thì em vẫn xem được bài;
  // chat tự bị luật chặn nếu thiếu phiên).
  var KHOA_DA_GAC = 'mylesson_gac_ok';
  function gac(ma) {
    if (!ma) return;
    fb().then(function () { return phienCuaMa(ma); }).then(function (u) {
      if (!u) { veDangNhap(); return; }
      // hồ sơ: đọc 1 lần mỗi tab (sessionStorage) — đỡ tốn lượt đọc Firestore mỗi lần chuyển trang
      var daGac = '';
      try { daGac = sessionStorage.getItem(KHOA_DA_GAC) || ''; } catch (e) { }
      if (daGac === u.uid) return;
      return hoSo(u).then(function (hs) {
        if (hs && hs.phaiDoiMk) { veDangNhap(); return; }
        try { sessionStorage.setItem(KHOA_DA_GAC, u.uid); } catch (e) { }
      }, function () { });
    })['catch'](function (e) { console.warn('[phien] không kiểm được phiên (mạng?)', e); });
  }
  function veDangNhap() {
    try { sessionStorage.removeItem(KHOA_DA_GAC); } catch (e) { }
    // KHÔNG gọi AWC.thoat(): index.html cần đọc lại mã đã nhớ để điền sẵn ô ID.
    location.replace('index.html');
  }

  // Lỗi Firebase → câu dễ hiểu cho học sinh.
  function chuLoi(e) {
    var c = (e && e.code) || '';
    if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found' || c === 'auth/invalid-email' || c === 'auth/invalid-login-credentials')
      return 'ID hoặc mật khẩu chưa đúng.';
    if (c === 'auth/too-many-requests') return 'Em nhập sai nhiều lần quá. Đợi vài phút rồi thử lại nhé.';
    if (c === 'auth/user-disabled') return 'Tài khoản đang bị khoá (có thể do quá hạn đổi mật khẩu). Em liên hệ thầy Andrew nhé.';
    if (c === 'auth/network-request-failed') return 'Mạng đang chập chờn. Em thử lại nhé.';
    if (c === 'auth/operation-not-allowed') return 'Đăng nhập chưa được mở. Em báo thầy Andrew nhé.';
    if (c === 'auth/weak-password' || c === 'auth/password-does-not-meet-requirements') return 'Mật khẩu chưa đủ mạnh. Em đặt dài hơn nhé.';
    if (c === 'auth/requires-recent-login') return 'Phiên đăng nhập đã cũ. Em đăng nhập lại rồi đặt mật khẩu nhé.';
    return 'Có lỗi, em thử lại nhé.' + (c ? ' (' + c + ')' : '');
  }

  window.NWP = { fb: fb, emailTuMa: emailTuMa, userHienTai: userHienTai, phienCuaMa: phienCuaMa,
    dangNhap: dangNhap, hoSo: hoSo, datMatKhau: datMatKhau, thoat: thoat, gac: gac, chuLoi: chuLoi };
})();
