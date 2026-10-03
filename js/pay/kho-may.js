/* ⛔ FILE SINH TỰ ĐỘNG từ kho myPay v0.15.0 (76d57ee) bằng tools/dong-goi-web.js — ĐỪNG SỬA TAY (sửa ở kho myPay rồi đóng gói lại) */
/* ============================================================
   myPay WEB — KHO MẠNG (kho-may.js) · Đợt 1 (03/10/2026)

   Nối "máy ảo" (may-ao.js) với Firestore:
   • Nạp lúc mở trang (CHỈ THẦY — luật Firestore laThay()):
       payKho/*                    → E:\LAP TRINH APP\myPay-data\…   (dữ liệu riêng của myPay: cài đặt, gia đình, tháng…)
       mystudentRosterStudents/Classes → myStudent-data\shared\hoc_sinh.json + lop.json (lọc y như myStudent xuất)
       mystudentSoDiemDanh (từ mốc "Các tháng") → myData\Diem danh\<d-m-yyyy>.json (đổi id sang SỐ myPay)
       payMaHs/so + payMaHs/ngay-yyyy-MM → bảng số myPay + bảng nối danh tính từng ngày (xem nap-du-lieu.js)
   • Sau MỖI thao tác (mỗi kênh IPC): file nào myPay vừa ghi trong myPay-data ⇒ ghi lên payKho/<file> bằng
     GIAO DỊCH có số PHIÊN: máy khác vừa ghi trước (phiên lệch) ⇒ KHÔNG đè, nạp lại + báo thầy làm lại.
     Sao lưu (_backup-*) ⇒ payKhoSaoLuu (chỉ thêm).
   • Nghe payKho trực tiếp: điện thoại sửa ⇒ máy tính tự cập nhật (và ngược lại).
   Lượt đọc mỗi lần mở ≈ 12 (payKho) + ~6 (payMaHs) + ~276 (danh sách) + số ngày điểm danh từ mốc "Các tháng".
   ============================================================ */
