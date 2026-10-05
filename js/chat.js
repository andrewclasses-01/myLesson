/* ============================================================
   chat.js — CUỘC TRÒ CHUYỆN CỦA LỚP (web v1.11.0)

   Dùng CHUNG cho hai chỗ:
     · `lop.html`       — khung chat của học sinh, mỗi em thấy lớp mình
     · `dashboard.html` — khung chat của thầy, đổi lớp là đổi phòng

   Kho tin nằm trong Firestore của AWord (project `aword-70dae`, dùng chung như
   `bai-sp.html` đã làm — thầy chốt việc dùng chung project ở phiên trước):

       classChat/{mã lớp}/messages/{id tự sinh}
         name      tên hiển thị người gửi
         code      mã đăng nhập của em (thầy gửi thì để 'GV')
         role      'hs' | 'gv'
         text      nội dung, tối đa 300 chữ
         createdAt mốc mili giây
         cx        (⭐ #8, tuỳ chọn) map mã người thả -> {ma, ten} — CẢM XÚC

       classChatArchive/{id tự sinh}   (⭐ #Đợt D — "Lưu trữ & làm mới")
         lop       mã lớp (B1AH…)
         tenLop    tên lớp lúc lưu (hiện cho dễ đọc, phòng khi đổi tên sau)
         luc       mốc mili giây lúc lưu
         soTin     số tin trong gói (để hiện nhanh, khỏi mở ra đếm)
         tin       MẢNG snapshot y hệt khiCo() trả về lúc lưu

   ⭐ v1.52.0 (GÓI BẢO MẬT C, 02/09/2026): luật `classChat` đã đổi — `delete: if laThay()`,
   tin `role:'gv'` và `classChatArchive` cũng đòi `laThay()` (phiên Firebase Auth của thầy,
   xem js/thay.js). Khối luật chép dưới đây là bản CŨ (Đợt D), giữ để tra; bản đang chạy
   xem `myLesson-data/tai-lieu/LUAT FIRESTORE CAN DAN (GOI C — THAY DANG NHAP).md`.

   ⛔⛔ CHƯA DÁN LUẬT FIRESTORE MỚI THÌ CẢM XÚC/XOÁ TIN/LƯU TRỮ KHÔNG CHẠY (báo
   `permission-denied`) — NHẮN VÀ ĐỌC vẫn chạy bình thường (luật cũ vẫn đúng
   cho hai việc đó). Thầy vào Firebase Console → Firestore Database → Rules,
   THAY khối `classChat` cũ bằng khối này (giữ nguyên `classChatArchive` mới
   thêm bên dưới), rồi bấm Publish — chi tiết đầy đủ + lý do:
   `D:\APP AND DATA\myLesson-data\tai-lieu\LUAT FIRESTORE CAN DAN (…THEM CAM XUC).md`

       match /classChat/{lop}/messages/{id} {
         allow read: if true;
         allow create: if request.resource.data.keys().hasOnly(
                            ['name','code','role','text','createdAt'])
           && request.resource.data.text is string
           && request.resource.data.text.size() > 0
           && request.resource.data.text.size() <= 300
           && request.resource.data.name is string
           && request.resource.data.name.size() <= 60
           && request.resource.data.role in ['hs','gv']
           && request.resource.data.createdAt is number;
         // ⭐ #8 — CHỈ cho sửa trường `cx` (thả/gỡ cảm xúc), mọi trường khác
         // (text/name/…) vẫn KHOÁ CỨNG như cũ — không ai sửa lại được lời đã nói.
         allow update: if request.resource.data.diff(resource.data)
                            .affectedKeys().hasOnly(['cx'])
           && request.resource.data.cx is map;
         // ⭐ Đợt D — MỞ xoá (thầy chốt, biết rõ giới hạn: không có đăng nhập
         // thật nên KHÔNG thể ép luật "chỉ đúng người gửi/đúng thầy mới xoá
         // được" — trang chỉ tự chặn ở GIAO DIỆN, ai rành kỹ thuật vẫn gọi
         // thẳng Firestore xoá được tin của người khác).
         allow delete: if true;
       }
       match /classChatArchive/{id} {
         allow read: if true;
         allow create: if request.resource.data.keys().hasOnly(
                            ['lop','tenLop','luc','soTin','tin'])
           && request.resource.data.lop is string
           && request.resource.data.tin is list;
         allow update, delete: if false;   // kho lưu trữ — chỉ thêm, không sửa/xoá
       }

   ⚠️ Luật này cho AI CŨNG ĐỌC VÀ GỬI ĐƯỢC (không đòi đăng nhập) — đúng mức tin
   cậy mà cả hệ này đang có: mã học sinh vốn nằm công khai trong `lop.json`.
   ⭐⭐ HẾT ĐÚNG từ v1.158.0 (27/09/2026, sau tấn công Tr0ngX): GỬI tin học sinh đòi phiên Firebase
   Auth của CHÍNH em (`request.auth.token.ma == code`, mật khẩu thật — js/nw-phien.js); cảm xúc chỉ sửa
   được ô của mình. Luật đăng bằng `tools/dang-luat-mat-khau.js`. ĐỌC vẫn công khai.
   ============================================================ */

/* ============================================================
   ⭐ QUY ĐỊNH GIAO DIỆN KHUNG CHAT (thầy chốt 15/09/2026) — đọc trước khi build
   tính năng chat mới, kể cả `dmChat` riêng tư sau này nếu có:

   Khung chat của GIÁO VIÊN (`dashboard.html`) và HỌC SINH (`lop.html`) dùng
   GẦN NHƯ Y HỆT một khuôn giao diện + hành vi (bong bóng, avatar, gửi/đọc tin,
   thả cảm xúc). GV chỉ có thêm một số tính năng PHỤ, NHỎ, nằm NGOÀI phần cốt
   lõi đó:
     · Gắn thông báo (ghim một tin lên đầu phòng)
     · Lưu trữ cuộc trò chuyện (nút 🗄 "Lưu trữ & làm mới" → `luuKho()`)

   Ngoài hai việc phụ này, KHÔNG tách riêng khuôn/luồng dữ liệu cho GV lẫn HS.
   Bất kỳ tính năng chat nào thêm sau này đều nên dùng CHUNG một hàm/khuôn cho
   cả hai trang (như `nghe()`/`gui()`/`suaCx()` hiện tại), chỉ ẩn/hiện nút phụ
   theo `vaiTro==='gv'` ở tầng giao diện — ĐỪNG viết hai bản logic chat khác
   nhau cho hai vai trò.
   ============================================================ */
