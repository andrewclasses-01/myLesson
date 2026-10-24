/* ============================================================
   duyet-anh.js — HỘP "DUYỆT ẢNH HỌC SINH" TRÊN DASHBOARD (15/10/2026, web v1.343.0 — thầy chốt mẫu v1 + "ok build").
   Mẫu: D:\OTHERS\CLAUDE\myNetwork - thiet ke\mau-duyet-anh-v1\mau-duyet-anh.html. Máy chủ: hàm `nwAnh` (app may-chu/functions/nw-anh.js).

   ⭐ v1.367.0 (17/10/2026, thầy yêu cầu): giao diện mới — CỘT TAB BÊN TRÁI (Chờ duyệt · Máy lọc đã chặn · Đã duyệt · Đã từ chối ·
   Cài đặt), bỏ mọi dòng hướng dẫn; nút CHỈNH SỬA trên thẻ chờ ⇒ khung chỉnh (phóng to · xoay 90°/±45° · độ sáng) phủ trong hộp,
   "Lưu chỉnh sửa" ⇒ thẻ hiện ảnh đã chỉnh, DUYỆT là gửi ảnh đã chỉnh (`sua` trong việc `duyet`). Ảnh em gửi giữ nguyên trên máy chủ.

   Mở từ mục "Duyệt ảnh" ở cột trái (js/nw-thanh.js ⇒ window.DuyetAnh.mo()); số ảnh chờ hiện cạnh mục (DuyetAnh.dem()).
   · Chờ duyệt: thẻ ảnh ĐANG DÙNG → ẢNH MỚI · máy lọc (nghi ngờ đứng đầu, ảnh mờ bấm mới xem) · lịch sử gửi của em.
     DUYỆT / TỪ CHỐI (6 lý do + tạm khoá 7 ngày) — lệnh gửi máy chủ SAU 5 GIÂY, trong lúc đó bấm "Hoàn tác" là thôi.
   · Máy lọc đã chặn (7 ngày): ảnh bị chặn ngay, không vào hàng duyệt.
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
    chan: '<svg class="i" viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/></svg>',
    canh: '<svg class="i" viewBox="0 0 24 24"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17h.01"/></svg>',
    gio: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    lui: '<svg class="i" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    tin: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
    hang: '<svg class="i" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    da: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.5 9.5"/></svg>',
    tu: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>',
    cd: '<svg class="i" viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
    sua: '<svg class="i" viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    trai: '<svg class="i" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    zoom: '<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M8.5 11h5M11 8.5v5"/></svg>',
    xoay: '<svg class="i" viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
    xoayT: '<svg class="i" viewBox="0 0 24 24"><path d="M4 11a8 8 0 1 1 2.3 5.7"/><path d="M4 4v7h7"/></svg>',
    sang: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>',
    datLai: '<svg class="i" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/></svg>'
  };
  var LY = ['Ảnh không phù hợp', 'Không phải ảnh của em', 'Ảnh của bạn khác', 'Có chữ / ký hiệu không phù hợp', 'Ảnh mờ, khó nhìn', 'Lý do khác…'];
  var MAU = ['#0E7C6E', '#3E7BFA', '#E0575B', '#F0821E', '#18A957', '#8b5cf6', '#0891b2', '#db2777'];
  var TEN_LOC = { nguoiLon: 'Người lớn', baoLuc: 'Bạo lực', goiCam: 'Gợi cảm', yTe: 'Y tế' };
  var MUC_CHU = ['', 'rất khó', 'khó', 'có thể', 'nhiều khả năng', 'rất có thể'];
  var TAB = [
    { t: 'cho', chu: 'Chờ duyệt', ic: I.hang },
    { t: 'chan', chu: 'Máy lọc chặn', ic: I.chan },
    { t: 'duyet', chu: 'Đã duyệt', ic: I.da, cach: 1 },
    { t: 'tuChoi', chu: 'Đã từ chối', ic: I.tu },
    { t: 'cd', chu: 'Cài đặt', ic: I.cd, cuoi: 1 }
  ];

  // S.sua[id] = { c: trạng thái khung chỉnh (tỉ lệ), du: { lon, nho } | { anh } gửi máy chủ, xem: data URL ảnh đã chỉnh }
  var S = { tab: 'cho', loc: 'tat', ds: null, chan: [], cai: null, cho: {}, sua: {}, soCho: null };

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
  // cors = ảnh trên kho Storage của mình (CORS *) — nạp CORS ngay từ thẻ để khung chỉnh dùng lại bản đệm mà canvas không bị "bẩn"
  function khung(src, mo, trong, cors) {
    return '<div class="t-khung' + (mo ? ' mo' : '') + '">' + (src ? '<img src="' + E(src) + '" alt="" loading="lazy"' + (cors ? ' crossorigin="anonymous"' : '') + '>' : '<span class="trong">' + (trong || 'Chưa có') + '</span>') +
      (mo ? '<button class="xem" type="button">Bấm để xem</button>' : '') + '</div>';
  }
  function chiTietLoc(l) {
    var ct = (l && l.ct) || {}, ra = [];
    Object.keys(TEN_LOC).forEach(function (k) { if ((ct[k] || 0) >= 3) ra.push(TEN_LOC[k] + ': ' + MUC_CHU[ct[k]]); });
    return ra.join(' · ');
  }
  function locChip(l) {
    var m = (l && l.muc) || 'chua';
    if (m === 'nghi') return '<span class="chip nghi">' + I.canh + 'Máy lọc nghi ngờ' + (chiTietLoc(l) ? ' · ' + E(chiTietLoc(l)) : '') + '</span>';
    if (m === 'an') return '<span class="chip an">' + I.khien + 'An toàn</span>';
    return '<span class="chip su">' + I.tin + 'Chưa lọc</span>';
  }
  var toastT;
  function toast(chu, hoan) {
    var t = $('#daToast'); if (!t) { t = document.createElement('div'); t.id = 'daToast'; t.className = 'da-toast'; document.body.appendChild(t); }
    t.innerHTML = '<span>' + E(chu) + '</span>' + (hoan ? '<button type="button">Hoàn tác</button>' : '');
    if (hoan) $('button', t).onclick = function () { hoan(); t.classList.remove('mo'); };
    t.classList.add('mo'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('mo'); }, hoan ? 5200 : 4000);
  }
  function phong(src) { var d = document.createElement('div'); d.className = 'da-phong'; d.innerHTML = '<img src="' + E(src) + '" alt="">'; d.onclick = function () { d.remove(); }; document.body.appendChild(d); }

  // ── số ảnh chờ cạnh mục cột trái dashboard + cột tab trong hộp ──
  function datSo(n) {
    S.soCho = n;
    var b = $('.nwb-ql-muc[data-muc="duyetAnh"]');
    if (b) { var s = $('.da-so', b); if (!s) { s = document.createElement('span'); s.className = 'da-so'; b.appendChild(s); } s.textContent = n; s.hidden = !n; }
    veSoTab();
  }
  function veSoTab() {
    var so = { cho: S.soCho, chan: S.chan.length };
    $$('#daNen .da-muc').forEach(function (b) {
      var d = $('.dem', b), t = b.getAttribute('data-t'); if (!d) return;
      var n = so[t]; d.textContent = n || ''; d.hidden = !n;
    });
  }
  function dem() { return goi({ viec: 'dem' }).then(function (r) { datSo(r.n || 0); return r; }, function () { return null; }); }

  // ── khung hộp ──
  function dungKhung() {
    if ($('#daNen')) return $('#daNen');
    // ⛔ v1.369.0 — CSS nay nạp bằng <link> trong dashboard.html CÙNG LÚC với trang. Nạp lười lúc mở hộp ⇒ một trang mở từ trước khi
    // đẩy bản mới (webview app myLesson giữ trang cả ngày) chạy JS CŨ mà kéo về CSS MỚI ⇒ hộp vỡ (17/10/2026). Đây chỉ là lưới đỡ.
    if (!$('link[href*="duyet-anh.css"]')) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/duyet-anh.css?v=3'; document.head.appendChild(l); }
    var n = document.createElement('div'); n.id = 'daNen'; n.className = 'da-nen'; n.hidden = true;
    n.innerHTML = '<div class="da-hop" role="dialog" aria-modal="true" aria-label="Duyệt ảnh học sinh">' +
      '<aside class="da-ben">' +
        '<div class="da-dau"><span class="da-ic">' + I.hop + '</span><h3>Duyệt ảnh<span>học sinh</span></h3></div>' +
        '<nav class="da-nav">' + TAB.map(function (t) {
          return (t.cach ? '<i class="da-cach"></i>' : '') + '<button type="button" class="da-muc' + (t.cuoi ? ' cuoi' : '') + '" data-t="' + t.t + '">' + t.ic + '<span class="ch">' + t.chu + '</span>' +
            (t.t === 'cho' || t.t === 'chan' ? '<span class="dem" hidden></span>' : '') + '</button>';
        }).join('') + '</nav>' +
      '</aside>' +
      '<section class="da-chinh">' +
        '<header class="da-tren"><h2 id="daTieuDe"></h2><div class="da-loc" id="daLoc"></div>' +
          '<button class="da-dong" type="button" aria-label="Đóng">' + I.x + '</button></header>' +
        '<div class="da-than" id="daThan"></div>' +
      '</section></div>';
    document.body.appendChild(n);
    $('.da-dong', n).onclick = dong;
    n.addEventListener('mousedown', function (e) { if (e.target === n) dong(); });
    $$('.da-muc', n).forEach(function (b) { b.onclick = function () { S.tab = b.getAttribute('data-t'); taiTab(); }; });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || n.hidden) return;
      var p = $('.da-phong'); if (p) return p.remove();
      var su = $('.da-sua', n); if (su) return su.dongSua();
      dong();
    });
    return n;
  }
  function dong() { var su = $('#daNen .da-sua'); if (su) su.dongSua(); xaHet(); $('#daNen').hidden = true; dem(); }
  function mo() { var n = dungKhung(); n.hidden = false; S.tab = 'cho'; taiTab(); }

  function veLoc() {
    var o = $('#daLoc');
    if (S.tab === 'cd') { o.innerHTML = ''; return; }
    o.innerHTML = [['tat', 'Tất cả'], ['av', 'Ảnh đại diện'], ['bia', 'Ảnh bìa']].map(function (x) {
      return '<button type="button" data-loc="' + x[0] + '"' + (S.loc === x[0] ? ' class="chon"' : '') + '>' + x[1] + '</button>'; }).join('');
    $$('[data-loc]', o).forEach(function (b) { b.onclick = function () { S.loc = b.getAttribute('data-loc'); veLoc(); veTab(); }; });
  }
  function hopLoc(x) { return S.loc === 'tat' || x.loai === S.loc; }
  function veTab() {
    if (S.tab === 'cho') veCho(); else if (S.tab === 'chan') veChan(); else if (S.tab === 'cd') veCd(); else if (S.ds) veLs(S.tab === 'tuChoi');
  }
  function taiTab() {
    var t0 = TAB.filter(function (t) { return t.t === S.tab; })[0];
    $$('#daNen .da-muc').forEach(function (b) { b.classList.toggle('chon', b.getAttribute('data-t') === S.tab); });
    $('#daTieuDe').textContent = t0.chu;
    veLoc();
    var than = $('#daThan');
    than.innerHTML = '<div class="trong-to"><span class="da-quay"></span></div>';
    if (S.tab === 'cd') return goi({ viec: 'caiDat' }).then(function (r) { S.cai = r; if (S.tab === 'cd') veCd(); }, function (e) { than.innerHTML = '<div class="trong-to">' + E(chuLoi(e)) + '</div>'; });
    var tab = S.tab, hoi = tab === 'chan' ? 'cho' : tab;
    goi({ viec: 'ds', tab: hoi }).then(function (r) {
      if (S.tab !== tab) return;
      S.ds = r.ds || [];
      if (hoi === 'cho') { S.chan = r.chan || []; datSo(S.ds.length); }
      veTab();
    }, function (e) { than.innerHTML = '<div class="trong-to">' + E(chuLoi(e)) + '</div>'; });
  }
  function trongTo(ic, chu) { return '<div class="trong-to"><span class="to-ic">' + ic + '</span><div>' + chu + '</div></div>'; }

  // ── CHỜ DUYỆT ──
  function veCho() {
    var ds = S.ds.filter(function (x) { return !S.cho[x.id] && hopLoc(x); })
      .sort(function (a, b) { return ((b.loc || {}).muc === 'nghi') - ((a.loc || {}).muc === 'nghi') || a.luc - b.luc; });
    $('#daThan').innerHTML = ds.length ? '<div class="da-luoi">' + ds.map(theCho).join('') + '</div>' : trongTo(I.ok, 'Hết ảnh chờ duyệt rồi thầy ạ!');
    $$('#daThan .the').forEach(ganThe);
    ganKhung();
  }
  function theCho(x) {
    var nghi = (x.loc || {}).muc === 'nghi', ls = x.lichSu || {}, sua = S.sua[x.id];
    var su = (ls.thang > 1 ? 'Lần thứ ' + ls.thang + ' trong tháng' : 'Lần đầu trong tháng') + (ls.tuChoi ? ' · ' + ls.tuChoi + ' lần bị từ chối' : '') + (ls.chan ? ' · ' + ls.chan + ' lần bị chặn' : '');
    return '<article class="the' + (nghi ? ' nghi' : '') + (sua ? ' da-chinh-sua' : '') + '" data-id="' + E(x.id) + '">' +
      '<div class="t-dau">' + avTen(x) + '<div><div class="ten">' + E(x.ten) + '<span class="lop">' + E(x.lop) + '</span></div>' +
        '<div class="phu">' + luc(x.luc) + (x.may ? ' · ' + E(x.may) : '') + '</div></div><span class="loai ' + x.loai + '">' + (x.loai === 'av' ? 'Đại diện' : 'Ảnh bìa') + '</span></div>' +
      '<div class="t-anh' + (x.loai === 'bia' ? ' bia' : '') + '"><div class="t-o cu"><div class="t-nh">Đang dùng</div>' + khung(x.cu, false, x.loai === 'bia' ? 'Bìa mặc định' : 'Chưa có ảnh') + '</div>' + I.mui +
        '<div class="t-o moi"><div class="t-nh moi">' + (sua ? 'Đã chỉnh <button type="button" class="bo-sua" data-bo-sua>Bỏ chỉnh</button>' : 'Ảnh mới') + '</div>' +
        khung(sua ? sua.xem : x.url, nghi && !sua, '', !sua) + '</div></div>' +
      '<div class="t-loc">' + (x.thayThu ? '<span class="chip nghi">' + I.tin + 'Thầy thử (đăng nhập thay em)</span>' : '') +
        locChip(x.loc) + '<span class="chip su">' + I.gio + E(su) + '</span></div>' +
      '<div class="t-chan"><button class="nut tu" type="button" data-tu>' + I.x + 'Từ chối</button>' +
        '<button class="nut sua" type="button" data-sua>' + I.sua + 'Chỉnh sửa</button>' +
        '<button class="nut duyet" type="button" data-duyet>' + I.ok + 'Duyệt</button></div>' +
      '<div class="t-tu"><div class="nh">Lý do từ chối</div><div class="ly">' + LY.map(function (l) { return '<button type="button">' + l + '</button>'; }).join('') + '</div>' +
        '<textarea placeholder="Lý do (em sẽ đọc được)…" maxlength="150"></textarea>' +
        '<label class="khoa"><input type="checkbox"> Tạm khoá đổi ảnh ' + ((S.cai && S.cai.khoaNgay) || 7) + ' ngày</label>' +
        '<div class="hang"><button class="nut xam" type="button" data-thoi>Thôi</button><button class="nut xac" type="button" data-xac disabled>' + I.x + 'Xác nhận từ chối</button></div></div>' +
      '</article>';
  }
  function lenhDuyet(x) {
    var sua = S.sua[x.id], d = { viec: 'duyet', id: x.id };
    if (sua) d.sua = sua.du;
    henLenh(x, d, 'Đã duyệt ' + (x.loai === 'av' ? 'ảnh đại diện' : 'ảnh bìa') + (sua ? ' (đã chỉnh)' : '') + ' của ' + x.ten + (x.loai === 'av' ? ' — đổi trên cả hệ.' : '.'));
  }
  function ganThe(the) {
    var id = the.getAttribute('data-id');
    var x = S.ds.filter(function (y) { return y.id === id; })[0];
    var lyChon = '', ta = $('textarea', the);
    $('[data-duyet]', the).onclick = function () { lenhDuyet(x); };
    $('[data-sua]', the).onclick = function () { moSua(x); };
    var bo = $('[data-bo-sua]', the); if (bo) bo.onclick = function () { delete S.sua[id]; veCho(); };
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
  // Duyệt / gỡ ảnh ĐẠI DIỆN xong ⇒ quên bản đệm ảnh của các lớp em đó (AWC.quenAvatarKho — trang nhớ ảnh tới 10 phút) và đè
  // ảnh mới lên mọi ô của em đang hiện trên dashboard — y lượt thầy tự đổi ảnh (dashboard adGoi). Máy khác: tải lại trang ≤ 10 phút.
  function lamMoiAnh(r) {
    var A = window.AWC;
    if (!r || r.loai !== 'av' || !r.lops || !A || !A.quenAvatarKho) return;
    r.lops.forEach(function (l) { try { A.quenAvatarKho(l); } catch (e) { } });
    var ten = {}, lop = {};
    (r.tenHs || []).forEach(function (t) { ten[t] = 1; });
    r.lops.forEach(function (l) { lop[A.avSlugLop(l)] = 1; });
    $$('[data-av-em]').forEach(function (el) {
      if (!ten[el.getAttribute('data-av-em')] || !lop[A.avSlugLop(el.getAttribute('data-av-lop'))]) return;
      if (r.xoa || !r.nho) { $$('img', el).forEach(function (x) { x.remove(); }); return; }
      var im = el.querySelector('img');
      if (!im) { im = document.createElement('img'); im.className = 'av-anh'; im.alt = ''; el.insertBefore(im, el.firstChild); }
      im.src = 'data:image/jpeg;base64,' + r.nho;
    });
  }
  function guiLenh(hen) {
    clearTimeout(hen.t);
    goi(hen.d).then(function (r) {
      lamMoiAnh(r);
      delete S.cho[hen.x.id]; delete S.sua[hen.x.id];
      S.ds = S.ds.filter(function (y) { return y.id !== hen.x.id; });
    }, function (e) {
      delete S.cho[hen.x.id];
      toast('Lỗi với ảnh của ' + hen.x.ten + ': ' + chuLoi(e));
      if (S.tab === 'cho' && !$('#daNen').hidden) veCho();
    });
  }
  function xaHet() { Object.keys(S.cho).forEach(function (id) { guiLenh(S.cho[id]); }); }
  window.addEventListener('pagehide', xaHet);

  // ── MÁY LỌC ĐÃ CHẶN (7 ngày) ──
  function veChan() {
    var ds = S.chan.filter(hopLoc);
    if (!ds.length) { $('#daThan').innerHTML = trongTo(I.khien, 'Không có ảnh nào bị chặn trong 7 ngày.'); return; }
    $('#daThan').innerHTML = '<div class="chan-luoi">' + ds.map(function (c) {
      return '<div class="chan-o">' + khung(c.url, true) + '<div class="t"><div class="ten">' + E(c.ten) + ' <span class="lop">' + E(c.lop) + '</span></div>' +
        '<div class="phu">' + (c.loai === 'av' ? 'Ảnh đại diện' : 'Ảnh bìa') + ' · ' + luc(c.luc) + '</div>' +
        '<span class="chip do">' + I.canh + E(chiTietLoc(c.loc) || 'Bị chặn') + '</span>' +
        '<button type="button" class="nut duyet chan-ok" data-chan-ok="' + E(c.id) + '">' + I.ok + 'Chấp nhận ảnh</button></div></div>'; }).join('') + '</div>';
    ganKhung();
    // ⭐ v1.420.0 — máy lọc chặn OAN ⇒ thầy chấp nhận: mở khung chỉnh (ảnh chặn không có ảnh nhỏ — khung xuất lớn + nhỏ) ⇒ "Chấp nhận & duyệt"
    $$('[data-chan-ok]').forEach(function (b) {
      b.onclick = function () { var x = S.chan.filter(function (y) { return y.id === b.getAttribute('data-chan-ok'); })[0]; if (x) moSua(x, { chan: true }); };
    });
  }
  function duyetChan(x) {
    var sua = S.sua[x.id];
    toast('Đang duyệt ảnh của ' + x.ten + '…');
    goi({ viec: 'duyetChan', id: x.id, sua: sua ? sua.du : null }).then(function (r) {
      lamMoiAnh(r); delete S.sua[x.id];
      S.chan = S.chan.filter(function (y) { return y.id !== x.id; });
      datSo(S.soCho);
      if (S.tab === 'chan') veChan();
      toast('Đã chấp nhận ' + (x.loai === 'av' ? 'ảnh đại diện' : 'ảnh bìa') + ' của ' + x.ten + (x.loai === 'av' ? ' — đổi trên cả hệ. Lần vi phạm oan đã được xoá.' : '.'));
    }, function (e) { toast('Chưa duyệt được ảnh của ' + x.ten + ': ' + chuLoi(e)); });
  }

  // ── ĐÃ DUYỆT / ĐÃ TỪ CHỐI ──
  function veLs(laTu) {
    var ds = S.ds.filter(hopLoc);
    if (!ds.length) { $('#daThan').innerHTML = trongTo(laTu ? I.tu : I.da, 'Chưa có ảnh nào.'); return; }
    $('#daThan').innerHTML = '<div class="bang"><div class="dong dau"><span>Ảnh</span><span>Học sinh</span><span class="an-dt">Loại</span><span class="an-dt">' + (laTu ? 'Lý do' : 'Lúc duyệt') + '</span><span></span></div>' +
      ds.map(function (x) {
        var daGo = x.trangThai === 'go';
        return '<div class="dong"><img class="nho-anh' + (x.loai === 'bia' ? ' bia' : '') + (laTu ? ' mo' : '') + '" src="' + E(x.url) + '" alt="" data-phong="' + E(x.url) + '">' +
          '<div><div class="ten">' + E(x.ten) + '<span class="lop">' + E(x.lop) + '</span></div><div class="phu">Gửi ' + luc(x.luc) + '</div></div>' +
          '<span class="an-dt"><span class="loai ' + x.loai + '">' + (x.loai === 'av' ? 'Đại diện' : 'Ảnh bìa') + '</span>' + (x.daSua ? ' <span class="loai sua">Đã chỉnh</span>' : '') + '</span>' +
          '<span class="an-dt dong-ly">' + (laTu ? E(x.lyDo) : luc(x.xuLyLuc)) + '</span>' +
          (laTu ? '<span></span>' : daGo ? '<span class="chip su">Đã gỡ</span>' : '<button class="nut tu nho" type="button" data-go="' + E(x.id) + '">' + I.lui + 'Gỡ · trả ảnh cũ</button>') + '</div>';
      }).join('') + '</div>';
    $$('#daThan [data-phong]').forEach(function (im) { im.onclick = function () { phong(im.getAttribute('data-phong')); }; });
    $$('#daThan [data-go]').forEach(function (b) {
      b.onclick = function () {
        var x = S.ds.filter(function (y) { return y.id === b.getAttribute('data-go'); })[0];
        if (!confirm('Gỡ ' + (x.loai === 'av' ? 'ảnh đại diện' : 'ảnh bìa') + ' của ' + x.ten + ' và trả lại ảnh trước đó?')) return;
        b.disabled = true; b.textContent = 'Đang gỡ…';
        goi({ viec: 'go', id: x.id }).then(function (r) { lamMoiAnh(r); toast('Đã gỡ ảnh của ' + x.ten + ' — trả về ảnh trước đó.'); x.trangThai = 'go'; veLs(false); },
          function (e) { toast(chuLoi(e)); b.disabled = false; b.textContent = 'Gỡ · trả ảnh cũ'; });
      };
    });
  }

  // ── CÀI ĐẶT ──
  function veCd() {
    var c = S.cai;
    if (!c) return;
    function cong(k, t) { return '<div class="cong"><span class="t">' + t + '</span><label class="tg"><input type="checkbox" data-cong="' + k + '"' + (c[k] ? ' checked' : '') + '><span></span></label></div>'; }
    function chon(k, ds, gt) { return '<select data-so="' + k + '">' + ds.map(function (n) { return '<option' + (n === gt ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>'; }
    $('#daThan').innerHTML = '<div class="cd">' +
      '<div class="cd-the"><h4>Công tắc</h4>' +
        cong('doiAnh', 'Cho em gửi ảnh đại diện') + cong('doiBia', 'Cho em gửi ảnh bìa') + cong('dangBai', 'Cho em đăng bài') + '</div>' +
      '<div class="cd-the"><h4>Giới hạn</h4>' +
        '<div class="cong"><span class="t">Ảnh đại diện</span><span class="so-o">' + chon('av', [1, 2, 3], c.han.av) + ' lần / tuần</span></div>' +
        '<div class="cong"><span class="t">Ảnh bìa</span><span class="so-o">' + chon('bia', [1, 2, 3], c.han.bia) + ' lần / tuần</span></div>' +
        '<div class="cong"><span class="t">Tự khoá đổi ảnh</span><span class="so-o">sau ' + chon('khoaSauLan', [2, 3, 4, 5], c.khoaSauLan) + ' lần · khoá ' + chon('khoaNgay', [3, 7, 14, 30], c.khoaNgay) + ' ngày</span></div></div>' +
      '<div class="cd-the rong"><h4>Em đang bị khoá đổi ảnh <span class="dem-nho">' + c.khoa.length + '</span></h4>' + (c.khoa.length ? c.khoa.map(function (k) {
        return '<div class="cong">' + (k.anh ? '<img class="da-av" src="' + E(k.anh) + '" alt="">' : '<span class="da-av av-chu" style="background:' + mauTen(k.ten) + '">' + E(chuTat(k.ten)) + '</span>') +
          '<span class="t">' + E(k.ten) + ' <span class="lop">' + E(k.lop) + '</span><small>Tới ' + luc(k.khoaDen) + ' · ' + k.viPham + ' lần vi phạm</small></span><button class="nut xam nho" type="button" data-mo="' + E(k.uid) + '">Mở khoá</button></div>';
      }).join('') : '<div class="cd-trong">Không có em nào.</div>') + '</div>' +
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

  /* ═════════════ KHUNG CHỈNH ẢNH TRƯỚC KHI DUYỆT (v1.367.0) ═════════════
     Khung W×H (đại diện 1:1 — vòng tròn · bìa 2,8:1 = 1400×500 như CatBia). Ảnh: tâm (c.x, c.y) trong toạ độ khung, cỡ s = s0·z
     (s0 = vừa phủ kín khung), góc q·90 + r. ẢNH LUÔN PHỦ KÍN KHUNG: z không nhỏ hơn mức phủ của góc đang xoay (zMin) — xoay là
     tự phóng thêm, không bao giờ lộ góc trắng. Độ sáng b: xem trước CSS brightness, xuất nhân thẳng điểm ảnh (Safari cũ không có
     canvas `filter`). Trạng thái cất theo TỈ LỆ khung (x/W, y/H) ⇒ mở lại / đổi cỡ cửa sổ vẫn đúng chỗ. */
  var Z_MAX = 5, R_MAX = 45, B_MIN = 0.5, B_MAX = 1.6, TI_BIA = 2.8;
  function nhanSang(cv, b) {
    if (Math.abs(b - 1) < 0.005) return;
    var g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height), p = d.data;
    for (var i = 0; i < p.length; i += 4) { p[i] *= b; p[i + 1] *= b; p[i + 2] *= b; }
    g.putImageData(d, 0, 0);
  }
  function thanh(k, ic, ten, min, max, buoc) {
    return '<div class="ds-muc"><div class="ds-nh">' + ic + '<span>' + ten + '</span><button type="button" class="ds-so" data-ve="' + k + '" title="Đặt lại"></button></div>' +
      '<div class="ds-thanh"><button type="button" class="ds-n" data-tru="' + k + '" aria-label="Giảm">−</button>' +
      '<input type="range" data-k="' + k + '" min="' + min + '" max="' + max + '" step="' + buoc + '" aria-label="' + ten + '">' +
      '<button type="button" class="ds-n" data-cong="' + k + '" aria-label="Tăng">+</button></div></div>';
  }
  // tuy.chan = ảnh máy lọc đã chặn (v1.420.0): bỏ "Lưu chỉnh sửa", nút cuối = "Chấp nhận & duyệt" ⇒ duyetChan
  function moSua(x, tuy) {
    tuy = tuy || {};
    var hop = $('#daNen .da-hop'), laAv = x.loai === 'av';
    var el = document.createElement('div'); el.className = 'da-sua' + (laAv ? ' av' : ' bia');
    el.innerHTML =
      '<header class="ds-tren"><button type="button" class="ds-lui" data-thoi aria-label="Quay lại">' + I.trai + '</button>' +
        '<div class="ds-ten">' + avTen(x) + '<div><b>' + E(x.ten) + '</b><span>' + (laAv ? 'Ảnh đại diện' : 'Ảnh bìa') + ' · ' + E(x.lop) + '</span></div></div></header>' +
      '<div class="ds-giua">' +
        '<div class="ds-san"><div class="ds-khung"><img alt="" draggable="false"><div class="ds-phu"></div></div><div class="ds-tin">Đang tải ảnh…</div></div>' +
        '<aside class="ds-cu">' +
          thanh('z', I.zoom, 'Phóng to', 1, Z_MAX, 0.01) +
          thanh('r', I.xoay, 'Xoay', -R_MAX, R_MAX, 0.5) +
          '<div class="ds-90"><button type="button" data-q="-1">' + I.xoayT + '90° trái</button><button type="button" data-q="1">' + I.xoay + '90° phải</button></div>' +
          thanh('b', I.sang, 'Độ sáng', B_MIN, B_MAX, 0.01) +
          '<div class="ds-muc"><div class="ds-nh"><span>Xem trước</span></div><div class="ds-xem">' +
            (laAv ? '<canvas class="x1" width="176" height="176"></canvas><canvas class="x2" width="88" height="88"></canvas><canvas class="x3" width="48" height="48"></canvas>'
              : '<canvas class="xb" width="560" height="200"></canvas>') + '</div></div>' +
          '<button type="button" class="ds-dat" data-dat>' + I.datLai + 'Đặt lại tất cả</button>' +
        '</aside>' +
      '</div>' +
      '<footer class="ds-chan"><button type="button" class="nut xam" data-thoi>Huỷ</button>' +
        (tuy.chan ? '' : '<button type="button" class="nut sua" data-luu disabled>' + I.sua + 'Lưu chỉnh sửa</button>') +
        '<button type="button" class="nut duyet" data-duyet disabled>' + I.ok + (tuy.chan ? 'Chấp nhận & duyệt' : 'Duyệt ảnh đã chỉnh') + '</button></footer>';
    hop.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('mo'); });

    var san = $('.ds-san', el), kh = $('.ds-khung', el), im = $('img', kh), tin = $('.ds-tin', el);
    var A = null, W = 0, H = 0, s0 = 1, c = { z: 1, x: 0, y: 0, r: 0, q: 0, b: 1 };
    var tr = {}; $$('input[type=range]', el).forEach(function (i) { tr[i.getAttribute('data-k')] = i; });
    var so = {}; $$('[data-ve]', el).forEach(function (b) { so[b.getAttribute('data-ve')] = b; });

    function goc() { return (c.q * 90 + c.r) * Math.PI / 180; }
    function nua() { var a = goc(), cs = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a)); return { u: W / 2 * cs + H / 2 * sn, v: W / 2 * sn + H / 2 * cs }; }
    function zMin() { var e = nua(); return Math.max(1, 2 * e.u / (A.w * s0), 2 * e.v / (A.h * s0)); }
    function kep() {
      c.z = Math.max(zMin(), Math.min(Z_MAX, c.z));
      var s = s0 * c.z, a = goc(), cs = Math.cos(a), sn = Math.sin(a), e = nua();
      var vx = W / 2 - c.x, vy = H / 2 - c.y, u = vx * cs + vy * sn, v = -vx * sn + vy * cs;
      var mu = Math.max(0, A.w * s / 2 - e.u), mv = Math.max(0, A.h * s / 2 - e.v);
      u = Math.max(-mu, Math.min(mu, u)); v = Math.max(-mv, Math.min(mv, v));
      c.x = W / 2 - (u * cs - v * sn); c.y = H / 2 - (u * sn + v * cs);
    }
    function toMau(i, a, b) { i.style.setProperty('--a', a.toFixed(1) + '%'); i.style.setProperty('--b', b.toFixed(1) + '%'); }
    function ve() {
      var s = s0 * c.z, w = A.w * s, h = A.h * s;
      im.style.width = w + 'px'; im.style.height = h + 'px';
      im.style.transform = 'translate(' + (c.x - w / 2) + 'px,' + (c.y - h / 2) + 'px) rotate(' + (c.q * 90 + c.r) + 'deg)';
      im.style.filter = Math.abs(c.b - 1) < 0.005 ? '' : 'brightness(' + c.b + ')';
      tr.z.value = c.z; toMau(tr.z, 0, (c.z - 1) / (Z_MAX - 1) * 100);
      tr.r.value = c.r; var pr = (c.r + R_MAX) / (2 * R_MAX) * 100; toMau(tr.r, Math.min(50, pr), Math.max(50, pr));
      tr.b.value = c.b; var pb = (c.b - B_MIN) / (B_MAX - B_MIN) * 100, p1 = (1 - B_MIN) / (B_MAX - B_MIN) * 100; toMau(tr.b, Math.min(p1, pb), Math.max(p1, pb));
      var tong = ((c.q * 90 + c.r) % 360 + 540) % 360 - 180;
      so.z.textContent = c.z.toFixed(1) + '×'; so.r.textContent = (Math.round(tong * 2) / 2) + '°'; so.b.textContent = Math.round(c.b * 100) + '%';
      henXem();
    }
    function phong(z, px, py) {
      if (px == null) { px = W / 2; py = H / 2; }
      var z0 = c.z; c.z = Math.max(zMin(), Math.min(Z_MAX, z));
      c.x = px - (px - c.x) * c.z / z0; c.y = py - (py - c.y) * c.z / z0;
      kep(); ve();
    }
    function xoay(q, r) {
      var a0 = goc(); c.q = ((q % 4) + 4) % 4; c.r = Math.max(-R_MAX, Math.min(R_MAX, r)); var d = goc() - a0;
      var vx = c.x - W / 2, vy = c.y - H / 2, cs = Math.cos(d), sn = Math.sin(d);
      c.x = W / 2 + vx * cs - vy * sn; c.y = H / 2 + vx * sn + vy * cs;
      kep(); ve();
    }
    function sang(b) { c.b = Math.max(B_MIN, Math.min(B_MAX, Math.round(b * 100) / 100)); ve(); }
    function datLai() { c = { z: 1, x: W / 2, y: H / 2, r: 0, q: 0, b: 1 }; kep(); ve(); }
    // cỡ khung theo sân khấu; đổi cỡ thì giữ vị trí theo tỉ lệ
    function dan() {
      if (!A) return;
      var r = san.getBoundingClientRect(), mw = Math.max(160, r.width - 56), mh = Math.max(120, r.height - 56);
      var W0 = W, H0 = H;
      if (laAv) { W = H = Math.floor(Math.min(mw, mh, 520)); } else { W = Math.floor(Math.min(mw, mh * TI_BIA, 820)); H = Math.round(W / TI_BIA); }
      kh.style.width = W + 'px'; kh.style.height = H + 'px';
      s0 = Math.max(W / A.w, H / A.h);
      if (W0) { c.x = c.x * W / W0; c.y = c.y * H / H0; }
      kep(); ve();
    }

    // ── xuất: ảnh vẽ lên lớp trong suốt ⇒ nhân độ sáng ⇒ đặt lên nền trắng ──
    function veVao(cw, ch) {
      var k = cw / W, s = s0 * c.z * k;
      var lop = document.createElement('canvas'); lop.width = cw; lop.height = ch;
      var gl = lop.getContext('2d'); gl.imageSmoothingQuality = 'high';
      gl.translate(c.x * k, c.y * k); gl.rotate(goc());
      gl.drawImage(A.el, -A.w * s / 2, -A.h * s / 2, A.w * s, A.h * s);
      nhanSang(lop, c.b);
      var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch); g.drawImage(lop, 0, 0);
      return cv;
    }
    function b64(cv, q) { return cv.toDataURL('image/jpeg', q).split(',')[1]; }
    // đại diện: lớn ≤ 800 px (không vượt độ phân giải thật), ≤ 390 KB như CatAnh.duLieu · nhỏ 96 px · bìa 1400×500 ≤ 1,15 MB
    function xuat() {
      if (laAv) {
        var n = Math.max(96, Math.min(800, Math.round(W / (s0 * c.z)))), q = 0.9, cv = veVao(n, n), lon = b64(cv, q);
        while (lon.length * 0.75 > 390 * 1024 && (q > 0.73 || n > 480)) {
          if (q > 0.73) q -= 0.06; else { n = Math.round(n * 0.85); cv = veVao(n, n); }
          lon = b64(cv, q);
        }
        return { du: { lon: lon, nho: b64(veVao(96, 96), 0.82) }, xem: 'data:image/jpeg;base64,' + lon };
      }
      var cb = veVao(1400, 500), qb = 0.88, anh = b64(cb, qb);
      while (anh.length * 0.75 > 1150 * 1024 && qb > 0.5) { qb -= 0.08; anh = b64(cb, qb); }
      return { du: { anh: anh }, xem: 'data:image/jpeg;base64,' + anh };
    }
    var henT = 0;
    function henXem() {
      if (henT) return;
      henT = requestAnimationFrame(function () {
        henT = 0; if (!A) return;
        var nguon = laAv ? veVao(176, 176) : veVao(560, 200);
        $$('.ds-xem canvas', el).forEach(function (cv) { var g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(nguon, 0, 0, cv.width, cv.height); });
      });
    }

    // ── điều khiển ──
    $$('input[type=range]', el).forEach(function (i) {
      i.addEventListener('input', function () {
        if (!A) return; var k = i.getAttribute('data-k'), v = +i.value;
        if (k === 'z') phong(v); else if (k === 'r') { kh.classList.add('keo'); xoay(c.q, v); } else sang(v);
      });
      i.addEventListener('change', function () { kh.classList.remove('keo'); });
    });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !A) return;
      var k;
      if ((k = b.getAttribute('data-tru')) || (k = b.getAttribute('data-cong'))) {
        var len = b.hasAttribute('data-cong');
        if (k === 'z') phong(c.z * (len ? 1.15 : 1 / 1.15)); else if (k === 'r') xoay(c.q, c.r + (len ? 1 : -1)); else sang(c.b + (len ? 0.05 : -0.05));
      } else if ((k = b.getAttribute('data-ve'))) {
        if (k === 'z') phong(1); else if (k === 'r') xoay(c.q, 0); else sang(1);
      } else if (b.hasAttribute('data-q')) xoay(c.q + +b.getAttribute('data-q'), c.r);
      else if (b.hasAttribute('data-dat')) datLai();
    });
    kh.addEventListener('wheel', function (e) {
      if (!A) return; e.preventDefault();
      var r = kh.getBoundingClientRect(); phong(c.z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    var tro = {}, keo = null, chum = null;
    function hai() { var k = Object.keys(tro); return k.length === 2 ? [tro[k[0]], tro[k[1]]] : null; }
    kh.addEventListener('pointerdown', function (e) {
      if (!A) return;
      tro[e.pointerId] = { x: e.clientX, y: e.clientY };
      try { kh.setPointerCapture(e.pointerId); } catch (er) { }
      kh.classList.add('keo');
      var p = hai();
      if (p) { var r = kh.getBoundingClientRect(); chum = { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1, z: c.z, mx: (p[0].x + p[1].x) / 2 - r.left, my: (p[0].y + p[1].y) / 2 - r.top, cx: c.x, cy: c.y }; keo = null; }
      else keo = { x: e.clientX, y: e.clientY, cx: c.x, cy: c.y };
      e.preventDefault();
    });
    kh.addEventListener('pointermove', function (e) {
      if (!tro[e.pointerId]) return;
      tro[e.pointerId] = { x: e.clientX, y: e.clientY };
      var p = hai();
      if (p && chum) {
        var r = kh.getBoundingClientRect(), d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
        c.x = chum.cx; c.y = chum.cy; c.z = chum.z;
        phong(chum.z * d / chum.d, chum.mx, chum.my);
        c.x += (p[0].x + p[1].x) / 2 - r.left - chum.mx; c.y += (p[0].y + p[1].y) / 2 - r.top - chum.my; kep(); ve();
      } else if (keo) { c.x = keo.cx + e.clientX - keo.x; c.y = keo.cy + e.clientY - keo.y; kep(); ve(); }
    });
    function tha(e) {
      delete tro[e.pointerId]; chum = null;
      var k = Object.keys(tro);
      if (k.length === 1) keo = { x: tro[k[0]].x, y: tro[k[0]].y, cx: c.x, cy: c.y }; else { keo = null; kh.classList.remove('keo'); }
    }
    kh.addEventListener('pointerup', tha); kh.addEventListener('pointercancel', tha);
    window.addEventListener('resize', dan);

    function dongSua() { window.removeEventListener('resize', dan); el.classList.remove('mo'); setTimeout(function () { el.remove(); }, 180); }
    el.dongSua = dongSua;
    function luu() {
      try { var kq = xuat(); }
      catch (er) { tin.hidden = false; tin.textContent = 'Không xuất được ảnh (' + String(er && er.message || er).slice(0, 80) + ').'; return false; }
      S.sua[x.id] = { c: { z: c.z, x: c.x / W, y: c.y / H, r: c.r, q: c.q, b: c.b }, du: kq.du, xem: kq.xem };
      return true;
    }
    $$('[data-thoi]', el).forEach(function (b) { b.onclick = dongSua; });
    if (!tuy.chan) $('[data-luu]', el).onclick = function () { if (luu()) { dongSua(); veCho(); toast('Đã lưu chỉnh sửa — bấm Duyệt để dùng ảnh này.'); } };
    $('[data-duyet]', el).onclick = tuy.chan ? function () { if (luu()) { dongSua(); duyetChan(x); } } : function () { if (luu()) { dongSua(); veCho(); lenhDuyet(x); } };

    // ── nạp ảnh (CORS — kho Storage trả Access-Control-Allow-Origin *) ──
    var anh = new Image();
    anh.crossOrigin = 'anonymous';
    anh.onload = function () {
      A = { el: anh, w: anh.naturalWidth, h: anh.naturalHeight };
      im.src = anh.src; tin.hidden = true; kh.classList.add('co');
      dan();
      var cu = S.sua[x.id];
      if (cu) { c = { z: cu.c.z, x: cu.c.x * W, y: cu.c.y * H, r: cu.c.r, q: cu.c.q, b: cu.c.b }; kep(); ve(); } else datLai();
      $$('[data-luu],[data-duyet]', el).forEach(function (b) { b.disabled = false; });
    };
    anh.onerror = function () { tin.textContent = 'Không tải được ảnh để chỉnh.'; };
    anh.src = x.url;
  }

  window.DuyetAnh = { mo: mo, dem: dem };
  // số ảnh chờ cạnh mục cột trái — đọc khi dashboard đã đăng nhập (đợi cửa kho; phiên thầy chưa sẵn ⇒ thử lại 5 giây/lần, tối đa 2 phút)
  // ⭐ v1.421.0 (24/10/2026, thầy: "mỗi khi có ảnh mới cần duyệt, khi tôi đăng nhập là tự hiện pop-up duyệt ảnh") — có ảnh chờ ⇒ TỰ MỞ hộp.
  //   Không bật mãi khi thầy cố ý để lại ảnh: chỉ tự mở lại khi SỐ ảnh chờ khác lần tự mở trước, hoặc đã quá 3 giờ (localStorage 'daTuMo').
  //   Đang có hộp khác mở (Quản lý & bảo mật, Thông báo…) ⇒ chờ nó đóng (tối đa 2 phút) rồi mới mở.
  var TU_MO = 'daTuMo';
  function tuMo(n) {
    var cu = null; try { cu = JSON.parse(localStorage.getItem(TU_MO) || 'null'); } catch (e) { }
    if (cu && cu.n === n && Date.now() - cu.luc < 3 * 36e5) return;
    var lan = 0;
    (function cho() {
      var nen = $('#daNen');
      if (nen && !nen.hidden) return;
      var banhKhac = document.querySelector('.qm-nen:not([hidden]), .tq-nen.mo, .tdq-nen:not([hidden]), .sd-pop, .qs-nen.mo, .qsl-nen.mo, .skh-nen');
      if (banhKhac && ++lan < 24) return setTimeout(cho, 5000);
      try { localStorage.setItem(TU_MO, JSON.stringify({ n: n, luc: Date.now() })); } catch (e) { }
      mo();
    })();
  }
  function demKhiVao(lan) {
    if (!(window.AWChat && AWChat.kho && $('.nwb-ql-muc[data-muc="duyetAnh"]'))) return;
    dem().then(function (r) {
      if (!r) { if (lan < 24) setTimeout(function () { demKhiVao(lan + 1); }, 5000); return; }
      if (r.n > 0) tuMo(r.n);
    });
  }
  setTimeout(function () { demKhiVao(0); }, 4000);
})();
