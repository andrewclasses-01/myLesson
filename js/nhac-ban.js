/* ============================================================================
   ⭐⭐ v1.333.0 (14/10/2026, thầy chốt mẫu `MAU NUT REMIND THE STAGE v1 14-10-2026.html`) — NÚT REMIND TRÊN THẺ STAGE
   ⭐⭐ v1.334.0 (14/10/2026, thầy chốt mẫu `MAU NUT REMIND CAC DANG BAI v4 14-10-2026.html`) — MỌI DẠNG BÀI (trừ khóa học + WORKSHEET)
   Dùng chung cho lop.html (thẻ bài của em), dashboard.html (thẻ bài của thầy) và bai.html (dải xanh đầu trang):
   viên "🔔 REMIND" trong ô hạn cạnh đồng hồ / nút REMIND FRIENDS trên dải ⇒ pop-up soạn tin (câu viết sẵn + @tên các
   bạn/em chưa xong) ⇒ gửi vào nhóm chat lớp. Ba LOẠI tin (`o.loai`):
     · 'chang' — bài STAGE: chưa xong STAGE đang chạy (câu chép y `MAU_NHAC_CHANG` bai.html).
     · 'bai'   — bài có act AWord (VOCABULARY · DICTATION · READING · REVIEW): chưa đủ điểm mọi act.
     · 'video' — SPEAKING SKILL (SP SLIDE) · SPEAKING CHECK: chưa XÁC NHẬN NỘP BÀI / chưa nộp.
     · 'act'   — (v1.339.0) một act trong bài STAGE (nút REMIND trên thẻ act bai.html), o.ten = tên act.
   · 1 LẦN / GIỜ mỗi khoá, nhớ trên máy. STAGE: `awc_nhac_<bài>_c_<số chặng>_<mã HS>` (TRÙNG nút REMIND FRIENDS STAGE bai.html);
     bài thường + video: `awc_nhac_<bài>_b_<mã HS>` (thẻ lop.html ⇄ dải bai.html cùng khoá). Thầy dùng mã 'GV'.
   · Ô HẠN (thầy chốt 14/10): thẻ CÓ nút ⇒ trang thêm class `co-nhac` vào `.han-boc` ⇒ ô rộng bằng ô STAGE trên máy (230);
     điện thoại: nút chỉ còn chuông tròn, ô bài thường 106 (cũ 100), ô STAGE 144;
     `.han-duoi` là LƯỚI 2 NGĂN CỐ ĐỊNH (đồng hồ | nút) ⇒ nút KHÔNG nhích khi chữ số đồng hồ đổi (9:59:59 → 10:00:00, HẾT HẠN…).
     ⛔ ĐỪNG cho nút xuống hàng dưới đồng hồ: thẻ cao CỐ ĐỊNH 200px, ô hạn cao lên là ép mất cột avatar thiếu bài (đo 14/10).
   ⭐⭐ v1.339.0 (15/10/2026, thầy chốt mẫu `MAU REMIND BAN HIEN v1 15-10-2026.html`) — CÂU TEEN + GOM "@Bạn hiền":
     · Câu viết sẵn giọng trẻ trung (thầy tự sửa từng câu, mã A1…E5 trong mẫu) — THAY HẲN bộ câu cũ.
     · Tin KHÔNG còn dãy @Tên1 @Tên2… mà chỉ MỘT viên `@Bạn hiền` (cả thầy lẫn học sinh); danh sách tên đi KÈM tin
       (trường `nhom` của classChat — luật `tools/dang-luat-ban-hien.js`) ⇒ js/nhac-tb.js vẫn báo đúng từng em,
       js/chat-ui.js vẽ viên bấm được (xem ai), em có tên thấy viên sáng cam.
     · Câu có chữ "cậu" chỉ ra khi nhắc ĐÚNG 1 bạn. Loại 'act' (thẻ act bai.html) cũng đi qua pop-up này —
       pop-up riêng `moNhacBan` của bai.html đã bỏ.
     · o.gui(chu, nhom) — trang gửi `nhom` cùng tin (AWChat.gui tự chỉ gắn khi chữ có "@Bạn hiền").
   ========================================================================== */
