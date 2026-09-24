/* ============================================================
   nw-thanh.js — THANH myNetwork trên trang LỚP + trang KHÓA (mẫu v29, 24/09/2026)

   Thầy chốt 24/09: andrewclasses.com đổi sang giao diện myNetwork nhưng CHỈ mở
   TRANG BÀI TẬP. Avatar (trang cá nhân) + 5 icon còn lại bấm vào = hộp nhỏ giữa
   màn "Tính năng sẽ sớm được ra mắt". ☰ mở sidebar cũ của myLesson (ví sao +
   menu vi-qua.js), nay trượt từ PHẢI như myNetwork.

   Nạp SAU script chính của trang: cần `veMenuChinh` (biến toàn cục của
   lop.html/khoa.html) để mở lại menu chính mỗi lần mở sidebar.
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, g) { return (g || document).querySelector(s); };
  var P = function (d) { return '<svg viewBox="0 0 24 24">' + d + '</svg>'; };
  // Icon chép y myNetwork js/loi.js (IC.*)
  var IC = {
    baiTap: P('<path d="M8.5 21H5.2A1.7 1.7 0 0 1 3.5 19.3V4.2A1.7 1.7 0 0 1 5.2 2.5h8.3l5 5v3.3"/><path d="M13.5 2.5v4.2a1 1 0 0 0 1 1h4"/><path d="M6.8 9.6h4M6.8 12.6h7M6.8 15.6h5.2"/><path d="M11.3 21.5l.9-3.5 6.5-6.5a1.85 1.85 0 0 1 2.6 2.6l-6.5 6.5z"/><path d="M17.4 12.8l2.6 2.6"/>'),
    khamPha: P('<circle cx="12" cy="12" r="9.5"/><path d="m15.8 8.2-2.2 5.4-5.4 2.2 2.2-5.4z"/>'),
    tinNhan: P('<path d="M12.5 2.5a8.5 8.5 0 1 1-4.6 15.6L3 21.5l1.6-5.2A8.5 8.5 0 0 1 12.5 2.5z"/><circle cx="8.8" cy="11" r="1.2" fill="currentColor" stroke="none"/><circle cx="12.5" cy="11" r="1.2" fill="currentColor" stroke="none"/><circle cx="16.2" cy="11" r="1.2" fill="currentColor" stroke="none"/>'),
    bangTin: P('<path d="M3 10.8 12 3.5l9 7.3"/><path d="M5.5 9.3V20.5h13V9.3"/><path d="M10 20.5v-5.5h4v5.5"/>'),
    chuong: P('<path d="M6.2 8.5a5.8 5.8 0 0 1 11.6 0c0 6.5 2.7 8.3 2.7 8.3H3.5s2.7-1.8 2.7-8.3"/><path d="M10.4 20.5a1.8 1.8 0 0 0 3.2 0"/>'),
    timKiem: P('<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.6-4.6"/>'),
    caNhan: P('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
    menu3: P('<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>')
  };
  var TABS = [
    { ma: 'baiTap', chu: 'TRANG BÀI TẬP' },
    { ma: 'khamPha', chu: 'KHÁM PHÁ' },
    { ma: 'tinNhan', chu: 'TIN NHẮN' },
    { ma: 'bangTin', chu: 'BẢNG TIN' },
    { ma: 'chuong', chu: 'THÔNG BÁO' },
    { ma: 'timKiem', chu: 'TÌM KIẾM' }
  ];
  // Nút Đăng ký ở màn đăng nhập (thầy 24/09: sau này mở màn đăng ký cho học sinh mới)
  IC.dangKy = P('<circle cx="9" cy="8.2" r="3.4"/><path d="M3.4 20c0-3.6 2.9-6 5.6-6s5.6 2.4 5.6 6"/><path d="M18.6 7.6v5M16.1 10.1h5"/>');
  var TEN = { caNhan: 'TRANG CÁ NHÂN', dangKy: 'ĐĂNG KÝ' };
  TABS.forEach(function (t) { TEN[t.ma] = t.chu; });

  // ---------- hộp "sắp ra mắt" (dùng ở trang lớp/khóa + màn đăng nhập) ----------
  var LAP = '<path d="M5 0l1.1 3.9L10 5l-3.9 1.1L5 10 3.9 6.1 0 5l3.9-1.1z"/>';
  var sap = document.createElement('div');
  sap.className = 'nwb-sap';
  sap.setAttribute('role', 'dialog');
  sap.innerHTML = '<div class="nwb-sap-hop"><div class="nwb-sap-ic"></div><p class="nwb-sap-ten"></p>' +
    '<p class="nwb-sap-chu"></p><ul class="nwb-sap-ds"></ul>' +
    '<div class="nwb-dem"><p class="nwb-dem-nh">RA MẮT SAU</p><div class="nwb-dem-o">' +
    ['ngay:NGÀY', 'gio:GIỜ', 'phut:PHÚT', 'giay:GIÂY'].map(function (x) { x = x.split(':'); return '<span><b data-o="' + x[0] + '">00</b><i>' + x[1] + '</i></span>'; }).join('') +
    '</div><p class="nwb-dem-ngay">00:00 · Thứ Năm, 01/10/2026</p></div>' +
    '<button type="button" class="nwb-sap-nut">EM SẼ CHỜ!</button></div>';
  document.body.appendChild(sap);

  // ⭐ thầy 24/09: mỗi tính năng có lời giới thiệu ngắn, kích thích tò mò + đếm ngược tới 00:00 01/10/2026 (giờ VN).
  var GIOI_THIEU = {
    khamPha: { chu: 'Cả thế giới thú vị cùng Andrew Classes', ds: ['Trò chơi & giải đấu online — thi tài với bạn khắp các lớp', 'Khám phá những khóa học bổ ích', 'Xem những gì nổi bật và thịnh hành'] },
    tinNhan: { chu: 'Trò chuyện và chia sẻ những điều thú vị', ds: ['Chat riêng với bạn, chat nhóm cùng cả lớp'] },
    bangTin: { chu: 'Thế giới ngoài kia có gì?', ds: ['Đăng ảnh, chia sẻ thành tích, kể chuyện lớp mình', 'Bình luận với những bài đăng thú vị'] },
    chuong: { chu: 'Không bỏ lỡ bất cứ điều gì', ds: ['Ai vừa thả tim, bình luận bài của em', 'Lời mời kết bạn từ các lớp khác', 'Tin quan trọng từ thầy Andrew'] },
    timKiem: { chu: 'Tìm mọi người, mọi bài viết chỉ trong một chạm', ds: ['Tìm bạn cũ, bạn mới ở mọi lớp', 'Tìm lại bài đăng, nhóm chat', 'Kết bạn để mở rộng vòng bạn bè'] },
    caNhan: { chu: 'Thế giới của riêng em', ds: ['Ảnh bìa, ảnh đại diện, lời giới thiệu', 'Sở thích và bài viết của riêng em', 'Ghi lại những kỷ niệm, chia sẻ hành trình của riêng em'] },
    dangKy: { chu: 'Học sinh mới đăng ký học ngay trên web', ds: ['Đăng ký kiểm tra đầu vào', 'Đăng ký học thử', 'Thầy liên hệ lại sớm nhất'] }
  };
  var MOC_RA_MAT = Date.parse('2026-10-01T00:00:00+07:00');
  var nhipDem = null;
  function hai(n) { return (n < 10 ? '0' : '') + n; }
  function veDem() {
    var con = Math.max(0, MOC_RA_MAT - Date.now()), s = Math.floor(con / 1000);
    var so = { ngay: Math.floor(s / 86400), gio: Math.floor(s % 86400 / 3600), phut: Math.floor(s % 3600 / 60), giay: s % 60 };
    Object.keys(so).forEach(function (k) { $('[data-o="' + k + '"]', sap).textContent = hai(so[k]); });
    if (!con) { $('.nwb-dem-nh', sap).textContent = 'ĐÃ ĐẾN GIỜ RA MẮT!'; clearInterval(nhipDem); nhipDem = null; }
  }
  function moSap(ma) {
    var g = GIOI_THIEU[ma] || { chu: 'Tính năng sẽ sớm được ra mắt', ds: [] };
    $('.nwb-sap-ic', sap).innerHTML = IC[ma] + '<svg class="lap a" viewBox="0 0 10 10">' + LAP + '</svg><svg class="lap b" viewBox="0 0 10 10">' + LAP + '</svg>';
    $('.nwb-sap-ten', sap).textContent = TEN[ma] || '';
    $('.nwb-sap-chu', sap).textContent = g.chu;
    $('.nwb-sap-ds', sap).innerHTML = g.ds.map(function (d) { return '<li>' + d + '</li>'; }).join('');
    veDem();
    if (!nhipDem && MOC_RA_MAT > Date.now()) nhipDem = setInterval(veDem, 1000);
    sap.classList.add('mo');
    $('.nwb-sap-nut', sap).focus({ preventScroll: true });
  }
  function dongSap() { sap.classList.remove('mo'); clearInterval(nhipDem); nhipDem = null; }
  sap.onclick = function (e) { if (e.target === sap) dongSap(); };
  $('.nwb-sap-nut', sap).onclick = dongSap;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dongSap(); });
  var dk = $('#btnDangKy');
  if (dk) dk.onclick = function () { moSap('dangKy'); };   // ⬜ sau này: form đăng ký → lưu kho + thầy xem ở dashboard

  // ---------- hộp LIÊN HỆ (thầy chốt 24/09: chỉ Zalo + điện thoại) ----------
  var SDT = '0359.769.765', SDT_SO = SDT.replace(/\D/g, '');
  var lh = document.createElement('div');
  lh.className = 'nwb-sap nwb-lh';
  lh.setAttribute('role', 'dialog');
  lh.innerHTML = '<div class="nwb-sap-hop"><img class="nwb-lh-av" src="assets/avatar-tron.jpg" alt="">' +
    '<p class="nwb-sap-ten">LIÊN HỆ</p><p class="nwb-lh-ten">Thầy Andrew</p><p class="nwb-lh-sdt">' + SDT + '</p>' +
    '<div class="nwb-lh-nut"><a class="nwb-sap-nut" href="https://zalo.me/' + SDT_SO + '" target="_blank" rel="noopener">NHẮN ZALO</a>' +
    '<a class="nwb-sap-nut phu" href="tel:' + SDT_SO + '">GỌI ĐIỆN</a></div></div>';
  document.body.appendChild(lh);
  lh.onclick = function (e) { if (e.target === lh) lh.classList.remove('mo'); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lh.classList.remove('mo'); });
  var nutLh = $('#btnLienHe');
  if (nutLh) nutLh.onclick = function () { lh.classList.add('mo'); };

  var dau = $('.top.nwb');
  if (!dau) return;              // màn đăng nhập: không có thanh
  // ⭐ thầy 24/09: dashboard (data-vai="thay") theo thiết kế QUẢN LÝ myNetwork 22/09 — tab đầu = QUẢN LÝ + cột trái danh mục
  var laThay = dau.getAttribute('data-vai') === 'thay';
  document.body.classList.add('co-nwb');
  if (laThay) document.body.classList.add('nwb-thay');
  IC.quanLy = P('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="14" width="8" height="7" rx="2"/>');
  TEN.quanLy = 'QUẢN LÝ';
  var tabs = TABS.map(function (t) { return laThay && t.ma === 'baiTap' ? { ma: 'quanLy', chu: 'QUẢN LÝ' } : t; });

  $('.nwb-tabs', dau).innerHTML = tabs.map(function (t, i) {
    var dauTien = i === 0;
    return '<a class="nwb-tab' + (dauTien ? ' chon' : '') + '" data-ma="' + t.ma + '" data-nh="' + t.chu + '" href="' +
      (dauTien ? location.pathname.split('/').pop() : '#') + '" title="' + t.chu + '" aria-label="' + t.chu + '">' + IC[t.ma] + '</a>';
  }).join('');
  var nutMenu = $('.nwb-menu', dau);
  nutMenu.innerHTML = IC.menu3;

  dau.addEventListener('click', function (e) {
    var t = e.target.closest('.nwb-tab');
    if (!t) return;
    e.preventDefault();
    var ma = t.getAttribute('data-ma');
    if (ma === 'baiTap' || ma === 'quanLy') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    moSap(ma);
  });

  // Avatar = TRANG CÁ NHÂN (chưa mở). Gán đè onclick cũ của trang (mở sidebar).
  var av = $('#nutMenu') || $('#nwbAv');
  if (av) { av.title = 'Trang cá nhân'; av.onclick = function () { moSap('caNhan'); }; }

  // ☰ học sinh = sidebar cũ (ví sao + menu), mở lại luôn thấy MENU CHÍNH như nút avatar cũ.
  // ☰ thầy mang id="moSb" ⇒ dashboard tự gắn moSb() như nút "Andrew Classes" cũ, không cần gắn ở đây.
  if (!laThay) nutMenu.onclick = function () {
    if (typeof window.veMenuChinh === 'function') window.veMenuChinh();
    document.body.classList.add('mo-menu');
  };

  // ---------- CỘT TRÁI QUẢN LÝ (thầy) — danh mục y myNetwork quanly.html; mục Network tạm "sắp ra mắt" ----------
  var cot = $('#nwbQlCot');
  if (!laThay || !cot) return;
  var P2 = function (d) { return '<svg viewBox="0 0 24 24">' + d + '</svg>'; };
  var ICQ = {
    nhom: P2('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
    sao: P2('<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/>'),
    suKien: P2('<rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M8 14h3M13 14h3M8 17.5h3"/>'),
    baoCao: P2('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>'),
    an: P2('<path d="M17.9 17.9A10.9 10.9 0 0 1 12 20c-7 0-11-8-11-8a20 20 0 0 1 5.1-6"/><path d="M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a20 20 0 0 1-2.2 3.2"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/><line x1="1" y1="1" x2="23" y2="23"/>'),
    tuCam: P2('<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'),
    lop: P2('<path d="M3 10.8 12 6l9 4.8-9 4.8z"/><path d="M6.5 12.6v4.4c0 1.2 2.5 2.5 5.5 2.5s5.5-1.3 5.5-2.5v-4.4"/><path d="M21 10.8V16"/>')
  };
  // thầy 24/09: cột trái kiểu Facebook — không khung, dòng đầu = avatar + tên, icon to có MÀU riêng, nhóm ngăn bằng vạch mảnh
  var MUC_QL = [
    { ma: 'caNhan', chu: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg' },
    { nhom: 'Bài tập', vach: true },
    { ma: 'baiTap', chu: 'Trang bài tập', ic: IC.baiTap, mau: '#0E7C6E' },
    { nhom: 'Network', vach: true },
    { ma: 'nhom', chu: 'Nhóm chat', ic: ICQ.nhom, mau: '#3E7BFA', mo: 'Lập và quản lý nhóm chat các lớp' },
    { ma: 'baiDang', chu: 'Bài đăng', ic: IC.bangTin, mau: '#18A957', mo: 'Xem, ẩn, xoá bài đăng của học sinh' },
    { ma: 'noiBat', chu: 'Nổi bật', ic: ICQ.sao, mau: '#E0B411', mo: 'Ghim và sắp xếp bài nổi bật' },
    { ma: 'suKien', chu: 'Sự kiện & Khám phá', ic: ICQ.suKien, mau: '#F0821E', mo: 'Đăng trò chơi, giải đấu, khoá học, thông báo' },
    { ma: 'baoCao', chu: 'Báo cáo', ic: ICQ.baoCao, mau: '#E0575B', mo: 'Xử lý báo cáo vi phạm từ học sinh' },
    { ma: 'daAn', chu: 'Bài đã ẩn', ic: ICQ.an, mau: '#7A8A87', mo: 'Xem lại và khôi phục bài đã ẩn' },
    { ma: 'tuCam', chu: 'Từ cấm', ic: ICQ.tuCam, mau: '#C2410C', mo: 'Thêm bớt từ cấm cho cả mạng' },
    { ma: 'taiKhoan', chu: 'Tài khoản', ic: IC.caNhan, mau: '#8B5CF6', mo: 'Cấp, khoá, đặt lại mật khẩu tài khoản' },
    { ma: 'lop', chu: 'Lớp', ic: ICQ.lop, mau: '#0891B2', mo: 'Xem thành viên từng lớp trên mạng' }
  ];
  cot.innerHTML = MUC_QL.map(function (m) {
    if (m.nhom) return (m.vach ? '<hr class="nwb-ql-vach">' : '') + '<div class="nwb-ql-nhom">' + m.nhom + '</div>';
    var hinh = m.anh ? '<img class="nwb-ql-av" src="' + m.anh + '" alt="">' : m.ic.replace('<svg ', '<svg style="stroke:' + m.mau + '" ');
    return '<button type="button" class="nwb-ql-muc' + (m.ma === 'baiTap' ? ' chon' : '') + '" data-muc="' + m.ma + '">' + hinh + '<span>' + m.chu + '</span></button>';
  }).join('');
  MUC_QL.forEach(function (m) {
    if (!m.mo) return;
    IC[m.ma] = m.ic; TEN[m.ma] = m.chu.toUpperCase();
    GIOI_THIEU[m.ma] = { chu: m.mo, ds: [] };
  });
  cot.addEventListener('click', function (e) {
    var b = e.target.closest('.nwb-ql-muc');
    if (!b) return;
    var ma = b.getAttribute('data-muc');
    if (ma === 'baiTap') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    moSap(ma);
  });
})();
