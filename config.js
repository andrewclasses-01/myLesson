// ═══════════════════════════════════════════════════════════════
// CẤU HÌNH myLesson Web — sửa file này rồi push là xong.
// ═══════════════════════════════════════════════════════════════
window.MYLESSON_CONFIG = {
  // Tên hiện trên trang + tab trình duyệt
  TEN_SITE: 'Lesson in Andrew Classes',

  // Phiên bản web — hiện nhỏ ở chân trang, để biết máy đang chạy bản nào
  // (GitHub Pages giữ cache ~10 phút, nhìn số này là biết bản mới về chưa).
  PHIEN_BAN: '1.8.0',

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

  // Kho điểm AWord (Firebase) — để đọc bảng xếp hạng ngay trên trang bài.
  // apiKey là khóa CÔNG KHAI theo thiết kế Firebase (chỉ định danh dự án,
  // không phải mật khẩu) — giống hệt bản trong AWord/core/firebase.js.
  AWORD_DB: {
    projectId: 'aword-70dae',
    apiKey: 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY',
  },
};
