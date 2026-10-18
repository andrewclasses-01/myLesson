/* ═════════════════════════════════════════════════════════════════════════════════════════
   ⭐⭐ js/sp-luat.js — LUẬT CHẤM SP CHECK, MỘT BẢN DUY NHẤT (myLesson web v1.374.0, 18/10/2026)
   ═════════════════════════════════════════════════════════════════════════════════════════
   Trước bản này các luật dưới đây bị CHÉP TAY ở 3–4 nơi (sp-chitiet.html · lop.html ·
   dashboard.html · speaking/js/app.js · js/sp-bang.js) — sửa một chỗ quên chỗ khác là số
   bên thầy lệch số bên học sinh. Nay mọi trang web nạp file này rồi gọi `window.SPLuat`.
   ⛔ App máy tính mySpeaking (`chotloi.js`, `tools/danhgia.py`) KHÔNG nạp được file này — đổi
      luật ở đây thì báo thầy là bên app còn bản riêng.
   ⛔ Viết ES5 thuần (không mũi tên, không const) để mọi trang nạp được như script thường.

   QUY ƯỚC: `ph` = mảng phiếu phản biện (`phanHoi`) CỦA ĐÚNG MỘT LỖI. Có danh sách cả buổi thì
   dựng chỉ mục một lần bằng `theoLoi(ds)` rồi tra `chiMuc[e.id]` — đừng lọc lại cả danh sách
   cho từng câu (trang thầy từng quét 3000 phiếu × vài trăm câu × 5 lần mỗi lần vẽ).

   LUẬT (thầy chốt):
     · CHÍNH CHỦ QUYẾT (02/09): lỗi ghi tên bạn A mà chính A bấm AGREE ⇒ chốt là lỗi thật; phiếu
       DISAGREE của đồng đội khi đó chỉ để tham khảo.
     · Tranh chấp thật = có phiếu phản đối VÀ chính chủ chưa tự nhận.
     · Cụm trùng (05/9, `?v=62`): phiếu GỘP > KHÔNG GỘP ⇒ gộp; ngược lại ⇒ không gộp; hoà
       (kể cả 0–0) ⇒ CHƯA PHÂN ĐỊNH, cần bỏ phiếu. Một phiếu lệch là xong.
     · Chấm SAI (18/10, thầy chốt khi duyệt đợt D): chỉ tính lỗi bị gỡ do ACCEPT APPEAL hoặc
       THẦY BỎ. Lỗi bị gộp trùng KHÔNG tính là sai.
   ═════════════════════════════════════════════════════════════════════════════════════════ */
