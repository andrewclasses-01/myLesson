/* ============================================================
   thanh.js — THANH TRÊN CÙNG + CỬA VÀO TRANG (v0.4.0)

   Mọi trang (trừ index.html) gọi:
       NW.dungThanh({ tab: 'bangTin' }).then(function (phien) { ... })
   Hàm này:
     1. Kiểm phiên: chưa đăng nhập → về index.html · chưa đặt mật khẩu → index.html#doimk
        · tài khoản bị khoá → màn báo · thiếu hồ sơ → màn báo.
     2. Vẽ thanh (thầy chốt 22/09/2026, mẫu v4): TRÁI avatar EM + huy hiệu sao = trang cá nhân ·
        GIỮA 5 icon không chữ: trang bài tập · khám phá · tin nhắn · bảng tin · thông báo (chuông = hộp thả) ·
        PHẢI nút ☰ → sidebar trượt từ phải (ví sao · trang cá nhân · đổi mật khẩu · quản lý · đăng xuất).
        Điện thoại: cả thanh nằm ĐÁY màn hình (CSS .thanh @640px).
     3. Mở HAI kênh nghe dùng chung cho cả trang (mỗi trang chỉ MỘT lần, nơi khác đăng ký
        nhận qua NW.ngheThongBao / NW.nghePhong — không mở kênh trùng, tiền đọc Firestore):
          · nwUsers/{uid}/thongBao  (20 tin gần nhất)  → chấm đỏ chuông
          · nwChats where thanhVien ∋ uid (30 phòng)   → chấm đỏ tab TIN NHẮN
   ============================================================ */
