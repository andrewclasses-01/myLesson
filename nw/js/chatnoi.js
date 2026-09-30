/* chatnoi.js — HỘP CHAT NỔI kiểu Facebook (v0.5.0, thầy chốt 22/09: bấm TÊN bạn ở cột phải → hộp chat góc dưới,
   chat trong khi vẫn lướt bảng tin). Điện thoại (≤640px) không dùng hộp nổi — chuyển sang tinnhan.html?voi=.
   NW.ChatNoi.mo(nguoi)  · nguoi = {uid, ten, anh, vaiTro}
   Kho thật: phòng riêng nwChats/{uidA__uidB} (NW.Chat.moRieng) · nghe 30 tin mới nhất · gửi qua NW.Chat.guiTin (cần js/chat.js).
   Bàn thử: tin nhắn mẫu, gửi = chỉ hiện trên máy. */
(function () {
  'use strict';
  var NW = window.NW, $ = NW.$, $$ = NW.$$, IC = NW.IC, an = NW.chuAnToan;
  var CN = NW.ChatNoi = {};
  var hops = [];      // [{uid, nguoi, el, min}]
  var TOI_DA = 3;     // tối đa 3 hộp mở cùng lúc (máy tính ~1120px)

  function khu() {
    var k = $('#cnKhu');
    if (!k) { k = document.createElement('div'); k.id = 'cnKhu'; k.className = 'cn-khu'; document.body.appendChild(k); }
    return k;
  }
  function khuMin() {
    var k = $('#cnMin');
    if (!k) { k = document.createElement('div'); k.id = 'cnMin'; k.className = 'cn-min'; document.body.appendChild(k); }
    return k;
  }
  function tinMau(nguoi) {
    var t = Date.now(), toi = NW.toi;
    if (nguoi.vaiTro === 'gv') return [
      { id: 'cm1', uid: nguoi.uid, chu: 'Em nhớ nộp Worksheet 3 trước tối mai nhé.', luc: t - 7200e3 },
      { id: 'cm2', uid: toi.uid, chu: 'Dạ em nộp rồi ạ, thầy xem giúp em 🙏', luc: t - 7000e3 },
      { id: 'cm3', uid: nguoi.uid, chu: 'Thầy thấy rồi, tốt lắm 👍', luc: t - 6900e3 }
    ];
    return [
      { id: 'cm4', uid: nguoi.uid, chu: 'Ê, làm xong WORDS 3 chưa?', luc: t - 3600e3 },
      { id: 'cm5', uid: toi.uid, chu: 'Chưa, còn 2 act nữa 😅', luc: t - 3500e3 },
      { id: 'cm6', uid: toi.uid, chu: 'Tối nay làm cho kịp hạn', luc: t - 3490e3 },
      { id: 'cm7', uid: nguoi.uid, chu: 'Ok, xong rủ đi ăn kem nha 🍦', luc: t - 3400e3 }
    ];
  }
  // ⭐ web v1.198.0 — hộp nổi dùng chung khuôn chat Zalo (NW.Chat.taoKhuon ⇒ ../js/chat-ui.js): emoji 3D, sticker, ảnh,
  //   6 cảm xúc thả nhiều lần, trả lời, thu hồi giữ chỗ — y hệt trang Tin nhắn và chat lớp.
  function veTin(hop) { if (hop.ui) hop.ui.veKho(); }
  // nối phòng thật: tạo/mở phòng riêng rồi nghe 30 tin mới nhất
  async function noiPhong(hop) {
    if (NW.laBanThu() || !NW.Chat) return;
    try {
      hop.phongId = await NW.Chat.moRieng(hop.nguoi);
      var f = await NW.fb();
      var q = f.fs.query(f.fs.collection(f.db, 'nwChats', hop.phongId, 'tin'), f.fs.orderBy('luc', 'desc'), f.fs.limit(30));
      hop.dungNghe = f.fs.onSnapshot(q, function (snap) {
        var ds = []; snap.forEach(function (d) { ds.push(Object.assign({ id: d.id }, d.data())); });
        ds.reverse(); hop.ds = ds; if (!hop.min) veTin(hop);
        NW.Chat.danhDauDoc(hop.phongId);
      }, function (e) { NW.toast(NW.chuLoiKho(e), true); });
    } catch (e) { NW.toast(NW.chuLoiKho(e), true); }
  }
  function dungHop(nguoi) {
    var el = document.createElement('div'); el.className = 'cn-hop'; el.setAttribute('data-uid', nguoi.uid);
    el.innerHTML = '<div class="cn-dau">' + NW.avHtml(nguoi) + '<div class="ai"><b>' + an(nguoi.ten) + (nguoi.vaiTro === 'gv' ? NW.tichHtml('nho') : '') + '</b><small>' +
        an(nguoi.vaiTro === 'gv' ? 'Thầy' : (NW.dangOnline(nguoi) ? 'Đang hoạt động' : (nguoi.lop || ''))) + '</small></div>' +
      (nguoi.vaiTro === 'gv' ? '' : '<button type="button" data-chanbtn title="Chặn tin nhắn" aria-label="Chặn tin nhắn">' + IC.chan + '</button>') +
      '<button type="button" data-min title="Thu nhỏ" aria-label="Thu nhỏ"><svg class="ic" viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>' +
      '<button type="button" data-dong title="Đóng" aria-label="Đóng">' + IC.dong + '</button></div>' +
      '<div class="cn-than"></div><div class="cn-chanbao" hidden></div>' +
      '<div class="cn-chan cn-chan2"></div>';   // ⭐ web v1.198.0 — ô nhập khuôn chat Zalo (ChatUI dựng)
    var hop = { uid: nguoi.uid, nguoi: nguoi, el: el, min: false, ds: NW.laBanThu() ? tinMau(nguoi) : [], phongId: null, dungNghe: null };
    var toi = NW.toi, tvMau = {}; tvMau[toi.uid] = NW.tomTat(toi); tvMau[nguoi.uid] = NW.tomTat(nguoi);
    hop.ui = NW.Chat.taoKhuon({
      khung: $('.cn-than', el), chan: $('.cn-chan2', el), idNhap: 'cnO_' + String(nguoi.uid).replace(/[^A-Za-z0-9_-]/g, ''),
      phong: function () { return { id: hop.phongId, loai: 'rieng', thanhVien: [toi.uid, nguoi.uid], tv: tvMau }; },
      tin: function () { return hop.ds; },
      datTin: function (ds) { hop.ds = ds; veTin(hop); }
    });
    noiPhong(hop);
    // ---- v0.9.2 (thầy chốt 23/09): CHẶN TIN NHẮN ngay trong hộp chat ----
    var bao = $('.cn-chanbao', el), chanEl = $('.cn-chan2', el), nutChan = $('[data-chanbtn]', el);
    function veChan(t) {
      hop.chan = t;
      var khoa = t.toiChan || t.hoChan;
      chanEl.hidden = khoa;
      bao.hidden = !khoa;
      if (t.toiChan) bao.innerHTML = '<span>Em đã chặn <b>' + an(nguoi.ten) + '</b>. Bạn này không nhắn tin cho em được.</span><button type="button" class="btn soft nho" data-bochan>Bỏ chặn</button>';
      else if (t.hoChan) bao.innerHTML = '<span><b>' + an(nguoi.ten) + '</b> đang hạn chế tin nhắn. Em không nhắn được cho bạn này.</span>';
      if (nutChan) nutChan.classList.toggle('dang-chan', !!t.toiChan);
      var bo = $('[data-bochan]', bao);
      if (bo) bo.onclick = async function () { bo.disabled = true; await doiChan(false); };
    }
    async function doiChan(bat) {
      try {
        await NW.datChan(nguoi, bat);
        veChan(await NW.chanTinh(nguoi.uid));
        NW.toast(bat ? ('Đã chặn ' + nguoi.ten + '.') : ('Đã bỏ chặn ' + nguoi.ten + '.'));
      } catch (e) { NW.toast(NW.chuLoiKho ? NW.chuLoiKho(e) : 'Không đổi được.', true); }
    }
    if (nutChan) nutChan.onclick = async function () {
      if (hop.chan && hop.chan.toiChan) { doiChan(false); return; }
      if (!(await NW.hoi('Chặn ' + nguoi.ten + '?', 'Bạn này sẽ không nhắn tin cho em được nữa, và không còn hiện trong danh bạ của em. Em bỏ chặn lại lúc nào cũng được.', { ok: 'Chặn', nguy: true }))) return;
      doiChan(true);
    };
    NW.chanTinh(nguoi.uid).then(veChan);
    // chặn/bỏ chặn ở nơi khác (pop-up Danh sách chặn) → hộp đang mở cập nhật theo
    hop.ngheChan = function (e) { if (e.detail && e.detail.uid === nguoi.uid) NW.chanTinh(nguoi.uid).then(veChan); };
    document.addEventListener('nw-chan', hop.ngheChan);

    $('[data-dong]', el).onclick = function () { dong(hop); };
    $('[data-min]', el).onclick = function () { thuNho(hop); };
    el.addEventListener('click', function () { $$('.cn-hop', khu()).forEach(function (x) { x.classList.remove('chon'); }); el.classList.add('chon'); });
    return hop;
  }
  function dong(hop) {
    hops = hops.filter(function (h) { return h !== hop; });
    if (hop.dungNghe) { try { hop.dungNghe(); } catch (e) { } hop.dungNghe = null; }
    if (hop.ngheChan) { document.removeEventListener('nw-chan', hop.ngheChan); hop.ngheChan = null; }
    hop.el.remove(); veMin();
  }
  function thuNho(hop) { hop.min = true; hop.el.remove(); veMin(); }
  function moLai(hop) { hop.min = false; xepHop(); veMin(); }
  function xepHop() {
    var k = khu(), mo = hops.filter(function (h) { return !h.min; });
    while (mo.length > TOI_DA) { var cu = mo.shift(); cu.min = true; }   // quá 3 hộp → hộp cũ nhất tự thu nhỏ
    k.innerHTML = '';
    mo.forEach(function (h) { k.appendChild(h.el); veTin(h); });
  }
  function veMin() {
    var k = khuMin(), ds = hops.filter(function (h) { return h.min; });
    k.innerHTML = ds.map(function (h, i) {
      return '<button type="button" data-i="' + i + '" title="' + an(h.nguoi.ten) + '">' + NW.avHtml(h.nguoi) + '<span class="dong" data-dong>' + IC.dong + '</span></button>';
    }).join('');
    $$('button', k).forEach(function (b) {
      var h = ds[+b.getAttribute('data-i')];
      b.onclick = function (e) { if (e.target.closest('[data-dong]')) { dong(h); return; } moLai(h); };
    });
  }
  CN.mo = function (nguoi) {
    if (!nguoi || !nguoi.uid) return;
    if (window.innerWidth <= 640) { NW.di('tinnhan.html?voi=' + encodeURIComponent(nguoi.uid)); return; }
    var co = hops.filter(function (h) { return h.uid === nguoi.uid; })[0];
    if (co) { if (co.min) moLai(co); co.ui.focus(); return; }
    var hop = dungHop(nguoi); hops.push(hop); xepHop(); veMin();
    setTimeout(function () { hop.ui.focus(); }, 60);
  };
  CN.dongHet = function () { hops.slice().forEach(dong); };
})();
