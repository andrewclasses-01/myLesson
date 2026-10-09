/* ============================================================
   gioi-thieu/main.js — PHIM GIỚI THIỆU KHÓA MỚI (NỀN TẢNG K10+) · v1 (09/10/2026, thầy chốt mockup v4)
   Chạy TRONG IFRAME do js/gioi-thieu.js (khoa.html) mở — tách hẳn CSS/JS khỏi trang khóa học.
   - 12 màn, mỗi màn một nút Tiếp tục; vuốt ngang / phím → cũng chuyển.
   - Lần đầu BẮT BUỘC xem tới màn cuối, bấm "Vâng!" mới tính xong (không có nút Để sau / Đóng).
     Khi XEM LẠI (bấm thẻ GIỚI THIỆU) mới có nút "Đóng".
   - Âm thanh nhỏ, không có nút tắt (WebAudio tự tổng hợp, không file).
   - Nói chuyện với trang mẹ bằng postMessage (cùng nguồn gốc):
       con → mẹ: {gtSan:1} sẵn sàng · {gtMan:i} đang ở màn i · {gtXong:1} bấm Vâng! · {gtDong:1} bấm Đóng
       mẹ → con: {gtBatDau:{ten, anh, man, lai}}
   - Mở thẳng file này (không trong iframe) để thử: ?ten=Gia%20Bảo&man=8&lai=1
   ============================================================ */
