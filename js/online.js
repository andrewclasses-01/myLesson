/* ============================================================
   online.js — TÍN HIỆU "EM ĐANG ONLINE" (web v1.211.0, 01/10/2026)

   Thầy chốt (mẫu `D:\OTHERS\CLAUDE\myLesson - thiet ke hoat dong\mau-v1-hoat-dong.html`, kiểu C):
   dashboard có ô "AI ĐANG ONLINE" của MỌI lớp ⇒ trang học sinh (lop / khoa / bai / bai-sp) báo nhịp.

   Kho: MỘT tài liệu mỗi lớp `lessonOnline/<mã lớp>` = { <mã em>: {ten, luc, trang, bai} }
     luc    giờ MÁY CHỦ lúc báo (serverTimestamp — luật bắt buộc == request.time, không theo đồng hồ máy em)
     trang  'lop' | 'khoa' | 'bai' | 'sp'      bai  chữ ngắn bài đang mở (vd "WORDS LSB1-S1.T1.P2"), có thể rỗng
   CHỈ THẦY ĐỌC (luật tools/dang-luat-online.js). Em chỉ ghi ô của chính mình.

   ⛔ LƯỢT GHI/ĐỌC: báo khi mở trang, khi trang hiện lại, rồi NHỊP 2 phút CHỈ khi tab đang hiện. Tab ẩn ⇒ thôi báo,
      dashboard tự coi là offline sau 5 phút. Mỗi lượt ghi = 1 lượt đọc cho máy thầy đang mở dashboard (không ai khác nghe).
   ⛔ Thầy đăng nhập thay em / xem như em (window.__thayVao) ⇒ KHÔNG báo (không giả "em đang online").

   Dùng:  ACOnline.bat('bai', function () { return { lop: LOP_DL, ma: MA_HS, ten: TOI, bai: '…' }; });
   ============================================================ */
(function () {
  'use strict';
  var NHIP = 2 * 60e3, GIAN_IT_NHAT = 40e3;
  var trang = '', lay = null, henNhip = null, lanCuoi = 0, dangGhi = false;

  function thongTin() {
    try { var x = lay ? lay() : null; return x && x.lop && x.ma && x.ma !== 'GV' ? x : null; } catch (e) { return null; }
  }
  function bao(ep) {
    if (window.__thayVao || dangGhi || document.visibilityState !== 'visible') return;
    if (!ep && Date.now() - lanCuoi < GIAN_IT_NHAT) return;
    var x = thongTin(); if (!x || !window.AWChat || !AWChat.kho) return;
    dangGhi = true; lanCuoi = Date.now();
    var choPhien = window.NWP ? NWP.userHienTai()['catch'](function () { return null; }) : Promise.resolve(null);
    choPhien.then(function (u) {
      if (!u) return;   // chưa có phiên đăng nhập thật ⇒ luật sẽ từ chối, khỏi gửi
      return AWChat.kho().then(function (f) {
        var o = {}, khoa = String(x.ma).replace(/[.$#[\]/]/g, '_');
        o[khoa] = { ten: String(x.ten || '?').slice(0, 60), luc: f.fs.serverTimestamp(), trang: trang, bai: String(x.bai || '').slice(0, 80) };
        return f.fs.setDoc(f.fs.doc(f.db, 'lessonOnline', String(x.lop)), o, { merge: true });
      });
    })['catch'](function () { lanCuoi = 0; }).then(function () { dangGhi = false; });
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
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && lay) { bao(false); hen(); } });
})();
