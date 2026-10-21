/* ============================================================
   sao-dash.js — HỘP "SAO HỌC SINH" TRÊN DASHBOARD (10/10/2026, thầy chốt bản mẫu v3 + "ok build").
   Thiết kế: D:\OTHERS\CLAUDE\THIET KE THUONG SAO.md mục 4.1 · mẫu "MAU THUONG SAO v3 - dashboard.html".

   Mở từ mục "Sao" ở cột trái (js/nw-thanh.js ⇒ window.SaoDash.mo()).
   · Bảng học sinh theo lớp: ảnh · tên · số HS · sao đang có · cộng tuần này · nút + / − · lịch sử.
   · + / − ⇒ hộp chọn số sao + LÝ DO BẮT BUỘC (em thấy dòng này trong lịch sử ví) ⇒ tạo PHIẾU SAO `saoDot`
     (nguon 'dashboard'); hàm máy chủ `apDotSao` cộng/trừ ví + đẩy thông báo (chỉ khi cộng). Trừ chỉ làm được ở ĐÂY.
   · LÝ DO NHANH (mỗi lý do có số sao mặc định) — mở bằng BẤM ĐÚP ngôi sao cạnh chữ "Sao học sinh" (thầy chốt:
     nút ẩn) hoặc chip "⚙ Sửa lý do" trong hộp cộng/trừ. Lưu `saoCaiDat/chung.lyDo`.
   · Cột phải: Ghi gần đây (phiếu 7 ngày).
   · v1.336.0 (14/10/2026, thầy chốt): BỎ hẳn mục "Buổi chưa chốt" (buổi học không nhất thiết có sao — không đọc rổ
     `saoBuoi` nữa); CÀI ĐẶT (trần sao/em/buổi, báo em) dời vào pop-up bấm ĐÚP ngôi sao (chung với Lý do nhanh).
   Chi phí đọc mỗi lần mở: hsSo/soCai + saoTong/chung + lessonWeb/lop + saoCaiDat + phiếu 7 ngày.
   ⛔ Dùng CHUNG cửa Firebase `AWChat.kho()` (đừng initializeApp lần nữa).
   ⛔ Ô số: cuộn chuột KHÔNG đổi số, Enter = nhận ô (luật "ô nhập số liệu an toàn" 07/10).
   ⭐ v1.370.0 (17/10/2026, thầy chốt mẫu D:\OTHERS\CLAUDE\MAU SAO DASHBOARD v1): tab lớp segmented (nhóm Lớp · Khóa) ·
     bảng XẾP HẠNG sao (đồng sao đồng hạng, huy chương vàng/bạc/đồng) · MỘT nút ± mở pop-up cộng/trừ (số có dấu, ô chỉ nhận số,
     chọn nhanh, gợi ý lý do) · điện thoại: thẻ dòng + pop-up trượt từ đáy. CSS chuyển sang css/sao-dash2.css.
   ============================================================ */
