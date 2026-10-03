/* ⛔ FILE SINH TỰ ĐỘNG từ kho myPay v0.15.0 (76d57ee) bằng tools/dong-goi-web.js — ĐỪNG SỬA TAY (sửa ở kho myPay rồi đóng gói lại) */
/* ============================================================
   myPay WEB — MÁY ẢO (may-ao.js) · Đợt 1 chuyển myPay lên dashboard (03/10/2026)

   VÌ SAO CÓ FILE NÀY: thầy chốt chuyển TOÀN BỘ myPay lên web. Cách ít rủi ro nhất là
   CHẠY NGUYÊN code myPay (src/main.js + src/main/lib/*.js + src/preload.js + renderer)
   trong trình duyệt, KHÔNG viết lại lõi (bộ não khớp 5 lượt, phí, nợ phí, tạm ứng…) —
   chỉ thay những thứ chỉ có trên máy tính:
     • ổ đĩa  (fs)       → Ổ ẢO trong bộ nhớ; kho-may.js nạp từ / ghi về Firestore
     • path   (win32)    → bản tối giản, giữ đường dẫn kiểu E:\LAP TRINH APP\…
     • electron          → ipcMain/ipcRenderer nối thẳng trong cùng trang
     • crypto/https/zlib → phần nhỏ dùng tới
   ⛔ File này KHÔNG đụng DOM lúc nạp ⇒ chạy được cả trong Node (bộ so app↔web, tools/).
   ⛔ Nguồn DUY NHẤT ở kho myPay (thư mục web/). Kho web chỉ nhận bản chép do
      tools/dong-goi-web.js sinh ra — sửa bên kho web là bị đè mất.
   ============================================================ */
