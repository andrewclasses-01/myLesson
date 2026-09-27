/* ============================================================
   nw-dangnhap.js — MÀN ĐĂNG NHẬP giao diện myNetwork (mẫu v29, 24/09/2026)

   Thầy chốt 24/09: hình myNetwork, nhưng CÁCH VÀO giữ y myLesson (js/dangnhap.js):
     · gõ Andrew Classes ID (= mã My ID cũ)
     · mã học sinh một nơi → vào thẳng TRANG BÀI TẬP (lop.html / khoa.html)
     · mã ở 2 nơi → màn chọn (hỏi lại mỗi lần mở trang, như v1.78.0/v1.111.0)
     · học sinh đặc biệt (phụ huynh) → lop.html · mã quản lý → dashboard.html
   Logic chép từ js/dangnhap.js — ⛔ sửa luật vào lớp thì sửa CẢ HAI nơi cho tới khi bỏ file cũ.

   ⭐⭐ v1.158.0 (27/09/2026, sau tấn công Tr0ngX — thầy chốt) — MỞ Ô MẬT KHẨU (Firebase Auth, js/nw-phien.js).
   Chép từ chặng 1 của trang thử `andrewclasses-thu` (24/09), thêm luật thầy chốt 27/09:
     · lần đầu em vào bằng MẬT KHẨU LỚP thầy phát (hồ sơ nwUsers có phaiDoiMk) → màn ĐẶT MẬT KHẨU MỚI:
       ≥ MK_TOI_THIEU ký tự, khác ID, KHÁC mật khẩu vừa dùng để vào (= mật khẩu lớp — cả lớp đều biết)
     · máy đã nhớ em nhưng KHÔNG còn phiên Firebase đúng mã đó → bắt đăng nhập lại (điền sẵn ID)
       (máy cũ từ trước v1.158.0 rơi vào đây ⇒ "đăng xuất mọi máy")
     · phụ huynh (hsDb) + mã quản lý: vào như cũ, KHÔNG hỏi mật khẩu (chưa có tài khoản Firebase)
     · "Quên mật khẩu?" → hộp Liên hệ (js/nw-thanh.js); thầy đặt lại bằng tools/tao-tai-khoan.mjs --reset
   ============================================================ */
