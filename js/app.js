/* ============================================================
   Lesson in Andrew Classes — toàn bộ logic trang học sinh.
   Web tĩnh thuần: không build, không framework, không thư viện ngoài.

   Hai file dữ liệu do app myLesson sinh ra rồi đẩy lên GitHub:
     data/lop.json  — lớp + học sinh (để đăng nhập)
     data/bai.json  — bài của từng lớp

   Đăng nhập bằng MỘT MÃ RIÊNG của từng em (thầy chốt 16/08/2026, đảo quyết định
   "mã là tên em" 23/07/2026). Mã thầy tự gõ trong myStudent → app myLesson đẩy
   vào lop.json (hocSinh[].ma). Đăng nhập vẫn KHÔNG nhằm bảo mật — chỉ để biết
   em nào đang làm bài, đưa đúng tên em sang game AWord, và chúc sinh nhật.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.MYLESSON_CONFIG || {};
  var KHOA_HS = 'mylesson_hs';       // nhớ em đã đăng nhập, trên chính máy em

  var DL = { lop: [], bai: {} };
  var EM = null;                     // { lop, ten, ma }

  var $ = function (s) { return document.querySelector(s); };

  // ---------- tiện ích ----------

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

  // Chuẩn hoá mã: bỏ MỌI khoảng trắng + viết hoa.
  // PHẢI giống hệt chuan_hoa_ma() bên myStudent — nơi thầy gõ mã cho từng em.
  function chuanMa(s) {
    return String(s || '').replace(/\s+/g, '').toUpperCase();
  }

  // Tìm em theo mã trên TOÀN BỘ các lớp — mã là duy nhất toàn trung tâm,
  // nên chỉ cần mã là biết ngay em nào, lớp nào. Em chưa có mã (ma rỗng)
  // thì không đăng nhập được — đúng thiết kế, thầy gõ mã trong myStudent.
  function timTheoMa(maGo) {
    var ma = chuanMa(maGo);
    if (!ma) return null;
    for (var i = 0; i < DL.lop.length; i++) {
      var l = DL.lop[i];
      var ds = l.hocSinh || [];
      for (var j = 0; j < ds.length; j++) {
        if (ds[j].ma && chuanMa(ds[j].ma) === ma) return { lop: l, em: ds[j] };
      }
    }
    return null;
  }

  function vaoHoc() {
    var go = $('#inCode').value;
    if (!chuanMa(go)) {
      return hienModal('Type your code first',
        'Teacher Andrew gave you a secret code. Ask him if you forgot it.');
    }
    var thay = timTheoMa(go);
    if (!thay) {
      return hienModal('We cannot find this code',
        'Check your code again, or ask teacher Andrew to help you.');
    }
    EM = { lop: thay.lop.maLop, ten: thay.em.ten, ma: chuanMa(thay.em.ma) };
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

    capNhatSinhNhat();
    man('class');
  }

  // ---------- sinh nhật ----------
  // sinhNhat trong lop.json chỉ có THÁNG-NGÀY ("MM-DD") — CỐ Ý không có năm
  // (file công khai trên GitHub Pages, tuyệt đối không đưa năm sinh lên).
  // Luật thầy chốt: so THÁNG-NGÀY với ngày THẬT hôm nay; em sinh 29/02 thì
  // năm không nhuận chúc vào 28/02 — đừng bỏ qua, không em ấy mấy năm liền
  // không được chúc lần nào.
  function laSinhNhatHomNay(sinhNhat) {
    var m = String(sinhNhat || '').match(/^(\d{2})-(\d{2})$/);
    if (!m) return false;
    var nay = new Date();
    var thang = ('0' + (nay.getMonth() + 1)).slice(-2);
    var ngay = ('0' + nay.getDate()).slice(-2);
    if (m[1] === thang && m[2] === ngay) return true;
    if (sinhNhat === '02-29' && thang === '02' && ngay === '28') {
      var n = nay.getFullYear();
      var nhuan = (n % 4 === 0 && n % 100 !== 0) || n % 400 === 0;
      return !nhuan;
    }
    return false;
  }

  var phaoDaBung = false;   // pháo giấy chỉ bung MỘT lần mỗi lần mở trang

  function capNhatSinhNhat() {
    var hop = $('#bday');
    var thay = EM ? timTheoMa(EM.ma) : null;
    var dung = !!(thay && laSinhNhatHomNay(thay.em.sinhNhat));
    hop.hidden = !dung;
    if (!dung) return;
    $('#bdayTitle').textContent = 'Happy birthday, ' + EM.ten + '!';
    // (Đợt 2 sẽ tặng sao vào ví ở đây — thầy chốt 17/08/2026; ví sao chưa có.)
    if (!phaoDaBung) { phaoDaBung = true; bungPhaoGiay(); }
  }

  function bungPhaoGiay() {
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var mau = ['#0E7C6E', '#F2A93B', '#E36B5C', '#5B8DEF', '#8CC63F'];
    var hop = document.createElement('div');
    hop.className = 'confetti';
    for (var i = 0; i < 60; i++) {
      var v = document.createElement('i');
      v.style.left = (Math.random() * 100) + 'vw';
      v.style.background = mau[i % mau.length];
      v.style.animationDelay = (Math.random() * 1.4) + 's';
      v.style.animationDuration = (2.8 + Math.random() * 2.2) + 's';
      hop.appendChild(v);
    }
    document.body.appendChild(hop);
    // Dọn sau khi mảnh rơi chậm nhất đã chạm đất (1.4s chờ + 5s rơi + dư 0.6s).
    setTimeout(function () { if (hop.parentNode) hop.parentNode.removeChild(hop); }, 7000);
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
    // Đầu khối giữ đúng thứ tự của Google Sites: TÊN PHẦN → dòng yêu cầu
    // ("100% requirement") → đặc tả act nhỏ bên dưới.
    var dau =
      '<div class="block-head"><span class="step">' + so + '</span>' +
      '<h2>' + chuAnToan(k.ten || 'PRACTICE') + '</h2></div>' +
      (k.yeuCau ? '<p class="req">' + chuAnToan(k.yeuCau) + '</p>' : '') +
      (k.act ? '<p class="act">' + chuAnToan(k.act) + '</p>' : '');

    // Khối slide (dạng SP): một nút mở slide Canva ra tab mới. Canva chặn nhúng
    // trong iframe nên KHÔNG nhúng — bấm là mở thẳng, đúng như trang Sites cũ.
    if (k.loai === 'slide') {
      sec.innerHTML = dau +
        '<div class="block-foot one">' +
          '<a class="btn primary wide" target="_blank" rel="noopener" href="' +
          chuAnToan(k.slide) + '">OPEN SLIDE</a>' +
        '</div>' +
        '<p class="note">Record your speaking video with this slide.</p>';
      return sec;
    }

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

    if (k.ma) sec.appendChild(veBXH(k.ma));
    return sec;
  }

  // ---------- bảng xếp hạng (đọc điểm từ kho AWord) ----------
  // Đọc thẳng Firestore của AWord qua đường REST công khai — luật Firestore
  // bên AWord cho phép AI CŨNG ĐỌC assignments/{mã}/scores (xem AWord
  // docs/08-FIREBASE-SETUP.md). Không cần SDK, không cần đăng nhập.
  // CHỈ đọc khi mở bài + khi bấm làm mới, KHÔNG tự nạp lại theo nhịp —
  // Firebase của AWord là gói miễn phí, có hạn mức đọc mỗi ngày.
  //
  // Ba luật dưới đây CHÉP Y HỆT core/assignments.js bên AWord (nameKey /
  // prettiestName / rankCompare) — đổi bên đó thì phải đổi cả đây:
  //   gộp theo tên thường-hoá · mỗi em lấy lượt TỐT NHẤT ·
  //   điểm cao trước, hoà thì ai nhanh hơn đứng trên.

  var BXH_NHO = {};   // mã bài giao -> Promise danh sách điểm (2 khối cùng mã = 1 lần đọc)

  function urlDiem(ma, token) {
    var db = CFG.AWORD_DB || {};
    var u = 'https://firestore.googleapis.com/v1/projects/' + db.projectId +
            '/databases/(default)/documents/assignments/' + encodeURIComponent(ma) +
            '/scores?pageSize=300&key=' + db.apiKey;
    if (token) u += '&pageToken=' + encodeURIComponent(token);
    return u;
  }

  function soF(f) {
    if (!f) return 0;
    return Number(f.integerValue != null ? f.integerValue : (f.doubleValue || 0));
  }

  function docDiem(ma) {
    if (BXH_NHO[ma]) return BXH_NHO[ma];
    BXH_NHO[ma] = new Promise(function (xong, hong) {
      var tatCa = [];
      (function trang(token, lan) {
        fetch(urlDiem(ma, token))
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
          })
          .then(function (d) {
            (d.documents || []).forEach(function (doc) {
              var f = doc.fields || {};
              tatCa.push({
                ten: (f.name && f.name.stringValue) || '?',
                diem: soF(f.score),
                tong: soF(f.total),
                ms: soF(f.timeMs)
              });
            });
            // Mỗi trang 300 lượt nộp; quá 3 trang thì dừng — một bài giao của
            // một lớp không thể tới 900 lượt, đây chỉ là phanh an toàn.
            if (d.nextPageToken && lan < 3) trang(d.nextPageToken, lan + 1);
            else xong(tatCa);
          })
          .catch(hong);
      })(null, 1);
    });
    // Đọc hỏng thì quên kết quả đi, để lần "làm mới" sau còn thử lại được.
    BXH_NHO[ma]['catch'](function () { delete BXH_NHO[ma]; });
    return BXH_NHO[ma];
  }

  function khoaTen(t) {
    return String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function tenDepNhat(cac) {
    return cac.slice().sort(function (a, b) {
      var hoaA = (a.match(/[A-ZÀ-Ỹ]/g) || []).length;
      var hoaB = (b.match(/[A-ZÀ-Ỹ]/g) || []).length;
      if (hoaA !== hoaB) return hoaB - hoaA;
      return b.length - a.length;
    })[0] || '';
  }

  function gopTotNhat(ds) {
    var theo = {};
    ds.forEach(function (r) {
      var k = khoaTen(r.ten);
      if (!k) return;
      var cu = theo[k];
      if (!cu) {
        theo[k] = { ten: r.ten, diem: r.diem, tong: r.tong, ms: r.ms, cacTen: [r.ten] };
        return;
      }
      cu.cacTen.push(r.ten);
      if (r.diem > cu.diem || (r.diem === cu.diem && (r.ms || 0) < (cu.ms || 0))) {
        cu.diem = r.diem; cu.tong = r.tong; cu.ms = r.ms;
      }
    });
    var ra = [];
    for (var k in theo) {
      theo[k].ten = tenDepNhat(theo[k].cacTen);
      ra.push(theo[k]);
    }
    ra.sort(function (a, b) {
      if (b.diem !== a.diem) return b.diem - a.diem;
      return (a.ms || 0) - (b.ms || 0);
    });
    return ra;
  }

  function giay(ms) {
    var s = Math.round((ms || 0) / 1000);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function veBXH(ma) {
    var hop = document.createElement('div');
    hop.className = 'lb';
    hop.innerHTML =
      '<div class="lb-head"><h3>LEADERBOARD</h3>' +
      '<button class="lb-refresh" type="button" title="Refresh">&#8635;</button></div>' +
      '<p class="lb-status">Loading scores…</p>' +
      '<div class="lb-rows"></div>';
    hop.querySelector('.lb-refresh').onclick = function () {
      delete BXH_NHO[ma];
      napBXH(ma, hop);
    };
    napBXH(ma, hop);
    return hop;
  }

  function napBXH(ma, hop) {
    var trangThai = hop.querySelector('.lb-status');
    var hang = hop.querySelector('.lb-rows');
    trangThai.textContent = 'Loading scores…';
    trangThai.className = 'lb-status';
    trangThai.hidden = false;
    hang.innerHTML = '';

    docDiem(ma).then(function (tho) {
      var ds = gopTotNhat(tho);
      if (!ds.length) {
        trangThai.textContent = 'No scores yet. Be the first!';
        return;
      }
      trangThai.hidden = true;
      var toiKhoa = EM ? khoaTen(EM.ten) : '';
      ds.forEach(function (r, i) {
        var dong = document.createElement('div');
        dong.className = 'lb-row' + (i < 3 ? ' top' : '') +
          (khoaTen(r.ten) === toiKhoa ? ' me' : '');
        dong.innerHTML =
          '<span class="lb-rank">' + (i + 1) + '</span>' +
          '<span class="lb-name">' + chuAnToan(r.ten) +
            (khoaTen(r.ten) === toiKhoa ? ' <b class="lb-you">you</b>' : '') + '</span>' +
          '<span class="lb-score">' + r.diem + '/' + r.tong + '</span>' +
          '<span class="lb-time">' + giay(r.ms) + '</span>';
        hang.appendChild(dong);
      });
    })['catch'](function () {
      trangThai.textContent = 'Could not load the leaderboard. Tap ↻ to try again.';
      trangThai.className = 'lb-status err';
      trangThai.hidden = false;
    });
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
    $('#verClass').textContent = 'v' + (CFG.PHIEN_BAN || '?');
    $('#verLesson').textContent = 'v' + (CFG.PHIEN_BAN || '?');

    Promise.all([nap('data/lop.json'), nap('data/bai.json')]).then(function (r) {
      DL.lop = (r[0] && r[0].lop) || [];
      DL.bai = (r[1] && r[1].bai) || {};

      try {
        // Máy này từng đăng nhập rồi thì tra lại MÃ trong danh sách mới —
        // mã còn (thầy chưa đổi/xoá) thì vào thẳng, khỏi gõ lại.
        // Bản nhớ kiểu cũ {lop, ten} không có mã: coi như chưa đăng nhập.
        var cu = JSON.parse(localStorage.getItem(KHOA_HS) || 'null');
        if (cu && cu.ma) {
          var thay = timTheoMa(cu.ma);
          if (thay) {
            EM = { lop: thay.lop.maLop, ten: thay.em.ten, ma: chuanMa(thay.em.ma) };
          }
        }
      } catch (e) {}

      if (!DL.lop.length) {
        $('#loginNote').textContent =
          'The lesson list is not ready yet. Ask teacher Andrew.';
      }
      theoDiaChi();
    });

    $('#inCode').onkeydown = function (e) { if (e.key === 'Enter') vaoHoc(); };
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
