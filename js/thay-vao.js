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
  // ⭐ 29/09/2026 (thầy chốt) — "XEM NHƯ EM" đi CÙNG đường này với `&chixem=1`: vé thật của em (không PIN, claim chiXem) nhưng tab
  // CHỈ XEM — chung.js cho danh tính `xemNhu` (không làm/nộp bài), nw-phien.js không cấp vé ghi/AWord, chat lớp tắt, mạng xã hội
  // (nw/js/loi.js) đọc như em nhưng chặn mọi lượt ghi.
  var chiXemUrl = q.get('chixem') === '1';
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

  // ---------- dải báo ở CHÂN trang ----------
  // thiết kế ĐT 4 (02/10/2026, thầy chốt): dải đỏ 3 dòng trên cùng che mất đầu trang (tiêu đề Tin nhắn, đầu thẻ bài) ⇒
  // MỘT dòng gọn, chữ nhỏ, nền XANH DƯƠNG, nằm ở CHÂN trang (cả điện thoại lẫn máy tính) và KHÔNG đè nội dung:
  // body đệm đáy đúng chiều cao dải + biến `--cao-dai` trên <html> cho các trang cao đúng 1 màn (lop/khoa/tinnhan trừ đi).
  function veDai(chu, coNut) {
    function ve() {
      var d = document.getElementById('thayVaoDai');
      if (!d) {
        d = document.createElement('div');
        d.id = 'thayVaoDai';
        d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#1D4ED8;color:#fff;' +
          'font:700 11.5px/1.3 Montserrat,system-ui,sans-serif;padding:5px 10px calc(5px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:10px;justify-content:center;' +
          'box-shadow:0 -2px 10px rgba(0,0,0,.18)';
        document.body.appendChild(d);
      }
      d.innerHTML = '';
      var s = document.createElement('span'); s.textContent = chu;
      s.style.cssText = 'min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
      d.appendChild(s);
      if (coNut) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = 'Thoát';
        b.style.cssText = 'flex:none;border:0;border-radius:7px;padding:3px 10px;background:#fff;color:#1D4ED8;font:800 11.5px Montserrat,system-ui,sans-serif;cursor:pointer';
        b.onclick = function () { thoat('Đã thoát chế độ đăng nhập thay em. Có thể đóng tab này.'); };
        d.appendChild(b);
      }
      var cao = d.offsetHeight;
      document.body.style.paddingBottom = cao + 'px';
      document.documentElement.style.setProperty('--cao-dai', cao + 'px');
      try { window.dispatchEvent(new Event('resize')); } catch (e) { }   // lop/khoa đo lại chiều cao khung chat
    }
    if (document.body) ve(); else document.addEventListener('DOMContentLoaded', ve);
  }
  function laChiXem() { return !!((co && co.chiXem) || (coUrl && chiXemUrl)); }
  function chuConLai() { var p = Math.max(0, Math.ceil(((co && co.het) - Date.now()) / 60000)); return p + ' phút'; }
  function veDaiDangThay() {
    if (laChiXem()) veDai('👁 Xem như ' + ((co && co.ten) || 'em') + ' · chỉ xem · còn ' + chuConLai(), true);
    else veDai('🔐 Đăng nhập thay ' + ((co && co.ten) || 'em') + ' · bài làm ghi tên em · chat tắt · còn ' + chuConLai(), true);
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
      veDai(chiXemUrl ? '👁 Đang mở chế độ xem như em…' : '🔐 Đang đăng nhập thay em…', false);
      var ve = await choVe();
      if (ve && ve.token) {
        try {
          var r = await _au.signInWithCustomToken(_auth, ve.token);
          ghiCo({ uid: r.user.uid, ma: String(ve.ma || ''), ten: String(ve.ten || ''), het: Date.now() + PHUT * 60000, chiXem: chiXemUrl });
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
    chiXem: laChiXem,
    xoa: xoaCo,
    baoLoi: function (chu) { veDai(chu, false); }
  };
})();
