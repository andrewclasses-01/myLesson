/* ============================================================
   ktdv-bc.js — BẢN BÁO CÁO KIỂM TRA ĐẦU VÀO GỬI PHỤ HUYNH (03/10/2026).
   Một hàm duy nhất dựng HTML từ "ảnh chụp" kết quả — DASHBOARD (xem trước + sửa nhận xét) và TRANG PHỤ HUYNH
   (kiemtra.andrewclasses.com/kq?c=…) dùng CHUNG, nên thầy xem trước = phụ huynh thấy.

   ⛔ BẢN CHÉP: file này có bản y hệt ở repo kiemtra `js/ktdv-bc.js`. Sửa một bên thì chép sang bên kia (và tăng `?v=` cả hai).

   Ảnh chụp `s` (lưu ở Firestore `ktdvChiaSe/{token}.json`, KHÔNG có ID đăng nhập, KHÔNG có dữ liệu quá trình làm bài):
     { v:1, ten, hoTen, truong, lopTruong, anh, ngayLam(ms), ngayBc(ms), uuDiem, hanChe,
       bai:[ { ma, ten, n, d, sai:[{i, q, y, c}] }  |  { ma, ten, n, chua:true } ] }
   Chỉ có Đúng / Chưa đúng — phân loại 4 mức, thời gian, rời trang… nằm ở phần "Chi tiết giáo viên" của dashboard.

   html(s, {sua:true})  ⇒ ô nhận xét là <textarea data-bc-nx="uuDiem|hanChe"> (dashboard).
   ============================================================ */