(function (g) {
  'use strict';

  // So tên bằng trim + HOA: kho có bản ghi tên lệch hoa/thường, khoảng trắng thừa.
  function tenBang(a, b) {
    return !!a && !!b && String(a).trim().toUpperCase() === String(b).trim().toUpperCase();
  }
  function theoLoi(ds) {
    var m = {};
    (ds || []).forEach(function (p) { if (p && p.errId) (m[p.errId] = m[p.errId] || []).push(p); });
    return m;
  }
  function chinhChuDaNhan(e, ph) {
    return !!e.who && (ph || []).some(function (p) { return p.y === 'dongY' && tenBang(p.voter, e.who); });
  }
  // Chính chủ đã có ý kiến chưa (đồng ý hay phản đối đều tính)
  function chinhChuDaTraLoi(e, ph) {
    return !!e.who && (ph || []).some(function (p) { return tenBang(p.voter, e.who); });
  }
  function coPhanDoi(ph) { return (ph || []).some(function (p) { return p.y === 'phanDoi'; }); }
  // Tranh chấp thật — KHÔNG xét trangThai (trang học sinh tự lọc câu còn sống trước)
  function tranhChapThat(e, ph) { return coPhanDoi(ph) && !chinhChuDaNhan(e, ph); }
  // Như trên nhưng chỉ câu CÒN SỐNG (dùng ở trang thầy + đếm REQUIREMENT)
  function tranhChap(e, ph) { return laSong(e) && tranhChapThat(e, ph); }
  // Chính chủ đã nhận nhưng đồng đội vẫn cãi hộ — chỉ để đánh dấu, không phải việc phải xử
  function batDongTrongDoi(e, ph) {
    return chinhChuDaNhan(e, ph) && (ph || []).some(function (p) { return p.y === 'phanDoi' && !tenBang(p.voter, e.who); });
  }

  function laSong(e) { return !e.trangThai || e.trangThai === 'song'; }
  function soLoiSong(errors) { return (errors || []).filter(laSong).length; }

  /* Câu CHỜ THẦY tính được CHỈ từ mảng lỗi (không cần phiếu): đội chấm đã bấm KEEP, câu còn
     sống, thầy chưa quyết. Dùng cho huy hiệu thẻ dashboard — dashboard không đọc kho phiếu. */
  function choThay(e) { return laSong(e) && e.ketLuan === 'keep' && !e.thay; }

  /* Lỗi này có bị coi là CHẤM SAI không (thầy chốt 18/10): thầy BỎ, hoặc đội bị chấm thắng
     phản biện (ACCEPT APPEAL ⇒ ketLuan 'agree' + trangThai 'go') mà thầy không lật lại.
     Gộp trùng (thay 'gop') KHÔNG phải sai. */
  function biGo(e) {
    if (e.thay) return e.thay === 'bo';
    return e.trangThai === 'go' && e.ketLuan === 'agree';
  }

  // ─── Cụm trùng ───
  function demPhieuCum(ds) {
    var m = {};
    (ds || []).forEach(function (p) {
      if (!p || !p.y || !p.cumId) return;            // `y` rỗng = đã rút phiếu
      var d = m[p.cumId] || (m[p.cumId] = { gop: 0, khong: 0 });
      if (p.y === 'gop') d.gop++; else if (p.y === 'khong') d.khong++;
    });
    return m;
  }
  function ketQuaCum(d) {
    d = d || { gop: 0, khong: 0 };
    return d.gop > d.khong ? 'gop' : d.khong > d.gop ? 'khong' : 'hoa';
  }
  function cumSong(c) { return (c.ids || []).length > 1; }   // ids rỗng = cụm đã giải tán

  // ─── Thanh đội (thẻ + pop-up + trang chi tiết) ───
  var DOI_MAU_CO_DINH = [{ min: 30, m: 'm-la' }, { min: 25, m: 'm-duong' }, { min: 20, m: 'm-cam' }];
  function mauCoDinhDoi(tb) {
    for (var i = 0; i < DOI_MAU_CO_DINH.length; i++) if (tb >= DOI_MAU_CO_DINH[i].min) return DOI_MAU_CO_DINH[i].m;
    return null;
  }
  /* Gộp `docs` (tongLoi thô) + `teams` (roster buổi) thành mảng đội đã xếp, mỗi đội có màu.
     `khoa` = hàm ghép em (trang web truyền `A.khoaTen` — mã số em, cả tên cũ).
     Em chưa nộp vẫn hiện, 0 lỗi. Màu: TB ≥30 xanh lá, ≥25 xanh dương, ≥20 cam; còn lại xếp
     HẠNG theo tổng (1 xanh lá, 2 xanh dương, 3 cam, 4–5 đỏ; nhóm dưới 4 đội thì đội bét đỏ).
     Thanh dung tích cố định 200 lỗi; đội nhiều lỗi nhất đứng trên. */
  function tinhDoiSp(teams, docs, khoa) {
    khoa = khoa || function (t) { return String(t || '').trim().toUpperCase(); };
    var theoTen = {}, lucTen = {};
    (docs || []).forEach(function (d) {
      var ten = khoa(d.student);
      if (!ten) return;
      theoTen[ten] = (theoTen[ten] || 0) + soLoiSong(d.errors);
      // mốc SỚM NHẤT của em — phân trên/dưới khi hai em trùng điểm (avatar trên thanh)
      var l = +d.capNhatLuc || 0;
      if (l && (!lucTen[ten] || l < lucTen[ten])) lucTen[ten] = l;
    });
    var doi = (teams || []).map(function (t) {
      var hs = (t.members || []).map(function (m) {
        var k = khoa(m);
        return { ten: m, so: theoTen[k] || 0, luc: lucTen[k] || 0 };
      }).sort(function (a, b) { return b.so - a.so; });
      var tong = hs.reduce(function (s, e) { return s + e.so; }, 0);
      return { team: t.team, ten: 'TEAM ' + t.team, tong: tong, tb: hs.length ? tong / hs.length : 0, hs: hs };
    });
    var chuaCoMau = doi.filter(function (d) { return !mauCoDinhDoi(d.tb); }).sort(function (a, b) { return b.tong - a.tong; });
    var mauHang = ['m-la', 'm-duong', 'm-cam', 'm-do', 'm-do'];
    chuaCoMau.forEach(function (d, i) {
      d.mau = (chuaCoMau.length < 4 && i === chuaCoMau.length - 1) ? 'm-do' : (mauHang[i] || 'm-do');
    });
    doi.forEach(function (d) { if (!d.mau) d.mau = mauCoDinhDoi(d.tb); });
    var TRAN_DOI = 200;
    doi.forEach(function (d) { d.pt = Math.min(100, Math.round(d.tong / TRAN_DOI * 100)); });
    doi.sort(function (a, b) { return b.tong - a.tong; });
    return doi;
  }

  /* ⭐ Chất lượng chấm TỪNG EM (đợt D món 3.3 + màn RESULTS 2.3).
     Trả về { [khoa(em)]: { ten, doi, con, cho, go, gop, g, p, i, biBat, chinhXac } }
       con      = lỗi em bắt CÒN TÍNH (còn sống — đúng số trên thanh đội)
       cho      = trong `con`, số câu đang CHỜ THẦY (Keep, thầy chưa quyết)
       go       = bị gỡ vì chấm sai (Accept Appeal / thầy BỎ) — xem `biGo`
       gop      = bị gộp vào cụm trùng (KHÔNG tính sai)
       g/p/i    = `con` chia theo loại Grammar / Pronunciation / Information
       biBat    = số lỗi CÒN TÍNH mà bạn khác bắt được trong bài nói của em (`who` = em)
       chinhXac = (con − cho) ÷ (con − cho + go), làm tròn %; chưa có gì để tính ⇒ null */
  function thongKeEm(teams, docs, khoa) {
    khoa = khoa || function (t) { return String(t || '').trim().toUpperCase(); };
    var kq = {};
    function o(ten, doi) {
      var k = khoa(ten);
      if (!k) return null;
      if (!kq[k]) kq[k] = { ten: ten, doi: doi || '', con: 0, cho: 0, go: 0, gop: 0, g: 0, p: 0, i: 0, biBat: 0, chinhXac: null };
      if (doi && !kq[k].doi) kq[k].doi = doi;
      return kq[k];
    }
    (teams || []).forEach(function (t) { (t.members || []).forEach(function (m) { o(m, 'TEAM ' + t.team); }); });
    (docs || []).forEach(function (d) {
      var em = o(d.student, d.myTeam);
      (d.errors || []).forEach(function (e) {
        if (e.trangThai === 'an') return;          // em tự xoá
        if (laSong(e)) {
          if (em) {
            em.con++;
            if (choThay(e)) em.cho++;
            if (e.type === 'Grammar') em.g++; else if (e.type === 'Pronunciation') em.p++; else if (e.type === 'Information') em.i++;
          }
          var bi = e.who ? kq[khoa(e.who)] : null;
          if (bi) bi.biBat++;
        } else if (em) {
          if (biGo(e)) em.go++; else if (e.thay === 'gop') em.gop++;
        }
      });
    });
    Object.keys(kq).forEach(function (k) {
      var x = kq[k], chac = x.con - x.cho;
      x.chinhXac = (chac + x.go) > 0 ? Math.round(chac / (chac + x.go) * 100) : null;
    });
    return kq;
  }

  g.SPLuat = {
    tenBang: tenBang, theoLoi: theoLoi, chinhChuDaNhan: chinhChuDaNhan, chinhChuDaTraLoi: chinhChuDaTraLoi,
    tranhChapThat: tranhChapThat, tranhChap: tranhChap, batDongTrongDoi: batDongTrongDoi,
    laSong: laSong, soLoiSong: soLoiSong, choThay: choThay, biGo: biGo,
    demPhieuCum: demPhieuCum, ketQuaCum: ketQuaCum, cumSong: cumSong,
    mauCoDinhDoi: mauCoDinhDoi, tinhDoiSp: tinhDoiSp, thongKeEm: thongKeEm
  };
})(typeof window !== 'undefined' ? window : this);
