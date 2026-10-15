/* ============================================================
   duyet-anh.js — HỘP "DUYỆT ẢNH HỌC SINH" TRÊN DASHBOARD (15/10/2026, web v1.343.0 — thầy chốt mẫu v1 + "ok build").
   Mẫu: D:\OTHERS\CLAUDE\myNetwork - thiet ke\mau-duyet-anh-v1\mau-duyet-anh.html. Máy chủ: hàm `nwAnh` (app may-chu/functions/nw-anh.js).

   Mở từ mục "Duyệt ảnh" ở cột trái (js/nw-thanh.js ⇒ window.DuyetAnh.mo()); số ảnh chờ hiện cạnh mục (DuyetAnh.dem()).
   · Chờ duyệt: thẻ ảnh ĐANG DÙNG → ẢNH MỚI · máy lọc (nghi ngờ đứng đầu, ảnh mờ bấm mới xem) · lịch sử gửi của em.
     DUYỆT / TỪ CHỐI (6 lý do + tạm khoá 7 ngày) — lệnh gửi máy chủ SAU 5 GIÂY, trong lúc đó bấm "Hoàn tác" là thôi.
     Mục "Máy lọc đã chặn" (7 ngày): ảnh bị chặn ngay, không vào hàng duyệt.
   · Đã duyệt: "Gỡ · trả ảnh cũ" (phát hiện muộn). · Đã từ chối: lịch sử.
   · Cài đặt: 3 công tắc nwCauHinh/caNhan + giới hạn/tuần + tự khoá + em đang bị khoá (Mở khoá).
   Duyệt ảnh đại diện = đổi trên CẢ HỆ (trang lớp, xếp hạng, dashboard, myStudent, myTeam). Ảnh bìa chỉ ở trang cá nhân.
   ⛔ Dùng CHUNG cửa Firebase `AWChat.kho()` (đừng initializeApp lần nữa).
   ============================================================ */
