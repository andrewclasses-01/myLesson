/* ============================================================
   js/giu-tran.js — ⭐ v1.444.0 (28/10/2026, thầy chốt) BẮT BUỘC HOÀN THÀNH TRẬN A Show Speed.
   Máy chủ (myLesson may-chu/functions/tran-dau.js tdDoi) đóng KHOÁ TRẬN lên hồ sơ em lúc trận vào 'choi':
     nwUsers/{uid}.tranDang = { id, ketThuc, xh }   (chỉ khi công tắc nwCauHinh/thachDau.tro.ass.<gh|giai|xh>.buoc bật — dashboard
     "Quản lý thách đấu"), `chot` gỡ khoá. Em không tự xoá được (luật nwUsers chỉ cho em sửa vài trường riêng).
   Tệp này nạp ở MỌI trang học sinh (lop · khoa · bai · bai-sp · sp-chitiet · index · nw/*): mở trang / tab hiện lại / quay lại bằng Back
     ⇒ đọc khoá (1 lượt đọc) ⇒ có khoá thì đọc trận (thêm 1 lượt) ⇒ trận còn 'choi' ⇒ location.replace về trận (tran.html | xhtran.html).
   ⛔ Không tin đồng hồ máy em: quyết theo trangThai của trận, giờ chỉ dùng làm trần an toàn (khoá quá ketThuc 10 phút = bỏ qua).
   Chỉ tài khoản học sinh (claim hs). Thầy · "Xem như em" (phiên thầy) · người không đăng nhập ⇒ không làm gì. ⛔ ES5.
   ============================================================ */
(function () {
  'use strict';
  if (window.GiuTran) return;
  // khung nhúng (hộp chat nhỏ tinnhan.html?hop=1 …) ⇒ trang mẹ tự lo, khung không tự chuyển
  try { if (window.top !== window) return; } catch (e) { return; }
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
  var CAU_HINH = {
    apiKey: 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY',
    authDomain: 'aword-70dae.firebaseapp.com',
    projectId: 'aword-70dae',
    storageBucket: 'aword-70dae.firebasestorage.app',
    messagingSenderId: '399279049436',
    appId: '1:399279049436:web:b9b34dcfb34732aa744219'
  };
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var GOC = SRC.replace(/js\/giu-tran\.js.*$/, '');   // thư mục gốc web (chứa nw/)
  var TRAN_QUA = 10 * 60000;
  var _f = null, dang = false, lanCuoi = 0;

  function kho() {
    if (!_f) {
      _f = (async function () {
        // dùng chung app của trang (nw/js/loi.js NW.fb · js/chat.js) nếu đã có; chưa có thì tự tạo — ai đến sau dùng chung (getApps)
        var appMod = await import(SDK + '/firebase-app.js');
        var au = await import(SDK + '/firebase-auth.js');
        var fs = await import(SDK + '/firebase-firestore.js');
        if (window.__thayVao) { try { await window.__thayVao.san; } catch (e) { } }
        if (window.__veDocSan) { try { await window.__veDocSan; } catch (e) { } }
        var app = (appMod.getApps && appMod.getApps().length) ? appMod.getApp() : appMod.initializeApp(CAU_HINH);
        return { au: au, auth: au.getAuth(app), fs: fs, db: fs.getFirestore(app) };
      })();
    }
    return _f;
  }
  function nguoi(f) {
    var u = f.auth.currentUser;
    if (u) return Promise.resolve(u);
    return new Promise(function (res) { var s = f.au.onAuthStateChanged(f.auth, function (x) { s(); res(x); }); });
  }
  function duongTran(k) {
    return GOC + 'nw/' + (k.xh ? 'xhtran.html' : 'tran.html') + '?id=' + encodeURIComponent(k.id);
  }
  // đang đứng ở đúng trang trận đó ⇒ thôi
  function laTrangTran(k) {
    var p = location.pathname, id = new URLSearchParams(location.search).get('id');
    return /\/nw\/(xh)?tran\.html$/.test(p) && id === k.id && !/[?&]xem=1/.test(location.search);
  }
  async function kiem() {
    if (dang || Date.now() - lanCuoi < 3000) return;
    dang = true; lanCuoi = Date.now();
    try {
      var f = await kho(), u = await nguoi(f);
      if (!u) return;
      var tk = await u.getIdTokenResult().catch(function () { return { claims: {} }; });
      if (!(tk.claims && tk.claims.hs === true)) return;   // thầy / phiên khác ⇒ không khoá
      var s = await f.fs.getDoc(f.fs.doc(f.db, 'nwUsers', u.uid));
      var k = s.exists() ? s.data().tranDang : null;
      if (!k || !k.id || Date.now() > (+k.ketThuc || 0) + TRAN_QUA || laTrangTran(k)) return;
      var t = await f.fs.getDoc(f.fs.doc(f.db, 'tranDau', k.id));
      if (!t.exists() || t.data().trangThai !== 'choi') return;   // trận đã chốt (khoá sót) ⇒ để yên
      location.replace(duongTran(k));
    } catch (e) { console.warn('[giữ trận]', e); }
    finally { dang = false; }
  }
  function batDau() { setTimeout(kiem, 300); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', batDau); else batDau();
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') kiem(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { lanCuoi = 0; kiem(); } });   // quay lại bằng Back (bộ đệm trang)
  window.GiuTran = { kiem: function () { lanCuoi = 0; return kiem(); } };
})();
