/* ============================================================
   chat.js — TIN NHẮN RIÊNG + NHÓM CHAT (v0.1.0)

   KHO nwChats/{id}:
     loai 'rieng'|'nhom' · ten (nhóm) · thanhVien[uid] · tv{uid:{ten,anh,lop,vaiTro}} · taoBoi
     · luc · capNhat · tinCuoi{chu,uid,ten,luc} · docLuc{uid: mốc đã đọc}
   nwChats/{id}/tin/{mid}: uid · ten · anh · chu · hinh · luc
   Mã phòng RIÊNG = hai uid xếp theo bảng chữ cái nối '__' ⇒ hai em nhắn nhau chỉ có MỘT phòng.

   AI NHẮN ĐƯỢC VỚI AI (thầy chốt 20/09/2026): cùng lớp + thầy. Khi bật CFG.BAT_KET_BAN thì
   thêm bạn bè đã kết bạn (kho nwBanBe) — luật Firestore đã có sẵn nhánh này.

   💸 Danh sách phòng dùng kênh chung của thanh.js (NW.nghePhong) — không mở kênh thứ hai.
   Phòng đang mở: onSnapshot 30 tin gần nhất; tin cũ hơn tải MỘT LẦN khi bấm "Xem tin cũ hơn".
   ============================================================ */
