/* ============================================================
   bai.js — BÀI ĐĂNG (v0.4.0): ô soạn · thẻ bài · cảm xúc · bình luận · chia sẻ ·
   báo cáo · menu sửa/xoá/ẩn/ghim · dòng bài có phân trang.
   Dùng chung cho bangtin.html · canhan.html · baidang.html · quanly.html.

   KHO nwPosts/{id}:
     uid · tacGia{uid,ten,anh,lop,vaiTro} · chu · anh[] · pham 'mang'|'lop' · lop · luc · suaLuc
     · an · ghim · camXuc{uid: mã} · soBinhLuan · soChiaSe · chiaSeTu · goc{uid,tacGia,chu,anh,luc}
   nwPosts/{id}/binhLuan/{cid}: uid · tacGia · chu · luc · camXuc{}
   nwBaoCao/{id}: tu · tuTen · baiId · uidBai · lyDo · chu · luc · trangThai

   💸 Nếp đọc: dòng bài dùng getDocs + phân trang 10 bài (KHÔNG onSnapshot cả bảng tin);
   bình luận chỉ tải khi bấm mở; cảm xúc nằm NGAY trong tài liệu bài (không tốn lượt đọc).
   Tác giả được NHÚNG vào bài/bình luận nên hiện dòng bài không phải đọc thêm hồ sơ ai.
   ============================================================ */
