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
      { uid: nguoi.uid, chu: 'Em nhớ nộp Worksheet 3 trước tối mai nhé.', luc: t - 7200e3 },
      { uid: toi.uid, chu: 'Dạ em nộp rồi ạ, thầy xem giúp em 🙏', luc: t - 7000e3 },
      { uid: nguoi.uid, chu: 'Thầy thấy rồi, tốt lắm 👍', luc: t - 6900e3 }
    ];
    return [
      { uid: nguoi.uid, chu: 'Ê, làm xong WORDS 3 chưa?', luc: t - 3600e3 },
      { uid: toi.uid, chu: 'Chưa, còn 2 act nữa 😅', luc: t - 3500e3 },
      { uid: toi.uid, chu: 'Tối nay làm cho kịp hạn', luc: t - 3490e3 },
      { uid: nguoi.uid, chu: 'Ok, xong rủ đi ăn kem nha 🍦', luc: t - 3400e3 }
    ];
  }
  function veTin(hop) {
    var than = $('.cn-than', hop.el), toi = NW.toi;
    than.innerHTML = '<div class="cn-ngay">' + an(NW.chuGio(hop.ds[0] ? hop.ds[0].luc : Date.now(), 'day').toUpperCase()) + '</div>' +
      hop.ds.map(function (m) {
        var cuaToi = m.uid === toi.uid;
        var cum = '';
        if (m.camXuc) { var ks = Object.keys(m.camXuc); if (ks.length) cum = '<span class="cx-cum">' + NW.cxHtml(m.camXuc[ks[0]]) + (ks.length > 1 ? '<b>' + ks.length + '</b>' : '') + '</span>'; }
        return '<div class="cn-tin ' + (cuaToi ? 'toi' : 'ho') + '">' + (cuaToi ? '' : NW.avHtml(hop.nguoi, 'nho')) +
          '<div class="bong">' + (m.hinh ? '<button type="button" class="cn-anh" data-anh="' + an(m.hinh) + '"><img src="' + an(m.hinh) + '" alt="" loading="lazy"></button>' : '') + (m.chu ? NW.chuCoLink(m.chu) : '') + cum + '</div></div>';
      }).join('') +
      (hop.ds.length && hop.ds[hop.ds.length - 1].uid === toi.uid ? '<div class="cn-daxem" title="' + an(hop.nguoi.ten) + ' đã xem">' + NW.avHtml(hop.nguoi, 'nho') + '</div>' : '');
    $$('[data-anh]', than).forEach(function (b) { b.onclick = function () { NW.xemAnh(b.getAttribute('data-anh')); }; });
    than.scrollTop = than.scrollHeight;
  }
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
      '<div class="cn-chan"><button type="button" class="nut anh" title="Gửi ảnh" aria-label="Gửi ảnh">' + IC.anh + '</button><input type="file" accept="image/*" hidden>' +
      '<textarea rows="1" placeholder="Aa" maxlength="' + (NW.CFG.TOI_DA_CHU_TIN || 1000) + '"></textarea>' +
      '<button type="button" class="nut gui" hidden title="Gửi" aria-label="Gửi">' + IC.gui + '</button>' +
      '<button type="button" class="nut tim" title="Gửi ❤️" aria-label="Gửi tim">' + IC.tim + '</button></div>';
    var hop = { uid: nguoi.uid, nguoi: nguoi, el: el, min: false, ds: NW.laBanThu() ? tinMau(nguoi) : [], phongId: null, dungNghe: null };
    var ta = $('textarea', el), gui = $('.gui', el), tim = $('.tim', el), nutAnh = $('.anh', el), file = $('input[type=file]', el);
    noiPhong(hop);
    NW.tuCao(ta, 110);
    ta.addEventListener('input', function () { var co = !!ta.value.trim(); gui.hidden = !co; tim.hidden = co; });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); gui.click(); } });
    async function guiTin(tin) {
      if (!tin.chu && !tin.hinh) return;
      if (NW.laBanThu()) { hop.ds.push(Object.assign({ uid: NW.toi.uid, luc: Date.now() }, tin)); veTin(hop); }
      else {
        if (!hop.phongId) { NW.toast('Đang mở phòng chat, em thử lại nhé.', true); return; }
        var t = await NW.Chat.guiTin(hop.phongId, tin);   // kho thật: tin về qua onSnapshot
        if (!t) return;
      }
      ta.value = ''; ta.dispatchEvent(new Event('input')); ta.style.height = '';
    }
    gui.onclick = function () { guiTin({ chu: ta.value.trim() }); };
    tim.onclick = function () { guiTin({ chu: '❤️' }); };
    nutAnh.onclick = function () { file.click(); };
    file.onchange = async function () {
      var f0 = this.files && this.files[0]; this.value = ''; if (!f0) return;
      try {
        var blob = await NW.nenAnh(f0, { canhDai: 1200 });
        if (NW.laBanThu()) { guiTin({ hinh: URL.createObjectURL(blob) }); return; }
        nutAnh.disabled = true;
        var url = await NW.taiAnh(blob, NW.tenAnhMoi('_t'));
        await guiTin({ hinh: url });
      } catch (e) { NW.toast(NW.chuLoiKho ? NW.chuLoiKho(e) : 'Không gửi được ảnh.', true); }
      nutAnh.disabled = false;
    };
    // ---- v0.9.2 (thầy chốt 23/09): CHẶN TIN NHẮN ngay trong hộp chat ----
    var bao = $('.cn-chanbao', el), chanEl = $('.cn-chan', el), nutChan = $('[data-chanbtn]', el);
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
    if (co) { if (co.min) moLai(co); $('textarea', co.el).focus(); return; }
    var hop = dungHop(nguoi); hops.push(hop); xepHop(); veMin();
    setTimeout(function () { $('textarea', hop.el).focus(); }, 60);
  };
  CN.dongHet = function () { hops.slice().forEach(dong); };
})();
