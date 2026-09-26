/* ============================================================
   som.js — KHỞI ĐỘNG SỚM (web v1.54.0 → v1.54.1, 03/09/2026)

   ⛔ KHÔNG trang nào nạp file này bằng <script src>. Nó là NGUỒN để
   `python tools/sinh-som.py --write` DẬP THẲNG mã vào <head> của 5 trang
   (giữa hai mốc SOM:BEGIN/END), thay `window.MYLESSON_CONFIG` bằng
   projectId/apiKey đọc từ config.js. Sửa file này ⇒ chạy lại generator.
   Vì sao dập chứ không nạp: <script src> ở <head> chặn vẽ trang cho tới
   khi file về — cache quá 10 phút thì tốn ~300ms hỏi-lại TRƯỚC KHI vẽ gì
   (đo live 03/09, bản v1.54.0: dữ liệu chỉ bắt đầu ở 765ms, tệ hơn 418ms cũ).

   Mục đích: bốn lượt đọc dữ liệu mà mọi trang đều cần bắt đầu từ mili-giây
   đầu tiên thay vì chờ trình duyệt đọc hết trang + chạy chung.js ở cuối
   <body> (đo thật 02/09: chung.js chỉ bắt đầu xin dữ liệu ở ~420ms, trong
   khi HTML về từ ~230ms, mà lượt Firestore 300ms nằm đúng trên đường găng
   vẽ thẻ).

   Kết quả để ở `window.__napSom` — chung.js (`napJson` · `napHanSua` ·
   `napNghi`) lấy ra dùng MỘT LẦN rồi xoá; không có (trang cũ, lỗi) thì
   chung.js tự fetch như trước. Mọi thứ trong try: hỏng gì cũng KHÔNG được
   làm trang trắng.

   ⛔ BẢN CHÉP — ba thứ dưới đây PHẢI y hệt chung.js, đổi bên kia thì đổi
   đây (xem BAN GIAO.md mục 0⚡):
     · địa chỉ kho: lessonHan?pageSize=300 · lessonNghi?pageSize=100
     · khoá đệm phiên: 'awc_hansua2' · 'awc_nghi2' — còn hạn (60 giây) thì
       KHÔNG đọc sớm, kẻo mỗi lần chuyển trang là tốn thêm một lượt đọc
       Firestore vô ích (luật 8️⃣: tính tiền theo số tài liệu).
     · ⭐ v1.119.0 (21/09/2026) KHO WEB TỨC THÌ `lessonWeb`: xin sớm `lessonWeb/lop`
       và `lessonWeb/bai_<LỚP>` (LỚP đoán từ `?lop=` rồi `localStorage
       'mylesson_hs'.lop` — y hệt `doanLop()` bên chung.js). Đoán sai/không đoán
       được thì chung.js tự xin sau, không hỏng gì. KHÔNG đệm: mục đích là tươi.
   ⛔ Viết kiểu ES5 (var, function) — giống mọi file của web này.
   ============================================================ */
// ⭐ 27/09/2026 (v1.157.0) APP CHECK — BỌC fetch: gắn header X-Firebase-AppCheck (mã cất ở localStorage
// 'awc_ac' bởi js/app-check.js) cho lượt gọi REST tới firestore/firebasestorage.googleapis.com — kể cả mấy
// lượt xin SỚM ngay dưới đây. ⛔ BẢN CHÉP y hệt phần 1 của js/app-check.js. Không có mã ⇒ gửi như cũ.
(function () {
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
})();
(function () {
  try {
    var C = window.MYLESSON_CONFIG || {};
    var db = C.AWORD_DB || {};
    var t = Date.now();
    function lay(u) {
      try { return fetch(u, { cache: 'no-store' }); } catch (e) { return null; }
    }
    function conDem(khoa, giay) {
      try {
        var o = JSON.parse(sessionStorage.getItem(khoa) || 'null');
        return !!(o && (Date.now() - o.luc) < giay * 1000);
      } catch (e) { return false; }
    }
    var goc = (db.projectId && db.apiKey)
      ? 'https://firestore.googleapis.com/v1/projects/' + db.projectId + '/databases/(default)/documents/'
      : '';
    var khoa = goc ? '&key=' + encodeURIComponent(db.apiKey) : '';
    // v1.119.0 — lớp đoán trước để xin sớm tài liệu bài của lớp (PHẢI y hệt chung.js doanLop)
    var lopDoan = '';
    try {
      lopDoan = new URLSearchParams(location.search).get('lop') || '';
      if (!lopDoan) { var em = JSON.parse(localStorage.getItem('mylesson_hs') || 'null'); lopDoan = (em && em.lop) || ''; }
      lopDoan = String(lopDoan).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    } catch (e) { lopDoan = ''; }
    window.__napSom = {
      'data/lop.json': lay('data/lop.json?t=' + t),
      'data/bai.json': lay('data/bai.json?t=' + t),
      lessonHan:  (goc && !conDem('awc_hansua2', 60)) ? lay(goc + 'lessonHan?pageSize=300' + khoa) : null,
      lessonNghi: (goc && !conDem('awc_nghi2', 60))   ? lay(goc + 'lessonNghi?pageSize=100' + khoa) : null,
      'lessonWeb/lop': goc ? lay(goc + 'lessonWeb/lop?key=' + encodeURIComponent(db.apiKey)) : null,
      lessonWebBaiLop: lopDoan,
      lessonWebBai: (goc && lopDoan) ? lay(goc + 'lessonWeb/bai_' + lopDoan + '?key=' + encodeURIComponent(db.apiKey)) : null
    };
  } catch (e) { /* im lặng — chung.js tự lo */ }
})();
