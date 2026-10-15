/* ============================================================
   js/thachdau.js — MỜI / NHẬN THÁCH ĐẤU (đấu game online 1–1, Đợt 2 · web v1.347.0, 15/10/2026)
   NW.ThachDau.moi(ban, o)  — em mời bạn: tạo `tranDau/{id}` (luật kiểm cùng lớp / giải đang mở), hộp chờ 60 giây;
                              bạn nhận ⇒ sang tran.html?id= · từ chối / hết giờ ⇒ báo · nút Huỷ lời mời.
                              o = { lop, giai ('' = giao hữu), phut, lv, tenGiai }
   NW.ThachDau.nghe()      — nghe lời mời ĐẾN em (b == em, trangThai 'moi'): thẻ góc màn có Nhận / Từ chối + vạch 60 giây.
                              Chạy ở mọi trang nw/ (thanh.js gọi). Khung giữ sống ?nhung=1 của trang lớp/khóa/dashboard
                              ⇒ báo trang mẹ (js/tn-khung.js vẽ thẻ) — trang mẹ trả lời { tk:'dau', id, nhan }.
   Bàn thử ?thu=1: mời ⇒ 3 giây sau "bạn nhận" ⇒ tran.html?thu=1&ban=… (đấu với máy).
   ============================================================ */
