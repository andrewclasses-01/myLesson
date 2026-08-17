// ═══════════════════════════════════════════════════════════════
// CẤU HÌNH myLesson Web — sửa file này rồi push là xong.
// ═══════════════════════════════════════════════════════════════
window.MYLESSON_CONFIG = {
  // Tên hiện trên trang + tab trình duyệt
  TEN_SITE: 'Lesson in Andrew Classes',

  // Phiên bản web — hiện nhỏ ở chân trang, để biết máy đang chạy bản nào
  // (GitHub Pages giữ cache ~10 phút, nhìn số này là biết bản mới về chưa).
  PHIEN_BAN: '1.6.1',

  // Địa chỉ AWord — nơi các game bài tập nằm.
  // CÙNG NHÀ (tài khoản GitHub andrewclasses-01) với trang này nên nhúng game
  // vào trang thì truyền được tên học sinh sang, khỏi bắt các em gõ tên.
  // Trỏ THẲNG domain riêng — đường github.io cũ bị chuyển hướng 301 mất 1 vòng.
  AWORD: 'https://aword.andrewclasses.com',

  // Kho điểm AWord (Firebase) — để đọc bảng xếp hạng ngay trên trang bài.
  // apiKey là khóa CÔNG KHAI theo thiết kế Firebase (chỉ định danh dự án,
  // không phải mật khẩu) — giống hệt bản trong AWord/core/firebase.js.
  AWORD_DB: {
    projectId: 'aword-70dae',
    apiKey: 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY',
  },
};
