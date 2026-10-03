/* ============================================================
   ktdv-ql.js — DASHBOARD › KHO BÀI › lớp cuối "KT ĐẦU VÀO" (02/10/2026, thầy chốt — trang kiemtra.andrewclasses.com).

   • Danh sách học sinh kiểm tra đầu vào (kho `ktdvHoSo`, chỉ thầy đọc) + tình trạng 3 bài (results + practiceLog).
   • Thêm / sửa hồ sơ · đặt lại mật khẩu · ảnh đại diện · lưu trữ · CHUYỂN sang học chính (giữ ID + tài khoản + ảnh)
     — mọi việc ghi đi qua hàm máy chủ `qlKtdv` (myLesson-app may-chu/functions/ktdv.js); chuyển lớp dùng `qlHocSinh.themHs`.
   • BÁO CÁO (03/10/2026 làm lại): mặc định là BẢN PHỤ HUYNH đơn giản (js/ktdv-bc.js: điểm chung + 3 thanh + nhận xét + các câu
     chưa đúng). Nút "Gửi phụ huynh" ghi ảnh chụp vào kho riêng `ktdvChiaSe/{token}` ⇒ link ngắn kiemtra.andrewclasses.com/kq?c=…
     (phụ huynh bấm là xem, không cần tải file). Phân loại 4 mức + phân tích quá trình làm bài + đổi Đúng/Sai từng câu nằm sau nút
     "Chi tiết giáo viên" — KHÔNG vào ảnh chụp gửi phụ huynh. Phần thầy sửa lưu ở `ktdvBaoCao/{ID}` (chỉ thầy).
   Gắn vào dashboard bằng 3 dòng móc trong klVeLop / klVe / bộ bấm Kho bài: window.KTDV.ve(khung, { dsLop }).
   ============================================================ */
