/* lienhe.js — KHUNG NGƯỜI LIÊN HỆ ở cột phải bảng tin (v0.9.2, thầy chốt 23/09/2026).
   Thay cho khung "Lớp của em" cũ: danh sách = THẦY + bạn CÙNG LỚP + bạn KHÁC LỚP đã kết bạn (trừ người em đang chặn).
   Đầu khung có nút TÌM (lọc theo tên) và nút ⋯ mở bảng CÀI ĐẶT ĐOẠN CHAT:
     · Âm thanh tin nhắn · Hiển thị danh bạ · Trạng thái hoạt động  → lưu THEO MÁY (localStorage, xem NW.caiDat)
     · Danh sách chặn → pop-up, bỏ chặn tại chỗ (xem NW.dsChan / NW.datChan trong loi.js)
   "Hiển thị danh bạ" TẮT = khung vẫn còn nhưng chỉ hiện Thầy Andrew (thầy chốt 23/09).
   Bấm AVATAR → trang cá nhân · bấm TÊN → hộp chat nổi (js/chatnoi.js).
   Dùng: NW.LienHe.dung({ hop: <div.card> }) — tự lo cả bàn thử lẫn kho thật. */
(function () {
  'use strict';
  var NW = window.NW, $ = NW.$, $$ = NW.$$, IC = NW.IC, an = NW.chuAnToan;
  var LH = NW.LienHe = {};

  // Người mẫu cho bàn thử: thầy + 11 bạn cùng lớp A1C + 2 bạn KHÁC LỚP đã kết bạn.
  var NGUOI_THU = [
    // bàn thử CỐ TÌNH để thầy cũng sinh nhật hôm nay — để thấy rõ luật "không bao giờ hiện sinh nhật của thầy"
    { uid: 'gv', ten: 'Thầy Andrew', vaiTro: 'gv', anh: 'assets/avatar-tron.jpg', sinhNhat: 'HOM_NAY' },
    // bàn thử: MINH ANH để sinh nhật ĐÚNG HÔM NAY (tính lúc chạy) để thầy xem được khung; THẢO VY ngày khác ⇒ không hiện
    { uid: 'hs_1', ten: 'MINH ANH', lop: 'A1C', online: true, sinhNhat: 'HOM_NAY' }, { uid: 'hs_5', ten: 'THẢO VY', lop: 'A1C', sinhNhat: '01/01' },
    { uid: 'hs_6', ten: 'GIA HUY', lop: 'A1C', online: true }, { uid: 'hs_7', ten: 'KHÁNH LINH', lop: 'A1C' },
    { uid: 'hs_8', ten: 'TUẤN KIỆT', lop: 'A1C' }, { uid: 'hs_9', ten: 'PHƯƠNG NHI', lop: 'A1C' },
    { uid: 'hs_10', ten: 'HOÀNG LONG', lop: 'A1C' }, { uid: 'hs_11', ten: 'BẢO CHÂU', lop: 'A1C' },
    { uid: 'hs_15', ten: 'ANH THƯ', lop: 'A1C' }, { uid: 'hs_16', ten: 'MINH KHANG', lop: 'A1C' },
    { uid: 'hs_17', ten: 'HÀ MY', lop: 'A1C' },
    { uid: 'hs_3', ten: 'BẢO NAM', lop: 'B2B', ban: true, online: true },       // khác lớp, đã kết bạn (trùng tên với bàn thử canhan.html)
    { uid: 'hs_13', ten: 'TRÚC LINH', lop: 'A2A', ban: true }                   // khác lớp, đã kết bạn — bạn này ĐANG CHẶN em (xem THU_HO_CHAN trong loi.js)
  ];

  var ds = [];          // cả danh sách đã gộp
  var hop, hopSN, khuDs, oTim, loc = '';

  // ---------- SINH NHẬT (thầy chốt 23/09) ----------
  // Chỉ hiện ĐÚNG HÔM có người trong danh bạ sinh nhật. KHÔNG BAO GIỜ hiện sinh nhật của thầy.
  // Hồ sơ chỉ giữ NGÀY/THÁNG (`sinhNhat` = 'dd/MM', không có năm) — đỡ lộ ngày sinh đầy đủ của học sinh.
  function ngayThangHomNay() {
    var d = new Date();
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
  }
  function laSinhNhatHomNay(n) {
    if (!n || n.vaiTro === 'gv') return false;                 // thầy: không bao giờ
    var s = String(n.sinhNhat || '').trim();
    if (!s) return false;
    var m = s.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})/);   // 'd/M' hoặc 'dd-MM'
    if (!m) return false;
    return ('0' + m[1]).slice(-2) + '/' + ('0' + m[2]).slice(-2) === ngayThangHomNay();
  }
  function veSinhNhat() {
    if (!hopSN) return;
    var d = ds.filter(laSinhNhatHomNay);
    hopSN.hidden = !d.length;
    if (!d.length) { hopSN.innerHTML = ''; return; }
    hopSN.className = 'card o sinh-nhat';
    hopSN.innerHTML = '<div class="lh-dau"><h3>' + IC.banh + 'Sinh nhật</h3></div>' +
      '<div class="ds-nguoi sn-ds">' + d.map(function (n, i) {
        return '<div class="nguoi" data-i="' + i + '"><a href="canhan.html?uid=' + an(n.uid) + '" title="Trang cá nhân">' + NW.avHtml(n, 'nho') + '</a>' +
          '<span><button type="button" class="ten-nut" data-chuc title="Nhắn lời chúc">' + an(n.ten) + '</button>' +
          '<span class="sn-mo">Hôm nay là sinh nhật của bạn ấy 🎉</span></span></div>';
      }).join('') + '</div>';
    $$('[data-chuc]', hopSN).forEach(function (b) {
      b.onclick = function () { NW.ChatNoi.mo(d[+b.closest('.nguoi').getAttribute('data-i')]); };
    });
  }

  // ---------- công tắc bật/tắt ----------
  function gatHtml(khoa, nhan, mo) {
    var bat = NW.caiDat()[khoa];
    return '<button type="button" class="lh-gat' + (bat ? ' bat' : '') + '" data-gat="' + khoa + '" role="switch" aria-checked="' + (bat ? 'true' : 'false') + '">' +
      '<span class="chu"><b>' + an(nhan) + '</b>' + (mo ? '<small>' + an(mo) + '</small>' : '') + '</span><i class="nut"></i></button>';
  }

  // ---------- bảng cài đặt (thả xuống dưới nút ⋯) ----------
  function moCaiDat(nut) {
    NW.menuDong();
    var b = document.createElement('div');
    b.className = 'menu-nho lh-caidat';
    b.innerHTML = '<div class="lh-cd-dau">Cài đặt đoạn chat</div>' +
      gatHtml('amThanh', 'Âm thanh tin nhắn', 'Kêu một tiếng khi có tin mới') +
      gatHtml('danhBa', 'Hiển thị danh bạ', 'Tắt thì khung chỉ còn thầy') +
      gatHtml('hoatDong', 'Trạng thái hoạt động', 'Cho bạn thấy chấm xanh của em') +
      '<button type="button" class="lh-cd-muc" data-chan>' + IC.chan + '<span>Danh sách chặn</span><i class="mui">›</i></button>';
    document.body.appendChild(b);
    var r = nut.getBoundingClientRect(), w = 268;
    b.style.width = w + 'px';
    b.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, r.right - w)) + 'px';
    b.style.top = (r.bottom + 6) + 'px';
    var phu = document.createElement('div'); phu.className = 'phu-nen';
    phu.onclick = function () { b.remove(); phu.remove(); };
    document.body.appendChild(phu);
    requestAnimationFrame(function () { b.classList.add('mo'); });

    $$('[data-gat]', b).forEach(function (g) {
      g.onclick = function () {
        var khoa = g.getAttribute('data-gat'), bat = !g.classList.contains('bat');
        g.classList.toggle('bat', bat); g.setAttribute('aria-checked', bat ? 'true' : 'false');
        NW.datCaiDat(khoa, bat);
        if (khoa === 'danhBa') ve();
        if (khoa === 'hoatDong') NW.toast(bat ? 'Bạn bè sẽ thấy em đang hoạt động.' : 'Em ẩn trạng thái hoạt động rồi.');
      };
    });
    $('[data-chan]', b).onclick = function () { b.remove(); phu.remove(); moDsChan(); };
  }

  // ---------- pop-up danh sách chặn ----------
  async function moDsChan() {
    var p = NW.popMo({ tieuDe: 'Danh sách chặn', html:
      '<p class="tiny" style="margin:0 0 10px;line-height:1.55">Người trong danh sách này không hiện trong danh bạ của em, và không nhắn tin cho em được.</p>' +
      '<div class="ds-nguoi" id="chanDs"><div class="xoay"></div></div>' });
    async function veDs() {
      var dsc = await NW.dsChan();
      $('#chanDs', p).innerHTML = dsc.length ? dsc.map(function (n, i) {
        return '<div class="nguoi" data-i="' + i + '">' + NW.avHtml(n, 'nho') +
          '<span><span class="ten">' + an(n.ten) + '</span><br><span class="lop">' + an(n.lop || '') + '</span></span>' +
          '<span class="cuoi"><button type="button" class="btn soft nho" data-bo="' + an(n.uid) + '">Bỏ chặn</button></span></div>';
      }).join('') : '<div class="trong">Em chưa chặn ai.</div>';
      $$('[data-bo]', p).forEach(function (b) {
        b.onclick = async function () {
          var n = dsc.filter(function (x) { return x.uid === b.getAttribute('data-bo'); })[0];
          b.disabled = true;
          await NW.datChan(n, false);
          NW.toast('Đã bỏ chặn ' + n.ten + '.');
          veDs(); tai();
        };
      });
    }
    veDs();
  }

  // ---------- vẽ danh sách ----------
  function ve() {
    if (!khuDs) return;
    var chiThay = !NW.caiDat().danhBa;
    var d = ds.filter(function (n) { return chiThay ? n.vaiTro === 'gv' : true; });
    if (loc) {
      var k = NW.khongDau(loc.toLowerCase());
      d = d.filter(function (n) { return NW.khongDau((n.ten || '').toLowerCase()).indexOf(k) >= 0; });
    }
    khuDs.innerHTML = d.length ? d.map(function (n, i) {
      return '<div class="nguoi" data-i="' + i + '"><a href="canhan.html?uid=' + an(n.uid) + '" title="Trang cá nhân">' + NW.avHtml(n, 'nho') + '</a>' +
        '<button type="button" class="ten-nut" data-chat title="Nhắn tin">' + an(n.ten) + (n.vaiTro === 'gv' ? NW.tichHtml('nho') : '') + '</button></div>';
    }).join('') : '<div class="tiny">' + (loc ? 'Không tìm thấy ai.' : (chiThay ? 'Em đang tắt hiển thị danh bạ.' : 'Chưa có ai.')) + '</div>';
    $$('[data-chat]', khuDs).forEach(function (b) {
      b.onclick = function () { NW.ChatNoi.mo(d[+b.closest('.nguoi').getAttribute('data-i')]); };
    });
  }

  // ---------- lấy dữ liệu ----------
  async function tai() {
    var toi = NW.toi;
    if (NW.laBanThu()) {
      NGUOI_THU.forEach(function (n) { if (n.sinhNhat === 'HOM_NAY') n.sinhNhat = ngayThangHomNay(); });
      var chan = (await NW.dsChan()).map(function (n) { return n.uid; });
      ds = NGUOI_THU.filter(function (n) { return n.uid !== toi.uid && chan.indexOf(n.uid) < 0; });
      ve(); veSinhNhat(); return;
    }
    var lops = toi.laThay ? [] : (toi.cacLop || [toi.lop]).filter(Boolean);
    try {
      var phan = await Promise.all([
        NW.dsThay().catch(function () { return []; }),
        Promise.all(lops.map(function (l) { return NW.nguoiTheoLop(l, 2 * 60 * 1000).catch(function () { return []; }); })),
        NW.dsBanUid().catch(function () { return new Set(); }),
        NW.dsChanUid().catch(function () { return new Set(); })
      ]);
      var thay = phan[0], theoLop = phan[1], banUid = phan[2], chanUid = phan[3];
      var gop = [], co = {};
      function them(n) { if (n && n.uid !== toi.uid && !co[n.uid] && !chanUid.has(n.uid)) { co[n.uid] = 1; gop.push(n); } }
      thay.forEach(them);
      theoLop.forEach(function (d) { d.forEach(them); });
      // bạn KHÁC LỚP đã kết bạn — chỉ đọc hồ sơ những uid chưa có trong danh sách
      var conThieu = [];
      banUid.forEach(function (u) { if (!co[u] && !chanUid.has(u) && u !== toi.uid) conThieu.push(u); });
      var hoSo = await Promise.all(conThieu.map(function (u) { return NW.hoSo(u).catch(function () { return null; }); }));
      hoSo.forEach(function (h, i) { if (h) them(Object.assign({ uid: conThieu[i] }, h)); });
      ds = gop;
    } catch (e) { console.warn('[nw] người liên hệ', e); }
    ve(); veSinhNhat();
  }

  // ---------- dựng khung ----------
  LH.dung = function (o) {
    hop = o.hop; hopSN = o.hopSinhNhat || null;
    if (hopSN) hopSN.hidden = true;
    hop.className = (hop.className + ' card o lien-he').trim();
    hop.innerHTML =
      '<div class="lh-dau"><h3>Người liên hệ</h3>' +
        '<button type="button" class="nut-tron" data-timnut title="Tìm người liên hệ" aria-label="Tìm người liên hệ">' + IC.timKiem + '</button>' +
        '<button type="button" class="nut-tron" data-cdnut title="Tuỳ chọn" aria-label="Tuỳ chọn">' + IC.baCham + '</button></div>' +
      '<input type="search" class="lh-tim" placeholder="Tìm tên bạn…" hidden>' +
      '<div class="ds-nguoi ds-lop lh-ds"><div class="xoay"></div></div>';
    khuDs = $('.lh-ds', hop); oTim = $('.lh-tim', hop);
    $('[data-timnut]', hop).onclick = function () {
      oTim.hidden = !oTim.hidden;
      if (oTim.hidden) { oTim.value = ''; loc = ''; ve(); } else oTim.focus();
    };
    oTim.addEventListener('input', function () { loc = this.value.trim(); ve(); });
    $('[data-cdnut]', hop).onclick = function () { moCaiDat(this); };
    tai();
    setInterval(function () { if (!document.hidden) tai(); }, 3 * 60 * 1000);
    // chặn/bỏ chặn ở nơi khác (hộp chat nổi) → vẽ lại danh sách
    document.addEventListener('nw-chan', function () { tai(); });
  };
})();
