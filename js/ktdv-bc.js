/* ============================================================
   ktdv-bc.js — BẢN BÁO CÁO KIỂM TRA ĐẦU VÀO GỬI PHỤ HUYNH (03/10/2026).
   Một hàm duy nhất dựng HTML từ "ảnh chụp" kết quả — DASHBOARD (xem trước + sửa nhận xét) và TRANG PHỤ HUYNH
   (kiemtra.andrewclasses.com/kq?c=…) dùng CHUNG, nên thầy xem trước = phụ huynh thấy.

   ⛔ BẢN CHÉP: file này có bản y hệt ở repo kiemtra `js/ktdv-bc.js`. Sửa một bên thì chép sang bên kia (và tăng `?v=` cả hai).

   Ảnh chụp `s` (lưu ở Firestore `ktdvChiaSe/{token}.json`, KHÔNG có ID đăng nhập, KHÔNG có dữ liệu quá trình làm bài):
     { v:2, ten, hoTen, truong, lopTruong, anh, ngayLam(ms), ngayBc(ms), uuDiem, hanChe,
       bai:[ { ma, ten, n, d, ds:[{i, q, y, c, ok, g}] }  |  { ma, ten, n, chua:true } ] }
       ds = TẤT CẢ các câu (đúng + sai) như các sheet BT1/BT2/BT3 trong file Excel chấm: STT · đề · bài làm · nhận xét.
       ok = đúng/sai (KHÔNG cho điểm từng câu); g = lời giải thích tiếng Việt cho câu sai (đáp án đúng nằm ở c).
   Kết luận % = số câu đúng / tổng số câu.
   Chỉ có Đúng / Sai — phân loại 4 mức, thời gian, rời trang… nằm ở phần "Chi tiết giáo viên" của dashboard.

   html(s, {sua:true})  ⇒ ô nhận xét chung là <textarea data-bc-nx="uuDiem|hanChe">, lời giải thích câu sai là <textarea data-bc-gc="mã:số câu"> (dashboard).
   goiY(bàiLàm, đápÁn)  ⇒ lời giải thích NHÁP tiếng Việt (so từng từ) để thầy sửa lại.
   ============================================================ */
