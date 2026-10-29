/* cham-sach.js — POP-UP CHẤM BÀI SÁCH trên dashboard (web v1.387.0, 21/10/2026; mẫu thầy duyệt `myLesson - thiet ke nop sach\mau-v4-dashboard.html`).
   Trái: danh sách em + trạng thái · Giữa: ảnh trang em nộp (tự xoay theo AI, vừa bề ngang, cuộn dọc) + thanh công cụ · Phải: CHẤM THAM KHẢO
   (đủ mọi câu mọi trang, chia nhóm theo trang) + lời nhắn soạn sẵn. Dữ liệu: `lessonSach/<LỚP>__<bài>__<bước>__<mã>` (chỉ máy chủ ghi).
   ⭐ v1.389.0 — DẤU ✓/✕ máy tự đặt cạnh chữ cái em khoanh (máy chủ dau-sach.js: Claude đọc + Google Vision định vị ⇒ `may.cau[i].dau`).
   ⭐ v1.390.0 (21/10/2026, thầy chỉnh sau khi xem bàn thử 8 ảnh Zalo thật):
     · Nút trang tô cả nút: XANH = đúng hết · VÀNG = có câu sai / chưa chắc · ĐỎ = chưa nộp / máy chặn / đã trả lại.
     · Bảng chấm: mọi câu của mọi trang, có dải chia trang; bấm một dòng ⇒ chuyển trang, cuộn tới dấu câu đó, dấu NHẤP NHÁY.
     · Công cụ: bút · khoanh · mũi tên · KẺ (bấm điểm đầu ⇒ đường bám chuột ⇒ bấm điểm cuối) · ✓ · ✕ · ? · chữ · 3 màu · hoàn tác · xoá nét.
       Con trỏ = chính công cụ, ĐÚNG CỠ khi vẽ thật. Chuột phải vào nút công cụ ⇒ thanh kéo chọn cỡ (lưu trên máy, mở em khác vẫn giữ).
     · Chuột phải trên ảnh (tắt menu trình duyệt) ⇒ Đảo đánh dấu · Xoá đánh dấu · Xoá tất cả dấu · Xoá hết nét vẽ · Khôi phục bài chấm AI.
     · Hàng nút dưới: CHỤP LỖI (pop-up 1 trang/hàng: CHỤP từng trang + TRẢ LẠI từng trang kèm ẢNH ĐÃ CHẤM ⇒ em xem chi tiết trên web)
       · ĐẠT (pop-up 2 trang/hàng + CHỤP ẢNH ĐẠT = 1 ảnh ghép mọi trang vào clipboard VÀ ghi ĐẠT cả bài — thầy chốt "một cú bấm").
   Sửa của thầy (dấu + nét vẽ) giữ theo trang trong suốt phiên mở dashboard (`SUA`); TRẢ LẠI gửi kèm ảnh đã chấm lên máy chủ.
   ⭐ v1.391.0 (thầy chốt) — LƯU LÂU DÀI phần thầy sửa (hàm máy chủ luuChamSach ⇒ lessonSach.cham, tự lưu sau 1,2 giây) · KHOÁ NÚT:
     ĐẠT khoá khi còn ✕ sai hoặc còn câu chưa có dấu ✓/✕ (? = chưa có) · CHỤP LỖI khoá khi còn câu chưa có dấu hoặc mọi câu đều ✓.
     Dấu tay ✓/✕/? tự gắn vào câu chưa có dấu (câu đang chọn trong bảng, không thì câu gần nhất theo vị trí nội suy).
   ⭐ v1.397.0 (22/10/2026, thầy "ok build") — CÁC DẠNG BÀI VIẾT (bảng điền cột · điền từ · dịch cụm · chủ/tân ngữ): đáp án ở
     `sachGoc.viet` (JSON), máy chủ AI chấm từng Ô ⇒ `may.cau[i].o[k] = {cot, doc, kq, sua, ly, dau}`. Mỗi ô là một "câu" trong bảng chấm:
     câu 1 ô ⇒ mã = số câu; câu nhiều ô (bảng) ⇒ mã = "số.thứ tự ô" (4.1 = câu 4 cột 1) — hiện "4·1". Dòng bảng: chữ em viết · đáp án.
   ⭐ v1.398.0 (22/10, thầy) — GIỮ CTRL = chế độ KÉO DẤU: con trỏ thành bàn tay, bấm vào dấu ✓/✕/? (máy hay tay) rồi kéo đi; thả = tự lưu,
     Ctrl+Z hoàn tác. Ctrl + bấm chỗ trống không vẽ gì.
   ⭐ v1.399.0 (22/10, thầy) — NÚT ⚙ CÀI ĐẶT DẤU (cuối thanh công cụ): cỡ + nét (mảnh/vừa/đậm) mặc định cho ✓ ✕ ?; ÁP DỤNG ⇒ lưu trên máy
     + vẽ lại ngay bài đang sửa. CỠ tính theo CHỮ IN của từng ảnh (Vision đo cao chữ ⇒ `dau.h`), không theo độ phân giải: "×1,0" = dấu cao
     bằng chữ in. Dấu tay cũng lấy cao chữ của trang (trung vị dấu máy trên trang) thay vì theo khung ảnh.
   ⭐ v1.400.0 (22/10, thầy) — mọi nút trong pop-up dùng ICON PHẲNG 2D kiểu Lucide (SVG nét, `ico()`), bỏ emoji/ký tự.
   ⭐ v1.401.0 (22/10, thầy) — ⚙ thêm CHỮ GÕ (cỡ theo cao chữ in của ảnh + nét mảnh/vừa/đậm; chữ đã gõ đổi theo khi ÁP DỤNG — nét chữ mới
     lưu `tl:true`, cỡ tính lúc vẽ) · MỘT FONT CHUNG (`FONT` = font của dashboard) cho mọi chữ: CSS pop-up, menu/cài đặt (gắn ngoài #csNen
     nên trước đây rơi về font mặc định của trình duyệt), ô gõ, chữ vẽ trên ảnh + ảnh ghép; mở pop-up là nạp sẵn font rồi vẽ lại.
   Mở: ChamSach.mo({...}). */
