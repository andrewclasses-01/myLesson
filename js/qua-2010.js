/* ============================================================
   js/qua-2010.js — ⭐ v1.377.0 (20/10/2026) POP-UP QUÀ NGÀY PHỤ NỮ VIỆT NAM 20-10 cho bạn NỮ.
   Thầy chốt mẫu `D:\OTHERS\CLAUDE\POPUP 20-10 - thiet ke\v1` + "đẩy lên luôn".
   · Ai thấy: em có phiếu `quaDip/2010_<số>` (khoá quản trị nạp từ giới tính `lopThem/chung` — tools/nap-qua-2010.js),
     phiếu chưa nhận (nhan:false) và chưa quá hạn (het). Tìm phiếu bằng truy vấn m == ID đăng nhập của em (vé ve-doc.js).
   · Bấm THANK YOU ❤️: MỘT lượt ghi gộp = lật quaDip.nhan + tạo phiếu sao `saoDot/qua2010_<số>` (+10) ⇒ hàm apDotSao cộng ví
     (luật tools/dang-luat-qua-2010.js: đúng 10 sao, đúng em, một lần). Ghi xong mới đóng thẻ ⇒ 10 sao bay vào avatar (#nutMenu).
   · Thầy "đăng nhập thay em"/"xem như em" ⇒ KHÔNG hiện. Bàn thử: `?q20thu=1` hiện thẻ với dữ liệu giả, KHÔNG ghi gì.
   ⛔ ES5 như js/chung.js (iPad đời cũ).
   ============================================================ */
