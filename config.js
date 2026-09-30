// ═══════════════════════════════════════════════════════════════
// CẤU HÌNH myLesson Web — sửa file này rồi push là xong.
// ═══════════════════════════════════════════════════════════════
// ⭐ 29/09/2026 (thầy chốt) — MỘT BỘ CODE CHO CẢ TRANG THẬT (andrewclasses.com) + TRANG THỬ (andrewclasses-01.github.io/andrewclasses-thu,
// máy: cổng 8825). File hai bên GIỐNG HỆT — trang thử là bản chép tự động (tools/dong-bo-trang-thu.py). Chỉ khác nhờ cờ này:
//   · trang thử bấm tab myNetwork (bảng tin, tin nhắn, cá nhân…) là MỞ trang nw/…; trang thật hiện hộp "sắp ra mắt".
//   · trang thử KHÔNG chứa dữ liệu học sinh (data/, assets/avatar/) ⇒ đọc từ https://andrewclasses.com/.
window.AC_THU = (/^andrewclasses-01\.github\.io$/.test(location.hostname) || location.port === '8825');
window.AC_GOC_DL = window.AC_THU ? 'https://andrewclasses.com/' : '';

window.MYLESSON_CONFIG = {
  // Tên hiện trên trang + tab trình duyệt
  TEN_SITE: 'Lesson in Andrew Classes',

  // Phiên bản web — hiện nhỏ ở chân trang, để biết máy đang chạy bản nào
  // (GitHub Pages giữ cache ~10 phút, nhìn số này là biết bản mới về chưa).
  PHIEN_BAN: '1.201.0',

  // ---- ID QUẢN TRỊ CỦA THẦY (v1.176.0, 29/09/2026) ----
  // Chuỗi BĂM SHA-256 của ID quản trị (viết hoa, bỏ khoảng trắng). Gõ ID này ở màn đăng nhập
  // thì được đưa sang cửa đăng nhập của dashboard — CHỈ LÀ BIỂN CHỈ ĐƯỜNG, không mở khoá gì:
  // dashboard đòi ID + MẬT KHẨU + MÃ 6 SỐ Google Authenticator (tài khoản Firebase, js/thay.js).
  // (Trước v1.176.0 đây là "mã quản lý" gõ đúng là vào thẳng — đã bỏ.)
  // Tài khoản: app/tools/tai-khoan-quan-tri.js (kho app). ⛔ Mục "Quản lý đăng nhập" trong app KHÔNG còn dùng.
  QUAN_LY_BAM: 'e020534cdef61c684614187cbd893e2e48842d5a56683bf317a95ddb17757f65',

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