(function () {
  'use strict';
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ngayVN(ms) { if (!ms) return ''; var d = new Date(ms); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }

  // ---- mức đánh giá chung + màu thanh (chỉ theo %, dễ hiểu với phụ huynh) ----
  function muc(p) {
    if (p >= 85) return { ten: 'Rất tốt', mau: '#1F9D55' };
    if (p >= 70) return { ten: 'Khá', mau: '#0E7C6E' };
    if (p >= 50) return { ten: 'Trung bình', mau: '#E0962B' };
    return { ten: 'Cần củng cố nền tảng', mau: '#D9534F' };
  }
  function mauThanh(p) { return p >= 70 ? '#0E9A86' : p >= 50 ? '#E0962B' : '#D9534F'; }
  function pc(d, n) { return n ? Math.round(100 * d / n) : 0; }

  function tong(s) {
    var d = 0, n = 0;
    (s.bai || []).forEach(function (b) { if (!b.chua) { d += b.d; n += b.n; } });
    return { d: d, n: n, p: pc(d, n) };
  }

  function vong(p, mau) {
    var r = 52, c = 2 * Math.PI * r;
    return '<svg class="kqp-vong" viewBox="0 0 132 132" width="132" height="132" role="img" aria-label="Điểm tổng ' + p + ' phần trăm">' +
      '<circle cx="66" cy="66" r="' + r + '" fill="none" stroke="#E4ECEA" stroke-width="13"/>' +
      '<circle cx="66" cy="66" r="' + r + '" fill="none" stroke="' + mau + '" stroke-width="13" stroke-linecap="round" stroke-dasharray="' + (c * p / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 66 66)"/>' +
      '<text x="66" y="75" text-anchor="middle" font-size="30" font-weight="800" fill="#16232A">' + p + '%</text></svg>';
  }

  function dong(txt) {
    var ls = String(txt || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    return ls.length ? '<ul>' + ls.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul>' : '';
  }
  function nhanXet(khoa, tieu, cls, txt, sua, goiY) {
    if (sua) {
      return '<div class="kqp-nx ' + cls + '"><h4>' + tieu + '</h4><textarea data-bc-nx="' + khoa + '" rows="' + (khoa === 'hanChe' ? 5 : 3) + '" placeholder="' + E(goiY) + '">' + E(txt) + '</textarea>' +
        '<div class="in-chu">' + dong(txt) + '</div></div>';
    }
    var h = dong(txt);
    return h ? '<div class="kqp-nx ' + cls + '"><h4>' + tieu + '</h4>' + h + '</div>' : '';
  }

  function html(s, opt) {
    var sua = !!(opt && opt.sua);
    var t = tong(s), m = muc(t.p), ten = s.hoTen || s.ten || '';
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
    h += '<div class="kqp-tq"><div class="kqp-tq-vong">' + vong(t.p, m.mau) + '</div><div class="kqp-tq-chu">' +
      '<div class="kqp-nhan">Kết quả chung</div><div class="kqp-so"><b>' + t.d + '</b> / ' + t.n + ' câu đúng</div>' +
      '<div class="kqp-muc" style="background:' + m.mau + '">' + m.ten + '</div>' +
      (xong < s.bai.length ? '<div class="kqp-ghi">Mới tính ' + xong + '/' + s.bai.length + ' bài đã nộp.</div>' : '') + '</div></div>';
    h += '<h3 class="kqp-muc-tde">Kết quả từng phần</h3><div class="kqp-cot">' + s.bai.map(function (b, i) {
      if (b.chua) return '<div class="kqp-dong"><div class="kqp-dong-t"><span><i>' + (i + 1) + '</i>' + E(b.ten) + '</span><em>Chưa nộp</em></div><div class="kqp-nen"><u style="width:0"></u></div></div>';
      var p = pc(b.d, b.n);
      return '<div class="kqp-dong"><div class="kqp-dong-t"><span><i>' + (i + 1) + '</i>' + E(b.ten) + '</span><em><b>' + b.d + '</b>/' + b.n + ' câu · ' + p + '%</em></div>' +
        '<div class="kqp-nen"><u style="width:' + Math.max(p, 2) + '%;background:' + mauThanh(p) + '"></u></div></div>';
    }).join('') + '</div>';
    // nhận xét
    var nx = nhanXet('uuDiem', 'Con làm tốt', 'tot', s.uuDiem, sua, 'Điểm tốt của em…') + nhanXet('hanChe', 'Con cần cải thiện', 'can', s.hanChe, sua, 'Những điểm em cần luyện thêm…');
    if (nx) h += '<h3 class="kqp-muc-tde">Nhận xét của thầy</h3><div class="kqp-nxs">' + nx + '</div>';
    // các câu chưa đúng (gập sẵn)
    var co = (s.bai || []).filter(function (b) { return !b.chua && b.sai && b.sai.length; });
    if (co.length) {
      h += '<h3 class="kqp-muc-tde">Các câu con chưa làm đúng</h3>' + co.map(function (b) {
        return '<details class="kqp-ct"><summary>' + E(b.ten) + ' <span>' + b.sai.length + ' câu</span></summary><div class="kqp-ct-ds">' + b.sai.map(function (x) {
          return '<div class="kqp-sai"><div class="kqp-sai-q"><i>' + x.i + '</i>' + E(x.q) + '</div>' +
            '<div class="kqp-sai-y"><span>Con viết</span>' + (x.y ? E(x.y) : '<em>(để trống)</em>') + '</div>' +
            '<div class="kqp-sai-c"><span>Đáp án</span>' + E(x.c) + '</div></div>';
        }).join('') + '</div></details>';
      }).join('');
    }
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
    '.kqp-so{font-size:18px;margin:2px 0 8px} .kqp-so b{font-size:34px;font-weight:800;color:var(--xanh);line-height:1}' +
    '.kqp-muc{display:inline-block;color:#fff;font-weight:800;font-size:14px;border-radius:999px;padding:4px 14px} .kqp-ghi{font-size:12px;color:var(--mo);margin-top:6px}' +
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
    '.kqp-nx textarea{width:100%;font:500 13.5px var(--font,inherit);border:1px solid #CFDCD9;border-radius:10px;padding:9px 10px;resize:vertical;line-height:1.55;background:#fff;color:var(--chu)} .kqp-nx .in-chu{display:none}' +
    '.kqp-ct{border:1px solid var(--vien);border-radius:12px;margin-bottom:8px;background:#fff} .kqp-ct summary{cursor:pointer;padding:11px 14px;font-weight:700;font-size:14px;list-style:none;display:flex;align-items:center;gap:8px}' +
    '.kqp-ct summary::-webkit-details-marker{display:none} .kqp-ct summary::after{content:"＋";order:3;color:var(--xanh);font-weight:800;width:18px;text-align:center} .kqp-ct[open] summary::after{content:"－"}' +
    '.kqp-ct summary span{order:2;font-weight:600;color:var(--mo);font-size:12.5px;margin-left:auto;white-space:nowrap}' +
    '.kqp-ct-ds{padding:0 14px 8px} .kqp-sai{padding:10px 0;border-top:1px solid #EDF2F1;font-size:13.5px}' +
    '.kqp-sai-q{font-weight:700;margin-bottom:3px} .kqp-sai-q i{font-style:normal;color:var(--nhat);margin-right:6px}' +
    '.kqp-sai-y,.kqp-sai-c{display:flex;gap:8px;align-items:baseline} .kqp-sai span{flex:none;width:62px;font-size:11.5px;font-weight:700;color:var(--mo)}' +
    '.kqp-sai-y{color:#B4363B} .kqp-sai-y em{color:var(--nhat)} .kqp-sai-c{color:#1F7A50;font-weight:600}' +
    '.kqp-ky{margin-top:26px;padding-top:12px;border-top:1px solid var(--vien);font-size:12px;color:var(--nhat);text-align:center}' +
    '@media(max-width:520px){.kqp{font-size:14.5px}.kqp-tq{flex-direction:column;text-align:center;gap:10px}.kqp-dong-t{flex-direction:column;gap:2px}.kqp-ten{font-size:19px}}' +
    '@media print{.kqp-tq{background:#fff;border:1px solid var(--vien)} .kqp-nx textarea{display:none} .kqp-nx .in-chu{display:block} .kqp-dong,.kqp-nx,.kqp-sai,.kqp-tq{break-inside:avoid}' +
    ' .kqp *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';

  // in / lưu PDF: mở hết phần "câu chưa đúng" rồi gập lại
  var _mo = [];
  window.addEventListener('beforeprint', function () { _mo = []; [].forEach.call(document.querySelectorAll('.kqp details'), function (d) { if (!d.open) { d.open = true; _mo.push(d); } }); });
  window.addEventListener('afterprint', function () { _mo.forEach(function (d) { d.open = false; }); _mo = []; });

  window.KTDV_BC = { html: html, css: css, tong: tong, muc: muc };
})();
