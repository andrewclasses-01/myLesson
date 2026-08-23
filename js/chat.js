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

   ⛔⛔ CHƯA DÁN LUẬT FIRESTORE THÌ CHAT KHÔNG CHẠY (báo `permission-denied`).
   Thầy vào Firebase Console → Firestore Database → Rules, thêm khối này vào
   TRONG `match /databases/{database}/documents { … }`, rồi bấm Publish:

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
         allow update, delete: if false;
       }

   ⚠️ Luật này cho AI CŨNG ĐỌC VÀ GỬI ĐƯỢC (không đòi đăng nhập) — đúng mức tin
   cậy mà cả hệ này đang có: mã học sinh vốn nằm công khai trong `lop.json`.
   Đổi lại nó CHẶN sửa/xoá tin, chặn tin quá dài, chặn thêm trường lạ.
   ⛔ Đừng nới `allow update, delete` — sửa được tin là mất dấu vết hội thoại.
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
  var _p = null;
  function db() {
    if (!_p) {
      _p = (async function () {
        var appMod = await import(SDK + '/firebase-app.js');
        var fsMod = await import(SDK + '/firebase-firestore.js');
        var app = appMod.initializeApp(CAU_HINH);
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
            chu: x.text || '', luc: Number(x.createdAt) || 0
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
    nghe: nghe, thoi: thoi, gui: gui,
    chuGio: chuGio, chuLoi: chuLoi, TOI_DA_CHU: TOI_DA_CHU
  };
})();
