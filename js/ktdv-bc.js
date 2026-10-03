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
   goiY(bàiLàm, đápÁn, đề)  ⇒ lời giải thích TỰ ĐỘNG tiếng Việt (so từng từ + luật lỗi thường gặp) — thầy / Claude vẫn sửa lại được.
   Câu để trống: hiện “✗ Để trống” (đỏ) + “Đáp án đúng: …”, KHÔNG có lời giải thích. Lời giải thích không nhắc tới "đáp án".
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

  // ---- lời giải thích câu sai TỰ ĐỘNG (so từng từ với đáp án; thầy / Claude vẫn sửa lại được) ----
  // Giọng như cột "Nhận xét" của file chấm Excel: nêu RÕ lỗi gì, vì sao (không nhắc tới "đáp án", không bảo em đi đối chiếu). Câu để trống: KHÔNG có lời (chỉ hiện "✗ Để trống" + đáp án đúng).
  // Nhận ra: lệch quá nhiều ý · sai chính tả · sai/thiếu/thừa a/an · số ít–số nhiều (cả bất quy tắc) · chia động từ ngôi thứ ba · sai thì quá khứ · sai/thiếu "to be" ·
  // thiếu do/does/did/will/have/has/had/been/can/to · thiếu từ chỉ thời gian · sai từ vựng (so với nghĩa tiếng Việt của đề) · sai dạng từ.
  function tok(s) {
    return String(s || '').normalize('NFC').toLowerCase().replace(/[‘’`]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(function (x) { return x; });
  }
  function lev(a, b) {
    var m = a.length, n = b.length, p = [], i, j;
    for (j = 0; j <= n; j++) p[j] = j;
    for (i = 1; i <= m; i++) { var c = [i]; for (j = 1; j <= n; j++) c[j] = a.charAt(i - 1) === b.charAt(j - 1) ? p[j - 1] : 1 + Math.min(p[j - 1], p[j], c[j - 1]); p = c; }
    return p[n];
  }
  function dangS(x, z) {   // x = z thêm s/es/ies/ves ?
    return x === z + 's' || x === z + 'es' || (/ies$/.test(x) && z === x.slice(0, -3) + 'y') || (/ves$/.test(x) && (z === x.slice(0, -3) + 'f' || z === x.slice(0, -3) + 'fe'));
  }
  function q(x) { return '“' + x + '”'; }
  var SO_NHIEU_BQT = { foot: 'feet', tooth: 'teeth', child: 'children', man: 'men', woman: 'women', mouse: 'mice', person: 'people', goose: 'geese', ox: 'oxen' };
  var QUA_KHU = { be: 'was', is: 'was', am: 'was', are: 'were', go: 'went', eat: 'ate', have: 'had', has: 'had', buy: 'bought', see: 'saw', make: 'made', come: 'came', take: 'took', give: 'gave',
    get: 'got', write: 'wrote', drink: 'drank', swim: 'swam', meet: 'met', say: 'said', tell: 'told', know: 'knew', think: 'thought', leave: 'left', do: 'did', run: 'ran', sleep: 'slept', can: 'could',
    sit: 'sat', stand: 'stood', find: 'found', bring: 'brought', play: 'played', help: 'helped', work: 'worked', cook: 'cooked', walk: 'walked' };
  var BE = ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being'];
  var VI_TG = { yesterday: 'hôm qua', tomorrow: 'ngày mai', tonight: 'tối nay', ago: 'cách đây', last: 'trước / qua', next: 'tới / sau', now: 'bây giờ', today: 'hôm nay', always: 'luôn luôn', often: 'thường',
    usually: 'thường', never: 'không bao giờ', sometimes: 'thỉnh thoảng', already: 'rồi', ever: 'từng', just: 'vừa', for: 'trong khoảng thời gian', since: 'kể từ khi', morning: 'buổi sáng', afternoon: 'buổi chiều', evening: 'buổi tối', night: 'đêm / tối', week: 'tuần', tuesday: 'thứ ba', monday: 'thứ hai', sunday: 'chủ nhật' };
  var TG = Object.keys(VI_TG);
  var SAU_NGUYEN_MAU = ['will', 'can', 'cannot', 'could', 'to', 'do', 'does', 'did', 'not', 'must', 'should', 'may', 'would'];
  function laSo(w) { return /^(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|\d+)$/.test(w) && w !== '1'; }
  // từ đứng ngay trước / sau "z" trong đáp án (b là mảng từ thường, cGoc là chuỗi gốc có hoa)
  function truoc(b, z) { var i = b.indexOf(z); return i > 0 ? b[i - 1] : ''; }
  function sau(b, z) { var i = b.indexOf(z); return (i >= 0 && i < b.length - 1) ? b[i + 1] : ''; }
  var HAN_DINH = ['the', 'a', 'an', 'my', 'your', 'his', 'her', 'our', 'their', 'its', 'those', 'these', 'this', 'that', 'many', 'some', 'any', 'all', 'few', 'big', 'small', 'new', 'old', 'good', 'tall', 'short', 'beautiful', 'little', 'great', 'nice'];
  // z (đã thêm s/es) là ĐỘNG TỪ chia ngôi thứ ba (he/she/it/tên riêng/danh từ số ít đứng trước) hay là DANH TỪ số nhiều?
  function laDongTu(b, z) {
    var i = b.indexOf(z), t;
    if (i <= 0) return false;
    t = i - 1;
    while (t >= 0 && (TG.indexOf(b[t]) >= 0 || b[t] === 'not' || b[t] === 'also')) t--;   // bỏ qua trạng từ: “She often watches”
    if (t < 0) return false;
    return HAN_DINH.indexOf(b[t]) < 0 && !laSo(b[t]);
  }
  function ghepCap(x, z, b, ngan) {   // x = con viết, z = cần viết; trả lời giải thích hoặc null nếu hai từ không có quan hệ rõ
    if ((x === 'a' || x === 'an') && (z === 'a' || z === 'an')) return 'Sai mạo từ: trước ' + q(sau(b, z) || 'từ này') + ' phải dùng ' + q(z) + ' (con viết ' + q(x) + '); “an” đứng trước nguyên âm (u, e, o, a, i), “a” đứng trước phụ âm.';
    if (SO_NHIEU_BQT[x] === z) return 'Sai số nhiều bất quy tắc: số nhiều của ' + q(x) + ' là ' + q(z) + '.';
    if (BE.indexOf(x) >= 0 && BE.indexOf(z) >= 0) {
      if (z === 'are' || z === 'were') return 'Sai chia “to be”: chủ ngữ số nhiều phải dùng ' + q(z) + ', con viết ' + q(x) + '.';
      if (z === 'is' || z === 'was') return 'Sai chia “to be”: chủ ngữ số ít (he, she, it, danh từ số ít) phải dùng ' + q(z) + ', con viết ' + q(x) + '.';
      return 'Sai chia “to be”: ' + q(x) + ' không hợp với chủ ngữ hoặc thì của câu, cần dùng ' + q(z) + '.';
    }
    if (QUA_KHU[x] === z) {
      var m = b.filter(function (w) { return ['yesterday', 'ago', 'last'].indexOf(w) >= 0; })[0];
      return 'Sai thì: ' + (m ? 'câu có ' + q(m) + ' (' + VI_TG[m] + ') nên' : 'câu ở quá khứ nên') + ' động từ phải chia quá khứ: ' + q(x) + ' → ' + q(z) + '.';
    }
    if (dangS(x, z)) {
      if (ngan) return 'Sai số ít/nhiều: ' + (b.indexOf('a') >= 0 || b.indexOf('an') >= 0 ? '“a/an” (một) yêu cầu danh từ số ít ' : 'danh từ phải ở số ít ') + q(z) + ', nhưng con viết ' + q(x) + ' (số nhiều).';
      return 'Sai chia từ: thừa “s/es” ở ' + q(x) + ' — chủ ngữ này không đòi thêm “s”, cần viết ' + q(z) + '.';
    }
    if (dangS(z, x)) {
      var so = b.filter(laSo)[0];
      if (so) return 'Sai số ít/nhiều: có số lượng ' + q(so) + ' (từ hai trở lên) nên danh từ phải ở số nhiều: ' + q(x) + ' → ' + q(z) + '.';
      if (!ngan && laDongTu(b, z)) return 'Sai chia động từ hiện tại đơn: chủ ngữ ngôi thứ ba số ít (he, she, it, tên riêng) cần thêm “s/es”: ' + q(x) + ' → ' + q(z) + '.';
      return 'Sai số ít/nhiều: danh từ phải ở số nhiều: ' + q(x) + ' → ' + q(z) + '.';
    }
    var du = x.length > z.length ? (x.indexOf(z) === 0 ? x.slice(z.length) : null) : (z.indexOf(x) === 0 ? z.slice(x.length) : null);
    if (x.length >= 3 && z.length >= 3 && du && ['ed', 'ing', 'ly', 'er', 'est'].indexOf(du) >= 0) {
      if (du === 'ly' && z.length > x.length) return 'Sai loại từ: ở đây cần trạng từ ' + q(z) + ' (bổ nghĩa cho động từ), con viết tính từ ' + q(x) + '.';
      var tr = truoc(b, z);
      return 'Sai dạng từ: ' + (SAU_NGUYEN_MAU.indexOf(tr) >= 0 ? 'sau ' + q(tr) + ' động từ phải ở dạng nguyên mẫu' : 'dạng của từ chưa đúng') + ': ' + q(x) + ' → ' + q(z) + '.';
    }
    if (z.length >= 4 && lev(x, z) <= (z.length >= 8 ? 3 : 2)) return 'Sai chính tả: ' + q(x) + ' → ' + q(z) + '.';
    return null;
  }
  // y = bài làm của em · c = đáp án · de = đề tiếng Việt (tuỳ chọn, để nói "không đúng nghĩa của …")
  function goiY(y, c, de) {
    y = String(y || '').trim(); c = String(c || '').trim();
    if (!y) return '';   // để trống: không có lời — giao diện tự hiện “✗ Để trống”
    var a = tok(y), b = tok(c);
    if (!b.length) return '';
    if (a.join(' ') === b.join(' ')) return 'Chỉ lệch dấu câu hoặc cách viết hoa, nội dung đúng.';
    var dem = function (arr) { var m = {}; arr.forEach(function (w) { m[w] = (m[w] || 0) + 1; }); return m; };
    var da = dem(a), thieu = [], thua = [];
    b.forEach(function (w) { if ((da[w] || 0) > 0) da[w]--; else thieu.push(w); });
    var db2 = dem(b);
    a.forEach(function (w) { if ((db2[w] || 0) > 0) db2[w]--; else thua.push(w); });
    var khop = b.length - thieu.length;
    var ngan = b.length <= 4 && !b.some(function (w) { return BE.concat(['i', 'he', 'she', 'it', 'we', 'they', 'you', 'do', 'does', 'did', 'will', 'can', 'cannot']).indexOf(w) >= 0; });   // cụm danh từ (BT1/BT2), không phải câu ngắn
    if (!ngan && khop / b.length < 0.34) return 'Câu dịch chưa đúng ý: cần diễn đạt đủ ý của câu tiếng Việt bằng câu tiếng Anh đúng ngữ pháp.';
    var ms = [];
    thua = thua.slice(); thieu = thieu.slice();
    for (var i = thua.length - 1; i >= 0; i--) {
      for (var j = 0; j < thieu.length; j++) {
        var g = ghepCap(thua[i], thieu[j], b, ngan);
        if (g) { ms.push(g); thua.splice(i, 1); thieu.splice(j, 1); break; }
      }
    }
    var loc = function (arr, kho) { return arr.filter(function (w) { return kho.indexOf(w) >= 0; }); };
    var tMao = loc(thieu, ['a', 'an']), tBe = loc(thieu, BE), tTg = loc(thieu, TG), tTro = loc(thieu, ['did', 'do', 'does']), tHt = loc(thieu, ['have', 'has', 'had', 'been']),
      tWill = loc(thieu, ['will']), tCan = loc(thieu, ['can', 'cannot', 'could']), tTo = loc(thieu, ['to']);
    var daDung = [].concat(tMao, tBe, tTg, tTro, tHt, tWill, tCan, tTo);
    if (tMao.length) ms.push('Thiếu mạo từ ' + q(tMao[0]) + ': danh từ đếm được số ít phải có a/an đứng trước.');
    if (tBe.length) ms.push('Thiếu động từ “to be” (' + tBe.slice(0, 2).map(q).join(', ') + ') trong câu — câu mô tả cần có am/is/are/was/were.');
    if (tTro.length) ms.push('Thiếu trợ động từ ' + q(tTro[0]) + ': câu phủ định hoặc câu hỏi ở hiện tại đơn/quá khứ đơn cần do/does/did.');
    if (tWill.length) ms.push('Thiếu “will”: câu nói về tương lai dùng “will + động từ nguyên mẫu”.');
    if (tHt.length) ms.push('Thiếu ' + tHt.slice(0, 2).map(q).join(', ') + ': câu cần trợ động từ này (thì hoàn thành have/has/had + V3, bị động be + V3, hoặc cấu trúc “used to”).');
    if (tCan.length) ms.push('Thiếu ' + q(tCan[0]) + ': câu diễn tả khả năng (có thể / không thể) cần can/cannot/could.');
    if (tTo.length) ms.push('Thiếu “to” (want to, like to, used to…).');
    if (tTg.length) ms.push('Thiếu từ chỉ thời gian ' + tTg.slice(0, 2).map(function (w) { return q(w) + ' (' + VI_TG[w] + ')'; }).join(', ') + ' — câu cần từ này để thể hiện đúng nghĩa và thì.');
    var conThieu = thieu.filter(function (w) { return daDung.indexOf(w) < 0; });
    var maoThua = loc(thua, ['a', 'an']);
    if (ngan && maoThua.length && !conThieu.length) ms.push('Thừa mạo từ ' + q(maoThua[0]) + ': danh từ không đếm được (hoặc danh từ số nhiều) không dùng a/an.');
    else if (thua.length || conThieu.length) {
      if (thua.length && conThieu.length && thua.length === conThieu.length && ngan) {
        ms.push('Sai từ vựng: ' + thua.slice(0, 3).map(q).join(', ') + (de ? ' không đúng nghĩa của ' + q(de) : ' dùng chưa đúng') + '; từ cần dùng là ' + conThieu.slice(0, 3).map(q).join(', ') + '.');
      } else {
        if (conThieu.length) ms.push('Thiếu từ: ' + conThieu.slice(0, 4).map(q).join(', ') + (conThieu.length > 4 ? '…' : '') + '.');
        if (thua.length) ms.push('Thừa hoặc dùng sai từ: ' + thua.slice(0, 4).map(q).join(', ') + (thua.length > 4 ? '…' : '') + '.');
      }
    }
    ms = ms.filter(function (m, k) { return ms.indexOf(m) === k; });
    return ms.slice(0, 3).join(' ') || 'Câu chưa đúng: cần viết lại cho đúng ngữ pháp và đủ ý.';
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
    var trong = !ok && !x.y;
    if (ok) nx = '<span class="kqp-dung">✓ Đúng</span>';
    else if (trong && !x.g && !sua) nx = '<span class="kqp-sai-nhan">✗ Để trống</span>' + (x.c ? '<span class="kqp-da">Đáp án đúng: <b>' + E(x.c) + '</b></span>' : '');
    else {
      var g = sua ? '<textarea rows="' + Math.min(7, Math.max(2, Math.ceil(String(x.g || '').length / 32))) + '" data-bc-gc="' + E(b.ma + ':' + x.i) + '" placeholder="' + (trong ? 'Để trống — có thể bỏ trống ô này' : 'Giải thích câu sai…') + '">' + E(x.g) + '</textarea><span class="in-chu">' + E(x.g) + '</span>' : (x.g ? '<span class="kqp-g">' + E(x.g) + '</span>' : '');
      nx = '<span class="kqp-sai-nhan">' + (trong ? '✗ Để trống' : '✗ Sai') + '</span>' + g + (x.c ? '<span class="kqp-da">Đáp án đúng: <b>' + E(x.c) + '</b></span>' : '');
    }
    return '<div class="kqp-hang ' + (ok ? 'ok' : 'sai') + '"><div class="kqp-h-stt">' + x.i + '</div>' +
      '<div class="kqp-h-de" data-l="Đề">' + E(x.q) + '</div>' +
      '<div class="kqp-h-bl" data-l="Con viết">' + (x.y ? E(x.y) : '<em>—</em>') + '</div>' +
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
