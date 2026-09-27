/* ============================================================
   thay-vao.js — "ĐĂNG NHẬP THAY EM" phía trang học sinh (web v1.168.0, 28/09/2026 — Đợt B3,
   kế hoạch myLesson-app "KE HOACH QUAN LY HOC SINH.md"; hàm máy chủ `dangNhapThayHs`).

   Thầy bấm "Đăng nhập thay" trong hồ sơ em (dashboard) + gõ PIN ⇒ dashboard mở tab mới
   `lop.html|khoa.html?nhu=<mã>&lop=<maLop>&thayvao=1` ⇒ tab này xin vé bằng postMessage (CÙNG origin, đúng cửa sổ
   mở nó) ⇒ đăng nhập bằng vé với phiên CHỈ TRONG TAB (browserSessionPersistence).

   ⛔⛔ BẪY CHÍNH: mọi trang dùng app Firebase MẶC ĐỊNH + phiên lưu IndexedDB DÙNG CHUNG mọi tab andrewclasses.com.
   Nếu tab này để `getAuth()` mặc định hoặc `setPersistence(local)` chạy trong lúc đang là em ⇒ phiên em chép vào
   IndexedDB ⇒ tab dashboard của thầy BIẾN THÀNH em. Vì vậy:
     · tệp này phải nạp NGAY SAU config.js, TRƯỚC nw-phien.js / chat.js / thay.js;
     · ở chế độ này nó `initializeAuth(... browserSessionPersistence)` TRƯỚC ai hết;
     · nw-phien.js + thay.js chờ `__thayVao.san` rồi mới getAuth, và BỎ setPersistence(local);
     · dashboard.html cũng nạp tệp này: tab nào đang "thay em" mà mở dashboard ⇒ tự thoát phiên em trước.
   Không có cờ (URL `thayvao=1` hoặc sessionStorage) ⇒ tệp này KHÔNG làm gì (window.__thayVao = null) — học sinh bình thường
   không bị ảnh hưởng.
   Tự thoát sau 30 phút · dải đỏ trên cùng "Thầy đang đăng nhập thay … — Thoát" · chat tắt trong chế độ này (chat.js).
   ============================================================ */