(function () {
  'use strict';

  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
  var CAU_HINH = {
    apiKey: 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY',
    authDomain: 'aword-70dae.firebaseapp.com',
    projectId: 'aword-70dae',
    storageBucket: 'aword-70dae.firebasestorage.app',
    messagingSenderId: '399279049436',
    appId: '1:399279049436:web:b9b34dcfb34732aa744219'
  };
  var TOI_DA_CHU = 300;      // phải khớp luật Firestore ở trên
  // ⛔⛔ CON SỐ NÀY LÀ TIỀN — ĐỪNG NÂNG LÊN CHO "XEM ĐƯỢC NHIỀU HƠN" (28/08/2026)
  // Firestore tính MỘT LƯỢT ĐỌC CHO MỖI TÀI LIỆU mà `onSnapshot` kéo về ở nhịp
  // đầu. `noiChat()` chạy TỰ ĐỘNG lúc mở `lop.html` (không đợi em bấm vào cột
  // chat), và trang KHÔNG bật bộ nhớ đệm Firestore ⇒ mỗi lần một em mở/tải lại
  // trang lớp là ĐỌC LẠI ĐỦ TỪNG ẤY TÀI LIỆU TỪ MÁY CHỦ.
  //   200 tin × 156 em × 2-3 lượt mở/ngày  ⇒  ~90.000 lượt đọc/ngày
  //   Gói miễn phí chỉ có 50.000 lượt/ngày cho CẢ project (chung với AWord +
  //   mySpeaking) — cạn là kho trả 429 "Quota exceeded" cho MỌI phép đọc.
  // Đo thật 28/08/2026: kho `aword-70dae` cạn sạch, kéo sập luôn SP CHECK của
  // A2B (thẻ speaking đứng ở "Đang đọc dữ liệu…", em bấm vào thì báo oan
  // "Lớp mình chưa có buổi speaking nào đang mở").
  // 👉 Tin cũ hơn 30 không mất đi đâu cả — thầy có nút "🗄 Lưu trữ & làm mới"
  //    bên dashboard để cất nguyên phòng vào `classChatArchive` rồi xem lại,
  //    và từ v1.109.x hai trang chat còn có "kéo lên tải thêm" (`taiThem()`
  //    bên dưới) — CHỈ tốn lượt đọc khi có người thật sự kéo lên xem.
  var TOI_DA_TIN = 30;       // chỉ kéo về 30 tin gần nhất (xem khối ⛔ trên)
  // ⭐ "Kéo lên tải thêm" (15/09/2026) — mỗi lần kéo lên đầu khung chat thì tải
  // thêm đúng ngần này tin CŨ HƠN, một lần, KHÔNG mở thêm kênh sống (xem
  // `taiThem()` bên dưới). Thầy chốt 20/lần — nhẹ tay hơn cả bản tải đầu.
  var TOI_DA_TIN_THEM = 20;

  // Nạp SDK kiểu lười: trang nào không mở chat thì không tải gì cả (~120KB).
  // (v1.17.0) ⛔ KHÔNG initializeApp mù quáng: khối SPEAKING của dashboard cũng
  // nạp SDK này — bên nào chạy sau mà cứ initializeApp là dính lỗi duplicate-app
  // và chat chết lặng. Ai đến trước thì tạo app, ai đến sau thì DÙNG CHUNG.
  var _p = null;
  function db() {
    if (!_p) {
      _p = (async function () {
        var appMod = await import(SDK + '/firebase-app.js');
        var fsMod = await import(SDK + '/firebase-firestore.js');
        var app = (appMod.getApps && appMod.getApps().length)
          ? appMod.getApp()
          : appMod.initializeApp(CAU_HINH);
        // ⭐ 02/10/2026 (v1.226.0, khoá đọc người ngoài GĐ2): chat lớp CHỈ đọc được khi đăng nhập ⇒ chờ Auth khôi phục
        // phiên (js/ve-doc.js) rồi mới trả kho — nghe sớm là bị từ chối và listener chết luôn (không tự nối lại).
        if (window.__veDocSan) { try { await window.__veDocSan; } catch (e) { } }
        return { fs: fsMod, db: fsMod.getFirestore(app) };
      })();
    }
    return _p;
  }

  /* ============================================================
     ⭐ v1.80.0 — DẤU MÁY (thầy chốt 08/09/2026, "bản gọn")

     VÌ SAO CÓ: thầy hỏi "điều tra được em nào lấy ID của bạn để chat không".
     Câu trả lời lúc đó là KHÔNG — tin chỉ lưu 5 trường, mà Firestore ghi
     THẲNG từ máy em nên không có IP, không có thiết bị, không có tài khoản
     (em chỉ gõ mã, mã lại nằm công khai trong `lop.json`). Google Cloud có
     loại nhật ký ghi IP nhưng mặc định TẮT và KHÔNG hồi tố.

     ĐÂY LÀ GÌ: một chuỗi ngẫu nhiên vô nghĩa, sinh MỘT LẦN trên mỗi máy rồi
     cất trong trình duyệt máy đó. KHÔNG phải IP, không lộ danh tính, không
     lần ra được ai ở đâu. Nó chỉ trả lời đúng một câu:
         "hai tin này có phải từ CÙNG MỘT MÁY không?"
     Nhờ vậy dashboard bắt được cảnh "một máy bật hai mã học sinh".

     ⚠️ BA GIỚI HẠN — đã nói với thầy trước khi build, đừng quên:
       · KHÔNG hồi tố. Mọi tin trước 08/09/2026 vĩnh viễn không có dấu máy.
       · Xoá dữ liệu duyệt / cửa sổ ẩn danh / đổi máy ⇒ dấu máy đổi theo, em
         nào rành sẽ né được. (Chiều ngược lại vẫn chắc: một máy hai mã là lộ.)
       · CÓ THỂ OAN. Hai anh em ruột dùng chung máy cũng bị báo "một máy hai
         mã". Đây là DẤU HIỆU ĐỂ THẦY XEM VÀ HỎI, không phải bằng chứng kết tội.

     ⛔⛔ LUẬT FIRESTORE: khối `classChat` khoá cứng bằng
     `hasOnly(['name','code','role','text','createdAt'])` — thêm trường thứ 6
     mà chưa dán luật mới là Firestore TỪ CHỐI MỌI TIN, cả 10 lớp mất chat.
     Vì thế `gui()` bên dưới có ĐƯỜNG LÙI: ghi kèm dấu máy mà dính
     `permission-denied` thì tự ghi lại theo kiểu CŨ (5 trường). Nghĩa là đẩy
     web lên trước khi dán luật cũng KHÔNG chết chat — chỉ là chưa có dấu máy.
     Luật cần dán: `myLesson-data/tai-lieu/LUAT FIRESTORE CAN DAN (08-09 THEM DAU MAY).md`
     ============================================================ */
  var KHOA_MAY = 'awc_may';
  var _may = null;
  function dauMay() {
    if (_may !== null) return _may;
    try {
      var m = localStorage.getItem(KHOA_MAY);
      if (!m || String(m).length < 6) {
        // 10 ký tự base36. Không dính gì tới máy thật (không lấy màn hình, font,
        // card đồ hoạ…) — cố ý: chỉ cần PHÂN BIỆT máy, không cần NHẬN DẠNG máy.
        m = '';
        for (var i = 0; i < 10; i++) {
          m += Math.floor(Math.random() * 36).toString(36);
        }
        localStorage.setItem(KHOA_MAY, m);
      }
      _may = String(m).slice(0, 20);
    } catch (e) {
      // Cửa sổ ẩn danh / trình duyệt chặn lưu: sinh dấu máy TẠM cho riêng lần mở
      // trang này. (27/09/2026) Luật nay BẮT BUỘC có dấu máy — trả '' là em không
      // chat được. Dấu tạm vẫn đủ phân biệt máy trong một buổi.
      _may = '';
      for (var j = 0; j < 10; j++) _may += Math.floor(Math.random() * 36).toString(36);
    }
    return _may;
  }

  /* ⭐ v1.206.0 (01/10/2026) — ẢNH CỦA THẦY trong chat lớp (học sinh không gửi ảnh). Ảnh nén JPEG ≤1280px lên Storage
     `classChat/<lớp>/<tên>.jpg`, tin mang `hinh` = URL tải về; `text` vẫn bắt buộc (luật) nên ghi CHU_ANH — trang cũ
     còn cache vẫn hiện được "[Hình ảnh]". Luật: tools/dang-luat-chat-anh-thu-hoi.js. */
  var CHU_ANH = '[Hình ảnh]';
  function chuTin(x) { return (x.hinh && x.text === CHU_ANH) ? '' : (x.text || ''); }

  var dungNghe = null;       // hàm gỡ listener của phòng đang nghe
  var phongDangNghe = '';

  // Nghe MỘT phòng. Gọi lại với lớp khác thì tự bỏ phòng cũ — dashboard đổi lớp
  // liên tục, không gỡ là mấy listener chồng nhau, tin của lớp này nhảy sang lớp kia.
  //   khiCo(ds)  ds = [{id, ten, ma, vaiTro, chu, luc}] đã xếp cũ -> mới
  //   khiLoi(e)  gọi khi Firestore từ chối (thường là CHƯA DÁN LUẬT)
  function nghe(maLop, khiCo, khiLoi) {
    thoi();
    phongDangNghe = maLop;
    db().then(function (f) {
      if (phongDangNghe !== maLop) return;         // đã đổi lớp trong lúc chờ nạp
      var q = f.fs.query(
        f.fs.collection(f.db, 'classChat', maLop, 'messages'),
        f.fs.orderBy('createdAt', 'desc'),
        f.fs.limit(TOI_DA_TIN)
      );
      dungNghe = f.fs.onSnapshot(q, function (snap) {
        var ds = [];
        snap.forEach(function (d) {
          var x = d.data() || {};
          ds.push({
            id: d.id, ten: x.name || '?', ma: x.code || '',
            vaiTro: x.role === 'gv' ? 'gv' : 'hs',
            chu: chuTin(x), luc: Number(x.createdAt) || 0,
            cx: x.cx || {},
            may: x.may || '',           /* ⭐ v1.80.0 — rỗng với mọi tin cũ */
            q: x.q || null, sticker: x.sticker || '', thuHoi: x.thuHoi === true   /* v1.186.0 — khuôn chat kiểu Zalo */
            , hinh: x.hinh || ''           /* v1.206.0 — ảnh thầy gửi */
            , he: heChuan(x.he)            /* v1.216.0 — tin hệ thống "… đã bị cấm chat" */
          });
        });
        ds.reverse();                              // Firestore trả mới->cũ, ta hiện cũ->mới
        khiCo(ds);
      }, function (e) {
        if (khiLoi) khiLoi(e);
      });
    })['catch'](function (e) { if (khiLoi) khiLoi(e); });
  }

  /* ⭐ v1.210.0 (01/10/2026) — "ĐÃ XEM" tin cuối kiểu Messenger (thầy chốt kiểu A, học sinh cũng thấy).
     MỘT tài liệu mỗi lớp `classChatXem/<lớp>` = { <mã em | 'GV'>: {ten, luc} } — `luc` = createdAt của TIN CUỐI người đó
     đã xem (mốc của tin, không phải đồng hồ máy). Luật: mỗi người CHỈ ghi ô của chính mình (tools/dang-luat-chat-da-xem.js).
     ⛔ Lượt đọc: mỗi lượt ghi ô = 1 lượt đọc cho MỖI máy đang mở phòng ⇒ khuôn chỉ ghi khi tin cuối ĐỔI và khung chat
     đang hiện trên màn (js/chat-ui.js thuGhiXem), không ghi theo nhịp đồng hồ. */
  var dungXem = null;
  function ngheXem(maLop, cb) {
    thoiXem();
    var huy = false, go = null;
    dungXem = function () { huy = true; if (go) { try { go(); } catch (e) {} } };
    db().then(function (f) {
      if (huy) return;
      go = f.fs.onSnapshot(f.fs.doc(f.db, 'classChatXem', maLop),
        function (s) { if (!huy) cb(s.exists() ? (s.data() || {}) : {}); },
        function () { if (!huy) cb({}); });
    });
  }
  function thoiXem() { if (dungXem) dungXem(); dungXem = null; }
  function ghiXem(maLop, maNguoi, ten, luc) {
    var khoa = String(maNguoi || '').replace(/[.$#[\]/]/g, '_');
    if (!khoa || !(Number(luc) > 0)) return Promise.resolve();
    if (window.__thayVao && khoa !== 'GV') return Promise.resolve();   // thầy mở thay em: không ghi "em đã xem"
    var choPhien = (khoa !== 'GV' && window.NWP) ? window.NWP.userHienTai()['catch'](function () { return null; }) : Promise.resolve(null);
    return choPhien.then(db).then(function (f) {
      var o = {}; o[khoa] = { ten: String(ten || '?').slice(0, 60), luc: Number(luc) };
      return f.fs.setDoc(f.fs.doc(f.db, 'classChatXem', maLop), o, { merge: true });
    }).then(function () {
      // ⭐ v1.253.0 — mốc "đã xem" của MÁY theo luôn (khoá mylesson_xemtin_* mà trang lớp / dashboard / Tin nhắn đọc) + báo
      // sổ chưa đọc chung (js/tn-pop-ds.js) đếm lại ngay. Máy KHÁC nhận mốc này qua kho classChatXem.
      try {
        var k = 'mylesson_xemtin_' + maLop + '_' + khoa;
        if (Number(luc) > (Number(localStorage.getItem(k)) || 0)) localStorage.setItem(k, String(Number(luc)));
        if (khoa === 'GV' && Number(luc) > (Number(localStorage.getItem('mylesson_xemtin_' + maLop)) || 0)) localStorage.setItem('mylesson_xemtin_' + maLop, String(Number(luc)));
      } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('ac-tn-xem', { detail: { lop: maLop } })); } catch (e) {}
    });
  }

  function thoi() {
    thoiXem();
    if (dungNghe) { try { dungNghe(); } catch (e) {} }
    dungNghe = null;
    phongDangNghe = '';
  }

  // ⭐ "Kéo lên tải thêm" (15/09/2026) — lấy MỘT LẦN (getDocs, KHÔNG onSnapshot)
  // một trang tin CŨ HƠN mốc `truoc` (= createdAt của tin cũ nhất đang hiện
  // trên màn). Trang gọi hàm này khi người dùng cuộn lên sát đầu khung chat —
  // xem hai trang `lop.html`/`dashboard.html` (`taiThemCu()`).
  //
  // ⛔ Cố ý KHÔNG mở thêm onSnapshot cho từng trang cũ: tin cũ gần như đứng
  // yên, mở kênh sống cho nó là tốn thêm một lượt đọc MỖI KHI có ai thả cảm
  // xúc/GV xoá tin trong đó — cùng đúng bài học "CON SỐ NÀY LÀ TIỀN" của
  // `TOI_DA_TIN` ở trên, chỉ khác là bài học đó nói về listener chính chứ
  // không phải trang phân trang này.
  //
  // Trả Promise<mảng ds> (khuôn y hệt `nghe()`, xếp CŨ -> MỚI); mảng rỗng
  // nghĩa là đã chạm tin đầu tiên của phòng — nơi gọi tự khoá không hỏi nữa.
  function taiThem(maLop, truoc, khiCo, khiLoi) {
    return db().then(function (f) {
      var q = f.fs.query(
        f.fs.collection(f.db, 'classChat', maLop, 'messages'),
        f.fs.orderBy('createdAt', 'desc'),
        f.fs.where('createdAt', '<', Number(truoc) || 0),
        f.fs.limit(TOI_DA_TIN_THEM)
      );
      return f.fs.getDocs(q);
    }).then(function (snap) {
      var ds = [];
      snap.forEach(function (d) {
        var x = d.data() || {};
        ds.push({
          id: d.id, ten: x.name || '?', ma: x.code || '',
          vaiTro: x.role === 'gv' ? 'gv' : 'hs',
          chu: chuTin(x), luc: Number(x.createdAt) || 0,
          cx: x.cx || {}, may: x.may || '',
          q: x.q || null, sticker: x.sticker || '', thuHoi: x.thuHoi === true, hinh: x.hinh || '',
          he: heChuan(x.he)
        });
      });
      ds.reverse();
      if (khiCo) khiCo(ds);
      return ds;
    })['catch'](function (e) { if (khiLoi) khiLoi(e); throw e; });
  }

  // Gửi một tin. Trả Promise; hỏng thì reject để nơi gọi báo cho người dùng.
  /* ⭐ v1.165.0 (27/09/2026 tối, bản đồ tấn công T5 — LỪA ĐẢO QUA CHAT): tin HỌC SINH không được chứa đường link.
     Lý do: mã nguồn web công khai ⇒ ai cũng dựng được trang đăng nhập GIẢ trong 10 phút, rồi nhắn vào chat lớp
     "thầy bảo vào đây làm bài" — bạn gõ mã + mật khẩu là mất tài khoản THẬT (đã đổi mật khẩu vẫn mất).
     Luật Firestore chặn thật (cùng khuôn regex, lower()); đây chỉ là CHẶN SỚM để báo lời dễ hiểu, không tốn lượt ghi.
     Thầy (role gv) vẫn gửi link bình thường. Đo trên 3.398 tin HS thật (sao lưu 27/09): đúng 1 tin có link (YouTube).
     ⛔ Đổi regex thì đổi CẢ tools/dang-luat-chong-link.js (luật) — hai bên phải giống nhau. */
  var CO_LINK = /(https?:|:\/\/|www\.|\.(com|vn|net|org|io|me|app|gg|ly|xyz|top|site|online|tv|cc|info|edu)([\/?#:]|\s|$))/;
  function coLink(chu) { return CO_LINK.test(String(chu || '').toLowerCase()); }

  function gui(maLop, tin) {
    var chu = String(tin.chu || '').trim().slice(0, TOI_DA_CHU);
    var hinh = tin.vaiTro === 'gv' && /^https:\/\/firebasestorage\.googleapis\.com\//.test(String(tin.hinh || '')) ? String(tin.hinh) : '';
    if (hinh && !chu) chu = CHU_ANH;
    if (!chu) return Promise.reject(new Error('trống'));
    if (tin.vaiTro !== 'gv' && (coLink(chu) || (tin.q && coLink(tin.q.chu)))) { var lLink = new Error('có link'); lLink.code = 'awc/co-link'; return Promise.reject(lLink); }
    // v1.168.0 — tab "thầy đăng nhập thay em" (js/thay-vao.js): chat TẮT (tin sẽ mang tên em + dấu máy của thầy ⇒ chuông báo động nhầm).
    if (window.__thayVao && tin.vaiTro !== 'gv') { var lTv = new Error('thay-vao'); lTv.code = 'awc/thay-vao'; return Promise.reject(lTv); }
    return db().then(function (f) {
      var oChat = f.fs.collection(f.db, 'classChat', maLop, 'messages');
      var goc = {
        name: String(tin.ten || '?').slice(0, 60),
        code: String(tin.ma || '').slice(0, 40),
        role: tin.vaiTro === 'gv' ? 'gv' : 'hs',
        text: chu,
        createdAt: (window.gioChuan ? window.gioChuan() : Date.now())   // v1.174.0 — giờ chuẩn (máy chủ), không theo đồng hồ máy em
      };
      /* v1.186.0 (khuôn chat kiểu Zalo, js/chat-ui.js) — trả lời một tin (`q`) + sticker. Luật kho kiểm khuôn cả hai
         (tools/dang-luat-chat-zalo.js). q.chu là bản CHÉP tin gốc ⇒ luật chặn link trong q.chu y như text. */
      if (tin.q && tin.q.id) goc.q = { id: String(tin.q.id).slice(0, 40), ten: String(tin.q.ten || '').slice(0, 60), chu: String(tin.q.chu || '').slice(0, 120) };
      if (tin.sticker && /^[a-z]{2,8}:[a-z0-9-]{2,24}$/.test(String(tin.sticker))) goc.sticker = String(tin.sticker);
      if (hinh) goc.hinh = hinh;   // v1.206.0 — chỉ thầy (luật chặn học sinh)
      /* (27/09/2026, sau tấn công Tr0ngX) Luật BẮT BUỘC dấu máy ⇒ bỏ ĐƯỜNG LÙI
         "gửi lại không kèm dấu máy" (v1.80.0) — gửi lại kiểu đó nay chắc chắn bị từ chối.
         Kho từ chối thì đổi thành lỗi dễ hiểu cho học sinh (xem chuLoi). */
      var kem = Object.assign({ may: dauMay() }, goc);
      // ⭐⭐ v1.158.0 (27/09/2026) — luật đòi PHIÊN ĐĂNG NHẬP đúng mã người gửi (token.ma == code).
      // Chờ Firebase Auth khôi phục phiên TRƯỚC khi ghi, không thì Firestore gửi đi KHÔNG kèm danh tính
      // (auth chưa kịp khởi động) và bị từ chối oan. Thầy (role gv) đi phiên thầy như cũ.
      var laHs = goc.role === 'hs';
      var choPhien = (laHs && window.NWP) ? window.NWP.phienCuaMa(goc.code)['catch'](function () { return null; }) : Promise.resolve(true);
      return choPhien.then(function (u) {
        if (laHs && window.NWP && !u) { var l0 = new Error('chưa đăng nhập'); l0.code = 'awc/can-dang-nhap'; throw l0; }
        return f.fs.addDoc(oChat, kem).then(function (ref) {
          // ⭐ v1.224.0 (02/10/2026) — tin có @Tên ⇒ thông báo người được nhắc (js/nhac-tb.js; lỗi không làm hỏng tin đã gửi)
          if (window.NhacTB && ref && /@/.test(chu)) { try { window.NhacTB.sauGuiLop(maLop, ref.id, { ten: goc.name, ma: goc.code, vaiTro: goc.role, chu: chu, luc: goc.createdAt }); } catch (x) { } }
          return ref;
        });
      })['catch'](function (e) {
        var ma = String((e && (e.code || e.message)) || '');
        if (ma.indexOf('permission-denied') < 0) throw e;
        return Promise.all([docKhanCap(), laHs ? docCam(maLop, goc.code) : Promise.resolve(null)]).then(function (k) {
          var loi = new Error('chat bị từ chối');
          loi.code = k[0].khoaChat ? 'awc/chat-khoa' : (k[1] ? 'awc/bi-cam' : 'awc/tin-bi-chan');
          throw loi;
        });
      });
    });
  }

  /* ============================================================
     🚨 27/09/2026 — CÔNG TẮC KHẨN CẤP (sau tấn công Tr0ngX)
     Tài liệu `lessonWeb/khanCap` { khoaChat, khoaDiem, luc, lyDo }. Luật Firestore:
     khoaChat ⇒ từ chối mọi tin chat mới (trừ thầy); khoaDiem ⇒ từ chối điểm AWord
     (scores + results; AWord tự giữ bài trong hộp chờ và gửi lại khi mở khoá).
     CHỈ phiên thầy ghi được. Nút bật/tắt: dashboard (thanh trên cùng, 🚨).
     Chuông báo động trên máy thầy cũng tự bật khoaChat khi thấy rác hàng loạt.
     ============================================================ */
  var KHAN_CAP_TRONG = { khoaChat: false, khoaDiem: false, luc: 0, lyDo: '' };
  function chuanKhanCap(d) {
    d = d || {};
    return { khoaChat: d.khoaChat === true, khoaDiem: d.khoaDiem === true,
             luc: Number(d.luc) || 0, lyDo: String(d.lyDo || '') };
  }
  function docKhanCap() {
    return db().then(function (f) {
      return f.fs.getDoc(f.fs.doc(f.db, 'lessonWeb', 'khanCap'));
    }).then(function (s) { return chuanKhanCap(s.exists() ? s.data() : null); },
            function () { return Object.assign({}, KHAN_CAP_TRONG); });
  }
  // Nghe sống. Trả hàm gỡ. Lỗi (mất mạng…) ⇒ coi như KHÔNG khoá, đừng chặn nhầm em.
  function ngheKhanCap(cb) {
    var go = null, huy = false;
    db().then(function (f) {
      if (huy) return;
      go = f.fs.onSnapshot(f.fs.doc(f.db, 'lessonWeb', 'khanCap'),
        function (s) { cb(chuanKhanCap(s.exists() ? s.data() : null)); },
        function () { cb(Object.assign({}, KHAN_CAP_TRONG)); });
    });
    return function () { huy = true; if (go) go(); };
  }
  // Dashboard gọi (cần phiên thầy). `vao` = { khoaChat?, khoaDiem?, lyDo? }.
  function datKhanCap(vao) {
    return db().then(function (f) {
      var d = { luc: (window.gioChuan ? window.gioChuan() : Date.now()) };
      if ('khoaChat' in vao) d.khoaChat = !!vao.khoaChat;
      if ('khoaDiem' in vao) d.khoaDiem = !!vao.khoaDiem;
      if ('lyDo' in vao) d.lyDo = String(vao.lyDo || '').slice(0, 200);
      return f.fs.setDoc(f.fs.doc(f.db, 'lessonWeb', 'khanCap'), d, { merge: true });
    });
  }

  // ⭐ #8 — Thả/gỡ cảm xúc CỦA MỘT NGƯỜI trên MỘT tin (dot-path nên không đụng
  // cảm xúc của người khác đang có trên cùng tin). `ma` rỗng = gỡ.
  // ⭐ v1.33.0 — thêm `luc` (mốc mili giây lúc thả) vào mỗi cảm xúc: dashboard
  // dùng làm MỘT trong ba dấu vết tính "hoạt động gần đây" (xem
  // `hoatDongGanDayCuaLop()` bên dashboard.html). ⛔ Không cần đổi luật
  // Firestore: luật hiện tại chỉ kiểm `cx is map`, không giới hạn các trường
  // con bên trong — thêm trường mới vẫn qua được luật cũ.
  function suaCx(maLop, tinId, maNguoi, ma, ten) {
    var khoa = String(maNguoi || '').replace(/[.$#[\]/]/g, '_');
    if (!khoa) return Promise.reject(new Error('thieu-ma-nguoi'));
    if (window.__thayVao && khoa !== 'GV') { var lTv = new Error('thay-vao'); lTv.code = 'awc/thay-vao'; return Promise.reject(lTv); }
    // v1.158.0 — luật: học sinh chỉ sửa ĐÚNG ô cảm xúc của mình (khoá = token.ma) ⇒ chờ phiên như gui().
    var choPhien = (khoa !== 'GV' && window.NWP) ? window.NWP.userHienTai()['catch'](function () { return null; }) : Promise.resolve(null);
    return choPhien.then(db).then(function (f) {
      var truong = 'cx.' + khoa;
      var patch = {};
      patch[truong] = ma ? { ma: String(ma), ten: String(ten || '?').slice(0, 60), luc: (window.gioChuan ? window.gioChuan() : Date.now()) }
                          : f.fs.deleteField();
      return f.fs.updateDoc(f.fs.doc(f.db, 'classChat', maLop, 'messages', tinId), patch);
    });
  }

  /* ⭐ v1.186.0 — CẢM XÚC KIỂU ZALO: mỗi người MỘT ô `cx.<khoá>` = {ten, luc, n:{tim:3,haha:1,…}, l:'loại thả mới nhất'}.
     Thả nhiều lần, nhiều loại; mỗi loại tối đa 10 (luật kho chặn thật). `giaTri` null = gỡ hết cảm xúc của người đó.
     Ô cũ {ma, ten, luc} vẫn đọc được (js/chat-ui.js cxChuan). `luc` giữ nguyên vai trò "hoạt động gần đây" của dashboard. */
  function datCx(maLop, tinId, maNguoi, giaTri) {
    var khoa = String(maNguoi || '').replace(/[.$#[\]/]/g, '_');
    if (!khoa) return Promise.reject(new Error('thieu-ma-nguoi'));
    if (window.__thayVao && khoa !== 'GV') { var lTv = new Error('thay-vao'); lTv.code = 'awc/thay-vao'; return Promise.reject(lTv); }
    var choPhien = (khoa !== 'GV' && window.NWP) ? window.NWP.userHienTai()['catch'](function () { return null; }) : Promise.resolve(null);
    return choPhien.then(db).then(function (f) {
      var patch = {};
      if (giaTri && giaTri.n) {
        var n = {};
        ['tim', 'haha', 'khoc', 'gian', 'wow', 'timVo'].forEach(function (k) { var x = Math.floor(Number(giaTri.n[k]) || 0); if (x > 0) n[k] = Math.min(10, x); });
        patch['cx.' + khoa] = { ten: String(giaTri.ten || '?').slice(0, 60), luc: (window.gioChuan ? window.gioChuan() : Date.now()), n: n, l: n[giaTri.l] ? giaTri.l : (Object.keys(n)[0] || '') };
      } else patch['cx.' + khoa] = f.fs.deleteField();
      return f.fs.updateDoc(f.fs.doc(f.db, 'classChat', maLop, 'messages', tinId), patch);
    });
  }

  /* ⭐ v1.186.0 — THU HỒI: tin còn chỗ trong phòng; chữ + trích + sticker + cảm xúc xoá sạch, hiện "Tin nhắn đã bị thu hồi".
     Học sinh thu hồi tin CỦA MÌNH (luật: đăng nhập đúng mã người gửi); thầy thu hồi mọi tin. Xoá hẳn vẫn là `xoa()` (chỉ thầy). */
  function thuHoi(maLop, tinId, laThayGoi) {
    if (window.__thayVao && !laThayGoi) { var lTv = new Error('thay-vao'); lTv.code = 'awc/thay-vao'; return Promise.reject(lTv); }
    var choPhien = (!laThayGoi && window.NWP) ? window.NWP.userHienTai()['catch'](function () { return null; }) : Promise.resolve(null);
    return choPhien.then(db).then(function (f) {
      var refTin = f.fs.doc(f.db, 'classChat', maLop, 'messages', tinId);
      var lenhThu = { thuHoi: true, text: '', cx: {}, q: f.fs.deleteField(), sticker: f.fs.deleteField(), hinh: f.fs.deleteField() };
      var thuTron = function () { return f.fs.updateDoc(refTin, lenhThu); };
      /* ⭐ v1.206.0 — BẢN CHÉP cho thầy: đọc tin gốc (1 lượt đọc) rồi CÙNG MỘT LƯỢT GHI vừa cất bản chép
         `classChat/<lớp>/thuHoi/<id>` (chỉ thầy đọc — dashboard hiện dưới "Tin nhắn đã bị thu hồi") vừa thu hồi.
         Luật đối chiếu bản chép với tin gốc từng chữ. Kho từ chối bản chép (luật chưa đăng…) ⇒ vẫn thu hồi như cũ. */
      return f.fs.getDoc(refTin).then(function (s) {
        var x = s.exists() ? (s.data() || {}) : null;
        if (!x || x.thuHoi === true) return thuTron();
        var chep = { text: x.text || '', name: x.name || '', code: x.code || '', luc: (window.gioChuan ? window.gioChuan() : Date.now()) };
        ['q', 'sticker', 'hinh'].forEach(function (k) { if (x[k] != null) chep[k] = x[k]; });
        var b = f.fs.writeBatch(f.db);
        b.set(f.fs.doc(f.db, 'classChat', maLop, 'thuHoi', tinId), chep);
        b.update(refTin, lenhThu);
        return b.commit()['catch'](function (e) {
          if (String((e && (e.code || e.message)) || '').indexOf('permission-denied') < 0) throw e;
          return thuTron();
        });
      }, function () { return thuTron(); });
    });
  }

  // ⭐ v1.206.0 — dashboard: đọc bản chép một tin đã thu hồi ⇒ {chu, q, sticker, hinh} | null (tin thu hồi trước bản này: null).
  function docThuHoi(maLop, tinId) {
    return db().then(function (f) {
      return f.fs.getDoc(f.fs.doc(f.db, 'classChat', maLop, 'thuHoi', tinId));
    }).then(function (s) {
      if (!s.exists()) return null;
      var x = s.data() || {};
      return { chu: chuTin(x), q: x.q || null, sticker: x.sticker || '', hinh: x.hinh || '' };
    });
  }

  // ⭐ v1.206.0 — thầy gửi ảnh: nén JPEG (cạnh dài ≤1280px) ⇒ Storage `classChat/<lớp>/<tên>.jpg` ⇒ URL tải về.
  function docAnh(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' })['catch'](function () { return docAnhCu(file); });
    }
    return docAnhCu(file);
  }
  function docAnhCu(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(url); res(im); };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Không đọc được ảnh')); };
      im.src = url;
    });
  }
  function nenAnh(file) {
    return docAnh(file).then(function (im) {
      var w = im.width || im.naturalWidth, h = im.height || im.naturalHeight, ty = Math.min(1, 1280 / Math.max(w, h));
      var cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w * ty)); cv.height = Math.max(1, Math.round(h * ty));
      var c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);   // PNG trong suốt ⇒ nền trắng
      c.drawImage(im, 0, 0, cv.width, cv.height);
      if (im.close) try { im.close(); } catch (e) {}
      var ra = function (cl) { return new Promise(function (r) { cv.toBlob(r, 'image/jpeg', cl); }); };
      return ra(0.85).then(function (b) { return b && b.size > 1.5 * 1024 * 1024 ? ra(0.6) : b; });
    }).then(function (b) { if (!b) throw new Error('Không nén được ảnh'); return b; });
  }
  function guiAnh(maLop, file) {
    if (!file || !/^image\//.test(file.type || '')) return Promise.reject(new Error('Chỉ gửi được file ảnh.'));
    return Promise.all([nenAnh(file), db()]).then(async function (k) {
      var appMod = await import(SDK + '/firebase-app.js');
      var st = await import(SDK + '/firebase-storage.js');
      var ten = Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '.jpg';
      var r = st.ref(st.getStorage(appMod.getApp()), 'classChat/' + String(maLop).replace(/[^0-9A-Za-z_-]/g, '_').slice(0, 40) + '/' + ten);
      await st.uploadBytes(r, k[0], { contentType: 'image/jpeg', cacheControl: 'public,max-age=31536000' });
      return st.getDownloadURL(r);
    });
  }

  /* ============================================================
     🔇 v1.216.0 (01/10/2026) — CẤM CHAT TỪNG EM (thầy bấm đúp avatar em trong chat dashboard)
     Kho: classChatCam/{lớp}/em/{mã em} = { ten, den, luc }   den = mốc ms HẾT cấm (giờ máy chủ quyết)
       · Đọc: CHỈ chính em đó (đăng nhập đúng mã) + thầy — bạn cùng lớp không đọc được ai đang bị cấm.
       · Ghi/xoá: chỉ thầy. Luật classChat: tin + cảm xúc của em bị từ chối khi den > request.time
         ⇒ HẾT GIỜ LÀ TỰ MỞ, không cần ai xoá tài liệu (trang em đặt hẹn giờ để mở ô nhập đúng lúc).
     Tin hệ thống trong phòng: role 'gv' + he = {loai:'cam', ten} — chữ "<TÊN> đã bị Thầy Andrew cấm chat!",
     KHÔNG ghi thời hạn (thầy chốt: trong tin không hiện, nhưng vẫn có hiệu lực). Luật: tools/dang-luat-cam-chat.js.
     ============================================================ */
  function heChuan(h) {
    if (!h || typeof h !== 'object' || h.loai !== 'cam') return null;
    return { loai: 'cam', ten: String(h.ten || '?').slice(0, 60) };
  }
  function khoaMa(ma) { return String(ma || '').replace(/[^0-9A-Za-z_-]/g, '_').slice(0, 60); }
  function camChuan(x) {
    var den = Number(x && x.den) || 0;
    var nay = window.gioChuan ? window.gioChuan() : Date.now();
    return den > nay ? { ten: String(x.ten || ''), den: den, luc: Number(x.luc) || 0 } : null;
  }
  // Đọc MỘT lần: em còn đang bị cấm? ⇒ {ten, den, luc} | null (lỗi/không có ⇒ null).
  function docCam(maLop, ma) {
    if (!ma) return Promise.resolve(null);
    return db().then(function (f) {
      return f.fs.getDoc(f.fs.doc(f.db, 'classChatCam', maLop, 'em', khoaMa(ma)));
    }).then(function (s) { return s.exists() ? camChuan(s.data()) : null; }, function () { return null; });
  }
  // Trang em: nghe sống ô cấm CỦA MÌNH. cb(null | {ten, den, luc}). Trả hàm gỡ. Lỗi ⇒ coi như không cấm (luật vẫn chặn thật).
  function ngheCam(maLop, ma, cb) {
    var go = null, huy = false;
    if (!ma || ma === 'GV') { cb(null); return function () {}; }
    var choPhien = window.NWP ? window.NWP.userHienTai()['catch'](function () { return null; }) : Promise.resolve(null);
    choPhien.then(db).then(function (f) {
      if (huy) return;
      go = f.fs.onSnapshot(f.fs.doc(f.db, 'classChatCam', maLop, 'em', khoaMa(ma)),
        function (s) { if (!huy) cb(s.exists() ? (s.data() || {}) : null); },
        function () { if (!huy) cb(null); });
    });
    return function () { huy = true; if (go) { try { go(); } catch (e) {} } };
  }
  // Dashboard: nghe danh sách em bị cấm của MỘT lớp (chỉ thầy đọc được). cb({ <mã>: {ten, den, luc} }) — cả ô đã hết hạn.
  function ngheDsCam(maLop, cb) {
    var go = null, huy = false;
    db().then(function (f) {
      if (huy) return;
      go = f.fs.onSnapshot(f.fs.collection(f.db, 'classChatCam', maLop, 'em'), function (snap) {
        var m = {}; snap.forEach(function (d) { m[d.id] = d.data() || {}; });
        if (!huy) cb(m);
      }, function () { if (!huy) cb({}); });
    });
    return function () { huy = true; if (go) { try { go(); } catch (e) {} } };
  }
  // Thầy cấm em `gio` tiếng: CÙNG MỘT LƯỢT GHI đặt ô cấm + gửi tin hệ thống vào phòng.
  function camChat(maLop, ma, ten, gio) {
    var soGio = Number(gio);
    if (!ma || ma === 'GV') return Promise.reject(new Error('Không cấm được người này.'));
    if (!(soGio > 0) || soGio > 24 * 30) return Promise.reject(new Error('Số giờ cấm phải từ lớn hơn 0 tới 720.'));
    var tenEm = String(ten || '?').slice(0, 60);
    return db().then(function (f) {
      var nay = window.gioChuan ? window.gioChuan() : Date.now();
      var b = f.fs.writeBatch(f.db);
      b.set(f.fs.doc(f.db, 'classChatCam', maLop, 'em', khoaMa(ma)), { ten: tenEm, den: Math.round(nay + soGio * 3600e3), luc: nay });
      b.set(f.fs.doc(f.fs.collection(f.db, 'classChat', maLop, 'messages')), {
        name: 'Thầy Andrew', code: 'GV', role: 'gv', text: tenEm + ' đã bị Thầy Andrew cấm chat!',
        createdAt: nay, may: dauMay(), he: { loai: 'cam', ten: tenEm }
      });
      return b.commit();
    });
  }
  // Bỏ cấm sớm (không gửi tin gì vào phòng).
  function boCam(maLop, ma) {
    return db().then(function (f) { return f.fs.deleteDoc(f.fs.doc(f.db, 'classChatCam', maLop, 'em', khoaMa(ma))); });
  }
  // Mọi tin MỘT em đã gửi trong phòng (đọc MỘT lần — chỉ thầy dùng, lúc mở hộp quản lý em). TIN_EM_TRAN = trần an toàn.
  // ⛔ Cố ý KHÔNG orderBy: where(code)+orderBy(createdAt) đòi chỉ mục ghép (khoá quản trị không có quyền tạo — đo 01/10/2026)
  //   ⇒ lấy HẾT tin của em rồi xếp ở máy. Đừng thêm limit nhỏ: không orderBy thì limit cắt theo id NGẪU NHIÊN, không phải tin mới nhất.
  var TIN_EM_TRAN = 2000;
  function tinCuaEm(maLop, ma) {
    return db().then(function (f) {
      return f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'classChat', maLop, 'messages'),
        f.fs.where('code', '==', String(ma || '')), f.fs.limit(TIN_EM_TRAN)));
    }).then(function (snap) {
      var ds = [];
      snap.forEach(function (d) {
        var x = d.data() || {};
        ds.push({ id: d.id, ten: x.name || '?', ma: x.code || '', vaiTro: x.role === 'gv' ? 'gv' : 'hs', chu: chuTin(x),
                  luc: Number(x.createdAt) || 0, sticker: x.sticker || '', thuHoi: x.thuHoi === true, hinh: x.hinh || '', q: x.q || null });
      });
      ds.sort(function (a, b) { return b.luc - a.luc; });   // mới nhất lên đầu
      return ds;
    });
  }
  // Xoá hẳn NHIỀU tin một lượt (chỉ thầy). Gói ≤ 400 lệnh/lượt ghi.
  function xoaNhieu(maLop, ids) {
    ids = (ids || []).filter(Boolean);
    return db().then(function (f) {
      var lo = [];
      for (var i = 0; i < ids.length; i += 400) {
        var b = f.fs.writeBatch(f.db);
        ids.slice(i, i + 400).forEach(function (id) { b.delete(f.fs.doc(f.db, 'classChat', maLop, 'messages', id)); });
        lo.push(b.commit());
      }
      return Promise.all(lo).then(function () { return ids.length; });
    });
  }

  // Xoá MỘT tin. Không có đăng nhập thật nên trang gọi hàm này TỰ CHỊU TRÁCH
  // NHIỆM kiểm "ai được xoá tin nào" ở phía giao diện — xem đầu file.
  function xoa(maLop, tinId) {
    return db().then(function (f) {
      return f.fs.deleteDoc(f.fs.doc(f.db, 'classChat', maLop, 'messages', tinId));
    });
  }

  // ⭐ Đợt D — "Lưu trữ & làm mới": chép NGUYÊN mảng tin đang có vào một tài
  // liệu kho, để dashboard xoá sạch phòng mà không mất dấu vết cũ.
  function luuKho(maLop, tenLop, dsTin) {
    return db().then(function (f) {
      return f.fs.addDoc(f.fs.collection(f.db, 'classChatArchive'), {
        lop: String(maLop || ''), tenLop: String(tenLop || maLop || ''),
        luc: (window.gioChuan ? window.gioChuan() : Date.now()), soTin: (dsTin || []).length,
        tin: (dsTin || []).map(function (t) {
          /* ⭐ v1.80.0 — giữ luôn dấu máy vào kho lưu trữ, để sau khi "làm mới"
             phòng chat thầy vẫn tra ngược được. Luật `classChatArchive` KHÔNG
             cần đổi: nó chỉ kiểm `tin is list`, không soi bên trong. */
          return { ten: t.ten, ma: t.ma, vaiTro: t.vaiTro, chu: t.chu, luc: t.luc,
                   cx: t.cx || {}, may: t.may || '',
                   q: t.q || null, sticker: t.sticker || '', thuHoi: !!t.thuHoi, hinh: t.hinh || '', he: t.he || null };   /* v1.186.0 · hinh v1.206.0 · he v1.216.0 */
        })
      });
    });
  }

  // ⭐ 28/08 — CHẤM ĐỎ báo tin mới trên nút lớp (dashboard.html): đọc MỘT LẦN
  // (getDocs, không giữ kênh sống như nghe() ở trên) tin mới nhất của MỘT lớp
  // — đúng 1 lượt đọc Firestore mỗi lần gọi. Dashboard gọi hàm này cho mọi lớp
  // ĐÚNG MỘT LẦN lúc mở/tải lại trang (thầy chốt: rẻ hơn giữ listener sống cho
  // cả chục lớp cùng lúc — xem mục 0‼ luật 8️⃣ trong BAN GIAO.md, cùng họ bẫy
  // vừa làm cạn hạn mức 429 sáng 28/08). Trả về mốc `createdAt` (ms) của tin
  // mới nhất, hoặc 0 nếu lớp chưa ai nhắn gì.
  function tinMoiNhat(maLop) {
    return db().then(function (f) {
      var q = f.fs.query(
        f.fs.collection(f.db, 'classChat', maLop, 'messages'),
        f.fs.orderBy('createdAt', 'desc'),
        f.fs.limit(1)
      );
      return f.fs.getDocs(q);
    }).then(function (snap) {
      var luc = 0;
      snap.forEach(function (d) { luc = Number((d.data() || {}).createdAt) || 0; });
      return luc;
    });
  }

  // Danh sách gói đã lưu của MỘT lớp, mới nhất trước.
  function dsKho(maLop) {
    return db().then(function (f) {
      var q = f.fs.query(
        f.fs.collection(f.db, 'classChatArchive'),
        f.fs.where('lop', '==', maLop),
        f.fs.orderBy('luc', 'desc'),
        f.fs.limit(30)
      );
      return f.fs.getDocs(q);
    }).then(function (snap) {
      var ra = [];
      snap.forEach(function (d) { ra.push(Object.assign({ id: d.id }, d.data())); });
      return ra;
    });
  }

  // "Hôm nay 16:02" / "Hôm qua 20:15" / "18/8 20:15"
  function chuGio(ms) {
    if (!ms) return '';
    var d = new Date(ms), nay = new Date();
    var hai = function (n) { return (n < 10 ? '0' : '') + n; };
    var gio = d.getHours() + ':' + hai(d.getMinutes());
    var cungNgay = function (a, b) {
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
    };
    if (cungNgay(d, nay)) return 'Hôm nay ' + gio;
    var homQua = new Date(nay.getFullYear(), nay.getMonth(), nay.getDate() - 1);
    if (cungNgay(d, homQua)) return 'Hôm qua ' + gio;
    return d.getDate() + '/' + (d.getMonth() + 1) + ' ' + gio;
  }

  // Lỗi `permission-denied` = thầy chưa dán luật. Nói thẳng ra chứ đừng để
  // khung chat trống trơn rồi ai cũng tưởng "lớp chưa ai nhắn gì".
  function chuLoi(e) {
    var ma = (e && (e.code || e.message)) || '';
    // (27/09/2026) hai lỗi dành cho HỌC SINH — đặt bởi gui()
    if (ma === 'awc/chat-khoa') return 'Chat đang tạm khoá, em quay lại sau nhé.';
    if (ma === 'awc/bi-cam') return 'Em đang bị cấm chat.';
    if (ma === 'awc/co-link') return 'Chat lớp không gửi được đường link. Em cần gửi link thì nhờ thầy gửi giúp nhé.';
    if (ma === 'awc/tin-bi-chan') return 'Tin chưa gửi được. Em bỏ đường link (nếu có) rồi gửi lại nhé.';
    if (ma === 'awc/can-dang-nhap') return 'Phiên đăng nhập đã hết. Em tải lại trang và đăng nhập lại nhé.';
    if (ma === 'awc/thay-vao') return 'Đang đăng nhập thay em — chat tắt. Thầy nhắn bằng tên mình ở dashboard nhé.';
    if (String(ma).indexOf('permission-denied') >= 0) {
      // ⭐ v1.52.0 (gói bảo mật C): xoá tin · tin ký THẦY · lưu trữ nay đòi PHIÊN THẦY
      // (js/thay.js). Học sinh nhắn/thả cảm xúc vẫn không cần đăng nhập.
      return 'Kho từ chối: việc này cần phiên của thầy (nút 🔐 ở dashboard hoặc mở từ app myLesson) — hoặc luật Firestore chưa dán.';
    }
    return 'Chưa nối được kho tin nhắn. Thử tải lại trang nhé.';
  }

  window.AWChat = {
    nghe: nghe, thoi: thoi, gui: gui, suaCx: suaCx, xoa: xoa,
    datCx: datCx, thuHoi: thuHoi,      /* ⭐ v1.186.0 — khuôn chat kiểu Zalo (js/chat-ui.js) */
    ngheXem: ngheXem, ghiXem: ghiXem,       /* ⭐ v1.210.0 — "đã xem" tin cuối */
    guiAnh: guiAnh, docThuHoi: docThuHoi,   /* ⭐ v1.206.0 — ảnh của thầy + bản chép tin thu hồi (chỉ thầy) */
    taiThem: taiThem, TOI_DA_TIN_THEM: TOI_DA_TIN_THEM,
    luuKho: luuKho, dsKho: dsKho, tinMoiNhat: tinMoiNhat,
    chuGio: chuGio, chuLoi: chuLoi, TOI_DA_CHU: TOI_DA_CHU, coLink: coLink,
    dauMay: dauMay,                    /* ⭐ v1.80.0 — xem khối "DẤU MÁY" đầu file */
    ngheKhanCap: ngheKhanCap, docKhanCap: docKhanCap, datKhanCap: datKhanCap,   /* 🚨 27/09/2026 */
    docCam: docCam, ngheCam: ngheCam, ngheDsCam: ngheDsCam, camChat: camChat, boCam: boCam,   /* 🔇 v1.216.0 — cấm chat từng em */
    camChuan: camChuan, tinCuaEm: tinCuaEm, xoaNhieu: xoaNhieu, TIN_EM_TRAN: TIN_EM_TRAN,
    // ⭐ v1.38.0 — mở CỬA FIREBASE dùng chung cho khối khác (js/vi-qua.js đọc
    // kho quà `quaTang/catalog`). ⛔ Nơi khác ĐỪNG tự `initializeApp` /
    // `getFirestore()` lần nữa: cùng một app gọi hai lần là dính
    // `duplicate-app` hoặc `failed-precondition` ⇒ chat chết câm (v1.17.0).
    kho: db
  };
})();
