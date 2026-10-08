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
  // ⭐ 02/10/2026 (web v1.225.0) cùng khuôn CO_LINK của chat lớp (js/chat.js) + luật kho nwCoLink
  var CO_LINK = /(https?:|:\/\/|www\.|discord|t\.me\/|\.(com|vn|net|org|io|me|app|gg|ly|xyz|top|site|online|tv|cc|info|edu)([\/?#:]|\s|$))/;

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
  // ⭐ 03/10/2026 (thầy phát hiện danh sách thầy đầy cuộc "Bắt đầu trò chuyện" rỗng: 42/45 phòng chưa có tin nào — em chỉ BẤM mở "Thầy Andrew" là
  //   phòng đã được tạo): nay phòng riêng CHỈ ĐƯỢC TẠO LÚC GỬI TIN ĐẦU TIÊN. Mở xem = giữ phòng "chờ" trong RAM (Chat._cho), chưa ghi gì lên kho.
  //   o.tao === true ⇒ tạo ngay (chặn/bỏ chặn cần phòng thật). Tạo xong gọi các hàm đăng ký ở Chat.ngheKhiTao để gắn kênh nghe tin.
  Chat._cho = {}; Chat._khiTao = [];
  Chat.dangCho = function (id) { return !!Chat._cho[id]; };
  Chat.ngheKhiTao = function (fn) { Chat._khiTao.push(fn); };
  Chat.moRieng = async function (nguoi, o) {
    var toi = NW.toi; var id = Chat.maRieng(toi.uid, nguoi.uid);
    if (NW.laBanThu()) return id;
    var f = await NW.fb();
    var ref = f.fs.doc(f.db, 'nwChats', id);
    var snap = await NW.docPhongRieng(f, ref);   // 02/10: phòng chưa có ⇒ kho từ chối đọc ⇒ coi như chưa có (xem loi.js)
    if (!snap.exists()) {
      var tv = {}; tv[toi.uid] = NW.tomTat(toi); tv[nguoi.uid] = NW.tomTat(nguoi);
      var doc = { loai: 'rieng', ten: '', thanhVien: [toi.uid, nguoi.uid].sort(), tv: tv, taoBoi: toi.uid, luc: Date.now(), capNhat: Date.now(), tinCuoi: null, docLuc: {} };
      if (o && o.tao) await f.fs.setDoc(ref, doc);
      else Chat._cho[id] = { ref: ref, doc: doc };
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
    // ⭐ 02/10/2026 (web v1.225.0) học sinh KHÔNG gửi link trong Tin nhắn (y chat lớp; luật kho cũng chặn — báo trước cho dễ hiểu)
    if (!toi.laThay && tin.chu && CO_LINK.test(String(tin.chu).toLowerCase())) { NW.toast('Tin nhắn không được chứa đường link.', true); return null; }
    var t = { uid: toi.uid, ten: toi.ten, anh: toi.anh || '', chu: String(tin.chu || '').slice(0, CFG.TOI_DA_CHU_TIN), hinh: tin.hinh || '', luc: Date.now() };
    // ⭐ web v1.198.0 — khuôn chat Zalo: trước đây `traLoi` bị RƠI ở đây (tin trả lời mất phần trích); nay giữ + thêm sticker
    if (tin.traLoi) t.traLoi = tin.traLoi;
    if (tin.sticker) t.sticker = tin.sticker;
    if (NW.laBanThu()) return t;
    try {
      var f = await NW.fb();
      var moiTao = false, cho = Chat._cho[phongId];
      if (cho) {   // phòng chờ: tạo NGAY BÂY GIỜ (kiểm lại một lần — bên kia có thể đã tạo trong lúc em soạn; tránh ghi đè phòng thật)
        var co = await NW.docPhongRieng(f, cho.ref);
        if (!co.exists()) { cho.doc.luc = cho.doc.capNhat = Date.now(); await f.fs.setDoc(cho.ref, cho.doc); }
        delete Chat._cho[phongId]; moiTao = true;
      }
      var refTinMoi = await f.fs.addDoc(f.fs.collection(f.db, 'nwChats', phongId, 'tin'), t);
      t.id = refTinMoi.id;   // v1.224.0 — cần id tin cho link thông báo nhắc tên
      var docDuoc = window.ChatUI ? ChatUI.chuThuong(ChatUI.tomTat(t)) : t.chu;
      var patch = { tinCuoi: { chu: t.hinh && !t.chu ? '' : String(docDuoc || '').slice(0, 80), hinh: !!t.hinh, uid: toi.uid, ten: toi.ten, luc: t.luc }, capNhat: t.luc };
      patch['docLuc.' + toi.uid] = t.luc;
      await f.fs.updateDoc(f.fs.doc(f.db, 'nwChats', phongId), patch);
      if (moiTao) Chat._khiTao.slice().forEach(function (fn) { try { fn(phongId); } catch (e) { } });
      return t;
    } catch (e) { NW.toast(NW.chuLoiKho(e), true); return null; }
  };

  // ============================================================
  // ⭐ web v1.198.0 (30/09/2026) — thầy chốt: tin nhắn myNetwork DÙNG CHUNG khuôn chat kiểu Zalo (../js/chat-ui.js) với chat lớp:
  //   emoji 3D · sticker · 6 cảm xúc thả nhiều lần (tối đa 10/loại, ô `cx.<uid>` = {ten, luc, n, l}) · trả lời · thu hồi GIỮ CHỖ.
  //   Cảm xúc cũ (`camXuc{uid: mã}` 7 loại) thầy chốt BỎ — không đọc nữa.
  //   Dùng chung cho trang Tin nhắn (Chat.dung) + hộp chat nổi (chatnoi.js).
  // ============================================================
  // Tin kho ⇒ tin khuôn. p = phòng (lấy tv để biết ai là thầy / ảnh đại diện).
  Chat.doiTin = function (t, p) {
    var tv = (p && p.tv) || {}, n = tv[t.uid] || {};
    var laGv = n.vaiTro === 'gv' || (t.uid === NW.toi.uid && NW.toi.laThay);
    var chu = t.chu === '❤️' ? ':2764:' : (t.chu || '');     // tin "gửi tim" kiểu cũ ⇒ tim 3D to
    return {
      id: t.id, uid: t.uid, ma: t.uid, ten: t.ten || n.ten || '?', anh: t.anh || n.anh || '', vaiTro: laGv ? 'gv' : 'hs',
      chu: chu, hinh: t.hinh || '', luc: t.luc || 0, cx: t.cx || {}, sticker: t.sticker || '', thuHoi: !!t.thuHoi,
      q: t.traLoi && t.traLoi.id ? { id: t.traLoi.id, ten: t.traLoi.uid === NW.toi.uid ? 'Em' : (t.traLoi.ten || ''), chu: String(t.traLoi.chu || '').slice(0, 120) || (t.traLoi.hinh ? '📷 Ảnh' : '') } : null
    };
  };
  // "Đã xem": mỗi người khác hiện avatar nhỏ dưới tin CUỐI mà họ đã đọc tới (docLuc >= luc). Trả {idTin: [uid]}.
  Chat.daXemO = function (TIN, p) {
    var o = {}, dl = (p && p.docLuc) || {};
    ((p && p.thanhVien) || []).forEach(function (u) {
      if (u === NW.toi.uid) return;
      for (var i = TIN.length - 1; i >= 0; i--) { if (dl[u] >= TIN[i].luc && TIN[i].uid !== u) { (o[TIN[i].id] = o[TIN[i].id] || []).push(u); break; } }
    });
    return o;
  };
  // Dựng khuôn cho một khung. c = { khung, chan, idNhap, phong(): p, tin(): [tin kho], datTin(ds) (bàn thử), dau(): html đầu khung,
  //                                 xemAnh?(url), nhoGoi? (hộp nổi: ẩn tên) }
  Chat.taoKhuon = function (c) {
    var toi = NW.toi;
    function tinGoc(id) { return c.tin().filter(function (x) { return x.id === id; })[0]; }
    function refTin(f, id) { return f.fs.doc(f.db, 'nwChats', c.phong().id, 'tin', id); }
    function loiKho(e) { NW.toast(typeof e === 'string' ? e : NW.chuLoiKho(e), !(typeof e === 'string' && /^Đã /.test(e))); }
    var daXem = {};
    var UI = ChatUI.tao({
      khung: c.khung, chan: c.chan, idNhap: c.idNhap,
      toi: { get khoa() { return toi.uid; }, get ten() { return toi.ten; } },
      laThay: !!toi.laThay,
      get hienTen() { return (c.phong() || {}).loai === 'nhom'; },   // chat 1-1: không in tên trên bong bóng
      laCuaToi: function (t) { return t.uid === toi.uid; },
      av: function (t) { return NW.avHtml({ ten: t.ten, anh: t.anh, vaiTro: t.vaiTro }, 'nho'); },
      nhan: function (t) { return t.vaiTro === 'gv' ? NW.tichHtml('nho') : ''; },
      dsNhac: function () { var tv = (c.phong() || {}).tv || {}; return Object.keys(tv).filter(function (u) { return u !== toi.uid; }).map(function (u) { return tv[u].ten; }).filter(Boolean); },
      gui: function (g) {
        var tin = { chu: g.chu || '', hinh: g.hinh || '' };
        if (g.sticker) tin.sticker = g.sticker;
        // ⭐ 02/10/2026 (web v1.225.0, chống trích dẫn giả) luật kho đối chiếu trích dẫn với TIN GỐC THẬT (uid + tên + chữ + ảnh) ⇒ gửi ĐỦ chữ tin gốc
        if (g.q && g.q.id) { var goc = tinGoc(g.q.id) || {}; tin.traLoi = { id: g.q.id, uid: goc.uid || '', ten: goc.ten || g.q.ten || '', chu: goc.uid ? String(goc.chu || '') : String(g.q.chu || '').slice(0, 120), hinh: goc.hinh || '' }; }
        if (!NW.laBanThu() && !(c.phong() || {}).id) return Promise.reject('Đang mở phòng chat, em thử lại nhé.');
        return Chat.guiTin(c.phong().id, tin).then(function (t) {
          if (!t) throw '__im';                                   // từ cấm / lỗi đã báo ⇒ giữ nguyên chữ trong ô nhập
          if (!NW.laBanThu() && window.NhacTB && t.id) { try { NhacTB.sauGuiPhong(c.phong(), t, !!toi.laThay); } catch (x) { } }   // v1.224.0 @nhắc tên
          if (NW.laBanThu()) { t.id = 'm' + Date.now(); c.datTin(c.tin().concat([t])); }
        });
      },
      // ⭐ 02/10/2026 thầy chốt: CHỈ THẦY gửi ảnh (HS không có nút ảnh / Ctrl+V / kéo thả)
      guiAnh: !toi.laThay ? null : function (file) {
        return NW.nenAnh(file, { canhDai: 1280 }).then(function (blob) { return NW.laBanThu() ? URL.createObjectURL(blob) : NW.taiAnh(blob, NW.tenAnhMoi('_t')); });
      },
      xemAnh: function (url) { NW.xemAnh(url, c.tin().filter(function (x) { return x.hinh && !x.thuHoi; }).map(function (x) { return x.hinh; })); },
      datCx: function (t, gt) {
        if (NW.laBanThu()) { var g = tinGoc(t.id); if (g) { g.cx = Object.assign({}, g.cx || {}); if (gt) g.cx[toi.uid] = gt; else delete g.cx[toi.uid]; } return Promise.resolve(); }
        return NW.fb().then(function (f) { var patch = {}; patch['cx.' + toi.uid] = gt || f.fs.deleteField(); return f.fs.updateDoc(refTin(f, t.id), patch); });
      },
      // THU HỒI GIỮ CHỖ (thầy chốt 30/09): tin còn ô, xoá sạch chữ/ảnh/trích/sticker/cảm xúc. CHỈ người gửi (học sinh).
      // ⭐ 02/10/2026 (thầy chốt, y chat lớp v1.206.0): CÙNG MỘT LƯỢT GHI cất BẢN CHÉP `nwChats/{id}/thuHoi/{mid}` (chỉ thầy đọc —
      // luật đối chiếu từng trường với tin gốc). Kho từ chối bản chép ⇒ vẫn thu hồi như cũ. THẦY không thu hồi — chỉ XOÁ HẲN (dưới).
      thuHoi: toi.laThay ? null : function (t) {
        var p = c.phong();
        if (NW.laBanThu()) { var g = tinGoc(t.id); if (g) { g._goc = { chu: g.chu, hinh: g.hinh, traLoi: g.traLoi, sticker: g.sticker }; g.thuHoi = true; g.chu = ''; g.hinh = ''; g.cx = {}; delete g.traLoi; delete g.sticker; c.datTin(c.tin()); } return Promise.resolve(); }
        return NW.fb().then(function (f) {
          var ref = refTin(f, t.id);
          var lenh = { thuHoi: true, chu: '', hinh: '', cx: {}, traLoi: f.fs.deleteField(), sticker: f.fs.deleteField(), camXuc: f.fs.deleteField() };
          var thuTron = function () { return f.fs.updateDoc(ref, lenh); };
          return f.fs.getDoc(ref).then(function (s) {
            var x = s.exists() ? (s.data() || {}) : null;
            if (!x || x.thuHoi === true) return thuTron();
            var chep = { uid: x.uid || '', ten: x.ten || '', chu: x.chu || '', hinh: x.hinh || '', luc: Date.now() };
            if (x.traLoi != null) chep.traLoi = x.traLoi;
            if (x.sticker != null) chep.sticker = x.sticker;
            var b = f.fs.writeBatch(f.db);
            b.set(f.fs.doc(f.db, 'nwChats', p.id, 'thuHoi', t.id), chep);
            b.update(ref, lenh);
            return b.commit()['catch'](function (e) {
              if (String((e && (e.code || e.message)) || '').indexOf('permission-denied') < 0) throw e;
              return thuTron();
            });
          }, function () { return thuTron(); }).then(function () {
            if (p && p.tinCuoi && p.tinCuoi.luc === t.luc) return f.fs.updateDoc(f.fs.doc(f.db, 'nwChats', p.id), { tinCuoi: Object.assign({}, p.tinCuoi, { chu: 'Tin nhắn đã bị thu hồi', hinh: false }) }).catch(function () {});
          });
        });
      },
      // ⭐ 02/10 — THẦY đọc nội dung tin em đã thu hồi (bản chép), hiện ngay dưới "Tin nhắn đã bị thu hồi" (khuôn chat-ui o.docThuHoi).
      docThuHoi: !toi.laThay ? null : function (t) {
        var doi = function (x) {
          if (!x) return null;
          var q = x.traLoi && x.traLoi.id ? { id: x.traLoi.id, ten: x.traLoi.ten || '', chu: x.traLoi.chu || (x.traLoi.hinh ? '📷 Ảnh' : '') } : null;
          return { chu: x.chu === '❤️' ? ':2764:' : (x.chu || ''), q: q, sticker: x.sticker || '', hinh: x.hinh || '' };
        };
        if (NW.laBanThu()) { var g = tinGoc(t.id); return Promise.resolve(doi(g && g._goc)); }
        var p = c.phong();
        if (!p || !p.id) return Promise.resolve(null);
        return NW.fb().then(function (f) { return f.fs.getDoc(f.fs.doc(f.db, 'nwChats', p.id, 'thuHoi', t.id)); })
          .then(function (s) { return s.exists() ? doi(s.data()) : null; });
      },
      // THẦY XOÁ HẲN: tin biến mất (không để dòng "đã thu hồi"), xoá luôn bản chép; tin cuối danh sách ⇒ lùi về tin trước đó.
      xoa: toi.laThay ? function (t) {
        if (NW.laBanThu()) { c.datTin(c.tin().filter(function (x) { return x.id !== t.id; })); return Promise.resolve(); }
        var p = c.phong();
        return NW.fb().then(function (f) {
          return f.fs.deleteDoc(refTin(f, t.id)).then(function () {
            f.fs.deleteDoc(f.fs.doc(f.db, 'nwChats', p.id, 'thuHoi', t.id))['catch'](function () {});
            if (!(p && p.tinCuoi && p.tinCuoi.luc === t.luc)) return;
            var con = c.tin().filter(function (x) { return x.id !== t.id; });
            var tr = con[con.length - 1];
            var tc = tr ? { chu: tr.thuHoi ? 'Tin nhắn đã bị thu hồi' : String((window.ChatUI ? ChatUI.chuThuong(ChatUI.tomTat(tr)) : tr.chu) || '').slice(0, 80), hinh: !!(tr.hinh && !tr.thuHoi), uid: tr.uid, ten: tr.ten, luc: tr.luc } : null;
            return f.fs.updateDoc(f.fs.doc(f.db, 'nwChats', p.id), { tinCuoi: tc }).catch(function () {});
          });
        });
      } : null,
      sauTin: function (t) {
        var ds = daXem[t.id]; if (!ds || !ds.length) return '';
        var tv = (c.phong() || {}).tv || {};
        return '<div class="cu-daxem" title="Đã xem">' + ds.map(function (u) { return NW.avHtml(tv[u] || { ten: '?' }, 'nho'); }).join('') + '</div>';
      },
      loi: function (e) { if (e === '__im') return; loiKho(e); },
      trong: 'Chưa có tin nào. Nhắn câu đầu tiên đi!'
    });
    // vẽ lại từ kho (gọi mỗi khi có tin / phòng đổi)
    UI.veKho = function () {
      var p = c.phong() || {}, TIN = c.tin();
      daXem = Chat.daXemO(TIN, p);
      UI.ve(TIN.map(function (t) { return Chat.doiTin(t, p); }), c.dau ? c.dau() : '');
    };
    return UI;
  };

  // ---------- giao diện hai cột — v0.6.0 (mẫu v15+v16 thầy chốt 22/09): cụm tin · 7 cảm xúc · trả lời · đã xem · bảng thông tin ·
  //            menu ⋯ từng cuộc (chưa đọc / tắt TB / cá nhân / xoá / báo cáo) · HS không tạo/rời nhóm · nhóm luôn đứng đầu ----------
  // Tin: {uid, ten, anh, chu, hinh, luc, cx{uid:{ten,luc,n,l}}, traLoi{id, uid, ten, chu, hinh}, sticker, thuHoi} (v1.198.0) — "đã xem" tính từ phong.docLuc[uid] >= tin.luc
  Chat.dung = function (hop) {
    var toi = NW.toi;
    var PHONG = [], chon = '', dungNghe = null, TIN = [], hetCu = false, nguoiHienTai = null;
    var UI = null;   // ⭐ web v1.198.0 — khuôn chat Zalo của phòng đang mở (Chat.taoKhuon)
    var timChu = '';
    hop.className = 'card tn';
    // ⭐ 02/10/2026 thầy chốt: HS chưa có chat riêng ⇒ danh sách = NHÓM LỚP (mọi lớp em học, huy hiệu) + Thầy Andrew + dòng "sẽ sớm được bật"
    var CHO_RIENG = !!(toi.laThay || CFG.BAT_CHAT_RIENG);
    var IC_LUI = '<svg class="ic" viewBox="0 0 24 24" style="stroke-width:2.4"><path d="M15 5l-7 7 7 7"/></svg>';   // 02/10 thầy: nút quay lại (điện thoại) = dấu <
    // ⭐ 02/10/2026 thầy chốt: NHÓM LỚP = CHÍNH CHAT LỚP myLesson (kho classChat, js/chat.js AWChat) — nhắn ở đây thì trang lớp/khóa/dashboard
    //   thấy ngay và ngược lại. Phòng lớp là phòng "ảo" (id 'lop:<mã lớp>', _lop:true): thành viên = danh sách lớp trong lop.json.
    var PHONG_LOP = [], MA_TOI = '', DS_LOP = [];
    var CO_CN = !!(CFG.LA_THU || NW.laBanThu());   // trang thật: trang cá nhân chưa mở ⇒ không đặt link
    var THAY = [];   // hồ sơ thầy (để luôn có dòng "Thầy Andrew" kể cả khi chưa nhắn lần nào)
    // 02/10/2026 thầy: khung giữa khi chưa mở phòng = icon tròn lớn + tiêu đề + 1 dòng hướng dẫn + nút "Nhắn tin mới" (bấm = nút ✎)
    var TRONG_PHONG = '<div class="tn-trong tn-chao"><span class="tn-chao-ic">' + IC.tinNhan + '</span><b>Tin nhắn của ' + (toi.laThay ? 'thầy' : 'em') + '</b>' +
      '<span>' + (CHO_RIENG ? 'Chọn một cuộc trò chuyện bên trái để xem tin nhắn.' : 'Chọn nhóm lớp hoặc Thầy Andrew bên trái để trò chuyện.') + '</span>' +
      (CHO_RIENG ? '<button type="button" class="tn-chao-nut" data-tn-moi>' + IC.sua + 'Nhắn tin mới</button>' : '') + '</div>';
    hop.innerHTML =
      '<div class="tn-ds"><div class="tn-ds-dau"><h2>Tin nhắn</h2>' +
        (toi.laThay ? '<button class="nut-tron" id="tnNhom" title="Tạo nhóm chat" aria-label="Tạo nhóm chat">' + IC.nhom + '</button>' : '') +   // v16: HS không tạo nhóm
        (CHO_RIENG ? '<button class="nut-tron dam" id="tnMoi" title="Nhắn tin mới" aria-label="Nhắn tin mới">' + IC.sua + '</button>' : '') + '</div>' +
        '<div class="tn-tim"><span class="tim-o">' + IC.timKiem + '<input type="search" id="tnTim" placeholder="Tìm trong tin nhắn"></span></div>' +
        '<div class="tn-ds-cuon" id="tnDs"><div class="tn-trong">Đang tải…</div></div></div>' +
      '<div class="tn-phong" id="tnPhong">' + TRONG_PHONG + '</div>' +
      '<aside class="tn-info" id="tnInfo" hidden></aside>';
    var khuDs = $('#tnDs', hop), khuPhong = $('#tnPhong', hop), khuInfo = $('#tnInfo', hop);
    $('#tnTim', hop).addEventListener('input', function () { timChu = NW.khongDau(this.value.trim().toLowerCase()); veDs(); });

    function nguoiKia(p) { var k = (p.thanhVien || []).filter(function (u) { return u !== toi.uid; })[0] || toi.uid; return Object.assign({ uid: k }, (p.tv || {})[k] || { ten: '?' }); }
    function tenPhong(p) { return p.loai === 'nhom' ? (p.ten || 'Nhóm') : nguoiKia(p).ten || '?'; }
    function laNhomLop(p) { return p.loai === 'nhom' && !!p.lop; }
    function avPhong(p, lop) {
      // ⭐ 02/10/2026 thầy chốt: icon NHÓM = 4 bóng (2×2) — bóng 1-2-3 là ảnh thành viên (ưu tiên người có ảnh), bóng 4 = tổng số thành viên
      if (p.loai === 'nhom') {
        var tv = p.tv || {}, ds = (p.thanhVien || []).filter(function (u) { return u !== toi.uid; });
        ds.sort(function (a, b) { return ((tv[b] || {}).anh ? 1 : 0) - ((tv[a] || {}).anh ? 1 : 0); });
        // 02/10 thầy chốt: BỎ con số thành viên ⇒ bóng 4 là ảnh người thứ 4 (không còn bóng sĩ số)
        var bon = ds.slice(0, 4).map(function (u) { return NW.avHtml(Object.assign({}, tv[u] || { ten: '?' }, { online: false, hoatDongLuc: 0 })); }).join('');
        return '<span class="av-4' + (lop ? ' ' + lop : '') + '">' + bon + '</span>';
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
    // 02/10: NHÓM LỚP luôn đứng trên cùng (theo thứ tự lớp của em), rồi nhóm khác, rồi cuộc riêng.
    //   HS chưa bật chat riêng: chỉ nhóm lớp + cuộc với thầy (chưa có thì dòng chờ `_cho`), thầy ở DƯỚI CÙNG.
    //   ⛔ v1.253.0 (06/10) thầy BỎ thứ tự cố định trên: nay xếp theo TIN MỚI NHẤT (xem xepPhong); hangPhong/thuTuLop chỉ còn để phân xử khi bằng mốc.
    function hangPhong(p) { return laNhomLop(p) ? 0 : p.loai === 'nhom' ? 1 : 2; }
    function thuTuLop(p) { if (p._thuTu != null) return p._thuTu; var i = (toi.cacLop || [toi.lop]).indexOf(p.lop); return i < 0 ? 99 : i; }
    function laVoiThay(p) { return p.loai !== 'nhom' && nguoiKia(p).vaiTro === 'gv'; }
    function xepPhong(ds) {
      ds = ds.filter(function (p) { return laNhomLop(p) || !(((p.anLuc || {})[toi.uid] || 0) >= (p.capNhat || 0)); });
      ds = ds.filter(function (p) { return p._cho || p.loai === 'nhom' || !!p.tinCuoi; });   // ⭐ 03/10: phòng riêng CHƯA CÓ TIN NÀO thì không hiện (thầy thấy "Bắt đầu trò chuyện" rỗng)
      if (!CHO_RIENG) {
        ds = ds.filter(function (p) { return laNhomLop(p) || laVoiThay(p); });
        THAY.forEach(function (t) {
          var id = Chat.maRieng(toi.uid, t.uid);
          if (!ds.some(function (p) { return p.id === id || (laVoiThay(p) && nguoiKia(p).uid === t.uid); })) { var tv = {}; tv[t.uid] = NW.tomTat(t); ds.push({ id: id, loai: 'rieng', thanhVien: [toi.uid, t.uid], tv: tv, tinCuoi: null, docLuc: {}, _cho: t }); }
        });
      }
      // ⭐ v1.253.0 (thầy chốt 06/10) — MỌI cuộc xếp chung theo TIN MỚI NHẤT (như Messenger), kể cả nhóm lớp / nhóm / thầy.
      //   Cuộc chưa có tin nào (mốc 0) xuống cuối, giữ thứ tự cũ (nhóm lớp → nhóm → riêng).
      function mocPhong(p) { return p._cho ? 0 : ((p.tinCuoi && p.tinCuoi.luc) || p.capNhat || 0); }
      return ds.sort(function (a, b) {
        return mocPhong(b) - mocPhong(a) || hangPhong(a) - hangPhong(b) || (laNhomLop(a) && laNhomLop(b) ? thuTuLop(a) - thuTuLop(b) : 0);
      });
    }
    var _phongCho = {};
    function tatTB(p) { return !!((p.tat || {})[toi.uid]); }
    function veDs() {
      var ds = xepPhong(PHONG.filter(function (p) { return !(PHONG_LOP.length && p.lop); }).concat(PHONG_LOP)).filter(function (p) { return !timChu || NW.khongDau(tenPhong(p).toLowerCase()).indexOf(timChu) >= 0; });
      var ghiChu = CHO_RIENG || timChu ? '' : '<div class="tn-sap-rieng">' + IC.khoa + 'Tính năng chat riêng sẽ sớm được bật.</div>';
      if (!ds.length) { khuDs.innerHTML = '<div class="tn-trong">' + (timChu ? 'Không thấy cuộc trò chuyện nào.' : 'Chưa có cuộc trò chuyện nào.') + '</div>' + ghiChu; return; }
      _phongCho = {};
      khuDs.innerHTML = ds.map(function (p) {
        if (p._cho) _phongCho[p.id] = p;
        var tc = p.tinCuoi || {}, chua = chuaDoc(p);
        var cuoi = tc.luc ? ((tc.uid === toi.uid ? (toi.laThay ? 'Thầy: ' : 'Em: ') : (p.loai === 'nhom' ? (tc.ten || '').split(' ').pop() + ': ' : '')) + (tc.chu || (tc.hinh ? '📷 Ảnh' : ''))) : '';
        var cuoiHtml = cuoi ? an(cuoi) + '<span class="gio"> · ' + an(gioNgan(tc.luc || p.capNhat)) + '</span>' : '<span class="tn-moi-chu">' + (laVoiThay(p) ? 'Nhắn cho thầy' : 'Bắt đầu trò chuyện') + '</span>';
        return '<div class="tn-muc' + (p.id === chon ? ' chon' : '') + (chua ? ' chua' : '') + (p.loai === 'nhom' ? ' nhom' : '') + (laNhomLop(p) ? ' lop' : '') + '" data-id="' + an(p.id) + '" role="button" tabindex="0">' + avPhong(p) +
          '<span class="tt"><span class="ten">' + an(tenPhong(p)) + (laNhomLop(p) ? NW.huyHieuLop() : p.loai !== 'nhom' ? tichNeuThay(nguoiKia(p)) : '') + (tatTB(p) ? '<span class="tat" title="Đã tắt thông báo">' + IC.chuongTat + '</span>' : '') + '</span>' +
          '<span class="cuoi">' + cuoiHtml + '</span></span>' +
          (chua ? '<span class="cham"></span>' : '') +
          (p._cho || (p._lop && !window.ACDay) ? '' : '<button type="button" class="menu" data-menu aria-label="Tuỳ chọn" title="Tuỳ chọn">' + IC.baCham + '</button>') + '</div>';
      }).join('') + ghiChu;
      $$('.tn-muc', khuDs).forEach(function (row) {
        var id = row.getAttribute('data-id'), giu = null, daGiu = false;
        row.onclick = function (e) { if (e.target.closest('[data-menu]')) return; if (daGiu) { daGiu = false; return; } moPhong(id); };
        row.onkeydown = function (e) { if (e.key === 'Enter') moPhong(id); };
        if (_phongCho[id]) { row.onclick = function () { moCho(_phongCho[id]); }; row.onkeydown = function (e) { if (e.key === 'Enter') moCho(_phongCho[id]); }; return; }
        if ($('[data-menu]', row)) $('[data-menu]', row).onclick = function (e) { e.stopPropagation(); menuCuoc(this, id); };
        // điện thoại: GIỮ 450ms = mở menu
        // v1.225.0 — vuốt cuộn danh sách KHÔNG được mở menu: nhích ngón > 8px / trình duyệt nhận cuộn (pointercancel) ⇒ huỷ đếm giữ
        var diemGiu = null;
        row.addEventListener('pointerdown', function (e) { if (e.target.closest('button') || (timPhong(id) || {})._lop) return; daGiu = false; diemGiu = { x: e.clientX, y: e.clientY }; clearTimeout(giu); giu = setTimeout(function () { daGiu = true; menuCuoc($('[data-menu]', row), id); }, 450); });
        row.addEventListener('pointermove', function (e) { if (diemGiu && Math.abs(e.clientX - diemGiu.x) + Math.abs(e.clientY - diemGiu.y) > 8) clearTimeout(giu); });
        row.addEventListener('pointercancel', function () { clearTimeout(giu); });
        row.addEventListener('pointerup', function () { clearTimeout(giu); });
        row.addEventListener('pointerleave', function () { clearTimeout(giu); });
        row.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      });
    }
    // dòng "Thầy Andrew" chưa có cuộc ⇒ bấm mới tạo phòng riêng với thầy
    async function moCho(p) {
      try { var t = p._cho; var id = await Chat.moRieng(t); var pMoi = Object.assign({}, p, { id: id, tv: Object.assign({}, p.tv) }); delete pMoi._cho; pMoi.tv[toi.uid] = NW.tomTat(toi); moPhong(id, pMoi); }
      catch (e) { NW.toast(NW.chuLoiKho(e), true); }
    }
    // ---------- v16: menu từng cuộc chat (⋯ máy tính / giữ điện thoại) ----------
    function menuCuoc(nut, id) {
      var p = timPhong(id); if (!p) return;
      // 02/10 thầy chốt: BỎ "Xem thành viên" (không cho xem danh sách lớp). ⭐ v1.255.0 — nhóm lớp có menu CHỈ một mục
      //   Tắt/Bật thông báo (thông báo đẩy + số đỏ; lưu nwUsers/<uid>/rieng/tatLop qua js/day.js — chung mọi máy).
      if (p._lop) {
        if (!window.ACDay || NW.laBanThu()) return;
        var tatL = tatTB(p);
        NW.menuNho(nut, [{ ic: tatL ? IC.chuongBat : IC.chuongTat, chu: tatL ? 'Bật thông báo' : 'Tắt thông báo', onclick: function () {
          p.tat = p.tat || {}; p.tat[toi.uid] = !tatL; veDs();
          ACDay.datTatLop(p.lop, !tatL).then(function () { NW.toast(!tatL ? 'Đã tắt thông báo nhóm lớp này.' : 'Đã bật lại thông báo.'); },
            function (e) { p.tat[toi.uid] = tatL; veDs(); NW.toast(NW.chuLoiKho(e), true); });
        } }]);
        return;
      }
      var chua = chuaDoc(p), tat = tatTB(p), items = [];
      items.push({ ic: chua ? IC.daDoc : IC.chuaDoc, chu: chua ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc', onclick: function () { danhDauChuaDoc(p, !chua); } });
      items.push({ ic: tat ? IC.chuongBat : IC.chuongTat, chu: tat ? 'Bật thông báo' : 'Tắt thông báo', onclick: function () { datTat(p, !tat); } });
      if (p.loai === 'nhom') { /* 02/10 thầy chốt: bỏ "Xem thành viên" */ }
      else if (CHO_RIENG && CO_CN) items.push({ ic: IC.caNhan, chu: 'Xem trang cá nhân', onclick: function () { NW.di('canhan.html?uid=' + nguoiKia(p).uid); } });
      if (p.loai !== 'nhom' && CHO_RIENG) items.push({ ic: IC.xoa, chu: 'Xoá đoạn chat', nguy: true, onclick: function () { xoaCuoc(p); } });
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
      if (chua && chon === p.id) { hop.classList.remove('mo-phong'); chon = ''; dongInfo(); khuPhong.innerHTML = TRONG_PHONG; }
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
      if (chon === p.id) { hop.classList.remove('mo-phong'); chon = ''; dongInfo(); khuPhong.innerHTML = TRONG_PHONG; }
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
      // 02/10 thầy chốt: bỏ con số thành viên; chat với thầy chỉ hiện tên "Thầy Andrew" (không dòng "Thầy" bên dưới)
      if (p.loai === 'nhom') return laNhomLop(p) ? 'Nhóm lớp' : 'Nhóm chat';
      var k = nguoiKia(p);
      return k.vaiTro === 'gv' ? '' : (NW.dangOnline(k) ? 'Đang hoạt động' : (k.lop ? 'Lớp ' + k.lop : ''));
    }
    function veKhungPhong(p) {
      khuPhong.innerHTML =
        '<div class="tn-phong-dau"><button class="nut-tron lui" id="tnLui" aria-label="Quay lại">' + IC_LUI + '</button>' + avPhong(p) +
        '<div class="ai"><div class="ten">' + an(tenPhong(p)) + (laNhomLop(p) ? NW.huyHieuLop() : p.loai !== 'nhom' ? tichNeuThay(nguoiKia(p)) : '') + '</div>' + (phuPhong(p) ? '<div class="phu">' + an(phuPhong(p)) + '</div>' : '') + '</div>' +
        '<button class="nut-tron" id="tnInfoNut" aria-label="Thông tin" title="Thông tin cuộc trò chuyện">' + IC.thongTin + '</button></div>' +
        '<div class="tn-cuon" id="tnCuon"></div>' +
        '<div class="tn-nhap-khu" id="tnChan"></div>';   // ⭐ web v1.198.0 — ô nhập khuôn chat Zalo (ChatUI dựng)
      hop.classList.add('mo-phong');
      $('#tnLui', khuPhong).onclick = function () { hop.classList.remove('mo-phong'); chon = ''; dongInfo(); veDs(); };
      // ⭐ web v1.198.0 — mỗi lần dựng lại khung phòng thì dựng khuôn mới gắn vào khung cuộn + ô nhập mới (khuôn lo trả lời/emoji/sticker/ảnh)
      if (p._lop) UI = taoKhuonLop(p, $('#tnCuon', khuPhong), $('#tnChan', khuPhong));
      else UI = Chat.taoKhuon({
        khung: $('#tnCuon', khuPhong), chan: $('#tnChan', khuPhong), idNhap: 'tnO',
        phong: function () { return nguoiHienTai || {}; },
        tin: function () { return TIN; },
        datTin: function (ds) { TIN = ds; veTin(); },
        dau: function () { return !hetCu && TIN.length >= 30 ? '<button class="bl-them" id="tnCu" type="button" style="align-self:center;padding:6px 12px;margin-bottom:6px">Xem tin cũ hơn</button>' : ''; }
      });
      $('#tnCuon', khuPhong).addEventListener('click', function (e) { if (e.target.closest('#tnCu')) { if (p._lop) taiCuLop(p); else taiCu(); } });
      $('#tnInfoNut', khuPhong).onclick = function () { if (khuInfo.hidden) moInfo(p); else dongInfo(); };
    }

    // ---------- tin nhắn — ⭐ web v1.198.0: vẽ bằng khuôn chung (Chat.taoKhuon ⇒ ../js/chat-ui.js) ----------
    //   Cảm xúc / trả lời / menu ⋯ / thu hồi / giữ tin trên điện thoại: khuôn lo hết (xem Chat.taoKhuon ở trên).
    function veTin() { if (UI && $('#tnCuon', khuPhong)) { if (UI.laLop) UI.ve(TIN, !hetCu && TIN.length >= 30 ? '<button class="bl-them" id="tnCu" type="button" style="align-self:center;padding:6px 12px;margin-bottom:6px">Xem tin cũ hơn</button>' : ''); else UI.veKho(); kiemToiTin(); } }
    // ⭐ v1.224.0 (02/10/2026, thầy chốt) — mở từ thông báo nhắc tên: `?phong=<id>&tin=<id>&luc=<mốc>` ⇒ mở phòng, cuộn tới tin, nháy.
    // ⛔ Trước đây `?phong=` chỉ thử MỘT lần ở lượt nghePhong đầu tiên (danh sách còn RỖNG, nhóm lớp nạp sau) ⇒ gần như không bao giờ mở được.
    //   Nay giữ "phòng chờ mở" và thử lại mỗi lần danh sách phòng đổi + sau khi nạp xong nhóm lớp.
    //   Tin chưa có trong khung (cũ hơn 30 tin mới nhất) ⇒ tải thêm tin cũ (tối đa 8 lượt) tới khi thấy.
    var CHO_MO = NW.thamSo('phong') ? { phong: NW.thamSo('phong'), tin: NW.thamSo('tin') || '', luc: Number(NW.thamSo('luc')) || 0 } : null;
    var CHO_TOI = null;
    function thuMoCho() {
      if (!CHO_MO) return;
      var c = CHO_MO;
      if (!timPhong(c.phong)) return;
      CHO_MO = null;
      if (c.tin) CHO_TOI = { id: c.tin, luc: c.luc, lan: 0 };
      moPhong(c.phong);
    }
    function kiemToiTin() {
      var c = CHO_TOI;
      if (!c || !UI || !UI.toiTin || !TIN.length) return;
      setTimeout(function () {
        if (CHO_TOI !== c) return;
        if (UI.toiTin(c.id)) { CHO_TOI = null; return; }
        var dauLuc = Number(TIN[0].luc) || 0;
        if (hetCu || c.lan >= 8 || (c.luc && dauLuc && dauLuc < c.luc)) { CHO_TOI = null; if (c.lan) NW.toast('Tin nhắn đó không còn (đã bị xoá).'); return; }
        c.lan++;
        var p = chon && timPhong(chon);
        if (p && p._lop) taiCuLop(); else taiCu();
      }, 300);
    }


    // ---------- bảng thông tin (cột phải / phủ trên điện thoại) ----------
    function moInfo(p) {
      var anhDs = TIN.filter(function (x) { return x.hinh; }).map(function (x) { return x.hinh; }).reverse();
      var k = p.loai !== 'nhom' ? nguoiKia(p) : null;
      khuInfo.hidden = false; hop.classList.add('mo-info');
      khuInfo.innerHTML = '<div class="tn-info-dau"><button class="nut-tron" data-dong aria-label="Đóng">' + IC.dong + '</button></div>' +
        '<div class="tn-info-ai">' + avPhong(p, 'to') + '<div class="ten">' + an(tenPhong(p)) + (laNhomLop(p) ? NW.huyHieuLop() : k ? tichNeuThay(k) : '') + '</div><div class="phu">' + an(phuPhong(p)) + '</div>' +
          (k ? (CHO_RIENG && CO_CN ? '<a class="btn soft nho" href="canhan.html?uid=' + an(k.uid) + '">' + IC.caNhan + 'Trang cá nhân</a>' : '') : '') + '</div>' +   /* 02/10 thầy chốt: bỏ nút "Thành viên (n)" */
        '<div class="tn-info-muc"><h4>Ảnh đã gửi</h4>' + (anhDs.length ? '<div class="tn-info-anh">' + anhDs.slice(0, 12).map(function (u) { return '<button type="button" data-anh="' + an(u) + '"><img src="' + an(u) + '" alt="" loading="lazy"></button>'; }).join('') + '</div>' : '<div class="tiny">Chưa có ảnh nào.</div>') + '</div>' +
        (p.loai === 'nhom' && !p._lop ? '<div class="tn-info-muc"><h4>Nhóm</h4><div class="tn-info-nut">' +
          ((p.taoBoi === toi.uid || toi.laThay) ? '<button type="button" data-them>' + IC.them + 'Thêm thành viên</button><button type="button" data-doiten>' + IC.sua + 'Đổi tên nhóm</button>' : '') +
          (toi.laThay ? '<button type="button" class="nguy" data-roi>' + IC.thoat + 'Rời nhóm</button>' : '<div class="tiny" style="padding:6px 10px">' + (laNhomLop(p) ? 'Nhóm chính thức của lớp — cả lớp và thầy ở đây.' : 'Nhóm do thầy lập — em ở trong nhóm này.') + '</div>') + '</div></div>' : '');   // v16: HS không rời nhóm
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
      var p = timPhong(id) || pTruoc;
      if (!p) return;
      nguoiHienTai = p; TIN = []; hetCu = false;
      if (dungNghe) { try { dungNghe(); } catch (e) { } dungNghe = null; }
      veKhungPhong(p);
      if (p._lop) { moPhongLop(p); return; }
      if (NW.laBanThu()) { TIN = tinMau(p); veTin(); if ((p.chuaDoc || {})[toi.uid]) { p.chuaDoc[toi.uid] = false; p.docLuc = p.docLuc || {}; p.docLuc[toi.uid] = Date.now(); veDs(); } return; }
      if (Chat.dangCho(id)) { veTin(); return; }   // ⭐ 03/10 phòng CHỜ (chưa có tin đầu): chưa có gì trên kho để nghe — gắn kênh khi gửi tin đầu (Chat.ngheKhiTao ở dưới)
      ngheTin(id, p);
    }
    async function ngheTin(id, p) {
      var f = await NW.fb();
      if (dungNghe) { try { dungNghe(); } catch (e) { } dungNghe = null; }
      var q = f.fs.query(f.fs.collection(f.db, 'nwChats', id, 'tin'), f.fs.orderBy('luc', 'desc'), f.fs.limit(30));
      dungNghe = f.fs.onSnapshot(q, function (snap) {
        if (chon !== id) return;
        var moi = []; snap.forEach(function (d) { moi.push(Object.assign({ id: d.id }, d.data())); });
        moi.reverse();
        var mocDau = moi.length ? moi[0].luc : Infinity;
        var cu = TIN.filter(function (t) { return t.luc < mocDau && t._cu; });
        TIN = cu.concat(moi);
        if (snap.size < 30) hetCu = true;
        veTin(); if (!NW.anTrongKhung()) danhDauDoc(p);   // v1.280.0 — khung giữ sống đang ẩn: chưa tính là đã đọc (xemLai lo khi hiện)
      }, function (e) { $('#tnCuon', khuPhong).innerHTML = '<div class="tn-trong">' + an(NW.chuLoiKho(e)) + '</div>'; });
    }
    Chat.ngheKhiTao(function (id) { if (chon === id) ngheTin(id, nguoiHienTai || timPhong(id) || {}); });
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
    // ---------- menu phòng ----------
    function menuPhong(nut, p) {
      var items = [];
      if (p.loai === 'nhom') {
        if (p.taoBoi === toi.uid || toi.laThay) {
          items.push({ ic: IC.them, chu: 'Thêm thành viên', onclick: function () { themThanhVien(p); } });
          items.push({ ic: IC.sua, chu: 'Đổi tên nhóm', onclick: function () { doiTenNhom(p); } });
        }
        if (toi.laThay) items.push({ ic: IC.thoat, chu: 'Rời nhóm', nguy: true, onclick: function () { roiNhom(p); } });   // v16: HS không rời nhóm
      } else {
        var k = (p.thanhVien || []).filter(function (u) { return u !== toi.uid; })[0];
        if (CO_CN) items.push({ ic: IC.caNhan, chu: 'Xem trang cá nhân', onclick: function () { NW.di('canhan.html?uid=' + k); } });
      }
      NW.menuNho(nut, items);
    }
    function xemThanhVien(p) {
      NW.popMo({ tieuDe: p._lop ? 'Thành viên lớp' : 'Thành viên nhóm', html: '<div class="ds-nguoi">' + (p.thanhVien || []).map(function (u) {
        var t = (p.tv || {})[u] || { ten: '?' };
        if (p._lop || !CO_CN) return '<div class="nguoi">' + NW.avHtml(t, 'nho') + '<span><span class="ten">' + an(t.ten) + '</span><br><span class="lop">' + an(t.lop || '') + '</span></span></div>';
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
    if ($('#tnMoi', hop)) $('#tnMoi', hop).onclick = async function () {
      var ds = await Chat.nguoiNhanDuoc();
      chonNguoi('Nhắn tin cho ai?', ds, false, async function (c) {
        var n = c[0]; if (!n) return;
        try { var id = await Chat.moRieng(n); var pMoi = { id: id, loai: 'rieng', thanhVien: [toi.uid, n.uid], tv: {}, tinCuoi: null, docLuc: {} }; pMoi.tv[n.uid] = NW.tomTat(n); pMoi.tv[toi.uid] = NW.tomTat(toi); moPhong(id, pMoi); }
        catch (e) { NW.toast(NW.chuLoiKho(e), true); }
      });
    };
    khuPhong.addEventListener('click', function (e) { if (e.target.closest('[data-tn-moi]')) $('#tnMoi', hop).onclick(); });   // nút "Nhắn tin mới" giữa khung
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

    if (!CHO_RIENG) {
      (NW.laBanThu() ? Promise.resolve([{ uid: 'gv', ten: 'Thầy Andrew', lop: 'GV', vaiTro: 'gv', anh: 'assets/avatar-tron.jpg' }]) : NW.dsThay())
        .then(function (ds) { THAY = (ds || []).slice(0, 1); veDs(); }).catch(function () { });
    }
    // ============================================================
    // ⭐ 02/10/2026 — NHÓM LỚP = CHAT LỚP (classChat). Mã gửi tin = claim `ma` của phiên (luật đòi token.ma == code); thầy = 'GV'.
    //   Tin cuối mỗi lớp: 1 lượt đọc/lớp khi mở trang. "Đã xem" trên máy dùng CHUNG khoá với trang lớp (mylesson_xemtin_<lớp>_<mã>)
    //   ⇒ đọc ở đây là chấm đỏ trang lớp cũng tắt.
    // ============================================================
    function timPhong(id) { return PHONG.concat(PHONG_LOP).filter(function (x) { return x.id === id; })[0]; }
    function avKhongDau(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
    function avUrl(tenGoc, ten) {   // ⛔ chép y js/chung.js avUrl (slug phải khớp từng ký tự)
      return CFG.GOC_DL + 'assets/avatar/' + (avKhongDau(tenGoc).replace(/[^a-z0-9]/g, '') || 'lop') + '/' + (avKhongDau(ten).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'hs') + '.jpg';
    }
    function khoaXem(lop) { return 'mylesson_xemtin_' + lop + '_' + MA_TOI; }
    function docXem(lop) { try { return Number(localStorage.getItem(khoaXem(lop))) || 0; } catch (e) { return 0; } }
    function ghiXemMay(p, luc) {
      if (!(luc > 0) || !MA_TOI) return;
      try { if (luc > docXem(p.lop)) localStorage.setItem(khoaXem(p.lop), String(luc)); } catch (e) { }
      p.docLuc = p.docLuc || {}; if (luc > (p.docLuc[toi.uid] || 0)) { p.docLuc[toi.uid] = luc; veDs(); }
      try { window.dispatchEvent(new CustomEvent('ac-tn-xem', { detail: { lop: p.lop } })); } catch (e) { }   // v1.253.0 — số đỏ tính lại ngay
    }
    function tenLopHien(l) { var g = String(l.tenGoc || l.maLop || ''); return /[a-z]{3,}/i.test(avKhongDau(g)) ? g : 'Lớp ' + g; }
    function uidTin(t) { return t.ma && t.ma === MA_TOI ? toi.uid : (t.vaiTro === 'gv' ? 'm:GV' : 'm:' + (t.ma || '?')); }
    async function napPhongLop() {
      // bàn thử trên máy: `&lopthat=1` ⇒ ĐỌC chat lớp thật (không có phiên ⇒ không gửi được) để kiểm danh sách / tin cuối / mở phòng
      if (!window.AWChat || (NW.laBanThu() && !/[?&]lopthat=1(&|$)/.test(location.search))) return;
      try {
        if (NW.laBanThu()) MA_TOI = '';
        else if (toi.laThay) MA_TOI = 'GV';
        else { var cl = (await toi.user.getIdTokenResult()).claims || {}; MA_TOI = String(cl.ma || ''); }
        var dl = await fetch(CFG.GOC_DL + 'data/lop.json', { cache: 'no-cache' }).then(function (r) { return r.json(); });
        DS_LOP = (dl.lop || []).concat(dl.khoa || []);
      } catch (e) { console.warn('[tn] chưa nạp được danh sách lớp', e); return; }
      var can = toi.laThay ? DS_LOP.map(function (l) { return l.maLop; }) : (toi.cacLop || [toi.lop]).filter(Boolean);
      var hopLop = /^lop:(.+)$/.exec(NW.thamSo('phong') || '');   // ⭐ 03/10 khung nhúng của hộp chat nhỏ: chỉ nạp ĐÚNG lớp đang mở (đỡ lượt đọc tin cuối từng lớp)
      if (/[?&]hop=1(&|$)/.test(location.search) && hopLop) can = can.filter(function (m) { return m === hopLop[1]; });
      PHONG_LOP = can.map(function (ma, i) {
        var l = DS_LOP.filter(function (x) { return x.maLop === ma; })[0]; if (!l) return null;
        var tv = {}, tvIds = [];
        (l.hocSinh || []).forEach(function (h) { var k = 'm:' + h.ma; if (h.ma === MA_TOI) return; tv[k] = { ten: h.ten, anh: avUrl(l.tenGoc, h.ten), lop: tenLopHien(l) }; tvIds.push(k); });
        tv['m:GV'] = { ten: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg', vaiTro: 'gv', lop: 'Thầy' };
        var dc = {}; dc[toi.uid] = docXem(ma);
        return { id: 'lop:' + ma, _lop: true, loai: 'nhom', lop: ma, ten: tenLopHien(l), tenGoc: l.tenGoc, _thuTu: i,
                 thanhVien: tvIds.concat(['m:GV']), tv: tv, soThanhVien: (l.hocSinh || []).length,
                 dsTen: (l.hocSinh || []).map(function (h) { return h.ten; }), tinCuoi: null, capNhat: 0, docLuc: dc };
      }).filter(Boolean);
      veDs();
      thuMoCho();   // v1.224.0 — link thông báo trỏ vào nhóm lớp
      if (window.ACDay && !NW.laBanThu()) ACDay.tatLopDs().then(function (ds) {   // v1.255.0 — nhóm lớp đã tắt thông báo: hiện chuông gạch
        PHONG_LOP.forEach(function (p) { p.tat = {}; p.tat[toi.uid] = ds.indexOf(p.lop) >= 0; }); veDs();
      });
      // ⭐ v1.253.0 — sổ chưa đọc CHUNG (../js/tn-pop-ds.js) có kênh sống tin cuối từng lớp + mốc "đã xem" gộp mọi máy ⇒ nhận từ đó:
      //   tin lớp mới nhảy lên đầu danh sách NGAY, chấm chưa đọc tắt khi đã xem ở máy khác. Khung nhúng (hop=1) không chạy sổ ⇒ cách cũ.
      // v1.280.0 — khung giữ sống (nhung=1): MƯỢN sổ của trang mẹ (cùng nhà) ⇒ không mở thêm kênh tin cuối từng lớp
      var TPS = window.TnPop;
      if (NW.laNhung) { try { if (window.parent.TnPop && window.parent.TnPop.ngheSo) TPS = window.parent.TnPop; } catch (e) { } }
      if (TPS && TPS.ngheSo && !/[?&]hop=1(&|$)/.test(location.search)) {
        TPS.ngheSo(function (st) {
          PHONG_LOP.forEach(function (p) {
            var o = st.lop[p.lop]; if (!o) return;
            var x = o.x;
            if (x) datTinCuoiLop(p, { ma: x.code, vaiTro: x.role, ten: x.name, chu: x.thuHoi ? 'Tin nhắn đã bị thu hồi' : (x.hinh && x.text === '[Hình ảnh]' ? '' : x.text), hinh: x.hinh, sticker: x.sticker, luc: Number(x.createdAt) || 0 });
            p.docLuc = p.docLuc || {}; if (o.xem > (p.docLuc[toi.uid] || 0)) p.docLuc[toi.uid] = o.xem;
          });
          veDs();
        });
        if (TPS.batNghe) TPS.batNghe();   // khởi động sổ ngay (mặc định chờ 2,5 giây)
        return;
      }
      // tin cuối từng lớp — MỘT lượt đọc/lớp (getDocs limit 1, không mở kênh sống)
      var f = await AWChat.kho();
      PHONG_LOP.forEach(function (p) {
        f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'classChat', p.lop, 'messages'), f.fs.orderBy('createdAt', 'desc'), f.fs.limit(1))).then(function (s) {
          s.forEach(function (d) { var x = d.data() || {}; datTinCuoiLop(p, { ma: x.code, vaiTro: x.role, ten: x.name, chu: x.thuHoi ? 'Tin nhắn đã bị thu hồi' : (x.hinh && x.text === '[Hình ảnh]' ? '' : x.text), hinh: x.hinh, sticker: x.sticker, luc: Number(x.createdAt) || 0 }); });
          veDs();
        }).catch(function (e) { console.warn('[tn] tin cuối lớp ' + p.lop, e); });
      });
    }
    function datTinCuoiLop(p, t) {
      if (!t || !(t.luc > 0)) return;
      if (p.tinCuoi && p.tinCuoi.luc > t.luc) return;   // v1.253.0 — hai nguồn (sổ chung + phòng đang mở) không được kéo lùi tin cuối
      var chu = window.ChatUI && ChatUI.chuThuong ? ChatUI.chuThuong(ChatUI.tomTat({ chu: t.chu || '', hinh: t.hinh || '', sticker: t.sticker || '' })) : (t.chu || '');
      p.tinCuoi = { chu: String(chu || (t.sticker ? 'Nhãn dán' : '')).slice(0, 80), hinh: !!t.hinh, uid: uidTin(t), ten: t.vaiTro === 'gv' ? 'Thầy Andrew' : t.ten, luc: t.luc };
      p.capNhat = t.luc;
    }
    // khuôn chat của phòng lớp — y khuôn trang lớp (lop.html UI_CHAT), gửi/đọc qua AWChat
    function taoKhuonLop(p, khung, chan) {
      var tenToi = toi.laThay ? 'Thầy Andrew' : toi.ten;
      var u = ChatUI.tao({
        khung: khung, chan: chan, idNhap: 'tnO',
        toi: { get khoa() { return MA_TOI; }, get ten() { return tenToi; } },
        laThay: !!toi.laThay, hienTen: true,
        laCuaToi: function (t) { return !!(t.ma && MA_TOI && t.ma === MA_TOI); },
        av: function (t) { return t.vaiTro === 'gv' ? NW.avHtml({ ten: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg', vaiTro: 'gv' }, 'nho') : NW.avHtml({ ten: t.ten, anh: avUrl(p.tenGoc, t.ten) }, 'nho'); },
        nhan: function (t) { return t.vaiTro === 'gv' ? NW.tichHtml('nho') : ''; },
        dsNhac: function () { return (p.dsTen || []).concat(['Thầy Andrew']); },
        gui: function (g) {
          if (!MA_TOI) return Promise.reject('Chưa nhận ra tài khoản của em — em tải lại trang nhé.');
          if (!toi.laThay && u._kc) return Promise.reject(Object.assign(new Error('khoa'), { code: 'awc/chat-khoa' }));
          if (!toi.laThay && u._cam) return Promise.reject(Object.assign(new Error('cam'), { code: 'awc/bi-cam' }));
          return AWChat.gui(p.lop, Object.assign({ ten: tenToi, ma: MA_TOI, vaiTro: toi.laThay ? 'gv' : 'hs' }, g));
        },
        guiAnh: toi.laThay ? function (file) { return AWChat.guiAnh(p.lop, file); } : null,   // chỉ thầy gửi ảnh
        datCx: function (t, v) { return AWChat.datCx(p.lop, t.id, MA_TOI, v); },
        ghiXem: function (luc) { return AWChat.ghiXem(p.lop, MA_TOI, tenToi, luc); },
        thuHoi: function (t) { return AWChat.thuHoi(p.lop, t.id, !!toi.laThay); },
        xoa: toi.laThay ? function (t) { return AWChat.xoa(p.lop, t.id); } : null,
        xemAnh: function (url) { NW.xemAnh(url, TIN.filter(function (x) { return x.hinh && !x.thuHoi; }).map(function (x) { return x.hinh; })); },
        loi: function (e) { if (e === '__im') return; NW.toast(typeof e === 'string' ? e : AWChat.chuLoi(e), true); },
        trong: 'Lớp mình chưa ai nhắn gì. Em mở lời trước nhé!'
      });
      u.laLop = true;
      if (window.__thayVao) u.datChiXem(true, 'Đang mở thay em — chat lớp chỉ để đọc.');
      return u;
    }
    function moPhongLop(p) {
      var u = UI, TIN_CU = [], TIN_SONG = [], goKc = null, goCam = null, henCam = null;
      function gop() { var co = {}; TIN = TIN_CU.concat(TIN_SONG).filter(function (t) { if (co[t.id]) return false; co[t.id] = 1; return true; }); }
      function veKhoa() {
        clearTimeout(henCam);
        var cam = u._camGoc && AWChat.camChuan ? AWChat.camChuan(u._camGoc) : null; u._cam = !!cam;
        if (toi.laThay) return;
        if (u._kc) u.khoa(true, 'Chat đang tạm khoá, em quay lại sau nhé.');
        else if (cam) u.khoa(true, 'Em đang bị cấm chat.');
        else u.khoa(false);
        if (cam) henCam = setTimeout(veKhoa, Math.max(1000, Math.min(cam.den - (window.gioChuan ? window.gioChuan() : Date.now()) + 1500, 2000000000)));
      }
      $('#tnCuon', khuPhong).innerHTML = '<div class="tn-trong">Đang mở phòng trò chuyện…</div>';
      AWChat.nghe(p.lop, function (ds) {
        if (chon !== p.id) return;
        TIN_SONG = ds; gop(); veTin();
        var cuoi = ds[ds.length - 1];
        if (cuoi) { datTinCuoiLop(p, cuoi); if (!NW.khongXem()) ghiXemMay(p, cuoi.luc); else veDs(); }
      }, function (e) { var c = $('#tnCuon', khuPhong); if (c) c.innerHTML = '<div class="tn-trong">' + an(AWChat.chuLoi(e)) + '</div>'; u.khoa(true, 'Chưa mở được phòng chat.'); });
      u.datXem({});
      if (AWChat.ngheXem) AWChat.ngheXem(p.lop, function (m) { if (chon === p.id) u.datXem(m); });
      if (!toi.laThay && AWChat.ngheKhanCap) goKc = AWChat.ngheKhanCap(function (k) { u._kc = !!k.khoaChat; veKhoa(); });
      if (!toi.laThay && AWChat.ngheCam && MA_TOI) goCam = AWChat.ngheCam(p.lop, MA_TOI, function (x) { u._camGoc = x; veKhoa(); });
      taiCuLop = function () {
        if (u._dangTai || hetCu || !TIN.length) return;
        u._dangTai = true;
        var cuon = $('#tnCuon', khuPhong), h = cuon ? cuon.scrollHeight : 0;
        AWChat.taiThem(p.lop, TIN[0].luc).then(function (ds) {
          u._dangTai = false;
          if (ds.length < AWChat.TOI_DA_TIN_THEM) hetCu = true;
          TIN_CU = ds.concat(TIN_CU); gop(); veTin();
          if (cuon) cuon.scrollTop = cuon.scrollHeight - h;
        }, function (e) { u._dangTai = false; NW.toast(AWChat.chuLoi(e), true); });
      };
      dungNghe = function () { AWChat.thoi(); if (goKc) goKc(); if (goCam) goCam(); clearTimeout(henCam); };
    }
    var taiCuLop = function () { };
    // tab quay lại màn hình / v1.280.0 khung giữ sống vừa HIỆN ('tk-hien' do js/tn-khung.js bắn) ⇒ phòng đang mở tính là đã xem
    function xemLai() {
      if (NW.khongXem()) return;
      var p = chon && timPhong(chon);
      if (!p) return;
      if (p._lop) { if (TIN.length) ghiXemMay(p, TIN[TIN.length - 1].luc); }
      else if (TIN.length) danhDauDoc(p);
    }
    document.addEventListener('visibilitychange', xemLai);
    window.addEventListener('tk-hien', xemLai);
    napPhongLop();

    // ---------- nhận danh sách phòng từ kênh chung ----------
    var lanDau = true;
    NW.nghePhong(function (ds) {
      PHONG = ds;
      if (chon && !/^lop:/.test(chon)) { var p = ds.filter(function (x) { return x.id === chon; })[0]; if (p) { nguoiHienTai = p; var ten = $('.tn-phong-dau .ten', khuPhong); if (ten) ten.textContent = tenPhong(p); veTin(); } }
      veDs();
      thuMoCho();   // v1.224.0 — thử lại mỗi lần danh sách phòng đổi
      if (lanDau) {
        lanDau = false;
        var voi = NW.thamSo('voi'), phong = NW.thamSo('phong');
        if (phong) { /* mở bằng thuMoCho() khi phòng đã có trong danh sách */ }
        else if (voi) moVoi(voi);
      }
    });
    function moVoi(voi) {
      NW.hoSo(voi).then(function (hs) { if (hs) return Chat.moRieng(Object.assign({ uid: voi }, hs)).then(function (id) { var pMoi = { id: id, loai: 'rieng', thanhVien: [toi.uid, voi], tv: {}, tinCuoi: null, docLuc: {} }; pMoi.tv[voi] = NW.tomTat(Object.assign({ uid: voi }, hs)); moPhong(id, pMoi); }); }).catch(function (e) { NW.toast(NW.chuLoiKho(e), true); });
    }
    // ⭐ v1.280.0 — khung giữ sống: trang mẹ (js/tn-khung.js) gửi {tk:'mo', q:'phong=…[&tin=…&luc=…]' | 'voi=…'} ⇒ mở đúng phòng
    if (NW.laNhung) window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || e.source !== window.parent) return;
      var d = e.data || {};
      if (d.tk !== 'mo' || !d.q) return;
      var s = new URLSearchParams(String(d.q));
      if (s.get('phong')) { CHO_MO = { phong: s.get('phong'), tin: s.get('tin') || '', luc: Number(s.get('luc')) || 0 }; thuMoCho(); }
      else if (s.get('voi')) {
        var v = s.get('voi'), co = PHONG.filter(function (p) { return p.loai !== 'nhom' && (p.thanhVien || []).indexOf(v) >= 0; })[0];
        if (co) moPhong(co.id); else moVoi(v);
      }
    });

    // ---------- dữ liệu mẫu bàn thử ----------
    function tinMau(p) {
      var t = Date.now(), H = 3600e3;
      // ⭐ web v1.198.0 — cảm xúc mẫu theo khuôn mới {uid: {ten, luc, n, l}}
      function cxMau(o) { var TEN = { hs_0: toi.ten, hs_1: 'MINH ANH', hs_2: 'BẢO NAM', hs_5: 'THẢO VY', gv: 'Thầy Andrew' }, DOI = { like: 'tim', cuoi: 'haha', ngac: 'wow' }, r = {}; Object.keys(o).forEach(function (u, i) { var k = DOI[o[u]] || o[u]; var n = {}; n[k] = 1 + (i % 3); r[u] = { ten: TEN[u] || u, luc: t - i * 1000, n: n, l: k }; }); return r; }
      function anhMau(chu, m1, m2, w, h) {
        var sv = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + m1 + '"/><stop offset="1" stop-color="' + m2 + '"/></linearGradient></defs><rect width="' + w + '" height="' + h + '" fill="url(#g)"/><text x="' + (w / 2) + '" y="' + (h / 2 + 12) + '" font-family="Montserrat,Arial" font-size="' + Math.round(Math.min(w, h) * .12) + '" font-weight="800" fill="rgba(255,255,255,.9)" text-anchor="middle">' + chu + '</text></svg>';
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sv);
      }
      if (p.id === 'hs_0__hs_1') return [
        { id: 'a1', uid: 'hs_1', ten: 'MINH ANH', chu: 'Chào bạn! Bài WORDS 2 bạn làm chưa?', luc: t - 26 * H },
        { id: 'a2', uid: toi.uid, ten: toi.ten, chu: 'Mình làm rồi, dễ lắm 😄', luc: t - 25.9 * H },
        { id: 'a3', uid: toi.uid, ten: toi.ten, chu: 'Câu 7 hơi khó thôi', luc: t - 25.88 * H, cx: cxMau({ hs_1: 'haha' }) },
        { id: 'a4', uid: 'hs_1', ten: 'MINH ANH', chu: 'Câu 7 là "although" đúng không? 🤔', luc: t - 25.5 * H, traLoi: { id: 'a3', uid: toi.uid, ten: toi.ten, chu: 'Câu 7 hơi khó thôi' } },
        { id: 'a5', uid: toi.uid, ten: toi.ten, chu: 'Đúng rồi 👍', luc: t - 25.4 * H },
        { id: 'a6', uid: 'hs_1', ten: 'MINH ANH', chu: '', hinh: anhMau('WORDS 2 · 100%', '#0E7C6E', '#5CC9B6', 900, 1200), luc: t - 3 * H },
        { id: 'a7', uid: 'hs_1', ten: 'MINH ANH', chu: 'Xong rồi nè 🎉', luc: t - 3 * H + 20e3, cx: cxMau({ hs_0: 'tim' }) },
        { id: 'a8', uid: toi.uid, ten: toi.ten, chu: 'Giỏi quá! Tối nay ôn Listening cùng không?', luc: t - 2.5 * H, cx: cxMau({ hs_1: 'tim' }) },
        { id: 'a9', uid: 'hs_1', ten: 'MINH ANH', chu: 'Ok 8h nha, mình gửi link Zoom sau', luc: t - 2.4 * H, traLoi: { id: 'a8', uid: toi.uid, ten: toi.ten, chu: 'Giỏi quá! Tối nay ôn Listening cùng không?' } },
        { id: 'a10', uid: 'hs_1', ten: 'MINH ANH', chu: '', hinh: anhMau('LỊCH ÔN', '#3E7BFA', '#8BB4FF', 1200, 800), luc: t - 2.39 * H },
        { id: 'a11', uid: toi.uid, ten: toi.ten, chu: '❤️', luc: t - 200e3 }
      ];
      if (p.id === 'n0') return [
        { id: 'e1', uid: 'gv', ten: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg', chu: 'Chào cả lớp! Đây là nhóm chat của lớp A1C, thầy thông báo bài tập và lịch học ở đây nhé.', luc: t - 50 * H },
        { id: 'e2', uid: 'hs_1', ten: 'MINH ANH', chu: 'Dạ vâng ạ 🙌', luc: t - 49 * H, cx: cxMau({ gv: 'like' }) },
        { id: 'e3', uid: 'gv', ten: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg', chu: 'Tuần sau kiểm tra WORDS 3 nhé cả lớp', luc: t - 30 * H, cx: cxMau({ hs_1: 'tim', hs_2: 'khoc', hs_5: 'ngac' }) }
      ];
      if (p.id === 'n2') return [
        { id: 'f1', uid: 'gv', ten: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg', chu: 'Chào cả nhà K9! Đây là nhóm chính thức của khoá, thầy báo bài và lịch ở đây.', luc: t - 30 * H },
        { id: 'f2', uid: 'hs_8', ten: 'DIỆU CHI', chu: 'Dạ thầy 🥰', luc: t - 29 * H },
        { id: 'f3', uid: 'gv', ten: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg', chu: 'Lesson 22 mở rồi nha cả nhà', luc: t - 5 * H }
      ];
      if (p.id === 'n1') return [
        { id: 'b1', uid: 'hs_2', ten: 'BẢO NAM', chu: 'Mai thi nha mọi người', luc: t - 5000e3 },
        { id: 'b2', uid: 'hs_1', ten: 'MINH ANH', chu: 'Ai có đề cũ không?', luc: t - 4900e3 },
        { id: 'b3', uid: toi.uid, ten: toi.ten, chu: 'Mình có nè', luc: t - 4800e3, cx: cxMau({ hs_1: 'tim', hs_2: 'like' }) },
        { id: 'b4', uid: toi.uid, ten: toi.ten, chu: '', hinh: anhMau('ĐỀ CŨ', '#F2A93B', '#FFD27A', 1200, 900), luc: t - 4790e3 },
        { id: 'b5', uid: 'hs_5', ten: 'THẢO VY', chu: 'Cảm ơn nha 🙏', luc: t - 4700e3, traLoi: { id: 'b4', uid: toi.uid, ten: toi.ten, chu: '', hinh: 'x' } }
      ];
      if (p.id === 'hs_0__gv') return [
        { id: 'c1', uid: 'gv', ten: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg', chu: 'Em nhớ nộp Worksheet 3 trước tối mai nhé.', luc: t - 7 * H },
        { id: 'c2', uid: toi.uid, ten: toi.ten, chu: 'Dạ em nộp rồi ạ, thầy xem giúp em 🙏', luc: t - 6.9 * H },
        { id: 'c3', uid: 'gv', ten: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg', chu: 'Thầy thấy rồi, tốt lắm 👍', luc: t - 6.8 * H, cx: cxMau({ hs_0: 'tim' }) }
      ];
      return [{ id: 'd1', uid: 'hs_5', ten: 'THẢO VY', chu: 'Bạn ơi cho mình mượn vở nha', luc: t - 30 * H }];
    }
    if (NW.laBanThu()) {
      var t0 = Date.now();
      PHONG = [
        { id: 'hs_0__hs_1', loai: 'rieng', thanhVien: ['hs_0', 'hs_1'], tv: { hs_1: { uid: 'hs_1', ten: 'MINH ANH', lop: 'A1C', vaiTro: 'hs', online: true } }, capNhat: t0 - 200e3, tinCuoi: { chu: '❤️', uid: 'hs_0', luc: t0 - 200e3 }, docLuc: { hs_1: t0 - 100e3, hs_0: t0 } },
        { id: 'n2', loai: 'nhom', lop: 'NTK9', ten: 'Nền Tảng K9', thanhVien: ['gv', 'hs_0', 'hs_8', 'hs_9'], tv: { gv: { uid: 'gv', ten: 'Thầy Andrew', vaiTro: 'gv', anh: 'assets/avatar-tron.jpg' }, hs_8: { uid: 'hs_8', ten: 'DIỆU CHI' }, hs_9: { uid: 'hs_9', ten: 'QUANG MINH' } }, taoBoi: 'gv', capNhat: t0 - 5 * 3600e3, tinCuoi: { chu: 'Lesson 22 mở rồi nha cả nhà', uid: 'gv', ten: 'Thầy Andrew', luc: t0 - 5 * 3600e3 }, docLuc: { hs_0: t0 - 9 * 3600e3 } },
        { id: 'n0', loai: 'nhom', lop: 'A1C', ten: 'Lớp A1-C', thanhVien: ['gv', 'hs_0', 'hs_1', 'hs_2', 'hs_5', 'hs_6', 'hs_7'], tv: { gv: { uid: 'gv', ten: 'Thầy Andrew', vaiTro: 'gv', anh: 'assets/avatar-tron.jpg' }, hs_1: { uid: 'hs_1', ten: 'MINH ANH' }, hs_2: { uid: 'hs_2', ten: 'BẢO NAM' }, hs_5: { uid: 'hs_5', ten: 'THẢO VY' }, hs_6: { uid: 'hs_6', ten: 'GIA HUY' }, hs_7: { uid: 'hs_7', ten: 'KHÁNH LINH' } }, taoBoi: 'gv', capNhat: t0 - 30 * 3600e3, tinCuoi: { chu: 'Tuần sau kiểm tra WORDS 3 nhé cả lớp', uid: 'gv', ten: 'Thầy Andrew', luc: t0 - 30 * 3600e3 }, docLuc: { hs_0: t0 } },
        { id: 'n1', loai: 'nhom', ten: 'Nhóm ôn WORDS A1C', thanhVien: ['gv', 'hs_0', 'hs_1', 'hs_2', 'hs_5'], tv: { gv: { uid: 'gv', ten: 'Thầy Andrew', vaiTro: 'gv', anh: 'assets/avatar-tron.jpg' }, hs_1: { uid: 'hs_1', ten: 'MINH ANH', online: true }, hs_2: { uid: 'hs_2', ten: 'BẢO NAM' }, hs_5: { uid: 'hs_5', ten: 'THẢO VY' } }, taoBoi: 'gv', capNhat: t0 - 4700e3, tinCuoi: { chu: 'Cảm ơn nha 🙏', uid: 'hs_5', ten: 'THẢO VY', luc: t0 - 4700e3 }, docLuc: { hs_0: t0 - 4000e3, hs_1: t0 - 4600e3, hs_2: t0 - 4750e3 }, tat: { hs_0: true } },
        { id: 'hs_0__gv', loai: 'rieng', thanhVien: ['hs_0', 'gv'], tv: { gv: { uid: 'gv', ten: 'Thầy Andrew', vaiTro: 'gv', anh: 'assets/avatar-tron.jpg' } }, capNhat: t0 - 6.8 * 3600e3, tinCuoi: { chu: 'Thầy thấy rồi, tốt lắm 👍', uid: 'gv', luc: t0 - 6.8 * 3600e3 }, docLuc: { hs_0: t0, gv: t0 } },
        { id: 'hs_0__hs_5', loai: 'rieng', thanhVien: ['hs_0', 'hs_5'], tv: { hs_5: { uid: 'hs_5', ten: 'THẢO VY', lop: 'A1C', vaiTro: 'hs' } }, capNhat: t0 - 30 * 3600e3, tinCuoi: { chu: 'Bạn ơi cho mình mượn vở nha', uid: 'hs_5', luc: t0 - 30 * 3600e3 }, docLuc: {} }
      ];
      veDs();
      thuMoCho();   // v1.224.0 — bàn thử: link ?phong=&tin=
      if (window.innerWidth > 640 && /[?&]mo=1/.test(location.search)) moPhong(CHO_RIENG ? 'hs_0__hs_1' : 'n0');
    }
  };
})();