(function () {
  'use strict';
  var KHOA = 'mylesson_thay_vao';
  var PHUT = 30;
  var q = new URLSearchParams(location.search);
  var co = null;
  try { co = JSON.parse(sessionStorage.getItem(KHOA) || 'null'); } catch (e) { co = null; }
  var coUrl = q.get('thayvao') === '1';
  if (!co && !coUrl) { window.__thayVao = null; return; }

  var laDash = /dashboard\.html$/i.test(location.pathname);
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';   // ⛔ PHẢI trùng nw-phien.js / chat.js / thay.js
  var CAU_HINH = {
    apiKey: 'AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY',
    authDomain: 'aword-70dae.firebaseapp.com',
    projectId: 'aword-70dae',
    storageBucket: 'aword-70dae.firebasestorage.app',
    messagingSenderId: '399279049436',
    appId: '1:399279049436:web:b9b34dcfb34732aa744219'
  };
  var _auth = null, _au = null, _hen = null;

  function xoaCo() { co = null; try { sessionStorage.removeItem(KHOA); } catch (e) { } }
  function ghiCo(x) { co = x; try { sessionStorage.setItem(KHOA, JSON.stringify(x)); } catch (e) { } }

  // ---------- dải đỏ trên cùng ----------
  function veDai(chu, coNut) {
    function ve() {
      var d = document.getElementById('thayVaoDai');
      if (!d) {
        d = document.createElement('div');
        d.id = 'thayVaoDai';
        d.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:2147483000;background:#c62828;color:#fff;' +
          'font:700 13px/1.35 Montserrat,system-ui,sans-serif;padding:7px 12px;display:flex;align-items:center;gap:10px;justify-content:center;flex-wrap:wrap;box-shadow:0 2px 10px rgba(0,0,0,.25)';
        document.body.appendChild(d);
        document.body.style.paddingTop = '40px';
      }
      d.innerHTML = '';
      var s = document.createElement('span'); s.textContent = chu; d.appendChild(s);
      if (coNut) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = 'Thoát';
        b.style.cssText = 'border:0;border-radius:8px;padding:4px 12px;background:#fff;color:#c62828;font:800 12px Montserrat,system-ui,sans-serif;cursor:pointer';
        b.onclick = function () { thoat('Đã thoát chế độ đăng nhập thay em. Có thể đóng tab này.'); };
        d.appendChild(b);
      }
    }
    if (document.body) ve(); else document.addEventListener('DOMContentLoaded', ve);
  }
  function chuConLai() { var p = Math.max(0, Math.ceil(((co && co.het) - Date.now()) / 60000)); return p + ' phút'; }
  function veDaiDangThay() {
    veDai('🔐 Thầy đang ĐĂNG NHẬP THAY ' + ((co && co.ten) || 'em') + ' — mọi bài làm ghi dưới tên em · tự thoát sau ' + chuConLai() + ' · chat tắt', true);
  }
  function thoat(chu) {
    clearInterval(_hen);
    var xong = function () { xoaCo(); veDai(chu || 'Đã thoát.', false); };
    if (_auth && _au) _au.signOut(_auth).then(xong, xong); else xong();
  }

  // ---------- xin vé từ cửa sổ dashboard đã mở tab này ----------
  function choVe() {
    return new Promise(function (res) {
      var op = window.opener;
      if (!op) { res(null); return; }
      var xong = false, t = null;
      function ket(v) { if (xong) return; xong = true; clearInterval(t); window.removeEventListener('message', nghe); res(v); }
      function nghe(e) {
        if (e.origin !== location.origin || e.source !== op) return;
        var d = e.data || {};
        if (d.type === 'THAYVAO:VE' && d.token) ket(d);
        else if (d.type === 'THAYVAO:LOI') ket({ loi: String(d.chu || 'Dashboard báo lỗi.') });
      }
      window.addEventListener('message', nghe);
      var gui = function () { try { op.postMessage({ type: 'THAYVAO:SAN' }, location.origin); } catch (e) { } };
      gui(); t = setInterval(gui, 1000);
      setTimeout(function () { ket(null); }, 90000);
    });
  }

  var san = (async function () {
    var appMod = await import(SDK + '/firebase-app.js');
    _au = await import(SDK + '/firebase-auth.js');
    var app = (appMod.getApps && appMod.getApps().length) ? appMod.getApp() : appMod.initializeApp(CAU_HINH);
    try { _auth = _au.initializeAuth(app, { persistence: _au.browserSessionPersistence }); }
    catch (e) {
      // Ai đó đã getAuth trước (không được xảy ra — tệp này nạp đầu). An toàn: không đăng nhập thay trong tab này.
      console.warn('[thay-vao] Auth đã khởi động trước — bỏ chế độ đăng nhập thay', e);
      xoaCo(); veDai('Không mở được chế độ đăng nhập thay trong tab này — đóng tab rồi thử lại từ dashboard.', false);
      return _au.getAuth(app);
    }
    await _auth.authStateReady();
    if (laDash) {                                    // dashboard KHÔNG BAO GIỜ chạy dưới tên em
      if (_auth.currentUser) await _au.signOut(_auth);
      xoaCo();
      return _auth;
    }
    if (co && co.het && co.het < Date.now()) { thoat('Hết 30 phút — đã tự thoát chế độ đăng nhập thay em.'); return _auth; }
    if (!_auth.currentUser && coUrl && !co) {
      veDai('🔐 Đang đăng nhập thay em…', false);
      var ve = await choVe();
      if (ve && ve.token) {
        try {
          var r = await _au.signInWithCustomToken(_auth, ve.token);
          ghiCo({ uid: r.user.uid, ma: String(ve.ma || ''), ten: String(ve.ten || ''), het: Date.now() + PHUT * 60000 });
        } catch (e) { veDai('Không đăng nhập thay được (' + ((e && e.code) || e) + '). Đóng tab rồi thử lại.', false); return _auth; }
      } else {
        veDai((ve && ve.loi) ? ve.loi : 'Không nhận được vé từ dashboard — đóng tab rồi thử lại.', false);
        return _auth;
      }
    }
    if (!_auth.currentUser) { xoaCo(); veDai('Phiên đăng nhập thay đã hết — trang này CHỈ XEM. Mở lại từ dashboard nếu cần.', false); return _auth; }
    veDaiDangThay();
    _hen = setInterval(function () {
      if (co && co.het < Date.now()) thoat('Hết 30 phút — đã tự thoát chế độ đăng nhập thay em.');
      else veDaiDangThay();
    }, 30000);
    return _auth;
  })();
  san['catch'](function (e) { console.warn('[thay-vao]', e); veDai('Lỗi chế độ đăng nhập thay — đóng tab rồi thử lại.', false); });

  window.__thayVao = {
    san: san,
    co: function () { return co; },
    xoa: xoaCo,
    baoLoi: function (chu) { veDai(chu, false); }
  };
})();
