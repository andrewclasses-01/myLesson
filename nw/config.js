// ═══════════════════════════════════════════════════════════════
// CẤU HÌNH myNetwork — mạng xã hội riêng của Andrew Classes.
// Sửa file này rồi push là xong (như config.js bên myLesson web).
// ═══════════════════════════════════════════════════════════════
window.NW_CONFIG = {
  TEN_SITE: 'Andrew Classes Network',

  // Phiên bản — hiện nhỏ ở chân trang / menu. GitHub Pages giữ cache ~10 phút,
  // nhìn số này là biết máy đang chạy bản nào.
  PHIEN_BAN: '0.9.2',

  // TRANG THỬ (28/09/2026): myNetwork nằm trong nw/ của andrewclasses-thu ⇒ trang bài tập + dashboard là trang CÙNG NHÀ.
  // ../index.html tự đưa em đã đăng nhập về trang lớp của em.
  LINK_BAI_TAP: '../index.html',

  // v0.9.0: trang Quản lý của thầy nhúng nguyên dashboard myLesson vào mục "Trang bài tập".
  // Trang thử: tab QUẢN LÝ của thầy về thẳng dashboard này (thanh.js).
  LINK_DASHBOARD: '../dashboard.html',

  // Firebase — DÙNG CHUNG project `aword-70dae` với AWord + myLesson + mySpeaking
  // (thầy chốt dùng chung, đã lên Blaze 28/08/2026, máy chủ asia-southeast1).
  // apiKey là khoá CÔNG KHAI theo thiết kế Firebase (chỉ định danh project), không
  // phải mật khẩu — bảo vệ thật nằm ở LUẬT Firestore/Storage (xem tai-lieu/).
  FIREBASE: {
    apiKey: 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY',
    authDomain: 'aword-70dae.firebaseapp.com',
    projectId: 'aword-70dae',
    storageBucket: 'aword-70dae.firebasestorage.app',
    messagingSenderId: '399279049436',
    appId: '1:399279049436:web:b9b34dcfb34732aa744219'
  },

  // Email của thầy (đăng nhập Google) — phải khớp hàm laThay() trong luật Firestore.
  EMAIL_THAY: 'namdaptrai01@gmail.com',
  ID_THAY: 'ANDREW',           // v0.8.0: gõ ID này ở màn đăng nhập → sang màn Google của thầy (không hỏi mật khẩu)

  // Tài khoản học sinh trên Firebase Auth có email GIẢ dạng <băm mã>@id.andrewclasses.com
  // (không phải hộp thư thật). Đuôi này phải khớp tools/tao-tai-khoan.mjs.
  DUOI_EMAIL: '@id.andrewclasses.com',

  // ---- Giới hạn nội dung (phải khớp luật Firestore) ----
  TOI_DA_CHU_BAI: 2000,       // một bài đăng
  TOI_DA_CHU_BINH_LUAN: 500,  // một bình luận
  TOI_DA_CHU_TIN: 1000,       // một tin nhắn
  TOI_DA_ANH_BAI: 10,          // số ảnh mỗi bài
  TOI_DA_THANH_VIEN_NHOM: 30, // nhóm chat

  // ---- Nhắn tin riêng ----
  // Thầy chốt 20/09/2026: giai đoạn đầu chỉ nhắn được với bạn CÙNG LỚP + thầy.
  // Bật cờ này (và luật Firestore đã có nhánh nwBanBe) là mở nhắn toàn mạng qua KẾT BẠN.
  BAT_KET_BAN: true,   // v0.4.0 thầy chốt 22/09: cùng lớp = bạn sẵn, KHÁC LỚP phải kết bạn mới xem trang / nhắn tin

  // ---- Từ cấm: ô soạn tự chặn khi gõ (chặn ở giao diện; thầy còn kho
  // nwCauHinh/tuCam trên Firestore để thêm bớt không cần sửa code) ----
  TU_CAM: ['đm', 'dm', 'vcl', 'vl', 'cc', 'clm', 'đcm', 'dcm', 'ngu', 'óc chó', 'chó'],

  // Nén ảnh trước khi tải lên (bài học "nén media trước khi lưu"): JPEG chạy được
  // trên mọi máy học sinh, kể cả iPhone cũ — không dùng WebP/AVIF.
  ANH: { canhDai: 1600, chatLuong: 0.82, avatar: 320, bia: 1600, toiDaByte: 1.5 * 1024 * 1024 }
};