function chayPhim(CFG) {
  'use strict';
  var $ = function (s, g) { return (g || document).querySelector(s); };
  var $$ = function (s, g) { return Array.prototype.slice.call((g || document).querySelectorAll(s)); };

  // ---------- học sinh ----------
  var TEN = String(CFG.ten || 'em').trim() || 'em';
  var ANH = CFG.anh || '';
  var TEN_HOA = TEN.toLocaleUpperCase('vi');
  var CHU_DAU = TEN.split(/ +/).slice(-2).map(function (w) { return w[0] || ''; }).join('').toLocaleUpperCase('vi');
  var KHOA = String(CFG.khoa || 'NỀN TẢNG K10').toLocaleUpperCase('vi');
  var KSO = (KHOA.match(/K *[0-9]+$/) || ['K10'])[0].replace(/ /g, '');
  var KDAU = KHOA.slice(0, KHOA.length - (KHOA.match(/K *[0-9]+$/) || [''])[0].length).trim() || KHOA;
  $$('.ten-khoa').forEach(function (el) { el.textContent = KHOA; });
  $$('.ten-khoa-du').forEach(function (el) { el.textContent = 'Khóa ' + KHOA; });
  $$('.ten-khoa-dau').forEach(function (el) { el.textContent = 'Khóa ' + KDAU; });
  $$('.k-so').forEach(function (el) { el.textContent = KSO; });
  function chuDauEl() { var d = document.createElement('div'); d.className = 'anh-chu'; d.textContent = CHU_DAU; return d; }

  $$('.ten-hs').forEach(function (el) { el.textContent = TEN; });
  $$('.ten-hs-hoa').forEach(function (el) { el.textContent = TEN_HOA; });
  $$('img.anh-em').forEach(function (img) {
    if (!ANH) { img.replaceWith(chuDauEl()); return; }
    img.onerror = function () { img.replaceWith(chuDauEl()); };   // em chưa có ảnh ⇒ chữ cái đầu
    img.src = ANH; img.style.objectPosition = '50% 25%';
  });
  function avEm() {
    return ANH ? '<img src="' + ANH + '" style="object-position:50% 25%" alt="" onerror="this.remove()">' + CHU_DAU : CHU_DAU;
  }

  // ---------- hẹn giờ theo màn (đổi màn là huỷ hết) ----------
  var HEN = [];
  function hen(fn, ms) { var id = setTimeout(fn, ms); HEN.push(['t', id]); return id; }
  function lap(fn, ms) { var id = setInterval(fn, ms); HEN.push(['i', id]); return id; }
  function huyHen() { HEN.forEach(function (h) { (h[0] === 't' ? clearTimeout : clearInterval)(h[1]); }); HEN = []; }

  // ---------- âm thanh nhỏ ----------
  var AC = null, NHIEU = null;
  function moAm() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
    if (AC.state === 'suspended') AC.resume();
    if (!NHIEU) {
      NHIEU = AC.createBuffer(1, AC.sampleRate * 0.6, AC.sampleRate);
      var d = NHIEU.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
  }
  function not(f, tre, dai, to, kieu) {
    if (!AC) return;
    var t = AC.currentTime + (tre || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = kieu || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(to, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dai);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dai + 0.05);
  }
  function xi(tre, dai, to, f1, f2) {
    if (!AC || !NHIEU) return;
    var t = AC.currentTime + (tre || 0), s = AC.createBufferSource(), b = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = NHIEU; b.type = 'bandpass'; b.Q.value = 1.2;
    b.frequency.setValueAtTime(f1, t); b.frequency.exponentialRampToValueAtTime(f2, t + dai);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(to, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dai);
    s.connect(b); b.connect(g); g.connect(AC.destination); s.start(t); s.stop(t + dai + 0.05);
  }
  var am = {
    ting: function () { not(1318.5, 0, 0.7, 0.045); not(1975.5, 0.05, 0.55, 0.025); },
    blip: function () { not(880, 0, 0.12, 0.03, 'triangle'); not(1320, 0.04, 0.14, 0.02, 'triangle'); },
    go: function () { not(1500 + Math.random() * 300, 0, 0.04, 0.012, 'square'); },
    dung: function () { not(784, 0, 0.3, 0.035); not(988, 0.08, 0.3, 0.035); not(1175, 0.16, 0.5, 0.035); },
    chuong: function () { not(1046.5, 0, 0.9, 0.03); not(1568, 0, 0.7, 0.018); not(2093, 0.01, 0.4, 0.01); },
    phao: function () { xi(0, 0.25, 0.06, 2200, 600); not(523, 0.02, 0.4, 0.025); not(659, 0.1, 0.45, 0.025); not(784, 0.18, 0.6, 0.025); },
    lat: function () { xi(0, 0.35, 0.05, 600, 3200); },
    sao: function () { not(1760 + Math.random() * 500, 0, 0.15, 0.015); }
  };

  // ---------- pháo giấy ----------
  var cv = $('#phao'), cx = cv.getContext('2d'), HAT = [], chayPhao = false;
  function coCv() { var r = window.devicePixelRatio || 1; cv.width = innerWidth * r; cv.height = innerHeight * r; cx.setTransform(r, 0, 0, r, 0, 0); }
  coCv();
  var MAU_PHAO = ['#f3d38a', '#d9a94a', '#22C3A4', '#7fe0cb', '#ffffff', '#f47aa0', '#3E7BFA'];
  function phao(x, y, n, manh) {
    for (var i = 0; i < n; i++) {
      var g = Math.random() * Math.PI * 2, v = (manh || 9) * (0.4 + Math.random() * 0.8);
      HAT.push({ x: x, y: y, vx: Math.cos(g) * v, vy: Math.sin(g) * v - 6, w: 6 + Math.random() * 6, h: 3 + Math.random() * 5,
        q: Math.random() * 6, vq: (Math.random() - 0.5) * 0.4, m: MAU_PHAO[i % MAU_PHAO.length], s: 1 });
    }
    if (!chayPhao) { chayPhao = true; requestAnimationFrame(vePhao); }
  }
  function vePhao() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    HAT = HAT.filter(function (p) { return p.y < innerHeight + 30 && p.s > 0.02; });
    HAT.forEach(function (p) {
      p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.32; p.x += p.vx; p.y += p.vy; p.q += p.vq; if (p.vy > 0) p.s *= 0.992;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.q); cx.scale(1, Math.cos(p.q * 2)); cx.globalAlpha = p.s;
      cx.fillStyle = p.m; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
    });
    if (HAT.length) requestAnimationFrame(vePhao); else { chayPhao = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  // ---------- bụi sao nền ----------
  (function () {
    var h = $('.hat'), s = '';
    for (var i = 0; i < 46; i++) s += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) +
      '%;--t:' + (3 + Math.random() * 5).toFixed(1) + 's;--tre:' + (Math.random() * 5).toFixed(1) + 's;--o:' + (0.3 + Math.random() * 0.6).toFixed(2) + '"></i>';
    h.innerHTML = s;
  })();

  // ======================================================================
  //  CÁC MÀN
  // ======================================================================
  var MAN = $$('.man'), N = MAN.length, CHAY = {};
  function MT(ten) { return $('.man[data-ten="' + ten + '"]'); }

  // 1 · CHÀO MỪNG
  CHAY['Chào mừng'] = function () {
    hen(function () { var r = $('.vong-anh', MT('Chào mừng')).getBoundingClientRect(); phao(r.left + r.width / 2, r.top + r.height / 2, 90, 11); am.phao(); }, 900);
  };

  // 2 · THƯ CỦA THẦY (chữ hiện dần như đang viết)
  CHAY['Thư của Thầy'] = function () {
    var el = $('#thuChu');
    var chu = 'Chào ' + TEN + ',\nThầy rất vui khi em chọn học cùng thầy. Trong 8 tháng tới, từng bài giảng, từng trang sách, từng trò chơi đều được thầy chuẩn bị riêng cho em.\nChỉ cần em chăm chỉ mỗi ngày, phần còn lại thầy lo!';
    var i = 0; el.innerHTML = '<span class="con-tro"></span>';
    hen(function () {
      lap(function () {
        i += 1;
        if (i % 3 === 0) am.go();
        el.innerHTML = chu.slice(0, i).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '<span class="con-tro"></span>';
        if (i >= chu.length) { huyLap(); el.innerHTML = el.innerHTML.replace('<span class="con-tro"></span>', '') + '<span class="ky">— Thầy Andrew</span>'; am.ting(); }
      }, 24);
    }, 900);
    function huyLap() { HEN.filter(function (h) { return h[0] === 'i'; }).forEach(function (h) { clearInterval(h[1]); }); }
  };

  // 3 · THANH TAB
  var P = function (d) { return '<svg viewBox="0 0 24 24">' + d + '</svg>'; };
  var IC = {   // chép y js/nw-thanh.js
    baiTap: P('<path d="M8.5 21H5.2A1.7 1.7 0 0 1 3.5 19.3V4.2A1.7 1.7 0 0 1 5.2 2.5h8.3l5 5v3.3"/><path d="M13.5 2.5v4.2a1 1 0 0 0 1 1h4"/><path d="M6.8 9.6h4M6.8 12.6h7M6.8 15.6h5.2"/><path d="M11.3 21.5l.9-3.5 6.5-6.5a1.85 1.85 0 0 1 2.6 2.6l-6.5 6.5z"/><path d="M17.4 12.8l2.6 2.6"/>'),
    tinNhan: P('<path d="M8.2 3h7.6c3.8 0 5.4 1.6 5.4 5.4v3.4c0 3.8-1.6 5.4-5.4 5.4h-2.1l-4.9 3.4c-.7.5-1.6-.1-1.4-.9l.2-.9c.2-.8-.3-1.6-1.1-1.6h-.3c-2.8 0-3.4-1.6-3.4-5.4V8.4C2.8 4.6 4.4 3 8.2 3z"/><path d="M7.7 8.1h4.9M7.7 12.1h8.6"/>'),
    chuong: P('<path d="M6.2 8.5a5.8 5.8 0 0 1 11.6 0c0 6.5 2.7 8.3 2.7 8.3H3.5s2.7-1.8 2.7-8.3"/><path d="M10.4 20.5a1.8 1.8 0 0 0 3.2 0"/>'),
    bangTin: P('<path d="M10.55 2.75Q12 1.6 13.45 2.75L20.6 8.45Q21.5 9.15 21.5 10.3V19.3Q21.5 21.5 19.3 21.5H4.7Q2.5 21.5 2.5 19.3V10.3Q2.5 9.15 3.4 8.45Z"/><path d="M9.4 21v-6.5Q9.4 13 10.9 13H13.1Q14.6 13 14.6 14.5V21"/>'),
    khamPha: P('<circle cx="12" cy="12" r="9.5"/><path d="m15.8 8.2-2.2 5.4-5.4 2.2 2.2-5.4z"/>'),
    shop: P('<rect x="3.5" y="7.6" width="17" height="4.4" rx="1.2"/><path d="M5 12v7.4a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V12"/><path d="M12 7.6v13.3"/><path d="M12 7.6C10.8 4.7 8.7 2.9 7 3.4c-1.6.5-1.2 3.1 1 3.8 1.2.4 2.6.4 4 .4zM12 7.6c1.2-2.9 3.3-4.7 5-4.2 1.6.5 1.2 3.1-1 3.8-1.2.4-2.6.4-4 .4z"/>'),
    timKiem: P('<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.6-4.6"/>'),
    menu3: P('<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>')
  };
  var TAB = [
    ['baiTap', 'Bài tập', 'Bài mới, hạn nộp, điểm của em và cả lớp'],
    ['tinNhan', 'Tin nhắn', 'Chat nhóm cả khóa, nhắn riêng với thầy'],
    ['chuong', 'Thông báo', 'Bài mới, sắp hết hạn, thầy vừa trả lời'],
    ['bangTin', 'Bảng tin', 'Khoe thành tích, kể chuyện lớp mình', 1],
    ['khamPha', 'Khám phá', 'Game và thi đấu tiếng Anh trực tuyến', 1],
    ['shop', 'Đổi quà', 'Dùng sao đổi những món quà em thích', 1],
    ['timKiem', 'Tìm kiếm', 'Tìm bạn, tìm bài chỉ trong một chạm', 1]
  ];
  (function () {
    $('#thanhMau').innerHTML = '<span class="av-nho">' + (ANH ? '<img src="' + ANH + '" style="object-position:50% 25%" alt="" onerror="this.remove()">' : '') + '</span>' +
      TAB.map(function (t) { return '<span class="o" data-ma="' + t[0] + '">' + IC[t[0]] + '</span>'; }).join('') +
      '<span class="o">' + IC.menu3 + '</span>';
    $('#dsTab').innerHTML = TAB.map(function (t) {
      return '<li data-ma="' + t[0] + '"><span class="ic">' + IC[t[0]] + '</span><div><b>' + t[1] + '</b><small>' + t[2] + '</small></div>' +
        (t[3] ? '<span class="sap">SẮP MỞ CHO EM</span>' : '') + '</li>';
    }).join('');
  })();
  CHAY['Trang học của em'] = function () {
    var li = $$('#dsTab li'), o = $$('#thanhMau .o[data-ma]');
    li.forEach(function (x) { x.classList.remove('hien', 'sang'); }); o.forEach(function (x) { x.classList.remove('sang'); });
    function sang(k) { li.forEach(function (x, j) { x.classList.toggle('sang', j === k); }); o.forEach(function (x, j) { x.classList.toggle('sang', j === k); }); }
    li.forEach(function (x, k) { hen(function () { x.classList.add('hien'); sang(k); am.blip(); }, 900 + k * 520); });
    var k = 0;
    hen(function () { lap(function () { k = (k + 1) % li.length; sang(k); }, 1300); }, 900 + li.length * 520 + 600);
  };

  // 4 · THẺ BÀI TẬP — đổi trạng thái ngay trước mắt
  var HANG = [['BT1', 'm-duong'], ['BT2', 'm-duong'], ['TNBG', 'm-duong']];
  (function () {
    $('#diemRows').innerHTML = HANG.map(function (h) {
      return '<div class="td-dong"><span class="td-ten">' + h[0] + '</span><span class="td-bar"><i></i></span><span class="td-so">0%</span><span class="td-tich">✓</span></div>';
    }).join('');
  })();
  CHAY['Tab Bài tập'] = function () {
    var the = $('#theMau'), tin = $('.the-in', the), han = $('.t-han', the), dh = $('#dhho'), cham = $('#chamTT'), chu = $('#chuTT');
    var dong = $$('.td-dong', the), cx = $('.chon-xem', the), thumb = $('.chon-thumb', cx), nut = $$('span[data-xem]', cx);
    function chonXem(k) {
      nut.forEach(function (n, j) { n.classList.toggle('on', j === k); });
      thumb.style.width = nut[k].offsetWidth + 'px'; thumb.style.transform = 'translateX(' + (nut[k].offsetLeft - 2) + 'px)';
    }
    function diem(ds, mau) {
      dong.forEach(function (d, j) {
        var i = $('.td-bar > i', d); i.style.width = ds[j] + '%'; i.className = mau[j];
        $('.td-so', d).textContent = ds[j] + '%'; $('.td-tich', d).classList.toggle('on', ds[j] === 100);
      });
    }
    function avTop(on) {
      $$('.av-thanh', the).forEach(function (a) { a.remove(); });
      if (!on) return;
      var MAU_AV = ['#e0575b', '#3E7BFA', '#7C5CE6'], CHU_AV = ['GB', 'KL', 'ĐH'], VT = [[96, 88, 82], [92, 70, 64], [80, 58, 51]];
      dong.forEach(function (d, j) {
        var bar = $('.td-bar', d);
        VT[j].forEach(function (x, k) {
          var a = document.createElement('span'); a.className = 'av-thanh'; a.style.left = x + '%'; a.style.background = MAU_AV[k]; a.textContent = CHU_AV[k];
          bar.appendChild(a); hen(function () { a.classList.add('on'); }, 80 + k * 120);
        });
      });
    }
    var TT = [
      { the: 'gio-duong', tin: 'tt-duong', han: '', dh: ['xanh', '2 ngày 05:12'], c: ['#3E7BFA', 'Xanh dương — còn thoải mái thời gian'], d: [30, 0, 0], m: ['m-cam', 'm-do', 'm-do'] },
      { the: 'gio-vang', tin: 'tt-vang', han: '', dh: ['cam', '18:40:12'], c: ['#E0B411', 'Vàng — còn dưới 24 giờ'], d: [80, 45, 0], m: ['m-vang', 'm-cam', 'm-do'] },
      { the: 'gap', tin: 'tt-do', han: 'gap-gio', dh: ['do', '03:15:09'], c: ['#E0575B', 'Đỏ nhấp nháy — gấp lắm rồi!'], d: [100, 85, 60], m: ['m-la', 'm-vang', 'm-vang'] },
      { the: 'xong-het', tin: 'tt-la', han: 'da-xong', dh: ['xong', 'ĐÃ XONG ✓'], c: ['#18A957', 'Xanh lá — em đã hoàn thành 100%'], d: [100, 100, 100], m: ['m-la', 'm-la', 'm-la'] }
    ];
    var giay = 0, nhip = null;
    function datTT(k) {
      var t = TT[k];
      the.className = 'the moi ' + t.the; tin.className = 'the-in ' + t.tin; han.className = 't-han ' + t.han;
      dh.className = 'dhho ' + t.dh[0]; dh.textContent = t.dh[1]; giay = 0;
      cham.style.background = t.c[0]; cham.style.boxShadow = '0 0 12px ' + t.c[0]; chu.textContent = t.c[1];
      diem(t.d, t.m); if (k === 3) am.dung(); else am.blip();
    }
    function chay() {
      chonXem(0); avTop(false); datTT(0);
      hen(function () { datTT(1); }, 2000);
      hen(function () { datTT(2); }, 4000);
      hen(function () { datTT(3); }, 6000);
      hen(function () {
        chonXem(1); diem([86, 71, 64], ['m-la', 'm-vang', 'm-vang']); avTop(true); am.blip();
        chu.textContent = 'CẢ LỚP — xem bạn nào đang dẫn đầu'; cham.style.background = '#0E7C6E'; cham.style.boxShadow = '0 0 12px #22C3A4';
      }, 8200);
      hen(chay, 11500);
    }
    hen(chay, 700);
    // đồng hồ đếm lùi chạy thật (cho sinh động)
    lap(function () {
      if (/xong/.test(dh.className)) return;
      giay++; var t = dh.textContent;
      var m = t.match(/(\d+):(\d+)(?::(\d+))?$/); if (!m) return;
      if (m[3] !== undefined) { var s = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) - 1; dh.textContent = t.replace(m[0], p2(Math.floor(s / 3600)) + ':' + p2(Math.floor(s % 3600 / 60)) + ':' + p2(s % 60)); }
    }, 1000);
  };
  function p2(n) { return (n < 10 ? '0' : '') + n; }

  // 5,6 · CHAT
  var AV_THAY = '<img src="assets/thay-tron.jpg" alt="">';
  function tinNhan(khung, m) {
    var d = document.createElement('div'); d.className = 'tn' + (m.toi ? ' toi' : '');
    d.innerHTML = (m.toi ? '' : '<span class="av" style="background:' + (m.mau || '#0E7C6E') + '">' + (m.av || '') + '</span>') +
      '<div class="bong">' + (m.ai ? '<span class="ai">' + m.ai + '</span>' : '') + m.chu + '</div>';
    khung.appendChild(d); am.blip();
    if (m.tha) hen(function () { var t = document.createElement('span'); t.className = 'tha'; t.textContent = '❤ ' + m.tha; $('.bong', d).appendChild(t); am.sao(); }, 900);
    return d;
  }
  function dangGo(khung, m) {
    var d = document.createElement('div'); d.className = 'tn';
    d.innerHTML = '<span class="av" style="background:' + (m.mau || '#0E7C6E') + '">' + (m.av || '') + '</span><div class="bong go"><i></i><i></i><i></i></div>';
    khung.appendChild(d); return d;
  }
  function kichBan(khung, ds, batDau) {
    khung.innerHTML = ''; var t = batDau || 600;
    ds.forEach(function (m) {
      if (!m.toi) { (function (t0) { hen(function () { m._go = dangGo(khung, m); }, t0); })(t); t += 1000; }
      (function (t1) { hen(function () { if (m._go) m._go.remove(); tinNhan(khung, m); }, t1); })(t);
      t += m.cho || 1100;
    });
    return t;
  }
  CHAY['Chat nhóm khóa'] = function () {
    var em = { toi: 1 };
    var ds = [
      { av: AV_THAY, ai: 'Thầy Andrew', chu: 'Chào cả khóa ' + KSO + '! 👋 Thầy đã giao <b>LESSON 1</b> rồi nhé.', tha: 12 },
      { av: 'GB', mau: '#3E7BFA', ai: 'Gia Bảo', chu: 'Em xong BT1 rồi ạ, 100% luôn 💪', tha: 4 },
      { av: 'KL', mau: '#7C5CE6', ai: 'Khánh Linh', chu: 'Câu 12 BT2 khó quá cả nhà ơi 😵' },
      Object.assign({ chu: 'Mình cũng sai câu đó 😅' }, em),
      { av: AV_THAY, ai: 'Thầy Andrew', chu: 'Câu 12: chủ ngữ số nhiều thì động từ <b>không thêm s</b> nha cả lớp!', tha: 9 }
    ];
    var het = kichBan($('#chatNhom'), ds, 800);
    hen(function () { CHAY['Chat nhóm khóa'](); }, het + 3500);
  };
  // v2 (thầy 09/10): có LỊCH SỬ hỏi đáp + một cuộc gọi video đã kết thúc ở trên cho giống thật
  var LICH_SU = [
    '<span class="ngay-vach">THỨ HAI</span>',
    ['toi', 'Thầy ơi, BT2 câu 7 sao lại dùng “an” ạ?'],
    ['thay', 'Trước âm <b>a, e, i, o, u</b> thì dùng <b>an</b> em nhé: <b>an</b> apple, <b>an</b> egg.'],
    ['toi', 'Dạ em làm lại được 100% rồi ạ! 🥰'],
    '<span class="ngay-vach">HÔM QUA</span>',
    '<div class="goi"><span class="goi-ic"><svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.5l6-3.5v10l-6-3.5"/></svg></span><div><b>Cuộc gọi video đã kết thúc</b><small>6 phút 12 giây · 20:41</small></div></div>',
    ['thay', 'Em nắm chắc rồi đó, cố lên nhé! 💪'],
    '<span class="ngay-vach">HÔM NAY</span>'
  ];
  CHAY['Tin nhắn riêng'] = function () {
    var khung = $('#chatRieng');
    var ds = [
      { toi: 1, chu: 'Thầy ơi, câu này sai ở đâu mà em làm lại vẫn chưa được?', cho: 800 },
      { toi: 1, chu: '“He is a good people.”', cho: 1000 },
      { av: AV_THAY, chu: 'Em chuẩn bị máy, 5 phút nữa thầy gọi nhé!', cho: 1300 },
      { toi: 1, chu: 'Yes sir! 🫡', tha: 1 }
    ];
    var het = kichBan(khung, ds, 1000);
    khung.innerHTML = LICH_SU.map(function (x) {
      if (typeof x === 'string') return x;
      return x[0] === 'toi' ? '<div class="tn toi cu"><div class="bong">' + x[1] + '</div></div>'
        : '<div class="tn cu"><span class="av">' + AV_THAY + '</span><div class="bong">' + x[1] + '</div></div>';
    }).join('');
    hen(function () { CHAY['Tin nhắn riêng'](); }, het + 3500);
  };

  // 7 · THÔNG BÁO
  var ICS = {
    sach: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
    gio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tich: '<path d="M4.5 12.5l4.5 4.5 10.5-11"/>',
    tin: '<path d="M8.2 3h7.6c3.8 0 5.4 1.6 5.4 5.4v3.4c0 3.8-1.6 5.4-5.4 5.4h-2.1l-4.9 3.4c-.7.5-1.6-.1-1.4-.9l.2-.9c.2-.8-.3-1.6-1.1-1.6h-.3c-2.8 0-3.4-1.6-3.4-5.4V8.4C2.8 4.6 4.4 3 8.2 3z"/>'
  };
  CHAY['Thông báo'] = function () {
    var ds = $('#dsTb'), so = $('.so-do', MT('Thông báo')); ds.innerHTML = ''; so.classList.remove('on');
    var TB = [
      ['#0E7C6E', 'sach', 'Thầy vừa giao LESSON 2', 'Hạn nộp: 3 ngày nữa', 'vừa xong'],
      ['#F0821E', 'gio', 'LESSON 1 sắp hết hạn', 'Còn 6 giờ, vào làm nốt nhé!', '2 giờ'],
      ['#18A957', 'tich', 'Em đạt 100% BT2!', 'Đúng 30/30 câu · 4 phút 12 giây', 'hôm qua'],
      ['#3E7BFA', 'tin', 'Thầy đã trả lời tin nhắn', '“5 phút nữa thầy gọi nhé!”', 'vừa xong']
    ];
    TB.forEach(function (t, k) {
      hen(function () {
        var d = document.createElement('div'); d.className = 'tb';
        d.innerHTML = '<span class="ic" style="background:' + t[0] + '"><svg viewBox="0 0 24 24">' + ICS[t[1]] + '</svg></span><div><b>' + t[2] + '</b><small>' + t[3] + '</small></div><span class="gio">' + t[4] + '</span>';
        ds.insertBefore(d, ds.firstChild); so.textContent = k + 1; so.classList.add('on'); am.chuong();
      }, 1000 + k * 850);
    });
  };

  // 8 · GAME
  // v2 (thầy 09/10): game phổ biến, hay dùng xếp trước
  var GAME = [
    ['QUIZ', gQuiz], ['ANAGRAM', gAnagram], ['UNJUMBLE', gUnjumble], ['WHACK-A-MOLE', gWhack],
    ['TYPE THE ANSWER', gTypeAnswer], ['OPEN THE BOX', gOpenBox], ['SPEED SORTING', gSorting]
  ];
  var CHIP = ['Quiz', 'Anagram', 'Unjumble', 'Whack-a-mole', 'Type the answer', 'Open the box', 'Speed sorting', 'Find the match', 'True or false', 'Crossword', 'Train rush', 'Rocket race', 'Star loot', 'Find the gap', 'Gameshow quiz'];
  $('#gameChip').innerHTML = CHIP.map(function (c) { return '<span>' + c + '</span>'; }).join('');
  $('#gameCham').innerHTML = GAME.map(function () { return '<i></i>'; }).join('');
  CHAY['Game'] = function () {
    var san = $('#gameSan'), k = -1;
    function tiep() {
      k = (k + 1) % GAME.length;
      var cu = $('.gs', san); if (cu) { cu.classList.add('ra'); setTimeout(function () { cu.remove(); }, 340); }
      $('#gameTen').textContent = GAME[k][0]; $('#gameSo').textContent = (k + 1) + '/' + GAME.length;
      $$('#gameCham i').forEach(function (i, j) { i.classList.toggle('on', j === k); });
      $$('#gameChip span').forEach(function (s, j) { s.classList.toggle('on', j === k); });
      var gs = document.createElement('div'); gs.className = 'gs'; san.appendChild(gs);
      GAME[k][1](gs);
      hen(tiep, 4600);
    }
    san.innerHTML = ''; hen(tiep, 500);
  };
  function khen(gs, chu) { var k = document.createElement('div'); k.className = 'g-khen'; k.textContent = chu; gs.appendChild(k); return k; }
  function gWhack(gs) {
    gs.innerHTML = '<div class="g-de">Đập con chuột mang <b>ĐỘNG TỪ</b>!</div><div class="g-dap-chuot">' +
      [0, 1, 2, 3, 4, 5].map(function () { return '<div class="lo"><div class="chuot"><span></span></div></div>'; }).join('') +
      '</div><div class="g-diem">ĐIỂM: <span>0</span></div>';
    var chuot = $$('.chuot', gs), diem = $('.g-diem span', gs), d = 0;
    // [ô, từ, là động từ?]
    var LUOT = [[1, 'run', 1], [3, 'cat', 0], [5, 'swim', 1], [0, 'happy', 0], [4, 'jump', 1], [2, 'read', 1]];
    LUOT.forEach(function (l, k) {
      hen(function () {
        var c = chuot[l[0]]; $('span', c).textContent = l[1]; c.className = 'chuot len'; am.blip();
        if (l[2]) hen(function () { c.className = 'chuot trung'; d++; diem.textContent = d; am.ting(); }, 420);
        hen(function () { c.className = 'chuot'; }, l[2] ? 820 : 700);
      }, 350 + k * 600);
    });
  }
  function gTypeAnswer(gs) {
    gs.innerHTML = '<div class="g-de">Dịch sang tiếng Anh</div><div class="g-cau">Tôi là học sinh.</div><div class="g-o"><span></span><i class="con-tro"></i></div>';
    var k = khen(gs, 'CHÍNH XÁC!  +1'), o = $('.g-o', gs), s = $('span', o), chu = 'I am a student.', i = 0;
    hen(function () {
      var id = lap(function () {
        i++; s.textContent = chu.slice(0, i); am.go();
        if (i >= chu.length) { clearInterval(id); o.classList.add('dung'); $('.con-tro', o).remove(); k.classList.add('on'); am.dung(); }
      }, 85);
    }, 600);
  }
  function gOpenBox(gs) {
    var TU = [['cat', 'con mèo'], ['red', 'màu đỏ'], ['apple', 'quả táo'], ['run', 'chạy'], ['book', 'quyển sách'], ['happy', 'vui vẻ'], ['blue', 'màu xanh'], ['dog', 'con chó']];
    gs.innerHTML = '<div class="g-de">Chọn một hộp — đọc to từ bên trong!</div><div class="g-hop">' + TU.map(function (t, i) {
      return '<div class="hop"><div class="mat-truoc">' + (i + 1) + '</div><div class="mat-sau">' + t[0] + '<small>' + t[1] + '</small></div></div>';
    }).join('') + '</div>';
    var hop = $$('.hop', gs);
    hen(function () { hop[2].classList.add('lat'); am.lat(); }, 800);
    hen(function () { hop[5].classList.add('lat'); am.lat(); }, 1900);
    hen(function () { hop[7].classList.add('lat'); am.lat(); }, 3000);
  }
  function gQuiz(gs) {
    gs.innerHTML = '<div class="g-de">Chọn đáp án đúng</div><div class="g-cau">She ___ swim well.</div><div class="g-dap"><span><b>A</b>can</span><span><b>B</b>cans</span><span><b>C</b>is can</span><span><b>D</b>to can</span></div>';
    var k = khen(gs, 'ĐÚNG RỒI!'), dap = $$('.g-dap span', gs);
    hen(function () { dap.forEach(function (d, j) { d.classList.toggle(j === 0 ? 'chon' : 'mo', true); }); k.classList.add('on'); am.dung(); }, 1700);
  }
  function gAnagram(gs) {
    gs.innerHTML = '<div class="g-de">Xếp lại chữ cái thành từ: <b>quả táo</b></div><div class="g-chu"></div>';
    var bo = $('.g-chu', gs), XAO = ['P', 'L', 'E', 'A', 'P'], DICH = [1, 3, 4, 0, 2];   // ô thứ i bay về vị trí DICH[i] ⇒ APPLE
    XAO.forEach(function (c, i) { var o = document.createElement('span'); o.className = 'o-chu'; o.textContent = c; o.style.left = (i * 53) + 'px'; bo.appendChild(o); });
    var k = khen(gs, 'APPLE  ✓'), o = $$('.o-chu', bo);
    o.forEach(function (x, i) {
      hen(function () { x.style.transform = 'translateY(-14px)'; x.style.left = (DICH[i] * 53) + 'px'; am.blip(); hen(function () { x.style.transform = ''; }, 280); }, 900 + i * 260);
    });
    hen(function () { bo.classList.add('xong'); k.classList.add('on'); am.dung(); }, 900 + 5 * 260 + 500);
  }
  function gUnjumble(gs) {
    gs.innerHTML = '<div class="g-de">Sắp xếp thành câu đúng</div><div class="g-tu"></div>';
    var bo = $('.g-tu', gs), XAO = ['football', 'can', 'I', 'play'], DUNG = ['I', 'can', 'play', 'football'];
    var o = XAO.map(function (w) { var s = document.createElement('span'); s.className = 'o-tu'; s.textContent = w; bo.appendChild(s); return s; });
    var moc = document.createElement('div'); moc.className = 'dau-moc'; moc.textContent = 'PERFECT!'; gs.appendChild(moc);
    function xep(thuTu, top) {
      var w = thuTu.map(function (t) { return o[XAO.indexOf(t)].offsetWidth; }), tong = w.reduce(function (a, b) { return a + b; }, 0) + 8 * (w.length - 1);
      var x = (bo.clientWidth - tong) / 2;
      thuTu.forEach(function (t, j) { var e = o[XAO.indexOf(t)]; e.style.left = x + 'px'; e.style.top = top + 'px'; x += w[j] + 8; });
    }
    xep(XAO, 0);
    hen(function () { xepDan(0); }, 800);
    function xepDan(j) {
      if (j >= DUNG.length) { bo.classList.add('xong'); moc.classList.add('on'); am.dung(); return; }
      // từ đã xếp xuống hàng dưới, từ còn lại ở hàng trên
      var duoi = DUNG.slice(0, j + 1), tren = XAO.filter(function (x) { return duoi.indexOf(x) < 0; });
      xep(duoi, 50); if (tren.length) xep(tren, 0);
      am.blip(); hen(function () { xepDan(j + 1); }, 480);
    }
  }
  function gSorting(gs) {
    gs.innerHTML = '<div class="g-de">Đếm được hay không đếm được?</div><div class="g-ro"><div class="ro trai"><span class="dem">0</span>ĐẾM ĐƯỢC</div><div class="ro phai"><span class="dem">0</span>KHÔNG ĐẾM ĐƯỢC</div></div>';
    var ro = $('.g-ro', gs), DS = [['apple', 0], ['water', 1], ['book', 0], ['rice', 1], ['chair', 0]], dem = [0, 0];
    DS.forEach(function (v, k) {
      hen(function () {
        var e = document.createElement('span'); e.className = 'vat'; e.textContent = v[0]; ro.appendChild(e);
        hen(function () { e.style.left = (v[1] ? 76 : 24) + '%'; e.style.top = '120px'; e.style.opacity = '0'; }, 380);
        hen(function () { dem[v[1]]++; $$('.dem', ro)[v[1]].textContent = dem[v[1]]; am.blip(); e.remove(); }, 1000);
      }, 400 + k * 720);
    });
  }

  // 9 · THI ĐẤU — tên em leo hạng
  CHAY['Thi đấu online'] = function () {
    var ds = $('#duaDs'); ds.innerHTML = '';
    var NG = [
      { ten: 'Gia Bảo', lop: KHOA, d: 27, mau: '#3E7BFA' },
      { ten: 'Khánh Linh', lop: 'A2B', d: 26, mau: '#7C5CE6' },
      { ten: 'Đức Huy', lop: 'B1B', d: 24, mau: '#E0575B' },
      { ten: 'Bảo Ngọc', lop: 'A1C', d: 23, mau: '#F0821E' },
      { ten: 'Hà My', lop: KHOA, d: 21, mau: '#1DA45C' },
      { ten: TEN, lop: KHOA, d: 16, toi: 1 }
    ];
    NG.forEach(function (n) {
      var e = document.createElement('div'); e.className = 'dong-dua' + (n.toi ? ' toi' : '');
      e.innerHTML = '<span class="hang"></span><span class="av" style="background:' + (n.mau || '#0E7C6E') + '">' + (n.toi ? avEm() : n.ten.split(' ').map(function (w) { return w[0]; }).join('')) + '</span>' +
        '<span class="ten">' + n.ten + (n.toi ? ' (em)' : '') + '<small>' + n.lop + '</small></span><span class="diem"><b>' + n.d + '</b><small>/30</small></span><span class="len">▲ LÊN HẠNG</span>';
      ds.appendChild(e); n.el = e;
    });
    function xep() {
      var s = NG.slice().sort(function (a, b) { return b.d - a.d || (a.toi ? -1 : b.toi ? 1 : 0); });
      s.forEach(function (n, i) {
        var cu = n.hang; n.hang = i;
        n.el.style.transform = 'translateY(' + (i * 50 + 4) + 'px)';
        $('.hang', n.el).innerHTML = i < 3 ? '<span class="huy h' + (i + 1) + '">' + (i + 1) + '</span>' : (i + 1);
        $('.diem b', n.el).textContent = n.d;
        if (n.toi && cu !== undefined && i < cu) { var l = $('.len', n.el); l.classList.remove('on'); void l.offsetWidth; l.classList.add('on'); am.ting(); }
      });
    }
    xep();
    var em = NG[5], BUOC = [20, 22, 25, 27, 30];
    BUOC.forEach(function (d, k) {
      hen(function () {
        em.d = d; if (k === 1) NG[4].d = 22; if (k === 3) NG[1].d = 27; xep();
        if (d === 30) hen(function () { var r = em.el.getBoundingClientRect(); phao(r.left + r.width / 2, r.top + r.height / 2, 60, 8); am.phao(); }, 800);
      }, 1300 + k * 1150);
    });
    hen(function () { CHAY['Thi đấu online'](); }, 1300 + BUOC.length * 1150 + 3200);
  };

  // 10 · VÍ SAO + QUÀ
  var QUA = [
    ['Bộ bút màu', 5, '<svg viewBox="0 0 48 48"><rect x="10" y="10" width="7" height="26" rx="2" fill="#E0575B"/><path d="M10 36h7l-3.5 7z" fill="#f5d3b0"/><rect x="20.5" y="6" width="7" height="30" rx="2" fill="#3E7BFA"/><path d="M20.5 36h7L24 43z" fill="#f5d3b0"/><rect x="31" y="12" width="7" height="24" rx="2" fill="#E0B411"/><path d="M31 36h7l-3.5 7z" fill="#f5d3b0"/></svg>'],
    ['Sổ tay xinh', 8, '<svg viewBox="0 0 48 48"><rect x="11" y="6" width="27" height="36" rx="4" fill="#22C3A4"/><rect x="11" y="6" width="6" height="36" rx="2" fill="#0E7C6E"/><rect x="21" y="14" width="12" height="3" rx="1.5" fill="#fff" opacity=".85"/><rect x="21" y="20" width="9" height="3" rx="1.5" fill="#fff" opacity=".6"/><circle cx="32" cy="33" r="3" fill="#f3d38a"/></svg>'],
    ['Bình nước', 12, '<svg viewBox="0 0 48 48"><rect x="19" y="4" width="10" height="6" rx="2" fill="#16232A"/><rect x="15" y="10" width="18" height="33" rx="7" fill="#7fb8f5"/><rect x="15" y="22" width="18" height="10" fill="#3E7BFA"/><rect x="19" y="14" width="3" height="24" rx="1.5" fill="#fff" opacity=".5"/></svg>'],
    ['Gấu bông', 15, '<svg viewBox="0 0 48 48"><circle cx="13" cy="13" r="6" fill="#b9814a"/><circle cx="35" cy="13" r="6" fill="#b9814a"/><circle cx="24" cy="26" r="15" fill="#c98f55"/><ellipse cx="24" cy="31" rx="7" ry="5.5" fill="#f0d2ad"/><circle cx="18.5" cy="23" r="2" fill="#2b2418"/><circle cx="29.5" cy="23" r="2" fill="#2b2418"/><ellipse cx="24" cy="29" rx="2.4" ry="1.7" fill="#2b2418"/></svg>']
  ];
  CHAY['Kho sao & Đổi quà'] = function () {
    var so = $('#soSao'), sao = $('.vi-sao', MT('Kho sao & Đổi quà')), ke = $('#keQua'), dich = 96;
    so.textContent = '0'; ke.innerHTML = '';
    var hien = 0;
    function bay(k) {
      var r = sao.getBoundingClientRect(), s = document.createElement('i'); s.className = 'sao-bay';
      var x0 = innerWidth * (0.15 + Math.random() * 0.7), y0 = innerHeight * (0.75 + Math.random() * 0.2);
      s.style.left = x0 + 'px'; s.style.top = y0 + 'px'; document.body.appendChild(s);
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        s.style.transform = 'translate(' + (r.left + r.width / 2 - x0 - 9) + 'px,' + (r.top + r.height / 2 - y0 - 9) + 'px) scale(.6)'; s.style.opacity = '0';
      }); });
      setTimeout(function () {
        s.remove(); hien = Math.min(dich, hien + 4); so.textContent = hien.toLocaleString('vi-VN');
        sao.classList.add('nay'); setTimeout(function () { sao.classList.remove('nay'); }, 120); am.sao();
      }, 900);
    }
    for (var k = 0; k < 24; k++) (function (k) { hen(function () { bay(k); }, 900 + k * 90); })(k);
    QUA.forEach(function (q, k) {
      hen(function () {
        var d = document.createElement('div'); d.className = 'qua';
        d.innerHTML = q[2] + '<b>' + q[0] + '</b><span>★ ' + q[1].toLocaleString('vi-VN') + '</span>'; ke.appendChild(d); am.blip();
      }, 3400 + k * 260);
    });
  };

  // 12 · HÀNH TRÌNH
  var CHANG = [['Khởi hành', 'L1–L3 · mục tiêu, từ vựng'], ['Danh từ', 'L4–L8'], ['Chủ ngữ & sở hữu', 'L9–L10'], ['Động từ & thời gian', 'L11–L15'],
    ['Đặt câu hỏi', 'L16–L19'], ['Động từ đặc biệt', 'L20–L23 · can, be'], ['Gia vị cho câu', 'L24–L25'], ['Chinh phục các thì', 'L26–L30'], ['Về đích', 'L31–L32 · ôn tập']];
  (function () {
    var svg = $('#loTrinh'), XS = [70, 270], d = '', nut = '', chu = '';
    var pt = CHANG.map(function (c, i) { return [XS[i % 2], 52 + i * 64]; });
    pt.forEach(function (p, i) {
      if (!i) { d = 'M' + p[0] + ' ' + p[1]; return; }
      var q = pt[i - 1]; d += ' C' + q[0] + ' ' + (q[1] + 44) + ' ' + p[0] + ' ' + (p[1] - 44) + ' ' + p[0] + ' ' + p[1];
    });
    pt.forEach(function (p, i) {
      var cuoi = i === CHANG.length - 1;
      nut += '<g class="lt-nut" data-i="' + i + '"><circle class="vo" cx="' + p[0] + '" cy="' + p[1] + '" r="17"' + (cuoi ? ' style="fill:#d9a94a;stroke:#f3d38a"' : '') + '/>' +
        (cuoi ? '<path d="M' + (p[0] - 5) + ' ' + (p[1] + 8) + 'v-16l11 4.5-11 4.5" fill="none" stroke="#2a1d05" stroke-width="2.2" stroke-linejoin="round"/>'
              : '<text class="so" x="' + p[0] + '" y="' + p[1] + '">' + (i + 1) + '</text>') + '</g>';
      var trai = p[0] < 170, x = trai ? p[0] + 28 : p[0] - 28, a = trai ? 'start' : 'end';
      chu += '<g class="lt-chu" data-i="' + i + '"><text class="ten" x="' + x + '" y="' + (p[1] - 2) + '" text-anchor="' + a + '">' + CHANG[i][0] + '</text>' +
        '<text class="phu" x="' + x + '" y="' + (p[1] + 14) + '" text-anchor="' + a + '">' + CHANG[i][1] + '</text></g>';
    });
    var p0 = pt[0];
    svg.innerHTML = '<defs><linearGradient id="gDuong" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22C3A4"/><stop offset="1" stop-color="#f3d38a"/></linearGradient></defs>' +
      '<path class="lt-nen" d="' + d + '"/><path class="lt-duong" id="ltDuong" d="' + d + '"/>' + nut + chu +
      '<g class="lt-o-day"><circle class="song" cx="' + p0[0] + '" cy="' + p0[1] + '" r="17"/><g class="nhan"><rect x="' + (p0[0] - 38) + '" y="' + (p0[1] - 48) + '" width="76" height="20" rx="10"/>' +
      '<text x="' + p0[0] + '" y="' + (p0[1] - 38) + '">EM Ở ĐÂY</text></g></g>';
  })();
  CHAY['Hành trình 8 tháng'] = function () {
    var dg = $('#ltDuong'), L = dg.getTotalLength(), dai = 3400;
    dg.style.transition = 'none'; dg.style.strokeDasharray = L; dg.style.strokeDashoffset = L;
    $$('.lt-nut,.lt-chu,.lt-o-day', MT('Hành trình 8 tháng')).forEach(function (g) { g.classList.remove('on'); });
    void dg.getBoundingClientRect();
    hen(function () { dg.style.transition = 'stroke-dashoffset ' + dai + 'ms cubic-bezier(.45,.05,.4,1)'; dg.style.strokeDashoffset = 0; }, 700);
    CHANG.forEach(function (c, i) {
      hen(function () { $$('[data-i="' + i + '"]', MT('Hành trình 8 tháng')).forEach(function (g) { g.classList.add('on'); }); am.blip(); }, 700 + i * (dai / (CHANG.length - 1)) * 0.95);
    });
    hen(function () { $('.lt-o-day', MT('Hành trình 8 tháng')).classList.add('on'); am.ting(); }, 700 + dai + 300);
    var CAU = ['She plays.', 'She is playing.', 'She played.', 'She will play.'], k = 0, s = $('#cauChay'); s.textContent = CAU[0];
    lap(function () { s.classList.add('doi'); setTimeout(function () { k = (k + 1) % CAU.length; s.textContent = CAU[k]; s.classList.remove('doi'); }, 300); }, 1600);
  };

  // 13 · SẴN SÀNG
  CHAY['Sẵn sàng'] = function () {
    hen(function () { phao(innerWidth * 0.2, innerHeight * 0.35, 50, 10); phao(innerWidth * 0.8, innerHeight * 0.35, 50, 10); am.phao(); }, 900);
  };

  // ======================================================================
  //  ĐIỀU KHIỂN
  // ======================================================================
  var vach = $('#vachTien'), nutTiep = $('#nutTiep'), nutLui = $('#nutLui'), dang = -1, daXong = false;
  vach.innerHTML = MAN.map(function () { return '<i><b></b></i>'; }).join('');
  function gui(o) { if (window.parent !== window) window.parent.postMessage(o, location.origin); }

  function vua(sec) {   // co khung lại nếu màn thấp không đủ chỗ
    var k = $('.khung', sec); if (!k) return;
    k.style.transform = '';
    var cs = getComputedStyle(sec), cho = sec.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var s = Math.min(1, cho / k.offsetHeight);
    if (s < 1) k.style.transform = 'scale(' + s.toFixed(3) + ')';
  }

  function den(i, lui) {
    if (daXong || i < 0 || i >= N || i === dang) return;
    huyHen();
    MAN.forEach(function (m, j) {
      m.classList.toggle('lui', !!lui);
      if (j === dang) { m.classList.remove('on'); m.classList.add('ra'); }
      else if (j !== i) m.classList.remove('on', 'ra');
    });
    var sec = MAN[i]; sec.classList.remove('ra', 'on'); vua(sec); void sec.offsetWidth; sec.classList.add('on');
    dang = i;
    $$('i', vach).forEach(function (v, j) { v.className = j < i ? 'v-qua' : (j === i ? 'v-dang' : ''); });
    nutLui.classList.toggle('an', i === 0);
    var cuoi = i === N - 1;
    nutTiep.classList.toggle('cuoi', cuoi);
    $('span', nutTiep).textContent = cuoi ? 'Vâng!' : 'Tiếp tục';
    nutTiep.classList.remove('san'); hen(function () { nutTiep.classList.add('san'); }, 1100);
    gui({ gtMan: i });
    if (CHAY[sec.dataset.ten]) CHAY[sec.dataset.ten](sec);
  }
  function tiep() {
    if (daXong) return;
    moAm();
    if (dang === N - 1) { ketThuc(); return; }
    am.ting(); den(dang + 1);
  }
  function lui() { if (daXong) return; moAm(); den(dang - 1, true); }

  function ketThuc() {
    daXong = true;
    var r = nutTiep.getBoundingClientRect(); phao(r.left + r.width / 2, r.top, 140, 13); am.phao(); setTimeout(am.dung, 300);
    setTimeout(function () { huyHen(); gui({ gtXong: 1 }); }, 1300);
  }
  nutTiep.addEventListener('click', tiep);
  nutLui.addEventListener('click', lui);
  if (CFG.lai) {   // XEM LẠI ⇒ mới có nút Đóng
    $('#nutDong').classList.remove('an');
    $('#nutDong').addEventListener('click', function () { huyHen(); daXong = true; gui({ gtDong: 1 }); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tiep(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); lui(); }
  });
  // vuốt ngang
  var x0 = null, y0 = 0;
  document.addEventListener('pointerdown', function (e) { moAm(); x0 = e.clientX; y0 = e.clientY; });
  document.addEventListener('pointerup', function (e) {
    if (x0 === null) return;
    var dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) tiep(); else lui(); }
  });
  addEventListener('resize', function () { coCv(); if (dang >= 0) vua(MAN[dang]); });

  // ---------- mở đầu: chạy tiếp từ màn đang dở ----------
  var batDau = Math.max(0, Math.min(N - 1, +CFG.man || 0));
  den(batDau);
  if (batDau > 0 && !CFG.lai) {
    var th = $('#thong'); th.textContent = 'Em xem tiếp từ màn ' + (batDau + 1) + '/' + N + ' nhé!'; th.classList.add('on');
    setTimeout(function () { th.classList.remove('on'); }, 2600);
  }
}

(function () {
  var Q = new URLSearchParams(location.search), daChay = false;
  if (window.parent === window) {   // mở thẳng để thử
    chayPhim({ ten: Q.get('ten') || 'Minh Thư', anh: Q.get('anh') || '', man: (+Q.get('man') || 1) - 1, lai: Q.get('lai') === '1' });
    return;
  }
  addEventListener('message', function (e) {
    if (e.origin !== location.origin || daChay || !e.data || !e.data.gtBatDau) return;
    daChay = true; chayPhim(e.data.gtBatDau);
  });
  window.parent.postMessage({ gtSan: 1 }, location.origin);
})();
