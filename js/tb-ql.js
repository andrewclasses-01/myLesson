/* ============================================================
   js/tb-ql.js — ⭐ v1.379.0 (20/10/2026) HỘP "THÔNG BÁO" TRÊN DASHBOARD (thầy chốt mẫu D:\OTHERS\CLAUDE\THONG BAO - thiet ke\v1 + "ok build").
   Mục cột trái "Thông báo" (tên cũ "Gửi thông báo" = đẩy ra thanh thông báo máy — nay KHÔNG dùng nữa) ⇒ window.TbQl.mo().
   Thông báo từ nay = POP-UP hiện trên TRANG CHỦ em (như quà 20-10), em bấm nút xác nhận mới tính là "đã đọc".
   · Danh sách bên trái: thumbnail (chính pop-up, ảnh tĩnh) · tên · người nhận · trạng thái · thanh % đã xác nhận.
   · Chi tiết: pop-up xem trước · trạng thái/đăng lúc/nút/thưởng · Dừng hiện|Hiện lại · Sửa · Nhân bản (· Đăng/Xoá với nháp)
     · nội dung · người nhận · 3 ô số · 2 tab Đã xác nhận / Chưa xác nhận + lọc lớp (ALL · NTx · NTKx).
   · Tạo / sửa: gửi tới ALL|Nữ|Nam × lớp (nhiều lớp; không chọn lớp = mọi lớp) · kiểu Lễ|Thường|Có ảnh · chữ · nút · thưởng sao 0–50
     · xem trước trực tiếp · Lưu nháp / Đăng. Đã đăng thì người nhận + số sao KHOÁ (chỉ sửa chữ/ảnh).
   Kho (luật tools/dang-luat-thong-bao.js): thongBao/<mã> + tbNhan/<mã>_<số HS> (em xác nhận ⇒ nhan:true; có sao ⇒ saoDot/tb_<mã>_<số>).
   Giới tính: lopThem/chung.gt (đánh dấu ở Quản lý học sinh). Số HS: hsSo/soCai. Danh sách lớp: lessonWeb/lop.
   Quà 20-10 (quaDip, js/qua-2010.js) hiện như một thông báo CŨ — chỉ xem, không sửa.
   ⛔ Dùng CHUNG cửa Firebase `AWChat.kho()`.
   ============================================================ */
