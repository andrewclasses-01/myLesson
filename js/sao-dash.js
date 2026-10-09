/* ============================================================
   sao-dash.js — HỘP "SAO HỌC SINH" TRÊN DASHBOARD (10/10/2026, thầy chốt bản mẫu v3 + "ok build").
   Thiết kế: D:\OTHERS\CLAUDE\THIET KE THUONG SAO.md mục 4.1 · mẫu "MAU THUONG SAO v3 - dashboard.html".

   Mở từ mục "Sao" ở cột trái (js/nw-thanh.js ⇒ window.SaoDash.mo()).
   · Bảng học sinh theo lớp: ảnh · tên · số HS · sao đang có · cộng tuần này · nút + / − · lịch sử.
   · + / − ⇒ hộp chọn số sao + LÝ DO BẮT BUỘC (em thấy dòng này trong lịch sử ví) ⇒ tạo PHIẾU SAO `saoDot`
     (nguon 'dashboard'); hàm máy chủ `apDotSao` cộng/trừ ví + đẩy thông báo (chỉ khi cộng). Trừ chỉ làm được ở ĐÂY.
   · LÝ DO NHANH (mỗi lý do có số sao mặc định) — mở bằng BẤM ĐÚP ngôi sao cạnh chữ "Sao học sinh" (thầy chốt:
     nút ẩn) hoặc chip "⚙ Sửa lý do" trong hộp cộng/trừ. Lưu `saoCaiDat/chung.lyDo`.
   · Cột phải: Buổi chưa chốt (rổ tạm `saoBuoi` còn lượt — chốt ở myTeam) · Cài đặt (trần sao/em/buổi, báo em) ·
     Ghi gần đây (phiếu 7 ngày).
   Chi phí đọc mỗi lần mở: hsSo/soCai + saoTong/chung + lessonWeb/lop + saoCaiDat + phiếu 7 ngày + rổ còn lượt.
   ⛔ Dùng CHUNG cửa Firebase `AWChat.kho()` (đừng initializeApp lần nữa).
   ⛔ Ô số: cuộn chuột KHÔNG đổi số, Enter = nhận ô (luật "ô nhập số liệu an toàn" 07/10).
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

  var S = { lop: [], so: {}, maSo: {}, vi: {}, tuan: {}, gan: [], buoi: [], cai: { tran: 30, baoHs: true, lyDo: null }, chon: '', tim: '', nap: null };
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
        fs.getDocs(fs.query(fs.collection(db, 'saoDot'), fs.where('tao', '>=', tuan)))['catch'](function () { return null; }),
        fs.getDocs(fs.collection(db, 'saoBuoi'))['catch'](function () { return null; })
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
        S.lop = ((x && x.lop) || []).filter(function (l) { return (l.hocSinh || []).length; }).map(function (l) {
          return { ma: maLop(l.maLop || l.tenGoc), ten: String(l.tenGoc || l.maLop), slug: l.tenGoc || l.maLop,
            em: (l.hocSinh || []).map(function (h) { return { ten: h.ten, ma: chuanMa(h.ma), so: S.maSo[chuanMa(h.ma)] || null }; }) };
        });
        if (!S.chon && S.lop.length) S.chon = S.lop[0].ma;
        var c = (r[3] && r[3].exists && r[3].exists()) ? r[3].data() : {};
        S.cai = { tran: Number(c.tran) > 0 ? Number(c.tran) : 30, baoHs: c.baoHs !== false,
          lyDo: (c.lyDo && Array.isArray(c.lyDo.cong)) ? c.lyDo : JSON.parse(JSON.stringify(LYDO_GOC)) };
        S.tuan = {}; S.gan = [];
        if (r[4]) r[4].forEach(function (d) {
          var p = d.data() || {};
          S.gan.push(Object.assign({ id: d.id }, p));
          if (!p.xong) return;
          (p.dong || []).forEach(function (l) { if (Number(l.n) > 0) S.tuan[l.so] = (S.tuan[l.so] || 0) + Number(l.n); });
        });
        S.gan.sort(function (a, b) { return (b.tao || 0) - (a.tao || 0); });
        S.buoi = [];
        if (r[5]) r[5].forEach(function (d) {
          if (d.id === '_hienTai' || d.id.indexOf('ZTEST') === 0) return;
          var b = d.data() || {};
          var luot = (b.luot || []).filter(function (l) { return l.loai !== 'doiHinh'; });
          if (!luot.length) return;
          var tam = luot.reduce(function (a, l) { return a + (Number(l.n) || 0) * ((l.nguoi || []).length); }, 0);
          var em = {}; luot.forEach(function (l) { (l.nguoi || []).forEach(function (n) { em[n] = 1; }); });
          S.buoi.push({ id: d.id, lop: b.lop || d.id.split('_')[0], ngay: b.ngay || d.id.split('_').pop(), tam: tam,
            soEm: Object.keys(em).length, app: Array.from(new Set(luot.map(function (l) { return l.app; }))), luot: luot });
        });
        S.buoi.sort(function (a, b) { return b.ngay < a.ngay ? -1 : 1; });
      });
    });
    return S.nap;
  }

  // ── khung hộp ───────────────────────────────────────────────────────────────────────────
  function dungKhung() {
    if ($('#sdNen')) return $('#sdNen');
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = 'css/sao-dash.css?v=1';
    document.head.appendChild(l);
    var nen = document.createElement('div');
    nen.id = 'sdNen'; nen.className = 'sd-nen';
    nen.innerHTML = '<div class="sd-hop" role="dialog" aria-modal="true">' +
      '<div class="sd-dau">' +
        '<h2><span class="sd-sao-an" title="">' + SAO_SVG + '</span>Sao học sinh</h2>' +
        '<div class="sd-chip-lop"></div>' +
        '<input class="sd-tim" placeholder="Tìm tên / số HS…">' +
        '<button class="sd-x" type="button" title="Đóng">✕</button>' +
      '</div>' +
      '<div class="sd-than"><div class="sd-giua"></div><aside class="sd-phai"></aside></div>' +
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
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nen.classList.contains('mo') && !document.querySelector('.sd-pop')) dong();
    });
    return nen;
  }
  function mo() {
    var nen = dungKhung();
    nen.classList.add('mo');
    document.body.style.overflow = 'hidden';
    $('.sd-giua', nen).innerHTML = '<div class="sd-trong">Đang đọc ví sao…</div>';
    $('.sd-phai', nen).innerHTML = '';
    napHet().then(veHet)['catch'](function (e) {
      var m = String((e && (e.code || e.message)) || e);
      $('.sd-giua', nen).innerHTML = '<div class="sd-trong">' + (m.indexOf('permission') >= 0
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
  function veHet() {
    var nen = $('#sdNen');
    $('.sd-chip-lop', nen).innerHTML = S.lop.map(function (l) {
      return '<button type="button" class="sd-chip' + (l.ma === S.chon ? ' on' : '') + '" data-lop="' + esc(l.ma) + '">' + esc(l.ten) + '</button>';
    }).join('');
    Array.prototype.forEach.call(nen.querySelectorAll('.sd-chip-lop .sd-chip'), function (b) {
      b.onclick = function () { S.chon = b.getAttribute('data-lop'); veHet(); };
    });
    var L = lopChon() || { em: [], ten: '' };
    var tongLop = 0, tuanLop = 0;
    L.em.forEach(function (e) { if (e.so) { tongLop += Number((S.vi[e.so] || {}).s) || 0; tuanLop += S.tuan[e.so] || 0; } });
    var tamTong = S.buoi.reduce(function (a, b) { return a + b.tam; }, 0);
    $('.sd-giua', nen).innerHTML =
      '<div class="sd-so-tom">' +
        '<div class="sd-the"><div class="nh">Sao đang có · lớp ' + esc(L.ten) + '</div><div class="gt">' + tongLop.toLocaleString('vi') + '</div><div class="phu">' + L.em.length + ' học sinh</div></div>' +
        '<div class="sd-the"><div class="nh">Cộng 7 ngày qua</div><div class="gt xanh">+' + tuanLop + '</div><div class="phu">lớp ' + esc(L.ten) + '</div></div>' +
        '<div class="sd-the"><div class="nh">Buổi chưa chốt</div><div class="gt vang">' + S.buoi.length + '</div><div class="phu">còn ' + tamTong + ' ⭐ trong rổ tạm</div></div>' +
      '</div>' +
      '<div class="sd-the sd-bang-boc"><table class="sd-bang"><thead><tr><th>Học sinh</th><th>Số HS</th><th>Sao đang có</th><th>7 ngày</th>' +
        '<th class="giua">Cộng / trừ</th><th></th></tr></thead><tbody></tbody></table></div>';
    veBang();
    vePhai();
  }
  function veBang() {
    var nen = $('#sdNen'); if (!nen) return;
    var tb = $('.sd-bang tbody', nen); if (!tb) return;
    var L = lopChon() || { em: [] };
    var k = String(S.tim || '').trim().toLowerCase();
    var ds = L.em.filter(function (e) { return !k || String(e.ten).toLowerCase().indexOf(k) >= 0 || String(e.so || '').indexOf(k) >= 0; });
    tb.innerHTML = ds.length ? ds.map(function (e, i) {
      var v = e.so ? (Number((S.vi[e.so] || {}).s) || 0) : null;
      return '<tr><td><div class="sd-ten">' + avHtml(L, e.ten, i) + '<span>' + esc(e.ten) + '<small>' + esc(L.ten) + '</small></span></div></td>' +
        '<td class="mo">' + (e.so ? esc(e.so) : '<span class="cam">chưa có số</span>') + '</td>' +
        '<td class="so-sao">' + (v == null ? '—' : '⭐ ' + v) + '</td>' +
        '<td class="tuan">' + (e.so && S.tuan[e.so] ? '+' + S.tuan[e.so] : '') + '</td>' +
        '<td class="giua nut-cot">' + (e.so ? '<button class="sd-pm cong" data-so="' + e.so + '" data-d="1" title="Cộng sao">+</button> ' +
          '<button class="sd-pm tru" data-so="' + e.so + '" data-d="-1" title="Trừ sao">−</button>' : '') + '</td>' +
        '<td>' + (e.so ? '<span class="sd-lk" data-ls="' + e.so + '">Lịch sử</span>' : '') + '</td></tr>';
    }).join('') : '<tr><td colspan="6"><div class="sd-trong">Không có học sinh khớp.</div></td></tr>';
    Array.prototype.forEach.call(tb.querySelectorAll('.sd-pm'), function (b) {
      b.onclick = function () { moCongTru(b.getAttribute('data-so'), Number(b.getAttribute('data-d'))); };
    });
    Array.prototype.forEach.call(tb.querySelectorAll('[data-ls]'), function (b) {
      b.onclick = function () { moLichSu(b.getAttribute('data-ls')); };
    });
    if (A.deAvatarKho) { try { A.deAvatarKho(tb); } catch (e) { /* thiếu ảnh: giữ chữ tắt */ } }
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
    p.innerHTML =
      '<div class="sd-the"><h3>🧺 Buổi chưa chốt</h3>' + (S.buoi.length ? S.buoi.map(function (b) {
        return '<div class="sd-buoi"><div class="l1"><span>' + esc(b.lop) + ' · ' + esc(b.ngay.slice(8, 10) + '/' + b.ngay.slice(5, 7)) + '</span><span>' + b.tam + ' ⭐</span></div>' +
          '<div class="l2">' + b.soEm + ' em · từ ' + esc(b.app.join(', ')) + (b.ngay < ngayVN() ? ' · ⚠ quên chốt' : '') + '</div>' +
          '<button class="sd-nut xam" type="button" data-buoi="' + esc(b.id) + '">Xem chi tiết</button></div>';
      }).join('') : '<div class="sd-trong nho">Không còn buổi nào chưa chốt.</div>') +
      '<div class="sd-ghi-chu">Chốt sao ở <b>myTeam</b> (nút ⭐↑ cuối giờ).</div></div>' +
      '<div class="sd-the"><h3>⚙️ Cài đặt</h3>' +
        '<div class="sd-cai">Trần sao mỗi em / buổi <input type="number" class="sd-tran" min="1" max="200" value="' + S.cai.tran + '"></div>' +
        '<label class="sd-cai">Báo học sinh khi có sao mới <input type="checkbox" class="sd-bao"' + (S.cai.baoHs ? ' checked' : '') + '></label>' +
        '<div class="sd-ghi-chu">Vượt trần ⇒ màn chốt ở myTeam báo, thầy xác nhận mới ghi.</div>' +
        '<div class="sd-cai-tin"></div></div>' +
      '<div class="sd-the"><h3>🕘 Ghi gần đây</h3>' + (S.gan.length ? S.gan.slice(0, 10).map(function (d) {
        var n = (d.dong || []).reduce(function (a, l) { return a + (Number(l.n) || 0); }, 0);
        var em = (d.dong || []).length;
        var t = new Date(d.tao || 0);
        var gio = ('0' + t.getDate()).slice(-2) + '/' + ('0' + (t.getMonth() + 1)).slice(-2) + ' ' + ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
        var mo = d.nguon === 'dashboard'
          ? 'Thầy <b class="' + (n < 0 ? 'do' : 'la') + '">' + (n > 0 ? '+' : '') + n + '</b> ' + esc(em === 1 ? tenTheoSo(d.dong[0].so) : em + ' em') + ' · "' + esc((d.dong[0] || {}).viec || '') + '"'
          : 'Chốt ' + esc(d.nhom || d.lop || '') + ' · <b class="la">+' + n + ' ⭐</b>';
        return '<div class="sd-nk"><b>' + gio + '</b> · ' + mo + (d.xong ? '' : ' <span class="cam">(máy chủ chưa áp)</span>') + '<br><small>' + esc(d.nguon || '') + '</small></div>';
      }).join('') : '<div class="sd-trong nho">Chưa có phiếu nào trong 7 ngày.</div>') + '</div>';
    Array.prototype.forEach.call(p.querySelectorAll('[data-buoi]'), function (b) {
      b.onclick = function () { moBuoi(b.getAttribute('data-buoi')); };
    });
    var tran = $('.sd-tran', p), bao = $('.sd-bao', p);
    tran.addEventListener('wheel', function (e) { e.preventDefault(); tran.blur(); }, { passive: false });
    tran.addEventListener('keydown', function (e) { if (e.key === 'Enter') tran.blur(); });
    tran.addEventListener('change', function () {
      var v = Math.max(1, Math.min(200, Math.round(Number(tran.value) || 30))); tran.value = v; luuCai({ tran: v })['catch'](function () { });
    });
    bao.addEventListener('change', function () { luuCai({ baoHs: bao.checked })['catch'](function () { }); });
  }
  function luuCai(thay) {
    var tin = $('#sdNen .sd-cai-tin');
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
  function hopNoi(html, rong) {
    var nen = document.createElement('div');
    nen.className = 'sd-pop';
    nen.innerHTML = '<div class="sd-pop-hop' + (rong ? ' rong' : '') + '">' + html + '</div>';
    document.body.appendChild(nen);
    var dongPop = function () { nen.remove(); };
    nen.addEventListener('click', function (e) { if (e.target === nen) dongPop(); });
    var phim = function (e) { if (e.key === 'Escape') { dongPop(); document.removeEventListener('keydown', phim, true); e.stopPropagation(); } };
    document.addEventListener('keydown', phim, true);
    return { el: nen, dong: function () { document.removeEventListener('keydown', phim, true); dongPop(); } };
  }

  // ── + / − ─────────────────────────────────────────────────────────────────────────────────
  function moCongTru(so, dau) {
    var ten = tenTheoSo(so);
    var co = Number((S.vi[so] || {}).s) || 0;
    var ly = dau > 0 ? S.cai.lyDo.cong : S.cai.lyDo.tru;
    var n = 1;
    var h = hopNoi('<h3>' + (dau > 0 ? 'Cộng' : 'Trừ') + ' sao · ' + esc(ten) + '</h3>' +
      '<div class="sd-mo">Đang có ⭐ ' + co + ' · số HS ' + esc(so) + '</div>' +
      '<div class="sd-dem"><button type="button" data-d="-1">−</button><span class="s ' + (dau > 0 ? 'la' : 'do') + '">' + (dau > 0 ? '+' : '−') + '<b>1</b></span><button type="button" data-d="1">+</button></div>' +
      '<div class="sd-ly">' + ly.map(function (x, j) {
        return '<button type="button" class="sd-chip ' + (dau > 0 ? 'cong' : 'tru') + '-chip" data-j="' + j + '">' + esc(x.t) + '<b>' + (dau > 0 ? '+' : '−') + x.n + '</b></button>';
      }).join('') + '<button type="button" class="sd-chip vien" data-sua>⚙ Sửa lý do</button></div>' +
      '<textarea class="sd-lydo" maxlength="120" placeholder="Lý do (bắt buộc — em sẽ thấy dòng này trong lịch sử ví)"></textarea>' +
      (dau < 0 ? '<div class="sd-canh">Trừ sao chỉ làm được ở dashboard. Các app trên lớp không bao giờ trừ.</div>' : '') +
      '<div class="sd-tin"></div>' +
      '<div class="sd-cuoi"><button class="sd-nut xam" type="button" data-x>Huỷ</button><button class="sd-nut ' + (dau > 0 ? 'xanh' : 'vang') + '" type="button" data-ok>' + (dau > 0 ? 'Cộng' : 'Trừ') + ' sao</button></div>');
    var el = h.el, ta = $('.sd-lydo', el);
    var ve = function () { $('.sd-dem b', el).textContent = n; };
    Array.prototype.forEach.call(el.querySelectorAll('.sd-dem button'), function (b) {
      b.onclick = function () { n = Math.max(1, Math.min(50, n + Number(b.getAttribute('data-d')))); ve(); };
    });
    Array.prototype.forEach.call(el.querySelectorAll('.sd-ly [data-j]'), function (c) {
      c.onclick = function () {
        var x = ly[Number(c.getAttribute('data-j'))]; ta.value = x.t; n = x.n; ve();
        Array.prototype.forEach.call(el.querySelectorAll('.sd-ly .sd-chip'), function (o) { o.classList.toggle('on', o === c); });
      };
    });
    $('[data-sua]', el).onclick = function () { h.dong(); moLyDo(); };
    $('[data-x]', el).onclick = h.dong;
    $('[data-ok]', el).onclick = function () {
      var lyDo = ta.value.trim();
      if (!lyDo) { ta.classList.add('loi'); ta.focus(); return; }
      var nut = this; nut.disabled = true;
      $('.sd-tin', el).textContent = 'Đang ghi…';
      var L = lopChon();
      var phieu = { nguon: 'dashboard', lop: (S.vi[so] || {}).l || (L && L.ma) || '', ngay: ngayVN(),
        nhom: dau > 0 ? 'Thầy Andrew thưởng' : 'Thầy Andrew điều chỉnh', ai: 'Thầy Andrew',
        dong: [{ so: so, n: dau * n, viec: lyDo, app: 'dashboard' }], tao: Date.now() };
      kho().then(function (f) {
        return f.fs.addDoc(f.fs.collection(f.db, 'saoDot'), phieu).then(function (r) { return choXong(f, r.id); });
      }).then(function (xong) {
        h.dong();
        if (!xong) baoNho('Đã gửi phiếu — máy chủ sẽ cộng vào ví trong ít phút.');
        return napHet().then(veHet);
      })['catch'](function (e) {
        nut.disabled = false;
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
    var t = document.createElement('div'); t.className = 'sd-toast'; t.textContent = chu;
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

  // ── chi tiết buổi chưa chốt ─────────────────────────────────────────────────────────────
  function moBuoi(id) {
    var b = null; S.buoi.forEach(function (x) { if (x.id === id) b = x; });
    if (!b) return;
    var h = hopNoi('<h3>🧺 Rổ sao tạm · ' + esc(b.lop) + ' · ' + esc(b.ngay) + '</h3><div class="sd-mo">' + b.tam + ' ⭐ · ' + b.soEm + ' em — chốt ở myTeam (nút ⭐↑).</div>' +
      '<div class="sd-ls">' + b.luot.slice().sort(function (x, y) { return (y.luc || 0) - (x.luc || 0); }).map(function (l) {
        var t = new Date(l.luc || 0);
        var ai = l.loai === 'doi' ? 'TEAM ' + (Number(l.doi) + 1) + ' · ' + (l.nguoi || []).length + ' em' : (l.nguoi || []).map(tenTheoSo).join(', ');
        return '<div class="sd-ls-dong"><span class="ng">' + ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2) + '</span>' +
          '<span class="vc"><b>' + esc(ai) + '</b><small>' + esc(l.lyDo || '') + ' · ' + esc(l.app || '') + '</small></span><span class="sv la">+' + l.n + '</span></div>';
      }).join('') + '</div><div class="sd-cuoi"><button class="sd-nut xam" type="button" data-x>Đóng</button></div>', true);
    $('[data-x]', h.el).onclick = h.dong;
  }

  // ── LÝ DO NHANH ─────────────────────────────────────────────────────────────────────────
  function moLyDo() {
    var nhap = JSON.parse(JSON.stringify(S.cai.lyDo || LYDO_GOC));
    var h = hopNoi('<h3>⚙️ Lý do nhanh</h3>' +
      '<div class="sd-mo">Các nút bấm sẵn trong hộp cộng/trừ sao. Mỗi lý do có <b>số sao mặc định</b> — bấm là điền luôn lý do + số sao (vẫn sửa tay được).</div>' +
      '<div class="sd-cl2"><div class="sd-cl-cot cong" data-k="cong"></div><div class="sd-cl-cot tru" data-k="tru"></div></div>' +
      '<div class="sd-ghi-chu">Lưu vào kho chung — dashboard ở máy nào cũng thấy cùng một bộ lý do.</div><div class="sd-tin"></div>' +
      '<div class="sd-cuoi gian"><button class="sd-nut xam" type="button" data-goc>Khôi phục mặc định</button>' +
      '<span><button class="sd-nut xam" type="button" data-x>Huỷ</button> <button class="sd-nut xanh" type="button" data-ok>Lưu</button></span></div>', true);
    var el = h.el;
    function ve() {
      Array.prototype.forEach.call(el.querySelectorAll('.sd-cl-cot'), function (c) {
        var k = c.getAttribute('data-k'), ds = nhap[k], dau = k === 'cong' ? '+' : '−';
        c.innerHTML = '<h4>' + (k === 'cong' ? '➕ Lý do CỘNG sao' : '➖ Lý do TRỪ sao') + ' <small>(' + ds.length + ')</small></h4>' +
          ds.map(function (l, j) {
            return '<div class="sd-cl-dong" data-j="' + j + '"><span class="keo"><button type="button" data-len title="Lên">▲</button><button type="button" data-xuong title="Xuống">▼</button></span>' +
              '<input data-t value="' + esc(l.t) + '" placeholder="Tên lý do" maxlength="40"><span class="sn"><span>' + dau + '</span><input data-n type="number" min="1" max="50" value="' + l.n + '"></span>' +
              '<button type="button" class="xoa" data-xoa title="Xoá">✕</button></div>';
          }).join('') + '<button type="button" class="sd-cl-them" data-them>+ Thêm lý do</button>';
        Array.prototype.forEach.call(c.querySelectorAll('.sd-cl-dong'), function (d) {
          var j = Number(d.getAttribute('data-j'));
          var ot = $('[data-t]', d), on = $('[data-n]', d);
          ot.oninput = function () { ds[j].t = ot.value; };
          ot.onkeydown = function (e) { if (e.key === 'Enter') ot.blur(); };
          on.addEventListener('wheel', function (e) { e.preventDefault(); on.blur(); }, { passive: false });
          on.onkeydown = function (e) { if (e.key === 'Enter') on.blur(); };
          on.onchange = function () { ds[j].n = Math.max(1, Math.min(50, Math.round(Number(on.value) || 1))); on.value = ds[j].n; };
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
        nhap[k] = nhap[k].map(function (l) { return { t: String(l.t || '').trim().slice(0, 40), n: Math.max(1, Math.min(50, Math.round(Number(l.n) || 1))) }; })
          .filter(function (l) { return l.t; });
      });
      $('.sd-tin', el).textContent = 'Đang lưu…';
      luuCai({ lyDo: nhap }).then(function () { S.cai.lyDo = nhap; h.dong(); })['catch'](function (e) {
        $('.sd-tin', el).textContent = 'Chưa lưu được: ' + String((e && (e.code || e.message)) || e).slice(0, 60);
      });
    };
  }

  window.SaoDash = { mo: mo };
})();
