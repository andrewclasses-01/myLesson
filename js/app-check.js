/* ============================================================
   app-check.js — FIREBASE APP CHECK (27/09/2026, web v1.157.0 — phương án F sau tấn công Tr0ngX)

   VÌ SAO: kẻ tấn công ghi rác bằng SCRIPT gọi thẳng Firestore với khoá API công khai.
   App Check bắt mỗi lượt gọi kèm một MÃ CHỨNG NHẬN do reCAPTCHA cấp cho trình duyệt THẬT đang mở
   đúng trang của thầy. Khi thầy BẬT ÉP BUỘC (Firebase Console → App Check), lượt không có mã bị
   từ chối — script ngoài không có mã.

   GIAI ĐOẠN HIỆN TẠI: CHỈ THEO DÕI (chưa ép buộc). File này chỉ GẮN mã khi có — không có mã thì
   mọi thứ chạy y như cũ. KHÔNG được làm chậm / làm hỏng trang: mọi thứ trong try, khởi động SAU
   khi trang tải xong.

   HAI PHẦN:
   1. BỌC fetch (đồng bộ, rất nhẹ): lượt gọi REST tới firestore/firebasestorage.googleapis.com được
      gắn header `X-Firebase-AppCheck` lấy từ mã đã cất trong localStorage 'awc_ac' (còn hạn).
      ⛔ BẢN CHÉP: phần bọc này có một bản y hệt ở ĐẦU `js/som.js` (dập vào <head> 6 trang để bọc
      được cả mấy lượt xin dữ liệu SỚM). Sửa bên này thì sửa bên kia rồi chạy
      `python tools/sinh-som.py --write`. Cờ `window.__acBoc` chặn bọc hai lần.
   2. SDK App Check (nạp lười sau sự kiện load): initializeAppCheck + ReCaptchaEnterpriseProvider,
      tự làm mới mã; mỗi lần có mã mới thì cất vào 'awc_ac' cho lượt gọi sau (kể cả lần mở trang sau).
      Web SDK (chat, cảm xúc…) tự gắn mã qua App Check — không cần làm gì thêm.

   Thử trên máy (localhost không có trong danh sách tên miền reCAPTCHA): đặt
   localStorage 'awc_ac_debug' = MÃ MÁY TIN CẬY (debug token, KHÔNG BAO GIỜ đưa lên git) rồi tải lại.
   Hồ sơ đầy đủ: myLesson-app "HO SO BAO MAT.md" mục F.
   ============================================================ */