(function () {
  'use strict';
  if (window.__q20) return;
  window.__q20 = 1;
  var THU = /[?&]q20thu=1\b/.test(location.search);
  // ⭐ v1.378.0 thầy bỏ HẠN: em đăng nhập lúc nào cũng nhận được; nhận rồi (nhan:true) thì không hiện nữa.
  if (!THU && window.__thayVao) return;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tenGoi(t) { return String(t || '').replace(/\s+\d+$/, '').trim().split(/\s+/).slice(-2).join(' '); }
  function chuTat(t) { return String(t || '').trim().split(/\s+/).slice(-2).map(function (x) { return x.charAt(0); }).join('').toUpperCase(); }

  // Vé (ve-doc.js cất) ⇒ claims: ma, hs, chiXem. Chờ tối đa ~12 giây.
  function layVe() {
    return new Promise(function (xong) {
      var lan = 0;
      (function thu() {
        var o = null;
        try { o = JSON.parse(localStorage.getItem('awc_ve') || 'null'); } catch (e) { o = null; }
        if (o && o.t && o.het > Date.now()) {
          try {
            var p = o.t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            while (p.length % 4) p += '=';
            var c = JSON.parse(decodeURIComponent(escape(atob(p))));
            return xong(c);
          } catch (e) { return xong(null); }
        }
        if (++lan > 24) return xong(null);
        setTimeout(thu, 500);
      })();
    });
  }

  function timPhieu() {
    return layVe().then(function (c) {
      if (!c || c.hs !== true || c.chiXem || !c.ma) return null;
      if (!window.AWChat || !AWChat.kho) return null;
      return AWChat.kho().then(function (f) {
        var q = f.fs.query(f.fs.collection(f.db, 'quaDip'), f.fs.where('m', '==', String(c.ma)));
        return f.fs.getDocs(q).then(function (s) {
          var ra = null;
          s.forEach(function (d) {
            var x = d.data() || {};
            if (d.id.indexOf('2010_') === 0 && x.nhan === false && !ra) ra = { id: d.id, so: String(x.so || d.id.slice(5)), t: x.t || '', lop: x.lop || '', f: f };
          });
          return ra;
        });
      });
    })['catch'](function () { return null; });
  }

  function napCss() {
    return new Promise(function (xong) {
      if (document.getElementById('q20Css')) return xong();
      var l = document.createElement('link');
      l.id = 'q20Css'; l.rel = 'stylesheet'; l.href = 'css/qua-2010.css?v=1';
      l.onload = l.onerror = function () { xong(); };
      document.head.appendChild(l);
      setTimeout(xong, 4000);
    });
  }

  var SAO = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" fill="#ffc94d" stroke="#fff3c4" stroke-width="1"/></svg>';
  var DAY = '<svg class="q20-day" viewBox="0 0 20 60"><path d="M10 0 C 4 14, 16 28, 9 42 S 9 56, 11 60"/></svg>';

  function anhEm(ten) {
    var img = document.querySelector('#nutMenu img');
    var src = img && img.getAttribute('src');
    return '<div class="q20-anh">' + esc(chuTat(ten)) + (src ? '<img src="' + esc(src) + '" alt="" onerror="this.remove()">' : '') + '</div>';
  }

  function hien(p) {
    var ten = tenGoi(p.t) || 'em';
    var nen = document.createElement('div');
    nen.className = 'q20-phu';
    nen.innerHTML =
      '<div class="q20-roi"></div>' +
      '<div class="q20-the" role="dialog" aria-modal="true" aria-label="Chúc mừng 20-10">' +
        '<div class="q20-troi">' +
          '<div class="q20-so"><span>20 · 10</span></div>' +
          '<div class="q20-bong q20-thay"><div class="q20-qua"><div class="q20-anh"><img src="assets/avatar-tron.jpg" alt="Thầy Andrew"></div><span class="q20-ten">Thầy</span></div><div class="q20-nut-bong"></div>' + DAY + '</div>' +
          '<div class="q20-bong q20-em"><div class="q20-qua">' + anhEm(p.t) + '<span class="q20-ten">' + esc(ten) + '</span></div><div class="q20-nut-bong"></div>' + DAY + '</div>' +
          '<span class="q20-lap" style="left:14%;top:30%">✨</span><span class="q20-lap" style="left:82%;top:34%;animation-delay:.8s">✨</span><span class="q20-lap" style="left:48%;top:44%;animation-delay:1.6s">✨</span>' +
        '</div>' +
        '<div class="q20-noi">' +
          '<div class="q20-chao q20-hien" style="animation-delay:.5s">Happy Women\'s Day</div>' +
          '<div class="q20-phude q20-hien" style="animation-delay:.7s">Ngày Phụ nữ Việt Nam</div>' +
          '<div class="q20-loi">' +
            '<p class="q20-hien" style="animation-delay:.95s">Cảm ơn em vì đã luôn <span class="q20-nb">nỗ lực</span> và <span class="q20-nb">chăm chỉ.</span><br>Thầy rất vui khi nhìn thấy em <span class="q20-nb">lớn lên</span><br>và <span class="q20-nb">tiến bộ từng ngày.</span></p>' +
            '<p class="q20-hien" style="animation-delay:1.5s">Mong em luôn <span class="q20-nb">tự tin,</span> <span class="q20-nb">rạng rỡ</span> như <span class="q20-nb">một bông hoa</span><br><span class="q20-nb">— và</span> luôn được <span class="q20-nb">yêu thương thật nhiều.</span></p>' +
          '</div>' +
          '<div class="q20-ket q20-hien" style="animation-delay:1.85s">Thầy chúc em ngày 20-10 vui vẻ ❤️</div>' +
          '<div class="q20-ky q20-hien" style="animation-delay:2s">Thầy Andrew</div>' +
          '<div class="q20-sao q20-hien" style="animation-delay:2.2s"><i>⭐</i> <b>10 sao</b></div>' +
          '<button type="button" class="q20-nut q20-hien" style="animation-delay:2.4s">THANK YOU ❤️</button>' +
          '<div class="q20-bao" aria-live="polite"></div>' +
        '</div>' +
      '</div>';
    var roi = nen.querySelector('.q20-roi'), troi = nen.querySelector('.q20-troi'), i;
    for (i = 0; i < 18; i++) {
      var c = document.createElement('span'); c.className = 'q20-canh';
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
      var t = document.createElement('span'); t.className = 'q20-tim';
      t.textContent = TIM[i];
      t.style.setProperty('--y', (92 + Math.random() * 26) + 'px');
      t.style.setProperty('--h', (-22 - Math.random() * 22) + 'px');
      t.style.setProperty('--c', (11 + Math.random() * 5) + 'px');
      t.style.animationDelay = (i * 0.8) + 's';
      troi.appendChild(t);
    }
    document.body.appendChild(nen);
    var nut = nen.querySelector('.q20-nut'), bao = nen.querySelector('.q20-bao');
    nut.onclick = function () {
      nut.disabled = true; bao.textContent = '';
      nhan(p).then(function () { bay(nen, nut); }, function (e) {
        // Bị từ chối mà phiếu ĐÃ nhận (bấm ở máy/tab khác) ⇒ sao đã vào ví: đóng thẻ, không hiện lại nữa.
        if (/permission/i.test((e && e.code) || '') && p.f) {
          p.f.fs.getDoc(p.f.fs.doc(p.f.db, 'quaDip', p.id)).then(function (d) {
            if (d.exists() && d.data().nhan === true) { nen.classList.add('q20-tat'); setTimeout(function () { nen.remove(); }, 600); }
          }, function () { });
        }
        nut.disabled = false;
        var ma = (e && e.code) || '';
        bao.textContent = /permission/i.test(ma) ? 'Quà đã được nhận rồi hoặc chưa mở được — em tải lại trang thử nhé.' : 'Chưa gửi được (mạng yếu?) — em bấm lại nhé.';
      });
    };
  }

  // MỘT lượt ghi gộp: lật nhan + tạo phiếu sao (luật bắt buộc đi cùng nhau).
  function nhan(p) {
    if (THU) return new Promise(function (x) { setTimeout(x, 300); });
    var f = p.f, b = f.fs.writeBatch(f.db), luc = Date.now();
    b.update(f.fs.doc(f.db, 'quaDip', p.id), { nhan: true, nhanLuc: luc });
    b.set(f.fs.doc(f.db, 'saoDot', 'qua' + p.id), {
      nguon: 'qua2010', lop: String(p.lop || ''), ngay: '2026-10-20', nhom: 'QUÀ 20-10', ai: 'Thầy Andrew',
      dong: [{ so: p.so, n: 10, viec: 'Quà 20-10 của thầy ❤️', app: 'Thầy Andrew' }], tao: luc
    });
    return b.commit();
  }

  function bay(nen, nut) {
    var the = nen.querySelector('.q20-the');
    var r = nut.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    var av = document.getElementById('nutMenu');
    var d = av && av.getBoundingClientRect();
    var x1 = d && d.width ? d.left + d.width / 2 : 30, y1 = d && d.width ? d.top + d.height / 2 : 30;
    the.classList.add('q20-di');
    setTimeout(function () { nen.classList.add('q20-tat'); }, 250);
    setTimeout(function () { nen.remove(); }, 900);
    var hieu = document.querySelectorAll('.sao-hieu');
    function congMot() {
      Array.prototype.forEach.call(hieu, function (h) {
        var tn = h.firstChild;
        if (tn && tn.nodeType === 3) tn.nodeValue = String((parseInt(tn.nodeValue, 10) || 0) + 1);
        h.classList.remove('q20-nay'); void h.offsetWidth; h.classList.add('q20-nay');
      });
      Array.prototype.forEach.call(document.querySelectorAll('.vi-to .so'), function (o) { o.textContent = String((parseInt(o.textContent, 10) || 0) + 1); });
      if (av) { av.classList.remove('q20-sang'); void av.offsetWidth; av.classList.add('q20-sang'); }
    }
    var i, xongDem = 0;
    for (i = 0; i < 10; i++) (function (i) {
      var s = document.createElement('div'); s.className = 'q20-bay'; s.innerHTML = SAO; document.body.appendChild(s);
      var g = i / 10 * Math.PI * 2, bx = x0 + Math.cos(g) * (70 + Math.random() * 30), by = y0 + Math.sin(g) * (50 + Math.random() * 30) - 40;
      var cx = (bx + x1) / 2 + (Math.random() * 120 - 60), cy = Math.min(by, y1) - 60 - Math.random() * 80;
      if (cy < 10) cy = 10 + Math.random() * 30;
      var tre = 350 + i * 90, dai = 900;
      var het = function () {
        if (s.parentNode) s.remove();
        congMot();
        if (++xongDem === 10) cam();
      };
      if (s.animate) {
        var a = s.animate([
          { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.2) rotate(0deg)', opacity: 0 },
          { transform: 'translate(' + bx + 'px,' + by + 'px) scale(1.25) rotate(120deg)', opacity: 1, offset: 0.28 },
          { transform: 'translate(' + cx + 'px,' + cy + 'px) scale(1) rotate(260deg)', opacity: 1, offset: 0.62 },
          { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.45) rotate(400deg)', opacity: 1 }
        ], { duration: dai, delay: tre, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'both' });
        a.onfinish = het;
        setTimeout(function () { if (s.parentNode) het(); }, tre + dai + 1500);   // thẻ chạy nền: rAF đứng ⇒ vẫn dọn + cộng số
      } else {
        s.style.transform = 'translate(' + x1 + 'px,' + y1 + 'px)';
        setTimeout(het, tre + 400);
      }
    })(i);
  }
  function cam() {
    var c = document.createElement('div');
    c.className = 'q20-cam';
    c.innerHTML = '<span>+10 ⭐ đã vào tài khoản của em</span>';
    document.body.appendChild(c);
    setTimeout(function () { c.classList.add('q20-co'); }, 30);
    setTimeout(function () { c.classList.remove('q20-co'); }, 2800);
    setTimeout(function () { c.remove(); }, 3500);
  }

  function chay() {
    var p = THU ? Promise.resolve({ id: '2010_000000', so: '000000', t: 'Nguyễn Minh Anh', lop: 'THU' }) : timPhieu();
    p.then(function (x) {
      if (!x) return;
      napCss().then(function () { setTimeout(function () { hien(x); }, 400); });
    });
  }
  if (document.readyState === 'complete') setTimeout(chay, 600);
  else window.addEventListener('load', function () { setTimeout(chay, 600); });
})();