(function () {
  'use strict';
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ngayVN(ms) { if (!ms) return ''; var d = new Date(ms); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }

  // ---- màu theo %, dễ hiểu với phụ huynh ----
  function mauVong(p) { return p >= 85 ? '#1F9D55' : p >= 70 ? '#0E7C6E' : p >= 50 ? '#E0962B' : '#D9534F'; }
  function mauThanh(p) { return p >= 70 ? '#0E9A86' : p >= 50 ? '#E0962B' : '#D9534F'; }
  function pc(d, n) { return n ? Math.round(100 * d / n) : 0; }

  function tong(s) {
    var d = 0, n = 0;
    (s.bai || []).forEach(function (b) { if (!b.chua) { d += b.d; n += b.n; } });
    return { d: d, n: n, p: pc(d, n) };
  }

  // ---- lời giải thích NHÁP cho câu sai (so từng từ; thầy sửa lại được) ----
  function tok(s) {
    return String(s || '').normalize('NFC').toLowerCase().replace(/[‘’`]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(function (x) { return x; });
  }
  function lev(a, b) {
    var m = a.length, n = b.length, p = [], i, j;
    for (j = 0; j <= n; j++) p[j] = j;
    for (i = 1; i <= m; i++) { var c = [i]; for (j = 1; j <= n; j++) c[j] = a.charAt(i - 1) === b.charAt(j - 1) ? p[j - 1] : 1 + Math.min(p[j - 1], p[j], c[j - 1]); p = c; }
    return p[n];
  }
  function dangS(x, z) {   // x = z thêm s/es/ies ?
    return x === z + 's' || x === z + 'es' || (/ies$/.test(x) && z === x.slice(0, -3) + 'y') || (/ves$/.test(x) && (z === x.slice(0, -3) + 'f' || z === x.slice(0, -3) + 'fe'));
  }
  function q(x) { return '“' + x + '”'; }
  function goiY(y, c) {
    y = String(y || '').trim(); c = String(c || '').trim();
    if (!y) return 'Con để trống câu này.';
    var a = tok(y), b = tok(c);
    if (a.join(' ') === b.join(' ')) return 'Gần đúng — chỉ lệch dấu câu hoặc cách viết hoa so với đáp án.';
    // thiếu / thừa từ (đa tập)
    var cb = {}, ca = {}, thieu = [], thua = [];
    b.forEach(function (w) { cb[w] = (cb[w] || 0) + 1; });
    a.forEach(function (w) { ca[w] = (ca[w] || 0) + 1; });
    b.forEach(function (w) { if ((ca[w] || 0) < cb[w]) { thieu.push(w); ca[w] = (ca[w] || 0) + 1; } });
    cb = {}; b.forEach(function (w) { cb[w] = (cb[w] || 0) + 1; });
    var da = {}; a.forEach(function (w) { da[w] = (da[w] || 0) + 1; if (da[w] > (cb[w] || 0)) thua.push(w); });
    if (thieu.length === 1 && thua.length === 1) {
      var x = thua[0], z = thieu[0];
      if ((x === 'a' || x === 'an') && (z === 'a' || z === 'an')) return 'Sai mạo từ: trước từ này phải dùng ' + q(z) + ' (con viết ' + q(x) + ').';
      if (dangS(x, z)) return 'Dư “s”: con viết ' + q(x) + ', đúng là ' + q(z) + ' (số ít hoặc động từ không thêm “s”).';
      if (dangS(z, x)) return 'Thiếu “s”: con viết ' + q(x) + ', đúng là ' + q(z) + ' (số nhiều hoặc động từ chia ngôi thứ ba số ít).';
      if (lev(x, z) <= 2 && z.length >= 4) return 'Sai chính tả: con viết ' + q(x) + ', đúng là ' + q(z) + '.';
      return 'Dùng từ chưa đúng: con viết ' + q(x) + ', đáp án dùng ' + q(z) + '.';
    }
    if (thieu.length && !thua.length) return 'Thiếu từ: ' + thieu.slice(0, 4).map(q).join(', ') + '.';
    if (thua.length && !thieu.length) return 'Thừa từ: ' + thua.slice(0, 4).map(q).join(', ') + '.';
    return 'Chưa đúng: thiếu ' + thieu.slice(0, 3).map(q).join(', ') + ', dùng chưa đúng ' + thua.slice(0, 3).map(q).join(', ') + '.';
  }

  function vong(p, mau) {
    var r = 52, c = 2 * Math.PI * r;
    return '<svg class="kqp-vong" viewBox="0 0 132 132" width="132" height="132" role="img" aria-label="Tỉ lệ câu đúng ' + p + ' phần trăm">' +
      '<circle cx="66" cy="66" r="' + r + '" fill="none" stroke="#E4ECEA" stroke-width="13"/>' +
      '<circle cx="66" cy="66" r="' + r + '" fill="none" stroke="' + mau + '" stroke-width="13" stroke-linecap="round" stroke-dasharray="' + (c * p / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 66 66)"/>' +
      '<text x="66" y="75" text-anchor="middle" font-size="30" font-weight="800" fill="#16232A">' + p + '%</text></svg>';
  }

  function dong(txt) {
    var ls = String(txt || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    return ls.length ? '<ul>' + ls.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul>' : '';
  }
  function nhanXet(khoa, tieu, cls, txt, sua, goiYNx) {
    if (sua) {
      return '<div class="kqp-nx ' + cls + '"><h4>' + tieu + '</h4><textarea data-bc-nx="' + khoa + '" rows="' + (khoa === 'hanChe' ? 5 : 3) + '" placeholder="' + E(goiYNx) + '">' + E(txt) + '</textarea>' +
        '<div class="in-chu">' + dong(txt) + '</div></div>';
    }
    var h = dong(txt);
    return h ? '<div class="kqp-nx ' + cls + '"><h4>' + tieu + '</h4>' + h + '</div>' : '';
  }

  // một dòng câu hỏi — giống bảng trong sheet Excel: STT · đề · bài làm · nhận xét
  function hang(b, x, sua) {
    var ok = !!x.ok;
    var nx;
    if (ok) nx = '<span class="kqp-dung">✓ Đúng</span>';
    else {
      var g = sua ? '<textarea rows="2" data-bc-gc="' + E(b.ma + ':' + x.i) + '" placeholder="Giải thích câu sai…">' + E(x.g) + '</textarea><span class="in-chu">' + E(x.g) + '</span>' : (x.g ? '<span class="kqp-g">' + E(x.g) + '</span>' : '');
      nx = '<span class="kqp-sai-nhan">✗ Sai</span>' + g + (x.c ? '<span class="kqp-da">Đáp án đúng: <b>' + E(x.c) + '</b></span>' : '');
    }
    return '<div class="kqp-hang ' + (ok ? 'ok' : 'sai') + '"><div class="kqp-h-stt">' + x.i + '</div>' +
      '<div class="kqp-h-de" data-l="Đề">' + E(x.q) + '</div>' +
      '<div class="kqp-h-bl" data-l="Con viết">' + (x.y ? E(x.y) : '<em>(để trống)</em>') + '</div>' +
      '<div class="kqp-h-nx" data-l="Nhận xét">' + nx + '</div></div>';
  }

  function html(s, opt) {
    var sua = !!(opt && opt.sua);
    var t = tong(s), ten = s.hoTen || s.ten || '';
    var xong = (s.bai || []).filter(function (b) { return !b.chua; }).length;
    var h = '<div class="kqp">';
    h += '<div class="kqp-dau"><div class="kqp-logo">Andrew Classes</div><div class="kqp-tde">KẾT QUẢ KIỂM TRA ĐẦU VÀO</div></div>';
    // học sinh
    var tt = [s.truong ? 'Trường ' + s.truong : '', s.lopTruong ? 'Lớp ' + s.lopTruong : ''].filter(Boolean).map(E).join(' · ');
    h += '<div class="kqp-hs">' + (s.anh ? '<img class="kqp-av" src="' + E(s.anh) + '" alt="">' : '<span class="kqp-av chu">' + E(String(ten).trim().split(/\s+/).pop().charAt(0).toUpperCase() || '?') + '</span>') +
      '<div><div class="kqp-ten">' + E(ten) + '</div>' + (tt ? '<div class="kqp-tt">' + tt + '</div>' : '') +
      (s.ngayLam ? '<div class="kqp-tt">Ngày làm bài: ' + ngayVN(s.ngayLam) + '</div>' : '') + '</div></div>';
    if (!xong) return h + '<div class="kqp-chua">Em chưa nộp bài nào.</div></div>';
    // tổng + từng phần
    h += '<div class="kqp-tq"><div class="kqp-tq-vong">' + vong(t.p, mauVong(t.p)) + '</div><div class="kqp-tq-chu">' +
      '<div class="kqp-nhan">Tỉ lệ câu đúng</div><div class="kqp-so"><b>' + t.d + '</b> / ' + t.n + ' câu</div>' +
      (xong < s.bai.length ? '<div class="kqp-ghi">Mới tính ' + xong + '/' + s.bai.length + ' bài đã nộp.</div>' : '') + '</div></div>';
    h += '<h3 class="kqp-muc-tde">Kết quả từng phần</h3><div class="kqp-cot">' + s.bai.map(function (b, i) {
      if (b.chua) return '<div class="kqp-dong"><div class="kqp-dong-t"><span><i>' + (i + 1) + '</i>' + E(b.ten) + '</span><em>Chưa nộp</em></div><div class="kqp-nen"><u style="width:0"></u></div></div>';
      var p = pc(b.d, b.n);
      return '<div class="kqp-dong"><div class="kqp-dong-t"><span><i>' + (i + 1) + '</i>' + E(b.ten) + '</span><em><b>' + b.d + '</b>/' + b.n + ' câu đúng · ' + p + '%</em></div>' +
        '<div class="kqp-nen"><u style="width:' + Math.max(p, 2) + '%;background:' + mauThanh(p) + '"></u></div></div>';
    }).join('') + '</div>';
    // nhận xét
    var nx = nhanXet('uuDiem', 'Con làm tốt', 'tot', s.uuDiem, sua, 'Điểm tốt của em…') + nhanXet('hanChe', 'Con cần cải thiện', 'can', s.hanChe, sua, 'Những điểm em cần luyện thêm…');
    if (nx) h += '<h3 class="kqp-muc-tde">Nhận xét của thầy</h3><div class="kqp-nxs">' + nx + '</div>';
    // chi tiết TỪNG CÂU (đúng + sai) — mỗi bài một khối, mở sẵn
    h += '<h3 class="kqp-muc-tde">Chi tiết từng câu</h3>' + (s.bai || []).map(function (b) {
      if (b.chua || !b.ds || !b.ds.length) return '';
      var sai = b.ds.filter(function (x) { return !x.ok; }).length;
      return '<details class="kqp-ct" open><summary>' + E(b.ten) + ' <span>' + b.d + ' đúng · ' + sai + ' sai</span></summary>' +
        '<div class="kqp-bang"><div class="kqp-hang kqp-tieu"><div class="kqp-h-stt">STT</div><div class="kqp-h-de">Đề</div><div class="kqp-h-bl">Con viết</div><div class="kqp-h-nx">Nhận xét</div></div>' +
        b.ds.map(function (x) { return hang(b, x, sua); }).join('') + '</div></details>';
    }).join('');
    h += '<div class="kqp-ky">Andrew Classes · Teacher Andrew · Zalo 0359.769.765<br>Báo cáo lập ngày ' + ngayVN(s.ngayBc || Date.now()) + '</div></div>';
    return h;
  }

  var css = '' +
    '.kqp{--xanh:#0E7C6E;--chu:#16232A;--mo:#5F7370;--nhat:#8AA09C;--vien:#E1EAE8;font-family:var(--font,"Montserrat",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif);color:var(--chu);font-size:15px;line-height:1.55}' +
    '.kqp *{box-sizing:border-box}' +
    '.kqp-dau{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:3px solid var(--xanh);padding-bottom:10px;margin-bottom:18px}' +
    '.kqp-logo{font-size:20px;font-weight:800;color:var(--xanh)} .kqp-tde{font-size:13px;font-weight:800;letter-spacing:.07em;color:var(--mo)}' +
    '.kqp-hs{display:flex;align-items:center;gap:14px;margin-bottom:18px}' +
    '.kqp-av{width:64px;height:64px;border-radius:50%;object-fit:cover;flex:none;background:#E7F2F0} .kqp-av.chu{display:inline-grid;place-items:center;color:var(--xanh);font-weight:800;font-size:26px}' +
    '.kqp-ten{font-size:21px;font-weight:800;line-height:1.25} .kqp-tt{font-size:13px;color:var(--mo);margin-top:2px}' +
    '.kqp-chua{padding:30px;text-align:center;color:var(--nhat)}' +
    '.kqp-tq{display:flex;align-items:center;gap:22px;background:#F4F9F8;border-radius:18px;padding:18px 22px;margin-bottom:6px}' +
    '.kqp-tq-vong{flex:none;line-height:0} .kqp-nhan{font-size:12.5px;font-weight:700;color:var(--mo);text-transform:uppercase;letter-spacing:.05em}' +
    '.kqp-so{font-size:18px;margin:2px 0} .kqp-so b{font-size:34px;font-weight:800;color:var(--xanh);line-height:1} .kqp-ghi{font-size:12px;color:var(--mo);margin-top:6px}' +
    '.kqp-muc-tde{font-size:14px;font-weight:800;margin:24px 0 10px;color:var(--xanh);text-transform:uppercase;letter-spacing:.05em}' +
    '.kqp-cot{display:flex;flex-direction:column;gap:14px}' +
    '.kqp-dong-t{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:5px;font-size:14px;font-weight:700}' +
    '.kqp-dong-t i{font-style:normal;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--xanh);color:#fff;font-size:12px;margin-right:8px}' +
    '.kqp-dong-t em{font-style:normal;font-weight:600;color:var(--mo);white-space:nowrap} .kqp-dong-t em b{color:var(--chu);font-size:16px}' +
    '.kqp-nen{height:14px;border-radius:999px;background:#E4ECEA;overflow:hidden} .kqp-nen u{display:block;height:100%;border-radius:999px;text-decoration:none}' +
    '.kqp-nxs{display:flex;flex-direction:column;gap:12px}' +
    '.kqp-nx{border-radius:14px;padding:12px 16px;border-left:5px solid} .kqp-nx.tot{background:#EDF8F2;border-color:#2E9E6B} .kqp-nx.can{background:#FDF4E5;border-color:#E0962B}' +
    '.kqp-nx h4{margin:0 0 4px;font-size:13.5px;font-weight:800} .kqp-nx.tot h4{color:#1F7A50} .kqp-nx.can h4{color:#A86A12}' +
    '.kqp-nx ul{margin:0;padding-left:18px} .kqp-nx li{margin:3px 0;font-size:14px}' +
    '.kqp-nx textarea{width:100%;font:500 13.5px var(--font,inherit);border:1px solid #CFDCD9;border-radius:10px;padding:9px 10px;resize:vertical;line-height:1.55;background:#fff;color:var(--chu)} .kqp .in-chu{display:none}' +
    /* chi tiết từng câu */
    '.kqp-ct{border:1px solid var(--vien);border-radius:12px;margin-bottom:12px;background:#fff;overflow:hidden} .kqp-ct summary{cursor:pointer;padding:11px 14px;font-weight:800;font-size:14px;list-style:none;display:flex;align-items:center;gap:8px;background:#F4F9F8}' +
    '.kqp-ct summary::-webkit-details-marker{display:none} .kqp-ct summary::after{content:"－";order:3;color:var(--xanh);font-weight:800;width:18px;text-align:center} .kqp-ct:not([open]) summary::after{content:"＋"}' +
    '.kqp-ct summary span{order:2;font-weight:600;color:var(--mo);font-size:12.5px;margin-left:auto;white-space:nowrap}' +
    '.kqp-hang{display:grid;grid-template-columns:36px minmax(0,1.1fr) minmax(0,1.1fr) minmax(0,1.5fr);gap:10px;padding:8px 14px;border-top:1px solid #EDF2F1;font-size:13.5px;align-items:start}' +
    '.kqp-hang.sai{background:#FFF6F5} .kqp-hang>div{min-width:0;overflow-wrap:anywhere}' +
    '.kqp-h-stt{color:var(--nhat);font-weight:700} .kqp-h-bl em{color:var(--nhat)} .kqp-hang.sai .kqp-h-bl{color:#B4363B}' +
    '.kqp-tieu{background:#fff;font-size:11.5px;font-weight:800;color:var(--mo);text-transform:uppercase;letter-spacing:.04em;border-top:0;padding-top:10px;padding-bottom:8px}' +
    '.kqp-dung{color:#1F7A50;font-weight:700} .kqp-sai-nhan{display:inline-block;color:#C93A3F;font-weight:800} .kqp-g{display:block;margin-top:2px;color:#16232A}' +
    '.kqp-da{display:block;margin-top:3px;color:#1F7A50;font-size:13px} .kqp-da b{font-weight:700}' +
    '.kqp-h-nx textarea{display:block;resize:vertical;line-height:1.45;width:100%;margin-top:3px;font:500 13px var(--font,inherit);border:1px solid #CFDCD9;border-radius:8px;padding:6px 8px;background:#fff;color:var(--chu)}' +
    '.kqp-ky{margin-top:26px;padding-top:12px;border-top:1px solid var(--vien);font-size:12px;color:var(--nhat);text-align:center}' +
    '@media(max-width:600px){.kqp{font-size:14.5px}.kqp-tq{flex-direction:column;text-align:center;gap:10px}.kqp-dong-t{flex-direction:column;gap:2px}.kqp-ten{font-size:19px}' +
    ' .kqp-tieu{display:none} .kqp-hang{grid-template-columns:30px minmax(0,1fr);row-gap:3px;padding:10px 12px} .kqp-h-de{font-weight:700} .kqp-h-bl,.kqp-h-nx{grid-column:2}' +
    ' .kqp-h-bl::before,.kqp-h-nx::before{content:attr(data-l) ": ";font-size:11.5px;font-weight:700;color:var(--mo)}}' +
    '@media print{.kqp-tq{background:#fff;border:1px solid var(--vien)} .kqp-nx textarea,.kqp-h-nx textarea{display:none} .kqp .in-chu{display:block} .kqp-dong,.kqp-nx,.kqp-hang,.kqp-tq{break-inside:avoid}' +
    ' .kqp *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';

  // in / lưu PDF: mở hết các khối câu rồi gập lại như cũ
  var _mo = [];
  window.addEventListener('beforeprint', function () { _mo = []; [].forEach.call(document.querySelectorAll('.kqp details'), function (d) { if (!d.open) { d.open = true; _mo.push(d); } }); });
  window.addEventListener('afterprint', function () { _mo.forEach(function (d) { d.open = false; }); _mo = []; });

  window.KTDV_BC = { html: html, css: css, tong: tong, goiY: goiY };
})();
