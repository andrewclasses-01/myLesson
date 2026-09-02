/* ============================================================
   chung.js — PHẦN DÙNG CHUNG CHO MỌI TRANG CỦA HỌC SINH (web v1.9.0)

   Web myLesson từ v1.9.0 là NHIỀU TRANG chứ không còn một trang duy nhất:

     index.html   — đăng nhập (mã học sinh · mã quản lý)
     lop.html     — trang chính của lớp: các thẻ bài tập
     bai.html     — một bài tập (dùng chung cho WORDS · DICTS · READING)
     bai-sp.html  — bài SPEAKING SLIDE (Canva + danh sách nộp video)
     dashboard.html — trang quản lý của thầy (đang dựng)

   Mọi trang đều cần đúng ba thứ: EM ĐANG ĐĂNG NHẬP LÀ AI · DỮ LIỆU LỚP/BÀI ·
   ĐIỂM BÊN AWORD. Gom hết vào đây để sửa một chỗ là cả bộ đi theo.

   ⛔ Viết kiểu ES5 (var, function, không dùng => hay class) — GIỐNG HỆT mọi
   file mẫu, vì máy học sinh có cả iPad đời cũ.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.MYLESSON_CONFIG || {};
  var KHOA_EM = 'mylesson_hs';       // nhớ em đã đăng nhập, ngay trên máy em

  // ---------- tiện ích chữ ----------

  function chuAnToan(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Chuẩn hoá MÃ: bỏ mọi khoảng trắng + viết hoa.
  // ⛔ PHẢI giống hệt `chuan_hoa_ma()` bên myStudent — nơi thầy gõ mã cho từng
  // em — và giống hàm cùng tên trong bản web cũ, không thì em gõ đúng mã vẫn
  // bị báo sai.
  function chuanMa(s) {
    return String(s || '').replace(/\s+/g, '').toUpperCase();
  }

  // Khoá so tên: dùng để ghép tên em bên AWord với tên trong danh sách lớp.
  //
  // ⛔ PHẢI BỎ DẤU. Đã đo thật trên kho điểm AWord (23/08/2026): các lượt nộp
  // đang lưu tên kiểu "Bao Chau" · "Trang Anh" — không dấu, viết hoa chữ đầu —
  // vì em tự gõ tên ở màn Start của AWord. Trong khi myStudent ghi "BẢO CHÂU".
  // So thẳng là TRƯỢT, mà trượt ở đây không chỉ sai bảng xếp hạng: trang lớp
  // đếm "ai chưa nộp bài" bằng chính phép so này ⇒ em làm rồi vẫn bị bêu tên.
  // ⛔ CỐ Ý KHÔNG dùng regex ở khâu bỏ dấu, mà lọc theo MÃ SỐ ký tự
  // (0x300-0x36F là dải dấu thanh). Viết dải đó vào regex là phải gõ ký tự dấu
  // vào mã nguồn, mà mọi công cụ sửa file đều tự chuẩn hoá Unicode ⇒ hàm hỏng
  // lặng lẽ, không báo lỗi gì. Đã vấp đúng bẫy này ngay trong phiên 23/08.
  function khoaTen(t) {
    var d = String(t || '').normalize('NFD'), ra = '';
    for (var i = 0; i < d.length; i++) {
      var c = d.charCodeAt(i);
      if (c >= 0x300 && c <= 0x36F) continue;      // 0300-036F = dải dấu thanh
      ra += (c === 0x111 || c === 0x110) ? 'd' : d.charAt(i);   // đ / Đ -> d
    }
    return ra.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  // "B2-B" -> "B2B" (chữ đưa cho học sinh xem và truyền sang AWord).
  // Lớp tên chữ như "NỀN TẢNG K9" thì giữ nguyên.
  function lopHien(ma) {
    return String(ma || '').replace(/^([A-Za-z]+\d*)-(\w)$/, '$1$2');
  }

  // ---------- đọc dữ liệu ----------

  var nhoDl = null;

  // Đọc lop.json + bai.json. `?t=` + no-store để không dính bản cũ trong máy —
  // GitHub Pages giữ cache ~10 phút, thiếu chốt này là thầy đẩy bài mới mà học
  // sinh vẫn thấy bài cũ.
  function napDuLieu() {
    if (nhoDl) return nhoDl;
    // ⭐ v1.20.0 — nạp kèm BẢNG HẠN SỬA (xem `napHanSua`). Để ĐÚNG ửe ĐÂY, cố ý:
    // cả bốn trang (lớp · bài · bài SP · dashboard) đều vào dữ liệu qua cửa này, nên
    // cắm một chỗ là trang nào cũng thấy hạn đã sửa mà không phải sửa trang nào.
    // ⛔ `napHanSua()` TỰ NUỐT mọi lỗi và trả bảng rỗng: mạng hỏng / chưa dán luật
    // Firestore thì trang phải chạy y như trước v1.20.0 chứ không được trắng bảng.
    // ⭐ v1.48.0 — nạp kèm kho `lessonNghi` (thẻ "không giao bài"). Cùng lý do
    // đặt ở đây với `napHanSua()`: mọi trang vào dữ liệu qua đúng cửa này.
    nhoDl = Promise.all([napJson('data/lop.json'), napJson('data/bai.json'),
                         napHanSua(), napNghi()])
      .then(function (r) {
        // ⭐ v1.35.0 — kho `lessonHan` nay mang HAI bảng: hạn riêng + trạng thái thẻ.
        var bang = r[2] || {};
        HAN_SUA = bang.han || {};
        TT_THE = bang.tt || {};
        NGHI = r[3] || {};
        return { lop: (r[0] && r[0].lop) || [], bai: (r[1] && r[1].bai) || {} };
      });
    return nhoDl;
  }

  // ---------- ⭐ v1.20.0 — HẠN SỬA RIÊNG TẪNG THẺ ----------
  //
  // Thầy chốt 26/08/2026: có hôm đặc biệt cần đổi hạn của MỘT thẻ, không phải
  // hạn mặc định. Dashboard ghi hạn đó vào kho `lessonHan` trên Firestore; mọi trang
  // đọc kho đó đè lên `bai.json`.
  //
  // ⛔ VÌ SAO KHÔNG GHI THẲNG VÀO `bai.json`: trang này là GitHub Pages tĩnh, không
  // có cửa ghi nào — muốn đổi file là phải ngồi ở máy có app rồi đẩy lại.
  //
  // ⛔ KHOÁ CỦA BẢNG LÀ TRƯỜNG `baiId` TRONG TÀI LIỆU, KHÔNG phải mã tài liệu:
  // mã bài có thể chứa dấu `/` (lấy từ lesson key thầy gõ) mà Firestore cấm dấu đó
  // trong mã tài liệu, nên bên ghi phải thay nó đi. Đọc theo mã tài liệu là tra trượt.
  //
  // Chuỗi RỖNG = "đã gỡ, về hạn mặc định" — luật kho cấm xoá tài liệu (đúng nếp các
  // khối cũ), nên gỡ là ghi đè chuỗi rỗng chứ không phải xoá.
  var HAN_SUA = {};

  // ⭐ v1.35.0 (02/09/2026) — TRẠNG THÁI THẺ, cùng tài liệu `lessonHan`, trường `tt`:
  //   ''      bình thường
  //   'an'    ẨN với học sinh (thẻ biến mất ở trang lớp/bài; dashboard vẫn thấy, mờ)
  //   'khoa'  TẠM KHOÁ (thẻ hiện, không mở được, đồng hồ DỪNG — thầy chốt 02/09)
  //   'xoa'   ĐÃ XOÁ MỀM (biến mất mọi trang; dữ liệu bai.json + điểm AWord còn nguyên,
  //           khôi phục ở mục KHO trên dashboard)
  // Thầy chốt: cờ GIỮ NGUYÊN khi app đẩy lại bài (y hệt hạn riêng). Vì sao gộp
  // chung tài liệu với hạn riêng: kho này đã được liệt kê sẵn ở `napHanSua()`,
  // thêm trường = KHÔNG tốn thêm lượt đọc Firestore nào (luật 8️⃣ BAN GIAO.md).
  var TT_THE = {};

  // ⭐ v1.29.0 (28/08/2026) — NHỚ ĐỆM 60 GIÂY, cùng nếp `nhoDiem`/`docPhien` ngay dưới.
  //
  // ⛔ VÌ SAO PHẢI ĐỆM: `napHanSua()` treo trong `napDuLieu()`, mà `napDuLieu()` là
  // cửa vào dữ liệu của CẢ BỐN TRANG (index · lop · bai · bai-sp) + dashboard. Nó
  // liệt kê cả kho `lessonHan`, và Firestore tính MỘT LƯỢT ĐỌC CHO MỖI TÀI LIỆU
  // liệt kê được — nên mỗi cú bấm qua lại lop ↔ bai là đọc lại cả kho từ đầu.
  // Cộng với 200 tin chat mỗi lần mở trang lớp (xem `chat.js TOI_DA_TIN`), ngày
  // 28/08/2026 project `aword-70dae` cạn sạch 50.000 lượt đọc/ngày của gói miễn
  // phí ⇒ kho trả 429 cho MỌI phép đọc ⇒ SP CHECK của A2B chết cứng.
  //
  // Cái giá của 60 giây: thầy vừa sửa hạn ở dashboard thì em nào đang mở trang sẽ
  // thấy hạn mới chậm nhất sau 1 phút. Đổi lại quá hời, và đúng bằng `CACHE_GIAY`
  // mà bảng điểm đã chịu từ lâu.
  // ⛔ Cố ý KHÔNG dùng lại `CACHE_GIAY` của bảng điểm (khai tận dòng ~327, DƯỚI chỗ
  // này): `var` được nâng lên nên tên có sẵn, nhưng GIÁ TRỊ thì chỉ gán khi chạy tới
  // dòng đó. Tham chiếu ngược kiểu ấy hôm nay còn chạy đúng vì `napHanSua()` gọi
  // muộn hơn, nhưng ai dời một khối là hỏng câm. Hai con số cùng là 60, khác nhiệm vụ.
  var HAN_CACHE_GIAY = 60;
  // ⭐ v1.35.0 — đổi tên khoá đệm (`awc_hansua` → `awc_hansua2`): khuôn bản đệm đổi
  // từ {id: hạn} sang {han:{}, tt:{}}; máy đang mở trang bản cũ mà đọc trúng khuôn
  // cũ là mất sạch hạn/trạng thái trong 60 giây đầu.
  var KHOA_HAN = 'awc_hansua2';

  function docHanPhien() {
    try {
      var o = JSON.parse(sessionStorage.getItem(KHOA_HAN) || 'null');
      if (o && (Date.now() - o.luc) < HAN_CACHE_GIAY * 1000) return o.bang;
    } catch (e) {}
    return null;
  }

  function napHanSua() {
    // ⛔ CẢ THÂN HÀM NẰM TRONG try: `fetch()` không chỉ trả Promise hỏng, nó còn
    // NÉM NGAY TẠI CHỖ (URL không hợp lệ, tham số lạ). Ném ngay thì `.catch()`
    // phía dưới không đỡ được, cú ném xuyên thẳng qua `Promise.all` trong
    // `napDuLieu()` — và lúc đó KHÔNG trang nào nạp được bài nữa, chỉ vì một
    // tính năng phụ. Đo được thật trên bàn thử 26/08/2026.
    try {
      var db = CFG.AWORD_DB || {};
      if (!db.projectId || !db.apiKey) return Promise.resolve({});
      var san = docHanPhien();
      if (san && san.han && san.tt) return Promise.resolve(san);
      var u = 'https://firestore.googleapis.com/v1/projects/' + db.projectId
            + '/databases/(default)/documents/lessonHan?pageSize=300&key='
            + encodeURIComponent(db.apiKey);
      return fetch(u, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          // ⭐ v1.35.0 — trả HAI bảng {han, tt} thay vì một bảng hạn.
          var ra = { han: {}, tt: {} };
          var ds = (j && j.documents) || [];
          for (var i = 0; i < ds.length; i++) {
            var f = ds[i].fields || {};
            var id = f.baiId && f.baiId.stringValue;
            if (!id) continue;
            ra.han[id] = String((f.han && f.han.stringValue) || '');
            ra.tt[id] = chuanTt((f.tt && f.tt.stringValue) || '');
          }
          // ⛔ CHỈ ĐỆM KHI ĐỌC ĐƯỢC THẬT (`j` khác null). Đệm cả lượt hỏng là
          // đóng băng bảng rỗng suốt 60 giây — mạng chớp một cái là mọi thẻ
          // mất hạn đã sửa, mà lần tải lại ngay sau đó cũng không cứu được.
          if (j) { try { sessionStorage.setItem(KHOA_HAN,
            JSON.stringify({ luc: Date.now(), bang: ra })); } catch (e) {} }
          return ra;
        })['catch'](function () { return { han: {}, tt: {} }; });
    } catch (e) { return Promise.resolve({ han: {}, tt: {} }); }
  }

  // Bản đệm ghi lại cả hai bảng (gọi sau mỗi lần dashboard ghi xong, xem `datHanSua`
  // / `datTrangThai`) — không dọn là thầy vừa bấm xong, sang trang khác bản đệm CŨ đè lại.
  function luuDemHan() {
    try { sessionStorage.setItem(KHOA_HAN,
      JSON.stringify({ luc: Date.now(), bang: { han: HAN_SUA, tt: TT_THE } })); } catch (e) {}
  }

  // Chỉ nhận đúng 3 chữ; chữ lạ (kho bị ghi tay sai) coi như bình thường.
  function chuanTt(s) {
    s = String(s || '');
    return (s === 'an' || s === 'khoa' || s === 'xoa') ? s : '';
  }

  // ⭐ v1.35.0 — trạng thái ĐANG CÓ HIỆU LỰC của một thẻ: '' | 'an' | 'khoa' | 'xoa'.
  function trangThaiThe(b) {
    return chuanTt(TT_THE[(b && b.id) || '']);
  }

  // Dashboard gọi sau khi ghi xong (cùng nếp `datHanSua`).
  function datTrangThai(id, tt) {
    if (!id) return;
    TT_THE[id] = chuanTt(tt);
    luuDemHan();
  }

  // ⭐ v1.35.0 — "CÒN HẠN" là MỘT hàm chung, đừng tự viết `moc == null || moc > now`
  // ở từng trang nữa (trước v1.35.0 có 6 chỗ viết tay như thế):
  //   · ẩn / xoá  → KHÔNG còn hạn (không tính là bài đang giao)
  //   · tạm khoá  → LUÔN còn hạn, kể cả mốc đã qua (thầy chốt 02/09: khoá là
  //                 DỪNG đồng hồ, không bao giờ hiện HẾT HẠN trong lúc khoá; mở
  //                 khoá thì đồng hồ chạy lại theo hạn cũ nguyên vẹn)
  //   · còn lại   → chưa đặt hạn, hoặc mốc chưa qua
  function conHan(b) {
    var tt = trangThaiThe(b);
    if (tt === 'an' || tt === 'xoa') return false;
    if (tt === 'khoa') return true;
    var moc = mocHan(b);
    return moc == null || moc > Date.now();
  }

  // Hạn ĐANG CÓ HIỆU LỰC của một thẻ: hạn sửa trước, rồi mới tới `bai.json`.
  function hanCua(b) {
    var h = HAN_SUA[(b && b.id) || ''];
    if (typeof h === 'string' && h) return h;
    return (b && b.han) || '';
  }

  // Thẻ này có đang bị đổi hạn riêng không (để dashboard đeo huy hiệu).
  function daSuaHan(b) {
    var h = HAN_SUA[(b && b.id) || ''];
    return !!(typeof h === 'string' && h);
  }

  // Dashboard gọi sau khi ghi xong, để vẽ lại ngay mà không phải nạp lại cả trang.
  function datHanSua(id, han) {
    if (!id) return;
    HAN_SUA[id] = String(han || '');
    // ⭐ v1.29.0 — SỬA HẠN LÀ PHẢI DỌN LUÔN BẢN ĐỆM 60 GIÂY (xem `napHanSua`).
    // Không dọn thì thầy vừa đặt hạn xong, bấm sang trang khác là bản đệm CŨ
    // đè ngược lại — thầy tưởng lệnh đặt hạn không ăn.
    luuDemHan();
  }

  function napJson(duong) {
    return fetch(duong + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function lopTheoMa(dl, maLop) {
    var ds = dl.lop || [];
    for (var i = 0; i < ds.length; i++) if (ds[i].maLop === maLop) return ds[i];
    return null;
  }

  // ⭐ v1.35.0 — BA CỬA lấy bài của một lớp, theo trạng thái thẻ (`trangThaiThe`):
  //   (không truyền)  cửa HỌC SINH: bỏ thẻ ẨN + thẻ ĐÃ XOÁ. Đây là cửa mặc định —
  //                   lop/bai/bai-sp và cả "xem như học sinh" của dashboard đều
  //                   qua đây, nên mở thẳng địa chỉ bài đã ẩn/xoá cũng bị đẩy về lớp.
  //   'ql'            cửa QUẢN LÝ (dashboard): chỉ bỏ thẻ ĐÃ XOÁ, thẻ ẩn vẫn hiện (mờ)
  //                   để thầy bấm "Hiện lại".
  //   'kho'           chỉ thẻ ĐÃ XOÁ — mục KHO trên dashboard, để Khôi phục.
  // Thẻ TẠM KHOÁ có mặt ở mọi cửa (khoá là "hiện thẻ, không cho mở", xem lop.html).
  function baiCuaLop(dl, maLop, che) {
    var ds = (dl.bai && dl.bai[maLop]) ? dl.bai[maLop] : [];
    return ds.filter(function (b) {
      var tt = trangThaiThe(b);
      if (che === 'kho') return tt === 'xoa';
      if (che === 'ql') return tt !== 'xoa';
      return tt !== 'xoa' && tt !== 'an';
    });
  }

  // Tìm em theo mã trên TOÀN BỘ các lớp — mã là duy nhất toàn trung tâm (myStudent
  // có chặn trùng), nên chỉ cần mã là biết ngay em nào, lớp nào.
  function timTheoMa(dl, maGo) {
    var ma = chuanMa(maGo);
    if (!ma) return null;
    for (var i = 0; i < (dl.lop || []).length; i++) {
      var l = dl.lop[i];
      var ds = l.hocSinh || [];
      for (var j = 0; j < ds.length; j++) {
        if (ds[j].ma && chuanMa(ds[j].ma) === ma) {
          return { lop: l, em: ds[j] };
        }
      }
    }
    return null;
  }

  // ---------- em đang đăng nhập ----------

  function docNho() {
    try { return JSON.parse(localStorage.getItem(KHOA_EM) || 'null'); }
    catch (e) { return null; }
  }

  function luuEm(em) {
    try { localStorage.setItem(KHOA_EM, JSON.stringify(em)); } catch (e) {}
  }

  function thoat() {
    try { localStorage.removeItem(KHOA_EM); } catch (e) {}
  }

  // Trả về { lop, ten, ma, nickname } của em đang mở trang, hoặc null.
  //
  // ⭐ `?nhu=<mã>` — XEM NHƯ MỘT EM. App myLesson trên máy thầy dùng đường này
  // để xem nhanh đúng trang học sinh đang thấy (Đợt 3). KHÔNG ghi vào máy: đóng
  // tab là hết, không đá em nào ra khỏi phiên đăng nhập của chính em.
  // Việc đăng nhập ở đây vốn KHÔNG nhằm bảo mật (mọi mã đều nằm trong lop.json
  // công khai), nên đường này không mở thêm cửa nào cả.
  // ⭐ `?gv=1&lop=<maLop>` — XEM NHƯ CHÍNH THẦY (không phải một em). Dashboard
  // dùng đường này khi thầy mở trang lớp từ trang quản lý — danh tính/avatar/
  // chat hiện ra là "Thầy Andrew", không mượn tên em nào cả. Cũng KHÔNG ghi
  // vào máy, giống hệt `?nhu=`.
  function emDangHoc(dl) {
    var q = new URLSearchParams(location.search);
    if (q.get('gv')) {
      var lgv = lopTheoMa(dl, q.get('lop') || '');
      if (lgv) return { lop: lgv.maLop, ten: 'Thầy Andrew', ma: 'GV', vaiTro: 'gv', xemNhu: true };
    }
    var nhu = q.get('nhu');
    if (nhu) {
      var t = timTheoMa(dl, nhu);
      if (t) return { lop: t.lop.maLop, ten: t.em.ten, ma: chuanMa(t.em.ma), xemNhu: true };
    }
    var cu = docNho();
    if (!cu || !cu.ma) return null;
    // Tra lại mã trong danh sách MỚI — thầy đổi/xoá mã thì phiên cũ hết hiệu lực.
    var thay = timTheoMa(dl, cu.ma);
    if (!thay) return null;
    return { lop: thay.lop.maLop, ten: thay.em.ten, ma: chuanMa(thay.em.ma) };
  }

  // Trang nào cũng gọi hàm này đầu tiên: chưa đăng nhập thì về màn đăng nhập.
  function batBuocDangNhap(dl) {
    var em = emDangHoc(dl);
    if (!em) { location.replace('index.html'); return null; }
    return em;
  }

  // Chuỗi query (KHÔNG có dấu & hay ? ở đầu) để GIỮ NGUYÊN chế độ xem khi
  // chuyển trang: thầy xem như một em (`nhu=`) hoặc thầy xem thẳng bằng danh
  // tính của mình (`gv=1&lop=`). Dùng CHUNG ở lop.html/bai.html/bai-sp.html —
  // đừng viết riêng từng nơi, dễ quên cập nhật một chỗ (bài học cũ của app này).
  function giuXemNhuQuery(em, maHs, maLop) {
    if (!em || !em.xemNhu) return '';
    if (em.vaiTro === 'gv') return 'gv=1&lop=' + encodeURIComponent(maLop || '');
    return 'nhu=' + encodeURIComponent(maHs || '');
  }

  // ---------- mã quản lý ----------

  // So mã thầy gõ với chuỗi BĂM trong config.js. Băm một chiều: đọc được file
  // cũng không suy ngược ra mã. ⚠️ Đây KHÔNG phải bảo mật thật (trang tĩnh thì
  // mọi thứ đều nằm ở máy người xem) — chỉ để người tình cờ mở file không thấy
  // ngay mã của thầy.
  function bam(chuoi) {
    var b = new TextEncoder().encode(chuanMa(chuoi));
    return crypto.subtle.digest('SHA-256', b).then(function (buf) {
      var m = Array.prototype.map.call(new Uint8Array(buf), function (x) {
        return ('0' + x.toString(16)).slice(-2);
      });
      return m.join('');
    });
  }

  // Nhớ "máy này đã gõ đúng mã quản lý" — để lần sau vào thẳng dashboard, và để
  // tab CLASSES bên app myLesson mở ra là dùng được ngay.
  // ⛔ CHỈ nhớ một CỜ, KHÔNG nhớ mã: mã không bao giờ được nằm lại trong máy.
  var KHOA_QL = 'mylesson_ql';

  function laAdmin() {
    try { return localStorage.getItem(KHOA_QL) === '1'; } catch (e) { return false; }
  }
  function datAdmin() {
    try { localStorage.setItem(KHOA_QL, '1'); } catch (e) {}
  }
  function thoatAdmin() {
    try { localStorage.removeItem(KHOA_QL); } catch (e) {}
  }

  function laMaQuanLy(maGo) {
    var dich = String(CFG.QUAN_LY_BAM || '').toLowerCase();
    if (!dich) return Promise.resolve(false);
    // crypto.subtle chỉ có ở https hoặc localhost. Thiếu thì coi như không khớp
    // (thầy vẫn vào dashboard được từ app myLesson).
    if (!(window.crypto && crypto.subtle)) return Promise.resolve(false);
    return bam(maGo).then(function (h) { return h === dich; });
  }

  // ---------- điểm bên AWord (Firestore, chỉ đọc) ----------
  //
  // Đọc thẳng qua đường REST công khai — luật Firestore bên AWord cho phép ai
  // cũng đọc `assignments/{mã}/scores`. Không cần SDK, không cần đăng nhập.
  //
  // ⛔ CHỈ đọc khi mở trang + khi bấm làm mới, KHÔNG tự nạp lại theo nhịp:
  // Firebase của AWord là gói miễn phí, có hạn mức đọc mỗi ngày.
  // Nhớ trong RAM + sessionStorage 60 giây để đi qua đi lại giữa trang lớp và
  // trang bài không đọc lại từ đầu.

  var nhoDiem = {};
  var CACHE_GIAY = 60;

  function urlDiem(ma, token) {
    var db = CFG.AWORD_DB || {};
    var u = 'https://firestore.googleapis.com/v1/projects/' + db.projectId +
            '/databases/(default)/documents/assignments/' + encodeURIComponent(ma) +
            '/scores?pageSize=300&key=' + db.apiKey;
    if (token) u += '&pageToken=' + encodeURIComponent(token);
    return u;
  }

  function soF(f) {
    if (!f) return 0;
    return Number(f.integerValue != null ? f.integerValue : (f.doubleValue || 0));
  }

  function docPhien(ma) {
    try {
      var o = JSON.parse(sessionStorage.getItem('awc_diem_' + ma) || 'null');
      if (o && (Date.now() - o.luc) < CACHE_GIAY * 1000) return o.ds;
    } catch (e) {}
    return null;
  }

  function ghiPhien(ma, ds) {
    try {
      sessionStorage.setItem('awc_diem_' + ma, JSON.stringify({ luc: Date.now(), ds: ds }));
    } catch (e) {}
  }

  // Trả về danh sách đã GỘP: mỗi em một dòng, lấy lượt TỐT NHẤT.
  //   [{ ten, diem (0-100), giay, tho: {diem, tong} }]
  // Ba luật gộp chép y hệt core/assignments.js bên AWord — đổi bên đó phải đổi
  // cả đây: gộp theo tên thường-hoá · mỗi em lấy lượt tốt nhất · điểm cao trước,
  // hoà thì ai nhanh hơn đứng trên.
  function diemCuaAct(ma, epDocLai) {
    ma = String(ma || '').trim();
    if (!ma) return Promise.resolve([]);
    if (epDocLai) { delete nhoDiem[ma]; try { sessionStorage.removeItem('awc_diem_' + ma); } catch (e) {} }
    if (nhoDiem[ma]) return nhoDiem[ma];

    var sanCo = epDocLai ? null : docPhien(ma);
    if (sanCo) { nhoDiem[ma] = Promise.resolve(sanCo); return nhoDiem[ma]; }

    nhoDiem[ma] = new Promise(function (xong, hong) {
      var tatCa = [];
      (function trang(token, lan) {
        fetch(urlDiem(ma, token))
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function (d) {
            (d.documents || []).forEach(function (doc) {
              var f = doc.fields || {};
              tatCa.push({
                ten: (f.name && f.name.stringValue) || '?',
                diem: soF(f.score), tong: soF(f.total), ms: soF(f.timeMs),
                // `createdAt` = lúc nộp (mốc mili giây, AWord ghi bằng Date.now()).
                // Dùng làm "nộp lúc" trong bảng cả lớp; thiếu thì coi như 0.
                luc: soF(f.createdAt),
              });
            });
            // Mỗi trang 300 lượt; quá 3 trang thì dừng — một bài giao của một
            // lớp không thể tới 900 lượt, đây chỉ là phanh an toàn.
            if (d.nextPageToken && lan < 3) trang(d.nextPageToken, lan + 1);
            else xong(tatCa);
          })
          .catch(hong);
      })(null, 1);
    }).then(function (tho) {
      var ds = gopTotNhat(tho);
      ghiPhien(ma, ds);
      return ds;
    });

    // Đọc hỏng thì quên đi, để lần "làm mới" sau còn thử lại được.
    nhoDiem[ma]['catch'](function () { delete nhoDiem[ma]; });
    return nhoDiem[ma];
  }

  function gopTotNhat(ds) {
    var theo = {};
    ds.forEach(function (r) {
      var k = khoaTen(r.ten);
      if (!k) return;
      var pt = r.tong > 0 ? Math.round(r.diem / r.tong * 100) : 0;
      var cu = theo[k];
      if (!cu) {
        theo[k] = { ten: r.ten, diem: pt, giay: Math.round((r.ms || 0) / 1000),
                    luc: r.luc || 0, cacTen: [r.ten],
                    tho: { diem: r.diem, tong: r.tong } };
        return;
      }
      cu.cacTen.push(r.ten);
      var g = Math.round((r.ms || 0) / 1000);
      // Lượt NỘP ĐẦU TIÊN mới là mốc "em ấy nộp lúc mấy giờ" — em làm lại lần
      // hai để lên điểm thì không vì thế mà thành người nộp muộn.
      if (r.luc && (!cu.luc || r.luc < cu.luc)) cu.luc = r.luc;
      if (pt > cu.diem || (pt === cu.diem && g < cu.giay)) {
        cu.diem = pt; cu.giay = g; cu.tho = { diem: r.diem, tong: r.tong };
      }
    });
    var ra = [];
    for (var k in theo) { theo[k].ten = tenDepNhat(theo[k].cacTen); ra.push(theo[k]); }
    ra.sort(function (a, b) {
      if (b.diem !== a.diem) return b.diem - a.diem;
      return a.giay - b.giay;
    });
    return ra;
  }

  // ---------- ⭐⭐ CHUẨN "ĐÃ XONG BÀI" = ĐỦ ĐIỂM TỐI ĐA (web v1.14.0) ----------
  //
  // Thầy chốt 24/08/2026: em nộp bài mà CHƯA đạt điểm tối đa thì thanh tiến
  // trình trên thẻ lớp KHÔNG tính (13 em, 1 em 99/100 điểm ⇒ vẫn 0/13).
  //
  // ⛔⛔ "ĐIỂM TỐI ĐA" KHÔNG PHẢI LÚC NÀO CŨNG LÀ 100%. Kho điểm AWord chỉ có
  // `score` + `total`, mà hai con số đó mang ý nghĩa khác nhau tuỳ template —
  // đo thật trên bài B2-B ngày 24/08:
  //
  //   · ANAGRAM chế độ "bonus"/"bonusMinus" (MẶC ĐỊNH của template) chấm theo
  //     CHỮ CÁI: `total` = tổng số chữ cái của cả bài (bài thật: 636), còn mỗi
  //     từ giải ĐÚNG NGAY được ăn `số chữ × 2`. Chơi hoàn hảo ⇒ score = 2×total
  //     = **200%**, chơi xong mà từ nào cũng sai một nhát ⇒ đúng 100%. Lấy
  //     mốc 100% ở đây là gắn huy chương cho em làm sai khắp bài.
  //     ("bonusMinus" đổi được hệ số nhân: `bonusMult`, mặc định 2, tối đa 20.)
  //   · GAMESHOW chấm theo TỐC ĐỘ — không có mốc nào để so.
  //   · Bật BẤT KỲ tuỳ chọn trừ điểm nào (`pointsOff` · `minusAmount` ·
  //     `letterPenalty` · `timeCost`) thì `score` là số ĐÃ TRỪ, có thể âm.
  //     Chép đúng danh sách khoá của `scoreIsPenalised()` bên AWord
  //     (core/assignment-ui.js) — bên đó đổi thì đổi cả đây.
  //
  // ⇒ Hai trường hợp sau rơi về luật CŨ "nộp là xong" (`tru: true`), vì bắt
  // một mốc trên con số vô nghĩa còn tệ hơn không bắt.
  //
  // Đọc `assignments/{mã}` qua REST công khai, CHỈ 2 trường (mask) nên gói tin
  // vài trăm byte. ⚠️ Vẫn tốn 1 LƯỢT ĐỌC Firestore cho mỗi act, nên nhớ VĨNH
  // VIỄN trong localStorage: tuỳ chọn của bài giao là bản chụp ĐÓNG BĂNG lúc
  // tạo, không bao giờ đổi ⇒ mỗi máy chỉ đọc đúng một lần cho mỗi act.

  var KHOA_CHUAN = 'awc_chuan_';
  var nhoChuan = {};
  var TRU_KHOA = ['pointsOff', 'minusAmount', 'letterPenalty', 'timeCost'];
  var CHUAN_LUI = { tru: true, dinh: 100 };     // đọc hỏng -> giữ nếp cũ, không phạt em nào

  function urlBaiGiao(ma) {
    var db = CFG.AWORD_DB || {};
    return 'https://firestore.googleapis.com/v1/projects/' + db.projectId +
      '/databases/(default)/documents/assignments/' + encodeURIComponent(ma) +
      '?key=' + db.apiKey +
      '&mask.fieldPaths=activityType&mask.fieldPaths=activity.options';
  }

  function ruotMap(f) { return (f && f.mapValue && f.mapValue.fields) || {}; }
  function chuF(f) { return (f && f.stringValue) || ''; }

  function chuanTuDoc(f) {
    var loai = chuF(f.activityType);
    var opt = ruotMap(ruotMap(f.activity).options);
    var tru = (loai === 'gameshow');
    for (var i = 0; i < TRU_KHOA.length && !tru; i++) {
      if (soF(opt[TRU_KHOA[i]]) > 0) tru = true;
    }
    var dinh = 100;
    if (!tru && loai === 'anagram') {
      var che = chuF(opt.anagramMode) || 'bonus';       // mặc định của template
      if (che === 'bonus') dinh = 200;                  // hệ số nhân cố định x2
      else if (che === 'bonusMinus') {
        // clampBonusMult() bên AWord: số nguyên 1..20, sai/thiếu thì về 2.
        var n = Math.round(soF(opt.bonusMult));
        dinh = 100 * (n >= 1 ? Math.min(20, n) : 2);
      }
      // "submit" = 1 điểm/từ ⇒ giữ 100.
    }
    return { tru: tru, dinh: dinh };
  }

  // Trả về { tru, dinh } của một act. Không bao giờ reject.
  function chuanDiem(ma) {
    ma = String(ma || '').trim();
    if (!ma) return Promise.resolve(CHUAN_LUI);
    if (nhoChuan[ma]) return nhoChuan[ma];
    try {
      var cu = JSON.parse(localStorage.getItem(KHOA_CHUAN + ma) || 'null');
      if (cu && typeof cu.dinh === 'number') {
        nhoChuan[ma] = Promise.resolve(cu);
        return nhoChuan[ma];
      }
    } catch (e) {}

    nhoChuan[ma] = fetch(urlBaiGiao(ma))
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        var c = chuanTuDoc(d.fields || {});
        try { localStorage.setItem(KHOA_CHUAN + ma, JSON.stringify(c)); } catch (e) {}
        return c;
      })
      .catch(function () {
        delete nhoChuan[ma];            // quên đi để lần mở trang sau còn thử lại
        return CHUAN_LUI;
      });
    return nhoChuan[ma];
  }

  // Em tên `ten` đã XONG act đó chưa (dsDiem là kết quả `diemCuaAct`, mỗi em
  // đúng một dòng — lượt TỐT NHẤT). `chuan` thiếu thì lùi về "nộp là xong".
  // ⇒ ĐỔI ĐỊNH NGHĨA "XONG" THÌ SỬA ĐÚNG HÀM NÀY: trang lớp, trang bài và
  // dashboard đều gọi vào đây.
  function xongAct(dsDiem, ten, chuan) {
    var k = khoaTen(ten);
    for (var i = 0; i < (dsDiem || []).length; i++) {
      if (khoaTen(dsDiem[i].ten) !== k) continue;
      if (!chuan || chuan.tru) return true;
      return dsDiem[i].diem >= chuan.dinh;
    }
    return false;
  }

  function tenDepNhat(cac) {
    return cac.slice().sort(function (a, b) {
      var hoaA = (a.match(/[A-ZÀ-Ỹ]/g) || []).length;
      var hoaB = (b.match(/[A-ZÀ-Ỹ]/g) || []).length;
      if (hoaA !== hoaB) return hoaB - hoaA;
      return b.length - a.length;
    })[0] || '';
  }

  // ---------- một bài trong bai.json -> thẻ trên trang lớp ----------

  // Các khối AWORD (loại `act`) của một bài — chính là các ô điểm trên thẻ.
  function actCuaBai(b) {
    return (b.khoi || []).filter(function (k) { return k.loai === 'act' && k.ma; });
  }

  // Mã lesson để in trên thẻ. App sinh tiêu đề theo khuôn cũ của thầy:
  //   "B2B_21.8_DICTS LSFLY-S1.T3.P1-2-3"  =  LỚP_NGÀY_DẠNG + mã lesson
  // ⇒ phần sau dấu cách đầu tiên chính là mã lesson.
  // (Từ Đợt 2 app sẽ đẩy thẳng trường `maLesson`, có thì lấy luôn.)
  function maLesson(b) {
    if (b.maLesson) return b.maLesson;
    var t = String(b.tieuDe || b.tenHien || '');
    // ⛔ ĐỪNG cắt ở dấu cách ĐẦU TIÊN: có dạng bài tên HAI CHỮ ("SP SLIDE",
    // "SP CHECK") nên tiêu đề thành "B2B_26.8_SP SLIDE DS-S2.I1.W1" — cắt kiểu
    // đó ra "SLIDE DS-S2.I1.W1", sai. Cắt theo đúng CHỮ DẠNG rồi lấy phần sau.
    var d = String(b.dang || '').trim();
    if (d) {
      var i = t.toUpperCase().indexOf(d.toUpperCase());
      if (i >= 0) return t.slice(i + d.length).trim();
    }
    var j = t.indexOf(' ');
    return j > 0 ? t.slice(j + 1).trim() : '';
  }

  // ---------- TÊN DẠNG BÀI HỌC SINH NHÌN THẤY (⭐ v1.14.0, thầy chốt 24/08/2026) ----------
  //
  // `b.dang` là MÃ NỘI BỘ thầy gõ ở ô Loại bên app myLesson (WORDS · DICTS ·
  // RD · SP SLIDE · SP CHECK). Học sinh thì đọc tên KỸ NĂNG. Bảng dưới là chỗ
  // DUY NHẤT đổi chữ — thẻ trang lớp, tiêu đề trang bài, tab trình duyệt và
  // dashboard đều đi qua `tenBai()`.
  //
  // ⛔ CHỈ ĐỔI CHỮ HIỆN RA, KHÔNG đổi `b.dang` trong dữ liệu: `trangCuaBai()`
  // và `maLesson()` ngay dưới đây đều tra theo mã cũ, app myLesson cũng sinh
  // `id`/`tieuDe` từ đúng mã đó. Đổi trong bai.json là mọi bài cũ mất đường về.
  var TEN_DANG = {
    'WORDS': 'VOCABULARY',
    'DICTS': 'LISTENING SKILL',
    'RD': 'READING SKILL',
    'READING': 'READING SKILL',
    'SP': 'SPEAKING SKILL',
    'SP SLIDE': 'SPEAKING SKILL',
    'SP CHECK': 'SPEAKING CHECK'
  };
  function tenDang(d) {
    var k = String(d || '').trim().toUpperCase().replace(/\s+/g, ' ');
    return TEN_DANG[k] || k;
  }

  // Thầy đã gõ tên riêng cho bài chưa (ô "tên bài" trên thanh bản nháp của app)?
  // ⛔ Dashboard dùng hàm này để in "(chưa đặt tên)". TRƯỚC v1.14.0 nó so
  // `tenBai(b) === b.dang`; nay `tenBai()` trả tên KỸ NĂNG nên phép so đó luôn
  // sai ⇒ bài chưa đặt tên sẽ hiện "VOCABULARY" y như tên thầy tự gõ.
  function coTenRieng(b) {
    return !!String((b && b.tenBai) || '').trim();
  }

  // Tên thẻ học sinh nhìn thấy: thầy gõ gì thì lấy nấy, chưa gõ thì lấy tên
  // KỸ NĂNG suy từ dạng bài.
  function tenBai(b) {
    if (coTenRieng(b)) return b.tenBai;
    return tenDang(b && b.dang) || 'BÀI TẬP';
  }

  // Nhãn ngắn của MỘT ô bài trên thanh tiến trình của thẻ lớp (thầy chốt
  // 24/08/2026): "WORD PRACTICE 1" -> "WORDS 1", "PRONUNCIATION" giữ nguyên.
  //
  // ⛔ CHỈ đổi chỗ HIỆN RA. Tên thật của ngăn vẫn là "WORD PRACTICE 1": app
  // myLesson SUY NGƯỢC loại ô ra từ chính chuỗi đó (`tdLoaiCua()`) để đánh số
  // lại mỗi lần vẽ, và tên bài giao bên AWord cũng rút gọn từ nó. Đổi trong dữ
  // liệu là hỏng cả hai chỗ.
  //
  // ⭐ v1.15.0 — THÊM cờ `ngan`: rút gọn thêm "PRONUNCIATION" -> "PRONUNC"
  // (thầy chốt 25/08/2026). CHỈ trang lớp (`lop.html`) bật cờ này — chữ đó dài
  // gấp rưỡi "WORDS 1" nên cột tên của thanh tiến trình phải nới rộng theo, ăn
  // mất chỗ của chính thanh. Trang bài tập rộng rãi hơn ⇒ GIỮ NGUYÊN chữ đầy
  // đủ (thầy chốt: "trong trang bài tập lớp thì không cần rút ngắn như vậy").
  // ⛔ Đừng rút gọn thẳng trong nhánh không cờ: cả 3 trang gọi chung hàm này.
  function tenO(t, ngan) {
    var s = String(t == null ? '' : t).trim();
    var m = /^WORD\s+PRACTICE\s*(\d*)$/i.exec(s);
    if (m) return 'WORDS' + (m[1] ? ' ' + m[1] : '');
    if (ngan && /^PRONUNCIATION$/i.test(s)) return 'PRONUNC';
    return s;
  }

  // Hạn nộp, trả về mốc thời gian (ms) hoặc null.
  //  · Đợt 2 trở đi: `b.han` = "YYYY-MM-DDTHH:mm" (thầy gõ giờ thật).
  //  · Đợt 1: chưa có giờ ⇒ lấy NGÀY BUỔI HỌC (`b.ngay` = "9.6") + năm suy từ
  //    `taoLuc`, tính tới CUỐI NGÀY hôm đó. Không có gì để suy thì trả null và
  //    ô hạn hiện "Chưa đặt hạn" — thà để trống còn hơn bịa một giờ.
  function mocHan(b) {
    // ⭐ v1.20.0 — qua `hanCua()`: hạn sửa ở dashboard đứng trước `b.han` của
    // `bai.json`. Chưa sửa thì `hanCua()` chính là `b.han` — y hệt lối cũ.
    var hh = hanCua(b);
    if (hh) {
      var t = Date.parse(hh);
      if (!isNaN(t)) return t;
    }
    var m = /^(\d{1,2})\.(\d{1,2})$/.exec(String(b.ngay || '').trim());
    if (!m) return null;
    var nam = (String(b.taoLuc || '').match(/^(\d{4})/) || [])[1];
    if (!nam) nam = String(new Date().getFullYear());
    var d = new Date(Number(nam), Number(m[2]) - 1, Number(m[1]), 23, 59, 59);
    return isNaN(d.getTime()) ? null : d.getTime();
  }

  // Chữ trên ô hạn: có giờ thì "17:30 · 19/8", chỉ có ngày thì "19/8".
  function chuHan(b) {
    var t = mocHan(b);
    if (t == null) return '';
    var d = new Date(t);
    var ngay = d.getDate() + '/' + (d.getMonth() + 1);
    if (!hanCua(b)) return ngay;                   // Đợt 1: chỉ có ngày
    var hai = function (n) { return (n < 10 ? '0' : '') + n; };
    return hai(d.getHours()) + ':' + hai(d.getMinutes()) + ' · ' + ngay;
  }

  // Dạng bài -> trang nào mở ra khi bấm vào thẻ.
  function trangCuaBai(b) {
    var d = String(b.dang || '').toUpperCase();
    if (d.indexOf('SP CHECK') >= 0) return '';     // thẻ speaking check: đi đường riêng
    if (d.indexOf('SP') === 0 || d.indexOf('SLIDE') >= 0) return 'bai-sp.html';
    return 'bai.html';
  }

  /* ============================================================
     ⭐ v1.37.0 (02/09/2026) — AVATAR DÙNG CHUNG CHO MỌI CHỖ

     Ảnh đại diện của em CHỈ CÓ MỘT NGUỒN: `assets/avatar/<lớp>/<tên>.jpg`
     — thầy đổi ở dashboard → Thiết lập lớp (nút ✎), app nén 96px rồi đẩy
     lên kho web. Khung chat đã dùng đường này từ lâu; từ v1.37.0 thanh đầu
     và đầu sidebar của cả 3 trang học sinh cũng dùng ĐÚNG đường này ⇒ đổi
     một chỗ là mọi chỗ đổi theo.

     ⛔ Luật slug PHẢI Y HỆT 4 nơi kia, sai một ký tự là ảnh 404 câm lặng:
        `app/tools/xuat-avatar.py` · `app/src/main/lib/avatar.js` ·
        khối avatar trong `dashboard.html` · `avatarUrl()` bên mySpeaking web.
        Bỏ dấu · LỚP bỏ mọi ký tự không phải chữ-số ("B2-B" → "b2b") ·
        TÊN thay ký tự lạ bằng "-" ("DUY MINH" → "duy-minh").

     ⏳ Đổi ảnh xong máy em có thể còn thấy ảnh CŨ tối đa ~10 phút (GitHub
        Pages cho trình duyệt nhớ ảnh 600 giây). Muốn "đổi là thấy ngay"
        thì phải ghi thêm mốc thời gian bên app — để đợt sau.
     ============================================================ */
  function avKhongDau(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  function avSlugLop(s) { return avKhongDau(s).replace(/[^a-z0-9]/g, '') || 'lop'; }
  function avSlugTen(s) {
    return avKhongDau(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'hs';
  }
  // `lop` ở đây là TÊN GỐC có gạch ("B2-B"), không phải mã đã bỏ gạch.
  function avUrl(lop, ten) {
    return 'assets/avatar/' + avSlugLop(lop) + '/' + avSlugTen(ten) + '.jpg';
  }

  // Gắn ẢNH + CHỮ TẮT vào một ô avatar ĐÃ CÓ SẴN thẻ con (huy hiệu số sao,
  // chấm đỏ tin mới). ⛔ Đừng dùng `el.textContent = …` cho mấy ô này: nó
  // xoá sạch thẻ con — đúng cái bẫy làm mất huy hiệu sao ở bản nháp đầu.
  // Chưa có ảnh cho em nào thì thẻ <img> tự gỡ mình ⇒ hiện chữ tắt như cũ.
  function gaAvatar(el, lop, ten, chuTat) {
    if (!el) return;
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) el.removeChild(n);
    });
    var img = el.querySelector('img.av-anh');
    if (!img) {
      img = document.createElement('img');
      img.className = 'av-anh';
      img.alt = '';
      img.onerror = function () { if (img.parentNode) img.parentNode.removeChild(img); };
      // Chèn LÊN ĐẦU: mọi thẻ con khác (huy hiệu sao, chấm đỏ) vẽ sau ⇒ nằm
      // trên ảnh. Ảnh chèn cuối là nó đè mất huy hiệu.
      el.insertBefore(img, el.firstChild);
    }
    var url = avUrl(lop, ten);
    if (img.getAttribute('src') !== url) img.setAttribute('src', url);
    if (chuTat) el.insertBefore(document.createTextNode(chuTat), el.firstChild);
  }

  /* ============================================================
     ⭐ v1.37.0 — CHẤM ĐỎ "LỚP CÓ TIN NHẮN MỚI" trên avatar

     Thầy chốt 02/09/2026: chấm đỏ hiện ở MỌI avatar của em (thanh đầu +
     đầu sidebar) trên cả 3 trang, và CHỈ TẮT khi em bấm vào khung chat.

     💸 Tiền: `lop.html` đã mở sẵn kênh chat sống ⇒ biết tin mới nhất MIỄN
     PHÍ, chỉ việc gọi `datMocTinMoi()`. Hai trang bài phải hỏi kho 1 lượt
     đọc — nên có ĐỆM 60 GIÂY trong sessionStorage. ⛔ CHỈ đệm khi đọc được
     THẬT (đệm cả lượt hỏng là giấu chấm đỏ suốt 60 giây — cùng họ bẫy đã
     cắn ở `napHanSua()`).
     ============================================================ */
  var TIN_DEM_MS = 60000;
  function khoaXemTin(lop, ma) { return 'mylesson_xemtin_' + lop + '_' + ma; }
  function khoaTinMoi(lop) { return 'awc_tinmoi_' + lop; }

  // Mốc em đã xem tin tới đâu — nhớ ngay trên máy em. Có kèm MÃ EM vì một
  // máy ở nhà có thể hai anh em cùng học, đừng để em này tắt chấm hộ em kia.
  function mocDaXem(lop, ma) {
    try { return Number(localStorage.getItem(khoaXemTin(lop, ma))) || 0; } catch (e) { return 0; }
  }
  // ⛔ LUẬT 10 — đừng đánh dấu bằng `Date.now()` trần: đồng hồ máy em chạy
  // chậm vài phút là mốc "đã xem" thấp hơn tin vừa đọc ⇒ chấm đỏ không chịu
  // tắt. Luôn truyền vào MỐC CỦA TIN cuối cùng em đã thấy.
  function danhDauDaXem(lop, ma, luc) {
    var m = Number(luc) || Date.now();
    try { localStorage.setItem(khoaXemTin(lop, ma), String(m)); } catch (e) {}
  }

  function datMocTinMoi(lop, luc) {
    try {
      sessionStorage.setItem(khoaTinMoi(lop),
        JSON.stringify({ luc: Number(luc) || 0, tai: Date.now() }));
    } catch (e) {}
  }
  function mocTinMoi(lop) {
    var nay = Date.now();
    try {
      var o = JSON.parse(sessionStorage.getItem(khoaTinMoi(lop)) || 'null');
      if (o && (nay - Number(o.tai)) < TIN_DEM_MS) return Promise.resolve(Number(o.luc) || 0);
    } catch (e) {}
    if (!window.AWChat || !AWChat.tinMoiNhat) return Promise.resolve(0);
    return AWChat.tinMoiNhat(lop).then(function (luc) {
      datMocTinMoi(lop, luc);                 // chỉ đệm khi ĐỌC ĐƯỢC THẬT
      return Number(luc) || 0;
    })['catch'](function () { return 0; });   // kho hỏng/hết hạn mức: im lặng, không đệm
  }
  function chatChuaDoc(lop, ma) {
    return mocTinMoi(lop).then(function (luc) { return !!luc && luc > mocDaXem(lop, ma); });
  }

  // Bật/tắt chấm đỏ trên mọi avatar của em trong trang (thanh đầu + sidebar).
  function veChamDo(hien) {
    var ds = document.querySelectorAll('.av.me, .side-head .av');
    Array.prototype.forEach.call(ds, function (el) {
      var c = el.querySelector('.av-cham');
      if (!c) {
        c = document.createElement('span');
        c.className = 'av-cham';
        c.setAttribute('title', 'Lớp có tin nhắn mới');
        el.appendChild(c);
      }
      c.hidden = !hien;
    });
  }

  // ============================================================
  // ⭐⭐ v1.48.0 (02/09/2026) — THẺ "KHÔNG GIAO BÀI" (thầy chốt)
  //
  // Thầy bấm icon cây bút trên dashboard → ghi MỘT tài liệu vào kho `lessonNghi`
  // (id = mã lớp, ghi đè lần trước). Cả dashboard lẫn trang lớp đọc kho đó và
  // dựng một thẻ ĐẶC BIỆT: chữ căn giữa, dưới là đồng hồ đếm tới GIỜ VÀO HỌC
  // buổi kế tiếp; hết giờ = hết hạn (trang lớp đẩy nó xuống nhóm bài cũ).
  //
  // ⛔ `han` chốt CỨNG lúc bấm, không tính lại mỗi lần mở trang. Nhờ vậy trang
  // lớp KHÔNG cần đọc kho lịch học `mystudentRosterClasses` — chỉ pop-up bên
  // dashboard mới đọc (tiết kiệm lượt đọc Firestore, luật 8️⃣ BAN GIAO.md).
  // ⛔ Chuỗi `han` RỖNG = "đã gỡ thẻ nghỉ" — luật kho cấm xoá tài liệu, đúng
  // nếp `lessonHan`.
  // ============================================================
  var NGHI = {};                       // { '<mã lớp>': '<han>' }
  var KHOA_NGHI = 'awc_nghi1';
  var NGHI_CACHE_GIAY = 60;            // cùng nhịp với HAN_CACHE_GIAY

  function docNghiPhien() {
    try {
      var o = JSON.parse(sessionStorage.getItem(KHOA_NGHI) || 'null');
      if (o && (Date.now() - o.luc) < NGHI_CACHE_GIAY * 1000) return o.bang;
    } catch (e) {}
    return null;
  }

  // ⛔ CẢ THÂN HÀM TRONG try + tự nuốt lỗi, y hệt `napHanSua()`: chưa dán luật
  // Firestore hay mất mạng thì mọi trang phải chạy đúng như trước v1.48.0.
  function napNghi() {
    try {
      var db = CFG.AWORD_DB || {};
      if (!db.projectId || !db.apiKey) return Promise.resolve({});
      var san = docNghiPhien();
      if (san) return Promise.resolve(san);
      var u = 'https://firestore.googleapis.com/v1/projects/' + db.projectId
            + '/databases/(default)/documents/lessonNghi?pageSize=100&key='
            + encodeURIComponent(db.apiKey);
      return fetch(u, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          var ra = {};
          var ds = (j && j.documents) || [];
          for (var i = 0; i < ds.length; i++) {
            var f = ds[i].fields || {};
            var lop = f.lop && f.lop.stringValue;
            if (!lop) continue;
            ra[lop] = String((f.han && f.han.stringValue) || '');
          }
          if (j) { try { sessionStorage.setItem(KHOA_NGHI,
            JSON.stringify({ luc: Date.now(), bang: ra })); } catch (e) {} }
          return ra;
        })['catch'](function () { return {}; });
    } catch (e) { return Promise.resolve({}); }
  }

  // Mốc hết hạn của thẻ nghỉ một lớp (ms), hoặc null nếu lớp không có thẻ nghỉ.
  function nghiCua(maLop) {
    var h = NGHI[String(maLop || '')];
    if (!h) return null;
    var t = Date.parse(h);
    return isNaN(t) ? null : t;
  }
  // Đặt tại chỗ sau khi ghi Firestore xong, khỏi phải chờ hết 60 giây đệm.
  function datNghi(maLop, han) {
    NGHI[String(maLop || '')] = String(han || '');
    try { sessionStorage.setItem(KHOA_NGHI,
      JSON.stringify({ luc: Date.now(), bang: NGHI })); } catch (e) {}
  }

  // ---------- LỊCH HỌC (kho myStudent, CHỈ ĐỌC) ----------
  // ⛔ CHỈ dashboard gọi, và chỉ khi thầy MỞ pop-up giao nghỉ — kho này tính một
  // lượt đọc cho mỗi tài liệu. Đệm 5 phút (lịch học hiếm khi đổi).
  // ⛔ Kho anh em `mystudentRosterStudents` chứa mã đăng nhập + ngày sinh ĐỦ NĂM
  // của 156 em — TUYỆT ĐỐI không mở luật cho kho đó. Xem BAN GIAO.md mục 0🔒.
  var KHOA_LICH = 'awc_lichhoc1';
  var LICH_CACHE_GIAY = 300;

  function napLopHoc() {
    try {
      var db = CFG.AWORD_DB || {};
      if (!db.projectId || !db.apiKey) return Promise.resolve(null);
      try {
        var o = JSON.parse(sessionStorage.getItem(KHOA_LICH) || 'null');
        if (o && (Date.now() - o.luc) < LICH_CACHE_GIAY * 1000) return Promise.resolve(o.bang);
      } catch (e) {}
      var u = 'https://firestore.googleapis.com/v1/projects/' + db.projectId
            + '/databases/(default)/documents/mystudentRosterClasses?pageSize=300&key='
            + encodeURIComponent(db.apiKey);
      return fetch(u, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        // ⛔ null (403 chưa dán luật / mất mạng) KHÁC {} (đọc được nhưng kho rỗng):
        // bên gọi phải phân biệt để báo đúng câu cho thầy.
        .then(function (j) {
          if (!j) return null;
          var ra = {};
          var ds = j.documents || [];
          for (var i = 0; i < ds.length; i++) {
            var f = ds[i].fields || {};
            var ma = String((f.code && f.code.stringValue) || '')
                       .replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            if (!ma) continue;
            if (Number((f.archived && f.archived.integerValue) || 0)) continue;
            ra[ma] = {
              thu: String((f.days && f.days.stringValue) || ''),
              gio: String((f.start_time && f.start_time.stringValue) || ''),
              tamNghi: !!Number((f.on_break && f.on_break.integerValue) || 0)
            };
          }
          try { sessionStorage.setItem(KHOA_LICH,
            JSON.stringify({ luc: Date.now(), bang: ra })); } catch (e) {}
          return ra;
        })['catch'](function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }

  // "T3,T7" -> [2, 6] theo chỉ số getDay(). Cùng bảng chữ với app myLesson
  // (`THU_TEN`) — đừng đổi chữ, đó là chữ myStudent ghi trong cột `days`.
  var THU_TEN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  function thuTuChuoi(s) {
    var ra = [];
    var phan = String(s || '').split(/[,;/]/);
    for (var i = 0; i < phan.length; i++) {
      var j = THU_TEN.indexOf(phan[i].trim().toUpperCase());
      if (j >= 0 && ra.indexOf(j) < 0) ra.push(j);
    }
    return ra;
  }

  // Mốc GIỜ VÀO HỌC của buổi kế tiếp, dạng "YYYY-MM-DDTHH:mm" (rỗng nếu không
  // đủ dữ liệu). Dò 8 ngày tới cho chắc: hôm nay mà chưa tới giờ thì tính luôn
  // hôm nay, qua giờ rồi thì sang buổi sau.
  // ⛔⛔ GIỜ TRONG myStudent GHI KIỂU VIỆT: "17h40" · "8h00" · "19h30" — KHÔNG
  // phải "17:40". Đo thật trên kho ngày 02/09/2026: cả 10 lớp đều dạng `h`, nên
  // bản đầu (chỉ nhận dấu hai chấm) chặn SẠCH mọi lớp. Nhận cả ba kiểu, và cho
  // giờ MỘT chữ số ("8h00"), phút có thể vắng ("8h" = 8:00).
  function gioPhut(gio) {
    var m = /^(\d{1,2})\s*[h:.]\s*(\d{1,2})?$/i.exec(String(gio || '').trim());
    if (!m) return null;
    var h = Number(m[1]), p = Number(m[2] || 0);
    if (!(h >= 0 && h <= 23 && p >= 0 && p <= 59)) return null;
    return { h: h, p: p };
  }

  function buoiTiepTheo(thuChuoi, gio, tuMoc) {
    var thu = thuTuChuoi(thuChuoi);
    var m = gioPhut(gio);
    if (!thu.length || !m) return '';
    var goc = new Date(tuMoc == null ? Date.now() : tuMoc);
    for (var i = 0; i < 8; i++) {
      var d = new Date(goc.getFullYear(), goc.getMonth(), goc.getDate() + i,
                       m.h, m.p, 0, 0);
      if (thu.indexOf(d.getDay()) < 0) continue;
      if (d.getTime() <= goc.getTime()) continue;
      var hai = function (n) { return (n < 10 ? '0' : '') + n; };
      return d.getFullYear() + '-' + hai(d.getMonth() + 1) + '-' + hai(d.getDate())
           + 'T' + hai(d.getHours()) + ':' + hai(d.getMinutes());
    }
    return '';
  }

  // ---------- RUỘT THẺ NGHỈ: BÓNG BAY + GAME KHỦNG LONG ----------
  //
  // ⛔ VÌ SAO MỘT CANVAS CHO CẢ HAI: `.the-in` có `clip-path` hình mũi tên và
  // `.the-diem` có `overflow:hidden` — mọi thứ vẽ bằng thẻ DOM thò ra ngoài đều
  // bị chém cụt (đúng bẫy đã trả giá với avatar hôm 02/09). Vẽ trong canvas thì
  // không có gì thò ra được, và chỉ tốn MỘT vòng lặp rAF cho cả hai chế độ.
  //
  // ⛔ VÒNG LẶP PHẢI TỰ CHẾT: mỗi khung hình kiểm `document.contains(canvas)` —
  // thẻ bị vẽ lại (đổi lớp, nạp lại danh sách) là DOM cũ rời cây, vòng lặp cũ
  // phải dừng ngay kẻo chạy ngầm mãi và cộng dồn mỗi lần vẽ.
  //
  // ⛔ Máy bật "giảm chuyển động" thì KHÔNG chạy vòng lặp: vẽ đứng yên một khung.
  var MAU_BONG = ['#0E7C6E', '#B3541E', '#5B8DEF', '#8CC63F', '#E36B5C', '#9C6ADE', '#F2A93B'];

  function chuTatBong(ten) {
    var tu = String(ten || '').trim().split(/\s+/).filter(Boolean);
    if (!tu.length) return '?';
    if (tu.length === 1) return tu[0].slice(0, 2).toUpperCase();
    return (tu[tu.length - 2].charAt(0) + tu[tu.length - 1].charAt(0)).toUpperCase();
  }

  function itMau(ten) {
    var s = 0;
    for (var i = 0; i < String(ten).length; i++) s += String(ten).charCodeAt(i);
    return MAU_BONG[s % MAU_BONG.length];
  }

  // Vẽ nền tròn + chữ tắt trước, ảnh đè lên khi tải xong (ảnh 404 thì giữ chữ tắt
  // — cùng nếp `onerror="this.remove()"` của avatar bên các trang).
  function anhBong(lopGoc, ten) {
    var im = new Image();
    var o = { anh: null };
    im.onload = function () { o.anh = im; };
    im.src = avUrl(lopGoc, ten);
    return o;
  }

  function giamChuyenDongChung() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  // ============================================================
  // gaSanNghi(canvas, dsTen, lopGoc) — gắn sân chơi vào một canvas.
  // Trả về { doiCheDo(), doiCo() } cho trang gọi; `doiCo()` gọi lại khi khung
  // đổi kích thước.
  // ============================================================
  function gaSanNghi(canvas, dsTen, lopGoc) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1;
    var cheDo = 'bong';                 // 'bong' | 'game'
    var bong = [], anh = {};
    var G = null;                       // trạng thái game khủng long
    var chay = false, lucTruoc = 0;

    (dsTen || []).forEach(function (t) { anh[t] = anhBong(lopGoc, t); });

    function doiCo() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    // ---- BÓNG BAY ----
    // Cỡ bóng theo chiều cao khung và SỐ EM: lớp đông thì bóng nhỏ lại cho còn
    // chỗ lượn (thầy chốt "size bóng không quá to để có không gian bay tự do").
    function dungBong() {
      var n = (dsTen || []).length || 1;
      var r = Math.max(9, Math.min(H * 0.22, Math.sqrt((W * H * 0.13) / (n * Math.PI))));
      bong = (dsTen || []).map(function (t, i) {
        var g = (i * 2.399963) + 0.7;                 // rải góc kiểu hạt hướng dương
        var toc = 9 + (i % 5) * 3.5;                  // 9-23 px/giây — chậm, vô định
        return {
          ten: t, r: r,
          x: r + Math.random() * Math.max(1, W - 2 * r),
          y: r + Math.random() * Math.max(1, H - 2 * r),
          vx: Math.cos(g) * toc, vy: Math.sin(g) * toc,
          mau: itMau(t), tat: chuTatBong(t)
        };
      });
      // Gỡ chồng chỗ ban đầu (rải ngẫu nhiên có thể trùng nhau).
      for (var v = 0; v < 60; v++) goBong();
    }

    function goBong() {
      for (var i = 0; i < bong.length; i++) {
        for (var j = i + 1; j < bong.length; j++) {
          var a = bong[i], b = bong[j];
          var dx = b.x - a.x, dy = b.y - a.y;
          var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          var chong = a.r + b.r - d;
          if (chong <= 0) continue;
          var ux = dx / d, uy = dy / d, nua = chong / 2;
          a.x -= ux * nua; a.y -= uy * nua;
          b.x += ux * nua; b.y += uy * nua;
        }
      }
    }

    function nhipBong(dt) {
      var i, j;
      for (i = 0; i < bong.length; i++) {
        var o = bong[i];
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.x - o.r < 0) { o.x = o.r; o.vx = Math.abs(o.vx); }
        if (o.x + o.r > W) { o.x = W - o.r; o.vx = -Math.abs(o.vx); }
        if (o.y - o.r < 0) { o.y = o.r; o.vy = Math.abs(o.vy); }
        if (o.y + o.r > H) { o.y = H - o.r; o.vy = -Math.abs(o.vy); }
      }
      // Va chạm đàn hồi, hai bóng coi như cùng khối lượng: đổi thành phần vận
      // tốc DỌC THEO đường nối tâm, giữ nguyên thành phần vuông góc.
      for (i = 0; i < bong.length; i++) {
        for (j = i + 1; j < bong.length; j++) {
          var a = bong[i], b = bong[j];
          var dx = b.x - a.x, dy = b.y - a.y;
          var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          if (d >= a.r + b.r) continue;
          var ux = dx / d, uy = dy / d;
          var va = a.vx * ux + a.vy * uy, vb = b.vx * ux + b.vy * uy;
          if (va - vb <= 0) continue;                 // đang rời nhau thì thôi
          a.vx += (vb - va) * ux; a.vy += (vb - va) * uy;
          b.vx += (va - vb) * ux; b.vy += (va - vb) * uy;
          var nua = (a.r + b.r - d) / 2;
          a.x -= ux * nua; a.y -= uy * nua;
          b.x += ux * nua; b.y += uy * nua;
        }
      }
    }

    function veBong() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < bong.length; i++) {
        var o = bong[i];
        ctx.save();
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = o.mau;
        ctx.fill();
        ctx.clip();
        var im = anh[o.ten] && anh[o.ten].anh;
        if (im) ctx.drawImage(im, o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
        else {
          ctx.fillStyle = '#fff';
          ctx.font = '800 ' + Math.round(o.r * 0.8) + 'px Montserrat, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(o.tat, o.x, o.y + 0.5);
        }
        ctx.restore();
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    // ---- GAME KHỦNG LONG ----
    // Sân chỉ cao ~110px nên mọi thứ nhỏ: khủng long ~22px, xương rồng 14-24px.
    function dungGame() {
      G = { day: H - 12, x: Math.max(18, W * 0.11), y: 0, vy: 0, tren: false,
            gai: [], toc: 118, diem: 0, ky: kyLuc(), thua: false, tre: 0 };
    }
    function kyLuc() {
      try { return Number(localStorage.getItem('awc_dino_ky') || 0) || 0; } catch (e) { return 0; }
    }
    function ghiKyLuc(v) { try { localStorage.setItem('awc_dino_ky', String(v)); } catch (e) {} }

    function nhay() {
      if (!G) return;
      if (G.thua) { dungGame(); return; }             // thua rồi thì chạm để chơi lại
      if (G.tren) return;
      G.vy = -Math.sqrt(2 * 1500 * (H * 0.44));       // đủ cao để qua cây cao nhất
      G.tren = true;
    }

    function nhipGame(dt) {
      if (G.thua) return;
      G.diem += dt * 11;
      G.toc += dt * 3.2;                              // nhanh dần, rất từ tốn
      G.vy += 1500 * dt;
      G.y += G.vy * dt;
      if (G.y > 0) { G.y = 0; G.vy = 0; G.tren = false; }

      G.tre -= dt;
      if (G.tre <= 0) {
        G.gai.push({ x: W + 10, cao: 14 + Math.random() * 10, rong: 6 + Math.random() * 5 });
        G.tre = 0.75 + Math.random() * 0.9;
      }
      for (var i = G.gai.length - 1; i >= 0; i--) {
        G.gai[i].x -= G.toc * dt;
        if (G.gai[i].x + G.gai[i].rong < -6) G.gai.splice(i, 1);
      }
      // Va chạm: hộp khủng long thu nhỏ 3px mỗi bên cho đỡ ức chế.
      var kx = G.x + 3, kw = 16, ky2 = G.day - 22 + G.y + 3, kh = 16;
      for (var j = 0; j < G.gai.length; j++) {
        var c = G.gai[j];
        if (kx < c.x + c.rong && kx + kw > c.x && ky2 + kh > G.day - c.cao) {
          G.thua = true;
          var d = Math.floor(G.diem);
          if (d > G.ky) { G.ky = d; ghiKyLuc(d); }
          break;
        }
      }
    }

    function veGame() {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = '#C6D6D2'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, G.day + 0.5); ctx.lineTo(W, G.day + 0.5); ctx.stroke();

      ctx.fillStyle = '#3D5450';
      var dx = G.x, dy = G.day - 22 + G.y;
      ctx.fillRect(dx + 2, dy + 6, 12, 12);            // thân
      ctx.fillRect(dx + 11, dy, 11, 9);                // đầu
      ctx.fillRect(dx + 20, dy + 4, 3, 2);             // mõm
      ctx.fillRect(dx, dy + 9, 3, 6);                  // đuôi
      ctx.fillStyle = '#fff';
      ctx.fillRect(dx + 17, dy + 2, 2, 2);             // mắt
      if (!G.thua) {
        ctx.fillStyle = '#3D5450';
        var buoc = Math.floor(G.diem * 1.6) % 2;
        ctx.fillRect(dx + 3, dy + 18, 4, 4 - buoc);
        ctx.fillRect(dx + 9, dy + 18, 4, 3 + buoc);
      } else {
        ctx.fillStyle = '#3D5450';
        ctx.fillRect(dx + 3, dy + 18, 4, 4); ctx.fillRect(dx + 9, dy + 18, 4, 4);
      }

      ctx.fillStyle = '#4E7F5C';
      for (var i = 0; i < G.gai.length; i++) {
        var c = G.gai[i];
        ctx.fillRect(c.x, G.day - c.cao, c.rong, c.cao);
        ctx.fillRect(c.x - 3, G.day - c.cao * 0.72, 3, c.cao * 0.34);
        ctx.fillRect(c.x + c.rong, G.day - c.cao * 0.6, 3, c.cao * 0.3);
      }

      ctx.fillStyle = '#93A5A1';
      ctx.font = '800 10px Montserrat, sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('HI ' + String(G.ky).padStart(4, '0') + '   ' +
                   String(Math.floor(G.diem)).padStart(4, '0'), W - 6, 5);
      if (G.thua) {
        ctx.fillStyle = '#54706B';
        ctx.font = '800 11px Montserrat, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('CHẠM ĐỂ CHƠI LẠI', W / 2, H / 2);
      }
    }

    // ---- VÒNG LẶP ----
    function khung(luc) {
      if (!document.contains(canvas)) { chay = false; return; }   // thẻ đã bị vẽ lại
      if (!W || !H) { if (!doiCo()) { requestAnimationFrame(khung); return; } dungLai(); }
      var dt = Math.min(0.05, (luc - lucTruoc) / 1000 || 0);      // chặn nhảy cóc khi tab ẩn
      lucTruoc = luc;
      if (cheDo === 'game') { nhipGame(dt); veGame(); }
      else { nhipBong(dt); veBong(); }
      requestAnimationFrame(khung);
    }
    function dungLai() {
      if (cheDo === 'game') dungGame(); else dungBong();
    }
    function batDau() {
      if (chay) return;
      chay = true; lucTruoc = 0;
      if (giamChuyenDongChung()) {                    // đứng yên: vẽ đúng một khung
        if (doiCo()) { dungLai(); if (cheDo === 'game') veGame(); else veBong(); }
        chay = false;
        return;
      }
      requestAnimationFrame(function (t) { lucTruoc = t; khung(t); });
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (cheDo !== 'game') return;
      e.preventDefault(); e.stopPropagation();
      nhay();
    });

    doiCo(); dungLai(); batDau();

    return {
      doiCheDo: function (m) {
        cheDo = (m === 'game') ? 'game' : 'bong';
        doiCo(); dungLai();
        if (!chay) batDau();
        else if (giamChuyenDongChung()) { if (cheDo === 'game') veGame(); else veBong(); }
      },
      laGame: function () { return cheDo === 'game'; },
      doiCo: function () { if (doiCo()) dungLai(); },
      nhay: nhay
    };
  }

  // ---------- KHUÔN HTML CỦA THẺ NGHỈ (dùng chung hai trang) ----------
  //
  // ⛔ THẺ NGHỈ LÀ `<div>`, KHÔNG phải `<button>` như thẻ bài bên `lop.html`:
  // bên trong nó có nút ▶ THẬT (bật/tắt game), mà HTML cấm nút lồng trong nút
  // (đã vấp thật ở v1.34.0). Nhờ để riêng thế này, thẻ bài thường của lop.html
  // KHÔNG phải đổi gì cả.
  //
  // ⛔ CSS của thẻ này CHÉP Ở HAI NƠI (`lop.html` + `dashboard.html`) đúng nếp
  // mọi thứ khác của cụm — mỗi trang một khối <style> riêng, không có
  // stylesheet chung. Sửa một bên phải sửa bên kia.
  var IC_CHOI = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>';
  var IC_VE = '<svg viewBox="0 0 24 24"><path d="M17 4.5v15L4 12z"/></svg>';

  function theNghiHtml(moc) {
    return '<div class="the nghi" data-nghi="1">' +
      '<span class="the-in">' +
        '<span class="the-body nghi-dau">' +
          '<span class="nghi-cum">' +
            '<img class="nghi-ava" src="assets/avatar-tron.jpg" alt="">' +
            '<span class="nghi-chu">NO HOMEWORK, ENJOY YOUR DAY!</span>' +
          '</span>' +
          '<span class="nghi-han"><i>BUỔI HỌC TIẾP THEO TRONG</i>' +
            '<b class="dhho-nghi" data-moc="' + (moc || 0) + '">…</b></span>' +
        '</span>' +
        '<span class="the-diem nghi-san"><canvas class="nghi-canvas"></canvas></span>' +
        '<button type="button" class="play nghi-play" title="Chơi trò khủng long">' +
          IC_CHOI + '</button>' +
      '</span>' +
    '</div>';
  }

  // Nhịp đồng hồ của thẻ nghỉ — mỗi trang gọi từ vòng 1 giây sẵn có của mình.
  // "TIẾNG:PHÚT" (thầy chốt); quá 24 tiếng thì số tiếng cứ cộng dồn (52:07).
  function nhipNghi(goc) {
    var ds = (goc || document).querySelectorAll('.dhho-nghi[data-moc]');
    for (var i = 0; i < ds.length; i++) {
      var e = ds[i];
      var moc = +e.getAttribute('data-moc');
      var boc = e.parentElement;
      if (!moc) { e.textContent = '—'; continue; }
      var con = moc - Date.now();
      // Hết hạn thì bỏ luôn nhãn "BUỔI HỌC TIẾP THEO TRONG" (CSS `.het i` ẩn nó),
      // không thì đọc thành "…TIẾP THEO TRONG ĐÃ ĐẾN GIỜ HỌC".
      if (con <= 0) {
        e.textContent = 'ĐÃ ĐẾN GIỜ HỌC';
        if (boc) boc.classList.add('het');
        continue;
      }
      if (boc) boc.classList.remove('het');
      var phut = Math.floor(con / 60000);
      var h = Math.floor(phut / 60), p = phut % 60;
      e.textContent = h + ':' + (p < 10 ? '0' : '') + p;
    }
  }

  // Gắn sân chơi + nút ▶ cho MỌI thẻ nghỉ bên trong `goc`.
  // ⛔ Gọi lại sau MỖI lần vẽ lại danh sách thẻ: DOM cũ rời cây thì vòng lặp cũ
  // tự chết (xem `gaSanNghi`), nhưng DOM mới thì chưa ai gắn gì.
  function gaTheNghi(goc, dsTen, lopGoc) {
    var ds = (goc || document).querySelectorAll('.the.nghi');
    for (var i = 0; i < ds.length; i++) {
      (function (the) {
        if (the.dataset.daGa === '1') return;
        the.dataset.daGa = '1';
        var canvas = the.querySelector('.nghi-canvas');
        var nut = the.querySelector('.nghi-play');
        if (!canvas || !nut) return;
        var san = gaSanNghi(canvas, dsTen || [], lopGoc || '');
        nut.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          var sangGame = !san.laGame();
          san.doiCheDo(sangGame ? 'game' : 'bong');
          the.classList.toggle('dang-choi', sangGame);
          nut.innerHTML = sangGame ? IC_VE : IC_CHOI;
          nut.title = sangGame ? 'Về bóng bay' : 'Chơi trò khủng long';
        });
        // ⛔ Đo lại khi cửa sổ đổi cỡ — canvas phải khớp khung thật, không thì
        // hình bị kéo giãn nhoè (canvas không tự co theo CSS như ảnh).
        window.addEventListener('resize', function () { san.doiCo(); });
        // ⛔ Đo lại sau khi FONT nạp xong: khung thẻ cao lên đôi chút, đo sớm là
        // canvas thấp hơn khung thật (đúng bẫy "đo layout quá sớm" 02/09).
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function () { san.doiCo(); });
        }
      })(ds[i]);
    }
  }

  window.AWC = {
    CFG: CFG,
    // ⭐ v1.48.0 — thẻ "không giao bài" + lịch học + sân chơi
    nghiCua: nghiCua, datNghi: datNghi, napLopHoc: napLopHoc,
    buoiTiepTheo: buoiTiepTheo, thuTuChuoi: thuTuChuoi, gaSanNghi: gaSanNghi,
    theNghiHtml: theNghiHtml, nhipNghi: nhipNghi, gaTheNghi: gaTheNghi,
    chuAnToan: chuAnToan, chuanMa: chuanMa, khoaTen: khoaTen, lopHien: lopHien,
    napDuLieu: napDuLieu, napJson: napJson,
    lopTheoMa: lopTheoMa, baiCuaLop: baiCuaLop, timTheoMa: timTheoMa,
    emDangHoc: emDangHoc, batBuocDangNhap: batBuocDangNhap, luuEm: luuEm, thoat: thoat,
    giuXemNhuQuery: giuXemNhuQuery,
    bam: bam, laMaQuanLy: laMaQuanLy,
    laAdmin: laAdmin, datAdmin: datAdmin, thoatAdmin: thoatAdmin,
    diemCuaAct: diemCuaAct, chuanDiem: chuanDiem, xongAct: xongAct,
    actCuaBai: actCuaBai, maLesson: maLesson, tenBai: tenBai,
    tenDang: tenDang, coTenRieng: coTenRieng, tenO: tenO,
    mocHan: mocHan, chuHan: chuHan, trangCuaBai: trangCuaBai,
    // v1.20.0 — hạn sửa riêng từng thẻ (dashboard ghi, mọi trang đọc)
    hanCua: hanCua, daSuaHan: daSuaHan, datHanSua: datHanSua,
    // v1.35.0 — trạng thái thẻ (ẩn / tạm khoá / xoá mềm) + "còn hạn" dùng chung
    trangThaiThe: trangThaiThe, datTrangThai: datTrangThai, conHan: conHan,
    // ⭐ v1.37.0 — avatar dùng chung + chấm đỏ tin nhắn mới
    avSlugLop: avSlugLop, avSlugTen: avSlugTen, avUrl: avUrl, gaAvatar: gaAvatar,
    mocDaXem: mocDaXem, danhDauDaXem: danhDauDaXem,
    mocTinMoi: mocTinMoi, datMocTinMoi: datMocTinMoi,
    chatChuaDoc: chatChuaDoc, veChamDo: veChamDo,
  };
})();
