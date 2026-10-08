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
    tinNhan: P('<path d="M8.2 3h7.6c3.8 0 5.4 1.6 5.4 5.4v3.4c0 3.8-1.6 5.4-5.4 5.4h-2.1l-4.9 3.4c-.7.5-1.6-.1-1.4-.9l.2-.9c.2-.8-.3-1.6-1.1-1.6h-.3c-2.8 0-3.4-1.6-3.4-5.4V8.4C2.8 4.6 4.4 3 8.2 3z"/><path d="M7.7 8.1h4.9M7.7 12.1h8.6"/>'),   // 29/09 thầy: bong bóng vuông bo tròn + 2 vạch (mẫu 6.png)
    bangTin: P('<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M10.55 2.75Q12 1.6 13.45 2.75L20.6 8.45Q21.5 9.15 21.5 10.3V19.3Q21.5 21.5 19.3 21.5H4.7Q2.5 21.5 2.5 19.3V10.3Q2.5 9.15 3.4 8.45ZM9.4 20.3V14.5Q9.4 13 10.9 13H13.1Q14.6 13 14.6 14.5V20.3Z"/>'),   // 29/09 thầy: ngôi nhà ĐẶC (home.png)
    baiDang: P('<path d="M3 10.8 12 3.5l9 7.3"/><path d="M5.5 9.3V20.5h13V9.3"/><path d="M10 20.5v-5.5h4v5.5"/>'),
    shop: P('<rect x="3.5" y="7.6" width="17" height="4.4" rx="1.2"/><path d="M5 12v7.4a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V12"/><path d="M12 7.6v13.3"/><path d="M12 7.6C10.8 4.7 8.7 2.9 7 3.4c-1.6.5-1.2 3.1 1 3.8 1.2.4 2.6.4 4 .4zM12 7.6c1.2-2.9 3.3-4.7 5-4.2 1.6.5 1.2 3.1-1 3.8-1.2.4-2.6.4-4 .4z"/>'),   // 29/09 thầy: hộp quà, căn đúng tâm như các icon khác
    chuong: P('<path d="M6.2 8.5a5.8 5.8 0 0 1 11.6 0c0 6.5 2.7 8.3 2.7 8.3H3.5s2.7-1.8 2.7-8.3"/><path d="M10.4 20.5a1.8 1.8 0 0 0 3.2 0"/>'),
    timKiem: P('<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.6-4.6"/>'),
    caNhan: P('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
    menu3: P('<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>')
  };
  var TABS = [
    { ma: 'baiTap', chu: 'TRANG BÀI TẬP' },
    // 02/10/2026 thầy chốt thứ tự MỌI trang: Quản lý/Bài tập - Tin nhắn - Thông báo - Bảng tin - Khám phá - Quà tặng - Tìm kiếm
    { ma: 'tinNhan', chu: 'TIN NHẮN' },
    { ma: 'chuong', chu: 'THÔNG BÁO' },
    { ma: 'bangTin', chu: 'BẢNG TIN' },
    { ma: 'khamPha', chu: 'KHÁM PHÁ' },
    { ma: 'shop', chu: 'SHOP ĐỔI QUÀ' },   // 29/09 thầy chốt: trước Tìm kiếm
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
    '</div><p class="nwb-dem-ngay">00:00 · Chủ Nhật, 01/11/2026</p></div>' +
    '<button type="button" class="nwb-sap-nut">EM SẼ CHỜ!</button></div>';
  document.body.appendChild(sap);

  // ⭐ thầy 24/09: mỗi tính năng có lời giới thiệu ngắn, kích thích tò mò + đếm ngược tới 00:00 01/11/2026 (giờ VN; 30/09 thầy dời từ 01/10).
  var GIOI_THIEU = {
    khamPha: { chu: 'Cả thế giới thú vị cùng Andrew Classes', ds: ['Trò chơi & giải đấu online — thi tài với bạn khắp các lớp', 'Khám phá những khóa học bổ ích', 'Xem những gì nổi bật và thịnh hành'] },
    tinNhan: { chu: 'Trò chuyện và chia sẻ những điều thú vị', ds: ['Chat riêng với bạn, chat nhóm cùng cả lớp'] },
    bangTin: { chu: 'Thế giới ngoài kia có gì?', ds: ['Đăng ảnh, chia sẻ thành tích, kể chuyện lớp mình', 'Bình luận với những bài đăng thú vị'] },
    chuong: { chu: 'Không bỏ lỡ bất cứ điều gì', ds: ['Ai vừa thả tim, bình luận bài của em', 'Lời mời kết bạn từ các lớp khác', 'Tin quan trọng từ thầy Andrew'] },
    shop: { chu: 'Đổi sao lấy những món quà em thích', ds: ['Đồ dùng học tập, đồ sáng tạo, đồ chơi xinh xắn', 'Chọn quà vào giỏ, gửi yêu cầu cho thầy', 'Theo dõi đơn đổi quà của em'] },
    timKiem: { chu: 'Tìm mọi người, mọi bài viết chỉ trong một chạm', ds: ['Tìm bạn cũ, bạn mới ở mọi lớp', 'Tìm lại bài đăng, nhóm chat', 'Kết bạn để mở rộng vòng bạn bè'] },
    caNhan: { chu: 'Thế giới của riêng em', ds: ['Ảnh bìa, ảnh đại diện, lời giới thiệu', 'Sở thích và bài viết của riêng em', 'Ghi lại những kỷ niệm, chia sẻ hành trình của riêng em'] },
    dangKy: { chu: 'Học sinh mới đăng ký học ngay trên web', ds: ['Đăng ký kiểm tra đầu vào', 'Đăng ký học thử', 'Thầy liên hệ lại sớm nhất'] }
  };
  var MOC_RA_MAT = Date.parse('2026-11-01T00:00:00+07:00');
  var nhipDem = null;
  function hai(n) { return (n < 10 ? '0' : '') + n; }
  function veDem() {
    var con = Math.max(0, MOC_RA_MAT - (window.gioChuan ? window.gioChuan() : Date.now())), s = Math.floor(con / 1000);
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
    if (!nhipDem && MOC_RA_MAT > (window.gioChuan ? window.gioChuan() : Date.now())) nhipDem = setInterval(veDem, 1000);
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
  var nutQuen = $('#btnQuenMk');   // v1.158.0 (27/09): quên mật khẩu → liên hệ thầy (đặt lại: myNetwork/tools/tao-tai-khoan.mjs --reset)
  if (nutQuen) nutQuen.onclick = function () { lh.classList.add('mo'); };

  var dau = $('.top.nwb');
  if (!dau) return;              // màn đăng nhập: không có thanh
  // ⭐ thầy 24/09: dashboard (data-vai="thay") theo thiết kế QUẢN LÝ myNetwork 22/09 — tab đầu = QUẢN LÝ + cột trái danh mục
  var laThay = dau.getAttribute('data-vai') === 'thay';
  document.body.classList.add('co-nwb');
  if (laThay) document.body.classList.add('nwb-thay');
  IC.quanLy = P('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="14" width="8" height="7" rx="2"/>');
  TEN.quanLy = 'QUẢN LÝ';
  var tabs = TABS.map(function (t) { return laThay && t.ma === 'baiTap' ? { ma: 'quanLy', chu: 'QUẢN LÝ' } : t; });

  // ⭐ 29/09/2026 — trang THỬ (window.AC_THU, config.js): 5 icon + avatar mở các trang myNetwork trong nw/ (đăng nhập Firebase dùng
  // chung). Chuông không có trang riêng ⇒ Bảng tin kèm hộp thông báo. Trang THẬT: TRANG_NW rỗng ⇒ hộp "sắp ra mắt" như cũ.
  // 29/09: tab đăng nhập thay em mà vé CHƯA về (dải đỏ còn "Đang đăng nhập thay em…") ⇒ đợi, không sang nw/ bằng phiên thầy.
  function choThayVao() {
    var tv = window.__thayVao;
    if (!tv && /[?&]nhu=/.test(location.search)) {
      alert('Trang này mở kiểu "xem như em" cũ (không có phiên của em) nên chưa xem được mạng xã hội của em — mở lại bằng nút "Xem như em" trong hồ sơ em trên dashboard nhé.');
      return true;
    }
    if (!tv || tv.co()) return false;
    alert('Đang đăng nhập thay em — chờ dải đỏ trên cùng báo "Thầy đang ĐĂNG NHẬP THAY…" rồi bấm lại nhé.');
    return true;
  }
  // ⭐ 02/10/2026 thầy CHÍNH THỨC MỞ tab TIN NHẮN trên trang thật (nhóm lớp = chat lớp + Thầy Andrew). Các tab khác vẫn "sắp ra mắt".
  var TRANG_NW = window.AC_THU ? { khamPha: 'nw/khampha.html', tinNhan: 'nw/tinnhan.html', bangTin: 'nw/bangtin.html',
    chuong: 'nw/bangtin.html?tb=1', shop: 'nw/shop.html', timKiem: 'nw/timkiem.html', caNhan: 'nw/canhan.html' } : { tinNhan: 'nw/tinnhan.html', chuong: 'nw/tinnhan.html?tb=1' };   // v1.224.0 — thật: chuông = hộp thông báo ở trang Tin nhắn
  $('.nwb-tabs', dau).innerHTML = tabs.map(function (t, i) {
    var dauTien = i === 0;
    return '<a class="nwb-tab' + (dauTien ? ' chon' : '') + '" data-ma="' + t.ma + '" data-nh="' + t.chu + '" href="' +
      (dauTien ? location.pathname.split('/').pop() : (TRANG_NW[t.ma] || '#')) + '" title="' + t.chu + '" aria-label="' + t.chu + '">' + IC[t.ma] + '</a>';
  }).join('');
  var nutMenu = $('.nwb-menu', dau);
  nutMenu.innerHTML = IC.menu3;

  // ⭐ thiết kế ĐT 7 (02/10, thầy chốt) — SỐ trên icon tab (tin nhắn mới, thông báo): nút tròn đỏ ở GÓC PHẢI TRÊN của icon.
  // window.NWB.datSo('tinNhan', 3) · 0/rỗng = ẩn · >99 = "99+". Bàn thử máy (localhost + ?somau=1): số mẫu 3 / 12 để thầy duyệt hình.
  function datSo(ma, n) {
    var t = dau.querySelector('.nwb-tab[data-ma="' + ma + '"]');
    if (!t) return;
    var o = t.querySelector('.nwb-so');
    n = Number(n) || 0;
    if (n <= 0) { if (o) o.remove(); return; }
    if (!o) { o = document.createElement('span'); o.className = 'nwb-so'; t.appendChild(o); }
    o.textContent = n > 99 ? '99+' : String(n);
    o.classList.toggle('dai', n > 9);
  }
  window.NWB = { datSo: datSo };
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]somau=1/.test(location.search)) { datSo('tinNhan', 3); datSo('chuong', 12); }

  dau.addEventListener('click', function (e) {
    var t = e.target.closest('.nwb-tab');
    if (!t) return;
    e.preventDefault();
    var ma = t.getAttribute('data-ma');
    // ⭐ v1.280.0 (08/10/2026) — KHUNG TIN NHẮN GIỮ SỐNG (js/tn-khung.js): trang Tin nhắn đã nạp sẵn trong khung ẩn ⇒ mở/đóng tức thì.
    var KH = window.TnKhung && TnKhung.coThe() ? TnKhung : null;
    // ⭐ 03/10/2026 — icon CHUÔNG mở HỘP THÔNG BÁO ngay tại trang (thầy: trước đây bấm chuông nhảy sang trang Tin nhắn rồi hiện cả 2 hộp)
    if (ma === 'chuong' && window.TnPop && TnPop.coTB && TnPop.coTB()) {
      if (choThayVao()) return;
      TnPop.moTB(t, { laThay: laThay, dieu: function (link) {
        if (/^tinnhan\.html/.test(link) && KH) { KH.mo(link.split('?')[1] || ''); return; }   // v1.280.0 — mở đúng phòng trong khung
        if (window.AC_THU || /^tinnhan\.html/.test(link)) { location.href = 'nw/' + link; return; }
        moSap('chuong');   // trang thật: các trang myNetwork khác chưa mở ⇒ hộp "sắp ra mắt"
      } });
      return;
    }
    // ⭐ 03/10/2026 thiết kế — icon TIN NHẮN mở HỘP THẢ XUỐNG kiểu Facebook (js/tn-pop.js); "Xem tất cả trong Tin nhắn" mới sang trang.
    //   v1.280.0: "Xem tất cả" (và dòng chat ở điện thoại khi không chat được trong hộp) mở KHUNG thay vì sang trang. Khung đang mở ⇒ đứng yên.
    if (ma === 'tinNhan' && KH && KH.dangMo()) return;
    if (ma === 'tinNhan' && TRANG_NW.tinNhan && window.TnPop && TnPop.coThe()) {
      if (choThayVao()) return;
      TnPop.mo(t, { trang: TRANG_NW.tinNhan, phong: function (id) { return TRANG_NW.tinNhan + '?phong=' + encodeURIComponent(id); },
        moTrang: KH ? function (q) { return KH.mo(q); } : null });
      return;
    }
    if (ma === 'baiTap' || ma === 'quanLy') {
      if (KH && KH.dangMo()) { KH.an(); return; }   // v1.280.0 — từ Tin nhắn về: trang còn nguyên chỗ đang cuộn
      window.scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    if (ma === 'tinNhan' && KH && !choThayVao()) { KH.mo(''); return; }
    if (TRANG_NW[ma]) { if (!choThayVao()) location.href = TRANG_NW[ma]; return; }
    moSap(ma);
  });

  // Avatar = TRANG CÁ NHÂN (trang thử: nw/canhan.html; trang thật: chưa mở). Gán đè onclick cũ của trang (mở sidebar).
  var av = $('#nutMenu') || $('#nwbAv');
  if (av) { av.title = 'Trang cá nhân'; av.onclick = function () { if (TRANG_NW.caNhan) { if (!choThayVao()) location.href = TRANG_NW.caNhan; } else moSap('caNhan'); }; }

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
    tuCam: P2('<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>')
  };
  // ⭐ v1.166.0 (28/09/2026, mẫu v4 thầy chốt — myLesson-app "KE HOACH QUAN LY HOC SINH.md" Đợt A):
  // bỏ dòng "Thầy Andrew" (đã có avatar trên thanh) · nhóm "Bài tập" → "QUẢN LÝ" (thêm 4 mục dời từ menu ☰) ·
  // Network bỏ "Tài khoản" + "Lớp" (gộp vào hộp Quản lý & bảo mật), thêm "Sinh nhật" ·
  // Khẩn cấp + Mật khẩu HS gộp vào MỘT dòng "Quản lý & bảo mật" KHÔNG tiêu đề ở dưới cùng (dashboard window.qlMoBaoMat).
  ICQ.top = P2('<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>');
  ICQ.qua = P2('<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13"/><path d="M12 8c-2-4-6-4-6-1.5S9 8 12 8c3 0 6 .5 6-1.5S14 4 12 8z"/>');
  ICQ.kho = P2('<path d="M3 7l1.5-3h15L21 7"/><rect x="3" y="7" width="18" height="13" rx="1.5"/><path d="M9.5 11.5h5"/>');
  ICQ.khoChat = P2('<path d="M12 3a8 8 0 0 0-6.9 12L4 20l5-1.1A8 8 0 1 0 12 3z"/><path d="M9 10h6M9 13h4"/>');
  ICQ.sinhNhat = P2('<path d="M4 20v-6.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2V20"/><path d="M4 20h16"/><path d="M4 15.5c1.4 1 2.6 1 4 0s2.6-1 4 0 2.6 1 4 0 2.6-1 4 0"/><path d="M9 11.5V8M12 11.5V6M15 11.5V8"/>');
  ICQ.baiCheck = P2('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 14l2 2 4-4"/>');
  ICQ.baoMat = P2('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>');
  // ⭐ v1.203.1 — icon MÀU ĐẶC kiểu Facebook nay ở FILE CHUNG js/ic-ql.js (window.AC_ICQL) — dùng chung với nw/quanly.html.
  // Chưa nạp được file đó ⇒ rơi về icon nét cũ (`ic`).
  var ICM = window.AC_ICQL || {};
  var MUC_QL = [
    // 29/09 thầy: bỏ chữ "Quản lý" / "Network" — chỉ còn vạch ngăn giữa 2 nhóm
    { ma: 'baiTap', chu: 'Trang bài tập', ic: IC.baiTap, icm: ICM.baiTap },
    { ma: 'hoatDong', chu: 'Hoạt động', ic: P('<path d="M3 12h4l3-8 4 16 3-8h4"/>'), icm: ICM.hoatDong },   // thiết kế ĐT 7 — Đang hoạt động + Bài tập gần đây (window.qlMoHoatDong)
    { ma: 'dangKy', chu: 'Đăng ký', ic: IC.dangKy, icm: ICM.dangKy },   // v1.152.0 — hộp đăng ký ở dashboard (window.qlMoDangKy)
    { ma: 'top', chu: 'Xếp hạng lớp', ic: ICQ.top, icm: ICM.top },          // v1.166.0 — dời từ menu ☰ (window.qlMoMuc)
    { ma: 'qua', chu: 'Quà tặng', ic: ICQ.qua, icm: ICM.qua },
    { ma: 'khoBai', chu: 'Kho bài', ic: ICQ.kho, icm: ICM.khoBai },   // v1.203.0 — thay "Bài đã xoá": pop-up lớn mọi lớp (window.qlMoKhoLon)
    { ma: 'baiCheck', chu: 'Bài check', ic: ICQ.baiCheck },   // v1.205.0 — bài check AWord theo bộ đề (window.qlMoBaiCheck)
    { ma: 'kholuutru', chu: 'Kho trò chuyện', ic: ICQ.khoChat, icm: ICM.kholuutru },
    { ma: 'guiTb', chu: 'Gửi thông báo', ic: IC.chuong },   // v1.255.0 — đẩy thông báo tới máy HS (js/day.js ACDay.moGuiThay)
    { ma: 'nhacHan', chu: 'Nhắc hạn bài', ic: P('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M5 4.5 2.5 7M19 4.5 21.5 7"/>') },   // v1.257.0 — tự nhắc hạn (ACDay.moNhacHan)
    { vach: true },
    { ma: 'nhom', chu: 'Nhóm chat', ic: ICQ.nhom, icm: ICM.nhom, mo: 'Lập và quản lý nhóm chat các lớp' },
    { ma: 'baiDang', chu: 'Bài đăng', ic: IC.baiDang, icm: ICM.baiDang, mo: 'Xem, ẩn, xoá bài đăng của học sinh' },
    { ma: 'noiBat', chu: 'Nổi bật', ic: ICQ.sao, icm: ICM.noiBat, mo: 'Ghim và sắp xếp bài nổi bật' },
    { ma: 'suKien', chu: 'Sự kiện & Khám phá', ic: ICQ.suKien, icm: ICM.suKien, mo: 'Đăng trò chơi, giải đấu, khoá học, thông báo' },
    { ma: 'sinhNhat', chu: 'Sinh nhật', ic: ICQ.sinhNhat, icm: ICM.sinhNhat },  // v1.166.0 — window.qlMoSinhNhat
    { ma: 'baoCao', chu: 'Báo cáo', ic: ICQ.baoCao, icm: ICM.baoCao, mo: 'Xử lý báo cáo vi phạm từ học sinh' },
    { ma: 'daAn', chu: 'Bài đã ẩn', ic: ICQ.an, icm: ICM.daAn, mo: 'Xem lại và khôi phục bài đã ẩn' },
    { ma: 'tuCam', chu: 'Từ cấm', ic: ICQ.tuCam, icm: ICM.tuCam, mo: 'Thêm bớt từ cấm cho cả mạng' },
    { vach: true },
    { ma: 'baoMat', chu: 'Quản lý & bảo mật', ic: ICQ.baoMat, icm: ICM.baoMat }   // v1.166.0 — hộp 5 mục (window.qlMoBaoMat)
  ];
  cot.innerHTML = MUC_QL.map(function (m) {
    if (!m.ma) return (m.vach ? '<hr class="nwb-ql-vach">' : '') + (m.nhom ? '<div class="nwb-ql-nhom">' + m.nhom + '</div>' : '');
    var hinh = m.anh ? '<img class="nwb-ql-av" src="' + m.anh + '" alt="">' : (m.icm ? '<span class="nwb-ql-ic">' + m.icm() + '</span>' : m.ic);
    return '<button type="button" class="nwb-ql-muc' + (m.ma === 'baiTap' ? ' chon' : '') + '" data-muc="' + m.ma + '">' + hinh + '<span>' + m.chu + '</span></button>';
  }).join('');
  var m_NW = {};   // mục Network (có `mo`) — trang thử mở nw/quanly.html
  MUC_QL.forEach(function (m) {
    if (!m.mo) return;
    m_NW[m.ma] = true;
    IC[m.ma] = m.ic; TEN[m.ma] = m.chu.toUpperCase();
    GIOI_THIEU[m.ma] = { chu: m.mo, ds: [] };
  });
  cot.addEventListener('click', function (e) {
    var b = e.target.closest('.nwb-ql-muc');
    if (!b) return;
    var ma = b.getAttribute('data-muc');
    if (ma === 'baiTap') { if (window.TnKhung && TnKhung.dangMo()) { TnKhung.an(); return; } window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (ma === 'hoatDong') { if (window.qlMoHoatDong) window.qlMoHoatDong(); return; }
    if (ma === 'dangKy' && window.qlMoDangKy) { window.qlMoDangKy(); return; }
    if (ma === 'baoMat') { if (window.qlMoBaoMat) window.qlMoBaoMat(); return; }
    if (ma === 'sinhNhat') { if (window.qlMoSinhNhat) window.qlMoSinhNhat(); return; }
    if (ma === 'khoBai') { if (window.qlMoKhoLon) window.qlMoKhoLon(); return; }
    if (ma === 'baiCheck') { if (window.qlMoBaiCheck) window.qlMoBaiCheck(); return; }
    if (ma === 'guiTb') { if (window.ACDay) ACDay.moGuiThay(); return; }
    if (ma === 'nhacHan') { if (window.ACDay) ACDay.moNhacHan(); return; }
    if (ma === 'top' || ma === 'qua' || ma === 'kholuutru') { if (window.qlMoMuc) window.qlMoMuc(ma); return; }
    // Trang thử: mục Network ⇒ trang quản lý myNetwork (nw/quanly.html?muc=…, cùng mã mục)
    if (window.AC_THU && m_NW[ma]) { location.href = 'nw/quanly.html?muc=' + ma; return; }
    moSap(ma);
  });
})();