(function () {
  'use strict';
  var SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
  var KHOA_LOP = '__KTDV__';
  // 3 bài giao AWord (Courses / KIEM TRA DAU VAO — AWord Đợt 440). Đổi bài ⇒ đổi ở đây + trang kiemtra (js/cau-hinh.js).
  var BAI = [
    { code: '5576de', ma: 'BT1', ten: 'Tạo cụm số ít', n: 40 },
    { code: 'bc52sb', ma: 'BT2', ten: 'Tạo cụm số nhiều', n: 20 },
    { code: 'khszvm', ma: 'BT3', ten: 'Tạo câu', n: 50 }
  ];
  var TRANG_KT = 'https://kiemtra.andrewclasses.com';
  var S = { ds: null, loi: '', kq: {}, log: {}, loc: 'dang', dangDoc: false, khung: null, dsLop: null };

  // ---------- tiện ích ----------
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function kho() { return window.AWChat.kho(); }
  var _fn = {};
  function ham(ten) {
    if (!_fn[ten]) {
      _fn[ten] = kho().then(async function () {
        var appMod = await import(SDK + '/firebase-app.js');
        var fnMod = await import(SDK + '/firebase-functions.js');
        return fnMod.httpsCallable(fnMod.getFunctions(appMod.getApp(), 'asia-southeast1'), ten, { timeout: 120000 });
      });
      _fn[ten]['catch'](function () { _fn[ten] = null; });
    }
    return _fn[ten];
  }
  function goi(ten, d) { return ham(ten).then(function (f) { return f(d); }).then(function (r) { return r.data; }); }
  function chuLoi(e) {
    var m = String((e && (e.message || e.code)) || e || '');
    if (/permission-denied|insufficient permissions/i.test(m)) return 'Chưa có quyền (phiên thầy hết hạn, hoặc luật kho KT đầu vào chưa được đăng).';
    if (/not-found|NOT_FOUND/i.test(m) && /qlKtdv/i.test(m)) return 'Hàm qlKtdv chưa được đưa lên máy chủ.';
    return m.replace(/^FirebaseError:\s*/, '').slice(0, 200);
  }
  function tb(chu, loi) {
    var t = document.createElement('div');
    t.className = 'ktq-toast' + (loi ? ' loi' : '');
    t.textContent = chu;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('mo'); }, 10);
    setTimeout(function () { t.classList.remove('mo'); setTimeout(function () { t.remove(); }, 300); }, loi ? 5000 : 2600);
  }
  function chuCai(ten) { var w = String(ten || '?').trim().split(/\s+/); return (w[w.length - 1] || '?').charAt(0).toUpperCase(); }
  function anhHtml(h, co) {
    co = co || 40;
    return h.anh ? '<img class="ktq-av" style="width:' + co + 'px;height:' + co + 'px" src="' + E(h.anh) + '" alt="">'
      : '<span class="ktq-av chu" style="width:' + co + 'px;height:' + co + 'px;font-size:' + Math.round(co * .42) + 'px">' + E(chuCai(h.ten)) + '</span>';
  }
  function phut(ms) {
    ms = Math.max(0, Math.round(ms || 0));
    var s = Math.round(ms / 1000);
    if (s < 60) return s + ' giây';
    var m = Math.floor(s / 60), g = s % 60;
    return m + ' phút' + (g ? ' ' + g + ' giây' : '');
  }
  function giay(ms) { return (Math.round((ms || 0) / 100) / 10).toFixed(1).replace('.0', '') + 's'; }
  function ngayVN(ms) { if (!ms) return ''; var d = new Date(ms); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }
  function gioVN(ms) { if (!ms) return ''; var d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ngayVN(ms); }
  function ngaySinhVN(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? (+m[3]) + '/' + (+m[2]) + '/' + m[1] : ''; }

  // ---------- đọc dữ liệu ----------
  function napHet() {
    if (S.dangDoc) return S.dangDoc;
    S.loi = '';
    S.dangDoc = kho().then(function (f) {
      var q = f.fs;
      var docHoSo = q.getDocs(q.collection(f.db, 'ktdvHoSo'));
      var docKq = q.getDocs(q.query(q.collection(f.db, 'results'), q.where('assignmentId', 'in', BAI.map(function (b) { return b.code; }))));
      var docLog = Promise.all(BAI.map(function (b) { return q.getDocs(q.collection(f.db, 'practiceLog', b.code, 'entries')).catch(function () { return null; }); }));
      return Promise.all([docHoSo, docKq, docLog]);
    }).then(function (r) {
      var ds = [];
      r[0].forEach(function (d) { var x = d.data(); if (x && x.ma) ds.push(x); });
      ds.sort(function (a, b) { return (b.tao || 0) - (a.tao || 0); });
      var kq = {};
      r[1].forEach(function (d) {
        var x = d.data(); if (!x || !x.ma) return;
        var k = String(x.ma).toUpperCase() + '|' + x.assignmentId;
        var cu = kq[k];
        // lượt NỘP HẲN mới nhất (lượt dở doDang chỉ dùng khi chưa có lượt nộp hẳn)
        var tot = function (a) { return (a.doDang ? 0 : 1e15) + (a.createdAt || 0); };
        if (!cu || tot(x) > tot(cu)) kq[k] = Object.assign({ id: d.id }, x);
      });
      var log = {};
      r[2].forEach(function (snap, i) {
        if (!snap) return;
        snap.forEach(function (d) {
          var x = d.data(); if (!x || !x.ma) return;
          var k = String(x.ma).toUpperCase() + '|' + BAI[i].code;
          (log[k] = log[k] || []).push(x);
        });
      });
      S.ds = ds; S.kq = kq; S.log = log;
    }, function (e) { S.loi = chuLoi(e); S.ds = S.ds || []; })
      .then(function () { S.dangDoc = false; });
    return S.dangDoc;
  }
  function kqCua(h, b) { return S.kq[String(h.ma).toUpperCase() + '|' + b.code] || null; }
  function logCua(h, b) { return (S.log[String(h.ma).toUpperCase() + '|' + b.code] || []).slice().sort(function (a, c) { return (a.createdAt || 0) - (c.createdAt || 0); }); }
  function tinhTrang(h, b) {
    var k = kqCua(h, b);
    if (k && !k.doDang) return { loai: 'xong', k: k };
    var lg = logCua(h, b);
    if (lg.length) return { loai: 'dang', lg: lg };
    return { loai: 'chua' };
  }

  // ---------- DANH SÁCH ----------
  function ve(khung, opt) {
    S.khung = khung;
    if (opt && opt.dsLop) S.dsLop = opt.dsLop;
    veDs();
    if (!S.ds) napHet().then(veDs);
  }
  function veDs() {
    var k = S.khung;
    if (!k || !k.isConnected) return;
    if (!S.ds) { k.innerHTML = '<div class="ktq"><div class="ktq-trong">Đang tải hồ sơ kiểm tra đầu vào…</div></div>'; return; }
    var dem = { dang: 0, xong: 0, chuyen: 0, luu: 0 };
    var nhom = function (h) {
      if (h.trangThai === 'da-chuyen') return 'chuyen';
      if (h.luuTru) return 'luu';
      var xong = BAI.every(function (b) { return tinhTrang(h, b).loai === 'xong'; });
      return xong ? 'xong' : 'dang';
    };
    S.ds.forEach(function (h) { dem[nhom(h)]++; });
    var hien = S.ds.filter(function (h) { return nhom(h) === S.loc; });
    var LOC = [['dang', 'Chưa xong'], ['xong', 'Đã làm xong'], ['chuyen', 'Đã vào học'], ['luu', 'Lưu trữ']];
    var h = '<div class="ktq">';
    h += '<div class="ktq-dau"><div><h3>KT ĐẦU VÀO</h3><p>Học sinh làm bài kiểm tra trên <a href="' + TRANG_KT + '" target="_blank" rel="noopener">kiemtra.andrewclasses.com</a> · 3 bài: ' +
      BAI.map(function (b) { return b.ma + ' ' + b.ten + ' (' + b.n + ')'; }).join(' · ') + '</p></div>' +
      '<div class="ktq-dau-nut"><button type="button" class="ktq-nut phu" data-ktq="tai">↻ Làm mới</button><button type="button" class="ktq-nut" data-ktq="them">+ Thêm học sinh</button></div></div>';
    if (S.loi) h += '<div class="ktq-loi">' + E(S.loi) + '</div>';
    h += '<div class="ktq-loc">' + LOC.map(function (l) { return '<button type="button" data-ktq-loc="' + l[0] + '"' + (S.loc === l[0] ? ' class="chon"' : '') + '>' + l[1] + ' <em>' + dem[l[0]] + '</em></button>'; }).join('') + '</div>';
    if (!hien.length) h += '<div class="ktq-trong">' + (S.ds.length ? 'Không có em nào ở nhóm này.' : 'Chưa có học sinh kiểm tra đầu vào. Bấm “+ Thêm học sinh”.') + '</div>';
    h += '<div class="ktq-ds">' + hien.map(function (x) {
      var o = BAI.map(function (b) {
        var t = tinhTrang(x, b);
        if (t.loai === 'xong') { var p = Math.round(100 * t.k.score / (t.k.total || b.n)); return '<span class="ktq-o xong" title="' + E(b.ma + ' ' + b.ten + ': ' + t.k.score + '/' + t.k.total) + '"><b>' + b.ma + '</b>' + p + '%</span>'; }
        if (t.loai === 'dang') return '<span class="ktq-o dang" title="' + E(b.ma + ': đang làm / bỏ dở (' + t.lg.length + ' lượt)') + '"><b>' + b.ma + '</b>đang làm</span>';
        return '<span class="ktq-o"><b>' + b.ma + '</b>chưa</span>';
      }).join('');
      var phu = [x.ma, x.ngaySinh ? ngaySinhVN(x.ngaySinh) : '', x.truong || '', x.lopTruong ? 'lớp ' + x.lopTruong : ''].filter(Boolean).join(' · ');
      return '<div class="ktq-dong" data-ktq-ma="' + E(x.ma) + '">' + anhHtml(x, 44) +
        '<div class="ktq-ten"><b>' + E(x.ten) + '</b><span>' + E(phu) + '</span>' + (x.trangThai === 'da-chuyen' ? '<span class="ktq-chuyen">Đã vào học: ' + E(x.chuyenSang || '') + '</span>' : '') + '</div>' +
        '<div class="ktq-oo">' + o + '</div>' +
        '<div class="ktq-hd"><button type="button" class="ktq-nut nho" data-ktq="bc">Báo cáo</button><button type="button" class="ktq-nut phu nho" data-ktq="menu" title="Tuỳ chọn">⋯</button></div></div>';
    }).join('') + '</div></div>';
    k.innerHTML = h;
  }

  // ---------- HỘP (form) ----------
  function moHop(tieuDe, noiDung, nuts) {
    dongHop();
    var nen = document.createElement('div');
    nen.className = 'ktq-nen'; nen.id = 'ktqNen';
    nen.innerHTML = '<div class="ktq-hop"><div class="ktq-hop-dau"><h3>' + E(tieuDe) + '</h3><button type="button" class="ktq-x" data-ktq-dong aria-label="Đóng">✕</button></div>' +
      '<div class="ktq-hop-than"></div><div class="ktq-hop-chan"></div></div>';
    var than = nen.querySelector('.ktq-hop-than');
    if (typeof noiDung === 'string') than.innerHTML = noiDung; else than.appendChild(noiDung);
    var chan = nen.querySelector('.ktq-hop-chan');
    (nuts || []).forEach(function (n) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ktq-nut' + (n.phu ? ' phu' : '') + (n.do ? ' do' : '');
      b.textContent = n.chu;
      b.onclick = function () { n.bam(b, than); };
      chan.appendChild(b);
    });
    nen.addEventListener('mousedown', function (e) { if (e.target === nen) dongHop(); });
    nen.querySelector('[data-ktq-dong]').onclick = dongHop;
    document.body.appendChild(nen);
    var o = than.querySelector('input'); if (o) setTimeout(function () { o.focus(); }, 30);
    return { nen: nen, than: than, chan: chan };
  }
  function dongHop() { var n = document.getElementById('ktqNen'); if (n) n.remove(); }
  function cho(b, chu) { b.disabled = true; b.dataset.cu = b.textContent; b.textContent = chu || 'Đang làm…'; }
  function thoi(b) { b.disabled = false; if (b.dataset.cu) b.textContent = b.dataset.cu; }

  var TRUONG = [
    ['ten', 'Tên gọi *', 'VD: Minh Thư'], ['hoTen', 'Họ và tên đầy đủ', 'VD: Nguyễn Minh Thư'], ['ngaySinh', 'Ngày sinh', '', 'date'],
    ['ma', 'ID đăng nhập', 'Để trống = tự tạo (họ tên viết liền + ngày sinh)'], ['phuHuynh', 'Tên phụ huynh', ''], ['sdt', 'SĐT phụ huynh', ''],
    ['truong', 'Trường đang học', ''], ['lopTruong', 'Lớp ở trường', 'VD: 5'], ['ghiChu', 'Ghi chú', '']
  ];
  function formHs(h) {
    var sua = !!h;
    return '<div class="ktq-form">' + TRUONG.filter(function (t) { return !(sua && t[0] === 'ma'); }).map(function (t) {
      return '<label><span>' + t[1] + '</span><input name="' + t[0] + '" type="' + (t[3] || 'text') + '" placeholder="' + E(t[2]) + '" value="' + E(h ? h[t[0]] || '' : '') + '"' + (t[0] === 'ma' ? ' style="text-transform:uppercase"' : '') + '></label>';
    }).join('') + '</div>';
  }
  function docForm(than) {
    var o = {};
    than.querySelectorAll('input[name]').forEach(function (i) { o[i.name] = i.value.trim(); });
    return o;
  }
  function moThem() {
    moHop('Thêm học sinh kiểm tra đầu vào', formHs(null), [
      { chu: 'Huỷ', phu: true, bam: dongHop },
      { chu: 'TẠO HỒ SƠ', bam: function (b, than) {
        var d = docForm(than);
        if (d.ten.length < 2) return tb('Thiếu tên gọi của em.', true);
        cho(b, 'Đang tạo…');
        goi('qlKtdv', Object.assign({ viec: 'them' }, d)).then(function (r) {
          S.ds = null; napHet().then(veDs);
          hienMatKhau(d.ten, r.ma, r.mkTam, 'Đã tạo hồ sơ');
        }, function (e) { thoi(b); tb(chuLoi(e), true); });
      } }
    ]);
  }
  function tinNhan(ten, ma, mk) {
    return 'Chào phụ huynh em ' + ten + ',\nThầy Andrew gửi tài khoản làm bài KIỂM TRA ĐẦU VÀO của con:\n' +
      '• Trang: ' + TRANG_KT.replace('https://', '') + '\n• ID: ' + ma + '\n• Mật khẩu: ' + mk + '\n' +
      'Con làm trên máy tính (hoặc điện thoại), tự làm, không dùng phần mềm dịch. Có 3 bài, mỗi bài có hướng dẫn và làm thử trước. Làm xong thầy sẽ gửi kết quả ạ.';
  }
  function hienMatKhau(ten, ma, mk, tieuDe) {
    var tn = tinNhan(ten, ma, mk);
    moHop(tieuDe || 'Mật khẩu mới', '<div class="ktq-mk"><div><span>ID</span><b>' + E(ma) + '</b></div><div><span>Mật khẩu</span><b>' + E(mk) + '</b></div></div>' +
      '<p class="ktq-goi">Mật khẩu chỉ hiện MỘT lần — chép gửi phụ huynh ngay. Em không phải đổi mật khẩu khi vào kiemtra.</p>' +
      '<textarea class="ktq-tn" rows="8">' + E(tn) + '</textarea>', [
      { chu: 'Chép tin nhắn', phu: true, bam: function (b, than) { var t = than.querySelector('.ktq-tn'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } tb('Đã chép tin nhắn.'); } },
      { chu: 'Xong', bam: dongHop }
    ]);
  }
  function hsTheoMa(ma) { return (S.ds || []).filter(function (h) { return h.ma === ma; })[0]; }

  function moMenu(nut, h) {
    var cu = document.getElementById('ktqMenu'); if (cu) cu.remove();
    var m = document.createElement('div');
    m.className = 'ktq-menu'; m.id = 'ktqMenu';
    var chuyen = h.trangThai === 'da-chuyen';
    var muc = chuyen ? [['bc', 'Xem báo cáo']] : [['sua', 'Sửa thông tin'], ['anh', 'Ảnh đại diện'], ['mk', 'Đặt lại mật khẩu'], ['link', 'Mở trang kiemtra (xem như em)'], ['chuyen', 'Chuyển sang học chính…'], [h.luuTru ? 'moLai' : 'luu', h.luuTru ? 'Mở lại tài khoản' : 'Lưu trữ (khoá tài khoản)']];
    m.innerHTML = muc.map(function (x) { return '<button type="button" data-ktq-m="' + x[0] + '">' + x[1] + '</button>'; }).join('');
    document.body.appendChild(m);
    var r = nut.getBoundingClientRect();
    m.style.top = Math.min(window.innerHeight - m.offsetHeight - 8, r.bottom + 4) + 'px';
    m.style.left = Math.max(8, r.right - m.offsetWidth) + 'px';
    var bo = function (e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', bo, true); } };
    setTimeout(function () { document.addEventListener('mousedown', bo, true); }, 0);
    m.onclick = function (e) {
      var b = e.target.closest('[data-ktq-m]'); if (!b) return;
      m.remove(); document.removeEventListener('mousedown', bo, true);
      var v = b.getAttribute('data-ktq-m');
      if (v === 'bc') return moBaoCao(h);
      if (v === 'sua') return moSua(h);
      if (v === 'anh') return moAnh(h);
      if (v === 'mk') return moDatLaiMk(h);
      if (v === 'chuyen') return moChuyen(h);
      if (v === 'link') return window.open(TRANG_KT, '_blank', 'noopener');
      if (v === 'luu' || v === 'moLai') return luuTru(h, v === 'luu');
    };
  }
  function moSua(h) {
    moHop('Sửa hồ sơ — ' + h.ten, formHs(h), [
      { chu: 'Huỷ', phu: true, bam: dongHop },
      { chu: 'LƯU', bam: function (b, than) {
        var d = docForm(than); cho(b);
        goi('qlKtdv', Object.assign({ viec: 'sua', ma: h.ma }, d)).then(function () { dongHop(); tb('Đã lưu.'); S.ds = null; napHet().then(veDs); },
          function (e) { thoi(b); tb(chuLoi(e), true); });
      } }
    ]);
  }
  function moDatLaiMk(h) {
    moHop('Đặt lại mật khẩu — ' + h.ten, '<p>Tạo mật khẩu tạm MỚI cho <b>' + E(h.ma) + '</b>. Máy đang đăng nhập bằng mật khẩu cũ sẽ phải đăng nhập lại.</p>', [
      { chu: 'Huỷ', phu: true, bam: dongHop },
      { chu: 'ĐẶT LẠI', bam: function (b) {
        cho(b);
        goi('qlKtdv', { viec: 'datLaiMk', ma: h.ma }).then(function (r) { hienMatKhau(h.ten, r.ma, r.mkTam, 'Mật khẩu mới'); }, function (e) { thoi(b); tb(chuLoi(e), true); });
      } }
    ]);
  }
  function luuTru(h, khoa) {
    moHop(khoa ? 'Lưu trữ hồ sơ' : 'Mở lại tài khoản', '<p>' + (khoa ? 'Khoá tài khoản của <b>' + E(h.ten) + '</b> (em không đăng nhập được nữa). Hồ sơ + kết quả vẫn giữ nguyên.' : 'Cho <b>' + E(h.ten) + '</b> đăng nhập lại.') + '</p>', [
      { chu: 'Huỷ', phu: true, bam: dongHop },
      { chu: khoa ? 'LƯU TRỮ' : 'MỞ LẠI', do: khoa, bam: function (b) {
        cho(b);
        goi('qlKtdv', { viec: 'luuTru', ma: h.ma, luuTru: khoa }).then(function () { dongHop(); tb('Đã xong.'); S.ds = null; napHet().then(veDs); }, function (e) { thoi(b); tb(chuLoi(e), true); });
      } }
    ]);
  }

  // ----- ảnh đại diện: chọn / kéo thả / dán ảnh ⇒ cắt vuông giữa ⇒ JPEG ≤ 400 px -----
  function catVuong(file, canh) {
    return new Promise(function (ok, hong) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas');
        c.width = c.height = Math.min(canh, s);
        c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = function () { URL.revokeObjectURL(url); hong(new Error('Không đọc được ảnh.')); };
      img.src = url;
    });
  }
  function moAnh(h) {
    var anh = null;
    var hop = moHop('Ảnh đại diện — ' + h.ten,
      '<div class="ktq-anh"><div class="ktq-anh-o" tabindex="0">' + (h.anh ? '<img src="' + E(h.anh) + '">' : '<span>Bấm để chọn ảnh<br>hoặc kéo thả / dán (Ctrl+V)</span>') + '</div>' +
      '<input type="file" accept="image/*" hidden><p class="ktq-goi">Ảnh được cắt vuông ở giữa. Sau này em vào học chính, ảnh này đi theo em.</p></div>', [
      { chu: 'Xoá ảnh', phu: true, do: true, bam: function (b) { if (!h.anh) return tb('Em chưa có ảnh.'); cho(b); goi('qlKtdv', { viec: 'datAnh', ma: h.ma, xoa: true }).then(function () { dongHop(); tb('Đã xoá ảnh.'); S.ds = null; napHet().then(veDs); }, function (e) { thoi(b); tb(chuLoi(e), true); }); } },
      { chu: 'LƯU ẢNH', bam: function (b) {
        if (!anh) return tb('Chọn ảnh trước đã.', true);
        cho(b, 'Đang lưu…');
        goi('qlKtdv', { viec: 'datAnh', ma: h.ma, lon: anh }).then(function () { dongHop(); tb('Đã lưu ảnh.'); S.ds = null; napHet().then(veDs); }, function (e) { thoi(b); tb(chuLoi(e), true); });
      } }
    ]);
    var o = hop.than.querySelector('.ktq-anh-o'), inp = hop.than.querySelector('input[type=file]');
    var nhan = function (f) {
      if (!f || !/^image\//.test(f.type)) return;
      catVuong(f, 400).then(function (d) { anh = d; o.innerHTML = '<img src="' + d + '">'; }, function (e) { tb(e.message, true); });
    };
    o.onclick = function () { inp.click(); };
    inp.onchange = function () { nhan(inp.files[0]); };
    o.addEventListener('dragover', function (e) { e.preventDefault(); o.classList.add('keo'); });
    o.addEventListener('dragleave', function () { o.classList.remove('keo'); });
    o.addEventListener('drop', function (e) { e.preventDefault(); o.classList.remove('keo'); nhan(e.dataTransfer.files[0]); });
    hop.nen.addEventListener('paste', function (e) { var it = [].slice.call(e.clipboardData.items || []).filter(function (x) { return /^image\//.test(x.type); })[0]; if (it) nhan(it.getAsFile()); });
    o.focus();
  }

  // ----- chuyển sang học chính: qlHocSinh.themHs cùng ID ⇒ (ảnh) qlAnhDaiDien ⇒ qlKtdv.daChuyen -----
  function anhVeBase64(url, canh) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('ảnh ' + r.status); return r.blob(); })
      .then(function (bl) { return catVuong(new File([bl], 'a.jpg', { type: bl.type || 'image/jpeg' }), canh); });
  }
  function moChuyen(h) {
    var ds = (S.dsLop ? S.dsLop() : []).filter(function (l) { return l && l.tenGoc; });
    if (!ds.length) return tb('Chưa đọc được danh sách lớp — đóng Kho bài rồi mở lại.', true);
    var hom = new Date(), homNay = hom.getFullYear() + '-' + String(hom.getMonth() + 1).padStart(2, '0') + '-' + String(hom.getDate()).padStart(2, '0');
    moHop('Chuyển sang học chính — ' + h.ten,
      '<p>Em sẽ được ghi danh vào lớp/khóa bên dưới với <b>đúng ID ' + E(h.ma) + '</b> và mật khẩu hiện tại (lần đầu vào andrewclasses.com em sẽ đặt mật khẩu riêng). Ảnh đại diện đi theo em. Kết quả kiểm tra đầu vào vẫn giữ ở mục này.</p>' +
      '<div class="ktq-form"><label><span>Lớp / khóa</span><select name="lop">' + ds.map(function (l) { return '<option value="' + E(l.tenGoc) + '">' + E((l.loai === 'khoa' ? 'KHÓA ' : '') + l.tenGoc) + '</option>'; }).join('') + '</select></label>' +
      '<label><span>Vào học từ</span><input type="date" name="vao" value="' + homNay + '"></label></div>', [
      { chu: 'Huỷ', phu: true, bam: dongHop },
      { chu: 'CHUYỂN', bam: function (b, than) {
        var lop = than.querySelector('[name=lop]').value, vao = than.querySelector('[name=vao]').value;
        cho(b, 'Đang ghi danh…');
        goi('qlHocSinh', { viec: 'themHs', ten: h.ten, hoTen: h.hoTen || '', ngaySinh: h.ngaySinh || '', ma: h.ma, ghiChu: 'Từ kiểm tra đầu vào', ghiDanh: [{ lop: lop, vao: vao }] })
          .then(function () {
            if (!h.anh) return null;
            b.textContent = 'Đang chuyển ảnh…';
            return Promise.all([anhVeBase64(h.anh, 400), anhVeBase64(h.anh, 96)]).then(function (a) {
              return goi('qlAnhDaiDien', { viec: 'dat', ids: [h.msId], lon: a[0], nho: a[1], nguon: 'Kiểm tra đầu vào' });
            })['catch'](function (e) { tb('Đã ghi danh nhưng chưa chuyển được ảnh: ' + chuLoi(e) + ' — đặt lại ảnh ở mục Học sinh.', true); });
          })
          .then(function () { return goi('qlKtdv', { viec: 'daChuyen', ma: h.ma, lop: lop }); })
          .then(function () { dongHop(); tb('Đã chuyển ' + h.ten + ' vào ' + lop + '.'); S.ds = null; napHet().then(veDs); },
            function (e) { thoi(b); tb(chuLoi(e), true); });
      } }
    ]);
  }

  // ================= BÁO CÁO =================
  // Phân loại câu (giống bảng TỔNG KẾT của skill kiemtradauvao): dung · tam (tạm chấp nhận) · nhe (sai không nghiêm trọng) · nang.
  function chuanCau(s) {
    var t = String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[‘’`]/g, "'");
    t = t.replace(/\bcan'?t\b/g, 'cannot').replace(/\bwon'?t\b/g, 'will not').replace(/n't\b/g, ' not').replace(/\bi'm\b/g, 'i am');
    return t.replace(/[^a-z0-9' ]+/g, ' ').replace(/'/g, '').split(/\s+/).filter(Boolean);
  }
  function lev(a, b) {
    var m = a.length, n = b.length, p = [], i, j;
    for (j = 0; j <= n; j++) p[j] = j;
    for (i = 1; i <= m; i++) { var c = [i]; for (j = 1; j <= n; j++) c[j] = a[i - 1] === b[j - 1] ? p[j - 1] : 1 + Math.min(p[j - 1], p[j], c[j - 1]); p = c; }
    return p[n];
  }
  function phanLoaiTuDong(r, dapAn) {
    if (r.yourCorrect) return 'dung';
    if (!r.yourText) return 'nang';
    var g = chuanCau(r.yourText), tot = null;
    (dapAn || [r.correctText]).forEach(function (a) {
      var e = chuanCau(a), d = lev(g, e), sai = 0;
      if (!tot || d < tot.d) {
        // một từ lệch chính tả nhẹ (≤2 ký tự) ⇒ tạm chấp nhận
        if (g.length === e.length) for (var i = 0; i < g.length; i++) if (g[i] !== e[i]) sai += lev(g[i].split(''), e[i].split('')) <= 2 && e[i].length >= 4 ? 1 : 9;
        tot = { d: d, n: e.length, sai: sai };
      }
    });
    if (tot && tot.d === 1 && tot.sai === 1) return 'tam';
    if (tot && tot.d <= Math.max(1, Math.round(tot.n * 0.34))) return 'nhe';
    return 'nang';
  }
  var TEN_LOAI = { dung: 'Đúng', tam: 'Tạm chấp nhận', nhe: 'Sai nhẹ', nang: 'Sai nghiêm trọng' };

  // Mặc định mở BẢN PHỤ HUYNH (đơn giản: điểm chung + 3 thanh + nhận xét + các câu chưa đúng) — đúng cái phụ huynh sẽ thấy ở
  // kiemtra.andrewclasses.com/kq?c=…. Phần ít dùng (phân loại 4 mức, thời gian, rời trang, đổi Đúng/Sai từng câu) nằm sau
  // nút "Chi tiết giáo viên" — KHÔNG đi vào ảnh chụp gửi phụ huynh.
  var ALPHA_TOKEN = 'abcdefghjkmnpqrstuvwxyz23456789';   // 31 ký tự, bỏ i l o 0 1 dễ nhầm
  function taoToken() {
    var s = '', b = new Uint8Array(40), i = 0;
    crypto.getRandomValues(b);
    while (s.length < 10) {
      if (i >= b.length) { crypto.getRandomValues(b); i = 0; }
      if (b[i] < 248) s += ALPHA_TOKEN.charAt(b[i] % 31);   // 248 = 31×8 ⇒ không lệch
      i++;
    }
    return s;
  }
  function cat(s, n) { return String(s == null ? '' : s).slice(0, n || 300); }
  function linkKq(token) { return TRANG_KT + '/kq?c=' + token; }
  function tinKetQua(ten, link) {
    return 'Chào phụ huynh em ' + ten + ',\nThầy Andrew gửi kết quả KIỂM TRA ĐẦU VÀO của con:\n' + link + '\n' +
      'Phụ huynh bấm vào link là xem được ngay trên điện thoại, không cần tải file. Cần trao đổi thêm, phụ huynh nhắn thầy qua Zalo ạ.';
  }

  function moBaoCao(h) {
    var nen = document.createElement('div');
    nen.className = 'ktbc-nen'; nen.id = 'ktbcNen';
    nen.innerHTML = '<div class="ktbc-thanh"><b>Báo cáo — ' + E(h.ten) + '</b><span class="ktbc-luu-tt"></span>' +
      '<button type="button" class="ktq-nut phu" data-bc="nhap">Tạo nháp nhận xét</button>' +
      '<button type="button" class="ktq-nut phu" data-bc="luu">Lưu</button>' +
      '<button type="button" class="ktq-nut phu" data-bc="in">In / PDF</button>' +
      '<button type="button" class="ktq-nut" data-bc="gui">Gửi phụ huynh</button>' +
      '<button type="button" class="ktq-nut phu nho ktbc-gv" data-bc="gv" title="Phân tích quá trình làm bài, đổi Đúng/Sai từng câu — không gửi cho phụ huynh">Chi tiết giáo viên</button>' +
      '<button type="button" class="ktq-x" data-bc="dong" aria-label="Đóng">✕</button></div>' +
      '<div class="ktbc-cuon"><div class="ktbc-trang"><div class="ktq-trong">Đang tải…</div></div></div>';
    document.body.appendChild(nen);
    document.documentElement.classList.add('ktbc-dang-mo');
    var trang = nen.querySelector('.ktbc-trang');
    var BC = { sua: {}, loai: {}, ghiChu: {}, uuDiem: '', hanChe: '', guiLuc: 0, token: '' };
    var doi = false, assign = {}, che = 'ph';
    var dong = function () {
      if (doi && !confirm('Có thay đổi chưa lưu. Đóng không lưu?')) return;
      nen.remove(); document.documentElement.classList.remove('ktbc-dang-mo');
    };
    // đáp án đầy đủ từ bài giao (assignments là kho đọc được khi thầy đăng nhập) — để phân loại câu sai chính xác hơn
    Promise.all([
      kho().then(function (f) { return f.fs.getDoc(f.fs.doc(f.db, 'ktdvBaoCao', String(h.ma))).then(function (s) { return s.exists() ? s.data() : null; }, function () { return null; }); }),
      kho().then(function (f) { return Promise.all(BAI.map(function (b) { return f.fs.getDoc(f.fs.doc(f.db, 'assignments', b.code)).then(function (s) { return s.exists() ? s.data() : null; }, function () { return null; }); })); }),
      napHet()
    ]).then(function (r) {
      if (r[0]) BC = Object.assign(BC, r[0]);
      BC.ghiChu = BC.ghiChu || {};
      r[1].forEach(function (a, i) { if (a) assign[BAI[i].code] = a; });
      veBc();
    });
    function dapAnCua(b, i) {
      var a = assign[b.code], it = a && a.activity && a.activity.content && a.activity.content.items && a.activity.content.items[i];
      return it ? it.acceptedAnswers : null;
    }
    function dung(b, i, r) { var k = b.code + ':' + i; return k in BC.sua ? !!BC.sua[k] : !!r.yourCorrect; }
    function loai(b, i, r) {
      var k = b.code + ':' + i;
      if (BC.loai[k]) return BC.loai[k];
      var rr = Object.assign({}, r, { yourCorrect: dung(b, i, r) });
      return phanLoaiTuDong(rr, dapAnCua(b, i));
    }
    function thongKe() {
      return BAI.map(function (b) {
        var k = kqCua(h, b), rv = (k && Array.isArray(k.review)) ? k.review : [];
        var lg = logCua(h, b);
        var o = { b: b, k: k, rv: rv, lg: lg, d: 0, loai: { dung: 0, tam: 0, nhe: 0, nang: 0 }, ms: 0, roi: 0, roiCau: [], dan: 0, nhanh: [], trong: 0 };
        rv.forEach(function (r, i) {
          if (dung(b, i, r)) o.d++;
          o.loai[loai(b, i, r)]++;
          o.ms += r.ms || 0;
          var roi = (r.roi || 0) + ((r.mat || 0) && (r.matMs || 0) > 1500 ? r.mat : 0);
          if (roi) { o.roi += roi; o.roiCau.push(i); }
          o.dan += r.dan || 0;
          if (!r.yourText) o.trong++;
        });
        var kt = (rv[0] && rv[0].kt) || {};
        o.kt = kt;
        o.boDo = lg.filter(function (x) { return !x.done; }).length;
        return o;
      });
    }
    // ẢNH CHỤP gửi phụ huynh (ktdv-bc.js) — chỉ điểm + câu chưa đúng + nhận xét; không có ID, không có thời gian/rời trang
    function chup(tk) {
      tk = tk || thongKe();
      var ngayLam = tk.map(function (o) { return o.k && o.k.createdAt; }).filter(Boolean).sort().pop();
      return {
        v: 2, ten: h.ten, hoTen: h.hoTen || '', truong: h.truong || '', lopTruong: h.lopTruong || '',
        anh: (/^https?:\/\//.test(h.anh || '') && h.anh.length < 600) ? h.anh : '',
        ngayLam: ngayLam || 0, ngayBc: Date.now(), uuDiem: BC.uuDiem || '', hanChe: BC.hanChe || '',
        bai: tk.map(function (o) {
          if (!o.k) return { ma: o.b.ma, ten: o.b.ten, n: o.b.n, chua: true };
          // TẤT CẢ các câu (đúng + sai) như sheet Excel chấm: STT · đề · bài làm · nhận xét. Câu sai: lời giải thích = thầy đã sửa, chưa sửa thì nháp tự động.
          var ds = o.rv.map(function (r, i) {
            var ok = dung(o.b, i, r), k = o.b.ma + ':' + (i + 1);
            return { i: i + 1, q: cat(r.question), y: cat(r.yourText), c: cat(r.correctText), ok: ok,
              g: ok ? '' : cat(k in BC.ghiChu ? BC.ghiChu[k] : window.KTDV_BC.goiY(r.yourText, r.correctText, r.question), 240) };
          });
          return { ma: o.b.ma, ten: o.b.ten, n: o.rv.length || o.b.n, d: o.d, ds: ds };
        })
      };
    }
    function capNutGui() {
      var b = nen.querySelector('[data-bc="gui"]');
      if (b) b.textContent = BC.token ? 'Cập nhật link PH' : 'Gửi phụ huynh';
    }
    function veBc() { if (che === 'gv') veGv(); else vePh(); capNutGui(); }

    // ---- BẢN PHỤ HUYNH (xem trước + sửa nhận xét) ----
    function vePh() {
      var tk = thongKe();
      var h2 = '<div class="khong-in ktbc-goi ktbc-ph-goi">Đây là bản phụ huynh sẽ thấy. Sửa nhận xét và lời giải thích từng câu sai ngay trong trang (câu sai có sẵn nháp tự động), bấm <b>Lưu</b>, rồi <b>Gửi phụ huynh</b> để lấy link.' +
        (BC.claudeLuc ? '<br><b>Claude đã chấm lại ngày ' + gioVN(BC.claudeLuc) + '</b>' + (BC.claudeGhiChu ? ' — ' + E(BC.claudeGhiChu) : '') + ' (lời giải thích + nhận xét bên dưới là bản của Claude; chưa bấm “Cập nhật link PH” thì phụ huynh vẫn thấy bản cũ).' : '') +
        (BC.token ? '<br>Link đang dùng: <a href="' + E(linkKq(BC.token)) + '" target="_blank" rel="noopener">' + E(linkKq(BC.token).replace('https://', '')) + '</a>' + (BC.guiLuc ? ' · cập nhật ' + gioVN(BC.guiLuc) : '') + ' — sau khi sửa bấm “Cập nhật link PH” để phụ huynh thấy bản mới.' : '') + '</div>';
      h2 += window.KTDV_BC.html(chup(tk), { sua: true });
      trang.innerHTML = h2;
      trang.querySelectorAll('[data-bc-nx]').forEach(function (t) {
        t.addEventListener('input', function () { BC[t.getAttribute('data-bc-nx')] = t.value; t.nextElementSibling.innerHTML = t.value.split(/\n+/).filter(Boolean).map(function (x) { return '<li>' + E(x) + '</li>'; }).join(''); doi = true; danhDau(); });
      });
      trang.querySelectorAll('[data-bc-gc]').forEach(function (t) {
        t.addEventListener('input', function () { BC.ghiChu[t.getAttribute('data-bc-gc')] = t.value; t.nextElementSibling.textContent = t.value; doi = true; danhDau(); });
      });
    }

    // ---- CHI TIẾT GIÁO VIÊN (ít dùng): phân loại 4 mức · quá trình làm bài · đổi Đúng/Sai từng câu ----
    function veGv() {
      var tk = thongKe();
      var h2 = '<div class="ktbc-gv-dau"><b>CHI TIẾT DÀNH CHO GIÁO VIÊN</b><span>Phần này KHÔNG gửi cho phụ huynh. Đổi Đúng/Sai ở đây sẽ đổi điểm trong bản phụ huynh.</span></div>';
      h2 += '<div class="ktbc-ba">' + tk.map(function (o) {
        if (!o.k) return '<div class="ktbc-o chua"><div class="ktbc-o-ten">' + o.b.ma + '. ' + E(o.b.ten) + '</div><div class="ktbc-o-chua">Chưa nộp bài' + (o.lg.length ? ' (đã mở ' + o.lg.length + ' lượt)' : '') + '</div></div>';
        var n = o.rv.length || o.b.n, p = Math.round(100 * o.d / n);
        return '<div class="ktbc-o"><div class="ktbc-o-ten">' + o.b.ma + '. ' + E(o.b.ten) + '</div>' + vongTron(p) +
          '<div class="ktbc-o-so"><b>' + o.d + '</b>/' + n + ' câu đúng</div><div class="ktbc-o-phu">Thời gian: ' + phut(o.k.timeMs) + '</div></div>';
      }).join('') + '</div>';
      // phân loại
      h2 += '<h4 class="ktbc-muc">1. Phân loại câu</h4><table class="ktbc-bang tk"><thead><tr><th>Bài</th><th>Đúng hoàn toàn</th><th>Tạm chấp nhận</th><th>Sai, không nghiêm trọng</th><th>Sai nghiêm trọng / bỏ trống</th><th>Điểm</th></tr></thead><tbody>' +
        tk.map(function (o) {
          if (!o.k) return '<tr><td>' + o.b.ma + '. ' + E(o.b.ten) + '</td><td colspan="5" class="nhat">Chưa làm</td></tr>';
          var n = o.rv.length || o.b.n;
          return '<tr><td>' + o.b.ma + '. ' + E(o.b.ten) + '</td><td class="c-dung">' + o.loai.dung + '</td><td class="c-tam">' + o.loai.tam + '</td><td class="c-nhe">' + o.loai.nhe + '</td><td class="c-nang">' + o.loai.nang + '</td><td><b>' + o.d + '/' + n + ' = ' + (Math.round(1000 * o.d / n) / 10) + '%</b></td></tr>';
        }).join('') + '</tbody></table>';
      // phân tích thời gian + nghi dịch
      h2 += '<h4 class="ktbc-muc">2. Phân tích quá trình làm bài</h4><div class="ktbc-pt">' + tk.map(function (o) {
        if (!o.k) return '';
        var rv = o.rv, ms = rv.map(function (r) { return r.ms || 0; });
        var tb2 = ms.length ? ms.reduce(function (a, x) { return a + x; }, 0) / ms.length : 0;
        var dg = [];
        dg.push('Thời gian làm bài: <b>' + phut(o.k.timeMs) + '</b> · trung bình <b>' + giay(tb2) + '</b>/câu');
        if (o.roi) dg.push('<span class="canh">Rời khỏi trang / chuyển ứng dụng: <b>' + o.roi + ' lần</b> (ở ' + o.roiCau.length + ' câu: ' + o.roiCau.slice(0, 12).map(function (i) { return 'câu ' + (i + 1); }).join(', ') + (o.roiCau.length > 12 ? '…' : '') + ')</span>');
        else dg.push('<span class="tot">Không rời khỏi trang trong lúc làm bài</span>');
        if (o.dan) dg.push('<span class="canh">Định dán chữ vào ô trả lời: <b>' + o.dan + ' lần</b> (đã bị chặn)</span>');
        if (o.trong) dg.push('Bỏ trống: <b>' + o.trong + ' câu</b>');
        var lam = [];
        if (o.kt.lamLai) lam.push('làm lại từ đầu ' + o.kt.lamLai + ' lần');
        if (o.boDo > (o.kt.lamLai || 0)) lam.push('bỏ dở ' + o.boDo + ' lượt');
        if (o.kt.taiLai) lam.push('tải lại trang ' + o.kt.taiLai + ' lần');
        if (lam.length) dg.push('Quá trình: ' + lam.join(' · '));
        if (o.kt.gioiThieuMs != null) dg.push('Xem hướng dẫn ' + phut(o.kt.gioiThieuMs) + ' · làm thử sai ' + (o.kt.thuSai || 0) + ' lần');
        return '<div class="ktbc-pt-o"><div class="ktbc-pt-ten">' + o.b.ma + '. ' + E(o.b.ten) + '</div><ul>' + dg.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' + bieuDo(o) + '</div>';
      }).join('') + '</div>';
      // bảng từng câu
      h2 += '<h4 class="ktbc-muc">3. Chi tiết từng câu</h4><p class="ktbc-goi khong-in">Bấm ô Kết quả để đổi Đúng ↔ Sai; bấm ô Loại để đổi phân loại. Thay đổi được lưu khi bấm Lưu.</p>';
      tk.forEach(function (o) {
        if (!o.k) return;
        h2 += '<div class="ktbc-bai"><div class="ktbc-bai-ten">' + o.b.ma + '. ' + E(o.b.ten).toUpperCase() + ' — ' + o.d + '/' + (o.rv.length || o.b.n) + '</div><table class="ktbc-bang ct"><thead><tr><th>#</th><th>Đề</th><th>Bài làm của em</th><th>Đáp án</th><th>Kết quả</th><th>Loại</th><th>Thời gian</th></tr></thead><tbody>' +
          o.rv.map(function (r, i) {
            var d = dung(o.b, i, r), l = loai(o.b, i, r), daSua = (o.b.code + ':' + i) in BC.sua;
            var co = [];
            if (r.roi || (r.mat && r.matMs > 1500)) co.push('<i class="co roi" title="Rời trang ' + ((r.roi || 0) + (r.mat || 0)) + ' lần · ' + giay((r.anMs || 0) + (r.matMs || 0)) + '">rời trang</i>');
            if (r.dan) co.push('<i class="co dan" title="Định dán ' + r.dan + ' lần">dán</i>');
            return '<tr class="' + (d ? 'd' : 's') + '"><td>' + (i + 1) + '</td><td>' + E(r.question) + '</td><td class="bl">' + (r.yourText ? E(r.yourText) : '<span class="nhat">(bỏ trống)</span>') + '</td><td class="da">' + (d ? '' : E(r.correctText)) + '</td>' +
              '<td><button type="button" class="kq ' + (d ? 'd' : 's') + (daSua ? ' sua' : '') + '" data-bc-kq="' + o.b.code + ':' + i + '">' + (d ? '✓ Đúng' : '✗ Sai') + '</button></td>' +
              '<td><button type="button" class="lo ' + l + '" data-bc-lo="' + o.b.code + ':' + i + '">' + TEN_LOAI[l] + '</button></td>' +
              '<td class="tg">' + giay(r.ms) + ' ' + co.join(' ') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      });
      trang.innerHTML = h2;
    }
    function vongTron(p) {
      var r = 34, c = 2 * Math.PI * r, mau = p >= 80 ? '#2E9E6B' : p >= 50 ? '#F2A93B' : '#E5484D';
      return '<svg class="ktbc-vong" viewBox="0 0 84 84" width="84" height="84"><circle cx="42" cy="42" r="' + r + '" fill="none" stroke="#E1EAE8" stroke-width="9"/>' +
        '<circle cx="42" cy="42" r="' + r + '" fill="none" stroke="' + mau + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + (c * p / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 42 42)"/>' +
        '<text x="42" y="48" text-anchor="middle" font-size="19" font-weight="800" fill="#16232A">' + p + '%</text></svg>';
    }
    // cột thời gian từng câu (xanh đúng · đỏ sai · xám trống), chấm cam = câu có rời trang
    function bieuDo(o) {
      var rv = o.rv; if (!rv.length) return '';
      var mx = Math.max.apply(null, rv.map(function (r) { return r.ms || 0; }).concat([1000]));
      var W = 640, H = 90, w = W / rv.length;
      var cot = rv.map(function (r, i) {
        var hgt = Math.max(2, (H - 14) * (r.ms || 0) / mx), x = i * w, d = dung(o.b, i, r);
        var mau = !r.yourText ? '#C9D3D1' : d ? '#2E9E6B' : '#E5484D';
        var roi = (r.roi || (r.mat && r.matMs > 1500)) ? '<circle cx="' + (x + w / 2).toFixed(1) + '" cy="' + (H - 14 - hgt - 5).toFixed(1) + '" r="3" fill="#F2A93B"/>' : '';
        return '<rect x="' + (x + w * .15).toFixed(1) + '" y="' + (H - 14 - hgt).toFixed(1) + '" width="' + (w * .7).toFixed(1) + '" height="' + hgt.toFixed(1) + '" rx="1.5" fill="' + mau + '"><title>Câu ' + (i + 1) + ': ' + giay(r.ms) + '</title></rect>' + roi;
      }).join('');
      return '<div class="ktbc-bd"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" width="100%" height="' + H + '">' + cot +
        '<line x1="0" x2="' + W + '" y1="' + (H - 14) + '" y2="' + (H - 14) + '" stroke="#CFDCD9"/><text x="0" y="' + (H - 2) + '" font-size="10" fill="#8AA09C">câu 1</text><text x="' + W + '" y="' + (H - 2) + '" font-size="10" fill="#8AA09C" text-anchor="end">câu ' + rv.length + '</text></svg>' +
        '<div class="ktbc-bd-chu"><i style="background:#2E9E6B"></i>đúng <i style="background:#E5484D"></i>sai <i style="background:#C9D3D1"></i>bỏ trống <i style="background:#F2A93B;border-radius:50%"></i>có rời trang · chiều cao = thời gian làm câu (lâu nhất ' + giay(mx) + ')</div></div>';
    }
    function danhDau() { var t = nen.querySelector('.ktbc-luu-tt'); t.textContent = doi ? '● chưa lưu' : ''; }
    function luu(them) {
      var goc = { sua: BC.sua, loai: BC.loai, ghiChu: BC.ghiChu || {}, uuDiem: BC.uuDiem || '', hanChe: BC.hanChe || '', guiLuc: BC.guiLuc || 0, token: BC.token || '', claudeLuc: BC.claudeLuc || 0, claudeGhiChu: BC.claudeGhiChu || '', ma: h.ma, ten: h.ten, capNhat: Date.now() };
      Object.assign(goc, them || {});
      return kho().then(function (f) { return f.fs.setDoc(f.fs.doc(f.db, 'ktdvBaoCao', String(h.ma)), goc); })
        .then(function () { Object.assign(BC, them || {}); doi = false; danhDau(); tb('Đã lưu báo cáo.'); }, function (e) { tb(chuLoi(e), true); });
    }

    // ---- GỬI PHỤ HUYNH: ghi ảnh chụp vào kho riêng `ktdvChiaSe/{token}` ⇒ link ngắn kiemtra.andrewclasses.com/kq?c=… ----
    function guiPH(btn) {
      var token = BC.token || taoToken(), chu = btn.textContent;
      btn.disabled = true; btn.textContent = 'Đang tạo link…';
      var snap = chup();
      kho().then(function (f) {
        return f.fs.setDoc(f.fs.doc(f.db, 'ktdvChiaSe', token), { json: JSON.stringify(snap), capNhat: Date.now() });
      }).then(function () {
        return luu({ token: token, guiLuc: Date.now() }).then(function () {
          goi('qlKtdv', { viec: 'trangThai', ma: h.ma, trangThai: 'da-gui' })['catch'](function () {});
          veBc(); hopLink(token);
        });
      }, function (e) { tb(chuLoi(e), true); }).then(function () { btn.disabled = false; btn.textContent = chu; capNutGui(); });
    }
    function hopLink(token) {
      var link = linkKq(token);
      moHop('Link kết quả gửi phụ huynh',
        '<div class="ktq-lk"><input type="text" readonly value="' + E(link) + '"><a href="' + E(link) + '" target="_blank" rel="noopener">Mở thử</a></div>' +
        '<textarea class="ktq-tn" rows="6">' + E(tinKetQua(h.ten, link)) + '</textarea>' +
        '<p class="ktq-goi">Phụ huynh bấm link là xem ngay trên điện thoại/máy tính, không cần tải file. Ai có link đều xem được kết quả của con — chỉ gửi cho phụ huynh. ' +
        'Sửa nhận xét xong bấm “Cập nhật link PH” thì link cũ tự hiện bản mới.</p>', [
        { chu: 'Thu hồi link', phu: true, do: true, bam: function (b) {
          if (!confirm('Thu hồi link? Phụ huynh bấm vào sẽ không xem được nữa.')) return;
          cho(b, 'Đang thu hồi…');
          kho().then(function (f) { return f.fs.deleteDoc(f.fs.doc(f.db, 'ktdvChiaSe', token)); })
            .then(function () { return luu({ token: '' }); })
            .then(function () { dongHop(); veBc(); tb('Đã thu hồi link.'); }, function (e) { thoi(b); tb(chuLoi(e), true); });
        } },
        { chu: 'Chép link', phu: true, bam: function (b, than) { var t = than.querySelector('input'); t.select(); chep(link); tb('Đã chép link.'); } },
        { chu: 'Chép tin nhắn', bam: function (b, than) { chep(than.querySelector('.ktq-tn').value); tb('Đã chép tin nhắn.'); } }
      ]);
    }
    function chep(chu) { try { navigator.clipboard.writeText(chu); } catch (e) { var t = document.createElement('textarea'); t.value = chu; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); } }

    nen.addEventListener('click', function (e) {
      var b = e.target.closest('[data-bc]');
      if (b) {
        var v = b.getAttribute('data-bc');
        if (v === 'dong') return dong();
        if (v === 'in') return window.print();
        if (v === 'luu') return luu();
        if (v === 'gui') return guiPH(b);
        if (v === 'gv') { che = che === 'gv' ? 'ph' : 'gv'; b.textContent = che === 'gv' ? '← Bản phụ huynh' : 'Chi tiết giáo viên'; veBc(); nen.querySelector('.ktbc-cuon').scrollTop = 0; return; }
        if (v === 'nhap') { var nx = nhapNhanXet(thongKe()); BC.uuDiem = nx.uu; BC.hanChe = nx.han; doi = true; danhDau(); che = 'ph'; veBc(); return; }
      }
      var k = e.target.closest('[data-bc-kq]');
      if (k) {
        var key = k.getAttribute('data-bc-kq'), p = key.split(':'), bai = BAI.filter(function (x) { return x.code === p[0]; })[0];
        var r = ((kqCua(h, bai) || {}).review || [])[+p[1]] || {};
        var hien = dung(bai, +p[1], r);
        if (!hien === !!r.yourCorrect) delete BC.sua[key]; else BC.sua[key] = !hien;
        delete BC.loai[key];
        doi = true; danhDau(); var cu = nen.querySelector('.ktbc-cuon').scrollTop; veBc(); nen.querySelector('.ktbc-cuon').scrollTop = cu; return;
      }
      var lo = e.target.closest('[data-bc-lo]');
      if (lo) {
        var key2 = lo.getAttribute('data-bc-lo'), thu = ['dung', 'tam', 'nhe', 'nang'];
        var cl = thu.filter(function (x) { return lo.classList.contains(x); })[0] || 'nang';
        BC.loai[key2] = thu[(thu.indexOf(cl) + 1) % thu.length];
        doi = true; danhDau(); var cu2 = nen.querySelector('.ktbc-cuon').scrollTop; veBc(); nen.querySelector('.ktbc-cuon').scrollTop = cu2;
      }
    });
    // nháp nhận xét tự động, GIỌNG CHO PHỤ HUYNH: nêu ĐIỂM TỐT + NHÓM LỖI CHÍNH có đếm (chi tiết từng câu đã nằm ở bảng bên dưới)
    var NHAN_LOI = [[/chưa đúng ý|viết lại cho đúng/, 'dịch chưa đúng ý câu'], [/Thiếu mạo từ/, 'thiếu a/an'], [/Thừa mạo từ/, 'thừa a/an'], [/Sai mạo từ/, 'dùng sai a/an'],
      [/chính tả/, 'sai chính tả'], [/số ít\/nhiều|số nhiều|“s\/es”|chia động từ hiện tại/, 'số ít/số nhiều hoặc chia động từ (s/es)'], [/to be/, 'động từ “to be”'],
      [/Sai thì|trợ động từ|“will”|Thiếu “have|Thiếu “has|Thiếu “had|Thiếu “been|khả năng|thời gian/, 'thì và trợ động từ'], [/từ vựng|Sai dạng|Thiếu từ|Thừa hoặc/, 'dùng từ/cấu trúc chưa đúng']];
    function nhomLoi(r) {
      if (!r.yourText) return ['để trống câu'];
      var g = window.KTDV_BC.goiY(r.yourText, r.correctText, r.question), kq = [];
      NHAN_LOI.forEach(function (x) { if (x[0].test(g)) kq.push(x[1]); });
      return kq.length ? kq : ['dùng từ/cấu trúc chưa đúng'];
    }
    function nhapNhanXet(tk) {
      var uu = [], han = [];
      tk.forEach(function (o) {
        if (!o.k) return;
        var n = o.rv.length || o.b.n, p = o.d / n;
        if (p >= 0.8) uu.push(o.b.ten + ': con làm tốt (' + o.d + '/' + n + ' câu).');
        else if (p >= 0.5) uu.push(o.b.ten + ': con nắm được phần cơ bản (' + o.d + '/' + n + ' câu).');
        var dem = {}, sai = 0;
        o.rv.forEach(function (r, i) { if (dung(o.b, i, r)) return; sai++; nhomLoi(r).forEach(function (l) { dem[l] = (dem[l] || 0) + 1; }); });
        if (sai) {
          var top = Object.keys(dem).sort(function (x, y) { return dem[y] - dem[x]; }).slice(0, 3).map(function (l) { return l + ' (' + dem[l] + ' câu)'; });
          han.push(o.b.ten + ': chưa đúng ' + sai + '/' + n + ' câu, chủ yếu do ' + top.join(', ') + '.');
        }
      });
      if (!uu.length) uu.push('Con đã hoàn thành bài kiểm tra và làm hết các phần.');
      return { uu: uu.join('\n'), han: han.join('\n') };
    }
  }

  // ---------- bấm trong danh sách ----------
  document.addEventListener('click', function (e) {
    if (!S.khung || !S.khung.contains(e.target)) return;
    var l = e.target.closest('[data-ktq-loc]');
    if (l) { S.loc = l.getAttribute('data-ktq-loc'); return veDs(); }
    var b = e.target.closest('[data-ktq]');
    if (!b) return;
    var v = b.getAttribute('data-ktq');
    if (v === 'them') return moThem();
    if (v === 'tai') { S.ds = null; veDs(); return napHet().then(veDs); }
    var dong = b.closest('[data-ktq-ma]'), h = dong && hsTheoMa(dong.getAttribute('data-ktq-ma'));
    if (!h) return;
    if (v === 'bc') return moBaoCao(h);
    if (v === 'menu') return moMenu(b, h);
  });

  // ---------- CSS ----------
  var css = '' +
    '.ktq{font-family:var(--font)} .ktq-dau{display:flex;gap:14px;align-items:flex-start;justify-content:space-between;margin-bottom:12px}' +
    '.ktq-dau h3{margin:0;font-size:20px;font-weight:800;letter-spacing:.02em} .ktq-dau p{margin:4px 0 0;color:var(--mo);font-size:13px} .ktq-dau a{color:var(--xanh);font-weight:700}' +
    '.ktq-dau-nut{display:flex;gap:8px;flex:none}' +
    '.ktq-nut{border:0;border-radius:10px;background:var(--xanh);color:#fff;font:700 13.5px var(--font);padding:9px 16px;cursor:pointer;white-space:nowrap}' +
    '.ktq-nut:hover{filter:brightness(1.08)} .ktq-nut:disabled{opacity:.6;cursor:wait} .ktq-nut.phu{background:#EEF4F3;color:var(--chu)} .ktq-nut.do{background:#E5484D;color:#fff} .ktq-nut.phu.do{background:#FDECEC;color:#C93A3F} .ktq-nut.nho{padding:6px 12px;font-size:12.5px}' +
    '.ktq-loi{background:#FDECEC;color:#B4363B;border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:13px;font-weight:600}' +
    '.ktq-loc{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px} .ktq-loc button{border:1px solid var(--vien);background:var(--the);border-radius:999px;padding:6px 12px;font:700 12.5px var(--font);cursor:pointer;color:var(--chu)}' +
    '.ktq-loc button em{font-style:normal;color:var(--nhat);margin-left:3px} .ktq-loc button.chon{background:var(--xanh);border-color:var(--xanh);color:#fff} .ktq-loc button.chon em{color:#CFEDE7}' +
    '.ktq-trong{padding:28px;text-align:center;color:var(--nhat);font-size:14px}' +
    '.ktq-ds{display:flex;flex-direction:column;gap:8px}' +
    '.ktq-dong{display:flex;align-items:center;gap:12px;background:var(--the);border:1px solid var(--vien);border-radius:14px;padding:10px 12px}' +
    '.ktq-av{border-radius:50%;object-fit:cover;flex:none;background:#E7F2F0} .ktq-av.chu{display:inline-grid;place-items:center;color:var(--xanh);font-weight:800}' +
    '.ktq-ten{flex:1;min-width:0;display:flex;flex-direction:column} .ktq-ten b{font-size:15px} .ktq-ten span{font-size:12px;color:var(--mo);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.ktq-ten .ktq-chuyen{color:var(--xanh);font-weight:700}' +
    '.ktq-oo{display:flex;gap:6px;flex:none} .ktq-o{display:flex;flex-direction:column;align-items:center;min-width:62px;padding:4px 6px;border-radius:9px;background:#F2F6F5;color:var(--nhat);font-size:12px;font-weight:700}' +
    '.ktq-o b{font-size:11px;color:var(--mo)} .ktq-o.xong{background:var(--la-nhat);color:#1F7A50} .ktq-o.dang{background:var(--vang-nhat);color:#A86A12}' +
    '.ktq-hd{display:flex;gap:6px;flex:none}' +
    '@media(max-width:720px){.ktq-dong{flex-wrap:wrap}.ktq-oo{order:3;width:100%}.ktq-dau{flex-direction:column}}' +
    '.ktq-nen{position:fixed;inset:0;z-index:120;background:rgba(16,30,34,.45);display:grid;place-items:center;padding:16px}' +
    '.ktq-hop{background:#fff;border-radius:16px;width:min(560px,100%);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:var(--font)}' +
    '.ktq-hop-dau{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--vien)} .ktq-hop-dau h3{margin:0;font-size:16px}' +
    '.ktq-x{border:0;background:#F2F6F5;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;color:var(--mo)}' +
    '.ktq-hop-than{padding:16px 18px;overflow:auto;font-size:14px;line-height:1.5} .ktq-hop-than p{margin:0 0 10px}' +
    '.ktq-hop-chan{display:flex;gap:8px;justify-content:flex-end;padding:12px 18px;border-top:1px solid var(--vien)}' +
    '.ktq-form{display:grid;grid-template-columns:1fr 1fr;gap:10px} .ktq-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:var(--mo)}' +
    '.ktq-form input,.ktq-form select{font:600 14px var(--font);padding:9px 10px;border:1px solid var(--vien-dam);border-radius:9px;color:var(--chu)}' +
    '.ktq-form input:focus,.ktq-form select:focus{outline:2px solid var(--xanh);border-color:transparent}' +
    '@media(max-width:520px){.ktq-form{grid-template-columns:1fr}}' +
    '.ktq-mk{display:flex;gap:10px} .ktq-mk div{flex:1;background:var(--xanh-nhat);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column}' +
    '.ktq-mk span{font-size:12px;color:var(--mo);font-weight:700} .ktq-mk b{font-size:20px;letter-spacing:.04em;user-select:all}' +
    '.ktq-goi{color:var(--mo);font-size:12.5px;margin:10px 0} .ktq-tn{width:100%;font:500 13px var(--font);border:1px solid var(--vien-dam);border-radius:10px;padding:10px;resize:vertical}' +
    '.ktq-anh{display:flex;flex-direction:column;align-items:center} .ktq-anh-o{width:220px;height:220px;border-radius:50%;border:2px dashed var(--vien-dam);display:grid;place-items:center;text-align:center;color:var(--nhat);font-size:13px;cursor:pointer;overflow:hidden}' +
    '.ktq-anh-o.keo{border-color:var(--xanh);background:var(--xanh-nhat)} .ktq-anh-o img{width:100%;height:100%;object-fit:cover}' +
    '.ktq-menu{position:fixed;z-index:125;background:#fff;border:1px solid var(--vien);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.15);padding:6px;display:flex;flex-direction:column;min-width:220px}' +
    '.ktq-menu button{border:0;background:none;text-align:left;padding:9px 12px;border-radius:8px;font:600 13.5px var(--font);cursor:pointer;color:var(--chu)} .ktq-menu button:hover{background:#F2F6F5}' +
    '.ktq-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);opacity:0;transition:.25s;z-index:200;background:#16232A;color:#fff;padding:10px 16px;border-radius:10px;font:600 13.5px var(--font);max-width:90vw}' +
    '.ktq-toast.mo{opacity:1;transform:translate(-50%,0)} .ktq-toast.loi{background:#B4363B}' +
    /* báo cáo */
    '.ktbc-nen{position:fixed;inset:0;z-index:110;background:#E9EFEE;display:flex;flex-direction:column;font-family:var(--font)}' +
    '.ktbc-thanh{display:flex;align-items:center;gap:8px;padding:10px 16px;background:#fff;border-bottom:1px solid var(--vien);flex-wrap:wrap} .ktbc-thanh>b{flex:1;font-size:15px}' +
    '.ktbc-luu-tt{color:#C9832A;font-size:12px;font-weight:700}' +
    '.ktbc-cuon{flex:1;overflow:auto;padding:20px 12px}' +
    '.ktbc-trang{background:#fff;max-width:900px;margin:0 auto;padding:34px 40px;border-radius:6px;box-shadow:0 4px 24px rgba(0,0,0,.08);color:#16232A}' +
    '.ktbc-dau{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid var(--xanh);padding-bottom:10px;margin-bottom:18px}' +
    '.ktbc-logo{font-size:22px;font-weight:800;color:var(--xanh)} .ktbc-nho{font-size:11.5px;color:var(--mo)} .ktbc-tieude{font-size:17px;font-weight:800;letter-spacing:.06em}' +
    '.ktbc-hs{display:flex;align-items:center;gap:16px;margin-bottom:18px} .ktbc-hs>div:nth-child(2){flex:1} .ktbc-ten{font-size:22px;font-weight:800} .ktbc-tt{font-size:13px;color:var(--mo);margin-top:2px}' +
    '.ktbc-tong{text-align:center;background:var(--xanh-nhat);border-radius:14px;padding:10px 18px} .ktbc-tong span{display:block;font-size:12px;font-weight:700;color:var(--mo)}' +
    '.ktbc-tong b{font-size:30px;font-weight:800;color:var(--xanh)} .ktbc-tong small{font-size:15px;color:var(--mo)} .ktbc-tong em{display:block;font-style:normal;font-weight:800}' +
    '.ktbc-ba{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px}' +
    '.ktbc-o{border:1px solid var(--vien);border-radius:14px;padding:12px;text-align:center} .ktbc-o-ten{font-weight:800;font-size:13.5px;margin-bottom:6px} .ktbc-o-so{font-size:13px} .ktbc-o-so b{font-size:16px}' +
    '.ktbc-o-phu{font-size:12px;color:var(--mo)} .ktbc-o.chua{color:var(--nhat)} .ktbc-o-chua{padding:24px 0;font-size:13px}' +
    '.ktbc-muc{font-size:15px;font-weight:800;margin:22px 0 8px;color:var(--xanh);text-transform:uppercase;letter-spacing:.03em}' +
    '.ktbc-bang{width:100%;border-collapse:collapse;font-size:12.5px} .ktbc-bang th{background:#F2F6F5;text-align:left;padding:7px 8px;font-size:11.5px;color:var(--mo)}' +
    '.ktbc-bang td{padding:6px 8px;border-bottom:1px solid #EDF2F1;vertical-align:top} .ktbc-bang.tk td{text-align:center} .ktbc-bang.tk td:first-child{text-align:left;font-weight:700}' +
    '.c-dung{color:#1F7A50;font-weight:800} .c-tam{color:#2D7FB8;font-weight:800} .c-nhe{color:#B9781C;font-weight:800} .c-nang{color:#C93A3F;font-weight:800} .nhat{color:var(--nhat)}' +
    '.ktbc-pt{display:flex;flex-direction:column;gap:12px} .ktbc-pt-o{border:1px solid var(--vien);border-radius:12px;padding:10px 14px} .ktbc-pt-ten{font-weight:800;font-size:13.5px}' +
    '.ktbc-pt ul{margin:6px 0;padding-left:18px;font-size:13px;line-height:1.6} .ktbc-pt .canh{color:#B4363B} .ktbc-pt .tot{color:#1F7A50}' +
    '.ktbc-bd-chu{font-size:11px;color:var(--mo);display:flex;align-items:center;gap:4px;flex-wrap:wrap} .ktbc-bd-chu i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-left:6px}' +
    '.ktbc-nx label{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;font-weight:800;font-size:13px} .ktbc-nx textarea{font:500 13.5px var(--font);border:1px solid var(--vien-dam);border-radius:10px;padding:10px;resize:vertical;line-height:1.55}' +
    '.ktbc-nx .in-chu{display:none;white-space:pre-wrap;font-weight:500;font-size:13.5px;line-height:1.55}' +
    '.ktbc-goi{font-size:12px;color:var(--mo);margin:0 0 8px}' +
    '.ktbc-bai{margin-bottom:14px} .ktbc-bai-ten{font-weight:800;font-size:13px;margin:10px 0 4px}' +
    '.ktbc-bang.ct td:first-child{color:var(--nhat);width:26px} .ktbc-bang.ct tr.s td.bl{color:#B4363B} .ktbc-bang.ct td.da{color:#1F7A50}' +
    '.ktbc-bang .kq,.ktbc-bang .lo{border:0;border-radius:7px;padding:3px 8px;font:700 11.5px var(--font);cursor:pointer;white-space:nowrap}' +
    '.kq.d{background:var(--la-nhat);color:#1F7A50} .kq.s{background:#FDECEC;color:#C93A3F} .kq.sua{outline:2px dashed #2D7FB8}' +
    '.lo.dung{background:var(--la-nhat);color:#1F7A50} .lo.tam{background:#E6F1FA;color:#2D7FB8} .lo.nhe{background:var(--vang-nhat);color:#A86A12} .lo.nang{background:#FDECEC;color:#C93A3F}' +
    '.ktbc-bang .tg{white-space:nowrap;color:var(--mo)} .co{font-style:normal;font-size:10.5px;font-weight:800;border-radius:5px;padding:1px 5px;margin-left:3px} .co.roi{background:#FFF1DE;color:#B36A00} .co.dan{background:#FDECEC;color:#C93A3F}' +
    '.ktbc-ky{margin-top:24px;font-size:11.5px;color:var(--nhat);text-align:right}' +
    '.ktbc-trang .kqp{max-width:720px;margin:0 auto} .ktbc-ph-goi{max-width:720px;margin:0 auto 14px!important;background:#F2F6F5;border-radius:10px;padding:8px 12px;line-height:1.5}' +
    '.ktbc-ph-goi a{color:var(--xanh);font-weight:700}' +
    '.ktbc-gv{margin-left:6px;opacity:.85} .ktbc-gv-dau{margin-bottom:14px;padding:10px 14px;border-radius:10px;background:#FDF3E3;color:#8A5A12;font-size:13px} .ktbc-gv-dau b{display:block;font-size:13.5px;letter-spacing:.04em}' +
    '.ktq-lk{display:flex;gap:8px;align-items:center;margin-bottom:10px} .ktq-lk input{flex:1;min-width:0;font:700 14px var(--font);padding:10px;border:1px solid var(--vien-dam);border-radius:10px;color:var(--chu);background:#F7FAF9}' +
    '.ktq-lk a{font-weight:800;color:var(--xanh);white-space:nowrap}' +
    '@media(max-width:720px){.ktbc-trang{padding:18px 14px}.ktbc-ba{grid-template-columns:1fr}.ktbc-hs{flex-wrap:wrap}}' +
    '@media print{html.ktbc-dang-mo body>*:not(.ktbc-nen){display:none!important} html.ktbc-dang-mo body{background:#fff}' +
    ' .ktbc-nen{position:static;background:#fff;display:block} .ktbc-thanh,.khong-in{display:none!important} .ktbc-cuon{overflow:visible;padding:0}' +
    ' .ktbc-trang{box-shadow:none;max-width:none;padding:0;border-radius:0} .ktbc-nx textarea{display:none} .ktbc-nx .in-chu{display:block}' +
    ' .ktbc-bang .kq,.ktbc-bang .lo{padding:1px 4px} .ktbc-bai,.ktbc-pt-o,.ktbc-o{break-inside:avoid} .ktbc-bang tr{break-inside:avoid}' +
    ' @page{size:A4;margin:14mm 12mm}}';
  var st = document.createElement('style');
  st.textContent = css + (window.KTDV_BC ? window.KTDV_BC.css : '');
  document.head.appendChild(st);

  window.KTDV = { ve: ve, KHOA_LOP: KHOA_LOP, BAI: BAI, _test: { phanLoaiTuDong: phanLoaiTuDong, chuanCau: chuanCau } };
})();