(function (goc) {
  'use strict';

  // ───────── path kiểu Windows (đủ các hàm myPay dùng: join/resolve/dirname/basename/extname/isAbsolute) ─────────
  function laTuyetDoi(p) { return /^[A-Za-z]:[\\/]/.test(String(p)) || /^[\\/]/.test(String(p)); }
  function chuanHoa(p) {
    var s = String(p).replace(/\//g, '\\');
    var o = s.match(/^[A-Za-z]:/); var dau = o ? o[0] : ''; if (dau) s = s.slice(2);
    var tuyetDoi = s.charAt(0) === '\\';
    var ra = [];
    s.split('\\').forEach(function (x) {
      if (!x || x === '.') return;
      if (x === '..') { if (ra.length && ra[ra.length - 1] !== '..') ra.pop(); else if (!tuyetDoi) ra.push('..'); return; }
      ra.push(x);
    });
    return dau + (tuyetDoi ? '\\' : '') + ra.join('\\');
  }
  var path = {
    sep: '\\',
    isAbsolute: laTuyetDoi,
    normalize: chuanHoa,
    join: function () { return chuanHoa(Array.prototype.filter.call(arguments, function (x) { return x !== ''; }).join('\\')); },
    resolve: function () {
      var r = '';
      Array.prototype.forEach.call(arguments, function (x) { x = String(x); if (!x) return; r = laTuyetDoi(x) ? x : (r ? r + '\\' + x : x); });
      return chuanHoa(r);
    },
    dirname: function (p) { var s = chuanHoa(p); var i = s.lastIndexOf('\\'); return i <= 0 ? s : (i === 2 && s.charAt(1) === ':' ? s.slice(0, 3) : s.slice(0, i)); },
    basename: function (p, duoi) { var s = chuanHoa(p); var b = s.slice(s.lastIndexOf('\\') + 1); if (duoi && b.slice(-duoi.length) === duoi) b = b.slice(0, -duoi.length); return b; },
    extname: function (p) { var b = path.basename(p); var i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; }
  };
  path.win32 = path;

  function taoMay(tuyChon) {
    var opt = tuyChon || {};
    // ───────── Ổ ẢO ─────────
    // Khoá = đường dẫn chuẩn hoá chữ thường (Windows không phân biệt hoa/thường).
    var FILE = new Map();      // khoá → { duong, noiDung (string | Uint8Array) }
    var THU_MUC = new Set();   // khoá thư mục đã mkdir
    var nghe = [];             // hàm nghe mỗi lần ghi/xoá: fn(duong, 'ghi'|'xoa')
    var CHI_DOC = (opt.chiDoc || []).map(function (x) { return chuanHoa(x).toLowerCase() + '\\'; });
    function k(p) { return chuanHoa(p).toLowerCase(); }
    function laChiDoc(p) { var x = k(p); return CHI_DOC.some(function (g) { return x.indexOf(g) === 0; }); }
    function loi(ma, chu, p) { var e = new Error(ma + ': ' + chu + ", '" + p + "'"); e.code = ma; return e; }
    function bao(p, kieu) { nghe.forEach(function (f) { try { f(chuanHoa(p), kieu); } catch (e) { /* nghe hỏng không được cản ghi */ } }); }

    function coThuMuc(p) {
      var x = k(p); if (THU_MUC.has(x)) return true;
      var dau = x + '\\';
      for (var kk of FILE.keys()) if (kk.indexOf(dau) === 0) return true;
      return false;
    }
    var fs = {
      existsSync: function (p) { return FILE.has(k(p)) || coThuMuc(p); },
      readFileSync: function (p, enc) {
        var f = FILE.get(k(p));
        if (!f) throw loi('ENOENT', 'no such file or directory, open', p);
        var nd = f.noiDung;
        var maHoa = typeof enc === 'string' ? enc : (enc && enc.encoding);
        if (maHoa) return typeof nd === 'string' ? nd : new TextDecoder('utf-8').decode(nd);
        var b = typeof nd === 'string' ? new TextEncoder().encode(nd) : nd;
        return goc.Buffer && goc.Buffer.from ? goc.Buffer.from(b) : b;
      },
      writeFileSync: function (p, duLieu) {
        if (laChiDoc(p)) throw loi('EACCES', 'ổ ảo: nguồn ngoài CHỈ ĐỌC', p);
        var nd = typeof duLieu === 'string' ? duLieu : new Uint8Array(duLieu.buffer ? duLieu.buffer.slice(duLieu.byteOffset, duLieu.byteOffset + duLieu.byteLength) : duLieu);
        FILE.set(k(p), { duong: chuanHoa(p), noiDung: nd });
        bao(p, 'ghi');
      },
      renameSync: function (a, b) {
        var f = FILE.get(k(a));
        if (!f) throw loi('ENOENT', 'no such file or directory, rename', a);
        if (laChiDoc(b) || laChiDoc(a)) throw loi('EACCES', 'ổ ảo: nguồn ngoài CHỈ ĐỌC', b);
        FILE.delete(k(a));
        FILE.set(k(b), { duong: chuanHoa(b), noiDung: f.noiDung });
        bao(a, 'xoa'); bao(b, 'ghi');
      },
      copyFileSync: function (a, b) {
        var f = FILE.get(k(a));
        if (!f) throw loi('ENOENT', 'no such file or directory, copyfile', a);
        fs.writeFileSync(b, f.noiDung);
      },
      unlinkSync: function (p) {
        if (laChiDoc(p)) throw loi('EACCES', 'ổ ảo: nguồn ngoài CHỈ ĐỌC', p);
        if (!FILE.delete(k(p))) throw loi('ENOENT', 'no such file or directory, unlink', p);
        bao(p, 'xoa');
      },
      mkdirSync: function (p) { THU_MUC.add(k(p)); },
      readdirSync: function (p) {
        var dau = k(p) + '\\'; var ten = new Set();
        for (var f of FILE.values()) {
          var x = f.duong.toLowerCase();
          if (x.indexOf(dau) !== 0) continue;
          ten.add(f.duong.slice(dau.length).split('\\')[0]);
        }
        THU_MUC.forEach(function (x) { if (x.indexOf(dau) === 0) ten.add(x.slice(dau.length).split('\\')[0]); });
        if (!ten.size && !coThuMuc(p)) throw loi('ENOENT', 'no such file or directory, scandir', p);
        return Array.from(ten);
      },
      statSync: function (p) {
        if (FILE.has(k(p))) return { isFile: function () { return true; }, isDirectory: function () { return false; } };
        if (coThuMuc(p)) return { isFile: function () { return false; }, isDirectory: function () { return true; } };
        throw loi('ENOENT', 'no such file or directory, stat', p);
      }
    };

    // ───────── electron giả ─────────
    var KENH = {};
    var hangDoi = Promise.resolve();
    var SAN = opt.san || Promise.resolve();      // chờ dữ liệu nạp xong mới chạy kênh
    var sauMoiKenh = opt.sauMoiKenh || null;     // (tenKenh, ketQua) => Promise — kho-may: lưu lên Firestore
    function goiKenh(kenh, args) {
      // Mỗi lượt gọi xếp HÀNG — không lượt nào chen giữa lúc lượt khác đang ghi lên mạng.
      var lan = hangDoi.then(function () { return SAN; }).then(function () {
        var h = KENH[kenh];
        if (!h) return { ok: false, loi: 'KENH_KHONG_CO: ' + kenh };
        return Promise.resolve(h.apply(null, [null].concat(args))).then(function (kq) {
          return sauMoiKenh ? sauMoiKenh(kenh, kq) : kq;
        });
      });
      hangDoi = lan.catch(function () {});
      return lan;
    }
    var electron = {
      app: {
        requestSingleInstanceLock: function () { return true; },
        whenReady: function () { return new Promise(function () {}); },   // không bao giờ dựng cửa sổ
        on: function () {}, quit: function () {},
        getVersion: function () { return opt.phienBan || '0.0.0'; }
      },
      BrowserWindow: function () { throw new Error('Không có cửa sổ trên web'); },
      ipcMain: { handle: function (kenh, fn) { KENH[kenh] = fn; } },
      ipcRenderer: { invoke: function (kenh) { return goiKenh(kenh, Array.prototype.slice.call(arguments, 1)); } },
      contextBridge: { exposeInMainWorld: function (ten, api) { (opt.cuaSo || goc)[ten] = api; } },
      webUtils: { getPathForFile: function (f) { return opt.duongFile ? opt.duongFile(f) : ''; } },
      dialog: { showOpenDialog: function () { return opt.chonFile ? opt.chonFile() : Promise.resolve({ canceled: true, filePaths: [] }); } },
      shell: { openPath: function () { return Promise.resolve('Trên web không mở được file/thư mục trên máy.'); } },
      clipboard: { writeImage: function () { throw new Error('Trên web dùng kênh sao chép riêng'); } },
      nativeImage: { createFromDataURL: function (u) { return { dataUrl: u }; } }
    };

    var crypto = {
      randomUUID: function () {
        if (goc.crypto && goc.crypto.randomUUID) return goc.crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
      },
      createSign: function () { throw new Error('Trên web không ký khoá quản trị'); }
    };
    var https = { request: function () { throw new Error('Trên web không gọi mạng bằng khoá quản trị'); } };
    var zlib = opt.zlib || { inflateRawSync: function () { throw new Error('Đọc file Excel sao kê: làm ở Đợt 2'); } };
    var processGia = { env: {}, platform: 'win32', versions: {}, cwd: function () { return 'E:\\LAP TRINH APP\\myPay'; } };

    var NOI_SAN = { fs: fs, path: path, electron: electron, crypto: crypto, https: https, zlib: zlib };

    // ───────── nạp module kiểu CommonJS từ gói (mypay-goi.js) ─────────
    // goi = { '<đường dẫn tuyệt đối .js>': function (module, exports, require, __dirname, __filename, process, Buffer) {...} }
    function taoNap(goi) {
      var DA = {};
      function nap(duong) {
        var x = chuanHoa(duong);
        var kh = x.toLowerCase();
        if (DA[kh]) return DA[kh].exports;
        var ham = goi[x] || goi[Object.keys(goi).find(function (t) { return t.toLowerCase() === kh; })];
        if (!ham) throw new Error('Gói thiếu module: ' + x);
        var mod = { exports: {} }; DA[kh] = mod;
        var thuMuc = path.dirname(x);
        var req = function (ten) {
          if (Object.prototype.hasOwnProperty.call(NOI_SAN, ten)) return NOI_SAN[ten];
          if (ten.charAt(0) === '.') { var p = path.join(thuMuc, ten); if (!/\.js$/i.test(p)) p += '.js'; return nap(p); }
          throw new Error('Module ngoài không có trên web: ' + ten);
        };
        ham(mod, mod.exports, req, thuMuc, x, processGia, goc.Buffer);
        return mod.exports;
      }
      return nap;
    }

    return {
      fs: fs, path: path, electron: electron, KENH: KENH,
      nghe: function (fn) { nghe.push(fn); },
      // nạp dữ liệu từ ngoài (KHÔNG phát sự kiện ghi — không bị coi là sửa)
      datFile: function (p, noiDung) { FILE.set(k(p), { duong: chuanHoa(p), noiDung: noiDung }); },
      xoaFile: function (p) { FILE.delete(k(p)); },
      layFile: function (p) { var f = FILE.get(k(p)); return f ? f.noiDung : undefined; },
      dsFile: function (dau) { var d = k(dau); var ra = []; FILE.forEach(function (f, kk) { if (kk.indexOf(d) === 0) ra.push(f.duong); }); return ra; },
      taoNap: taoNap,
      goiKenh: goiKenh
    };
  }

  var MayAo = { taoMay: taoMay, path: path };
  if (typeof module !== 'undefined' && module.exports) module.exports = MayAo; else goc.MayAo = MayAo;
})(typeof window !== 'undefined' ? window : globalThis);
