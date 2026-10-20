/* ============================================================
   js/tb-pop.js — ⭐ v1.379.0 (20/10/2026) VẼ POP-UP THÔNG BÁO (dùng chung trang em + xem trước dashboard).
   Thầy chốt mẫu `D:\OTHERS\CLAUDE\THONG BAO - thiet ke\v1` + "ok build". CSS: css/tb-pop.css (lớp tbp-*).
   window.ACTbPop:
     dung(tb, em, tuy)  → phần tử .tbp-phu (chưa gắn vào trang). tb = { kieu:'le'|'thuong'|'anh', nhan, chao, phuDe, noi, ket, nut, sao, anh }
                          em = { ten, anh (src ảnh em) }. tuy = { trong: vẽ trong khung, tinh: ảnh tĩnh }.
     bay(nen, nut, n, xong) → đóng thẻ + n ngôi sao (tối đa 10 hình) bay vào avatar #nutMenu, cộng số trên huy hiệu .sao-hieu.
   Chữ: {ten} = tên gọi của em · dòng trống = đoạn mới · xuống dòng = <br>.
   ⛔ ES5 (iPad đời cũ).
   ============================================================ */
(function () {
  'use strict';
  if (window.ACTbPop) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tenGoi(t) { return String(t || '').replace(/\s+\d+$/, '').trim().split(/\s+/).slice(-2).join(' '); }
  function chuTat(t) { return String(t || '').trim().split(/\s+/).slice(-2).map(function (x) { return x.charAt(0); }).join('').toUpperCase(); }
  function thay(s, em) { return esc(s).replace(/\{ten\}/gi, esc(tenGoi(em.ten) || 'em')); }
  function doan(s, em, tre) {
    var ds = String(s || '').replace(/\r/g, '').split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean);
    return ds.map(function (p, i) { return '<p class="tbp-hien" style="animation-delay:' + (tre + i * 0.3).toFixed(2) + 's">' + thay(p, em).replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  var SAO = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" fill="#ffc94d" stroke="#fff3c4" stroke-width="1"/></svg>';
  var DAY = '<svg class="tbp-day" viewBox="0 0 20 60"><path d="M10 0 C 4 14, 16 28, 9 42 S 9 56, 11 60"/></svg>';
  var CHUONG = '<svg viewBox="0 0 24 24"><path d="M12 2a6 6 0 0 0-6 6c0 7-3 9-3 9h18s-3-2-3-9a6 6 0 0 0-6-6zm-1.9 19a2 2 0 0 0 3.8 0z"/></svg>';
  var ANH_THAY = 'assets/avatar-tron.jpg';

  function phanChu(tb, em, tre) {
    var sao = Math.max(0, Math.round(Number(tb.sao) || 0));
    return '<div class="tbp-noi">' +
      (tb.chao ? '<div class="tbp-chao tbp-hien" style="animation-delay:' + tre + 's">' + thay(tb.chao, em) + '</div>' : '') +
      (tb.phuDe ? '<div class="tbp-phude tbp-hien" style="animation-delay:' + (tre + 0.2) + 's">' + thay(tb.phuDe, em) + '</div>' : '') +
      '<div class="tbp-loi">' + doan(tb.noi, em, tre + 0.45) + '</div>' +
      (tb.ket ? '<div class="tbp-ket tbp-hien" style="animation-delay:' + (tre + 1.3) + 's">' + thay(tb.ket, em) + '</div>' : '') +
      (tb.kieu === 'le' ? '<div class="tbp-ky tbp-hien" style="animation-delay:' + (tre + 1.45) + 's">Thầy Andrew</div>'
        : '<div class="tbp-thay-nho tbp-ky tbp-hien" style="animation-delay:' + (tre + 1.45) + 's"><img src="' + ANH_THAY + '" alt="">Thầy Andrew</div>') +
      (sao ? '<div class="tbp-sao tbp-hien" style="animation-delay:' + (tre + 1.65) + 's"><i>⭐</i> <b>' + sao + ' sao</b></div>' : '') +
      '<button type="button" class="tbp-nut tbp-hien" style="animation-delay:' + (tre + 1.85) + 's">' + esc(tb.nut || 'OK') + '</button>' +
      '<div class="tbp-bao" aria-live="polite"></div>' +
    '</div>';
  }
  function anhEm(em) {
    return '<div class="tbp-anh">' + esc(chuTat(em.ten) || 'EM') + (em.anh ? '<img src="' + esc(em.anh) + '" alt="" onerror="this.remove()">' : '') + '</div>';
  }

  function dung(tb, em, tuy) {
    tb = tb || {}; em = em || {}; tuy = tuy || {};
    var kieu = tb.kieu === 'thuong' || tb.kieu === 'anh' ? tb.kieu : 'le';
    var nen = document.createElement('div');
    nen.className = 'tbp-phu k-' + kieu + (tuy.trong ? ' tbp-trong' : '') + (tuy.tinh ? ' tbp-tinh' : '');
    var dau;
    if (kieu === 'le') {
      dau = '<div class="tbp-troi">' +
        (tb.nhan ? '<div class="tbp-so"><span>' + thay(tb.nhan, em) + '</span></div>' : '') +
        '<div class="tbp-bong tbp-thay"><div class="tbp-qua"><div class="tbp-anh"><img src="' + ANH_THAY + '" alt="Thầy Andrew"></div><span class="tbp-ten">Thầy</span></div><div class="tbp-nut-bong"></div>' + DAY + '</div>' +
        '<div class="tbp-bong tbp-em"><div class="tbp-qua">' + anhEm(em) + '<span class="tbp-ten">' + esc(tenGoi(em.ten) || 'Em') + '</span></div><div class="tbp-nut-bong"></div>' + DAY + '</div>' +
        '<span class="tbp-lap" style="left:14%;top:30%">✨</span><span class="tbp-lap" style="left:82%;top:34%;animation-delay:.8s">✨</span><span class="tbp-lap" style="left:48%;top:44%;animation-delay:1.6s">✨</span>' +
      '</div>';
    } else {
      dau = (kieu === 'anh' && tb.anh ? '<div class="tbp-anh-lon"><img src="' + esc(tb.anh) + '" alt=""></div>' : '') +
        '<div class="tbp-dau-t">' + (kieu === 'thuong' || !tb.anh ? '<div class="tbp-chuong">' + CHUONG + '</div>' : '') +
        (tb.nhan ? '<span class="tbp-nhan">' + thay(tb.nhan, em) + '</span>' : '') + '</div>';
    }
    nen.innerHTML = '<div class="tbp-roi"></div><div class="tbp-the" role="dialog" aria-modal="true">' + dau +
      phanChu(tb, em, kieu === 'le' ? 0.5 : 0.25) + '</div>';
    if (!tuy.tinh && kieu === 'le') {
      var roi = nen.querySelector('.tbp-roi'), troi = nen.querySelector('.tbp-troi'), i;
      for (i = 0; i < 18; i++) {
        var c = document.createElement('span'); c.className = 'tbp-canh';
        c.style.left = (Math.random() * 100) + '%';
        c.style.setProperty('--x', (Math.random() * 120 - 60) + 'px');
        c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
        c.style.animationDuration = (7 + Math.random() * 7) + 's';
        c.style.animationDelay = (-Math.random() * 12) + 's';
        var k = 0.6 + Math.random() * 0.8; c.style.width = 14 * k + 'px'; c.style.height = 12 * k + 'px';
        roi.appendChild(c);
      }
      var TIM = ['💗', '💕', '💖', '💗', '🤍'];
      for (i = 0; i < 5; i++) {
        var t = document.createElement('span'); t.className = 'tbp-tim';
        t.textContent = TIM[i];
        t.style.setProperty('--y', (92 + Math.random() * 26) + 'px');
        t.style.setProperty('--h', (-22 - Math.random() * 22) + 'px');
        t.style.setProperty('--c', (11 + Math.random() * 5) + 'px');
        t.style.animationDelay = (i * 0.8) + 's';
        troi.appendChild(t);
      }
    }
    return nen;
  }

  function bay(nen, nut, n, xong) {
    var the = nen.querySelector('.tbp-the');
    var r = nut.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    the.classList.add('tbp-di');
    setTimeout(function () { nen.classList.add('tbp-tat'); }, 250);
    setTimeout(function () { if (nen.parentNode) nen.remove(); }, 900);
    n = Math.max(0, Math.round(Number(n) || 0));
    if (!n) { setTimeout(function () { if (xong) xong(); }, 700); return; }
    var av = document.getElementById('nutMenu');
    var d = av && av.getBoundingClientRect();
    var x1 = d && d.width ? d.left + d.width / 2 : 30, y1 = d && d.width ? d.top + d.height / 2 : 30;
    var hinh = Math.min(n, 10), conLai = n, xongDem = 0;
    function cong(k) {
      Array.prototype.forEach.call(document.querySelectorAll('.sao-hieu'), function (h) {
        var tn = h.firstChild;
        if (tn && tn.nodeType === 3) tn.nodeValue = String((parseInt(tn.nodeValue, 10) || 0) + k);
        h.classList.remove('tbp-nay'); void h.offsetWidth; h.classList.add('tbp-nay');
      });
      Array.prototype.forEach.call(document.querySelectorAll('.vi-to .so'), function (o) { o.textContent = String((parseInt(o.textContent, 10) || 0) + k); });
      if (av) { av.classList.remove('tbp-sang'); void av.offsetWidth; av.classList.add('tbp-sang'); }
    }
    for (var i = 0; i < hinh; i++) (function (i) {
      var k = i === hinh - 1 ? conLai : Math.floor(n / hinh); conLai -= k;
      var s = document.createElement('div'); s.className = 'tbp-bay'; s.innerHTML = SAO; document.body.appendChild(s);
      var g = i / hinh * Math.PI * 2, bx = x0 + Math.cos(g) * (70 + Math.random() * 30), by = y0 + Math.sin(g) * (50 + Math.random() * 30) - 40;
      var cx = (bx + x1) / 2 + (Math.random() * 120 - 60), cy = Math.min(by, y1) - 60 - Math.random() * 80;
      if (cy < 10) cy = 10 + Math.random() * 30;
      var tre = 350 + i * 90, dai = 900, daXong = false;
      var het = function () {
        if (daXong) return; daXong = true;
        if (s.parentNode) s.remove();
        cong(k);
        if (++xongDem === hinh) { cam(n); if (xong) xong(); }
      };
      if (s.animate) {
        var a = s.animate([
          { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.2) rotate(0deg)', opacity: 0 },
          { transform: 'translate(' + bx + 'px,' + by + 'px) scale(1.25) rotate(120deg)', opacity: 1, offset: 0.28 },
          { transform: 'translate(' + cx + 'px,' + cy + 'px) scale(1) rotate(260deg)', opacity: 1, offset: 0.62 },
          { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.45) rotate(400deg)', opacity: 1 }
        ], { duration: dai, delay: tre, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'both' });
        a.onfinish = het;
        setTimeout(het, tre + dai + 1500);   // thẻ chạy nền: rAF đứng ⇒ vẫn dọn + cộng số
      } else {
        s.style.transform = 'translate(' + x1 + 'px,' + y1 + 'px)';
        setTimeout(het, tre + 400);
      }
    })(i);
  }
  function cam(n) {
    var c = document.createElement('div');
    c.className = 'tbp-cam';
    c.innerHTML = '<span>+' + n + ' ⭐ đã vào tài khoản của em</span>';
    document.body.appendChild(c);
    setTimeout(function () { c.classList.add('tbp-co'); }, 30);
    setTimeout(function () { c.classList.remove('tbp-co'); }, 2800);
    setTimeout(function () { c.remove(); }, 3500);
  }

  window.ACTbPop = { dung: dung, bay: bay, tenGoi: tenGoi };
})();
