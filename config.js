// ═══════════════════════════════════════════════════════════════
// CẤU HÌNH myLesson Web — sửa file này rồi push là xong.
// ═══════════════════════════════════════════════════════════════
window.MYLESSON_CONFIG = {
  // Tên hiện trên trang + tab trình duyệt
  TEN_SITE: 'Lesson in Andrew Classes',

  // Phiên bản web — hiện nhỏ ở chân trang, để biết máy đang chạy bản nào
  // (GitHub Pages giữ cache ~10 phút, nhìn số này là biết bản mới về chưa).
  PHIEN_BAN: '1.38.0',

  // ---- MÃ QUẢN LÝ CỦA THẦY (v1.9.0) ----
  // Gõ mã này ở màn đăng nhập là vào thẳng trang quản lý (dashboard.html) thay
  // vì trang lớp. Ở đây chỉ cất CHUỖI BĂM SHA-256 của mã (chữ đã bỏ khoảng
  // trắng + viết hoa), nên ai mở file cũng không suy ngược ra mã được.
  //
  // ⚠️ Đây KHÔNG phải bảo mật thật: trang tĩnh thì mọi thứ chạy trên máy người
  // xem. Nó chỉ chặn người tình cờ đọc file, đúng mức tin cậy mà cả hệ đăng
  // nhập này đang có (mã học sinh vốn nằm công khai trong lop.json).
  //
  // Đổi mã: bấm Cài đặt → Quản lý đăng nhập trong app myLesson (Đợt 3), app tự
  // băm rồi ghi lại dòng dưới. Muốn tính tay:
  //   python -c "import hashlib;print(hashlib.sha256('MÃ VIẾT HOA'.encode()).hexdigest())"
  QUAN_LY_BAM: '04dff441ce969820b0affe31d8e84bd981d67a0abe96eb5a551c950ec59eb632',

  // Địa chỉ AWord — nơi các game bài tập nằm.
  // CÙNG NHÀ (tài khoản GitHub andrewclasses-01) với trang này nên nhúng game
  // vào trang thì truyền được tên học sinh sang, khỏi bắt các em gõ tên.
  // Trỏ THẲNG domain riêng — đường github.io cũ bị chuyển hướng 301 mất 1 vòng.
  AWORD: 'https://aword.andrewclasses.com',

  // Kho FILE NGHE (v1.7.0, 19/08/2026) — repo RIÊNG `myLesson-audio`.
  // Trang ghép: <KHO_NGHE>/<LEVEL>/<mã bài nghe>.mp3 — LEVEL suy ra từ chính mã
  // (phần trước dấu gạch đầu tiên): LSFLY · LSA2 · LSB1 · IEL.
  //
  // ⛔ Vì sao KHÔNG để file nghe chung repo này: GitHub Pages chỉ cho mỗi trang
  // 1 GB, mà git xoá file cũng không nhỏ lại. Kho gốc của thầy ~300 bài, nén
  // 64k mono là ~630 MB — để chung là kéo cả trang web xuống hố.
  //
  // ⛔ Cũng ĐỪNG quay lại Google Drive: đã thử cả ba kiểu link tải trực tiếp,
  // trình duyệt TỪ CHỐI PHÁT (Drive trả kèm `attachment` + `nosniff`). Drive
  // chỉ dùng được kiểu khung `/preview` — thứ vừa bỏ vì giấu mất đồng hồ.
  KHO_NGHE: 'https://andrewclasses-01.github.io/myLesson-audio',

  // ---- Hai đầu bên mySpeaking (v1.11.1) — cho thẻ SP CHECK trong lop.html ----
  // (v1.16.0 — Đợt Firebase 26/08/2026) Buổi speaking MỚI nay nằm trong Firestore
  // (spBuoi, project aword-70dae — đọc bằng chính AWORD_DB bên dưới, không cần khoá
  // mới). SP_NAO chỉ còn là ĐƯỜNG LÙI cho buổi cũ trong Google Sheets.
  // Thiếu 2 khóa này từ web v1.9.0 nên toàn bộ đường "Mở phòng chấm" + đếm
  // "ai đã nộp" chết lặng (lop.html đọc A.CFG.SP_NAO / A.CFG.SP_WEB, rỗng là
  // return sớm). Giá trị lấy từ bản mẫu mau-web, đã gọi thử ?config=1 ngày
  // 24/08/2026 — bộ não trả về đúng dữ liệu lớp. ⚠️ Bộ não Apps Script chậm
  // 8–40 giây, đó là bình thường.
  SP_NAO: 'https://script.google.com/macros/s/AKfycbw3etxthOSUHRPA0F4Wvnd2NAoaaISYdfcoY27DyWqlUNOULCHOPC07Nx6KdgEbKOuhRw/exec',
  // Chạy thử trên máy thì trỏ sang mySpeaking local cổng 8126; lên mạng thì
  // dùng domain thật (đã kiểm: trả 200).
  SP_WEB: /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://localhost:8126/'
    : 'https://speaking.andrewclasses.com/',

  // Kho điểm AWord (Firebase) — để đọc bảng xếp hạng ngay trên trang bài.
  // apiKey là khóa CÔNG KHAI theo thiết kế Firebase (chỉ định danh dự án,
  // không phải mật khẩu) — giống hệt bản trong AWord/core/firebase.js.
  AWORD_DB: {
    projectId: 'aword-70dae',
    apiKey: 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY',
  },
};
