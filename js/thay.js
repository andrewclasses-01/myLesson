/* ============================================================
   js/thay.js — PHIÊN CỦA THẦY trên Firebase Auth (web v1.52.0, gói bảo mật C, 02/09/2026)

   VÌ SAO CÓ FILE NÀY: trước đây mọi kho "chỉ thầy ghi" (lessonHan · lessonNghi ·
   quaTang · xoá tin chat · tin ký tên THẦY) đều ghi được KHÔNG CẦN ĐĂNG NHẬP —
   luật Firestore không hỏi "anh là ai", còn mã quản lý chỉ là băm trong config.js
   (mở giao diện, không mở quyền). Nay luật đòi `laThay()`:
       request.auth.token.email == 'namdaptrai01@gmail.com'   (đăng nhập Google)
    || request.auth.token.thay  == true                       (token do app ký)
   File này lo phần "có phiên thầy hay chưa" cho dashboard.html + lop.html.

   HAI ĐƯỜNG VÀO PHIÊN:
   1. Trình duyệt thường: bấm nút 🔐 ở cột trái dashboard → cửa sổ Google → đúng
      tài khoản của thầy mới nhận (tài khoản khác bị đăng xuất ngay + báo lỗi).
   2. Trong app myLesson (tab CLASSES, webview): app ký CUSTOM TOKEN bằng khoá quản
      trị rồi tiêm vào trang qua `window.__thayToken(token)` — không có cửa sổ Google
      nào (Google hay chặn OAuth trong webview nhúng). Phiên nhớ trong máy (IndexedDB)
      nên mỗi lần mở tab CLASSES app tiêm lại cũng không sao.

   ⛔ Dùng CHUNG app Firebase với chat.js (`AWChat.kho()`), KHÔNG initializeApp lần
      nữa (bẫy duplicate-app v1.17.0). File này phải nạp SAU js/chat.js.
   ⛔ Đây là bản DUY NHẤT (như chung.js) — dashboard.html và lop.html cùng dùng.
   ⛔ Đổi EMAIL_THAY ở đây KHÔNG đổi gì trên máy chủ — luật Firestore mới quyết.
   ============================================================ */
(function () {
  'use strict';

  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
  var EMAIL_THAY = 'namdaptrai01@gmail.com';   // phải khớp laThay() trong luật Firestore
  var UID_TOKEN = 'thay';                       // uid của custom token do app ký

  var _p = null;
  function auth() {
    if (!_p) {
      _p = (async function () {
        if (!window.AWChat || !AWChat.kho) throw new Error('thay.js phải nạp sau js/chat.js');
        await AWChat.kho();                       // bảo đảm app Firebase đã có
        var appMod = await import(SDK + '/firebase-app.js');
        var au = await import(SDK + '/firebase-auth.js');
        var a = au.getAuth(appMod.getApp());
        try { await au.setPersistence(a, au.browserLocalPersistence); } catch (e) {}
        return { au: au, a: a };
      })();
    }
    return _p;
  }

  function laThay(u) {
    if (!u) return false;
    if (u.uid === UID_TOKEN) return true;
    return u.email === EMAIL_THAY && !!u.emailVerified;
  }

  // Trả người dùng là thầy (hoặc null) — đợi Firebase khôi phục phiên cũ xong mới trả,
  // để giao diện không nháy "chưa đăng nhập" lúc vừa mở trang.
  function phien() {
    return auth().then(function (x) {
      if (x.a.currentUser) return laThay(x.a.currentUser) ? x.a.currentUser : null;
      return new Promise(function (res) {
        var stop = x.au.onAuthStateChanged(x.a, function (u) { stop(); res(laThay(u) ? u : null); });
      });
    });
  }

  // Theo dõi liên tục: cb(user | null) mỗi khi phiên đổi. Trả Promise<hàm gỡ>.
  function theoDoi(cb) {
    return auth().then(function (x) {
      return x.au.onAuthStateChanged(x.a, function (u) { cb(laThay(u) ? u : null); });
    });
  }

  function dangNhapGoogle() {
    return auth().then(function (x) {
      var p = new x.au.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      return x.au.signInWithPopup(x.a, p).then(function (r) {
        if (laThay(r.user)) return r.user;
        var email = (r.user && r.user.email) || '?';
        return x.au.signOut(x.a).then(function () {
          throw new Error('Tài khoản ' + email + ' không phải của thầy — chỉ ' + EMAIL_THAY + ' được ghi.');
        });
      });
    });
  }

  function dangNhapToken(token) {
    return auth().then(function (x) {
      return x.au.signInWithCustomToken(x.a, String(token || '')).then(function (r) { return r.user; });
    });
  }

  function thoat() {
    return auth().then(function (x) { return x.au.signOut(x.a); });
  }

  // Lời nhắc dùng chung khi kho từ chối vì thiếu phiên.
  var CAN_DANG_NHAP = 'Cần phiên của thầy mới ghi được — bấm nút 🔐 Đăng nhập ở cột trái (hoặc mở từ app myLesson).';

  // ---- cầu từ app myLesson (webview) ----
  // App gọi `window.__thayToken(token)` sau dom-ready; nếu app tiêm sẵn
  // `window.__thayTokenCho` trước khi file này chạy thì tự dùng luôn.
  window.__thayToken = function (t) {
    return dangNhapToken(t).then(function () { return 'ok'; },
                                 function (e) { return 'loi ' + ((e && e.message) || e); });
  };
  if (window.__thayTokenCho) { window.__thayToken(window.__thayTokenCho); }

  window.AWThay = {
    phien: phien, theoDoi: theoDoi, laThay: laThay,
    dangNhapGoogle: dangNhapGoogle, dangNhapToken: dangNhapToken, thoat: thoat,
    EMAIL_THAY: EMAIL_THAY, CAN_DANG_NHAP: CAN_DANG_NHAP
  };
})();
