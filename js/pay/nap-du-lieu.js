/* ⛔ FILE SINH TỰ ĐỘNG từ kho myPay v0.20.0 (4d2bb40) bằng tools/dong-goi-web.js — ĐỪNG SỬA TAY (sửa ở kho myPay rồi đóng gói lại) */
/* ============================================================
   myPay WEB — DỰNG "FILE" myPay TỪ DỮ LIỆU FIRESTORE (nap-du-lieu.js) · Đợt 1 (03/10/2026)

   Dùng CHUNG cho: trình duyệt (kho-may.js) · công cụ dời dữ liệu + bộ so app↔web (Node).
   KHÔNG gọi mạng, KHÔNG đụng DOM — chỉ biến đổi dữ liệu.

   ĐÃ ĐO Ở ĐỢT 0 (xem KE HOACH CHUYEN DASHBOARD.md mục 4b) — vì sao làm như dưới:
   • Lớp + buổi lấy theo SỔ NGÀY (`mystudentSoDiemDanh`, đúng nguồn myPay vẫn đọc). KHÔNG đọc
     thẳng `mystudentAttRows` để đếm buổi: kho đó có bản chép sai A2-A → B1-B tháng 7–9 (đếm gấp đôi).
   • Số `id` trong sổ ngày là số CỤC BỘ của máy xuất sổ (3 máy, mỗi máy đánh khác) ⇒ KHÔNG dùng làm
     danh tính. Danh tính = `gid` (mã cố định), tra từ `mystudentAttRows` CÙNG ngày + CÙNG lớp:
       1) khớp TÊN (bỏ dấu)  2) id đã học được nhất quán qua các ngày  3) đúng 1 cặp còn lại
       4) không nối được (lớp đã xoá khỏi danh sách, vd BỔ TRỢ) ⇒ khoá `so:<LỚP>|<TÊN IN HOA>`
   • myPay coi mã học sinh là SỐ ⇒ mỗi khoá (gid hoặc so:…) được cấp một SỐ myPay cố định
     (bắt đầu 500001, không bao giờ cấp lại) — lưu ở `payMaHs/so`.
   ============================================================ */
