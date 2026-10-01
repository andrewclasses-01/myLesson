/* ============================================================
   chat-ui.js — KHUÔN CHAT KIỂU ZALO DÙNG CHUNG (web v1.186.0, 30/09/2026)
   Thầy chốt mẫu "bản 12" (Artifact "Mẫu chat kiểu Zalo"). Đi cùng css/chat-ui.css.

   Chỉ lo GIAO DIỆN + thao tác. Đọc/ghi kho là việc của trang (qua các hàm truyền vào) —
   chat lớp dùng js/chat.js (AWChat), myNetwork dùng nw/js/chat.js. Đúng luật "một khuôn,
   hai vai" ở đầu js/chat.js: GV chỉ khác vài nút phụ (thu hồi/xoá mọi tin).

   Dùng:
     var ui = ChatUI.tao({
       khung: <phần tử cuộn chứa tin>, chan: <phần tử chứa ô nhập>, idNhap: 'oChat',
       toi: { khoa: 'MA_HS' | 'GV', ten: 'Tên' },   // khoa = khoá của em trong map cx
       laThay: bool,                                   // thu hồi / xoá được MỌI tin
       laCuaToi(t), av(t,i) -> html, nhan(t) -> html (nhãn THẦY…), dsNhac() -> [tên],
       gui({chu, q?, sticker?}) -> Promise, datCx(t, giaTri|null) -> Promise,
       thuHoi(t) -> Promise, xoa?(t) -> Promise, loi(chuHoacLoi), trong: 'chữ khi chưa có tin'
     });
     ui.ve(dsTin, htmlDau)   // dsTin: [{id, ten, ma, vaiTro, chu, luc, cx, q, sticker, thuHoi}]
     ui.khoa(true|false, 'chữ gợi ý')
   ⭐ v1.198.0 (myNetwork dùng chung khuôn): tuỳ chọn thêm
     hienTen: false            // chat 1-1: không in tên người gửi trên bong bóng
     guiAnh(file) -> Promise<url>   // có ⇒ ô nhập thêm nút gửi ảnh; tin ảnh = {chu:'', hinh:url}
     xemAnh(url, t)            // bấm ảnh trong tin
     sauTin(t, i, ds) -> html  // chèn sau hàng tin (vd avatar "đã xem")
   ⭐ v1.206.0: guiAnh nay XEM TRƯỚC (nút ảnh trước nút emoji · Ctrl+V · kéo thả) rồi bấm gửi; chat lớp chỉ dashboard có guiAnh.
     docThuHoi(t) -> Promise<{chu,q,sticker,hinh}|null>   // có ⇒ hiện nội dung tin đã thu hồi (dashboard thầy)

   Dữ liệu tin (thêm từ v1.186.0, trường cũ giữ nguyên):
     chu      chữ; emoji bộ riêng ghi dạng mã `:1f60a:` (xem EMOJI), nhắc tên dạng `@Tên`
     q        {id, ten, chu} — tin được trả lời (trích tối đa 120 chữ)
     sticker  'goi:ten' (xem STICKER) — chu kèm '[Sticker]' để trang cũ còn đọc được
     thuHoi   true ⇒ chu đã bị xoá trắng, hiện "Tin nhắn đã bị thu hồi"
     cx[khoa] {ten, luc, n:{tim:3, haha:1}, l:'haha'}  — mỗi loại tối đa 10 lần (luật kho chặn thật)
              bản cũ {ma, ten, luc} vẫn đọc được: ma cũ đổi theo CX_CU (gà con, thích ⇒ tim; 😮 ⇒ ngạc nhiên)
   ============================================================ */
