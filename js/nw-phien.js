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
        // ⭐ v1.168.0 — tab "thầy đăng nhập thay em" (js/thay-vao.js): Auth đã khởi động với phiên CHỈ TRONG TAB ⇒ chờ nó,
        // và TUYỆT ĐỐI không setPersistence(local) (chép phiên em vào IndexedDB ⇒ tab dashboard của thầy thành em).
        if (window.__thayVao) { try { await window.__thayVao.san; } catch (e) { } }
        var app = (appMod.getApps && appMod.getApps().length) ? appMod.getApp() : appMod.initializeApp(CAU_HINH);
        var auth = au.getAuth(app);
        if (!window.__thayVao) { try { await au.setPersistence(auth, au.browserLocalPersistence); } catch (e) { } }
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
    if (window.__thayVao) throw new Error('thay-vao');   // v1.168.0 — thầy đăng nhập thay KHÔNG được đổi mật khẩu của em
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
    if (window.__thayVao) window.__thayVao.xoa();        // v1.168.0 — thoát luôn chế độ đăng nhập thay
  }

  // ---------- CANH CỬA trang lớp/bài ----------
  // Chạy SAU khi trang đã vẽ (không chặn em đọc bài). Không có phiên đúng em ⇒ về màn đăng nhập.
  // Còn phaiDoiMk ⇒ về màn đăng nhập để đặt mật khẩu (index.html tự mở màn đặt mật khẩu).
  // Lỗi MẠNG khi tải SDK/đọc hồ sơ ⇒ KHÔNG đá em ra (mạng chập chờn thì em vẫn xem được bài;
  // chat tự bị luật chặn nếu thiếu phiên).
  var KHOA_DA_GAC = 'mylesson_gac_ok';
  function gac(ma) {
    if (!ma) return;
    // ⭐ v1.168.0 — tab "thầy đăng nhập thay em": KHÔNG đá về màn đăng nhập, KHÔNG bắt đổi mật khẩu; thiếu phiên ⇒ chỉ báo (trang vẫn xem được).
    if (window.__thayVao) {
      fb().then(function () { return phienCuaMa(ma); }).then(function (u) {
        if (u) lamMoiVe(false);
        else window.__thayVao.baoLoi('Chưa đăng nhập thay được em này — trang này CHỈ XEM. Mở lại từ dashboard nếu cần.');
      })['catch'](function (e) { console.warn('[phien] thay-vao', e); });
      return;
    }
    fb().then(function () { return phienCuaMa(ma); }).then(function (u) {
      if (!u) { veDangNhap(); return; }
      lamMoiVe(false);    // v1.161.0 — giữ sẵn vé cho các đường ghi REST (tieuDeNgay)
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

  // ---------- ⭐⭐ v1.161.0 — TIÊU ĐỀ DANH TÍNH cho các đường ghi REST của chính trang này ----------
  // Luật (tools/dang-luat-tien-do.js): bài nộp ảnh (Storage nopBai + lessonNop), tiến độ video/audio, tích nộp Speaking
  // CHỈ ghi được bằng ID token của đúng em. Các đường đó là REST (có đường keepalive lúc đóng tab — KHÔNG chờ được Promise)
  // ⇒ giữ sẵn vé trong bộ nhớ trang (`_veHs`), làm mới mỗi 10 phút + khi còn < 2 phút.
  //   tieuDe(kieu)     : Promise<{Authorization}> (lấy vé mới nếu cần) — dùng khi được phép chờ
  //   tieuDeNgay(kieu) : {Authorization} hoặc {} NGAY (đồng bộ) — dùng cho keepalive; {} ⇒ đừng gửi, để lần sau
  //   kieu 'storage' ⇒ "Firebase <token>" (Storage REST), còn lại "Bearer <token>" (Firestore REST).
  var _veHs = null;          // { token, het }
  var _henVe = null;
  function lamMoiVe(epMoi) {
    return userHienTai().then(function (u) {
      if (!laHocSinh(u)) { _veHs = null; return null; }
      return u.getIdTokenResult(!!epMoi).then(function (r) {
        _veHs = { token: r.token, het: Date.parse(r.expirationTime) };
        if (!_henVe) _henVe = setInterval(function () { lamMoiVe(false); }, 10 * 60 * 1000);
        return _veHs.token;
      });
    })['catch'](function () { return null; });
  }
  function dauTieuDe(kieu, token) {
    return token ? { Authorization: (kieu === 'storage' ? 'Firebase ' : 'Bearer ') + token } : {};
  }
  function tieuDeNgay(kieu) {
    if (_veHs && _veHs.het - Date.now() > 120000) return dauTieuDe(kieu, _veHs.token);
    lamMoiVe(!!_veHs);       // hết/sắp hết ⇒ xin vé mới cho lượt sau
    return {};
  }
  function tieuDe(kieu) {
    if (_veHs && _veHs.het - Date.now() > 120000) return Promise.resolve(dauTieuDe(kieu, _veHs.token));
    return lamMoiVe(!!_veHs).then(function (t) { return dauTieuDe(kieu, t); });
  }

  // ---------- ⭐⭐ v1.159.0 — CẤP VÉ cho khung AWord nhúng (AWord Đợt 410) ----------
  // Luật: điểm AWord (scores/results) mang mã em CHỈ ghi được bằng ID token của đúng em đó. AWord ở tên miền khác nên không
  // có phiên của em ⇒ khung AWord xin {type:'AWORD:XIN_VE', ma}, trang này trả {type:'AWORD:VE', ma, token, het}.
  // ⛔ Chỉ trả cho tin đến từ ĐÚNG origin AWord, gửi ĐÍCH DANH origin đó (không '*'), và CHỈ khi phiên đang mở là học
  //    sinh ĐÚNG mã xin (thầy xem như em `?nhu=` ⇒ không có vé ⇒ AWord giữ lượt trong outbox, không ghi nhầm tên em).
  var AWORD_GOC = String((window.AWC && window.AWC.CFG && window.AWC.CFG.AWORD) || 'https://aword.andrewclasses.com').replace(/\/+$/, '');
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'AWORD:XIN_VE' || e.origin !== AWORD_GOC || !e.source) return;
    var ma = chuanMa(d.ma);
    if (!ma) return;
    phienCuaMa(ma).then(function (u) {
      if (!u) return null;
      return u.getIdTokenResult().then(function (r) {
        // vé sắp hết (< 2 phút) ⇒ xin vé mới
        return (Date.parse(r.expirationTime) - Date.now() < 120000) ? u.getIdTokenResult(true) : r;
      });
    }).then(function (r) {
      if (!r) return;
      e.source.postMessage({ type: 'AWORD:VE', ma: ma, token: r.token, het: Date.parse(r.expirationTime) }, e.origin);
    })['catch'](function (err) { console.warn('[phien] không cấp được vé AWord', err); });
  });

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
    dangNhap: dangNhap, hoSo: hoSo, datMatKhau: datMatKhau, thoat: thoat, gac: gac, chuLoi: chuLoi,
    tieuDe: tieuDe, tieuDeNgay: tieuDeNgay };
})();