(function () {
  'use strict';
  var $ = NW.$, an = NW.chuAnToan;
  var TD = NW.ThachDau = {};
  var IC_KIEM = '<svg class="ic" viewBox="0 0 24 24"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/></svg>';

  // ---------- giao diện thẻ mời (tự chèn CSS — dùng ở mọi trang nw/) ----------
  function napCss() {
    if (document.getElementById('tdCss')) return;
    var s = document.createElement('style'); s.id = 'tdCss';
    s.textContent =
      '.td-moi{position:fixed;z-index:9000;top:calc(var(--cao-thanh,62px) + 12px);right:16px;width:min(340px,calc(100% - 32px));background:#fff;border-radius:16px;' +
      'box-shadow:0 14px 40px rgba(22,35,42,.22);border:1px solid var(--line,#E0EAE7);padding:14px;display:flex;flex-direction:column;gap:10px;animation:td-vao .35s cubic-bezier(.22,.9,.3,1);font-family:var(--sans,"Segoe UI",sans-serif)}' +
      '@keyframes td-vao{from{transform:translateX(30px);opacity:0}}' +
      '.td-moi .tren{display:flex;gap:10px;align-items:center}.td-moi .tren b{display:block;font-size:14px;color:var(--ink,#16232A)}' +
      '.td-moi .tren small{display:block;color:var(--muted,#5F7370);font-size:12px;font-weight:600}' +
      '.td-moi .ic-o{width:40px;height:40px;border-radius:50%;background:#0F4029;color:#9BFFC4;display:grid;place-items:center;flex:none}.td-moi .ic-o .ic{width:20px;height:20px}' +
      '.td-moi .vach{height:4px;border-radius:2px;background:var(--line,#E0EAE7);overflow:hidden}.td-moi .vach i{display:block;height:100%;background:var(--accent,#0E7C6E);transition:width 1s linear}' +
      '.td-moi .hai{display:grid;grid-template-columns:1fr 1.4fr;gap:8px}.td-moi .hai .btn{height:38px}' +
      '.td-cho{text-align:center}.td-cho .vs{display:flex;align-items:center;justify-content:center;gap:16px;margin:4px 0 12px}' +
      '.td-cho .vs i{font:italic 900 20px/1 var(--sans);color:var(--muted)}.td-cho .so{font:900 30px/1 var(--sans);color:var(--accent);margin:6px 0}' +
      '.td-cho p{margin:0;color:var(--muted);font-weight:600;font-size:13.5px}';
    document.head.appendChild(s);
  }
  function di(href) { NW.di(href); }

  // ---------- MỜI ----------
  TD.moi = async function (ban, o) {
    o = o || {};
    var toi = NW.toi; if (!toi || toi.laThay) return;
    napCss();
    var giai = o.giai || '', phut = giai ? o.phut : 2, lv = giai ? o.lv : 'easy';
    var conLai = 60, id = null, xong = false, bo = null, dem = null;
    var p = NW.popMo({ tieuDe: 'Đã gửi lời mời', html: '<div class="td-cho"><div class="vs">' + NW.avHtml(toi, 'to') + '<i>VS</i>' + NW.avHtml(ban, 'to') + '</div>' +
      '<div class="so" id="tdSo">60</div><p id="tdChu">Đang chờ <b>' + an(ban.ten) + '</b> nhận lời mời…</p>' +
      '<p class="tiny" style="margin-top:8px">' + (giai ? an(o.tenGiai || 'Giải đấu') + ' · ' : 'Giao hữu · ') + 'A Show Speed · ' + phut + ' phút</p></div>',
      chan: '<button type="button" class="btn soft wide" id="tdHuy">Huỷ lời mời</button>' });
    function ketThuc(chu, giu) {
      xong = true; clearInterval(dem); if (bo) bo();
      var c = $('#tdChu', p); if (c) c.innerHTML = chu;
      var s = $('#tdSo', p); if (s) s.textContent = '';
      var h = $('#tdHuy', p); if (h) { h.textContent = 'Đóng'; h.onclick = NW.popDong; }
      if (!giu) setTimeout(function () { if (document.contains(p)) NW.popDong(); }, 2500);
    }
    $('#tdHuy', p).onclick = async function () {
      if (xong) return NW.popDong();
      ketThuc('Đã huỷ lời mời.');
      if (id && !NW.laBanThu()) { try { var f = await NW.fb(); await f.fs.updateDoc(f.fs.doc(f.db, 'tranDau', id), { trangThai: 'huy' }); } catch (e) { } }
    };
    dem = setInterval(function () {
      conLai--; var s = $('#tdSo', p); if (s && !xong) s.textContent = Math.max(0, conLai);
      if (conLai <= -3 && !xong) ketThuc('<b>' + an(ban.ten) + '</b> chưa nhận lời mời. Em thử mời bạn khác nhé.', true);
    }, 1000);
    if (NW.laBanThu()) {
      setTimeout(function () { if (xong) return; ketThuc('<b>' + an(ban.ten) + '</b> đã nhận! Vào trận…', true);
        setTimeout(function () { di('tran.html?ban=' + encodeURIComponent(ban.ten) + '&giai=' + encodeURIComponent(giai ? (o.tenGiai || '') : '') + '&phut=' + phut + '&lv=' + lv); }, 900); }, 3000);
      return;
    }
    try {
      var f = await NW.fb(), bay = Date.now();
      var r = await f.fs.addDoc(f.fs.collection(f.db, 'tranDau'), { a: toi.uid, b: ban.uid, nguoi: [toi.uid, ban.uid], tenA: toi.ten, tenB: ban.ten || '',
        lop: o.lop, giai: giai, phut: phut, lv: lv, trangThai: 'moi', taoLuc: bay, het: bay + 60000 });
      id = r.id;
      if (xong) { await f.fs.updateDoc(r, { trangThai: 'huy' }).catch(function () { }); return; }
      bo = f.fs.onSnapshot(r, function (s) {
        var t = s.data() || {};
        if (t.trangThai === 'nhan' || t.trangThai === 'choi') { ketThuc('<b>' + an(ban.ten) + '</b> đã nhận! Vào trận…', true); setTimeout(function () { di('tran.html?id=' + id); }, 700); }
        else if (t.trangThai === 'tuchoi') ketThuc('<b>' + an(ban.ten) + '</b> chưa muốn đấu lúc này.', true);
        else if (t.trangThai === 'het') ketThuc('<b>' + an(ban.ten) + '</b> chưa nhận lời mời. Em thử mời bạn khác nhé.', true);
      }, function () { });
    } catch (e) {
      ketThuc(String(e && e.code).indexOf('permission') >= 0 ? 'Chưa mời được: giải đã đóng, bạn không cùng lớp, hoặc đồng hồ máy em bị lệch.' : NW.chuLoiKho(e), true);
    }
  };

  // ---------- NHẬN ----------
  var THE = {};   // id → { el, dem }
  function boThe(id) { var t = THE[id]; if (!t) return; clearInterval(t.dem); if (t.el && t.el.parentNode) t.el.parentNode.removeChild(t.el); delete THE[id]; if (NW.laNhung) NW.baoMe('moiDauXoa', { id: id }); }
  async function traLoi(id, nhan) {
    boThe(id);
    try {
      var f = await NW.fb();
      await f.fs.updateDoc(f.fs.doc(f.db, 'tranDau', id), { trangThai: nhan ? 'nhan' : 'tuchoi' });
      if (nhan) di('tran.html?id=' + id);
    } catch (e) { NW.toast(nhan ? 'Lời mời đã hết hạn hoặc bạn đã huỷ.' : NW.chuLoiKho(e), true); }
  }
  function moTa(t) { return (t.giai ? 'Giải đấu' : 'Giao hữu') + ' · A Show Speed ' + t.phut + ' phút'; }
  function veThe(id, t) {
    if (THE[id]) return;
    if (NW.laNhung) { NW.baoMe('moiDau', { id: id, ten: t.tenA || 'Bạn', chu: moTa(t), het: t.het }); THE[id] = { el: null, dem: null }; return; }
    napCss();
    var el = document.createElement('div'); el.className = 'td-moi'; el.setAttribute('role', 'alert');
    el.innerHTML = '<div class="tren"><span class="ic-o">' + IC_KIEM + '</span><div><b>' + an(t.tenA || 'Bạn') + ' thách đấu em</b><small>' + an(moTa(t)) + '</small></div></div>' +
      '<div class="vach"><i style="width:100%"></i></div><div class="hai"><button type="button" class="btn soft" data-k="0">Từ chối</button><button type="button" class="btn primary" data-k="1">Nhận</button></div>';
    document.body.appendChild(el);
    var ve = function () { var con = Math.max(0, (t.het || 0) - Date.now()); var v = el.querySelector('.vach i'); if (v) v.style.width = (con / 600) + '%'; if (con <= 0) boThe(id); };
    ve();
    THE[id] = { el: el, dem: setInterval(ve, 1000) };
    el.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () { traLoi(id, b.getAttribute('data-k') === '1'); }; });
  }
  var _nghe = false;
  TD.nghe = async function () {
    if (_nghe || NW.laBanThu() || !NW.toi || NW.toi.laThay) return;
    _nghe = true;
    var f = await NW.fb();
    f.fs.onSnapshot(f.fs.query(f.fs.collection(f.db, 'tranDau'), f.fs.where('b', '==', NW.toi.uid), f.fs.where('trangThai', '==', 'moi')), function (snap) {
      var co = {};
      snap.forEach(function (d) { var t = d.data(); if ((t.het || 0) > Date.now() - 5000) { co[d.id] = 1; veThe(d.id, t); } });
      Object.keys(THE).forEach(function (id) { if (!co[id]) boThe(id); });
    }, function (e) { console.warn('[thách đấu] nghe', e); });
    // trang mẹ (khung giữ sống) trả lời thay
    if (NW.laNhung) window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || e.source !== window.parent) return;
      var d = e.data || {}; if (d.tk === 'dau' && d.id) traLoi(d.id, !!d.nhan);
    });
  };
})();
