/* ============================================================
   nw/js/gui-anh.js — EM GỬI ẢNH ĐẠI DIỆN / ẢNH BÌA ⇒ CHỜ THẦY DUYỆT (15/10/2026, web v1.343.0 — thầy chốt mẫu v1 + "ok build").
   Mẫu: D:\OTHERS\CLAUDE\myNetwork - thiet ke\mau-duyet-anh-v1\nw\mau\mau-anh-em.js. Máy chủ: hàm `nwAnh` (app may-chu/functions/nw-anh.js).

   NW.GuiAnh.batDau({ hs, ve, catAnh, chonBia }) — trang cá nhân CỦA EM gọi một lần:
     · đọc trạng thái (`nwAnh` việc trangThai): công tắc · lượt còn tuần này · ảnh đang chờ · ảnh bị từ chối chưa xem · khoá
     · phủ nhãn "CHỜ DUYỆT" lên avatar / bìa (CHỈ em thấy — mọi người vẫn thấy ảnh cũ) + thẻ trạng thái dưới hồ sơ
     · bấm máy ảnh ⇒ (tắt: "sắp mở" · đang chờ: hộp huỷ · khoá / hết lượt: hộp báo) ⇒ cắt ảnh như cũ ⇒ HỘP GỬI (cũ → mới,
       lượt còn, nội quy lần đầu) ⇒ GỬI THẦY DUYỆT.
   Thầy chốt: 1 lần/tuần mỗi loại (lượt mới 00:00 Thứ Hai) · huỷ ảnh đang chờ TRẢ lượt · máy lọc chặn KHÔNG tính lượt.
   ============================================================ */
