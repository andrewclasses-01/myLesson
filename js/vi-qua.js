/* ============================================================
   vi-qua.js — VÍ SAO + ĐĂNG KÝ ĐỔI QUÀ (web v1.38.0 · 02/09/2026)

   Thầy chốt 02/09/2026 (đợt "sidebar học sinh"):
     · Ô SAO ở đầu sidebar nay BẤM ĐƯỢC: bấm chỗ nào trong ô cũng được, danh
       sách menu TRƯỢT SANG trang con "VÍ SAO" gồm hai mục THÔNG TIN VÍ và
       ĐĂNG KÝ ĐỔI QUÀ (hai dòng cũ dưới danh sách đã bỏ).
     · Thứ tự menu chính: Thông tin của tôi · Công cụ (bấm là XỔ RA bốn công
       cụ con ngay bên dưới) · Thư viện kỷ niệm · Liên hệ với Thầy Andrew ·
       Đăng xuất.
     · Hai pop-up lớn ở giữa màn: VÍ SAO (tổng sao · lịch sử · tặng sao ·
       bảng sao của lớp) và ĐỔI QUÀ (3 nhóm quà · giá sao · thuế · đơn của em).
     · Học sinh XEM ĐƯỢC bản mẫu, nhưng mỗi pop-up có DẢI ĐỎ nói rõ đây là dữ
       liệu mẫu — thầy chốt như vậy để không em nào hiểu lầm là sao thật.

   ⛔ File này DÙNG CHUNG cho cả ba trang học sinh (lop.html · bai.html ·
      bai-sp.html). Trước v1.38.0 mỗi trang chép một bản danh sách menu riêng
      nên ba trang trôi lệch nhau (bai.html đã bỏ "Thông tin ví" từ đợt 6 mà
      lop.html thì chưa). Sửa menu/pop-up là sửa Ở ĐÂY, một chỗ.

   💸 Bộ quà đọc từ Firestore `quaTang/catalog` — CẢ BỘ nằm trong MỘT tài liệu
      nên mở pop-up chỉ tốn ĐÚNG 1 lượt đọc (LUẬT 8: Firestore tính tiền theo
      SỐ TÀI LIỆU). Chưa có tài liệu đó thì rơi về bộ mẫu `MAU_QUA` bên dưới.

   ⛔ Viết kiểu ES5 (var, function) — giống mọi file khác của web, vì máy học
      sinh có cả iPad đời cũ.
   ============================================================ */