(function () {
  'use strict';
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var I = {
    hop: '<svg class="i" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8 8.5"/></svg>',
    mui: '<svg class="i mui" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    ok: '<svg class="i" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    x: '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    khien: '<svg class="i" viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    canh: '<svg class="i" viewBox="0 0 24 24"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17h.01"/></svg>',
    gio: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    lui: '<svg class="i" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    tin: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>'
  };
  var LY = ['Ảnh không phù hợp', 'Không phải ảnh của em', 'Ảnh của bạn khác', 'Có chữ / ký hiệu không phù hợp', 'Ảnh mờ, khó nhìn', 'Lý do khác…'];
  var MAU = ['#0E7C6E', '#3E7BFA', '#E0575B', '#F0821E', '#18A957', '#8b5cf6', '#0891b2', '#db2777'];
  var TEN_LOC = { nguoiLon: 'Người lớn', baoLuc: 'Bạo lực', goiCam: 'Gợi cảm', yTe: 'Y tế' };
  var MUC_CHU = ['', 'rất khó', 'khó', 'có thể', 'nhiều khả năng', 'rất có thể'];

  var S = { tab: 'cho', loc: 'tat', ds: null, chan: [], cai: null, cho: {}, nap: false };

  // ── máy chủ ──
  var _fn = null;
  function goi(d) {
    // bàn thử trên máy (trang thử riêng, chỉ localhost): __DA_THU_GOI giả hàm máy chủ
    if (window.__DA_THU_GOI && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return window.__DA_THU_GOI(d);
    if (!_fn) {
      _fn = (window.AWChat && AWChat.kho ? AWChat.kho() : Promise.reject(new Error('khong-co-kho'))).then(async function () {
        var appMod = await import(SDK + '/firebase-app.js');
        var fnMod = await import(SDK + '/firebase-functions.js');
        return fnMod.httpsCallable(fnMod.getFunctions(appMod.getApp(), 'asia-southeast1'), 'nwAnh', { timeout: 120000 });
      });
      _fn['catch'](function () { _fn = null; });
    }
    return _fn.then(function (f) { return f(d); }).then(function (r) { return r.data; });
  }
  function chuLoi(e) {
    var m = String((e && (e.message || e.code)) || e || '').replace(/^FirebaseError:\s*/, '');
    if (/not-found|NOT_FOUND/i.test(m) && !/[à-ỹ]/i.test(m)) return 'Hàm nwAnh chưa được đưa lên máy chủ.';
    return m.slice(0, 200);
  }

  // ── tiện ích ──
  function chuTat(ten) { var t = String(ten || '?').trim().split(/\s+/); return (t.length > 1 ? t[t.length - 2][0] + t[t.length - 1][0] : t[0].slice(0, 2)).toUpperCase(); }
  function mauTen(ten) { var h = 0; String(ten || '').split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return MAU[h % MAU.length]; }
  function avTen(x) { return x.cu && x.loai === 'av' ? '<img class="da-av" src="' + E(x.cu) + '" alt="">' : '<span class="da-av av-chu" style="background:' + mauTen(x.ten) + '">' + E(chuTat(x.ten)) + '</span>'; }
  function luc(ms) {
    var d = new Date(ms), nay = new Date(), hq = new Date(nay - 864e5);
    var g = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    if (d.toDateString() === nay.toDateString()) return g + ' hôm nay';
    if (d.toDateString() === hq.toDateString()) return g + ' hôm qua';
    return d.getDate() + '/' + (d.getMonth() + 1) + ' · ' + g;
  }
  function khung(src, mo, trong) {
    return '<div class="t-khung' + (mo ? ' mo' : '') + '">' + (src ? '<img src="' + E(src) + '" alt="" loading="lazy">' : '<span class="trong">' + (trong || 'Chưa có') + '</span>') +
      (mo ? '<button class="xem" type="button">Bấm để xem rõ</button>' : '') + '</div>';
  }
  function chiTietLoc(l) {
    var ct = (l && l.ct) || {}, ra = [];
    Object.keys(TEN_LOC).forEach(function (k) { if ((ct[k] || 0) >= 3) ra.push(TEN_LOC[k] + ': ' + MUC_CHU[ct[k]]); });
    return ra.join(' · ');
  }
  function locChip(l) {
    var m = (l && l.muc) || 'chua';
    if (m === 'nghi') return '<span class="chip nghi">' + I.canh + 'Máy lọc nghi ngờ' + (chiTietLoc(l) ? ' · ' + E(chiTietLoc(l)) : '') + '</span>';
    if (m === 'an') return '<span class="chip an">' + I.khien + 'Máy lọc: an toàn</span>';
    return '<span class="chip su">' + I.tin + 'Máy lọc chưa chạy — thầy tự xem</span>';
  }
  var toastT;
  function toast(chu, hoan) {
    var t = $('#daToast'); if (!t) { t = document.createElement('div'); t.id = 'daToast'; t.className = 'da-toast'; document.body.appendChild(t); }
    t.innerHTML = '<span>' + E(chu) + '</span>' + (hoan ? '<button type="button">Hoàn tác</button>' : '');
    if (hoan) $('button', t).onclick = function () { hoan(); t.classList.remove('mo'); };
    t.classList.add('mo'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('mo'); }, hoan ? 5200 : 4000);
  }
  function phong(src) { var d = document.createElement('div'); d.className = 'da-phong'; d.innerHTML = '<img src="' + E(src) + '" alt="">'; d.onclick = function () { d.remove(); }; document.body.appendChild(d); }

  // ── số ảnh chờ cạnh mục cột trái ──
  function datSo(n) {
    var b = $('.nwb-ql-muc[data-muc="duyetAnh"]'); if (!b) return;
    var s = $('.da-so', b); if (!s) { s = document.createElement('span'); s.className = 'da-so'; b.appendChild(s); }
    s.textContent = n; s.hidden = !n;
    var d = $('#daDemCho'); if (d) { d.textContent = n; d.hidden = !n; }
  }
  function dem() { return goi({ viec: 'dem' }).then(function (r) { datSo(r.n || 0); return r; }, function () { return null; }); }

  // ── khung hộp ──
  function dungKhung() {
    if ($('#daNen')) return $('#daNen');
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/duyet-anh.css?v=2'; document.head.appendChild(l);
    var n = document.createElement('div'); n.id = 'daNen'; n.className = 'da-nen'; n.hidden = true;
    n.innerHTML = '<div class="da-hop" role="dialog" aria-modal="true" aria-label="Duyệt ảnh học sinh">' +
      '<div class="da-dau"><span class="da-ic">' + I.hop + '</span><div><h3>DUYỆT ẢNH HỌC SINH</h3><p>Ảnh đại diện + ảnh bìa em gửi · chỉ hiện cho mọi người khi thầy duyệt</p></div>' +
        '<button class="da-dong" type="button" aria-label="Đóng">' + I.x + '</button></div>' +
      '<div class="da-tabs"><button type="button" data-t="cho" class="chon">Chờ duyệt <span class="dem" id="daDemCho" hidden>0</span></button>' +
        '<button type="button" data-t="duyet">Đã duyệt</button><button type="button" data-t="tuChoi">Đã từ chối</button><button type="button" data-t="cd">Cài đặt</button></div>' +
      '<div class="da-than" id="daThan"></div>' +
      '<div class="da-chan">' + I.tin + '<span>Duyệt ảnh đại diện = đổi trên <b>cả hệ</b>: trang lớp, bảng xếp hạng, dashboard, myStudent, myTeam (màn chiếu). Ảnh bìa chỉ ở trang cá nhân.</span></div></div>';
    document.body.appendChild(n);
    $('.da-dong', n).onclick = dong;
    n.addEventListener('mousedown', function (e) { if (e.target === n) dong(); });
    $$('.da-tabs button', n).forEach(function (b) { b.onclick = function () { S.tab = b.getAttribute('data-t'); taiTab(); }; });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || n.hidden) return;
      var p = $('.da-phong'); if (p) p.remove(); else dong();
    });
    return n;
  }
  function dong() { xaHet(); $('#daNen').hidden = true; dem(); }
  function mo() { var n = dungKhung(); n.hidden = false; S.tab = 'cho'; taiTab(); }

  function taiTab() {
    $$('#daNen .da-tabs button').forEach(function (b) { b.classList.toggle('chon', b.getAttribute('data-t') === S.tab); });
    var than = $('#daThan');
    than.innerHTML = '<div class="trong-to">Đang tải…</div>';
    if (S.tab === 'cd') return goi({ viec: 'caiDat' }).then(function (r) { S.cai = r; veCd(); }, function (e) { than.innerHTML = '<div class="trong-to">' + E(chuLoi(e)) + '</div>'; });
    var tab = S.tab;
    goi({ viec: 'ds', tab: tab }).then(function (r) {
      if (S.tab !== tab) return;
      S.ds = r.ds || []; S.chan = r.chan || [];
      if (tab === 'cho') { datSo(S.ds.length); veCho(); } else veLs(tab === 'tuChoi');
    }, function (e) { than.innerHTML = '<div class="trong-to">' + E(chuLoi(e)) + '</div>'; });
  }

  // ── CHỜ DUYỆT ──
  function veCho() {
    var ds = S.ds.filter(function (x) { return !S.cho[x.id] && (S.loc === 'tat' || x.loai === S.loc); })
      .sort(function (a, b) { return ((b.loc || {}).muc === 'nghi') - ((a.loc || {}).muc === 'nghi') || a.luc - b.luc; });
    var h = '<div class="da-loc">' + [['tat', 'Tất cả'], ['av', 'Ảnh đại diện'], ['bia', 'Ảnh bìa']].map(function (x) {
      return '<button type="button" data-loc="' + x[0] + '"' + (S.loc === x[0] ? ' class="chon"' : '') + '>' + x[1] + '</button>'; }).join('') +
      '<span class="phai">Ảnh máy lọc nghi ngờ luôn đứng đầu · cũ nhất trước</span></div>';
    if (!ds.length) h += '<div class="trong-to">' + I.ok + '<div>Hết ảnh chờ duyệt rồi thầy ạ!</div></div>';
    else h += '<div class="da-luoi">' + ds.map(theCho).join('') + '</div>';
    if (S.chan.length) h += '<div class="mo-dau">MÁY LỌC ĐÃ CHẶN TỰ ĐỘNG · 7 NGÀY · ' + S.chan.length + '</div><div class="chan-luoi">' + S.chan.map(function (c) {
      return '<div class="chan-o">' + khung(c.url, true) + '<div class="t"><b>' + E(c.ten) + '</b> <span class="lop">' + E(c.lop) + '</span><br><small>' + (c.loai === 'av' ? 'Ảnh đại diện' : 'Ảnh bìa') + ' · ' + luc(c.luc) + '</small><br>' +
        '<span style="color:var(--do);font-weight:700">' + E(chiTietLoc(c.loc) || 'Bị chặn') + '</span></div></div>'; }).join('') + '</div>' +
      '<p class="da-ghi">Ảnh bị chặn không tới hàng duyệt và không tính lượt; em được báo "ảnh không gửi được". Thầy vẫn xem lại được ở đây.</p>';
    $('#daThan').innerHTML = h;
    $$('#daThan [data-loc]').forEach(function (b) { b.onclick = function () { S.loc = b.getAttribute('data-loc'); veCho(); }; });
    $$('#daThan .the').forEach(ganThe);
    ganKhung();
  }
  function theCho(x) {
    var nghi = (x.loc || {}).muc === 'nghi', ls = x.lichSu || {};
    var su = (ls.thang > 1 ? 'Lần gửi thứ ' + ls.thang + ' trong tháng' : 'Lần đầu gửi trong tháng') + (ls.tuChoi ? ' · ' + ls.tuChoi + ' lần bị từ chối trước' : '') + (ls.chan ? ' · ' + ls.chan + ' lần máy lọc chặn' : '');
    return '<div class="the' + (nghi ? ' nghi' : '') + '" data-id="' + E(x.id) + '">' +
      '<div class="t-dau">' + avTen(x) + '<div><div class="ten">' + E(x.ten) + '<span class="lop">' + E(x.lop) + '</span></div>' +
        '<div class="phu">' + luc(x.luc) + (x.may ? ' · ' + E(x.may) : '') + '</div></div><span class="loai ' + x.loai + '">' + (x.loai === 'av' ? 'ẢNH ĐẠI DIỆN' : 'ẢNH BÌA') + '</span></div>' +
      '<div class="t-anh' + (x.loai === 'bia' ? ' bia' : '') + '"><div class="t-o"><div class="t-nh">ĐANG DÙNG</div>' + khung(x.cu, false, x.loai === 'bia' ? 'Bìa mặc định' : 'Chưa có ảnh') + '</div>' + I.mui +
        '<div class="t-o"><div class="t-nh moi">ẢNH MỚI</div>' + khung(x.url, nghi) + '</div></div>' +
      '<div class="t-loc">' + (x.thayThu ? '<span class="chip nghi">' + I.tin + 'Thầy thử (đăng nhập thay em) · em không nhận thông báo</span>' : '') +
        locChip(x.loc) + '<span class="chip su">' + I.gio + E(su) + '</span></div>' +
      '<div class="t-chan"><button class="nut tu" type="button" data-tu>' + I.x + 'TỪ CHỐI</button><button class="nut duyet" type="button" data-duyet>' + I.ok + 'DUYỆT</button></div>' +
      '<div class="t-tu"><div class="nh">LÝ DO TỪ CHỐI · EM SẼ THẤY</div><div class="ly">' + LY.map(function (l) { return '<button type="button">' + l + '</button>'; }).join('') + '</div>' +
        '<textarea placeholder="Thầy gõ lý do (em sẽ đọc được)…" maxlength="150"></textarea>' +
        '<label class="khoa"><input type="checkbox"> Tạm khoá đổi ảnh của em này ' + ((S.cai && S.cai.khoaNgay) || 7) + ' ngày</label>' +
        '<div class="hang"><button class="nut xam" type="button" data-thoi>Thôi</button><button class="nut xac" type="button" data-xac disabled>' + I.x + 'XÁC NHẬN TỪ CHỐI</button></div></div>' +
      '</div>';
  }
  function ganThe(the) {
    var id = the.getAttribute('data-id');
    var x = S.ds.filter(function (y) { return y.id === id; })[0];
    var lyChon = '', ta = $('textarea', the);
    $('[data-duyet]', the).onclick = function () { henLenh(x, { viec: 'duyet', id: id }, 'Đã duyệt ' + (x.loai === 'av' ? 'ảnh đại diện' : 'ảnh bìa') + ' của ' + x.ten + (x.loai === 'av' ? ' — đổi trên cả hệ.' : '.')); };
    $('[data-tu]', the).onclick = function () { the.classList.add('dang-tu'); };
    $('[data-thoi]', the).onclick = function () { the.classList.remove('dang-tu'); };
    $$('.ly button', the).forEach(function (b) {
      b.onclick = function () {
        lyChon = b.textContent; $$('.ly button', the).forEach(function (y) { y.classList.toggle('chon', y === b); });
        var khac = /khác/.test(lyChon); ta.style.display = khac ? 'block' : 'none'; if (khac) ta.focus();
        $('[data-xac]', the).disabled = false;
      };
    });
    $('[data-xac]', the).onclick = function () {
      var lyDo = /khác/.test(lyChon) ? (ta.value.trim() || 'Lý do khác') : lyChon;
      henLenh(x, { viec: 'tuChoi', id: id, lyDo: lyDo, khoa: $('.khoa input', the).checked }, 'Đã từ chối — ' + x.ten + ' được báo lý do.');
    };
  }
  function ganKhung() {
    $$('#daThan .t-khung').forEach(function (k) {
      var nx = $('.xem', k); if (nx) nx.onclick = function (e) { e.stopPropagation(); k.classList.remove('mo'); };
      var im = $('img', k); if (im) im.onclick = function () { if (!k.classList.contains('mo')) phong(im.src); };
    });
  }
  // Lệnh duyệt / từ chối chờ 5 giây ⇒ "Hoàn tác" chỉ cần huỷ hẹn giờ (máy chủ chưa làm gì). Đóng hộp ⇒ gửi ngay.
  function henLenh(x, d, chu) {
    var the = $('#daThan .the[data-id="' + x.id + '"]'); if (the) the.classList.add('xong');
    var hen = { d: d, x: x, t: 0 };
    S.cho[x.id] = hen;
    hen.t = setTimeout(function () { guiLenh(hen); }, 5000);
    setTimeout(function () { if (S.tab === 'cho') veCho(); datSo(Math.max(0, S.ds.length - Object.keys(S.cho).length)); }, 260);
    toast(chu, function () { clearTimeout(hen.t); delete S.cho[x.id]; if (S.tab === 'cho') veCho(); datSo(S.ds.length - Object.keys(S.cho).length); });
  }
  function guiLenh(hen) {
    clearTimeout(hen.t);
    goi(hen.d).then(function () {
      delete S.cho[hen.x.id];
      S.ds = S.ds.filter(function (y) { return y.id !== hen.x.id; });
    }, function (e) {
      delete S.cho[hen.x.id];
      toast('Lỗi với ảnh của ' + hen.x.ten + ': ' + chuLoi(e));
      if (S.tab === 'cho' && !$('#daNen').hidden) veCho();
    });
  }
  function xaHet() { Object.keys(S.cho).forEach(function (id) { guiLenh(S.cho[id]); }); }
  window.addEventListener('pagehide', xaHet);

  // ── ĐÃ DUYỆT / ĐÃ TỪ CHỐI ──
  function veLs(laTu) {
    var ds = S.ds;
    if (!ds.length) { $('#daThan').innerHTML = '<div class="trong-to">Chưa có ảnh nào.</div>'; return; }
    $('#daThan').innerHTML = '<div class="bang"><div class="dong dau"><span>ẢNH</span><span>HỌC SINH</span><span class="an-dt">LOẠI</span><span class="an-dt">' + (laTu ? 'LÝ DO' : 'LÚC XỬ LÝ') + '</span><span></span></div>' +
      ds.map(function (x) {
        var daGo = x.trangThai === 'go';
        return '<div class="dong"><img class="nho-anh' + (x.loai === 'bia' ? ' bia' : '') + '" src="' + E(x.url) + '" alt="" style="cursor:zoom-in;' + (laTu ? 'filter:blur(6px)' : '') + '" data-phong="' + E(x.url) + '">' +
          '<div><div class="ten">' + E(x.ten) + '<span class="lop">' + E(x.lop) + '</span></div><div class="phu">Gửi ' + luc(x.luc) + '</div></div>' +
          '<span class="an-dt"><span class="loai ' + x.loai + '">' + (x.loai === 'av' ? 'ĐẠI DIỆN' : 'BÌA') + '</span></span>' +
          '<span class="an-dt" style="font-size:12.5px;font-weight:600">' + (laTu ? E(x.lyDo) : luc(x.xuLyLuc)) + '</span>' +
          (laTu ? '<span></span>' : daGo ? '<span class="chip su">Đã gỡ</span>' : '<button class="nut tu nho" type="button" data-go="' + E(x.id) + '">' + I.lui + 'Gỡ · trả ảnh cũ</button>') + '</div>';
      }).join('') + '</div>' +
      (laTu ? '' : '<p class="da-ghi">"Gỡ" dùng khi phát hiện muộn (có báo cáo): trả về ảnh trước đó trên cả hệ + báo em.</p>');
    $$('#daThan [data-phong]').forEach(function (im) { im.onclick = function () { phong(im.getAttribute('data-phong')); }; });
    $$('#daThan [data-go]').forEach(function (b) {
      b.onclick = function () {
        var x = S.ds.filter(function (y) { return y.id === b.getAttribute('data-go'); })[0];
        if (!confirm('Gỡ ' + (x.loai === 'av' ? 'ảnh đại diện' : 'ảnh bìa') + ' của ' + x.ten + ' và trả lại ảnh trước đó?')) return;
        b.disabled = true; b.textContent = 'Đang gỡ…';
        goi({ viec: 'go', id: x.id }).then(function () { toast('Đã gỡ ảnh của ' + x.ten + ' — trả về ảnh trước đó.'); x.trangThai = 'go'; veLs(false); },
          function (e) { toast(chuLoi(e)); b.disabled = false; b.textContent = 'Gỡ · trả ảnh cũ'; });
      };
    });
  }

  // ── CÀI ĐẶT ──
  function veCd() {
    var c = S.cai;
    function cong(k, t, s) { return '<div class="cong"><span class="t">' + t + '<small>' + s + '</small></span><label class="tg"><input type="checkbox" data-cong="' + k + '"' + (c[k] ? ' checked' : '') + '><span></span></label></div>'; }
    function chon(k, ds, gt) { return '<select data-so="' + k + '">' + ds.map(function (n) { return '<option' + (n === gt ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>'; }
    $('#daThan').innerHTML = '<div class="cd">' +
      '<div class="cd-the"><h4>CÔNG TẮC</h4>' +
        cong('doiAnh', 'Cho em gửi ảnh đại diện', 'Tắt: em bấm máy ảnh thấy "sắp mở"') +
        cong('doiBia', 'Cho em gửi ảnh bìa', 'Tắt: như trên') +
        cong('dangBai', 'Cho em đăng bài', 'Vẫn khoá — mở sau') + '</div>' +
      '<div class="cd-the"><h4>GIỚI HẠN</h4>' +
        '<div class="cong"><span class="t">Ảnh đại diện<small>Tính cả ảnh bị từ chối · không tính ảnh em tự huỷ, ảnh máy lọc chặn</small></span><span class="so-o">' + chon('av', [1, 2, 3], c.han.av) + ' lần / tuần</span></div>' +
        '<div class="cong"><span class="t">Ảnh bìa<small>Lượt mới mỗi Thứ Hai 00:00</small></span><span class="so-o">' + chon('bia', [1, 2, 3], c.han.bia) + ' lần / tuần</span></div>' +
        '<div class="cong"><span class="t">Tự khoá đổi ảnh<small>Bị từ chối hoặc máy lọc chặn ' + chon('khoaSauLan', [2, 3, 4, 5], c.khoaSauLan) + ' lần trong 7 ngày</small></span><span class="so-o">' + chon('khoaNgay', [3, 7, 14, 30], c.khoaNgay) + ' ngày</span></div></div>' +
      '<div class="cd-the"><h4>EM ĐANG BỊ KHOÁ ĐỔI ẢNH · ' + c.khoa.length + '</h4>' + (c.khoa.length ? c.khoa.map(function (k) {
        return '<div class="cong">' + (k.anh ? '<img src="' + E(k.anh) + '" style="width:34px;height:34px;border-radius:50%;object-fit:cover">' : '<span class="da-av av-chu" style="width:34px;height:34px;background:' + mauTen(k.ten) + '">' + E(chuTat(k.ten)) + '</span>') +
          '<span class="t">' + E(k.ten) + ' <span class="lop">' + E(k.lop) + '</span><small>Tới ' + luc(k.khoaDen) + ' · ' + k.viPham + ' lần vi phạm (7 ngày)</small></span><button class="nut xam nho" type="button" data-mo="' + E(k.uid) + '">Mở khoá</button></div>';
      }).join('') : '<p class="da-ghi" style="margin:0">Không có em nào.</p>') + '</div>' +
      '</div>';
    $$('#daThan [data-cong]').forEach(function (i) {
      i.onchange = function () { var d = { viec: 'luuCaiDat' }; d[i.getAttribute('data-cong')] = i.checked; luuCd(d, i); };
    });
    $$('#daThan [data-so]').forEach(function (s) {
      s.onchange = function () {
        var k = s.getAttribute('data-so'), n = Number(s.value), d = { viec: 'luuCaiDat' };
        if (k === 'av' || k === 'bia') { d.han = { av: c.han.av, bia: c.han.bia }; d.han[k] = n; } else d[k] = n;
        luuCd(d, s);
      };
    });
    $$('#daThan [data-mo]').forEach(function (b) {
      b.onclick = function () { b.disabled = true; goi({ viec: 'moKhoa', uid: b.getAttribute('data-mo') }).then(function () { toast('Đã mở khoá — em được báo.'); taiTab(); }, function (e) { toast(chuLoi(e)); b.disabled = false; }); };
    });
  }
  function luuCd(d, o) {
    o.disabled = true;
    goi(d).then(function (r) { Object.assign(S.cai, r); o.disabled = false; toast('Đã lưu cài đặt.'); }, function (e) { toast(chuLoi(e)); taiTab(); });
  }

  window.DuyetAnh = { mo: mo, dem: dem };
  // số ảnh chờ cạnh mục cột trái — đọc 1 lần khi dashboard đã đăng nhập (đợi cửa kho)
  setTimeout(function () { if (window.AWChat && AWChat.kho && $('.nwb-ql-muc[data-muc="duyetAnh"]')) dem(); }, 4000);
})();
