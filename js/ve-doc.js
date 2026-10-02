/* ============================================================
   ve-doc.js — VÉ ĐỌC KHO (web v1.226.0, 02/10/2026 — khoá đọc người ngoài GĐ2, thầy chốt)

   VÌ SAO: luật Firestore THÔI cho người lạ (không đăng nhập) đọc chat lớp, tiến độ, bài nộp, lịch lớp…
   Mà các trang đọc kho chủ yếu bằng REST `fetch(...?key=)` — KHÔNG kèm danh tính (kể cả khi đã đăng nhập).
   Tệp này giữ sẵn một VÉ (ID token Firebase của phiên đang mở — học sinh hoặc thầy) để CỬA CHUNG bọc fetch
   (⛔ bản chép ở đầu js/som.js + phần 1 js/app-check.js) tự gắn `Authorization: Bearer <vé>` vào mọi lượt ĐỌC
   firestore.googleapis.com. Lượt GHI không đụng (các đường ghi tự lo vé — xem nw-phien.js tieuDe).

   CẤT VÉ Ở ĐÂU:
     · tab thường      → localStorage 'awc_ve' {t, het, uid} — mở trang sau dùng NGAY, khỏi chờ tải SDK.
                          + cờ 'awc_ve_co' = '1' khi máy CÓ phiên (vé hết hạn ⇒ cửa chung CHỜ vé mới tối đa 8 s).
     · tab "thầy đăng nhập thay em" (thay-vao.js, phiên CHỈ TRONG TAB) → sessionStorage cùng tên —
       ⛔ KHÔNG ghi localStorage: tab dashboard của thầy sẽ đọc nhầm bằng vé của em.
   Phiên mất (đăng xuất / tài khoản khoá) ⇒ xoá vé + cờ ⇒ đọc như người lạ (kho từ chối phần đã khoá).

   SDK (onSnapshot của chat.js, bai-sp…) dùng chung app Firebase mặc định: đã getAuth ở đây thì SDK tự kèm danh tính —
   các chỗ đọc kho khoá bằng SDK CHỜ `window.__veDocSan` (Auth khôi phục xong phiên) rồi mới nghe, kẻo nghe sớm bị từ chối
   và listener chết luôn.
   ⛔ PHẢI nạp SAU thay-vao.js (chờ __thayVao.san), dùng CHUNG app mặc định với nw-phien.js / chat.js / thay.js.
   ⛔ KHÔNG setPersistence ở đây (nw-phien.js / thay.js lo) — getAuth mặc định cùng kho IndexedDB với họ.
   ⛔ Viết kiểu ES5 như mọi file web này.
   ============================================================ */
(function () {
  'use strict';
  if (window.__veDocSan) return;
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';   // ⛔ PHẢI trùng nw-phien.js / chat.js / thay.js
  var CAU_HINH = {
    apiKey: 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY',
    authDomain: 'aword-70dae.firebaseapp.com',
    projectId: 'aword-70dae',
    storageBucket: 'aword-70dae.firebasestorage.app',
    messagingSenderId: '399279049436',
    appId: '1:399279049436:web:b9b34dcfb34732aa744219'
  };
  var trongTab = !!window.__thayVao;
  var kho = null;
  try { kho = trongTab ? window.sessionStorage : window.localStorage; } catch (e) { kho = null; }
  function ghi(ve) {
    try {
      if (!kho) return;
      if (ve) { kho.setItem('awc_ve', JSON.stringify(ve)); kho.setItem('awc_ve_co', '1'); }
      else { kho.removeItem('awc_ve'); kho.removeItem('awc_ve_co'); }
    } catch (e) { /* bộ nhớ đầy ⇒ đọc như người lạ, không làm hỏng trang */ }
  }
  // Báo các lượt fetch đang CHỜ vé (cửa chung xếp hàng ở window.__veCho).
  function bao() {
    var ds = window.__veCho || [];
    window.__veCho = [];
    ds.forEach(function (f) { try { f(); } catch (e) { } });
  }
  var xongSan;
  window.__veDocSan = new Promise(function (res) { xongSan = res; });
  // Không bao giờ để ai chờ quá 8 giây (mạng hỏng / SDK không tải được).
  setTimeout(function () { xongSan(); bao(); }, 8000);
  (async function () {
    try {
      var appMod = await import(SDK + '/firebase-app.js');
      var au = await import(SDK + '/firebase-auth.js');
      if (window.__thayVao) { try { await window.__thayVao.san; } catch (e) { } }
      var app = (appMod.getApps && appMod.getApps().length) ? appMod.getApp() : appMod.initializeApp(CAU_HINH);
      var auth = au.getAuth(app);
      // onIdTokenChanged: chạy lúc khôi phục phiên, lúc đăng nhập/xuất, VÀ mỗi lần SDK tự làm mới vé (~1 giờ) —
      // có bộ nghe này thì SDK chủ động làm mới trước khi vé hết hạn.
      au.onIdTokenChanged(auth, function (u) {
        if (!u) { ghi(null); bao(); return; }
        u.getIdTokenResult().then(function (r) {
          ghi({ t: r.token, het: Date.parse(r.expirationTime), uid: u.uid });
          bao();
        }, function () { bao(); });
      });
      if (auth.authStateReady) { try { await auth.authStateReady(); } catch (e) { } }
    } catch (e) {
      console.warn('[ve-doc] không khởi động được vé đọc', e);
      bao();   // khỏi bắt các lượt đang chờ đợi đủ 8 giây
    }
    xongSan();
    // ⛔ KHÔNG gọi bao() ở đây: có phiên thì vé tới SAU (getIdTokenResult) — bộ nghe trên tự báo khi có vé /
    // khi phiên rỗng. Lỗi khởi động ⇒ mốc 8 giây ở trên thả các lượt đang chờ.
  })();
})();