(function () {
  'use strict';
  var NW = window.NW, CFG = NW.CFG, $ = NW.$, $$ = NW.$$, IC = NW.IC, an = NW.chuAnToan;
  var Bai = NW.Bai = {};
  var MOI_TRANG = 10;

  // ---------- ô soạn (v0.4.0, thầy chốt 22/09): thanh gọn "Em đang nghĩ gì?" → POP-UP "Tạo bài viết" kiểu Facebook ----------
  // Phạm vi 4 mục NW.PHAM: mang (Công khai) · ban (Bạn bè = bạn + cùng lớp) · lop (Chỉ lớp) · minh (Chỉ mình tôi).
  // o = { hop, lopMacDinh, sauKhiDang(bai, id) }
  Bai.soan = function (o) {
    var toi = NW.toi, hop = o.hop;
    hop.className = (hop.className + ' card soan').trim();
    hop.innerHTML = '<div class="soan-gon">' + NW.avHtml(toi) +
      '<button class="gia" id="soanMo" type="button">' + (toi.laThay ? 'Thầy muốn nhắn gì cho cả mạng?' : an(toi.ten || 'Em') + ' ơi, em đang nghĩ gì thế?') + '</button>' +
      '</div>';   // v0.9.2 (thầy chốt 23/09): bỏ icon ảnh ở ô gọn — thêm ảnh đã có sẵn trong pop-up "Tạo bài viết"
    $('#soanMo', hop).onclick = function () { moPop(false); };

    // v13 — pop-up thêm: KÉO-THẢ / DÁN ảnh · xem trước dạng lưới như thẻ bài · GẮN THẺ BẠN · CẢM XÚC/HOẠT ĐỘNG
    function moPop(chonAnhNgay) {
      var lopToi = o.lopMacDinh || toi.lop || '';
      var anhDs = [];            // [{blob, url}]
      var pham = 'mang';
      var ganDs = [];            // [{uid, ten}] bạn được gắn thẻ
      var camGiac = null;        // {ky, chu, loai}
      var dsPham = NW.PHAM.filter(function (p) { return p.ma !== 'lop' || (!toi.laThay && lopToi); });
      var goiY = toi.laThay ? 'Thầy muốn nhắn gì cho cả mạng?' : an(toi.ten || 'Em') + ' ơi, em đang nghĩ gì thế?';
      var p = NW.popMo({ tieuDe: 'Tạo bài viết', lop: 'pop-tao-bai', html:
        '<div class="tb-ai">' + NW.avHtml(toi) + '<div style="position:relative;min-width:0;flex:1"><div class="ten" id="tbTen"></div>' +
          '<button class="chon-pham" id="soanPham" type="button" title="Ai xem được bài này?"></button>' +
          '<div class="pham-menu" id="phamMenu">' + dsPham.map(function (x) {
            return '<button type="button" data-p="' + x.ma + '"><span class="ky">' + x.ic + '</span><span><b>' + an(x.ma === 'lop' ? 'Chỉ lớp ' + lopToi : x.nh) + '</b><small>' + an(x.ma === 'lop' ? 'Chỉ lớp ' + lopToi + ' và thầy' : x.mo) + '</small></span></button>';
          }).join('') + '</div></div></div>' +
        '<textarea id="soanChu" class="tb-chu" rows="4" placeholder="' + goiY + '" maxlength="' + CFG.TOI_DA_CHU_BAI + '"></textarea>' +
        '<div class="tb-xem" id="soanAnh" hidden></div><div class="canh-cam" id="soanCam" hidden></div>' +
        '<div class="tb-them"><span>Thêm vào bài viết</span>' +
          '<button type="button" class="xanh" id="soanThemAnh" title="Ảnh (tối đa ' + CFG.TOI_DA_ANH_BAI + ')" aria-label="Thêm ảnh">' + IC.anh + '</button>' +
          '<button type="button" class="duong" id="soanGan" title="Gắn thẻ bạn" aria-label="Gắn thẻ bạn">' + IC.gan + '</button>' +
          '<button type="button" class="vang" id="soanCg" title="Cảm xúc / hoạt động" aria-label="Cảm xúc / hoạt động">' + IC.camGiac + '</button>' +
          (toi.laThay ? '<label class="chon-pham" style="cursor:pointer;margin-left:6px"><input type="checkbox" id="soanGhim" style="accent-color:var(--accent)"> GHIM</label>' : '') + '</div>' +
        '<input type="file" id="soanFile" accept="image/*" multiple hidden>' +
        '<div class="tb-dem"><span class="dem" id="soanDem"></span></div>' +
        '<div class="tb-keo" id="tbKeo">' + IC.anh + '<b>Thả ảnh vào đây</b><span>tối đa ' + CFG.TOI_DA_ANH_BAI + ' ảnh · hoặc Ctrl+V dán ảnh</span></div>' +
        '<div class="tb-panel" id="tbPanel" hidden></div>',
        chan: '<button class="btn primary wide" id="soanDang" type="button" disabled>ĐĂNG</button>' });

      var ta = $('#soanChu', p), dem = $('#soanDem', p), nutDang = $('#soanDang', p), khuAnh = $('#soanAnh', p), cam = $('#soanCam', p);
      var nutPham = $('#soanPham', p), menuPham = $('#phamMenu', p), tenHop = $('#tbTen', p), panel = $('#tbPanel', p);
      NW.tuCao(ta, 320);
      setTimeout(function () { ta.focus(); }, 60);

      // dòng tên: "BẠN THỬ đang cảm thấy 😊 vui — cùng với MINH ANH và 2 người khác"
      function veTen() {
        var h = '<b>' + an(toi.ten) + '</b>';
        if (camGiac) h += ' <span class="cg">' + NW.chuCamGiac(camGiac) + '</span>';
        if (ganDs.length) h += ' <span class="cg">— cùng với <b>' + an(ganDs[0].ten) + '</b>' + (ganDs.length > 1 ? ' và <b>' + (ganDs.length - 1) + ' người khác</b>' : '') + '</span>';
        tenHop.innerHTML = h;
      }
      veTen();

      function datPham(ma) {
        pham = ma; var x = NW.phamCua(ma);
        nutPham.className = 'chon-pham ' + ma;
        nutPham.innerHTML = x.ic + ' <span>' + an(ma === 'lop' ? 'Chỉ lớp ' + lopToi : x.nh) + '</span> ▾';
      }
      datPham('mang');
      nutPham.onclick = function (e) { e.stopPropagation(); menuPham.classList.toggle('mo'); };
      p.addEventListener('click', function () { menuPham.classList.remove('mo'); });
      $$('button', menuPham).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); datPham(b.getAttribute('data-p')); menuPham.classList.remove('mo'); }; });

      function kiem() {
        var n = ta.value.trim().length;
        dem.textContent = n ? n + '/' + CFG.TOI_DA_CHU_BAI : '';
        dem.classList.toggle('qua', n > CFG.TOI_DA_CHU_BAI);
        nutDang.disabled = !(n || anhDs.length) || n > CFG.TOI_DA_CHU_BAI;
      }
      ta.addEventListener('input', function () {
        kiem();
        clearTimeout(ta._t); ta._t = setTimeout(async function () {
          var tu = await NW.kiemTuCam(ta.value);
          cam.hidden = !tu; if (tu) cam.textContent = 'Bài có từ không phù hợp ("' + tu + '"). Em sửa lại nhé.';
        }, 300);
      });

      // ---- ảnh: chọn file · kéo-thả · dán ----
      async function themFiles(files) {
        files = Array.prototype.slice.call(files || []).filter(function (f) { return /^image\//.test(f.type); });
        for (var i = 0; i < files.length; i++) {
          if (anhDs.length >= CFG.TOI_DA_ANH_BAI) { NW.toast('Mỗi bài tối đa ' + CFG.TOI_DA_ANH_BAI + ' ảnh.', true); break; }
          try {
            var blob = await NW.nenAnh(files[i]);
            anhDs.push({ blob: blob, url: URL.createObjectURL(blob) });
          } catch (e) { NW.toast('Không đọc được ảnh ' + files[i].name, true); }
        }
        veAnh(); kiem();
      }
      $('#soanThemAnh', p).onclick = function () { $('#soanFile', p).click(); };
      $('#soanFile', p).onchange = function () { var fs = Array.prototype.slice.call(this.files || []); this.value = ''; themFiles(fs); };
      var demKeo = 0;
      p.addEventListener('dragenter', function (e) { e.preventDefault(); demKeo++; p.classList.add('keo'); });
      p.addEventListener('dragover', function (e) { e.preventDefault(); });
      p.addEventListener('dragleave', function () { demKeo--; if (demKeo <= 0) { demKeo = 0; p.classList.remove('keo'); } });
      p.addEventListener('drop', function (e) { e.preventDefault(); demKeo = 0; p.classList.remove('keo'); themFiles(e.dataTransfer && e.dataTransfer.files); });
      p.addEventListener('paste', function (e) {
        var its = (e.clipboardData || {}).items || [], fs = [];
        for (var i = 0; i < its.length; i++) if (/^image\//.test(its[i].type)) { var f = its[i].getAsFile(); if (f) fs.push(f); }
        if (fs.length) { e.preventDefault(); themFiles(fs); }
      });
      // xem trước: lưới y như thẻ bài (1–4 ô, ô thứ 4 ghi +N), mỗi ô có ✕; thanh nhỏ "Thêm ảnh" / "Bỏ hết"
      function veAnh() {
        khuAnh.hidden = !anhDs.length;
        var n = anhDs.length, k = Math.min(4, n);
        khuAnh.innerHTML = '<div class="tb-xem-nut"><button type="button" data-them>' + IC.them + '<span>Thêm ảnh</span></button><button type="button" data-bohet title="Bỏ hết ảnh">' + IC.dong + '</button></div>' +
          '<div class="bai-anh n' + k + '">' + anhDs.slice(0, 4).map(function (a, i) {
            return '<div class="o-anh"><img src="' + a.url + '" alt="">' + (i === 3 && n > 4 ? '<span class="them">+' + (n - 4) + '</span>' : '') +
              '<button class="bo" data-i="' + i + '" type="button" aria-label="Bỏ ảnh">' + IC.dong + '</button></div>';
          }).join('') + '</div>' + (n > 4 ? '<div class="tb-xem-ds">' + anhDs.map(function (a, i) {
            return '<div class="o-anh nho"><img src="' + a.url + '" alt=""><button class="bo" data-i="' + i + '" type="button" aria-label="Bỏ ảnh">' + IC.dong + '</button></div>';
          }).join('') + '</div>' : '');
        $$('.bo', khuAnh).forEach(function (b) { b.onclick = function () { anhDs.splice(+b.getAttribute('data-i'), 1); veAnh(); kiem(); }; });
        $('[data-them]', khuAnh).onclick = function () { $('#soanFile', p).click(); };
        $('[data-bohet]', khuAnh).onclick = function () { anhDs = []; veAnh(); kiem(); };
      }
      if (chonAnhNgay) setTimeout(function () { $('#soanFile', p).click(); }, 120);

      // ---- bảng con trượt lên trong pop-up (gắn thẻ · cảm xúc) ----
      function moPanel(tieuDe, html, luc) {
        p.scrollTop = 0; panel.hidden = false;
        panel.innerHTML = '<div class="tb-panel-dau"><button type="button" data-lui aria-label="Quay lại">' + IC.lui + '</button><b>' + an(tieuDe) + '</b><button type="button" class="btn primary nho" data-xong>Xong</button></div><div class="tb-panel-than">' + html + '</div>';
        $('[data-lui]', panel).onclick = $('[data-xong]', panel).onclick = function () { panel.hidden = true; veTen(); ta.focus(); };
        if (luc) luc(panel);
      }
      // gắn thẻ bạn: bạn cùng lớp + bạn đã kết
      $('#soanGan', p).onclick = async function () {
        var ds = await NW.dsNguoiGanDuoc();
        moPanel('Gắn thẻ bạn', '<input type="search" class="tb-tim" placeholder="Tìm tên bạn…"><div class="tb-chip" id="tbChip"></div><div class="tb-ds" id="tbDs"></div>', function (pn) {
          var oTim = $('.tb-tim', pn), chip = $('#tbChip', pn), hop = $('#tbDs', pn);
          function daGan(uid) { return ganDs.some(function (g) { return g.uid === uid; }); }
          function veChip() {
            chip.innerHTML = ganDs.map(function (g) { return '<span class="chip">' + an(g.ten) + '<button type="button" data-uid="' + an(g.uid) + '" aria-label="Bỏ">' + IC.dong + '</button></span>'; }).join('');
            $$('button', chip).forEach(function (b) { b.onclick = function () { ganDs = ganDs.filter(function (g) { return g.uid !== b.getAttribute('data-uid'); }); veChip(); veDs(); }; });
          }
          function veDs() {
            var q = NW.khongDau(oTim.value.trim().toLowerCase());
            var loc = ds.filter(function (n) { return !q || NW.khongDau((n.ten || '').toLowerCase()).indexOf(q) >= 0; });
            hop.innerHTML = loc.length ? loc.map(function (n) {
              return '<button type="button" class="nguoi' + (daGan(n.uid) ? ' chon' : '') + '" data-uid="' + an(n.uid) + '">' + NW.avHtml(n, 'nho') +
                '<span><span class="ten">' + an(n.ten) + '</span><br><span class="lop">' + an(n.lop || '') + (n.la === 'ban' ? ' · bạn bè' : ' · cùng lớp') + '</span></span><span class="cuoi tich">' + IC.tick + '</span></button>';
            }).join('') : '<div class="trong">Không thấy bạn nào.</div>';
            $$('.nguoi', hop).forEach(function (b) {
              b.onclick = function () {
                var uid = b.getAttribute('data-uid'), n = ds.filter(function (x) { return x.uid === uid; })[0];
                if (daGan(uid)) ganDs = ganDs.filter(function (g) { return g.uid !== uid; }); else ganDs.push({ uid: n.uid, ten: n.ten });
                veChip(); veDs();
              };
            });
          }
          oTim.addEventListener('input', veDs); veChip(); veDs(); setTimeout(function () { oTim.focus(); }, 50);
        });
      };
      // cảm xúc / hoạt động
      $('#soanCg', p).onclick = function () {
        function nhom(loai, tieu) {
          return '<div class="tb-cg-tieu">' + tieu + '</div><div class="tb-cg">' + NW.CAM_GIAC.filter(function (c) { return c.loai === loai; }).map(function (c, i) {
            var chon = camGiac && camGiac.ma === c.ma;
            return '<button type="button" data-cg="' + c.ma + '" class="' + (chon ? 'chon' : '') + '">' + NW.cgHtml(c.ma) + '<span>' + an(c.chu) + '</span></button>';
          }).join('') + '</div>';
        }
        moPanel('Em đang cảm thấy thế nào?', (camGiac ? '<button type="button" class="tb-cg-bo" data-bocg>' + IC.dong + ' Bỏ "' + an(camGiac.chu) + '"</button>' : '') + nhom('cam', 'CẢM XÚC') + nhom('hd', 'HOẠT ĐỘNG'), function (pn) {
          $$('[data-cg]', pn).forEach(function (b) {
            b.onclick = function () { camGiac = NW.camGiacCua(b.getAttribute('data-cg')); panel.hidden = true; veTen(); ta.focus(); };
          });
          var bo = $('[data-bocg]', pn); if (bo) bo.onclick = function () { camGiac = null; panel.hidden = true; veTen(); };
        });
      };

      nutDang.onclick = async function () {
        var chu = ta.value.trim();
        var tu = await NW.kiemTuCam(chu);
        if (tu) { cam.hidden = false; cam.textContent = 'Bài có từ không phù hợp ("' + tu + '"). Em sửa lại nhé.'; return; }
        var bai = {
          uid: toi.uid, tacGia: NW.tomTat(toi), chu: chu, anh: [], pham: pham,
          lop: toi.laThay ? 'GV' : lopToi, luc: Date.now(), an: false,
          ghim: !!(toi.laThay && $('#soanGhim', p) && $('#soanGhim', p).checked),
          camXuc: {}, soBinhLuan: 0, soChiaSe: 0, chiaSeTu: null, goc: null,
          gan: ganDs.slice(), camGiac: camGiac ? { ma: camGiac.ma, ky: camGiac.ky, chu: camGiac.chu, loai: camGiac.loai } : null
        };
        if (NW.laBanThu()) {   // bàn thử: bài hiện ngay trên máy em, không ghi kho
          bai.anh = anhDs.map(function (a) { return a.url; });
          NW.popDong(); NW.toast('Bàn thử: bài chỉ hiện trên máy em, không ghi thật.');
          if (o.sauKhiDang) o.sauKhiDang(bai, 'thu' + Date.now());
          return;
        }
        nutDang.disabled = true; nutDang.textContent = 'ĐANG ĐĂNG…';
        try {
          var urls = [];
          for (var i = 0; i < anhDs.length; i++) {
            nutDang.textContent = 'ẢNH ' + (i + 1) + '/' + anhDs.length + '…';
            urls.push(await NW.taiAnh(anhDs[i].blob, NW.tenAnhMoi('_b' + i)));
          }
          bai.anh = urls;
          var f = await NW.fb();
          var ref = await f.fs.addDoc(f.fs.collection(f.db, 'nwPosts'), bai);
          NW.popDong();
          NW.toast('Đã đăng bài.');
          ganDs.forEach(function (g) { if (g.uid !== toi.uid) NW.guiThongBao(g.uid, { loai: 'nhac', chu: 'đã gắn thẻ em trong một bài viết', link: 'baidang.html?id=' + ref.id }); });
          if (o.sauKhiDang) o.sauKhiDang(bai, ref.id);
        } catch (e) { NW.toast(NW.chuLoiKho(e), true); nutDang.textContent = 'ĐĂNG'; kiem(); }
      };
    }
  };

  // v13 — danh sách người gắn thẻ được: bạn cùng lớp + bạn đã kết (đệm một lần)
  var _ganDuoc = null;
  NW.dsNguoiGanDuoc = function () {
    if (_ganDuoc) return _ganDuoc;
    _ganDuoc = (async function () {
      var toi = NW.toi;
      if (NW.laBanThu()) return [
        { uid: 'hs_1', ten: 'MINH ANH', lop: 'A1C', la: 'lop' }, { uid: 'hs_5', ten: 'THẢO VY', lop: 'A1C', la: 'lop' }, { uid: 'hs_6', ten: 'GIA HUY', lop: 'A1C', la: 'lop' },
        { uid: 'hs_7', ten: 'KHÁNH LINH', lop: 'A1C', la: 'lop' }, { uid: 'hs_8', ten: 'TUẤN KIỆT', lop: 'A1C', la: 'lop' }, { uid: 'hs_3', ten: 'NGỌC HÂN', lop: 'NNTNGK9', la: 'ban' }];
      var ds = [], co = {};
      try {
        var lops = toi.cacLop || [toi.lop];
        for (var i = 0; i < lops.length; i++) (await NW.nguoiTheoLop(lops[i]).catch(function () { return []; })).forEach(function (n) { if (n.uid !== toi.uid && !co[n.uid]) { co[n.uid] = 1; ds.push(Object.assign({ la: 'lop' }, n)); } });
        var ban = await NW.dsBanUid();
        for (var u of ban) if (!co[u]) { var hs = await NW.hoSo(u).catch(function () { return null; }); if (hs) { co[u] = 1; ds.push(Object.assign({ la: 'ban' }, hs)); } }
      } catch (e) { console.warn('[nw] gắn thẻ', e); }
      return ds;
    })();
    return _ganDuoc;
  };

  // ---------- vẽ thẻ bài ----------
  function demCamXuc(cx) {
    var d = {}; var tong = 0;
    Object.keys(cx || {}).forEach(function (u) { var m = cx[u]; if (m) { d[m] = (d[m] || 0) + 1; tong++; } });
    return { d: d, tong: tong };
  }
  // v0.9.2: số nhỏ cạnh icon trong hàng nút — 0 thì giấu luôn cho gọn (đúng như ảnh mẫu thầy gửi)
  function demHtml(n) { n = n || 0; return '<b class="dem"' + (n ? '' : ' hidden') + '>' + (n || '') + '</b>'; }

  // khongSo = true: chỉ hiện các icon cảm xúc, KHÔNG kèm số (v0.9.2 — thầy chốt 23/09 cho cụm bên phải thẻ bài)
  function cumCamXuc(cx, khongSo) {
    var c = demCamXuc(cx);
    if (!c.tong) return '';
    var loai = NW.CAM_XUC.filter(function (x) { return c.d[x.ma]; }).slice(0, 3);
    return '<span class="cx-cum" data-cxai>' + loai.map(function (x) { return NW.cxHtml(x.ma); }).join('') + (khongSo ? '' : '<b>' + c.tong + '</b>') + '</span>';
  }
  // v13: bài > 4 ảnh thì ô thứ 4 phủ "+N"; bấm ảnh nào mở bộ ảnh từ ảnh đó (data-ds = cả bộ)
  function khuAnhHtml(anh, nho) {
    if (!anh || !anh.length) return '';
    var n = anh.length, k = Math.min(4, n);
    return '<div class="bai-anh n' + k + '" data-ds="' + an(JSON.stringify(anh)) + '">' + anh.slice(0, 4).map(function (u, i) {
      return '<button type="button" data-anh="' + an(u) + '"><img src="' + an(u) + '" alt="" loading="lazy">' + (i === 3 && n > 4 ? '<span class="them">+' + (n - 4) + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }
  // v13: bai (tuỳ chọn) → thêm "đang cảm thấy 😊 vui" và "— cùng với MINH ANH và 2 người khác" sau tên
  function dauBai(tg, luc, them, pham, bai) {
    tg = tg || {};
    var cg = '';
    if (bai && bai.camGiac) cg += '<span class="cg">' + NW.chuCamGiac(bai.camGiac) + '</span>';
    if (bai && bai.gan && bai.gan.length) {
      var g = bai.gan;
      cg += '<span class="cg">— cùng với <a href="canhan.html?uid=' + an(g[0].uid) + '">' + an(g[0].ten) + '</a>' +
        (g.length > 1 ? ' và <button type="button" data-ganthem>' + (g.length - 1) + ' người khác</button>' : '') + '</span>';
    }
    return '<div class="bai-dau">' + NW.avHtml(tg) + '<div class="ai"><div class="ten"><a href="canhan.html?uid=' + an(tg.uid) + '">' + an(tg.ten || '?') + '</a>' +
      (tg.vaiTro === 'gv' ? NW.tichHtml() : '') + cg + (them || '') +
      '</div><div class="phu"><span title="' + an(NW.chuGio(luc, 'day')) + '">' + an(NW.chuGio(luc)) + '</span>' +
      (pham ? '<span class="pham-ky" title="' + an(NW.phamCua(pham).nh) + '">' + NW.phamCua(pham).ic + '</span>' : '') + '</div></div></div>';
  }
  function chuBai(chu, gon) {
    if (!chu) return '';
    var dai = gon && chu.length > 600;
    return '<p class="bai-chu' + (dai ? ' dai' : '') + '">' + NW.chuCoLink(chu) + '</p>' + (dai ? '<button class="xem-them" data-xemthem type="button">Xem thêm</button>' : '');
  }

  // Trả phần tử .bai đã gắn đủ sự kiện. o = { moBinhLuan, gon }
  Bai.dung = function (bai, id, o) {
    o = o || {};
    var toi = NW.toi;
    var el = document.createElement('article');
    el.className = 'card bai' + (bai.an ? ' an' : '');
    el.setAttribute('data-id', id);
    var cuaToi = bai.uid === toi.uid;
    // v0.9.2 (thầy chốt 23/09): chỉ còn GHIM · NỔI BẬT · ĐÃ ẨN — bỏ BẠN BÈ và CHỈ MÌNH TÔI
    // (icon phạm vi đơn sắc cạnh dòng giờ đã cho biết bài dành cho ai rồi).
    var nhan = (bai.ghim ? '<span class="nhan-ghim">GHIM</span>' : '') + (bai.noiBat ? '<span class="nhan-noibat">' + IC.sao + 'NỔI BẬT</span>' : '') +
               (bai.an ? '<span class="nhan-an">ĐÃ ẨN</span>' : '');
    var goc = '';
    if (bai.chiaSeTu) {
      // ⛔ v0.2.0: trước là <a class="bai-goc"> — bên trong dauBai() lại có <a> tên tác giả ⇒ HTML cấm <a> lồng <a>,
      // trình duyệt tự đóng thẻ ngoài, ruột bài gốc rơi ra ngoài khung. Nay dùng <div role="link"> + bấm bằng JS.
      goc = bai.goc ? '<div class="bai-goc" data-goc="' + an(bai.chiaSeTu) + '" role="link" tabindex="0">' +
        dauBai(bai.goc.tacGia, bai.goc.luc, '', '', bai.goc) + chuBai(bai.goc.chu, true) + khuAnhHtml(bai.goc.anh) + '</div>' :
        '<div class="bai-goc mat">Bài gốc không còn.</div>';
    }
    var cx = (bai.camXuc || {})[toi.uid] || '';
    el.innerHTML = dauBai(bai.tacGia, bai.luc, nhan, bai.pham, bai) +
      '<div class="bai-nut-goc"><button class="nut-tron bai-menu" data-menu type="button" aria-label="Menu bài">' + IC.baCham + '</button>' +
        '<button class="nut-tron bai-an" data-anbai type="button" aria-label="Ẩn bài này khỏi bảng tin" title="Ẩn khỏi bảng tin">' + IC.dong + '</button></div>' +
      chuBai(bai.chu, o.gon !== false) + (bai.chiaSeTu ? goc : khuAnhHtml(bai.anh)) +
      // v0.9.2 (thầy chốt 23/09, theo ảnh mẫu): MỘT hàng — 3 icon + số bên TRÁI (không chữ), cụm cảm xúc đã thả bên PHẢI
      '<div class="bai-nut">' +
        '<button data-cx type="button" class="' + (cx ? 'da ' + cx : '') + '" title="Thích">' + (cx ? NW.cxHtml(cx) : IC.tim) + demHtml(demCamXuc(bai.camXuc).tong) + '</button>' +
        '<button data-mobl type="button" title="Bình luận">' + IC.binhLuan + demHtml(bai.soBinhLuan) + '</button>' +
        '<button data-chiase type="button" title="Chia sẻ">' + IC.chiaSe + demHtml(bai.soChiaSe) + '</button>' +
        '<span class="cx-phai">' + cumCamXuc(bai.camXuc, true) + '</span>' +
      '</div><div class="bl-khu" data-blkhu hidden></div>';
    el.style.position = 'relative';

    // bấm vào khung bài gốc (trừ khi bấm đúng link tên / nút ảnh bên trong) → mở bài gốc
    var khungGoc = $('[data-goc]', el);
    if (khungGoc) khungGoc.onclick = function (e) {
      if (e.target.closest('a,button')) return;
      NW.di('baidang.html?id=' + khungGoc.getAttribute('data-goc'));
    };

    // ảnh phóng to — v13: mở cả bộ ảnh của khối đó, bắt đầu từ ảnh bấm
    $$('[data-anh]', el).forEach(function (b) {
      b.onclick = function (e) {
        e.preventDefault(); var kh = b.closest('.bai-anh'); var ds = [];
        try { ds = JSON.parse(kh.getAttribute('data-ds') || '[]'); } catch (x) { }
        NW.xemAnh(b.getAttribute('data-anh'), ds);
      };
    });
    var ganThem = $('[data-ganthem]', el);
    if (ganThem) ganThem.onclick = function () {
      var pp = NW.popMo({ tieuDe: 'Cùng với', html: '<div class="ds-nguoi">' + (bai.gan || []).map(function (g) {
        return '<a class="nguoi" href="canhan.html?uid=' + an(g.uid) + '">' + NW.avHtml(g, 'nho') + '<span><span class="ten">' + an(g.ten) + '</span></span></a>';
      }).join('') + '</div>' });
    };
    var xt = $('[data-xemthem]', el); if (xt) xt.onclick = function () { $('.bai-chu', el).classList.remove('dai'); xt.remove(); };

    // ---- cảm xúc: v13 dùng helper chung NW.ganCamXuc (bấm = tim / gỡ; giữ hoặc rê = bảng 7) ----
    var nutCx = $('[data-cx]', el);
    function datCx(moi) {
      var cu = (bai.camXuc || {})[toi.uid] || '';
      bai.camXuc = bai.camXuc || {};
      if (moi) bai.camXuc[toi.uid] = moi; else delete bai.camXuc[toi.uid];
      nutCx.className = moi ? 'da ' + moi : '';
      nutCx.innerHTML = (moi ? NW.cxHtml(moi) : IC.tim) + demHtml(demCamXuc(bai.camXuc).tong);
      var phai = $('.cx-phai', el); if (phai) phai.innerHTML = cumCamXuc(bai.camXuc, true);
      ganCxAi();
      if (NW.laBanThu()) return;
      NW.fb().then(function (f) {
        var patch = {}; patch['camXuc.' + toi.uid] = moi ? moi : f.fs.deleteField();
        return f.fs.updateDoc(f.fs.doc(f.db, 'nwPosts', id), patch);
      }).then(function () {
        if (moi && !cu && !cuaToi) NW.guiThongBao(bai.uid, { loai: 'camXuc', chu: NW.kyCamXuc(moi) + ' ' + (bai.chu || '').slice(0, 60), link: 'baidang.html?id=' + id });
      }).catch(function (e) { NW.toast(NW.chuLoiKho(e), true); });
    }
    NW.ganCamXuc(nutCx, { hienTai: function () { return (bai.camXuc || {})[toi.uid] || ''; }, chon: datCx, macDinh: 'tim' });

    // ai đã thả gì
    function ganCxAi() {
      var c = $('[data-cxai]', el); if (!c) return;
      c.onclick = async function () {
        var cx = bai.camXuc || {}; var uids = Object.keys(cx);
        var p = NW.popMo({ tieuDe: 'Cảm xúc', html: '<div class="ds-nguoi" id="cxDs"><div class="xoay"></div></div>' });
        var html = '';
        for (var i = 0; i < uids.length; i++) {
          var hs = NW.laBanThu() ? { ten: uids[i] } : (await NW.hoSo(uids[i]).catch(function () { return null; })) || { ten: '?' };
          html += '<a class="nguoi" href="canhan.html?uid=' + an(uids[i]) + '">' + NW.avHtml(hs, 'nho') + '<span><span class="ten">' + an(hs.ten) + '</span><br><span class="lop">' + an(hs.lop || '') + '</span></span><span class="cuoi">' + NW.cxHtml(cx[uids[i]], 'to') + '</span></a>';
        }
        $('#cxDs', p).innerHTML = html || '<div class="trong">Chưa ai thả.</div>';
      };
    }
    ganCxAi();

    // ---- bình luận — v13: TRẢ LỜI 1 cấp · 7 CẢM XÚC (giữ/rê nút Thích) · GỬI ẢNH ----
    // binhLuan/{cid}: uid · tacGia · chu · anh ('' | url) · traLoiCho (id bình luận gốc | null) · luc · camXuc{uid: mã}
    var khuBl = $('[data-blkhu]', el);
    var blMo = false, blDs = [], blHet = false;
    var dangTraLoi = null;   // {goc: id gốc, ten: tên người được trả lời}
    var blBung = {};         // id gốc → true khi đã bung danh sách trả lời
    var anhChon = {};        // khoá ô nhập ('' hoặc id gốc) → {blob, url}
    async function moBl() {
      if (blMo) { khuBl.hidden = !khuBl.hidden; if (!khuBl.hidden) { var t = $('textarea', khuBl); if (t) t.focus(); } return; }
      blMo = true; khuBl.hidden = false;
      khuBl.innerHTML = '<div class="xoay"></div>';
      await taiBl();
    }
    async function taiBl(them) {
      if (NW.laBanThu()) { blDs = bai._blMau || []; blHet = true; veBl(); return; }
      try {
        var f = await NW.fb();
        var rang = [f.fs.orderBy('luc', 'desc'), f.fs.limit(30)];
        if (them && blDs.length) rang.push(f.fs.startAfter(blDs[0].luc));
        var q = f.fs.query.apply(null, [f.fs.collection(f.db, 'nwPosts', id, 'binhLuan')].concat(rang));
        var snap = await f.fs.getDocs(q);
        var ds = []; snap.forEach(function (d) { ds.push(Object.assign({ id: d.id }, d.data())); });
        blHet = ds.length < 30;
        ds.reverse();
        blDs = them ? ds.concat(blDs) : ds;
        veBl();
      } catch (e) { khuBl.innerHTML = '<div class="trong">' + an(NW.chuLoiKho(e)) + '</div>'; }
    }
    function capNhatDem(d) {
      bai.soBinhLuan = Math.max(0, (bai.soBinhLuan || 0) + d);
      var demBl = $('[data-mobl] .dem', el);
      if (demBl) { demBl.textContent = bai.soBinhLuan || ''; demBl.hidden = !bai.soBinhLuan; }
    }
    // một bình luận (gốc hoặc trả lời)
    function motBl(b, con) {
      var tg = b.tacGia || {}, cuaToiBl = b.uid === toi.uid, cxb = (b.camXuc || {})[toi.uid] || '';
      return '<div class="bl' + (con ? ' con' : '') + '" data-bl="' + an(b.id) + '">' + NW.avHtml(tg, 'nho') + '<div class="than">' +
        '<div class="bong"><div class="ten"><a href="canhan.html?uid=' + an(tg.uid) + '" style="color:inherit">' + an(tg.ten) + '</a>' + (tg.vaiTro === 'gv' ? NW.tichHtml('nho') : '') + '</div>' +
          (b.chu ? '<div class="chu">' + NW.chuCoLink(b.chu) + '</div>' : '') + cumCamXuc(b.camXuc) + '</div>' +
        (b.anh ? '<button class="bl-anh" type="button" data-blanh="' + an(b.anh) + '"><img src="' + an(b.anh) + '" alt="" loading="lazy"></button>' : '') +
        '<div class="duoi"><span>' + an(NW.chuGio(b.luc)) + '</span>' +
          '<button data-blcx type="button" class="' + cxb + '">' + (cxb ? an(NW.tenCamXuc(cxb)) : 'Thích') + '</button>' +
          '<button data-bltra="' + an(b.traLoiCho || b.id) + '" data-ten="' + an(tg.ten) + '" type="button">Trả lời</button>' +
          ((cuaToiBl || toi.laThay) ? '<button data-blxoa type="button">Xoá</button>' : '') + '</div></div></div>';
    }
    // ô nhập (khoá '' = bình luận gốc; khoá = id gốc = đang trả lời)
    function oNhap(khoa, ten) {
      var a = anhChon[khoa];
      return '<div class="bl-nhap" data-nhap="' + an(khoa) + '">' + NW.avHtml(toi, 'nho') + '<div class="o">' +
        (khoa ? '<div class="bl-dang-tra">Đang trả lời <b>' + an(ten) + '</b><button type="button" data-huytra aria-label="Thôi">' + IC.dong + '</button></div>' : '') +
        '<div class="bl-anh-xem"' + (a ? '' : ' hidden') + '>' + (a ? '<img src="' + a.url + '" alt="">' : '') + '<button type="button" data-boanh aria-label="Bỏ ảnh">' + IC.dong + '</button></div>' +
        '<textarea rows="1" placeholder="' + (khoa ? 'Trả lời ' + an(ten) + '…' : 'Viết bình luận…') + '" maxlength="' + CFG.TOI_DA_CHU_BINH_LUAN + '"></textarea>' +
        '<button class="anh" data-blanhchon type="button" title="Gửi ảnh" aria-label="Gửi ảnh">' + IC.anh + '</button>' +
        '<button class="gui" data-blgui type="button" disabled aria-label="Gửi">' + IC.gui + '</button>' +
        '<input type="file" accept="image/*" hidden></div></div>';
    }
    function veBl() {
      var goc = blDs.filter(function (b) { return !b.traLoiCho; }), tra = {};
      blDs.forEach(function (b) { if (b.traLoiCho) (tra[b.traLoiCho] = tra[b.traLoiCho] || []).push(b); });
      khuBl.innerHTML = (!blHet ? '<button class="bl-them" data-blthem type="button">Xem bình luận cũ hơn</button>' : '') +
        goc.map(function (g) {
          var ds = tra[g.id] || [], bung = blBung[g.id] || ds.length <= 2 || (dangTraLoi && dangTraLoi.goc === g.id);
          return motBl(g) + '<div class="bl-tra" data-tra="' + an(g.id) + '">' +
            (ds.length && !bung ? '<button class="bl-xem" data-bung="' + an(g.id) + '" type="button">' + IC.traLoi + 'Xem ' + ds.length + ' câu trả lời</button>' : ds.map(function (c) { return motBl(c, true); }).join('')) +
            (dangTraLoi && dangTraLoi.goc === g.id ? oNhap(g.id, dangTraLoi.ten) : '') + '</div>';
        }).join('') + oNhap('', '');
      // ô nhập
      $$('[data-nhap]', khuBl).forEach(function (hop) {
        var khoa = hop.getAttribute('data-nhap'), ta = $('textarea', hop), gui = $('[data-blgui]', hop), file = $('input[type=file]', hop), xem = $('.bl-anh-xem', hop);
        NW.tuCao(ta, 140);
        function kiem() { gui.disabled = !(ta.value.trim() || anhChon[khoa]); }
        kiem();
        ta.addEventListener('input', kiem);
        ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!gui.disabled) gui.click(); } });
        $('[data-blanhchon]', hop).onclick = function () { file.click(); };
        file.onchange = async function () {
          var f0 = this.files && this.files[0]; this.value = ''; if (!f0) return;
          try { var blob = await NW.nenAnh(f0, { canhDai: 1200 }); anhChon[khoa] = { blob: blob, url: URL.createObjectURL(blob) }; }
          catch (e) { NW.toast('Không đọc được ảnh.', true); return; }
          xem.hidden = false; xem.innerHTML = '<img src="' + anhChon[khoa].url + '" alt=""><button type="button" data-boanh aria-label="Bỏ ảnh">' + IC.dong + '</button>';
          $('[data-boanh]', xem).onclick = boAnh; kiem(); ta.focus();
        };
        function boAnh() { delete anhChon[khoa]; xem.hidden = true; xem.innerHTML = ''; kiem(); }
        var bo = $('[data-boanh]', xem); if (bo) bo.onclick = boAnh;
        var huy = $('[data-huytra]', hop); if (huy) huy.onclick = function () { dangTraLoi = null; delete anhChon[khoa]; veBl(); };
        if (khoa) setTimeout(function () { ta.focus(); }, 40);
        gui.onclick = async function () {
          var chu = ta.value.trim(), a = anhChon[khoa];
          if (!chu && !a) return;
          var tu = await NW.kiemTuCam(chu); if (tu) { NW.toast('Bình luận có từ không phù hợp ("' + tu + '").', true); return; }
          var b = { uid: toi.uid, tacGia: NW.tomTat(toi), chu: chu, anh: '', traLoiCho: khoa || null, luc: Date.now(), camXuc: {} };
          if (NW.laBanThu()) {
            b.id = 'm' + Date.now(); b.anh = a ? a.url : ''; blDs.push(b); delete anhChon[khoa]; if (khoa) { blBung[khoa] = true; dangTraLoi = null; }
            capNhatDem(1); veBl(); if (!khoa) $('[data-nhap=""] textarea', khuBl).focus(); return;
          }
          gui.disabled = true;
          try {
            if (a) b.anh = await NW.taiAnh(a.blob, NW.tenAnhMoi('_c'));
            var f = await NW.fb();
            var ref = await f.fs.addDoc(f.fs.collection(f.db, 'nwPosts', id, 'binhLuan'), b);
            await f.fs.updateDoc(f.fs.doc(f.db, 'nwPosts', id), { soBinhLuan: f.fs.increment(1) });
            capNhatDem(1);
            blDs.push(Object.assign({ id: ref.id }, b)); delete anhChon[khoa]; if (khoa) { blBung[khoa] = true; dangTraLoi = null; }
            veBl(); if (!khoa) $('[data-nhap=""] textarea', khuBl).focus();
            if (!cuaToi) NW.guiThongBao(bai.uid, { loai: 'binhLuan', chu: (chu || '📷 ảnh').slice(0, 80), link: 'baidang.html?id=' + id });
            if (khoa) { var g = blDs.filter(function (x) { return x.id === khoa; })[0]; if (g && g.uid !== toi.uid && g.uid !== bai.uid) NW.guiThongBao(g.uid, { loai: 'binhLuan', chu: 'đã trả lời: ' + (chu || '📷 ảnh').slice(0, 70), link: 'baidang.html?id=' + id }); }
          } catch (e) { NW.toast(NW.chuLoiKho(e), true); gui.disabled = false; }
        };
      });
      var them = $('[data-blthem]', khuBl); if (them) them.onclick = function () { taiBl(true); };
      $$('[data-bung]', khuBl).forEach(function (b) { b.onclick = function () { blBung[b.getAttribute('data-bung')] = true; veBl(); }; });
      $$('[data-blanh]', khuBl).forEach(function (b) { b.onclick = function () { NW.xemAnh(b.getAttribute('data-blanh')); }; });
      // từng bình luận
      $$('[data-bl]', khuBl).forEach(function (row) {
        var bid = row.getAttribute('data-bl');
        var b = blDs.filter(function (x) { return x.id === bid; })[0];
        var xoa = $('[data-blxoa]', row);
        if (xoa) xoa.onclick = async function () {
          var con = blDs.filter(function (x) { return x.traLoiCho === bid; });
          if (!(await NW.hoi('Xoá bình luận?', con.length ? 'Bình luận này và ' + con.length + ' câu trả lời sẽ mất luôn.' : 'Bình luận này sẽ mất luôn.', { ok: 'Xoá', nguy: true }))) return;
          var mat = [bid].concat(con.map(function (x) { return x.id; }));
          blDs = blDs.filter(function (x) { return mat.indexOf(x.id) < 0; }); capNhatDem(-mat.length); veBl();
          if (NW.laBanThu()) return;
          try {
            var f = await NW.fb();
            for (var i = 0; i < mat.length; i++) await f.fs.deleteDoc(f.fs.doc(f.db, 'nwPosts', id, 'binhLuan', mat[i]));
            await f.fs.updateDoc(f.fs.doc(f.db, 'nwPosts', id), { soBinhLuan: f.fs.increment(-mat.length) });
          } catch (e) { NW.toast(NW.chuLoiKho(e), true); }
        };
        var tra = $('[data-bltra]', row);
        if (tra) tra.onclick = function () {
          dangTraLoi = { goc: tra.getAttribute('data-bltra'), ten: tra.getAttribute('data-ten') };
          veBl();
          var ta = $('[data-nhap="' + dangTraLoi.goc + '"] textarea', khuBl);
          if (ta && b.traLoiCho) { ta.value = '@' + tra.getAttribute('data-ten') + ' '; ta.dispatchEvent(new Event('input')); }
        };
        var cxNut = $('[data-blcx]', row);
        if (cxNut) NW.ganCamXuc(cxNut, {
          hienTai: function () { return (b.camXuc || {})[toi.uid] || ''; },
          chon: async function (moi) {
            b.camXuc = b.camXuc || {};
            if (moi) b.camXuc[toi.uid] = moi; else delete b.camXuc[toi.uid];
            veBl();
            if (NW.laBanThu()) return;
            try {
              var f = await NW.fb(); var patch = {}; patch['camXuc.' + toi.uid] = moi || f.fs.deleteField();
              await f.fs.updateDoc(f.fs.doc(f.db, 'nwPosts', id, 'binhLuan', bid), patch);
            } catch (e) { NW.toast(NW.chuLoiKho(e), true); }
          }, macDinh: 'tim' });
      });
    }
    $$('[data-mobl]', el).forEach(function (b) { b.onclick = moBl; });
    if (o.moBinhLuan) moBl();

    // ---- chia sẻ ----
    $('[data-chiase]', el).onclick = function () {
      var gocId = bai.chiaSeTu || id;
      var gocBai = bai.chiaSeTu ? bai.goc : { uid: bai.uid, tacGia: bai.tacGia, chu: bai.chu, anh: bai.anh || [], luc: bai.luc };
      if (!gocBai) { NW.toast('Bài gốc không còn.', true); return; }
      var p = NW.popMo({ tieuDe: 'Chia sẻ về trang của em', html:
        '<textarea id="csChu" rows="2" placeholder="Nói gì đó về bài này (không bắt buộc)…" maxlength="' + CFG.TOI_DA_CHU_BAI + '"></textarea>' +
        '<div class="bai-goc" style="margin-top:10px">' + dauBai(gocBai.tacGia, gocBai.luc) + chuBai(gocBai.chu, true) + '</div>',
        chan: '<button class="btn soft" data-dong>Thôi</button><button class="btn primary" id="csOk">Chia sẻ</button>' });
      $('[data-dong]', p).onclick = NW.popDong;
      $('#csOk', p).onclick = async function () {
        var chu = $('#csChu', p).value.trim();
        var tu = await NW.kiemTuCam(chu); if (tu) { NW.toast('Có từ không phù hợp ("' + tu + '").', true); return; }
        if (NW.laBanThu()) { NW.popDong(); NW.toast('Bàn thử: không ghi thật.'); return; }
        this.disabled = true;
        try {
          var f = await NW.fb();
          var moi = { uid: toi.uid, tacGia: NW.tomTat(toi), chu: chu, anh: [], pham: 'mang', lop: toi.laThay ? 'GV' : (toi.lop || ''), luc: Date.now(),
            an: false, ghim: false, camXuc: {}, soBinhLuan: 0, soChiaSe: 0, chiaSeTu: gocId,
            goc: { uid: gocBai.uid, tacGia: gocBai.tacGia, chu: gocBai.chu || '', anh: gocBai.anh || [], luc: gocBai.luc } };
          await f.fs.addDoc(f.fs.collection(f.db, 'nwPosts'), moi);
          try { await f.fs.updateDoc(f.fs.doc(f.db, 'nwPosts', gocId), { soChiaSe: f.fs.increment(1) }); } catch (e) { }
          NW.popDong(); NW.toast('Đã chia sẻ về trang của em.');
          if (gocBai.uid !== toi.uid) NW.guiThongBao(gocBai.uid, { loai: 'chiaSe', chu: (gocBai.chu || '').slice(0, 60), link: 'canhan.html?uid=' + toi.uid });
        } catch (e) { NW.toast(NW.chuLoiKho(e), true); this.disabled = false; }
      };
    };

    // ---- v14: ✕ = ẩn bài này khỏi bảng tin CỦA EM (nhớ trên máy, có Hoàn tác) ----
    $('[data-anbai]', el).onclick = function () {
      var ds = Bai.dsAnCuaToi(); if (ds.indexOf(id) < 0) ds.push(id); Bai.luuAnCuaToi(ds);
      var cho = document.createElement('div'); cho.className = 'card bai-da-an';
      cho.innerHTML = '<span>Đã ẩn bài này khỏi bảng tin của em.</span><button type="button" data-hoantac>Hoàn tác</button>';
      el.replaceWith(cho);
      $('[data-hoantac]', cho).onclick = function () { Bai.luuAnCuaToi(Bai.dsAnCuaToi().filter(function (x) { return x !== id; })); cho.replaceWith(el); };
    };

    // ---- menu ba chấm ----
    $('[data-menu]', el).onclick = function () {
      var nut = this; var items = [];
      items.push({ ic: IC.link, chu: 'Mở bài này', onclick: function () { NW.di('baidang.html?id=' + id); } });
      if (cuaToi && !bai.chiaSeTu) items.push({ ic: IC.sua, chu: 'Sửa bài', onclick: suaBai });
      if (cuaToi || toi.laThay) items.push({ ic: IC.xoa, chu: 'Xoá bài', nguy: true, onclick: xoaBai });
      if (!cuaToi) items.push({ ic: IC.baoCao, chu: 'Báo cáo với thầy', onclick: baoCao });
      if (toi.laThay) {
        items.push({ ic: bai.an ? IC.hien : IC.an, chu: bai.an ? 'Hiện lại bài' : 'Ẩn bài (thầy)', onclick: function () { thayDoi({ an: !bai.an }); } });
        items.push({ ic: IC.ghim, chu: bai.ghim ? 'Bỏ ghim' : 'Ghim lên đầu', onclick: function () { thayDoi({ ghim: !bai.ghim }); } });
        // v18 (thầy chốt 22/09): chỉ THẦY ghim bài vào mục NỔI BẬT của trang Khám phá; gỡ được ở đây hoặc ở Khám phá
        items.push({ ic: IC.sao, chu: bai.noiBat ? 'Gỡ khỏi Nổi bật' : 'Ghim vào Nổi bật (Khám phá)', onclick: function () { thayDoi({ noiBat: !bai.noiBat, noiBatLuc: bai.noiBat ? 0 : Date.now() }); } });
      }
      NW.menuNho(nut, items);
    };
    async function thayDoi(patch) {
      if (NW.laBanThu()) { Object.assign(bai, patch); el.replaceWith(Bai.dung(bai, id, o)); NW.toast('Bàn thử: đổi trên máy em, không ghi thật.'); return; }
      try {
        var f = await NW.fb();
        await f.fs.updateDoc(f.fs.doc(f.db, 'nwPosts', id), patch);
        Object.assign(bai, patch);
        var moi = Bai.dung(bai, id, o); el.replaceWith(moi);
        NW.toast('Đã cập nhật.');
      } catch (e) { NW.toast(NW.chuLoiKho(e), true); }
    }
    function suaBai() {
      var p = NW.popMo({ tieuDe: 'Sửa bài', html: '<textarea id="suaChu" rows="5" maxlength="' + CFG.TOI_DA_CHU_BAI + '">' + an(bai.chu) + '</textarea>',
        chan: '<button class="btn soft" data-dong>Thôi</button><button class="btn primary" id="suaOk">Lưu</button>' });
      $('[data-dong]', p).onclick = NW.popDong;
      $('#suaOk', p).onclick = async function () {
        var chu = $('#suaChu', p).value.trim();
        var tu = await NW.kiemTuCam(chu); if (tu) { NW.toast('Có từ không phù hợp ("' + tu + '").', true); return; }
        NW.popDong(); thayDoi({ chu: chu, suaLuc: Date.now() });
      };
    }
    async function xoaBai() {
      if (!(await NW.hoi('Xoá bài này?', 'Bài và mọi bình luận trong đó sẽ mất luôn.', { ok: 'Xoá', nguy: true }))) return;
      if (NW.laBanThu()) { el.remove(); return; }
      try {
        var f = await NW.fb();
        await f.fs.deleteDoc(f.fs.doc(f.db, 'nwPosts', id));
        el.remove(); NW.toast('Đã xoá bài.');
      } catch (e) { NW.toast(NW.chuLoiKho(e), true); }
    }
    function baoCao() {
      var p = NW.popMo({ tieuDe: 'Báo cáo bài này với thầy', html:
        '<label class="lbl">Lý do</label><select id="bcLyDo" style="width:100%;padding:10px 12px;border-radius:12px;border:1.5px solid var(--line);font-weight:600">' +
        '<option value="khong-phu-hop">Nội dung không phù hợp</option><option value="bat-nat">Trêu chọc / bắt nạt bạn</option>' +
        '<option value="gia-mao">Giả mạo người khác</option><option value="khac">Khác</option></select>' +
        '<label class="lbl" style="margin-top:12px">Nói rõ hơn (không bắt buộc)</label><textarea id="bcChu" rows="3" maxlength="300"></textarea>',
        chan: '<button class="btn soft" data-dong>Thôi</button><button class="btn nguy" id="bcOk">Gửi báo cáo</button>' });
      $('[data-dong]', p).onclick = NW.popDong;
      $('#bcOk', p).onclick = async function () {
        if (NW.laBanThu()) { NW.popDong(); NW.toast('Bàn thử: không ghi thật.'); return; }
        this.disabled = true;
        try {
          var f = await NW.fb();
          await f.fs.addDoc(f.fs.collection(f.db, 'nwBaoCao'), { tu: toi.uid, tuTen: toi.ten, baiId: id, uidBai: bai.uid, tenBai: (bai.tacGia || {}).ten || '',
            lyDo: $('#bcLyDo', p).value, chu: $('#bcChu', p).value.trim().slice(0, 300), tomTat: (bai.chu || '').slice(0, 120), luc: Date.now(), trangThai: 'moi' });
          NW.popDong(); NW.toast('Đã gửi báo cáo tới thầy. Cảm ơn em.');
        } catch (e) { NW.toast(NW.chuLoiKho(e), true); this.disabled = false; }
      };
    }
    return el;
  };

  // v14 — bài em đã ẩn khỏi bảng tin (localStorage theo uid; chưa cần kho)
  Bai.dsAnCuaToi = function () { try { return JSON.parse(localStorage.getItem('nwAnBai_' + NW.toi.uid) || '[]'); } catch (e) { return []; } };
  Bai.luuAnCuaToi = function (ds) { try { localStorage.setItem('nwAnBai_' + NW.toi.uid, JSON.stringify(ds.slice(-200))); } catch (e) { } };

  // ---------- dòng bài có phân trang ----------
  // o = { hop, loai:'bangTin'|'cuaNguoi'|'daAn', uid, lopCuaToi:[...] }
  // v0.4.0 — em có được XEM bài này không (theo phạm vi thầy chốt): thầy xem hết · mình xem của mình ·
  // minh: chỉ tác giả · lop: cùng lớp · ban: bạn bè hoặc cùng lớp tác giả hoặc bài thầy · mang: ai cũng xem.
  Bai.xemDuoc = function (b, banSet) {
    var toi = NW.toi, lops = toi.cacLop || [toi.lop];
    if (toi.laThay) return true;
    if (b.uid === toi.uid) return true;
    if (b.an) return false;
    var tg = b.tacGia || {};
    if (b.pham === 'minh') return false;
    if (b.pham === 'lop') return lops.indexOf(b.lop) >= 0;
    if (b.pham === 'ban') return tg.vaiTro === 'gv' || (tg.cacLop || [tg.lop]).some(function (l) { return l && lops.indexOf(l) >= 0; }) || !!(banSet && banSet.has(b.uid));
    return true;
  };

  Bai.dongBai = function (o) {
    var hop = o.hop, toi = NW.toi;
    var cuoi = null, het = false, dangTai = false, banSet = null;
    var lops = o.lopCuaToi || toi.cacLop || [];
    hop.innerHTML = '';
    var chan = document.createElement('div'); chan.className = 'tai-them';
    var nut = document.createElement('button'); nut.className = 'btn soft nho'; nut.textContent = 'Tải thêm'; nut.type = 'button';
    chan.appendChild(nut); hop.after(chan); chan.hidden = true;

    var anCuaToi = o.loai === 'bangTin' ? Bai.dsAnCuaToi() : [];
    function hienDuoc(b, id) {
      if (o.loai === 'daAn') return true;
      if (anCuaToi.indexOf(id) >= 0) return false;
      return Bai.xemDuoc(b, banSet);
    }
    async function tai() {
      if (dangTai || het) return;
      dangTai = true; nut.disabled = true; nut.textContent = 'Đang tải…'; chan.hidden = false;
      try {
        if (!banSet) banSet = await NW.dsBanUid();
        var ds = [];
        if (NW.laBanThu()) { ds = cuoi ? [] : Bai.mau(); het = true; }
        else {
          var f = await NW.fb();
          var rang = [];
          if (o.loai === 'cuaNguoi') rang.push(f.fs.where('uid', '==', o.uid));
          if (o.loai === 'daAn') rang.push(f.fs.where('an', '==', true));
          rang.push(f.fs.orderBy('luc', 'desc'));
          if (cuoi) rang.push(f.fs.startAfter(cuoi));
          rang.push(f.fs.limit(MOI_TRANG));
          var q = f.fs.query.apply(null, [f.fs.collection(f.db, 'nwPosts')].concat(rang));
          var snap = await f.fs.getDocs(q);
          snap.forEach(function (d) { ds.push({ id: d.id, bai: d.data() }); cuoi = d; });
          if (snap.size < MOI_TRANG) het = true;
        }
        var soHien = 0;
        ds.forEach(function (x) { if (hienDuoc(x.bai, x.id)) { hop.appendChild(Bai.dung(x.bai, x.id, { gon: true })); soHien++; } });
        if (o.sauTai) o.sauTai(ds.filter(function (x) { return hienDuoc(x.bai, x.id); }));  // v0.3.0: trang cá nhân gom ảnh cho tab ẢNH
        if (!hop.children.length && het) hop.innerHTML = '<div class="card trong">' + IC.bangTin + '<br>' + an(o.chuTrong || 'Chưa có bài nào. Em đăng bài đầu tiên nhé!') + '</div>';
        // Trang toàn bài bị lọc (chỉ-lớp của lớp khác) thì tự tải tiếp cho đỡ trống.
        if (!soHien && !het && ds.length) { dangTai = false; return tai(); }
      } catch (e) {
        hop.insertAdjacentHTML('beforeend', '<div class="card trong">' + an(NW.chuLoiKho(e)) + '</div>');
        het = true;
      }
      dangTai = false; nut.disabled = false; nut.textContent = 'Tải thêm'; chan.hidden = het;
    }
    nut.onclick = tai;
    // tự tải khi cuộn gần đáy
    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) { if (es[0].isIntersecting && !het) tai(); }, { rootMargin: '400px' }) : null;
    if (io) io.observe(chan);
    tai();
    return {
      chenDau: function (bai, id) {
        var t = $('.trong', hop); if (t && t.parentNode === hop) t.remove();
        hop.insertBefore(Bai.dung(bai, id, { gon: true }), hop.firstChild);
      },
      taiLai: function () { cuoi = null; het = false; hop.innerHTML = ''; tai(); }
    };
  };

  // ---------- một bài (baidang.html) ----------
  Bai.mot = async function (hop, id) {
    hop.innerHTML = '<div class="xoay"></div>';
    try {
      if (NW.laBanThu()) { var m = Bai.mau()[0]; hop.innerHTML = ''; hop.appendChild(Bai.dung(m.bai, m.id, { gon: false, moBinhLuan: true })); return; }
      var f = await NW.fb();
      var snap = await f.fs.getDoc(f.fs.doc(f.db, 'nwPosts', id));
      hop.innerHTML = '';
      if (!snap.exists()) { hop.innerHTML = '<div class="card trong">Bài này không còn.</div>'; return; }
      var bai = snap.data();
      if (bai.an && !NW.toi.laThay && bai.uid !== NW.toi.uid) { hop.innerHTML = '<div class="card trong">Bài này đang được thầy ẩn.</div>'; return; }
      hop.appendChild(Bai.dung(bai, id, { gon: false, moBinhLuan: true }));
    } catch (e) { hop.innerHTML = '<div class="card trong">' + an(NW.chuLoiKho(e)) + '</div>'; }
  };

  // ---------- dữ liệu mẫu cho bàn thử ----------
  Bai.mau = function () {
    var t = Date.now();
    var tg0 = { uid: 'hs_0', ten: 'BẠN THỬ', anh: '', lop: 'A1C', vaiTro: 'hs' };
    var tg1 = { uid: 'hs_1', ten: 'MINH ANH', anh: '', lop: 'A1C', vaiTro: 'hs' };
    var tg2 = { uid: 'gv', ten: 'Thầy Andrew', anh: 'assets/avatar-tron.jpg', lop: 'GV', vaiTro: 'gv' };
    var tg3 = { uid: 'hs_2', ten: 'BẢO NAM', anh: '', lop: 'B2B', vaiTro: 'hs' };
    var tg5 = { uid: 'hs_5', ten: 'THẢO VY', anh: '', lop: 'A1C', vaiTro: 'hs' };
    // ảnh mẫu = SVG tô màu (không cần file), w×h để thấy khung cắt ảnh dọc/ngang
    function anhMau(chu, m1, m2, w, h) {
      var sv = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + m1 + '"/><stop offset="1" stop-color="' + m2 + '"/></linearGradient></defs>' +
        '<rect width="' + w + '" height="' + h + '" fill="url(#g)"/><circle cx="' + (w * .78) + '" cy="' + (h * .25) + '" r="' + (Math.min(w, h) * .13) + '" fill="rgba(255,255,255,.35)"/>' +
        '<text x="' + (w / 2) + '" y="' + (h / 2 + 14) + '" font-family="Montserrat,Arial" font-size="' + Math.round(Math.min(w, h) * .11) + '" font-weight="800" fill="rgba(255,255,255,.9)" text-anchor="middle">' + chu + '</text></svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sv);
    }
    var A = {
      sao: anhMau('3 SAO LISTENING', '#0E7C6E', '#5CC9B6', 1200, 800),
      hoc1: anhMau('GÓC HỌC TẬP', '#3E7BFA', '#8BB4FF', 900, 1200), hoc2: anhMau('SỔ TAY', '#F2A93B', '#FFD27A', 1200, 900), hoc3: anhMau('BÚT MÀU', '#E0575B', '#FF9A9C', 1200, 900),
      sp1: anhMau('TEAM 1', '#6C5CE7', '#A29BFE', 1200, 800), sp2: anhMau('TEAM 2', '#00B894', '#55EFC4', 1200, 800), sp3: anhMau('TEAM 3', '#E17055', '#FAB1A0', 800, 1200),
      sp4: anhMau('TEAM 4', '#0984E3', '#74B9FF', 1200, 800), sp5: anhMau('CẢ LỚP', '#FDCB6E', '#FFEAA7', 1200, 800), sp6: anhMau('BONUS', '#D63031', '#FF7675', 1200, 800),
      bl: anhMau('EM CHỤP', '#00CEC9', '#81ECEC', 1000, 750), lop1: anhMau('BẢNG', '#636E72', '#B2BEC3', 1200, 800), lop2: anhMau('SÂN', '#00B894', '#DFE6E9', 1200, 800)
    };
    return [
      { id: 'm1', bai: { uid: 'gv', tacGia: tg2, chu: 'Chào cả mạng! Đây là bảng tin của Andrew Classes. Các em đăng bài lịch sự, thân thiện nhé. 😊', anh: [], pham: 'mang', lop: 'GV', luc: t - 3600e3, an: false, ghim: true, noiBat: true, noiBatLuc: t - 3000e3, camXuc: { hs_1: 'tim', hs_2: 'like', hs_3: 'haha' }, soBinhLuan: 2, soChiaSe: 1, chiaSeTu: null, goc: null,
        _blMau: [{ id: 'b1', uid: 'hs_1', tacGia: tg1, chu: 'Dạ vâng ạ!', luc: t - 3000e3, camXuc: {} }, { id: 'b2', uid: 'hs_2', tacGia: tg3, chu: 'Em chào thầy 🙌', luc: t - 2000e3, camXuc: { hs_1: 'tim' } }] } },
      { id: 'm0', bai: { uid: 'hs_0', tacGia: tg0, chu: 'Được 3 sao bài Listening hôm nay 🥳 Cảm ơn Minh Anh đã ôn cùng!', anh: [A.sao], pham: 'ban', lop: 'A1C', luc: t - 300e3, an: false, ghim: false,
        camXuc: { hs_1: 'tim', hs_5: 'like' }, soBinhLuan: 1, soChiaSe: 0, chiaSeTu: null, goc: null, gan: [{ uid: 'hs_1', ten: 'MINH ANH' }], camGiac: { ma: 'tuyetVoi', ky: '🥳', chu: 'tuyệt vời', loai: 'cam' },
        _blMau: [{ id: 'c0', uid: 'hs_1', tacGia: tg1, chu: 'Giỏi quá 👏 mai ôn tiếp nha', luc: t - 200e3, camXuc: { hs_0: 'tim' } }] } },
      { id: 'm3', bai: { uid: 'hs_2', tacGia: tg3, chu: 'Chia sẻ lại bài của thầy cho lớp mình xem.', anh: [], pham: 'mang', lop: 'B2B', luc: t - 600e3, an: false, ghim: false, camXuc: {}, soBinhLuan: 0, soChiaSe: 0, chiaSeTu: 'm1', goc: { uid: 'gv', tacGia: tg2, chu: 'Chào cả mạng! Đây là bảng tin của Andrew Classes.', anh: [], luc: t - 3600e3 } } },
      { id: 'm4', bai: { uid: 'hs_5', tacGia: tg5, chu: 'Góc học tập mới của em, tối nay cày WORDS 3 💪', anh: [A.hoc1, A.hoc2, A.hoc3], pham: 'lop', lop: 'A1C', luc: t - 1500e3, an: false, ghim: false, noiBat: true, noiBatLuc: t - 1000e3,
        camXuc: { hs_1: 'tim', hs_0: 'ngac', hs_6: 'tim' }, soBinhLuan: 0, soChiaSe: 0, chiaSeTu: null, goc: null, gan: [], camGiac: { ma: 'hocBai', ky: '📚', chu: 'học bài', loai: 'hd' } } },
      { id: 'm2', bai: { uid: 'hs_1', tacGia: tg1, chu: 'Hôm nay em làm xong hết bài WORDS 2 rồi, 100% luôn 🎉 Bạn nào chưa làm thì làm nhanh kẻo hết hạn nha https://andrewclasses.com', anh: [], pham: 'ban', lop: 'A1C', luc: t - 1800e3, an: false, ghim: false, camXuc: { hs_0: 'tim', hs_2: 'cuoi' }, soBinhLuan: 0, soChiaSe: 0, chiaSeTu: null, goc: null } },
      { id: 'm6', bai: { uid: 'gv', tacGia: tg2, chu: 'Ảnh buổi Speaking Test tuần này 📸 Các đội làm rất tốt, tuần sau công bố kết quả nhé!', anh: [A.sp1, A.sp2, A.sp3, A.sp4, A.sp5, A.sp6], pham: 'mang', lop: 'GV', luc: t - 3000e3, an: false, ghim: false, noiBat: true, noiBatLuc: t - 2000e3,
        camXuc: { hs_1: 'tim', hs_2: 'tim', hs_3: 'haha', hs_5: 'ngac', hs_6: 'like', hs_7: 'tim', hs_8: 'cuoi' }, soBinhLuan: 5, soChiaSe: 2, chiaSeTu: null, goc: null,
        gan: [{ uid: 'hs_1', ten: 'MINH ANH' }, { uid: 'hs_5', ten: 'THẢO VY' }, { uid: 'hs_2', ten: 'BẢO NAM' }], camGiac: null,
        _blMau: [
          { id: 'c1', uid: 'hs_1', tacGia: tg1, chu: 'Thầy ơi ảnh đẹp quá 😍 đội em ở tấm 2 kìa', luc: t - 2800e3, camXuc: { hs_2: 'tim', hs_5: 'haha', gv: 'like' } },
          { id: 'c1a', uid: 'gv', tacGia: tg2, chu: 'Cảm ơn em, đội em nói rất tự tin đó!', luc: t - 2700e3, camXuc: { hs_1: 'tim' }, traLoiCho: 'c1' },
          { id: 'c1b', uid: 'hs_5', tacGia: tg5, chu: '@MINH ANH mình đứng góc trái kìa 😂', luc: t - 2600e3, camXuc: {}, traLoiCho: 'c1' },
          { id: 'c1c', uid: 'hs_2', tacGia: tg3, chu: 'Đội B2B cũng có mặt nha 🙋', luc: t - 2500e3, camXuc: {}, traLoiCho: 'c1' },
          { id: 'c2', uid: 'hs_2', tacGia: tg3, chu: 'Em chụp thêm được tấm này ạ', anh: A.bl, luc: t - 2400e3, camXuc: { hs_1: 'haha', hs_0: 'tim' } },
          { id: 'c3', uid: 'hs_0', tacGia: tg0, chu: 'Thầy gửi lại ảnh gốc cho em với ạ 🙏', luc: t - 2000e3, camXuc: {} }
        ] } },
      { id: 'm7', bai: { uid: 'hs_1', tacGia: tg1, chu: 'Lớp mình hôm nay 🏫', anh: [A.lop1, A.lop2], pham: 'lop', lop: 'A1C', luc: t - 7200e3, an: false, ghim: false, camXuc: { hs_5: 'tim' }, soBinhLuan: 0, soChiaSe: 0, chiaSeTu: null, goc: null, gan: [], camGiac: { ma: 'oLop', ky: '🏫', chu: 'ở lớp', loai: 'hd' } } }
    ];
  };
})();