(function () {
  'use strict';
  // ---- 1. bọc fetch (⛔ BẢN CHÉP ở đầu js/som.js) ----
  try {
    if (!window.__acBoc && window.fetch) {
      window.__acBoc = true;
      var gocFetch = window.fetch;
      var HOST_AC = /^https:\/\/(firestore|firebasestorage)\.googleapis\.com\//;
      window.fetch = function (vao, tuyChon) {
        try {
          var url = typeof vao === 'string' ? vao : (vao && vao.url) || '';
          if (HOST_AC.test(url)) {
            var o = JSON.parse(localStorage.getItem('awc_ac') || 'null');
            if (o && o.t && o.het > Date.now() + 60000) {
              if (typeof vao === 'string') {
                tuyChon = Object.assign({}, tuyChon || {});
                var h = new Headers(tuyChon.headers || {});
                if (!h.has('X-Firebase-AppCheck')) h.set('X-Firebase-AppCheck', o.t);
                tuyChon.headers = h;
              } else if (!vao.headers.has('X-Firebase-AppCheck')) {
                var h2 = new Headers(vao.headers); h2.set('X-Firebase-AppCheck', o.t);
                vao = new Request(vao, { headers: h2 });
              }
            }
          }
        } catch (e) { /* hỏng gì cũng gửi như cũ */ }
        return gocFetch.call(this, vao, tuyChon);
      };
    }
  } catch (e) { /* im lặng */ }

  // ---- 2. SDK App Check ----
  if (window.AWAppCheck) return;
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
  var SITE_KEY = '6Ldrp6YtAAAAAPV9oT2yUeuJBWj1zTnz-YqPu4Vo';   // reCAPTCHA Enterprise "App Check - speaking web" (tên miền: andrewclasses.com + con, andrewclasses-01.github.io)
  var CAU_HINH = {   // ⛔ phải có appId — App Check gắn theo app. Giống js/chat.js.
    apiKey: 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY',
    authDomain: 'aword-70dae.firebaseapp.com',
    projectId: 'aword-70dae',
    storageBucket: 'aword-70dae.firebasestorage.app',
    messagingSenderId: '399279049436',
    appId: '1:399279049436:web:b9b34dcfb34732aa744219'
  };
  function hetHan(t) {   // mốc hết hạn (ms) đọc từ mã JWT; đọc hỏng ⇒ coi như còn 50 phút
    try {
      var p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (p && p.exp) return p.exp * 1000;
    } catch (e) {}
    return Date.now() + 50 * 60000;
  }
  var _p = null;
  function batDau() {
    if (_p) return _p;
    _p = (async function () {
      try { var d = localStorage.getItem('awc_ac_debug'); if (d) self.FIREBASE_APPCHECK_DEBUG_TOKEN = d; } catch (e) {}
      var a = await import(SDK + '/firebase-app.js');
      var c = await import(SDK + '/firebase-app-check.js');
      var app = a.getApps().length ? a.getApp() : a.initializeApp(CAU_HINH);
      if (!app.options || !app.options.appId) app = a.initializeApp(CAU_HINH, 'appCheck');   // app mặc định do chỗ khác tạo thiếu appId
      var ac = c.initializeAppCheck(app, { provider: new c.ReCaptchaEnterpriseProvider(SITE_KEY), isTokenAutoRefreshEnabled: true });
      c.onTokenChanged(ac, function (r) {
        try { if (r && r.token) localStorage.setItem('awc_ac', JSON.stringify({ t: r.token, het: hetHan(r.token) })); } catch (e) {}
      });
      return { c: c, ac: ac };
    })()['catch'](function (e) {
      try { console.warn('[App Check] chưa khởi động được:', e && (e.code || e.message)); } catch (_) {}
      return null;
    });
    return _p;
  }
  // Mã hiện tại (chờ tối đa `ms`); không có ⇒ ''. Để chỗ nào cần chủ động gắn.
  function layMa(ms) {
    return Promise.race([
      batDau().then(function (x) { return x ? x.c.getToken(x.ac, false).then(function (r) { return (r && r.token) || ''; }) : ''; }),
      new Promise(function (xong) { setTimeout(function () { xong(''); }, ms || 2500); })
    ])['catch'](function () { return ''; });
  }
  window.AWAppCheck = { batDau: batDau, layMa: layMa };

  // Ẩn huy hiệu reCAPTCHA (che nút góc phải) + ghi dòng ghi nhận ở chân trang có sẵn (điều khoản Google).
  try {
    var st = document.createElement('style');
    st.textContent = '.grecaptcha-badge{visibility:hidden!important}.ac-ghi{margin:4px 0 0;font-size:10.5px;opacity:.55}.ac-ghi a{color:inherit}';
    (document.head || document.documentElement).appendChild(st);
  } catch (e) {}
  function ghiChanTrang() {
    try {
      var chan = document.querySelector('.login-foot, .chan-trang');
      if (!chan || chan.querySelector('.ac-ghi')) return;
      var p = document.createElement('p');
      p.className = 'ac-ghi';
      p.innerHTML = 'Trang được bảo vệ bởi reCAPTCHA — áp dụng <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Chính sách quyền riêng tư</a> và <a href="https://policies.google.com/terms" target="_blank" rel="noopener">Điều khoản</a> của Google.';
      chan.appendChild(p);
    } catch (e) {}
  }
  function khiXong() { setTimeout(function () { batDau(); ghiChanTrang(); }, 0); }
  if (document.readyState === 'complete') khiXong(); else window.addEventListener('load', khiXong);
})();