(function () {
  'use strict';
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
  var CAU_HINH = {
    apiKey: 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY', authDomain: 'aword-70dae.firebaseapp.com', projectId: 'aword-70dae',
    storageBucket: 'aword-70dae.firebasestorage.app', messagingSenderId: '399279049436', appId: '1:399279049436:web:b9b34dcfb34732aa744219'
  };
  var EMAIL_THAY = 'namdaptrai01@gmail.com';
  var DUOI_QT = '@quantri.andrewclasses.com';
  var GOC_E = 'E:\\LAP TRINH APP';
  var DIR_DATA = GOC_E + '\\myPay-data';
  var DIR_SO = GOC_E + '\\myData\\Diem danh';
  var DIR_SHARED = GOC_E + '\\myStudent-data\\shared';
  var DIR_TAI = GOC_E + '\\_tai-len';
  var ND = window.NapDuLieu;
  var G = window.MyPayGoi;

  // ───────── màn chờ / màn chặn ─────────
  function man(chu, loi) {
    var m = document.getElementById('pyMan');
    if (!m) return;
    m.hidden = !chu;
    m.classList.toggle('loi', !!loi);
    var c = document.getElementById('pyManChu'); if (c) c.innerHTML = chu || '';
  }
  function bao(chu) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = chu; t.classList.add('on');
    clearTimeout(bao._h); bao._h = setTimeout(function () { t.classList.remove('on'); }, 3200);
  }

  // ───────── máy ảo + code myPay ─────────
  var hetSan; var loiSan;
  var san = new Promise(function (a, b) { hetSan = a; loiSan = b; });
  var dangDoi = new Set();          // file myPay-data vừa ghi, chưa lên mạng (đường tương đối)
  var daXoa = new Set();
  var saoLuu = [];                  // [{duong, noiDung}]
  var PHIEN = new Map();            // đường tương đối → phiên đang có trên mạng
  var K = null;                     // { fs, db, au, a, uid }

  function relCua(p) {
    var x = String(p); var d = DIR_DATA + '\\';
    if (x.toLowerCase().indexOf(d.toLowerCase()) !== 0) return null;
    return x.slice(d.length);
  }
  var tenDoc = function (rel) { return rel.replace(/\\/g, '__'); };
  var relTuDoc = function (id) { return id.replace(/__/g, '\\'); };
  function laDongBo(rel) {   // file nào được đồng bộ lên payKho
    return /^[^\\]+\.json$/i.test(rel) && rel.toLowerCase() !== 'cua-so.json' || /^thang\\\d{4}-\d{2}\.json$/i.test(rel);
  }

  var may = MayAo.taoMay({
    chiDoc: [GOC_E + '\\myData', GOC_E + '\\myStudent-data'],
    cuaSo: window, phienBan: G.__PHIEN_BAN + ' web', san: san,
    sauMoiKenh: function (kenh, kq) { return luuLenMang().then(function () { return kq; }, function (e) { return loiLuu(e); }); },
    chonFile: chonFileTuMay,
    duongFile: function () { return ''; }
  });
  may.nghe(function (p, kieu) {
    var rel = relCua(p); if (!rel || /\.tmp$/i.test(rel)) return;
    if (/^_backup/i.test(rel)) { if (kieu === 'ghi') saoLuu.push({ duong: rel, noiDung: may.layFile(p) }); return; }
    if (!laDongBo(rel)) return;
    if (kieu === 'xoa') { daXoa.add(rel); dangDoi.delete(rel); } else { dangDoi.add(rel); daXoa.delete(rel); }
  });
  var nap = may.taoNap(G);
  nap(G.__CHINH);     // main.js: đăng ký mọi kênh IPC (y như app)
  nap(G.__CAU);       // preload.js: dựng window.mypay (y như app)

  // ───────── vài kênh riêng của web (thay chỗ chỉ có trên máy tính) ─────────
  function bocWeb(fn) { return function () { var a = Array.prototype.slice.call(arguments, 1); return Promise.resolve().then(function () { return fn.apply(null, a); }).then(function (d) { return { ok: true, data: d }; }, function (e) { return { ok: false, loi: String((e && e.message) || e) }; }); }; }
  function dataUrlRaBlob(u) {
    var m = /^data:([^;]+);base64,(.*)$/.exec(u); var bin = atob(m[2]); var b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return new Blob([b], { type: m[1] });
  }
  may.KENH['hoadon:ghi'] = bocWeb(function (tenFile, dataUrl) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(dataUrlRaBlob(dataUrl)); a.download = String(tenFile || 'hoa-don') .replace(/[\\/:*?"<>|]+/g, '-') + (/\.png$/i.test(tenFile) ? '' : '.png');
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return 'thư mục Tải xuống của máy';      // giao diện tự ghép thành "Đã lưu: thư mục Tải xuống của máy"
  });
  may.KENH['hoadon:saochep'] = bocWeb(function (dataUrl) {
    if (!navigator.clipboard || !window.ClipboardItem) throw new Error('Trình duyệt này không cho chép ảnh — bấm "Tải ảnh" thay thế');
    return navigator.clipboard.write([new ClipboardItem({ 'image/png': dataUrlRaBlob(dataUrl) })]).then(function () { return true; });
  });
  may.KENH['hoadon:moThuMuc'] = bocWeb(function () { throw new Error('Trên web ảnh hóa đơn nằm ở thư mục Tải xuống của máy'); });
  may.KENH['saoke:mo'] = bocWeb(function () { throw new Error('Trên web không mở lại được file Excel gốc'); });
  may.KENH['fs:trangthai'] = bocWeb(function () { return { coKhoa: true }; });
  may.KENH['app:thongtin'] = bocWeb(function () { return { version: G.__PHIEN_BAN + ' web', dataDir: 'Firestore (payKho)' }; });
  may.KENH['fs:day'] = bocWeb(function () { throw new Error('Đẩy hóa đơn lên trang học sinh: làm ở Đợt 3'); });

  // chọn file sao kê (Đợt 2 dùng): đọc file vào ổ ảo, trả đường dẫn giả
  function chonFileTuMay() {
    return new Promise(function (xong) {
      var i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = '.xlsx,.xlsm';
      i.onchange = function () {
        var ds = Array.prototype.slice.call(i.files || []);
        Promise.all(ds.map(function (f) { return f.arrayBuffer().then(function (b) { var p = DIR_TAI + '\\' + f.name; may.datFile(p, new Uint8Array(b)); return p; }); }))
          .then(function (ps) { xong({ canceled: !ps.length, filePaths: ps }); });
      };
      i.click();
    });
  }

  // ───────── Firestore ─────────
  function moKho() {
    if (window.PayBanThu) return window.PayBanThu.san;     // bàn thử trên máy (ban-thu.js tự kiểm localhost + ?banthu)
    return Promise.all([import(SDK + '/firebase-app.js'), import(SDK + '/firebase-auth.js'), import(SDK + '/firebase-firestore.js')]).then(function (m) {
      var app = m[0].getApps().length ? m[0].getApp() : m[0].initializeApp(CAU_HINH);
      return { fs: m[2], db: m[2].getFirestore(app), au: m[1], a: m[1].getAuth(app) };
    });
  }
  // Có phải thầy không — cùng luật js/thay.js (tài khoản quản trị phải có claim thay; Google đúng email; token app ký uid 'thay').
  function laThay(k, u) {
    if (!u) return Promise.resolve(false);
    if (u.uid === 'thay') return Promise.resolve(true);
    var qt = u.email && u.email.slice(-DUOI_QT.length) === DUOI_QT;
    if (!qt && !(u.email === EMAIL_THAY && u.emailVerified)) return Promise.resolve(false);
    return u.getIdTokenResult().then(function (t) { return qt ? t.claims.thay === true : true; }, function () { return false; });
  }
  function choPhien(k) {
    return new Promise(function (xong) {
      var dung = k.au.onAuthStateChanged(k.a, function (u) { dung(); laThay(k, u).then(function (ok) { xong(ok ? u : null); }); });
    });
  }

  var bangSo = null;                // payMaHs/so
  var bangThang = {};               // 'yyyy-MM' → { ngay: {...} }
  var thangDoi = new Set();         // bảng ngày tháng nào vừa dựng lại (cần ghi lên)
  var nguon = { hs: [], lop: [] };

  function docTatCa(q) { return K.fs.getDocs(q).then(function (s) { return s.docs.map(function (d) { var o = d.data(); o.__id = d.id; return o; }); }); }

  function napPayKho() {
    return docTatCa(K.fs.collection(K.db, 'payKho')).then(function (ds) {
      ds.forEach(function (d) {
        var rel = relTuDoc(d.__id);
        if (d.xoa) { may.xoaFile(DIR_DATA + '\\' + rel); } else may.datFile(DIR_DATA + '\\' + rel, String(d.json || ''));
        PHIEN.set(rel, Number(d.phien) || 0);
      });
      return ds.length;
    });
  }

  function napDiemDanh(tuIso) {
    return Promise.all([
      docTatCa(K.fs.collection(K.db, 'mystudentRosterStudents')),
      docTatCa(K.fs.collection(K.db, 'mystudentRosterClasses')),
      docTatCa(K.fs.collection(K.db, 'payMaHs')),
      docTatCa(K.fs.query(K.fs.collection(K.db, 'mystudentSoDiemDanh'), K.fs.where('ngay', '>=', tuIso)))
    ]).then(function (r) {
      nguon.hs = r[0]; nguon.lop = r[1];
      r[2].forEach(function (d) {
        if (d.__id === 'so') bangSo = { so: d.so || {}, tiep: d.tiep || ND.SO_DAU };
        else if (/^ngay-/.test(d.__id)) bangThang[d.__id.slice(5)] = { ngay: d.ngay || {} };
      });
      if (!bangSo) bangSo = { so: {}, tiep: ND.SO_DAU };
      var soDocs = r[3];
      var rosterTheoGid = new Map(nguon.hs.map(function (h) { return [h.gid, h]; }));
      // bảng ngày đã có (mọi tháng) để học id
      var tatCaNgay = {};
      Object.keys(bangThang).forEach(function (t) { Object.assign(tatCaNgay, bangThang[t].ngay); });
      var idHoc = ND.hocIdTuBang(tatCaNgay);
      // ngày nào CHƯA nối hoặc sổ đã đổi từ lần nối trước ⇒ đọc AttRows đúng ngày đó (~50 lượt) rồi nối lại
      var canNoi = soDocs.filter(function (d) { var t = ND.thangCuaNgayHt(d.ngay_hien_thi); var b = bangThang[t] && bangThang[t].ngay[d.ngay_hien_thi]; return !b || b.luc !== (d.cap_nhat_luc || ''); });
      return canNoi.reduce(function (p, d) {
        return p.then(function () {
          var iso = ND.isoTuNgayHt(d.ngay_hien_thi);
          return docTatCa(K.fs.query(K.fs.collection(K.db, 'mystudentAttRows'), K.fs.where('date', '==', iso))).then(function (rows) {
            var kq = ND.noiMotNgay(JSON.parse(d.cac_lop || '[]'), rows, rosterTheoGid, idHoc);
            var t = ND.thangCuaNgayHt(d.ngay_hien_thi);
            (bangThang[t] = bangThang[t] || { ngay: {} }).ngay[d.ngay_hien_thi] = { luc: d.cap_nhat_luc || '', ids: kq.ids };
            thangDoi.add(t);
          });
        });
      }, Promise.resolve()).then(function () { return soDocs; });
    }).then(function (soDocs) {
      // cấp số myPay cho khoá mới (gid danh sách + khoá trong sổ) — giao dịch, máy khác cấp cùng lúc cũng không trùng
      var can = [];
      nguon.hs.filter(function (h) { return !h.deleted; }).forEach(function (h) { can.push(h.gid); });
      soDocs.forEach(function (d) { var t = bangThang[ND.thangCuaNgayHt(d.ngay_hien_thi)]; var b = t && t.ngay[d.ngay_hien_thi]; if (b) Object.keys(b.ids).forEach(function (k) { can.push(b.ids[k]); }); });
      var thieu = can.filter(function (k) { return k && !(k in bangSo.so); });
      var p = Promise.resolve();
      if (thieu.length) {
        var ref = K.fs.doc(K.db, 'payMaHs', 'so');
        p = K.fs.runTransaction(K.db, function (tx) {
          return tx.get(ref).then(function (s) {
            var b = s.exists() ? { so: Object.assign({}, s.data().so || {}), tiep: s.data().tiep || ND.SO_DAU } : { so: {}, tiep: ND.SO_DAU };
            ND.capSo(b, thieu.slice().sort());
            tx.set(ref, { so: b.so, tiep: b.tiep, luc: K.fs.serverTimestamp() });
            return b;
          });
        }).then(function (b) { bangSo = b; });
      }
      return p.then(function () {
        return Promise.all(Array.from(thangDoi).map(function (t) {
          return K.fs.setDoc(K.fs.doc(K.db, 'payMaHs', 'ngay-' + t), { ngay: bangThang[t].ngay, luc: K.fs.serverTimestamp() });
        }));
      }).then(function () {
        thangDoi.clear();
        may.datFile(DIR_SHARED + '\\hoc_sinh.json', JSON.stringify(ND.dungHocSinhJson(nguon.hs, nguon.lop, bangSo)));
        may.datFile(DIR_SHARED + '\\lop.json', JSON.stringify(ND.dungLopJson(nguon.lop)));
        soDocs.forEach(function (d) {
          var b = bangThang[ND.thangCuaNgayHt(d.ngay_hien_thi)].ngay[d.ngay_hien_thi];
          may.datFile(DIR_SO + '\\' + d.ngay_hien_thi + '.json', JSON.stringify(ND.dungSoNgay(d, b.ids, bangSo)));
        });
        return soDocs.length;
      });
    });
  }

  // ───────── LƯU sau mỗi thao tác ─────────
  var tenMay = (navigator.userAgent.match(/iPhone|iPad|Android|Windows|Mac/) || ['?'])[0];
  function luuLenMang() {
    if (!K || (!dangDoi.size && !daXoa.size && !saoLuu.length)) return Promise.resolve();
    var ds = Array.from(dangDoi).map(function (r) { return { rel: r, xoa: false }; }).concat(Array.from(daXoa).map(function (r) { return { rel: r, xoa: true }; }));
    var sl = saoLuu.splice(0);
    return ds.reduce(function (p, x) {
      return p.then(function () {
        var ref = K.fs.doc(K.db, 'payKho', tenDoc(x.rel));
        var nd = x.xoa ? null : may.layFile(DIR_DATA + '\\' + x.rel);
        var phienCu = PHIEN.get(x.rel) || 0;
        return K.fs.runTransaction(K.db, function (tx) {
          return tx.get(ref).then(function (s) {
            var tren = s.exists() ? (Number(s.data().phien) || 0) : 0;
            if (tren !== phienCu) { var e = new Error('XUNG_DOT'); e.rel = x.rel; throw e; }
            var moi = { json: x.xoa ? '' : String(nd), phien: tren + 1, luc: K.fs.serverTimestamp(), may: tenMay };
            if (x.xoa) moi.xoa = true;
            tx.set(ref, moi);
            return tren + 1;
          });
        }).then(function (ph) { PHIEN.set(x.rel, ph); dangDoi.delete(x.rel); daXoa.delete(x.rel); });
      });
    }, Promise.resolve()).then(function () {
      return Promise.all(sl.map(function (b) {
        var nd = typeof b.noiDung === 'string' ? b.noiDung : '';
        return K.fs.addDoc(K.fs.collection(K.db, 'payKhoSaoLuu'), { duong: b.duong, json: nd.slice(0, 900000), luc: K.fs.serverTimestamp(), may: tenMay }).catch(function () { /* sao lưu hỏng không cản việc chính */ });
      }));
    });
  }
  function loiLuu(e) {
    // Không lưu được ⇒ nạp lại TOÀN BỘ payKho từ mạng (bỏ thay đổi vừa làm trên máy này) rồi báo thầy.
    dangDoi.clear(); daXoa.clear();
    var chu = e && e.message === 'XUNG_DOT'
      ? 'Dữ liệu vừa được sửa ở máy khác — đã tải bản mới nhất, thầy làm lại thao tác vừa rồi giúp tôi.'
      : 'CHƯA LƯU được lên mạng (' + String((e && e.message) || e) + ') — đã tải lại bản trên mạng, thầy làm lại thao tác.';
    return napPayKho().then(function () { lamMoiGiaoDien(); return { ok: false, loi: chu }; }, function () { return { ok: false, loi: chu }; });
  }
  var henLamMoi = 0;
  function lamMoiGiaoDien() {
    clearTimeout(henLamMoi);
    henLamMoi = setTimeout(function () {
      var w = window.__mypay; if (!w) return;
      Promise.resolve(w.napThang && w.napThang()).then(function () { return w.napNoPhi && w.napNoPhi(); }).catch(function () {});
    }, 150);
  }

  // Máy khác (điện thoại ↔ máy tính) vừa sửa ⇒ cập nhật ổ ảo + vẽ lại.
  function ngheMayKhac() {
    var lanDau = true;
    K.fs.onSnapshot(K.fs.collection(K.db, 'payKho'), function (s) {
      if (lanDau) { lanDau = false; return; }
      var doi = 0;
      s.docChanges().forEach(function (c) {
        if (c.doc.metadata.hasPendingWrites) return;
        var d = c.doc.data(); var rel = relTuDoc(c.doc.id); var ph = Number(d.phien) || 0;
        if (ph <= (PHIEN.get(rel) || 0) || dangDoi.has(rel)) return;
        if (d.xoa) may.xoaFile(DIR_DATA + '\\' + rel); else may.datFile(DIR_DATA + '\\' + rel, String(d.json || ''));
        PHIEN.set(rel, ph); doi++;
      });
      if (doi) { bao('Vừa cập nhật thay đổi từ máy khác'); lamMoiGiaoDien(); }
    }, function () { /* mất quyền/mạng: thôi nghe, lần thao tác sau vẫn kiểm phiên */ });
  }

  // ───────── KHỞI ĐỘNG ─────────
  function khoiDong() {
    man('Đang kiểm tra phiên đăng nhập của thầy…');
    return moKho().then(function (k) { K = k; return choPhien(k); }).then(function (u) {
      if (!u) {
        man('Trang <b>myPay</b> chỉ dành cho thầy.<br>Mở <a href="dashboard.html">Dashboard</a>, đăng nhập, rồi bấm lại mục <b>myPay</b> trong hộp Quản lý &amp; bảo mật.', true);
        return null;
      }
      man('Đang tải dữ liệu học phí…');
      return napPayKho().then(function (n) {
        if (!n) throw new Error('Chưa có dữ liệu myPay trên mạng (chưa dời từ máy lên).');
        var cd = {}; try { cd = JSON.parse(may.layFile(DIR_DATA + '\\cai-dat.json') || '{}'); } catch (e) { cd = {}; }
        var t = cd.thangBatDau || { m: 6, y: 2026 };
        man('Đang tải điểm danh từ tháng ' + t.m + '/' + t.y + '…');
        return napDiemDanh(t.y + '-' + ('0' + t.m).slice(-2) + '-01');
      }).then(function () {
        man('');
        hetSan();
        ngheMayKhac();
        return true;
      });
    }).catch(function (e) {
      man('Không mở được myPay: ' + String((e && e.message) || e).replace(/</g, '&lt;') + '<br><a href="pay.html">Tải lại trang</a>', true);
      loiSan(e);
    });
  }
  window.PayWeb = { may: may, san: san, luuLenMang: luuLenMang };
  khoiDong();
})();
