/* ============================================================
   js/xephang.js — SẢNH XẾP HẠNG THEO MÙA (nw/xephang.html) · 25/10/2026 Đợt 1 (thầy "ok build" mẫu v5).
   Mẫu: D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\mau-v5 · kế hoạch + hợp đồng dữ liệu: KE HOACH BUILD DOT 1 - 25-10-2026.md

   Thẻ: Sảnh (mùa · giờ vàng · hạng của em / 5 trận xếp hạng · phong độ · đang đấu · top 3 + hạng em) · Đang đấu · BXH (CHỈ top 20
   + dòng của em — không lộ sĩ số) · Thưởng · Hạng & luật. Trong Sảnh: màn TÌM TRẬN (radar, phạm vi nới dần) và ĐÃ TÌM THẤY (10 giây
   bấm Sẵn sàng) ⇒ trận chuyển 'nhan' ⇒ sang xhtran.html?id=…
   Hàng chờ: xhHang/{uid} { mua, vao, nhip } — nhịp 5 giây (giờ máy chủ); máy chủ xhGhep ghi m / tran / loi.
   Bàn thử: ?thu=1 (dữ liệu giả, ghép với máy sau ~8 giây, không ghi gì).
   ============================================================ */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = XH.esc, q = new URLSearchParams(location.search);
  var S = { tab: 'sanh', man: 'sanh', f: null, toi: null, mua: '', M: null, em: null, top: [], live: [], hang: null, tran: null, tranId: '',
    timLuc: 0, nhipIv: 0, tickIv: 0, ngheTran: null, ngheHang: null, daSS: false, bao: '', thu: false };
  var app = document.getElementById('xhApp');
  var BOOT = Date.now();

  // ---------- dựng khung ----------
  var TABS = [['sanh', 'Sảnh'], ['live', 'Đang đấu'], ['bxh', 'BXH'], ['thuong', 'Thưởng'], ['luat', 'Hạng & luật']];
  app.innerHTML =
    '<div class="xh-dau"><a class="xh-ve" href="khampha.html" aria-label="Về Khám phá">‹</a><h1>Xếp hạng <em>A Show Speed</em></h1></div>' +
    '<div class="xh-tabs" role="tablist" id="xhTabs">' + TABS.map(function (t) { return '<button role="tab" data-t="' + t[0] + '" title="' + t[1] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<div class="xh-canh" id="xhCanh">' +
    ['sanh', 'tim', 'ss', 'live', 'bxh', 'thuong', 'luat'].map(function (m) { return '<section class="xh-man" id="xhm-' + m + '"></section>'; }).join('') +
    '</div>';
  $('#xhTabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) moTab(b.dataset.t); });

  function moTab(t) {
    if (S.man === 'tim' || S.man === 'ss') { if (t !== 'sanh') return; }
    S.tab = t; S.man = t;
    [].forEach.call($('#xhTabs').children, function (b) { b.setAttribute('aria-selected', b.dataset.t === t); });
    hienMan(t);
  }
  function hienMan(m) {
    S.man = m;
    [].forEach.call(document.querySelectorAll('.xh-man'), function (x) { x.classList.toggle('mo', x.id === 'xhm-' + m); });
    $('#xhTabs').hidden = m === 'tim' || m === 'ss';
    ve();
  }

  // ---------- tiện ích ----------
  var bay = function () { return Date.now(); };
  // suất em đang giữ: bảng top 20 là nguồn đúng nhất (cờ s trên hồ sơ em chỉ cập nhật khi em đấu)
  function suatToi() {
    var toi = S.toi && S.toi.uid, x = (S.top || []).filter(function (r) { return r.uid === toi; })[0];
    if (x) return x.s || (x.ht ? 'ht' : '');
    return S.top && S.top.length ? '' : ((S.em && S.em.s) || '');
  }
  function hangEm() {
    var em = S.em || {};
    if ((em.xl || 0) < 5) return null;
    return XH.hangTu(em.diem || 0, suatToi());
  }
  function camTim() {   // '' = được tìm trận · còn lại = câu báo
    if (!S.M) return 'Mùa xếp hạng chưa mở.';
    var tt = XH.ttMua(S.M, bay());
    if (tt === 'sap') return 'Mùa giải chưa bắt đầu.';
    if (tt === 'dung') return 'Thầy Andrew đang tạm dừng mùa giải.';
    if (tt === 'het' || tt === 'chot') return 'Mùa giải đã kết thúc.';
    if (S.toi && S.toi.laThay) return 'Thầy xem được mọi trận ở thẻ Đang đấu.';
    if (!S.thu && window.GioiHan && GioiHan.cai && GioiHan.dem && GioiHan.dem()) return 'Giờ nghỉ đêm (' + GioiHan.gioChu(GioiHan.cai.nghiTu) + ' – ' + GioiHan.gioChu(GioiHan.cai.nghiDen) + ').';
    if (S.em && (S.em.khoaDen || 0) > bay()) return 'Em đang bị khoá tìm trận thêm ' + XH.dongHo(S.em.khoaDen - bay()) + '.';
    return '';
  }
  function lopToi() { var t = S.toi || {}; return t.lop || (t.cacLop || [])[0] || ''; }

  // ---------- VẼ ----------
  function ve() {
    var m = S.man;
    if (m === 'sanh') veSanh();
    else if (m === 'tim') veTim();
    else if (m === 'ss') veSS();
    else if (m === 'live') veLive();
    else if (m === 'bxh') veBxh();
    else if (m === 'thuong') veThuong();
    else if (m === 'luat') veLuat();
    XH.veHH(app);
  }
  function dauMua() {
    var M = S.M, tt = XH.ttMua(M, bay());
    if (!M) return '<div class="xh-mua"><div><b>XẾP HẠNG</b><small>Chưa có mùa giải</small></div></div>';
    var con = tt === 'sap' ? XH.conLai(M.tu - bay()) + '<small>tới lúc mở</small>'
      : tt === 'mo' || tt === 'dung' ? XH.conLai(M.den - bay()) + '<small>còn lại</small>' : '<small>đã kết thúc</small>';
    return '<div class="xh-mua"><div><b>' + esc(String(M.ten || 'MÙA').toUpperCase()) + '</b><small>' + XH.ngayGio(M.tu).slice(0, 5) + ' – ' + XH.ngayGio(M.den).slice(0, 5) + '</small></div>' +
      '<div class="xh-con xh-so">' + con + '</div></div>';
  }
  function gioVang() {
    var g = S.M && S.M.gioVang; if (!g || !(g.nhan > 1)) return '';
    var dang = XH.gioVangNay(S.M, bay()), d = new Date(), p = d.getHours() * 60 + d.getMinutes();
    var phai = dang ? 'ĐANG DIỄN RA' : (p < g.tu ? 'sau ' + Math.floor((g.tu - p) / 60) + 'g' + ('0' + (g.tu - p) % 60).slice(-2) : XH.phutChu(g.tu) + ' mai');
    return '<div class="xh-gv' + (dang ? ' dang' : '') + '">⚡ <b>GIỜ VÀNG</b> ' + XH.phutChu(g.tu) + '–' + XH.phutChu(g.den) + ' · điểm ×' + String(g.nhan).replace('.', ',') + '<span class="xh-so">' + phai + '</span></div>';
  }
  function theHang() {
    var em = S.em || {}, h = hangEm();
    if (!h) {
      var xl = em.xl || 0, ds = (em.ds || []).slice(0, xl).reverse(), o = '';
      for (var i = 0; i < 5; i++) {
        var r = ds[i];
        o += r ? '<span class="' + (r.kq === 'thang' ? 't' : r.kq === 'thua' ? 'b' : 'h') + '">' + (r.kq === 'thang' ? 'T' : r.kq === 'thua' ? 'B' : 'H') + '</span>'
          : '<span' + (i === xl ? ' class="nay"' : '') + '>' + (i + 1) + '</span>';
      }
      return '<div class="xh-the"><div class="xh-toi">' + XH.hhTag('an', '', 84) + '<div class="xh-tt"><h2>PHÂN HẠNG<span>' + Math.min(5, xl + 1) + '/5</span></h2>' +
        '<p>Đấu đủ <b>5 trận phân hạng</b> để máy xếp em vào hạng hợp với sức mình.</p></div></div>' +
        '<div class="xh-nam" style="margin-top:12px">' + o + '</div></div>';
    }
    var vt = XH.viTriSuat(S.M), d = em.diem || 0, hang = em.hang ? 'Hạng <b>#' + em.hang + '</b> toàn trường' : '';
    var trong = h.trongBac, bar, tiep;
    if (h.suat) { bar = 100; tiep = (hang || 'Đang giữ suất') + ' · suất ' + esc(XH.HANG[h.ma].ten) + ' (top ' + vt[h.ma] + ')'; }
    else if (h.len) { bar = trong; tiep = '<b>' + trong + '</b>/100 · còn <b>' + (100 - trong) + '</b> điểm lên ' + esc(XH.hangTu(h.len).ten); }
    else {   // Vàng I: muốn lên nữa phải giành SUẤT
      bar = Math.min(100, Math.max(0, Math.round(100 * (d - 1000) / Math.max(1, vt.bkSan - 1000))));
      tiep = (hang ? hang + ' · ' : '') + (d < vt.bkSan ? 'còn <b>' + (vt.bkSan - d) + '</b> điểm + lọt <b>top ' + vt.tong + '</b> để giành suất Bạch kim' : 'lọt <b>top ' + vt.tong + '</b> để giành suất Bạch kim');
    }
    return '<div class="xh-the"><div class="xh-toi">' + XH.hhTag(h.ma, h.bac, 84) + '<div class="xh-tt"><h2>' + esc(XH.HANG[h.ma].ten.toUpperCase()) + (h.bac ? '<span>' + h.bac + '</span>' : '') + '</h2>' +
      '<div class="xh-thanh"><u style="width:' + bar + '%"></u></div><p class="xh-so">' + tiep + (em.baoVe ? ' · 🛡' + em.baoVe : '') + '</p></div></div>' +
      '<div class="xh-so3 xh-so"><div><b>' + (em.tran || 0) + '</b><small>trận mùa này</small></div>' +
      '<div><b>' + (em.tran ? Math.round(100 * (em.thang || 0) / em.tran) : 0) + '%</b><small>thắng</small></div>' +
      '<div><b style="color:#FFB3BA">' + (em.chuoi >= 2 ? '🔥' : '') + (em.chuoi || 0) + '</b><small>chuỗi thắng</small></div></div></div>';
  }
  function phongDo() {
    var ds = (S.em && S.em.ds) || []; if (!ds.length) return '';
    return '<div class="xh-the"><h3>PHONG ĐỘ <span style="letter-spacing:0;font:600 12px/1 var(--xh-v);color:var(--xh-mo)">' + Math.min(7, ds.length) + ' trận gần nhất</span></h3><div class="xh-phong">' +
      ds.slice(0, 7).map(function (r) { var k = r.kq === 'thang' ? 't' : r.kq === 'thua' ? 'b' : 'h'; return '<span class="xh-kq ' + k + '" title="' + esc((r.vs || '') + ' ' + (r.toi || 0) + '–' + (r.ban || 0)) + '">' + k.toUpperCase().replace('B', 'B') + '</span>'; }).join('') +
      '</div></div>';
  }
  function lvHtml(t, i) {
    var a = XH.hien(t.hA), b = XH.hien(t.hB), d = t.diem || {};
    var con = t.ketThuc ? Math.max(0, t.ketThuc - bay()) : 0;
    return '<button class="xh-lv' + (i === 0 ? ' noi' : '') + '" data-xem="' + esc(t.id) + '"><div class="xh-h1">' +
      '<span class="xh-p">' + XH.av(t.tenA, t.anhA) + '<span>' + esc(t.tenA) + '</span>' + XH.hhTag(a.ma, a.bac, 20) + '</span>' +
      '<span class="xh-ts xh-so"><b>' + (d.a || 0) + '</b> – <u>' + (d.b || 0) + '</u></span>' +
      '<span class="xh-p r">' + XH.av(t.tenB, t.anhB) + '<span>' + esc(t.tenB) + '</span>' + XH.hhTag(b.ma, b.bac, 20) + '</span></div>' +
      '<div class="xh-h2 xh-so"><span>BÀN ' + ((t.van || 0) + 1) + ' · ' + XH.dongHo(con) + '</span>' + (t.xem ? '<span>👁 ' + t.xem + '</span>' : '') +
      '<span class="xh-tmx">♥ ' + (t.tim || 0) + '</span><span class="xh-vao">XEM ›</span></div></button>';
  }
  function topNho() {
    var ds = S.top.slice(0, 3), em = S.em, toi = S.toi && S.toi.uid;
    var o = ds.map(function (x, i) { var h = XH.hangTu(x.diem, x.s || x.ht); return '<div class="xh-tp"><span class="xh-x">' + (i + 1) + '</span>' + XH.hhTag(h.ma, h.bac, 22) + '<span class="xh-ten">' + esc(x.ten) + '</span><b class="xh-so">' + x.diem + '</b></div>'; }).join('');
    if (em && em.hang && !ds.some(function (x) { return x.uid === toi; })) {
      var h = hangEm(); o += '<div class="xh-tp em"><span class="xh-x">' + em.hang + '</span>' + XH.hhTag(h.ma, h.bac, 22) + '<span class="xh-ten">Em · ' + esc(S.toi.ten || '') + '</span><b class="xh-so">' + em.diem + '</b></div>';
    }
    return o || '<p class="xh-ghi">Chưa có ai xếp hạng — vào trận đầu tiên nào!</p>';
  }
  function veSanh() {
    var cam = camTim(), tt = XH.ttMua(S.M, bay());
    var bao = S.bao ? '<div class="xh-bao do">' + esc(S.bao) + '</div>' : '';
    if (!S.M) {
      $('#xhm-sanh').innerHTML = dauMua() + '<div class="xh-rong">Thầy Andrew chưa mở mùa xếp hạng.<br>Em quay lại sau nhé!</div>';
      return;
    }
    var thongBao = tt === 'sap' ? '<div class="xh-bao">Mùa giải mở lúc <b>' + XH.ngayGio(S.M.tu) + '</b>. Đọc trước luật ở thẻ <b>Hạng & luật</b> nhé!</div>'
      : tt === 'dung' ? '<div class="xh-bao">Thầy Andrew đang tạm dừng mùa giải.</div>'
      : tt === 'het' || tt === 'chot' ? '<div class="xh-bao">Mùa giải đã kết thúc. Phần thưởng gửi vào hộp thông báo khi thầy chốt mùa.</div>' : '';
    $('#xhm-sanh').innerHTML =
      '<div class="xh-sanh"><div class="xh-c1">' + dauMua() + gioVang() + thongBao + bao + theHang() + theDiemDanh() +
      '<div class="xh-chedo"><button class="xh-cd chon">1–1<small>Đấu đơn</small></button><button class="xh-cd khoa" disabled>2–2<small>Sắp mở 🔒</small></button><button class="xh-cd khoa" disabled>3–3<small>Sắp mở 🔒</small></button></div>' +
      '</div><div class="xh-c2">' + phongDo() +
      (S.live.length ? '<div class="xh-the"><h3>ĐANG ĐẤU <button data-t="live">Xem tất cả ›</button></h3><div class="xh-live">' + S.live.slice(0, 2).map(lvHtml).join('') + '</div></div>' : '') +
      '<div class="xh-the"><h3>TOP TOÀN TRƯỜNG <button data-t="bxh">Xem top 20 ›</button></h3>' + topNho() + '</div>' +
      '</div></div>' +
      '<div class="xh-day"><button class="xh-nut" id="xhTim"' + (cam ? ' disabled' : '') + '>' + (hangEm() || S.toi.laThay ? 'TÌM TRẬN' : 'PHÂN HẠNG') + '<small>' + (hangEm() || S.toi.laThay ? (S.M.phut || 2) + ' phút · mỗi bàn 3 từ' : 'Trận ' + Math.min(5, ((S.em && S.em.xl) || 0) + 1) + '/5 · ' + (S.M.phut || 2) + ' phút') + '</small></button>' +
      '<p class="xh-ghi">' + esc(cam || 'Máy tìm bạn cùng hạng, chờ lâu sẽ mở rộng dần.') + '</p></div>';
  }
  var PHAM = [[0, 'Bạn cùng hạng'], [15, 'Mở rộng sang bậc gần kề'], [30, 'Mở rộng sang hạng gần kề'], [60, 'Mở rộng mọi hạng · thắng bạn mạnh hơn được thêm điểm']];
  function veTim() {
    var h = hangEm(), s = Math.floor((bay() - S.timLuc) / 1000), k = 0;
    PHAM.forEach(function (p, i) { if (s >= p[0]) k = i; });
    var o = $('#xhm-tim');
    if (!o.dataset.dung) {
      o.dataset.dung = 1;
      o.innerHTML = '<div class="xh-giua"><div class="xh-radar"><div class="xh-vong"></div><div class="xh-vong"></div><div class="xh-vong"></div><div class="xh-quet"></div>' +
        '<span class="xh-cham" style="left:22%;top:30%"></span><span class="xh-cham" style="left:70%;top:24%;animation-delay:.6s"></span><span class="xh-cham" style="left:62%;top:72%;animation-delay:1.2s"></span>' +
        '<div class="xh-tam">' + (h ? XH.hhTag(h.ma, h.bac, 62) : XH.hhTag('an', '', 62)) + '</div></div>' +
        '<h2 class="xh-tieu">ĐANG TÌM ĐỐI THỦ</h2><div class="xh-gio xh-so" id="xhGio">0:00</div><p class="xh-ghi" id="xhPham"></p></div>' +
        '<div class="xh-day"><button class="xh-nut phu" id="xhHuy">Huỷ tìm</button></div>';
    }
    $('#xhGio').textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
    $('#xhPham').textContent = PHAM[k][1];
  }
  function veSS() {
    var t = S.tran || {}, ben = t.a === (S.toi && S.toi.uid) ? 'a' : 'b', khac = ben === 'a' ? 'b' : 'a';
    var con = Math.max(0, Math.ceil(((t.hetSS || 0) - 2000 - bay()) / 1000)), da = !!(t.ss && t.ss[ben]), ban = !!(t.ss && t.ss[khac]);
    var o = $('#xhm-ss');
    if (!o.dataset.dung) {
      o.dataset.dung = 1;
      o.innerHTML = '<div class="xh-giua"><div class="xh-thay">ĐÃ TÌM THẤY!</div><div class="xh-vongdem"><svg viewBox="0 0 140 140" width="140" height="140"><circle cx="70" cy="70" r="62" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="8"/>' +
        '<circle id="xhVong" cx="70" cy="70" r="62" fill="none" stroke="#3DF58A" stroke-width="8" stroke-linecap="round" stroke-dasharray="389.6" stroke-dashoffset="0" style="filter:drop-shadow(0 0 6px #3DF58A);transition:stroke-dashoffset 1s linear"/></svg>' +
        '<b class="xh-so" id="xhDem">10</b></div><div class="xh-ss"><span id="xhSs1"></span>Em<span id="xhSs2"></span>Đối thủ</div>' +
        '<p class="xh-ghi">Không bấm trong 10 giây ⇒ khoá tìm trận <b>1 phút</b></p></div>' +
        '<div class="xh-day"><button class="xh-nut" id="xhSS">SẴN SÀNG</button></div>';
    }
    $('#xhDem').textContent = con; $('#xhVong').style.strokeDashoffset = 389.6 * (1 - con / 10);
    $('#xhSs1').classList.toggle('ok', da); $('#xhSs2').classList.toggle('ok', ban);
    var b = $('#xhSS'); b.classList.toggle('da', da); b.textContent = da ? 'ĐÃ SẴN SÀNG ✓' : 'SẴN SÀNG'; b.disabled = da;
  }
  function veLive() {
    $('#xhm-live').innerHTML = '<div class="xh-bxh-dau"><b>ĐANG ĐẤU</b><small>Hạng cao lên trước</small></div>' +
      (S.live.length ? '<div class="xh-live">' + S.live.map(lvHtml).join('') + '</div>' : '<div class="xh-rong">Chưa có trận nào đang diễn ra.</div>');
  }
  function dongBxh(x, i, em) {
    var h = XH.hangTu(x.diem, x.s || x.ht);
    return '<div class="xh-hd' + (em ? ' em' : '') + '"><span class="xh-x xh-so">' + i + '</span><span class="xh-ng">' + XH.av(x.ten, x.anh) +
      '<span>' + esc(x.ten) + '<small>' + esc(x.lop || '') + '</small></span></span>' + XH.hhTag(h.ma, h.bac, 24) + '<span class="xh-d xh-so">' + x.diem + '</span></div>';
  }
  function veBxh() {
    var ds = S.top, toi = S.toi && S.toi.uid, em = S.em;
    var pod = ds.length ? '<div class="xh-podium">' + [1, 0, 2].map(function (k) {
      var x = ds[k]; if (!x) return '<div></div>';
      var h = XH.hangTu(x.diem, x.s || x.ht);
      return '<div class="xh-pd n' + (k + 1) + '"><span class="xh-x">#' + (k + 1) + '</span>' + XH.av(x.ten, x.anh) + XH.hhTag(h.ma, h.bac, k === 0 ? 46 : 36) + '<b>' + esc(x.ten) + '</b><small class="xh-so">' + x.diem + '</small></div>';
    }).join('') + '</div>' : '';
    var trong = ds.some(function (x) { return x.uid === toi; });
    var emDong = em && em.diem != null && em.hang && !trong ? '<div class="xh-em-day">' + dongBxh({ ten: 'Em · ' + (S.toi.ten || ''), lop: lopToi(), anh: S.toi.anh, diem: em.diem, s: suatToi() }, em.hang, true) + '</div>' : '';
    $('#xhm-bxh').innerHTML = '<div class="xh-bxh-dau"><b>TOP 20 TOÀN TRƯỜNG</b><small>' + esc((S.M && S.M.ten) || '') + '</small></div>' + pod +
      (ds.length > 3 ? '<div class="xh-bang">' + ds.slice(3).map(function (x, i) { return dongBxh(x, i + 4, x.uid === toi); }).join('') + '</div>' : '') +
      (!ds.length ? '<div class="xh-rong">Chưa có ai xong 5 trận phân hạng.</div>' : '') + emDong;
  }
  // điều kiện thưởng từng hạng (26/10 SUẤT: Bạch kim → Huyền thoại = thứ hạng cuối mùa + điểm sàn)
  function dieuKien(M) {
    var v = XH.viTriSuat(M);
    return { ht: 'Top ' + v.ht + ' · ≥' + v.htSan, ct: 'Top ' + v.ct + ' · ≥' + v.ctSan, kc: 'Top ' + v.kc + ' · ≥' + v.kcSan, bk: 'Top ' + v.bk + ' · ≥' + v.bkSan,
      vang: 'Từng đạt 800', bac: 'Từng đạt 300', dong: 'Đấu 1 trận' };
  }
  var TH_TEN = [['dong', 'Đồng'], ['bac', 'Bạc'], ['vang', 'Vàng'], ['bk', 'Bạch kim'], ['kc', 'Kim cương'], ['ct', 'Cao thủ'], ['ht', 'Huyền thoại']];
  // ⭐ 27/10 ĐIỂM DANH (mẫu v7 thầy chốt): ngày đấu xong ≥ 1 trận = đạt (máy chủ ghi em.dd = [số ngày giờ VN]).
  //   Thưởng khi hết mùa, lấy MỐC CAO NHẤT: đủ mọi ngày của mùa 10⭐ · 20 ngày liên tiếp 5⭐ · 10 ngày liên tiếp 2⭐ (M.ddSao đè được)
  var soNgay = function (ms) { return Math.floor((ms + 7 * 3600e3) / 864e5); };
  function ddSao() { var x = (S.M && S.M.ddSao) || {}; return { d10: x.d10 != null ? x.d10 : 2, d20: x.d20 != null ? x.d20 : 5, du: x.du != null ? x.du : 10 }; }
  function ddTinh() {
    var em = S.em || {}, set = {}, nay = soNgay(bay()), M = S.M || {};
    (em.dd || []).forEach(function (n) { set[n] = 1; });
    var c = 0, n = set[nay] ? nay : nay - 1; while (set[n]) { c++; n--; }
    var dau = soNgay(M.tu || bay()), cuoi = soNgay(M.den || bay()), dat = 0, max = 0, chay = 0;
    for (var k = dau; k <= cuoi; k++) { if (set[k]) { dat++; chay++; max = Math.max(max, chay); } else chay = 0; }
    return { set: set, nay: nay, chuoi: c, max: Math.max(max, em.ddMax || 0), dat: dat, dau: dau, cuoi: cuoi, tong: cuoi - dau + 1, homNay: !!set[nay] };
  }
  // ngày thứ k (số ngày giờ VN) ⇒ Date đọc bằng getUTC* ra đúng ngày/thứ VN
  var ngayK = function (k) { return new Date(k * 864e5); };
  function theDiemDanh() {
    if (!S.M || (S.toi && S.toi.laThay)) return '';
    var d = ddTinh(), TH = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'], dai = '';
    for (var k = d.nay - 6; k <= d.nay; k++) {
      var ts = ngayK(k);
      dai += '<div class="' + (d.set[k] ? 'd' : '') + (k === d.nay ? ' nay' : '') + '">' + TH[ts.getUTCDay()] + '<span>' + ts.getUTCDate() + '</span></div>';
    }
    var sao = ddSao(), moc = d.chuoi < 10 ? d.chuoi + '/10 ngày · +' + sao.d10 + '⭐' : d.chuoi < 20 ? d.chuoi + '/20 ngày · +' + sao.d20 + '⭐' : 'Giữ chuỗi tới hết mùa · +' + sao.du + '⭐';
    return '<button class="xh-the xh-dd" data-dd type="button"><h3>ĐIỂM DANH <span>' + (d.homNay ? '✓ hôm nay' : 'đấu 1 trận hôm nay') + '</span></h3>' +
      '<div class="xh-dd-lua"><b class="xh-so">🔥' + d.chuoi + '</b><small>ngày liên tiếp<br>Kỷ lục ' + d.max + ' · đạt ' + d.dat + '/' + d.tong + '</small></div>' +
      '<div class="xh-dd-bay">' + dai + '</div><div class="xh-dd-moc"><u style="width:' + Math.min(100, Math.round(100 * d.chuoi / (d.chuoi < 10 ? 10 : d.chuoi < 20 ? 20 : d.tong))) + '%"></u><span>' + moc + '</span></div></button>';
  }
  // tab Thưởng: 3 mốc điểm danh (nhận mốc cao nhất khi hết mùa)
  function theDdThuong() {
    var d = ddTinh(), sao = ddSao();
    return '<div class="xh-the"><h3>ĐIỂM DANH <span style="letter-spacing:0;font-weight:600">mỗi ngày đấu ≥ 1 trận · hết mùa nhận mốc cao nhất</span></h3><div class="xh-dd-3">' +
      '<div' + (d.max >= 10 ? ' class="xong"' : '') + '><b>10</b><small>ngày liên tiếp</small><u>+' + sao.d10 + '⭐</u></div>' +
      '<div' + (d.max >= 20 ? ' class="xong"' : '') + '><b>20</b><small>ngày liên tiếp</small><u>+' + sao.d20 + '⭐</u></div>' +
      '<div' + (d.dat >= d.tong ? ' class="xong"' : '') + '><b>' + d.tong + '</b><small>cả mùa</small><u>+' + sao.du + '⭐</u></div></div></div>';
  }
  function moLich() {
    var d = ddTinh(), sao = ddSao(), h = '', TH = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'], thang = -1;
    for (var k = d.dau; k <= d.cuoi; k++) {
      var ts = ngayK(k), m = ts.getUTCMonth(), thu = (ts.getUTCDay() + 6) % 7;
      if (m !== thang) {
        thang = m; h += '<p>THÁNG ' + (m + 1) + '</p>' + TH.map(function (t) { return '<em>' + t + '</em>'; }).join('');
        for (var y = 0; y < thu; y++) h += '<i></i>';
      }
      var lop = d.set[k] ? 'dat' : k < d.nay ? 'lo' : k > d.nay ? 'sau' : '';
      h += '<span class="' + lop + (k === d.nay ? ' nay' : '') + '">' + ts.getUTCDate() + (k === d.dau ? '<small>MỞ</small>' : k === d.cuoi ? '<small>KẾT</small>' : '') + '</span>';
      var sau = ngayK(k + 1);
      if (k < d.cuoi && sau.getUTCMonth() !== m) { for (var z = (sau.getUTCDay() + 6) % 7; z > 0 && z < 7; z++) h += '<i></i>'; }
    }
    var hop = document.createElement('div'); hop.className = 'xh-hop xh-lich-hop';
    hop.innerHTML = '<div><h4>ĐIỂM DANH · ' + esc(String(S.M.ten || '').toUpperCase()) + '</h4>' +
      '<p class="xh-so">🔥 <b>' + d.chuoi + '</b> ngày liên tiếp · kỷ lục <b>' + d.max + '</b> · đạt <b>' + d.dat + '/' + d.tong + '</b></p>' +
      '<div class="xh-lich">' + h + '</div>' +
      '<div class="xh-dd-3"><div' + (d.max >= 10 ? ' class="xong"' : '') + '><b>10</b><small>ngày liên tiếp</small><u>+' + sao.d10 + '⭐</u></div>' +
      '<div' + (d.max >= 20 ? ' class="xong"' : '') + '><b>20</b><small>ngày liên tiếp</small><u>+' + sao.d20 + '⭐</u></div>' +
      '<div' + (d.dat >= d.tong ? ' class="xong"' : '') + '><b>' + d.tong + '</b><small>cả mùa</small><u>+' + sao.du + '⭐</u></div></div>' +
      '<p class="xh-ghi">Mỗi ngày đấu xong ít nhất 1 trận. Hết mùa nhận mốc cao nhất.</p>' +
      '<button class="xh-nut phu" data-dong type="button">Đóng</button></div>';
    document.body.appendChild(hop);
    hop.addEventListener('click', function (e) { if (e.target === hop || e.target.closest('[data-dong]')) hop.remove(); });
  }
  function veThuong() {
    var sao = (S.M && S.M.sao) || {}, em = S.em || {}, dk = dieuKien(S.M), vt = XH.viTriSuat(S.M), s = suatToi();
    var cao = (em.xl || 0) >= 5 && em.cao != null ? (XH.laSuat(s) ? s : XH.hangTu(em.cao).ma) : (em.tran || em.xl ? 'dong' : '');
    $('#xhm-thuong').innerHTML = '<div class="xh-mua"><div><b>THƯỞNG CUỐI ' + esc(String((S.M && S.M.ten) || 'MÙA').toUpperCase()) + '</b><small>Bạch kim trở lên chỉ dành cho ' + vt.tong + ' bạn đứng đầu lúc hết mùa</small></div></div>' +
      '<div class="xh-thuong">' + TH_TEN.map(function (x) {
        return '<div class="xh-tg' + (x[0] === cao ? ' dat' : '') + '">' + XH.hhTag(x[0], '', 50) + '<b>' + x[1] + '</b><small class="xh-dk">' + esc(dk[x[0]]) + '</small><span class="xh-sao">+' + (sao[x[0]] || 0) + ' ⭐</span>' + (x[0] === cao ? '<small>EM ĐANG Ở ĐÂY</small>' : '') + '</div>';
      }).join('') + '</div>' + theDdThuong() +
      '<div class="xh-the"><ul class="xh-luat"><li><span>🏆</span><span><b>Bạch kim → Huyền thoại</b> tính theo <b>thứ hạng lúc hết mùa</b>: phải giữ phong độ tới phút cuối. Suất không ai đủ điểm thì bỏ trống.</span></li>' +
      '<li><span>🥇</span><span><b>Đồng · Bạc · Vàng</b> tính theo điểm <b>cao nhất</b> em từng đạt. Ngoài top ' + vt.tong + ' thì tối đa là Vàng.</span></li>' +
      '<li><span>⭐</span><span>Sao vào <b>ví sao</b> khi thầy chốt mùa.</span></li>' +
      '<li><span>🏁</span><span>Mùa kết thúc lúc <b>' + (S.M ? XH.ngayGio(S.M.den) : '—') + '</b>.</span></li>' +
      '<li><span>↘</span><span>Mùa mới: đấu lại <b>5 trận phân hạng</b>.</span></li></ul></div>';
  }
  function veLuat() {
    var g = S.M && S.M.gioVang, dk = dieuKien(S.M);
    var HB = [['ht', dk.ht, 'B2–C1', 'Người số 1 toàn trường'], ['ct', dk.ct, 'B2', 'Suất · không chia bậc'], ['kc', dk.kc, 'B1–B2', 'Suất · không chia bậc'],
      ['bk', dk.bk, 'B1', 'Suất · không chia bậc'], ['vang', '800', 'A2', 'III · II · I · mốc an toàn'], ['bac', '300', 'A1–A2', 'III · II · I · thua mất ít'], ['dong', '0', 'A1', 'III · II · I · thua không mất điểm']];
    $('#xhm-luat').innerHTML = '<div class="xh-hang-luoi"><div class="xh-hb">' + HB.map(function (x) {
      return '<div class="xh-hbd">' + XH.hhTag(x[0], '', 36) + '<h4 style="color:' + XH.HANG[x[0]].a + '">' + XH.HANG[x[0]].ten + '</h4><span class="xh-moc xh-so">' + x[1] + '<span class="xh-cefr">' + x[2] + '</span></span><p>' + x[3] + '</p></div>';
    // 27/10 thầy: chữ chung chung, KHÔNG ghi số điểm từng trận (công thức điểm đổi ngầm — máy chủ xep-hang.js kTheoDiem)
    }).join('') + '</div><div class="xh-c2"><div class="xh-diem4 xh-so"><div><b style="color:var(--xh-neon)">▲</b><small>Thắng</small></div><div><b>＝</b><small>Hòa</small></div>' +
      '<div><b style="color:var(--xh-do)">▼</b><small>Thua</small></div><div><b style="color:var(--xh-do)">✕</b><small>Bỏ trận</small></div></div>' +
      '<div class="xh-the"><ul class="xh-luat"><li><span>💪</span><span>Thắng bạn <b>mạnh hơn</b> được nhiều điểm hơn · thắng bạn yếu hơn được ít.</span></li>' +
      '<li><span>🔥</span><span>Chuỗi <b>3 trận thắng</b> trở lên: được thêm điểm.</span></li>' +
      (g && g.nhan > 1 ? '<li><span>⚡</span><span>Giờ vàng <b>' + XH.phutChu(g.tu) + '–' + XH.phutChu(g.den) + '</b>: điểm cộng ×' + String(g.nhan).replace('.', ',') + '.</span></li>' : '') +
      '<li><span>📉</span><span>Điểm càng cao, thắng được càng ít · thua bạn yếu hơn mất nhiều điểm.</span></li>' +
      '<li><span>🛡</span><span>Vừa lên bậc: <b>3 trận</b> thua không rớt bậc.</span></li>' +
      '<li><span>📌</span><span>Đã lên <b>Vàng</b> (800) thì không rớt dưới 800 trong mùa.</span></li>' +
      '<li><span>⏱</span><span>Mỗi bàn <b>3 từ</b> · đủ 3 từ hoặc hết <b>20 giây</b> là sang bàn mới.</span></li>' +
      '<li><span>🔤</span><span>Từ <b>1100 điểm</b>: gợi ý bằng <b>tiếng Anh</b>, càng lên cao câu càng dài, càng phải suy luận.</span></li>' +
      '<li><span>🚪</span><span>Thoát giữa trận = thua, khoá tìm trận 2 phút.</span></li>' +
      dongDem() + '</ul></div></div></div>';
  }
  // giờ nghỉ đêm đọc cài đặt thật (caiDat/choiGame qua GioiHan) — thầy đổi ở trang Giải đấu thì dòng này tự theo
  function dongDem() {
    var G = window.GioiHan, c = G && G.cai;
    if (!c || !c.bat) return '';
    return '<li><span>🌙</span><span>Nghỉ đêm ' + G.gioChu(c.nghiTu) + '–' + G.gioChu(c.nghiDen) + ' không tìm trận.</span></li>';
  }
  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-t]'); if (t && !t.closest('#xhTabs')) return moTab(t.dataset.t);
    if (e.target.closest('[data-dd]')) return moLich();
    var x = e.target.closest('[data-xem]'); if (x) { location.href = NW.duong ? NW.duong('xhtran.html?id=' + encodeURIComponent(x.dataset.xem)) : 'xhtran.html?id=' + encodeURIComponent(x.dataset.xem); return; }
    if (e.target.closest('#xhTim')) return batDauTim();
    if (e.target.closest('#xhHuy')) return huyTim();
    if (e.target.closest('#xhSS')) return sanSang();
  });

  // ---------- TÌM TRẬN ----------
  async function batDauTim() {
    S.bao = '';
    var cam = camTim(); if (cam) { S.bao = cam; return ve(); }
    if (window.TdQuan && !S.thu) { var ok = await TdQuan.cho('xh', { uid: S.toi.uid, lop: lopToi() }); if (!ok) return; }
    S.timLuc = bay(); S.daSS = false; S.tranId = ''; S.tran = null;
    $('#xhm-tim').dataset.dung = ''; $('#xhm-ss').dataset.dung = '';
    hienMan('tim');
    if (S.thu) { S.thuHen = setTimeout(function () { thuThay(); }, 8000); return; }
    var f = S.f, ref = f.fs.doc(f.db, 'xhHang', S.toi.uid);
    try {
      try { await f.fs.deleteDoc(ref); } catch (e) { /* chưa có phiếu */ }
      await f.fs.setDoc(ref, { mua: S.mua, vao: f.fs.serverTimestamp(), nhip: f.fs.serverTimestamp() });
    } catch (e) { console.warn('[xh] vào hàng chờ', e); S.bao = 'Chưa vào được hàng chờ — kiểm tra mạng rồi thử lại.'; return moTab('sanh'); }
    clearInterval(S.nhipIv);
    S.nhipIv = setInterval(function () {
      if (S.man !== 'tim') return;
      f.fs.updateDoc(ref, { nhip: f.fs.serverTimestamp() }).catch(function () { });
    }, 5000);
    ngheHang();
  }
  function ngheHang() {
    var f = S.f; if (S.ngheHang) S.ngheHang();
    S.ngheHang = f.fs.onSnapshot(f.fs.doc(f.db, 'xhHang', S.toi.uid), function (s) {
      if (S.man !== 'tim' && S.man !== 'ss') return;
      if (!s.exists()) {   // máy chủ xoá phiếu: em bỏ lỡ Sẵn sàng (bị khoá) — hoặc trận đã vào
        if (S.man === 'ss' && S.tran && ['nhan', 'choi'].indexOf(S.tran.trangThai) >= 0) return;
        if (S.man === 'ss' && !S.daSS) { dungTim(); S.bao = 'Em chưa bấm Sẵn sàng nên bị khoá tìm trận 1 phút.'; napEm(); return moTab('sanh'); }
        return;
      }
      var x = s.data();
      if (x.loi) {
        dungTim();
        S.bao = x.loi === 'dem' ? 'Đang giờ nghỉ đêm — mai đấu tiếp nhé!' : x.loi === 'khoa' ? 'Em đang bị khoá tìm trận một lúc.' : 'Mùa giải đang đóng.';
        f.fs.deleteDoc(s.ref).catch(function () { });
        napEm(); return moTab('sanh');
      }
      if (x.tran && x.tran !== S.tranId) ngheTran(x.tran);
      if (!x.tran && S.man === 'ss') { S.tranId = ''; S.tran = null; $('#xhm-tim').dataset.dung = ''; hienMan('tim'); }   // đối thủ không sẵn sàng ⇒ tìm tiếp
    });
  }
  function ngheTran(id) {
    var f = S.f; S.tranId = id; S.daSS = false; if (S.ngheTran) S.ngheTran();
    S.ngheTran = f.fs.onSnapshot(f.fs.doc(f.db, 'tranDau', id), function (s) {
      if (!s.exists() || S.tranId !== id) return;
      var t = s.data(); S.tran = t;
      if (t.trangThai === 'cho') {
        if (S.man !== 'ss') { $('#xhm-ss').dataset.dung = ''; hienMan('ss'); try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch (e) { } }
        else veSS();
      } else if (t.trangThai === 'nhan' || t.trangThai === 'choi') {
        dungTim(true);
        location.href = 'xhtran.html?id=' + encodeURIComponent(id);
      } else if (t.trangThai === 'han') {
        dungTim(); S.bao = 'Đã tới giờ nghỉ đêm — trận không bắt đầu.'; moTab('sanh');
      }
    });
  }
  async function sanSang() {
    if (S.thu) { S.tran.ss.a = true; S.daSS = true; veSS(); setTimeout(function () { S.tran.ss.b = true; veSS(); setTimeout(function () { location.href = 'xhtran.html?thu=1'; }, 700); }, 1000); return; }
    var t = S.tran; if (!t || S.daSS) return;
    var ben = t.a === S.toi.uid ? 'a' : 'b', o = {}; o['ss.' + ben] = true;
    S.daSS = true; veSS();
    try { await S.f.fs.updateDoc(S.f.fs.doc(S.f.db, 'tranDau', S.tranId), o); }
    catch (e) { console.warn('[xh] sẵn sàng', e); S.daSS = false; veSS(); }
  }
  function dungTim(giuPhieu) {
    clearInterval(S.nhipIv); clearTimeout(S.thuHen);
    if (S.ngheHang) { S.ngheHang(); S.ngheHang = null; }
    if (S.ngheTran) { S.ngheTran(); S.ngheTran = null; }
    if (!giuPhieu && S.f && S.toi && !S.thu) S.f.fs.deleteDoc(S.f.fs.doc(S.f.db, 'xhHang', S.toi.uid)).catch(function () { });
  }
  function huyTim() { dungTim(); moTab('sanh'); }
  addEventListener('pagehide', function () { if (S.man === 'tim') dungTim(); });

  // ---------- dữ liệu ----------
  function napEm() {
    var f = S.f; if (!f || !S.mua || !S.toi || S.thu) return;
    f.fs.getDoc(f.fs.doc(f.db, 'xhMua', S.mua, 'em', S.toi.uid)).then(function (s) { S.em = s.exists() ? s.data() : null; ve(); }).catch(function () { });
  }
  async function batDau() {
    S.thu = NW.laBanThu();
    S.toi = NW.toi;
    if (S.thu) return banThu();
    S.f = await NW.fb();
    var f = S.f;
    if (window.GioiHan && GioiHan.napCai) { try { await GioiHan.napCai(); } catch (e) { } }
    try { var m = await XH.muaHienTai(f); S.mua = m.mua; S.M = m.M; }
    catch (e) { console.warn('[xh] đọc mùa', e); }
    moTab('sanh');
    if (!S.M) return;
    f.fs.onSnapshot(f.fs.doc(f.db, 'xhMua', S.mua), function (s) { if (s.exists()) { S.M = s.data(); ve(); } });
    if (!S.toi.laThay) f.fs.onSnapshot(f.fs.doc(f.db, 'xhMua', S.mua, 'em', S.toi.uid), function (s) { S.em = s.exists() ? s.data() : null; ve(); }, function () { });
    f.fs.onSnapshot(f.fs.doc(f.db, 'xhMua', S.mua, 'bang', 'top'), function (s) { S.top = (s.exists() && s.data().ds) || []; ve(); }, function () { });
    // Đang đấu: mọi trận xếp hạng đang chơi của mùa — hạng cao lên trước (theo tổng điểm hạng hiển thị không có ⇒ theo thứ tự hạng hA/hB)
    f.fs.onSnapshot(f.fs.query(f.fs.collection(f.db, 'tranDau'), f.fs.where('xh', '==', S.mua), f.fs.where('trangThai', '==', 'choi'), f.fs.limit(30)), function (s) {
      var ds = [];
      s.forEach(function (d) { var t = d.data(); if ((t.ketThuc || 0) > bay() - 5000) { t.id = d.id; ds.push(t); } });
      var bac = function (h) { var p = XH.hien(h), i = ['dong', 'bac', 'vang', 'bk', 'kc', 'ct', 'ht'].indexOf(p.ma); return (i < 0 ? -1 : i) * 3 + ({ III: 0, II: 1, I: 2 }[p.bac] || 0); };
      ds.sort(function (x, y) { return Math.max(bac(y.hA), bac(y.hB)) - Math.max(bac(x.hA), bac(x.hB)); });
      S.live = ds; napTimLive(); ve();
    }, function (e) { console.warn('[xh] đang đấu', e); });
    if (q.get('tim') === '1' && !camTim()) batDauTim();
    // phiếu hàng chờ còn sót (tải lại trang giữa lúc tìm) ⇒ dọn
    else if (!S.toi.laThay) f.fs.deleteDoc(f.fs.doc(f.db, 'xhHang', S.toi.uid)).catch(function () { });
  }
  // số tim + người xem của các trận đang đấu (đọc một lần mỗi 20 giây — đủ cho danh sách)
  var _timLuc = 0;
  function napTimLive() {
    if (bay() - _timLuc < 6000 || !S.live.length) return; _timLuc = bay();   // 27/10 thầy: gần thời gian thực (trước 20 giây)
    var f = S.f;
    S.live.slice(0, 10).forEach(function (t) {
      Promise.all([f.fs.getDoc(f.fs.doc(f.db, 'tranDau', t.id, 'tim', 'a')), f.fs.getDoc(f.fs.doc(f.db, 'tranDau', t.id, 'tim', 'b')), f.fs.getDocs(f.fs.collection(f.db, 'tranDau', t.id, 'xem'))])
        .then(function (r) {
          t.tim = (r[0].exists() ? r[0].data().n || 0 : 0) + (r[1].exists() ? r[1].data().n || 0 : 0);
          var n = 0; r[2].forEach(function (d) { if ((d.data().luc || 0) > bay() - 25000) n++; }); t.xem = n; ve();
        }).catch(function () { });
    });
  }
  setInterval(function () {
    if (S.man === 'tim') veTim();
    else if (S.man === 'ss') { veSS(); if (S.thu && S.tran && !S.daSS && bay() > S.tran.hetSS) { S.bao = 'Em chưa bấm Sẵn sàng nên bị khoá tìm trận 1 phút.'; moTab('sanh'); } }
    else if (S.man === 'sanh' && bay() - BOOT > 1000) { var c = $('.xh-con'); if (c && S.M) { var tt = XH.ttMua(S.M, bay()); if (tt === 'sap') c.innerHTML = XH.conLai(S.M.tu - bay()) + '<small>tới lúc mở</small>'; else if (tt === 'mo' || tt === 'dung') c.innerHTML = XH.conLai(S.M.den - bay()) + '<small>còn lại</small>'; } }
  }, 500);

  // ---------- BÀN THỬ (?thu=1 trên máy) ----------
  function banThu() {
    var t0 = bay();
    S.toi = S.toi || { uid: 'hs_100046', ten: 'Bảo Nam', lop: 'A2B' };
    S.mua = 'thu'; S.M = { ten: 'Mùa 1 · Khởi động', tu: t0 - 5 * 864e5, den: t0 + 12 * 864e5 + 7 * 36e5, tt: 'mo', phut: 2, gioVang: { tu: 1170, den: 1260, nhan: 1.5 }, sao: { dong: 1, bac: 2, vang: 5, bk: 10, kc: 15, ct: 20, ht: 30 } };
    var kq = q.get('xl') ? +q.get('xl') : 5;
    S.em = kq < 5 ? { xl: kq, xlThang: 2, ds: [{ kq: 'thang' }, { kq: 'thua' }, { kq: 'thang' }].slice(0, kq) }
      : { xl: 5, diem: 764, cao: 764, tran: 24, thang: 15, hoa: 1, thua: 8, chuoi: 3, hang: 47, baoVe: 0,
        dd: [0, 1, 2, 4, 5].map(function (k) { return Math.floor((t0 + 7 * 3600e3) / 864e5) - 5 + k; }), ddMax: 3, ds: ['thang', 'thang', 'thang', 'thua', 'hoa', 'thang', 'thua'].map(function (k) { return { kq: k, vs: 'Bạn', toi: 30, ban: 20 }; }) };
    var TEN = ['Thiên Phúc', 'Khôi Nguyên', 'Phương Vy', 'Hải Đăng', 'Minh Châu', 'Gia Huy', 'Ngọc Hà', 'Tuấn Kiệt', 'An Nhiên', 'Quốc Bảo', 'Thảo My', 'Đức Minh', 'Bảo Châu', 'Nhật Huy', 'Khánh Vy', 'Hoài An', 'Trung Kiên', 'Mai Chi', 'Phúc Lâm', 'Yến Nhi'];
    S.top = TEN.map(function (t, i) { return { uid: 'u' + i, ten: t, lop: ['B2-A', 'B1-B', 'A2-B', 'B1-A', 'A1-B'][i % 5], diem: 1842 - i * 45, s: ['ht', 'ct', 'ct', 'kc', 'kc', 'kc', 'bk', 'bk', 'bk', 'bk', 'bk', 'bk'][i] || '', tran: 40 + i }; });
    S.live = [['Thiên Phúc', 'ct:', 'Khôi Nguyên', 'ct:', 41, 38], ['Hải Đăng', 'kc:I', 'Minh Châu', 'kc:II', 22, 30], ['Gia Huy', 'bk:II', 'Ngọc Hà', 'bk:III', 15, 9]]
      .map(function (x, i) { return { id: 'thu' + i, tenA: x[0], hA: x[1], tenB: x[2], hB: x[3], diem: { a: x[4], b: x[5] }, van: 2 - i, ketThuc: t0 + 70000 - i * 15000, tim: 52 - i * 15, xem: 14 - i * 4 }; });
    moTab(q.get('tab') || 'sanh');
  }
  function thuThay() {
    S.tran = { a: S.toi.uid, b: 'u9', ss: { a: false, b: false }, hetSS: bay() + 12000, trangThai: 'cho' };
    $('#xhm-ss').dataset.dung = ''; hienMan('ss');
  }

  NW.dungThanh({ tab: 'khamPha', hop: true }).then(batDau);
})();
