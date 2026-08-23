/* ============================================================
   dangnhap.js — MÀN ĐĂNG NHẬP (web v1.9.0)

   Trước v1.9.0 cả trang web là MỘT file `js/app.js` gồm 3 màn (đăng nhập →
   danh sách bài → một bài). Từ v1.9.0 mỗi màn là một trang riêng theo đúng bộ
   mẫu thầy đã chốt, nên file này chỉ còn lo đúng màn đăng nhập:

     · mã của HỌC SINH  -> nhớ vào máy em rồi sang `lop.html` (trang của lớp em)
     · mã QUẢN LÝ       -> sang `dashboard.html`
     · ngăn THÔNG TIN   -> giữ nguyên như v1.8.0-1.8.2

   ⛔⛔ ĐỪNG DỰNG LẠI HOẠT ẢNH RIÊNG CHO BRAND (icon + chữ Andrew Classes).
   Hai bản trước đã thử: brand bị dời DOM giữa 2 thẻ nên phải bù bằng FLIP, và
   thầy bắt lỗi "chưa ăn khớp" CẢ HAI LẦN. Nay brand nằm yên, chỉ hai "ngăn"
   đóng/mở bằng max-height ⇒ chỉ MỘT nguồn chuyển động, khớp tuyệt đối.
   ============================================================ */
