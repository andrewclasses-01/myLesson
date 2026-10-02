// ═══════════════════════════════════════════════════════════════
// CẤU HÌNH mySpeaking — Thầy chỉnh file này 1 lần rồi push lên GitHub
// ═══════════════════════════════════════════════════════════════
window.MYSPEAKING_CONFIG = {
  // URL Web App của Google Apps Script (xem apps-script/Code.gs và HUONG DAN TRIEN KHAI.md)
  // Dạng: https://script.google.com/macros/s/AKfycb.../exec
  // 27/07/2026 — bộ não CŨ bị xoá mất trong sự cố Google Drive (dự án Apps Script biến mất
  // khỏi Drive, /exec trả "tệp không tồn tại"). Đã dựng lại dự án mới + deploy lại => ĐỊA CHỈ ĐỔI.
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbw3etxthOSUHRPA0F4Wvnd2NAoaaISYdfcoY27DyWqlUNOULCHOPC07Nx6KdgEbKOuhRw/exec",

  // (Tùy chọn) Google Drive API key — để phát TRỰC TIẾP video Drive >100MB
  // (lấy mốc thời gian chính xác thay vì dùng đồng hồ dự phòng).
  // Không có key: video Drive lớn tự chuyển sang chế độ iframe + đồng hồ.
  // Cách tạo key: xem HUONG DAN TRIEN KHAI.md. Nên giới hạn key theo referrer github.io.
  // (02/09/2026 — bao mat A3) DRIVE_API_KEY DA GO: mySpeaking chi con dung YouTube, thay chot
  // KHONG BAO GIO dung video Drive nua; khoa da xoa tren Google Cloud (project myspeaking-502901).
  // Khong co khoa thi app.js tu bo duong Drive API (initDriveDirect), YouTube khong anh huong.
  DRIVE_API_KEY: "",

  // Tên hiển thị trên app
  APP_TITLE: "SPEAKING TEAM CHECK",

  // (Đợt Firebase 26/08/2026) KHO MỚI — Firestore project aword-70dae, dùng chung với
  // AWord + myLesson (thầy chốt "chuyển trọn"). apiKey là khoá CÔNG KHAI theo thiết kế
  // Firebase (chỉ định danh project, không phải mật khẩu) — ai chặn người lạ là LUẬT
  // trên Console, không phải đoạn chữ này. Bộ não Apps Script ở trên GIỮ NGUYÊN làm
  // đường lùi cho các buổi CŨ còn trong Google Sheets.
  FIREBASE: {
    projectId: "aword-70dae",
    apiKey: "AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY",
    // (27/09/2026) appId + messagingSenderId: Firebase App Check gắn theo APP — thiếu appId là không xin được mã.
    appId: "1:399279049436:web:b9b34dcfb34732aa744219",
    messagingSenderId: "399279049436",
  },
};