(function () {
  'use strict';
  var A = window.AWC;
  var P = window.NWP;
  var DL = { lop: [], bai: {} };
  var $ = function (s) { return document.querySelector(s); };
  var MK_TOI_THIEU = 8;           // ⛔ PHẢI khớp myNetwork/tools/tao-tai-khoan.mjs MK_TOI_THIEU

  function man(ten) { document.querySelectorAll('.man').forEach(function (m) { m.classList.toggle('hien', m.id === ten); }); }
  function loi(chu) { var p = $('#loiVao'); p.hidden = !chu; p.textContent = chu || ''; }
  function loiMk(chu) { var p = $('#loiDoiMk'); p.hidden = !chu; p.textContent = chu || ''; }

  var IC_LOP = '<svg viewBox="0 0 24 24"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg>';
  var IC_KHOA = '<svg viewBox="0 0 24 24"><path d="M2 8l10-4 10 4-10 4z"/><path d="M6 10v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 8v6"/></svg>';
  function chuNut(l) { return A.laKhoa(l) ? 'KHÓA ' + (l.tenGoc || l.maLop) : A.lopHien(l.maLop, l.tenGoc) + ' CLASS'; }
  function trangCua(l) { return A.laKhoa(l) ? 'khoa.html' : 'lop.html'; }

  function diVao(noi) {
    A.luuEm({ lop: noi.lop.maLop, ten: noi.em.ten, ma: A.chuanMa(noi.em.ma) });
    A.danhDauDaChon(noi.lop.maLop);
    location.href = trangCua(noi.lop);
  }

  function moChon(ds) {
    var noi = ds.filter(function (n) { return !A.laKhoa(n.lop); })[0] || ds[0];
    var ten = noi.em.ten, av = $('#chonAv');
    av.style.background = A.itMau(ten);
    av.innerHTML = A.chuAnToan(A.chuTatBong(ten)) + '<img alt="" src="' + A.chuAnToan(A.avUrl(noi.lop.tenGoc || noi.lop.maLop, ten)) + '" onerror="this.remove()">';
    $('#chonTen').textContent = 'Xin chào, ' + ten;
    var hop = $('#chonDs');
    hop.innerHTML = ds.map(function (n, i) {
      return '<button type="button" class="chon-nut" data-i="' + i + '"><span class="cn-ic">' + (A.laKhoa(n.lop) ? IC_KHOA : IC_LOP) +
        '</span><span class="cn-ten">' + A.chuAnToan(chuNut(n.lop)) + '</span><span class="cn-go">›</span></button>';
    }).join('');
    hop.querySelectorAll('.chon-nut').forEach(function (b) { b.onclick = function () { diVao(ds[+b.getAttribute('data-i')]); }; });
    man('manChon');
    ds.forEach(function (n, i) {
      A.coBaiChuaXong(DL, n.lop.maLop, n.em.ten).then(function (co) {
        var b = hop.querySelector('.chon-nut[data-i="' + i + '"]');
        if (co && b && !b.querySelector('.cn-moi')) b.insertAdjacentHTML('beforeend', '<span class="cn-moi">CÓ BÀI MỚI</span>');
      });
    });
  }

  // Đã có phiên Firebase đúng em ⇒ vào nơi học (1 nơi: thẳng · ≥2 nơi: màn chọn).
  function tiepTuc(ds, ma) {
    if (ds.length > 1) { A.luuEm({ lop: '', ten: ds[0].em.ten, ma: A.chuanMa(ma) }); moChon(ds); return; }
    diVao(ds[0]);
  }

  // ---------- màn ĐẶT MẬT KHẨU MỚI (lần đầu) ----------
  var cho = null;          // { ds, ma, mkCu } — nơi em sẽ vào sau khi lưu mật khẩu; mkCu = mật khẩu vừa gõ để vào
  function moDoiMk(ds, ma, mkCu) {
    cho = { ds: ds, ma: ma, mkCu: mkCu || '' };
    var ten = (ds[0] && ds[0].em && ds[0].em.ten) || '';
    $('#doiMkTen').textContent = ten ? 'Chào ' + ten + ', đặt mật khẩu riêng' : 'Đặt mật khẩu riêng';
    $('#mkMoi').value = ''; $('#mkMoi2').value = ''; loiMk('');
    man('manDoiMk');
    $('#mkMoi').focus();
  }
  function luuMk() {
    var m1 = $('#mkMoi').value, m2 = $('#mkMoi2').value;
    loiMk('');
    if (m1.length < MK_TOI_THIEU) { loiMk('Mật khẩu cần ít nhất ' + MK_TOI_THIEU + ' ký tự.'); $('#mkMoi').focus(); return; }
    if (A.chuanMa(m1) === A.chuanMa(cho.ma)) { loiMk('Mật khẩu mới phải khác ID của em.'); $('#mkMoi').focus(); return; }
    // Mật khẩu lớp cả lớp đều biết — giữ lại là bạn nào cũng vào được tài khoản của em.
    if (/andrewclasses/i.test(m1) || (cho.mkCu && m1.toLowerCase() === cho.mkCu.toLowerCase())) {
      loiMk('Đừng dùng lại mật khẩu lớp — cả lớp đều biết. Em đặt mật khẩu của riêng em nhé.'); $('#mkMoi').focus(); return;
    }
    if (m1 !== m2) { loiMk('Hai lần nhập chưa giống nhau.'); $('#mkMoi2').focus(); return; }
    var nut = $('#btnLuuMk'); nut.disabled = true;
    P.datMatKhau(m1).then(function () { nut.disabled = false; tiepTuc(cho.ds, cho.ma); })
      ['catch'](function (e) {
        nut.disabled = false; console.warn('[phien] đặt mật khẩu lỗi', e);
        // phiên đã cũ (em để màn này quá lâu) ⇒ quay về đăng nhập lại
        if (e && e.code === 'auth/requires-recent-login') { loi(P.chuLoi(e)); veManVao(A.chuanMa(cho.ma)); return; }
        loiMk(P.chuLoi(e));
      });
  }

  // Đăng nhập Firebase xong: hồ sơ còn cờ phaiDoiMk ⇒ đặt mật khẩu trước. Đọc hồ sơ lỗi thì cho vào luôn (không chặn em học bài).
  function sauDangNhap(u, ds, ma, mk) {
    return P.hoSo(u).then(function (hs) { return hs && hs.phaiDoiMk; }, function (e) { console.warn('[phien] đọc hồ sơ lỗi', e); return false; })
      .then(function (phaiDoi) { if (phaiDoi) moDoiMk(ds, ma, mk); else tiepTuc(ds, ma); });
  }

  function vao() {
    var go = $('#inMa').value, mk = $('#inMk').value;
    loi('');
    if (!A.chuanMa(go)) { $('#inMa').focus(); return; }
    var nut = $('#btnVao');
    var noi = A.moiNoiTheoMa(DL, go);
    if (noi.length) {
      if (!mk) { loi('Em nhập mật khẩu nhé.'); $('#inMk').focus(); return; }
      nut.disabled = true;
      P.dangNhap(go, mk).then(function (u) { nut.disabled = false; return sauDangNhap(u, noi, go, mk); })
        ['catch'](function (e) { nut.disabled = false; console.warn('[phien] đăng nhập lỗi', e); loi(P.chuLoi(e)); });
      return;
    }
    var db = A.emDacBietTheoMa(DL, go);
    if (db) { A.luuEm({ lop: db.lop.maLop, ten: db.em.ten, ma: A.chuanMa(db.em.ma), dacBiet: true }); location.href = 'lop.html'; return; }
    nut.disabled = true;
    A.laMaQuanLy(go).then(function (dung) {
      nut.disabled = false;
      if (dung) { A.datAdmin(); location.href = 'dashboard.html'; return; }
      loi('Không tìm thấy ID này. Em kiểm tra lại hoặc hỏi thầy Andrew nhé.');
    })['catch'](function () { nut.disabled = false; loi('Không tìm thấy ID này. Em kiểm tra lại hoặc hỏi thầy Andrew nhé.'); });
  }

  function veManVao(maDienSan) {
    var inMa = $('#inMa');
    inMa.value = maDienSan || '';
    if (inMa.value) inMa.placeholder = '';
    $('#inMk').value = '';
    $('#btnVao').disabled = false;
    man('manVao');
    if (maDienSan) $('#inMk').focus();
  }
  function doiNguoi() {
    A.thoat();
    P.thoat()['catch'](function () { });
    loi('');
    veManVao('');
    $('#inMa').focus();
  }

  // chữ mờ trong ô: bấm vào là ẩn, rời ô còn trống thì hiện lại (như myNetwork)
  ['#inMa', '#inMk', '#mkMoi', '#mkMoi2'].forEach(function (s) {
    var o = $(s);
    o.addEventListener('focus', function () { o.placeholder = ''; });
    o.addEventListener('blur', function () { if (!o.value) o.placeholder = o.getAttribute('data-goi'); });
  });
  var inMa = $('#inMa');
  inMa.addEventListener('input', function () { this.value = this.value.toUpperCase(); });
  // Enter ở ô ID: học sinh → sang ô mật khẩu; phụ huynh / mã quản lý (không có mật khẩu) → vào luôn
  inMa.onkeydown = function (e) {
    if (e.key !== 'Enter') return;
    if (A.moiNoiTheoMa(DL, inMa.value).length && !$('#inMk').value) $('#inMk').focus(); else vao();
  };
  $('#inMk').onkeydown = function (e) { if (e.key === 'Enter') vao(); };
  $('#btnVao').onclick = vao;
  $('#btnKhac').onclick = doiNguoi;
  $('#btnLuuMk').onclick = luuMk;
  $('#mkMoi').onkeydown = function (e) { if (e.key === 'Enter') $('#mkMoi2').focus(); };
  $('#mkMoi2').onkeydown = function (e) { if (e.key === 'Enter') luuMk(); };
  $('#btnHuyMk').onclick = doiNguoi;

  A.napDuLieu().then(async function (dl) {
    DL = dl;
    var epGo = new URLSearchParams(location.search).get('vao') === '1';
    if (epGo) { A.thoat(); A.thoatAdmin(); await P.thoat()['catch'](function () { }); }
    // Máy đã nhớ em → thầy chốt: mở andrewclasses.com LUÔN vào thẳng TRANG BÀI TẬP.
    var nho = epGo ? null : A.docNho();
    if (nho && nho.ma && nho.dacBiet) {
      if (A.emDacBietTheoMa(dl, nho.ma)) { location.replace('lop.html'); return; }
    } else if (nho && nho.ma) {
      var noiCu = A.moiNoiTheoMa(dl, nho.ma);
      if (noiCu.length) {
        // v1.158.0: chỉ vào thẳng khi Firebase còn giữ phiên ĐÚNG em này
        var u = await P.phienCuaMa(nho.ma)['catch'](function () { return null; });
        if (u) {
          var phaiDoi = await P.hoSo(u).then(function (hs) { return hs && hs.phaiDoiMk; }, function () { return false; });
          if (phaiDoi) { moDoiMk(noiCu, nho.ma, ''); return; }
          if (noiCu.length > 1) { moChon(noiCu); return; }
          location.replace(trangCua(noiCu[0].lop)); return;
        }
        A.thoat();
        veManVao(A.chuanMa(nho.ma));
        return;
      }
    }
    if (!epGo && A.laAdmin()) { location.replace('dashboard.html'); return; }
    P.thoat()['catch'](function () { });     // máy không nhớ em nào ⇒ bỏ phiên học sinh cũ (nếu có)
    veManVao('');
    if (!DL.lop.length) loi('Danh sách lớp chưa sẵn sàng. Em báo thầy Andrew nhé.');
  })['catch'](function () { man('manVao'); loi('Chưa đọc được dữ liệu. Em thử tải lại trang nhé.'); });
})();