(function () {
  'use strict';

  var A = window.AWC;
  var CFG = A.CFG;
  var DL = { lop: [], bai: {} };

  var $ = function (s) { return document.querySelector(s); };

  function hienModal(tieuDe, chu) {
    $('#modalTitle').textContent = tieuDe;
    $('#modalText').textContent = chu;
    $('#modal').hidden = false;
  }

  // ---------- hai ngăn trong cùng một thẻ ----------

  var THOI_GIAN_NGAN = 580;   // ⛔ phải khớp transition max-height của .ngan trong main.css
  var dangChuyenNgan = false;

  function datNgan(ten, tucThi) {
    var moi = ten === 'info' ? $('#nganInfo') : $('#nganLogin');
    var cu = ten === 'info' ? $('#nganLogin') : $('#nganInfo');
    var brand = $('#btnBrand');
    brand.setAttribute('aria-label', ten === 'info' ? 'Quay lại màn đăng nhập' : 'Mở trang thông tin');

    // Ngăn đang đóng phải `inert` — CSS chỉ thu nó về 0 chiều cao, phím Tab và
    // trình đọc màn hình VẪN chui vào các nút bên trong nếu không chặn.
    cu.inert = true;
    moi.inert = false;

    if (tucThi) {
      cu.classList.add('ngan-dong'); cu.style.maxHeight = '';
      moi.classList.remove('ngan-dong'); moi.style.maxHeight = 'none';
      brand.classList.toggle('gon', ten === 'info');
      return;
    }
    // Đang chạy dở thì bỏ qua cú bấm mới — bấm liên tiếp sẽ chồng hai chuỗi
    // setTimeout lên nhau, ngăn kẹt ở max-height nửa vời.
    if (dangChuyenNgan) return;
    dangChuyenNgan = true;

    // B1 — ĐÓNG ngăn cũ. Phải chốt max-height về số px thật trước, vì đang là
    // 'none' thì trình duyệt không có mốc đầu để chạy transition.
    cu.style.maxHeight = cu.scrollHeight + 'px';
    void cu.offsetWidth;
    cu.classList.add('ngan-dong');

    setTimeout(function () {
      // B2 — MỞ ngăn mới, từ 0 lên đúng chiều cao thật của nó.
      brand.classList.toggle('gon', ten === 'info');
      moi.classList.remove('ngan-dong');
      moi.style.maxHeight = '0px';
      void moi.offsetWidth;
      moi.style.maxHeight = moi.scrollHeight + 'px';
      setTimeout(function () {
        moi.style.maxHeight = 'none';
        dangChuyenNgan = false;
        var dungRa = location.hash === '#/info' ? 'info' : 'login';
        if (dungRa !== ten) datNgan(dungRa, false);
      }, THOI_GIAN_NGAN + 20);
    }, THOI_GIAN_NGAN);
  }

  // ---------- đăng nhập ----------

  function vaoHoc() {
    var go = $('#inCode').value;
    if (!A.chuanMa(go)) {
      return hienModal('Type your code first',
        'Teacher Andrew gave you a secret code. Ask him if you forgot it.');
    }

    // Mã của học sinh xét TRƯỚC (nhanh, không phải chờ băm) rồi mới tới mã thầy.
    var thay = A.timTheoMa(DL, go);
    if (thay) {
      A.luuEm({ lop: thay.lop.maLop, ten: thay.em.ten, ma: A.chuanMa(thay.em.ma) });
      location.href = 'lop.html';
      return;
    }

    var nut = $('#btnLogin');
    nut.disabled = true;
    A.laMaQuanLy(go).then(function (dung) {
      nut.disabled = false;
      if (dung) { A.datAdmin(); location.href = 'dashboard.html'; return; }
      hienModal('We cannot find this code',
        'Check your code again, or ask teacher Andrew to help you.');
    })['catch'](function () {
      nut.disabled = false;
      hienModal('We cannot find this code',
        'Check your code again, or ask teacher Andrew to help you.');
    });
  }

  // ---------- khởi động ----------

  function batDau() {
    document.title = CFG.TEN_SITE || 'Lesson in Andrew Classes';

    // Nền loang xoay CỰC chậm — bốc thăm chiều xuôi/ngược mỗi lần mở trang.
    $('#loginBg').classList.add(Math.random() < 0.5 ? 'xuoi' : 'nguoc');

    A.napDuLieu().then(function (dl) {
      DL = dl;

      // Máy này từng đăng nhập rồi thì vào thẳng lớp, khỏi gõ lại mã.
      // ⛔ Chỉ tự vào khi KHÔNG có `#/info` trên địa chỉ: thầy/em bấm vào trang
      // thông tin từ ngoài thì phải được xem, không bị đá đi ngay.
      if (location.hash !== '#/info' && A.emDangHoc(dl)) {
        location.replace('lop.html');
        return;
      }
      // Máy của thầy (đã gõ đúng mã quản lý lần trước) thì vào thẳng trang quản lý.
      if (location.hash !== '#/info' && A.laAdmin()) {
        location.replace('dashboard.html');
        return;
      }

      if (!DL.lop.length) {
        $('#loginNote').textContent =
          'The lesson list is not ready yet. Ask teacher Andrew.';
        $('#loginNote').hidden = false;
      }
      datNgan(location.hash === '#/info' ? 'info' : 'login', true);
    });

    $('#inCode').onkeydown = function (e) { if (e.key === 'Enter') vaoHoc(); };
    $('#btnLogin').onclick = vaoHoc;

    var GIAM_CHUYEN_DONG = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    (function () {
      var brand = $('#btnBrand');
      function di() {
        var moInfo = location.hash !== '#/info';
        location.hash = moInfo ? '#/info' : '';
        if (!GIAM_CHUYEN_DONG) datNgan(moInfo ? 'info' : 'login', false);
      }
      brand.onclick = di;
      brand.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); di(); }
      };
    })();

    $('#modalOk').onclick = function () { $('#modal').hidden = true; };

    // Ba mục trong ngăn thông tin: thầy đưa nội dung sau (v1.8.0 để dành chỗ).
    ['#mnTrial', '#mnInfo', '#mnContact'].forEach(function (id) {
      var n = $(id);
      if (n) n.onclick = function () {
        hienModal('Coming soon', 'Teacher Andrew is building this page.');
      };
    });

    window.addEventListener('hashchange', function () {
      datNgan(location.hash === '#/info' ? 'info' : 'login', !dangChuyenNgan);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', batDau);
  } else {
    batDau();
  }
})();