(function () {
  'use strict';
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
  var FONT = "Montserrat, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";   // ⭐ v1.401.0 MỘT font chung (= --font dashboard)   // ⛔ trùng SP_SDK dashboard.html
  var MAU = ['#DC2626', '#16A34A', '#2F6FED'];
  var MAU_DAU = { dung: '#16A34A', sai: '#DC2626', hoi: '#F59E0B' };
  // Cỡ công cụ: nét (but/tron/ten/ke) = phần nghìn cạnh dài ảnh; dấu (dung/sai/hoi) + chữ = hệ số (1 = cỡ máy tự đặt)
  var CO_MD = { but: 4, tron: 4, ten: 4, ke: 4, dung: 1, sai: 1, hoi: 1, chu: 1 };
  var CO_GH = { but: [1, 20, 1], tron: [1, 20, 1], ten: [1, 20, 1], ke: [1, 20, 1], dung: [0.5, 3, 0.1], sai: [0.5, 3, 0.1], hoi: [0.5, 3, 0.1], chu: [0.5, 3, 0.1] };
  var TEN_CU = { but: 'Bút', tron: 'Khoanh tròn', ten: 'Mũi tên', ke: 'Kẻ đường thẳng', dung: 'Dấu đúng', sai: 'Dấu sai', hoi: 'Dấu hỏi', chu: 'Gõ chữ' };
  var CO = (function () { try { return Object.assign({}, CO_MD, JSON.parse(localStorage.getItem('csCo') || '{}')); } catch (e) { return Object.assign({}, CO_MD); } })();
  function luuCo() { try { localStorage.setItem('csCo', JSON.stringify(CO)); } catch (e) { /* bộ nhớ trình duyệt khoá — cỡ chỉ giữ trong phiên */ } }
  // ⭐ v1.399.0 nét dấu: mảnh / vừa / đậm (nét ✓ ✕ = phần của cỡ dấu · ? = độ đậm chữ)
  var NET_MD = { dung: 'vua', sai: 'vua', hoi: 'dam', chu: 'dam' }, NET_DAY = { manh: 0.2, vua: 0.36, dam: 0.52 }, NET_CHU = { manh: 500, vua: 600, dam: 800 };   // chỉ dùng độ đậm CÓ trong assets/fonts.css (500–600 + 800) ⇒ không bị đậm giả
  var NET_GO = { manh: 500, vua: 600, dam: 800 }, HE_GO = 1.45;   // chữ gõ: cỡ chữ = 1,45 · cao chữ in (Vision) · CO.chu ⇒ ×1,0 ≈ bằng chữ in sách
  var NET = (function () { try { return Object.assign({}, NET_MD, JSON.parse(localStorage.getItem('csNet') || '{}')); } catch (e) { return Object.assign({}, NET_MD); } })();
  function luuNet() { try { localStorage.setItem('csNet', JSON.stringify(NET)); } catch (e) { /* chỉ giữ trong phiên */ } }
  var HE_CO = 1.1;   // cỡ dấu (s = 0,55 · cao chữ · CO) ⇒ dấu cao ≈ 1,1 · cao chữ · CO — hiện cho thầy theo × cao chữ in
  var SUA = {};           // khoá lop|bai|bt|ma|trang|cu ⇒ { dau:[…], net:[…], lich:[…] }
  var ANH = {};           // url ⇒ Promise<{ im, ban }>
  var S = null;
  function $(s, g) { return (g || document).querySelector(s); }
  function chu(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(t) { var n = $('#csToast'); if (!n) return; n.textContent = t; n.classList.add('hien'); clearTimeout(n._h); n._h = setTimeout(function () { n.classList.remove('hien'); }, 2600); }
  var HAM = {};
  function hamGoi(ten) {
    if (!HAM[ten]) {
      HAM[ten] = window.AWChat.kho().then(function () {
        return Promise.all([import(SDK + '/firebase-app.js'), import(SDK + '/firebase-functions.js')]).then(function (m) {
          return m[1].httpsCallable(m[1].getFunctions(m[0].getApp(), 'asia-southeast1'), ten, { timeout: 60000 });
        });
      });
      HAM[ten]['catch'](function () { delete HAM[ten]; });
    }
    return HAM[ten];
  }
  function hamDuyet() { return hamGoi('duyetSach'); }
  function docDapAn(sach, trangs) {
    var db = (window.AWC && window.AWC.CFG && window.AWC.CFG.AWORD_DB) || {};
    return Promise.all(trangs.map(function (p) {
      var u = 'https://firestore.googleapis.com/v1/projects/' + db.projectId + '/databases/(default)/documents/sachGoc/' + sach + '_p' + String(p).padStart(3, '0') + '?key=' + encodeURIComponent(db.apiKey || '');
      return fetch(u, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        var m = (j && j.fields && j.fields.dapAn && j.fields.dapAn.mapValue && j.fields.dapAn.mapValue.fields) || {}, o = {};
        Object.keys(m).forEach(function (k) { o[k] = m[k].stringValue; });
        var v = j && j.fields && j.fields.viet && j.fields.viet.stringValue;
        if (v) {   // dạng bài VIẾT ⇒ mỗi ô một mục { so, cot, dung[], de }
          try {
            o = {};
            (JSON.parse(v).cau || []).forEach(function (c) {
              (c.o || []).forEach(function (x, k) { o[maO(c, k)] = { so: c.so, cot: x.cot, dung: x.dung || [], de: c.de || '' }; });
            });
          } catch (e) { /* đáp án hỏng ⇒ để trống, thầy chấm tay */ }
        }
        return o;
      })['catch'](function () { return {}; });
    })).then(function (ds) { var o = {}; trangs.forEach(function (p, i) { o[p] = ds[i]; }); return o; });
  }

  // Mã một ô bài VIẾT: câu 1 ô ⇒ "4" · câu nhiều ô ⇒ "4.1", "4.2"… (số thập phân — sắp xếp, lưu Firestore như số câu thường)
  function maO(c, k) { return (c.o || []).length > 1 ? c.so + '.' + (k + 1) : String(c.so); }
  function tenSo(n) { return String(n).replace('.', '·'); }
  var TEN_COT = { hoi: 'câu hỏi', loai: 'từ loại', nghia: 'nghĩa', nguyen: 'nguyên vẹn', ketluan: 'kết luận', vai: 'vai', tiengAnh: 'tiếng Anh', tuongDong: 'tương đồng' };

  // ───────── dữ liệu từng trang ─────────
  function emHien() { return S.em[S.i]; }
  function trangCua(e, p) { return (((e && e.doc) || {}).trang || {})[String(p)] || null; }
  function banCua(e, p, cu) { var t = trangCua(e, p); return t && cu >= 0 && t.cu && t.cu[cu] ? t.cu[cu] : t; }
  function khoa(e, p, cu) { return [S.lop, S.bai, S.bt, e.ma, p, cu].join('|'); }
  function soCau(p) { return Object.keys(S.dapAn[p] || {}).map(Number).sort(function (a, b) { return a - b; }); }
  // Dấu máy từ kết quả AI: ✓ đúng đáp án · ✕ sai · ? AI không chắc
  function dauTuMay(ban, p) {
    var da = S.dapAn[p] || {};
    if (ban && ban.may && ban.may.viet) {   // bài VIẾT: AI đã chấm từng ô (trống = ✕)
      var ra = [];
      (ban.may.cau || []).forEach(function (c) {
        (c.o || []).forEach(function (o, k) {
          if (!o.dau) return;
          var d = o.dau, loai = o.kq === 'dung' ? 'dung' : (o.kq === 'hoi' ? 'hoi' : 'sai');
          ra.push({ so: Number(maO(c, k)), loai: loai, x: d.x, y: d.y, ux: d.ux == null ? 1 : d.ux, uy: d.uy == null ? 0 : d.uy, h: d.h, may: true });
        });
      });
      return ra;
    }
    return ((ban && ban.may && ban.may.cau) || []).filter(function (c) { return c.dau && /^[ABCD]$/.test(c.chon || ''); }).map(function (c) {
      var d = c.dau, dung = da[String(c.so)];
      var loai = c.chac === false ? 'hoi' : (dung ? (c.chon === dung ? 'dung' : 'sai') : 'hoi');
      return { so: c.so, loai: loai, x: d.x, y: d.y, ux: d.ux == null ? 1 : d.ux, uy: d.uy == null ? 0 : d.uy, h: d.h, may: true };
    });
  }
  // ⭐ v1.391.0 — bản thầy đã sửa được LƯU LÂU DÀI (`lessonSach.cham.<khoaLuu>`, hàm máy chủ luuChamSach); chỉ dùng khi đúng ảnh (url)
  function khoaLuu(p, cu) { return String(p) + (cu >= 0 ? '_c' + cu : ''); }
  function suaCua(e, p, cu) {
    var k = khoa(e, p, cu);
    if (SUA[k]) return SUA[k];
    var ban = banCua(e, p, cu), luu = (((e && e.doc) || {}).cham || {})[khoaLuu(p, cu)], o;
    if (luu && ban && luu.url === ban.url) o = { dau: JSON.parse(JSON.stringify(luu.dau || [])), net: (luu.net || []).map(netTuLuu), lich: [], daLuu: true };
    else o = { dau: dauTuMay(ban, p), net: [], lich: [] };
    if (S.dapAnXong || o.daLuu) SUA[k] = o;  // đáp án chưa tải xong thì chưa "chốt" dấu máy
    return o;
  }
  function netTuLuu(n) {
    var q = Object.assign({}, n), d = n.d || [];
    if (d.length && typeof d[0] === 'number') { q.d = []; for (var i = 0; i + 1 < d.length; i += 2) q.d.push([d[i], d[i + 1]]); }
    else q.d = JSON.parse(JSON.stringify(d));
    return q;
  }
  function suaHien() { return suaCua(emHien(), S.p, S.cuChon); }
  // Mọi lần sửa đều đi qua ghiLich ⇒ hẹn lưu (gom 1,2 giây)
  function ghiLich(o) {
    SUA[khoa(emHien(), S.p, S.cuChon)] = o;
    o.lich.push(JSON.stringify({ dau: o.dau, net: o.net })); if (o.lich.length > 60) o.lich.shift();
    henLuu(emHien(), S.p, S.cuChon);
  }
  function hoanTac() { var o = suaHien(), x = o.lich.pop(); if (!x) return; x = JSON.parse(x); o.dau = x.dau; o.net = x.net; henLuu(emHien(), S.p, S.cuChon); veCv(); veAi(); veTab(); veDs(); }
  var HEN = {};
  function henLuu(e, p, cu) {
    var k = khoa(e, p, cu);
    if (HEN[k]) clearTimeout(HEN[k].t);
    HEN[k] = { t: setTimeout(function () { guiLuu(e, p, cu); }, 1200), e: e, p: p, cu: cu };
    hienLuu('dang');
  }
  function guiLuu(e, p, cu, xoa) {
    var k = khoa(e, p, cu);
    if (HEN[k]) { clearTimeout(HEN[k].t); delete HEN[k]; }
    var ban = banCua(e, p, cu), o = SUA[k];
    if (!ban) return Promise.resolve();
    var r4 = function (v) { return Math.round((+v || 0) * 1e4) / 1e4; }, r1 = function (v) { return Math.round((+v || 0) * 10) / 10; };
    var data = { id: [S.lop, S.bai, S.bt, e.ma].join('__'), khoa: khoaLuu(p, cu) };
    if (xoa || !o) data.xoa = true;
    else {
      data.url = ban.url;
      data.dau = o.dau.map(function (m) { return { so: m.so == null ? null : m.so, loai: m.loai, x: r4(m.x), y: r4(m.y), ux: r4(m.ux), uy: r4(m.uy), h: r4(m.h), may: !!m.may }; });
      data.net = o.net.map(function (n) {
        // ⛔ Firestore không nhận mảng lồng mảng ⇒ điểm lưu PHẲNG [x1,y1,x2,y2,…] (netTuLuu dựng lại)
        var q = { cu: n.cu, mau: n.mau, d: [] };
        n.d.forEach(function (pt) { q.d.push(r1(pt[0]), r1(pt[1])); });
        if (n.w != null) q.w = r1(n.w);
        if (n.chu != null) { q.chu = String(n.chu).slice(0, 200); q.co = r1(n.co); if (n.tl) q.tl = true; }
        return q;
      });
    }
    hienLuu('dang');
    return hamGoi('luuChamSach').then(function (f) { return f(data); }).then(function () {
      e.doc = e.doc || {}; e.doc.cham = e.doc.cham || {};
      if (data.xoa) delete e.doc.cham[data.khoa]; else e.doc.cham[data.khoa] = { url: data.url, dau: data.dau, net: data.net };   // dạng lưu (phẳng)
      if (!Object.keys(HEN).length) hienLuu('xong');
    }, function (er) { hienLuu('loi', er); });
  }
  function luuHet() { Object.keys(HEN).forEach(function (k) { var h = HEN[k]; guiLuu(h.e, h.p, h.cu); }); }
  function hienLuu(tt, er) {
    var n = $('#csLuu'); if (!n) return;
    n.className = 'cs-luu ' + tt;
    n.textContent = tt === 'dang' ? '⏳ đang lưu…' : (tt === 'xong' ? '✓ đã lưu' : '⚠ chưa lưu được');
    n.title = er ? String((er && er.message) || er) : '';
  }
  // ⭐ v1.391.0 — khoá nút: đếm mọi câu mọi trang theo dấu đang có (✓ đúng · ✕ sai · ? hoặc không dấu = THIẾU)
  function tongKet(e) {
    var thieu = [], sai = [], saiTay = 0;
    S.trangs.forEach(function (p) {
      var co = {};
      if (trangCua(e, p)) suaCua(e, p, -1).dau.forEach(function (m) { if (m.so != null) co[m.so] = m.loai; else if (m.loai === 'sai') saiTay++; });
      soCau(p).forEach(function (n) { var l = co[n]; if (l === 'sai') sai.push(n); else if (l !== 'dung') thieu.push(n); });
    });
    return { thieu: thieu, sai: sai, saiTay: saiTay };
  }
  function capNut() {
    var e = emHien(), tk = tongKet(e), coSai = tk.sai.length + tk.saiTay > 0;
    var lyDo = !S.dapAnXong ? 'Đang tải đáp án…' : (tk.thieu.length ? '🔒 Còn ' + tk.thieu.length + ' câu chưa có dấu ✓/✕: câu ' + tk.thieu.slice(0, 8).map(tenSo).join(', ') + (tk.thieu.length > 8 ? '…' : '') : '');
    var dat = $('#csDat'), loi = $('#csChupLoi');
    // ⭐ v1.435.0 (thầy chốt 28/10) — chưa chấm ĐẠT: nút chỉ chữ "ĐẠT"; thầy đã bấm ĐẠT (ghi máy chủ) ⇒ "ĐẠT ✓" + CHỤP LỖI mờ.
    // ⭐ v1.436.0 (thầy chốt 28/10) — bấm ĐẠT là ghi ĐẠT ngay (không pop-up); đã ĐẠT ⇒ nút trái thành CHỤP ẢNH (pop-up chụp ảnh ĐẠT),
    //   bấm lại ĐẠT ⇒ hỏi BỎ ĐẠT. Chưa ĐẠT / có lỗi ⇒ nút trái là CHỤP LỖI như cũ.
    var daDat = !!e && ttEm(e).lop === 'xong', dang = !!S.dangGhiDat;
    // ⭐ v1.448.0 (thầy 29/10) — khoá CHỈ vì còn câu chưa có dấu (vd xoá dấu máy rồi đặt dấu tay không gắn được câu), không có ✕ ⇒
    //   nút không `disabled` mà mang lớp `khoa`: bấm một lần chỉ nhắc, BẤM ĐÚP vẫn ghi ĐẠT.
    var khoaThieu = !daDat && !dang && S.dapAnXong && tk.thieu.length > 0 && !coSai;
    dat.className = 'cs-nut dat' + (daDat ? '' : ' chua') + (khoaThieu ? ' khoa' : '');
    dat.innerHTML = dang ? 'Đang ghi…' : 'ĐẠT' + (daDat ? ico('dat', 16, 2.2).replace('class="cs-ico"', 'class="cs-ico cs-tich"') : '');
    dat.disabled = dang || (!daDat && !khoaThieu && (!!lyDo || coSai));
    dat.title = daDat ? 'Đã ĐẠT — bấm lại để BỎ ĐẠT' : (khoaThieu ? lyDo + ' — BẤM ĐÚP để vẫn ghi ĐẠT' : lyDo || (coSai ? '🔒 Còn dấu ✕ sai — dùng CHỤP LỖI' : 'Bấm để ghi ĐẠT cả bài'));
    loi.innerHTML = ico('chup', 16, 2.2) + (daDat ? 'CHỤP ẢNH' : 'CHỤP LỖI');
    loi.disabled = dang || (!daDat && (!!lyDo || !coSai));
    loi.title = daDat ? 'Chụp ảnh ĐẠT (ảnh ghép mọi trang) để gửi Zalo' : lyDo || (!coSai ? '🔒 Mọi câu đều ✓ đúng — dùng ĐẠT' : 'Chụp từng trang lỗi / trả lại trang');
    $('#csKhoa').textContent = daDat ? '✓ Thầy đã chấm ĐẠT' : (khoaThieu ? lyDo + ' · bấm đúp ĐẠT để vẫn ghi' : '') || lyDo || (coSai ? 'Sai ' + (tk.sai.length + tk.saiTay) + ' chỗ ⇒ CHỤP LỖI' : '✓ Đúng hết ⇒ bấm ĐẠT');
  }
  // Trạng thái một trang (theo dấu đang có): thieu | chan | tra | dung | vang
  function ttTrang(e, p) {
    var t = trangCua(e, p);
    if (!t) return { tt: 'thieu' };
    var tra = !!(t.duyet && t.duyet.tt === 'tra');   // v1.448.0 — trang đã trả lại vẫn đếm câu sai (pop-up CHỤP LỖI từng in "Không có câu sai")
    if (!tra && !t.dat && !(t.duyet && t.duyet.tt === 'dat')) return { tt: 'chan' };
    var ds = suaCua(e, p, -1).dau, n = soCau(p).length, dem = { dung: 0, sai: 0, hoi: 0 };
    ds.forEach(function (m) { if (m.so != null && dem[m.loai] != null) dem[m.loai]++; });
    var tt = tra ? 'tra' : ((!dem.sai && !dem.hoi && n && dem.dung >= n) ? 'dung' : 'vang');
    return { tt: tt, dung: dem.dung, sai: dem.sai, hoi: dem.hoi, n: n };
  }
  function lopNut(tt) { return tt === 'dung' ? 'xanh' : (tt === 'vang' ? 'vang' : 'do'); }
  function ttEm(e) {
    var tr = ((e && e.doc) || {}).trang || {};
    if (!Object.keys(tr).length) return { lop: 'chua', chu: 'CHƯA NỘP' };
    var ts = S.trangs.map(function (p) { return ttTrang(e, p); });
    if (ts.some(function (t) { return t.tt === 'tra'; })) return { lop: 'tra', chu: 'ĐÃ TRẢ LẠI' };
    var daDat = S.trangs.every(function (p) { var t = trangCua(e, p); return t && t.duyet && t.duyet.tt === 'dat'; });
    if (daDat) return { lop: 'xong', chu: 'ĐÃ ĐẠT' };
    var thieu = ts.filter(function (t) { return t.tt === 'thieu' || t.tt === 'chan'; }).length;
    var sai = ts.reduce(function (s, t) { return s + (t.sai || 0); }, 0);
    return { lop: 'cho', chu: 'CHỜ CHẤM' + (thieu ? ' · thiếu ' + thieu + ' trang' : (sai ? ' · sai ' + sai : ' · đúng hết')) };
  }

  // ───────── ảnh ─────────
  function taiAnh(url) {
    if (!url) return Promise.reject(new Error('không có ảnh'));
    if (!ANH[url]) {
      ANH[url] = new Promise(function (ok, no) {
        var thu = function (cors) {
          var im = new Image(); if (cors) im.crossOrigin = 'anonymous';
          im.onload = function () { ok({ im: im, ban: !cors }); };
          im.onerror = function () { if (cors) thu(false); else no(new Error('không tải được ảnh')); };
          im.src = url;
        };
        thu(true);
      });
      ANH[url]['catch'](function () { delete ANH[url]; });
    }
    return ANH[url];
  }
  function coXoay(im, xoay) { var w = im.naturalWidth, h = im.naturalHeight, ngang = xoay === 90 || xoay === 270; return { w: w, h: h, cw: ngang ? h : w, ch: ngang ? w : h }; }
  function anhSangCv(px, py, w, h, cw, ch, xoay) {
    var r = xoay * Math.PI / 180, dx = px - w / 2, dy = py - h / 2;
    return [dx * Math.cos(r) - dy * Math.sin(r) + cw / 2, dx * Math.sin(r) + dy * Math.cos(r) + ch / 2];
  }
  function cvSangAnh(x, y, w, h, cw, ch, xoay) {
    var r = -xoay * Math.PI / 180, dx = x - cw / 2, dy = y - ch / 2;
    return [dx * Math.cos(r) - dy * Math.sin(r) + w / 2, dx * Math.sin(r) + dy * Math.cos(r) + h / 2];
  }
  // Hình học một dấu trong toạ độ ẢNH GỐC: dấu máy đặt bên trái chữ cái theo hướng chữ chạy; dấu tay đặt đúng chỗ bấm
  function hinhDau(m, w, h) {
    var ux = m.ux == null ? 1 : m.ux, uy = m.uy == null ? 0 : m.uy, hp = Math.max(8, m.h * h), cx, cy;
    if (m.may) { cx = m.x * w - ux * hp * 1.9; cy = m.y * h - uy * hp * 1.9; } else { cx = m.x * w; cy = m.y * h; }
    var s = hp * 0.55 * (CO[m.loai] || 1);
    cx = Math.min(w - s * 1.3, Math.max(s * 1.3, cx)); cy = Math.min(h - s * 1.3, Math.max(s * 1.3, cy));
    return { cx: cx, cy: cy, s: s, ux: ux, uy: uy };
  }
  function veMotDau(g, m, w, h) {
    var q = hinhDau(m, w, h), nx = -q.uy, ny = q.ux;
    var P = function (a, b) { return [q.cx + q.ux * a * q.s + nx * b * q.s, q.cy + q.uy * a * q.s + ny * b * q.s]; };
    g.lineCap = g.lineJoin = 'round'; g.lineWidth = Math.max(1.5, q.s * (NET_DAY[NET[m.loai]] || 0.36)); g.strokeStyle = g.fillStyle = MAU_DAU[m.loai] || '#DC2626';
    if (m.loai === 'hoi') {
      g.save(); g.translate(q.cx, q.cy); g.rotate(Math.atan2(q.uy, q.ux));
      g.font = (NET_CHU[NET.hoi] || 800) + ' ' + Math.round(q.s * 2.6) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = Math.max(2, q.s * 0.25); g.strokeStyle = '#fff'; g.strokeText('?', 0, 0); g.fillText('?', 0, 0); g.restore();
      return;
    }
    g.beginPath();
    if (m.loai === 'sai') { var a = P(-1, -1), b = P(1, 1), c = P(-1, 1), d = P(1, -1); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.moveTo(c[0], c[1]); g.lineTo(d[0], d[1]); }
    else { var e = P(-1, 0), f = P(-0.3, 0.8), k = P(1.1, -1); g.moveTo(e[0], e[1]); g.lineTo(f[0], f[1]); g.lineTo(k[0], k[1]); }
    g.stroke();
  }
  function veDsDau(g, ds, im, xoay, cw, ch) {
    var w = im.naturalWidth, h = im.naturalHeight;
    g.save(); g.translate(cw / 2, ch / 2); g.rotate(xoay * Math.PI / 180); g.translate(-w / 2, -h / 2);
    ds.forEach(function (m) { veMotDau(g, m, w, h); });
    g.restore();
  }
  function veNet(g, n) {
    g.strokeStyle = g.fillStyle = n.mau; g.lineWidth = n.w; g.lineCap = g.lineJoin = 'round';
    var a = n.d[0], b = n.d[1];
    if (n.cu === 'but') { g.beginPath(); n.d.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke(); }
    if (n.cu === 'ke') { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    if (n.cu === 'tron') { g.beginPath(); g.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2 + 1, Math.abs(b[1] - a[1]) / 2 + 1, 0, 0, Math.PI * 2); g.stroke(); }
    if (n.cu === 'ten') { var t = Math.atan2(b[1] - a[1], b[0] - a[0]), L = n.w * 4.5; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(b[0] - L * Math.cos(t - 0.45), b[1] - L * Math.sin(t - 0.45)); g.moveTo(b[0], b[1]); g.lineTo(b[0] - L * Math.cos(t + 0.45), b[1] - L * Math.sin(t + 0.45)); g.stroke(); }
    if (n.cu === 'chu') {
      var px = n.tl && CHU_PX ? CHU_PX * CO.chu : n.co;
      g.font = (NET_GO[NET.chu] || 800) + ' ' + Math.round(px) + 'px ' + FONT; g.textBaseline = 'middle'; g.fillText(n.chu, a[0], a[1]);
    }
  }
  // Vẽ trọn một trang (ảnh xoay + dấu + nét) lên g (kích thước cw×ch)
  // Cao chữ in (px CANVAS) của một trang = trung vị `h` dấu máy × cao ảnh × tỉ lệ canvas; × HE_GO = cỡ chữ gõ ×1,0
  var CHU_PX = null;
  function chuPxCua(o, im, cw, ch) {
    var hs = (o.dau || []).filter(function (m) { return m.may && m.h > 0; }).map(function (m) { return m.h; }).sort(function (a, b) { return a - b; });
    if (!hs.length) return null;
    return hs[Math.floor(hs.length / 2)] * im.naturalHeight * Math.max(cw, ch) / Math.max(im.naturalWidth, im.naturalHeight) * HE_GO;
  }
  function veTrang(g, im, xoay, o, cw, ch) {
    g.clearRect(0, 0, cw, ch);
    CHU_PX = chuPxCua(o, im, cw, ch);
    var w = im.naturalWidth, h = im.naturalHeight;
    g.save(); g.translate(cw / 2, ch / 2); g.rotate(xoay * Math.PI / 180); g.drawImage(im, -w / 2, -h / 2); g.restore();
    veDsDau(g, o.dau, im, xoay, cw, ch);
    o.net.forEach(function (n) { veNet(g, n); });
  }
  // Trang ⇒ canvas (dùng cho CHỤP LỖI / ĐẠT / TRẢ LẠI). opt: { dai: true ⇒ dải tên trên đầu, rong: bề ngang tối đa }
  function dungTrang(e, p, cu, opt) {
    opt = opt || {};
    var ban = banCua(e, p, cu);
    if (!ban) return Promise.reject(new Error('chưa nộp'));
    return taiAnh(ban.url).then(function (a) {
      var xoay = (ban.may && ban.may.xoay) || 0, k = coXoay(a.im, xoay);
      var pc = document.createElement('canvas'); pc.width = k.cw; pc.height = k.ch;
      veTrang(pc.getContext('2d'), a.im, xoay, suaCua(e, p, cu), k.cw, k.ch);
      var tl = opt.rong && k.cw > opt.rong ? opt.rong / k.cw : 1, W = Math.round(k.cw * tl), H = Math.round(k.ch * tl);
      var dai = opt.dai ? Math.round(W * 0.05) + 14 : 0;
      var c = document.createElement('canvas'); c.width = W; c.height = H + dai;
      var g = c.getContext('2d');
      if (dai) {
        g.fillStyle = '#0E7C6E'; g.fillRect(0, 0, W, dai);
        g.fillStyle = '#fff'; g.font = '900 ' + Math.round(dai * 0.42) + 'px ' + FONT; g.textBaseline = 'middle';
        g.fillText((String(e.ten).toUpperCase() + ' · ' + S.tieuDe + ' · TRANG ' + p).slice(0, 90), Math.round(dai * 0.35), dai / 2);
      }
      g.drawImage(pc, 0, dai, W, H);
      c._ban = a.ban;
      return c;
    });
  }
  function canvasBlob(c, kieu, cl) { return new Promise(function (ok, no) { try { c.toBlob(function (b) { if (b) ok(b); else no(new Error('ảnh rỗng')); }, kieu || 'image/png', cl); } catch (er) { no(er); } }); }
  function chepAnh(blobP, chuThem) {
    var muc = { 'image/png': blobP };
    if (chuThem) muc['text/plain'] = new Blob([chuThem], { type: 'text/plain' });
    return navigator.clipboard.write([new ClipboardItem(muc)]);
  }

  // ───────── khung ─────────
  var CSS =
    '#csNen{position:fixed;inset:0;z-index:9000;background:rgba(14,24,28,.62);display:grid;place-items:center;padding:14px;font-family:' + FONT + ';color:#16232A}' +
    '#csNen[hidden]{display:none}html.cs-mo{overflow:hidden}#csNen button{font-family:inherit;cursor:pointer}' +
    // v1.434.0 — nhúng trong khung (tab BÀI TRONG SÁCH): bỏ nền phủ + nút đóng, hộp lấp đầy khung
    '#csNen.nhung{position:relative;inset:auto;z-index:auto;background:none;padding:0;display:flex;flex:1;min-width:0;min-height:0}#csNen.nhung[hidden]{display:none}' +
    '#csNen.nhung .cs-hop{width:100%;height:100%;box-shadow:none;border-radius:14px}#csNen.nhung .cs-dong{display:none}' +
    '.cs-hop{width:min(1560px,100%);height:min(960px,100%);background:#EEF3F2;border-radius:20px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45)}' +
    '.cs-dau{display:flex;align-items:center;gap:12px;padding:11px 16px;background:#0E7C6E;color:#fff}.cs-dau b{font-size:14px;font-weight:900;letter-spacing:.04em}' +
    '.cs-dau span{font-size:11.5px;font-weight:700;opacity:.85}.cs-dong{margin-left:auto;border:0;background:rgba(255,255,255,.18);color:#fff;width:34px;height:34px;border-radius:10px;font-size:15px;font-weight:900}' +
    '.cs-khung{flex:1;min-height:0;display:grid;grid-template-columns:240px minmax(0,1fr) 360px;gap:12px;padding:12px}' +
    '.cs-cot{background:#fff;border:1px solid #E0EAE7;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;min-height:0}' +
    '.cs-cot h3{margin:0;padding:13px 15px 9px;font-size:12px;font-weight:900;letter-spacing:.06em}.cs-cot h3 small{display:block;font-size:10.5px;font-weight:600;color:#5F7370;letter-spacing:0;margin-top:3px}' +
    '.cs-ds{overflow:auto;padding-bottom:10px}.cs-em{display:flex;align-items:center;gap:9px;margin:0 8px;padding:8px 9px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer}' +
    '.cs-em:hover{background:#F4F8F7}.cs-em.chon{background:#E3F1EE;outline:1.5px solid #0E7C6E}' +
    '.cs-av{width:34px;height:34px;border-radius:50%;background:#94A3B8;display:grid;place-items:center;font-size:10.5px;font-weight:900;color:#fff;flex:none;position:relative;overflow:hidden}' +
    '.cs-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.cs-em.xong .cs-ten{color:#15803D}' +   // v1.435.0 ảnh em + tên ĐÃ ĐẠT xanh lá
    '.cs-tt{margin-left:auto;font-size:9px;font-weight:800;padding:3px 7px;border-radius:999px;white-space:nowrap}' +
    '.cs-tt.cho{background:#FEF3C7;color:#B45309}.cs-tt.xong{background:#DCFCE7;color:#15803D}.cs-tt.chua{background:#F1F5F9;color:#94A3B8}.cs-tt.tra{background:#FEE2E2;color:#B91C1C}' +
    '.cs-giua{background:#1E2B30;border-color:#1E2B30}.cs-thanh{display:flex;align-items:center;gap:5px;padding:9px 11px;background:#26363C;flex-wrap:wrap}' +
    '.cs-tab{display:flex;gap:5px;margin-right:auto}.cs-tab button{border:0;border-radius:9px;padding:8px 12px;font-size:11px;font-weight:900;letter-spacing:.03em;color:#fff;opacity:.55}' +
    '.cs-tab button.on{opacity:1;box-shadow:0 0 0 2px #fff}.cs-tab .xanh{background:#16A34A}.cs-tab .vang{background:#F2A93B;color:#3B2A07}.cs-tab .do{background:#DC2626}' +
    '.cs-cc{border:0;width:34px;height:32px;border-radius:9px;background:#34474D;color:#fff;font-size:14px;font-weight:900;position:relative}.cs-cc.on{background:#fff;color:#DC2626}' +
    '.cs-cc[data-cu="hoi"]{color:#F59E0B}.cs-cc[data-cu="dung"]{color:#4ADE80}.cs-cc[data-cu="sai"]{color:#F87171}.cs-cc.on[data-cu="dung"]{color:#16A34A}' +
    '.cs-mau{width:21px;height:21px;border-radius:50%;border:2px solid #fff;cursor:pointer}.cs-mau.on{outline:3px solid #9FE3D6}.cs-vach{width:1px;height:22px;background:#4B5E63;margin:0 3px}' +
    '.cs-vung{flex:1;min-height:0;overflow:auto;padding:10px;position:relative}.cs-ve{position:relative;width:100%}' +
    '#csCv{display:block;width:100%;height:auto;border-radius:8px;background:#fff;touch-action:none;cursor:none}#csCvTren{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}' +
    '.cs-canh{position:sticky;top:0;z-index:2;display:inline-block;background:#DC2626;color:#fff;border-radius:999px;padding:6px 12px;font-size:11px;font-weight:900;margin-bottom:8px;max-width:90%}' +
    '.cs-canh[hidden]{display:none}.cs-o-chu{position:absolute;z-index:3;min-width:180px;border:2px solid #2F6FED;border-radius:8px;padding:4px 8px;font:800 15px ' + FONT + ';background:rgba(255,255,255,.95);outline:none}' +
    '.cs-trong{color:#A9BDB9;font-weight:800;font-size:14px;padding:60px 0;text-align:center}' +
    '.cs-cu{display:flex;gap:6px;align-items:center;padding:0 11px;background:#26363C;flex-wrap:wrap}.cs-cu:not(:empty){padding:7px 11px}.cs-cu span{color:#A9BDB9;font-size:10px;font-weight:800}' +
    '.cs-cu button{position:relative;border:2px solid transparent;border-radius:7px;padding:0;background:#34474D;height:44px;overflow:hidden}.cs-cu button.on{border-color:#fff}' +
    '.cs-cu img{height:40px;display:block}.cs-cu b{position:absolute;right:2px;top:1px;color:#FCA5A5;font-size:12px}.cs-cu .ve{color:#fff;font-size:10px;font-weight:800;padding:0 9px}' +
    '.cs-day{display:flex;gap:8px;padding:9px 11px;background:#26363C;align-items:center;flex-wrap:wrap}.cs-lich{color:#A9BDB9;font-size:10.5px;font-weight:600;margin-right:auto;flex:1;min-width:160px}' +
    '.cs-nut{border:0;border-radius:11px;padding:11px 18px;font-size:12px;font-weight:900;letter-spacing:.05em}.cs-nut:disabled{background:#64748B!important;color:#E2E8F0!important;box-shadow:none!important;opacity:.45;cursor:not-allowed}' +
    '.cs-luu{font-size:10.5px;font-weight:800;color:#9FE3D6}.cs-luu.dang{color:#FCD34D}.cs-luu.loi{color:#FCA5A5}.cs-khoa{font-size:10.5px;font-weight:800;color:#FCD34D;max-width:260px}' +
    '.cs-nut.dat{background:#16A34A;color:#fff}.cs-nut.loi{background:#F2A93B;color:#3B2A07}' +
    // v1.436.0 (thầy chốt 28/10) — ĐẠT chưa tích = nền TRẮNG chữ đen; đã tích = xanh + ✓ bên phải. Pop-up hỏi bỏ ĐẠT.
    '.cs-nut.dat.chua{background:#fff;color:#16232A;box-shadow:inset 0 0 0 1.5px #CBD5D1}.cs-nut.dat.chua:disabled{background:#fff!important;color:#16232A!important;box-shadow:inset 0 0 0 1.5px #CBD5D1!important;opacity:.45}.cs-nut.dat .cs-tich{margin-left:1px}' +
    '.cs-hoi-nen{position:fixed;inset:0;z-index:9200;background:rgba(10,18,22,.5);display:grid;place-items:center;padding:16px}' +   // v1.448.0 pop-up nhỏ xác nhận
    '.cs-nut.dat.chua.khoa{opacity:.45}.cs-nut.dat.chua.khoa:hover{opacity:.6}.cs-nut.dat.chua.khoa:active{opacity:.6}' +
    '.cs-hoi{background:#fff;border-radius:18px;padding:22px 24px;width:min(420px,100%);box-shadow:0 20px 60px rgba(0,0,0,.4)}.cs-hoi b{display:block;font-size:15px;font-weight:900;margin-bottom:8px}' +
    '.cs-hoi p{margin:0 0 18px;font-size:12.5px;font-weight:600;color:#5F7370;line-height:1.5}.cs-hoi .cs-hang{display:flex;gap:10px;justify-content:flex-end}.cs-nut.bo{background:#DC2626;color:#fff}' +
    '.cs-ai-dau{display:flex;align-items:center;gap:8px;padding:0 15px 9px;font-size:11px;color:#5F7370;font-weight:700}.cs-ai-dau b{margin-left:auto;font-size:20px;font-weight:900;color:#16232A}' +
    '.cs-bang{overflow:auto;padding:0 10px 10px;flex:1;min-height:0}' +
    '.cs-nhom{display:flex;align-items:center;gap:8px;margin:10px 0 4px;padding:7px 10px;border-radius:10px;font-size:10.5px;font-weight:900;letter-spacing:.05em;color:#fff;cursor:pointer}' +
    '.cs-nhom span{margin-left:auto;font-weight:800;letter-spacing:0}.cs-nhom.xanh{background:#16A34A}.cs-nhom.vang{background:#F2A93B;color:#3B2A07}.cs-nhom.do{background:#DC2626}' +
    '.cs-nhom-rong{font-size:11px;color:#94A3B8;font-weight:700;padding:6px 10px 2px}' +
    '.cs-cau{display:grid;grid-template-columns:34px 1fr 1fr 28px;gap:6px;align-items:center;padding:6px 8px;border-radius:10px;font-size:11.5px;font-weight:700;cursor:pointer;border-left:3px solid transparent}' +
    '.cs-cau:hover{background:#EEF6F4}.cs-cau.dang{outline:2px solid #2F6FED}.cs-cau .so{font-weight:900;color:#5F7370}' +
    '.cs-cau .em-k,.cs-cau .dung-k{text-align:center;font-weight:900;border-radius:7px;padding:3px 0}.cs-cau .em-k{background:#EAF1FF;color:#2F6FED}.cs-cau .dung-k{background:#F1F5F4}' +
    '.cs-cau.sai{border-left-color:#DC2626}.cs-cau.sai .em-k{background:#FEE2E2;color:#DC2626}.cs-cau.dung .kq{color:#16A34A}.cs-cau.sai .kq{color:#DC2626}.cs-cau .kq{text-align:center;font-weight:900}' +
    '.cs-cau.hoi{border-left-color:#F59E0B}.cs-cau.hoi .em-k{background:#FEF3C7;color:#B45309}.cs-cau.hoi .kq{color:#F59E0B}.cs-cau .ghi{font-size:9px;color:#B45309;grid-column:2/-1;font-weight:700}' +
    '.cs-chu-thich{font-size:9.5px;color:#94A3B8;font-weight:600;padding:8px}' +
    '.cs-ico{display:block;flex:none}.cs-cc{display:inline-grid;place-items:center}.cs-dong{display:inline-grid;place-items:center}' +
    '.cs-nut,.cs-hang button,.cs-cu .ve{display:inline-flex;align-items:center;justify-content:center;gap:7px}.cs-menu i{display:inline-grid;place-items:center}' +
    '.cs-cau.viet{grid-template-columns:38px 1fr 1fr 24px}.cs-cau.viet .em-k,.cs-cau.viet .dung-k{text-align:left;padding:3px 6px;font-weight:800;overflow-wrap:anywhere}' +
    '.cs-lech{margin:2px 0 4px;padding:6px 10px;border-radius:9px;background:#FEF3C7;color:#92400E;font-size:10.5px;font-weight:800}' +
    '.cs-nhan{padding:11px 13px;border-top:1px solid #E0EAE7}.cs-nhan label{font-size:10.5px;font-weight:900;letter-spacing:.06em;color:#5F7370}' +
    '.cs-nhan textarea{width:100%;box-sizing:border-box;margin-top:6px;border:1.5px solid #E0EAE7;border-radius:10px;padding:9px 10px;font:600 12px/1.5 ' + FONT + ';resize:vertical;min-height:64px}' +
    '.cs-hang{display:flex;gap:8px;margin-top:8px}.cs-hang button{flex:1;border:1.5px solid #E0EAE7;background:#fff;border-radius:10px;padding:9px;font-size:11px;font-weight:900}' +
    '.cs-menu{position:fixed;z-index:9300;background:#fff;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.35);padding:6px;min-width:220px}' +
    '.cs-menu button{display:flex;gap:9px;align-items:center;width:100%;text-align:left;border:0;background:none;padding:9px 12px;border-radius:8px;font-size:12.5px;font-weight:700;color:#16232A}' +
    '.cs-menu button:hover{background:#EEF6F4}.cs-menu button:disabled{opacity:.35;cursor:default;background:none}.cs-menu hr{border:0;border-top:1px solid #E0EAE7;margin:5px 4px}' +
    '.cs-menu i{font-style:normal;width:18px;text-align:center;font-weight:900}' +
    '.cs-co,.cs-menu,.cs-co button,.cs-menu button,.cs-co input{font-family:' + FONT + '}' +
    '.cs-co{position:fixed;z-index:9300;background:#16232A;color:#fff;padding:12px 14px;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.4);width:230px;font-size:11.5px;font-weight:800}' +
    '.cs-co input{width:100%;margin:10px 0 4px;accent-color:#2DD4BF}.cs-co .gt{float:right;color:#9FE3D6}.cs-co small{display:block;color:#A9BDB9;font-weight:600}' +
    '.cs-caidat{width:290px;padding:14px 16px}.cs-caidat .cd-tieu{display:block;font-size:12.5px;letter-spacing:.06em;margin-bottom:4px}.cs-caidat small{line-height:1.45}' +
    '.cd-dong{margin-top:12px;padding-top:10px;border-top:1px solid #2E4249}.cd-ten{display:flex;align-items:center;gap:6px}.cd-ten .gt{margin-left:auto}.cd-ten i{font-style:normal;display:inline-grid;place-items:center;width:20px}' +
    '.cs-caidat input{margin:8px 0 6px}.cd-net{display:flex;gap:5px}.cd-net button,.cd-day button{flex:1;border:0;border-radius:8px;padding:7px 0;background:#34474D;color:#fff;font-size:11px;font-weight:800}' +
    '.cd-net button.on{background:#2DD4BF;color:#06302B}.cd-day{display:flex;gap:6px;margin-top:14px}.cd-day .cd-ap{flex:1.4;background:#16A34A}' +
    '#csPop{position:fixed;inset:0;z-index:9100;background:rgba(10,18,22,.66);display:grid;place-items:center;padding:16px}#csPop[hidden]{display:none}' +
    '.cs-pop-hop{width:min(1360px,100%);height:min(940px,100%);background:#fff;border-radius:18px;display:flex;flex-direction:column;overflow:hidden}' +
    '.cs-pop-dau{display:flex;align-items:center;gap:12px;padding:12px 16px;color:#fff}.cs-pop-dau b{font-size:14px;font-weight:900;letter-spacing:.04em}.cs-pop-dau span{font-size:11.5px;font-weight:700;opacity:.9}' +
    '.cs-pop-dau.loi{background:#B45309}.cs-pop-dau.dat{background:#15803D}' +
    '.cs-pop-than{flex:1;min-height:0;overflow:auto;background:#EEF3F2;position:relative;container-type:size}' +
    '.cs-loi-dong{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;padding:16px;border-bottom:1px solid #D7E3E0}' +
    // v1.448.0 (thầy 29/10) — mỗi trang cao ĐÚNG khung pop-up, ảnh co trọn trong đó ⇒ luôn thấy cả trang, không phải cuộn trong một trang
    '.cs-loi-dong[data-p]{height:100cqh;box-sizing:border-box;grid-template-rows:minmax(0,1fr)}' +
    '.cs-loi-anh{min-height:0;height:100%;display:flex;justify-content:center;align-items:flex-start}' +
    '.cs-loi-dong .cs-loi-anh img{width:auto;max-width:100%;max-height:100%;object-fit:contain}' +
    '.cs-loi-ben{overflow:auto;max-height:100%}.cs-loi-tt[hidden]{display:none}.cs-nut.tra.da{background:#DC2626;color:#fff;box-shadow:none}' +
    '.cs-loi-dong img,.cs-dat-o img{width:100%;display:block;border-radius:10px;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.12)}' +
    '.cs-loi-ben{display:flex;flex-direction:column;gap:10px;position:sticky;top:12px;align-self:start}.cs-loi-ben h4{margin:0;font-size:15px;font-weight:900}.cs-loi-ben p{margin:0;font-size:12px;font-weight:700;color:#5F7370}' +
    '.cs-loi-ben textarea{border:1.5px solid #D7E3E0;border-radius:10px;padding:9px 10px;font:600 12px/1.5 ' + FONT + ';resize:vertical;min-height:96px}' +
    '.cs-loi-ben .cs-nut{width:100%;padding:14px}.cs-nut.tra{background:#fff;color:#DC2626;box-shadow:inset 0 0 0 2px #DC2626}.cs-nut.chup{background:#F2A93B;color:#3B2A07}' +
    '.cs-loi-tt{font-size:11.5px;font-weight:900;padding:7px 10px;border-radius:9px}.cs-loi-tt.tra{background:#FEE2E2;color:#B91C1C}.cs-loi-tt.ok{background:#DCFCE7;color:#15803D}' +
    '.cs-dat-luoi{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:16px}.cs-dat-o b{display:block;font-size:12px;font-weight:900;margin-bottom:6px}' +
    '.cs-dat-o .rong{height:300px;border-radius:10px;border:2px dashed #CBD5E1;display:grid;place-items:center;color:#94A3B8;font-weight:800}' +
    '.cs-pop-day{display:flex;gap:10px;align-items:center;padding:12px 16px;border-top:1px solid #E0EAE7}.cs-pop-day span{flex:1;font-size:11.5px;font-weight:700;color:#5F7370}' +
    '.cs-pop-day .cs-nut{padding:14px 24px;font-size:13px}.cs-nut.phu{background:#EEF3F2;color:#16232A}' +
    '#csToast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#16232A;color:#fff;padding:12px 18px;border-radius:12px;font-size:12.5px;font-weight:800;opacity:0;transition:.25s;pointer-events:none;z-index:9400}' +
    '#csToast.hien{opacity:1}' +
    '@media (max-width:1100px){.cs-khung{grid-template-columns:1fr;overflow:auto}.cs-cot{min-height:420px}.cs-ds{max-height:240px;min-height:0}.cs-loi-dong{grid-template-columns:minmax(0,1fr) 230px}.cs-dat-luoi{grid-template-columns:1fr}}' +
    '@media (max-width:640px){.cs-loi-dong,.cs-loi-dong[data-p]{grid-template-columns:1fr;grid-template-rows:72cqh auto;height:auto}}';
  // ⭐ v1.400.0 icon phẳng 2D (nét Lucide, màu theo chữ của nút)
  var ICO = {
    but: '<path d="M21.17 6.81a1 1 0 0 0-3.98-3.98L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>',
    tron: '<circle cx="12" cy="12" r="8.5"/>',
    ten: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    ke: '<path d="M6.5 17.5l11-11"/><circle cx="5" cy="19" r="1.6" fill="currentColor"/><circle cx="19" cy="5" r="1.6" fill="currentColor"/>',
    dung: '<path d="M20 6 9 17l-5-5"/>',
    sai: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    hoi: '<path d="M8.6 8.6a3.5 3.5 0 0 1 6.8 1.2c0 2.3-3.4 3.2-3.4 3.2"/><path d="M12 18h.01"/>',
    chu: '<path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2"/><path d="M12 4v16"/><path d="M9 20h6"/>',
    lui: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    rac: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    dong: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    chup: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
    dat: '<circle cx="12" cy="12" r="10"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    chep: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>',
    dao: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    tay: '<path d="m7 21-4.3-4.3a2.4 2.4 0 0 1 0-3.4l9.6-9.6a2.4 2.4 0 0 1 3.4 0l5.6 5.6a2.4 2.4 0 0 1 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
    xoaHet: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    khoi: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    tra: '<path d="M9 17 4 12l5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
    ve: '<path d="M9 14 4 9l5-5"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>'
  };
  function ico(ten, co, net) {
    return '<svg class="cs-ico" viewBox="0 0 24 24" width="' + (co || 17) + '" height="' + (co || 17) + '" fill="none" stroke="currentColor" stroke-width="' + (net || 2) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICO[ten] || '') + '</svg>';
  }
  var CU_NUT = [['but', ico('but')], ['tron', ico('tron')], ['ten', ico('ten')], ['ke', ico('ke')], ['dung', ico('dung', 19, 3)], ['sai', ico('sai', 18, 3)], ['hoi', ico('hoi', 19, 3)], ['chu', ico('chu')]];
  function dungKhung() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var n = document.createElement('div');
    n.id = 'csNen';
    n.innerHTML =
      '<div class="cs-hop"><div class="cs-dau"><b id="csTieu"></b><span id="csPhu"></span><button type="button" class="cs-dong" title="Đóng (Esc)">' + ico('dong', 18, 2.4) + '</button></div>' +
      '<div class="cs-khung"><div class="cs-cot cs-ds" id="csDs"></div>' +
      '<div class="cs-cot cs-giua"><div class="cs-thanh"><div class="cs-tab" id="csTab"></div>' +
        CU_NUT.map(function (c) { return '<button class="cs-cc' + (c[0] === 'but' ? ' on' : '') + '" data-cu="' + c[0] + '" title="' + TEN_CU[c[0]] + ' — chuột phải: chọn cỡ">' + c[1] + '</button>'; }).join('') +
        '<span class="cs-vach"></span>' +
        MAU.map(function (m, i) { return '<span class="cs-mau' + (i ? '' : ' on') + '" data-mau="' + m + '" style="background:' + m + '" title="Màu nét vẽ"></span>'; }).join('') +
        '<span class="cs-vach"></span><button class="cs-cc" id="csLui" title="Hoàn tác (Ctrl+Z)">' + ico('lui') + '</button><button class="cs-cc" id="csXoa" title="Xoá hết nét vẽ trang này">' + ico('rac') + '</button>' +
        '<button class="cs-cc" id="csCaiDat" title="Cài đặt dấu ✓ ✕ ? (cỡ, nét)"><svg class="cs-ico" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></button></div>' +
        '<div class="cs-vung" id="csVung"><span class="cs-canh" id="csCanh" hidden></span><div class="cs-ve" id="csVe"><canvas id="csCv"></canvas><canvas id="csCvTren"></canvas></div>' +
          '<div class="cs-trong" id="csTrong" hidden>Em chưa nộp trang này.</div></div>' +
        '<div class="cs-cu" id="csCu"></div>' +
        '<div class="cs-day"><span class="cs-lich" id="csLich"></span><span class="cs-luu" id="csLuu"></span><span class="cs-khoa" id="csKhoa"></span><button class="cs-nut loi" id="csChupLoi">' + ico('chup', 16, 2.2) + 'CHỤP LỖI</button><button class="cs-nut dat chua" id="csDat">ĐẠT</button></div></div>' +
      '<div class="cs-cot cs-ai"><h3>CHẤM THAM KHẢO (AI)<small>Chỉ thầy thấy. Bấm một dòng ⇒ ảnh cuộn tới dấu câu đó.</small></h3>' +
        '<div class="cs-ai-dau"><span id="csAiTrang"></span><b id="csTong"></b></div><div class="cs-bang" id="csBang"></div>' +
        '<div class="cs-nhan"><label>LỜI NHẮN GỬI EM (SOẠN SẴN — SỬA ĐƯỢC)</label><textarea id="csNhan"></textarea>' +
        '<div class="cs-hang"><button id="csChepNhan">' + ico('chep', 15) + 'Chép lời nhắn</button></div></div></div>' +
      '</div></div><div id="csPop" hidden></div><div id="csToast"></div>';
    document.body.appendChild(n);
    n.addEventListener('click', function (e) { if ((e.target === n && !nhung()) || e.target.closest('.cs-dong')) dong(); });
    // ⛔ tắt menu chuột phải của trình duyệt trong pop-up (trừ ô gõ chữ — vẫn cần dán/chép)
    n.addEventListener('contextmenu', function (e) { if (!/TEXTAREA|INPUT/.test(e.target.tagName)) e.preventDefault(); });
    document.addEventListener('pointerdown', function (e) { if (!e.target.closest('.cs-menu,.cs-co,#csCaiDat')) dongNoi(); }, true);   // nút ⚙ tự bật/tắt pop-up của nó
    var doiCtrl = function (e) {
      if (!S || !S.anh || !$('#csCv')) return;
      var c = e.ctrlKey || e.metaKey; if (c === !!S.ctrl) return;
      S.ctrl = c; conTro($('#csCv')); veTren();
    };
    document.addEventListener('keyup', doiCtrl);
    window.addEventListener('blur', function () { if (S) { S.ctrl = false; if ($('#csCv')) conTro($('#csCv')); } });
    document.addEventListener('keydown', function (e) {
      doiCtrl(e);
      if (!S || !$('#csNen') || $('#csNen').hidden) return;
      var go = /TEXTAREA|INPUT/.test(document.activeElement && document.activeElement.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !go) { e.preventDefault(); hoanTac(); }
      if (e.key === 'Escape') {
        if ($('.cs-hoi-nen')) $('.cs-hoi-nen').remove();
        else if ($('.cs-menu') || $('.cs-co')) dongNoi();
        else if (S.keDau) { S.keDau = null; veTren(); }
        else if (!$('#csPop').hidden) dongPop();
        else if (!nhung()) dong();   // v1.434.0 — nhúng trong tab: Esc ngoài cùng để dashboard đóng hộp chi tiết
      }
    });
    n.querySelectorAll('[data-cu]').forEach(function (b) {
      b.onclick = function () { chonCu(b.dataset.cu); };
      b.oncontextmenu = function (e) { e.preventDefault(); chonCu(b.dataset.cu); moCo(b.dataset.cu, b); };
    });
    n.querySelectorAll('[data-mau]').forEach(function (b) { b.onclick = function () { S.mau = b.dataset.mau; n.querySelectorAll('[data-mau]').forEach(function (x) { x.classList.toggle('on', x === b); }); veTren(); }; });
    $('#csLui').onclick = hoanTac;
    $('#csCaiDat').onclick = function (e) { e.stopPropagation(); if ($('.cs-caidat')) { dongNoi(); return; } moCaiDat($('#csCaiDat')); };
    $('#csXoa').onclick = function () { var o = suaHien(); if (!o.net.length) return; ghiLich(o); o.net = []; veCv(); };
    $('#csChupLoi').onclick = function () { if (ttEm(emHien()).lop === 'xong') moDat(); else moChupLoi(); };   // v1.436.0
    $('#csDat').onclick = bamDat;
    $('#csDat').ondblclick = function () { var e = emHien(); if (e && this.classList.contains('khoa') && !S.dangGhiDat) ghiDat(e, 'dat'); };   // v1.448.0
    $('#csChepNhan').onclick = function () { navigator.clipboard.writeText($('#csNhan').value).then(function () { toast('✓ Đã chép lời nhắn'); }, function () { toast('Trình duyệt chặn clipboard'); }); };
    ganVe($('#csCv'));
  }
  function chonCu(cu) { S.cu = cu; S.keDau = null; document.querySelectorAll('#csNen [data-cu]').forEach(function (x) { x.classList.toggle('on', x.dataset.cu === cu); }); veTren(); }
  function dong() {
    luuHet(); var n = $('#csNen');
    if (n) { n.hidden = true; if (n.classList.contains('nhung')) { n.classList.remove('nhung'); document.body.appendChild(n); } }   // v1.434.0 — nhúng xong trả về body
    dongNoi(); document.documentElement.classList.remove('cs-mo'); if (S && S.onDong) S.onDong();
  }
  // v1.434.0 — đang NHÚNG trong khung trang khác (tab BÀI TRONG SÁCH của dashboard) và đang hiện
  function nhung() { var n = $('#csNen'); return !!(n && !n.hidden && n.classList.contains('nhung')); }
  // v1.434.0 — có lớp nổi riêng của trang chấm (menu, thanh cỡ, đang kẻ, pop-up chụp) ⇒ Esc thuộc về trang chấm
  function coLop() { var n = $('#csNen'); return !!(n && !n.hidden && ($('.cs-hoi-nen') || $('.cs-menu') || $('.cs-co') || (S && S.keDau) || !$('#csPop').hidden)); }
  function dongNoi() { document.querySelectorAll('.cs-menu,.cs-co').forEach(function (x) { x.remove(); }); }
  function datViTri(el, x, y) {
    document.body.appendChild(el);
    var r = el.getBoundingClientRect();
    el.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, x)) + 'px';
    el.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 8, y)) + 'px';
  }
  // Chuột phải vào nút công cụ ⇒ thanh kéo cỡ (lưu trên máy)
  function moCo(cu, nut) {
    dongNoi();
    var gh = CO_GH[cu], el = document.createElement('div');
    el.className = 'cs-co';
    el.innerHTML = 'CỠ ' + TEN_CU[cu].toUpperCase() + '<span class="gt"></span><input type="range" min="' + gh[0] + '" max="' + gh[1] + '" step="' + gh[2] + '" value="' + CO[cu] + '">' +
      '<small>Lưu trên máy này — mở em khác vẫn giữ cỡ.</small>';
    var o = el.querySelector('input'), gt = el.querySelector('.gt');
    var hien = function () { gt.textContent = /dung|sai|hoi|chu/.test(cu) ? '×' + (+o.value).toFixed(1) : o.value; };
    hien();
    o.oninput = function () { CO[cu] = +o.value; luuCo(); hien(); if (/dung|sai|hoi/.test(cu)) veCv(); else veTren(); };
    var r = nut.getBoundingClientRect();
    datViTri(el, r.left, r.bottom + 6);
  }
  // ⭐ v1.399.0 — pop-up ⚙ CÀI ĐẶT DẤU: cỡ (× cao chữ in của ảnh) + nét cho ✓ ✕ ?; ÁP DỤNG = lưu máy + vẽ lại bài đang sửa
  function moCaiDat(nut) {
    dongNoi();
    var DS = ['dung', 'sai', 'hoi', 'chu'], tam = { co: {}, net: {} };
    DS.forEach(function (l) { tam.co[l] = CO[l]; tam.net[l] = NET[l]; });
    var LOAI = [['dung', ico('dung', 16, 3), 'Dấu đúng', '#4ADE80'], ['sai', ico('sai', 16, 3), 'Dấu sai', '#F87171'], ['hoi', ico('hoi', 16, 3), 'Dấu hỏi', '#F59E0B'], ['chu', ico('chu', 16, 2.4), 'Chữ gõ', '#9FE3D6']];
    var el = document.createElement('div');
    el.className = 'cs-co cs-caidat';
    el.innerHTML = '<b class="cd-tieu">CÀI ĐẶT DẤU + CHỮ GÕ</b><small>Cỡ tính theo CHỮ IN trong từng ảnh — ×1,0 = bằng chữ in, ảnh nào cũng vậy dù độ phân giải khác nhau.</small>' +
      LOAI.map(function (l) {
        var gh = CO_GH[l[0]];
        return '<div class="cd-dong" data-l="' + l[0] + '"><div class="cd-ten"><i style="color:' + l[3] + '">' + l[1] + '</i>' + l[2] + '<span class="gt"></span></div>' +
          '<input type="range" min="' + gh[0] + '" max="' + gh[1] + '" step="' + gh[2] + '">' +
          '<div class="cd-net">' + [['manh', 'Mảnh'], ['vua', 'Vừa'], ['dam', 'Đậm']].map(function (n) { return '<button type="button" data-n="' + n[0] + '">' + n[1] + '</button>'; }).join('') + '</div></div>';
      }).join('') +
      '<div class="cd-day"><button type="button" class="cd-md">Mặc định</button><button type="button" class="cd-huy">Huỷ</button><button type="button" class="cd-ap">ÁP DỤNG</button></div>';
    var hien = function () {
      el.querySelectorAll('.cd-dong').forEach(function (d) {
        var l = d.dataset.l, o = d.querySelector('input');
        o.value = tam.co[l]; d.querySelector('.gt').textContent = '× ' + (tam.co[l] * (l === 'chu' ? 1 : HE_CO)).toFixed(1).replace('.', ',') + (l === 'chu' ? ' cỡ chữ in' : ' cao chữ');
        d.querySelectorAll('[data-n]').forEach(function (b) { b.classList.toggle('on', b.dataset.n === tam.net[l]); });
      });
    };
    el.querySelectorAll('.cd-dong').forEach(function (d) {
      var l = d.dataset.l;
      d.querySelector('input').oninput = function () { tam.co[l] = +this.value; hien(); };
      d.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { tam.net[l] = b.dataset.n; hien(); }; });
    });
    el.querySelector('.cd-md').onclick = function () { DS.forEach(function (l) { tam.co[l] = CO_MD[l]; tam.net[l] = NET_MD[l]; }); hien(); };
    el.querySelector('.cd-huy').onclick = dongNoi;
    el.querySelector('.cd-ap').onclick = function () {
      DS.forEach(function (l) { CO[l] = tam.co[l]; NET[l] = tam.net[l]; });
      luuCo(); luuNet(); dongNoi(); if (S && S.anh) veCv(); toast('✓ Đã áp dụng cỡ + nét dấu và chữ gõ');
    };
    hien();
    var r = nut.getBoundingClientRect();
    datViTri(el, r.right - 290, r.bottom + 6);
  }
  // Chuột phải trên ảnh ⇒ menu bài
  function moMenu(x, y, m) {
    dongNoi();
    var o = suaHien(), el = document.createElement('div');
    el.className = 'cs-menu';
    el.innerHTML =
      (m && m.loai === 'hoi' ? '<button data-l="thanhDung"><i style="color:#16A34A">' + ico('dung', 16, 3) + '</i>Đánh ✓ đúng</button><button data-l="thanhSai"><i style="color:#DC2626">' + ico('sai', 16, 3) + '</i>Đánh ✕ sai</button>'
        : '<button data-l="dao"' + (m ? '' : ' disabled') + '><i>' + ico('dao', 16) + '</i>Đảo đánh dấu' + (m ? ' (' + (m.loai === 'dung' ? '✓ → ✕' : '✕ → ✓') + ')' : '') + '</button>') +
      '<button data-l="xoa"' + (m ? '' : ' disabled') + '><i>' + ico('tay', 16) + '</i>Xoá đánh dấu</button><hr>' +
      '<button data-l="xoaDau"' + (o.dau.length ? '' : ' disabled') + '><i>' + ico('xoaHet', 16) + '</i>Xoá tất cả dấu</button>' +
      '<button data-l="xoaNet"' + (o.net.length ? '' : ' disabled') + '><i>' + ico('rac', 16) + '</i>Xoá hết nét vẽ</button><hr>' +
      '<button data-l="khoi"><i>' + ico('khoi', 16) + '</i>Khôi phục bài chấm AI</button>';
    el.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () {
        var l = b.dataset.l; dongNoi();
        if (l === 'khoi') {
          var e0 = emHien(); delete SUA[khoa(e0, S.p, S.cuChon)]; if (e0.doc && e0.doc.cham) delete e0.doc.cham[khoaLuu(S.p, S.cuChon)];
          guiLuu(e0, S.p, S.cuChon, true); veCv(); veAi(); veTab(); veDs(); toast('↺ Đã khôi phục bài chấm AI của trang ' + S.p); return;
        }
        ghiLich(o);
        if (l === 'dao') m.loai = m.loai === 'dung' ? 'sai' : 'dung';
        if (l === 'thanhDung') m.loai = 'dung';
        if (l === 'thanhSai') m.loai = 'sai';
        if (l === 'xoa') o.dau.splice(o.dau.indexOf(m), 1);
        if (l === 'xoaDau') o.dau = [];
        if (l === 'xoaNet') o.net = [];
        veCv(); veAi(); veTab(); veDs();
      };
    });
    datViTri(el, x, y);
  }

  // ───────── vẽ trên ảnh ─────────
  function kichCo() { var cv = $('#csCv'); return { cw: cv.width, ch: cv.height, w: S.anh.naturalWidth, h: S.anh.naturalHeight, don: Math.max(cv.width, cv.height) / 1000 }; }
  function toaDo(cv, e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
  // Dấu tay đặt tại điểm p (toạ độ canvas): lưu theo ảnh gốc, hướng đứng thẳng như thầy đang nhìn
  function dauTay(loai, p) {
    var k = kichCo(), a = cvSangAnh(p[0], p[1], k.w, k.h, k.cw, k.ch, S.xoay || 0), r = (S.xoay || 0) * Math.PI / 180;
    return { so: null, loai: loai, x: a[0] / k.w, y: a[1] / k.h, ux: Math.cos(r), uy: -Math.sin(r), h: caoChuTrang(k), may: false };
  }
  // Cỡ chữ gõ (px canvas) trên trang đang xem: theo cao chữ in · CO.chu; trang chưa có dấu máy ⇒ theo khung ảnh như cũ
  function coGo(k) { var c = chuPxCua(suaHien(), S.anh, k.cw, k.ch); return c ? c * CO.chu : 26 * CO.chu * k.don; }
  // Cao chữ in của trang đang xem (tỉ lệ theo cao ảnh): trung vị `h` các dấu máy (Vision đo); chưa có dấu máy ⇒ ước theo khung ảnh như cũ
  function caoChuTrang(k) {
    var hs = [];
    suaHien().dau.forEach(function (m) { if (m.may && m.h > 0) hs.push(m.h); });
    ((S.hien && S.hien.may && S.hien.may.cau) || []).forEach(function (c) {
      if (c.dau && c.dau.h > 0) hs.push(c.dau.h);
      (c.o || []).forEach(function (o) { if (o.dau && o.dau.h > 0) hs.push(o.dau.h); });
    });
    if (!hs.length) return 0.016 * Math.max(k.cw, k.ch) / k.h;
    hs.sort(function (a, b) { return a - b; });
    return hs[Math.floor(hs.length / 2)];
  }
  // Dấu tay gắn vào CÂU nào: câu đang chọn trong bảng (nếu chưa có dấu) · không thì câu chưa có dấu có vị trí ước lượng gần nhất
  //   (nội suy theo vị trí dấu các câu khác trên trang). Không còn câu thiếu dấu ⇒ dấu tự do (không gắn câu).
  function soChoDauTay(m) {
    var o = suaHien(), ds = soCau(S.p); if (!ds.length) return null;
    var co = {}; o.dau.forEach(function (x) { if (x.so != null) co[x.so] = x; });
    var thieu = ds.filter(function (n) { return !co[n]; });
    if (!thieu.length) return null;
    if (S.dangSo != null && S.dangP === S.p && thieu.indexOf(S.dangSo) >= 0) return S.dangSo;
    var k = kichCo(), yCua = function (x) { var q = hinhDau(x, k.w, k.h); return anhSangCv(q.cx, q.cy, k.w, k.h, k.cw, k.ch, S.xoay || 0)[1]; };
    var biet = Object.keys(co).map(Number).sort(function (a, b) { return a - b; }).map(function (n) { return [n, yCua(co[n])]; });
    if (biet.length < 2) return thieu.length === 1 ? thieu[0] : null;
    var buoc = (biet[biet.length - 1][1] - biet[0][1]) / ((biet[biet.length - 1][0] - biet[0][0]) || 1), y0 = yCua(m);
    var uoc = function (n) {
      var a = null, b = null;
      biet.forEach(function (x) { if (x[0] < n) a = x; if (x[0] > n && !b) b = x; });
      if (a && b) return a[1] + (b[1] - a[1]) * (n - a[0]) / (b[0] - a[0]);
      var r = a || b; return r[1] + buoc * (n - r[0]);
    };
    var tot = null, kc = 1e9;
    thieu.forEach(function (n) { var d = Math.abs(uoc(n) - y0); if (d < kc) { kc = d; tot = n; } });
    return tot;
  }
  function dauTai(p) {
    if (!S.anh) return null;
    var k = kichCo(), a = cvSangAnh(p[0], p[1], k.w, k.h, k.cw, k.ch, S.xoay || 0), tot = null, kc = 1e9;
    suaHien().dau.forEach(function (m) { var q = hinhDau(m, k.w, k.h), d = Math.hypot(q.cx - a[0], q.cy - a[1]); if (d < q.s * 1.8 && d < kc) { kc = d; tot = m; } });
    return tot;
  }
  function ganVe(cv) {
    cv.onpointerdown = function (e) {
      if (!S || !S.anh || e.button !== 0) return;
      dongNoi();
      var p = toaDo(cv, e), o = suaHien(), k = kichCo();
      if (e.ctrlKey || e.metaKey) {   // KÉO DẤU
        e.preventDefault();
        var mk = dauTai(p); if (!mk) return;
        S.keo = { m: mk, a0: cvSangAnh(p[0], p[1], k.w, k.h, k.cw, k.ch, S.xoay || 0), x0: mk.x, y0: mk.y, daGhi: false };
        cv.setPointerCapture(e.pointerId); conTro(cv, e); return;
      }
      if (/^(dung|sai|hoi)$/.test(S.cu)) { var md = dauTay(S.cu, p); md.so = soChoDauTay(md); ghiLich(o); o.dau.push(md); veCv(); veAi(); veTab(); veDs(); return; }
      if (S.cu === 'chu') { e.preventDefault(); oGoChu(cv, e, p); return; }
      if (S.cu === 'ke') {
        if (!S.keDau) { S.keDau = p; veTren(); return; }
        ghiLich(o); o.net.push({ cu: 'ke', mau: S.mau, d: [S.keDau, p], w: CO.ke * k.don }); S.keDau = null; veCv(); return;
      }
      S.tam = { cu: S.cu, mau: S.mau, d: [p, p], w: CO[S.cu] * k.don }; cv.setPointerCapture(e.pointerId);
    };
    cv.onpointermove = function (e) {
      if (!S || !S.anh) return;
      S.chuot = toaDo(cv, e);
      S.ctrl = e.ctrlKey || e.metaKey;
      if (S.keo) {
        var k = kichCo(), a = cvSangAnh(S.chuot[0], S.chuot[1], k.w, k.h, k.cw, k.ch, S.xoay || 0);
        if (!S.keo.daGhi) { ghiLich(suaHien()); S.keo.daGhi = true; }   // ghi lịch TRƯỚC khi dời ⇒ Ctrl+Z về chỗ cũ
        S.keo.m.x = S.keo.x0 + (a[0] - S.keo.a0[0]) / k.w; S.keo.m.y = S.keo.y0 + (a[1] - S.keo.a0[1]) / k.h;
        veCv(); return;
      }
      conTro(cv, e);
      if (S.tam) { if (S.tam.cu === 'but') S.tam.d.push(S.chuot); else S.tam.d[1] = S.chuot; }
      veTren();
    };
    cv.onpointerup = function (e) {
      if (S && S.keo) { var keo = S.keo; S.keo = null; if (keo.daGhi) henLuu(emHien(), S.p, S.cuChon); conTro(cv, e); veCv(); return; }
      if (S && S.tam) { var o = suaHien(); ghiLich(o); o.net.push(S.tam); S.tam = null; veCv(); } };
    cv.onpointerleave = function () { if (S && !S.tam) { S.chuot = null; veTren(); } };
    cv.oncontextmenu = function (e) { e.preventDefault(); if (!S || !S.anh) return; S.keDau = null; veTren(); moMenu(e.clientX, e.clientY, dauTai(toaDo(cv, e))); };
  }
  // Con trỏ: giữ Ctrl ⇒ bàn tay (đang kéo = nắm, trên dấu = mở, chỗ trống = mũi tên) · thường ⇒ ẩn (vẽ công cụ đúng cỡ ở lớp trên)
  function conTro(cv, e) {
    var ctrl = !!(S && (S.keo || S.ctrl || (e && (e.ctrlKey || e.metaKey))));
    cv.style.cursor = !ctrl ? 'none' : (S.keo ? 'grabbing' : (S.chuot && dauTai(S.chuot) ? 'grab' : 'default'));
  }
  // Ô gõ chữ ngay trên ảnh (⛔ không dùng prompt(): trình duyệt trong app chặn). Enter / bấm ra ngoài = ghi lên ảnh · Esc = bỏ
  function oGoChu(cv, e, p) {
    var cu = $('.cs-o-chu'); if (cu) cu.remove();
    var r = cv.getBoundingClientRect(), ve = $('#csVe'), k = kichCo(), o = document.createElement('input');
    o.className = 'cs-o-chu'; o.placeholder = 'Gõ chữ rồi Enter'; o.style.color = S.mau;
    o.style.fontSize = Math.max(12, coGo(k) * r.width / cv.width) + 'px'; o.style.fontWeight = NET_GO[NET.chu] || 800;
    o.style.left = (e.clientX - r.left) + 'px'; o.style.top = (e.clientY - r.top - 16) + 'px';
    ve.appendChild(o); setTimeout(function () { o.focus(); }, 0);
    var xong = function (ghi) {
      if (!o.parentNode) return;
      var t = o.value.trim(); o.remove();
      if (ghi && t) { var sua = suaHien(); ghiLich(sua); sua.net.push({ cu: 'chu', mau: S.mau, d: [p], chu: t, co: coGo(k), tl: true }); veCv(); }
    };
    o.onkeydown = function (ev) { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); xong(true); } if (ev.key === 'Escape') { ev.preventDefault(); xong(false); } };
    o.onblur = function () { xong(true); };
  }
  function veCv() {
    var cv = $('#csCv');
    if (!S.anh) { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); veTren(); return; }
    veTrang(cv.getContext('2d'), S.anh, S.xoay || 0, suaHien(), cv.width, cv.height);
    veTren();
  }
  // Lớp trên: con trỏ = công cụ đúng cỡ · nét đang vẽ · đường KẺ bám chuột · dấu nhấp nháy
  function veTren() {
    var cv = $('#csCvTren'), g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    if (!S || !S.anh) return;
    var k = kichCo(), p = S.chuot;
    if (S.tam) veNet(g, S.tam);
    if (S.keDau) {
      g.fillStyle = S.mau; g.beginPath(); g.arc(S.keDau[0], S.keDau[1], Math.max(3, CO.ke * k.don * 0.9), 0, Math.PI * 2); g.fill();
      if (p) veNet(g, { cu: 'ke', mau: S.mau, d: [S.keDau, p], w: CO.ke * k.don });
    }
    if (p && !S.tam && !S.ctrl && !S.keo) {
      g.save(); g.globalAlpha = 0.6;
      if (/^(dung|sai|hoi)$/.test(S.cu)) {
        var m = dauTay(S.cu, p);
        veDsDau(g, [m], S.anh, S.xoay || 0, k.cw, k.ch);
      } else if (S.cu === 'chu') {
        g.fillStyle = S.mau; g.font = (NET_GO[NET.chu] || 800) + ' ' + Math.round(coGo(k)) + 'px ' + FONT; g.textBaseline = 'middle'; g.fillText('Aa', p[0], p[1]);
      } else {
        var r = Math.max(1.5, CO[S.cu] * k.don / 2);
        g.globalAlpha = 0.85; g.fillStyle = S.mau; g.beginPath(); g.arc(p[0], p[1], r, 0, Math.PI * 2); g.fill();
        g.lineWidth = Math.max(1, k.don); g.strokeStyle = '#fff'; g.stroke();
      }
      g.restore();
    }
    if (S.nhay) {
      var t = (performance.now() - S.nhay.t0) / 1000, a = 0.5 + 0.5 * Math.sin(t * Math.PI * 4);
      g.save(); g.strokeStyle = 'rgba(47,111,237,' + (0.35 + 0.65 * a) + ')'; g.lineWidth = Math.max(3, S.nhay.s * 0.35);
      g.beginPath(); g.arc(S.nhay.x, S.nhay.y, S.nhay.s * (1.8 + a * 0.8), 0, Math.PI * 2); g.stroke(); g.restore();
    }
  }
  function napAnh(ban) {
    S.anh = null; S.keDau = null; S.tam = null; S.nhay = null;
    var cv = $('#csCv'), tren = $('#csCvTren');
    if (!ban || !ban.url) { $('#csVe').hidden = true; $('#csTrong').hidden = false; return; }
    $('#csVe').hidden = false; $('#csTrong').hidden = true;
    var url = ban.url, xoay = (ban.may && ban.may.xoay) || 0;
    taiAnh(url).then(function (a) {
      if (!S || S.hien !== ban) return;
      S.anh = a.im; S.ban = a.ban; S.xoay = xoay;
      var k = coXoay(a.im, xoay);
      cv.width = tren.width = k.cw; cv.height = tren.height = k.ch;
      veCv();
      if (S.choNhay != null) { var so = S.choNhay; S.choNhay = null; nhay(so); }
    }, function () { toast('Không tải được ảnh trang ' + S.p); });
  }
  // Cuộn tới dấu câu `so` + nhấp nháy
  function nhay(so) {
    var m = suaHien().dau.filter(function (x) { return x.so === so; })[0];
    if (!m || !S.anh) { toast('Câu ' + tenSo(so) + ' chưa có dấu trên ảnh — thầy xem tay nhé.'); return; }
    var k = kichCo(), q = hinhDau(m, k.w, k.h), c = anhSangCv(q.cx, q.cy, k.w, k.h, k.cw, k.ch, S.xoay || 0);
    var cv = $('#csCv'), vung = $('#csVung'), tl = cv.clientHeight / cv.height;
    vung.scrollTo({ top: Math.max(0, cv.offsetTop + c[1] * tl - vung.clientHeight / 2), behavior: 'smooth' });
    S.nhay = { x: c[0], y: c[1], s: q.s, t0: performance.now() };
    var vong = function () {
      if (!S || !S.nhay) return;
      if (performance.now() - S.nhay.t0 > 2200) { S.nhay = null; veTren(); return; }
      veTren(); requestAnimationFrame(vong);
    };
    requestAnimationFrame(vong);
  }
  function chuyen(p, so) {
    S.dangSo = so; S.dangP = p;
    if (p !== S.p || S.cuChon !== -1) { S.p = p; S.cuChon = -1; S.choNhay = so; veGiua(); veAi(); }
    else { veAi(); nhay(so); }
  }

  // ───────── vẽ khung ─────────
  var THU_NHOM = { cho: 0, tra: 1, chua: 2, xong: 3 };
  function veDs() {
    $('#csDs').innerHTML = '<h3>' + chu(S.tieuDe) + '<small>' + S.em.length + ' em · ' + S.em.filter(function (e) { return Object.keys((e.doc || {}).trang || {}).length; }).length + ' đã nộp</small></h3>' +
      // ⭐ v1.435.0 (thầy chốt 28/10) — xếp nhóm: CHỜ CHẤM → ĐÃ TRẢ LẠI (chưa nộp bổ sung) → CHƯA NỘP → ĐÃ ĐẠT (cuối, tên xanh lá); trong nhóm giữ thứ tự sĩ số.
      S.em.map(function (e, i) { return { e: e, i: i, t: ttEm(e) }; })
        .sort(function (a, b) { return ((THU_NHOM[a.t.lop] || 0) - (THU_NHOM[b.t.lop] || 0)) || (a.i - b.i); })
        .map(function (o) {
          var e = o.e, t = o.t;
          return '<div class="cs-em ' + t.lop + (o.i === S.i ? ' chon' : '') + '" data-i="' + o.i + '"><span class="cs-av">' + chu(String(e.ten).trim().slice(0, 2).toUpperCase()) +
            (e.av ? '<img alt="" src="' + chu(e.av) + '" onerror="this.remove()">' : '') + '</span><span class="cs-ten">' + chu(e.ten) + '</span><span class="cs-tt ' + t.lop + '">' + chu(t.chu) + '</span></div>';
        }).join('');
    $('#csDs').querySelectorAll('.cs-em').forEach(function (r) { r.onclick = function () { S.i = +r.dataset.i; S.p = S.trangs[0]; S.cuChon = -1; S.dangSo = null; veTat(); }; });
  }
  function veTab() {
    var e = emHien();
    $('#csTab').innerHTML = S.trangs.map(function (p) {
      var t = ttTrang(e, p), ghi = { thieu: 'chưa nộp', chan: 'máy chặn', tra: 'đã trả lại', dung: 'đúng hết', vang: (t.sai ? 'sai ' + t.sai : '') + (t.hoi ? (t.sai ? ' · ' : '') + t.hoi + ' chưa chắc' : '') || 'chưa đủ dấu' }[t.tt];
      return '<button class="' + lopNut(t.tt) + (p === S.p ? ' on' : '') + '" data-p="' + p + '" title="Trang ' + p + ': ' + ghi + '">TRANG ' + p + '</button>';
    }).join('');
    $('#csTab').querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { S.p = +b.dataset.p; S.cuChon = -1; S.dangSo = null; veGiua(); veAi(); }; });
  }
  function veGiua() {
    veTab();
    var e = emHien(), t = trangCua(e, S.p), hien = banCua(e, S.p, S.cuChon), laCu = S.cuChon >= 0 && hien !== t;
    S.hien = hien;
    napAnh(hien);
    var canh = $('#csCanh');
    canh.hidden = !(hien && !hien.dat);
    canh.textContent = laCu ? '⚠ ẢNH CŨ' + (hien && !hien.dat ? ' — MÁY CHẶN: ' + ((hien.may && hien.may.lyDo) || '') : '') : '⚠ MÁY CHẶN — ' + ((hien && (hien.lyDo || (hien.may && hien.may.lyDo))) || '');
    var cu = (t && t.cu) || [];
    $('#csCu').innerHTML = cu.length ? '<span>LẦN NỘP TRƯỚC:</span>' + cu.map(function (c, i) {
      return '<button class="' + (i === S.cuChon ? 'on' : '') + '" data-c="' + i + '"><img alt="" src="' + chu(c.nho || c.url) + '">' + (c.dat ? '' : '<b>⚠</b>') + '</button>';
    }).join('') + (S.cuChon >= 0 ? '<button class="ve" data-c="-1">' + ico('ve', 14) + 'ẢNH ĐANG DÙNG</button>' : '') : '';
    $('#csCu').querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { S.cuChon = +b.dataset.c; veGiua(); }; });
    var lich = '';
    if (t) {
      var d = new Date(t.luc || 0), gio = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
      lich = 'Nộp ' + gio + ' · ' + (t.quaLuot ? 'quá lượt máy kiểm — thầy xem tay' : t.dat ? 'máy kiểm ✓ đúng trang · đọc rõ · đủ nội dung' : 'máy CHẶN') +
        (t.duyet ? ' · thầy ' + (t.duyet.tt === 'dat' ? 'ĐẠT' : 'TRẢ LẠI') : '');
    }
    $('#csLich').textContent = lich || 'Em chưa nộp trang ' + S.p + '.';
    capNut();
  }
  function veAi() {
    var e = emHien(), tong = 0, dung = 0;
    var html = S.trangs.map(function (p) {
      var t = trangCua(e, p), tt = ttTrang(e, p), so = soCau(p);
      var cauMay = {}, laViet = !!(t && t.may && t.may.viet);
      (((t && t.may && t.may.cau) || [])).forEach(function (c) {
        if (laViet) (c.o || []).forEach(function (o, k) { cauMay[maO(c, k)] = o; }); else cauMay[c.so] = c;
      });
      if (!so.length) so = Object.keys(cauMay).map(Number).sort(function (a, b) { return a - b; });
      var dauSo = {}; if (t) suaCua(e, p, -1).dau.forEach(function (m) { if (m.so != null) dauSo[m.so] = m; });
      var dTrang = 0;
      var hang = so.map(function (n) {
        if (laViet) {   // dòng bài VIẾT: số · chữ em viết · đáp án · ✓✕?
          var o = cauMay[String(n)] || { doc: '', kq: '' }, g = (S.dapAn[p] || {})[String(n)] || {}, mv = dauSo[n];
          var kv = mv ? mv.loai : (!t ? '' : (o.kq === 'trong' ? 'sai' : (o.kq || 'hoi')));
          if (kv === 'dung') dTrang++;
          var dan = o.sua || (g.dung && g.dung[0]) || '';
          var gv = [o.ly, !mv && t ? 'chưa có dấu trên ảnh — thầy đánh tay' : ''].filter(Boolean).join(' · ');
          return '<div class="cs-cau viet ' + kv + (S.dangSo === n && S.p === p ? ' dang' : '') + '" data-p="' + p + '" data-so="' + n + '" title="' + chu((g.de || '') + (g.cot && String(n).indexOf('.') >= 0 ? ' · cột ' + (TEN_COT[g.cot] || g.cot) : '')) + '"><span class="so">' + tenSo(n) + '</span>' +
            '<span class="em-k">' + chu(o.doc || (o.kq === 'trong' ? '(bỏ trống)' : '—')) + '</span><span class="dung-k">' + chu(dan || '?') + '</span><span class="kq">' + ({ dung: '✓', sai: '✕', hoi: '?' }[kv] || '') + '</span>' +
            (gv ? '<span class="ghi">' + chu(gv) + '</span>' : '') + '</div>';
        }
        var c = cauMay[n] || { chon: '' }, dd = (S.dapAn[p] || {})[String(n)] || '', m = dauSo[n];
        var kq = m ? m.loai : (!t ? '' : (!c.chon ? 'trong' : (c.chon === '?' ? 'hoi' : (dd ? (c.chon === dd ? 'dung' : 'sai') : 'hoi'))));
        if (kq === 'dung') dTrang++;
        var ghi = !t ? '' : (!m && /^[ABCD]$/.test(c.chon || '') ? 'chưa có dấu trên ảnh — thầy đánh tay' : (c.chon === '?' || c.chac === false ? 'AI không chắc em khoanh gì — thầy xem tay' : (!c.chon ? 'em chưa khoanh' : '')));
        return '<div class="cs-cau ' + kq + (S.dangSo === n && S.p === p ? ' dang' : '') + '" data-p="' + p + '" data-so="' + n + '"><span class="so">' + n + '</span><span class="em-k">' + chu(c.chon || '—') + '</span>' +
          '<span class="dung-k">' + chu(dd || '?') + '</span><span class="kq">' + ({ dung: '✓', sai: '✕', hoi: '?', trong: '–' }[kq] || '') + '</span>' +
          (ghi ? '<span class="ghi">' + ghi + '</span>' : '') + '</div>';
      }).join('');
      tong += so.length; dung += dTrang;
      var nhan = { thieu: 'CHƯA NỘP', chan: 'MÁY CHẶN', tra: 'ĐÃ TRẢ LẠI' }[tt.tt] || (dTrang + '/' + so.length);
      var lech = laViet && t.may.lech ? '<div class="cs-lech">⚠ ' + chu(t.may.lech) + '</div>' : '';
      return '<div class="cs-nhom ' + lopNut(tt.tt) + '" data-p="' + p + '">TRANG ' + p + (so.length ? ' · CÂU ' + Math.floor(so[0]) + '–' + Math.floor(so[so.length - 1]) : '') + '<span>' + nhan + '</span></div>' +
        (t ? lech + hang : '<div class="cs-nhom-rong">Em chưa nộp trang này.</div>');
    }).join('');
    $('#csBang').innerHTML = html + '<div class="cs-chu-thich">Cột 2 = em khoanh / em viết · cột 3 = đáp án đúng · ✓ ✕ ? theo dấu đang có trên ảnh · "4·2" = câu 4 ô thứ 2.</div>';
    $('#csBang').querySelectorAll('.cs-cau').forEach(function (r) { r.onclick = function () { chuyen(+r.dataset.p, +r.dataset.so); }; });
    $('#csBang').querySelectorAll('.cs-nhom').forEach(function (r) { r.onclick = function () { var p = +r.dataset.p; if (p !== S.p) { S.p = p; S.cuChon = -1; S.dangSo = null; veGiua(); veAi(); } }; });
    $('#csAiTrang').textContent = S.trangs.length + ' TRANG · ' + tong + ' CÂU';
    $('#csTong').textContent = tong ? dung + '/' + tong : '';
    $('#csNhan').value = loiNhan();
    capNut();
  }
  function saiCua(e, p) { return trangCua(e, p) ? suaCua(e, p, -1).dau.filter(function (m) { return m.so != null && m.loai === 'sai'; }).map(function (m) { return m.so; }).sort(function (a, b) { return a - b; }) : []; }
  function hoiCua(e, p) { return trangCua(e, p) ? suaCua(e, p, -1).dau.filter(function (m) { return m.so != null && m.loai === 'hoi'; }).map(function (m) { return m.so; }).sort(function (a, b) { return a - b; }) : []; }
  function loiNhan() {
    var e = emHien(), ten = String((e && e.ten) || '').trim(), sai = [];
    S.trangs.forEach(function (p) { sai = sai.concat(saiCua(e, p)); });
    sai = sai.map(Math.floor).filter(function (n, i, a) { return a.indexOf(n) === i; });
    var thieu = S.trangs.filter(function (p) { var t = ttTrang(e, p).tt; return t === 'thieu' || t === 'chan' || t === 'tra'; });
    if (thieu.length) return 'Chào ' + ten + ', thầy chưa nhận đủ bài sách ' + S.tieuDe + ': trang ' + thieu.join(', ') + ' con chụp lại rõ, đủ cả trang rồi nộp trên web giúp thầy nhé.' +
      (sai.length ? ' Con xem lại luôn câu ' + sai.join(', ') + ' (thầy đã đánh dấu ✕ đỏ trong ảnh).' : '');
    return sai.length
      ? 'Chào ' + ten + ', bài sách ' + S.tieuDe + ' con làm tốt! Con xem lại câu ' + sai.join(', ') + ' (thầy đã đánh dấu ✕ đỏ trong ảnh), sửa trong vở rồi chụp lại trang đó nộp trên web nhé.'
      : 'Chào ' + ten + ', bài sách ' + S.tieuDe + ' con làm đúng hết, giỏi lắm! Thầy khen con nhé.';
  }
  function veTat() { veDs(); veGiua(); veAi(); }

  // ───────── pop-up CHỤP LỖI / ĐẠT ─────────
  function dongPop() { var p = $('#csPop'); p.hidden = true; p.innerHTML = ''; }
  function loiNhanTrang(e, p) {
    var gop = function (a) { return a.map(Math.floor).filter(function (n, i, b) { return b.indexOf(n) === i; }); };   // 4·1, 4·2 ⇒ câu 4
    var sai = gop(saiCua(e, p)), hoi = gop(hoiCua(e, p)), tt = ttTrang(e, p).tt, t = trangCua(e, p), viet = !!(t && t.may && t.may.viet);
    if (tt === 'chan') return 'Trang ' + p + ': ảnh chưa đạt (' + ((t && (t.lyDo || (t.may && t.may.lyDo))) || 'chưa rõ / chưa đủ trang') + '). Con chụp lại rõ, đủ cả trang rồi nộp lại nhé.';
    var c = [];
    if (sai.length) c.push('con xem lại câu ' + sai.join(', ') + ' (dấu ✕ đỏ)');
    if (hoi.length) c.push('câu ' + hoi.join(', ') + ' thầy chưa đọc rõ con ' + (viet ? 'viết' : 'khoanh') + ' gì (dấu ? vàng)');
    return 'Trang ' + p + ': ' + (c.length ? c.join('; ') : 'thầy đã đánh dấu chỗ cần sửa trong ảnh') + '. Con sửa trong vở rồi chụp lại trang này, nộp lại trên web nhé.';
  }
  function moChupLoi() {
    var e = emHien(), pop = $('#csPop');
    var ds = S.trangs.filter(function (p) { return trangCua(e, p); });
    pop.innerHTML = '<div class="cs-pop-hop"><div class="cs-pop-dau loi"><b>📋 CHỤP LỖI · ' + chu(String(e.ten).toUpperCase()) + '</b><span>' + chu(S.tieuDe) +
      ' — mỗi trang một ảnh to để gửi Zalo; TRẢ LẠI ⇒ em thấy ảnh đã chấm + lời nhắn trên web và chụp lại trang đó.</span><button class="cs-dong" data-dong>' + ico('dong', 18, 2.4) + '</button></div>' +
      '<div class="cs-pop-than">' + S.trangs.map(function (p) {
        var t = trangCua(e, p);
        if (!t) return '<div class="cs-loi-dong"><div class="cs-trong" style="color:#94A3B8">Em chưa nộp trang ' + p + '.</div><div></div></div>';
        var tt = ttTrang(e, p), daTra = t.duyet && t.duyet.tt === 'tra';
        return '<div class="cs-loi-dong" data-p="' + p + '"><div class="cs-loi-anh"><img alt="Trang ' + p + '" data-anh></div><div class="cs-loi-ben"><h4>TRANG ' + p + '</h4>' +
          '<p>' + (tt.tt === 'chan' ? '⚠ Máy chặn ảnh này' : (tt.sai ? 'Sai ' + tt.sai + ' câu' : 'Không có câu sai') + (tt.hoi ? ' · ' + tt.hoi + ' câu chưa chắc' : '')) + '</p>' +
          '<div class="cs-loi-tt tra" data-tt' + (daTra ? '' : ' hidden') + '>↺ ĐÃ TRẢ LẠI — em đang sửa</div>' +
          '<textarea data-nhan>' + chu(daTra && t.duyet.nhan ? t.duyet.nhan : loiNhanTrang(e, p)) + '</textarea>' +
          '<button class="cs-nut chup" data-chup>' + ico('chup', 16, 2.2) + 'CHỤP TRANG ' + p + '</button><button class="cs-nut tra" data-tra></button></div></div>';
      }).join('') + '</div>' +
      '<div class="cs-pop-day"><span>' + ds.length + '/' + S.trangs.length + ' trang đã nộp. Ảnh chụp có dải tên em ở trên — dán thẳng vào Zalo (Ctrl+V).</span><button class="cs-nut phu" data-dong>ĐÓNG</button></div></div>';
    pop.hidden = false;
    pop.querySelectorAll('[data-dong]').forEach(function (b) { b.onclick = dongPop; });
    pop.querySelectorAll('.cs-loi-dong[data-p]').forEach(function (row) {
      var p = +row.dataset.p, cvP = dungTrang(e, p, -1, { dai: true }), nut = row.querySelector('[data-tra]');
      cvP.then(function (c) { try { row.querySelector('[data-anh]').src = c.toDataURL('image/jpeg', 0.9); } catch (er) { row.querySelector('[data-anh]').alt = 'Ảnh chưa xuất được (CORS)'; } });
      row.querySelector('[data-chup]').onclick = function () {
        chepAnh(cvP.then(function (c) { return canvasBlob(c, 'image/png'); }))
          .then(function () { toast('✓ Đã chụp trang ' + p + ' — mở Zalo, Ctrl+V để dán'); }, function (er) { toast('Chưa chép được ảnh: ' + ((er && er.message) || er)); });
      };
      // ⭐ v1.448.0 (thầy 29/10) — nút TRẢ LẠI ⇄ ĐÃ TRẢ LẠI: trả lại xong vẫn bấm được để CHẤP NHẬN LẠI; hai chiều đều hỏi pop-up nhỏ.
      //   Chấp nhận lại = duyetSach { trang, tt:'dat' } (máy chủ sẵn có: thay duyet TRẢ LẠI bằng ĐẠT trang đó) ⇒ em hết phải chụp lại trang này.
      var daTra = function () { var t = trangCua(e, p); return !!(t && t.duyet && t.duyet.tt === 'tra'); };
      var capTra = function () {
        var tra = daTra();
        nut.disabled = false; nut.classList.toggle('da', tra);
        nut.innerHTML = tra ? ico('dat', 16, 2.2) + 'ĐÃ TRẢ LẠI TRANG ' + p : ico('tra', 16, 2.2) + 'TRẢ LẠI TRANG ' + p;
        nut.title = tra ? 'Bấm để CHẤP NHẬN LẠI trang này (em không phải chụp lại)' : 'Trả lại trang này kèm ảnh đã chấm + lời nhắn';
        row.querySelector('[data-tt]').hidden = !tra;
      };
      capTra();
      var gui = function (tra) {
        var nhan = row.querySelector('[data-nhan]').value.trim();
        nut.disabled = true; nut.textContent = tra ? 'Đang trả lại…' : 'Đang chấp nhận lại…';
        (tra ? cvP.then(function (c) {
          var anh = ''; try { anh = c.toDataURL('image/jpeg', 0.85); } catch (er) { anh = ''; }
          return hamDuyet().then(function (f) { return f({ id: [S.lop, S.bai, S.bt, e.ma].join('__'), trang: p, tt: 'tra', nhan: nhan, anh: anh }); });
        }) : hamDuyet().then(function (f) { return f({ id: [S.lop, S.bai, S.bt, e.ma].join('__'), trang: p, tt: 'dat' }); }))
          .then(function () { return S.docLai(e); }).then(function (d) {
            if (d) e.doc = d;
            capTra();
            toast(tra ? '↺ Đã trả lại trang ' + p + ' — em sẽ thấy ảnh thầy chấm + lời nhắn trên web' : '✓ Đã chấp nhận lại trang ' + p + ' — em không phải chụp lại trang này');
            veTat(); if (S.onDoi) S.onDoi();
          })['catch'](function (er) { capTra(); toast((tra ? 'Chưa trả lại được: ' : 'Chưa chấp nhận lại được: ') + ((er && er.message) || er)); });
      };
      nut.onclick = function () {
        if (daTra()) hoiNho('Chấp nhận lại trang ' + p + '?', 'Trang ' + p + ' của ' + e.ten + ' sẽ không còn bị trả lại — em không phải chụp lại trang này nữa.', 'CHẤP NHẬN LẠI', 'dat', function () { gui(false); });
        else hoiNho('Trả lại trang ' + p + ' cho ' + e.ten + '?', 'Em sẽ thấy ảnh thầy đã chấm + lời nhắn trên web và phải chụp lại trang này.', 'TRẢ LẠI', 'bo', function () { gui(true); });
      };
    });
    // ⭐ v1.448.0 — mở pop-up là cuộn tới TRANG ĐẦU TIÊN CÓ LỖI (✕ sai · ? chưa chắc · máy chặn); mỗi hàng cao đúng khung nên vị trí biết trước khi ảnh về
    var dau = S.trangs.filter(function (p) { var t = ttTrang(e, p); return t.tt === 'chan' || t.sai > 0 || t.hoi > 0; })[0];
    var hang = dau != null && pop.querySelector('.cs-loi-dong[data-p="' + dau + '"]'), than = pop.querySelector('.cs-pop-than');
    if (hang && than) than.scrollTop = hang.offsetTop;
  }
  function ghepDat(e) {
    var dsP = S.trangs.filter(function (p) { return trangCua(e, p); });
    return Promise.all(dsP.map(function (p) { return dungTrang(e, p, -1, { rong: 1000 }); })).then(function (cs) {
      var COT = 2, GAP = 28, PAD = 28, NHAN = 44, DAI = 96, W = 1000;
      var hang = []; for (var i = 0; i < cs.length; i += COT) hang.push(cs.slice(i, i + COT));
      var cao = hang.map(function (h) { return Math.max.apply(null, h.map(function (c) { return c.height; })) + NHAN; });
      var c = document.createElement('canvas');
      c.width = PAD * 2 + COT * W + (COT - 1) * GAP;
      c.height = DAI + PAD + cao.reduce(function (s, x) { return s + x + GAP; }, 0) + PAD - GAP;
      var g = c.getContext('2d');
      g.fillStyle = '#F4F8F7'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#15803D'; g.fillRect(0, 0, c.width, DAI);
      g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.font = '900 40px ' + FONT;
      g.fillText('✓ ĐẠT · ' + String(e.ten).toUpperCase() + ' · ' + S.tieuDe, PAD, DAI / 2);
      var y = DAI + PAD;
      hang.forEach(function (h, r) {
        h.forEach(function (cv, j) {
          var x = PAD + j * (W + GAP), p = dsP[r * COT + j];
          g.fillStyle = '#16232A'; g.font = '900 26px ' + FONT; g.fillText('TRANG ' + p, x, y + NHAN / 2 - 4);
          g.drawImage(cv, x, y + NHAN);
        });
        y += cao[r] + GAP;
      });
      return c;
    });
  }
  function moDat() {
    var e = emHien(), pop = $('#csPop');
    var thieu = S.trangs.filter(function (p) { var t = ttTrang(e, p).tt; return t === 'thieu' || t === 'chan'; });
    var sai = S.trangs.reduce(function (s, p) { return s + saiCua(e, p).length; }, 0);
    pop.innerHTML = '<div class="cs-pop-hop"><div class="cs-pop-dau dat"><b>✓ ĐẠT · ' + chu(String(e.ten).toUpperCase()) + '</b><span>' + chu(S.tieuDe) + '</span><button class="cs-dong" data-dong>' + ico('dong', 18, 2.4) + '</button></div>' +
      '<div class="cs-pop-than"><div class="cs-dat-luoi">' + S.trangs.map(function (p) {
        return '<div class="cs-dat-o" data-p="' + p + '"><b>TRANG ' + p + '</b>' + (trangCua(e, p) ? '<img alt="" data-anh>' : '<div class="rong">Em chưa nộp trang ' + p + '</div>') + '</div>';
      }).join('') + '</div></div>' +
      '<div class="cs-pop-day"><span>' + (thieu.length ? '⚠ Còn thiếu / máy chặn trang ' + thieu.join(', ') + ' — ĐẠT vẫn ghi cho các trang đã nộp. ' : '') +
        (sai ? '⚠ Còn ' + sai + ' dấu ✕ sai trên ảnh. ' : '') + 'Bấm CHỤP ẢNH ĐẠT ⇒ 1 ảnh ghép mọi trang vào clipboard (Ctrl+V vào Zalo).</span>' +
        '<button class="cs-nut phu" data-dong>ĐÓNG</button><button class="cs-nut dat" id="csChupDat">' + ico('chup', 16, 2.2) + 'CHỤP ẢNH ĐẠT</button></div></div>';
    pop.hidden = false;
    pop.querySelectorAll('[data-dong]').forEach(function (b) { b.onclick = dongPop; });
    pop.querySelectorAll('.cs-dat-o[data-p]').forEach(function (o) {
      var img = o.querySelector('[data-anh]'); if (!img) return;
      dungTrang(e, +o.dataset.p, -1, { rong: 900 }).then(function (c) { try { img.src = c.toDataURL('image/jpeg', 0.88); } catch (er) { img.alt = 'Ảnh chưa xuất được (CORS)'; } });
    });
    // v1.436.0 — pop-up này CHỈ chụp ảnh (ghi ĐẠT đã làm ở nút ĐẠT)
    $('#csChupDat').onclick = function () {
      var nut = this; nut.disabled = true; nut.textContent = 'Đang chụp…';
      chepAnh(ghepDat(e).then(function (c) { return canvasBlob(c, 'image/png'); })).then(function () {
        toast('✓ Ảnh ĐẠT đã vào clipboard (Ctrl+V vào Zalo)'); dongPop();
      }, function () {
        nut.disabled = false; nut.innerHTML = ico('chup', 16, 2.2) + 'CHỤP ẢNH ĐẠT'; toast('⚠ Chưa chép được ảnh');
      });
    };
  }
  // ⭐ v1.436.0 — nút ĐẠT: chưa ĐẠT ⇒ ghi ĐẠT cả bài ngay · đã ĐẠT ⇒ hỏi BỎ ĐẠT (máy chủ duyetSach tt:'bo' trả về như trước khi ĐẠT)
  function bamDat() {
    var e = emHien(); if (!e || S.dangGhiDat) return;
    if (this && this.classList && this.classList.contains('khoa')) return void toast('🔒 Còn câu chưa có dấu ✓/✕ — bấm ĐÚP vào ĐẠT nếu vẫn muốn ghi ĐẠT');   // v1.448.0
    if (ttEm(e).lop !== 'xong') return void ghiDat(e, 'dat');
    hoiNho('Bỏ ĐẠT bài của ' + e.ten + '?', 'Bài sẽ trở về CHỜ CHẤM như trước khi thầy bấm ĐẠT. Dấu chấm và nét vẽ vẫn giữ nguyên.', 'BỎ ĐẠT', 'bo', function () { ghiDat(e, 'bo'); });
  }
  // ⭐ v1.448.0 — pop-up NHỎ xác nhận (nằm trên mọi lớp của trang chấm, kể cả pop-up CHỤP LỖI). Esc / HUỶ / bấm nền = thôi.
  function hoiNho(tieu, loi, chuNut, lopNut, ok) {
    var cu = $('.cs-hoi-nen'); if (cu) cu.remove();
    var el = document.createElement('div');
    el.className = 'cs-hoi-nen';
    el.innerHTML = '<div class="cs-hoi"><b>' + chu(tieu) + '</b><p>' + chu(loi) + '</p>' +
      '<div class="cs-hang"><button class="cs-nut phu" data-huy>HUỶ</button><button class="cs-nut ' + lopNut + '" data-ok>' + chu(chuNut) + '</button></div></div>';
    ($('#csNen') || document.body).appendChild(el);
    el.onclick = function (ev) { if (ev.target === el || ev.target.closest('[data-huy]')) el.remove(); };
    el.querySelector('[data-ok]').onclick = function () { el.remove(); ok(); };
    el.querySelector('[data-ok]').focus();
  }
  function ghiDat(e, tt) {
    S.dangGhiDat = true; capNut();
    hamDuyet().then(function (f) { return f({ id: [S.lop, S.bai, S.bt, e.ma].join('__'), tat: true, tt: tt }); })
      .then(function () { return S.docLai(e); })
      .then(function (d) {
        if (d) e.doc = d;
        S.dangGhiDat = false; veTat(); if (S.onDoi) S.onDoi();
        toast(tt === 'dat' ? '✓ Đã ghi ĐẠT cho ' + e.ten : 'Đã bỏ ĐẠT — ' + e.ten + ' trở về CHỜ CHẤM');
      }, function (er) {
        S.dangGhiDat = false; capNut();
        toast((tt === 'dat' ? 'Chưa ghi ĐẠT được: ' : 'Chưa bỏ ĐẠT được: ') + ((er && er.message) || er));
      });
  }

  /* cfg = { tieuDe, lop, bai, bt, trangs:[32,33,34], sach:'NTTA', em:[{ten, ma, doc, av (url ảnh, v1.435.0)}], docLai(em) ⇒ Promise<doc>, onDoi(), onDong() } */
  function mo(cfg) {
    if (!$('#csNen')) dungKhung();
    S = Object.assign({ i: 0, p: cfg.trangs[0], cu: 'but', mau: MAU[0], dapAn: {}, dapAnXong: false, cuChon: -1, hien: null, keDau: null, tam: null, chuot: null, nhay: null, dangSo: null, choNhay: null }, cfg);
    var dau = S.em.findIndex(function (e) { return ttEm(e).lop === 'cho'; });
    S.i = dau >= 0 ? dau : 0;
    $('#csTieu').textContent = 'CHẤM BÀI SÁCH · ' + S.tieuDe;
    $('#csPhu').textContent = 'Trang ' + S.trangs.join(', ');
    // v1.434.0 — cfg.nhung = khung chứa ⇒ trang chấm nằm TRONG khung đó (không phủ màn hình, không khoá cuộn trang)
    var n = $('#csNen');
    if (cfg.nhung) { n.classList.add('nhung'); cfg.nhung.appendChild(n); }
    else { n.classList.remove('nhung'); if (n.parentNode !== document.body) document.body.appendChild(n); document.documentElement.classList.add('cs-mo'); }
    n.hidden = false;
    // nạp sẵn font chung (chữ vẽ trên canvas không tự chờ font) rồi vẽ lại ảnh
    if (document.fonts && document.fonts.load) Promise.all(['500', '600', '800'].map(function (w) { return document.fonts.load(w + ' 20px Montserrat', 'Aạ'); }))
      .then(function () { if (S && S.anh) veCv(); }, function () { /* không tải được font ⇒ dùng font dự phòng trong FONT */ });
    chonCu('but');
    veTat();
    docDapAn(S.sach || 'NTTA', S.trangs).then(function (d) { if (!S) return; S.dapAn = d; S.dapAnXong = true; veDs(); veTab(); veAi(); if (S.anh) veCv(); });
  }
  window.ChamSach = { mo: mo, dong: dong, nhung: nhung, coLop: coLop };
})();
