/* ============================================================
   gioi-thieu.js — PHIM GIỚI THIỆU KHÓA MỚI + THẺ "GIỚI THIỆU" (khoa.html) · v1.286.0 (09/10/2026, thầy chốt mockup v4)

   - Chỉ áp cho KHÓA NỀN TẢNG K10 trở đi (tên khóa "NỀN TẢNG K<số>", số ≥ 10). ⛔ "NỀN TẢNG 4" (không có chữ K) là
     LỚP THƯỜNG, không phải khóa — không áp.
   - Lần đầu vào khóa: phim TỰ MỞ, BẮT BUỘC xem tới màn cuối bấm "Vâng!" (không có nút Để sau / Đóng).
     Tắt giữa chừng ⇒ lần đăng nhập sau phim tự mở lại, CHẠY TIẾP từ màn đang dở.
   - Đã xem xong ⇒ khóa CHƯA có bài nào thì cột bài hiện THẺ GIỚI THIỆU (bấm = xem lại, lúc đó mới có nút Đóng).
   - Phim là trang riêng `gioi-thieu/index.html` mở trong IFRAME (tách hẳn CSS/JS khỏi trang khóa), nói chuyện bằng postMessage.
   - Lưu tiến độ: localStorage (máy này) + `nwUsers/{uid}.xemGt.<mã khóa> = {man, xong, luc}` (mọi máy).
     Ghi nwUsers cần luật `tools/dang-luat-xem-gioi-thieu.js` — chưa đăng luật thì ghi máy chủ bị từ chối, IM LẶNG dùng localStorage.
   - Thầy xem như em / đăng nhập thay em: KHÔNG tự mở phim, KHÔNG ghi gì; vẫn thấy thẻ để bấm xem thử.
   ============================================================ */
