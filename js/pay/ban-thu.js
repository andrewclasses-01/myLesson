/* ⛔ FILE SINH TỰ ĐỘNG từ kho myPay v0.26.2 (a4de8f0) bằng tools/dong-goi-web.js — ĐỪNG SỬA TAY (sửa ở kho myPay rồi đóng gói lại) */
/* ============================================================
   myPay WEB — BÀN THỬ (ban-thu.js) · Đợt 1 (03/10/2026)
   CHỈ chạy trên máy (localhost/127.0.0.1) khi địa chỉ có ?banthu=<file json>: thay Firestore bằng KHO GIẢ trong bộ
   nhớ nạp từ file đó (bản chụp dữ liệu thật do tools/tao-ban-thu.js sinh — ⛔ file chụp KHÔNG được commit).
   Ghi gì cũng chỉ ở bộ nhớ, tải lại trang là mất. Dùng để Claude/thầy bấm thử mọi nút mà không đụng dữ liệu thật.
   PayBanThu.suaTuMayKhac(docId, fn) — giả "điện thoại vừa sửa" để thử xung đột / tự cập nhật.
   ============================================================ */
(function () {
  'use strict';
  var q = new URLSearchParams(location.search);
  if (!q.get('banthu') || !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

  var DB = {};          // tên kho → Map(id → object)
  var nghe = {};        // tên kho → [fn]
  var demDoc = 0, demGhi = 0;
  function kho(t) { return DB[t] || (DB[t] = new Map()); }
  function sao(o) { return JSON.parse(JSON.stringify(o)); }
  function snapDoc(id, o) { return { id: id, exists: function () { return !!o; }, data: function () { return o ? sao(o) : undefined; }, metadata: { hasPendingWrites: false } }; }
  function baoDoi(t, id, kieu) {
    (nghe[t] || []).forEach(function (fn) { fn({ docChanges: function () { return [{ type: kieu, doc: snapDoc(id, kho(t).get(id)) }]; } }); });
  }
  function ghi(ref, o) { demGhi++; var c = kho(ref.col).has(ref.id); kho(ref.col).set(ref.id, sao(o)); baoDoi(ref.col, ref.id, c ? 'modified' : 'added'); }

  var fs = {
    collection: function (db, t) { return { col: t }; },
    doc: function (db, t, id) { return { col: t, id: id }; },
    where: function (f, op, v) { return { f: f, op: op, v: v }; },
    query: function (c) { return { col: c.col, w: Array.prototype.slice.call(arguments, 1) }; },
    getDocs: function (qq) {
      var ds = [];
      kho(qq.col).forEach(function (o, id) {
        if ((qq.w || []).every(function (w) { var x = o[w.f]; return w.op === '==' ? x === w.v : w.op === '>=' ? x >= w.v : true; })) ds.push(snapDoc(id, o));
      });
      demDoc += ds.length;
      return new Promise(function (a) { setTimeout(function () { a({ docs: ds }); }, 30); });
    },
    getDoc: function (ref) { demDoc++; return Promise.resolve(snapDoc(ref.id, kho(ref.col).get(ref.id))); },
    setDoc: function (ref, o) { ghi(ref, o); return Promise.resolve(); },
    addDoc: function (c, o) { ghi({ col: c.col, id: 'tu' + Date.now() + Math.random().toString(36).slice(2, 6) }, o); return Promise.resolve(); },
    runTransaction: function (db, fn) {
      var cho = [];
      var tx = { get: function (ref) { demDoc++; return Promise.resolve(snapDoc(ref.id, kho(ref.col).get(ref.id))); }, set: function (ref, o) { cho.push([ref, o]); } };
      return Promise.resolve(fn(tx)).then(function (kq) { cho.forEach(function (x) { ghi(x[0], x[1]); }); return kq; });
    },
    onSnapshot: function (c, cb) {
      (nghe[c.col] = nghe[c.col] || []).push(cb);
      cb({ docChanges: function () { return []; } });
      return function () {};
    },
    serverTimestamp: function () { return new Date().toISOString(); }
  };
  // Đăng nhập giả (06/10/2026 — phiên myPay riêng): ?khach=1 ⇒ chưa đăng nhập, hiện khung đăng nhập; ID bất kỳ + mật khẩu
  // 'sai' ⇒ báo sai; mật khẩu khác ⇒ hỏi mã 6 số; mã '123456' ⇒ vào. ?hethan=<giây> ⇒ phiên hết hạn sau từng ấy giây.
  var nguoi = q.get('khach') ? null : { uid: 'thay', banThu: true };
  var au = {
    onAuthStateChanged: function (a, cb) { setTimeout(function () { cb(nguoi); }, 10); return function () {}; },
    signOut: function () { nguoi = null; return Promise.resolve(); },
    signInWithEmailAndPassword: function (a, email, mk) {
      return Promise.reject(mk === 'sai' ? { code: 'auth/invalid-credential' } : { code: 'auth/multi-factor-auth-required' });
    },
    getMultiFactorResolver: function () {
      return { hints: [{ factorId: 'totp', uid: 'g1' }], resolveSignIn: function (kd) {
        if (kd.ma !== '123456') return Promise.reject({ code: 'auth/invalid-verification-code' });
        nguoi = { uid: 'thay', banThu: true }; return Promise.resolve({ user: nguoi });
      } };
    },
    TotpMultiFactorGenerator: { FACTOR_ID: 'totp', assertionForSignIn: function (uid, ma) { return { ma: ma }; } }
  };
  var batDauLuc = Date.now();
  // 08/10/2026 — phiên Dashboard giả: mặc định CÓ (vào thẳng); ?nodash=1 ⇒ Dashboard chưa đăng nhập ⇒ phải đăng nhập myPay.
  var dashGia = q.get('nodash') ? null : { email: 'banthu@quantri.andrewclasses.com' };

  var san = fetch(q.get('banthu'), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('Không đọc được file bàn thử ' + r.status); return r.json(); }).then(function (j) {
    Object.keys(j).forEach(function (t) { Object.keys(j[t]).forEach(function (id) { kho(t).set(id, j[t][id]); }); });
    return { fs: fs, db: {}, au: au, a: {} };
  });
  window.PayBanThu = {
    san: san, DB: DB,
    dem: function () { return { docDoc: demDoc, ghi: demGhi }; },
    dash: function () { return dashGia; },
    phien: function (u) { return u && u.banThu ? { u: u, het: q.get('hethan') ? batDauLuc + Number(q.get('hethan')) * 1000 : Date.now() + 6 * 3600 * 1000 } : null; },
    suaTuMayKhac: function (id, fn) {
      var o = sao(kho('payKho').get(id)); fn(o); o.phien = (Number(o.phien) || 0) + 1; o.may = 'may-khac';
      ghi({ col: 'payKho', id: id }, o);
    }
  };
  var b = document.createElement('div'); b.textContent = 'BÀN THỬ — dữ liệu chụp, ghi chỉ trong bộ nhớ';
  b.style.cssText = 'position:fixed;left:50%;top:0;transform:translateX(-50%);z-index:99999;background:#b45309;color:#fff;font:700 12px system-ui;padding:3px 10px;border-radius:0 0 8px 8px;pointer-events:none';
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(b); });
})();
