/* ⛔⛔ BẢN CHÉP LIÊN KHO (05/09/2026, myLesson web v1.66.0) — NGUỒN GỐC là
   `mySpeaking/web/js/trung.js`. Trang chi tiết SP CHECK (bảng chốt, tab KIỂM TRA TRÙNG)
   cần cùng một tầng gợi ý "THẦY ANDREW GỢI Ý" với màn học sinh, nên chép nguyên văn sang
   đây thay vì nạp chéo từ site mySpeaking (đứt site kia là bảng chết câm).
   Sửa bên kia là PHẢI chép lại sang đây; kiểm bằng:
     diff <(tail -n +8 "myLesson Web/js/trung.js") "mySpeaking/web/js/trung.js"
   phải KHÔNG có khác biệt (7 dòng đầu là khối chú thích này). */
/* ══════════════════════════════════════════════════════════════════════════════════════
   trung.js — GỢI Ý LỖI TRÙNG ("THẦY ANDREW GỢI Ý")   ·  mySpeaking web, 03/09/2026
   ══════════════════════════════════════════════════════════════════════════════════════
   VIỆC CỦA FILE NÀY: nhận danh sách lỗi mà các đội khác bắt cho MỘT đội, trả về những
   dòng NGHI LÀ TRÙNG nhau. Chỉ GỢI Ý — quyền gộp và quyền chốt hoàn toàn của học sinh
   (thầy chốt 03/09: "không trực tiếp gom cụm bằng quyết định của AI").

   CHỈ MỘT TẦNG: SO CHỮ, chạy trong trình duyệt học sinh, tức thì và miễn phí.
   Đo thật 03/09 trên buổi A2B: đánh dấu **66/116 dòng (57%)** ở TEAM 1 và **70/137 (51%)**
   ở TEAM 2; gộp phần chắc chắn trùng thì cả buổi 464 dòng còn 341 (bớt 27%).
   ⛔ TỪNG CÓ TẦNG ② HỎI GEMINI — **đã dựng xong, đo thật rồi THẦY CHỐT BỎ** ngày 03/09 vì
      nó chỉ thêm được +5/116 và +4/137 dòng mà tốn 20–25 giây. Xem khối ghi chú giữa file
      và `DA THU VA BO — GEMINI.md` trước khi nghĩ tới chuyện dựng lại.

   ⭐⭐ 05/09/2026 (`?v=61`) — LUẬT 21/07 ĐÃ ĐƯỢC THẦY GỠ **RIÊNG CHO WEB HỌC SINH**.
   Luật cũ: *hai dòng của CÙNG MỘT NGƯỜI CHẤM không bao giờ là một lỗi* (một em không ghi lại
   cùng một lỗi hai lần; hai dòng giống chữ ở hai mốc giờ nghĩa là NGƯỜI NÓI SAI HAI LẦN, phải
   đếm 2 — đã trả giá 13 dòng bị nuốt hồi 21/07/2026).
   Nay thầy chốt: ở màn KIỂM TRA TRÙNG học sinh **được gộp cả hai dòng cùng người chấm**, và
   tầng gợi ý cũng **gợi ý cả hai loại** (xem `xetDuoc`).
   ⛔⛔ BẢN GỐC CỦA LUẬT VẪN SỐNG Ở APP MÁY TÍNH: `mySpeaking/app/tools/danhgia.py`
   `cung_mot_loi_duoc` — thầy CHỈ nói web học sinh, **đừng đem thay đổi này sang bên đó**.

   ⛔ HỌC SINH KHÔNG BAO GIỜ THẤY CHỮ "MÁY" HAY "AI" (thầy chốt 03/09) — mọi nhãn trên màn
   đều là "THẦY ANDREW GỢI Ý". File này chỉ lo phần tính, chữ nằm ở app.js.
   ══════════════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Tham số đã ĐO THẬT, đừng chỉnh mò ─────────────────────────────────────────────
     LECH_GIAY 10: hai em bấm mốc lệch nhau vài giây là bình thường (người bấm lúc nghe
     thấy, người bấm lúc chép xong câu). Nới quá 10 là bắt đầu gom nhầm hai câu liền kề.
     ⛔ Đo trên A2B/B2A: 8 giây bỏ sót vài cặp thật, 15 giây bắt đầu dính cặp giả. */
  var LECH_GIAY = 10;

  /* Từ vô nghĩa khi so "hai em có nói về cùng một chỗ sai không". Gồm cả chữ Việt các em
     hay viết ("sai ở từ", "phát âm sai", "thiếu s") lẫn chữ Anh khung câu ("said",
     "instead of"). ⛔ Thiếu bảng này là mọi dòng đều "chung từ said/instead" ⇒ gộp bừa. */
  var BO_QUA = (
    'said say says instead of the a an to in on at is are was were be been am ' +
    'it he she they we you i and or but not no did do does done have has had ' +
    'that this these those with for from about into than then there here as ' +
    'sai o tu tu phat am phat-am wrong pronunciation pronounce word words ' +
    'thieu thua them bo doc ban phai so nhieu it chua xac dinh dac biet la ' +
    'cau cai nay kia do khong co bi duoc lai roi nua van con hoac va cua ' +
    'letter dont doesnt cant wasnt werent isnt arent nothing none thanh cach ' +
    'loi mistake error grammar information sentence explain explanation'
  ).split(/\s+/);
  var BO_QUA_SET = {};
  BO_QUA.forEach(function (w) { BO_QUA_SET[w] = 1; });

  /* Bỏ dấu tiếng Việt — CÙNG luật với `khongDauTen` bên app.js (chép lại để file này
     đứng độc lập, nạp trước hay sau app.js đều chạy). */
  function khongDau(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }

  /* Về GỐC TỪ thô sơ: bỏ đuôi s/es/ed/ing để "grow" ~ "grows" ~ "growing",
     "spot" ~ "spots". ⛔ Chỉ cắt khi phần còn lại còn ít nhất 3 chữ, không thì
     "is" → "" và "does" → "do" làm nhiễu. */
  function gocTu(w) {
    var m = w.match(/^(.*?)(ies|es|ed|ing|s)$/);
    if (!m) return w;
    var goc = m[1];
    if (m[2] === 'ies') goc += 'y';
    return goc.length >= 3 ? goc : w;
  }

  function tachTu(s) {
    return khongDau(s).replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/)
      .filter(function (w) { return w.length > 1 && !BO_QUA_SET[w]; })
      .map(gocTu);
  }

  /* TỪ ĐÍCH của một dòng = "em này đang nói về chỗ nào trong câu".
     Ba nguồn, ưu tiên giảm dần — bắt được cả kiểu ghi rất khác nhau của các em:
       ① chữ trong NGOẶC KÉP ở phần mô tả lỗi:  said "spot" instead of "spots"  → spot
       ② từ trong phần mô tả lỗi MÀ CÓ MẶT trong câu trích: "phát âm sai other" → other
       ③ hết cách thì lấy mọi từ có nghĩa của phần mô tả (em chỉ ghi mỗi "unappetizing")
     ⛔ Đừng bỏ tầng ③: rất nhiều em chỉ gõ đúng một từ bị sai, không viết câu nào. */
  function tuDich(x) {
    var trongNgoac = [];
    String(x.loi || '').replace(/["'“”‘’]([^"'“”‘’]{2,40})["'“”‘’]/g,
      function (_, g) { trongNgoac.push(g); return ''; });
    var ds = trongNgoac.length ? [].concat.apply([], trongNgoac.map(tachTu)) : [];
    if (!ds.length) {
      var cau = {};
      tachTu(x.cau).forEach(function (w) { cau[w] = 1; });
      ds = tachTu(x.loi).filter(function (w) { return cau[w]; });
    }
    if (!ds.length) ds = tachTu(x.loi);
    var set = {};
    ds.forEach(function (w) { set[w] = 1; });
    return set;
  }

  function chungTu(a, b) {
    for (var w in a) if (b[w]) return true;
    return false;
  }

  /* Hai dòng CÓ ĐƯỢC PHÉP xét là một lỗi không (chưa xét nội dung).
     ⭐⭐ 05/09/2026 (`?v=61`, thầy chốt) — ĐÃ GỠ điều kiện `a.cham !== b.cham`. Trước đây tầng
     gợi ý bỏ qua mọi cặp do CÙNG MỘT EM ghi (luật 21/07 nói ở đầu file). Thầy chốt cho gộp cả
     loại đó ở màn KIỂM TRA TRÙNG, và chốt luôn: máy **gợi ý cả hai loại**.
     ⛔ Luật 21/07 vẫn SỐNG ở app máy tính (`mySpeaking/app/tools/danhgia.py cung_mot_loi_duoc`)
        — ĐỪNG đem thay đổi này sang bên đó. */
  function xetDuoc(a, b) {
    if (!a.cham || !b.cham) return false;
    if (a.type !== b.type) return false;
    if (a.who && b.who && a.who !== b.who) return false;   // hai người nói khác nhau
    return Math.abs(a.t - b.t) <= LECH_GIAY;
  }

  /* ── TẦNG ①: SO CHỮ ─────────────────────────────────────────────────────────────────
     Trả về { chac: [[i,j]…], mo: [[i,j]…] }. Danh sách xếp theo thời gian nên vòng
     trong `break` được ngay khi vượt cửa sổ — buổi 600 dòng vẫn chạy trong vài ms. */
  function soChu(ds) {
    var chac = [], mo = [];
    for (var i = 0; i < ds.length; i++) {
      for (var j = i + 1; j < ds.length; j++) {
        if (ds[j].t - ds[i].t > LECH_GIAY) break;
        if (!xetDuoc(ds[i], ds[j])) continue;
        (chungTu(ds[i]._dich, ds[j]._dich) ? chac : mo).push([i, j]);
      }
    }
    return { chac: chac, mo: mo };
  }

  /* ── TẦNG ② (GEMINI) — ĐÃ GỠ NGÀY 03/09/2026, THẦY CHỐT ────────────────────────────
     Đã dựng xong và ĐO THẬT rồi mới bỏ, nên đừng dựng lại mà không đọc hết chỗ này:
       · Đường Firebase AI Logic: bắt buộc App Check (đã dựng đủ, lấy được token thật 953
         ký tự, hết sạch 403) nhưng vẫn chặn ở lớp cuối — "Your prepayment credits are
         depleted": đường đó tính vào ví trả trước của `aword-70dae`, KHÔNG dùng bậc miễn phí.
       · Đường gọi thẳng bằng khoá riêng: CHẠY ĐƯỢC và miễn phí thật (project không billing),
         nhưng **GitHub chặn push** vì khoá dạng mới `AQ.…` gắn service account.
       · Đo trên buổi thật A2B: Gemini chỉ thêm **+5 dòng / 116** (TEAM 1) và **+4 / 137**
         (TEAM 2) so với tầng ①, mà tốn **20–25 giây**. Thầy chốt KHÔNG đáng.
     ⇒ Còn đúng tầng ①. Muốn dựng lại thì đọc `DA THU VA BO — GEMINI.md` cùng thư mục.
     ⛔ Nếu dựng lại: model `gemini-2.5-*` và `2.0-flash` đã bị Google khoá (404), phải thử
        thật tên model trước; và tầng ② phải chạy NỀN (trả tầng ① ra trước), đừng bắt em chờ. */

  /* ── CỬA CHÍNH ──────────────────────────────────────────────────────────────────────
     dsLoi: [{ id, cham, who, type, t, cau, loi, gt }]  (t = giây trong video)
     Trả:   { danhDau: {errId:true}, cap: [[idA,idB]], soCapMo }
     `danhDau` chính là thứ màn hình dùng để gắn nhãn "THẦY ANDREW GỢI Ý" lên từng dòng.
     `soCapMo` = số cặp so chữ KHÔNG dám quyết — giữ lại vì đó là thước đo "còn bao nhiêu chỗ
     máy chịu thua", đúng phần học sinh phải tự nhìn. Chạy hết trong vài mili giây.
     ⛔ Vẫn trả Promise: `app.js` gọi bằng `await`, và nếu sau này dựng lại tầng ② thì không
        phải sửa nơi gọi. */
  function goiY(dsLoi) {
    var ds = (dsLoi || []).slice().sort(function (a, b) { return a.t - b.t; });
    ds.forEach(function (x) { x._dich = tuDich(x); });

    var b1 = soChu(ds);
    var danhDau = {};
    var capId = b1.chac.map(function (c) {
      danhDau[ds[c[0]].id] = true;
      danhDau[ds[c[1]].id] = true;
      return [ds[c[0]].id, ds[c[1]].id];
    });

    /* ⭐ 03/09 (thầy chốt) — GOM CÁC CẶP THÀNH NHÓM và trả về `nhom = {errId: số nhóm}`.
       Màn hình cần nó để **kẻ vạch ngăn** khi hai nhóm gợi ý nằm liền nhau trong danh sách:
       không có vạch thì bốn ô xanh liên tiếp trông như một cụm, em gộp nhầm cả bốn.
       Union-find nhỏ, cùng luật với `_hop_nhom` bên app máy tính. */
    var cha = ds.map(function (_, i) { return i; });
    function tim(i) { while (cha[i] !== i) { cha[i] = cha[cha[i]]; i = cha[i]; } return i; }
    b1.chac.forEach(function (c) { cha[tim(c[0])] = tim(c[1]); });
    var soNhom = {}, dem = 0, nhom = {};
    ds.forEach(function (x, i) {
      if (!danhDau[x.id]) return;
      var g = tim(i);
      if (soNhom[g] == null) soNhom[g] = ++dem;
      nhom[x.id] = soNhom[g];
    });

    return Promise.resolve({ danhDau: danhDau, cap: capId, nhom: nhom, soCapMo: b1.mo.length });
  }

  window.SPTrung = { goiY: goiY, LECH_GIAY: LECH_GIAY };
})();
