/* ============================================================
   js/hs-uid.js — ⭐ web v1.354.0 (16/10/2026) MỘT NƠI duy nhất biết "tài khoản học sinh" (Firebase Auth uid = id nwUsers) trông thế nào.
   Bước 0 của "Một số học sinh 6 chữ số" (app/KE HOACH QUAN LY HOC SINH.md khối 🚩🚩🚩): mọi chỗ ghép / tách / kiểm uid ĐI QUA ĐÂY,
   không tự viết 'hs_' + id hay /^hs_\d+$/ nữa ⇒ khi dời sang hs_<6 số> (GĐ2) chỉ sửa file này + bảng nối trong sổ.
   Hiện: uid = 'hs_' + số web (id trong data/lop.json). Bảng nối số HS → uid: `hsSo/soCai.nguoi[so].uid` (chưa có ⇒ lùi về `w`).
   Giống hệt app/may-chu/functions/uid-hs.js (phía máy chủ). ⛔ Viết ES5 như js/chung.js (iPad đời cũ).
   ============================================================ */
(function (g) {
  'use strict';
  var RE_UID = /^hs_(\d{1,7})$/;        // 1–7 chữ số: nhận cả số web 3 chữ số lẫn số học sinh 6 chữ số
  var RE_LOOSE = /^hs_/;                 // cả tài khoản thử (hs_ztestXXX)
  var H = {
    /** id (số web / số HS) → uid. Rỗng ⇒ ''. */
    uidTuId: function (id) { return id == null || id === '' ? '' : 'hs_' + id; },
    /** học sinh trong data/lop.json ({id, uid?}) → uid. Có sẵn `uid` thì dùng (GĐ2 sẽ ghi vào lop.json). */
    uidCuaHs: function (h) { return h ? (h.uid || H.uidTuId(h.id)) : ''; },
    /** uid → số (number) hoặc null nếu không đúng dạng hs_<1–7 chữ số>. */
    idTuUid: function (uid) { var m = RE_UID.exec(String(uid || '')); return m ? +m[1] : null; },
    /** uid đúng dạng hs_<1–7 chữ số>? */
    laUid: function (uid) { return RE_UID.test(String(uid || '')); },
    /** uid là tài khoản học sinh (kể cả tài khoản thử)? */
    laTaiKhoanHs: function (uid) { return RE_LOOSE.test(String(uid || '')); },
    /** uid → số học sinh 6 chữ số trong sổ `nguoi` (hsSo/soCai.nguoi): khớp `uid` trước, rồi số web `w` (nhật ký cũ). '' nếu không thấy. */
    soTuUid: function (nguoi, uid) {
      nguoi = nguoi || {};
      var ks = Object.keys(nguoi), i, id;
      for (i = 0; i < ks.length; i++) if (nguoi[ks[i]] && nguoi[ks[i]].uid === uid) return ks[i];
      id = H.idTuUid(uid);
      if (id == null) return '';
      for (i = 0; i < ks.length; i++) if (((nguoi[ks[i]] || {}).w || []).indexOf(id) >= 0) return ks[i];
      return '';
    }
  };
  g.ACHsUid = H;
})(window);