(function () {
  'use strict';
  var GOC = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? s.replace(/js\/chat-ui\.js[^/]*$/, '') : '';
  })();

  // ---------- bộ emoji (Microsoft Fluent Emoji 3D — MIT) ----------
  var EMOJI_NGUON = {
    'Cảm xúc': '1f60a:Cười mỉm|1f92d:Che miệng cười|1f60d:Mê tim|1f602:Cười ra nước mắt|1f60e:Ngầu|1f62d:Khóc to|1f60c:Nhẹ nhõm|263a:Ngại ngùng|1f62a:Buồn ngủ|1f622:Khóc|1f923:Cười lăn|1f621:Giận dữ|1f61c:Lè lưỡi|1f601:Cười toe|1f914:Suy nghĩ|1f61f:Lo lắng|1f612:Chán|1f633:Đỏ mặt|1f618:Hôn gió|1f92b:Suỵt|1f60f:Cười đểu|1f616:Khổ sở|1f917:Ôm|1f632:Ngạc nhiên|1f635:Choáng|1f631:Hoảng sợ|1f624:Hậm hực|1f629:Mệt mỏi|1f92c:Chửi thề|1f60b:Ngon quá|1f971:Ngáp|1f617:Chu môi|1f62c:Nhăn răng|1f609:Nháy mắt|1f611:Cạn lời|1f606:Cười híp mắt|1f9d0:Soi kỹ|1f635-200d-1f4ab:Chóng mặt|1f630:Toát mồ hôi|1f480:Đầu lâu|1f61d:Lè lưỡi nhắm mắt|1f97a:Năn nỉ|1f623:Cố gắng|1f61a:Hôn nhắm mắt|1f620:Cáu|1f62b:Kiệt sức|1f910:Im miệng|1f92e:Nôn|1f92f:Nổ não|1f605:Cười trừ|1f911:Mê tiền|1f973:Tiệc tùng|1f642:Mỉm cười|1f643:Lộn ngược',
    'Tay': '1f44d:Thích|1f44e:Không thích|1f44c:OK|270c:Chiến thắng|1f64f:Chắp tay|270a:Nắm đấm|1f91d:Bắt tay|261d:Chỉ lên|1f918:Rock|1f919:Gọi nhé|1f44f:Vỗ tay|1f4aa:Cơ bắp|1f44b:Vẫy tay',
    'Đồ vật': '2764:Trái tim|1f494:Tim vỡ|1f339:Hoa hồng|1f940:Hoa héo|2615:Cà phê|1f37a:Bia|1f382:Bánh sinh nhật|1f4a3:Bom|1f52a:Dao|1f4a9:Phân|26a1:Sét|1f1fb-1f1f3:Cờ Việt Nam|1f357:Đùi gà|1f389:Chúc mừng|2b50:Ngôi sao|1f525:Lửa|1f4af:Điểm 100|1f4da:Sách|270f:Bút chì|1f423:Gà con'
  };
  var EMOJI = {}, NHOM_EMOJI = [];
  Object.keys(EMOJI_NGUON).forEach(function (nhom) {
    var ds = EMOJI_NGUON[nhom].split('|').map(function (x) { var p = x.split(':'); EMOJI[p[0]] = p[1]; return p[0]; });
    NHOM_EMOJI.push({ ten: nhom, ds: ds });
  });
  function urlEmoji(ma) { return GOC + 'assets/emoji/' + ma + '.webp'; }

  // ---------- sticker ----------
  function goiStk(id, ten, ghi, ds, duoi) {
    return { id: id, ten: ten, ghi: ghi, ds: ds.split('|').map(function (x) { var p = x.split(':'); return { ma: p[0], chu: p[1] }; }), duoi: duoi };
  }
  var STICKER = [
    goiStk('lop', 'Lớp mình', 'Sticker riêng của Andrew Classes', 'ga-hello:Hello!|ga-nopbai:Nộp bài rồi!|ga-cuu:Thầy ơi cứu!|ga-yay:Yay!|ga-buonngu:Buồn ngủ quá|ga-hieuroi:Hiểu rồi!|ga-thanks:Thank you!|ga-ha:Hả???|cun-goodjob:Good job!|cun-haha:Haha|cun-danghoc:Đang học...|meo-chamchi:Chăm chỉ!|gau-tuyetvoi:Tuyệt vời!', 'webp'),
    goiStk('noto', 'Động', 'Noto Animated Emoji © Google — CC BY 4.0', '1f60d:Mê quá|1f970:Thương ghê|2764:Yêu|1f973:Tiệc thôi!|1f929:Đỉnh!|1f60e:Ngầu|1f525:Cháy quá|1f4af:100 điểm|1f3c6:Vô địch|1f680:Bay lên|1f44d:Tuyệt|1f44f:Vỗ tay|1f64f:Cảm ơn|1f389:Chúc mừng|1f602:Cười xỉu|1f92a:Lầy|1f917:Ôm cái|1f914:Để nghĩ|1f97a:Năn nỉ|1f62d:Huhu|1f631:Hết hồn|1f92f:Nổ não|1f634:Buồn ngủ|1f608:Quỷ nhỏ', 'webp'),
    goiStk('blob', 'Blob', 'Blobmoji — Apache 2.0', '1f60a:Hihi|1f60d:Mê|1f970:Thương|1f618:Moa|1f917:Ôm|1f607:Ngoan|1f61c:Lêu lêu|1f602:Haha|1f973:Quẩy|1f929:Wow|1f60e:Ngầu|1f60f:Hehe|1f914:Hmm|1f92d:Ối|1f644:Xì|1f97a:Năn nỉ|1f634:Ngủ|1f62d:Huhu|1f631:Á á|1f621:Giận', 'svg'),
    goiStk('thu', 'Thú 3D', 'Microsoft Fluent Emoji 3D — MIT', '1f436:Cún|1f431:Mèo|1f43c:Gấu trúc|1f98a:Cáo|1f430:Thỏ|1f43b:Gấu|1f428:Koala|1f42f:Hổ|1f981:Sư tử|1f435:Khỉ|1f438:Ếch|1f427:Cánh cụt|1f425:Gà con|1f984:Kỳ lân|1f432:Rồng|1f996:Khủng long|1f433:Cá voi|1f419:Bạch tuộc|1f99c:Vẹt|1f99d:Gấu mèo', 'webp'),
    goiStk('chu', 'Có chữ', 'Fluent Emoji 3D kèm chữ', '1f602:Cười xỉu|1f60d:Mê quá|1f44d:Tuyệt vời!|1f62d:Huhu|1f621:Grr!|1f60e:Ngầu|1f973:Tiệc thôi!|1f64f:Cảm ơn thầy', 'webp')
  ];
  function timStk(id) {
    var p = String(id || '').split(':'), g = STICKER.filter(function (x) { return x.id === p[0]; })[0];
    if (!g) return null;
    var it = g.ds.filter(function (x) { return x.ma === p[1]; })[0];
    if (!it) return null;
    var url = g.id === 'chu' ? urlEmoji(it.ma) : GOC + 'assets/sticker/' + g.id + '/' + it.ma + '.' + g.duoi;
    return { goi: g, it: it, url: url, coChu: g.id === 'chu' };
  }

  // ---------- cảm xúc thả vào tin ----------
  var CX = [{ k: 'tim', e: '2764', ten: 'Tim' }, { k: 'haha', e: '1f602', ten: 'Haha' }, { k: 'khoc', e: '1f62d', ten: 'Khóc' },
            { k: 'gian', e: '1f621', ten: 'Phẫn nộ' }, { k: 'wow', e: '1f632', ten: 'Ngạc nhiên' }, { k: 'timVo', e: '1f494', ten: 'Tim vỡ' }];
  var KINDS = CX.map(function (c) { return c.k; });
  var CX_E = {}; CX.forEach(function (c) { CX_E[c.k] = c; });
  var CX_CU = { tim: 'tim', haha: 'haha', khoc: 'khoc', ngac: 'wow', gaCon: 'tim', like: 'tim' };
  var TOI_DA_CX = 10, TOI_DA_CHU = 300;
  function imgCx(k, cls) { var c = CX_E[k]; return c ? '<img src="' + urlEmoji(c.e) + '" alt="' + c.ten + '" title="' + c.ten + '" draggable="false"' + (cls ? ' class="' + cls + '"' : '') + '>' : ''; }
  // chuẩn hoá MỘT ô cx (bản mới hoặc bản cũ {ma,ten,luc}) ⇒ {ten, luc, n:{}, l} ; null nếu rỗng
  function cxChuan(v) {
    if (!v || typeof v !== 'object') return null;
    var n = {}, co = false;
    if (v.n && typeof v.n === 'object') {
      KINDS.forEach(function (k) { var x = Math.min(TOI_DA_CX, Math.max(0, Math.floor(Number(v.n[k]) || 0))); if (x) { n[k] = x; co = true; } });
    } else if (v.ma && CX_CU[v.ma]) { n[CX_CU[v.ma]] = 1; co = true; }
    if (!co) return null;
    var l = v.l && n[v.l] ? v.l : (v.ma && CX_CU[v.ma]) || Object.keys(n)[0];
    return { ten: String(v.ten || '?'), luc: Number(v.luc) || 0, n: n, l: l };
  }
  function demCx(cx) {   // {tim: tổng,...}, tổng chung, và danh sách người
    var theo = {}, tong = 0, nguoi = [];
    Object.keys(cx || {}).forEach(function (kh) {
      var v = cxChuan(cx[kh]); if (!v) return;
      nguoi.push({ khoa: kh, ten: v.ten, n: v.n, luc: v.luc || 0, l: v.l || '', tong: Object.keys(v.n).reduce(function (a, k) { return a + v.n[k]; }, 0) });
      Object.keys(v.n).forEach(function (k) { theo[k] = (theo[k] || 0) + v.n[k]; tong += v.n[k]; });
    });
    return { theo: theo, tong: tong, nguoi: nguoi };
  }

  // ---------- chữ ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function kyTuEmoji(ma) { try { return String.fromCodePoint.apply(null, ma.split('-').map(function (h) { return parseInt(h, 16); })); } catch (e) { return ''; } }
  function chuThuong(chu) { return String(chu || '').replace(/:([0-9a-f]+(?:-[0-9a-f]+)*):/g, function (m, ma) { return EMOJI[ma] ? kyTuEmoji(ma) : m; }); }
  function reNhac(ds) {
    var ten = ['All'].concat(ds || []).filter(Boolean).map(function (x) { return String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    ten.sort(function (a, b) { return b.length - a.length; });
    return new RegExp('@(' + ten.join('|') + ')(?![\\p{L}\\p{N}])', 'gu');
  }
  // ⭐ v1.199.0 — thầy chốt bộ emoji DÙNG CHUNG toàn hệ thống: emoji Unicode gõ từ bàn phím (😂, 👍…) có trong bộ 87 hình
  //   cũng hiện thành hình 3D. UNI = [ký tự (± FE0F), mã], xếp dài trước để "❤️" không bị cắt thành "❤".
  var UNI = [];
  Object.keys(EMOJI).forEach(function (ma) { var k = kyTuEmoji(ma); if (!k) return; UNI.push([k, ma]); if (k.slice(-1) !== '\ufe0f') UNI.push([k + '\ufe0f', ma]); });
  UNI.sort(function (a, b) { return b[0].length - a[0].length; });
  var reUni = new RegExp(UNI.map(function (x) { return x[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'g');
  var maUni = {}; UNI.forEach(function (x) { maUni[x[0]] = x[1]; });
  function imgEmoji(ma, to) { return '<img class="cu-ei' + (to ? ' to' : '') + '" src="' + urlEmoji(ma) + '" alt="' + esc(EMOJI[ma]) + '" title="' + esc(EMOJI[ma]) + '" draggable="false">'; }
  // chỉ toàn emoji (1–3 cái, mã hoặc Unicode)?
  function laChiEmoji(s) {
    var dem = 0, con = String(s || '').replace(/:([0-9a-f]+(?:-[0-9a-f]+)*):/g, function (m, ma) { if (EMOJI[ma]) { dem++; return ''; } return m; })
      .replace(reUni, function () { dem++; return ''; });
    return dem >= 1 && dem <= 3 && !con.trim();
  }
  // Thay mã :xxxx: + emoji Unicode trong HTML ĐÃ LỌC (esc) bằng hình 3D. Dùng chung: chat, bài đăng, bình luận (NW.chuCoLink).
  function thayEmoji(h, to) {
    return String(h).replace(/:([0-9a-f]+(?:-[0-9a-f]+)*):/g, function (m, ma) { return EMOJI[ma] ? imgEmoji(ma, to) : m; })
      .replace(reUni, function (m) { return imgEmoji(maUni[m], to); });
  }
  function giau(chu, re, nho) {
    var s = String(chu || '');
    var chiEmoji = !nho && laChiEmoji(s);
    var h = esc(s);
    if (!nho) h = h.replace(/(https?:\/\/[^\s<]+)/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>'; });
    if (re) h = h.replace(re, '<span class="cu-nhac">@$1</span>');
    return thayEmoji(h, chiEmoji);
  }
  function tomTat(t) {
    if (!t) return '';
    if (t.thuHoi) return 'Tin nhắn đã bị thu hồi';
    if (t.sticker) { var s = timStk(t.sticker); return '[Sticker]' + (s ? ' ' + s.it.chu : ''); }
    if (t.hinh && !t.chu) return '📷 Ảnh';
    return String(t.chu || '');
  }
  function hai(n) { return (n < 10 ? '0' : '') + n; }
  function gio(ms) { if (!ms) return ''; var d = new Date(ms); return d.getHours() + ':' + hai(d.getMinutes()); }
  function ngay(ms) {
    var d = new Date(ms), nay = new Date();
    var cung = function (a, b) { return a.toDateString() === b.toDateString(); };
    if (cung(d, nay)) return 'Hôm nay';
    if (cung(d, new Date(nay.getFullYear(), nay.getMonth(), nay.getDate() - 1))) return 'Hôm qua';
    return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()] + ', ' + d.getDate() + '/' + (d.getMonth() + 1) + (d.getFullYear() !== nay.getFullYear() ? '/' + d.getFullYear() : '');
  }
  // ⭐ v1.192.0 — thầy: mốc đầu mỗi NHỊP trò chuyện ghi rõ giờ + ngày đủ năm, vd "17:59 29.9.2026" (v1.194.0: "11:22 14 Tháng 7, 2026").
  // ⭐ v1.194.0 — thầy đổi dạng: "11:22 14 Tháng 7, 2026".
  function mocNhip(ms) { var d = new Date(ms); return gio(ms) + ' ' + d.getDate() + ' Tháng ' + (d.getMonth() + 1) + ', ' + d.getFullYear(); }
  var NHIP_MOI = 60 * 60e3;
  // ⭐ v1.193.0 — thầy: thanh cuộn MẢNH, KHÔNG mũi tên, CHỈ HIỆN KHI ĐANG CUỘN. Nghe `scroll` (không nổi bọt ⇒ bắt ở pha capture)
  //   của mọi vùng cuộn trong khuôn chat, gắn class .cu-dang-cuon rồi gỡ sau 900ms đứng yên (CSS ở css/chat-ui.css).
  var VUNG_CUON = '.cu-khung, .cu-o, .cu-bang .trai, .cu-bang .phai, .cu-khay .than';
  document.addEventListener('scroll', function (e) {
    var el = e.target; if (!el || !el.matches || !el.matches(VUNG_CUON)) return;
    el.classList.add('cu-dang-cuon');
    clearTimeout(el._cuHenCuon);
    el._cuHenCuon = setTimeout(function () { el.classList.remove('cu-dang-cuon'); }, 900);
  }, true);   // im lặng từ 1 tiếng trở lên (hoặc sang ngày khác) ⇒ nhịp trò chuyện mới
  function $(s, r) { return (r || document).querySelector(s); }

  // ---------- icon nét ----------
  var IC = {
    trich: '<svg viewBox="0 0 24 24"><path d="M4 18v-5.2C4 8.7 6 6.2 9.6 5.4l.7 1.6C8.3 7.8 7.4 9.2 7.3 11H10v7zm9.6 0v-5.2c0-4.1 2-6.6 5.6-7.4l.7 1.6c-2 .8-2.9 2.2-3 4H20v7z"/></svg>',
    ba: '<svg viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18.5" cy="12" r="1.8"/></svg>',
    timVien: '<svg viewBox="0 0 32 32"><path d="M16 27C5 19.8 4.3 11.3 9.6 8.2c3-1.7 5.4-.2 6.4 2 1-2.2 3.4-3.7 6.4-2 5.3 3.1 4.6 11.6-6.4 18.8z"/></svg>',
    mat: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.2c1 1.5 2.2 2.2 3.5 2.2s2.5-.7 3.5-2.2"/><path d="M9 9.6v.6M15 9.6v.6"/></svg>',
    gui: '<svg class="dac" viewBox="0 0 512 512"><path d="M40.5 17.6C30 12.6 17.5 21.5 20.2 32.9L62.8 213.6C64.2 219.6 69.3 224 75.4 224.5L246 238.6C255.4 239.4 255.4 272.6 246 273.4L75.4 287.5C69.3 288 64.2 292.4 62.8 298.4L20.2 479.1C17.5 490.5 30 499.4 40.5 494.4L480.5 282.4C492 276.9 492 235.1 480.5 229.6Z"/></svg>',
    traLoi: '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v5"/></svg>',
    chep: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    thuHoi: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
    xoa: '<svg viewBox="0 0 24 24"><path d="M4.2 6.9h15.6"/><path d="M9.6 6.9V5.4a1.4 1.4 0 0 1 1.4-1.4h2a1.4 1.4 0 0 1 1.4 1.4v1.5"/><path d="M6.4 6.9l.85 12.1a1.8 1.8 0 0 0 1.8 1.7h6a1.8 1.8 0 0 0 1.8-1.7l.85-12.1"/></svg>',
    tim: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    anh: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.7"/><path d="M4 17l4.6-4.4a1.5 1.5 0 0 1 2 0L15 17l2-1.8a1.5 1.5 0 0 1 2 0l1.5 1.3"/></svg>'
  };

  // ---------- hộp nổi dùng chung (một bộ cho cả trang) ----------
  var POP = {}, DANG = null;   // DANG = khuôn đang giữ hộp nổi
  function pop(ten, cls) {
    if (!POP[ten]) { var d = document.createElement('div'); d.className = 'cu-pop ' + cls; d.hidden = true; document.body.appendChild(d); POP[ten] = d; }
    return POP[ten];
  }
  function datCanh(el, x, y) {
    var w = el.offsetWidth, h = el.offsetHeight, W = document.documentElement.clientWidth, H = window.innerHeight;
    el.style.left = Math.round(Math.max(8, Math.min(x, W - w - 8))) + 'px';
    el.style.top = Math.round(Math.max(8, Math.min(y, H - h - 8))) + 'px';
  }
  function dongHet() {
    ['chon', 'menu', 'khay', 'goi', 'chon1', 'khay2'].forEach(function (k) { if (POP[k]) POP[k].hidden = true; });
    dongBang(); dongHd();
    document.querySelectorAll('.cu-cong.mo').forEach(function (x) { x.classList.remove('mo'); });
  }
  function coMo() {
    return ['chon', 'menu', 'khay', 'goi', 'chon1', 'khay2'].some(function (k) { return POP[k] && !POP[k].hidden; }) || !!BANG || !!HD;
  }
  var BANG = null, HD = null;
  function dongBang() { if (BANG) { BANG.nen.remove(); BANG.el.remove(); BANG = null; } }
  function dongHd() { if (HD) { HD.remove(); HD = null; } }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && coMo()) { dongHet(); e.stopPropagation(); e.preventDefault(); }
  }, true);
  document.addEventListener('pointerdown', function (e) {
    var t = e.target;
    if (POP.chon && !POP.chon.hidden && !t.closest('.cu-pop.cu-chon') && !t.closest('[data-cu="lk"]')) POP.chon.hidden = true;
    if (POP.menu && !POP.menu.hidden && !t.closest('.cu-pop.cu-menu') && !t.closest('[data-cu="them"]')) { POP.menu.hidden = true; document.querySelectorAll('.cu-cong.mo').forEach(function (x) { x.classList.remove('mo'); }); }
    if (POP.khay && !POP.khay.hidden && !t.closest('.cu-pop.cu-khay') && !t.closest('[data-cu="khay"]')) POP.khay.hidden = true;
    if (POP.goi && !POP.goi.hidden && !t.closest('.cu-pop.cu-goi')) POP.goi.hidden = true;
    if (POP.chon1 && !POP.chon1.hidden && !t.closest('.cu-pop.cu-chon.mot') && !(NUT1 && NUT1.nut.contains(t))) POP.chon1.hidden = true;
    if (POP.khay2 && !POP.khay2.hidden && !t.closest('.cu-pop') && !(KHAY2.neo && KHAY2.neo.contains(t))) POP.khay2.hidden = true;
  }, true);
  window.addEventListener('resize', function () { if (POP.chon) POP.chon.hidden = true; if (POP.menu) POP.menu.hidden = true; });

  // ⭐ v1.206.0 — xem ảnh to (trang không tự lo o.xemAnh): nền tối phủ màn, bấm đâu cũng đóng, Esc đóng.
  function xemAnhTo(url) {
    if (!url) return;
    var x = document.createElement('div'); x.className = 'cu-xem';
    x.innerHTML = '<img src="' + esc(url) + '" alt="Ảnh"><button type="button" aria-label="Đóng">×</button>';
    var dong = function () { x.remove(); document.removeEventListener('keydown', phim, true); };
    var phim = function (e) { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); dong(); } };
    x.onclick = dong; document.addEventListener('keydown', phim, true);
    document.body.appendChild(x);
  }

  // ⭐ v1.190.0 — thầy: MỖI lần thả, phía trên nút thả "nổ tung" ra vài hình cảm xúc đó.
  // ⭐ v1.191.0 — thầy: 15 hình, to nhỏ khác nhau, TỪ BÉ THÀNH TO tại MỘT điểm rồi BUNG RA XUNG QUANH (đủ 360°).
  //   Lớp nổ gắn vào <body> (position:fixed) để không bị khung chat cắt và không vướng lần vẽ lại khung.
  function noTung(neo, k) {
    var c = CX_E[k]; if (!c || !neo.animate) return;
    try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (x) {}
    var r = neo.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top - 6, SO = 15;
    for (var i = 0; i < SO; i++) {
      var im = document.createElement('img');
      im.src = urlEmoji(c.e); im.alt = ''; im.className = 'cu-no';
      var co = 12 + Math.pow(Math.random(), 1.6) * 28;                       // 12–40px, nhiều hình nhỏ, ít hình to
      im.style.cssText = 'left:' + (x0 - co / 2) + 'px;top:' + (y0 - co / 2) + 'px;width:' + co + 'px;height:' + co + 'px';
      document.body.appendChild(im);
      var goc = (i / SO) * 2 * Math.PI + (Math.random() - .5) * (2 * Math.PI / SO);   // rải đều quanh một vòng
      var xa = 30 + Math.random() * 45, dx = Math.cos(goc) * xa, dy = Math.sin(goc) * xa;
      var xoay = Math.random() * 70 - 35;
      var a = im.animate([
        { transform: 'translate(0,0) scale(.05) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + dx * .75 + 'px,' + dy * .75 + 'px) scale(1) rotate(' + xoay * .6 + 'deg)', opacity: 1, offset: .45 },
        { transform: 'translate(' + dx * 1.15 + 'px,' + (dy * 1.15 - 18) + 'px) scale(.85) rotate(' + xoay + 'deg)', opacity: 0 }
      ], { duration: 800 + Math.random() * 400, easing: 'cubic-bezier(.15,.85,.35,1)', fill: 'forwards' });
      a.onfinish = (function (el) { return function () { el.remove(); }; })(im);
      setTimeout((function (el) { return function () { if (el.isConnected) el.remove(); }; })(im), 2000);
    }
  }

  // bảng "ai thả gì" — 2 cột (dùng chung: chat + bài đăng + bình luận)
  // ⭐ v1.207.0 — thầy: bấm viên cảm xúc ⇒ bảng NHỎ hiện NGAY TRÊN dòng tin + ô tim đó (không ra giữa màn).
  //   neo = {hang: phần tử dòng tin, nut: viên cảm xúc}; không có neo ⇒ giữa màn như cũ (bài đăng myNetwork).
  function moBangCx(cxMap, av, khoaToi, tab, neo) {
    dongBang(); anTip();
    var nen = document.createElement('div'); nen.className = 'cu-nen-mo' + (neo ? ' trong' : '');
    var el = document.createElement('div'); el.className = 'cu-pop cu-bang' + (neo ? ' neo' : '');
    document.body.appendChild(nen); document.body.appendChild(el);
    BANG = { nen: nen, el: el };
    nen.onclick = dongBang;
    function ve() {
      var d = demCx(cxMap), loai = Object.keys(d.theo).sort(function (a, b) { return d.theo[b] - d.theo[a]; });
      if (tab !== 'all' && !d.theo[tab]) tab = 'all';
      var ng = d.nguoi.filter(function (x) { return tab === 'all' || x.n[tab]; });
      ng.sort(function (a, b) { return (tab === 'all' ? b.tong - a.tong : b.n[tab] - a.n[tab]); });
      el.innerHTML = '<div class="dau">Cảm xúc<button type="button" data-dong aria-label="Đóng">×</button></div>' +
        (d.tong ? '<div class="hai"><div class="trai"><button type="button" data-tab="all" aria-pressed="' + (tab === 'all') + '">Tất cả<b>' + d.tong + '</b></button>' +
          loai.map(function (k) { return '<button type="button" data-tab="' + k + '" aria-pressed="' + (tab === k) + '" title="' + CX_E[k].ten + '">' + imgCx(k) + '<b>' + d.theo[k] + '</b></button>'; }).join('') +
          '</div><div class="phai">' + ng.map(function (x) {
            var ks = tab === 'all' ? KINDS.filter(function (k) { return x.n[k]; }) : [tab];
            var gia = { ten: x.ten, ma: x.khoa, vaiTro: x.khoa === 'GV' ? 'gv' : 'hs' };
            return '<div class="cu-ai"><div class="cu-av">' + (av ? av(gia, 0) : '') + '</div><span class="n">' + esc(x.khoa === khoaToi ? (x.ten + ' (em)') : x.ten) + '</span><span class="ds">' +
              ks.map(function (k) { return '<span>' + imgCx(k) + x.n[k] + '</span>'; }).join('') + '</span></div>';
          }).join('') + '</div></div>' : '<p style="padding:14px;color:var(--cu-phu)">Chưa có ai thả cảm xúc.</p>');
      el.querySelector('[data-dong]').onclick = dongBang;
      el.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { tab = b.getAttribute('data-tab'); ve(); }; });
      if (neo) datCanhBang(el, neo);
    }
    ve();
  }
  function datCanhBang(el, neo) {
    var rh = (neo.hang || neo.nut).getBoundingClientRect(), rn = (neo.nut || neo.hang).getBoundingClientRect();
    var h = el.offsetHeight, top = rh.top - h - 6;
    if (top < 8) top = Math.min(rn.bottom + 6, window.innerHeight - h - 8);   // trên không đủ chỗ ⇒ xuống dưới viên
    datCanh(el, rn.right - el.offsetWidth + 8, top);
  }

  // ⭐ v1.207.0 — thầy: rê chuột vào viên cảm xúc (hình nào, số nào cũng vậy) ⇒ hiện NGAY ô nhỏ ghi ai đã thả gì
  //   (thay chữ tên cảm xúc của trình duyệt). Một ô dùng chung cả trang, gắn vào body.
  var TIP = null;
  function anTip() { if (TIP) TIP.hidden = true; }
  function hienTip(nut, cxMap, khoaToi) {
    var d = demCx(cxMap); if (!d.tong) return anTip();
    var ng = d.nguoi.slice().sort(function (a, b) { return b.luc - a.luc; }), TOI_DA = 12;
    hienTipHtml(nut, ng.slice(0, TOI_DA).map(function (x) {
      return '<div class="d"><span class="n">' + esc(x.khoa === khoaToi ? x.ten + ' (em)' : x.ten) + '</span><span class="e">' +
        KINDS.filter(function (k) { return x.n[k]; }).map(function (k) { return '<img src="' + urlEmoji(CX_E[k].e) + '" alt="">' + (x.n[k] > 1 ? '<b>' + x.n[k] + '</b>' : ''); }).join('') + '</span></div>';
    }).join('') + (ng.length > TOI_DA ? '<div class="them">và ' + (ng.length - TOI_DA) + ' người khác</div>' : ''));
  }
  function hienTipHtml(nut, html, lop) {
    if (!TIP) { TIP = document.createElement('div'); document.body.appendChild(TIP); }
    TIP.className = 'cu-pop cu-tip' + (lop ? ' ' + lop : '');
    TIP.innerHTML = html; TIP.hidden = false;
    var r = nut.getBoundingClientRect();
    datCanh(TIP, r.left + r.width / 2 - TIP.offsetWidth / 2, r.top - TIP.offsetHeight - 6 < 8 ? r.bottom + 6 : r.top - TIP.offsetHeight - 6);
  }

  // HTML khay emoji / sticker (dùng chung: ô chat + ô bình luận / đăng bài). st = {tab, goi}; coStk = có tab Sticker.
  function htmlKhay(st, coStk) {
    var h;
    if (st.tab === 'emoji' || !coStk) {
      var gd = []; try { gd = JSON.parse(localStorage.getItem('cu_ganday') || '[]').filter(function (x) { return EMOJI[x]; }); } catch (e) {}
      var luoi = function (ds) { return '<div class="luoi">' + ds.map(function (ma) { return '<button type="button" data-e="' + ma + '" title="' + esc(EMOJI[ma]) + '" aria-label="' + esc(EMOJI[ma]) + '"><img src="' + urlEmoji(ma) + '" alt="" loading="lazy" draggable="false"></button>'; }).join('') + '</div>'; };
      h = (gd.length ? '<div class="nhom">Gần đây</div>' + luoi(gd) : '') + NHOM_EMOJI.map(function (n) { return '<div class="nhom">' + n.ten + '</div>' + luoi(n.ds); }).join('');
    } else {
      var g = STICKER.filter(function (x) { return x.id === st.goi; })[0] || STICKER[0];
      h = '<div class="bo">' + STICKER.map(function (x) { var d = timStk(x.id + ':' + x.ds[0].ma); return '<button type="button" data-g="' + x.id + '" aria-pressed="' + (x === g) + '"><img src="' + esc(d.url) + '" alt="" loading="lazy">' + esc(x.ten) + '</button>'; }).join('') + '</div>' +
        '<div class="stk">' + g.ds.map(function (it) { var d = timStk(g.id + ':' + it.ma); return '<button type="button" data-s="' + g.id + ':' + it.ma + '" title="' + esc(it.chu) + '"><img src="' + esc(d.url) + '" alt="' + esc(it.chu) + '" loading="lazy" draggable="false">' + (d.coChu ? esc(it.chu) : '') + '</button>'; }).join('') + '</div>' +
        '<div class="ghi">' + esc(g.ghi) + '</div>';
    }
    return (coStk ? '<div class="tab"><button type="button" data-t="emoji" aria-pressed="' + (st.tab === 'emoji') + '">Emoji</button><button type="button" data-t="stk" aria-pressed="' + (st.tab === 'stk') + '">Sticker</button></div>' : '<div class="tab"><button type="button" data-t="emoji" aria-pressed="true">Emoji</button></div>') +
      '<div class="than">' + h + '</div>';
  }
  function nhoGanDay(ma) { try { var g = JSON.parse(localStorage.getItem('cu_ganday') || '[]'); g = [ma].concat(g.filter(function (x) { return x !== ma; })).slice(0, 16); localStorage.setItem('cu_ganday', JSON.stringify(g)); } catch (e) {} }

  // ============================================================
  // ⭐ v1.199.0 — MẢNH DÙNG CHUNG ngoài chat (bài đăng + bình luận myNetwork): thầy chốt MỖI NGƯỜI MỖI LOẠI TỐI ĐA 1.
  //   Ô cảm xúc cùng khuôn với chat: cx[khoa] = {ten, luc, n:{tim:1, haha:1}, l} (luật kho chặn n > 1).
  // ============================================================
  function kyCx(k) { var c = CX_E[k]; return c ? kyTuEmoji(c.e) : ''; }
  // Viên: tối đa 3 loại GẦN NHẤT (+ tổng nếu coSo). '' nếu chưa ai thả.
  function cumCxHtml(cxMap, coSo) {
    var d = demCx(cxMap); if (!d.tong) return '';
    var dau = [];
    d.nguoi.slice().sort(function (a, b) { return b.luc - a.luc; }).forEach(function (x) { if (x.l && x.n[x.l] && dau.indexOf(x.l) < 0) dau.push(x.l); });
    d.nguoi.slice().sort(function (a, b) { return b.luc - a.luc; }).forEach(function (x) { Object.keys(x.n).forEach(function (k) { if (x.n[k] > 0 && dau.indexOf(k) < 0) dau.push(k); }); });
    return '<span class="cu-vien">' + dau.filter(function (k) { return CX_E[k]; }).slice(0, 3).map(function (k) { return imgCx(k); }).join('') + (coSo ? '<em>' + d.tong + '</em>' : '') + '</span>';
  }
  // Hình nút thả: cảm xúc em thả gần nhất, chưa thả thì null (trang tự vẽ tim viền của trang).
  function nutCxHinh(cxMap, khoa) { var v = cxChuan((cxMap || {})[khoa]); return v ? imgCx(v.l) : null; }
  function tenCx(k) { return (CX_E[k] || {}).ten || ''; }
  // Gắn nút thả cảm xúc (bài / bình luận). c = { lay(): cxMap, khoa, ten, dat(giaTri|null, loai, them) -> Promise, macDinh: 'tim' }
  //   bấm = bật/tắt macDinh · giữ (điện thoại) hoặc rê 0,4 giây (máy tính) = bảng 6 cảm xúc, bấm loại nào bật/tắt loại đó rồi đóng bảng.
  var NUT1 = null;
  function doiMot(c, k, neo) {
    var cu = cxChuan((c.lay() || {})[c.khoa]) || { ten: c.ten, luc: 0, n: {}, l: '' };
    var n = Object.assign({}, cu.n), them = !n[k];
    if (them) n[k] = 1; else delete n[k];
    var ks = Object.keys(n);
    var gt = ks.length ? { ten: String(c.ten || cu.ten || '?').slice(0, 60), luc: window.gioChuan ? window.gioChuan() : Date.now(), n: n, l: them ? k : (n[cu.l] ? cu.l : ks[ks.length - 1]) } : null;
    if (them && neo && neo.isConnected) noTung(neo, k);
    return Promise.resolve(c.dat(gt, k, them));
  }
  // ⛔ hộp nổi tạo LƯỜI (lần đầu dùng) — file này có thể nạp trước <body> xong, pop() lúc nạp sẽ hỏng
  function popChon1() {
    var p = pop('chon1', 'cu-chon mot');
    if (!p._gan) {
      p._gan = true;
      p.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-k]'); if (!b || b.disabled || !NUT1) return;
        var k = b.getAttribute('data-k'), c = NUT1.c, nut = NUT1.nut;
        this.hidden = true;
        if (k) doiMot(c, k, nut)['catch'](function () {});
        else Promise.resolve(c.dat(null, '', false))['catch'](function () {});
      });
    }
    return p;
  }
  function moChon1(nut, c) {
    NUT1 = { nut: nut, c: c };
    var p = popChon1(), v = cxChuan((c.lay() || {})[c.khoa]);
    p.innerHTML = CX.map(function (x) { return '<button type="button" data-k="' + x.k + '" title="' + x.ten + '" aria-label="' + x.ten + '"' + (v && v.n[x.k] ? ' class="da"' : '') + '>' + imgCx(x.k) + '</button>'; }).join('') +
      '<button type="button" class="xo" data-k="" title="Gỡ hết cảm xúc em đã thả" aria-label="Gỡ hết cảm xúc em đã thả"' + (v ? '' : ' disabled') + '>×</button>';
    p.hidden = false;
    var r = nut.getBoundingClientRect();
    datCanh(p, r.left - 6, r.top - p.offsetHeight - 6 < 8 ? r.bottom + 6 : r.top - p.offsetHeight - 6);
  }
  function ganNutCx(nut, c) {
    if (!nut || nut._cuGan) return; nut._cuGan = true;
    var hen = null, henRe = null;
    nut.addEventListener('click', function (e) {
      e.preventDefault();
      if (nut._daGiu) { nut._daGiu = false; return; }
      if (POP.chon1) POP.chon1.hidden = true;
      doiMot(c, c.macDinh || 'tim', nut)['catch'](function () {});
    });
    nut.addEventListener('pointerdown', function () { clearTimeout(hen); hen = setTimeout(function () { nut._daGiu = true; moChon1(nut, c); }, 420); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { nut.addEventListener(ev, function () { clearTimeout(hen); }); });
    nut.addEventListener('pointerover', function (e) { if (e.pointerType === 'touch') return; clearTimeout(henRe); henRe = setTimeout(function () { if (nut.isConnected) moChon1(nut, c); }, 400); });
    nut.addEventListener('pointerout', function () { clearTimeout(henRe); });
    nut.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  // Khay emoji/sticker cho ô chữ thường (textarea bình luận / đăng bài). cb = { emoji(ma, kyTu), sticker?(id) }
  var KHAY2 = { tab: 'emoji', goi: 'lop', cb: null, neo: null };
  function popKhay2() {
    var k = pop('khay2', 'cu-khay');
    if (!k._gan) {
      k._gan = true;
      k.addEventListener('pointerdown', function (e) { if (e.target.closest('[data-e]')) e.preventDefault(); });
      k.addEventListener('click', function (e) {
        var cb = KHAY2.cb; if (!cb) return;
        var t = e.target.closest('[data-t]'); if (t) { KHAY2.tab = t.getAttribute('data-t'); this.innerHTML = htmlKhay(KHAY2, !!cb.sticker); return; }
        var g = e.target.closest('[data-g]'); if (g) { KHAY2.goi = g.getAttribute('data-g'); this.innerHTML = htmlKhay(KHAY2, !!cb.sticker); return; }
        var s = e.target.closest('[data-s]'); if (s) { this.hidden = true; if (cb.sticker) cb.sticker(s.getAttribute('data-s')); return; }
        var x = e.target.closest('[data-e]'); if (x) { var ma = x.getAttribute('data-e'); nhoGanDay(ma); cb.emoji(ma, kyTuEmoji(ma)); }
      });
    }
    return k;
  }
  function moKhay(neo, cb) {
    var k = popKhay2();
    if (!k.hidden && KHAY2.neo === neo) { k.hidden = true; return; }
    KHAY2.cb = cb; KHAY2.neo = neo;
    if (!cb.sticker) KHAY2.tab = 'emoji';
    k.innerHTML = htmlKhay(KHAY2, !!cb.sticker); k.hidden = false;
    var r = neo.getBoundingClientRect();
    datCanh(k, r.left - 10, r.top - k.offsetHeight - 6 < 8 ? r.bottom + 6 : r.top - k.offsetHeight - 6);
  }
  // Chèn chữ vào textarea ngay chỗ con trỏ (emoji Unicode ⇒ lúc hiện sẽ thành hình 3D nhờ thayEmoji)
  function chenVaoO(ta, chu) {
    var a = ta.selectionStart == null ? ta.value.length : ta.selectionStart, b = ta.selectionEnd == null ? a : ta.selectionEnd;
    ta.focus();
    try { ta.setRangeText(chu, a, b, 'end'); } catch (e) { ta.value = ta.value.slice(0, a) + chu + ta.value.slice(b); }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  // Sticker: HTML hình (bình luận). '' nếu mã lạ.
  function stickerHtml(id) { var d = timStk(id); return d ? '<img class="cu-stk-anh" src="' + esc(d.url) + '" alt="' + esc(d.it.chu) + '" title="' + esc(d.it.chu) + '" loading="lazy" draggable="false">' + (d.coChu ? '<div class="cu-stk-chu">' + esc(d.it.chu) + '</div>' : '') : ''; }


  // ============================================================
  function tao(o) {
    var ui = { o: o, ds: [], khoaChat: false };
    var khung = o.khung, CHO = {}, HEN = {};
    khung.classList.add('cu-khung');   // ⭐ v1.192.0 — nền xám rất nhạt như bản mẫu (bong bóng trắng không lẫn nền)
    khung.style.overflowX = 'hidden';   // nút trả lời/⋯ nằm sát bong bóng không được đẻ thanh cuộn ngang   // CHO[id] = giá trị cx CỦA EM đang chờ ghi (đè lên bản kho)
    var reN = reNhac([]);
    var toiK = function () { return String((o.toi && o.toi.khoa) || ''); };
    var cuaToi = function (t) { return !!(o.laCuaToi && o.laCuaToi(t)); };
    function loi(x) { if (o.loi) o.loi(x); }
    function tim(id) { for (var i = 0; i < ui.ds.length; i++) if (ui.ds[i].id === id) return ui.ds[i]; return null; }
    function cxCuaToi(t) { return cxChuan((t.cx || {})[toiK()]); }

    // ---------- vẽ danh sách ----------
    function veTin(t, i, ds) {
      var toi = cuaToi(t), truoc = ds[i - 1];
      var ngayMoi = !truoc || ngay(truoc.luc) !== ngay(t.luc) || (t.luc - truoc.luc) >= NHIP_MOI;
      var cungNhom = !ngayMoi && truoc && (truoc.ma || truoc.ten) === (t.ma || t.ten) && !!(o.laCuaToi && o.laCuaToi(truoc)) === toi && (t.luc - truoc.luc) < 5 * 60e3;
      var h = ngayMoi ? '<div class="cu-ngay">' + esc(mocNhip(t.luc)) + '</div>' : '';
      var ten = (!toi && !cungNhom && o.hienTen !== false) ? '<div class="cu-ten">' + esc(t.ten) + (o.nhan ? o.nhan(t) : '') + '</div>' : '';
      var than;
      if (t.thuHoi) than = '<div class="cu-bong thuhoi">' + ten + 'Tin nhắn đã bị thu hồi' + veThuHoiGoc(t) + '<span class="cu-gio">' + gio(t.luc) + '</span></div>';
      else if (t.sticker && timStk(t.sticker)) {
        var s = timStk(t.sticker);
        than = ten +
          '<div class="cu-bong stk"><img src="' + esc(s.url) + '" alt="' + esc(s.it.chu) + '" title="' + esc(s.it.chu) + '" loading="lazy" draggable="false">' +
          (s.coChu ? '<div class="cu-stk-chu">' + esc(s.it.chu) + '</div>' : '') + '<span class="cu-gio">' + gio(t.luc) + '</span></div>';
      } else {
        var q = t.q && t.q.id ? '<button type="button" class="cu-trich" data-cu="toi" data-id="' + esc(t.q.id) + '"><b>' + esc(t.q.ten || '') + '</b><span>' + giau(t.q.chu, reN, true) + '</span></button>' : '';
        // ⭐ v1.198.0 — tin ẢNH (myNetwork): ảnh nằm trong bong bóng, bấm để xem to (o.xemAnh)
        var anh = t.hinh ? '<button type="button" class="cu-hinh" data-cu="anh" aria-label="Xem ảnh"><img src="' + esc(t.hinh) + '" alt="Ảnh" loading="lazy" draggable="false"></button>' : '';
        than = '<div class="cu-bong' + (t.vaiTro === 'gv' ? ' thay' : '') + (t.hinh && !t.chu ? ' chianh' : '') + '">' + ten + q + anh + (t.chu ? giau(t.chu, reN) : '') + '<span class="cu-gio">' + gio(t.luc) + '</span></div>';
      }
      var cong = t.thuHoi ? '' : '<div class="cu-cong"><button type="button" data-cu="tra" title="Trả lời" aria-label="Trả lời">' + IC.trich + '</button><button type="button" data-cu="them" title="Thêm" aria-label="Thêm">' + IC.ba + '</button></div>';
      return h + '<div class="cu-hang' + (toi ? ' toi' : '') + (cungNhom ? '' : ' dau') + '">' +
        (toi ? '' : '<div class="cu-av">' + (cungNhom ? '' : (o.av ? o.av(t, i) : '')) + '</div>') +
        // ⭐ v1.188.0 — coCx: tin đã có cảm xúc (giãn ra chừa chỗ viên cảm xúc); cuoi: tin mới nhất (điện thoại hiện nút tim ở đây).
        '<div class="cu-w' + (coThaCx(t) && demCx(t.cx).tong ? ' coCx' : '') + (i === ds.length - 1 ? ' cuoi' : '') + '" data-i="' + i + '" data-id="' + esc(t.id || '') + '">' + than + (coThaCx(t) ? veCum(t) : '') + cong + '</div></div>' +
        (o.sauTin ? (o.sauTin(t, i, ds) || '') : '');
    }
    /* ⭐ v1.206.0 — thầy chốt: dashboard (o.docThuHoi) xem được NỘI DUNG tin đã thu hồi, nằm ngay dưới dòng
       "Tin nhắn đã bị thu hồi", nghiêng như dòng đó. TH[id]: undefined = chưa hỏi kho · 'cho' = đang đọc · null = không có bản chép. */
    var TH = {};
    function veThuHoiGoc(t) {
      if (!o.docThuHoi || !t.id) return '';
      var g = TH[t.id];
      if (g === undefined) { TH[t.id] = 'cho'; hoiThuHoi(t); return ''; }
      if (!g || g === 'cho') return '';
      var s = g.sticker ? timStk(g.sticker) : null;
      var h = s ? '<img class="cu-th-stk" src="' + esc(s.url) + '" alt="' + esc(s.it.chu) + '" title="' + esc(s.it.chu) + '" loading="lazy" draggable="false">' : '';
      if (g.hinh) h += '<button type="button" class="cu-hinh cu-th-anh" data-cu="anhth" data-url="' + esc(g.hinh) + '" aria-label="Xem ảnh đã thu hồi"><img src="' + esc(g.hinh) + '" alt="Ảnh" loading="lazy" draggable="false"></button>';
      if (g.chu && !s) h += giau(g.chu, reN);
      return h ? '<div class="cu-th-goc">' + h + '</div>' : '';
    }
    var henTH = null;
    function hoiThuHoi(t) {
      Promise.resolve(o.docThuHoi(t)).then(function (g) { TH[t.id] = g || null; }, function () { TH[t.id] = null; }).then(function () {
        clearTimeout(henTH); henTH = setTimeout(veLai, 30);   // nhiều tin cùng về ⇒ vẽ lại MỘT lần
      });
    }
    // ⭐ v1.209.0 — thầy: STICKER không thả cảm xúc, chỉ tin chữ/ảnh (tin chỉ có emoji vẫn thả được).
    function coThaCx(t) { return !!t && !t.thuHoi && !(t.sticker && timStk(t.sticker)); }
    function veCum(t) {
      var d = demCx(t.cx), toi = cxCuaToi(t);
      // ⭐ v1.195.0 — thầy: viên cảm xúc chỉ hiện TỐI ĐA 3 loại GẦN NHẤT (loại khác vẫn tính trong số tổng + bảng "ai thả gì").
      //   Kho chỉ giữ lúc thả cuối + loại cuối của MỖI NGƯỜI ⇒ xếp người theo lúc thả mới nhất, lấy loại cuối của họ trước,
      //   rồi tới các loại khác của họ (nhiều lần hơn đứng trước).
      var dau = [];
      d.nguoi.slice().sort(function (a, b) { return b.luc - a.luc; }).forEach(function (x) {
        if (x.l && x.n[x.l] && dau.indexOf(x.l) < 0) dau.push(x.l);
      });
      d.nguoi.slice().sort(function (a, b) { return b.luc - a.luc; }).forEach(function (x) {
        Object.keys(x.n).filter(function (k) { return x.n[k] > 0; }).sort(function (a, b) { return x.n[b] - x.n[a]; })
          .forEach(function (k) { if (dau.indexOf(k) < 0) dau.push(k); });
      });
      dau = dau.filter(function (k) { return CX_E[k]; }).slice(0, 3);
      return '<div class="cu-cx">' + (d.tong ? '<button type="button" class="cs" data-cu="cs" aria-label="Xem ai đã thả cảm xúc">' + dau.map(function (k) { return imgCx(k).replace(/ title="[^"]*"/, ''); }).join('') + '<em>' + d.tong + '</em></button>' : '') +
        '<button type="button" class="lk" data-cu="lk" aria-label="Thả cảm xúc" title="Chạm: thả thêm · giữ: chọn cảm xúc">' + (toi ? imgCx(toi.l) : IC.timVien) + '</button></div>';
    }
    ui.ve = function (ds, dau) {
      ui.ds = (ds || []).map(function (t) {
        if (t && t.id && CHO[t.id] !== undefined) { var x = Object.assign({}, t); x.cx = Object.assign({}, t.cx || {}); if (CHO[t.id]) x.cx[toiK()] = CHO[t.id]; else delete x.cx[toiK()]; return x; }
        return t;
      });
      var ten = {}; ui.ds.forEach(function (t) { if (t.ten) ten[t.ten] = 1; });
      reN = reNhac(Object.keys(ten).concat(o.dsNhac ? o.dsNhac() : []));
      anTip();   // v1.207.0 — viên dưới chuột sắp bị vẽ lại
      var sat = (khung.scrollHeight - khung.scrollTop - khung.clientHeight) < 60 || !khung._cuDaVe;
      var cuon = khung.scrollTop;
      khung.innerHTML = (dau || '') + (ui.ds.length ? '<div class="cu-ds">' + ui.ds.map(veTin).join('') + (o.ghiXem ? '<div class="cu-dx" hidden></div>' : '') + '</div>'
        : '<div class="chat-cho">' + (o.trong || 'Chưa có tin nhắn nào.') + '</div>');
      var kieu = khung.style.scrollBehavior; khung.style.scrollBehavior = 'auto';
      khung.scrollTop = sat ? khung.scrollHeight : cuon;
      khung.style.scrollBehavior = kieu;
      khung._cuDaVe = true;
      khung._cuDay = sat;
      veXem(); henThuXem();   // v1.210.0
    };
    // ⭐ v1.198.0 — ảnh trong tin tải XONG sau lúc vẽ làm khung cao lên ⇒ đang ở đáy thì bám đáy tiếp (khỏi hụt tin cuối)
    khung.addEventListener('load', function (e) {
      if (e.target && e.target.tagName === 'IMG' && khung._cuDay) { var kieu = khung.style.scrollBehavior; khung.style.scrollBehavior = 'auto'; khung.scrollTop = khung.scrollHeight; khung.style.scrollBehavior = kieu; }
    }, true);
    khung.addEventListener('scroll', function () { khung._cuDay = (khung.scrollHeight - khung.scrollTop - khung.clientHeight) < 60; if (khung._cuDay) henThuXem(); });

    /* ⭐ v1.210.0 — "ĐÃ XEM" kiểu Messenger (thầy chốt kiểu A, mẫu D:\OTHERS\CLAUDE\myLesson - thiet ke da xem\mau-v2):
       hàng avatar nhỏ sát đáy khung, CĂN PHẢI, chỉ dưới TIN CUỐI, nằm dưới viên cảm xúc. Không tính người gửi tin cuối + chính mình.
       Rê chuột / chạm ⇒ ô ĐÃ XEM · CHƯA XEM. Trang truyền o.ghiXem(luc) (ghi ô của mình) và gọi ui.datXem(map) khi kho đổi. */
    var XEM = {}, henXem = null, daGhiId = '', khungHien = true;
    try { new IntersectionObserver(function (es) { khungHien = es[es.length - 1].intersectionRatio >= 0.3; if (khungHien) henThuXem(); }, { threshold: [0, 0.3, 1] }).observe(khung); } catch (e) {}
    function tinCuoi() { for (var i = ui.ds.length - 1; i >= 0; i--) if (ui.ds[i] && ui.ds[i].id) return ui.ds[i]; return null; }
    function khoaGui(t) { return t.vaiTro === 'gv' ? 'GV' : String(t.ma || ''); }
    function dsDaXem() {
      var t = tinCuoi(); if (!t) return [];
      var bo = khoaGui(t), toi = toiK();
      return Object.keys(XEM).filter(function (k) { var v = XEM[k]; return k !== bo && k !== toi && v && Number(v.luc) >= t.luc; })
        .map(function (k) { return { khoa: k, ten: String(XEM[k].ten || '?'), luc: Number(XEM[k].luc) }; })
        .sort(function (a, b) { return a.luc - b.luc; });
    }
    function avNho(x) { return '<span class="x">' + (o.av ? o.av({ ten: x.ten, ma: x.khoa, vaiTro: x.khoa === 'GV' ? 'gv' : 'hs' }, 0) : '') + '</span>'; }
    function veXem() {
      var hop = khung.querySelector('.cu-dx'); if (!hop) return;
      var ds = dsDaXem(), day = khung._cuDay;
      if (!ds.length) { hop.hidden = true; hop.innerHTML = ''; return; }
      var TOI_DA = 10, hien = ds.length > TOI_DA ? TOI_DA - 1 : ds.length;
      hop.innerHTML = ds.slice(0, hien).map(avNho).join('') + (ds.length > hien ? '<span class="them">+' + (ds.length - hien) + '</span>' : '');
      hop.setAttribute('aria-label', 'Đã xem: ' + ds.length + ' người');
      hop.hidden = false;
      if (day) { var kieu = khung.style.scrollBehavior; khung.style.scrollBehavior = 'auto'; khung.scrollTop = khung.scrollHeight; khung.style.scrollBehavior = kieu; }
    }
    function htmlTipXem() {
      var ds = dsDaXem(), t = tinCuoi(); if (!t) return '';
      var kd = function (x) { return khongDau(x).trim(); };
      var bo = {}; ds.forEach(function (x) { bo[kd(x.ten)] = 1; });
      bo[kd(t.ten)] = 1; if (o.toi && o.toi.ten) bo[kd(o.toi.ten)] = 1;
      var chua = [], gap = {};
      (o.dsNhac ? o.dsNhac() : []).forEach(function (n) { var k = kd(n); if (n && !bo[k] && !gap[k]) { gap[k] = 1; chua.push(n); } });
      var dong = function (x) { return '<span>' + avNho(x) + esc(x.ten) + '</span>'; };
      return '<h4>Đã xem · ' + ds.length + '</h4><div class="ds">' + ds.map(dong).join('') + '</div>' +
        (chua.length ? '<h4>Chưa xem · ' + chua.length + '</h4><div class="ds chua">' + chua.map(function (n) { return dong({ ten: n, khoa: '' }); }).join('') + '</div>' : '');
    }
    khung.addEventListener('pointerover', function (e) { var h = e.target.closest('.cu-dx'); if (h && e.pointerType !== 'touch') hienTipHtml(h, htmlTipXem(), 'xem'); });
    khung.addEventListener('pointerout', function (e) { var h = e.target.closest('.cu-dx'); if (h && !h.contains(e.relatedTarget)) anTip(); });
    khung.addEventListener('click', function (e) {   // điện thoại: chạm hàng đã xem ⇒ bật/tắt ô
      var h = e.target.closest('.cu-dx'); if (!h) return;
      if (TIP && !TIP.hidden) anTip(); else hienTipHtml(h, htmlTipXem(), 'xem');
    });
    // ghi "mình đã xem tới tin cuối": tin cuối mới (không phải của mình) + khung đang hiện + trang đang mở + đang ở đáy khung
    function thuGhiXem() {
      henXem = null;
      if (!o.ghiXem || ui.chiXem) return;
      var t = tinCuoi(); if (!t || cuaToi(t) || daGhiId === t.id) return;
      if (document.visibilityState !== 'visible' || !khungHien || !khung.offsetParent || !khung._cuDay) return;
      var cu = XEM[toiK()]; if (cu && Number(cu.luc) >= t.luc) { daGhiId = t.id; return; }
      daGhiId = t.id;
      Promise.resolve(o.ghiXem(t.luc))['catch'](function () { daGhiId = ''; });
    }
    function henThuXem() { if (!o.ghiXem) return; clearTimeout(henXem); henXem = setTimeout(thuGhiXem, 1200); }
    document.addEventListener('visibilitychange', henThuXem);
    window.addEventListener('focus', henThuXem);
    khung.addEventListener('pointerdown', henThuXem);
    ui.datXem = function (map) { XEM = map || {}; veXem(); henThuXem(); };
    function veLai() { ui.ve(ui.ds.map(function (t) { return t; }), dauHienTai()); }
    function dauHienTai() { var c = khung.querySelector('.cu-ds'); var h = ''; if (c) { var n = khung.firstChild; while (n && n !== c) { h += n.outerHTML || ''; n = n.nextSibling; } } return h; }
    function nay(id, k) {
      var b = khung.querySelector('.cu-w[data-id="' + cssEsc(id) + '"] .lk');
      if (b) { b.classList.remove('nay'); void b.offsetWidth; b.classList.add('nay'); if (k) noTung(b, k); }
      return b;
    }
    function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

    // ---------- thả cảm xúc (ghi dồn: bấm liền tay nhiều lần chỉ tốn MỘT lượt ghi) ----------
    function doiCx(t, sua) {
      if (!t || !t.id || !coThaCx(t)) return false;
      if (ui.chiXem) { loi('Đang ở chế độ xem — không thả cảm xúc được.'); return false; }
      var cu = cxCuaToi(t), moi = cu ? { ten: cu.ten, luc: cu.luc, n: Object.assign({}, cu.n), l: cu.l } : { ten: (o.toi && o.toi.ten) || '?', luc: 0, n: {}, l: '' };
      if (sua(moi) === false) return false;
      moi.ten = (o.toi && o.toi.ten) || moi.ten;
      moi.luc = window.gioChuan ? window.gioChuan() : Date.now();
      var trong = !Object.keys(moi.n).some(function (k) { return moi.n[k] > 0; });
      var gt = trong ? null : { ten: String(moi.ten).slice(0, 60), luc: moi.luc, n: moi.n, l: moi.l };
      CHO[t.id] = gt;
      clearTimeout(HEN[t.id]);
      var id = t.id;
      HEN[id] = setTimeout(function () {
        var g = CHO[id], tt = tim(id);
        Promise.resolve(o.datCx(tt || t, g)).then(function () { if (CHO[id] === g) delete CHO[id]; })['catch'](function (e) {
          delete CHO[id]; loi(e);
          if (o.veLaiTuKho) o.veLaiTuKho(); else veLai();
        });
      }, 450);
      veLai();
      return true;
    }
    function them(t, k) {
      return doiCx(t, function (v) {
        if ((v.n[k] || 0) >= TOI_DA_CX) { loi('Mỗi cảm xúc thả tối đa ' + TOI_DA_CX + ' lần.'); return false; }
        v.n[k] = (v.n[k] || 0) + 1; v.l = k;
      });
    }
    function xoaHetCx(t) { return doiCx(t, function (v) { v.n = {}; v.l = ''; }); }

    // bảng chọn 6 cảm xúc (rê chuột / giữ nút tim)
    function moChon(t, neo) {
      DANG = ui; var p = pop('chon', 'cu-chon'), toi = cxCuaToi(t);
      p.innerHTML = CX.map(function (c) { var n = toi && toi.n[c.k] || 0; return '<button type="button" data-k="' + c.k + '" title="' + c.ten + '" aria-label="' + c.ten + '">' + imgCx(c.k) + (n ? '<i' + (n >= TOI_DA_CX ? ' class="day"' : '') + '>' + n + '</i>' : '') + '</button>'; }).join('') +
        '<button type="button" class="xo" data-k="" title="Xoá hết cảm xúc em đã thả" aria-label="Xoá hết cảm xúc em đã thả"' + (toi ? '' : ' disabled') + '>×</button>';
      p._id = t.id; p.hidden = false;
      var r = neo.getBoundingClientRect();
      datCanh(p, r.right - p.offsetWidth + 10, r.top - p.offsetHeight - 6 < 8 ? r.bottom + 6 : r.top - p.offsetHeight - 6);
    }
    // ⛔ v1.198.0 — addEventListener, KHÔNG `.onclick =`: trang có NHIỀU khuôn (hộp chat nổi myNetwork) mà gán onclick thì
    //   khuôn tạo sau ĐÈ mất bộ bấm của khuôn trước ⇒ thanh cảm xúc của hộp cũ bấm không ăn. Mỗi khuôn tự lọc DANG === ui.
    pop('chon', 'cu-chon').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-k]'); if (!b || b.disabled || !DANG) return;
      var u = DANG; if (u !== ui) return;
      var t = tim(this._id); if (!t) return;
      var k = b.getAttribute('data-k');
      // ⭐ v1.190.0 — thầy: chọn xong một cảm xúc là thanh chọn ẨN LUÔN (trước đây mở lại để thả tiếp).
      if (k) { this.hidden = true; if (them(t, k)) nay(t.id, k); }
      else { xoaHetCx(t); this.hidden = true; }
    });


    function moBang(t, tab, nut) { DANG = ui; moBangCx(t.cx, o.av, toiK(), tab, nut ? { hang: nut.closest('.cu-w') || nut, nut: nut } : null); }

    // menu ⋯
    function moMenu(t, neo) {
      DANG = ui; var m = pop('menu', 'cu-menu'), dd = [];
      if (!t.sticker && t.chu) dd.push('<button type="button" data-m="chep">' + IC.chep + 'Sao chép</button>');
      if (!ui.khoaChat && !ui.chiXem) dd.push('<button type="button" data-m="tra">' + IC.traLoi + 'Trả lời</button>');
      if ((cuaToi(t) || o.laThay) && o.thuHoi && !ui.chiXem) dd.push('<button type="button" data-m="thuhoi" class="nguy">' + IC.thuHoi + 'Thu hồi</button>');
      if (o.laThay && o.xoa) dd.push('<button type="button" data-m="xoa" class="nguy">' + IC.xoa + 'Xoá hẳn</button>');
      m.innerHTML = dd.join(''); m._id = t.id; m.hidden = false;
      var r = neo.getBoundingClientRect();
      datCanh(m, cuaToi(t) ? r.right - m.offsetWidth : r.left, r.bottom + 6 + m.offsetHeight > window.innerHeight - 8 ? r.top - m.offsetHeight - 6 : r.bottom + 6);
      var c = neo.closest('.cu-cong'); if (c) c.classList.add('mo');
    }
    function hoi(m, chu, nut, lam) {
      m.innerHTML = '<div class="hoi"><p>' + esc(chu) + '</p><div><button type="button" data-h="0">Thôi</button><button type="button" data-h="1" class="nguy">' + esc(nut) + '</button></div></div>';
      m.querySelector('[data-h="0"]').onclick = function () { m.hidden = true; };
      m.querySelector('[data-h="1"]').onclick = function () { m.hidden = true; lam(); };
    }
    function lamViec(viec, t, m) {
      if (viec === 'chep') {
        var chu = chuThuong(t.chu);
        var ok = function () { loi('Đã sao chép.'); };
        try { navigator.clipboard.writeText(chu).then(ok, function () { loi('Máy chặn sao chép — em bôi đen chữ rồi chép tay nhé.'); }); } catch (e) { loi('Máy chặn sao chép.'); }
      }
      if (viec === 'tra') datTra(t);
      if (viec === 'thuhoi') {
        var lam = function () {
          // v1.206.0 — thầy thu hồi: nhớ sẵn nội dung để hiện ngay dưới "Tin nhắn đã bị thu hồi" (khỏi chờ đọc bản chép)
          if (o.docThuHoi && t.id) TH[t.id] = { chu: t.chu || '', q: t.q || null, sticker: t.sticker || '', hinh: t.hinh || '' };
          Promise.resolve(o.thuHoi(t)).then(function () { if (TRA && TRA.id === t.id) datTra(null); })['catch'](function (e) { if (o.docThuHoi) delete TH[t.id]; loi(e); });
        };
        if (m) hoi(m, 'Thu hồi tin này? Mọi người sẽ thấy "Tin nhắn đã bị thu hồi".', 'Thu hồi', lam); else if (window.confirm('Thu hồi tin này?')) lam();
        return true;
      }
      if (viec === 'xoa') {
        var lamX = function () { Promise.resolve(o.xoa(t))['catch'](loi); };
        if (m) hoi(m, 'Xoá hẳn tin này khỏi phòng chat? Không khôi phục được.', 'Xoá hẳn', lamX); else if (window.confirm('Xoá hẳn tin này?')) lamX();
        return true;
      }
    }
    pop('menu', 'cu-menu').addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b || DANG !== ui) return;
      var t = tim(this._id); if (!t) { this.hidden = true; return; }
      var giu = lamViec(b.getAttribute('data-m'), t, this);
      if (!giu) this.hidden = true;
    });

    // ---------- sự kiện trong khung tin ----------
    var henGiu = null, henRe = null, vuaGiu = false, diem = null;
    khung.addEventListener('click', function (e) {
      if (vuaGiu) { vuaGiu = false; e.preventDefault(); e.stopPropagation(); return; }
      var b = e.target.closest('[data-cu]'); if (!b) return;
      var w = b.closest('.cu-w'), t = w ? ui.ds[+w.getAttribute('data-i')] : null;
      var viec = b.getAttribute('data-cu');
      if (viec === 'toi') {
        var g = khung.querySelector('.cu-w[data-id="' + cssEsc(b.getAttribute('data-id')) + '"]');
        if (!g) { loi('Tin gốc đã cũ — kéo lên để tải thêm tin cũ rồi bấm lại.'); return; }
        g.scrollIntoView({ block: 'center', behavior: 'smooth' }); g.classList.remove('nhay'); void g.offsetWidth; g.classList.add('nhay');
        return;
      }
      if (!t) return;
      if (viec === 'lk') { if (b._daGiu) { b._daGiu = false; return; } if (POP.chon) POP.chon.hidden = true; var tt = cxCuaToi(t), kk = (tt && tt.l) || 'tim'; if (them(t, kk)) nay(t.id, kk); }
      if (viec === 'cs') moBang(t, 'all', b);
      if (viec === 'anh') { if (o.xemAnh) o.xemAnh(t.hinh, t); else xemAnhTo(t.hinh); }
      if (viec === 'anhth') xemAnhTo(b.getAttribute('data-url'));
      if (viec === 'tra') datTra(t);
      if (viec === 'them') moMenu(t, b);
    }, true);
    khung.addEventListener('pointerdown', function (e) {
      var lk = e.target.closest('[data-cu="lk"]');
      if (lk) {
        clearTimeout(henGiu);
        henGiu = setTimeout(function () { lk._daGiu = true; var w = lk.closest('.cu-w'); moChon(ui.ds[+w.getAttribute('data-i')], lk); }, 420);
        return;
      }
      // điện thoại: GIỮ bong bóng 0,45 giây ⇒ tin nổi sáng + tuỳ chọn ngay dưới
      var bong = e.target.closest('.cu-bong');
      if (!bong || e.pointerType !== 'touch' || e.target.closest('a,button:not(.cu-hinh)')) return;
      var w2 = bong.closest('.cu-w'), t2 = ui.ds[+w2.getAttribute('data-i')];
      if (!t2 || t2.thuHoi) return;
      diem = { x: e.clientX, y: e.clientY }; w2.classList.add('giu');
      clearTimeout(henGiu);
      henGiu = setTimeout(function () { vuaGiu = true; w2.classList.remove('giu'); try { if (navigator.vibrate) navigator.vibrate(12); } catch (x) {} moHd(t2, w2); }, 450);
    });
    function huyGiu() { clearTimeout(henGiu); khung.querySelectorAll('.cu-w.giu').forEach(function (x) { x.classList.remove('giu'); }); }
    khung.addEventListener('pointermove', function (e) { if (diem && Math.abs(e.clientX - diem.x) + Math.abs(e.clientY - diem.y) > 10) { huyGiu(); diem = null; } });
    ['pointerup', 'pointercancel'].forEach(function (ev) { khung.addEventListener(ev, function () { huyGiu(); diem = null; }); });
    khung.addEventListener('scroll', function () { huyGiu(); anTip(); if (POP.chon && DANG === ui) POP.chon.hidden = true; if (POP.menu && DANG === ui) POP.menu.hidden = true; });
    khung.addEventListener('contextmenu', function (e) { if (e.target.closest('.cu-bong') && window.matchMedia('(hover:none)').matches) e.preventDefault(); });
    khung.addEventListener('pointerover', function (e) {
      var lk = e.target.closest('[data-cu="lk"]'); if (!lk || e.pointerType === 'touch') return;
      clearTimeout(henRe); henRe = setTimeout(function () { var w = lk.closest('.cu-w'); if (w && lk.isConnected) moChon(ui.ds[+w.getAttribute('data-i')], lk); }, 380);
    });
    khung.addEventListener('pointerout', function (e) { if (e.target.closest('[data-cu="lk"]')) clearTimeout(henRe); });
    // v1.207.0 — rê vào viên cảm xúc ⇒ ô "ai đã thả" hiện ngay; rời viên ⇒ ẩn
    khung.addEventListener('pointerover', function (e) {
      var cs = e.target.closest('[data-cu="cs"]'); if (!cs || e.pointerType === 'touch') return;
      var w = cs.closest('.cu-w'), t = w ? ui.ds[+w.getAttribute('data-i')] : null;
      if (t && !(BANG)) hienTip(cs, t.cx, toiK());
    });
    khung.addEventListener('pointerout', function (e) {
      var cs = e.target.closest('[data-cu="cs"]'); if (cs && !cs.contains(e.relatedTarget)) anTip();
    });

    function moHd(t, goc) {
      DANG = ui; dongHet();
      var rg = goc.getBoundingClientRect(), H = window.innerHeight, W = document.documentElement.clientWidth;
      var hd = document.createElement('div'); hd.className = 'cu-hd cu-pop';
      hd.innerHTML = '<div class="nen"></div>';
      var ban = goc.cloneNode(true); ban.classList.add('ban'); ban.classList.remove('giu');
      // ⭐ v1.188.0 — bản nổi nằm NGOÀI .cu-hang ⇒ mang theo dấu "tin của mình" để giữ nguyên màu bong bóng khi nhấn giữ.
      if (goc.closest('.cu-hang.toi')) ban.classList.add('toi');
      ban.style.width = rg.width + 'px'; ban.style.left = rg.left + 'px'; ban.style.top = rg.top + 'px';
      hd.appendChild(ban);
      var toi = cxCuaToi(t), hop = document.createElement('div'); hop.className = 'hop';
      hop.innerHTML = (ui.chiXem || !coThaCx(t) ? '' : '<div class="cu-hd-cx">' + CX.map(function (c) { var n = toi && toi.n[c.k] || 0; return '<button type="button" data-k="' + c.k + '" aria-label="' + c.ten + '">' + imgCx(c.k) + (n ? '<i' + (n >= TOI_DA_CX ? ' class="day"' : '') + '>' + n + '</i>' : '') + '</button>'; }).join('') +
        '<button type="button" class="xo" data-k="" aria-label="Xoá hết cảm xúc em đã thả"' + (toi ? '' : ' disabled') + '>×</button></div>') +
        '<div class="cu-hd-ds">' + (ui.khoaChat || ui.chiXem ? '' : '<button type="button" data-m="tra">' + IC.traLoi + 'Trả lời</button>') +
        (t.sticker || !t.chu ? '' : '<button type="button" data-m="chep">' + IC.chep + 'Sao chép</button>') +
        (coThaCx(t) && demCx(t.cx).tong ? '<button type="button" data-m="cx">' + IC.tim + 'Cảm xúc</button>' : '') +
        ((cuaToi(t) || o.laThay) && o.thuHoi && !ui.chiXem ? '<button type="button" data-m="thuhoi" class="nguy">' + IC.thuHoi + 'Thu hồi</button>' : '') +
        (o.laThay && o.xoa ? '<button type="button" data-m="xoa" class="nguy">' + IC.xoa + 'Xoá hẳn</button>' : '') + '</div>';
      hd.appendChild(hop); document.body.appendChild(hd); HD = hd;
      var cao = rg.height, duoi = 18, ph = hop.offsetHeight, pw = hop.offsetWidth, le = 10;
      var top = rg.top; if (top + cao + duoi + ph > H - le) top = H - le - ph - duoi - cao; if (top < le) top = le;
      var left = cuaToi(t) ? rg.right - pw : rg.left; left = Math.max(le, Math.min(left, W - pw - le));
      hop.style.left = left + 'px'; hop.style.top = (rg.top + cao + duoi) + 'px';
      void hop.offsetWidth; ban.style.top = top + 'px'; hop.style.top = (top + cao + duoi) + 'px';
      hd.querySelector('.nen').onclick = dongHd;
      hop.onclick = function (e) {
        var k = e.target.closest('[data-k]');
        if (k) { if (k.disabled) return; dongHd(); if (k.getAttribute('data-k')) { if (them(t, k.getAttribute('data-k'))) nay(t.id, k.getAttribute('data-k')); } else xoaHetCx(t); return; }
        var b = e.target.closest('[data-m]'); if (!b) return;
        var v = b.getAttribute('data-m'); dongHd();
        if (v === 'cx') { moBang(t, 'all'); return; }
        lamViec(v, t, null);
      };
    }

    // ============================================================
    // Ô NHẬP (contenteditable: chữ + HÌNH emoji; gửi đi thì hình đổi thành mã :xxxx:)
    // ============================================================
    var chan = o.chan;
    // Ô nhập có sẵn trong HTML (`.cu-o`, trang đã gắn sự kiện focus/blur lên nó) thì GIỮ NGUYÊN phần tử đó, chỉ dựng khung quanh.
    var edSan = chan.querySelector('.cu-o');
    if (edSan) edSan.parentNode.removeChild(edSan);
    chan.innerHTML = '<div class="cu-chan"><div class="cu-tra" hidden></div>' + (o.guiAnh ? '<div class="cu-anh-cho" hidden></div>' : '') + '<div class="cu-nhap">' +
      (o.guiAnh ? '<button type="button" class="ib" data-cu="guianh" title="Gửi ảnh" aria-label="Gửi ảnh">' + IC.anh + '</button><input type="file" accept="image/*" multiple hidden>' : '') +
      '<button type="button" class="ib" data-cu="khay" title="Emoji và sticker" aria-label="Mở emoji và sticker">' + IC.mat + '</button>' +
      '<div class="cu-o" id="' + esc(o.idNhap || 'cuNhap') + '" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Nhập tin nhắn" data-ph="Aa" spellcheck="false"></div>' +
      '<button type="button" class="ib gui" aria-label="Gửi"></button></div></div>';
    if (edSan) { var cho = $('.cu-o', chan); cho.parentNode.replaceChild(edSan, cho); edSan.setAttribute('contenteditable', 'true'); }
    var ed = $('.cu-o', chan), nutGui = $('.gui', chan), nutKhay = $('[data-cu="khay"]', chan), khuTra = $('.cu-tra', chan);
    var vung = null, TRA = null;
    var khuAnh = $('.cu-anh-cho', chan), ANH = [], TOI_DA_ANH = 6;   // v1.206.0 — ảnh chờ gửi (xem trước nhỏ trên ô nhập)
    ui.nhap = ed;
    function docEd(n) {
      var s = '';
      (n || ed).childNodes.forEach(function (c) {
        if (c.nodeType === 3) s += c.nodeValue;
        else if (c.nodeName === 'IMG' && c.getAttribute('data-e')) s += ':' + c.getAttribute('data-e') + ':';
        else if (c.nodeName === 'BR') s += '\n';
        else if (c.nodeType === 1) s += (c.nodeName === 'DIV' && s && s.slice(-1) !== '\n' ? '\n' : '') + docEd(c);
      });
      return s.replace(/\u00a0/g, ' ');
    }
    function trong() { return !docEd().trim(); }
    function veNutGui() {
      var co = !trong() || ANH.some(function (a) { return !a.dang; });
      nutGui.innerHTML = co ? IC.gui : imgCx('tim');
      nutGui.title = co ? 'Gửi' : 'Gửi tim'; nutGui.setAttribute('aria-label', nutGui.title);
      if (o.khiGo) o.khiGo();
    }
    document.addEventListener('selectionchange', function () {
      var s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) vung = s.getRangeAt(0).cloneRange();
    });
    function chenNut(node) {
      ed.focus(); var s = getSelection();
      if (!vung || !ed.contains(vung.startContainer)) { vung = document.createRange(); vung.selectNodeContents(ed); vung.collapse(false); }
      s.removeAllRanges(); s.addRange(vung); vung.deleteContents(); vung.insertNode(node);
      vung.setStartAfter(node); vung.collapse(true); s.removeAllRanges(); s.addRange(vung);
    }
    function chenEmoji(ma) {
      if (ed.getAttribute('contenteditable') !== 'true') return;
      var img = document.createElement('img'); img.className = 'cu-ei'; img.src = urlEmoji(ma); img.alt = EMOJI[ma]; img.title = EMOJI[ma]; img.setAttribute('data-e', ma); img.draggable = false;
      chenNut(img); veNutGui(); nhoGanDay(ma);
    }
    // bấm trúng HÌNH emoji: tự đặt con trỏ (nửa trái = trước hình, nửa phải = sau hình)
    ed.addEventListener('mousedown', function (e) {
      var img = e.target.closest('img.cu-ei'); if (!img) return;
      e.preventDefault(); ed.focus();
      var r = document.createRange(), b = img.getBoundingClientRect();
      if (e.clientX < b.left + b.width / 2) r.setStartBefore(img); else r.setStartAfter(img);
      r.collapse(true); var s = getSelection(); s.removeAllRanges(); s.addRange(r); vung = r.cloneRange();
    });
    ed.addEventListener('paste', function (e) {
      e.preventDefault();
      var cb = e.clipboardData || window.clipboardData;
      // v1.206.0 — Ctrl+V ẢNH (chụp màn hình, chép ảnh) ⇒ vào hàng ảnh chờ gửi (chỉ khuôn có o.guiAnh — thầy)
      var anh = o.guiAnh && cb && cb.files ? Array.prototype.filter.call(cb.files, function (f) { return /^image\//.test(f.type); }) : [];
      if (anh.length) { themAnh(anh); return; }
      var t = cb.getData('text/plain') || '';
      if (t) { chenNut(document.createTextNode(t)); veNutGui(); }
    });
    ed.addEventListener('drop', function (e) {
      e.preventDefault();
      var fs = o.guiAnh && e.dataTransfer ? Array.prototype.filter.call(e.dataTransfer.files || [], function (f) { return /^image\//.test(f.type); }) : [];
      if (fs.length) themAnh(fs);
    });
    ed.addEventListener('input', function () { if (trong() && !ed.querySelector('img')) ed.innerHTML = ''; veNutGui(); kiemNhac(); });

    function datTra(t) {
      TRA = t;
      if (!t) { khuTra.hidden = true; khuTra.innerHTML = ''; if (o.khiGo) o.khiGo(); return; }
      khuTra.innerHTML = '<div><b>Trả lời ' + esc(cuaToi(t) ? 'chính mình' : t.ten) + '</b><span>' + giau(tomTat(t), reN, true) + '</span></div><button type="button" aria-label="Bỏ trả lời" title="Bỏ trả lời">×</button>';
      khuTra.hidden = false;
      khuTra.querySelector('button').onclick = function () { datTra(null); };
      if (o.khiGo) o.khiGo();
      ed.focus();
    }
    /* ⭐ v1.206.0 — thầy báo: bấm gửi xong tin ĐÃ HIỆN trên khung (Firestore vẽ trước bằng bản ghi tại máy) mà ô nhập
       vẫn còn nguyên chữ, chờ máy chủ xác nhận mới xoá. Nay: XOÁ Ô NHẬP NGAY lúc bấm gửi, tin đi qua HÀNG ĐỢI (XEP — giữ
       đúng thứ tự, ảnh tải lâu không bị chữ gửi sau vượt lên); gửi hỏng thì trả chữ + trích về ô nhập (nếu ô đang trống). */
    var XEP = Promise.resolve();
    function xepHang(viec) { var p = XEP.then(viec); XEP = p['catch'](function () {}); return p; }
    function gui(goi) {
      if (ui.khoaChat) return Promise.resolve();
      if (ui.chiXem) { loi('Đang ở chế độ xem — không nhắn được.'); return Promise.resolve(); }
      var anh = goi ? [] : ANH.filter(function (a) { return !a.dang; });
      var chu = '', html = '';
      if (!goi) {
        chu = docEd().trim();
        if (chu.length > TOI_DA_CHU) { loi('Tin dài quá ' + TOI_DA_CHU + ' ký tự (emoji tính mỗi hình khoảng 7 ký tự).'); return Promise.resolve(); }
        if (!chu && !anh.length) chu = ':2764:';
        html = ed.innerHTML; ed.innerHTML = ''; vung = null;
      }
      var tra = TRA, q = tra ? { id: tra.id, ten: String((cuaToi(tra) && o.toi ? o.toi.ten : tra.ten) || '').slice(0, 60), chu: tomTat(tra).slice(0, 120) } : null;
      datTra(null);
      anh.forEach(function (a) { a.dang = true; });
      veAnhCho(); veNutGui(); ed.focus();
      var traVe = function (e) {   // hỏng ⇒ trả chữ + trích về ô nhập (ô còn trống), báo lỗi
        if (html && trong()) { ed.innerHTML = html; vung = null; veNutGui(); }
        if (tra && !TRA) datTra(tra);
        loi(e);
      };
      // ảnh trước (mỗi ảnh một tin, trích gắn vào tin đầu tiên), chữ sau
      anh.forEach(function (a) {
        xepHang(function () {
          return Promise.resolve(o.guiAnh(a.file)).then(function (url) {
            if (!url) throw new Error('Không tải được ảnh lên.');
            var g = { chu: '', hinh: url }; if (q) { g.q = q; q = null; }
            return o.gui(g);
          }).then(function () { boAnh(a); }, function (e) { a.dang = false; veAnhCho(); veNutGui(); loi(e); });
        });
      });
      if (goi || chu) {
        var g = goi || { chu: chu };
        return xepHang(function () {
          if (q) { g.q = q; q = null; }
          return Promise.resolve(o.gui(g));
        })['catch'](traVe);
      }
      return XEP;
    }
    nutGui.onclick = function () { gui(null); };
    // ⭐ v1.198.0 — gửi ảnh: trang lo nén + tải lên (o.guiAnh ⇒ url), khuôn gửi tin {chu:'', hinh:url}.
    // ⭐ v1.206.0 — thầy chốt: chọn ảnh (hoặc Ctrl+V / kéo thả ảnh vào ô nhập) ⇒ hiện XEM TRƯỚC nhỏ trên ô nhập, bấm gửi mới gửi.
    var nutAnh = $('[data-cu="guianh"]', chan), oFile = nutAnh ? nutAnh.nextElementSibling : null;
    function themAnh(ds) {
      if (ui.khoaChat || ui.chiXem || !khuAnh) return;
      ds = Array.prototype.slice.call(ds || []).filter(function (f) { return /^image\//.test(f.type || ''); });
      var con = TOI_DA_ANH - ANH.length;
      if (ds.length > con) loi('Mỗi lần gửi tối đa ' + TOI_DA_ANH + ' ảnh.');
      ds.slice(0, Math.max(0, con)).forEach(function (f) { ANH.push({ file: f, url: URL.createObjectURL(f), dang: false }); });
      veAnhCho(); veNutGui(); ed.focus();
    }
    function boAnh(a) {
      var i = ANH.indexOf(a); if (i < 0) return;
      ANH.splice(i, 1); try { URL.revokeObjectURL(a.url); } catch (e) {}
      veAnhCho(); veNutGui();
    }
    function veAnhCho() {
      if (!khuAnh) return;
      khuAnh.hidden = !ANH.length;
      khuAnh.innerHTML = ANH.map(function (a, i) {
        return '<div class="it' + (a.dang ? ' dang' : '') + '"><img src="' + esc(a.url) + '" alt="Ảnh chờ gửi" draggable="false">' +
          (a.dang ? '<i class="xoay" aria-label="Đang gửi"></i>' : '<button type="button" data-xo="' + i + '" title="Bỏ ảnh này" aria-label="Bỏ ảnh này">×</button>') + '</div>';
      }).join('');
    }
    if (khuAnh) khuAnh.addEventListener('click', function (e) {
      var b = e.target.closest('[data-xo]'); if (b) { var a = ANH[+b.getAttribute('data-xo')]; if (a && !a.dang) boAnh(a); }
    });
    if (nutAnh) {
      nutAnh.onclick = function () { if (ui.khoaChat || ui.chiXem) return; oFile.click(); };
      oFile.onchange = function () { var ds = this.files; themAnh(ds); this.value = ''; };
    }

    // @ nhắc tên
    var goiDs = [], goiI = 0, goiNut = null;
    function kiemNhac() {
      var g = pop('goi', 'cu-goi'), s = getSelection(); goiNut = null;
      if (!s.rangeCount || !s.isCollapsed || s.anchorNode.nodeType !== 3 || !ed.contains(s.anchorNode)) { g.hidden = true; return; }
      var truoc = s.anchorNode.nodeValue.slice(0, s.anchorOffset), m = /(^|\s)@([^\s@]*)$/.exec(truoc);
      if (!m) { g.hidden = true; return; }
      var q = khongDau(m[2]);
      var ten = {}; (o.dsNhac ? o.dsNhac() : []).concat(ui.ds.map(function (t) { return t.ten; })).forEach(function (x) { if (x && x !== (o.toi && o.toi.ten)) ten[x] = 1; });
      goiDs = ['All'].concat(Object.keys(ten).sort()).filter(function (n) { return khongDau(n).indexOf(q) >= 0; }).slice(0, 6);
      if (!goiDs.length) { g.hidden = true; return; }
      goiNut = { node: s.anchorNode, dau: s.anchorOffset - m[2].length - 1, cuoi: s.anchorOffset };
      goiI = 0; veGoi();
    }
    function khongDau(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
    function veGoi() {
      DANG = ui; var g = pop('goi', 'cu-goi');
      g.innerHTML = goiDs.map(function (n, i) {
        return '<button type="button" data-n="' + esc(n) + '" class="' + (i === goiI ? 'act' : '') + '">' +
          (n === 'All' ? '<span class="cu-tron-all">@</span><span>Tất cả mọi người</span><small>@All</small>' : '<div class="cu-av">' + (o.av ? o.av({ ten: n, vaiTro: 'hs' }, 0) : '') + '</div><span>' + esc(n) + '</span>') + '</button>';
      }).join('');
      g.hidden = false;
      var r = chan.getBoundingClientRect();
      datCanh(g, r.left, r.top - g.offsetHeight - 6);
    }
    function chonNhac(n) {
      if (!goiNut) return;
      var t = goiNut.node, v = t.nodeValue, chen = '@' + n + '\u00a0';
      t.nodeValue = v.slice(0, goiNut.dau) + chen + v.slice(goiNut.cuoi);
      var r = document.createRange(); r.setStart(t, goiNut.dau + chen.length); r.collapse(true);
      ed.focus(); var s = getSelection(); s.removeAllRanges(); s.addRange(r); vung = r.cloneRange();
      pop('goi', 'cu-goi').hidden = true; veNutGui();
    }
    pop('goi', 'cu-goi').addEventListener('pointerdown', function (e) { e.preventDefault(); });
    pop('goi', 'cu-goi').addEventListener('click', function (e) { if (DANG !== ui) return; var b = e.target.closest('[data-n]'); if (b) chonNhac(b.getAttribute('data-n')); });
    ed.addEventListener('keydown', function (e) {
      var g = POP.goi;
      if (g && !g.hidden && DANG === ui) {
        if (e.key === 'ArrowDown') { e.preventDefault(); goiI = (goiI + 1) % goiDs.length; veGoi(); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); goiI = (goiI + goiDs.length - 1) % goiDs.length; veGoi(); return; }
        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); chonNhac(goiDs[goiI]); return; }
        if (e.key === 'Escape') { g.hidden = true; e.stopPropagation(); return; }
      }
      if (e.key === 'Escape' && TRA) { datTra(null); e.stopPropagation(); return; }
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        if (e.shiftKey) { document.execCommand('insertLineBreak'); veNutGui(); } else gui(null);
      }
    });

    // khay emoji / sticker (hộp nổi ngay trên ô nhập)
    var KHAY = { tab: 'emoji', goi: 'lop' };
    function veKhay() {
      DANG = ui; var k = pop('khay', 'cu-khay');
      k.innerHTML = htmlKhay(KHAY, true);
      k.hidden = false;
      var r = chan.getBoundingClientRect();
      datCanh(k, r.left, r.top - k.offsetHeight - 6);
    }
    nutKhay.onclick = function () { var k = POP.khay; if (k && !k.hidden && DANG === ui) { k.hidden = true; return; } if (ui.khoaChat || ui.chiXem) return; veKhay(); };
    pop('khay', 'cu-khay').addEventListener('pointerdown', function (e) { if (e.target.closest('[data-e]')) e.preventDefault(); });
    pop('khay', 'cu-khay').addEventListener('click', function (e) {
      if (DANG !== ui) return;
      var t = e.target.closest('[data-t]'); if (t) { KHAY.tab = t.getAttribute('data-t'); veKhay(); return; }
      var g = e.target.closest('[data-g]'); if (g) { KHAY.goi = g.getAttribute('data-g'); veKhay(); return; }
      var s = e.target.closest('[data-s]'); if (s) { this.hidden = true; gui({ chu: '[Sticker]', sticker: s.getAttribute('data-s') }); return; }
      var x = e.target.closest('[data-e]'); if (x) chenEmoji(x.getAttribute('data-e'));
    });

    ui.khoa = function (khoa, chu) {
      if (!khoa && ui.chiXem) return;          // chế độ xem / thầy vào thay em: luôn chỉ đọc
      ui.khoaChat = !!khoa;
      ed.setAttribute('contenteditable', khoa ? 'false' : 'true');
      ed.setAttribute('data-ph', khoa ? (chu || 'Chat đang tạm khoá.') : (o.goiY || 'Aa'));
      if (khoa) { ed.innerHTML = ''; datTra(null); }
      nutGui.disabled = !!khoa; nutKhay.disabled = !!khoa; if (nutAnh) nutAnh.disabled = !!khoa;
      veNutGui();
    };
    ui.datChiXem = function (bat, chu) { ui.chiXem = false; if (bat) { ui.khoa(true, chu || 'Đang xem như học sinh — chat chỉ để đọc.'); ui.chiXem = true; } else ui.khoa(false); };
    ui.focus = function () { if (!ui.khoaChat) ed.focus(); };
    ui.dongHet = dongHet;
    ui.coMo = coMo;
    ed.setAttribute('data-ph', o.goiY || 'Aa');
    veNutGui();
    return ui;
  }

  /* ⭐ v1.187.0 — THANH ĐẦU khung chat (bản mẫu 12): vòng tròn tên lớp viết tắt + "Lớp …" / "Thầy Andrew".
     av/ten = phần tử `.cu-dau-av` / `<b>` trong `.cu-dau` có sẵn ở trang. */
  function datDau(av, ten, chu, ma) {
    if (ten) ten.textContent = chu;
    if (!av) return;
    // Tên nhiều chữ ("NỀN TẢNG K9") ⇒ chữ cái đầu mỗi chữ, chữ có số giữ nguyên ⇒ "NTK9"; một chữ ("A1-A") ⇒ bỏ dấu gạch ⇒ "A1A".
    var ds = String(ma || '').trim().split(/\s+/).filter(Boolean);
    var t = (ds.length > 1 ? ds.map(function (w) { return /\d/.test(w) ? w : w.charAt(0); }).join('') : ds.join(''))
      .replace(/[^0-9A-Za-zÀ-ỹ]/g, '').toUpperCase().slice(0, 4) || '?';
    av.textContent = t;
    av.classList.toggle('dai', t.length > 3);
  }

  window.ChatUI = { tao: tao, datDau: datDau,
                    // ⭐ v1.199.0 — mảnh dùng chung cho bài đăng / bình luận / mọi ô chữ
                    ganNutCx: ganNutCx, cumCxHtml: cumCxHtml, nutCxHinh: nutCxHinh, moBangCx: moBangCx, tenCx: tenCx, kyCx: kyCx, noTung: noTung,
                    moKhay: moKhay, chenVaoO: chenVaoO, thayEmoji: thayEmoji, stickerHtml: stickerHtml, timStk: timStk, imgCx: imgCx, cxChuan: cxChuan, demCx: demCx, tomTat: tomTat, chuThuong: chuThuong, dongHet: dongHet, coMo: coMo,
                    KINDS: KINDS, TOI_DA_CX: TOI_DA_CX, EMOJI: EMOJI, STICKER: STICKER };
})();
