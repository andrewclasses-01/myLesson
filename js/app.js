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

  // Khối .brand (icon + "Andrew Classes" + 9 sparkle) chỉ tồn tại DUY NHẤT
  // một lần trong toàn trang — dời nó sang thẻ đang hiện thay vì tạo lại.
  // Nhờ scLogin/scInfo ẩn bằng visibility (không phải display:none, xem
  // main.css) nên việc dời này KHÔNG làm sparkle bị reset.
  function datBrandDungCho(ten) {
    var brand = $('#btnBrand');
    var dichCard = ten === 'info' ? $('#infoCardEl') : $('#loginCardEl');
    if (brand.parentElement !== dichCard) dichCard.insertBefore(brand, dichCard.firstChild);
    brand.classList.toggle('gon', ten === 'info');
    brand.setAttribute('aria-label', ten === 'info' ? 'Quay lại màn đăng nhập' : 'Mở trang thông tin');
  }

  function man(ten) {
    $('#scLogin').classList.toggle('man-hien', ten === 'login');
    $('#scInfo').classList.toggle('man-hien', ten === 'info');
    $('#scClass').hidden = ten !== 'class';
    $('#scLesson').hidden = ten !== 'lesson';
    // Nền loang CHỈ dành cho 2 màn đăng nhập/thông tin — 2 màn kia có nền
    // riêng (.hero). #loginBg không bị dựng lại nên đổi đăng nhập ↔ thông
    // tin không làm nó chạy lại từ đầu.
    $('#loginBg').hidden = (ten !== 'login' && ten !== 'info');
    if (ten === 'login' || ten === 'info') datBrandDungCho(ten);
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
  var ICON_TAM = '<svg viewBox="0 0 24 24" fill="currentColor">' +
    '<rect x="6.5" y="4.5" width="4" height="15" rx="1.3"/>' +
    '<rect x="13.5" y="4.5" width="4" height="15" rx="1.3"/></svg>';
  var ICON_LUI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 11a8 8 0 1 1 2.3 6.3"/><path d="M4 5.5V11h5.5"/></svg>';

  // ---------- trình phát bài nghe (v1.7.0) ----------
  // Dùng thẻ <audio> có sẵn của trình duyệt, chỉ vẽ lại mặt ngoài cho hợp giao
  // diện: nút phát · thanh kéo tua · ĐỒNG HỒ chạy · nút −5 giây · đổi tốc độ.
  //
  // ⚠ preload="metadata": chỉ tải phần đầu file để biết tổng thời lượng, chưa
  // tải cả bài — em nào không bấm nghe thì không tốn dữ liệu di động.
  // ⚠ Tua được là nhờ máy chủ GitHub Pages trả `206 Partial Content` (đã thử
  // thật). Máy chủ thử ở nhà (python http.server) KHÔNG trả, nên chạy local
  // thấy không tua được là bình thường — đừng đi sửa code.

  var TOC_DO = [1, 0.75, 0.5];

  function chuGio(giay) {
    if (!isFinite(giay)) return '--:--';
    var p = Math.floor(giay / 60), s = Math.floor(giay % 60);
    return p + ':' + (s < 10 ? '0' : '') + s;
  }

  // LEVEL = phần TRƯỚC DẤU GẠCH ĐẦU TIÊN của mã bài (thầy chốt 19/08). Kho xếp
  // mỗi level một thư mục nên suy ra được từ chính mã, bài không phải lưu đường
  // dẫn: LSFLY-S1.T3.P1-2-3 → LSFLY · IEL-S15.T1.P1 → IEL.
  // ⛔ Đổi cách xếp kho thì phải sửa CẢ `nghe.js` bên app.
  function levelCuaMa(ma) {
    var m = String(ma || '').trim().match(/^([A-Za-z0-9]+)-/);
    return m ? m[1].toUpperCase() : 'KHAC';
  }

  function veTrinhPhat(k) {
    var kho = (CFG.KHO_NGHE || '').replace(/\/+$/, '');
    var ma = k.maNghe || '';
    var duong = kho + '/' + encodeURIComponent(levelCuaMa(ma)) +
                '/' + encodeURIComponent(ma) + '.mp3';
    return '<div class="nghe">' +
      '<audio preload="metadata" src="' + chuAnToan(duong) + '"></audio>' +
      '<button class="ng-play dung" title="Play">' + ICON_PLAY + '</button>' +
      '<div class="ng-giua">' +
        '<div class="ng-thanh"><div class="ng-chay"></div><div class="ng-num"></div></div>' +
        '<div class="ng-gio"><span class="ng-nay">0:00</span><span class="ng-tong">--:--</span></div>' +
      '</div>' +
      '<div class="ng-nut">' +
        '<button class="lui" title="Back 5 seconds">' + ICON_LUI + '5s</button>' +
        '<button class="toc" title="Speed">1&times;</button>' +
      '</div>' +
    '</div>';
  }

  function noiTrinhPhat(sec) {
    var am = sec.querySelector('audio'),
        nut = sec.querySelector('.ng-play'),
        thanh = sec.querySelector('.ng-thanh'),
        chay = sec.querySelector('.ng-chay'),
        num = sec.querySelector('.ng-num'),
        nay = sec.querySelector('.ng-nay'),
        tong = sec.querySelector('.ng-tong'),
        lui = sec.querySelector('.lui'),
        toc = sec.querySelector('.toc');

    function veThanh() {
      var ti = am.duration ? (am.currentTime / am.duration) : 0;
      chay.style.width = (ti * 100) + '%';
      num.style.left = (ti * 100) + '%';
      nay.textContent = chuGio(am.currentTime);
    }

    // Tổng thời lượng chỉ biết được SAU khi trình duyệt đọc xong phần đầu file
    // — trước đó `duration` là NaN, nên phải chờ sự kiện chứ đừng đọc ngay.
    am.addEventListener('loadedmetadata', function () { tong.textContent = chuGio(am.duration); });
    am.addEventListener('timeupdate', veThanh);
    am.addEventListener('ended', function () {
      nut.innerHTML = ICON_PLAY; nut.classList.add('dung'); nut.title = 'Play';
    });

    nut.onclick = function () {
      if (am.paused) {
        // Chỉ cho MỘT bài nghe chạy một lúc — hai bài cùng phát thì rối tai.
        var het = document.querySelectorAll('.nghe audio');
        for (var i = 0; i < het.length; i++) if (het[i] !== am) het[i].pause();
        am.play();
        nut.innerHTML = ICON_TAM; nut.classList.remove('dung'); nut.title = 'Pause';
      } else {
        am.pause();
        nut.innerHTML = ICON_PLAY; nut.classList.add('dung'); nut.title = 'Play';
      }
    };

    lui.onclick = function () { am.currentTime = Math.max(0, am.currentTime - 5); veThanh(); };

    toc.onclick = function () {
      var i = (TOC_DO.indexOf(am.playbackRate) + 1) % TOC_DO.length;
      am.playbackRate = TOC_DO[i];
      toc.innerHTML = TOC_DO[i] + '&times;';
      if (TOC_DO[i] !== 1) toc.classList.add('cham'); else toc.classList.remove('cham');
    };

    // Kéo tua: dùng pointer nên chuột và ngón tay chung một đường code.
    function tuaTheoX(x) {
      if (!am.duration) return;
      var o = thanh.getBoundingClientRect();
      var ti = Math.min(1, Math.max(0, (x - o.left) / o.width));
      am.currentTime = ti * am.duration;
      veThanh();
    }
    var dangKeo = false;
    thanh.addEventListener('pointerdown', function (e) {
      dangKeo = true;
      if (thanh.setPointerCapture) thanh.setPointerCapture(e.pointerId);
      tuaTheoX(e.clientX);
    });
    thanh.addEventListener('pointermove', function (e) { if (dangKeo) tuaTheoX(e.clientX); });
    thanh.addEventListener('pointerup', function () { dangKeo = false; });
    thanh.addEventListener('pointercancel', function () { dangKeo = false; });
  }

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

    // Khối BÀI NGHE (v1.7.0) — file mp3 trong kho riêng `myLesson-audio`.
    // Thay cho khối `video` Drive: video cũ chỉ là ảnh tĩnh + tiếng, nặng ~18 MB
    // và học sinh KHÔNG thấy còn bao nhiêu phút. Xem `veTrinhPhat` bên dưới.
    if (k.loai === 'nghe') {
      sec.innerHTML = dau + veTrinhPhat(k) +
        '<p class="note">Listen as many times as you need. Drag the bar to move, ' +
        'tap <b>&minus;5s</b> to hear the last sentence again, or slow it down.</p>';
      noiTrinhPhat(sec);
      return sec;
    }

    // Khối video Drive — GIỮ LẠI để mở được bài soạn trước 19/08/2026.
    // ⛔ Đừng dùng cho bài mới, và đừng thử đổi sang link tải trực tiếp của
    // Drive: trình duyệt từ chối phát (Drive trả kèm `attachment` + `nosniff`),
    // đã thử cả ba kiểu link. Bài mới dùng khối `nghe` ở trên.
    if (k.loai === 'video') {
      sec.innerHTML = dau +
        '<div class="video-frame"><iframe src="https://drive.google.com/file/d/' +
        chuAnToan(k.driveId) + '/preview" allow="autoplay; fullscreen" allowfullscreen ' +
        'title="Video"></iframe></div>' +
        '<p class="note">Watch as many times as you need.</p>';
      return sec;
    }

    // Khối bài tập AWord. Chỉ nạp game khi học sinh bấm (click-to-load).
    // `n` = tên em, `lop` = lớp — cả hai lấy từ chính mã đăng nhập, em không
    // phải gõ gì. AWord (Đợt 199) hiện "TÊN EM - LỚP" ở màn Start.
    var link = CFG.AWORD + '/play.html?g=' + encodeURIComponent(k.ma) +
               '&n=' + encodeURIComponent(EM.ten) +
               '&lop=' + encodeURIComponent(EM.lop || '');
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
    var h = location.hash || '';
    // Trang thông tin xem được cả khi CHƯA đăng nhập (đúng lối vào từ màn đăng nhập).
    if (h === '#/info') { man('info'); return; }
    if (!EM) { man('login'); return; }
    var m = h.match(/^#\/bai\/(.+)$/);
    if (m) moBai(decodeURIComponent(m[1]));
    else moLop();
  }

  // ---------- khởi động ----------

  function batDau() {
    document.title = CFG.TEN_SITE || 'Lesson in Andrew Classes';
    $('#verClass').textContent = 'v' + (CFG.PHIEN_BAN || '?');
    $('#verLesson').textContent = 'v' + (CFG.PHIEN_BAN || '?');

    // Nền loang xoay CỰC chậm — bốc thăm ngẫu nhiên chiều xuôi/ngược kim đồng
    // hồ mỗi lần mở trang (xem .xuoi/.nguoc + xoayCham/xoayNguoc trong CSS).
    $('#loginBg').classList.add(Math.random() < 0.5 ? 'xuoi' : 'nguoc');

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
        // Dòng này thường ẩn — chỉ bật khi chưa nạp được danh sách lớp.
        $('#loginNote').textContent =
          'The lesson list is not ready yet. Ask teacher Andrew.';
        $('#loginNote').hidden = false;
      }
      theoDiaChi();
    });

    $('#inCode').onkeydown = function (e) { if (e.key === 'Enter') vaoHoc(); };
    $('#btnLogin').onclick = vaoHoc;

    // Icon + "Andrew Classes" là MỘT khối DUY NHẤT, dùng chung 2 màn (xem
    // datBrandDungCho) — bấm nó mở/đóng trang thông tin, đích tính động theo
    // hash hiện tại nên không cần 2 handler riêng cho 2 chiều.
    //
    // Hoạt ảnh TRƯỢT NHIỀU GIAI ĐOẠN thầy chốt:
    //  1) "Andrew Classes" ĐỨNG YÊN, phần bên dưới (ô mã/BEGIN hoặc 3 dòng
    //     thông tin) CUỘN VÀO trước (.card-body + .co-lai).
    //  2) Đổi màn xong, phần thân màn mới ĐẨY DẦN RA (.card-body nở lại) —
    //     ĐÚNG LÚC NÀY khối brand mới TRƯỢT LÊN (kỹ thuật FLIP: đo vị trí cũ
    //     → dời sang thẻ mới → đo vị trí mới → chạy transform bù từ cũ về 0).
    //  Chiều ngược lại giống hệt, chỉ đảo thứ tự.
    // ⛔ THOI_GIAN_TRUOT phải khớp "transition" dài nhất của .card-body trong
    // main.css (nay 580ms) — lệch là đổi màn giữa chừng lúc còn đang co, nhìn
    // giật cục (bài học thật: từng để 260 trong khi CSS 320).
    var THOI_GIAN_TRUOT = 580;
    var THOI_GIAN_BAY_BRAND = 520;
    var GIAM_CHUYEN_DONG = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Chỉ lo phần "trượt" (FLIP: so vị trí TRƯỚC khi dời với vị trí SAU khi
    // dời rồi bù transform từ đó về 0) — KHÔNG tự dời brand, vì man() ở trên
    // đã dời rồi (đổi Ten trong man() gọi datBrandDungCho). Nếu tự dời thêm
    // lần nữa ở đây thì "truoc" đo được đã là vị trí MỚI — hết còn gì để bù.
    function bayBrandTuVe(brand, truoc) {
      var sau = brand.getBoundingClientRect();
      var dx = truoc.left - sau.left, dy = truoc.top - sau.top;
      if (!dx && !dy) return;
      brand.style.transition = 'none';
      brand.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      void brand.offsetWidth; // ép reflow rồi mới cho chạy transition, không thì nhảy cụt
      brand.style.transition = 'transform ' + THOI_GIAN_BAY_BRAND + 'ms cubic-bezier(.22,.9,.3,1)';
      brand.style.transform = '';
      setTimeout(function () {
        brand.style.transition = '';
        brand.style.transform = '';
      }, THOI_GIAN_BAY_BRAND + 20);
    }

    function chuyenManTruot(dich) {
      if (GIAM_CHUYEN_DONG) { location.hash = dich; return; }
      // scLogin/scInfo dùng .man-hien (visibility), KHÔNG dùng [hidden] nữa —
      // nên tìm màn đang hiện qua đúng class đó, không querySelector([hidden]).
      var manCu = $('#scLogin').classList.contains('man-hien') ? $('#scLogin') : $('#scInfo');
      var thanCu = manCu.querySelector('.card-body');
      if (!thanCu) { location.hash = dich; return; }
      thanCu.classList.add('co-lai');
      setTimeout(function () {
        var brand = $('#btnBrand');
        var truoc = brand.getBoundingClientRect(); // ĐO TRƯỚC khi man() dời nó
        location.hash = dich;
        man(dich === '#/info' ? 'info' : 'login'); // đổi màn + dời brand NGAY (đồng bộ)
        bayBrandTuVe(brand, truoc);
        var manMoi = dich === '#/info' ? $('#scInfo') : $('#scLogin');
        var thanMoi = manMoi.querySelector('.card-body');
        if (!thanMoi) return;
        thanMoi.classList.add('co-lai');
        void thanMoi.offsetWidth; // ép reflow để hoạt ảnh nở ra chạy lại từ đầu
        requestAnimationFrame(function () { thanMoi.classList.remove('co-lai'); });
      }, THOI_GIAN_TRUOT);
    }

    (function () {
      var brand = $('#btnBrand');
      function di() { chuyenManTruot(location.hash === '#/info' ? '' : '#/info'); }
      brand.onclick = di;
      brand.onkeydown = function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); di(); }
      };
    })();

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