(function (goc) {
  'use strict';

  var SO_DAU = 500001;
  // Lớp THỬ trong sổ T9 (chứa cả em thật) — phi.js đã tự bỏ (chỉ lớp thật); ở đây chỉ để khỏi tốn công nối.
  var LOP_THU = { 'ZT-A': 1, 'A1-GOC': 1, 'B1-KHACH': 1, 'T1-A': 1, 'TW': 1 };

  function boDau(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase().replace(/\s+/g, ' ').trim();
  }
  function tenHoa(s) { return String(s == null ? '' : s).trim().toUpperCase(); }
  // 'd-m-yyyy' → 'yyyy-mm-dd'
  function isoTuNgayHt(n) { var p = String(n).split('-'); return p[2] + '-' + ('0' + p[1]).slice(-2) + '-' + ('0' + p[0]).slice(-2); }
  function thangCuaNgayHt(n) { var p = String(n).split('-'); return p[2] + '-' + ('0' + p[1]).slice(-2); }

  // ───────── danh sách học sinh / lớp — đúng bộ lọc myStudent dùng khi xuất shared\hoc_sinh.json ─────────
  // Đo 03/10: lọc này ra 143/143 em giống hệt file (active=1, không xoá, không HS đặc biệt, lớp còn mở, không phải KHÓA).
  function locLop(lopDocs) {
    return lopDocs.filter(function (l) { return !l.deleted && !l.archived && l.loai !== 'khoa'; });
  }
  function locHocSinh(hsDocs, lopDocs) {
    var mo = {}; locLop(lopDocs).forEach(function (l) { mo[l.code] = 1; });
    return hsDocs.filter(function (h) { return Number(h.active) === 1 && !h.deleted && !h.special_student && mo[h.class_code]; });
  }

  // gid của em ĐANG HỌC có tên (bỏ dấu) trùng DUY NHẤT — dùng riêng cho lớp thử (không có AttRows để tra).
  function timTheoTen(rosterTheoGid, ten) {
    var t = boDau(ten); var ra = [];
    rosterTheoGid.forEach(function (h, g) { if (Number(h.active) === 1 && !h.deleted && boDau(h.name) === t) ra.push(g); });
    return ra.length === 1 ? ra[0] : null;
  }

  // ───────── nối danh tính MỘT ngày ─────────
  // cacLop: mảng `cac_lop` của sổ ngày · rows: các dòng mystudentAttRows CÙNG ngày (kể cả deleted — chỉ để tra tên)
  // rosterTheoGid: Map gid → doc roster (MỌI em, kể cả đã nghỉ) · idHoc: Map 'id sổ' → gid (đã học, nhất quán)
  // Trả { ids: { 'LỚP|id': khoá }, dem: {ten, idHoc, conLai, so} }
  function noiMotNgay(cacLop, rows, rosterTheoGid, idHoc) {
    var theoLop = {};
    rows.forEach(function (r) { (theoLop[r.class_code] = theoLop[r.class_code] || []).push(r); });
    var ids = {}; var dem = { ten: 0, idHoc: 0, conLai: 0, so: 0 };
    cacLop.forEach(function (L) {
      var ds = (L.hoc_sinh || []).map(function (h) { return { h: h, khoa: null }; });
      if (LOP_THU[L.lop]) {
        // Lớp THỬ không có dòng AttRows. Vẫn PHẢI nhận ra EM THẬT (phi.js bỏ em còn học khỏi lớp thử; em lạ
        // thì coi như "đã nghỉ" và THU TIỀN — lỗi đo được 03/10: R|ZT-A|AN 150.000đ). Tra: id đã học → tên duy nhất.
        ds.forEach(function (x) {
          var g = idHoc && idHoc.get(String(x.h.id));
          if (!g) { var c = timTheoTen(rosterTheoGid, x.h.ten); if (c) g = c; }
          ids[L.lop + '|' + x.h.id] = g || ('so:' + L.lop + '|' + tenHoa(x.h.ten));
          if (g) dem.idHoc++; else dem.so++;
        });
        return;
      }
      var ung = (theoLop[L.lop] || []).map(function (r) { return { gid: r.student_gid, h: rosterTheoGid.get(r.student_gid) }; })
        .filter(function (u) { return u.h; });
      var dung = {};
      // 1) tên (bỏ dấu) — phải DUY NHẤT trong lớp hôm đó
      ds.forEach(function (x) {
        var t = boDau(x.h.ten);
        var c = ung.filter(function (u) { return !dung[u.gid] && boDau(u.h.name) === t; });
        if (c.length === 1) { x.khoa = c[0].gid; dung[x.khoa] = 1; dem.ten++; }
      });
      // 2) id đã học (cùng một số sổ luôn trỏ cùng một gid ở các ngày khác)
      ds.forEach(function (x) {
        if (x.khoa) return;
        var g = idHoc && idHoc.get(String(x.h.id));
        if (g && !dung[g] && (ung.some(function (u) { return u.gid === g; }) || rosterTheoGid.has(g))) { x.khoa = g; dung[g] = 1; dem.idHoc++; }
      });
      // 3) đúng một em chưa nối + đúng một dòng chưa dùng
      var sot = ds.filter(function (x) { return !x.khoa; });
      var du = ung.filter(function (u) { return !dung[u.gid]; });
      if (sot.length === 1 && du.length === 1) { sot[0].khoa = du[0].gid; dung[du[0].gid] = 1; dem.conLai++; }
      // 4) không nối được — giữ theo tên lúc đó (như app coi em không còn trong danh sách)
      ds.forEach(function (x) {
        if (!x.khoa) { x.khoa = 'so:' + L.lop + '|' + tenHoa(x.h.ten); dem.so++; }
        ids[L.lop + '|' + x.h.id] = x.khoa;
      });
    });
    return { ids: ids, dem: dem };
  }

  // Học bảng 'id sổ' → gid từ các ngày đã nối (CHỈ giữ id luôn trỏ đúng MỘT gid — 3 id đo được trỏ 2 em vì khác máy xuất).
  function hocIdTuBang(bangNgay) {
    var gom = new Map();
    Object.keys(bangNgay).forEach(function (n) {
      var ids = (bangNgay[n] && bangNgay[n].ids) || {};
      Object.keys(ids).forEach(function (k) {
        var g = ids[k]; if (!g || g.indexOf('so:') === 0) return;
        var id = k.slice(k.lastIndexOf('|') + 1);
        if (!gom.has(id)) gom.set(id, new Set());
        gom.get(id).add(g);
      });
    });
    var ra = new Map();
    gom.forEach(function (s, id) { if (s.size === 1) ra.set(id, s.values().next().value); });
    return ra;
  }

  // Cấp số myPay cho các khoá chưa có. Trả số khoá MỚI cấp (để biết có phải ghi lại payMaHs/so không).
  // ⭐ 06/10/2026 (Đợt 4, thầy chốt) — gid có trong SỔ HỘ TỊCH (`hsSo/soCai`) ⇒ dùng SỐ HỌC SINH vĩnh viễn 100001+
  //   (mọi dòng lớp/khóa/bổ sung của MỘT em cùng một số). Khoá `so:LỚP|TÊN` (em không còn gid) vẫn cấp 5000xx.
  function capSo(bangSo, cacKhoa, soHsTheoGid) {
    if (!bangSo.so) bangSo.so = {};
    if (!bangSo.tiep) bangSo.tiep = SO_DAU;
    var moi = 0;
    cacKhoa.forEach(function (k) {
      if (!k || k in bangSo.so) return;
      var n = soHsTheoGid && soHsTheoGid.get(k);
      bangSo.so[k] = n || bangSo.tiep++; moi++;
    });
    return moi;
  }
  // hsSo/soCai ⇒ Map gid → số học sinh (g = dòng đang có, gx = dòng đã bị myStudent xoá được nối lại)
  function bangSoHs(soCai) {
    var m = new Map();
    var ng = (soCai && soCai.nguoi) || {};
    Object.keys(ng).forEach(function (n) { (ng[n].g || []).concat(ng[n].gx || []).forEach(function (g) { m.set(g, +n); }); });
    return m;
  }

  // ───────── dựng "file" đúng khuôn myStudent xuất (myPay đọc y như trên máy) ─────────
  function dungHocSinhJson(hsDocs, lopDocs, bangSo) {
    var ds = locHocSinh(hsDocs, lopDocs).map(function (h) {
      return { id: bangSo.so[h.gid], gid: h.gid, ten: h.name, lop: h.class_code, ma_dang_nhap: h.login_code || '',
        hoc_bo_sung: !!h.supplement, ten_cu: h.ten_cu || '' };
    });
    return { phien_ban_dinh_dang: 1, app: 'myPay web (Firestore)', tong: ds.length, hoc_sinh: ds };
  }
  function dungLopJson(lopDocs) {
    var ds = locLop(lopDocs).map(function (l) {
      return { id: l.code, ma_lop: l.code, khoi_gio: l.block || '', cac_ngay_hoc: l.days || '', tam_nghi: !!l.on_break };
    });
    return { phien_ban_dinh_dang: 1, app: 'myPay web (Firestore)', tong: ds.length, cac_lop: ds };
  }
  // Sổ ngày Firestore (cac_lop là CHUỖI JSON) → sổ ngày đúng khuôn file, id đã đổi sang SỐ myPay.
  function dungSoNgay(docSo, ids, bangSo) {
    var cacLop = typeof docSo.cac_lop === 'string' ? JSON.parse(docSo.cac_lop || '[]') : (docSo.cac_lop || []);
    cacLop.forEach(function (L) {
      (L.hoc_sinh || []).forEach(function (h) {
        var khoa = ids[L.lop + '|' + h.id];
        if (khoa) { h.id_so = h.id; h.gid = khoa.indexOf('so:') === 0 ? '' : khoa; h.id = bangSo.so[khoa]; }
      });
    });
    return {
      phien_ban_dinh_dang: docSo.phien_ban_dinh_dang || 1, app: docSo.app || '', ngay: docSo.ngay || isoTuNgayHt(docSo.ngay_hien_thi),
      ngay_hien_thi: docSo.ngay_hien_thi, cap_nhat_luc: docSo.cap_nhat_luc || '', tong_so_lop: cacLop.length, cac_lop: cacLop
    };
  }

  var NapDuLieu = {
    SO_DAU: SO_DAU, LOP_THU: LOP_THU, boDau: boDau, tenHoa: tenHoa, isoTuNgayHt: isoTuNgayHt, thangCuaNgayHt: thangCuaNgayHt,
    locLop: locLop, locHocSinh: locHocSinh, noiMotNgay: noiMotNgay, hocIdTuBang: hocIdTuBang, capSo: capSo, bangSoHs: bangSoHs,
    dungHocSinhJson: dungHocSinhJson, dungLopJson: dungLopJson, dungSoNgay: dungSoNgay
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = NapDuLieu; else goc.NapDuLieu = NapDuLieu;
})(typeof window !== 'undefined' ? window : globalThis);