(function () {
  'use strict';
  var NW = window.NW, CFG = NW.CFG, $ = NW.$, $$ = NW.$$, IC = NW.IC, an = NW.chuAnToan;
  var Chat = NW.Chat = {};

  Chat.maRieng = function (a, b) { return a < b ? a + '__' + b : b + '__' + a; };

  // Người mà em được nhắn: cùng lớp (mọi lớp em học) + thầy + bạn bè (nếu bật).
  Chat.nguoiNhanDuoc = async function () {
    var toi = NW.toi; var ds = []; var co = {};
    var them = function (n) { if (n.uid !== toi.uid && !co[n.uid]) { co[n.uid] = 1; ds.push(n); } };
    if (NW.laBanThu()) {
      [{ uid: 'hs_1', ten: 'MINH ANH', lop: 'A1C', vaiTro: 'hs' }, { uid: 'hs_2', ten: 'BẢO NAM', lop: 'A1C', vaiTro: 'hs' }, { uid: 'gv', ten: 'Thầy Andrew', lop: 'GV', vaiTro: 'gv', anh: 'assets/avatar-tron.jpg' }].forEach(them);
      return ds;
    }
    (await NW.dsThay().catch(function () { return []; })).forEach(them);
    if (toi.laThay) {
      // Thầy: mọi lớp trong kho cấu hình (nếu có) — hoặc chỉ tìm theo tên ở màn nhắn mới.
      var cf = await Chat.dsLop();
      for (var i = 0; i < cf.length; i++) (await NW.nguoiTheoLop(cf[i].ma).catch(function () { return []; })).forEach(them);
    } else {
      var lops = toi.cacLop || [toi.lop];
      for (var j = 0; j < lops.length; j++) (await NW.nguoiTheoLop(lops[j]).catch(function () { return []; })).forEach(them);
    }
    if (CFG.BAT_KET_BAN) (await Chat.banBe().catch(function () { return []; })).forEach(them);
    return ds;
  };
  Chat.dsLop = async function () {
    try {
      var o = JSON.parse(sessionStorage.getItem('nwDsLop') || 'null');
      if (o && (Date.now() - o.luc) < 30 * 60 * 1000) return o.ds;
      var f = await NW.fb();
      var snap = await f.fs.getDoc(f.fs.doc(f.db, 'nwCauHinh', 'lop'));
      var ds = snap.exists() ? (snap.data().ds || []) : [];
      try { sessionStorage.setItem('nwDsLop', JSON.stringify({ luc: Date.now(), ds: ds })); } catch (e) { }
      return ds;
    } catch (e) { return []; }
  };
  // Bạn bè đã đồng ý (kho nwBanBe, sẵn cho tương lai).
  Chat.banBe = async function () {
    var f = await NW.fb();
    var q = f.fs.query(f.fs.collection(f.db, 'nwBanBe'), f.fs.where('thanhVien', 'array-contains', NW.toi.uid), f.fs.where('trangThai', '==', 'ok'), f.fs.limit(200));
    var snap = await f.fs.getDocs(q); var ds = [];
    snap.forEach(function (d) { var x = d.data(); var k = x.thanhVien[0] === NW.toi.uid ? x.thanhVien[1] : x.thanhVien[0]; ds.push(Object.assign({ uid: k }, (x.tv || {})[k] || { ten: '?' })); });
    return ds;
  };

  // Mở (tạo nếu chưa có) phòng riêng với một người → trả id phòng.
  Chat.moRieng = async function (nguoi) {
    var toi = NW.toi; var id = Chat.maRieng(toi.uid, nguoi.uid);
    if (NW.laBanThu()) return id;
    var f = await NW.fb();
    var ref = f.fs.doc(f.db, 'nwChats', id);
    var snap = await f.fs.getDoc(ref);
    if (!snap.exists()) {
      var tv = {}; tv[toi.uid] = NW.tomTat(toi); tv[nguoi.uid] = NW.tomTat(nguoi);
      var doc = { loai: 'rieng', ten: '', thanhVien: [toi.uid, nguoi.uid].sort(), tv: tv, taoBoi: toi.uid, luc: Date.now(), capNhat: Date.now(), tinCuoi: null, docLuc: {} };
      await f.fs.setDoc(ref, doc);
    }
    return id;
  };

  // v0.5.0 — dùng chung cho trang tin nhắn + hộp chat nổi (chatnoi.js)
  Chat.danhDauDoc = async function (phongId) {
    if (NW.laBanThu()) return;
    try { var f = await NW.fb(); var patch = {}; patch['docLuc.' + NW.toi.uid] = Date.now(); patch['chuaDoc.' + NW.toi.uid] = false; await f.fs.updateDoc(f.fs.doc(f.db, 'nwChats', phongId), patch); } catch (e) { }
  };
  // Gửi một tin vào phòng: tin = {chu} | {hinh}. Trả tin đã dựng (bàn thử: không ghi, trả để hiện tại chỗ); null nếu bị chặn từ cấm.
  Chat.guiTin = async function (phongId, tin) {
    var toi = NW.toi;
    if (tin.chu) { var tu = await NW.kiemTuCam(tin.chu); if (tu) { NW.toast('Tin có từ không phù hợp ("' + tu + '").', true); return null; } }
    var t = { uid: toi.uid, ten: toi.ten, anh: toi.anh || '', chu: String(tin.chu || '').slice(0, CFG.TOI_DA_CHU_TIN), hinh: tin.hinh || '', luc: Date.now() };
    if (NW.laBanThu()) return t;
    try {
      var f = await NW.fb();
      await f.fs.addDoc(f.fs.collection(f.db, 'nwChats', phongId, 'tin'), t);
      var patch = { tinCuoi: { chu: t.chu ? t.chu.slice(0, 80) : '', hinh: !!t.hinh, uid: toi.uid, ten: toi.ten, luc: t.luc }, capNhat: t.luc };
      patch['docLuc.' + toi.uid] = t.luc;
      await f.fs.updateDoc(f.fs.doc(f.db, 'nwChats', phongId), patch);
      return t;
    } catch (e) { NW.toast(NW.chuLoiKho(e), true); return null; }
  };

  // ---------- giao diện hai cột — v0.6.0 (mẫu v15+v16 thầy chốt 22/09): cụm tin · 7 cảm xúc · trả lời · đã xem · bảng thông tin ·
  //            menu ⋯ từng cuộc (chưa đọc / tắt TB / cá nhân / xoá / báo cáo) · HS không tạo/rời nhóm · nhóm luôn đứng đầu ----------
  // Tin: {uid, ten, anh, chu, hinh, luc, camXuc{uid:mã}, traLoi{id, uid, ten, chu, hinh}} — "đã xem" tính từ phong.docLuc[uid] >= tin.luc
  Chat.dung = function (hop) {
    var toi = NW.toi;
    var PHONG = [], chon = '', dungNghe = null, TIN = [], hetCu = false, nguoiHienTai = null;
    var dangTraLoi = null;   // tin đang trả lời
    var timChu = '';
    hop.className = 'card tn';
    hop.innerHTML =
      '<div class="tn-ds"><div class="tn-ds-dau"><h2>Tin nhắn</h2>' +
        (toi.laThay ? '<button class="nut-tron" id="tnNhom" title="Tạo nhóm chat" aria-label="Tạo nhóm chat">' + IC.nhom + '</button>' : '') +   // v16: HS không tạo nhóm
        '<button class="nut-tron dam" id="tnMoi" title="Nhắn tin mới" aria-label="Nhắn tin mới">' + IC.sua + '</button></div>' +
        '<div class="tn-tim"><span class="tim-o">' + IC.timKiem + '<input type="search" id="tnTim" placeholder="Tìm trong tin nhắn"></span></div>' +
        '<div class="tn-ds-cuon" id="tnDs"><div class="tn-trong">Đang tải…</div></div></div>' +
      '<div class="tn-phong" id="tnPhong"><div class="tn-trong">' + IC.tinNhan + 'Chọn một cuộc trò chuyện,<br>hoặc bấm ' + IC.sua + ' để nhắn cho bạn.</div></div>' +
      '<aside class="tn-info" id="tnInfo" hidden></aside>';
    var khuDs = $('#tnDs', hop), khuPhong = $('#tnPhong', hop), khuInfo = $('#tnInfo', hop);
    $('#tnTim', hop).addEventListener('input', function () { timChu = NW.khongDau(this.value.trim().toLowerCase()); veDs(); });

    function nguoiKia(p) { var k = (p.thanhVien || []).filter(function (u) { return u !== toi.uid; })[0] || toi.uid; return Object.assign({ uid: k }, (p.tv || {})[k] || { ten: '?' }); }
    function tenPhong(p) { return p.loai === 'nhom' ? (p.ten || 'Nhóm') : nguoiKia(p).ten || '?'; }
    function avPhong(p, lop) {
      if (p.loai === 'nhom') {
        var khac = (p.thanhVien || []).filter(function (u) { return u !== toi.uid; });
        var tvs = khac.concat([toi.uid]).slice(0, 2).map(function (u) { return u === toi.uid ? toi : ((p.tv || {})[u] || { ten: '?' }); });
        return '<span class="av-nhom' + (lop ? ' ' + lop : '') + '">' + tvs.map(function (t) { return NW.avHtml(t); }).join('') + '</span>';
      }
      return NW.avHtml(nguoiKia(p), lop);
    }
    function tichNeuThay(n) { return n && n.vaiTro === 'gv' ? NW.tichHtml('nho') : ''; }
    // v16: cờ `chuaDoc[uid]` = em tự đánh dấu chưa đọc (kể cả khi tin cuối là của em); mở phòng thì xoá cờ
    function chuaDoc(p) { var tc = p.tinCuoi || {}; return !!((p.chuaDoc || {})[toi.uid]) || !!(tc.luc && tc.uid !== toi.uid && tc.luc > ((p.docLuc || {})[toi.uid] || 0)); }
    function gioNgan(ms) {   // "12:05" hôm nay · "T3" trong tuần · "18/8"
      if (!ms) return ''; var d = new Date(ms), n = new Date(); var kc = n - d;
      if (d.toDateString() === n.toDateString()) return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
      if (kc < 6 * 86400e3) return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
      return d.getDate() + '/' + (d.getMonth() + 1);
    }

    // ---------- danh sách phòng ----------
    // v16: nhóm (thầy tạo) luôn đứng ĐẦU danh sách; cuộc em đã "xoá" (anLuc[em] >= capNhat) thì giấu tới khi có tin mới
    function xepPhong(ds) {
      return ds.filter(function (p) { return !(((p.anLuc || {})[toi.uid] || 0) >= (p.capNhat || 0)); })
        .sort(function (a, b) { var na = a.loai === 'nhom' ? 0 : 1, nb = b.loai === 'nhom' ? 0 : 1; return na - nb || (b.capNhat || 0) - (a.capNhat || 0); });
    }
    function tatTB(p) { return !!((p.tat || {})[toi.uid]); }
    function veDs() {
      var ds = xepPhong(PHONG).filter(function (p) { return !timChu || NW.khongDau(tenPhong(p).toLowerCase()).indexOf(timChu) >= 0; });
      if (!ds.length) { khuDs.innerHTML = '<div class="tn-trong">' + (timChu ? 'Không thấy cuộc trò chuyện nào.' : 'Chưa có cuộc trò chuyện nào.<br>Bấm ✎ để nhắn cho bạn cùng lớp hoặc thầy.') + '</div>'; return; }
      khuDs.innerHTML = ds.map(function (p) {
        var tc = p.tinCuoi || {}, chua = chuaDoc(p);
        var cuoi = tc.luc ? ((tc.uid === toi.uid ? 'Em: ' : (p.loai === 'nhom' ? (tc.ten || '').split(' ').pop() + ': ' : '')) + (tc.chu || (tc.hinh ? '📷 Ảnh' : ''))) : 'Bắt đầu trò chuyện';
        return '<div class="tn-muc' + (p.id === chon ? ' chon' : '') + (chua ? ' chua' : '') + (p.loai === 'nhom' ? ' nhom' : '') + '" data-id="' + an(p.id) + '" role="button" tabindex="0">' + avPhong(p) +
          '<span class="tt"><span class="ten">' + an(tenPhong(p)) + (p.loai !== 'nhom' ? tichNeuThay(nguoiKia(p)) : '') + (tatTB(p) ? '<span class="tat" title="Đã tắt thông báo">' + IC.chuongTat + '</span>' : '') + '</span>' +
          '<span class="cuoi">' + an(cuoi) + '<span class="gio"> · ' + an(gioNgan(tc.luc || p.capNhat)) + '</span></span></span>' +
          (chua ? '<span class="cham"></span>' : '') +
          '<button type="button" class="menu" data-menu aria-label="Tuỳ chọn" title="Tuỳ chọn">' + IC.baCham + '</button></div>';
      }).join('');
      $$('.tn-muc', khuDs).forEach(function (row) {
        var id = row.getAttribute('data-id'), giu = null, daGiu = false;
        row.onclick = function (e) { if (e.target.closest('[data-menu]')) return; if (daGiu) { daGiu = false; return; } moPhong(id); };
        row.onkeydown = function (e) { if (e.key === 'Enter') moPhong(id); };
        $('[data-menu]', row).onclick = function (e) { e.stopPropagation(); menuCuoc(this, id); };
        // điện thoại: GIỮ 450ms = mở menu
        row.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; daGiu = false; giu = setTimeout(function () { daGiu = true; menuCuoc($('[data-menu]', row), id); }, 450); });
        row.addEventListener('pointerup', function () { clearTimeout(giu); });
        row.addEventListener('pointerleave', function () { clearTimeout(giu); });
        row.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      });
    }
    // ---------- v16: menu từng cuộc chat (⋯ máy tính / giữ điện thoại) ----------
    function menuCuoc(nut, id) {
      var p = PHONG.filter(function (x) { return x.id === id; })[0]; if (!p) return;
      var chua = chuaDoc(p), tat = tatTB(p), items = [];
      items.push({ ic: chua ? IC.daDoc : IC.chuaDoc, chu: chua ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc', onclick: function () { danhDauChuaDoc(p, !chua); } });
      items.push({ ic: tat ? IC.chuongBat : IC.chuongTat, chu: tat ? 'Bật thông báo' : 'Tắt thông báo', onclick: function () { datTat(p, !tat); } });
      if (p.loai === 'nhom') items.push({ ic: IC.nhom, chu: 'Xem thành viên', onclick: function () { xemThanhVien(p); } });
      else items.push({ ic: IC.caNhan, chu: 'Xem trang cá nhân', onclick: function () { NW.di('canhan.html?uid=' + nguoiKia(p).uid); } });
      if (p.loai !== 'nhom') items.push({ ic: IC.xoa, chu: 'Xoá đoạn chat', nguy: true, onclick: function () { xoaCuoc(p); } });
      items.push({ ic: IC.baoCao, chu: 'Báo cáo', onclick: function () { baoCaoCuoc(p); } });
      NW.menuNho(nut, items);
    }
    async function capNhatPhong(p, patch, capNhatTaiCho) {
      capNhatTaiCho(); veDs();
      if (NW.laBanThu()) return;
      try { var f = await NW.fb(); await f.fs.updateDoc(f.fs.doc(f.db, 'nwChats', p.id), patch); } catch (e) { NW.toast(NW.chuLoiKho(e), true); }
    }
    function danhDauChuaDoc(p, chua) {
      var moc = chua ? ((p.tinCuoi || {}).luc || p.capNhat || 1) - 1 : Date.now();
      var patch = {}; patch['docLuc.' + toi.uid] = moc; patch['chuaDoc.' + toi.uid] = chua;
      if (chua && chon === p.id) { hop.classList.remove('mo-phong'); chon = ''; dongInfo(); khuPhong.innerHTML = '<div class="tn-trong">' + IC.tinNhan + 'Chọn một cuộc trò chuyện.</div>'; }
      capNhatPhong(p, patch, function () { p.docLuc = p.docLuc || {}; p.docLuc[toi.uid] = moc; p.chuaDoc = p.chuaDoc || {}; p.chuaDoc[toi.uid] = chua; });
    }
    function datTat(p, tat) {
      var patch = {}; patch['tat.' + toi.uid] = tat;
      capNhatPhong(p, patch, function () { p.tat = p.tat || {}; p.tat[toi.uid] = tat; });
      NW.toast(tat ? 'Đã tắt thông báo cuộc trò chuyện này.' : 'Đã bật lại thông báo.');
    }
    async function xoaCuoc(p) {
      if (!(await NW.hoi('Xoá đoạn chat?', 'Đoạn chat sẽ biến mất khỏi danh sách của em (bạn kia vẫn giữ). Có tin mới thì nó hiện lại.', { ok: 'Xoá', nguy: true }))) return;
      var moc = Date.now(); var patch = {}; patch['anLuc.' + toi.uid] = moc;
      if (chon === p.id) { hop.classList.remove('mo-phong'); chon = ''; dongInfo(); khuPhong.innerHTML = '<div class="tn-trong">' + IC.tinNhan + 'Chọn một cuộc trò chuyện.</div>'; }
      capNhatPhong(p, patch, function () { p.anLuc = p.anLuc || {}; p.anLuc[toi.uid] = moc; });
    }
    function baoCaoCuoc(p) {
      var pop = NW.popMo({ tieuDe: 'Báo cáo với thầy', html:
        '<label class="lbl">Lý do</label><select id="bcLyDo" style="width:100%;padding:10px 12px;border-radius:12px;border:1.5px solid var(--line);font-weight:600">' +
        '<option value="khong-phu-hop">Nội dung không phù hợp</option><option value="bat-nat">Trêu chọc / bắt nạt</option><option value="gia-mao">Giả mạo người khác</option><option value="khac">Khác</option></select>' +
        '<label class="lbl" style="margin-top:12px">Nói rõ hơn (không bắt buộc)</label><textarea id="bcChu" rows="3" maxlength="300"></textarea>',
        chan: '<button class="btn soft" data-dong>Thôi</button><button class="btn nguy" id="bcOk">Gửi báo cáo</button>' });
      $('[data-dong]', pop).onclick = NW.popDong;
      $('#bcOk', pop).onclick = async function () {
        if (NW.laBanThu()) { NW.popDong(); NW.toast('Bàn thử: không ghi thật.'); return; }
        this.disabled = true;
        try {
          var f = await NW.fb();
          await f.fs.addDoc(f.fs.collection(f.db, 'nwBaoCao'), { tu: toi.uid, tuTen: toi.ten, loai: 'chat', phongId: p.id, tenBai: tenPhong(p), baiId: '', uidBai: p.loai === 'nhom' ? '' : nguoiKia(p).uid,
            lyDo: $('#bcLyDo', pop).value, chu: $('#bcChu', pop).value.trim().slice(0, 300), tomTat: ((p.tinCuoi || {}).chu || '').slice(0, 120), luc: Date.now(), trangThai: 'moi' });
          NW.popDong(); NW.toast('Đã gửi báo cáo tới thầy. Cảm ơn em.');
        } catch (e) { NW.toast(NW.chuLoiKho(e), true); this.disabled = false; }
      };
    }

    // ---------- khung phòng ----------
    function phuPhong(p) {
      if (p.loai === 'nhom') return (p.thanhVien || []).length + ' thành viên';
      var k = nguoiKia(p);
      return k.vaiTro === 'gv' ? 'Thầy' : (NW.dangOnline(k) ? 'Đang hoạt động' : (k.lop ? 'Lớp ' + k.lop : ''));
    }
    function veKhungPhong(p) {
      khuPhong.innerHTML =
        '<div class="tn-phong-dau"><button class="nut-tron lui" id="tnLui" aria-label="Quay lại">' + IC.lui + '</button>' + avPhong(p) +
        '<div class="ai"><div class="ten">' + an(tenPhong(p)) + (p.loai !== 'nhom' ? tichNeuThay(nguoiKia(p)) : '') + '</div><div class="phu">' + an(phuPhong(p)) + '</div></div>' +
        '<button class="nut-tron" id="tnInfoNut" aria-label="Thông tin" title="Thông tin cuộc trò chuyện">' + IC.thongTin + '</button></div>' +
        '<div class="tn-cuon" id="tnCuon"></div>' +
        '<div class="tn-nhap-khu"><div class="tn-tra" id="tnTra" hidden></div>' +
        '<div class="tn-nhap"><button class="anh" id="tnAnh" title="Gửi ảnh" aria-label="Gửi ảnh">' + IC.anh + '</button><input type="file" id="tnFile" accept="image/*" multiple hidden>' +
        '<textarea id="tnChu" rows="1" placeholder="Aa" maxlength="' + CFG.TOI_DA_CHU_TIN + '"></textarea>' +
        '<button class="gui" id="tnGui" hidden aria-label="Gửi">' + IC.gui + '</button>' +
        '<button class="tim" id="tnTim2" aria-label="Gửi tim" title="Gửi ❤️">' + IC.tim + '</button></div></div>';
      hop.classList.add('mo-phong');
      $('#tnLui', khuPhong).onclick = function () { hop.classList.remove('mo-phong'); chon = ''; dongInfo(); veDs(); };
      var ta = $('#tnChu', khuPhong), gui = $('#tnGui', khuPhong), tim = $('#tnTim2', khuPhong);
      NW.tuCao(ta, 140);
      ta.addEventListener('input', function () { var co = !!ta.value.trim(); gui.hidden = !co; tim.hidden = co; });
      ta.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!gui.hidden) gui.click(); }
        if (e.key === 'Escape' && dangTraLoi) { datTraLoi(null); }
      });
      gui.onclick = function () { var chu = ta.value.trim(); if (!chu) return; ta.value = ''; ta.style.height = 'auto'; ta.dispatchEvent(new Event('input')); guiTin(p, { chu: chu }); };
      tim.onclick = function () { guiTin(p, { chu: '❤️' }); };
      $('#tnAnh', khuPhong).onclick = function () { $('#tnFile', khuPhong).click(); };
      $('#tnFile', khuPhong).onchange = async function () {
        var files = Array.prototype.slice.call(this.files || []); this.value = ''; if (!files.length) return;
        for (var i = 0; i < Math.min(files.length, 6); i++) {
          try {
            var blob = await NW.nenAnh(files[i], { canhDai: 1280 });
            var url = NW.laBanThu() ? URL.createObjectURL(blob) : await NW.taiAnh(blob, NW.tenAnhMoi('_t'));
            await guiTin(p, { hinh: url });
          } catch (e) { NW.toast('Không gửi được ảnh: ' + (e.message || e), true); }
        }
      };
      $('#tnInfoNut', khuPhong).onclick = function () { if (khuInfo.hidden) moInfo(p); else dongInfo(); };
      datTraLoi(null);
    }
    function datTraLoi(t) {
      dangTraLoi = t;
      var o = $('#tnTra', khuPhong); if (!o) return;
      o.hidden = !t;
      if (t) {
        o.innerHTML = '<span class="chu"><b>Đang trả lời ' + an(t.uid === toi.uid ? 'chính mình' : t.ten) + '</b><small>' + an(t.chu ? t.chu.slice(0, 80) : (t.hinh ? '📷 Ảnh' : '')) + '</small></span>' +
          '<button type="button" data-bo aria-label="Thôi">' + IC.dong + '</button>';
        $('[data-bo]', o).onclick = function () { datTraLoi(null); };
        $('#tnChu', khuPhong).focus();
      }
    }

    // ---------- tin nhắn ----------
    function cumCx(t) {
      var cx = t.camXuc || {}; var uids = Object.keys(cx); if (!uids.length) return '';
      var loai = NW.CAM_XUC.filter(function (c) { return uids.some(function (u) { return cx[u] === c.ma; }); }).slice(0, 3);
      return '<button type="button" class="cx-cum" data-cxai="' + an(t.id || '') + '">' + loai.map(function (c) { return NW.cxHtml(c.ma); }).join('') + (uids.length > 1 ? '<b>' + uids.length + '</b>' : '') + '</button>';
    }
    function daXem(t, p) {   // những người khác đã đọc tới tin này (docLuc >= luc)
      var dl = p.docLuc || {};
      return (p.thanhVien || []).filter(function (u) { return u !== toi.uid && u !== t.uid && dl[u] >= t.luc; });
    }
    function veTin() {
      var cuon = $('#tnCuon', khuPhong); if (!cuon) return;
      var p = nguoiHienTai || {};
      var gan = cuon.scrollHeight - cuon.scrollTop - cuon.clientHeight < 80;
      var html = (!hetCu && TIN.length >= 30 ? '<button class="bl-them" id="tnCu" type="button" style="align-self:center;padding:6px 12px">Xem tin cũ hơn</button>' : '');
      var ngayTruoc = '';
      // "đã xem" chỉ vẽ ở tin CUỐI CÙNG mà mỗi người đã đọc tới
      var xemO = {};   // index tin → [uid]
      var dl = p.docLuc || {};
      (p.thanhVien || []).forEach(function (u) {
        if (u === toi.uid) return;
        for (var i = TIN.length - 1; i >= 0; i--) { if (dl[u] >= TIN[i].luc && TIN[i].uid !== u) { (xemO[i] = xemO[i] || []).push(u); break; } }
      });
      TIN.forEach(function (t, i) {
        var ngay = NW.chuNgay(t.luc);
        if (ngay !== ngayTruoc) { html += '<div class="tin-ngay">' + an(ngay) + '</div>'; ngayTruoc = ''; ngayTruoc = ngay; }
        var truoc = TIN[i - 1], sau = TIN[i + 1];
        var cungTruoc = truoc && truoc.uid === t.uid && NW.chuNgay(truoc.luc) === ngay && (t.luc - truoc.luc) < 5 * 60e3;
        var cungSau = sau && sau.uid === t.uid && NW.chuNgay(sau.luc) === ngay && (sau.luc - t.luc) < 5 * 60e3;
        var cuaToi = t.uid === toi.uid;
        var viTri = (cungTruoc ? (cungSau ? 'giua' : 'cuoi') : (cungSau ? 'dau' : 'mot'));
        if (!cuaToi && !cungTruoc && p.loai === 'nhom') html += '<div class="tin-ai">' + an(t.ten) + '</div>';
        var trich = t.traLoi ? '<button type="button" class="tin-trich" data-toi="' + an(t.traLoi.id || '') + '"><b>' + an(t.traLoi.uid === toi.uid ? 'Em' : (t.traLoi.ten || '')) + '</b>' +
          an(t.traLoi.chu ? t.traLoi.chu.slice(0, 90) : (t.traLoi.hinh ? '📷 Ảnh' : '')) + '</button>' : '';
        var ruot = (t.hinh ? '<button type="button" class="hinh" data-anh="' + an(t.hinh) + '"><img src="' + an(t.hinh) + '" alt="" loading="lazy"></button>' : '') + (t.chu ? '<span class="chu">' + NW.chuCoLink(t.chu) + '</span>' : '');
        var chiTim = t.chu === '❤️' && !t.hinh;
        html += '<div class="tin' + (cuaToi ? ' toi' : ' ho') + ' ' + viTri + (t.hinh && !t.chu ? ' chi-anh' : '') + (chiTim ? ' chi-tim' : '') + '" data-id="' + an(t.id || '') + '" data-i="' + i + '">' +
          (!cuaToi ? '<span class="av-cho">' + (!cungSau ? NW.avHtml({ ten: t.ten, anh: t.anh }, 'nho') : '') + '</span>' : '') +
          '<div class="than">' + trich + '<div class="bong">' + (chiTim ? NW.cxHtml('tim', 'to') : ruot) + cumCx(t) + '</div>' +
            '<div class="nut-tin"><button type="button" data-cxnut title="Thả cảm xúc" aria-label="Thả cảm xúc">' + IC.camGiac + '</button>' +
            '<button type="button" data-tra title="Trả lời" aria-label="Trả lời">' + IC.traLoi + '</button>' +
            '<button type="button" data-them title="Thêm" aria-label="Thêm">' + IC.baCham + '</button></div>' +
          '</div><span class="gio">' + an(NW.chuGio(t.luc)) + '</span></div>';
        if (xemO[i]) html += '<div class="tin-daxem' + (cuaToi ? ' toi' : '') + '" title="Đã xem">' + xemO[i].map(function (u) { return NW.avHtml((p.tv || {})[u] || { ten: '?' }, 'nho'); }).join('') + '</div>';
      });
      if (!TIN.length) html += '<div class="tn-trong">Chưa có tin nào. Nhắn câu đầu tiên đi!</div>';
      cuon.innerHTML = html;
      $$('[data-anh]', cuon).forEach(function (b) { b.onclick = function () { NW.xemAnh(b.getAttribute('data-anh'), TIN.filter(function (x) { return x.hinh; }).map(function (x) { return x.hinh; })); }; });
      var cu = $('#tnCu', cuon); if (cu) cu.onclick = taiCu;
      $$('.tin', cuon).forEach(function (el) {
        var t = TIN[+el.getAttribute('data-i')];
        var nutCx = $('[data-cxnut]', el);
        nutCx.onclick = function () { moBangCx(nutCx, t); };
        $('[data-tra]', el).onclick = function () { datTraLoi(t); };
        $('[data-them]', el).onclick = function () { menuTin(this, t); };
        // giữ tin (điện thoại) = bảng cảm xúc
        var giu = null;
        el.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; giu = setTimeout(function () { moBangCx($('.bong', el), t); }, 450); });
        el.addEventListener('pointerup', function () { clearTimeout(giu); });
        el.addEventListener('pointerleave', function () { clearTimeout(giu); });
        var trich = $('.tin-trich', el);
        if (trich) trich.onclick = function () {
          var goc = $('.tin[data-id="' + trich.getAttribute('data-toi') + '"]', cuon);
          if (goc) { goc.scrollIntoView({ block: 'center', behavior: 'smooth' }); goc.classList.add('nhay'); setTimeout(function () { goc.classList.remove('nhay'); }, 1400); }
        };
        var cum = $('[data-cxai]', el);
        if (cum) cum.onclick = function () { aiThaCx(t); };
      });
      if (gan || !cuon._daCuon) { cuon.scrollTop = cuon.scrollHeight; cuon._daCuon = true; }
    }
    function moBangCx(neo, t) {
      // dùng bảng chung của NW.ganCamXuc qua sự kiện giữ — ở đây mở thẳng
      var m = $('#nwCxMenu');
      if (!m) { m = document.createElement('div'); m.id = 'nwCxMenu'; m.className = 'cx-menu'; document.body.appendChild(m); }
      var ht = (t.camXuc || {})[toi.uid] || '';
      m.innerHTML = NW.CAM_XUC.map(function (c) { return '<button type="button" data-ma="' + c.ma + '" data-nh="' + c.nh + '"' + (c.ma === ht ? ' class="dang"' : '') + '>' + NW.cxHtml(c.ma) + '</button>'; }).join('') + (ht ? '<button type="button" class="bo" data-ma="">Gỡ</button>' : '');
      var r = neo.getBoundingClientRect();
      m.style.left = Math.max(8, Math.min(window.innerWidth - 300, r.left - 40)) + 'px';
      m.style.top = (r.top - 58) + 'px';
      m.classList.add('mo');
      function dong() { m.classList.remove('mo'); var ph = $('#nwCxPhu'); if (ph) ph.remove(); }
      $$('button', m).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); thaCamXuc(t, b.getAttribute('data-ma')); dong(); }; });
      if (!$('#nwCxPhu')) { var phu = document.createElement('div'); phu.className = 'phu-nen'; phu.id = 'nwCxPhu'; phu.onclick = dong; document.body.appendChild(phu); }
    }
    async function thaCamXuc(t, ma) {
      t.camXuc = t.camXuc || {};
      if (ma) t.camXuc[toi.uid] = ma; else delete t.camXuc[toi.uid];
      veTin();
      if (NW.laBanThu() || !t.id) return;
      try { var f = await NW.fb(); var patch = {}; patch['camXuc.' + toi.uid] = ma || f.fs.deleteField(); await f.fs.updateDoc(f.fs.doc(f.db, 'nwChats', chon, 'tin', t.id), patch); }
      catch (e) { NW.toast(NW.chuLoiKho(e), true); }
    }
    function aiThaCx(t) {
      var cx = t.camXuc || {}, p = nguoiHienTai || {};
      NW.popMo({ tieuDe: 'Cảm xúc', html: '<div class="ds-nguoi">' + Object.keys(cx).map(function (u) {
        var n = u === toi.uid ? toi : ((p.tv || {})[u] || { ten: u });
        return '<div class="nguoi">' + NW.avHtml(n, 'nho') + '<span><span class="ten">' + an(n.ten) + '</span></span><span class="cuoi">' + NW.cxHtml(cx[u], 'to') + '</span></div>';
      }).join('') + '</div>' });
    }
    function menuTin(nut, t) {
      var items = [];
      if (t.chu) items.push({ ic: IC.link, chu: 'Sao chép chữ', onclick: function () { try { navigator.clipboard.writeText(t.chu); NW.toast('Đã sao chép.'); } catch (e) { } } });
      items.push({ ic: IC.traLoi, chu: 'Trả lời', onclick: function () { datTraLoi(t); } });
      if (t.uid === toi.uid || toi.laThay) items.push({ ic: IC.xoa, chu: 'Thu hồi tin', nguy: true, onclick: function () { thuHoi(t); } });
      NW.menuNho(nut, items);
    }
    async function thuHoi(t) {
      if (!(await NW.hoi('Thu hồi tin này?', 'Tin sẽ bị xoá với mọi người trong cuộc trò chuyện.', { ok: 'Thu hồi', nguy: true }))) return;
      TIN = TIN.filter(function (x) { return x !== t; }); veTin();
      if (NW.laBanThu() || !t.id) return;
      try { var f = await NW.fb(); await f.fs.deleteDoc(f.fs.doc(f.db, 'nwChats', chon, 'tin', t.id)); } catch (e) { NW.toast(NW.chuLoiKho(e), true); }
    }

    // ---------- bảng thông tin (cột phải / phủ trên điện thoại) ----------
    function moInfo(p) {
      var anhDs = TIN.filter(function (x) { return x.hinh; }).map(function (x) { return x.hinh; }).reverse();
      var k = p.loai !== 'nhom' ? nguoiKia(p) : null;
      khuInfo.hidden = false; hop.classList.add('mo-info');
      khuInfo.innerHTML = '<div class="tn-info-dau"><button class="nut-tron" data-dong aria-label="Đóng">' + IC.dong + '</button></div>' +
        '<div class="tn-info-ai">' + avPhong(p, 'to') + '<div class="ten">' + an(tenPhong(p)) + (k ? tichNeuThay(k) : '') + '</div><div class="phu">' + an(phuPhong(p)) + '</div>' +
          (k ? '<a class="btn soft nho" href="canhan.html?uid=' + an(k.uid) + '">' + IC.caNhan + 'Trang cá nhân</a>' : '<button class="btn soft nho" type="button" data-tv>' + IC.nhom + 'Thành viên (' + (p.thanhVien || []).length + ')</button>') + '</div>' +
        '<div class="tn-info-muc"><h4>Ảnh đã gửi</h4>' + (anhDs.length ? '<div class="tn-info-anh">' + anhDs.slice(0, 12).map(function (u) { return '<button type="button" data-anh="' + an(u) + '"><img src="' + an(u) + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' : '<div class="tiny">Chưa có ảnh nào.</div>') + '</div>' +
        (p.loai === 'nhom' ? '<div class="tn-info-muc"><h4>Nhóm</h4><div class="tn-info-nut">' +
          ((p.taoBoi === toi.uid || toi.laThay) ? '<button type="button" data-them>' + IC.them + 'Thêm thành viên</button><button type="button" data-doiten>' + IC.sua + 'Đổi tên nhóm</button>' : '') +
          (toi.laThay ? '<button type="button" class="nguy" data-roi>' + IC.thoat + 'Rời nhóm</button>' : '<div class="tiny" style="padding:6px 10px">Nhóm do thầy lập — em ở trong nhóm này.</div>') + '</div></div>' : '');   // v16: HS không rời nhóm
      $('[data-dong]', khuInfo).onclick = dongInfo;
      $$('[data-anh]', khuInfo).forEach(function (b) { b.onclick = function () { NW.xemAnh(b.getAttribute('data-anh'), anhDs); }; });
      var tv = $('[data-tv]', khuInfo); if (tv) tv.onclick = function () { xemThanhVien(p); };
      var th = $('[data-them]', khuInfo); if (th) th.onclick = function () { themThanhVien(p); };
      var dt = $('[data-doiten]', khuInfo); if (dt) dt.onclick = function () { doiTenNhom(p); };
      var roi = $('[data-roi]', khuInfo); if (roi) roi.onclick = function () { roiNhom(p); };
    }
    function dongInfo() { khuInfo.hidden = true; hop.classList.remove('mo-info'); }

    async function moPhong(id, pTruoc) {
      chon = id; veDs(); dongInfo();
      var p = PHONG.filter(function (x) { return x.id === id; })[0] || pTruoc;
      if (!p) return;
      nguoiHienTai = p; TIN = []; hetCu = false; dangTraLoi = null;
      if (dungNghe) { try { dungNghe(); } catch (e) { } dungNghe = null; }
      veKhungPhong(p);
      if (NW.laBanThu()) { TIN = tinMau(p); veTin(); if ((p.chuaDoc || {})[toi.uid]) { p.chuaDoc[toi.uid] = false; p.docLuc = p.docLuc || {}; p.docLuc[toi.uid] = Date.now(); veDs(); } return; }
      var f = await NW.fb();
      var q = f.fs.query(f.fs.collection(f.db, 'nwChats', id, 'tin'), f.fs.orderBy('luc', 'desc'), f.fs.limit(30));
      dungNghe = f.fs.onSnapshot(q, function (snap) {
        if (chon !== id) return;
        var moi = []; snap.forEach(function (d) { moi.push(Object.assign({ id: d.id }, d.data())); });
        moi.reverse();
        var mocDau = moi.length ? moi[0].luc : Infinity;
        var cu = TIN.filter(function (t) { return t.luc < mocDau && t._cu; });
        TIN = cu.concat(moi);
        if (snap.size < 30) hetCu = true;
        veTin(); danhDauDoc(p);
      }, function (e) { $('#tnCuon', khuPhong).innerHTML = '<div class="tn-trong">' + an(NW.chuLoiKho(e)) + '</div>'; });
    }
    async function taiCu() {
      if (!TIN.length) return;
      var f = await NW.fb();
      var q = f.fs.query(f.fs.collection(f.db, 'nwChats', chon, 'tin'), f.fs.orderBy('luc', 'desc'), f.fs.where('luc', '<', TIN[0].luc), f.fs.limit(30));
      var snap = await f.fs.getDocs(q); var ds = [];
      snap.forEach(function (d) { ds.push(Object.assign({ id: d.id, _cu: true }, d.data())); });
      if (ds.length < 30) hetCu = true;
      ds.reverse(); TIN = ds.concat(TIN);
      var cuon = $('#tnCuon', khuPhong); var h = cuon.scrollHeight;
      veTin(); cuon.scrollTop = cuon.scrollHeight - h;
    }
    async function danhDauDoc(p) {
      if (!chuaDoc(p) && (p.docLuc || {})[toi.uid]) return;
      if ((p.chuaDoc || {})[toi.uid]) { p.chuaDoc[toi.uid] = false; veDs(); }
      Chat.danhDauDoc(p.id);
    }
    async function guiTin(p, tin) {
      if (dangTraLoi) { tin.traLoi = { id: dangTraLoi.id || '', uid: dangTraLoi.uid, ten: dangTraLoi.ten, chu: (dangTraLoi.chu || '').slice(0, 120), hinh: dangTraLoi.hinh || '' }; }
      var t = await Chat.guiTin(p.id, tin);
      if (!t) return;
      datTraLoi(null);
      if (NW.laBanThu()) { t.id = 'm' + Date.now(); TIN.push(t); veTin(); }
    }

    // ---------- menu phòng ----------
    function menuPhong(nut, p) {
      var items = [];
      if (p.loai === 'nhom') {
        items.push({ ic: IC.nhom, chu: 'Thành viên (' + (p.thanhVien || []).length + ')', onclick: function () { xemThanhVien(p); } });
        if (p.taoBoi === toi.uid || toi.laThay) {
          items.push({ ic: IC.them, chu: 'Thêm thành viên', onclick: function () { themThanhVien(p); } });
          items.push({ ic: IC.sua, chu: 'Đổi tên nhóm', onclick: function () { doiTenNhom(p); } });
        }
        if (toi.laThay) items.push({ ic: IC.thoat, chu: 'Rời nhóm', nguy: true, onclick: function () { roiNhom(p); } });   // v16: HS không rời nhóm
      } else {
        var k = (p.thanhVien || []).filter(function (u) { return u !== toi.uid; })[0];
        items.push({ ic: IC.caNhan, chu: 'Xem trang cá nhân', onclick: function () { NW.di('canhan.html?uid=' + k); } });
      }
      NW.menuNho(nut, items);
    }
    function xemThanhVien(p) {
      NW.popMo({ tieuDe: 'Thành viên nhóm', html: '<div class="ds-nguoi">' + (p.thanhVien || []).map(function (u) {
        var t = (p.tv || {})[u] || { ten: '?' };
        return '<a class="nguoi" href="canhan.html?uid=' + an(u) + '">' + NW.avHtml(t, 'nho') + '<span><span class="ten">' + an(t.ten) + '</span><br><span class="lop">' + an(t.lop || '') + (u === p.taoBoi ? ' · người tạo' : '') + '</span></span></a>';
      }).join('') + '</div>' });
    }
    async function themThanhVien(p) {
      var ds = (await Chat.nguoiNhanDuoc()).filter(function (n) { return (p.thanhVien || []).indexOf(n.uid) < 0; });
      chonNguoi('Thêm vào nhóm', ds, true, async function (chonDs) {
        if (!chonDs.length) return;
        if ((p.thanhVien || []).length + chonDs.length > CFG.TOI_DA_THANH_VIEN_NHOM) { NW.toast('Nhóm tối đa ' + CFG.TOI_DA_THANH_VIEN_NHOM + ' người.', true); return; }
        if (NW.laBanThu()) return;
        try {
          var f = await NW.fb(); var patch = { thanhVien: f.fs.arrayUnion.apply(null, chonDs.map(function (n) { return n.uid; })) };
          chonDs.forEach(function (n) { patch['tv.' + n.uid] = NW.tomTat(n); });
          await f.fs.updateDoc(f.fs.doc(f.db, 'nwChats', p.id), patch);
          chonDs.forEach(function (n) { NW.guiThongBao(n.uid, { loai: 'nhom', chu: p.ten || 'Nhóm', link: 'tinnhan.html?phong=' + p.id }); });
          NW.toast('Đã thêm ' + chonDs.length + ' bạn.');
        } catch (e) { NW.toast(NW.chuLoiKho(e), true); }
      });
    }
    function doiTenNhom(p) {
      var pop = NW.popMo({ tieuDe: 'Đổi tên nhóm', html: '<input type="text" id="tenNhom" maxlength="60" value="' + an(p.ten || '') + '">',
        chan: '<button class="btn soft" data-dong>Thôi</button><button class="btn primary" id="tenOk">Lưu</button>' });
      $('[data-dong]', pop).onclick = NW.popDong;
      $('#tenOk', pop).onclick = async function () {
        var ten = $('#tenNhom', pop).value.trim(); if (!ten) return;
        NW.popDong(); if (NW.laBanThu()) return;
        try { var f = await NW.fb(); await f.fs.updateDoc(f.fs.doc(f.db, 'nwChats', p.id), { ten: ten }); } catch (e) { NW.toast(NW.chuLoiKho(e), true); }
      };
    }
    async function roiNhom(p) {
      if (!(await NW.hoi('Rời nhóm?', 'Em sẽ không nhận tin của nhóm này nữa.', { ok: 'Rời nhóm', nguy: true }))) return;
      if (NW.laBanThu()) return;
      try {
        var f = await NW.fb(); var patch = { thanhVien: f.fs.arrayRemove(toi.uid) }; patch['tv.' + toi.uid] = f.fs.deleteField();
        await f.fs.updateDoc(f.fs.doc(f.db, 'nwChats', p.id), patch);
        hop.classList.remove('mo-phong'); chon = ''; khuPhong.innerHTML = '<div class="tn-trong">Đã rời nhóm.</div>';
      } catch (e) { NW.toast(NW.chuLoiKho(e), true); }
    }

    // ---------- chọn người (nhắn mới / tạo nhóm) ----------
    function chonNguoi(tieuDe, ds, nhieu, xong, themHtml) {
      var pop = NW.popMo({ tieuDe: tieuDe, html: (themHtml || '') +
        '<div class="tim-o">' + IC.timKiem + '<input type="search" id="cnTim" placeholder="Tìm theo tên…"></div>' +
        '<div class="chon-nguoi" id="cnDs"></div>',
        chan: nhieu ? '<button class="btn soft" data-dong>Thôi</button><button class="btn primary" id="cnOk">Xong</button>' : '' });
      var khu = $('#cnDs', pop), tim = $('#cnTim', pop);
      var daChon = {};
      function ve() {
        var q = NW.khongDau(tim.value);
        var loc = ds.filter(function (n) { return !q || NW.khongDau(n.ten).indexOf(q) >= 0; });
        khu.innerHTML = loc.length ? loc.map(function (n) {
          return '<label>' + (nhieu ? '<input type="checkbox" data-uid="' + an(n.uid) + '"' + (daChon[n.uid] ? ' checked' : '') + '>' : '') +
            NW.avHtml(n, 'nho') + '<span class="ten">' + an(n.ten) + '</span><span class="lop">' + an(n.vaiTro === 'gv' ? 'THẦY' : (n.lop || '')) + '</span></label>';
        }).join('') : '<div class="trong">Không thấy ai.</div>';
        if (nhieu) $$('input[type=checkbox]', khu).forEach(function (c) { c.onchange = function () { daChon[c.getAttribute('data-uid')] = c.checked; }; });
        else $$('label', khu).forEach(function (l, i) { l.onclick = function () { NW.popDong(); xong([loc[i]]); }; });
      }
      tim.oninput = ve; ve();
      if (nhieu) { $('[data-dong]', pop).onclick = NW.popDong; $('#cnOk', pop).onclick = function () { NW.popDong(); xong(ds.filter(function (n) { return daChon[n.uid]; })); }; }
      return pop;
    }
    $('#tnMoi', hop).onclick = async function () {
      var ds = await Chat.nguoiNhanDuoc();
      chonNguoi('Nhắn tin cho ai?', ds, false, async function (c) {
        var n = c[0]; if (!n) return;
        try { var id = await Chat.moRieng(n); var pMoi = { id: id, loai: 'rieng', thanhVien: [toi.uid, n.uid], tv: {}, tinCuoi: null, docLuc: {} }; pMoi.tv[n.uid] = NW.tomTat(n); pMoi.tv[toi.uid] = NW.tomTat(toi); moPhong(id, pMoi); }
        catch (e) { NW.toast(NW.chuLoiKho(e), true); }
      });
    };
    if ($('#tnNhom', hop)) $('#tnNhom', hop).onclick = async function () {
      var ds = await Chat.nguoiNhanDuoc();
      var pop = chonNguoi('Tạo nhóm chat', ds, true, async function (chonDs) {
        var ten = ($('#nhomTen') ? $('#nhomTen').value.trim() : '') || tenTam;
        if (!chonDs.length) { NW.toast('Chọn ít nhất một bạn.', true); return; }
        if (chonDs.length + 1 > CFG.TOI_DA_THANH_VIEN_NHOM) { NW.toast('Nhóm tối đa ' + CFG.TOI_DA_THANH_VIEN_NHOM + ' người.', true); return; }
        if (NW.laBanThu()) { NW.toast('Bàn thử: không ghi thật.'); return; }
        try {
          var f = await NW.fb();
          var tv = {}; tv[toi.uid] = NW.tomTat(toi); chonDs.forEach(function (n) { tv[n.uid] = NW.tomTat(n); });
          var doc = { loai: 'nhom', ten: ten, thanhVien: [toi.uid].concat(chonDs.map(function (n) { return n.uid; })), tv: tv, taoBoi: toi.uid,
                      luc: Date.now(), capNhat: Date.now(), tinCuoi: null, docLuc: {} };
          var ref = await f.fs.addDoc(f.fs.collection(f.db, 'nwChats'), doc);
          chonDs.forEach(function (n) { NW.guiThongBao(n.uid, { loai: 'nhom', chu: ten, link: 'tinnhan.html?phong=' + ref.id }); });
          moPhong(ref.id, Object.assign({ id: ref.id }, doc));
        } catch (e) { NW.toast(NW.chuLoiKho(e), true); }
      }, '<label class="lbl">Tên nhóm</label><input type="text" id="nhomTen" maxlength="60" placeholder="VD: Nhóm ôn WORDS lớp A1C" style="margin-bottom:12px">');
      var tenTam = 'Nhóm của ' + toi.ten;
    };

    // ---------- nhận danh sách phòng từ kênh chung ----------
    var lanDau = true;
    NW.nghePhong(function (ds) {
      PHONG = ds;
      if (chon) { var p = ds.filter(function (x) { return x.id === chon; })[0]; if (p) { nguoiHienTai = p; var ten = $('.tn-phong-dau .ten', khuPhong); if (ten) ten.textContent = tenPhong(p); veTin(); } }
      veDs();
      if (lanDau) {
        lanDau = false;
        var voi = NW.thamSo('voi'), phong = NW.thamSo('phong');
        if (phong) moPhong(phong);
        else if (voi) NW.hoSo(voi).then(function (hs) { if (hs) return Chat.moRieng(Object.assign({ uid: voi }, hs)).then(function (id) { var pMoi = { id: id, loai: 'rieng', thanhVien: [toi.uid, voi], tv: {}, tinCuoi: null, docLuc: {} }; pMoi.tv[voi] = NW.tomTat(Object.assign({ uid: voi }, hs)); moPhong(id, pMoi); }); }).catch(function (e) { NW.toast(NW.chuLoiKho(e), true); });
      }
    });

    // ---------- dữ liệu mẫu bàn thử ----------
    function tinMau(p) {
      var t = Date.now(), H = 3600e3;
      function anhMau(chu, m1, m2, w, h) {
        var sv = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + m1 + '"/><stop offset="1" stop-color="' + m2 + '"/></linearGradient></defs><rect width="' + w + '" height="' + h + '" fill="url(#g)"/><text x="' + (w / 2) + '" y="' + (h / 2 + 12) + '" font-family="Montserrat,Arial" font-size="' + Math.round(Math.min(w, h) * .12) + '" font-weight="800" fill="rgba(255,255,255,.9)" text-anchor="middle">' + chu + '</text></svg>';
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sv);
      }
      if (p.id === 'hs_0__hs_1') return [
        { id: 'a1', uid: 'hs_1', ten: 'MINH ANH', chu: 'Chào bạn! Bài WORDS 2 bạn làm chưa?', luc: t - 26 * H },
        { id: 'a2', uid: toi.uid, ten: toi.ten, chu: 'Mình làm rồi, dễ lắm 😄', luc: t - 25.9 * H },
        { id: 'a3', uid: toi.uid, ten: toi.ten, chu: 'Câu 7 hơi khó thôi', luc: t - 25.88 * H, camXuc: { hs_1: 'haha' } },
        { id: 'a4', uid: 'hs_1', ten: 'MINH ANH', chu: 'Câu 7 là "although" đúng không? 🤔', luc: t - 25.5 * H, traLoi: { id: 'a3', uid: toi.uid, ten: toi.ten, chu: 'Câu 7 hơi khó thôi' } },
        { id: 'a5', uid: toi.uid, ten: toi.ten, chu: 'Đúng rồi 👍', luc: t - 25.4 * H },
        { id: 'a6', uid: 'hs_1', ten: 'MINH ANH', chu: '', hinh: anhMau('WORDS 2 · 100%', '#0E7C6E', '#5CC9B6', 900, 1200), luc: t - 3 * H },
        { id: 'a7', uid: 'hs_1', ten: 'MINH ANH', chu: 'Xong rồi nè 🎉', luc: t - 3 * H + 20e3, camXuc: { hs_0: 'tim' } },
        { id: 'a8', uid: toi.uid, ten: toi.ten, chu: 'Giỏi quá! Tối nay ôn Listening cùng không?', luc: t - 2.5 * H, camXuc: { hs_1: 'tim' } },
        { id: 'a9', uid: 'hs_1', ten: 'MINH ANH', chu: 'Ok 8h nha, mình gửi link Zoom sau', luc: t - 2.4 * H, traLoi: { id: 'a8', uid: toi.uid, ten: toi.ten, chu: 'Giỏi quá! Tối nay ôn Listening cùng không?' } },
        { id: 'a10', uid: 'hs_1', ten: 'MINH ANH', chu: '', hinh: anhMau('LỊCH ÔN', '#3E7BFA', '#8BB4FF', 1200, 800), luc: t - 2.39 * H },
        { id: 'a11', uid: toi.uid, ten: toi.ten, chu: '❤️', luc: t - 200e3 }
      ];
      if (p.id === 'n0') return [
        { id: 'e1', uid: 'gv', ten: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg', chu: 'Chào cả lớp! Đây là nhóm chat của lớp A1C, thầy thông báo bài tập và lịch học ở đây nhé.', luc: t - 50 * H },
        { id: 'e2', uid: 'hs_1', ten: 'MINH ANH', chu: 'Dạ vâng ạ 🙌', luc: t - 49 * H, camXuc: { gv: 'like' } },
        { id: 'e3', uid: 'gv', ten: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg', chu: 'Tuần sau kiểm tra WORDS 3 nhé cả lớp', luc: t - 30 * H, camXuc: { hs_1: 'tim', hs_2: 'khoc', hs_5: 'ngac' } }
      ];
      if (p.id === 'n1') return [
        { id: 'b1', uid: 'hs_2', ten: 'BẢO NAM', chu: 'Mai thi nha mọi người', luc: t - 5000e3 },
        { id: 'b2', uid: 'hs_1', ten: 'MINH ANH', chu: 'Ai có đề cũ không?', luc: t - 4900e3 },
        { id: 'b3', uid: toi.uid, ten: toi.ten, chu: 'Mình có nè', luc: t - 4800e3, camXuc: { hs_1: 'tim', hs_2: 'like' } },
        { id: 'b4', uid: toi.uid, ten: toi.ten, chu: '', hinh: anhMau('ĐỀ CŨ', '#F2A93B', '#FFD27A', 1200, 900), luc: t - 4790e3 },
        { id: 'b5', uid: 'hs_5', ten: 'THẢO VY', chu: 'Cảm ơn nha 🙏', luc: t - 4700e3, traLoi: { id: 'b4', uid: toi.uid, ten: toi.ten, chu: '', hinh: 'x' } }
      ];
      if (p.id === 'hs_0__gv') return [
        { id: 'c1', uid: 'gv', ten: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg', chu: 'Em nhớ nộp Worksheet 3 trước tối mai nhé.', luc: t - 7 * H },
        { id: 'c2', uid: toi.uid, ten: toi.ten, chu: 'Dạ em nộp rồi ạ, thầy xem giúp em 🙏', luc: t - 6.9 * H },
        { id: 'c3', uid: 'gv', ten: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg', chu: 'Thầy thấy rồi, tốt lắm 👍', luc: t - 6.8 * H, camXuc: { hs_0: 'tim' } }
      ];
      return [{ id: 'd1', uid: 'hs_5', ten: 'THẢO VY', chu: 'Bạn ơi cho mình mượn vở nha', luc: t - 30 * H }];
    }
    if (NW.laBanThu()) {
      var t0 = Date.now();
      PHONG = [
        { id: 'hs_0__hs_1', loai: 'rieng', thanhVien: ['hs_0', 'hs_1'], tv: { hs_1: { uid: 'hs_1', ten: 'MINH ANH', lop: 'A1C', vaiTro: 'hs', online: true } }, capNhat: t0 - 200e3, tinCuoi: { chu: '❤️', uid: 'hs_0', luc: t0 - 200e3 }, docLuc: { hs_1: t0 - 100e3, hs_0: t0 } },
        { id: 'n0', loai: 'nhom', ten: 'LỚP A1C', thanhVien: ['gv', 'hs_0', 'hs_1', 'hs_2', 'hs_5', 'hs_6', 'hs_7'], tv: { gv: { uid: 'gv', ten: 'Thầy Andrew', vaiTro: 'gv', anh: 'assets/avatar-tron.jpg' }, hs_1: { uid: 'hs_1', ten: 'MINH ANH' }, hs_2: { uid: 'hs_2', ten: 'BẢO NAM' }, hs_5: { uid: 'hs_5', ten: 'THẢO VY' }, hs_6: { uid: 'hs_6', ten: 'GIA HUY' }, hs_7: { uid: 'hs_7', ten: 'KHÁNH LINH' } }, taoBoi: 'gv', capNhat: t0 - 30 * 3600e3, tinCuoi: { chu: 'Tuần sau kiểm tra WORDS 3 nhé cả lớp', uid: 'gv', ten: 'Thầy Andrew', luc: t0 - 30 * 3600e3 }, docLuc: { hs_0: t0 } },
        { id: 'n1', loai: 'nhom', ten: 'Nhóm ôn WORDS A1C', thanhVien: ['gv', 'hs_0', 'hs_1', 'hs_2', 'hs_5'], tv: { gv: { uid: 'gv', ten: 'Thầy Andrew', vaiTro: 'gv', anh: 'assets/avatar-tron.jpg' }, hs_1: { uid: 'hs_1', ten: 'MINH ANH', online: true }, hs_2: { uid: 'hs_2', ten: 'BẢO NAM' }, hs_5: { uid: 'hs_5', ten: 'THẢO VY' } }, taoBoi: 'gv', capNhat: t0 - 4700e3, tinCuoi: { chu: 'Cảm ơn nha 🙏', uid: 'hs_5', ten: 'THẢO VY', luc: t0 - 4700e3 }, docLuc: { hs_0: t0 - 4000e3, hs_1: t0 - 4600e3, hs_2: t0 - 4750e3 }, tat: { hs_0: true } },
        { id: 'hs_0__gv', loai: 'rieng', thanhVien: ['hs_0', 'gv'], tv: { gv: { uid: 'gv', ten: 'Thầy Andrew', vaiTro: 'gv', anh: 'assets/avatar-tron.jpg' } }, capNhat: t0 - 6.8 * 3600e3, tinCuoi: { chu: 'Thầy thấy rồi, tốt lắm 👍', uid: 'gv', luc: t0 - 6.8 * 3600e3 }, docLuc: { hs_0: t0, gv: t0 } },
        { id: 'hs_0__hs_5', loai: 'rieng', thanhVien: ['hs_0', 'hs_5'], tv: { hs_5: { uid: 'hs_5', ten: 'THẢO VY', lop: 'A1C', vaiTro: 'hs' } }, capNhat: t0 - 30 * 3600e3, tinCuoi: { chu: 'Bạn ơi cho mình mượn vở nha', uid: 'hs_5', luc: t0 - 30 * 3600e3 }, docLuc: {} }
      ];
      veDs();
      if (window.innerWidth > 640) moPhong('hs_0__hs_1');
    }
  };
})();
