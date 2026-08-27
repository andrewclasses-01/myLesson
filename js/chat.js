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
  var TOI_DA_TIN = 200;      // chỉ kéo về 200 tin gần nhất

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
        return { fs: fsMod, db: fsMod.getFirestore(app) };
      })();
    }
    return _p;
  }

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
            chu: x.text || '', luc: Number(x.createdAt) || 0,
            cx: x.cx || {}
          });
        });
        ds.reverse();                              // Firestore trả mới->cũ, ta hiện cũ->mới
        khiCo(ds);
      }, function (e) {
        if (khiLoi) khiLoi(e);
      });
    })['catch'](function (e) { if (khiLoi) khiLoi(e); });
  }

  function thoi() {
    if (dungNghe) { try { dungNghe(); } catch (e) {} }
    dungNghe = null;
    phongDangNghe = '';
  }

  // Gửi một tin. Trả Promise; hỏng thì reject để nơi gọi báo cho người dùng.
  function gui(maLop, tin) {
    var chu = String(tin.chu || '').trim().slice(0, TOI_DA_CHU);
    if (!chu) return Promise.reject(new Error('trống'));
    return db().then(function (f) {
      return f.fs.addDoc(f.fs.collection(f.db, 'classChat', maLop, 'messages'), {
        name: String(tin.ten || '?').slice(0, 60),
        code: String(tin.ma || '').slice(0, 40),
        role: tin.vaiTro === 'gv' ? 'gv' : 'hs',
        text: chu,
        createdAt: Date.now()
      });
    });
  }

  // ⭐ #8 — Thả/gỡ cảm xúc CỦA MỘT NGƯỜI trên MỘT tin (dot-path nên không đụng
  // cảm xúc của người khác đang có trên cùng tin). `ma` rỗng = gỡ.
  function suaCx(maLop, tinId, maNguoi, ma, ten) {
    var khoa = String(maNguoi || '').replace(/[.$#[\]/]/g, '_');
    if (!khoa) return Promise.reject(new Error('thieu-ma-nguoi'));
    return db().then(function (f) {
      var truong = 'cx.' + khoa;
      var patch = {};
      patch[truong] = ma ? { ma: String(ma), ten: String(ten || '?').slice(0, 60) } : f.fs.deleteField();
      return f.fs.updateDoc(f.fs.doc(f.db, 'classChat', maLop, 'messages', tinId), patch);
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
        luc: Date.now(), soTin: (dsTin || []).length,
        tin: (dsTin || []).map(function (t) {
          return { ten: t.ten, ma: t.ma, vaiTro: t.vaiTro, chu: t.chu, luc: t.luc, cx: t.cx || {} };
        })
      });
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
    if (String(ma).indexOf('permission-denied') >= 0) {
      return 'Kho tin chưa mở khoá (thầy cần dán luật Firestore — xem đầu file js/chat.js).';
    }
    return 'Chưa nối được kho tin nhắn. Thử tải lại trang nhé.';
  }

  window.AWChat = {
    nghe: nghe, thoi: thoi, gui: gui, suaCx: suaCx, xoa: xoa,
    luuKho: luuKho, dsKho: dsKho,
    chuGio: chuGio, chuLoi: chuLoi, TOI_DA_CHU: TOI_DA_CHU
  };
})();
