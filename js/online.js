/* ============================================================
   online.js — TÍN HIỆU "EM ĐANG ONLINE" (web v1.211.0, 01/10/2026)

   Thầy chốt (mẫu `D:\OTHERS\CLAUDE\myLesson - thiet ke hoat dong\mau-v1-hoat-dong.html`, kiểu C):
   dashboard có ô "AI ĐANG ONLINE" của MỌI lớp ⇒ trang học sinh (lop / khoa / bai / bai-sp) báo nhịp.

   Kho: MỘT tài liệu mỗi lớp `lessonOnline/<mã lớp>` = { <mã em>: {ten, luc, trang, bai} }
     luc    giờ MÁY CHỦ lúc báo (serverTimestamp — luật bắt buộc == request.time, không theo đồng hồ máy em)
     trang  'lop' | 'khoa' | 'bai' | 'sp'      bai  chữ ngắn bài đang mở (vd "WORDS LSB1-S1.T1.P2"), có thể rỗng
            ⭐ v1.403.0: 'lam:<mã act>' (hoặc 'lam' nếu mã > 8 ký tự) = ĐANG TRONG VÁN thật (khung AWord báo AWORD:VAN dangChoi).
            Dashboard chỉ đưa 'lam…' lên đầu ô BÀI TẬP GẦN ĐÂY ("Xem trực tiếp"); 'bai' = mở trang bài nhưng không làm act.
            Nhét vào `trang` (≤ 12 ký tự) để KHÔNG phải đổi luật (khuôn ô chỉ cho ten/luc/trang/bai).
   CHỈ THẦY ĐỌC (luật tools/dang-luat-online.js). Em chỉ ghi ô của chính mình.

   ⛔ LƯỢT GHI/ĐỌC: báo khi mở trang, khi trang hiện lại, rồi NHỊP 2 phút CHỈ khi tab đang hiện. Tab ẩn ⇒ thôi báo,
      dashboard tự coi là offline sau 5 phút. Mỗi lượt ghi = 1 lượt đọc cho máy thầy đang mở dashboard (không ai khác nghe).
   ⛔ Thầy đăng nhập thay em / xem như em (window.__thayVao) ⇒ KHÔNG báo (không giả "em đang online").

   Dùng:  ACOnline.bat('bai', function () { return { lop: LOP_DL, ma: MA_HS, ten: TOI, bai: '…' }; });
   ============================================================ */
(function () {
  'use strict';
  var NHIP = 2 * 60e3, GIAN_IT_NHAT = 40e3;
  var trang = '', lay = null, henNhip = null, lanCuoi = 0, dangGhi = false, daGui = '', choLai = null;

  function thongTin() {
    try { var x = lay ? lay() : null; return x && x.lop && x.ma && x.ma !== 'GV' ? x : null; } catch (e) { return null; }
  }
  // ⭐ v1.403.0 — trang có thể tự khai `trang` riêng từng nhịp (bai.html: 'lam:<mã act>' khi khung AWord báo ĐANG TRONG VÁN),
  //   `an` = lượt báo lúc tab vừa ẩn: chỉ gửi khi lượt trước là 'lam…' (hạ về trang thường để dashboard thôi báo "đang làm" ngay).
  function bao(ep, an) {
    if (dangGhi && ep) { choLai = [ep, an]; return; }   // lượt ghi đang bay ⇒ báo lại ngay khi nó xong (không lỡ tin vào/rời ván)
    if (window.__thayVao || dangGhi || (!an && document.visibilityState !== 'visible')) return;
    if (!ep && Date.now() - lanCuoi < GIAN_IT_NHAT) return;
    var x = thongTin(); if (!x || !window.AWChat || !AWChat.kho) return;
    var tr = String((!an && x.trang) || trang).slice(0, 12);
    if (an && daGui.indexOf('lam') !== 0) return;
    dangGhi = true; lanCuoi = Date.now(); daGui = tr;
    var choPhien = window.NWP ? NWP.userHienTai()['catch'](function () { return null; }) : Promise.resolve(null);
    choPhien.then(function (u) {
      if (!u) return;   // chưa có phiên đăng nhập thật ⇒ luật sẽ từ chối, khỏi gửi
      return AWChat.kho().then(function (f) {
        var o = {}, khoa = String(x.ma).replace(/[.$#[\]/]/g, '_');
        o[khoa] = { ten: String(x.ten || '?').slice(0, 60), luc: f.fs.serverTimestamp(), trang: tr, bai: String(x.bai || '').slice(0, 80) };
        var refOn = f.fs.doc(f.db, 'lessonOnline', String(x.lop));
        // ⭐ v1.214.0 — SỔ LỊCH SỬ ONLINE (pop-up phóng to dashboard): cùng lượt ghi, thêm 1 mục vào sổ ngày của lớp
        //   `lessonOnlineNgay/<lớp>_<yyyy-mm-dd>` { <mã>: ["SSSc[:bài]"] } — SSS = khung 2 phút trong ngày, c = mã trang.
        //   Sổ bị từ chối (luật chưa đăng / quá 800 mục) ⇒ vẫn báo online như cũ.
        var d = new Date(), hai = function (n) { return (n < 10 ? '0' : '') + n; };
        var ngay = d.getFullYear() + '-' + hai(d.getMonth() + 1) + '-' + hai(d.getDate());
        var khung = Math.floor((d.getHours() * 60 + d.getMinutes()) / 2);
        var muc = ('00' + khung).slice(-3) + ({ lop: 'l', khoa: 'k', bai: 'b', sp: 's' }[tr.indexOf('lam') === 0 ? 'bai' : tr] || 'l') + (x.bai ? ':' + String(x.bai).slice(0, 24) : '');
        var so = {}; so[khoa] = f.fs.arrayUnion(muc);
        var b = f.fs.writeBatch(f.db);
        b.set(refOn, o, { merge: true });
        b.set(f.fs.doc(f.db, 'lessonOnlineNgay', String(x.lop) + '_' + ngay), so, { merge: true });
        return b.commit()['catch'](function () { return f.fs.setDoc(refOn, o, { merge: true }); });
      });
    })['catch'](function () { lanCuoi = 0; daGui = ''; }).then(function () {
      dangGhi = false;
      var l = choLai; choLai = null;
      if (l) bao(l[0], l[1]);
    });
  }
  function hen() { clearTimeout(henNhip); henNhip = setTimeout(function () { bao(true); hen(); }, NHIP); }

  window.ACOnline = {
    bat: function (tenTrang, hamLay) {
      trang = String(tenTrang || '').slice(0, 12); lay = hamLay;
      // em chưa đăng nhập xong thì thử lại vài lần đầu (trang tự điền MA_HS sau khi nạp dữ liệu)
      var thu = 0;
      (function cho() { if (thongTin()) { bao(true); hen(); } else if (++thu < 30) setTimeout(cho, 2000); })();
    },
    baoNgay: function () { bao(true); }   // trang gọi khi đổi bài đang mở
  };
  document.addEventListener('visibilitychange', function () {
    if (!lay) return;
    if (document.visibilityState === 'visible') { bao(false); hen(); }
    else bao(true, true);   // v1.403.0 — đang trong ván mà ẩn tab / tắt màn hình ⇒ báo một lượt "không còn làm"
  });
})();