(function () {
  'use strict';
  var A = window.AWC || {};
  var $ = function (s, g) { return (g || document).querySelector(s); };
  var $$ = function (s, g) { return [].slice.call((g || document).querySelectorAll(s)); };
  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var chuanMa = function (s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); };
  var MAU = ['#0E7C6E', '#3E7BFA', '#E0575B', '#F0821E', '#18A957', '#8b5cf6', '#0891b2', '#db2777', '#65a30d', '#ca8a04'];
  var CHUONG = '<svg viewBox="0 0 24 24"><path d="M12 2a6 6 0 0 0-6 6c0 7-3 9-3 9h18s-3-2-3-9a6 6 0 0 0-6-6zm-1.9 19a2 2 0 0 0 3.8 0z"/></svg>';
  var KIEU = { le: 'Lễ (hồng, bóng bay)', thuong: 'Thường', anh: 'Có ảnh' };
  function kho() { return window.AWChat && AWChat.kho ? AWChat.kho() : Promise.reject(new Error('khong-co-kho')); }
  // Tên lớp GỌN (thầy chốt): NỀN TẢNG 4 → NT4, NỀN TẢNG K10 → NTK10
  function ngan(t) {
    var m = /^N[ỀE]N\s+T[ẢA]NG\s+K(\d+)$/i.exec(String(t || '').trim()); if (m) return 'NTK' + m[1];
    m = /^N[ỀE]N\s+T[ẢA]NG\s+(\d+)$/i.exec(String(t || '').trim()); if (m) return 'NT' + m[1];
    return String(t || '');
  }
  function gio(ms) { if (!ms) return '—'; var d = new Date(ms); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ' · ' + d.getDate() + '/' + (d.getMonth() + 1); }
  function ngayGio(ms) { if (!ms) return '—'; var d = new Date(ms); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() + ' · ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function mauTen(t) { var h = 0; t = String(t || ''); for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return MAU[h % MAU.length]; }

  // Quà 20-10 (pop-up riêng js/qua-2010.js, kho quaDip) — hiện như một thông báo, CHỈ XEM.
  var CU_2010 = { id: 'q2010', cu: true, ten: 'Chúc mừng 20-10', tt: 'dang', kieu: 'le', nhan: '20 · 10', chao: "Happy Women's Day", phuDe: 'Ngày Phụ nữ Việt Nam',
    noi: 'Cảm ơn em vì đã luôn nỗ lực và chăm chỉ.\nThầy rất vui khi nhìn thấy em lớn lên\nvà tiến bộ từng ngày.\n\nMong em luôn tự tin, rạng rỡ như một bông hoa\n— và luôn được yêu thương thật nhiều.',
    ket: 'Thầy chúc em ngày 20-10 vui vẻ ❤️', nut: 'THANK YOU ❤️', sao: 10, gui: { gt: 'f', lops: [] }, dangLuc: Date.UTC(2026, 9, 20, 0, 5) };

  var S = { nap: null, lop: [], so: {}, maSo: {}, gt: {}, tb: [], nhan: {}, chon: '', tab: 'da', locLop: '', locTt: '', tim: '', loi: '' };

  // ── nạp dữ liệu ──
  function napHet() {
    S.nap = kho().then(function (f) {
      var fs = f.fs, db = f.db;
      return Promise.all([
        fs.getDoc(fs.doc(db, 'hsSo', 'soCai')),
        fs.getDoc(fs.doc(db, 'lessonWeb', 'lop')),
        fs.getDoc(fs.doc(db, 'lopThem', 'chung'))['catch'](function () { return null; }),
        fs.getDocs(fs.collection(db, 'thongBao'))
      ]).then(function (r) {
        S.so = (r[0] && r[0].exists() && r[0].data().nguoi) || {};
        S.maSo = {};
        Object.keys(S.so).forEach(function (n) {
          var P = S.so[n] || {};
          if (P.ma) S.maSo[chuanMa(P.ma)] = n;
          (P.maCu || []).forEach(function (m) { if (!S.maSo[chuanMa(m)]) S.maSo[chuanMa(m)] = n; });
        });
        var x = null;
        try { x = JSON.parse(((r[1] && r[1].data()) || {}).json || 'null'); } catch (e) { x = null; }
        S.gt = ((r[2] && r[2].exists && r[2].exists()) ? r[2].data().gt : null) || {};
        S.lop = ((x && x.lop) || []).concat((x && x.khoa) || []).filter(function (l) { return (l.hocSinh || []).length; }).map(function (l) {
          var ten = String(l.tenGoc || l.maLop);
          return { ten: ten, ma: String(l.maLop || ten), em: (l.hocSinh || []).map(function (h) {
            var k = h.ma ? chuanMa(h.ma) : '';
            return { ten: h.ten || '', ma: k, so: k ? (S.maSo[k] || '') : '', gt: k ? (S.gt[k] || '') : '' };
          }) };
        });
        S.tb = [];
        r[3].forEach(function (d) { S.tb.push(Object.assign({ id: d.id }, d.data())); });
        S.tb.push(CU_2010);
        S.tb.sort(function (a, b) { return (b.dangLuc || b.tao || 0) - (a.dangLuc || a.tao || 0); });
        return Promise.all(S.tb.map(function (t) { return napNhan(f, t); }));
      });
    })['catch'](function (e) { S.loi = (e && (e.code || e.message)) || String(e); S.nap = null; });
    return S.nap;
  }
  // Người nhận của một thông báo ⇒ S.nhan[id] = [{ t, lop, so, nhan, luc }]
  function napNhan(f, t) {
    var fs = f.fs, db = f.db, q;
    if (t.cu) q = fs.query(fs.collection(db, 'quaDip'), fs.where('dip', '==', '2010'));
    else if (t.tt === 'nhap') { S.nhan[t.id] = []; return Promise.resolve(); }
    else q = fs.query(fs.collection(db, 'tbNhan'), fs.where('tb', '==', t.id));
    return fs.getDocs(q).then(function (s) {
      var ds = [];
      s.forEach(function (d) { var x = d.data() || {}; ds.push({ id: d.id, t: x.t || '', lop: x.lop || '', so: String(x.so || ''), nhan: !!x.nhan, luc: x.nhanLuc || 0 }); });
      S.nhan[t.id] = ds;
    }, function () { S.nhan[t.id] = []; });
  }

  // ── người nhận theo bộ lọc (ALL|f|m × lớp) — mỗi em MỘT lần (theo số HS) ──
  function tinhNguoiNhan(gui) {
    var lops = (gui && gui.lops) || [], gt = (gui && gui.gt) || 'all', co = {}, ra = [], thieu = [];
    S.lop.forEach(function (l) {
      if (lops.length && lops.indexOf(l.ten) < 0) return;
      l.em.forEach(function (e) {
        if (gt !== 'all' && e.gt !== gt) return;
        if (!e.so) { thieu.push(e.ten + ' (' + l.ten + ')'); return; }
        if (co[e.so]) return;
        co[e.so] = 1;
        ra.push({ so: e.so, m: e.ma, t: e.ten, lop: l.ten });
      });
    });
    return { ds: ra, thieu: thieu };
  }
  function nhanHtml(gui) {
    var gt = (gui && gui.gt) || 'all', lops = (gui && gui.lops) || [];
    return (gt === 'f' ? '<span class="tq-the nu">Các bạn nữ</span>' : gt === 'm' ? '<span class="tq-the nam">Các bạn nam</span>' : '<span class="tq-the">Tất cả học sinh</span>') +
      (lops.length ? lops.map(function (l) { return '<span class="tq-the lop">' + E(ngan(l)) + '</span>'; }).join('') : '<span class="tq-the">Mọi lớp</span>');
  }
  function ttHtml(tt) { return '<span class="tq-tt ' + tt + '">' + ({ dang: 'Đang hiện', nhap: 'Nháp', xong: 'Đã dừng' }[tt] || tt) + '</span>'; }
  function khungPop(t, tinh) {
    var k = document.createElement('div'); k.className = 'tq-khung';
    if (window.ACTbPop) k.appendChild(ACTbPop.dung(t, { ten: 'Minh Anh' }, { trong: true, tinh: tinh }));
    return k;
  }
  function avHtml(r) {
    var chu = String(r.t || '?').trim().split(/\s+/).slice(-2).map(function (x) { return x.charAt(0); }).join('').toUpperCase();
    var url = A.avUrl ? A.avUrl(r.lop, r.t) : '';
    return '<span class="tq-av" style="background:' + mauTen(r.t) + '" data-av-em="' + E(r.t) + '" data-av-lop="' + E(r.lop) + '">' + E(chu) +
      (url ? '<img src="' + E(url) + '" alt="" onerror="this.remove()">' : '') + '</span>';
  }

  // ── khung hộp ──
  function dungHop() {
    var nen = document.createElement('div');
    nen.className = 'tq-nen'; nen.id = 'tqNen';
    nen.innerHTML = '<div class="tq-hop" role="dialog" aria-modal="true" aria-label="Thông báo">' +
      '<div class="tq-dau"><h2>' + CHUONG + 'Thông báo</h2><div class="tq-seg" id="tqLocTt"></div>' +
      '<input class="tq-tim" id="tqTim" placeholder="Tìm thông báo…" autocomplete="off">' +
      '<button type="button" class="tq-nut chinh" data-tq="tao">+ Tạo thông báo</button><button type="button" class="tq-x" data-tq="dong" title="Đóng">✕</button></div>' +
      '<div class="tq-than"><div class="tq-ds" id="tqDs"><div class="tq-rong">Đang tải…</div></div><div class="tq-ct" id="tqCt"></div></div></div>';
    document.body.appendChild(nen);
    nen.addEventListener('click', bam);
    $('#tqTim', nen).addEventListener('input', function () { S.tim = this.value.trim().toLowerCase(); veDs(); });
    var tao = document.createElement('div');
    tao.className = 'tq-tao-nen'; tao.id = 'tqTaoNen';
    document.body.appendChild(tao);
    tao.addEventListener('click', bamTao);
    tao.addEventListener('input', function () { docForm(); veXemTruoc(); });
    tao.addEventListener('change', function (e) { if (e.target.id === 'tqAnhFile') chonAnh(e.target); });
    // Ô nhập an toàn (thầy chốt 07/10): Enter = nhận ô (thôi gõ), ô số sao chỉ nhận chữ số.
    tao.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); e.target.blur(); } });
    tao.addEventListener('beforeinput', function (e) { if (e.target.id === 'tqSao' && e.data && /\D/.test(e.data)) e.preventDefault(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if ($('#tqTaoNen.mo')) { dongTao(); return; }
      if ($('#tqNen.mo')) dong();
    });
    return nen;
  }
  function mo() {
    var nen = $('#tqNen') || dungHop();
    nen.classList.add('mo');
    document.body.style.overflow = 'hidden';
    $('#tqDs').innerHTML = '<div class="tq-rong">Đang tải…</div>'; $('#tqCt').innerHTML = '';
    napHet().then(function () { if (S.loi) { $('#tqDs').innerHTML = '<div class="tq-rong">Chưa tải được (' + E(S.loi) + ') — cần phiên thầy 🔐.</div>'; return; } veHet(); });
  }
  function dong() { var n = $('#tqNen'); if (n) n.classList.remove('mo'); document.body.style.overflow = ''; }
  function veHet() {
    if (!S.chon || !S.tb.some(function (t) { return t.id === S.chon; })) S.chon = S.tb.length ? S.tb[0].id : '';
    veLocTt(); veDs(); veCt();
  }
  function veLocTt() {
    var dem = function (tt) { return S.tb.filter(function (t) { return !tt || t.tt === tt; }).length; };
    $('#tqLocTt').innerHTML = [['', 'Tất cả'], ['dang', 'Đang hiện'], ['nhap', 'Nháp'], ['xong', 'Đã dừng']].map(function (x) {
      return '<button type="button" class="tq-chip' + (S.locTt === x[0] ? ' on' : '') + '" data-tt="' + x[0] + '">' + x[1] + '<b>' + dem(x[0]) + '</b></button>';
    }).join('');
  }
  function veDs() {
    var box = $('#tqDs');
    var ds = S.tb.filter(function (t) { return (!S.locTt || t.tt === S.locTt) && (!S.tim || String(t.ten || '').toLowerCase().indexOf(S.tim) >= 0); });
    if (!ds.length) { box.innerHTML = '<div class="tq-rong">Chưa có thông báo nào — bấm “+ Tạo thông báo”.</div>'; return; }
    box.innerHTML = '';
    ds.forEach(function (t) {
      var r = S.nhan[t.id] || [], n = r.length, x = r.filter(function (h) { return h.nhan; }).length, pt = n ? Math.round(x * 100 / n) : 0;
      var o = document.createElement('div');
      o.className = 'tq-o' + (t.id === S.chon ? ' chon' : ''); o.setAttribute('data-id', t.id);
      o.innerHTML = '<div class="tq-tn"></div><div><div class="l1"><h4>' + E(t.ten || '(chưa đặt tên)') + '</h4>' + ttHtml(t.tt) + '</div>' +
        '<div class="tq-nhan">' + nhanHtml(t.gui) + '</div>' +
        (t.tt === 'nhap' ? '<div class="so"><span>Nháp · chưa gửi cho ai</span></div>' :
          '<div class="tq-thanh"><i style="width:' + pt + '%"></i></div><div class="so"><span>' + x + '/' + n + ' đã xác nhận</span><span>' + pt + '%</span></div>') + '</div>';
      $('.tq-tn', o).appendChild(khungPop(t, true));
      box.appendChild(o);
    });
  }
  function veCt() {
    var ct = $('#tqCt');
    var t = S.tb.filter(function (x) { return x.id === S.chon; })[0];
    if (!t) { ct.innerHTML = ''; return; }
    var r = S.nhan[t.id] || [], n = r.length, da = r.filter(function (h) { return h.nhan; }), chua = r.filter(function (h) { return !h.nhan; });
    var lops = []; r.forEach(function (h) { if (h.lop && lops.indexOf(h.lop) < 0) lops.push(h.lop); });
    lops.sort(function (a, b) { return a.localeCompare(b, 'vi'); });
    if (S.locLop && lops.indexOf(S.locLop) < 0) S.locLop = '';
    var ds = (S.tab === 'da' ? da : chua).filter(function (h) { return !S.locLop || h.lop === S.locLop; });
    if (S.tab === 'da') ds.sort(function (a, b) { return b.luc - a.luc; });
    else ds.sort(function (a, b) { return a.lop.localeCompare(b.lop, 'vi') || a.t.localeCompare(b.t, 'vi'); });
    var hang = ds.map(function (h) {
      return '<div class="tq-hang">' + avHtml(h) + '<div class="ten"><b>' + E(h.t) + '</b><small>' + E(ngan(h.lop)) + '</small></div><div class="lop">' + E(h.lop) + '</div>' +
        (h.nhan ? '<div class="luc la">✓ ' + gio(h.luc) + '</div>' : '<div class="luc cho">Chưa bấm</div>') + '</div>';
    }).join('') || '<div class="tq-rong">' + (t.tt === 'nhap' ? 'Thông báo nháp — chưa gửi cho ai.' : (S.tab === 'da' ? 'Chưa em nào xác nhận.' : 'Tất cả đã xác nhận 🎉')) + '</div>';
    var nut;
    if (t.cu) nut = '<div class="tq-nho">Quà 20-10 (pop-up riêng) — chỉ xem.<br>Bấm Nhân bản để làm thông báo mới giống vậy.</div><div style="display:flex;justify-content:center"><div class="tq-nhom-nut"><button type="button" class="tq-nut vien" data-tq="nhanBan">Nhân bản</button></div></div>';
    else nut = '<div style="display:flex;justify-content:center"><div class="tq-nhom-nut">' +
      (t.tt === 'dang' ? '<button type="button" class="tq-nut vien" data-tq="dung">Dừng hiện</button>' : '') +
      (t.tt === 'xong' ? '<button type="button" class="tq-nut vien" data-tq="hienLai">Hiện lại</button>' : '') +
      (t.tt === 'nhap' ? '<button type="button" class="tq-nut chinh" data-tq="dangNhap">Đăng</button>' : '') +
      '<button type="button" class="tq-nut vien" data-tq="sua">Sửa</button><button type="button" class="tq-nut vien" data-tq="nhanBan">Nhân bản</button>' +
      (t.tt === 'nhap' ? '<button type="button" class="tq-nut do" data-tq="xoa">Xoá</button>' : '') + '</div></div>';
    ct.innerHTML =
      '<div class="tq-ct-trai"><div class="tq-xem" id="tqXemCt"></div><div class="tq-nho">Pop-up học sinh thấy khi mở trang</div>' +
        '<div><div class="tq-tth"><span>Trạng thái</span>' + ttHtml(t.tt) + '</div>' +
        '<div class="tq-tth"><span>Đăng lúc</span><b>' + (t.tt === 'nhap' ? 'Chưa đăng' : ngayGio(t.dangLuc)) + '</b></div>' +
        '<div class="tq-tth"><span>Kiểu</span><b>' + E(KIEU[t.kieu] || KIEU.le) + '</b></div>' +
        '<div class="tq-tth"><span>Nút xác nhận</span><b>' + E(t.nut || 'OK') + '</b></div>' +
        '<div class="tq-tth"><span>Thưởng khi bấm</span><b>' + (t.sao ? '+' + t.sao + ' ⭐' : 'Không') + '</b></div></div>' +
        nut + '<div class="tq-bao" id="tqBaoCt"></div></div>' +
      '<div class="tq-ct-phai">' +
        '<div class="tq-ct-dau"><h3>' + E(t.ten || '(chưa đặt tên)') + '</h3>' +
          '<div class="ds-nhan"><span class="lb">Gửi tới:</span>' + nhanHtml(t.gui) + '<span class="tq-the">' + (t.tt === 'nhap' ? tinhNguoiNhan(t.gui).ds.length : n) + ' em</span></div>' +
          '<div class="noi">' + E([t.chao, t.noi, t.ket].filter(Boolean).join('\n\n')) + '</div></div>' +
        '<div class="tq-tom"><div><div class="nh">Người nhận</div><div class="gt">' + n + '</div></div>' +
          '<div><div class="nh">Đã xác nhận</div><div class="gt la">' + da.length + '<small>' + (n ? Math.round(da.length * 100 / n) : 0) + '%</small></div></div>' +
          '<div><div class="nh">Chưa xác nhận</div><div class="gt cam">' + chua.length + '</div></div></div>' +
        '<div class="tq-tabs"><button type="button" class="tq-tab' + (S.tab === 'da' ? ' on' : '') + '" data-tab="da">✓ Đã xác nhận<span class="dem">' + da.length + '</span></button>' +
          '<button type="button" class="tq-tab' + (S.tab === 'chua' ? ' on' : '') + '" data-tab="chua">Chưa xác nhận<span class="dem">' + chua.length + '</span></button></div>' +
        (lops.length > 1 ? '<div class="tq-loc"><div class="tq-seg"><button type="button" class="tq-chip' + (!S.locLop ? ' on' : '') + '" data-lop="">ALL</button>' +
          lops.map(function (l) { return '<button type="button" class="tq-chip' + (S.locLop === l ? ' on' : '') + '" data-lop="' + E(l) + '" title="' + E(l) + '">' + E(ngan(l)) + '</button>'; }).join('') + '</div></div>' : '') +
        '<div class="tq-bang">' + hang + '</div>' +
      '</div>';
    $('#tqXemCt').appendChild(khungPop(t, false));
  }

  // ── bấm trong hộp ──
  function bam(e) {
    var b;
    if (e.target === $('#tqNen')) { dong(); return; }
    if ((b = e.target.closest('.tq-o'))) { S.chon = b.getAttribute('data-id'); S.tab = 'da'; S.locLop = ''; veDs(); veCt(); return; }
    if ((b = e.target.closest('[data-tab]'))) { S.tab = b.getAttribute('data-tab'); veCt(); return; }
    if ((b = e.target.closest('[data-lop]'))) { S.locLop = b.getAttribute('data-lop'); veCt(); return; }
    if ((b = e.target.closest('[data-tt]'))) { S.locTt = b.getAttribute('data-tt'); veLocTt(); veDs(); return; }
    if (!(b = e.target.closest('[data-tq]'))) return;
    var lenh = b.getAttribute('data-tq');
    var t = S.tb.filter(function (x) { return x.id === S.chon; })[0];
    if (lenh === 'dong') return dong();
    if (lenh === 'tao') return moTao(null, false);
    if (!t) return;
    if (lenh === 'nhanBan') return moTao(t, false);
    if (lenh === 'sua') return moTao(t, true);
    if (lenh === 'dung' || lenh === 'hienLai') return doiTt(t, lenh === 'dung' ? 'xong' : 'dang', b);
    if (lenh === 'dangNhap') return dang(t, b, $('#tqBaoCt'));
    if (lenh === 'xoa') {
      if (!confirm('Xoá thông báo nháp “' + (t.ten || '') + '”?')) return;
      b.disabled = true;
      kho().then(function (f) { return f.fs.deleteDoc(f.fs.doc(f.db, 'thongBao', t.id)); }).then(function () {
        S.tb = S.tb.filter(function (x) { return x.id !== t.id; }); S.chon = ''; veHet();
      }, function (er) { b.disabled = false; $('#tqBaoCt').textContent = 'Chưa xoá được: ' + ((er && er.code) || er); });
    }
  }
  function doiTt(t, tt, b) {
    b.disabled = true;
    var goi = { tt: tt, sua: Date.now() };
    if (tt === 'xong') goi.dungLuc = Date.now();
    kho().then(function (f) { return f.fs.updateDoc(f.fs.doc(f.db, 'thongBao', t.id), goi); }).then(function () {
      Object.assign(t, goi); veLocTt(); veDs(); veCt();
    }, function (er) { b.disabled = false; $('#tqBaoCt').textContent = 'Chưa lưu được: ' + ((er && er.code) || er); });
  }

  // ── đăng: phiếu người nhận trước (từng lô 400), rồi mới đặt thông báo "Đang hiện" ──
  function dang(t, nut, bao) {
    var nn = tinhNguoiNhan(t.gui);
    if (!nn.ds.length) { bao.textContent = 'Không có em nào khớp bộ lọc người nhận.'; return Promise.resolve(false); }
    if (!confirm('Đăng “' + (t.ten || '') + '” cho ' + nn.ds.length + ' em?' + (t.sao ? '\nMỗi em bấm nút sẽ được +' + t.sao + ' sao.' : '') +
      (nn.thieu.length ? '\n\n⚠ ' + nn.thieu.length + ' em chưa có số học sinh nên bỏ qua: ' + nn.thieu.slice(0, 6).join(', ') + (nn.thieu.length > 6 ? '…' : '') : ''))) return Promise.resolve(false);
    nut.disabled = true; bao.textContent = 'Đang đăng…';
    var sao = Math.max(0, Math.min(50, Math.round(Number(t.sao) || 0)));
    return kho().then(function (f) {
      var fs = f.fs, db = f.db, lo = [], i;
      for (i = 0; i < nn.ds.length; i += 400) lo.push(nn.ds.slice(i, i + 400));
      return lo.reduce(function (p, ds) {
        return p.then(function () {
          var b = fs.writeBatch(db);
          ds.forEach(function (x) { b.set(fs.doc(db, 'tbNhan', t.id + '_' + x.so), { tb: t.id, so: x.so, m: x.m, t: x.t, lop: x.lop, sao: sao, nhan: false }); });
          return b.commit();
        });
      }, Promise.resolve()).then(function () {
        var luc = Date.now(), goi = { tt: 'dang', dangLuc: luc, sua: luc, soNhan: nn.ds.length, sao: sao };
        return fs.updateDoc(fs.doc(db, 'thongBao', t.id), goi).then(function () {
          Object.assign(t, goi);
          S.nhan[t.id] = nn.ds.map(function (x) { return { id: t.id + '_' + x.so, t: x.t, lop: x.lop, so: x.so, nhan: false, luc: 0 }; });
          bao.textContent = '';
          return true;
        });
      });
    }).then(function (ok) { nut.disabled = false; S.chon = t.id; veHet(); return ok; }, function (er) {
      nut.disabled = false; bao.textContent = 'Chưa đăng được: ' + ((er && (er.code || er.message)) || er); return false;
    });
  }

  // ── hộp TẠO / SỬA ──
  var F = null;   // { sua: bool, goc: thông báo đang sửa, tb: bản đang soạn }
  function moTao(goc, sua) {
    var tb = goc ? JSON.parse(JSON.stringify(goc)) : { kieu: 'thuong', nhan: '', chao: '', phuDe: '', noi: '', ket: '', nut: 'EM ĐÃ ĐỌC', sao: 0, anh: '', gui: { gt: 'all', lops: [] } };
    if (!sua) { delete tb.id; delete tb.cu; tb.tt = 'nhap'; if (goc) tb.ten = (goc.ten || '') + ' (bản sao)'; }
    tb.gui = tb.gui || { gt: 'all', lops: [] };
    F = { sua: !!sua, goc: goc, tb: tb };
    var khoa = sua && goc && goc.tt !== 'nhap';   // đã đăng ⇒ khoá người nhận + số sao
    var nen = $('#tqTaoNen');
    nen.innerHTML = '<div class="tq-tao" role="dialog" aria-modal="true"><div class="tq-tao-trai">' +
      '<h3>' + (sua ? 'Sửa thông báo' : 'Tạo thông báo mới') + '<button type="button" class="tq-x" data-tt-lenh="dong">✕</button></h3>' +
      '<div class="tq-truong"><label>Gửi tới' + (khoa ? ' (đã đăng — khoá)' : '') + '</label><div class="tq-hang-chon">' +
        '<div class="tq-seg" id="tqGt">' + [['all', 'ALL'], ['f', 'Nữ', 'nu'], ['m', 'Nam', 'nam']].map(function (x) {
          return '<button type="button" class="tq-chip ' + (x[2] || '') + (tb.gui.gt === x[0] ? ' on' : '') + '" data-gt="' + x[0] + '"' + (khoa ? ' disabled' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>' +
        '<div class="tq-seg" id="tqLops">' + S.lop.map(function (l) {
          return '<button type="button" class="tq-chip' + (tb.gui.lops.indexOf(l.ten) >= 0 ? ' on' : '') + '" data-l="' + E(l.ten) + '" title="' + E(l.ten) + '"' + (khoa ? ' disabled' : '') + '>' + E(ngan(l.ten)) + '</button>'; }).join('') + '</div>' +
      '</div><div class="tq-goi-y">Không chọn lớp = mọi lớp. Nữ/Nam + lớp = chỉ bạn nữ/nam trong các lớp đã chọn.</div></div>' +
      '<div class="tq-hai"><div class="tq-truong"><label>Tiêu đề (chỉ thầy thấy)</label><input class="tq-o" id="tqTen" maxlength="80" value="' + E(tb.ten || '') + '" placeholder="VD: Lịch nghỉ 25/10"></div>' +
        '<div class="tq-truong"><label>Kiểu pop-up</label><div class="tq-seg" id="tqKieu">' + ['le', 'thuong', 'anh'].map(function (k) {
          return '<button type="button" class="tq-chip' + (tb.kieu === k ? ' on' : '') + '" data-k="' + k + '">' + { le: '💗 Lễ', thuong: '📢 Thường', anh: '🖼️ Có ảnh' }[k] + '</button>'; }).join('') + '</div></div></div>' +
      '<div class="tq-truong" id="tqAnhTr"' + (tb.kieu === 'anh' ? '' : ' hidden') + '><label>Ảnh</label><div class="tq-anh-chon">' + (tb.anh ? '<img src="' + E(tb.anh) + '" alt="">' : '') +
        '<input type="file" id="tqAnhFile" accept="image/*"></div><div class="tq-goi-y">Ảnh tự nén nhỏ trước khi lưu.</div></div>' +
      '<div class="tq-ba"><div class="tq-truong"><label>Nhãn nhỏ</label><input class="tq-o" id="tqNhan" maxlength="20" value="' + E(tb.nhan || '') + '" placeholder="VD: 20 · 10"></div>' +
        '<div class="tq-truong"><label>Dòng chào lớn</label><input class="tq-o" id="tqChao" maxlength="60" value="' + E(tb.chao || '') + '" placeholder="VD: Thông báo nghỉ học"></div>' +
        '<div class="tq-truong"><label>Dòng phụ</label><input class="tq-o" id="tqPhuDe" maxlength="60" value="' + E(tb.phuDe || '') + '"></div></div>' +
      '<div class="tq-truong"><label>Lời nhắn</label><textarea class="tq-o" id="tqNoi" maxlength="1200" placeholder="Dòng trống = đoạn mới. {ten} = tên em.">' + E(tb.noi || '') + '</textarea></div>' +
      '<div class="tq-ba"><div class="tq-truong"><label>Câu kết</label><input class="tq-o" id="tqKet" maxlength="80" value="' + E(tb.ket || '') + '"></div>' +
        '<div class="tq-truong"><label>Chữ trên nút xác nhận</label><input class="tq-o" id="tqNut" maxlength="30" value="' + E(tb.nut || '') + '"></div>' +
        '<div class="tq-truong"><label>Thưởng sao khi bấm' + (khoa ? ' (khoá)' : '') + '</label><input class="tq-o" id="tqSao" type="text" inputmode="numeric" maxlength="2" value="' + (Number(tb.sao) || 0) + '"' + (khoa ? ' disabled' : '') + '><div class="tq-goi-y">0 = không thưởng</div></div></div>' +
      '</div><div class="tq-tao-phai"><div class="tq-xem" id="tqXemTao"></div><div class="tq-nho">Xem trước trên điện thoại</div></div>' +
      '<div class="tq-tao-chan"><div><div class="tong" id="tqTong"></div><div class="tq-bao" id="tqBaoTao"></div></div><div style="display:flex;gap:8px">' +
        (khoa ? '<button type="button" class="tq-nut chinh" data-tt-lenh="luu">Lưu sửa</button>'
          : '<button type="button" class="tq-nut xam" data-tt-lenh="nhap">Lưu nháp</button><button type="button" class="tq-nut chinh" data-tt-lenh="dang">Đăng thông báo</button>') +
      '</div></div></div>';
    nen.classList.add('mo');
    veXemTruoc();
  }
  function dongTao() { $('#tqTaoNen').classList.remove('mo'); F = null; }
  function docForm() {
    if (!F) return;
    var g = function (id) { var x = $('#' + id); return x ? x.value : ''; };
    F.tb.ten = g('tqTen').trim(); F.tb.nhan = g('tqNhan').trim(); F.tb.chao = g('tqChao').trim(); F.tb.phuDe = g('tqPhuDe').trim();
    F.tb.noi = g('tqNoi'); F.tb.ket = g('tqKet').trim(); F.tb.nut = g('tqNut').trim();
    var s = Math.round(Number(g('tqSao')) || 0); F.tb.sao = Math.max(0, Math.min(50, s));
  }
  function veXemTruoc() {
    if (!F) return;
    var x = $('#tqXemTao'); if (!x) return;
    x.innerHTML = ''; x.appendChild(khungPop(F.tb, true));
    var nn = tinhNguoiNhan(F.tb.gui);
    $('#tqTong').innerHTML = F.sua && F.goc && F.goc.tt !== 'nhap' ? 'Đã gửi tới <b>' + (S.nhan[F.goc.id] || []).length + ' em</b>'
      : 'Sẽ hiện cho <b>' + nn.ds.length + ' em</b> khi các em mở trang' + (nn.thieu.length ? ' · ⚠ ' + nn.thieu.length + ' em chưa có số HS' : '');
  }
  function bamTao(e) {
    var b;
    if (e.target.id === 'tqTaoNen') { dongTao(); return; }
    if ((b = e.target.closest('[data-gt]')) && !b.disabled) { F.tb.gui.gt = b.getAttribute('data-gt'); $$('#tqGt .tq-chip').forEach(function (c) { c.classList.toggle('on', c === b); }); veXemTruoc(); return; }
    if ((b = e.target.closest('[data-l]')) && !b.disabled) {
      var l = b.getAttribute('data-l'), i = F.tb.gui.lops.indexOf(l);
      if (i >= 0) F.tb.gui.lops.splice(i, 1); else F.tb.gui.lops.push(l);
      b.classList.toggle('on', i < 0); veXemTruoc(); return;
    }
    if ((b = e.target.closest('[data-k]'))) {
      F.tb.kieu = b.getAttribute('data-k'); $$('#tqKieu .tq-chip').forEach(function (c) { c.classList.toggle('on', c === b); });
      $('#tqAnhTr').hidden = F.tb.kieu !== 'anh'; veXemTruoc(); return;
    }
    if (!(b = e.target.closest('[data-tt-lenh]'))) return;
    var lenh = b.getAttribute('data-tt-lenh'), bao = $('#tqBaoTao');
    if (lenh === 'dong') return dongTao();
    docForm();
    var tb = F.tb;
    if (!tb.ten) { bao.textContent = 'Thầy đặt tiêu đề trước nhé.'; return; }
    if (!String(tb.noi || '').trim() && !tb.chao) { bao.textContent = 'Thầy gõ lời nhắn (hoặc dòng chào) trước nhé.'; return; }
    if (tb.kieu === 'anh' && !tb.anh) { bao.textContent = 'Kiểu “Có ảnh” cần chọn ảnh.'; return; }
    if (!tb.nut) tb.nut = 'EM ĐÃ ĐỌC';
    var noiDung = { ten: tb.ten, kieu: tb.kieu, nhan: tb.nhan, chao: tb.chao, phuDe: tb.phuDe, noi: tb.noi, ket: tb.ket, nut: tb.nut, anh: tb.anh || '', sua: Date.now() };
    b.disabled = true; bao.textContent = 'Đang lưu…';
    kho().then(function (f) {
      var fs = f.fs, db = f.db;
      if (lenh === 'luu') return fs.updateDoc(fs.doc(db, 'thongBao', F.goc.id), noiDung).then(function () { Object.assign(F.goc, noiDung); return F.goc; });
      var id = (F.sua && F.goc && F.goc.id) || ('t' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
      var doc = Object.assign({}, noiDung, { tt: 'nhap', sao: tb.sao, gui: { gt: tb.gui.gt, lops: tb.gui.lops.slice() }, tao: (F.goc && F.sua && F.goc.tao) || Date.now() });
      return fs.setDoc(fs.doc(db, 'thongBao', id), doc).then(function () {
        var cu = S.tb.filter(function (x) { return x.id === id; })[0];
        var moi = Object.assign(cu || {}, doc, { id: id });
        if (!cu) S.tb.unshift(moi);
        S.nhan[id] = S.nhan[id] || [];
        return moi;
      });
    }).then(function (t) {
      S.chon = t.id;
      if (lenh === 'dang') {
        return dang(t, b, bao).then(function (ok) { if (ok) dongTao(); else { b.disabled = false; veHet(); } });
      }
      dongTao(); veHet();
    }, function (er) { b.disabled = false; bao.textContent = 'Chưa lưu được: ' + ((er && (er.code || er.message)) || er); });
  }
  // Ảnh: nén về tối đa 1000px, JPEG 0,8 (≤ ~250 KB) — lưu thẳng trong thông báo.
  function chonAnh(inp) {
    var file = inp.files && inp.files[0]; if (!file || !F) return;
    var rd = new FileReader();
    rd.onload = function () {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1000 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var q = 0.8, url = c.toDataURL('image/jpeg', q);
        while (url.length > 350000 && q > 0.4) { q -= 0.1; url = c.toDataURL('image/jpeg', q); }
        F.tb.anh = url;
        var ch = $('.tq-anh-chon'); var cu = $('img', ch); if (cu) cu.remove();
        ch.insertAdjacentHTML('afterbegin', '<img src="' + url + '" alt="">');
        veXemTruoc();
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  }

  window.TbQl = { mo: mo };
})();
