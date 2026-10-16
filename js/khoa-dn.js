/* ============================================================
   khoa-dn.js — KHOÁ ĐĂNG NHẬP RIÊNG có ĐẾM NGƯỢC (web v1.363.0, 16/10/2026 — thầy duyệt mẫu v1
   `D:\OTHERS\CLAUDE\myLesson - thiet ke khoa dang nhap\mau-v1.html`).

   Firebase tự khoá khi sai nhiều lần (`auth/too-many-requests`) mà không cho biết giờ mở ⇒ mình tự đếm lần sai
   (hàm máy chủ `khoaDn`, app may-chu/functions/khoa-dn.js) và khoá TRƯỚC: lần sai 5 ⇒ 1 phút, 8 ⇒ 5 phút, rồi 15 phút.
   Khung `#kh` dưới nút ĐĂNG NHẬP: báo "còn N lần" · đếm ngược mm:ss + "Mở lại lúc HH:MM" (nút mờ "CHỜ mm:ss") ·
   hết giờ ⇒ xanh · thầy mở khoá (dashboard) ⇒ biết ngay (hỏi lại máy chủ mỗi 15 giây) · khoá Google ⇒ khung xám.
   Giờ mở nhớ trong máy (localStorage `ac_khoadn`) ⇒ tải lại trang vẫn đếm tiếp. Máy chủ lỗi/chưa có hàm ⇒ báo lỗi như cũ.
   API: ACKhoaDn.truocKhiVao(ma) → true nếu đang khoá (đã vẽ khung, đừng đăng nhập) · .sai(ma, e) · .gg(ma) · .xong() · .an()
   ============================================================ */