(function () {
  'use strict';
  var NW = window.NW, CFG = NW.CFG, $ = NW.$, $$ = NW.$$, IC = NW.IC, an = NW.chuAnToan;

  // Thứ tự 5 icon thầy chốt 22/09. `chuong` không đổi trang — bấm mở hộp thông báo.
  var TABS = [
    { ma: 'baiTap', chu: 'TRANG BÀI TẬP', ic: IC.baiTap, href: CFG.LINK_BAI_TAP, ngoai: true },
    { ma: 'khamPha', chu: 'KHÁM PHÁ', ic: IC.khamPha, href: 'khampha.html' },
    { ma: 'tinNhan', chu: 'TIN NHẮN', ic: IC.tinNhan, href: 'tinnhan.html' },
    { ma: 'bangTin', chu: 'BẢNG TIN', ic: IC.bangTin, href: 'bangtin.html' },
    { ma: 'chuong', chu: 'THÔNG BÁO', ic: IC.chuong, href: '#' },
    { ma: 'timKiem', chu: 'TÌM KIẾM', ic: IC.timKiem, href: 'timkiem.html' }   // v0.4.0 thầy chốt: kính lúp CUỐI bên phải
  ];
  var SAO_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
  var LAP = '<path d="M5 0l1.1 3.9L10 5l-3.9 1.1L5 10 3.9 6.1 0 5l3.9-1.1z"/>';
  // Huy hiệu số sao dưới avatar — chép myLesson lop.html. Số sao thật chưa có kho ⇒ 0 (⛔ đừng gõ số giả).
  function saoHieu(so) {
    return '<span class="sao-hieu">' + (Number(so) || 0) + SAO_SVG +
      '<svg class="lap l1" viewBox="0 0 10 10">' + LAP + '</svg><svg class="lap l2" viewBox="0 0 10 10">' + LAP + '</svg><svg class="lap l3" viewBox="0 0 10 10">' + LAP + '</svg></span>';
  }

  var TB_DS = [];            // thông báo đang có
  var PHONG_DS = [];         // phòng chat đang có (xếp mới → cũ)
  var ngheTB = [], nghePhong = [];
  NW.ngheThongBao = function (cb) { ngheTB.push(cb); cb(TB_DS); return function () { ngheTB = ngheTB.filter(function (x) { return x !== cb; }); }; };
  NW.nghePhong = function (cb) { nghePhong.push(cb); cb(PHONG_DS); return function () { nghePhong = nghePhong.filter(function (x) { return x !== cb; }); }; };

  function soChuaDoc(ds) { return ds.filter(function (t) { return !t.daDoc; }).length; }
  function soPhongChua(ds) {
    var toi = NW.toi ? NW.toi.uid : '';
    return ds.filter(function (p) {
      var tc = p.tinCuoi || {};
      return tc.luc && tc.uid !== toi && tc.luc > ((p.docLuc || {})[toi] || 0);
    }).length;
  }
  NW.soPhongChua = soPhongChua;

  function veThanh(tab) {
    var hop = $('#nwThanh');
    if (!hop) { hop = document.createElement('header'); hop.id = 'nwThanh'; document.body.insertBefore(hop, document.body.firstChild); }
    hop.className = 'thanh';
    var toi = NW.toi || {};
    // avatar em: .av.me (nền gradient) + ảnh thật nếu có + huy hiệu sao; bấm = trang cá nhân
    var avEm = '<a class="av me" id="nutAv" href="canhan.html" title="Trang cá nhân của em">' + an(NW.chuTat(toi.ten || '?')) +
      (toi.anh ? '<img src="' + an(toi.anh) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + saoHieu(toi.sao) + '</a>';
    hop.innerHTML = '<div class="thanh-in">' +
      '<div class="trai">' + avEm + '</div>' +
      '<nav class="tabs">' + TABS.map(function (t) {
        // v0.9.0 thầy chốt: thầy không có bài tập — tab đầu của thầy là QUẢN LÝ (quanly.html); học sinh vẫn TRANG BÀI TẬP
        // Trang thử 28/09: tab QUẢN LÝ về dashboard thật của trang thử (mục Network vẫn ở quanly.html qua ☰ / cột trái dashboard)
        if (t.ma === 'baiTap' && toi.laThay) t = { ma: 'quanLy', chu: 'QUẢN LÝ', ic: IC.quanLy, href: NW.laBanThu() ? 'quanly.html?thu=thay' : CFG.LINK_DASHBOARD };
        return '<a class="tab' + (t.ma === tab ? ' chon' : '') + '" data-tab="' + t.ma + '" data-nh="' + t.chu + '" href="' + an(t.href) + '" title="' + t.chu + '" aria-label="' + t.chu + '">' + t.ic + '</a>';
      }).join('') + '</nav>' +
      '<div class="phai"><button class="nut-menu" id="nutMenu" title="Menu" aria-label="Menu">' + IC.menu3 + '</button></div>' +
      '</div>';
    $('.tab[data-tab="chuong"]').onclick = function (e) { e.preventDefault(); if (_thaMo) dongTha(); else moChuong(this); };
    $('#nutMenu').onclick = moSide;
    veSide();
  }

  // ---------- sidebar phải (☰) — hình chép myLesson; ví sao 0 vì chưa có kho ----------
  function veSide() {
    if ($('#nwSide')) return;
    var toi = NW.toi || {};
    var LAPC = function (c) { return '<svg class="sao-con ' + c + '" viewBox="0 0 10 10">' + LAP + '</svg>'; };
    var items = [
      { ic: IC.caNhan, nh: 'Trang cá nhân của em', mo: 'Bìa · giới thiệu · bài của em', onclick: function () { NW.di('canhan.html'); } },
      { ic: IC.khoa, nh: 'Đổi mật khẩu', mo: 'Mật khẩu đăng nhập My ID', onclick: moDoiMk },
      { ic: IC.baiTap, nh: 'Trang bài tập', mo: 'andrewclasses.com', onclick: function () { location.href = CFG.LINK_BAI_TAP; } }
    ];
    if (toi.laThay) items.push({ ic: IC.caiDat, nh: 'Trang quản lý', mo: 'Báo cáo · bài ẩn · từ cấm · tài khoản', onclick: function () { NW.di('quanly.html'); } });
    items.push({ ic: IC.thoat, nh: 'Đăng xuất', mo: 'Đăng xuất ID Andrew Classes', nguy: true, onclick: function () {
      if (NW.laBanThu()) { NW.thay('index.html?vao=1'); return; }   // ban thu: khong goi kho
      NW.thoat().then(function () { location.replace('index.html?vao=1'); });
    } });
    var phu = document.createElement('div'); phu.className = 'phu-mo'; phu.id = 'nwSidePhu'; phu.onclick = dongSide;
    var side = document.createElement('nav'); side.className = 'side'; side.id = 'nwSide';
    side.innerHTML = '<div class="side-head">' + NW.avHtml(toi) + '<div><div class="ten">' + an(toi.ten || '') + '</div><div class="phu2">' +
        an(toi.laThay ? 'THẦY' : ('Lớp ' + ((toi.cacLop || [toi.lop]).filter(Boolean).join(' · ') || '?'))) + '</div></div>' +
        '<button class="dong" data-dong title="Đóng" aria-label="Đóng">' + IC.dong + '</button></div>' +
      '<div class="vi-to"><div class="sao-ve"><svg class="sao-lon" viewBox="0 0 24 24"><path d="M12 2.2l3 6.2 6.8.9-4.9 4.8 1.2 6.7L12 17.6l-6.1 3.2 1.2-6.7L2.2 9.3l6.8-.9z"/></svg>' +
        LAPC('c1') + LAPC('c2') + LAPC('c3') + LAPC('c4') + LAPC('c5') + '</div><div class="so">' + (Number(toi.sao) || 0) + '</div><div class="nh">SAO ĐANG CÓ</div></div>' +
      '<div class="side-ds">' + items.map(function (it, i) {
        return '<button type="button" data-i="' + i + '"' + (it.nguy ? ' class="nguy"' : '') + '><span class="ico">' + it.ic + '</span><span><span class="nh">' + an(it.nh) + '</span><br><span class="mo-ta">' + an(it.mo) + '</span></span></button>';
      }).join('') + '</div>' +
      '<div class="side-foot">Andrew Classes Network · v' + an(CFG.PHIEN_BAN) + '</div>';
    document.body.appendChild(phu); document.body.appendChild(side);
    $('[data-dong]', side).onclick = dongSide;
    $$('.side-ds button', side).forEach(function (b) { b.onclick = function () { dongSide(); var it = items[+b.getAttribute('data-i')]; if (it.onclick) it.onclick(); }; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dongSide(); });
  }
  function moSide() { document.body.classList.add('mo-menu'); }
  function dongSide() { document.body.classList.remove('mo-menu'); }

  function datCham(nut, so) {
    if (!nut) return;
    var c = nut.querySelector('.cham');
    if (!so) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement('span'); c.className = 'cham'; nut.appendChild(c); }
    c.textContent = so > 99 ? '99+' : String(so);
  }
  function capNhatCham() {
    datCham($('.tab[data-tab="chuong"]'), soChuaDoc(TB_DS));
    datCham($('.tab[data-tab="tinNhan"]'), soPhongChua(PHONG_DS));
  }

  // ---------- chuông ----------
  var _thaMo = null;
  function dongTha() { if (_thaMo) { _thaMo.tha.remove(); _thaMo.phu.remove(); _thaMo = null; } }
  function moTha(html, neo) {
    dongTha();
    var tha = document.createElement('div'); tha.className = 'tha'; tha.innerHTML = html;
    var phu = document.createElement('div'); phu.className = 'phu-nen'; phu.onclick = dongTha;
    document.body.appendChild(phu); document.body.appendChild(tha);
    // máy tính: hộp thả nằm ngay DƯỚI icon chuông (điện thoại: CSS đặt trên thanh đáy, bỏ qua left)
    if (neo && window.innerWidth > 640) {
      var r = neo.getBoundingClientRect();
      tha.style.left = Math.max(12, Math.min(window.innerWidth - 372, r.left + r.width / 2 - 180)) + 'px';
      tha.style.right = 'auto';
    }
    requestAnimationFrame(function () { tha.classList.add('mo'); });
    _thaMo = { tha: tha, phu: phu };
    return tha;
  }
  var CHU_LOAI = { camXuc: 'đã thả cảm xúc vào bài của em', binhLuan: 'đã bình luận vào bài của em', chiaSe: 'đã chia sẻ bài của em',
                   ketBan: 'muốn kết bạn với em', dongY: 'đã đồng ý kết bạn', nhac: 'đã nhắc tới em', nhom: 'đã thêm em vào nhóm', chung: '' };
  function moChuong(neo) {
    var ds = TB_DS;
    var html = '<div class="tha-head"><span>Thông báo</span>' +
      (soChuaDoc(ds) ? '<button class="tiny" id="tbDocHet" style="color:var(--accent)">Đánh dấu đã đọc</button>' : '') + '</div><div class="tha-ds">' +
      (ds.length ? ds.map(function (t) {
        var laMoi = t.loai === 'ketBan' && !t.xuLy;   // v14: lời mời kết bạn xử lý ngay trong thông báo
        return '<div class="tha-muc' + (t.daDoc ? '' : ' chua') + (laMoi ? ' moi' : '') + '" data-id="' + an(t.id) + '" role="button" tabindex="0">' +
          NW.avHtml({ ten: t.tuTen, anh: t.tuAnh }, 'nho') +
          '<span class="chu"><b>' + an(t.tuTen) + '</b> ' + an(CHU_LOAI[t.loai] || t.loai) +
          (t.chu ? '<small>' + an(t.chu) + '</small>' : '') + '<small>' + an(NW.chuGio(t.luc)) + '</small>' +
          (laMoi ? '<span class="nut2"><button class="btn primary nho" type="button" data-kbok>Đồng ý</button><button class="btn soft nho" type="button" data-kbxoa>Xoá</button></span>' : '') +
          (t.loai === 'ketBan' && t.xuLy ? '<small class="da">' + (t.xuLy === 'ok' ? 'Đã là bạn bè' : 'Đã xoá lời mời') + '</small>' : '') +
          '</span></div>';
      }).join('') : '<div class="tha-trong">Chưa có thông báo nào.</div>') + '</div>';
    var tha = moTha(html, neo);
    $$('.tha-muc', tha).forEach(function (b) {
      var t = ds.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
      b.onclick = function (e) {
        if (e.target.closest('[data-kbok],[data-kbxoa]')) return;
        dongTha();
        if (!t) return;
        if (!t.daDoc) danhDauDoc([t.id]);
        if (t.link && NW.linkAnToan(t.link)) NW.di(t.link);   // (27/09/2026) chỉ link trong site — xem NW.linkAnToan
      };
      var ok = $('[data-kbok]', b), xoa = $('[data-kbxoa]', b);
      if (ok) ok.onclick = function () { xuLyKetBan(t, 'ok', neo); };
      if (xoa) xoa.onclick = function () { xuLyKetBan(t, 'xoa', neo); };
    });
    var het = $('#tbDocHet', tha);
    if (het) het.onclick = function () { danhDauDoc(ds.filter(function (t) { return !t.daDoc; }).map(function (t) { return t.id; })); dongTha(); };
  }
  // v0.5.0: Đồng ý / Xoá lời mời kết bạn NGAY trong hộp thông báo (kho nwBanBe id = uidA__uidB, tạo ở canhan.html)
  async function xuLyKetBan(t, cach, neo) {
    var toi = NW.toi;
    t.xuLy = cach; t.daDoc = true; capNhatCham(); moChuong(neo);
    if (NW.laBanThu()) { NW.toast(cach === 'ok' ? 'Bàn thử: đã là bạn với ' + t.tuTen + ' (không ghi thật).' : 'Đã xoá lời mời.'); return; }
    try {
      var f = await NW.fb();
      var id = toi.uid < t.tu ? toi.uid + '__' + t.tu : t.tu + '__' + toi.uid;
      if (cach === 'ok') {
        await f.fs.updateDoc(f.fs.doc(f.db, 'nwBanBe', id), { trangThai: 'ok', luc: Date.now() });
        NW.guiThongBao(t.tu, { loai: 'dongY', link: 'canhan.html?uid=' + toi.uid });
        if (NW.xoaDemBan) NW.xoaDemBan();
        NW.toast('Đã kết bạn với ' + t.tuTen + '.');
      } else {
        try { await f.fs.deleteDoc(f.fs.doc(f.db, 'nwBanBe', id)); } catch (e) { }
      }
      await f.fs.updateDoc(f.fs.doc(f.db, 'nwUsers', toi.uid, 'thongBao', t.id), { xuLy: cach, daDoc: true });
    } catch (e) { NW.toast(NW.chuLoiKho(e), true); }
  }
  async function danhDauDoc(ids) {
    if (!ids.length || NW.laBanThu()) return;
    var f = await NW.fb();
    var b = f.fs.writeBatch(f.db);
    ids.forEach(function (id) { b.update(f.fs.doc(f.db, 'nwUsers', NW.toi.uid, 'thongBao', id), { daDoc: true }); });
    try { await b.commit(); } catch (e) { console.warn(e); }
  }

  // ---------- đổi mật khẩu (gọi từ sidebar) ----------
  function moDoiMk() {
    var p = NW.popMo({ tieuDe: 'Đổi mật khẩu', html:
      '<label class="lbl">Mật khẩu hiện tại</label><input type="password" id="mkCu" autocomplete="current-password">' +
      '<label class="lbl" style="margin-top:12px">Mật khẩu mới (ít nhất 6 ký tự)</label><input type="password" id="mkMoi" autocomplete="new-password">' +
      '<label class="lbl" style="margin-top:12px">Gõ lại mật khẩu mới</label><input type="password" id="mkMoi2" autocomplete="new-password">' +
      '<p class="tiny" id="mkLoi" style="color:var(--do);margin:10px 0 0" hidden></p>',
      chan: '<button class="btn soft" data-dong>Thôi</button><button class="btn primary" id="mkOk">Đổi mật khẩu</button>' });
    $('[data-dong]', p).onclick = NW.popDong;
    $('#mkOk', p).onclick = async function () {
      var cu = $('#mkCu', p).value, moi = $('#mkMoi', p).value, moi2 = $('#mkMoi2', p).value, loi = $('#mkLoi', p);
      loi.hidden = true;
      if (moi.length < 6) { loi.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự.'; loi.hidden = false; return; }
      if (moi !== moi2) { loi.textContent = 'Hai lần gõ mật khẩu mới chưa giống nhau.'; loi.hidden = false; return; }
      this.disabled = true;
      try { await NW.doiMatKhau(cu, moi); NW.popDong(); NW.toast('Đã đổi mật khẩu.'); }
      catch (e) { loi.textContent = NW.chuLoiAuth(e); loi.hidden = false; this.disabled = false; }
    };
  }

  // ---------- nhịp "đang hoạt động" (v0.5.0): ghi hoatDongLuc vào hồ sơ mình 3 phút/lần khi tab đang mở ----------
  var NHIP_MS = 3 * 60 * 1000, _nhipCuoi = 0;
  async function nhipOnline() {
    if (NW.laBanThu() || document.hidden || !NW.toi || NW.toi.laThay) return;
    if (!NW.caiDat().hoatDong) return;   // v0.9.2: em tắt "Trạng thái hoạt động" ⇒ không ghi nhịp ⇒ bạn thấy em offline
    if (Date.now() - _nhipCuoi < NHIP_MS - 5000) return;
    _nhipCuoi = Date.now();
    try { var f = await NW.fb(); await f.fs.updateDoc(f.fs.doc(f.db, 'nwUsers', NW.toi.uid), { hoatDongLuc: _nhipCuoi }); }
    catch (e) { console.warn('[nw] nhịp online', e); }
  }
  function batNhip() {
    nhipOnline();
    setInterval(nhipOnline, NHIP_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) nhipOnline(); });
  }

  // ---------- kênh nghe ----------
  async function moKenh() {
    if (NW.laBanThu()) return;
    batNhip();
    var f = await NW.fb();
    var uid = NW.toi.uid;
    f.fs.onSnapshot(
      f.fs.query(f.fs.collection(f.db, 'nwUsers', uid, 'thongBao'), f.fs.orderBy('luc', 'desc'), f.fs.limit(20)),
      function (snap) {
        var ds = []; snap.forEach(function (d) { ds.push(Object.assign({ id: d.id }, d.data())); });
        TB_DS = ds; capNhatCham(); ngheTB.forEach(function (cb) { cb(ds); });
      }, function (e) { console.warn('[nw] thông báo', e); });
    f.fs.onSnapshot(
      f.fs.query(f.fs.collection(f.db, 'nwChats'), f.fs.where('thanhVien', 'array-contains', uid), f.fs.orderBy('capNhat', 'desc'), f.fs.limit(30)),
      function (snap) {
        var ds = []; snap.forEach(function (d) { ds.push(Object.assign({ id: d.id }, d.data())); });
        PHONG_DS = ds; capNhatCham(); nghePhong.forEach(function (cb) { cb(ds); });
      }, function (e) {
        console.warn('[nw] phòng chat', e);
        if (String(e && e.message).indexOf('index') >= 0) NW.toast('Kho thiếu chỉ mục cho tin nhắn — thầy xem tai-lieu/CHI MUC FIRESTORE.md', true);
      });
  }

  function manBao(tieuDe, chu, nut) {
    document.body.innerHTML = '<div class="login-bg"></div><div class="login-wrap"><div class="card login-card">' +
      '<div class="brand"><img src="assets/avatar-tron.jpg" alt=""><h1>Andrew Classes<small>NETWORK</small></h1></div>' +
      '<h2 style="margin:0 0 8px;font-size:17px">' + an(tieuDe) + '</h2><p class="tiny" style="text-align:left;margin:0 0 16px">' + an(chu) + '</p>' +
      (nut || '<a class="btn primary wide" href="index.html?vao=1">Về màn đăng nhập</a>') + '</div></div>';
  }

  // Dữ liệu giả cho bàn thử `?thu=1` (vai học sinh) / `?thu=thay` (vai thầy) — chỉ localhost.
  function toiBanThu() {
    if (NW.thamSo('thu') === 'thay') return { uid: 'gv', ten: 'Thầy Andrew', lop: 'GV', cacLop: [], vaiTro: 'gv', anh: 'assets/avatar-tron.jpg', bia: '', gioiThieu: '', laThay: true, phaiDoiMk: false, khoa: false };   // v0.9.0
    return { uid: 'hs_0', ten: 'BẠN THỬ', lop: 'A1C', cacLop: ['A1C'], vaiTro: 'hs', anh: '', bia: '', gioiThieu: 'Tài khoản bàn thử', laThay: false, phaiDoiMk: false, khoa: false };
  }

  NW.dungThanh = async function (o) {
    o = o || {};
    if (NW.laBanThu()) {
      NW.toi = toiBanThu();
      var t0 = Date.now();   // v14: thông báo mẫu — có LỜI MỜI KẾT BẠN xử lý ngay trong hộp
      TB_DS = [
        { id: 't1', loai: 'ketBan', tuUid: 'hs_4', tuTen: 'THU HÀ', tuAnh: '', chu: 'B1B · 2 bạn chung', luc: t0 - 600e3, daDoc: false, link: 'canhan.html?uid=hs_4' },
        { id: 't2', loai: 'camXuc', tuUid: 'hs_1', tuTen: 'MINH ANH', tuAnh: '', chu: '❤️ Được 3 sao bài Listening hôm nay', luc: t0 - 1500e3, daDoc: false, link: 'baidang.html?id=m0' },
        { id: 't3', loai: 'binhLuan', tuUid: 'gv', tuTen: 'Thầy Andrew', tuAnh: 'assets/avatar-tron.jpg', chu: 'Cảm ơn em, đội em nói rất tự tin đó!', luc: t0 - 2700e3, daDoc: true, link: 'baidang.html?id=m6' }
      ];
      veThanh(o.tab); capNhatCham();
      return { user: null, hoSo: NW.toi, laThay: !!NW.toi.laThay, banThu: true };
    }
    // ⭐ 29/09/2026: tab "thầy đăng nhập thay em" ⇒ mạng xã hội chạy DƯỚI TÊN EM (phiên trong tab, js/thay-vao.js).
    var ph = await NW.phien();
    if (!ph && NW.dangThayVao) {
      manBao('Phiên đăng nhập thay đã hết', 'Tab này đang ở chế độ thầy đăng nhập thay học sinh nhưng phiên đã hết (quá 30 phút hoặc đã thoát). Mở lại từ hồ sơ em trên dashboard nhé.',
        '<a class="btn primary wide" href="' + an(CFG.LINK_DASHBOARD) + '">Về trang quản lý</a>');
      return new Promise(function () { });
    }
    if (!ph) { location.replace('index.html'); return new Promise(function () { }); }
    if (ph.thieuHoSo) {
      manBao('Tài khoản chưa có hồ sơ', 'Tài khoản này đã đăng nhập được nhưng chưa có hồ sơ trên mạng. Thầy Andrew cần chạy công cụ tạo tài khoản (tools/tao-tai-khoan.mjs) rồi em vào lại nhé.');
      return new Promise(function () { });
    }
    if (ph.hoSo.khoa && !ph.laThay) {
      manBao('Tài khoản đang bị khoá', 'Thầy Andrew đã tạm khoá tài khoản này. Em gặp thầy để được mở lại nhé.');
      return new Promise(function () { });
    }
    if (ph.hoSo.phaiDoiMk && !ph.laThay && !NW.dangThayVao) { location.replace('index.html#doimk'); return new Promise(function () { }); }
    veThanh(o.tab);
    moKenh();
    // Trang thử 28/09: chuông trên thanh trang lớp/dashboard dẫn sang đây kèm ?tb=1 ⇒ mở sẵn hộp thông báo
    if (NW.thamSo('tb') === '1') setTimeout(function () { var c = $('.tab[data-tab="chuong"]'); if (c && !_thaMo) moChuong(c); }, 600);
    return ph;
  };
})();