(function () {
  'use strict';

  var A = window.AWC;
  // Giữ ĐÚNG câu mà ba trang vẫn dùng, để học sinh nghe một giọng duy nhất.
  var CHUA_XONG = 'Thầy Andrew đang xây dựng tính năng này, em hãy chờ thêm nhé!';
  var CANH_BAO = 'Đây là dữ liệu mẫu — tính năng đang trong quá trình xây dựng.';
  var esc = function (s) { return A.chuAnToan(s); };

  // Chèn bảng màu/kiểu dáng của riêng khối này. Ba trang không phải khai gì —
  // đổi số phiên bản ở đây khi sửa css/vi-qua.css (GitHub Pages nhớ ~10 phút).
  (function gaCss() {
    if (document.getElementById('vq-css')) return;
    var l = document.createElement('link');
    l.id = 'vq-css';
    l.rel = 'stylesheet';
    l.href = 'css/vi-qua.css?v=1';
    document.head.appendChild(l);
  })();

  // ---------- ICON (nét, cùng lối với sidebar sẵn có) ----------
  var IC = {
    toi: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/></svg>',
    congCu: '<svg viewBox="0 0 24 24"><path d="M14.5 6.5a4.8 4.8 0 0 0-6.4 6L3 17.6 6.4 21l5.1-5.1a4.8 4.8 0 0 0 6-6.4l-3 3-2.5-2.5z"/></svg>',
    anh: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 15.5 15.5 11l-7 8"/></svg>',
    dienThoai: '<svg viewBox="0 0 24 24"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h2L10 8l-1.8 1.8a13 13 0 0 0 6 6L16 14l4 1.5v2A2.5 2.5 0 0 1 17.5 20 13.5 13.5 0 0 1 4 6.5z"/></svg>',
    ra: '<svg viewBox="0 0 24 24"><path d="M15 4.5h3.5A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5H15M10 8l-4 4 4 4M6 12h10"/></svg>',
    vi: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.9z"/></svg>',
    qua: '<svg viewBox="0 0 24 24"><rect x="3.5" y="8" width="17" height="4.5"/><path d="M5 12.5h14V21H5zM12 8v13M12 8s-1-4.5-4-4.5S5.5 8 8.5 8M12 8s1-4.5 4-4.5S18.5 8 15.5 8"/></svg>',
    mayTinh: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h1.5M11.5 12H13M14.5 12H16M8.5 15.5h1.5M11.5 15.5H13M14.5 15.5H16"/></svg>',
    lich: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3.5v3M16 3.5v3"/></svg>',
    viec: '<svg viewBox="0 0 24 24"><path d="M9 5.5h10M9 12h10M9 18.5h10"/><path d="M4 5.5l1.3 1.3L7.5 4M4 12l1.3 1.3L7.5 10.5M4 18.5l1.3 1.3 2.2-2.8"/></svg>',
    tuDien: '<svg viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M8 4v16M11 9h5M11 13h4"/></svg>',
    quay: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    mui: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    dong: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    canh: '<svg viewBox="0 0 24 24"><path d="M12 3.5 21 19H3z"/><path d="M12 10v4M12 16.5v.01"/></svg>',
    saoDac: '<svg viewBox="0 0 24 24"><path d="M12 2.5l3 6.2 6.8.9-4.9 4.8 1.2 6.7L12 17.9l-6.1 3.2 1.2-6.7L2.2 9.6l6.8-.9z"/></svg>'
  };

  /* ============================================================
     BỘ DỮ LIỆU MẪU — sẽ thay bằng kho thật ở đợt sau.
     ⛔ Đừng bỏ dải cảnh báo đỏ khi còn dùng mấy con số này: học sinh đọc số
        sao là tin ngay (cùng lời nhắc đã ghi ở ô sao trong sidebar).
     ============================================================ */
  var MAU_VI = {
    dangCo: 148,
    daKiem: 265,
    daTieu: 117,
    lichSu: [
      { ngay: '01/09/2026', viec: 'Làm đủ 3 act của bài VOCABULARY', ai: 'Tự động', so: 15 },
      { ngay: '31/08/2026', viec: 'Xung phong phát biểu trong giờ', ai: 'Thầy Andrew', so: 10 },
      { ngay: '30/08/2026', viec: 'Đổi quà: Bút bi 4 màu', ai: 'Kho quà', so: -40 },
      { ngay: '29/08/2026', viec: 'Nộp bài speaking đúng hạn', ai: 'Tự động', so: 20 },
      { ngay: '28/08/2026', viec: 'Đi học đúng giờ cả tuần', ai: 'Thầy Andrew', so: 12 },
      { ngay: '27/08/2026', viec: 'Tặng sao cho bạn NHÃ PHƯƠNG', ai: 'Ví của em', so: -5 },
      { ngay: '26/08/2026', viec: 'Đạt 100% bài WORD PRACTICE 2', ai: 'Tự động', so: 15 },
      { ngay: '25/08/2026', viec: 'Giúp bạn trực nhật lớp', ai: 'Thầy Andrew', so: 8 },
      { ngay: '24/08/2026', viec: 'Đổi quà: Set bút màu 12 cây', ai: 'Kho quà', so: -72 },
      { ngay: '23/08/2026', viec: 'Bạn BÌNH MINH tặng sao', ai: 'BÌNH MINH', so: 5 },
      { ngay: '22/08/2026', viec: 'Hoàn thành bài tập về nhà', ai: 'Tự động', so: 15 },
      { ngay: '21/08/2026', viec: 'Quên làm bài tập', ai: 'Thầy Andrew', so: -10 }
    ],
    don: [
      { ngay: '30/08/2026', ten: 'Bút bi 4 màu', gia: 40, tt: 'xong' },
      { ngay: '24/08/2026', ten: 'Set bút màu 12 cây', gia: 72, tt: 'xong' },
      { ngay: '01/09/2026', ten: 'Mô hình lắp ráp mini', gia: 120, tt: 'cho' }
    ]
  };

  // Bộ quà mẫu — ĐÚNG KHUÔN mà trang "Quản lý quà" bên dashboard sẽ ghi vào
  // Firestore `quaTang/catalog`, để đợt sau chỉ việc đổ dữ liệu thật vào.
  var MAU_QUA = {
    thue: 5,                 // % phí đổi quà, thầy chỉnh ở dashboard
    nhom: [
      {
        ma: 'hoctap', ten: 'ĐỒ DÙNG HỌC TẬP', mon: [
          { ten: 'Bút bi 4 màu', gia: 40, con: 12, icon: '🖊️' },
          { ten: 'Set bút màu 12 cây', gia: 72, con: 6, icon: '🖍️' },
          { ten: 'Vở kẻ ngang 120 trang', gia: 30, con: 20, icon: '📒' },
          { ten: 'Hộp bút vải', gia: 95, con: 4, icon: '🎒' },
          { ten: 'Bộ thước kẻ 4 món', gia: 45, con: 9, icon: '📐' },
          { ten: 'Từ điển tranh mini', gia: 150, con: 2, icon: '📘' }
        ]
      },
      {
        ma: 'sangtao', ten: 'ĐỒ DÙNG SÁNG TẠO', mon: [
          { ten: 'Đất nặn 8 màu', gia: 85, con: 7, icon: '🧱' },
          { ten: 'Giấy origami 100 tờ', gia: 55, con: 10, icon: '🦢' },
          { ten: 'Bộ sticker trang trí', gia: 35, con: 15, icon: '✨' },
          { ten: 'Màu nước 12 ô + cọ', gia: 130, con: 3, icon: '🎨' },
          { ten: 'Sổ tay vẽ bìa cứng', gia: 110, con: 5, icon: '📓' }
        ]
      },
      {
        ma: 'dochoi', ten: 'ĐỒ CHƠI', mon: [
          { ten: 'Rubik 3x3', gia: 90, con: 6, icon: '🧩' },
          { ten: 'Mô hình lắp ráp mini', gia: 120, con: 4, icon: '🚀' },
          { ten: 'Bộ cờ cá ngựa', gia: 100, con: 3, icon: '🎲' },
          { ten: 'Thú bông nhỏ', gia: 160, con: 2, icon: '🧸' },
          { ten: 'Bóng nảy phát sáng', gia: 25, con: 0, icon: '🏀' }
        ]
      }
    ]
  };

  // Số sao mẫu của cả lớp: KHÔNG random — cùng một em mở hai lần phải thấy
  // cùng con số, kẻo tưởng ví nhảy lung tung.
  function saoMau(ten, i) {
    var t = 0, s = String(ten || '');
    for (var k = 0; k < s.length; k++) t += s.charCodeAt(k);
    return 60 + ((t + i * 17) % 160);
  }

  /* ============================================================
     KHO QUÀ THẬT (Firestore `quaTang/catalog`) — đọc 1 tài liệu, nhớ trong
     phiên. ⛔ Dùng CHUNG cửa Firebase của js/chat.js (`AWChat.kho`): ba nơi
     cùng gọi `getFirestore()` trên một app là dính `failed-precondition`.
     ============================================================ */
  var KHO_QUA = null;
  function docKhoQua() {
    if (KHO_QUA) return KHO_QUA;
    if (!window.AWChat || !AWChat.kho) return (KHO_QUA = Promise.resolve(MAU_QUA));
    KHO_QUA = AWChat.kho().then(function (f) {
      return f.fs.getDoc(f.fs.doc(f.db, 'quaTang', 'catalog'));
    }).then(function (d) {
      var o = d && d.exists() ? d.data() : null;
      if (!o || !o.nhom || !o.nhom.length) return MAU_QUA;   // thầy chưa dựng kho
      return o;
    })['catch'](function () { return MAU_QUA; });             // kho hỏng: vẫn có bản mẫu
    return KHO_QUA;
  }

  /* ============================================================
     KHUNG POP-UP CHUNG
     ============================================================ */
  function dungKhung(id) {
    var cu = document.getElementById(id);
    if (cu) return cu;
    var nen = document.createElement('div');
    nen.className = 'vq-nen';
    nen.id = id;
    nen.innerHTML =
      '<div class="vq-hop" role="dialog" aria-modal="true">' +
        '<div class="vq-dau">' +
          '<span class="vq-ic"></span>' +
          '<div><h3></h3><p></p></div>' +
          '<button class="vq-x" type="button" title="Đóng" aria-label="Đóng">' + IC.dong + '</button>' +
        '</div>' +
        '<div class="vq-canh">' + IC.canh + '<span>' + esc(CANH_BAO) + '</span></div>' +
        '<div class="vq-than"></div>' +
      '</div>';
    document.body.appendChild(nen);
    nen.querySelector('.vq-x').onclick = function () { dong(nen); };
    nen.addEventListener('click', function (e) { if (e.target === nen) dong(nen); });
    return nen;
  }
  function mo(nen) {
    nen.classList.add('mo');
    document.body.style.overflow = 'hidden';
  }
  function dong(nen) {
    nen.classList.remove('mo');
    // Còn pop-up nào đang mở thì GIỮ khoá cuộn — hộp xác nhận đổi quà nằm
    // chồng lên pop-up quà, đóng cái trên không được thả trang bên dưới.
    if (!document.querySelector('.vq-nen.mo')) document.body.style.overflow = '';
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var ds = document.querySelectorAll('.vq-nen.mo');
    if (ds.length) dong(ds[ds.length - 1]);
  });
  function datDau(nen, icon, tieu, phu) {
    nen.querySelector('.vq-ic').innerHTML = icon;
    nen.querySelector('.vq-dau h3').textContent = tieu;
    nen.querySelector('.vq-dau p').textContent = phu;
  }

  function avNho(ctx, ten) {
    var tu = String(ten || '').trim().split(/\s+/);
    var chu = tu.slice(-2).map(function (t) { return t.charAt(0); }).join('').toUpperCase();
    return '<span class="vq-av">' + esc(chu) +
      '<img src="' + esc(A.avUrl(ctx.lop, ten)) + '" alt="" onerror="this.remove()"></span>';
  }
  function soCoDau(n) { return (n > 0 ? '+' : '') + n; }

  /* ============================================================
     POP-UP 1 — THÔNG TIN VÍ
     ============================================================ */
  function moVi(ctx) {
    var nen = dungKhung('vqVi');
    datDau(nen, IC.saoDac, 'THÔNG TIN VÍ', ctx.ten + ' · Lớp ' + ctx.lop);
    var than = nen.querySelector('.vq-than');

    var hang = 1, ds = (ctx.caLop || []).slice();
    var bang = ds.map(function (t, i) { return { ten: t, sao: (t === ctx.ten ? MAU_VI.dangCo : saoMau(t, i)) }; });
    bang.sort(function (a, b) { return b.sao - a.sao; });
    for (var i = 0; i < bang.length; i++) if (bang[i].ten === ctx.ten) { hang = i + 1; break; }

    than.innerHTML =
      '<div class="vq-tong">' +
        '<div><div class="vq-lon">' + MAU_VI.dangCo + '</div>' +
          '<div class="vq-nhan">SAO ĐANG CÓ</div></div>' +
        '<div class="vq-3o">' +
          '<div class="vq-o"><b>' + MAU_VI.daKiem + '</b><span>ĐÃ KIẾM</span></div>' +
          '<div class="vq-o"><b>' + MAU_VI.daTieu + '</b><span>ĐÃ TIÊU</span></div>' +
          '<div class="vq-o"><b>#' + hang + '</b><span>HẠNG TRONG LỚP</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="vq-tab">' +
        '<button type="button" data-tab="ls" class="chon">Lịch sử ví</button>' +
        '<button type="button" data-tab="tang">Tặng sao cho bạn</button>' +
        '<button type="button" data-tab="lop">Bảng sao của lớp</button>' +
      '</div>' +
      '<div class="vq-noi"></div>';

    var noi = than.querySelector('.vq-noi');

    function veLichSu() {
      noi.innerHTML = '<div class="vq-the">' + MAU_VI.lichSu.map(function (d) {
        return '<div class="vq-dong">' +
          '<span class="vq-so ' + (d.so >= 0 ? 'cong' : 'tru') + '">' + soCoDau(d.so) + '</span>' +
          '<span class="vq-viec"><b>' + esc(d.viec) + '</b>' +
            '<span>' + esc(d.ngay + ' · ' + d.ai) + '</span></span>' +
          '</div>';
      }).join('') + '</div>';
    }

    function veTang() {
      var ban = (ctx.caLop || []).filter(function (t) { return t !== ctx.ten; });
      noi.innerHTML =
        '<div class="vq-form">' +
          '<div class="vq-hang-o">' +
            '<div><label>TẶNG CHO BẠN</label><select class="vq-ban">' +
              (ban.length ? ban.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('')
                          : '<option>Lớp mình chưa có danh sách bạn</option>') +
            '</select></div>' +
            '<div><label>SỐ SAO</label><input class="vq-sosao" type="number" min="1" max="' +
              MAU_VI.dangCo + '" value="5"></div>' +
          '</div>' +
          '<label>LỜI NHẮN</label>' +
          '<textarea class="vq-nhan-chu" maxlength="200" placeholder="Cảm ơn bạn đã giúp mình hôm nay…"></textarea>' +
          '<button class="vq-nut" type="button">Gửi sao cho bạn</button>' +
          '<p class="vq-trong" style="text-align:left;padding:10px 0 0">Sao tặng đi sẽ trừ vào ví của em ' +
            'và cộng thẳng cho bạn. Thầy vẫn xem được mọi lượt tặng.</p>' +
        '</div>';
      noi.querySelector('.vq-nut').onclick = function () { ctx.baoToast(CHUA_XONG); };
    }

    function veBangLop() {
      noi.innerHTML = '<div class="vq-the">' + (bang.length ? bang.map(function (d, i) {
        return '<div class="vq-dong"' + (d.ten === ctx.ten ? ' style="background:var(--accent-soft)"' : '') + '>' +
          '<span class="vq-hang">' + (i + 1) + '</span>' +
          avNho(ctx, d.ten) +
          '<span class="vq-viec"><b>' + esc(d.ten) + '</b></span>' +
          '<span class="vq-so cong">' + d.sao + ' ★</span>' +
          '</div>';
      }).join('') : '<div class="vq-trong">Chưa có danh sách lớp.</div>') + '</div>';
    }

    var ve = { ls: veLichSu, tang: veTang, lop: veBangLop };
    var nut = than.querySelectorAll('.vq-tab button');
    Array.prototype.forEach.call(nut, function (b) {
      b.onclick = function () {
        Array.prototype.forEach.call(nut, function (x) { x.classList.remove('chon'); });
        b.classList.add('chon');
        ve[b.getAttribute('data-tab')]();
      };
    });
    veLichSu();
    mo(nen);
  }

  /* ============================================================
     POP-UP 2 — ĐĂNG KÝ ĐỔI QUÀ
     ============================================================ */
  function moQua(ctx) {
    var nen = dungKhung('vqQua');
    datDau(nen, IC.qua, 'ĐĂNG KÝ ĐỔI QUÀ', 'Em đang có ' + MAU_VI.dangCo + ' sao');
    var than = nen.querySelector('.vq-than');
    than.innerHTML = '<div class="vq-trong">Đang mở kho quà của thầy…</div>';
    mo(nen);

    docKhoQua().then(function (kho) {
      var nhom = kho.nhom || [];
      var thue = Number(kho.thue) || 0;
      var chon = nhom.length ? nhom[0].ma : '';

      than.innerHTML =
        '<div class="vq-tab">' + nhom.map(function (n) {
          return '<button type="button" data-nhom="' + esc(n.ma) + '"' +
            (n.ma === chon ? ' class="chon"' : '') + '>' + esc(n.ten) + '</button>';
        }).join('') + '</div>' +
        '<div class="vq-luoi"></div>' +
        '<div class="vq-tieu-nho">ĐƠN ĐỔI QUÀ CỦA EM</div>' +
        '<div class="vq-the vq-don"></div>' +
        '<p class="vq-trong" style="text-align:left">Phí đổi quà hiện là <b>' + thue +
          '%</b> — trừ thêm vào số sao của món em chọn.</p>';

      var luoi = than.querySelector('.vq-luoi');

      function veLuoi() {
        var n = null;
        for (var i = 0; i < nhom.length; i++) if (nhom[i].ma === chon) n = nhom[i];
        var mon = (n && n.mon) || [];
        luoi.innerHTML = mon.length ? mon.map(function (m, i) {
          var het = Number(m.con) <= 0;
          return '<div class="vq-mon' + (het ? ' het' : '') + '">' +
            '<div class="vq-anh">' + esc(m.icon || '🎁') + '</div>' +
            '<div class="vq-ten">' + esc(m.ten) + '</div>' +
            '<div class="vq-con">' + (het ? 'Tạm hết quà' : 'Còn ' + m.con + ' phần') + '</div>' +
            '<div class="vq-gia">' + IC.saoDac + esc(String(m.gia)) + ' sao</div>' +
            '<button class="vq-nut" type="button" data-mon="' + i + '"' + (het ? ' disabled' : '') + '>' +
              (het ? 'Hết quà' : 'Đổi quà này') + '</button>' +
            '</div>';
        }).join('') : '<div class="vq-trong">Nhóm này thầy chưa xếp món nào.</div>';

        Array.prototype.forEach.call(luoi.querySelectorAll('button[data-mon]'), function (b) {
          b.onclick = function () { hoiDoi(ctx, mon[Number(b.getAttribute('data-mon'))], thue); };
        });
      }

      var nutNhom = than.querySelectorAll('.vq-tab button');
      Array.prototype.forEach.call(nutNhom, function (b) {
        b.onclick = function () {
          Array.prototype.forEach.call(nutNhom, function (x) { x.classList.remove('chon'); });
          b.classList.add('chon');
          chon = b.getAttribute('data-nhom');
          veLuoi();
        };
      });
      veLuoi();

      than.querySelector('.vq-don').innerHTML = MAU_VI.don.map(function (d) {
        var chu = d.tt === 'xong' ? 'Đã nhận quà' : (d.tt === 'huy' ? 'Đã huỷ' : 'Chờ thầy duyệt');
        return '<div class="vq-dong">' +
          '<span class="vq-viec"><b>' + esc(d.ten) + '</b><span>' + esc(d.ngay) +
            ' · ' + d.gia + ' sao</span></span>' +
          '<span class="vq-trang-thai ' + d.tt + '">' + esc(chu) + '</span>' +
          '</div>';
      }).join('');
    });
  }

  // Hộp xác nhận nhỏ, nằm CHỒNG lên pop-up quà (đóng nó không đóng cái dưới).
  function hoiDoi(ctx, mon, thue) {
    var nen = dungKhung('vqXn');
    nen.querySelector('.vq-hop').classList.add('vq-nho');
    datDau(nen, IC.qua, 'XÁC NHẬN ĐỔI QUÀ', esc(mon.ten));
    var phi = Math.round(Number(mon.gia) * thue / 100);
    var tong = Number(mon.gia) + phi;
    nen.querySelector('.vq-than').innerHTML =
      '<div class="vq-the">' +
        '<div class="vq-dong"><span class="vq-viec"><b>Giá món quà</b></span>' +
          '<span class="vq-so tru">' + mon.gia + ' ★</span></div>' +
        '<div class="vq-dong"><span class="vq-viec"><b>Phí đổi quà (' + thue + '%)</b></span>' +
          '<span class="vq-so tru">' + phi + ' ★</span></div>' +
        '<div class="vq-dong"><span class="vq-viec"><b>Tổng trừ vào ví</b>' +
          '<span>Ví em còn ' + (MAU_VI.dangCo - tong) + ' sao sau khi đổi</span></span>' +
          '<span class="vq-so ' + (MAU_VI.dangCo >= tong ? 'cong' : 'tru') + '">' + tong + ' ★</span></div>' +
      '</div>' +
      '<div style="display:flex; gap:10px; margin-top:14px">' +
        '<button class="vq-nut" type="button" data-ok="1">Đăng ký đổi</button>' +
        '<button class="vq-nut phu" type="button" data-thoi="1">Để sau</button>' +
      '</div>';
    nen.querySelector('[data-ok]').onclick = function () { dong(nen); ctx.baoToast(CHUA_XONG); };
    nen.querySelector('[data-thoi]').onclick = function () { dong(nen); };
    mo(nen);
  }

  /* ============================================================
     SIDEBAR — danh sách menu + trang con VÍ SAO
     `layCtx()` trả về danh tính lúc BẤM chứ không phải lúc dựng menu: ba
     trang dựng sidebar ngay khi nạp, còn tên/lớp thì tới sau khi đọc dữ liệu.
     ============================================================ */
  function nutMenu(m) {
    return '<button type="button"' + (m.khoa ? ' data-khoa="' + esc(m.khoa) + '"' : '') + '>' +
      '<span class="ic">' + m.ic + '</span>' +
      '<span><span class="nh">' + esc(m.nh) + '</span><br>' +
      '<span class="mo-ta">' + esc(m.mo) + '</span></span>' +
      (m.xo ? '<span class="vq-mui">' + IC.mui + '</span>' : '') +
      '</button>';
  }

  function dungMenu(opt) {
    var hop = opt.hop;
    var layCtx = opt.layCtx;
    if (!hop) return;

    var congCuCon = [
      { nh: 'Máy tính', mo: 'Cộng trừ nhân chia nhanh', ic: IC.mayTinh },
      { nh: 'Lịch', mo: 'Lịch học và ngày quan trọng', ic: IC.lich },
      { nh: 'To-do', mo: 'Việc cần làm của em', ic: IC.viec },
      { nh: 'Từ điển', mo: 'Tra nghĩa nhanh khi học', ic: IC.tuDien }
    ];
    var chinh = [
      { nh: 'Thông tin của tôi', mo: 'Tên, lớp, ảnh đại diện', ic: IC.toi },
      { nh: 'Công cụ', mo: 'Máy tính · Lịch · To-do · Từ điển', ic: IC.congCu, xo: true },
      { nh: 'Thư viện kỷ niệm', mo: 'Ảnh và khoảnh khắc của lớp', ic: IC.anh },
      { nh: 'Liên hệ với Thầy Andrew', mo: 'Zalo · 0359.769.765', ic: IC.dienThoai },
      { nh: 'Đăng xuất', mo: 'Đăng xuất ID Andrew Classes', ic: IC.ra, khoa: 'ra' }
    ];
    var mucVi = [
      { nh: 'Thông tin ví', mo: 'Tổng sao · lịch sử · tặng sao', ic: IC.vi, khoa: 'vi' },
      { nh: 'Đăng ký đổi quà', mo: 'Dùng sao đổi quà của Thầy', ic: IC.qua, khoa: 'qua' }
    ];

    hop.classList.add('vq-truot');
    hop.innerHTML =
      '<div class="vq-doi">' +
        '<div class="vq-trang vq-chinh">' +
          nutMenu(chinh[0]) +
          nutMenu(chinh[1]) +
          '<div class="vq-xo">' + congCuCon.map(nutMenu).join('') + '</div>' +
          nutMenu(chinh[2]) + nutMenu(chinh[3]) + nutMenu(chinh[4]) +
        '</div>' +
        '<div class="vq-trang vq-vi">' +
          '<button class="vq-quay" type="button" data-quay="1">' + IC.quay + ' Quay lại menu</button>' +
          mucVi.map(nutMenu).join('') +
        '</div>' +
      '</div>';

    var baoChua = function () { (layCtx().baoToast || function () {})(CHUA_XONG); };

    // Công cụ: bấm là xổ bốn công cụ con ngay bên dưới (đàn xếp).
    var nutCongCu = hop.querySelectorAll('.vq-chinh > button')[1];
    var xo = hop.querySelector('.vq-xo');
    nutCongCu.onclick = function () {
      xo.classList.toggle('mo');
      nutCongCu.classList.toggle('vq-mo');
    };
    Array.prototype.forEach.call(xo.querySelectorAll('button'), function (b) { b.onclick = baoChua; });

    Array.prototype.forEach.call(hop.querySelectorAll('.vq-chinh > button'), function (b, i) {
      if (i === 1) return;                       // nút Công cụ đã có việc riêng
      var khoa = b.getAttribute('data-khoa');
      b.onclick = khoa === 'ra'
        ? function () { A.thoat(); location.href = 'index.html'; }
        : baoChua;
    });

    hop.querySelector('[data-quay]').onclick = function () { hop.classList.remove('vq-o-vi'); };
    Array.prototype.forEach.call(hop.querySelectorAll('.vq-vi button[data-khoa]'), function (b) {
      var khoa = b.getAttribute('data-khoa');
      b.onclick = function () { (khoa === 'vi' ? moVi : moQua)(layCtx()); };
    });

    // Ô SAO: bấm chỗ nào trong ô cũng trượt sang trang con VÍ SAO.
    var oSao = opt.oSao || document.querySelector('.vi-to');
    if (oSao) {
      oSao.setAttribute('role', 'button');
      oSao.setAttribute('tabindex', '0');
      oSao.setAttribute('title', 'Xem ví sao của em');
      oSao.onclick = function () { hop.classList.add('vq-o-vi'); };
      oSao.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hop.classList.add('vq-o-vi'); }
      };
    }

    // Đóng sidebar rồi mở lại thì luôn về trang menu chính.
    opt.veChinh = function () { hop.classList.remove('vq-o-vi'); };
    return opt.veChinh;
  }

  window.AWVi = { dungMenu: dungMenu, moVi: moVi, moQua: moQua, CHUA_XONG: CHUA_XONG };
})();
