/* ============================================================
   nw-dangnhap.js — MÀN ĐĂNG NHẬP giao diện myNetwork (mẫu v29, 24/09/2026)

   Thầy chốt 24/09: hình myNetwork, nhưng CÁCH VÀO giữ y myLesson (js/dangnhap.js):
     · gõ Andrew Classes ID (= mã My ID cũ); ô mật khẩu KHOÁ, chữ "Để trống ô này"
       — kích hoạt + ép đổi mật khẩu SAU, khi myNetwork xong
     · mã học sinh một nơi → vào thẳng TRANG BÀI TẬP (lop.html / khoa.html)
     · mã ở 2 nơi → màn chọn (hỏi lại mỗi lần mở trang, như v1.78.0/v1.111.0)
     · học sinh đặc biệt (phụ huynh) → lop.html · mã quản lý → dashboard.html
   Logic chép từ js/dangnhap.js — ⛔ sửa luật vào lớp thì sửa CẢ HAI nơi cho tới khi bỏ file cũ.
   ============================================================ */
(function () {
  'use strict';
  var A = window.AWC;
  var DL = { lop: [], bai: {} };
  var $ = function (s) { return document.querySelector(s); };

  function man(ten) { document.querySelectorAll('.man').forEach(function (m) { m.classList.toggle('hien', m.id === ten); }); }
  function loi(chu) { var p = $('#loiVao'); p.hidden = !chu; p.textContent = chu || ''; }

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

  function vao() {
    var go = $('#inMa').value;
    loi('');
    if (!A.chuanMa(go)) { $('#inMa').focus(); return; }
    var noi = A.moiNoiTheoMa(DL, go);
    if (noi.length > 1) { A.luuEm({ lop: '', ten: noi[0].em.ten, ma: A.chuanMa(go) }); moChon(noi); return; }
    if (noi.length === 1) { diVao(noi[0]); return; }
    var db = A.emDacBietTheoMa(DL, go);
    if (db) { A.luuEm({ lop: db.lop.maLop, ten: db.em.ten, ma: A.chuanMa(db.em.ma), dacBiet: true }); location.href = 'lop.html'; return; }
    var nut = $('#btnVao'); nut.disabled = true;
    A.laMaQuanLy(go).then(function (dung) {
      nut.disabled = false;
      if (dung) { A.datAdmin(); location.href = 'dashboard.html'; return; }
      loi('Không tìm thấy ID này. Em kiểm tra lại hoặc hỏi thầy Andrew nhé.');
    })['catch'](function () { nut.disabled = false; loi('Không tìm thấy ID này. Em kiểm tra lại hoặc hỏi thầy Andrew nhé.'); });
  }

  // chữ mờ trong ô: bấm vào là ẩn, rời ô còn trống thì hiện lại (như myNetwork)
  var inMa = $('#inMa');
  inMa.addEventListener('focus', function () { inMa.placeholder = ''; });
  inMa.addEventListener('blur', function () { if (!inMa.value) inMa.placeholder = inMa.getAttribute('data-goi'); });
  inMa.addEventListener('input', function () { this.value = this.value.toUpperCase(); });
  inMa.onkeydown = function (e) { if (e.key === 'Enter') vao(); };
  $('#btnVao').onclick = vao;
  $('#btnKhac').onclick = function () { A.thoat(); inMa.value = ''; man('manVao'); inMa.focus(); };

  A.napDuLieu().then(function (dl) {
    DL = dl;
    var epGo = new URLSearchParams(location.search).get('vao') === '1';
    if (epGo) { A.thoat(); A.thoatAdmin(); }
    // Máy đã nhớ em → thầy chốt: mở andrewclasses.com LUÔN vào thẳng TRANG BÀI TẬP.
    var nho = epGo ? null : A.docNho();
    if (nho && nho.ma && nho.dacBiet) {
      if (A.emDacBietTheoMa(dl, nho.ma)) { location.replace('lop.html'); return; }
    } else if (nho && nho.ma) {
      var noiCu = A.moiNoiTheoMa(dl, nho.ma);
      if (noiCu.length > 1) { moChon(noiCu); return; }
      if (noiCu.length === 1) { location.replace(trangCua(noiCu[0].lop)); return; }
    }
    if (!epGo && A.laAdmin()) { location.replace('dashboard.html'); return; }
    man('manVao');
    if (!DL.lop.length) loi('Danh sách lớp chưa sẵn sàng. Em báo thầy Andrew nhé.');
  })['catch'](function () { man('manVao'); loi('Chưa đọc được dữ liệu. Em thử tải lại trang nhé.'); });
})();
