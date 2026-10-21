/* nop-sach.js — NỘP BÀI SÁCH của bài KHÓA (web v1.387.0, 21/10/2026; thầy duyệt mẫu `myLesson - thiet ke nop sach\mau-v3.html`).
   Em chụp từng trang sách ⇒ bấm NỘP BÀI ⇒ ảnh nén (dùng lại AWC.nopBai.nenAnh của WORKSHEET) ⇒ tải lên Storage
   `nopSach/<LỚP>/<bài>/<bước>/<mã>/p<trang>_<mốc>.jpg` ⇒ gọi hàm máy chủ `kiemSach` (Claude Opus 5.5 kiểm đúng trang / đọc rõ /
   đủ nội dung) ⇒ kết quả ghi ở `lessonSach/<LỚP>__<bài>__<bước>__<mã>` (CHỈ máy chủ ghi — em không tự sửa "ĐẠT").
   ⛔ id + đường dẫn PHẢI khớp may-chu/functions/nop-sach.js (idSach, `goc`) và luật app/tools/dang-luat-nop-sach.js. */
(function () {
  'use strict';
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';   // ⛔ trùng nw-phien.js / khoa-dn.js
  var BUCKET = 'aword-70dae.firebasestorage.app';
  var _ham = null;
  function A() { return window.AWC || {}; }
  function chuanMa(s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); }
  function id(lop, bai, bt, ma) { return [chuanMa(lop), String(bai || '').slice(0, 200), String(bt || '').slice(0, 40), chuanMa(ma)].join('__'); }
  // "32, 33, 34" | "32–34" ⇒ [32, 33, 34]  (⛔ trùng cacTrang trong may-chu/functions/nop-sach.js)
  function cacTrang(s) {
    var ra = [];
    String(s || '').split(/[,;]/).forEach(function (cum) {
      var m = cum.match(/(\d{1,3})\s*[-–—]\s*(\d{1,3})/);
      if (m) { for (var i = +m[1]; i <= +m[2] && i - +m[1] < 20; i++) ra.push(i); }
      else (cum.match(/\d{1,3}/g) || []).forEach(function (x) { ra.push(+x); });
    });
    return ra.filter(function (n, i) { return n > 0 && n < 1000 && ra.indexOf(n) === i; });
  }
  // Firestore REST ⇒ đối tượng thường
  function giaTri(v) {
    if (!v || typeof v !== 'object') return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return +v.integerValue;
    if ('doubleValue' in v) return +v.doubleValue;
    if ('booleanValue' in v) return !!v.booleanValue;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return Date.parse(v.timestampValue);
    if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(giaTri);
    if ('mapValue' in v) { var o = {}, f = (v.mapValue && v.mapValue.fields) || {}; Object.keys(f).forEach(function (k) { o[k] = giaTri(f[k]); }); return o; }
    return null;
  }
  // Đọc kết quả bài sách của em (luật: em GET đúng bài của mình; vé đăng nhập do js/som.js tự gắn vào lệnh đọc Firestore).
  // 404 ⇒ chưa nộp lần nào ⇒ trả {}. Lỗi khác ⇒ null (giữ nguyên trạng thái đang hiện).
  function doc(lop, bai, bt, ma) {
    var db = (A().CFG && A().CFG.AWORD_DB) || {};
    if (!db.projectId || !ma) return Promise.resolve(null);
    var u = 'https://firestore.googleapis.com/v1/projects/' + db.projectId + '/databases/(default)/documents/lessonSach/' +
      encodeURIComponent(id(lop, bai, bt, ma)) + '?key=' + encodeURIComponent(db.apiKey || '');
    return fetch(u, { cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return {};
      if (!r.ok) return null;
      return r.json().then(function (j) { return giaTri({ mapValue: { fields: (j && j.fields) || {} } }) || {}; });
    })['catch'](function () { return null; });
  }
  function tenTep(lop, bai, bt, ma, trang, moc, nho) {
    return 'nopSach/' + chuanMa(lop) + '/' + String(bai || '').slice(0, 200) + '/' + String(bt || '').slice(0, 40) + '/' + chuanMa(ma) + '/p' +
      String(trang).padStart(3, '0') + '_' + moc + (nho ? '_nho' : '') + '.jpg';
  }
  function tai(ten, blob) { return (A().nopBai && A().nopBai.dayBlob) ? A().nopBai.dayBlob(ten, blob) : Promise.reject(new Error('thiếu nopBai')); }
  function nen(file) { return (A().nopBai && A().nopBai.nenAnh) ? A().nopBai.nenAnh(file) : Promise.reject(new Error('thiếu nopBai')); }
  function ham() {
    if (!_ham) {
      _ham = window.NWP.fb().then(function () {
        return Promise.all([import(SDK + '/firebase-app.js'), import(SDK + '/firebase-functions.js')]).then(function (m) {
          return m[1].httpsCallable(m[1].getFunctions(m[0].getApp(), 'asia-southeast1'), 'kiemSach', { timeout: 120000 });
        });
      });
      _ham['catch'](function () { _ham = null; });
    }
    return _ham;
  }
  // Gọi máy chủ kiểm MỘT trang ⇒ { dat, lyDo, trangAnh, quaLuot, xong, cho }. Lỗi ⇒ ném { loi: chữ cho em đọc }.
  function kiem(d) {
    return ham().then(function (f) { return f(d); }).then(function (r) { return (r && r.data) || {}; }, function (e) {
      var chu = (e && e.message) || 'Không gửi được bài, em kiểm tra mạng rồi bấm NỘP LẠI nhé.';
      if (/internal|INTERNAL|Failed to fetch|network/i.test(chu) && !/Máy kiểm/.test(chu)) chu = 'Mạng chập chờn, chưa gửi được — em bấm NỘP LẠI nhé.';
      throw { loi: chu };
    });
  }
  // Độ sáng (ảnh thu 64 px): p95 = vùng giấy sáng nhất. Đo 50 ảnh Zalo thật 21/10: p95 thấp nhất 173 (ảnh hơi tối vẫn đọc được);
  // ảnh "rất tối" thử ~40 ⇒ ngưỡng 100: dưới mức này nhắc em chụp lại NGAY lúc chọn, không phải chờ máy chủ.
  var NGUONG_TOI = 100;
  function doSang(blob) {
    return new Promise(function (ok) {
      try {
        var u = URL.createObjectURL(blob), im = new Image();
        im.onload = function () {
          try {
            var c = document.createElement('canvas'), w = 64, h = Math.max(1, Math.round(64 * im.naturalHeight / Math.max(1, im.naturalWidth)));
            c.width = w; c.height = h;
            var g = c.getContext('2d'); g.drawImage(im, 0, 0, w, h);
            var px = g.getImageData(0, 0, w, h).data, ds = [];
            for (var i = 0; i < px.length; i += 4) ds.push(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
            ds.sort(function (a, b) { return a - b; });
            URL.revokeObjectURL(u);
            ok({ p95: ds[Math.floor(ds.length * 0.95)] || 0, toi: (ds[Math.floor(ds.length * 0.95)] || 0) < NGUONG_TOI });
          } catch (e) { ok({ p95: 255, toi: false }); }
        };
        im.onerror = function () { URL.revokeObjectURL(u); ok({ p95: 255, toi: false }); };
        im.src = u;
      } catch (e) { ok({ p95: 255, toi: false }); }
    });
  }
  window.NopSach = { id: id, cacTrang: cacTrang, doc: doc, tenTep: tenTep, tai: tai, nen: nen, kiem: kiem, doSang: doSang, BUCKET: BUCKET, NGUONG_TOI: NGUONG_TOI };
})();