(function () {
  'use strict';
  var CACH_MS = 60 * 60 * 1000;
  var IC = '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  var IC_XONG = '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>';
  var TAG = '@Bạn hiền';   // ⛔ khớp js/chat.js TAG_NHOM + js/chat-ui.js
  // {T} = @Bạn hiền · {S}/{N} = STAGE đang chạy / STAGE kế · {B} = tên bài · {H} = hạn ("17:45 ngày 16/10") · {A} = tên act.
  // Câu có {N} bị bỏ ở chặng cuối; câu có {H} bị bỏ khi bài chưa đặt hạn; câu có "cậu" chỉ khi nhắc đúng 1 bạn.
  var MAU = {
    hs_chang: [
      'Nhanh lên nào mấy ní {T}! Nhanh nhanh cho cả lớp mở khóa nha huhu 🚀',
      'Triển đi {T} ơi! Cả lớp đang đứng ngoài cổng nhà cậu rồi kìa 🚪',
      'Cả nhà chờ tin {T} nhé 👀',
      'Mấy ní {T} ơi triển đi, còn chờ đợi cái gì nữa hic 🥲',
      'È hèm, {T} xem thế nào triển khai bài đi chứ nhỉ 😏',
      'Alo alo {T}, nghe rõ trả lời 📢',
      'Gét gô {T}! Kẹt chỗ nào ới tụi mình nha 🤝',
      'Ủa {T} còn online hông dợ? STAGE {N} đang khóa chờ mấy ní đó 🔒',
      'Tụi mình qua màn rồi nè, đợi {T} nữa thôi đó huhu 🚂',
      'STAGE {S} còn thiếu {T}! Khó chỗ nào cứ nhắn cả lớp nha'
    ],
    hs_bai: [
      'Nóng rồi nha {T}! Bài {B} hạn {H} đó 🔥',
      'Có gì khó khăn {T} cứ nhắn nhé, tớ và lớp sẽ giúp cậu nha 💛',
      'Deadline bài {B} đang dí tới nơi rồi {T} ơi, {H} là hết giờ ⏰',
      '{T} ơi bài {B} làm đi cậu, huhu 💨',
      'Ét o ét {T}! Bài {B} chưa xong kìa, kẹt câu nào ới cả lớp nha 🆘',
      'Lớp mình sắp full bài {B} rồi, chỉ thiếu mỗi {T} thôi á 🥺',
      'Khum phải dọa đâu nhưng {H} là đóng bài {B} rồi đó {T} 😬'
    ],
    hs_act: [
      'Còn mỗi {A} thôi {T} ơi, triển nốt đi huhu 🏁',
      '{A} dễ ẹc à {T}, làm cái một là xong, gét gô 💨',
      '{T} ơi? Câu nào khó cứ quăng lên đây, tụi mình gỡ cho 🤝'
    ],
    hs_video: [
      '{T} ơi lên đồ quay video bài {B} thôi! Nộp xong nhớ bấm XÁC NHẬN NỘP BÀI nha 🎬',
      'Sân khấu là của {T}! Quay bài {B} nộp trước {H} nhé 🎤',
      'Quay rồi mà chưa bấm XÁC NHẬN NỘP BÀI là coi như chưa nộp đó {T} 😵',
      'Idol {T} ơi, fan đang hóng video bài {B} nè, hạn {H} nha 🌟'
    ],
    gv_chang: [
      'È hèm {T}, STAGE {S} triển khai tới đâu rồi các em? 😏',
      'Cả lớp đang chờ {T} để mở STAGE {N} nhé 💪'
    ],
    gv_bai: [
      'Nóng rồi nha {T}! Bài {B} hạn {H}, thầy ngồi chờ đây 🔥',
      'Mấy ní {T} ơi, thầy chưa thấy bài {B} đâu nè. Còn chờ gì nữa hic 🥲'
    ],
    gv_video: [
      'Thầy hóng video bài {B} của {T} lắm rồi đó, nộp trước {H} nha 🎬'
    ]
  };

  function anToan(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function conCho(khoa) {
    var t = 0; try { t = +localStorage.getItem(khoa) || 0; } catch (e) {}
    return Math.max(0, t + CACH_MS - Date.now());
  }
  function chuCho(ms) { return 'Nhắc lại sau ' + Math.max(1, Math.ceil(ms / 60000)) + ' phút'; }
  // Hạn cho câu viết sẵn: mốc ms ⇒ "17:45 ngày 16/10" ('' nếu chưa đặt hạn).
  function chuHan(moc) {
    if (!moc) return '';
    var d = new Date(+moc), h = function (n) { return ('0' + n).slice(-2); };
    return d.getHours() + ':' + h(d.getMinutes()) + ' ngày ' + d.getDate() + '/' + (d.getMonth() + 1);
  }
  // Viên REMIND trong ô hạn (SPAN, không phải BUTTON: thẻ lop.html là <button>, nút lồng nút không hợp lệ).
  function nutHtml(khoa, data, tieuDe) {
    var con = conCho(khoa);
    return '<span class="nut-remind' + (con > 0 ? ' da' : ' rung') + '" role="button" tabindex="0" data-nhackhoa="' + anToan(khoa) + '"' + (data || '') +
      ' title="' + anToan(con > 0 ? chuCho(con) : (tieuDe || 'Nhắc các bạn chưa xong')) + '">' + IC + 'REMIND</span>';
  }
  // Dải xanh đầu trang bài (bai.html): `chu` = "YOU HAVE FINISHED THIS LESSON!" · `dem` + `chuDem` = "7 friends haven't…".
  function daiHtml(khoa, chu, dem, chuDem) {
    var con = conCho(khoa);
    return '<div class="nhb-dai" id="nhbDai"><span class="nhb-dai-chu">' + IC_XONG + anToan(chu) +
        '<span class="nhb-dai-dem">· ' + dem + ' ' + anToan(chuDem) + '</span></span>' +
      '<button type="button" class="nhb-dai-nut' + (con > 0 ? ' da' : '') + '" data-nhackhoa="' + anToan(khoa) + '" title="' +
        anToan(con > 0 ? chuCho(con) : 'Nhắc các bạn vào nhóm lớp') + '">' + IC + 'REMIND FRIENDS</button></div>';
  }
  // Khoá danh sách XÁC NHẬN NỘP VIDEO của ô SLIDE đầu tiên có `nop` — Y công thức `slBuoiId` bai.html /
  // `buoiId` bai-sp.html: <mã lớp>_<ngày 12-10>_<mã lesson slug>. Bài không có ô slide nộp ⇒ ''.
  function slideNopId(b, maLop) {
    if (!b || !maLop || !(b.khoi || []).some(function (k) { return k && k.loai === 'slide' && k.nop; })) return '';
    var A = window.A || {};
    var ma = String((A.maLesson && A.maLesson(b)) || b.id || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return maLop + '_' + String(b.ngay || '').replace(/\./g, '-') + '_' + ma;
  }
  // Đọc MỘT lần danh sách em đã xác nhận nộp video (kho `spSubmissions/<id>/students`, cần đăng nhập — đi qua
  // cửa Firebase của chat `AWChat.kho()`). Trả Promise<[tên đã nộp]>; hỏng ⇒ null (trang giữ nguyên, không nút).
  var DA_NOP = {};
  function docDaNopVideo(id) {
    if (!id || !window.AWChat || !AWChat.kho) return Promise.resolve(null);
    if (!DA_NOP[id]) {
      DA_NOP[id] = AWChat.kho().then(function (fb) {
        return fb.fs.getDocs(fb.fs.collection(fb.db, 'spSubmissions', id, 'students'));
      }).then(function (snap) {
        var ds = []; snap.forEach(function (d) { var x = d.data() || {}; if (x.ten) ds.push(x.ten); });
        return ds;
      })['catch'](function (e) { if (window.console) console.warn('[nhac-ban] spSubmissions:', (e && e.code) || e); delete DA_NOP[id]; return null; });
    }
    return DA_NOP[id];
  }
  // Nhịp 30 giây: nút xám hết giờ chờ ⇒ sáng lại; còn chờ ⇒ cập nhật chữ rê chuột.
  setInterval(function () {
    var ds = document.querySelectorAll('.da[data-nhackhoa]');
    for (var i = 0; i < ds.length; i++) {
      var con = conCho(ds[i].getAttribute('data-nhackhoa'));
      if (con > 0) { ds[i].title = chuCho(con); continue; }
      ds[i].classList.remove('da'); if (ds[i].classList.contains('nut-remind')) ds[i].classList.add('rung');
      ds[i].title = 'Nhắc các bạn chưa xong';
    }
  }, 30000);

  // Tin dài hơn trần chat ⇒ chia, chỉ cắt NGAY TRƯỚC một dấu "@" (không cắt đôi tên) — chép y `chiaTinNhac` bai.html.
  function chia(chu, tran) {
    var ra = [];
    while (chu.length > tran) {
      var cat = chu.lastIndexOf(' @', tran);
      if (cat <= 0) cat = chu.lastIndexOf(' ', tran);
      if (cat <= 0) cat = tran;
      ra.push(chu.slice(0, cat).trim());
      chu = chu.slice(cat).trim();
    }
    if (chu) ra.push(chu);
    return ra;
  }

  var CSS =
    // ---- ô hạn có nút (thẻ lop.html + dashboard) ----
    '.han-boc.co-nhac{width:236px} .han-boc.co-nhac .t-han{width:230px}' +
    '.han-duoi{display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; justify-items:center; column-gap:8px}' +
    '.han-duoi .dhho{min-width:0}' +
    '.han-duoi .dhho.lo,.han-duoi .dhho.chomo{font-size:13.5px; letter-spacing:0}' +
    '.han-duoi .dhho.do{letter-spacing:.3px}' +
    '.nut-remind{flex:none; display:inline-flex; align-items:center; gap:4px; height:23px; padding:0 9px 0 7px; border-radius:999px; background:#fff; border:1.5px solid #F2B866; color:#C8640C; cursor:pointer;' +
      ' font:800 10.5px/1 var(--sans,inherit); letter-spacing:.08em; box-shadow:0 1px 2px rgba(200,100,12,.15); transition:background .15s, color .15s, transform .1s; white-space:nowrap; user-select:none}' +
    '.nut-remind svg{width:12px; height:12px; fill:none; stroke:currentColor; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round}' +
    '.nut-remind:hover{background:#DE7A12; border-color:#DE7A12; color:#fff}' +
    '.nut-remind:active{transform:scale(.95)}' +
    '.nut-remind.rung svg{animation:nr-rung 2.4s ease-in-out infinite; transform-origin:50% 10%}' +
    '@keyframes nr-rung{0%,72%,100%{transform:rotate(0)} 76%{transform:rotate(16deg)} 82%{transform:rotate(-14deg)} 88%{transform:rotate(9deg)} 94%{transform:rotate(-5deg)}}' +
    '.t-han.gap-gio .nut-remind{border-color:#EFA5A8; color:#C2373C}' +
    '.t-han.gap-gio .nut-remind:hover{background:#D93B40; border-color:#D93B40; color:#fff}' +
    '.nut-remind.da,.nut-remind.da:hover{background:#F1F3F4; border-color:#DCE1E3; color:#97A3A6; box-shadow:none; cursor:default}' +
    '.nut-remind.da svg{animation:none}' +
    '@media (prefers-reduced-motion:reduce){.nut-remind.rung svg{animation:none}}' +
    // Điện thoại (thầy chốt 14/10): viên REMIND chỉ còn CHUÔNG TRÒN (chữ ẩn bằng font-size:0) ⇒ ô hạn bài thường chỉ rộng hơn cũ
    // 6px (106 thay 100 — đủ cho "100:00:00" + chuông), tên bài + ngày không bị cắt. Ô STAGE giữ 144 như cũ.
    '@media (max-width:620px){' +
      '.han-boc.co-nhac{width:112px} .han-boc.co-nhac .t-han{width:106px}' +
      '.han-boc.rong.co-nhac{width:150px} .han-boc.rong.co-nhac .t-han{width:144px}' +
      '.han-duoi{column-gap:4px} .han-duoi .dhho{font-size:12.5px; letter-spacing:0} .han-duoi .dhho.do{font-size:12.5px}' +
      '.han-duoi .dhho.lo,.han-duoi .dhho.chomo{font-size:8.5px; letter-spacing:-.02em}' +
      '.nut-remind{width:18px; height:18px; padding:0; gap:0; justify-content:center; font-size:0; letter-spacing:0; border-width:1.2px} .nut-remind svg{width:10px; height:10px}}' +
    // ---- dải xanh đầu trang bài (bai.html) ----
    '.nhb-dai{display:flex; align-items:center; justify-content:center; gap:10px 14px; flex-wrap:wrap; margin:0 0 16px; padding:10px 14px; border-radius:14px; background:#ECFDF5; border:1.5px solid #A7F3D0; font-family:var(--sans,inherit)}' +
    '.nhb-dai-chu{display:flex; align-items:center; gap:8px; font-weight:800; font-size:12.5px; letter-spacing:.05em; color:#047857; text-align:center}' +
    '.nhb-dai-chu svg{width:18px; height:18px; flex:none; fill:none; stroke:currentColor; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round}' +
    '.nhb-dai-dem{font-weight:700; font-size:11.5px; color:#B45309; letter-spacing:0; white-space:nowrap}' +
    '.nhb-dai-nut{display:inline-flex; align-items:center; gap:7px; padding:8px 14px 8px 12px; border:0; border-radius:11px; background:#F59E0B; color:#fff; font:900 12.5px/1 var(--sans,inherit); letter-spacing:.07em; cursor:pointer; box-shadow:0 4px 12px rgba(245,158,11,.35); transition:transform .12s, filter .12s}' +
    '.nhb-dai-nut svg{width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2.3; stroke-linecap:round; stroke-linejoin:round}' +
    '.nhb-dai-nut:hover{transform:translateY(-1px); filter:brightness(1.05)}' +
    '.nhb-dai-nut.da{background:#E5E7EB; color:#6B7280; box-shadow:none; cursor:default; transform:none}' +
    '@media (max-width:620px){.nhb-dai{padding:9px 10px} .nhb-dai-chu{font-size:11px; flex-wrap:wrap; justify-content:center; gap:2px 6px} .nhb-dai-dem{flex-basis:100%; text-align:center}}' +
    // ---- pop-up — cùng khuôn bai.html (.nhb-*), thêm reset nút cho dashboard (nút mặc định của trình duyệt) ----
    ':where(.nhb-nen) button{font:inherit; color:inherit; background:none; border:0; padding:0; cursor:pointer}' +
    '.nhb-nen{position:fixed; inset:0; z-index:9000; background:rgba(15,23,42,.45); backdrop-filter:blur(2px); display:none; align-items:center; justify-content:center; padding:16px; font-family:var(--sans,inherit); color:#16232A; text-align:left}' +
    '.nhb-nen.mo{display:flex}' +
    '.nhb-pop{width:min(560px,100%); max-height:92vh; overflow:auto; background:#fff; border-radius:20px; box-shadow:0 30px 70px rgba(0,0,0,.3); animation:nhb-len .22s cubic-bezier(.22,.9,.3,1)}' +
    '@keyframes nhb-len{from{opacity:0; transform:translateY(10px) scale(.98)} to{opacity:1; transform:none}}' +
    '.nhb-dau{display:flex; align-items:center; gap:12px; padding:16px 18px 10px}' +
    '.nhb-dau .bieu{width:40px; height:40px; border-radius:12px; background:#FEF3C7; color:#D97706; display:grid; place-items:center; flex:none}' +
    '.nhb-dau .bieu.gv{background:#EEF4FF; color:#2B5FD0}' +
    '.nhb-dau .bieu svg{width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round}' +
    '.nhb-dau h3{margin:0; font-weight:900; font-size:16px; letter-spacing:.06em}' +
    '.nhb-dau small{display:block; color:#5F7370; font-size:12px; font-weight:600}' +
    '.nhb-dau .x{margin-left:auto; width:34px; height:34px; border-radius:10px; display:grid; place-items:center; color:#5F7370; font-size:16px}' +
    '.nhb-than{padding:4px 18px 16px}' +
    '.nhb-nhan{font-weight:800; font-size:11px; letter-spacing:.1em; color:#5F7370; margin:8px 0 6px; display:flex; justify-content:space-between}' +
    '.nhb-ds{display:flex; flex-wrap:wrap; gap:6px}' +
    '.nhb-ban{display:inline-flex; align-items:center; gap:6px; padding:3px 6px 3px 10px; border-radius:999px; background:#EEF4FF; border:1px solid #C7D7FE; font-weight:700; font-size:12.5px; color:#1E3A8A}' +
    '.nhb-ban button{width:18px; height:18px; border-radius:50%; color:#64748B; font-size:12px; line-height:1}' +
    '.nhb-ban.bo{opacity:.4; text-decoration:line-through}' +
    '.nhb-tin{margin-top:6px; border:1.5px solid #CFE5E0; border-radius:14px; background:#F8FCFB; padding:12px 14px; min-height:110px; font-size:14.5px; line-height:1.6; outline:none; white-space:pre-wrap; word-break:break-word}' +
    '.nhb-tin:focus{border-color:#0E7C6E; background:#fff}' +
    '.nhb-tin .tag{color:#2B5FD0; font-weight:800}' +
    '.nhb-phu{display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:8px; flex-wrap:wrap}' +
    '.nhb-doi{display:inline-flex; align-items:center; gap:6px; font-weight:800; font-size:12px; color:#0E7C6E; padding:6px 10px; border-radius:10px; background:#E3F1EE}' +
    '.nhb-doi svg{width:14px; height:14px; fill:none; stroke:currentColor; stroke-width:2.3; stroke-linecap:round; stroke-linejoin:round}' +
    '.nhb-ghi{font-size:11.5px; color:#5F7370; font-weight:600}' +
    '.nhb-cuoi{display:flex; gap:10px; padding:12px 18px 16px; border-top:1px solid #E0EAE7}' +
    '.nhb-cuoi button{flex:1; padding:12px; border-radius:12px; font-weight:900; font-size:13px; letter-spacing:.06em}' +
    '.nhb-huy{background:#EEF2F6; color:#334155}' +
    '.nhb-cuoi .nhb-gui{background:#0E7C6E; color:#fff; display:inline-flex; align-items:center; justify-content:center; gap:8px}' +
    '.nhb-gui[disabled]{opacity:.6}' +
    '.nhb-gui svg{width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2.3; stroke-linecap:round; stroke-linejoin:round}';
  (function () { var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); })();

  /* NhacBan.mo(o) — o = {
       loai: 'chang' (mặc định) | 'bai' | 'video', gv: true nếu thầy gửi (đổi tiêu đề + câu viết sẵn),
       so / sau: số STAGE + STAGE kế (0 = chặng cuối) — loại 'chang'; ten: tên bài, han: chữ hạn ("17:45 ngày 16/10") — 'bai'/'video',
       ban: [tên chưa xong], khoa: khoá giờ chờ, lop: chữ lớp hiện ở dòng ghi chú,
       gui: function(chu) → Promise (gửi MỘT tin), chan: function() → chuỗi lý do KHÔNG gửi (vd thầy xem như em) | '',
       bao: function(chu) (toast của trang), chuLoi: function(e) → chữ lỗi } */
  var DANG = null;
  function $(id) { return document.getElementById(id); }
  function dsMau() {
    var ds = MAU[(DANG.gv ? 'gv_' : 'hs_') + DANG.loai] || MAU.hs_bai;
    var mot = soBat() === 1;
    var ra = ds.filter(function (m) { return (DANG.sau || m.indexOf('{N}') < 0) && (DANG.han || m.indexOf('{H}') < 0) && (mot || !/cậu/.test(m)); });
    return ra.length ? ra : ['{T} ơi, triển đi nha 🚀'];
  }
  function soBat() { return DANG.ds.filter(function (b) { return b.bat; }).length; }
  function nhom() { return DANG.ds.filter(function (b) { return b.bat; }).map(function (b) { return b.ten; });
  }
  function moTa(o) {
    var ai = o.gv ? 'các em' : 'các bạn';
    if (o.loai === 'video') return 'Nhắc ' + ai + ' chưa nộp video bài ' + o.ten;
    if (o.loai === 'bai') return 'Nhắc ' + ai + ' chưa xong bài ' + o.ten;
    if (o.loai === 'act') return 'Nhắc ' + ai + ' chưa xong ' + o.ten;
    return 'Nhắc ' + ai + ' chưa xong STAGE ' + o.so;
  }
  function mo(o) {
    o.loai = o.loai || 'chang';
    if (!o.ban || !o.ban.length) { o.bao && o.bao(o.gv ? 'Các em đã xong hết rồi!' : 'Các bạn đã xong hết rồi!'); return; }
    var con = conCho(o.khoa);
    if (con > 0) { o.bao && o.bao((o.gv ? 'Thầy' : 'Em') + ' vừa nhắc rồi — ' + chuCho(con).toLowerCase() + '.'); return; }
    DANG = o;
    DANG.ds = o.ban.map(function (t) { return { ten: t, bat: true }; });
    DANG.mau = Math.floor(Math.random() * dsMau().length);   // mỗi người một câu khác
    var nen = $('nbmNen');
    if (!nen) {
      nen = document.createElement('div');
      nen.id = 'nbmNen'; nen.className = 'nhb-nen';
      nen.innerHTML = '<div class="nhb-pop" role="dialog" aria-modal="true">' +
        '<div class="nhb-dau"><span class="bieu" id="nbmBieu">' + IC + '</span><div><h3 id="nbmTen"></h3><small id="nbmPhu"></small></div><button type="button" class="x" id="nbmDong" aria-label="Đóng">✕</button></div>' +
        '<div class="nhb-than"><div class="nhb-nhan"><span id="nbmNhan"></span><span id="nbmSo"></span></div><div class="nhb-ds" id="nbmDs"></div>' +
          '<div class="nhb-nhan" style="margin-top:14px"><span>TIN NHẮN</span><span id="nbmCau"></span></div><div class="nhb-tin" id="nbmTin" contenteditable="true"></div>' +
          '<div class="nhb-phu"><button type="button" class="nhb-doi" id="nbmDoi"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>Đổi câu khác</button>' +
          '<span class="nhb-ghi" id="nbmGhi"></span></div></div>' +
        '<div class="nhb-cuoi"><button type="button" class="nhb-huy" id="nbmHuy">HỦY</button><button type="button" class="nhb-gui" id="nbmGui"><svg viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>GỬI VÀO NHÓM LỚP</button></div></div>';
      document.body.appendChild(nen);
      var dong = function () { nen.classList.remove('mo'); DANG = null; };
      $('nbmDong').onclick = dong; $('nbmHuy').onclick = dong;
      nen.addEventListener('click', function (e) { if (e.target === nen) dong(); });
      $('nbmDoi').onclick = function () { if (!DANG) return; DANG.mau = (DANG.mau + 1) % dsMau().length; veTin(); };
      $('nbmGui').onclick = gui;
    }
    var viec = o.loai === 'video' ? 'CHƯA NỘP' : 'CHƯA XONG';
    $('nbmBieu').classList.toggle('gv', !!o.gv);
    $('nbmTen').textContent = o.gv ? 'NHẮC CẢ LỚP' : 'REMIND YOUR FRIENDS';
    $('nbmPhu').textContent = moTa(o) + (o.gv ? ' · gửi dưới tên Thầy' : '');
    $('nbmNhan').textContent = TAG.toUpperCase() + ' GỒM ' + (o.gv ? 'CÁC EM ' : 'CÁC BẠN ') + viec;
    $('nbmGhi').textContent = 'Gửi vào nhóm chat lớp ' + (o.lop || '') + ' · ' + (o.gv ? 'các em' : 'các bạn') + ' trong ' + TAG + ' sẽ nhận thông báo';
    $('nbmGui').disabled = false;
    veBan(); veTin();
    nen.classList.add('mo');
  }
  function veBan() {
    var ds = $('nbmDs');
    ds.innerHTML = DANG.ds.map(function (b, i) {
      return '<span class="nhb-ban' + (b.bat ? '' : ' bo') + '">' + anToan(b.ten) + '<button type="button" data-i="' + i + '" aria-label="' + (b.bat ? 'Bỏ' : 'Thêm') + '">' + (b.bat ? '✕' : '+') + '</button></span>';
    }).join('');
    $('nbmSo').textContent = DANG.ds.filter(function (b) { return b.bat; }).length + (DANG.gv ? ' em' : ' bạn');
    Array.prototype.forEach.call(ds.querySelectorAll('button'), function (n) {
      n.onclick = function () { var b = DANG.ds[+n.getAttribute('data-i')]; b.bat = !b.bat; veBan(); DANG.mau = 0; veTin(); };
    });
  }
  function veTin() {
    var ds = dsMau();
    DANG.mau = DANG.mau % ds.length;
    var tag = soBat() ? '<span class="tag" contenteditable="false">' + anToan(TAG) + '</span>' : (DANG.gv ? 'các em' : 'các bạn');
    $('nbmTin').innerHTML = anToan(ds[DANG.mau]).replace(/\{T\}/g, tag)
      .replace(/\{S\}/g, DANG.so).replace(/\{N\}/g, DANG.sau).replace(/\{B\}/g, anToan(DANG.ten || '')).replace(/\{H\}/g, anToan(DANG.han || ''))
      .replace(/\{A\}/g, anToan(DANG.ten || ''));
    $('nbmCau').textContent = ds.length > 1 ? (DANG.mau + 1) + '/' + ds.length : '';
  }
  function gui() {
    if (!DANG) return;
    var o = DANG, bao = o.bao || function () {};
    var chu = String($('nbmTin').innerText || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim();
    if (!chu) { bao('Tin nhắn đang trống.'); return; }
    var ds = nhom();
    if (!ds.length) { bao(o.gv ? 'Chưa chọn em nào để nhắc.' : 'Chưa chọn bạn nào để nhắc.'); return; }
    if (chu.indexOf(TAG) < 0) chu = TAG + ' ' + chu;   // lỡ xoá viên ⇒ gắn lại đầu tin (các bạn vẫn nhận thông báo)
    var chan = o.chan ? o.chan() : '';
    if (chan) { bao(chan); return; }
    var nut = $('nbmGui'), tran = (window.AWChat && AWChat.TOI_DA_CHU) || 300;
    nut.disabled = true;
    var tin = chia(chu, tran), i = 0;
    var guiMot = function () { return i >= tin.length ? Promise.resolve() : Promise.resolve(o.gui(tin[i++], ds)).then(guiMot); };
    guiMot().then(function () {
      try { localStorage.setItem(o.khoa, String(Date.now())); } catch (e) {}
      $('nbmNen').classList.remove('mo'); DANG = null;
      Array.prototype.forEach.call(document.querySelectorAll('[data-nhackhoa]'), function (n) {
        if (n.getAttribute('data-nhackhoa') !== o.khoa) return;
        n.classList.add('da'); n.classList.remove('rung'); n.title = chuCho(CACH_MS);
      });
      if (o.xong) { try { o.xong(); } catch (e) {} }
      bao('Đã gửi vào nhóm lớp — ' + (o.gv ? 'các em' : 'các bạn') + ' trong ' + TAG + ' sẽ nhận thông báo');
    })['catch'](function (e) {
      nut.disabled = false;
      if (e === '__im') return;
      bao(o.chuLoi ? o.chuLoi(e) : 'Chưa gửi được, thử lại nhé.');
    });
  }

  window.NhacBan = { CACH_MS: CACH_MS, nutHtml: nutHtml, daiHtml: daiHtml, conCho: conCho, chuHan: chuHan, mo: mo, chia: chia,
                     slideNopId: slideNopId, docDaNopVideo: docDaNopVideo, TAG: TAG };
})();
