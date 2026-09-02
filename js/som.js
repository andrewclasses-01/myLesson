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
   ⛔ Viết kiểu ES5 (var, function) — giống mọi file của web này.
   ============================================================ */
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
    window.__napSom = {
      'data/lop.json': lay('data/lop.json?t=' + t),
      'data/bai.json': lay('data/bai.json?t=' + t),
      lessonHan:  (goc && !conDem('awc_hansua2', 60)) ? lay(goc + 'lessonHan?pageSize=300' + khoa) : null,
      lessonNghi: (goc && !conDem('awc_nghi2', 60))   ? lay(goc + 'lessonNghi?pageSize=100' + khoa) : null
    };
  } catch (e) { /* im lặng — chung.js tự lo */ }
})();
