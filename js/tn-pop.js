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
  TP.mau = mau;
  TP.lamMoi = function () { };
  TP.coThe = function () { return !!TP.nguon || /^(localhost|127\.0\.0\.1)$/.test(location.hostname); };
  // ⭐ 03/10: hộp đang mở mà bấm icon TAB KHÁC (vd chuông) ⇒ chuyển NGAY (đóng hộp này + mở hộp kia), không bắt bấm 2 lần.
  //   Lớp nền trong suốt nuốt cú bấm ⇒ tìm phần tử thật nằm dưới điểm bấm; là icon tab khác icon đã mở hộp thì bấm hộ nó.
  // ⭐ 03/10: hộp mở ⇒ icon của hộp SÁNG (chon), icon tab hiện tại tắt tạm; đóng hộp ⇒ trả sáng lại tab hiện tại.
  function sangIcon(m) {
    var neo = m.neo; if (!neo || !neo.parentNode) return;
    m.tabCu = [].slice.call(neo.parentNode.children).filter(function (x) { return x !== neo && x.classList.contains('chon'); });
    m.daSang = !neo.classList.contains('chon');
    m.tabCu.forEach(function (x) { x.classList.remove('chon'); });
    neo.classList.add('chon');
  }
  function traIcon(m) {
    if (!m.neo) return;
    if (m.daSang) m.neo.classList.remove('chon');
    (m.tabCu || []).forEach(function (x) { x.classList.add('chon'); });
  }
  function bamNen(m, e) {
    var tab = null;
    m.nen.style.pointerEvents = 'none';
    try {
      var ds = document.elementsFromPoint(e.clientX, e.clientY);
      for (var i = 0; i < ds.length && !tab; i++) tab = ds[i].closest && ds[i].closest('.nwb-tab, .tab[data-tab]');
    } catch (x) { }
    m.nen.style.pointerEvents = '';
    var neo = m.neo;
    TP.dong();
    if (tab && !(neo && (tab === neo || tab.contains(neo) || neo.contains(tab)))) tab.click();
  }
  TP.dong = function () {
    if (!mo) return;
    var m = mo; mo = null;
    traIcon(m);
    m.pop.classList.remove('mo');
    document.removeEventListener('keydown', m.phim, true);
    window.removeEventListener('resize', m.dongNgay);
    tatVV(m);
    setTimeout(function () { m.pop.remove(); m.nen.remove(); }, 180);
  };

  // ============================================================
  // ⭐ v1.254.0 (06/10/2026, thầy chốt) — ĐIỆN THOẠI: bấm một cuộc trong hộp ⇒ CHAT NGAY TRONG HỘP (giữ nguyên cỡ hộp), nút ← về danh sách.
  //   Ruột = đúng khung nhúng của hộp chat nhỏ máy tính (nw/tinnhan.html?hop=1&…) ⇒ gửi/nhận/cảm xúc/đã xem y hệt.
  //   ⛔ Bàn phím iPhone ĐẨY cả trang (memory bay-ban-phim-ios-day-trang): khi bàn phím bật, hộp bám visualViewport —
  //   top = offsetTop + lề, cao = phần màn còn thấy (inline !important vì CSS điện thoại đặt top/height !important).
  // ============================================================
  function vvKhop(m) {
    var vv = window.visualViewport; if (!vv || !m.chat) return;
    var ps = m.pop.style, banPhim = window.innerHeight - vv.height > 120;
    if (!banPhim) { ps.removeProperty('top'); ps.removeProperty('height'); ps.removeProperty('max-height'); return; }
    ps.setProperty('top', Math.round(vv.offsetTop + 6) + 'px', 'important');
    ps.setProperty('height', Math.round(vv.height - 12) + 'px', 'important');
    ps.setProperty('max-height', Math.round(vv.height - 12) + 'px', 'important');
  }
  function batVV(m) {
    var vv = window.visualViewport; if (!vv || m.vvNghe) return;
    m.vvNghe = function () { vvKhop(m); };
    vv.addEventListener('resize', m.vvNghe); vv.addEventListener('scroll', m.vvNghe);
    window.addEventListener('orientationchange', m.vvNghe);
  }
  function tatVV(m) {
    var vv = window.visualViewport; if (!m.vvNghe) return;
    if (vv) { vv.removeEventListener('resize', m.vvNghe); vv.removeEventListener('scroll', m.vvNghe); }
    window.removeEventListener('orientationchange', m.vvNghe);
    m.vvNghe = null;
    ['top', 'height', 'max-height'].forEach(function (k) { m.pop.style.removeProperty(k); });
  }
  function moChatTrongHop(m, it) {
    dongChatTrongHop(m, true);
    var phu = it.loai === 'lop' ? 'Nhóm lớp' : it.loai === 'thay' ? 'Thầy' : (it.lop || '');
    var v = document.createElement('div'); v.className = 'tp-dt';
    v.innerHTML = '<div class="tp-hop-dau"><button type="button" data-lui title="Về danh sách" aria-label="Về danh sách"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      avHtml(it.anh) + '<div class="ai"><b><span>' + an(it.ten) + '</span>' + (it.loai === 'lop' ? BIEU.lop : it.loai === 'thay' ? BIEU.thay : '') + '</b><small>' + an(phu) + '</small></div></div>' +
      '<div class="tp-hop-fr-khu"><iframe class="tp-hop-fr" title="' + an(it.ten) + '" allow="clipboard-write"></iframe><div class="tp-hop-cho">Đang mở…</div></div>';
    m.pop.appendChild(v); m.pop.classList.add('dang-chat'); m.chat = v;
    var fr = v.querySelector('iframe');
    fr.onload = function () { v.querySelector('.tp-hop-cho').classList.add('xong'); };
    fr.src = GOC + it.hop;
    v.querySelector('[data-lui]').onclick = function () { dongChatTrongHop(m); };
    batVV(m);
  }
  function dongChatTrongHop(m, imLang) {
    if (!m.chat) return;
    m.chat.remove(); m.chat = null; m.pop.classList.remove('dang-chat');
    tatVV(m);
    if (!imLang && m.taiLai) m.taiLai();
  }

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
    var m = mo = { pop: pop, nen: nen, neo: neo, cuoc: [], loc: 'tat', chu: '' };
    sangIcon(m);
    // v1.254.0 — chỉ đóng khi BỀ NGANG đổi (xoay máy / kéo cửa sổ): bàn phím điện thoại bật lên chỉ đổi bề cao — trước đây là đóng mất hộp
    m.w = window.innerWidth;
    m.dongNgay = function () { if (Math.abs(window.innerWidth - m.w) > 40) TP.dong(); };
    m.phim = function (e) { if (e.key === 'Escape') { e.stopPropagation(); TP.dong(); } };
    document.addEventListener('keydown', m.phim, true);
    window.addEventListener('resize', m.dongNgay);
    nen.onclick = function (e) { bamNen(m, e); };
    requestAnimationFrame(function () { pop.classList.add('mo'); });
    // ⭐ v1.280.0 — trang có KHUNG TIN NHẮN GIỮ SỐNG (js/tn-khung.js) ⇒ o.moTrang(q) mở khung thay vì sang trang (trả false ⇒ sang trang như cũ)
    function diTrang(q, href) {
      if (o.moTrang) { TP.dong(); if (o.moTrang(q || '')) return; }
      location.href = href;
    }
    pop.querySelector('.tp-chan').addEventListener('click', function (e) {
      if (!o.moTrang || e.ctrlKey || e.metaKey || e.shiftKey) return;   // Ctrl+bấm vẫn mở tab mới như link thường
      e.preventDefault(); diTrang('', trang);
    });

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
      var id = b.getAttribute('data-id');
      var it = m.cuoc.filter(function (c) { return c.id === id; })[0];
      // ⭐ máy tính: mở HỘP CHAT NHỎ góc dưới, giữ nguyên trang đang xem · điện thoại (≤640px): sang trang Tin nhắn như Facebook
      if (it && window.innerWidth > 640) { TP.dong(); TP.moHop(it); return; }
      if (it && it.hop) { moChatTrongHop(m, it); return; }   // v1.254.0 — điện thoại: chat ngay trong hộp
      diTrang(it && it.q ? it.q : 'phong=' + encodeURIComponent(id), (it && it.q) ? trang + (trang.indexOf('?') < 0 ? '?' : '&') + it.q : phong(id));
    });
    Promise.resolve(TP.nguon ? TP.nguon() : mau()).then(function (ds) { if (mo === m) { m.cuoc = ds || []; ve(); } })
      .catch(function () { if (mo === m) khu.innerHTML = '<div class="tp-trong">Chưa tải được tin nhắn. Bấm "Xem tất cả" để mở trang Tin nhắn.</div>'; });
    // v1.253.0 — sổ chưa đọc chung (tn-pop-ds.js) đổi ⇒ vẽ lại danh sách ĐANG MỞ (tin mới nhảy lên đầu, chấm chưa đọc tắt/bật)
    m.taiLai = function () {
      Promise.resolve(TP.nguon ? TP.nguon() : null).then(function (ds) { if (mo === m && ds) { m.cuoc = ds; ve(); } }).catch(function () { });
    };
  };
  TP.veLai = function () { if (mo && mo.taiLai) mo.taiLai(); };
  // ============================================================
  // HỘP THÔNG BÁO THẢ XUỐNG (icon chuông ở trang lớp/khóa/dashboard) — mở NGAY TẠI TRANG, không nhảy sang trang Tin nhắn nữa.
  // (thầy 03/10: bấm chuông bị nháy tải trang Tin nhắn rồi hiện cả hộp tin nhắn lẫn hộp thông báo)
  // Nguồn: TnPop.nguonTB() → [{id, loai, tuTen, tuAnh, chu, luc, daDoc, link, tuUid}] · TnPop.docTB(ids) đánh dấu đã đọc.
  // o.dieu(link): trang quyết định mở link (trang thật chỉ mở được Tin nhắn; còn lại "sắp ra mắt").
  // ============================================================
  var CHU_LOAI = { camXuc: 'đã thả cảm xúc vào bài của em', binhLuan: 'đã bình luận vào bài của em', chiaSe: 'đã chia sẻ bài của em',
                   ketBan: 'muốn kết bạn với em', dongY: 'đã đồng ý kết bạn', nhac: 'đã nhắc tới em', nhom: 'đã thêm em vào nhóm', chung: '' };
  function gioTB(ms) {
    ms = Number(ms) || 0; if (!ms) return '';
    var kc = Date.now() - ms, p = Math.floor(kc / 60000);
    if (p < 1) return 'vừa xong'; if (p < 60) return p + ' phút'; if (p < 1440) return Math.floor(p / 60) + ' giờ';
    var d = new Date(ms); return d.getDate() + '/' + (d.getMonth() + 1);
  }
  TP.coTB = function () { return !!TP.nguonTB; };
  TP.moTB = function (neo, o) {
    o = o || {};
    if (mo) { TP.dong(); return; }
    var nen = document.createElement('div'); nen.className = 'tp-nen';
    var pop = document.createElement('div'); pop.className = 'tp-pop tp-tb'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Thông báo');
    pop.innerHTML = '<div class="tp-dau"><h3>Thông báo</h3><button type="button" class="tp-docHet" hidden>Đánh dấu đã đọc</button></div><div class="tp-ds"><div class="tp-trong">Đang tải…</div></div>';
    document.body.appendChild(nen); document.body.appendChild(pop);
    if (neo && window.innerWidth > 640) {
      var r = neo.getBoundingClientRect(), W = Math.min(360, window.innerWidth - 16);
      pop.style.top = Math.round(r.bottom + 6) + 'px';
      pop.style.left = Math.max(8, Math.min(window.innerWidth - W - 8, Math.round(r.left + r.width / 2 - W / 2))) + 'px';
    }
    var m = mo = { pop: pop, nen: nen, neo: neo };
    sangIcon(m);
    m.dongNgay = function () { TP.dong(); };
    m.phim = function (e) { if (e.key === 'Escape') { e.stopPropagation(); TP.dong(); } };
    document.addEventListener('keydown', m.phim, true);
    window.addEventListener('resize', m.dongNgay);
    nen.onclick = function (e) { bamNen(m, e); };
    requestAnimationFrame(function () { pop.classList.add('mo'); });
    var khu = pop.querySelector('.tp-ds'), nutHet = pop.querySelector('.tp-docHet'), ds = [];
    function capNhatSo() { var n = ds.filter(function (t) { return !t.daDoc; }).length; nutHet.hidden = !n; if (window.NWB && NWB.datSo) NWB.datSo('chuong', n); }
    function ve() {
      capNhatSo();
      if (!ds.length) { khu.innerHTML = '<div class="tp-trong">Chưa có thông báo nào.</div>'; return; }
      khu.innerHTML = ds.map(function (t, i) {
        return '<button type="button" class="tp-muc tp-tbm' + (t.daDoc ? '' : ' chua') + '" data-i="' + i + '">' + avHtml([{ ten: t.tuTen || '?', url: t.tuAnh || '' }]) +
          '<span class="tp-tt"><span class="tp-tbchu"><b>' + an(t.tuTen) + '</b> ' + an(t.loai === 'nhac' && o.laThay ? 'đã nhắc tới thầy' : (CHU_LOAI[t.loai] || t.loai || '')) + '</span>' +
          (t.chu ? '<span class="tp-cuoi">' + an(t.chu) + '</span>' : '') + '<span class="tp-gio">' + an(gioTB(t.luc)) + '</span></span>' +
          (t.daDoc ? '' : '<span class="tp-cham" aria-label="Chưa đọc"></span>') + '</button>';
      }).join('');
    }
    khu.addEventListener('click', function (e) {
      var b = e.target.closest('.tp-tbm'); if (!b) return;
      var t = ds[+b.getAttribute('data-i')]; if (!t) return;
      if (!t.daDoc) { t.daDoc = true; if (TP.docTB) TP.docTB([t.id]); }
      TP.dong();
      if (t.link && o.dieu) o.dieu(t.link);
    });
    nutHet.onclick = function () {
      var ids = ds.filter(function (t) { return !t.daDoc; }).map(function (t) { return t.id; });
      ds.forEach(function (t) { t.daDoc = true; }); if (ids.length && TP.docTB) TP.docTB(ids); ve();
    };
    Promise.resolve(TP.nguonTB()).then(function (kq) { if (mo === m) { ds = kq || []; ve(); } })
      .catch(function () { if (mo === m) khu.innerHTML = '<div class="tp-trong">Chưa tải được thông báo. Em thử lại nhé.</div>'; });
  };

  // ============================================================
  // HỘP CHAT NHỎ (góc dưới phải) — bấm một dòng trong hộp thả xuống ⇒ chat nhanh, KHÔNG rời trang đang xem.
  // Khuôn chat = ChatUI (js/chat-ui.js, tự nạp nếu trang chưa có) — y hộp chat nổi của bảng tin.
  // Nguồn tin: TnPop.phong(item) trả adapter { toi:{khoa,ten}, laThay, tin():[tin khuôn], nghe(cb)→huỷ, gui(g)→Promise, datCx(t,gt), thuHoi(t), xoa?(t) }
  //   — TRANG gắn sau khi nối dữ liệu thật. Chưa gắn: máy localhost dùng tin MẪU, gửi = chỉ hiện trên máy.
  // ============================================================
  var hops = [], TOI_DA = 3;
  function nap(xong) {
    if (window.ChatUI) { xong(); return; }
    if (!document.querySelector('link[href*="chat-ui.css"]')) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = GOC + 'css/chat-ui.css?v=19'; document.head.appendChild(l); }
    var sc = document.createElement('script'); sc.src = GOC + 'js/chat-ui.js?v=20'; sc.onload = function () { xong(); }; sc.onerror = function () { xong(true); };
    document.head.appendChild(sc);
  }
  function mauTin(it) {
    var t = Date.now(), thay = it.loai === 'thay', nhom = it.loai === 'lop';
    var ai = it.anh[0] || { ten: it.ten }, hs = it.anh[1] || { ten: 'MINH ANH' };
    function m(id, u, ten, anh, vt, chu, truoc) { return { id: id, uid: u, ma: u, ten: ten, anh: anh || '', vaiTro: vt, chu: chu, luc: t - truoc, cx: {}, sticker: '', thuHoi: false, q: null }; }
    if (thay) return [m('a1', 'gv', 'Thầy Andrew', ai.url, 'gv', 'Em nhớ nộp Worksheet 3 trước tối mai nhé.', 7200e3), m('a2', 'toi', 'BẠN THỬ', '', 'hs', 'Dạ em nộp rồi ạ, thầy xem giúp em 🙏', 7000e3), m('a3', 'gv', 'Thầy Andrew', ai.url, 'gv', 'Thầy thấy rồi, tốt lắm 👍', 6900e3)];
    if (nhom) return [m('a1', 'gv', 'Thầy Andrew', ai.url, 'gv', String(it.cuoi || '').replace(/^[^:]+:\s*/, '') || 'Chào cả lớp!', 5400e3), m('a2', 'u2', hs.ten, hs.url, 'hs', 'Dạ vâng ạ, em nhớ rồi thầy ơi', 5000e3), m('a3', 'toi', 'BẠN THỬ', '', 'hs', 'Em cũng nhớ ạ 😄', 4800e3)];
    return [m('a1', 'u1', ai.ten, ai.url, 'hs', 'Ê, làm xong WORDS 3 chưa?', 3600e3), m('a2', 'toi', 'BẠN THỬ', '', 'hs', 'Chưa, còn 2 act nữa 😅', 3500e3), m('a3', 'u1', ai.ten, ai.url, 'hs', 'Ok, xong rủ đi ăn kem nha 🍦', 3400e3)];
  }
  function adMau(it) {
    var ds = mauTin(it), ngh = null;
    function tim(t) { return ds.filter(function (y) { return y.id === t.id; })[0]; }
    return { toi: { khoa: 'toi', ten: 'BẠN THỬ' }, laThay: false, tin: function () { return ds; },
      nghe: function (cb) { ngh = cb; cb(ds); return function () { ngh = null; }; },
      gui: function (g) { ds = ds.concat([{ id: 'n' + Date.now(), uid: 'toi', ma: 'toi', ten: 'BẠN THỬ', anh: '', vaiTro: 'hs', chu: g.chu || '', luc: Date.now(), cx: {}, sticker: g.sticker || '', thuHoi: false, q: g.q || null }]); if (ngh) ngh(ds); return Promise.resolve(); },
      datCx: function (t, gt) { var x = tim(t); if (x) { x.cx = Object.assign({}, x.cx); if (gt) x.cx.toi = gt; else delete x.cx.toi; } return Promise.resolve(); },
      thuHoi: function (t) { var x = tim(t); if (x) { x.thuHoi = true; x.chu = ''; x.cx = {}; } if (ngh) ngh(ds); return Promise.resolve(); } };
  }
  function khuHop() { var k = document.getElementById('tpKhu'); if (!k) { k = document.createElement('div'); k.id = 'tpKhu'; k.className = 'tp-khu'; document.body.appendChild(k); } return k; }
  function khuMin() { var k = document.getElementById('tpMin'); if (!k) { k = document.createElement('div'); k.id = 'tpMin'; k.className = 'tp-min'; document.body.appendChild(k); } return k; }
  // ⭐ HIỆU ỨNG (thầy chốt 03/10): hộp MỚI cuộn từ dưới lên và xếp ở BÊN TRÁI cùng; đóng/thu nhỏ thì cuộn xuống dưới.
  //   Mỗi hộp là MỘT phần tử giữ nguyên — thêm/bớt hộp nào chỉ đụng đúng hộp đó (không vẽ lại cả hàng ⇒ các hộp khác không nháy).
  function gan(h) {
    var el = h.el, k = khuHop();
    el.classList.remove('xuong'); el.removeAttribute('style');
    k.insertBefore(el, k.firstChild);
    el.classList.remove('len'); void el.offsetWidth; el.classList.add('len');
    h.ve();
  }
  function go(h, xong) {   // cuộn xuống dưới (Web Animations — không phụ thuộc class/transition) → thu bề ngang cho các hộp bên trái trượt sang phải êm → gỡ khỏi trang
    var el = h.el; if (!el.parentNode) { if (xong) xong(); return; }
    var xoaXong = function () { if (el.parentNode) el.remove(); el.classList.remove('len'); el.removeAttribute('style'); if (xong) xong(); };
    if (!el.animate) { xoaXong(); return; }
    el.classList.remove('len');
    var w = el.offsetWidth;
    var xuong = el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(105%)' }], { duration: 320, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
    xuong.onfinish = function () {
      var thu = el.animate([{ width: w + 'px', marginLeft: '0px' }, { width: '0px', marginLeft: '-10px' }], { duration: 220, easing: 'ease', fill: 'forwards' });
      thu.onfinish = xoaXong; thu.oncancel = xoaXong;
    };
    xuong.oncancel = xoaXong;
  }
  function datMin() {
    var kn = khuMin(), ds = hops.filter(function (h) { return h.min; });
    kn.innerHTML = ds.map(function (h, i) { return '<button type="button" data-i="' + i + '" title="' + an(h.it.ten) + '">' + avHtml(h.it.anh.slice(0, 1)) + '<span class="x" data-x aria-label="Đóng">×</span></button>'; }).join('');
    [].forEach.call(kn.querySelectorAll('button'), function (b) {
      var h = ds[+b.getAttribute('data-i')];
      b.onclick = function (e) { if (e.target.closest('[data-x]')) { dongHop(h); return; } moLai(h); };
    });
  }
  function moLai(h) { h.min = false; gan(h); gioiHan(); datMin(); }
  function gioiHan() {   // quá 3 hộp ⇒ hộp CŨ NHẤT (bên phải cùng) tự thu nhỏ, cuộn xuống
    var mo = hops.filter(function (x) { return !x.min; });
    while (mo.length > TOI_DA) { var cu = mo.pop(); cu.min = true; go(cu); }
  }
  function dongHop(h) {
    hops = hops.filter(function (x) { return x !== h; });
    if (h.huy) { try { h.huy(); } catch (e) { } h.huy = null; }
    go(h); datMin(); if (TP.lamMoi) TP.lamMoi();
  }
  TP.dongHop = function () { hops.slice().forEach(dongHop); };
  // TnPop.tinMoi(item) — TRANG gọi khi có tin MỚI của người khác đến cuộc chat `item`: hộp tự cuộn lên (không giành con trỏ của ô đang gõ).
  TP.tinMoi = function (it) { TP.moHop(it, { imLang: true }); };
  TP.moHop = function (it, o) {
    o = o || {};
    var co = hops.filter(function (h) { return h.it.id === it.id; })[0];
    if (co) { if (co.min) moLai(co); else if (!o.imLang && co.ui) co.ui.focus(); return; }
    var el = document.createElement('div'); el.className = 'tp-hop';
    var phu = it.loai === 'lop' ? 'Nhóm lớp' : it.loai === 'thay' ? 'Thầy' : (it.lop || '');
    el.innerHTML = '<div class="tp-hop-dau">' + avHtml(it.anh) + '<div class="ai"><b><span>' + an(it.ten) + '</span>' + (it.loai === 'lop' ? BIEU.lop : it.loai === 'thay' ? BIEU.thay : '') + '</b><small>' + an(phu) + '</small></div>' +
      '<button type="button" data-min title="Thu nhỏ" aria-label="Thu nhỏ"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>' +
      '<button type="button" data-dong title="Đóng" aria-label="Đóng"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      (it.hop ? '<div class="tp-hop-fr-khu"><iframe class="tp-hop-fr" title="' + an(it.ten) + '" allow="clipboard-write"></iframe><div class="tp-hop-cho">Đang mở…</div></div>' : '<div class="tp-hop-than"></div><div class="tp-hop-chan"></div>');
    var h = { it: it, el: el, min: false, ui: null, ds: [], ve: function () { if (h.ui) h.ui.ve(h.ds, ''); } };
    hops.unshift(h); gan(h); gioiHan(); datMin();
    el.querySelector('[data-dong]').onclick = function () { dongHop(h); };
    el.querySelector('[data-min]').onclick = function () { h.min = true; go(h); datMin(); };
    if (it.hop) {   // ⭐ DỮ LIỆU THẬT: khung nhúng chạy đúng trang Tin nhắn (nw/tinnhan.html?hop=1&…) — js/tn-pop-ds.js
      var fr = el.querySelector('iframe'), cho = el.querySelector('.tp-hop-cho');
      fr.onload = function () {
        cho.classList.add('xong');
        if (o.imLang) return;
        var n = 0, t = setInterval(function () {
          try { var oo = fr.contentWindow.document.querySelector('.cu-o'); if (oo) { oo.focus(); clearInterval(t); } } catch (e) { clearInterval(t); }
          if (++n > 24) clearInterval(t);
        }, 250);
      };
      fr.src = GOC + it.hop;
      if (TP.lamMoi) TP.lamMoi();
      return;
    }
    nap(function (loi) {
      if (loi || !window.ChatUI || hops.indexOf(h) < 0) return;
      var ad = (TP.phong && TP.phong(it)) || adMau(it), nhom = it.loai === 'lop';
      h.ui = ChatUI.tao({
        khung: el.querySelector('.tp-hop-than'), chan: el.querySelector('.tp-hop-chan'), idNhap: 'tpO_' + String(it.id).replace(/[^A-Za-z0-9_-]/g, ''),
        toi: ad.toi, laThay: !!ad.laThay, hienTen: nhom,
        laCuaToi: function (t) { return t.uid === ad.toi.khoa; },
        av: function (t) { return '<span style="background:' + MAU[String(t.ten).length % MAU.length] + '">' + an(tat(t.ten)) + (t.anh ? '<img src="' + an(t.anh) + '" alt="" onerror="this.remove()">' : '') + '</span>'; },
        nhan: function (t) { return t.vaiTro === 'gv' ? '<span class="cu-nhan">THẦY</span>' : ''; },
        dsNhac: function () { return []; },
        gui: function (g) { return ad.gui(g); }, datCx: function (t, gt) { return ad.datCx(t, gt); }, thuHoi: ad.laThay ? null : function (t) { return ad.thuHoi(t); },
        xoa: ad.xoa || null, loi: function (e) { if (e !== '__im') console.warn('[tn-pop]', e); }, trong: 'Chưa có tin nào. Nhắn câu đầu tiên đi!'
      });
      h.huy = ad.nghe(function (ds) { h.ds = ds; if (!h.min) h.ui.ve(ds, ''); });
      if (!o.imLang) setTimeout(function () { if (h.ui) h.ui.focus(); }, 60);
    });
  };
})();
