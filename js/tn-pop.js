/* tn-pop.js — HỘP TIN NHẮN THẢ XUỐNG kiểu Facebook (thiết kế 03/10/2026; thầy chốt từng việc rồi mới lên live).
   Bấm icon TIN NHẮN trên thanh ⇒ mở hộp ngay dưới icon: tiêu đề · ô tìm · Tất cả/Chưa đọc · danh sách cuộc chat · chân "Xem tất cả trong Tin nhắn"
   (chỉ bấm chân này — hoặc một dòng chat — mới sang trang Tin nhắn).
   Dùng chung cho thanh của trang lớp/khóa/dashboard (js/nw-thanh.js) và thanh của 8 trang nw/ (nw/js/thanh.js).

   TnPop.nguon  = hàm trả về (hoặc Promise) mảng cuộc chat — TRANG GẮN SAU khi nối dữ liệu thật. Chưa gắn:
                  máy localhost (bàn thử) dùng danh sách MẪU; trang thật `TnPop.coThe()` = false ⇒ thanh đi thẳng sang trang như cũ.
   Mỗi cuộc chat: { id, ten, loai:'lop'|'thay'|'nhom'|'rieng', anh:[{ten, url?, mau?}], cuoi:'Andrew: …', gio:'T6', chua:true|false }
   TnPop.mo(neoEl, { trang:'tinnhan.html', phong:function(id){ return 'tinnhan.html?phong='+… } })  ·  TnPop.dong() */