(function () {
  'use strict';
  var $ = NW.$, an = NW.chuAnToan;
  var IC = {
    gio: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    mui: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    khien: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    chan: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>',
    lich: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    khoa: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
    x: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>'
  };
  var TEN = { av: 'ảnh đại diện', bia: 'ảnh bìa' }, TEN_HOA = { av: 'Ảnh đại diện', bia: 'Ảnh bìa' };
  var THU = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  function ngay(ms) { var d = new Date(ms); return THU[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1); }
  function gio(ms) { var d = new Date(ms); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function loiViet(e) { var cau = String((e && e.message) || ''); return /[à-ỹđ]/i.test(cau) ? cau.replace(/^FirebaseError:\s*/, '') : NW.chuLoiKho(e); }
  function dongPop(p) { p.querySelectorAll('[data-dong]').forEach(function (b) { b.onclick = NW.popDong; }); }

  var O = null, T = null;          // O = tuỳ chọn trang · T = trạng thái từ máy chủ
  // bàn thử trên máy (localhost ?thu=…): __GA_THU_GOI giả hàm máy chủ (trang thử riêng, không đưa lên)
  function goi(d) { return window.__GA_THU_GOI && NW.laBanThu() ? window.__GA_THU_GOI(d) : NW.goiHam('nwAnh', d); }

  function napLai() {
    return goi({ viec: 'trangThai' }).then(function (t) { T = t; phu(); return t; },
      function (e) { console.warn('[gui-anh] trạng thái lỗi', e); T = null; phu(); return null; });
  }

  // ───── phủ lên trang cá nhân (chỉ em thấy) ─────
  function phu() {
    var av = $('.ho-so .av.kho'), bia = $('#hoSo .bia');
    if (!av || !bia) return;
    var c = (T && T.cho) || {};
    var im = av.querySelector(':scope > img.ga-av');
    if (c.av) { if (!im) { im = document.createElement('img'); im.className = 'ga-av'; im.alt = ''; av.appendChild(im); } im.src = c.av.url; }
    else if (im) im.remove();
    var nh = av.querySelector('.ga-nhan'); if (nh) nh.remove();
    if (c.av) av.insertAdjacentHTML('beforeend', '<span class="ga-nhan">' + IC.gio + 'CHỜ DUYỆT</span>');
    var ib = bia.querySelector(':scope > img.ga-bia');
    if (c.bia) { if (!ib) { ib = document.createElement('img'); ib.className = 'ga-bia'; ib.alt = ''; bia.insertBefore(ib, bia.firstChild); } ib.src = c.bia.url; }
    else if (ib) ib.remove();
    var nb = bia.querySelector('.ga-nhan-bia'); if (nb) nb.remove();
    if (c.bia) bia.insertAdjacentHTML('beforeend', '<span class="ga-nhan-bia">' + IC.gio + 'Ảnh bìa mới đang chờ thầy duyệt · chỉ em thấy</span>');
    theTrangThai();
  }
  function theTrangThai() {
    var the = $('#gaTT');
    if (!the) { the = document.createElement('div'); the.id = 'gaTT'; $('#hoSo').insertAdjacentElement('afterend', the); }
    var html = '';
    ['av', 'bia'].forEach(function (k) {
      var c = T && T.cho && T.cho[k], r = T && T.tuChoi && T.tuChoi[k];
      if (c) html += '<div class="card ga-tt cho">' + IC.gio + '<div class="tt-chu"><b>' + TEN_HOA[k] + ' mới đang chờ thầy duyệt</b>' +
        '<span>Gửi lúc ' + gio(c.luc) + ' ' + ngay(c.luc) + '. Mọi người vẫn thấy ảnh cũ cho tới khi thầy duyệt.</span>' +
        '<span class="ga-lk"><button type="button" class="ga-link" data-kpe="' + k + '">Không phải em gửi?</button></span></div>' +
        '<img class="tt-anh' + (k === 'bia' ? ' bia' : '') + '" src="' + an(c.url) + '" alt=""><button class="btn soft" type="button" data-huy="' + k + '">Huỷ ảnh này</button></div>';
      else if (r) html += '<div class="card ga-tt tu-choi">' + IC.x + '<div class="tt-chu"><b>Thầy chưa duyệt ' + TEN[k] + ' mới của em</b>' +
        '<span>Lý do: <b>' + an(r.lyDo) + '</b>. ' + (T.con[k] > 0 ? 'Em chọn ảnh khác nhé.' : 'Tuần này em đã dùng lượt đổi ' + TEN[k] + '. Lượt mới: <b>' + ngay(T.luotMoi) + '</b>.') + '</span></div>' +
        '<img class="tt-anh mo' + (k === 'bia' ? ' bia' : '') + '" src="' + an(r.url) + '" alt=""><button class="btn soft" type="button" data-xem="' + k + '">Đã hiểu</button></div>';
    });
    if (T && T.khoaDen) html += '<div class="card ga-tt tu-choi">' + IC.khoa + '<div class="tt-chu"><b>Em đang tạm khoá đổi ảnh</b><span>Tới ' + ngay(T.khoaDen) + '. Có thắc mắc em nhắn thầy nhé.</span></div></div>';
    the.innerHTML = html;
    the.querySelectorAll('[data-huy]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-huy'); huy(k, false); }; });
    the.querySelectorAll('[data-kpe]').forEach(function (b) { b.onclick = function () { hopKhongPhaiEm(b.getAttribute('data-kpe')); }; });
    the.querySelectorAll('[data-xem]').forEach(function (b) {
      b.onclick = function () { var k = b.getAttribute('data-xem'); var id = T.tuChoi[k].id; T.tuChoi[k] = null; phu(); goi({ viec: 'daXem', id: id }).catch(function () { }); };
    });
  }

  // ───── bấm máy ảnh ─────
  function bam(k) {
    if (!T) return NW.sapMo(k === 'av' ? 'Đổi ảnh đại diện' : 'Đổi ảnh bìa');
    if (!T.mo[k]) return NW.sapMo(k === 'av' ? 'Đổi ảnh đại diện' : 'Đổi ảnh bìa');
    if (T.cho[k]) return hopDangCho(k);
    if (T.khoaDen) return hopBao('Em đang tạm khoá đổi ảnh', IC.khoa, 'Tới <b>' + ngay(T.khoaDen) + '</b> em mới gửi ảnh mới được.', 'Có thắc mắc em nhắn thầy nhé.', 'Đã hiểu');
    if (T.con[k] <= 0) return hopBao('Tuần này em đã đổi ' + TEN[k], IC.lich, 'Mỗi tuần em được gửi <b>' + T.han[k] + ' ' + TEN[k] + ' mới</b>.<br>Lượt mới: <b>' + ngay(T.luotMoi) + '</b>.', '', 'EM SẼ CHỜ!');
    if (k === 'av') O.catAnh(function (x) { hopGui('av', x); });
    else O.chonBia(function (x) { hopGui('bia', x); });
  }

  // x = { lon (base64), nho, goc, gocId, cat } (av) · { anh (base64) } (bia)
  function hopGui(k, x) {
    var moi = 'data:image/jpeg;base64,' + (k === 'av' ? x.lon : x.anh);
    var cu = k === 'av' ? (O.hs.anh || '') : (O.hs.bia || '');
    var goc = cu ? '<img src="' + an(cu) + '" alt="">' : (k === 'av' ? '<span class="goc-chu" style="background:' + NW.itMau(O.hs.ten) + '">' + an(NW.chuTat(O.hs.ten)) + '</span>' : '');
    var p = NW.popMo({ tieuDe: k === 'av' ? 'Gửi ảnh đại diện mới' : 'Gửi ảnh bìa mới', lop: 'ga-pop', html:
      '<div class="mg-hai' + (k === 'bia' ? ' bia' : '') + '">' +
        '<div class="mg-o"><div class="mg-nh">ĐANG DÙNG</div><div class="mg-anh">' + goc + '</div></div>' +
        '<div class="mg-mui">' + IC.mui + '</div>' +
        '<div class="mg-o"><div class="mg-nh moi">ẢNH MỚI</div><div class="mg-anh"><img src="' + moi + '" alt=""></div></div>' +
      '</div>' +
      '<div class="mg-tin">' + IC.gio + '<span><b>Thầy duyệt xong ảnh mới hiện cho mọi người.</b> Trong lúc chờ, mọi người vẫn thấy ảnh đang dùng' +
        (k === 'av' ? ' — ảnh đại diện còn hiện ở trang lớp, bảng xếp hạng và màn chiếu trên lớp.' : '.') + '</span></div>' +
      '<div class="mg-han">' + IC.lich + '<span>Tuần này em còn <b>' + T.con[k] + '/' + T.han[k] + '</b> lần gửi ' + TEN[k] + ' mới · lượt mới <b>' + ngay(T.luotMoi) + '</b></span></div>' +
      (T.lanDau ? '<div class="mg-quy"><div class="quy-dau">' + IC.khien + '<b>Nội quy ảnh</b></div><ul>' +
        '<li>Ảnh phù hợp với học sinh.</li><li>Không dùng ảnh của bạn khác khi bạn chưa đồng ý.</li>' +
        '<li>Không có chữ, ký hiệu hay cử chỉ xấu.</li><li>Thầy xem mọi ảnh trước khi hiện. Gửi ảnh không phù hợp nhiều lần sẽ bị tạm khoá đổi ảnh.</li></ul>' +
        '<label class="quy-ok"><input type="checkbox" id="gaDongY"> Em đã đọc và đồng ý</label></div>' : '') +
      '<p class="ga-loi" id="gaLoi" hidden></p>',
      chan: '<button class="btn soft" data-dong>Thôi</button><button class="btn primary" id="gaGui"' + (T.lanDau ? ' disabled' : '') + '>GỬI THẦY DUYỆT</button>' });
    dongPop(p);
    var dy = $('#gaDongY', p); if (dy) dy.onchange = function () { $('#gaGui', p).disabled = !dy.checked; };
    $('#gaGui', p).onclick = async function () {
      var nut = this; nut.disabled = true; nut.textContent = 'Đang gửi…';
      var d = Object.assign({ viec: 'gui', loai: k, dongY: !!(dy && dy.checked), dauMay: dauMay() }, x);
      try {
        var r = await goi(d);
        NW.popDong();
        if (r.chan) { await napLai(); return hopBao('Ảnh không gửi được', IC.chan, 'Máy kiểm tra thấy ảnh này <b>có thể không phù hợp</b> nên không gửi cho thầy.',
          'Lần này <b>không tính lượt</b> — em chọn ảnh khác nhé. Bị chặn nhiều lần sẽ tạm khoá đổi ảnh.' + (r.khoaDen ? '<br><b>Em đang tạm khoá đổi ảnh tới ' + ngay(r.khoaDen) + '.</b>' : ''), 'Đã hiểu', true); }
        await napLai();
        NW.toast('Đã gửi. Thầy duyệt xong ảnh mới hiện cho mọi người.');
      } catch (e) {
        var l = $('#gaLoi', p); if (l) { l.hidden = false; l.textContent = loiViet(e); }
        nut.disabled = false; nut.textContent = 'GỬI THẦY DUYỆT';
      }
    };
  }
  function hopDangCho(k) {
    var c = T.cho[k];
    var p = NW.popMo({ tieuDe: 'Em đang có ảnh chờ duyệt', lop: 'ga-pop', html:
      '<div class="mg-mot' + (k === 'bia' ? ' bia' : '') + '"><img src="' + an(c.url) + '" alt=""><span class="ga-nhan tinh">' + IC.gio + 'CHỜ DUYỆT</span></div>' +
      '<p class="mg-p">' + TEN_HOA[k] + ' mới gửi lúc <b>' + gio(c.luc) + ' ' + ngay(c.luc) + '</b> đang chờ thầy duyệt. Mỗi lần chỉ chờ được <b>1 ảnh</b>.</p>' +
      '<p class="mg-p nho">Huỷ ảnh này thì em được <b>trả lại lượt</b>, gửi ảnh khác ngay được.</p>',
      chan: '<button class="btn soft" id="gaHuy">Huỷ ảnh đang chờ</button><button class="btn primary" data-dong>Đóng</button>' });
    dongPop(p);
    $('#gaHuy', p).onclick = function () { NW.popDong(); huy(k, false); };
  }
  function hopKhongPhaiEm(k) {
    var p = NW.popMo({ tieuDe: 'Không phải em gửi?', lop: 'ga-pop', html:
      '<div class="mg-to do">' + IC.khien + '</div><p class="mg-p">Nếu em <b>không</b> gửi ảnh này, có thể ai đó đã dùng tài khoản của em.</p>' +
      '<p class="mg-p nho">Bấm "Báo thầy": ảnh bị huỷ ngay và thầy nhận được báo cáo để giúp em đặt lại mật khẩu.</p>',
      chan: '<button class="btn soft" data-dong>Thôi</button><button class="btn primary" id="gaBao">Báo thầy</button>' });
    dongPop(p);
    $('#gaBao', p).onclick = function () { NW.popDong(); huy(k, true); };
  }
  function hopBao(tieuDe, ic, chu, nho, nut, laDo) {
    var p = NW.popMo({ tieuDe: tieuDe, lop: 'ga-pop', html: '<div class="mg-to' + (laDo ? ' do' : '') + '">' + ic + '</div><p class="mg-p">' + chu + '</p>' + (nho ? '<p class="mg-p nho">' + nho + '</p>' : ''),
      chan: '<button class="btn primary" data-dong>' + (nut || 'Đóng') + '</button>' });
    dongPop(p);
  }
  async function huy(k, khongPhaiEm) {
    var c = T && T.cho[k]; if (!c) return;
    try {
      await goi({ viec: khongPhaiEm ? 'khongPhaiEm' : 'huy', id: c.id });
      await napLai();
      if (khongPhaiEm) hopBao('Đã báo thầy', IC.khien, 'Ảnh vừa gửi <b>đã bị huỷ</b> và thầy đã nhận được báo cáo.', 'Em nhắn thầy để đặt lại mật khẩu nhé.', 'Đóng');
      else NW.toast('Đã huỷ ảnh đang chờ — em được trả lại lượt.');
    } catch (e) { NW.toast(loiViet(e), true); napLai(); }
  }
  // dấu máy (cùng khoá "một tài khoản một máy" nếu có) — chỉ để thầy đối chiếu khi em báo "không phải em gửi"
  function dauMay() { try { return localStorage.getItem('nw_dauMay') || (function () { var v = Math.random().toString(36).slice(2, 12); localStorage.setItem('nw_dauMay', v); return v; })(); } catch (e) { return ''; } }

  NW.GuiAnh = {
    batDau: function (o) {
      O = o;
      // trang vẽ lại hồ sơ (ve()) ⇒ phủ lại; chỉ theo dõi con TRỰC TIẾP của #hoSo nên phu() không tự gọi lại mình
      new MutationObserver(phu).observe($('#hoSo'), { childList: true });
      return napLai();
    },
    bam: bam,
    napLai: napLai
  };
})();
