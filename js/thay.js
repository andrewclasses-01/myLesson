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
        // ⭐ v1.168.0 — tab "đăng nhập thay em" (js/thay-vao.js): chờ Auth phiên-trong-tab, KHÔNG setPersistence(local).
        if (window.__thayVao) { try { await window.__thayVao.san; } catch (e) {} }
        var a = au.getAuth(appMod.getApp());
        // ⛔ v1.229.0 — BỎ setPersistence(browserLocalPersistence): đánh nhau với getAuth() mặc định (IndexedDB) ⇒ mỗi lần nạp trang
        // phiên bị chuyển qua chuyển lại, tab khác thấy "đăng xuất" thoáng qua và bị đá (xem js/nw-phien.js).
        return { au: au, a: a };
      })();
    }
    return _p;
  }

  // ⭐ v1.176.0 (29/09/2026) — TÀI KHOẢN QUẢN TRỊ: ID + mật khẩu + Google Authenticator (TOTP).
  // Thay mã quản lý cũ (băm trong config.js, không mật khẩu). Tài khoản Firebase email giả
  // sha256(ID)[0..24] + DUOI_QT, quyền = custom claim `thay` (luật laThay() đã nhận sẵn) — claim chỉ
  // cấp SAU khi đã đổi mật khẩu tạm + cài TOTP (app/tools/tai-khoan-quan-tri.js --cap-quyen).
  // ⛔ Đuôi email KHÁC học sinh (@id.andrewclasses.com) — nw-phien.js coi đuôi đó là học sinh.
  var DUOI_QT = '@quantri.andrewclasses.com';     // ⛔ phải khớp app/tools/tai-khoan-quan-tri.js
  var TEN_QR = 'Andrew Classes';
  var NHO_TOI_DA = 30 * 24 * 3600 * 1000;          // thầy chốt: máy nhớ phiên 30 ngày rồi hỏi lại

  function laQuanTri(u) { return !!(u && u.email && u.email.slice(-DUOI_QT.length) === DUOI_QT); }

  // Kiểm NHANH (không đọc token) — dùng nơi cần trả lời ngay; tài khoản quản trị coi là thầy
  // khi token đã qua kiemThay() (cờ _thay).
  function laThay(u) {
    if (!u) return false;
    if (u.uid === UID_TOKEN) return true;
    if (laQuanTri(u)) return u._thay === true;
    return u.email === EMAIL_THAY && !!u.emailVerified;
  }

  // Kiểm ĐỦ: đọc claim trong token + luật 30 ngày. Quá 30 ngày kể từ lần gõ mật khẩu ⇒ đăng xuất.
  // Phiên app ký (custom token) không tính — app tiêm lại mỗi lần mở tab CLASSES.
  function kiemThay(x, u) {
    if (!u) return Promise.resolve(null);
    if (u.uid === UID_TOKEN) return Promise.resolve(u);
    if (!laQuanTri(u) && !(u.email === EMAIL_THAY && u.emailVerified)) return Promise.resolve(null);
    return u.getIdTokenResult().then(function (t) {
      var luc = Date.parse(t.authTime);
      if (luc && Date.now() - luc > NHO_TOI_DA) {
        return x.au.signOut(x.a).then(function () { return null; });
      }
      if (laQuanTri(u)) {
        if (t.claims.thay !== true) return null;
        u._thay = true;
      }
      return u;
    }, function () { return null; });
  }

  // Trả người dùng là thầy (hoặc null) — đợi Firebase khôi phục phiên cũ xong mới trả,
  // để giao diện không nháy "chưa đăng nhập" lúc vừa mở trang.
  function phien() {
    return auth().then(function (x) {
      if (x.a.currentUser) return kiemThay(x, x.a.currentUser);
      return new Promise(function (res) {
        var stop = x.au.onAuthStateChanged(x.a, function (u) { stop(); res(kiemThay(x, u)); });
      });
    });
  }

  // Theo dõi liên tục: cb(user | null) mỗi khi phiên đổi. Trả Promise<hàm gỡ>.
  function theoDoi(cb) {
    return auth().then(function (x) {
      return x.au.onAuthStateChanged(x.a, function (u) { kiemThay(x, u).then(cb); });
    });
  }

  // ---------- đăng nhập tài khoản quản trị ----------
  function emailTuId(id) {
    var chuan = String(id || '').replace(/\s+/g, '').toUpperCase();
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(chuan)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('').slice(0, 24) + DUOI_QT;
    });
  }

  // Trả một trong ba:
  //   { buoc: 'xong', user }                      — đã có quyền thầy, vào dashboard
  //   { buoc: 'ma', xacNhan(ma6so) }              — đã cài TOTP, cần mã 6 số
  //   { buoc: 'cai-dat', id }                     — chưa cài TOTP: đổi mật khẩu tạm + quét QR (caiDat*)
  // Sai ID/mật khẩu ⇒ ném lỗi Firebase (chuLoiQt đổi sang chữ).
  function dangNhapQt(id, mk) {
    return auth().then(function (x) {
      return emailTuId(id).then(function (email) {
        return x.au.signInWithEmailAndPassword(x.a, email, mk).then(function (r) {
          return kiemThay(x, r.user).then(function (u) {
            // Chưa có TOTP ⇒ phiên này chỉ dùng để cài đặt (chưa có claim thay nên luật không cho ghi gì).
            if (!x.au.multiFactor(r.user).enrolledFactors.length) return { buoc: 'cai-dat', id: id };
            if (u) return { buoc: 'xong', user: u };
            return x.au.signOut(x.a).then(function () { throw new Error('chua-cap-quyen'); });
          });
        }, function (e) {
          if (!e || e.code !== 'auth/multi-factor-auth-required') throw e;
          var giai = x.au.getMultiFactorResolver(x.a, e);
          var goi = giai.hints.filter(function (h) { return h.factorId === x.au.TotpMultiFactorGenerator.FACTOR_ID; })[0];
          if (!goi) throw new Error('khong-co-totp');
          return {
            buoc: 'ma',
            xacNhan: function (ma) {
              var kd = x.au.TotpMultiFactorGenerator.assertionForSignIn(goi.uid, String(ma || '').replace(/\D/g, ''));
              return giai.resolveSignIn(kd).then(function (r) {
                return kiemThay(x, r.user).then(function (u) {
                  if (u) return u;
                  return x.au.signOut(x.a).then(function () { throw new Error('chua-cap-quyen'); });
                });
              });
            }
          };
        });
      });
    });
  }

  // Cài đặt lần đầu (hoặc sau --go-2fa): 1) đổi mật khẩu tạm  2) sinh khoá TOTP + mã QR  3) xác nhận mã 6 số.
  function caiDatDoiMk(mkMoi) {
    return auth().then(function (x) {
      if (!laQuanTri(x.a.currentUser)) throw new Error('chua-dang-nhap');
      return x.au.updatePassword(x.a.currentUser, mkMoi);
    });
  }
  function caiDatTotp(id) {
    return auth().then(function (x) {
      var u = x.a.currentUser;
      if (!laQuanTri(u)) throw new Error('chua-dang-nhap');
      return x.au.multiFactor(u).getSession().then(function (ss) {
        return x.au.TotpMultiFactorGenerator.generateSecret(ss);
      }).then(function (bi) {
        return {
          khoa: bi.secretKey,
          qr: bi.generateQrCodeUrl(String(id || '').toLowerCase(), TEN_QR),
          xacNhan: function (ma) {
            var kd = x.au.TotpMultiFactorGenerator.assertionForEnrollment(bi, String(ma || '').replace(/\D/g, ''));
            return x.au.multiFactor(u).enroll(kd, 'Google Authenticator');
          }
        };
      });
    });
  }

  function chuLoiQt(e) {
    var c = (e && (e.code || e.message)) || '';
    // v1.221.5 — "(22)" trên iPhone = bộ nhớ trang đầy, Firebase không cất được phiên ⇒ dọn đệm (chung.js) rồi bảo làm lại.
    if (window.laLoiHetCho && window.laLoiHetCho(e)) {
      if (window.donBoNho) window.donBoNho(true);
      return 'Bộ nhớ trình duyệt bị đầy — đã dọn xong. Thầy đăng nhập lại nhé.';
    }
    if (/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(c)) return 'Sai ID hoặc mật khẩu.';
    if (/too-many-requests/.test(c)) return 'Sai quá nhiều lần — đợi vài phút rồi thử lại.';
    if (/user-disabled/.test(c)) return 'Tài khoản đang bị khoá.';
    if (/invalid-verification-code|invalid-code|missing-code/.test(c)) return 'Mã 6 số không đúng (hoặc đã quá 30 giây) — gõ mã mới.';
    if (/weak-password|password-does-not-meet/.test(c)) return 'Mật khẩu yếu quá — ít nhất 10 ký tự, có chữ và số.';
    if (/requires-recent-login/.test(c)) return 'Phiên đã cũ — tải lại trang và đăng nhập lại.';
    if (/chua-cap-quyen/.test(c)) return 'Tài khoản chưa được cấp quyền quản trị (báo Claude chạy --cap-quyen).';
    if (/network/.test(c)) return 'Mất mạng — thử lại.';
    return 'Không đăng nhập được (' + c + ').';
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
  var CAN_DANG_NHAP = 'Cần phiên của thầy mới ghi được — bấm ☰ (góc phải trên) → 🔐 Đăng nhập Google (hoặc mở từ app myLesson).';

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
    dangNhapQt: dangNhapQt, caiDatDoiMk: caiDatDoiMk, caiDatTotp: caiDatTotp, chuLoiQt: chuLoiQt, laQuanTri: laQuanTri,
    EMAIL_THAY: EMAIL_THAY, CAN_DANG_NHAP: CAN_DANG_NHAP
  };
})();