(function () {
  'use strict';
  var SRC = (document.currentScript && document.currentScript.src) || '';
  var GOC = SRC.replace(/js\/tn-pop\.js.*$/, '');   // thư mục gốc web (chứa assets/, nw/)
  var TP = window.TnPop = {};
  var mo = null;   // { pop, nen, ds, cuoc, loc, chu }

  var BIEU = {
    tim: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    mr: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/></svg>',
    lop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/><path d="M12 7.1l1.45 2.95 3.25.47-2.35 2.3.55 3.24L12 14.53l-2.9 1.53.55-3.24-2.35-2.3 3.25-.47z" fill="#fff"/></svg>',
    thay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484z"/><path d="M8.3 12.4l2.5 2.5 5-5.2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  var MAU = ['#B3541E', '#0E7C6E', '#8CC63F', '#E5705F', '#9C6ADE', '#2F80ED'];

  function an(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function khongDau(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function tat(s) { var w = String(s || '?').trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase(); }

  function avHtml(ds) {
    ds = (ds && ds.length ? ds : [{ ten: '?' }]).slice(0, 4);
    var gom = ds.length > 1;
    return '<span class="tp-av ' + (gom ? 'nhom' : 'mot') + '">' + ds.map(function (a, i) {
      return '<i style="background:' + (a.mau || MAU[i % MAU.length]) + '">' + an(tat(a.ten)) + (a.url ? '<img src="' + an(a.url) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</i>';
    }).join('') + '</span>';
  }

  // ---------- danh sách MẪU cho bàn thử (localhost) ----------
  function mau() {
    var tv = GOC + 'nw/assets/avatar-tron.jpg';
    var thay = { ten: 'Thầy Andrew', url: tv, mau: '#9C6ADE' };
    return [
      { id: 'lop:A1C', ten: 'Lớp A1-C', loai: 'lop', anh: [thay, { ten: 'MINH ANH' }, { ten: 'BẢO NAM' }, { ten: 'THẢO VY' }], cuoi: 'Andrew: Tuần sau kiểm tra WORDS 3 nhé cả lớp', gio: 'T6', chua: false },
      { id: 'lop:NNTNGK9', ten: 'Nền Tảng K9', loai: 'lop', anh: [thay, { ten: 'DUY CƯỜNG' }, { ten: 'QUỲNH MAI' }], cuoi: 'Andrew: Lesson 22 mở rồi nha cả nhà', gio: '9:40', chua: true },
      { id: 'rieng:thay', ten: 'Thầy Andrew', loai: 'thay', anh: [thay], cuoi: 'Thầy thấy rồi, tốt lắm 👍', gio: '7:50', chua: false },
      { id: 'lop:B1B', ten: 'Lớp B1-B', loai: 'lop', anh: [thay, { ten: 'HẢI ĐĂNG' }, { ten: 'NGỌC ANH' }, { ten: 'GIA BẢO' }], cuoi: 'Phúc: 👍 👏 🙏', gio: 'T5', chua: false },
      { id: 'lop:B2A', ten: 'Lớp B2-A', loai: 'lop', anh: [thay, { ten: 'ANTHONY' }, { ten: 'TRÚC LINH' }, { ten: 'MINH KHÔI' }], cuoi: 'Anthony: ?', gio: '12:57', chua: false },
      { id: 'lop:A2B', ten: 'Lớp A2-B', loai: 'lop', anh: [thay, { ten: 'TRỌNG' }, { ten: 'KHÁNH LINH' }], cuoi: 'Trọng: 🩷', gio: 'T6', chua: false },
      { id: 'lop:NNTNG4', ten: 'Nền Tảng 4', loai: 'lop', anh: [thay, { ten: 'LINH' }, { ten: 'BẢO CHÂU' }, { ten: 'TÂM NHI' }], cuoi: 'Linh: Vô địch', gio: '12:12', chua: false }
    ];
  }

  TP.nguon = null;
  TP.coThe = function () { return !!TP.nguon || /^(localhost|127\.0\.0\.1)$/.test(location.hostname); };
  TP.dong = function () {
    if (!mo) return;
    var m = mo; mo = null;
    m.pop.classList.remove('mo');
    document.removeEventListener('keydown', m.phim, true);
    window.removeEventListener('resize', m.dongNgay);
    setTimeout(function () { m.pop.remove(); m.nen.remove(); }, 180);
  };

  TP.mo = function (neo, o) {
    o = o || {};
    if (mo) { TP.dong(); return; }   // bấm lần nữa vào icon = đóng
    var trang = o.trang || 'tinnhan.html';
    var phong = o.phong || function (id) { return trang + (trang.indexOf('?') < 0 ? '?' : '&') + 'phong=' + encodeURIComponent(id); };
    var nen = document.createElement('div'); nen.className = 'tp-nen';
    var pop = document.createElement('div'); pop.className = 'tp-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Tin nhắn');
    pop.innerHTML =
      '<div class="tp-dau"><h3>Tin nhắn</h3></div>' +
      '<div class="tp-tim"><label>' + BIEU.tim + '<input type="search" placeholder="Tìm trong tin nhắn" aria-label="Tìm trong tin nhắn"></label></div>' +
      '<div class="tp-loc"><button type="button" class="chon" data-loc="tat">Tất cả</button><button type="button" data-loc="chua">Chưa đọc</button></div>' +
      '<div class="tp-ds"><div class="tp-trong">Đang tải…</div></div>' +
      '<a class="tp-chan" href="' + an(trang) + '">Xem tất cả trong Tin nhắn</a>';
    document.body.appendChild(nen); document.body.appendChild(pop);
    // máy tính: nằm ngay DƯỚI icon, canh giữa icon rồi kẹp trong màn hình (điện thoại: CSS đặt sát đầu màn)
    if (neo && window.innerWidth > 640) {
      var r = neo.getBoundingClientRect(), W = Math.min(360, window.innerWidth - 16);
      pop.style.top = Math.round(r.bottom + 6) + 'px';
      pop.style.left = Math.max(8, Math.min(window.innerWidth - W - 8, Math.round(r.left + r.width / 2 - W / 2))) + 'px';
    }
    var m = mo = { pop: pop, nen: nen, cuoc: [], loc: 'tat', chu: '' };
    m.dongNgay = function () { TP.dong(); };
    m.phim = function (e) { if (e.key === 'Escape') { e.stopPropagation(); TP.dong(); } };
    document.addEventListener('keydown', m.phim, true);
    window.addEventListener('resize', m.dongNgay);
    nen.onclick = TP.dong;
    requestAnimationFrame(function () { pop.classList.add('mo'); });

    var khu = pop.querySelector('.tp-ds');
    function ve() {
      var ds = m.cuoc.filter(function (c) {
        if (m.loc === 'chua' && !c.chua) return false;
        return !m.chu || khongDau(c.ten).indexOf(m.chu) >= 0;
      });
      if (!ds.length) { khu.innerHTML = '<div class="tp-trong">' + (m.chu ? 'Không thấy cuộc trò chuyện nào.' : m.loc === 'chua' ? 'Không có tin chưa đọc.' : 'Chưa có cuộc trò chuyện nào.') + '</div>'; return; }
      khu.innerHTML = ds.map(function (c) {
        return '<button type="button" class="tp-muc' + (c.chua ? ' chua' : '') + '" data-id="' + an(c.id) + '">' + avHtml(c.anh) +
          '<span class="tp-tt"><span class="tp-ten"><span>' + an(c.ten) + '</span>' + (c.loai === 'lop' ? BIEU.lop : c.loai === 'thay' ? BIEU.thay : '') + '</span>' +
          '<span class="tp-cuoi">' + an(c.cuoi || 'Bắt đầu trò chuyện') + (c.gio ? ' · ' + an(c.gio) : '') + '</span></span>' +
          (c.chua ? '<span class="tp-cham" aria-label="Chưa đọc"></span>' : '') + '</button>';
      }).join('');
    }
    pop.querySelector('.tp-tim input').addEventListener('input', function () { m.chu = khongDau(this.value.trim()); ve(); });
    pop.querySelector('.tp-loc').addEventListener('click', function (e) {
      var b = e.target.closest('[data-loc]'); if (!b) return;
      m.loc = b.getAttribute('data-loc');
      [].forEach.call(pop.querySelectorAll('.tp-loc button'), function (x) { x.classList.toggle('chon', x === b); });
      ve();
    });
    khu.addEventListener('click', function (e) {
      var b = e.target.closest('.tp-muc'); if (!b) return;
      location.href = phong(b.getAttribute('data-id'));
    });
    Promise.resolve(TP.nguon ? TP.nguon() : mau()).then(function (ds) { if (mo === m) { m.cuoc = ds || []; ve(); } })
      .catch(function () { if (mo === m) khu.innerHTML = '<div class="tp-trong">Chưa tải được tin nhắn. Bấm "Xem tất cả" để mở trang Tin nhắn.</div>'; });
  };
})();
