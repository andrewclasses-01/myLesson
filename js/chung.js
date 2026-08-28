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
    nhoDl = Promise.all([napJson('data/lop.json'), napJson('data/bai.json'), napHanSua()])
      .then(function (r) {
        HAN_SUA = r[2] || {};
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
  var KHOA_HAN = 'awc_hansua';

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
      if (san) return Promise.resolve(san);
      var u = 'https://firestore.googleapis.com/v1/projects/' + db.projectId
            + '/databases/(default)/documents/lessonHan?pageSize=300&key='
            + encodeURIComponent(db.apiKey);
      return fetch(u, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          var ra = {};
          var ds = (j && j.documents) || [];
          for (var i = 0; i < ds.length; i++) {
            var f = ds[i].fields || {};
            var id = f.baiId && f.baiId.stringValue;
            if (id) ra[id] = String((f.han && f.han.stringValue) || '');
          }
          // ⛔ CHỈ ĐỆM KHI ĐỌC ĐƯỢC THẬT (`j` khác null). Đệm cả lượt hỏng là
          // đóng băng bảng rỗng suốt 60 giây — mạng chớp một cái là mọi thẻ
          // mất hạn đã sửa, mà lần tải lại ngay sau đó cũng không cứu được.
          if (j) { try { sessionStorage.setItem(KHOA_HAN,
            JSON.stringify({ luc: Date.now(), bang: ra })); } catch (e) {} }
          return ra;
        })['catch'](function () { return {}; });
    } catch (e) { return Promise.resolve({}); }
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
    try { sessionStorage.setItem(KHOA_HAN,
      JSON.stringify({ luc: Date.now(), bang: HAN_SUA })); } catch (e) {}
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

  function baiCuaLop(dl, maLop) {
    return (dl.bai && dl.bai[maLop]) ? dl.bai[maLop] : [];
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

  window.AWC = {
    CFG: CFG,
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
  };
})();