(function () {
  'use strict';
  var A = window.AWC || {};
  var $ = function (s, g) { return (g || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  var maLop = function (s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'D').toUpperCase().replace(/[^A-Z0-9]/g, '');
  };
  var chuanMa = function (s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); };
  var ngayVN = function () { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); };
  var SAO_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>';
  var LYDO_GOC = {
    cong: [{ t: 'Phát biểu tốt', n: 1 }, { t: 'Nộp bài sớm', n: 2 }, { t: 'Tiến bộ rõ', n: 3 }, { t: 'Giúp bạn', n: 1 }, { t: 'Điểm 10', n: 2 }],
    tru: [{ t: 'Sửa bấm nhầm', n: 1 }, { t: 'Đổi quà', n: 5 }, { t: 'Vi phạm nội quy', n: 2 }]
  };
  var MAU = ['#0E7C6E', '#3E7BFA', '#E0575B', '#F0821E', '#18A957', '#8b5cf6', '#0891b2', '#db2777', '#65a30d', '#ca8a04'];

  // ⭐ v1.393.0 (21/10/2026, thầy) — TRẦN CỘNG/TRỪ TAY chỉnh được (`saoCaiDat/chung.tranTay`, mặc định 50 — trước cứng ±50);
  //   trần buổi mở tới 9999 (trước kẹp 200). Hàm máy chủ apDotSao nhận dòng tới max(200, tran, tranTay).
  var TRAN_TAY_GOC = 50, TRAN_MAX = 9999;
  var chuanTran = function (x, goc) { return Math.max(1, Math.min(TRAN_MAX, Math.round(Number(x) || goc))); };
  var S = { lop: [], so: {}, maSo: {}, vi: {}, tuan: {}, gan: [], cai: { tran: 30, tranTay: TRAN_TAY_GOC, baoHs: true, lyDo: null }, chon: '', tim: '', nap: null };
  function kho() { return window.AWChat && AWChat.kho ? AWChat.kho() : Promise.reject(new Error('khong-co-kho')); }

  // ── nạp dữ liệu ─────────────────────────────────────────────────────────────────────────
  function napHet() {
    S.nap = kho().then(function (f) {
      var fs = f.fs, db = f.db;
      var tuan = Date.now() - 7 * 864e5;
      return Promise.all([
        fs.getDoc(fs.doc(db, 'hsSo', 'soCai')),
        fs.getDoc(fs.doc(db, 'saoTong', 'chung')),
        fs.getDoc(fs.doc(db, 'lessonWeb', 'lop')),
        fs.getDoc(fs.doc(db, 'saoCaiDat', 'chung'))['catch'](function () { return null; }),
        fs.getDocs(fs.query(fs.collection(db, 'saoDot'), fs.where('tao', '>=', tuan)))['catch'](function () { return null; })
      ]).then(function (r) {
        var so = (r[0] && r[0].exists() && r[0].data().nguoi) || {};
        S.so = so; S.maSo = {};
        Object.keys(so).forEach(function (n) {
          var P = so[n] || {};
          if (P.ma) S.maSo[chuanMa(P.ma)] = n;
          (P.maCu || []).forEach(function (m) { if (!S.maSo[chuanMa(m)]) S.maSo[chuanMa(m)] = n; });
        });
        S.vi = (r[1] && r[1].exists() && r[1].data().em) || {};
        var x = null;
        try { x = JSON.parse(((r[2] && r[2].data()) || {}).json || 'null'); } catch (e) { x = null; }
        // ⭐ v1.335.0 (14/10/2026, thầy chốt) — HỌC SINH KHÓA cũng có ví sao: thẻ khóa (x.khoa: NỀN TẢNG K9, K10…) xếp SAU các lớp.
        // Em học cả lớp lẫn khóa: CÙNG số HS ⇒ cùng một ví, hiện đủ tổng ở cả hai thẻ.
        var dsLop = ((x && x.lop) || []).concat(((x && x.khoa) || []).map(function (k) { return Object.assign({ khoa: 1 }, k); }));
        S.lop = dsLop.filter(function (l) { return (l.hocSinh || []).length; }).map(function (l) {
          return { ma: maLop(l.maLop || l.tenGoc), ten: String(l.tenGoc || l.maLop), slug: l.tenGoc || l.maLop, khoa: !!l.khoa,
            em: (l.hocSinh || []).map(function (h) { return { ten: h.ten, ma: chuanMa(h.ma), so: S.maSo[chuanMa(h.ma)] || null, thu: !!h.thu }; }) };   // v1.309.0 thu = học thử
        });
        if (!S.chon && S.lop.length) S.chon = S.lop[0].ma;
        var c = (r[3] && r[3].exists && r[3].exists()) ? r[3].data() : {};
        S.cai = { tran: Number(c.tran) > 0 ? Number(c.tran) : 30, tranTay: Number(c.tranTay) > 0 ? chuanTran(c.tranTay, TRAN_TAY_GOC) : TRAN_TAY_GOC, baoHs: c.baoHs !== false,
          lyDo: (c.lyDo && Array.isArray(c.lyDo.cong)) ? c.lyDo : JSON.parse(JSON.stringify(LYDO_GOC)) };
        S.tuan = {}; S.gan = [];
        if (r[4]) r[4].forEach(function (d) {
          var p = d.data() || {};
          S.gan.push(Object.assign({ id: d.id }, p));
          if (!p.xong) return;
          (p.dong || []).forEach(function (l) { if (Number(l.n) > 0) S.tuan[l.so] = (S.tuan[l.so] || 0) + Number(l.n); });
        });
        S.gan.sort(function (a, b) { return (b.tao || 0) - (a.tao || 0); });
      });
    });
    return S.nap;
  }

  // ── khung hộp ───────────────────────────────────────────────────────────────────────────
  // v1.370.0 — giao diện mới (mẫu D:\OTHERS\CLAUDE\MAU SAO DASHBOARD v1): CSS ở css/sao-dash2.css (TÊN MỚI — xem đầu file CSS).
  var KINH_SVG = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  var X_SVG = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var DONGHO_SVG = '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>';
  function dungKhung() {
    if ($('#sdNen')) return $('#sdNen');
    if (!document.querySelector('link[href^="css/sao-dash2.css"]')) {   // dashboard.html đã nạp sẵn lúc mở trang; đây chỉ là nạp bù
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = 'css/sao-dash2.css?v=2';
      document.head.appendChild(l);
    }
    var nen = document.createElement('div');
    nen.id = 'sdNen'; nen.className = 'sd-nen';
    nen.innerHTML = '<div class="sd-hop" role="dialog" aria-modal="true">' +
      '<div class="sd-dau">' +
        '<div class="sd-dau1"><h2><span class="sd-sao-an" title="">' + SAO_SVG + '</span>Sao học sinh</h2><span class="sd-gian"></span>' +
          '<label class="sd-tim-boc">' + KINH_SVG + '<input class="sd-tim" placeholder="Tìm tên / số HS…"></label>' +
          '<button class="sd-x" type="button" title="Đóng">' + X_SVG + '</button></div>' +
        '<div class="sd-tab-boc"><div class="sd-tabs"></div></div>' +
      '</div>' +
      '<div class="sd-than">' +
        '<div class="sd-xem"><button type="button" class="on" data-xem="hs">Học sinh</button><button type="button" data-xem="gan">Ghi gần đây</button></div>' +
        '<div class="sd-giua"><div class="sd-so-tom"></div><div class="sd-ds"></div></div>' +
        '<aside class="sd-phai"></aside>' +
      '</div>' +
      '</div>';
    document.body.appendChild(nen);
    $('.sd-x', nen).onclick = dong;
    nen.addEventListener('click', function (e) { if (e.target === nen) dong(); });
    // thầy chốt: ngôi sao cạnh chữ "Sao học sinh" là NÚT ẨN — bấm ĐÚP mở bảng Lý do nhanh
    $('.sd-sao-an', nen).addEventListener('dblclick', function () {
      var s = $('.sd-sao-an', nen); s.classList.remove('nhay'); void s.offsetWidth; s.classList.add('nhay');
      moLyDo();
    });
    $('.sd-tim', nen).addEventListener('input', function (e) { S.tim = e.target.value; veBang(); });
    // màn hẹp (≤ 1100px): cột Ghi gần đây nhường chỗ ⇒ công tắc Học sinh / Ghi gần đây
    Array.prototype.forEach.call(nen.querySelectorAll('.sd-xem button'), function (b) {
      b.onclick = function () {
        Array.prototype.forEach.call(nen.querySelectorAll('.sd-xem button'), function (x) { x.classList.toggle('on', x === b); });
        $('.sd-hop', nen).classList.toggle('xem-gan', b.getAttribute('data-xem') === 'gan');
      };
    });
    $('.sd-tabs', nen).addEventListener('click', function (e) {
      var b = e.target.closest('.sd-tab'); if (!b) return;
      S.chon = b.getAttribute('data-lop');
      Array.prototype.forEach.call(nen.querySelectorAll('.sd-tab'), function (x) { x.classList.toggle('on', x === b); });
      dichPill(true); hienTab();
      $('.sd-giua', nen).scrollTop = 0;
      veHet();
    });
    window.addEventListener('resize', function () { if (nen.classList.contains('mo')) dichPill(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nen.classList.contains('mo') && !document.querySelector('.sd-pop')) dong();
    });
    return nen;
  }
  function mo() {
    var nen = dungKhung();
    nen.classList.add('mo');
    document.body.style.overflow = 'hidden';
    $('.sd-so-tom', nen).innerHTML = '';
    $('.sd-ds', nen).innerHTML = '<div class="sd-trong">Đang đọc ví sao…</div>';
    $('.sd-phai', nen).innerHTML = '';
    napHet().then(function () { veHet(); })['catch'](function (e) {
      var m = String((e && (e.code || e.message)) || e);
      $('.sd-ds', nen).innerHTML = '<div class="sd-trong">' + (m.indexOf('permission') >= 0
        ? 'Kho sao chưa mở khoá — cần đăng luật Firestore (tools/dang-luat-sao.js) hoặc đăng nhập lại tài khoản thầy.'
        : 'Chưa đọc được kho sao (' + esc(m.slice(0, 80)) + ').') + '</div>';
    });
  }
  function dong() {
    var nen = $('#sdNen'); if (!nen) return;
    nen.classList.remove('mo');
    document.body.style.overflow = '';
  }

  // ── vẽ ───────────────────────────────────────────────────────────────────────────────────
  function lopChon() { for (var i = 0; i < S.lop.length; i++) if (S.lop[i].ma === S.chon) return S.lop[i]; return null; }
  function saoCua(so) { return Number((S.vi[so] || {}).s) || 0; }

  // Tab lớp: hai nhóm (Lớp · Khóa). Chỉ dựng lại khi DANH SÁCH lớp đổi — bấm tab chỉ đổi lớp `on` + trượt viên xanh.
  function veTabs() {
    var nen = $('#sdNen');
    var ky = S.lop.map(function (l) { return l.ma; }).join('|');
    if (S.tabKy !== ky) {
      S.tabKy = ky;
      var nhom = [{ ten: 'Lớp', ds: S.lop.filter(function (l) { return !l.khoa; }) }, { ten: 'Khóa', ds: S.lop.filter(function (l) { return l.khoa; }) }];
      $('.sd-tabs', nen).innerHTML = nhom.filter(function (g) { return g.ds.length; }).map(function (g) {
        return '<div class="sd-tgrp"><span class="sd-pill"></span><span class="sd-tgrp-ten">' + g.ten + '</span>' + g.ds.map(function (l) {
          var si = l.em.filter(function (e) { return !e.thu; }).length;
          return '<button type="button" class="sd-tab" data-lop="' + esc(l.ma) + '">' + esc(l.ten) + '<span class="n">' + si + '</span></button>';
        }).join('') + '</div>';
      }).join('');
    }
    Array.prototype.forEach.call(nen.querySelectorAll('.sd-tab'), function (b) { b.classList.toggle('on', b.getAttribute('data-lop') === S.chon); });
    dichPill(false); hienTab();
  }
  function dichPill(hoatAnh) {
    var nen = $('#sdNen'); if (!nen) return;
    Array.prototype.forEach.call(nen.querySelectorAll('.sd-tgrp'), function (g) {
      var p = $('.sd-pill', g), on = $('.sd-tab.on', g);
      if (!hoatAnh) p.style.transition = 'none';
      if (on) { p.style.opacity = 1; p.style.left = on.offsetLeft + 'px'; p.style.width = on.offsetWidth + 'px'; } else p.style.opacity = 0;
      if (!hoatAnh) { void p.offsetWidth; p.style.transition = ''; }
    });
  }
  function hienTab() {   // tab đang chọn luôn nằm trong tầm nhìn (điện thoại cuộn ngang)
    var nen = $('#sdNen'), on = nen && $('.sd-tab.on', nen), t = nen && $('.sd-tabs', nen);
    if (!on || !t) return;
    var x = on.offsetLeft + on.parentNode.offsetLeft;
    if (x < t.scrollLeft || x + on.offsetWidth > t.scrollLeft + t.clientWidth) t.scrollLeft = x - t.clientWidth / 2 + on.offsetWidth / 2;
  }

  function veHet(loeSo) {
    var nen = $('#sdNen');
    veTabs();
    var L = lopChon() || { em: [], ten: '' };
    var that = L.em.filter(function (e) { return !e.thu; });
    var tongLop = 0, tuanLop = 0, coSao = 0;
    that.forEach(function (e) { if (e.so) { var v = saoCua(e.so); tongLop += v; tuanLop += S.tuan[e.so] || 0; if (v > 0) coSao++; } });
    var tenL = (L.khoa ? 'khóa ' : 'lớp ') + esc(L.ten);
    $('.sd-so-tom', nen).innerHTML =
      '<div class="sd-o a"><span class="quang"></span><div class="nh">Sao đang có</div><div class="gt">' + tongLop.toLocaleString('vi') + '</div><div class="phu">' + that.length + ' học sinh · ' + tenL + '</div></div>' +
      '<div class="sd-o b"><span class="quang"></span><div class="nh">Cộng 7 ngày</div><div class="gt">+' + tuanLop + '</div><div class="phu">' + tenL + '</div></div>' +
      '<div class="sd-o c"><span class="quang"></span><div class="nh">Em có sao</div><div class="gt">' + coSao + '<small>/ ' + that.length + '</small></div>' +
        '<div class="vach"><i style="width:' + (that.length ? Math.round(coSao / that.length * 100) : 0) + '%"></i></div></div>';
    veBang(loeSo);
    vePhai();
  }

  // ⭐ v1.370.0 — XẾP HẠNG SAO (thầy chốt 17/10): nhiều sao lên trên; ĐỒNG SAO = ĐỒNG HẠNG, hạng không nhảy số (1, 2, 2, 3…)
  // ⇒ luôn đủ ba bậc huy chương vàng/bạc/đồng. Em 0 sao vẫn có hạng (số xám). Em chưa có số HS + em học thử đứng cuối, không hạng.
  function xepHang(L) {
    var co = L.em.filter(function (e) { return e.so && !e.thu; }).map(function (e) { return { e: e, v: saoCua(e.so) }; });
    co.sort(function (a, b) { return b.v - a.v || String(a.e.ten).localeCompare(String(b.e.ten), 'vi'); });
    var hang = 0, truoc = null;
    co.forEach(function (x) { if (x.v !== truoc) { hang++; truoc = x.v; } x.hang = hang; });
    var chuaSo = L.em.filter(function (e) { return !e.so && !e.thu; }).map(function (e) { return { e: e, v: null }; });
    var thu = L.em.filter(function (e) { return e.thu; }).map(function (e) { return { e: e, v: e.so ? saoCua(e.so) : null }; });
    return co.concat(chuaSo, thu);
  }
  function huyHieu(x) {
    if (!x.hang) return '<span class="sd-hg">–</span>';
    if (x.v > 0 && x.hang === 1) return '<span class="sd-hg m g1"><svg class="sd-vuong" viewBox="0 0 24 18"><path d="M2 16l2-12 5 5 3-8 3 8 5-5 2 12z"/></svg>1</span>';
    if (x.v > 0 && x.hang <= 3) return '<span class="sd-hg m g' + x.hang + '">' + x.hang + '</span>';
    return '<span class="sd-hg">' + x.hang + '</span>';
  }
  function veBang(loeSo) {
    var nen = $('#sdNen'); if (!nen) return;
    var ds = $('.sd-ds', nen);
    var L = lopChon() || { em: [], ten: '' };
    var k = String(S.tim || '').trim().toLowerCase();
    var tat = xepHang(L);
    var maxV = Math.max.apply(null, tat.map(function (x) { return x.v || 0; }).concat([1]));
    var hien = tat.filter(function (x) { return !k || String(x.e.ten).toLowerCase().indexOf(k) >= 0 || String(x.e.so || '').indexOf(k) >= 0; });
    // FLIP: nhớ vị trí cũ của từng dòng ⇒ em vừa được cộng/trừ TRƯỢT tới chỗ mới thay vì nhảy cóc
    var cu = {};
    Array.prototype.forEach.call(ds.querySelectorAll('.sd-hang[data-so]'), function (r) { cu[r.getAttribute('data-so')] = r.getBoundingClientRect().top; });
    ds.innerHTML = '<div class="sd-dh"><span>Hạng · Học sinh</span><span>Số HS</span><span>Sao đang có</span><span>7 ngày</span><span class="phai">Thao tác</span></div>' +
      (hien.length ? hien.map(function (x) {
        var e = x.e, so = e.so, tuan = so ? (S.tuan[so] || 0) : 0;
        var top = x.hang && x.v > 0 && x.hang <= 3 ? ' t' + x.hang : '';
        return '<div class="sd-hang' + top + (e.thu ? ' thu' : '') + '"' + (so ? ' data-so="' + esc(so) + '"' : '') + '>' +
          '<div class="sd-ai">' + huyHieu(x) + avHtml(L, e.ten, L.em.indexOf(e)) +
            '<div class="sd-tenbox"><b>' + esc(e.ten) + '</b>' +
              '<span class="pc">' + esc(L.ten) + (e.thu ? ' · học thử' : '') + '</span>' +
              '<span class="dt">' + (so ? esc(so) : 'chưa có số') + (e.thu ? ' · học thử' : '') + (tuan ? ' · <em>+' + tuan + '</em>' : '') + '</span></div></div>' +
          '<div class="sd-soHS">' + (so ? esc(so) : '<span class="cam">chưa có số</span>') + '</div>' +
          '<div class="sd-saocot">' + (x.v == null ? '<span class="sd-sao-chip">—</span>'
            : '<span class="sd-sao-chip">' + SAO_SVG + x.v + '</span><span class="sd-thanh"><i style="width:' + Math.round(x.v / maxV * 100) + '%"></i></span>') + '</div>' +
          '<div class="sd-7">' + (tuan ? '<span class="p">+' + tuan + '</span>' : '<span class="z">—</span>') + '</div>' +
          '<div class="sd-tt">' + (so ? '<button type="button" class="sd-ib sao" data-ct="' + esc(so) + '" title="Cộng / trừ sao">' + SAO_SVG + '<span class="pm">±</span></button>' +
            '<button type="button" class="sd-ib ls" data-ls="' + esc(so) + '" title="Lịch sử ví">' + DONGHO_SVG + '<span>Lịch sử</span></button>' : '') + '</div>' +
          '</div>';
      }).join('') : '<div class="sd-trong">Không có học sinh khớp.</div>');
    Array.prototype.forEach.call(ds.querySelectorAll('[data-ct]'), function (b) {
      b.onclick = function () { moCongTru(b.getAttribute('data-ct')); };
    });
    Array.prototype.forEach.call(ds.querySelectorAll('[data-ls]'), function (b) {
      b.onclick = function () { moLichSu(b.getAttribute('data-ls')); };
    });
    // v1.307.0 — `window.avKhoDe` (dashboard) tự dò các lớp có `data-av-lop` trong khối rồi đè ảnh kho đúng từng lớp.
    if (window.avKhoDe) { try { window.avKhoDe(ds); } catch (e) { /* thiếu ảnh: giữ chữ tắt */ } }
    Array.prototype.forEach.call(ds.querySelectorAll('.sd-hang[data-so]'), function (r) {
      var o = cu[r.getAttribute('data-so')]; if (o == null) return;
      var d = o - r.getBoundingClientRect().top; if (!d) return;
      r.style.transition = 'none'; r.style.transform = 'translateY(' + d + 'px)'; r.style.zIndex = 1;
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        r.style.transition = 'transform .55s cubic-bezier(.3,1.1,.4,1)'; r.style.transform = '';
        setTimeout(function () { r.style.zIndex = ''; r.style.transition = ''; }, 600);
      }); });
    });
    if (loeSo) {
      var r = ds.querySelector('.sd-hang[data-so="' + loeSo + '"]');
      if (r) { r.classList.add('loe'); setTimeout(function () { r.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 620); }
    }
  }
  function avHtml(L, ten, i) {
    var chu = String(ten || '?').trim().split(/\s+/).slice(-2).map(function (t) { return t.charAt(0); }).join('').toUpperCase();
    var url = A.avUrl ? A.avUrl(L.slug, ten) : '';
    return '<span class="sd-av" style="background:' + MAU[i % MAU.length] + '" data-av-em="' + esc(ten) + '" data-av-lop="' + esc(L.slug) + '">' + esc(chu) +
      (url ? '<img src="' + esc(url) + '" alt="" onerror="this.remove()">' : '') + '</span>';
  }
  function tenTheoSo(so) {
    var P = S.so[so] || {}; return P.t || P.ht || ((S.vi[so] || {}).t) || so;
  }
  function vePhai() {
    var nen = $('#sdNen'); var p = $('.sd-phai', nen);
    p.innerHTML = '<h3>' + DONGHO_SVG + 'Ghi gần đây</h3>' + (S.gan.length ? S.gan.slice(0, 12).map(function (d) {
      var n = (d.dong || []).reduce(function (a, l) { return a + (Number(l.n) || 0); }, 0);
      var em = (d.dong || []).length;
      var t = new Date(d.tao || 0);
      var gio = ('0' + t.getDate()).slice(-2) + '/' + ('0' + (t.getMonth() + 1)).slice(-2) + ' ' + ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
      var dash = d.nguon === 'dashboard';
      var loai = dash ? (n < 0 ? 'dn' : 'up') : 'tm';
      var mo = dash
        ? 'Thầy <b class="' + (n < 0 ? 'do' : 'la') + '">' + (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n) + '</b> <b>' + esc(em === 1 ? tenTheoSo(d.dong[0].so) : em + ' em') + '</b> · "' + esc((d.dong[0] || {}).viec || '') + '"'
        : 'Chốt <b>' + esc(d.nhom || d.lop || '') + '</b> · <b class="la">+' + n + ' ⭐</b>';
      return '<div class="sd-nk"><div class="d ' + loai + '">' + (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n) + '</div><div><div class="t">' + mo + '</div>' +
        '<div class="m">' + gio + (d.nguon ? '<span class="sd-tag ' + (dash ? 'dash' : d.nguon === 'myTeam' ? 'team' : '') + '">' + esc(d.nguon) + '</span>' : '') +
        (d.xong ? '' : '<span class="cam">máy chủ chưa áp</span>') + '</div></div></div>';
    }).join('') : '<div class="sd-trong nho">Chưa có phiếu nào trong 7 ngày.</div>');
  }
  function luuCai(thay, tin) {
    return kho().then(function (f) {
      return f.fs.setDoc(f.fs.doc(f.db, 'saoCaiDat', 'chung'), Object.assign({ capNhat: Date.now() }, thay), { merge: true });
    }).then(function () {
      Object.assign(S.cai, thay);
      if (tin) { tin.textContent = '✓ Đã lưu'; setTimeout(function () { tin.textContent = ''; }, 1600); }
    })['catch'](function (e) {
      if (tin) tin.textContent = 'Chưa lưu được: ' + String((e && (e.code || e.message)) || e).slice(0, 60);
      throw e;
    });
  }

  // ── hộp nổi chung ───────────────────────────────────────────────────────────────────────
  function hopNoi(html, rong, loai) {
    var nen = document.createElement('div');
    nen.className = 'sd-pop' + (loai ? ' ' + loai : '');
    nen.innerHTML = '<div class="sd-pop-hop' + (rong ? ' rong' : '') + (loai ? ' ' + loai : '') + '">' + html + '</div>';
    document.body.appendChild(nen);
    var dongPop = function () { nen.remove(); };
    nen.addEventListener('click', function (e) { if (e.target === nen) dongPop(); });
    var phim = function (e) { if (e.key === 'Escape') { dongPop(); document.removeEventListener('keydown', phim, true); e.stopPropagation(); } };
    document.addEventListener('keydown', phim, true);
    return { el: nen, dong: function () { document.removeEventListener('keydown', phim, true); dongPop(); } };
  }

  // ── CỘNG / TRỪ (v1.370.0: MỘT nút ± ⇒ một pop-up, số CÓ DẤU) ────────────────────────────────
  // Nút −/+ đổi số từng nấc (đi qua 0 là đổi chiều) · nút dấu trước ô số lật cộng ↔ trừ · ô số CHỈ nhận chữ số
  // (điện thoại bật bàn phím số — bàn phím số iPhone không có dấu trừ nên dấu do nút quyết định) · chọn nhanh −5…+10 ·
  // gợi ý lý do (S.cai.lyDo) bấm là điền lý do + số sao. Trừ không quá số sao em đang có. Lý do vẫn BẮT BUỘC.
  // ⛔ Ô số là ô chữ (inputmode numeric) ⇒ cuộn chuột không đổi số; Enter = nhận ô, nhảy xuống ô lý do (luật 07/10).
  var NHANH = [-5, -2, -1, 1, 2, 3, 5, 10];
  function moCongTru(so) {
    var ten = tenTheoSo(so), co = saoCua(so), L = lopChon() || { em: [], slug: '' };
    var ly = S.cai.lyDo || LYDO_GOC;
    var x0 = null; xepHang(L).forEach(function (x) { if (x.e.so === so) x0 = x; });
    var thuTu = 0; L.em.forEach(function (e, i) { if (e.so === so) thuTu = i; });
    var v = 1, chonGy = null;
    var h = hopNoi('<div class="sd-ct"><div class="sd-ct-keo"></div>' +
      '<div class="sd-ct-dau">' + avHtml(L, ten, thuTu) +
        '<div class="sd-tenbox"><b>' + esc(ten) + '</b><span><i>Số HS ' + esc(so) + '</i><i>· đang có ' + SAO_SVG + '<b>' + co + '</b></i>' +
          (x0 && x0.hang ? '<i>· hạng ' + x0.hang + '</i>' : '') + '</span></div>' +
        '<span class="sd-gian"></span><button class="sd-x" type="button" data-x title="Đóng (Esc)">' + X_SVG + '</button></div>' +
      '<div class="sd-ct-dk">' +
        '<div class="sd-ct-buoc">' +
          '<button type="button" class="sd-ct-b tru" data-buoc="-1" title="Bớt 1 (↓)"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>' +
          '<div class="sd-ct-so"><button type="button" class="sd-ct-dau-so" title="Đổi cộng ↔ trừ">+</button>' +
            '<input class="sd-ct-o" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="' + String(S.cai.tranTay || TRAN_TAY_GOC).length + '" aria-label="Số sao">' +
            '<span class="u">' + SAO_SVG + '</span></div>' +
          '<button type="button" class="sd-ct-b cong" data-buoc="1" title="Thêm 1 (↑)"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg></button>' +
        '</div>' +
        '<div class="sd-ct-goi"></div>' +
        '<div class="sd-ct-nhanh">' + NHANH.map(function (n) {
          return '<button type="button" class="sd-q ' + (n > 0 ? 'p' : 'm') + '" data-n="' + n + '">' + (n > 0 ? '+' : '−') + Math.abs(n) + '</button>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="sd-ct-muc"><div class="sd-ct-tieu">Gợi ý lý do<button type="button" data-sua><svg viewBox="0 0 24 24"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"/></svg>Sửa gợi ý</button></div>' +
        '<div class="sd-ct-goiy">' +
          (ly.cong || []).map(function (x, j) { return '<button type="button" class="sd-gy up" data-k="cong" data-j="' + j + '">' + esc(x.t) + '<i>+' + x.n + '</i></button>'; }).join('') +
          '<span class="ngat"></span>' +
          (ly.tru || []).map(function (x, j) { return '<button type="button" class="sd-gy dn" data-k="tru" data-j="' + j + '">' + esc(x.t) + '<i>−' + x.n + '</i></button>'; }).join('') +
        '</div></div>' +
      '<div class="sd-ct-muc"><div class="sd-ct-tieu">Lý do<small>em sẽ thấy dòng này trong ví</small></div>' +
        '<textarea class="sd-lydo" maxlength="120" placeholder="VD: Phát biểu tốt bài Family and Room"></textarea></div>' +
      '<div class="sd-ct-canh">⚠️ Trừ sao chỉ làm được ở dashboard — các app trên lớp không bao giờ trừ.</div>' +
      '<div class="sd-tin"></div>' +
      '<div class="sd-ct-cuoi"><button class="sd-ct-nut huy" type="button" data-x>Huỷ</button><button class="sd-ct-nut ok" type="button" data-ok></button></div>' +
      '</div>', false, 'ct');
    var el = h.el, o = $('.sd-ct-o', el), ta = $('.sd-lydo', el), ok = $('[data-ok]', el), dk = $('.sd-ct-dk', el);
    requestAnimationFrame(function () { el.classList.add('vao'); });
    if (window.avKhoDe) { try { window.avKhoDe($('.sd-ct-dau', el)); } catch (e) { /* giữ chữ tắt */ } }
    var TT = S.cai.tranTay || TRAN_TAY_GOC;
    var gioiHan = function (n) { n = Math.max(-TT, Math.min(TT, n)); return n < -co ? -co : n; };
    var sao15 = SAO_SVG;
    function ve(giuO) {
      var loai = v > 0 ? 'up' : v < 0 ? 'dn' : 'zr';
      dk.className = 'sd-ct-dk ' + loai;
      $('.sd-ct-dau-so', el).textContent = v < 0 ? '−' : '+';
      if (!giuO) o.value = Math.abs(v);
      o.style.setProperty('--n', Math.max(2, String(o.value || Math.abs(v)).length));   // v1.393.0 ô dãn theo số chữ số
      $('.sd-ct-goi', el).innerHTML = v === 0
        ? '<span>' + (co ? 'Chọn số sao muốn cộng hoặc trừ' : 'Em chưa có sao — chỉ cộng được') + '</span>'
        : '<b>' + co + '</b>' + sao15 + '<span>→</span><b class="sau">' + (co + v) + '</b>' + sao15 + (v < 0 && -v === co ? '<span class="canh">· trừ hết</span>' : '');
      Array.prototype.forEach.call(el.querySelectorAll('.sd-q'), function (q) {
        var n = Number(q.getAttribute('data-n')); q.classList.toggle('on', n === v); q.disabled = n < -co;
      });
      $('[data-buoc="-1"]', el).disabled = v <= 0 && v <= -co;
      $('.sd-ct-canh', el).classList.toggle('on', v < 0);
      ok.className = 'sd-ct-nut ok ' + loai; ok.disabled = v === 0;
      ok.innerHTML = v === 0 ? 'Chọn số sao' : SAO_SVG + (v > 0 ? 'Cộng ' : 'Trừ ') + Math.abs(v) + ' sao';
      Array.prototype.forEach.call(el.querySelectorAll('.sd-gy'), function (g) { g.classList.toggle('on', g === chonGy); });
    }
    function dat(n, giuO) { v = gioiHan(n); ve(giuO); }
    Array.prototype.forEach.call(el.querySelectorAll('[data-buoc]'), function (b) {
      b.onclick = function () { dat(v + Number(b.getAttribute('data-buoc'))); };
    });
    $('.sd-ct-dau-so', el).onclick = function () { dat(-v || (co > 0 ? -1 : 1)); };
    Array.prototype.forEach.call(el.querySelectorAll('.sd-q'), function (q) {
      q.onclick = function () { if (!q.disabled) dat(Number(q.getAttribute('data-n'))); };
    });
    Array.prototype.forEach.call(el.querySelectorAll('.sd-gy'), function (g) {
      g.onclick = function () {
        var k = g.getAttribute('data-k'), x = ly[k][Number(g.getAttribute('data-j'))];
        chonGy = g; ta.value = x.t; ta.classList.remove('loi');
        dat(k === 'cong' ? x.n : -x.n);
      };
    });
    // ô số: chặn chữ — chỉ nhận chữ số; ↑/↓ đổi nấc; gõ "-"/"+" là lật dấu
    o.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { e.preventDefault(); dat(v + 1); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); dat(v - 1); return; }
      if (e.key === '-' || e.key === 'Subtract') { e.preventDefault(); dat(-Math.abs(v || 1)); return; }
      if (e.key === '+' || e.key === 'Add') { e.preventDefault(); dat(Math.abs(v || 1)); return; }
      if (e.key === 'Enter') { e.preventDefault(); ta.focus(); return; }
      if (e.key.length === 1 && !/[0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
    });
    o.addEventListener('input', function () {
      var s = o.value.replace(/\D/g, '').slice(0, String(TT).length); if (o.value !== s) o.value = s;
      var n = Number(s || 0);
      v = gioiHan((v < 0 ? -1 : 1) * n); ve(true);
      if (s !== '' && Math.abs(v) !== n) o.value = Math.abs(v);
    });
    o.addEventListener('focus', function () { setTimeout(function () { o.select(); }, 0); });
    o.addEventListener('blur', function () { o.value = Math.abs(v); });
    ta.addEventListener('input', function () {
      ta.classList.remove('loi');
      if (chonGy) { var x = ly[chonGy.getAttribute('data-k')][Number(chonGy.getAttribute('data-j'))]; if (ta.value !== x.t) { chonGy = null; ve(true); } }
    });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ok.click(); } });
    $('[data-sua]', el).onclick = function () { h.dong(); moLyDo(); };
    Array.prototype.forEach.call(el.querySelectorAll('[data-x]'), function (b) { b.onclick = h.dong; });
    ve();
    if (!('ontouchstart' in window)) setTimeout(function () { o.focus(); }, 60);
    ok.onclick = function () {
      if (ok.disabled) return;
      var lyDo = ta.value.trim();
      if (!lyDo) { ta.classList.remove('loi'); void ta.offsetWidth; ta.classList.add('loi'); ta.focus(); return; }
      var dau = v > 0 ? 1 : -1, n = Math.abs(v);
      ok.disabled = true;
      $('.sd-tin', el).textContent = 'Đang ghi…';
      var Lc = lopChon();
      // v1.335.0 — lớp của phiếu = thẻ lớp/khóa thầy ĐANG mở (trước lấy lớp cũ trong ví ⇒ em học 2 nơi bị ghi sai chỗ)
      var phieu = { nguon: 'dashboard', lop: (Lc && Lc.ma) || (S.vi[so] || {}).l || '', ngay: ngayVN(),
        nhom: dau > 0 ? 'Thầy Andrew thưởng' : 'Thầy Andrew điều chỉnh', ai: 'Thầy Andrew',
        dong: [{ so: so, n: dau * n, viec: lyDo, app: 'dashboard' }], tao: Date.now() };
      kho().then(function (f) {
        return f.fs.addDoc(f.fs.collection(f.db, 'saoDot'), phieu).then(function (r) { return choXong(f, r.id); });
      }).then(function (xong) {
        h.dong();
        baoNho(xong ? (dau > 0 ? 'Đã cộng ' : 'Đã trừ ') + n + ' sao cho ' + ten + '.' : 'Đã gửi phiếu — máy chủ sẽ ' + (dau > 0 ? 'cộng' : 'trừ') + ' vào ví trong ít phút.');
        return napHet().then(function () { veHet(so); });
      })['catch'](function (e) {
        ok.disabled = false;
        var m = String((e && (e.code || e.message)) || e);
        $('.sd-tin', el).textContent = m.indexOf('permission') >= 0 ? 'Bị chặn — kiểm luật kho sao / đăng nhập thầy.' : 'Chưa ghi được: ' + m.slice(0, 80);
      });
    };
  }
  // Chờ hàm máy chủ áp phiếu (≤ 15 giây).
  function choXong(f, id) {
    return new Promise(function (res) {
      var het = Date.now() + 15000;
      var thu = function () {
        f.fs.getDoc(f.fs.doc(f.db, 'saoDot', id)).then(function (d) {
          if (d.exists() && d.data().xong) return res(true);
          if (Date.now() > het) return res(false);
          setTimeout(thu, 1200);
        })['catch'](function () { res(false); });
      };
      setTimeout(thu, 900);
    });
  }
  function baoNho(chu) {
    var t = document.createElement('div'); t.className = 'sd-toast'; t.innerHTML = SAO_SVG + '<span></span>';
    t.querySelector('span').textContent = chu;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3600);
  }

  // ── lịch sử một em ──────────────────────────────────────────────────────────────────────
  function moLichSu(so) {
    var h = hopNoi('<h3>Lịch sử ví · ' + esc(tenTheoSo(so)) + '</h3><div class="sd-mo">Số HS ' + esc(so) + ' · đang có ⭐ ' + (Number((S.vi[so] || {}).s) || 0) + '</div><div class="sd-ls"><div class="sd-trong">Đang đọc…</div></div>' +
      '<div class="sd-cuoi"><button class="sd-nut xam" type="button" data-x>Đóng</button></div>', true);
    $('[data-x]', h.el).onclick = h.dong;
    kho().then(function (f) { return f.fs.getDoc(f.fs.doc(f.db, 'saoLichSu', so)); }).then(function (d) {
      var moc = (d.exists() && d.data().moc) || [];
      $('.sd-ls', h.el).innerHTML = moc.length ? moc.map(function (x) {
        return '<div class="sd-ls-dong"><span class="ng">' + esc(String(x.ngay || '').slice(8, 10) + '/' + String(x.ngay || '').slice(5, 7)) + '</span>' +
          '<span class="vc"><b>' + esc(x.viec) + '</b><small>' + esc([x.nhom, x.app].filter(Boolean).join(' · ')) + '</small></span>' +
          '<span class="sv ' + (x.so >= 0 ? 'la' : 'do') + '">' + (x.so > 0 ? '+' : '') + x.so + '</span></div>';
      }).join('') : '<div class="sd-trong">Em chưa có sao nào.</div>';
    })['catch'](function () { $('.sd-ls', h.el).innerHTML = '<div class="sd-trong">Chưa đọc được lịch sử.</div>'; });
  }

  // ── LÝ DO NHANH ─────────────────────────────────────────────────────────────────────────
  function moLyDo() {
    var nhap = JSON.parse(JSON.stringify(S.cai.lyDo || LYDO_GOC));
    var h = hopNoi('<h3>⚙️ Cài đặt sao</h3>' +
      '<div class="sd-cai-hop">' +
        '<div class="sd-cai">Trần sao mỗi em / buổi <span class="sd-cai-phu">myTeam hỏi lại khi vượt</span><input type="number" class="sd-tran" min="1" max="' + TRAN_MAX + '" value="' + S.cai.tran + '"></div>' +
        '<div class="sd-cai">Trần sao mỗi lần cộng/trừ tay <span class="sd-cai-phu">hộp ± ở dashboard</span><input type="number" class="sd-tran-tay" min="1" max="' + TRAN_MAX + '" value="' + S.cai.tranTay + '"></div>' +
        '<label class="sd-cai">Báo học sinh khi có sao mới <span class="sd-cai-phu">thông báo đẩy "+N⭐ cho …"</span><input type="checkbox" class="sd-bao"' + (S.cai.baoHs ? ' checked' : '') + '></label>' +
      '</div>' +
      '<h4 class="sd-cai-tieu">Lý do nhanh</h4>' +
      '<div class="sd-mo">Các nút bấm sẵn trong hộp cộng/trừ sao. Mỗi lý do có <b>số sao mặc định</b> — bấm là điền luôn lý do + số sao (vẫn sửa tay được).</div>' +
      '<div class="sd-cl2"><div class="sd-cl-cot sd-cong" data-k="cong"></div><div class="sd-cl-cot sd-tru" data-k="tru"></div></div>' +
      '<div class="sd-ghi-chu">Lưu vào kho chung — dashboard ở máy nào cũng thấy cùng một bộ lý do.</div><div class="sd-tin"></div>' +
      '<div class="sd-cuoi gian"><button class="sd-nut xam" type="button" data-goc>Khôi phục mặc định</button>' +
      '<span><button class="sd-nut xam" type="button" data-x>Huỷ</button> <button class="sd-nut xanh" type="button" data-ok>Lưu</button></span></div>', true);
    var el = h.el, tran = $('.sd-tran', el), tranTay = $('.sd-tran-tay', el), bao = $('.sd-bao', el);
    [[tran, 30], [tranTay, TRAN_TAY_GOC]].forEach(function (x) {
      var o = x[0];
      o.addEventListener('wheel', function (e) { e.preventDefault(); o.blur(); }, { passive: false });
      o.addEventListener('keydown', function (e) { if (e.key === 'Enter') o.blur(); });
      o.addEventListener('change', function () { o.value = chuanTran(o.value, x[1]); });
    });
    // số sao mặc định của lý do nhanh không vượt trần cộng/trừ tay đang gõ trong ô
    var tranLyDo = function () { return chuanTran(tranTay.value, TRAN_TAY_GOC); };
    function ve() {
      Array.prototype.forEach.call(el.querySelectorAll('.sd-cl-cot'), function (c) {
        var k = c.getAttribute('data-k'), ds = nhap[k], dau = k === 'cong' ? '+' : '−';
        c.innerHTML = '<h4>' + (k === 'cong' ? '➕ Lý do CỘNG sao' : '➖ Lý do TRỪ sao') + ' <small>(' + ds.length + ')</small></h4>' +
          ds.map(function (l, j) {
            return '<div class="sd-cl-dong" data-j="' + j + '"><span class="keo"><button type="button" data-len title="Lên">▲</button><button type="button" data-xuong title="Xuống">▼</button></span>' +
              '<input data-t value="' + esc(l.t) + '" placeholder="Tên lý do" maxlength="40"><span class="sn"><span>' + dau + '</span><input data-n type="number" min="1" max="' + TRAN_MAX + '" value="' + l.n + '"></span>' +
              '<button type="button" class="xoa" data-xoa title="Xoá">✕</button></div>';
          }).join('') + '<button type="button" class="sd-cl-them" data-them>+ Thêm lý do</button>';
        Array.prototype.forEach.call(c.querySelectorAll('.sd-cl-dong'), function (d) {
          var j = Number(d.getAttribute('data-j'));
          var ot = $('[data-t]', d), on = $('[data-n]', d);
          ot.oninput = function () { ds[j].t = ot.value; };
          ot.onkeydown = function (e) { if (e.key === 'Enter') ot.blur(); };
          on.addEventListener('wheel', function (e) { e.preventDefault(); on.blur(); }, { passive: false });
          on.onkeydown = function (e) { if (e.key === 'Enter') on.blur(); };
          on.onchange = function () { ds[j].n = Math.max(1, Math.min(tranLyDo(), Math.round(Number(on.value) || 1))); on.value = ds[j].n; };
          $('[data-xoa]', d).onclick = function () { ds.splice(j, 1); ve(); };
          $('[data-len]', d).onclick = function () { if (j > 0) { var t = ds[j - 1]; ds[j - 1] = ds[j]; ds[j] = t; ve(); } };
          $('[data-xuong]', d).onclick = function () { if (j < ds.length - 1) { var t = ds[j + 1]; ds[j + 1] = ds[j]; ds[j] = t; ve(); } };
        });
        $('[data-them]', c).onclick = function () { ds.push({ t: '', n: 1 }); ve(); var o = c.querySelectorAll('[data-t]'); o[o.length - 1].focus(); };
      });
    }
    ve();
    $('[data-goc]', el).onclick = function () { nhap = JSON.parse(JSON.stringify(LYDO_GOC)); ve(); };
    $('[data-x]', el).onclick = h.dong;
    $('[data-ok]', el).onclick = function () {
      ['cong', 'tru'].forEach(function (k) {
        nhap[k] = nhap[k].map(function (l) { return { t: String(l.t || '').trim().slice(0, 40), n: Math.max(1, Math.min(tranLyDo(), Math.round(Number(l.n) || 1))) }; })
          .filter(function (l) { return l.t; });
      });
      $('.sd-tin', el).textContent = 'Đang lưu…';
      var tranMoi = chuanTran(tran.value, 30), tranTayMoi = tranLyDo();
      luuCai({ lyDo: nhap, tran: tranMoi, tranTay: tranTayMoi, baoHs: bao.checked }).then(function () {
        S.cai.lyDo = nhap; S.cai.tran = tranMoi; S.cai.tranTay = tranTayMoi; h.dong(); baoNho('Đã lưu cài đặt sao.'); })['catch'](function (e) {
        $('.sd-tin', el).textContent = 'Chưa lưu được: ' + String((e && (e.code || e.message)) || e).slice(0, 60);
      });
    };
  }

  window.SaoDash = { mo: mo };
})();
