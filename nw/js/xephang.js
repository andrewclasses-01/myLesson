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
    timLuc: 0, nhipIv: 0, tickIv: 0, ngheTran: null, ngheHang: null, ngheChat: null, daSS: false, bao: '', thu: false, pha: 'cho', pcChat: [], pcGhi: [], pcMoi: false, pcXn: false, phongs: [], phChat: [], phXem: [], xemP: '', phong: null, phongTu: 0 };
  var app = document.getElementById('xhApp');
  var BOOT = Date.now();

  // ---------- dựng khung ----------
  var TABS = [['sanh', 'Sảnh'], ['live', 'Đang đấu'], ['bxh', 'BXH'], ['thuong', 'Thưởng'], ['luat', 'Hạng & luật']];
  app.innerHTML =
    '<div class="xh-dau"><a class="xh-ve" href="khampha.html" aria-label="Về Khám phá">‹</a><h1>Xếp hạng <em>A Show Speed</em></h1></div>' +
    '<div class="xh-tabs" role="tablist" id="xhTabs">' + TABS.map(function (t) { return '<button role="tab" data-t="' + t[0] + '" title="' + t[1] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<div class="xh-canh" id="xhCanh">' +
    ['sanh', 'pc', 'live', 'bxh', 'thuong', 'luat'].map(function (m) { return '<section class="xh-man" id="xhm-' + m + '"></section>'; }).join('') +
    '</div>';
  $('#xhTabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) moTab(b.dataset.t); });

  function moTab(t) {
    if (S.man === 'pc' && S.pha === 'xem') roiXem();   // 31/10 rời phòng đang xem
    else if (S.man === 'pc' && S.pha !== 'cho') { if (t !== 'sanh') return; }
    S.tab = t; S.man = t;
    [].forEach.call($('#xhTabs').children, function (b) { b.setAttribute('aria-selected', b.dataset.t === t); });
    hienMan(t);
  }
  function hienMan(m) {
    S.man = m;
    [].forEach.call(document.querySelectorAll('.xh-man'), function (x) { x.classList.toggle('mo', x.id === 'xhm-' + m); });
    $('#xhTabs').hidden = m === 'pc';
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
    else if (m === 'pc') vePhong();
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
    var g = S.M && S.M.gioVang;
    // 31/10 Chủ nhật ×1,5 cả ngày: thay dải giờ vàng (trùng giờ vàng hệ số lớn hơn thì máy chủ lấy giờ vàng)
    if (XH.chuNhatNay(S.M, bay()) && !(XH.gioVangNay(S.M, bay()) && g.nhan > 1.5)) return '<div class="xh-gv dang">' + XH.bt('set', 16) + ' <b>CHỦ NHẬT VÀNG</b> cả ngày · điểm ×1,5<span class="xh-so">ĐANG DIỄN RA</span></div>';
    if (!g || !(g.nhan > 1)) return '';
    var dang = XH.gioVangNay(S.M, bay()), d = new Date(), p = d.getHours() * 60 + d.getMinutes();
    var phai = dang ? 'ĐANG DIỄN RA' : (p < g.tu ? 'sau ' + Math.floor((g.tu - p) / 60) + 'g' + ('0' + (g.tu - p) % 60).slice(-2) : XH.phutChu(g.tu) + ' mai');
    return '<div class="xh-gv' + (dang ? ' dang' : '') + '">' + XH.bt('set', 16) + ' <b>GIỜ VÀNG</b> ' + XH.phutChu(g.tu) + '–' + XH.phutChu(g.den) + ' · điểm ×' + String(g.nhan).replace('.', ',') + '<span class="xh-so">' + phai + '</span></div>';
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
    var vt = XH.viTriSuat(S.M), d = em.diem || 0, hang = em.hang ? 'Hạng <b>#' + em.hang + '</b> toàn giải' : '';
    var trong = h.trongBac, bar, tiep;
    if (h.suat) { bar = 100; tiep = (hang || 'Đang giữ suất') + ' · suất ' + esc(XH.HANG[h.ma].ten) + ' (top ' + vt[h.ma] + ')'; }
    else if (h.len) { bar = Math.floor(100 * trong / h.rong); tiep = '<b>' + trong + '</b>/' + h.rong + ' · còn <b>' + (h.len - d) + '</b> điểm lên ' + esc(XH.hangTu(h.len).ten); }
    else {   // Vàng I: muốn lên nữa phải giành SUẤT
      bar = Math.min(100, Math.max(0, Math.round(100 * (d - 1000) / Math.max(1, vt.bkSan - 1000))));
      tiep = (hang ? hang + ' · ' : '') + (d < vt.bkSan ? 'còn <b>' + (vt.bkSan - d) + '</b> điểm + lọt <b>top ' + vt.tong + '</b> để giành suất Bạch kim' : 'lọt <b>top ' + vt.tong + '</b> để giành suất Bạch kim');
    }
    return '<div class="xh-the"><div class="xh-toi">' + XH.hhTag(h.ma, h.bac, 84) + '<div class="xh-tt"><h2>' + esc(XH.HANG[h.ma].ten.toUpperCase()) + (h.bac ? '<span>' + h.bac + '</span>' : '') + '</h2>' +
      '<div class="xh-thanh"><u style="width:' + bar + '%"></u></div><p class="xh-so">' + tiep + (em.baoVe ? ' · ' + XH.bt('khien', 14) + em.baoVe + ' trận giữ mốc ' + XH.mocKhien(d) : '') + '</p></div></div>' +
      '<div class="xh-so3 xh-so"><div><b>' + (em.tran || 0) + '</b><small>trận mùa này</small></div>' +
      '<div><b>' + (em.tran ? Math.round(100 * (em.thang || 0) / em.tran) : 0) + '%</b><small>thắng</small></div>' +
      '<div><b style="color:#FFB3BA">' + (em.chuoi >= 2 ? XH.bt('lua', 18) : '') + (em.chuoi || 0) + '</b><small>chuỗi thắng</small></div></div></div>';
  }
  function phongDo() {
    var ds = (S.em && S.em.ds) || []; if (!ds.length) return '';
    return '<div class="xh-the"><h3>PHONG ĐỘ <span style="letter-spacing:0;font:600 12px/1 var(--xh-v);color:var(--xh-mo)">' + Math.min(7, ds.length) + ' trận gần nhất</span></h3><div class="xh-phong">' +
      ds.slice(0, 7).map(function (r) { var k = r.kq === 'thang' ? 't' : r.kq === 'thua' ? 'b' : 'h'; return '<span class="xh-kq ' + k + (r.thay ? ' gv' : '') + '" title="' + esc((r.vs || '') + ' ' + (r.toi || 0) + '–' + (r.ban || 0) + (r.thay ? ' · Thầy Andrew hỗ trợ' : '')) + '">' + k.toUpperCase().replace('B', 'B') + '</span>'; }).join('') +
      '</div></div>';
  }
  function lvHtml(t, i) {
    var a = XH.hien(t.hA), b = XH.hien(t.hB), d = t.diem || {};
    var con = t.ketThuc ? Math.max(0, t.ketThuc - bay()) : 0;
    return '<button class="xh-lv' + (i === 0 ? ' noi' : '') + '" data-xem="' + esc(t.id) + '"><div class="xh-h1">' +
      '<span class="xh-p">' + XH.av(t.tenA, t.anhA) + '<span>' + esc(t.tenA) + '</span>' + XH.hhTag(a.ma, a.bac, 20) + '</span>' +
      '<span class="xh-ts xh-so"><b>' + (d.a || 0) + '</b> – <u>' + (d.b || 0) + '</u></span>' +
      '<span class="xh-p r">' + XH.av(t.tenB, t.anhB) + '<span>' + esc(t.tenB) + '</span>' + XH.hhTag(b.ma, b.bac, 20) + '</span></div>' +
      '<div class="xh-h2 xh-so"><span>BÀN ' + ((t.van || 0) + 1) + ' · ' + XH.dongHo(con) + '</span>' + (t.xem ? '<span>' + XH.bt('mat', 14) + ' ' + t.xem + '</span>' : '') +
      '<span class="xh-tmx">' + XH.bt('tim', 14) + ' ' + (t.tim || 0) + '</span><span class="xh-vao">XEM ›</span></div></button>';
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
      '<div class="xh-chedo"><button class="xh-cd chon">1–1<small>Đấu đơn</small></button><button class="xh-cd khoa" disabled>2–2<small>Sắp mở ' + XH.bt('khoa', 13) + '</small></button><button class="xh-cd khoa" disabled>3–3<small>Sắp mở ' + XH.bt('khoa', 13) + '</small></button></div>' +
      '</div><div class="xh-c2">' + phongDo() +
      (S.live.length || phongMo().length ? '<div class="xh-the"><h3>ĐANG ĐẤU <button data-t="live">Xem tất cả ›</button></h3><div class="xh-live">' + S.live.slice(0, 2).map(lvHtml).concat(phongMo().map(phHtml)).slice(0, 2).join('') + '</div></div>' : '') +
      '<div class="xh-the"><h3>TOP TOÀN GIẢI <button data-t="bxh">Xem top 20 ›</button></h3>' + topNho() + '</div>' +
      '</div></div>' +
      '<div class="xh-day"><button class="xh-nut" id="xhTim"' + (cam ? ' disabled' : '') + '>VÀO PHÒNG CHỜ<small>' + (hangEm() || S.toi.laThay ? 'Đấu 1–1 · ' + (S.M.phut || 2) + ' phút · mỗi bàn 3 từ' : 'Phân hạng trận ' + Math.min(5, ((S.em && S.em.xl) || 0) + 1) + '/5 · ' + (S.M.phut || 2) + ' phút') + '</small></button>' +
      '<p class="xh-ghi">' + esc(cam || 'Máy tìm bạn cùng hạng, chờ lâu sẽ mở rộng dần.') + '</p></div>';
  }
  // ⭐ 31/10 PHÒNG CHỜ kiểu FIFA (mẫu D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\phong-cho-v1, thầy duyệt): thẻ EM bên trái · ô đối thủ bên phải
  //   (trống → radar → thẻ trượt vào), dưới mỗi thẻ nút SẴN SÀNG (sáng khi bấm) · GIỮA: VS + TÌM TRẬN / Huỷ / vòng 30 giây / VÀO TRẬN + chat (CHUNG kho chat trận
  //   tranDau/{id}/chat — tin đi tiếp vào trận). 31/10 thầy chốt bản 2: chat ở giữa, bỏ câu soạn sẵn + mọi dòng hướng dẫn. S.pha: cho (chưa tìm) · tim · thay (đã ghép, trận 'cho') · vao · roi (bạn rời).
  //   Thẻ bạn đọc từ trận (theA/theB do máy chủ xhGhep chép — em không đọc được điểm của bạn).
  var PHAM = [[0, 'Bạn cùng hạng'], [15, 'Mở rộng sang bậc gần kề'], [30, 'Mở rộng sang hạng gần kề'], [60, 'Mở rộng mọi hạng · thắng bạn mạnh hơn được thêm điểm']];
  var PC_CHAN = { nhanh: 'Gửi chậm lại một chút nhé', link: 'Không gửi link trong chat', rong: '' };
  // bên "của mình" trong trận: em là người chơi ⇒ em · đang XEM phòng ⇒ bên chủ phòng
  function benToi() { var t = S.tran || {}, me = S.xemP || (S.toi && S.toi.uid); return t.a === me ? 'a' : 'b'; }
  function theBen(K) {
    var t = S.tran || {}, x = t['the' + K] || {};
    return { ten: t['ten' + K] || '?', anh: t['anh' + K] || '', lop: t['lop' + K] || '', h: XH.hien(t['h' + K]), diem: x.diem != null ? x.diem : null,
      tran: x.tran || 0, tl: x.tran ? Math.round(100 * (x.thang || 0) / x.tran) : 0, chuoi: x.chuoi || 0, ds: x.ds || [] };
  }
  // người xem: thẻ chủ phòng lúc chưa có trận — chỉ tên / lớp / hạng (phòng không mang số liệu trận)
  function theChu() { var p = S.phong || {}; return { ten: p.ten || '?', anh: p.anh || '', lop: p.lop || '', h: XH.hien(p.h), diem: null, an: true }; }
  function theToi() {
    if (S.pha === 'xem') return S.tran ? theBen(benToi().toUpperCase()) : theChu();
    var e = S.em || {}, h = hangEm() || { ma: 'an', bac: '', ten: 'Phân hạng ' + Math.min(5, (e.xl || 0) + 1) + '/5' };
    var t = S.tran, k = t ? benToi() : '', tl = e.tran ? Math.round(100 * (e.thang || 0) / e.tran) : 0;
    return { ten: S.toi.ten || 'Em', anh: S.toi.anh || '', lop: t ? t['lop' + k.toUpperCase()] : lopToi(), h: h, diem: hangEm() ? Math.round(e.diem || 0) : null,
      tran: e.tran || 0, tl: tl, chuoi: e.chuoi || 0, ds: (e.ds || []).slice(0, 5).map(function (r) { return r.kq === 'thang' ? 't' : r.kq === 'thua' ? 'b' : 'h'; }) };
  }
  function theBan() {
    var t = S.tran || {}, k = benToi() === 'a' ? 'B' : 'A', x = t['the' + k] || {};
    return { ten: t['ten' + k] || '?', anh: t['anh' + k] || '', lop: t['lop' + k] || '', h: XH.hien(t['h' + k]), diem: x.diem != null ? x.diem : null,
      tran: x.tran || 0, tl: x.tran ? Math.round(100 * (x.thang || 0) / x.tran) : 0, chuoi: x.chuoi || 0, ds: x.ds || [] };
  }
  function pcThe(p, ben, lop) {
    if (p.an) p = Object.assign({ ds: [] }, p);
    var pd = p.an ? '' : p.ds.length ? '<div class="pc-pd"><small>' + p.ds.length + ' trận</small>' + p.ds.map(function (k) { return '<span class="pc-kq ' + k + '">' + ({ t: 'T', b: 'B', h: 'H' })[k] + '</span>'; }).join('') + '</div>'
      : '<div class="pc-pd"><small>Chưa có trận nào</small></div>';
    return '<article class="pc-the ' + ben + (lop || '') + '">' +
      '<span class="pc-ai">' + (ben === 'l' ? (S.pha === 'xem' ? 'CHỦ PHÒNG' : 'EM') : 'ĐỐI THỦ') + '</span>' + XH.av(p.ten, p.anh) + '<div class="pc-ten">' + esc(p.ten) + '</div>' + (p.lop ? '<span class="pc-lop">Lớp ' + esc(p.lop) + '</span>' : '') +
      '<div class="pc-hang">' + XH.hhTag(p.h.ma, p.h.bac, 40) + '<div><b style="color:' + ((XH.HANG[p.h.ma] || {}).a || 'var(--xh-mo)') + '">' + esc(p.h.ten) + '</b>' +
      (p.diem != null ? '<small class="xh-so">' + p.diem + ' điểm</small>' : '') + '</div></div>' + pd +
      (p.an ? '' : '<div class="pc-so xh-so"><div><b>' + p.tran + '</b><small>trận</small></div><div><b>' + p.tl + '%</b><small>thắng</small></div><div><b>' + p.chuoi + ' ' + XH.bt('lua', 0, 'em') + '</b><small>chuỗi</small></div></div>') + '</article>';
  }
  // ô đối thủ khi chưa ghép: chỉ dấu ? (thầy: bỏ chữ) · đang tìm: radar + giờ + phạm vi
  function pcTrong() {
    var xem = S.pha === 'xem', moi = xem ? '' : '<button type="button" class="pc-moi" id="pcMoi">MỜI</button>';   // 31/10 thầy: mời bạn đang online cùng bậc trở lên
    if (xem && S.phong && S.phong.pha === 'tim') return '<article class="pc-the r pc-trong pc-dangtim"><div class="pc-radar"><i style="left:24%;top:30%"></i><i style="left:68%;top:22%;animation-delay:.5s"></i><i style="left:58%;top:70%;animation-delay:1s"></i></div><b>ĐANG TÌM…</b></article>';
    if (S.pha === 'tim') return '<article class="pc-the r pc-trong pc-dangtim"><div class="pc-radar"><i style="left:24%;top:30%"></i><i style="left:68%;top:22%;animation-delay:.5s"></i><i style="left:58%;top:70%;animation-delay:1s"></i></div>' +
      '<b>ĐANG TÌM…</b><span class="xh-so" id="pcGio">0:00</span><p id="pcPham"></p>' + moi + '</article>';
    return '<article class="pc-the r pc-trong"><div class="pc-bong">?</div>' + moi + '</article>';
  }
  // nút SẴN SÀNG dưới mỗi thẻ (thầy chốt): chưa bấm = tối · bấm = SÁNG — hai máy cùng thấy (đọc t.ss). Nút của bạn chỉ để nhìn.
  function pcNut(ben) {
    if (S.pha === 'xem') return pcNutXem(ben);
    var t = S.tran, p = S.pha, coBan = p === 'thay' || p === 'vao', k = ben === 'l' ? benToi() : (benToi() === 'a' ? 'b' : 'a');
    var ok = coBan && !!(t && t.ss && t.ss[k]);
    if (ben === 'l') return '<button type="button" class="pc-sn l' + (ok ? ' sang' : '') + '" id="pcSS"' + (!coBan || ok ? ' disabled' : '') + '>' + (ok ? '✓ ' : '') + 'SẴN SÀNG</button>';
    return '<div class="pc-sn r' + (ok ? ' sang' : '') + (coBan ? '' : ' tat') + '" aria-live="polite">' + (ok ? '✓ ' : '') + 'SẴN SÀNG</div>';
  }
  // người xem: nút dưới thẻ chỉ để nhìn · ô đối thủ TRỐNG + cùng HẠNG LỚN ⇒ nút THAM GIA (thầy chốt 31/10)
  function pcNutXem(ben) {
    var t = S.tran, coTran = !!(t && t.trangThai === 'cho'), k = ben === 'l' ? benToi() : (benToi() === 'a' ? 'b' : 'a');
    var ok = coTran && !!(t.ss && t.ss[k]);
    if (ben === 'r' && !S.tranId) {
      var dk = duocThamGia();
      return dk === true ? '<button type="button" class="pc-sn tg" id="pcThamGia">THAM GIA</button>' : '<div class="pc-sn r tat" title="' + esc(dk) + '">SẴN SÀNG</div>';
    }
    return '<div class="pc-sn ' + ben + (ok ? ' sang' : '') + (coTran ? '' : ' tat') + '">' + (ok ? '✓ ' : '') + 'SẴN SÀNG</div>';
  }
  function hangLonToi() { var h = hangEm(); return h ? h.ma : 'an'; }
  function duocThamGia() {
    var ph = S.phong;
    if (!ph || S.tranId || ['cho', 'tim'].indexOf(ph.pha) < 0) return 'Phòng đã có đối thủ';
    if (S.toi && S.toi.laThay) return 'Thầy chỉ xem';
    if (XH.hien(ph.h).ma !== hangLonToi()) return 'Chỉ bạn cùng hạng ' + XH.hien(ph.h).ten.split(' ')[0] + ' tham gia được';
    var cam = camTim(); return cam || true;
  }
  // ảnh người đang xem phòng — ở GIỮA (thầy chốt); ai bấm THAM GIA thì ảnh rời khỏi đây, chuyển vào ô chơi
  function pcXemDs() {
    var ds = S.phXem.filter(function (x) { return (x.luc || 0) > bay() - 25000; }); if (!ds.length) return '';
    return '<div class="pc-xemds" title="' + esc(ds.map(function (x) { return x.ten; }).join(', ')) + '">' + XH.bt('mat', 14) +
      '<span>' + ds.slice(0, 6).map(function (x) { return XH.av(x.ten, x.anh); }).join('') + (ds.length > 6 ? '<i>+' + (ds.length - 6) + '</i>' : '') + '</span></div>';
  }
  function pcGiua() { return pcGiuaChinh() + pcXemDs(); }
  function pcGiuaChinh() {
    var p = S.pha, cam = camTim(), d = '<div class="pc-vs">VS</div>';
    if (p === 'xem') {
      if (S.tran && S.tran.trangThai === 'cho') return d + '<div class="pc-dem" id="pcDem"><svg viewBox="0 0 112 112"><circle cx="56" cy="56" r="49" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="8"/>' +
        '<circle id="pcVong" cx="56" cy="56" r="49" fill="none" stroke="#3DF58A" stroke-width="8" stroke-linecap="round" stroke-dasharray="307.9" stroke-dashoffset="0" style="transition:stroke-dashoffset .5s linear"/></svg><b class="xh-so" id="pcSo">30</b></div>';
      return d + '<div class="pc-thay xem">' + (S.phong && S.phong.pha === 'tim' ? 'ĐANG TÌM ĐỐI THỦ…' : 'ĐANG CHỜ ĐỐI THỦ') + '</div>';
    }
    if (p === 'cho') return d + '<button class="pc-nut" id="pcTim"' + (cam ? ' disabled' : '') + '>' + (hangEm() ? 'TÌM TRẬN' : 'PHÂN HẠNG') +
      '<small>' + (S.M.phut || 2) + ' phút · mỗi bàn 3 từ</small></button>' + (cam ? '<p class="pc-cam">' + esc(cam) + '</p>' : '');
    if (p === 'tim') return d + '<button class="pc-nut phu" id="pcHuy">Huỷ tìm</button>';
    if (p === 'moi') return d + '<button class="pc-nut phu" id="pcHuyMoi">Huỷ lời mời</button>';
    if (p === 'vao') return d + '<div class="pc-dangvao">VÀO TRẬN</div>';
    if (p === 'roi') return d + '<div class="pc-thay do">ĐANG TÌM BẠN KHÁC…</div>';
    return d + (S.pcMoi ? '<div class="pc-thay">ĐÃ TÌM THẤY!</div>' : '') +
      '<div class="pc-dem" id="pcDem"><svg viewBox="0 0 112 112"><circle cx="56" cy="56" r="49" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="8"/>' +
      '<circle id="pcVong" cx="56" cy="56" r="49" fill="none" stroke="#3DF58A" stroke-width="8" stroke-linecap="round" stroke-dasharray="307.9" stroke-dashoffset="0" style="transition:stroke-dashoffset .5s linear"/></svg>' +
      '<b class="xh-so" id="pcSo">30</b></div>' + (S.tran && S.tran.xhKhongTinh ? '<span class="pc-ktinh">KHÔNG TÍNH ĐIỂM</span>' : '');   // trận mời thứ 3+ trong ngày
  }
  // chat GIỮA màn (thầy chốt) · không câu soạn sẵn · khoá tới khi ghép xong
  function pcChat() {
    var mo = S.pha !== 'vao', toi = S.toi && S.toi.uid;
    var phCh = S.phChat.filter(function (m) { return (m.luc || 0) >= S.phongTu - 5000; });
    var ds = '<li class="he">Chat được thầy lưu lại · nói lời hay nhé</li>' + S.pcChat.concat(phCh, S.pcGhi).sort(function (a, b) { return a.luc - b.luc; }).map(function (m) {
      if (m.he) return '<li class="he">' + esc(m.chu) + '</li>';
      var la = m.uid === toi;
      return '<li class="' + (la ? 'toi' : m.vai === 'xem' ? 'xem' : '') + '">' + (la ? '' : '<b>' + (m.vai === 'xem' ? XH.bt('mat', 12) + ' ' : '') + esc(m.vai === 'gv' ? 'Thầy Andrew' : m.ten || '?') + '</b>') + XH.doiEmoji(esc(m.chu), 16) + '</li>';
    }).join('');
    return '<div class="pc-chat' + (mo ? '' : ' khoa') + '"><header>CHAT</header><ol class="pc-ds" id="pcDs">' + ds + '</ol>' +
      '<form class="pc-go" id="pcGo"><input id="pcO" placeholder="Nhắn tin…" maxlength="120" autocomplete="off" aria-label="Nhắn cho đối thủ"' + (mo ? '' : ' disabled') + '><button aria-label="Gửi"' + (mo ? '' : ' disabled') + '>➤</button></form></div>';
  }
  function vePhong() {
    var o = $('#xhm-pc'); if (!o || !S.toi) return;
    var p = S.pha, coBan = p === 'thay' || p === 'vao' || p === 'roi' || (p === 'moi' && !!S.tran) || (p === 'xem' && !!S.tran);
    var phai = coBan ? pcThe(theBan(), 'r', (S.pcMoi ? ' vao' : '') + (p === 'roi' ? ' roi' : '') + (p === 'moi' ? ' chomoi' : '')) : pcTrong();
    if (p === 'moi') phai = (S.tran ? phai : '<article class="pc-the r chomoi"><div class="pc-bong">?</div></article>')
      .replace(/<\/article>$/, '<div class="pc-moicho">Đang chờ ' + esc((S.moiBan || {}).ten || 'bạn') + ' nhận lời<b class="xh-so" id="pcMoiCon"></b></div></article>');
    if (p === 'roi') phai = phai.replace(/<\/article>$/, '<div class="pc-roichu">' + esc(theBan().ten) + ' đã rời phòng</div></article>');
    var dang = $('#pcO') ? $('#pcO').value : '', moTay = document.activeElement && document.activeElement.id === 'pcO';
    o.innerHTML = '<div class="pc' + (p === 'xem' ? ' xem' : '') + '"><header class="pc-top"><button class="pc-ve" id="pcVe" type="button">' + (p === 'xem' ? '‹ Đang đấu' : S.pcXn ? 'Bấm lần nữa để rời phòng' : '‹ Sảnh') + '</button>' +
      '<span class="pc-tieu">' + (p === 'xem' ? 'ĐANG XEM PHÒNG CHỜ' : 'PHÒNG CHỜ · 1–1') + '</span>' + (XH.chuNhatNay(S.M, bay()) ? '<span class="pc-mua">' + XH.bt('set', 13) + ' Chủ nhật ×1,5</span>' : XH.gioVangNay(S.M, bay()) ? '<span class="pc-mua">' + XH.bt('set', 13) + ' Giờ vàng</span>' : '') + '</header>' +
      '<section class="pc-luoi"><div class="pc-ben l">' + pcThe(theToi(), 'l') + pcNut('l') + '</div>' +
      '<div class="pc-giua">' + pcGiua() + '</div>' +
      '<div class="pc-ben r">' + phai + pcNut('r') + '</div></section>' + pcChat() + '</div>';
    S.pcMoi = false; XH.veHH(o);   // vẽ huy hiệu hạng (vePhong chạy ngoài ve())
    var i = $('#pcO'); if (i) { i.value = dang; if (moTay && !i.disabled) i.focus(); }
    var d = $('#pcDs'); if (d) d.scrollTop = 1e6;
    capPhong(); baoPhong();
  }
  // nhịp 500 ms: giờ tìm · phạm vi · vòng 30 giây (không vẽ lại thẻ ⇒ giữ hiệu ứng)
  function capPhong() {
    if (S.pha === 'moi') {
      var het = (S.tran && S.tran.het) || (S.moiLuc + 60000), cm = Math.ceil((het - bay()) / 1000), mc = $('#pcMoiCon');
      if (mc) mc.textContent = Math.max(0, cm) + 's';
      if (cm < -4) { var tenB = (S.moiBan || {}).ten || 'Bạn'; huyMoi(); NW.toast(tenB + ' chưa nhận lời mời.'); }
    }
    if (S.pha === 'tim') {
      var s = Math.floor((bay() - S.timLuc) / 1000), k = 0; PHAM.forEach(function (x, j) { if (s >= x[0]) k = j; });
      var g = $('#pcGio'); if (g) g.textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
      var ph = $('#pcPham'); if (ph) ph.textContent = PHAM[k][1];
    }
    if ((S.pha === 'thay' || S.pha === 'xem') && S.tran && S.tran.trangThai === 'cho') {
      var con = Math.max(0, Math.ceil(((S.tran.hetSS || 0) - 2000 - bay()) / 1000)), so = $('#pcSo'), v = $('#pcVong');
      if (so) so.textContent = con;
      if (v) { v.style.strokeDashoffset = 307.9 * (1 - Math.min(30, con) / 30); v.setAttribute('stroke', con <= 10 ? '#FF5F6D' : '#3DF58A'); }
      var dm = $('#pcDem'); if (dm) dm.classList.toggle('gap', con <= 10);
    }
  }
  function veLive() {
    var ph = phongMo();
    $('#xhm-live').innerHTML = '<div class="xh-bxh-dau"><b>ĐANG ĐẤU</b><small>Hạng cao lên trước</small></div>' +
      (S.live.length || ph.length ? '<div class="xh-live">' + S.live.map(lvHtml).join('') + ph.map(phHtml).join('') + '</div>' : '<div class="xh-rong">Chưa có trận nào đang diễn ra.</div>');
  }
  // ⭐ 31/10 PHÒNG CHỜ trong "Đang đấu": phòng còn nhịp (30 giây), chưa vào trận, không phải phòng của em · hai phòng cùng một trận ⇒ hiện một
  function phongMo() {
    var toi = S.toi && S.toi.uid, da = {};
    return S.phongs.filter(function (x) {
      if (x.uid === toi || x.pha === 'vao' || (x.luc || 0) < bay() - 30000) return false;
      if (x.tran) { if (da[x.tran]) return false; da[x.tran] = 1; }
      return true;
    });
  }
  function phHtml(x) {
    var h = XH.hien(x.h), tt = x.tran ? 'ĐÃ CÓ ĐỐI THỦ' : x.pha === 'tim' ? 'ĐANG TÌM ĐỐI THỦ' : 'ĐANG CHỜ ĐỐI THỦ';
    return '<button class="xh-lv xh-ph" data-xemphong="' + esc(x.uid) + '"><div class="xh-h1 ph"><span class="xh-p">' + XH.av(x.ten, x.anh) + '<span>' + esc(x.ten) + '</span>' + XH.hhTag(h.ma, h.bac, 20) + '</span>' +
      '<span class="xh-phtt">' + tt + '</span></div><div class="xh-h2"><span class="xh-phnhan">PHÒNG CHỜ</span><span>' + esc(h.ten) + (x.lop ? ' · Lớp ' + esc(x.lop) : '') + '</span><span class="xh-vao">VÀO PHÒNG ›</span></div></button>';
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
    $('#xhm-bxh').innerHTML = '<div class="xh-bxh-dau"><b>TOP 20 TOÀN GIẢI</b><small>' + esc((S.M && S.M.ten) || '') + '</small></div>' + pod +
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
    var sao = ddSao(), moc = d.chuoi < 10 ? d.chuoi + '/10 ngày · +' + sao.d10 + XH.bt('sao', 13) : d.chuoi < 20 ? d.chuoi + '/20 ngày · +' + sao.d20 + XH.bt('sao', 13) : 'Giữ chuỗi tới hết mùa · +' + sao.du + XH.bt('sao', 13);
    return '<button class="xh-the xh-dd" data-dd type="button"><h3>ĐIỂM DANH <span>' + (d.homNay ? XH.bt('dung', 13) + ' hôm nay' : 'đấu 1 trận hôm nay') + '</span></h3>' +
      '<div class="xh-dd-lua"><b class="xh-so">' + XH.bt('lua', 22) + d.chuoi + '</b><small>ngày liên tiếp<br>Kỷ lục ' + d.max + ' · đạt ' + d.dat + '/' + d.tong + '</small></div>' +
      '<div class="xh-dd-bay">' + dai + '</div><div class="xh-dd-moc"><u style="width:' + Math.min(100, Math.round(100 * d.chuoi / (d.chuoi < 10 ? 10 : d.chuoi < 20 ? 20 : d.tong))) + '%"></u><span>' + moc + '</span></div></button>';
  }
  // tab Thưởng: 3 mốc điểm danh (nhận mốc cao nhất khi hết mùa)
  function theDdThuong() {
    var d = ddTinh(), sao = ddSao();
    return '<div class="xh-the"><h3>ĐIỂM DANH <span style="letter-spacing:0;font-weight:600">mỗi ngày đấu ≥ 1 trận · hết mùa nhận mốc cao nhất</span></h3><div class="xh-dd-3">' +
      '<div' + (d.max >= 10 ? ' class="xong"' : '') + '><b>10</b><small>ngày liên tiếp</small><u>+' + sao.d10 + XH.bt('sao', 13) + '</u></div>' +
      '<div' + (d.max >= 20 ? ' class="xong"' : '') + '><b>20</b><small>ngày liên tiếp</small><u>+' + sao.d20 + XH.bt('sao', 13) + '</u></div>' +
      '<div' + (d.dat >= d.tong ? ' class="xong"' : '') + '><b>' + d.tong + '</b><small>cả mùa</small><u>+' + sao.du + XH.bt('sao', 13) + '</u></div></div></div>';
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
      '<p class="xh-so">' + XH.bt('lua', 16) + ' <b>' + d.chuoi + '</b> ngày liên tiếp · kỷ lục <b>' + d.max + '</b> · đạt <b>' + d.dat + '/' + d.tong + '</b></p>' +
      '<div class="xh-lich">' + h + '</div>' +
      '<div class="xh-dd-3"><div' + (d.max >= 10 ? ' class="xong"' : '') + '><b>10</b><small>ngày liên tiếp</small><u>+' + sao.d10 + XH.bt('sao', 13) + '</u></div>' +
      '<div' + (d.max >= 20 ? ' class="xong"' : '') + '><b>20</b><small>ngày liên tiếp</small><u>+' + sao.d20 + XH.bt('sao', 13) + '</u></div>' +
      '<div' + (d.dat >= d.tong ? ' class="xong"' : '') + '><b>' + d.tong + '</b><small>cả mùa</small><u>+' + sao.du + XH.bt('sao', 13) + '</u></div></div>' +
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
        return '<div class="xh-tg' + (x[0] === cao ? ' dat' : '') + '">' + XH.hhTag(x[0], '', 50) + '<b>' + x[1] + '</b><small class="xh-dk">' + esc(dk[x[0]]) + '</small><span class="xh-sao">+' + (sao[x[0]] || 0) + ' ' + XH.bt('sao', 14) + '</span>' + (x[0] === cao ? '<small>EM ĐANG Ở ĐÂY</small>' : '') + '</div>';
      }).join('') + '</div>' + theDdThuong() +
      '<div class="xh-the"><ul class="xh-luat"><li><span>' + XH.bt('cup', 20) + '</span><span><b>Bạch kim → Huyền thoại</b> tính theo <b>thứ hạng lúc hết mùa</b>: phải giữ phong độ tới phút cuối. Suất không ai đủ điểm thì bỏ trống.</span></li>' +
      '<li><span>' + XH.bt('huy', 20) + '</span><span><b>Đồng · Bạc · Vàng</b> tính theo điểm <b>cao nhất</b> em từng đạt. Ngoài top ' + vt.tong + ' thì tối đa là Vàng.</span></li>' +
      '<li><span>' + XH.bt('sao', 20) + '</span><span>Sao vào <b>ví sao</b> khi thầy chốt mùa.</span></li>' +
      '<li><span>' + XH.bt('co', 20) + '</span><span>Mùa kết thúc lúc <b>' + (S.M ? XH.ngayGio(S.M.den) : '—') + '</b>.</span></li>' +
      '<li><span>↘</span><span>Mùa mới: đấu lại <b>5 trận phân hạng</b>.</span></li></ul></div>';
  }
  function veLuat() {
    var g = S.M && S.M.gioVang, dk = dieuKien(S.M);
    var HB = [['ht', dk.ht, 'B2–C1', 'Top đầu toàn giải'], ['ct', dk.ct, 'B2', 'Suất · không chia bậc'], ['kc', dk.kc, 'B1–B2', 'Suất · không chia bậc'],
      ['bk', dk.bk, 'B1', 'Suất · không chia bậc'], ['vang', '800', 'A2', 'III · II · I · mốc an toàn'], ['bac', '300', 'A1–A2', 'III · II · I · thua mất ít'], ['dong', '0', 'A1', 'III · II · I · thua không mất điểm']];
    $('#xhm-luat').innerHTML = '<div class="xh-hang-luoi"><div class="xh-hb">' + HB.map(function (x) {
      return '<div class="xh-hbd">' + XH.hhTag(x[0], '', 36) + '<h4 style="color:' + XH.HANG[x[0]].a + '">' + XH.HANG[x[0]].ten + '</h4><span class="xh-moc xh-so">' + x[1] + '<span class="xh-cefr">' + x[2] + '</span></span><p>' + x[3] + '</p></div>';
    // 27/10 thầy: chữ chung chung, KHÔNG ghi số điểm từng trận (công thức điểm đổi ngầm — máy chủ xep-hang.js chuanThang/diemTran)
    }).join('') + '</div><div class="xh-c2"><div class="xh-diem4 xh-so"><div><b style="color:var(--xh-neon)">▲</b><small>Thắng</small></div><div><b>＝</b><small>Hòa</small></div>' +
      '<div><b style="color:var(--xh-do)">▼</b><small>Thua</small></div><div><b>' + XH.bt('sai', 18) + '</b><small>Bỏ trận</small></div></div>' +
      '<div class="xh-the"><ul class="xh-luat"><li><span>' + XH.bt('tay', 20) + '</span><span>Thắng bạn <b>mạnh hơn</b> được nhiều điểm hơn · thắng bạn yếu hơn được ít.</span></li>' +
      '<li><span>' + XH.bt('tay', 20) + '</span><span>Thua bạn <b>hạng cao hơn</b>: không bị trừ điểm. Điểm trận đạt <b>70%</b> điểm bạn trở lên thì còn <b>được cộng điểm</b> (tối đa 3 lần mỗi ngày).</span></li>' +
      '<li><span>' + XH.bt('lua', 20) + '</span><span>Chuỗi <b>3 trận thắng</b> trở lên: được thêm điểm.</span></li>' +
      (g && g.nhan > 1 ? '<li><span>' + XH.bt('set', 20) + '</span><span>Giờ vàng <b>' + XH.phutChu(g.tu) + '–' + XH.phutChu(g.den) + '</b>: điểm cộng ×' + String(g.nhan).replace('.', ',') + '.</span></li>' : '') +
      (S.M && (S.M.gioVang || {}).cn !== false ? '<li><span>' + XH.bt('set', 20) + '</span><span><b>Chủ nhật cả ngày</b>: điểm cộng ×1,5.</span></li>' : '') +
      '<li><span>' + XH.bt('giam', 20) + '</span><span>Điểm càng cao, thắng được càng ít · thua không bao giờ mất nhiều hơn điểm thắng.</span></li>' +
      '<li><span>' + XH.bt('khien', 20) + '</span><span>Mỗi lần vượt một <b>mốc 100 điểm</b> (300, 400, 500, 600…): <b>3 trận thua</b> tiếp theo không tụt dưới mốc đó. Mỗi trận thua dùng một lượt khiên.</span></li>' +
      '<li><span>' + XH.bt('moc', 20) + '</span><span>Đã lên <b>Vàng</b> (800) thì không rớt dưới 800 trong mùa.</span></li>' +
      '<li><span>' + XH.bt('gio', 20) + '</span><span>Mỗi bàn <b>3 từ</b> · đủ 3 từ hoặc hết <b>20 giây</b> là sang bàn mới. Bàn <b>gợi ý tiếng Anh</b> (từ 1100 điểm): <b>30 giây</b> một bàn, trận <b>3 phút</b>.</span></li>' +
      '<li><span>' + XH.bt('chu', 20) + '</span><span>Từ <b>1100 điểm</b>: gợi ý bằng <b>tiếng Anh</b>, càng lên cao câu càng dài, càng phải suy luận.</span></li>' +
      '<li><span>' + XH.bt('cua', 20) + '</span><span>Thoát giữa trận / mất kết nối = <b>bỏ trận: −25 điểm</b> (kể cả hạng Đồng, khiên không che), khoá tìm trận 2 phút.</span></li>' +
      dongDem() + '</ul></div></div></div>';
  }
  // giờ nghỉ đêm đọc cài đặt thật (caiDat/choiGame qua GioiHan) — thầy đổi ở trang Giải đấu thì dòng này tự theo
  function dongDem() {
    var G = window.GioiHan, c = G && G.cai;
    if (!c || !c.bat) return '';
    return '<li><span>' + XH.bt('trang', 20) + '</span><span>Nghỉ đêm ' + G.gioChu(c.nghiTu) + '–' + G.gioChu(c.nghiDen) + ' không tìm trận.</span></li>';
  }
  app.addEventListener('click', function (e) {
    var t = e.target.closest('[data-t]'); if (t && !t.closest('#xhTabs')) return moTab(t.dataset.t);
    if (e.target.closest('[data-dd]')) return moLich();
    var x = e.target.closest('[data-xem]'); if (x) { location.href = NW.duong ? NW.duong('xhtran.html?id=' + encodeURIComponent(x.dataset.xem)) : 'xhtran.html?id=' + encodeURIComponent(x.dataset.xem); return; }
    if (e.target.closest('#xhTim')) return moPhong();
    if (e.target.closest('#pcTim')) return batDauTim();
    if (e.target.closest('#pcHuy')) return huyTim();
    if (e.target.closest('#pcSS')) return sanSang();
    if (e.target.closest('#pcVe')) return roiPhong();
    if (e.target.closest('#pcMoi')) return moHopMoi();
    if (e.target.closest('#pcThamGia')) return thamGia();
    var xp = e.target.closest('[data-xemphong]'); if (xp) return xemPhong(xp.dataset.xemphong);
    if (e.target.closest('#pcHuyMoi')) return huyMoi();
    var hm = e.target.closest('[data-hm]'); if (hm) return hm.dataset.hm === 'tai' ? taiDsMoi() : dongHopMoi();
    var mb = e.target.closest('[data-moi]'); if (mb) return guiMoi(mb.dataset.moi);
    if (e.target.id === 'pcHopMoi') return dongHopMoi();
  });

  app.addEventListener('submit', function (e) {
    if (e.target.id !== 'pcGo') return; e.preventDefault();
    var o = $('#pcO'); guiChatPc(o.value); o.value = '';
  });

  // ---------- PHÒNG CHỜ + TÌM TRẬN ----------
  function moPhong(tim) {
    S.bao = '';
    if (S.toi && S.toi.laThay) return moTab('live');
    S.pha = 'cho'; S.pcXn = false; S.tran = null; S.tranId = ''; S.pcChat = []; S.pcGhi = []; S.xemP = '';
    hienMan('pc'); phongBat();
    if (tim && !camTim()) batDauTim();
  }
  async function batDauTim() {
    var cam = camTim(); if (cam) return vePhong();
    if (window.TdQuan && !S.thu) { var ok = await TdQuan.cho('xh', { uid: S.toi.uid, lop: lopToi() }); if (!ok) return; }
    S.timLuc = bay(); S.daSS = false; S.tranId = ''; S.tran = null; S.pcChat = []; S.pcGhi = [];
    S.pha = 'tim'; vePhong();
    if (S.thu) { S.thuHen = setTimeout(function () { thuThay(); }, 6000); return; }
    var f = S.f, ref = f.fs.doc(f.db, 'xhHang', S.toi.uid);
    try {
      try { await f.fs.deleteDoc(ref); } catch (e) { /* chưa có phiếu */ }
      await f.fs.setDoc(ref, { mua: S.mua, vao: f.fs.serverTimestamp(), nhip: f.fs.serverTimestamp() });
    } catch (e) { console.warn('[xh] vào hàng chờ', e); S.bao = 'Chưa vào được hàng chờ — kiểm tra mạng rồi thử lại.'; S.pha = 'cho'; return moTab('sanh'); }
    batNhip();
  }
  // nhịp phiếu hàng chờ cả lúc ĐANG TÌM lẫn lúc ĐÃ GHÉP (phòng chờ): quá 30 giây máy chủ (kiemSS) mới biết để huỷ trận / phạt
  //   (trận MỜI: máy chủ tạo phiếu mang `tran` lúc bạn Nhận ⇒ hai máy bật nhịp từ đó)
  function batNhip() {
    var f = S.f, ref = f.fs.doc(f.db, 'xhHang', S.toi.uid);
    clearInterval(S.nhipIv); S.nhipBat = true;
    S.nhipIv = setInterval(function () {
      if (S.man !== 'pc' || (S.pha !== 'tim' && S.pha !== 'thay')) return;
      f.fs.updateDoc(ref, { nhip: f.fs.serverTimestamp() }).catch(function () { });
    }, 5000);
    ngheHang();
  }
  function ngheHang() {
    var f = S.f; if (S.ngheHang) S.ngheHang();
    S.ngheHang = f.fs.onSnapshot(f.fs.doc(f.db, 'xhHang', S.toi.uid), function (s) {
      if (S.man !== 'pc' || (S.pha !== 'tim' && S.pha !== 'thay' && S.pha !== 'roi' && S.pha !== 'cho')) return;
      if (S.pha === 'cho') { var y = s.exists() ? s.data() : null; if (y && y.tran && y.tran !== S.tranId) ngheTran(y.tran); return; }   // 31/10 có bạn THAM GIA phòng em
      if (!s.exists()) {   // máy chủ xoá phiếu: em chưa bấm Sẵn sàng (bị khoá) — hoặc trận đã vào
        if (S.tran && ['nhan', 'choi'].indexOf(S.tran.trangThai) >= 0) return;
        if (S.pha === 'thay' && !S.daSS) { dungTim(); S.bao = 'Em chưa bấm Sẵn sàng nên bị khoá tìm trận một lúc.'; napEm(); return moTab('sanh'); }
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
      if (!x.tran && S.pha === 'thay') banRoi();   // đối thủ rời phòng / không sẵn sàng ⇒ tìm tiếp
    });
  }
  // đối thủ rời / không sẵn sàng: thẻ mờ 1,5 giây ⇒ về ĐANG TÌM (phiếu hàng chờ vẫn giữ — ưu tiên giờ vào cũ)
  function banRoi() {
    if (S.pha !== 'thay') return;
    S.pha = 'roi'; vePhong();
    if (S.ngheTran) { S.ngheTran(); S.ngheTran = null; }
    if (S.ngheChat) { S.ngheChat(); S.ngheChat = null; }
    clearTimeout(S.roiHen);
    S.roiHen = setTimeout(function () {
      if (S.pha !== 'roi') return;
      S.tran = null; S.tranId = ''; S.daSS = false; S.pcChat = []; S.pcGhi = []; S.pha = 'tim'; vePhong();
      if (S.thu) S.thuHen = setTimeout(function () { thuThay(); }, 6000);
    }, 1500);
  }
  function ngheTran(id) {
    var f = S.f; S.tranId = id; S.daSS = false; if (S.ngheTran) S.ngheTran();
    S.ngheTran = f.fs.onSnapshot(f.fs.doc(f.db, 'tranDau', id), function (s) {
      if (!s.exists() || S.tranId !== id) return;
      var t = s.data(); S.tran = t;
      if (t.trangThai === 'cho') {
        if (S.pha !== 'thay') {
          S.pha = 'thay'; S.pcMoi = true; S.pcChat = []; S.pcGhi = []; ngheChat(id);
          if (!S.nhipBat && !S.thu) batNhip();   // vào từ lời mời / tham gia (không qua hàng chờ)
          try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch (e) { }
        }
        vePhong();
      } else if (S.pha === 'moi' && t.trangThai === 'moi') {
        vePhong();
      } else if (S.pha === 'moi' && ['tuchoi', 'huy', 'het'].indexOf(t.trangThai) >= 0) {
        var tb = (S.moiBan || {}).ten || 'Bạn';
        huyMoi(true); NW.toast(t.trangThai === 'tuchoi' ? tb + ' đã từ chối lời mời.' : tb + ' chưa nhận lời mời.');
      } else if (t.trangThai === 'nhan' || t.trangThai === 'choi') {
        vaoTran('xhtran.html?id=' + encodeURIComponent(id));
      } else if (t.trangThai === 'het') {
        if (S.pha === 'thay' && (t.roi !== S.toi.uid) && (t.ly === 'roi' || S.daSS)) banRoi();
      } else if (t.trangThai === 'han') {
        dungTim(); S.bao = 'Đã tới giờ nghỉ đêm — trận không bắt đầu.'; moTab('sanh');
      }
    });
  }
  function vaoTran(url) {
    if (S.pha === 'vao') return;
    dungTim(true); S.pha = 'vao'; vePhong(); clearInterval(S.phongIv);   // phòng mang tran + pha vao ⇒ người xem theo; tdQuet dọn sau
    setTimeout(function () { location.href = url; }, 800);
  }
  // chat phòng chờ = chat trận (tranDau/{id}/chatGui ⇒ hàm xhChat lọc ⇒ chat)
  function ngheChat(id) {
    if (S.thu) return;
    var f = S.f; if (S.ngheChat) S.ngheChat();
    S.ngheChat = f.fs.onSnapshot(f.fs.collection(f.db, 'tranDau', id, 'chat'), function (snap) {
      var ds = []; snap.forEach(function (d) { ds.push(d.data()); });
      S.pcChat = ds; if (S.man === 'pc') veChatPc();
    }, function () { });
  }
  function veChatPc() {
    var d = $('#pcDs'); if (!d) return vePhong();
    var o = document.createElement('div'); o.innerHTML = pcChat();
    d.innerHTML = o.querySelector('#pcDs').innerHTML; d.scrollTop = 1e6;
  }
  function guiChatPc(chu) {
    chu = String(chu || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!chu || S.pha === 'vao') return;
    if (S.thu) { S.phChat.push({ uid: S.toi.uid, chu: chu, luc: bay() }); return veChatPc(); }
    var f = S.f, coTran = S.tranId && S.tran && S.tran.trangThai === 'cho' && (S.pha === 'thay' || S.pha === 'xem');
    // chưa có trận ⇒ chat PHÒNG (xhPhong/{chủ}/chatGui, hàm xhPhongChat lọc) · có trận ⇒ chat trận (đi tiếp vào trận)
    f.fs.addDoc(coTran ? f.fs.collection(f.db, 'tranDau', S.tranId, 'chatGui') : f.fs.collection(f.db, 'xhPhong', S.xemP || S.toi.uid, 'chatGui'), { uid: S.toi.uid, chu: chu, luc: f.fs.serverTimestamp() }).then(function (r) {
      var huy = f.fs.onSnapshot(r, function (s) {
        var x = s.exists() ? s.data() : null; if (!x || (!x.ok && !x.chan)) return;
        huy();
        if (x.chan && PC_CHAN[x.ly]) { S.pcGhi.push({ he: 1, chu: PC_CHAN[x.ly], luc: bay() }); veChatPc(); }
      });
    }).catch(function (e) { console.warn('[xh] chat phòng chờ', e); });
  }
  async function sanSang() {
    var t = S.tran; if (!t || S.daSS || S.pha !== 'thay') return;
    var ben = benToi(), o = {}; o['ss.' + ben] = true;
    S.daSS = true; t.ss = Object.assign({}, t.ss); t.ss[ben] = true; vePhong();
    if (S.thu) { if (t.ss.a && t.ss.b) vaoTran('xhtran.html?thu=1'); return; }
    try { await S.f.fs.updateDoc(S.f.fs.doc(S.f.db, 'tranDau', S.tranId), o); }
    catch (e) { console.warn('[xh] sẵn sàng', e); S.daSS = false; t.ss[ben] = false; vePhong(); }
  }
  function dungTim(giuPhieu) {
    clearInterval(S.nhipIv); S.nhipBat = false; clearTimeout(S.thuHen); clearTimeout(S.roiHen);
    if (S.ngheHang) { S.ngheHang(); S.ngheHang = null; }
    if (S.ngheTran) { S.ngheTran(); S.ngheTran = null; }
    if (S.ngheChat) { S.ngheChat(); S.ngheChat = null; }
    if (!giuPhieu && S.f && S.toi && !S.thu) S.f.fs.deleteDoc(S.f.fs.doc(S.f.db, 'xhHang', S.toi.uid)).catch(function () { });
  }
  function huyTim() { dungTim(); S.pha = 'cho'; S.tran = null; S.tranId = ''; vePhong(); }

  // ---------- ⭐ 31/10 PHÒNG CHỜ CÔNG KHAI (thầy chốt): phòng hiện ở "Đang đấu" · người xem vào xem + chat · cùng HẠNG LỚN ⇒ THAM GIA ----------
  //   xhPhong/{uid} (chủ phòng ghi, nhịp 10 giây, luật tools/dang-luat-phong-cho.js) · /xem/{uid} người xem · /chat (hàm xhPhongChat lọc).
  //   Có trận (ghép / mời / tham gia) ⇒ phòng mang `tran` ⇒ người xem thấy hai thẻ + nút sẵn sàng + chat trận; trận bắt đầu ⇒ người xem theo vào xhtran.
  function phongBat() {
    S.phongTu = bay(); S.phChat = []; S.phXem = []; S.phongKhoa = '';
    if (S.thu) { S.phXem = thuNguoiXem(); return; }
    if (!S.f || !S.toi || S.toi.laThay) return;
    var f = S.f, me = S.toi.uid;
    clearInterval(S.phongIv); S.phongIv = setInterval(function () { baoPhong(true); }, 10000);
    huyNghePhong();
    S.nghePh = [f.fs.onSnapshot(f.fs.collection(f.db, 'xhPhong', me, 'xem'), function (q) { var ds = []; q.forEach(function (d) { ds.push(d.data()); }); S.phXem = ds; if (S.man === 'pc') vePhong(); }, function () { }),
      f.fs.onSnapshot(f.fs.collection(f.db, 'xhPhong', me, 'chat'), function (q) { var ds = []; q.forEach(function (d) { ds.push(d.data()); }); S.phChat = ds; if (S.man === 'pc') veChatPc(); }, function () { })];
    baoPhong(true);
  }
  function huyNghePhong() { (S.nghePh || []).forEach(function (h) { try { h(); } catch (e) { } }); S.nghePh = []; }
  // ghi phòng khi trạng thái đổi (gọi mỗi lần vẽ) hoặc nhịp 10 giây (ep)
  function baoPhong(ep) {
    if (S.thu || !S.f || !S.toi || S.toi.laThay || S.man !== 'pc' || S.pha === 'xem' || !S.phongTu) return;
    if (S.pha === 'cho' && !S.ngheHang) ngheHang();   // chủ phòng chờ (không tìm) vẫn nghe phiếu: bạn THAM GIA ⇒ máy chủ ghi phiếu mang trận
    var tran = (S.pha === 'thay' || S.pha === 'vao') ? S.tranId || '' : '', khoa = S.pha + '|' + tran;
    if (!ep && khoa === S.phongKhoa) return;
    S.phongKhoa = khoa;
    var h = hangEm(), f = S.f;
    f.fs.setDoc(f.fs.doc(f.db, 'xhPhong', S.toi.uid), { mua: String(S.mua || '').slice(0, 40), ten: String(S.toi.ten || '').slice(0, 60), anh: String(S.toi.anh || '').slice(0, 600),
      lop: String(lopToi()).slice(0, 40), h: (h ? h.ma + ':' + (h.bac || '') : 'xl:' + Math.min(5, ((S.em && S.em.xl) || 0) + 1)).slice(0, 12), pha: S.pha, tran: tran, luc: f.fs.serverTimestamp() })
      .catch(function (e) { console.warn('[xh] báo phòng', e); });
  }
  function phongTat() {
    clearInterval(S.phongIv); huyNghePhong(); S.phongTu = 0; S.phongKhoa = '';
    if (!S.thu && S.f && S.toi && !S.toi.laThay) S.f.fs.deleteDoc(S.f.fs.doc(S.f.db, 'xhPhong', S.toi.uid)).catch(function () { });
  }
  // ----- người xem -----
  function xemPhong(uid) {
    if (!uid || (S.toi && uid === S.toi.uid)) return;
    if (S.man === 'pc' && S.pha === 'xem') roiXem();
    S.xemP = uid; S.phong = null; S.tran = null; S.tranId = ''; S.pcChat = []; S.pcGhi = []; S.phChat = []; S.phXem = []; S.phongTu = bay() - 3600e3;   // người xem thấy cả chat trước khi vào
    S.pha = 'xem'; hienMan('pc');
    if (S.thu) { thuXemPhong(uid); return vePhong(); }
    var f = S.f, me = S.toi.uid, xRef = f.fs.doc(f.db, 'xhPhong', uid, 'xem', me);
    var ghiXem = function () { f.fs.setDoc(xRef, { ten: S.toi.laThay ? 'Thầy Andrew' : String(S.toi.ten || '').slice(0, 60), anh: String(S.toi.anh || '').slice(0, 600), luc: f.fs.serverTimestamp() }).catch(function () { }); };
    ghiXem(); clearInterval(S.xemIv); S.xemIv = setInterval(ghiXem, 10000);
    huyNghePhong();
    S.nghePh = [
      f.fs.onSnapshot(f.fs.doc(f.db, 'xhPhong', uid), function (d) {
        if (S.xemP !== uid) return;
        if (!d.exists()) { if (S.tranId) return; NW.toast('Phòng chờ đã đóng.'); return moTab('live'); }
        S.phong = d.data();
        if (S.phong.tran && S.phong.tran !== S.tranId) ngheTranXem(S.phong.tran);
        if (!S.phong.tran && S.tranId) { if (S.ngheTran) { S.ngheTran(); S.ngheTran = null; } if (S.ngheChat) { S.ngheChat(); S.ngheChat = null; } S.tranId = ''; S.tran = null; S.pcChat = []; }
        vePhong();
      }, function () { NW.toast('Không mở được phòng chờ.', true); moTab('live'); }),
      f.fs.onSnapshot(f.fs.collection(f.db, 'xhPhong', uid, 'xem'), function (q) { var ds = []; q.forEach(function (x) { ds.push(x.data()); }); S.phXem = ds; if (S.man === 'pc') vePhong(); }, function () { }),
      f.fs.onSnapshot(f.fs.collection(f.db, 'xhPhong', uid, 'chat'), function (q) { var ds = []; q.forEach(function (x) { ds.push(x.data()); }); S.phChat = ds; if (S.man === 'pc') veChatPc(); }, function () { })];
  }
  function ngheTranXem(id) {
    var f = S.f; S.tranId = id; if (S.ngheTran) S.ngheTran();
    S.ngheTran = f.fs.onSnapshot(f.fs.doc(f.db, 'tranDau', id), function (s) {
      if (!s.exists() || S.tranId !== id || S.pha !== 'xem') return;
      var t = s.data(); S.tran = t;
      if (t.trangThai === 'nhan' || t.trangThai === 'choi') { roiXem(); S.pha = 'vao'; vePhong(); setTimeout(function () { location.href = 'xhtran.html?id=' + encodeURIComponent(id); }, 600); return; }   // trận bắt đầu ⇒ người xem theo vào
      vePhong();
    });
    ngheChat(id);
  }
  function roiXem() {
    var uid = S.xemP; clearInterval(S.xemIv); huyNghePhong();
    if (S.ngheTran) { S.ngheTran(); S.ngheTran = null; }
    if (S.ngheChat) { S.ngheChat(); S.ngheChat = null; }
    if (!S.thu && uid && S.f && S.toi) S.f.fs.deleteDoc(S.f.fs.doc(S.f.db, 'xhPhong', uid, 'xem', S.toi.uid)).catch(function () { });
    S.xemP = ''; S.phong = null; S.tran = null; S.tranId = ''; S.phXem = []; S.phChat = []; S.pcChat = [];
    if (S.pha === 'xem') S.pha = 'cho';
  }
  var LOI_VAO = { phong: 'Phòng không còn chờ nữa.', coNguoi: 'Đã có bạn vào trước rồi.', hang: 'Chỉ bạn cùng hạng tham gia được.', khoa: 'Em đang bị khoá tìm trận một lúc.',
    emBan: 'Em đang ở trận khác.', dem: 'Đang giờ nghỉ đêm — mai đấu nhé!', dong: 'Mùa xếp hạng đang đóng.', ban: 'Không tham gia được.' };
  async function thamGia() {
    var uid = S.xemP, dk = duocThamGia(); if (!uid) return;
    if (dk !== true) return NW.toast(dk, true);
    if (window.TdQuan && !S.thu && !(await TdQuan.cho('xh', { uid: S.toi.uid, lop: lopToi() }))) return;
    if (S.thu) { var ph = S.phong; roiXem(); moPhong(); S.moiBan = { uid: uid, ten: ph.ten, lop: ph.lop, h: ph.h, diem: 1000 }; thuThay(); return; }
    var b = $('#pcThamGia'); if (b) { b.disabled = true; b.textContent = 'ĐANG VÀO…'; }
    try {
      var r = await NW.goiHam('xhMoi', { loai: 'vao', phong: uid });
      if (r.loi || !r.id) { NW.toast(LOI_VAO[r.loi] || 'Chưa tham gia được.', true); return vePhong(); }
      roiXem(); moPhong(); ngheTran(r.id);   // thành người chơi: ảnh em rời khỏi hàng người xem, vào ô đối thủ
    } catch (e) { NW.toast(NW.chuLoiKho(e), true); vePhong(); }
  }

  // ---------- ⭐ 31/10 MỜI ĐẤU (thầy chốt): nút MỜI trong ô đối thủ ⇒ hộp bạn ĐANG ONLINE (mọi trang) cùng BẬC trở lên ⇒ MỜI ⇒ chờ 60 giây ----------
  //   Máy chủ: hàm xhMoi (xep-hang.js) — ds / moi / traloi / huy. Trận mời tính điểm, tối đa 2 trận/ngày mỗi cặp (thứ 3 trở đi xhKhongTinh).
  //   Bạn nhận lời (thẻ mời ở mọi trang — nw/js/thachdau.js) ⇒ xephang.html?phong=<id> ⇒ hai em vào phòng chờ như trận ghép.
  var LOI_MOI = { dong: 'Mùa xếp hạng đang đóng.', dem: 'Đang giờ nghỉ đêm — mai đấu nhé!', khoa: 'Em đang bị khoá tìm trận một lúc.', offline: 'Bạn vừa rời mạng.',
    bac: 'Chỉ mời được bạn cùng bậc trở lên.', banBan: 'Bạn đang ở trận khác.', emBan: 'Em đang ở trận khác.', ban: 'Không mời được bạn này.', mang: 'Chưa tải được — kiểm tra mạng rồi thử lại.' };
  function moHopMoi() { S.hopMoi = { tai: true, ds: [] }; veHopMoi(); taiDsMoi(); }
  async function taiDsMoi() {
    if (!S.hopMoi) return;
    S.hopMoi.tai = true; veHopMoi();
    var x;
    try { x = S.thu ? thuDsMoi() : await NW.goiHam('xhMoi', { loai: 'ds' }); } catch (e) { x = { loi: 'mang' }; }
    if (!S.hopMoi) return;
    S.hopMoi = { tai: false, ds: (x && x.ds) || [], loi: (x && x.loi) || '' }; veHopMoi();
  }
  function dongHopMoi() { S.hopMoi = null; var h = $('#pcHopMoi'); if (h) h.remove(); }
  function veHopMoi() {
    var h = $('#pcHopMoi'); if (!S.hopMoi) { if (h) h.remove(); return; }
    if (!h) { h = document.createElement('div'); h.id = 'pcHopMoi'; h.className = 'pc-hopmoi'; app.appendChild(h); }
    var x = S.hopMoi, ds = x.ds;
    var than = x.tai ? '<p class="pc-hmghi">Đang tìm bạn online…</p>' : x.loi ? '<p class="pc-hmghi">' + esc(LOI_MOI[x.loi] || 'Chưa tải được danh sách.') + '</p>'
      : !ds.length ? '<p class="pc-hmghi">Chưa có bạn cùng bậc trở lên đang online.</p>'
      : ds.map(function (b) {
        var hh = XH.hien(b.h);
        return '<div class="pc-hmd' + (b.dangDau ? ' ban' : '') + '">' + XH.av(b.ten, b.anh) + '<div class="pc-hmten"><b>' + esc(b.ten) + '</b><small>' + (b.lop ? 'Lớp ' + esc(b.lop) : '') + '</small></div>' +
          '<div class="pc-hmh">' + XH.hhTag(hh.ma, hh.bac, 28) + '<div><b style="color:' + ((XH.HANG[hh.ma] || {}).a || 'var(--xh-mo)') + '">' + esc(hh.ten) + '</b>' + (b.diem != null ? '<small class="xh-so">' + b.diem + ' điểm</small>' : '') + '</div></div>' +
          (b.dangDau ? '<span class="pc-hmdd">Đang đấu</span>' : '<button type="button" class="pc-hmmoi" data-moi="' + esc(b.uid) + '">MỜI</button>') + '</div>';
      }).join('');
    h.innerHTML = '<div class="pc-hm" role="dialog" aria-label="Mời đấu"><header><b>MỜI ĐẤU</b><span class="pc-hmon"><i></i>Đang online</span>' +
      '<button type="button" data-hm="tai" aria-label="Tải lại">↻</button><button type="button" data-hm="dong" aria-label="Đóng">✕</button></header><div class="pc-hmds">' + than + '</div></div>';
    XH.veHH(h);
  }
  async function guiMoi(uid) {
    var b = ((S.hopMoi && S.hopMoi.ds) || []).filter(function (x) { return x.uid === uid; })[0]; if (!b) return;
    dongHopMoi();
    if (S.pha === 'tim') dungTim();
    S.pha = 'moi'; S.moiBan = b; S.moiLuc = bay(); S.tran = null; S.tranId = ''; vePhong();
    if (S.thu) { thuMoi(b); return; }
    try {
      var r = await NW.goiHam('xhMoi', { loai: 'moi', ban: uid });
      if (S.pha !== 'moi') return;
      if (r.loi || !r.id) { S.pha = 'cho'; S.moiBan = null; vePhong(); return NW.toast(LOI_MOI[r.loi] || 'Chưa mời được.', true); }
      S.moiLuc = bay(); ngheTran(r.id);
    } catch (e) { S.pha = 'cho'; S.moiBan = null; vePhong(); NW.toast(NW.chuLoiKho(e), true); }
  }
  // huỷ lời mời đang chờ (daHet = máy chủ đã báo từ chối / hết hạn ⇒ không gọi huỷ)
  function huyMoi(daHet) {
    var id = S.tranId;
    dungTim(true); clearTimeout(S.thuHen);
    S.pha = 'cho'; S.tran = null; S.tranId = ''; S.moiBan = null; vePhong();
    if (!daHet && !S.thu && id) NW.goiHam('xhMoi', { loai: 'huy', id: id }).catch(function () { });
  }
  // ‹ Sảnh: đang ở phòng với đối thủ ⇒ bấm 2 lần (rời = né trận, máy chủ roiPhong khoá 1 phút)
  function roiPhong() {
    if (S.pha === 'xem') return moTab('live');
    if (S.pha === 'thay' && !S.daSS && !S.pcXn) { S.pcXn = true; vePhong(); setTimeout(function () { if (S.pcXn) { S.pcXn = false; if (S.man === 'pc') vePhong(); } }, 3000); return; }
    if (S.pha === 'vao') return;
    if (S.pha === 'moi') { huyMoi(); return moTab('sanh'); }
    var dangGhep = S.pha === 'thay';
    dungTim(); phongTat(); S.pha = 'cho'; S.pcXn = false; S.tran = null; S.tranId = '';
    if (dangGhep) napEm();
    moTab('sanh');
  }
  addEventListener('pagehide', function () {
    if (S.man !== 'pc') return;
    if (S.pha === 'xem') return roiXem();
    if (S.pha === 'tim' || S.pha === 'thay') dungTim();
    if (S.pha !== 'vao') phongTat();
  });

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
    // Đang đấu: mọi trận xếp hạng đang chơi của mùa — v1.439.0 (28/10 thầy: mọi nơi xem trận đang đấu — trận bắt đầu TRƯỚC ở trên, trận mới xuống dưới)
    f.fs.onSnapshot(f.fs.query(f.fs.collection(f.db, 'tranDau'), f.fs.where('xh', '==', S.mua), f.fs.where('trangThai', '==', 'choi'), f.fs.limit(30)), function (s) {
      var ds = [];
      s.forEach(function (d) { var t = d.data(); if ((t.ketThuc || 0) > bay() - 5000) { t.id = d.id; ds.push(t); } });
      ds.sort(function (x, y) { return ((x.batDau || x.ketThuc || 0) - (y.batDau || y.ketThuc || 0)) || (x.id < y.id ? -1 : 1); });
      S.live = ds; napTimLive(); ve();
    }, function (e) { console.warn('[xh] đang đấu', e); });
    // ⭐ 31/10 phòng chờ công khai của mùa (Đang đấu)
    f.fs.onSnapshot(f.fs.query(f.fs.collection(f.db, 'xhPhong'), f.fs.where('mua', '==', S.mua), f.fs.limit(60)), function (s) {
      var ds = []; s.forEach(function (d) { var x = d.data(); x.uid = d.id; x.luc = x.luc && x.luc.toMillis ? x.luc.toMillis() : 0; ds.push(x); });
      S.phongs = ds; if (S.man === 'sanh' || S.man === 'live') ve();
    }, function (e) { console.warn('[xh] đang đấu', e); });
    if (q.get('xemphong')) xemPhong(q.get('xemphong'));
    else if (q.get('phong')) { moPhong(); ngheTran(q.get('phong')); }   // ⭐ 31/10 nhận lời mời xếp hạng (thachdau.js) ⇒ vào thẳng phòng chờ của trận đó
    else if (q.get('tim') === '1' && !camTim()) moPhong(true);   // ĐẤU TIẾP từ màn kết quả ⇒ vào phòng chờ + tìm luôn
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
    if (S.man === 'pc') {
      capPhong();
      if (S.thu && S.pha === 'thay' && S.tran && !S.daSS && bay() > S.tran.hetSS) { dungTim(); S.pha = 'cho'; S.bao = 'Em chưa bấm Sẵn sàng nên bị khoá tìm trận một lúc.'; moTab('sanh'); }
    }
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
    S.phongs = [['p1', 'Minh Châu', 'A2-B', 'bac:I', 'cho'], ['p2', 'Gia Huy', 'B2-A', 'vang:II', 'tim'], ['p3', 'Ngọc Hà', 'B1-B', 'bac:II', 'cho']]
      .map(function (x) { return { uid: x[0], ten: x[1], lop: x[2], h: x[3], pha: x[4], tran: '', anh: '', luc: t0 }; });
    moTab(q.get('tab') || 'sanh');
    if (q.get('xemphong')) xemPhong(q.get('xemphong'));
    // ?thu=1&pc=cho|tim|thay|ok|em|roi — mở thẳng một trạng thái PHÒNG CHỜ để duyệt giao diện (không chạy tiếp)
    var pc = q.get('pc');
    if (pc) {
      moPhong();
      if (pc === 'tim') { S.pha = 'tim'; S.timLuc = bay() - 12000; vePhong(); }
      else if (pc === 'ds') moHopMoi();
      else if (pc === 'moi') { S.hopMoi = thuDsMoi(); guiMoi('m0'); }
      else if (pc !== 'cho') {
        thuThay(); clearTimeout(S.thuHen); S.pcMoi = pc === 'thay'; S.tran.hetSS = bay() + 23000;
        S.pcChat = [{ uid: 'u9', ten: 'Khánh Linh', chu: 'Hi! Chơi đẹp nha 😄', luc: bay() - 3000 }, { uid: S.toi.uid, chu: 'GG trước nhé 👍', luc: bay() - 1000 }];
        if (pc === 'ok') S.tran.ss.b = true;
        if (pc === 'em') { S.tran.ss.a = true; S.daSS = true; }
        if (pc === 'roi') S.pha = 'roi';
        vePhong();
      }
    }
  }
  function thuNguoiXem() { return [['Gia Huy'], ['Minh Châu'], ['Thảo My'], ['Tuấn Kiệt']].map(function (x) { return { ten: x[0], anh: '', luc: bay() }; }); }
  function thuXemPhong(uid) {
    var x = S.phongs.filter(function (p) { return p.uid === uid; })[0] || S.phongs[0];
    S.phong = Object.assign({}, x); S.phXem = thuNguoiXem().concat([{ ten: S.toi.ten, anh: '', luc: bay() }]);
    S.phChat = [{ uid: x.uid, ten: x.ten, vai: 'chu', chu: 'Ai vào đấu với mình không? 😄', luc: bay() - 4000 }, { uid: 'v1', ten: 'Gia Huy', vai: 'xem', chu: 'Cố lên!', luc: bay() - 2000 }];
  }
  function thuDsMoi() {
    return { ds: [['Khánh Linh', 'B1-A', 'vang:I', 1046, 0], ['Minh Châu', 'A2-B', 'vang:II', 932, 0], ['Gia Huy', 'B2-A', 'bk:', 1180, 1], ['Thảo My', 'B1-B', 'vang:II', 905, 0]]
      .map(function (x, i) { return { uid: 'm' + i, ten: x[0], lop: x[1], h: x[2], diem: x[3], dangDau: !!x[4], anh: '' }; }) };
  }
  // mời giả: ?thu=1&pc=moi giữ trạng thái chờ · còn lại bạn nhận lời sau 3,5 giây
  function thuMoi(b) {
    S.tran = { a: S.toi.uid, b: b.uid, tenB: b.ten, lopB: b.lop, hB: b.h, theB: { diem: b.diem, xl: 5, tran: 31, thang: 19, chuoi: 1, ds: ['t', 't', 'b', 't', 'h'] }, het: bay() + 60000, trangThai: 'moi' };
    S.tranId = 'thu'; vePhong();
    if (q.get('pc') === 'moi') return;
    S.thuHen = setTimeout(function () { if (S.pha === 'moi') thuThay(); }, 3500);
  }
  function thuThay() {
    // ghép giả: đối thủ chat sau 2,5 giây · sẵn sàng sau 7 giây · ?roi=1 ⇒ đối thủ rời phòng sau 5 giây
    var mb = S.moiBan, t = S.tran = { a: S.toi.uid, b: mb ? mb.uid : 'u9', tenA: S.toi.ten, tenB: mb ? mb.ten : 'Khánh Linh', lopA: 'A2-B', lopB: mb ? mb.lop : 'B1-A', anhB: '', hB: mb ? mb.h : 'vang:I',
      theB: { diem: mb ? mb.diem : 1046, xl: 5, tran: 57, thang: 39, chuoi: 3, ds: ['t', 'b', 't', 't', 't'] }, ss: { a: false, b: false }, hetSS: bay() + 32000, trangThai: 'cho' };
    S.tranId = 'thu'; S.pha = 'thay'; S.pcMoi = true; S.pcChat = []; S.pcGhi = []; vePhong();
    S.thuHen = setTimeout(function () {
      if (S.tran !== t) return;
      S.pcChat.push({ uid: 'u9', ten: 'Khánh Linh', vai: 'b', chu: 'Hi! Chơi đẹp nha 😄', luc: bay() }); veChatPc();
      if (q.get('roi') && !S.thuDaRoi) { S.thuDaRoi = true; S.thuHen = setTimeout(function () { if (S.tran === t) { t.trangThai = 'het'; banRoi(); } }, 2500); return; }
      S.thuHen = setTimeout(function () { if (S.tran !== t || S.pha !== 'thay') return; t.ss.b = true; vePhong(); if (t.ss.a) vaoTran('xhtran.html?thu=1'); }, 4500);
    }, 2500);
  }

  NW.dungThanh({ tab: 'khamPha', hop: true }).then(batDau);
})();
