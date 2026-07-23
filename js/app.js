/* ============================================================
   Lesson in Andrew Classes — toàn bộ logic trang học sinh.
   Web tĩnh thuần: không build, không framework, không thư viện ngoài.

   Hai file dữ liệu do app myLesson sinh ra rồi đẩy lên GitHub:
     data/lop.json  — lớp + học sinh (để đăng nhập)
     data/bai.json  — bài của từng lớp

   Đăng nhập ở đây KHÔNG nhằm bảo mật (mã chính là tên em, thầy chốt 23/07/2026)
   mà để biết em nào đang làm bài và đưa đúng tên em sang game AWord.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.MYLESSON_CONFIG || {};
  var KHOA_HS = 'mylesson_hs';       // nhớ em đã đăng nhập, trên chính máy em

  var DL = { lop: [], bai: {} };
  var EM = null;                     // { lop, ten }

  var $ = function (s) { return document.querySelector(s); };

  // ---------- tiện ích ----------

  // Bỏ dấu + viết hoa: dùng để SO KHỚP những gì học sinh gõ.
  // Hiển thị thì luôn giữ nguyên tên có dấu.
  function phang(s) {
    return String(s || '')
      .normalize('NFD').replace(/\p{M}/gu, '')
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim().toUpperCase();
  }

  function hienModal(tieuDe, chu) {
    $('#modalTitle').textContent = tieuDe;
    $('#modalText').textContent = chu;
    $('#modal').hidden = false;
  }

  function man(ten) {
    $('#scLogin').hidden = ten !== 'login';
    $('#scClass').hidden = ten !== 'class';
    $('#scLesson').hidden = ten !== 'lesson';
    window.scrollTo(0, 0);
  }

  function nap(duong) {
    return fetch(duong + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // ---------- đăng nhập ----------

  function timLop(chuGo) {
    var p = phang(chuGo);
    if (!p) return null;
    for (var i = 0; i < DL.lop.length; i++) {
      var l = DL.lop[i];
      if (phang(l.maLop) === p || phang(l.tenGoc) === p) return l;
    }
    return null;
  }

  function goiY() {
    var hop = $('#suggest');
    var lop = timLop($('#inClass').value);
    var go = phang($('#inName').value);
    if (!lop || go.length < 1) { hop.hidden = true; return; }

    var khop = lop.hocSinh.filter(function (h) {
      return phang(h.ten).indexOf(go) === 0;
    });
    if (!khop.length) {
      khop = lop.hocSinh.filter(function (h) { return phang(h.ten).indexOf(go) >= 0; });
    }
    if (!khop.length) { hop.hidden = true; return; }

    hop.innerHTML = '';
    khop.slice(0, 8).forEach(function (h) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = h.ten;
      b.onclick = function () {
        $('#inName').value = h.ten;
        hop.hidden = true;
        vaoHoc();
      };
      hop.appendChild(b);
    });
    hop.hidden = false;
  }

  function vaoHoc() {
    var lop = timLop($('#inClass').value);
    if (!lop) {
      return hienModal('We cannot find your class',
        'Check the class name, or ask teacher Andrew to help you.');
    }
    var go = phang($('#inName').value);
    var em = null;
    for (var i = 0; i < lop.hocSinh.length; i++) {
      if (phang(lop.hocSinh[i].ten) === go) { em = lop.hocSinh[i]; break; }
    }
    if (!em) {
      return hienModal('We cannot find your name',
        'Type your name the way teacher Andrew writes it, then pick it from the list.');
    }
    EM = { lop: lop.maLop, ten: em.ten };
    try { localStorage.setItem(KHOA_HS, JSON.stringify(EM)); } catch (e) {}
    moLop();
  }

  // ---------- trang lớp ----------

  function baiCuaLop(maLop) {
    return (DL.bai && DL.bai[maLop]) ? DL.bai[maLop] : [];
  }

  function moLop() {
    var ds = baiCuaLop(EM.lop);
    $('#helloName').textContent = 'Hello, ' + EM.ten + '!';
    $('#chipClass').textContent = 'CLASS ' + EM.lop;
    $('#chipCount').textContent = ds.length + (ds.length === 1 ? ' lesson' : ' lessons');

    var hop = $('#lessonList');
    hop.innerHTML = '';
    $('#emptyNote').hidden = ds.length > 0;

    ds.forEach(function (b) {
      var card = document.createElement('button');
      card.className = 'lesson-card';
      card.type = 'button';
      var soKhoi = (b.khoi || []).length;
      card.innerHTML =
        '<div class="lc-main">' +
          '<p class="lc-title">' + chuAnToan(b.tenHien || b.tieuDe) + '</p>' +
          '<div class="lc-meta">' +
            '<span class="lc-tag">' + chuAnToan(b.dang || 'LESSON') + '</span>' +
            '<span class="lc-tag">' + soKhoi + (soKhoi === 1 ? ' part' : ' parts') + '</span>' +
            (b.ngay ? '<span class="lc-tag due">DUE ' + chuAnToan(b.ngay) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="lc-go">›</div>';
      card.onclick = function () { location.hash = '#/bai/' + encodeURIComponent(b.id); };
      hop.appendChild(card);
    });

    man('class');
  }

  function chuAnToan(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---------- trang một bài ----------

  var ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

  function moBai(id) {
    var ds = baiCuaLop(EM.lop);
    var b = null;
    for (var i = 0; i < ds.length; i++) if (ds[i].id === id) { b = ds[i]; break; }
    if (!b) { location.hash = ''; return; }

    $('#lsTitle').innerHTML = chuAnToan(b.tenHien || b.tieuDe);
    $('#lsChipClass').textContent = 'CLASS ' + EM.lop;
    $('#lsChipDate').textContent = b.ngay ? ('DUE ' + b.ngay) : 'NO DEADLINE';
    $('#lsChipDate').hidden = !b.ngay;
    $('#lsEyebrow').textContent = EM.ten + ' · Teacher Andrew';

    var hop = $('#lsBlocks');
    hop.innerHTML = '';
    (b.khoi || []).forEach(function (k, i) {
      hop.appendChild(veKhoi(k, i + 1));
    });

    man('lesson');
  }

  function veKhoi(k, so) {
    var sec = document.createElement('section');
    sec.className = 'block';
    var dau =
      '<div class="block-head"><span class="step">' + so + '</span>' +
      '<h2>' + chuAnToan(k.ten || 'PRACTICE') + '</h2></div>' +
      (k.act ? '<p class="act">' + chuAnToan(k.act) + '</p>' : '');

    if (k.loai === 'video') {
      sec.innerHTML = dau +
        '<div class="video-frame"><iframe src="https://drive.google.com/file/d/' +
        chuAnToan(k.driveId) + '/preview" allow="autoplay; fullscreen" allowfullscreen ' +
        'title="Video"></iframe></div>' +
        '<p class="note">Watch as many times as you need.</p>';
      return sec;
    }

    // Khối bài tập AWord. Chỉ nạp game khi học sinh bấm (click-to-load).
    var link = CFG.AWORD + '/play.html?g=' + encodeURIComponent(k.ma) +
               '&n=' + encodeURIComponent(EM.ten);
    sec.innerHTML = dau +
      '<div class="game" data-src="' + chuAnToan(link) + '">' +
        '<div class="game-cover"><div class="play">' + ICON_PLAY + '</div>' +
        '<span>Tap to start</span></div>' +
      '</div>' +
      '<div class="block-foot">' +
        '<a class="btn ghost" target="_blank" rel="noopener" href="' + chuAnToan(link) + '">' +
        'Open in a new tab</a>' +
      '</div>';

    var khung = sec.querySelector('.game');
    khung.querySelector('.game-cover').onclick = function () {
      var f = document.createElement('iframe');
      f.src = khung.getAttribute('data-src');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('allow', 'fullscreen; autoplay');
      khung.innerHTML = '';
      khung.appendChild(f);
    };
    return sec;
  }

  // ---------- đường đi trong trang ----------

  function theoDiaChi() {
    if (!EM) { man('login'); return; }
    var h = location.hash || '';
    var m = h.match(/^#\/bai\/(.+)$/);
    if (m) moBai(decodeURIComponent(m[1]));
    else moLop();
  }

  // ---------- khởi động ----------

  function batDau() {
    document.title = CFG.TEN_SITE || 'Lesson in Andrew Classes';

    Promise.all([nap('data/lop.json'), nap('data/bai.json')]).then(function (r) {
      DL.lop = (r[0] && r[0].lop) || [];
      DL.bai = (r[1] && r[1].bai) || {};

      try {
        var cu = JSON.parse(localStorage.getItem(KHOA_HS) || 'null');
        if (cu && cu.lop && cu.ten) {
          // Em đó còn trong danh sách mới thì cho vào thẳng, khỏi gõ lại.
          for (var i = 0; i < DL.lop.length; i++) {
            if (DL.lop[i].maLop === cu.lop) {
              for (var j = 0; j < DL.lop[i].hocSinh.length; j++) {
                if (DL.lop[i].hocSinh[j].ten === cu.ten) { EM = cu; break; }
              }
            }
          }
        }
      } catch (e) {}

      if (!DL.lop.length) {
        $('#loginNote').textContent =
          'The lesson list is not ready yet. Ask teacher Andrew.';
      }
      theoDiaChi();
    });

    $('#inClass').oninput = goiY;
    $('#inName').oninput = goiY;
    $('#inName').onkeydown = function (e) { if (e.key === 'Enter') vaoHoc(); };
    $('#inClass').onkeydown = function (e) { if (e.key === 'Enter') $('#inName').focus(); };
    $('#btnLogin').onclick = vaoHoc;

    $('#btnLogout').onclick = function () {
      try { localStorage.removeItem(KHOA_HS); } catch (e) {}
      EM = null;
      location.hash = '';
      man('login');
    };
    $('#btnBack').onclick = function () { location.hash = ''; };
    $('#modalOk').onclick = function () { $('#modal').hidden = true; };

    window.addEventListener('hashchange', theoDiaChi);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', batDau);
  } else {
    batDau();
  }
})();