(function () {
  'use strict';
  var PHIEN = '1';   // đổi khi sửa gioi-thieu/ ⇒ iframe không dùng bản cũ trong bộ nhớ đệm
  var DS_MAN = 12;

  function laKhoaApDung(tenKhoa) {
    var t = String(tenKhoa || '').normalize('NFC').toLocaleUpperCase('vi');
    var m = t.match(/N[ỀE]N\s*T[ẢA]NG\s*K\s*(\d+)/);
    return !!(m && +m[1] >= 10);
  }
  function laThay(ctx) { return !!(window.__thayVao || (ctx && ctx.vaiTro === 'gv')); }
  function khoaLs(ctx) { return 'ac_gt_' + String(ctx.ma || '') + '_' + String(ctx.lopMa || ''); }
  function docLs(ctx) { try { return JSON.parse(localStorage.getItem(khoaLs(ctx))) || {}; } catch (e) { return {}; } }
  function ghiLs(ctx, st) { try { localStorage.setItem(khoaLs(ctx), JSON.stringify(st)); } catch (e) { } }
  function bay() { return window.gioChuan ? window.gioChuan() : Date.now(); }

  // Tài khoản HỌC SINH thật đang đăng nhập (uid hs_…) — null nếu là thầy / chế độ xem như em / chưa đăng nhập.
  function uidEm() {
    if (!window.NWP || window.__thayVao) return Promise.resolve(null);
    return NWP.userHienTai().then(function (u) { return u && /^hs_/.test(u.uid) ? u : null; })['catch'](function () { return null; });
  }

  // Trạng thái = gộp máy này + máy chủ (xong ở đâu cũng tính xong; màn dở lấy màn xa nhất).
  function docTrangThai(ctx) {
    var ls = docLs(ctx);
    return uidEm().then(function (u) {
      if (!u) return null;
      return NWP.hoSo(u).then(function (h) { return (h && h.xemGt && h.xemGt[ctx.lopMa]) || null; })['catch'](function () { return null; });
    }).then(function (sv) {
      sv = sv || {};
      var st = { man: Math.max(+ls.man || 0, +sv.man || 0), xong: !!(ls.xong || sv.xong) };
      if (st.xong) st.man = 0;
      if (sv.xong && !ls.xong) ghiLs(ctx, st);   // máy khác đã xem xong ⇒ máy này nhớ luôn
      return st;
    });
  }

  var hangGhi = null, dangGhi = false;
  function ghiMayChu(ctx, st) {
    hangGhi = st;
    if (dangGhi) return;
    dangGhi = true;
    uidEm().then(function (u) {
      if (!u) { hangGhi = null; return; }   // ⛔ không có phiên em ⇒ bỏ hàng chờ (để nguyên = vòng gọi lại vô tận, treo trang)
      return NWP.fb().then(function (f) {
        function vong() {
          var g = hangGhi; hangGhi = null;
          if (!g) return;
          var o = { capNhat: bay() };
          o['xemGt.' + ctx.lopMa] = { man: g.man, xong: !!g.xong, luc: bay() };
          return f.fs.updateDoc(f.fs.doc(f.db, 'nwUsers', u.uid), o).then(vong);
        }
        return vong();
      });
    })['catch'](function (e) { hangGhi = null; console.warn('[gioi-thieu] chưa ghi được lên tài khoản (dùng máy này)', e && e.code || e); })
      .then(function () { dangGhi = false; if (hangGhi) ghiMayChu(ctx, hangGhi); });
  }
  function luu(ctx, st) {
    if (laThay(ctx)) return;
    ghiLs(ctx, st);
    ghiMayChu(ctx, st);
  }

  // ---------- mở phim (iframe phủ kín màn) ----------
  var lop = null;
  function anhEm() {
    var i = document.querySelector('#nutMenu img');
    return (i && i.complete && i.naturalWidth) ? i.src : '';
  }
  function mo(ctx, opt) {
    if (lop) return;
    opt = opt || {};
    var lai = !!opt.lai, man = lai ? 0 : (+opt.man || 0), daXong = !!opt.daXong;
    lop = document.createElement('div');
    lop.className = 'gtk-phim';
    lop.innerHTML = '<iframe title="Giới thiệu khóa học" src="gioi-thieu/index.html?v=' + PHIEN + '" allow="autoplay"></iframe>';
    document.body.appendChild(lop);
    document.documentElement.classList.add('gtk-mo');
    var khung = lop.querySelector('iframe');
    function dong() {
      window.removeEventListener('message', nghe);
      document.documentElement.classList.remove('gtk-mo');
      if (lop) { lop.classList.add('ra'); var l = lop; setTimeout(function () { l.remove(); }, 450); }
      lop = null;
    }
    function nghe(e) {
      if (e.origin !== location.origin || e.source !== khung.contentWindow || !e.data) return;
      var d = e.data;
      if (d.gtSan) {
        khung.contentWindow.postMessage({ gtBatDau: { ten: ctx.ten, anh: anhEm(), khoa: ctx.lop, man: man, lai: lai } }, location.origin);
        try { khung.contentWindow.focus(); } catch (x) { }
      } else if (d.gtMan !== undefined) {
        if (!lai && !daXong) luu(ctx, { man: +d.gtMan || 0, xong: false });
      } else if (d.gtXong) {
        if (!daXong) luu(ctx, { man: 0, xong: true });
        dong();
        if (opt.khiXong) opt.khiXong();
      } else if (d.gtDong) {
        if (lai || daXong) dong();   // lần đầu không có nút Đóng — phòng hờ
      }
    }
    window.addEventListener('message', nghe);
  }

  // ---------- thẻ GIỚI THIỆU (cột bài, khi khóa chưa có bài nào) ----------
  var IC = {
    tin: '<svg viewBox="0 0 24 24"><path d="M8.2 3h7.6c3.8 0 5.4 1.6 5.4 5.4v3.4c0 3.8-1.6 5.4-5.4 5.4h-2.1l-4.9 3.4c-.7.5-1.6-.1-1.4-.9l.2-.9c.2-.8-.3-1.6-1.1-1.6h-.3c-2.8 0-3.4-1.6-3.4-5.4V8.4C2.8 4.6 4.4 3 8.2 3z"/><path d="M7.7 8.1h4.9M7.7 12.1h8.6"/></svg>',
    game: '<svg viewBox="0 0 24 24"><rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.5" cy="11.5" r="1" fill="currentColor"/><circle cx="17.5" cy="13.8" r="1" fill="currentColor"/></svg>',
    sao: '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z"/></svg>',
    co: '<svg viewBox="0 0 24 24"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>'
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function theHtml(ctx) {
    var chuTat = String(ctx.ten || '').trim().split(/\s+/).slice(-2).map(function (w) { return w[0] || ''; }).join('').toUpperCase();
    var a = anhEm();
    return '<button type="button" class="gtk-the" id="gtkThe" title="Xem lại giới thiệu khóa học">' +
      '<span class="gtk-in"><span class="gtk-sao" aria-hidden="true"></span>' +
        '<span class="gtk-body">' +
          '<span class="gtk-mat">KHÓA ' + esc(String(ctx.lop || '').toLocaleUpperCase('vi')) + '</span>' +
          '<span class="gtk-ten">GIỚI THIỆU</span>' +
          '<span class="gtk-chu">Hành trình 8 tháng cùng Thầy Andrew</span>' +
          '<span class="gtk-duoi"><span class="gtk-ic">' +
            '<i><img src="gioi-thieu/assets/thay-tron.jpg" alt=""></i><i>' + IC.tin + '</i><i>' + IC.game + '</i><i>' + IC.sao + '</i><i>' + IC.co + '</i>' +
            '<b>' + DS_MAN + ' màn</b></span><span class="gtk-da">ĐÃ XEM ✓</span></span>' +
        '</span>' +
        '<span class="gtk-bay" aria-hidden="true">' +
          '<span class="gtk-gb gtk-thay"><img src="gioi-thieu/assets/thay-tron.jpg" alt=""></span>' +
          '<span class="gtk-gb gtk-em">' + esc(chuTat) + (a ? '<img src="' + esc(a) + '" alt="" onerror="this.remove()">' : '') + '</span>' +
          '<i class="gtk-lap a"></i><i class="gtk-lap b"></i><i class="gtk-lap c"></i>' +
        '</span>' +
        '<span class="gtk-play">' + IC.play + '</span>' +
      '</span></button>';
  }

  window.GioiThieu = {
    apDung: laKhoaApDung,
    docTrangThai: docTrangThai,
    mo: mo,
    theHtml: theHtml,
    laThay: laThay
  };
})();
