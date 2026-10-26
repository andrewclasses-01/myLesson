/* ============================================================
   js/xh-ql.js — MÙA XẾP HẠNG trên dashboard (25/10/2026, Đợt 1) — một mục trong hộp "Quản lý thách đấu" (js/td-ql.js).
   Thầy chốt 25/10: thầy tự đặt ngày BẮT ĐẦU + KẾT THÚC · nút đầy đủ: tạo mùa · tạm dừng khẩn cấp · chốt & phát sao ·
   MÙA ĐÃ BẮT ĐẦU thì KHOÁ thông số (luật tools/dang-luat-xep-hang.js cũng khoá) — tránh ảnh hưởng học sinh đang đấu.
   Kho: caiDat/xepHang { mua } · xhMua/{mua} { ten tu den gioVang{tu,den,nhan} sao{dong…ht} phut tt nhap|mo|dung|chot daThuong thuong }
        xhMua/{mua}/em/{uid} (máy chủ ghi; thầy đọc để chốt) · xhMua/{mua}/bang/top.
   Thưởng (26/10 SUẤT): Bạch kim → Huyền thoại = SUẤT theo thứ hạng cuối mùa + điểm sàn (xhMua.suat [{t,n,san}], mặc định 1/2/3/6 ·
   1800/1600/1400/1100) · còn lại theo điểm CAO NHẤT (em.cao), tối đa Vàng (từ 800) · đã đấu ≥1 trận (chưa xong phân hạng) = Đồng.
   Phát sao = phiếu saoDot (nguon 'dashboard', mỗi lớp một phiếu ≤ 300 dòng) ⇒ hàm apDotSao cộng ví + đẩy "+N⭐" (y Thưởng sao giải đấu).
   window.XhQl.ve({ than, tieuDe, luu, kho() → Promise f, toast(chu, loi), laThu })
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  // 26/10 SUẤT (NGHIEN CUU SIET HANG CAO - 26-10-2026.md): Đồng/Bạc/Vàng theo điểm (Vàng từ 800) · 4 hạng trên = SUẤT (thứ hạng cuối mùa + điểm sàn)
  var HANG = [['dong', 'Đồng', 0, '#C27C4A'], ['bac', 'Bạc', 300, '#8A97A6'], ['vang', 'Vàng', 800, '#E0A11B'], ['bk', 'Bạch kim', null, '#1FAE98'],
    ['kc', 'Kim cương', null, '#3B82F6'], ['ct', 'Cao thủ', null, '#8B5CF6'], ['ht', 'Huyền thoại', null, '#E5385A']];
  var SAO_MAC = { dong: 1, bac: 2, vang: 5, bk: 10, kc: 15, ct: 20, ht: 30 };
  var SUAT_MAC = [{ t: 'ht', n: 1, san: 1800 }, { t: 'ct', n: 2, san: 1600 }, { t: 'kc', n: 3, san: 1400 }, { t: 'bk', n: 6, san: 1100 }];
  function suatCua(M) { return M && Array.isArray(M.suat) && M.suat.length ? M.suat : SUAT_MAC; }
  function hangMa(ma) { return HANG.filter(function (h) { return h[0] === ma; })[0] || null; }
  // chia suất cho danh sách đã xếp điểm giảm dần ⇒ { uid: 'ht'|'ct'|'kc'|'bk' } (cùng luật máy chủ xep-hang.js chiaSuat)
  function chiaSuat(xep, suat) {
    var o = {}, i = 0;
    suat.forEach(function (s) { for (var k = 0; k < s.n && i < xep.length && xep[i].diem >= s.san; k++) o[xep[i++].uid] = s.t; });
    return o;
  }
  function chuSuat(M) {
    var i = 0; return suatCua(M).map(function (s) { var vt = s.n > 1 ? (i + 1) + '–' + (i + s.n) : String(i + 1); i += s.n; return chip(hangMa(s.t)) + ' top ' + vt + ' · ≥' + s.san; }).join(' &nbsp; ');
  }
  var O = null, S = { M: null, mua: '', ds: [], top: [], em: null, sua: null, xn: '' };
  var hai = function (n) { return (n < 10 ? '0' : '') + n; };
  function ngayGio(ms) { var d = new Date(ms); return hai(d.getHours()) + ':' + hai(d.getMinutes()) + ' ' + hai(d.getDate()) + '/' + hai(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function oGio(ms) { if (!ms) return ''; var d = new Date(ms); return d.getFullYear() + '-' + hai(d.getMonth() + 1) + '-' + hai(d.getDate()) + 'T' + hai(d.getHours()) + ':' + hai(d.getMinutes()); }
  function tuOGio(v) { var t = v ? new Date(v).getTime() : 0; return isNaN(t) ? 0 : t; }
  function phut(p) { return hai(Math.floor(p / 60)) + ':' + hai(p % 60); }
  function tuPhut(v) { var m = /^(\d{1,2}):(\d{2})$/.exec(v || ''); return m ? +m[1] * 60 + +m[2] : null; }
  function hangTu(d) { if (d == null) return null; var h = HANG[0]; HANG.forEach(function (x) { if (x[2] != null && d >= x[2]) h = x; }); return h; }
  function chip(h) { return h ? '<span class="xhq-h" style="--m:' + h[3] + '">' + E(h[1]) + '</span>' : '<span class="xhq-h xam">Chưa xếp</span>'; }
  function tt(M) {
    var b = Date.now();
    if (!M) return { ma: 'khong', chu: 'Chưa có mùa', cls: 'off' };
    if (M.tt === 'chot') return { ma: 'chot', chu: 'Đã chốt · đã phát thưởng', cls: 'off' };
    if (b < M.tu) return { ma: 'sap', chu: 'Sắp mở · ' + ngayGio(M.tu), cls: 'hen' };
    if (b >= M.den) return { ma: 'het', chu: 'Đã hết mùa · chờ chốt', cls: 'hen' };
    if (M.tt === 'dung') return { ma: 'dung', chu: 'TẠM DỪNG', cls: 'off' };
    return { ma: 'mo', chu: 'Đang chạy · kết thúc ' + ngayGio(M.den), cls: 'on' };
  }
  function css() {
    if ($('#xhqCss')) return;
    var s = document.createElement('style'); s.id = 'xhqCss';
    s.textContent = '.xhq-luoi{display:grid;gap:12px}.xhq-o2{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}' +
      '.xhq-o2 label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:#5b6b75}.xhq-o2 input{font:inherit}' +
      '.xhq-sao{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}.xhq-sao label{display:flex;align-items:center;gap:6px;font-size:13px}' +
      '.xhq-sao input{width:58px}.xhq-suat{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}.xhq-suat label{display:flex;align-items:center;gap:6px;font-size:13px}.xhq-suat input{width:52px}.xhq-h{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;color:#fff;background:var(--m)}.xhq-h.xam{background:#9aa5ad}' +
      '.xhq-tom{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.xhq-tom div{background:#f4f7f8;border-radius:10px;padding:10px}.xhq-tom b{display:block;font-size:20px}' +
      '.xhq-tom small{color:#5b6b75;font-size:12px}.xhq-bang{width:100%;border-collapse:collapse;font-size:13px}.xhq-bang th{text-align:left;color:#5b6b75;font-weight:600;padding:6px;border-bottom:1px solid #e3e8eb}' +
      '.xhq-bang td{padding:6px;border-bottom:1px solid #f0f3f4}.xhq-bang td.so,.xhq-bang th.so{text-align:right;font-variant-numeric:tabular-nums}.xhq-bang input{width:56px;text-align:right}' +
      '.xhq-cuon{max-height:420px;overflow:auto;border:1px solid #e3e8eb;border-radius:10px}.xhq-khoa{display:flex;gap:8px;align-items:flex-start;background:#fff8e6;border:1px solid #f2d48a;border-radius:10px;padding:10px;font-size:13px}' +
      '.xhq-nut{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.xhq-ls{display:flex;flex-direction:column;gap:6px;font-size:13px}.xhq-ls div{display:flex;justify-content:space-between;gap:8px}';
    document.head.appendChild(s);
  }

  // ── nạp ──
  async function nap() {
    if (O.laThu) {
      var b = Date.now();
      S.mua = 'thu'; S.M = S.M || { ten: 'Mùa 1', tu: b - 2 * 864e5, den: b + 26 * 864e5, phut: 2, gioVang: { tu: 1170, den: 1260, nhan: 1.5 }, sao: Object.assign({}, SAO_MAC), tt: 'mo' };
      S.ds = [{ id: 'thu', ten: S.M.ten, tu: S.M.tu, den: S.M.den, tt: S.M.tt }];
      S.em = ['Thiên Phúc', 'Khôi Nguyên', 'Phương Vy', 'Hải Đăng', 'Minh Châu', 'Gia Huy', 'Bảo Nam', 'Khánh Linh'].map(function (t, i) {
        var d = 1742 - i * 190; return { uid: 'hs_10000' + i, ten: t, lop: ['B2-A', 'B1-B', 'A2-B'][i % 3], lopMa: ['B2A', 'B1B', 'A2B'][i % 3], diem: i === 7 ? null : d, cao: i === 7 ? null : d + 30, xl: i === 7 ? 3 : 5, tran: 40 - i * 3 };
      });
      S.top = S.em.filter(function (x) { return x.diem != null; }).slice(0, 20);
      return;
    }
    var f = await O.kho();
    var c = await f.fs.getDoc(f.fs.doc(f.db, 'caiDat', 'xepHang'));
    S.mua = c.exists() ? String(c.data().mua || '') : '';
    S.M = null; S.em = null; S.top = [];
    var all = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'xhMua'), f.fs.orderBy('tu', 'desc'), f.fs.limit(20)));
    S.ds = []; all.forEach(function (d) { var x = d.data(); x.id = d.id; S.ds.push(x); if (d.id === S.mua) S.M = x; });
    if (S.M) {
      var t = await f.fs.getDoc(f.fs.doc(f.db, 'xhMua', S.mua, 'bang', 'top'));
      S.top = t.exists() ? t.data().ds || [] : [];
    }
  }
  async function napEm() {
    if (S.em) return S.em;
    var f = await O.kho(), s = await f.fs.getDocs(f.fs.collection(f.db, 'xhMua', S.mua, 'em')), ds = [];
    s.forEach(function (d) { var x = d.data(); x.uid = d.id; ds.push(x); });
    return (S.em = ds);
  }

  // ── vẽ ──
  async function ve(o) {
    O = o || O; css();
    O.tieuDe.innerHTML = 'Mùa xếp hạng<small>A Show Speed 1–1 · đấu mọi lớp theo hạng</small>';
    O.luu.innerHTML = '<span class="tdq-goi">Mùa đã bắt đầu thì thông số bị khoá — chỉ còn Tạm dừng và Chốt.</span>';
    O.than.innerHTML = '<div class="tdq-rong">Đang tải…</div>';
    try { await nap(); } catch (e) { O.than.innerHTML = '<div class="tdq-rong">Chưa tải được: ' + E(e && e.message || e) + '</div>'; return; }
    veThan();
  }
  function veThan() {
    var M = S.M, T = tt(M), h = '';
    if (S.sua) h = veForm();
    else if (!M || T.ma === 'chot') h = '<div class="tdq-the"><div class="tdq-the-dau"><div><b>' + (M ? 'Mùa trước đã chốt' : 'Chưa có mùa xếp hạng') + '</b><small>Tạo mùa mới: đặt ngày bắt đầu, ngày kết thúc, giờ vàng và sao thưởng.</small></div>' +
      '<button type="button" class="tdq-nut" data-tao>Tạo mùa mới</button></div></div>';
    else h = veMua(M, T);
    h += veLichSu();
    O.than.innerHTML = '<div class="xhq-luoi">' + h + '</div>';
    gan();
  }
  function veMua(M, T) {
    var g = M.gioVang || {}, sao = M.sao || {};
    var thongSo = '<div class="xhq-tom"><div><small>Bắt đầu</small><b style="font-size:15px">' + E(ngayGio(M.tu)) + '</b></div><div><small>Kết thúc</small><b style="font-size:15px">' + E(ngayGio(M.den)) + '</b></div>' +
      '<div><small>Thời gian trận</small><b>' + (M.phut || 2) + ' phút</b></div><div><small>Giờ vàng</small><b style="font-size:15px">' + (g.nhan > 1 ? phut(g.tu) + '–' + phut(g.den) + ' · ×' + String(g.nhan).replace('.', ',') : 'Tắt') + '</b></div></div>' +
      '<div class="xhq-sao" style="margin-top:8px">' + HANG.map(function (x) { return '<span>' + chip(x) + ' ' + (sao[x[0]] || 0) + ' ⭐</span>'; }).join('') + '</div>' +
      '<p class="tdq-goi" style="margin-top:8px">Suất: ' + chuSuat(M) + ' · Vàng từ 800 · ai đấu ≥1 trận được Đồng</p>';
    var nut = '';
    if (T.ma === 'sap') nut = '<button type="button" class="tdq-nut phu" data-xoa>Xoá mùa</button><button type="button" class="tdq-nut" data-sua>Sửa thông số</button>';
    else if (T.ma === 'mo') nut = '<button type="button" class="tdq-nut do" data-dung>' + (S.xn === 'dung' ? 'Bấm lần nữa: TẠM DỪNG' : 'Tạm dừng khẩn cấp') + '</button>';
    else if (T.ma === 'dung') nut = '<button type="button" class="tdq-nut" data-molai>' + (S.xn === 'molai' ? 'Bấm lần nữa: MỞ LẠI' : 'Mở lại mùa giải') + '</button>';
    var khoa = T.ma === 'sap' ? '' : '<div class="xhq-khoa">🔒<span>Mùa đã bắt đầu nên ngày, giờ vàng và sao thưởng <b>đã khoá</b> để công bằng với học sinh đang đấu.' +
      (T.ma === 'mo' || T.ma === 'dung' ? ' Tạm dừng chỉ dùng khi khẩn cấp: học sinh không tìm được trận mới, điểm giữ nguyên.' : '') + '</span></div>';
    var top = S.top.length ? '<div class="xhq-cuon"><table class="xhq-bang"><thead><tr><th>#</th><th>Học sinh</th><th>Lớp</th><th>Hạng</th><th class="so">Điểm</th><th class="so">Trận</th></tr></thead><tbody>' +
      S.top.map(function (x, i) { return '<tr><td>' + (i + 1) + '</td><td>' + E(x.ten) + '</td><td>' + E(x.lop) + '</td><td>' + chip(x.s ? hangMa(x.s) : x.ht ? HANG[6] : hangTu(x.diem)) + '</td><td class="so">' + x.diem + '</td><td class="so">' + (x.tran || 0) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' : '<div class="tdq-rong nho">Chưa có em nào xong 5 trận phân hạng.</div>';
    var chot = T.ma === 'het' ? '<div class="tdq-the"><div class="tdq-the-dau"><div><b>Chốt mùa &amp; phát thưởng</b><small>Xem trước sao của từng em rồi phát một lần.</small></div>' +
      '<button type="button" class="tdq-nut" data-xemchot>Xem trước &amp; chốt</button></div><div id="xhqChot"></div></div>' : '';
    return '<div class="tdq-the"><div class="tdq-the-dau"><div><b>' + E(M.ten) + '</b><small>Học sinh vào: Khám phá → Xếp hạng</small></div><span class="tdq-pill ' + T.cls + '">' + E(T.chu) + '</span></div>' +
      thongSo + khoa + '<div class="xhq-nut" style="margin-top:10px">' + nut + '</div></div>' + chot +
      '<div class="tdq-the"><div class="tdq-the-dau"><div><b>Top 20 toàn trường</b><small>Học sinh chỉ thấy top 20 + hạng của chính mình</small></div></div>' + top + '</div>';
  }
  function veForm() {
    var x = S.sua, g = x.gioVang || {}, vang = g.nhan > 1;
    return '<div class="tdq-the"><div class="tdq-the-dau"><div><b>' + (x.id ? 'Sửa mùa (chưa bắt đầu)' : 'Tạo mùa mới') + '</b><small>Mùa tự mở cho học sinh đúng giờ bắt đầu. Đã bắt đầu thì khoá thông số.</small></div></div>' +
      '<div class="xhq-o2"><label>Tên mùa<input class="tdq-o" data-f="ten" maxlength="60" value="' + E(x.ten) + '"></label>' +
      '<label>Bắt đầu<input class="tdq-o" type="datetime-local" data-f="tu" value="' + oGio(x.tu) + '"></label>' +
      '<label>Kết thúc<input class="tdq-o" type="datetime-local" data-f="den" value="' + oGio(x.den) + '"></label></div>' +
      '<div class="tdq-chips" style="margin-top:6px"><span class="tdq-nhan" style="margin-right:6px">Độ dài nhanh</span>' + [14, 21, 28, 35].map(function (n) { return '<button type="button" data-dai="' + n + '">' + (n / 7) + ' tuần</button>'; }).join('') + '</div>' +
      '<span class="tdq-nhan">Thời gian mỗi trận</span><div class="tdq-seg">' + [2, 3].map(function (p) { return '<button type="button" data-phut="' + p + '"' + ((x.phut || 2) === p ? ' class="chon"' : '') + '>' + p + ' phút</button>'; }).join('') + '</div>' +
      '<span class="tdq-nhan">Giờ vàng (điểm cộng nhân lên)</span><div class="tdq-seg"><button type="button" data-vang="1"' + (vang ? ' class="chon"' : '') + '>Bật</button><button type="button" data-vang="0"' + (vang ? '' : ' class="chon"') + '>Tắt</button></div>' +
      (vang ? '<div class="xhq-o2"><label>Từ<input class="tdq-o" type="time" data-f="gvTu" value="' + phut(g.tu) + '"></label><label>Đến<input class="tdq-o" type="time" data-f="gvDen" value="' + phut(g.den) + '"></label>' +
        '<label>Hệ số<select class="tdq-o" data-f="gvNhan">' + [1.5, 2].map(function (n) { return '<option value="' + n + '"' + (g.nhan === n ? ' selected' : '') + '>×' + String(n).replace('.', ',') + '</option>'; }).join('') + '</select></label></div>' : '') +
      '<span class="tdq-nhan">Sao thưởng cuối mùa</span><div class="xhq-sao">' +
      HANG.map(function (h) { return '<label>' + chip(h) + '<input class="tdq-o" inputmode="numeric" data-sao="' + h[0] + '" value="' + ((x.sao || {})[h[0]] || 0) + '"></label>'; }).join('') + '</div>' +
      '<span class="tdq-nhan">Suất hạng cao (theo thứ hạng lúc hết mùa · số suất + điểm sàn) — Đồng/Bạc/Vàng theo điểm cao nhất, Vàng từ 800</span><div class="xhq-suat">' +
      suatCua(x).map(function (s) { return '<label>' + chip(hangMa(s.t)) + '<input class="tdq-o" inputmode="numeric" data-sn="' + s.t + '" value="' + s.n + '" title="Số suất"> suất · ≥<input class="tdq-o" inputmode="numeric" data-ss="' + s.t + '" value="' + s.san + '" title="Điểm sàn"></label>'; }).join('') + '</div>' +
      '<p class="tdq-goi" id="xhqLoi" role="alert"></p>' +
      '<div class="xhq-nut"><button type="button" class="tdq-nut phu" data-thoi>Thôi</button><button type="button" class="tdq-nut" data-luu>' + (x.id ? 'Lưu thay đổi' : 'Tạo mùa') + '</button></div></div>';
  }
  function veLichSu() {
    var cu = S.ds.filter(function (x) { return x.id !== S.mua || x.tt === 'chot'; });
    if (!cu.length) return '';
    return '<div class="tdq-the"><div class="tdq-the-dau"><div><b>Các mùa trước</b></div></div><div class="xhq-ls">' + cu.map(function (x) {
      return '<div><span>' + E(x.ten) + ' · ' + E(ngayGio(x.tu).slice(6)) + ' → ' + E(ngayGio(x.den).slice(6)) + '</span><span>' + (x.tt === 'chot' ? 'Đã chốt' + (x.thuong ? ' · ' + x.thuong.sao + ' ⭐ / ' + x.thuong.em + ' em' : '') : '—') + '</span></div>';
    }).join('') + '</div></div>';
  }

  // ── thao tác ──
  function gan() {
    var th = O.than;
    var b = $('[data-tao]', th); if (b) b.onclick = function () {
      var d = new Date(); d.setDate(d.getDate() + 1); d.setHours(6, 0, 0, 0);
      var n = S.ds.length + 1;
      S.sua = { ten: 'Mùa ' + n, tu: d.getTime(), den: d.getTime() + 28 * 864e5 + 15 * 36e5, phut: 2, gioVang: { tu: 1170, den: 1260, nhan: 1.5 }, sao: Object.assign({}, SAO_MAC) };
      veThan();
    };
    b = $('[data-sua]', th); if (b) b.onclick = function () { S.sua = JSON.parse(JSON.stringify(S.M)); S.sua.id = S.mua; veThan(); };
    b = $('[data-thoi]', th); if (b) b.onclick = function () { S.sua = null; veThan(); };
    $$('[data-dai]', th).forEach(function (x) { x.onclick = function () { docForm(); var d = new Date(S.sua.tu + +x.dataset.dai * 864e5); d.setHours(21, 0, 0, 0); S.sua.den = d.getTime(); veThan(); }; });
    $$('[data-phut]', th).forEach(function (x) { x.onclick = function () { docForm(); S.sua.phut = +x.dataset.phut; veThan(); }; });
    $$('[data-vang]', th).forEach(function (x) { x.onclick = function () { docForm(); S.sua.gioVang = x.dataset.vang === '1' ? { tu: (S.sua.gioVang || {}).tu || 1170, den: (S.sua.gioVang || {}).den || 1260, nhan: 1.5 } : { tu: 0, den: 0, nhan: 1 }; veThan(); }; });
    b = $('[data-luu]', th); if (b) b.onclick = luuMua;
    b = $('[data-xoa]', th); if (b) b.onclick = xoaMua;
    b = $('[data-dung]', th); if (b) b.onclick = function () { doiTT('dung'); };
    b = $('[data-molai]', th); if (b) b.onclick = function () { doiTT('molai'); };
    b = $('[data-xemchot]', th); if (b) b.onclick = xemChot;
  }
  function docForm() {
    var th = O.than, x = S.sua; if (!x) return;
    var v = function (k) { var i = $('[data-f="' + k + '"]', th); return i ? i.value : null; };
    if (v('ten') != null) x.ten = v('ten').trim();
    if (v('tu') != null) x.tu = tuOGio(v('tu'));
    if (v('den') != null) x.den = tuOGio(v('den'));
    if (v('gvTu') != null) x.gioVang = { tu: tuPhut(v('gvTu')), den: tuPhut(v('gvDen')), nhan: +v('gvNhan') || 1.5 };
    x.sao = x.sao || {}; $$('[data-sao]', th).forEach(function (i) { x.sao[i.dataset.sao] = Math.max(0, Math.min(500, parseInt(i.value, 10) || 0)); });
    if ($('[data-sn]', th)) x.suat = SUAT_MAC.map(function (s) {
      var n = $('[data-sn="' + s.t + '"]', th), sn = $('[data-ss="' + s.t + '"]', th);
      return { t: s.t, n: Math.max(0, Math.min(20, parseInt(n && n.value, 10) || 0)), san: Math.max(800, Math.min(5000, parseInt(sn && sn.value, 10) || s.san)) };
    });
  }
  async function luuMua() {
    docForm();
    var x = S.sua, loi = '', b = Date.now(), g = x.gioVang || {};
    if (!x.ten) loi = 'Thầy đặt tên mùa nhé.';
    else if (!x.tu || !x.den) loi = 'Thiếu ngày bắt đầu hoặc kết thúc.';
    else if (x.den <= x.tu + 864e5) loi = 'Mùa phải dài hơn 1 ngày.';
    else if (x.tu < b - 60000) loi = 'Ngày bắt đầu đã qua — chọn giờ ở tương lai (mùa bắt đầu là khoá thông số).';
    else if (g.nhan > 1 && (g.tu == null || g.den == null || g.tu === g.den)) loi = 'Giờ vàng chưa đúng.';
    if (loi) { $('#xhqLoi').textContent = loi; return; }
    var doc = { ten: x.ten.slice(0, 60), tu: x.tu, den: x.den, phut: x.phut || 2, gioVang: { tu: g.tu || 0, den: g.den || 0, nhan: g.nhan > 1 ? g.nhan : 1 },
      sao: {}, suat: suatCua(x).map(function (s) { return { t: s.t, n: s.n, san: s.san }; }), tt: 'mo', capNhat: b };
    HANG.forEach(function (h) { doc.sao[h[0]] = (x.sao || {})[h[0]] || 0; });
    try {
      if (O.laThu) { S.M = Object.assign({}, doc); S.mua = 'thu'; }
      else {
        var f = await O.kho(), id = x.id || ('mua' + new Date(x.tu).toISOString().slice(0, 10).replace(/-/g, '') + Math.random().toString(36).slice(2, 6));
        doc.taoLuc = x.id ? (S.M.taoLuc || b) : b; doc.boi = 'thay';
        await f.fs.setDoc(f.fs.doc(f.db, 'xhMua', id), doc);
        await f.fs.setDoc(f.fs.doc(f.db, 'caiDat', 'xepHang'), { mua: id, capNhat: b });
      }
      O.toast(x.id ? 'Đã lưu thông số mùa.' : 'Đã tạo ' + doc.ten + ' — tự mở cho học sinh lúc ' + ngayGio(doc.tu) + '.');
      S.sua = null; await ve();
    } catch (e) { $('#xhqLoi').textContent = 'Chưa lưu được: ' + (e && (e.code || e.message) || e); }
  }
  async function xoaMua() {
    if (S.xn !== 'xoa') { S.xn = 'xoa'; O.toast('Bấm "Xoá mùa" lần nữa để xoá (mùa chưa bắt đầu).'); return; }
    S.xn = '';
    try {
      if (!O.laThu) { var f = await O.kho(); await f.fs.deleteDoc(f.fs.doc(f.db, 'xhMua', S.mua)); await f.fs.setDoc(f.fs.doc(f.db, 'caiDat', 'xepHang'), { mua: '', capNhat: Date.now() }); }
      else S.M = null;
      O.toast('Đã xoá mùa.'); await ve();
    } catch (e) { O.toast('Chưa xoá được: ' + (e.code || e.message), true); }
  }
  async function doiTT(k) {
    if (S.xn !== k) { S.xn = k; return veThan(); }
    S.xn = '';
    var moi = k === 'dung' ? 'dung' : 'mo';
    try {
      if (!O.laThu) { var f = await O.kho(); await f.fs.updateDoc(f.fs.doc(f.db, 'xhMua', S.mua), { tt: moi, capNhat: Date.now() }); }
      S.M.tt = moi;
      O.toast(moi === 'dung' ? 'Đã TẠM DỪNG mùa giải — học sinh không tìm được trận mới.' : 'Đã mở lại mùa giải.');
      veThan();
    } catch (e) { O.toast('Chưa đổi được: ' + (e.code || e.message), true); }
  }
  // ── chốt + phát thưởng ──
  async function xemChot() {
    var o = $('#xhqChot'); o.innerHTML = '<div class="tdq-rong nho">Đang tính…</div>';
    var em, timSo;
    try {
      em = (await napEm()).slice();
      if (O.laThu) timSo = function (uid) { return String(uid).replace(/\D/g, '').slice(-6); };
      else timSo = await GiaiGhi.soCuaUid(await O.kho(), '');
    } catch (e) { o.innerHTML = '<div class="tdq-rong nho">Chưa tính được: ' + E(e.message || e) + '</div>'; return; }
    var sao = S.M.sao || {};
    var xep = em.filter(function (x) { return x.diem != null; }).sort(function (a, b) { return b.diem - a.diem; });
    var suat = chiaSuat(xep, suatCua(S.M));
    var ds = em.map(function (x) {
      // suất (BK→HT) theo thứ hạng cuối mùa · ngoài suất: hạng theo điểm cao nhất (trần Vàng) · chưa xong phân hạng nhưng đã đấu ≥1 trận: Đồng
      var h = suat[x.uid] ? hangMa(suat[x.uid]) : x.diem != null ? hangTu(x.cao != null ? x.cao : x.diem) : (x.tran || x.xl) ? HANG[0] : null;
      return { x: x, h: h, so: timSo(x.uid), n: h ? sao[h[0]] || 0 : 0 };
    }).sort(function (a, b) { return (b.x.diem == null ? -1 : b.x.diem) - (a.x.diem == null ? -1 : a.x.diem); });
    S.chot = ds;
    var tong = function () { var n = 0, c = 0; ds.forEach(function (r) { if (r.n > 0 && r.so) { n += r.n; c++; } }); return { n: n, c: c }; };
    var t = tong();
    o.innerHTML = '<p class="tdq-goi">Suất: ' + chuSuat(S.M) + ' (thứ hạng cuối mùa, suất không ai đủ điểm sàn thì bỏ trống) · còn lại theo điểm CAO NHẤT, tối đa Vàng (từ 800) · đã đấu ≥1 trận: ít nhất Đồng. Thầy sửa số sao từng em được.</p>' +
      '<div class="xhq-cuon"><table class="xhq-bang"><thead><tr><th>Học sinh</th><th>Lớp</th><th>Hạng thưởng</th><th class="so">Điểm cuối</th><th class="so">Trận</th><th class="so">Sao</th></tr></thead><tbody>' +
      ds.map(function (r, i) {
        return '<tr><td>' + E(r.x.ten) + (r.so ? '' : ' <small style="color:#c0392b">⚠ chưa có số HS</small>') + '</td><td>' + E(r.x.lop || '') + '</td><td>' + chip(r.h) + (r.x.diem == null ? ' <small>' + (r.x.xl || 0) + '/5 trận phân hạng</small>' : '') +
          '</td><td class="so">' + (r.x.diem == null ? '—' : r.x.diem) + '</td><td class="so">' + (r.x.tran || 0) + '</td><td class="so"><input class="tdq-o" inputmode="numeric" data-i="' + i + '" value="' + r.n + '"' + (r.so ? '' : ' disabled') + '></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<label class="tdq-hop-chon" style="margin-top:8px"><input type="checkbox" id="xhqBao" checked> Gửi lời chúc mừng vào nhóm chat các lớp</label>' +
      '<p class="tdq-goi" id="xhqChotLoi" role="alert"></p>' +
      '<div class="xhq-nut"><span class="tdq-goi" id="xhqTong">' + t.n + ' ⭐ cho ' + t.c + ' em</span><button type="button" class="tdq-nut" id="xhqPhat">Chốt mùa &amp; phát thưởng</button></div>';
    $$('[data-i]', o).forEach(function (i) {
      i.oninput = function () { i.value = i.value.replace(/\D/g, '').slice(0, 3); ds[+i.dataset.i].n = +i.value || 0; var t2 = tong(); $('#xhqTong').textContent = t2.n + ' ⭐ cho ' + t2.c + ' em'; $('#xhqPhat').removeAttribute('data-xn'); $('#xhqPhat').innerHTML = 'Chốt mùa &amp; phát thưởng'; };
    });
    $('#xhqPhat').onclick = async function () {
      var t2 = tong(), nut = this;
      if (nut.getAttribute('data-xn') !== t2.n + '/' + t2.c) {
        nut.setAttribute('data-xn', t2.n + '/' + t2.c); nut.textContent = 'Bấm lần nữa: phát ' + t2.n + ' ⭐';
        $('#xhqChotLoi').textContent = 'Sao vào ví các em ngay và mùa chuyển sang ĐÃ CHỐT — không làm lại được.'; return;
      }
      nut.disabled = true;
      try { await phat(ds, $('#xhqBao').checked); O.toast('Đã chốt ' + S.M.ten + ' và phát ' + t2.n + ' ⭐ cho ' + t2.c + ' em.'); await ve(); }
      catch (e) { nut.disabled = false; $('#xhqChotLoi').textContent = 'Chưa phát được: ' + (e.code || e.message || e); }
    };
  }
  async function phat(ds, bao) {
    var M = S.M, b = Date.now(), theoLop = {};
    ds.forEach(function (r) { if (r.n > 0 && r.so) (theoLop[r.x.lopMa || 'XH'] = theoLop[r.x.lopMa || 'XH'] || []).push({ so: r.so, n: r.n, viec: 'Hạng ' + r.h[1] + ' · ' + M.ten + ' (Xếp hạng)', app: 'Xếp hạng', _ten: r.x.ten, _h: r.h[1] }); });
    var tong = { em: 0, sao: 0 };
    Object.keys(theoLop).forEach(function (l) { theoLop[l].forEach(function (x) { tong.em++; tong.sao += x.n; }); });
    if (O.laThu) { M.tt = 'chot'; M.daThuong = true; M.thuong = tong; return; }
    var f = await O.kho(), ngay = new Date(b + 7 * 3600e3).toISOString().slice(0, 10);
    for (var l in theoLop) {
      for (var k = 0; k < theoLop[l].length; k += 300) {
        await f.fs.addDoc(f.fs.collection(f.db, 'saoDot'), { nguon: 'dashboard', lop: l, ngay: ngay, bai: 'xh:' + S.mua, maBai: '', nhom: 'Xếp hạng: ' + M.ten, ai: 'Thầy Andrew',
          dong: theoLop[l].slice(k, k + 300).map(function (x) { return { so: x.so, n: x.n, viec: x.viec, app: x.app }; }), tao: b });
      }
    }
    await f.fs.updateDoc(f.fs.doc(f.db, 'xhMua', S.mua), { tt: 'chot', chotLuc: b, daThuong: true, thuong: tong, capNhat: b });
    if (bao && window.GiaiGhi) {
      for (var lop in theoLop) {
        if (lop === 'XH') continue;
        var chu = '🏆 ' + M.ten + ' xếp hạng đã kết thúc! ' + theoLop[lop].slice(0, 12).map(function (x) { return x._ten + ' (' + x._h + ') +' + x.n + '⭐'; }).join(' · ') + '. Chúc mừng các em! 👏';
        try { await GiaiGhi.guiNhom(f, lop, chu); } catch (e) { console.warn('[xếp hạng] báo nhóm', lop, e); }
      }
    }
  }

  window.XhQl = { ve: ve };
})();