(function () {
  'use strict';
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';   // ⛔ trùng nw-phien.js
  var KHOA_NHO = 'ac_khoadn';
  var $ = function (s) { return document.querySelector(s); };
  var _fn = null, henGio = null, henHoi = null, dang = null;   // dang = { ma, khoaDen, tong }

  function goi(d) {
    if (!_fn) {
      _fn = window.NWP.fb().then(async function () {
        var appMod = await import(SDK + '/firebase-app.js');
        var fnMod = await import(SDK + '/firebase-functions.js');
        return fnMod.httpsCallable(fnMod.getFunctions(appMod.getApp(), 'asia-southeast1'), 'khoaDn', { timeout: 20000 });
      });
      _fn['catch'](function () { _fn = null; });
    }
    return _fn.then(function (f) { return f(d); }).then(function (r) { return r.data || {}; });
  }
  function chuanMa(s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); }
  function docNho() { try { return JSON.parse(localStorage.getItem(KHOA_NHO) || '{}') || {}; } catch (e) { return {}; } }
  // mỗi ID: { d: giờ mở (giờ máy em), p: số phút, s: số lần sai } — tải lại trang vẫn đếm tiếp đúng vạch
  function ghiNho(ma, khoaDen, phut, sai) {
    try {
      var n = docNho(), now = Date.now();
      Object.keys(n).forEach(function (k) { if (!(n[k] && n[k].d > now)) delete n[k]; });
      if (khoaDen > now) n[ma] = { d: khoaDen, p: phut || 0, s: sai || 0 }; else delete n[ma];
      localStorage.setItem(KHOA_NHO, JSON.stringify(n));
    } catch (e) { }
  }
  function hhmm(t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2); }
  // giờ máy chủ → giờ máy em (máy em lệch giờ vẫn đếm đúng số phút)
  function veGioMay(r) { return r.khoaDen ? Date.now() + (r.khoaDen - r.now) : 0; }

  function khung(lop, html) {
    var k = $('#kh'); if (!k) return;
    k.className = 'kh ' + lop; k.innerHTML = html; k.hidden = false;
    var l = $('#loiVao'); if (l) l.hidden = true;
  }
  function nutVao(chu) { var n = $('#btnVao'); if (!n) return; n.disabled = !!chu; n.textContent = chu || 'ĐĂNG NHẬP'; }
  function dung() { if (henGio) clearInterval(henGio); if (henHoi) clearInterval(henHoi); henGio = henHoi = null; }
  function an() { dung(); var k = $('#kh'); if (k) { k.hidden = true; k.innerHTML = ''; } if (dang) nutVao(''); dang = null; }

  function demNguoc(ma, khoaDen, phut, sai) {
    dung();
    var tong = Math.max(1000, (phut || 1) * 60000);
    dang = { ma: ma, khoaDen: khoaDen };
    khung('khoa', '🔒 Em đã nhập sai' + (sai ? ' <b>' + sai + ' lần</b>' : ' nhiều lần') + ' nên tạm khoá' + (phut ? ' <b>' + phut + ' phút</b>' : '') + '.' +
      '<span class="dem" id="khDem"></span><div class="vach"><i id="khVach"></i></div>' +
      'Mở lại lúc <span class="gio">' + hhmm(khoaDen) + '</span>' +
      '<span class="nho">Quên mật khẩu? Bấm <b>Liên hệ</b> nhắn thầy — thầy mở khoá được ngay.</span>');
    function tick() {
      var con = khoaDen - Date.now();
      if (con <= 0) {
        dung(); dang = null; ghiNho(ma, 0); nutVao('');
        khung('mo', '✅ Đã hết giờ chờ. Em kiểm tra kỹ mật khẩu rồi thử lại nhé.<span class="nho">Sai tiếp sẽ bị khoá lâu hơn.</span>');
        return;
      }
      var d = $('#khDem'), v = $('#khVach');
      if (d) d.textContent = mmss(con);
      if (v) v.style.width = Math.min(100, con / tong * 100) + '%';
      nutVao('CHỜ ' + mmss(con));
    }
    tick(); henGio = setInterval(tick, 250);
    // thầy bấm "Mở khoá ngay" ở dashboard ⇒ máy chủ hết khoá ⇒ báo em ngay (không cần tải lại trang)
    henHoi = setInterval(function () {
      if (document.hidden) return;
      goi({ viec: 'xem', ma: ma }).then(function (r) {
        if (!dang || dang.ma !== ma || r.khoaDen) return;
        dung(); dang = null; ghiNho(ma, 0); nutVao('');
        khung('mo', '✅ <b>Thầy đã mở khoá cho em.</b> Em đăng nhập lại nhé.');
      })['catch'](function () { });
    }, 15000);
  }

  // Trước khi đăng nhập: máy này nhớ ID này đang khoá ⇒ vẽ đếm ngược, KHÔNG gọi Firebase (đỡ dính khoá Google).
  function truocKhiVao(ma) {
    ma = chuanMa(ma);
    if (dang && dang.ma === ma && dang.khoaDen > Date.now()) return true;
    var x = docNho()[ma];
    if (x && x.d > Date.now()) { demNguoc(ma, x.d, x.p, x.s); return true; }
    if (dang && dang.ma !== ma) an();
    var k = $('#kh'); if (k && !dang) k.hidden = true;
    return false;
  }

  // Sai mật khẩu: báo máy chủ ⇒ vẽ khoá / "còn N lần". Trả Promise<true> nếu đã vẽ khung (trang khỏi hiện lỗi thường).
  function sai(ma) {
    ma = chuanMa(ma); coSai = true;
    return goi({ viec: 'sai', ma: ma }).then(function (r) {
      if (r.khoaDen) { var den = veGioMay(r); ghiNho(ma, den, r.phut, r.sai); demNguoc(ma, den, r.phut, r.sai); return true; }
      if (r.sai && r.conLan <= 2) {
        khung('canh', 'ID hoặc mật khẩu chưa đúng (sai <b>' + r.sai + ' lần</b>).<span class="nho">Em còn <b>' + r.conLan + ' lần thử</b>, sai nữa sẽ bị khoá ' +
          r.phutKe + ' phút. Nhớ <b>tắt bộ gõ tiếng Việt</b> khi gõ mật khẩu.</span>');
        return true;
      }
      return false;
    })['catch'](function (e) { console.warn('[khoaDn] không báo được lần sai', e); return false; });
  }

  // Firebase đã khoá (too-many-requests): không biết giờ mở ⇒ khung xám + báo máy chủ để dashboard thấy.
  function gg(ma) {
    ma = chuanMa(ma); coSai = true; dung(); dang = null; nutVao('');
    khung('gg', '🛡️ Hệ thống bảo vệ của Google đang tạm khoá tài khoản này vì có quá nhiều lần thử.' +
      '<span class="nho">Khoá này không báo trước giờ mở. <b>Bấm Liên hệ nhắn thầy</b> — thầy đặt lại mật khẩu là em vào được ngay. Hoặc thử đổi mạng (Wi-Fi ↔ 4G).</span>');
    goi({ viec: 'gg', ma: ma })['catch'](function (e) { console.warn('[khoaDn] không báo được khoá Google', e); });
  }

  // Đăng nhập đúng: xoá bộ đếm (cần phiên em — gọi SAU khi đăng nhập).
  // Chỉ gọi máy chủ khi trang này vừa có lần sai (đỡ chậm mọi lần đăng nhập); chờ tối đa 2,5 giây rồi cho đi tiếp.
  var coSai = false;
  function xong(ma) {
    ghiNho(chuanMa(ma), 0); an();
    if (!coSai) return Promise.resolve();
    coSai = false;
    return Promise.race([goi({ viec: 'xong' })['catch'](function () { }), new Promise(function (r) { setTimeout(r, 2500); })]);
  }

  window.ACKhoaDn = { truocKhiVao: truocKhiVao, sai: sai, gg: gg, xong: xong, an: an };
})();
