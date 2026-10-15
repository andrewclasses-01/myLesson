/* ============================================================
   js/giaidau.js — GIẢI ĐẤU (đấu game online 1–1) · Đợt 1 · web v1.346.0 (15/10/2026)
   Thiết kế: D:\OTHERS\CLAUDE\DAU GAME ONLINE - thiet ke\ (THIET KE v2 + mẫu v1/v2 thầy đã duyệt).

   Kho `giaiDau/{id}` (thầy ghi, ai đăng nhập cũng đọc — luật tools/dang-luat-giai-dau.js):
     ten · lops[mã lớp] · game 'aShowSpeed' · phut 2|3|5 · lv easy|medium|hard · tu · den (ms) · sao[3] (sao top 3 MỖI lớp)
     · dong (thầy đóng sớm) · daThuong · taoLuc · capNhat · boi
   Kho `giaiDau/{id}/bang/{lop}` { em: { uid: { t, h, b } }, capNhat } — bảng xếp hạng từng lớp. Đợt 2 (trận thật) do hàm
     máy chủ ghi; học sinh lớp đó + thầy đọc.
   Trạng thái tự tính: dong hoặc quá `den` ⇒ xong · chưa tới `tu` ⇒ sắp · còn lại ⇒ đang. MỘT lớp chỉ có MỘT giải chạy cùng
   khoảng thời gian (form chặn) ⇒ em bấm Thách đấu là biết ngay trận tính cho giải nào.
   Đợt 1: CHƯA đấu được — nút Thách đấu / Giao hữu hiện hộp "sắp mở". Thưởng sao top 3 làm ở đợt sau.
   Thắng +2 · hòa +1 · thua 0; xếp hạng: điểm ↓ · thắng ↓ · số trận ↑ · tên.
   ============================================================ */
(function () {
  'use strict';
  var $ = NW.$, $$ = NW.$$, an = NW.chuAnToan;
  var GD = NW.GiaiDau = {};
  var PHUT = [2, 3, 5], LV = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  var TT = { dang: ['dang', 'Đang diễn ra'], sap: ['sap', 'Sắp diễn ra'], xong: ['xong', 'Đã xong'] };
  var THU_TT = { dang: 0, sap: 1, xong: 2 };
  var IC = {
    cup: '<svg class="ic" viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/></svg>',
    kiem: '<svg class="ic" viewBox="0 0 24 24"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/></svg>',
    cong: '<svg class="ic" viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg>',
    but: '<svg class="ic" viewBox="0 0 24 24"><path d="M21.2 6.8a2.8 2.8 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8L2 21.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5z"/></svg>',
    khoa: '<svg class="ic" viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    play: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 3l14 9-14 9z"/></svg>',
    sao: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>'
  };

  GD.trangThai = function (g, bay) { bay = bay || Date.now(); if (g.dong || bay >= g.den) return 'xong'; if (bay < g.tu) return 'sap'; return 'dang'; };
  GD.diem = function (r) { return r ? (r.t || 0) * 2 + (r.h || 0) : 0; };
  function soTran(r) { return r ? (r.t || 0) + (r.h || 0) + (r.b || 0) : 0; }
  function hai(n) { return (n < 10 ? '0' : '') + n; }
  function ngay(ms) { var d = new Date(ms); return d.getDate() + '/' + (d.getMonth() + 1); }
  function gio(ms) { var d = new Date(ms); return hai(d.getHours()) + ':' + hai(d.getMinutes()); }
  function oNgay(ms) { var d = new Date(ms); return d.getFullYear() + '-' + hai(d.getMonth() + 1) + '-' + hai(d.getDate()); }

  // ---------- dữ liệu mẫu (bàn thử ?thu=1 / ?thu=thay — chỉ máy) ----------
  var MAU = null;
  function mau() {
    if (MAU) return MAU;
    var D = 86400e3, bay = Date.now(), dau = new Date(); dau.setHours(18, 0, 0, 0);
    var hs = function (uid, ten, lops, on) { return { uid: uid, ten: ten, lop: lops[0], cacLop: lops, vaiTro: 'hs', anh: '', hoatDongLuc: on ? bay - 30e3 : bay - 3 * 3600e3 }; };
    MAU = {
      lop: [{ ma: 'A1C', ten: 'Lớp A1-C' }, { ma: 'NTK9', ten: 'Nền Tảng K9' }, { ma: 'B2B', ten: 'Lớp B2B' }],
      nguoi: [hs('hs_0', 'BẠN THỬ', ['A1C', 'NTK9'], true), hs('hs_1', 'Gia Bảo', ['A1C', 'NTK9'], true), hs('hs_2', 'Bảo Nam', ['A1C'], true),
        hs('hs_3', 'Thảo Vy', ['A1C'], true), hs('hs_4', 'Khánh Linh', ['A1C'], false), hs('hs_5', 'Quang Minh', ['A1C'], false),
        hs('hs_6', 'Hoàng Long', ['NTK9'], true), hs('hs_7', 'Ngọc Hân', ['NTK9'], false), hs('hs_8', 'An Nhiên', ['B2B'], true)],
      giai: [
        { id: 'm3', ten: 'Speed Cup tuần 3', lops: ['A1C', 'NTK9'], game: 'aShowSpeed', phut: 2, lv: 'easy', tu: dau.getTime() - 2 * D, den: dau.getTime() + 5 * D + 3 * 3600e3, sao: [30, 20, 10], dong: false },
        { id: 'm4', ten: 'Speed Cup tuần 4', lops: ['A1C', 'NTK9', 'B2B'], game: 'aShowSpeed', phut: 3, lv: 'medium', tu: dau.getTime() + 6 * D, den: dau.getTime() + 12 * D + 3 * 3600e3, sao: [30, 20, 10], dong: false },
        { id: 'm2', ten: 'Speed Cup tuần 2', lops: ['A1C'], game: 'aShowSpeed', phut: 2, lv: 'easy', tu: dau.getTime() - 9 * D, den: dau.getTime() - 3 * D, sao: [30, 20, 10], dong: false }
      ],
      bang: {
        'm3/A1C': { hs_0: { t: 3, h: 1, b: 1 }, hs_1: { t: 4, h: 0, b: 2 }, hs_2: { t: 3, h: 2, b: 0 }, hs_3: { t: 2, h: 1, b: 2 }, hs_4: { t: 2, h: 0, b: 3 } },
        'm3/NTK9': { hs_6: { t: 3, h: 0, b: 1 }, hs_0: { t: 2, h: 1, b: 0 }, hs_1: { t: 1, h: 1, b: 2 } },
        'm2/A1C': { hs_2: { t: 7, h: 0, b: 1 }, hs_0: { t: 5, h: 2, b: 2 }, hs_1: { t: 5, h: 1, b: 3 }, hs_3: { t: 3, h: 2, b: 3 } }
      }
    };
    return MAU;
  }

  // ---------- đọc kho ----------
  var _dsLop = null;
  GD.dsLop = async function () {
    if (NW.laBanThu()) return mau().lop;
    if (_dsLop) return _dsLop;
    try {
      var f = await NW.fb(), s = await f.fs.getDoc(f.fs.doc(f.db, 'nwCauHinh', 'lop'));
      _dsLop = s.exists() ? (s.data().ds || []) : [];
    } catch (e) { _dsLop = []; }
    return _dsLop;
  };
  GD.ds = async function () {
    if (NW.laBanThu()) return mau().giai.slice();
    var toi = NW.toi || {}, f = await NW.fb(), q;
    var col = f.fs.collection(f.db, 'giaiDau');
    if (toi.laThay) q = f.fs.query(col, f.fs.orderBy('tu', 'desc'), f.fs.limit(60));
    else {
      var lops = (toi.cacLop && toi.cacLop.length ? toi.cacLop : [toi.lop]).filter(Boolean).slice(0, 30);
      if (!lops.length) return [];
      q = f.fs.query(col, f.fs.where('lops', 'array-contains-any', lops), f.fs.limit(60));
    }
    var snap = await f.fs.getDocs(q), ds = [];
    snap.forEach(function (d) { ds.push(Object.assign({ id: d.id }, d.data())); });
    return ds;
  };
  GD.demDang = async function () {
    var bay = Date.now();
    return (await GD.ds()).filter(function (g) { return GD.trangThai(g, bay) === 'dang'; }).length;
  };
  // ⭐ Đợt 2: bảng còn giữ 30 trận mới nhất của lớp (`tran`, hàm máy chủ ghi) ⇒ GD.tranGanDay(gid, lop) sau khi gọi GD.bang
  var TRAN_LOP = {};
  GD.bang = async function (gid, lop) {
    if (NW.laBanThu()) { TRAN_LOP[gid + '/' + lop] = []; return mau().bang[gid + '/' + lop] || {}; }
    try {
      var f = await NW.fb(), s = await f.fs.getDoc(f.fs.doc(f.db, 'giaiDau', gid, 'bang', lop));
      var d = s.exists() ? s.data() : {};
      TRAN_LOP[gid + '/' + lop] = d.tran || [];
      return d.em || {};
    } catch (e) { console.warn('[giải đấu] bảng', e); return {}; }
  };
  GD.tranGanDay = function (gid, lop) { return TRAN_LOP[gid + '/' + lop] || []; };
  // ⭐ Đợt 3 (v1.348.0) — THẦY báo giải vào NHÓM CHAT từng lớp (classChat, tin role 'gv' — luật cho thầy). Lỗi lớp nào bỏ qua lớp đó.
  GD.baoNhom = async function (g, daMo) {
    var chu = '🏆 Giải đấu "' + g.ten + '" ' + (daMo ? 'đã mở' : 'sẽ mở lúc ' + gio(g.tu) + ' ngày ' + ngay(g.tu)) + '! Mỗi trận A Show Speed ' + g.phut + ' phút · ' +
      (LV[g.lv] || g.lv) + ' · thắng +2, hòa +1. Vào Khám phá → Giải đấu, hoặc bấm ⚔ ngay trong nhóm chat để thách đấu bạn đang online. Giải đóng lúc ' + gio(g.den) + ' ngày ' + ngay(g.den) + '.';
    if (NW.laBanThu()) { NW.toast('Bàn thử: đã báo vào nhóm chat ' + g.lops.length + ' lớp.'); return; }
    var f = await NW.fb(), so = 0;
    for (var i = 0; i < g.lops.length; i++) {
      try {
        await f.fs.addDoc(f.fs.collection(f.db, 'classChat', g.lops[i], 'messages'), { name: 'Thầy Andrew', code: 'GV', role: 'gv', text: chu.slice(0, 300),
          createdAt: Date.now(), may: 'gd' + Math.random().toString(36).slice(2, 10) });
        so++;
      } catch (e) { console.warn('[giải đấu] báo nhóm', g.lops[i], e); }
    }
    if (so) NW.toast('Đã báo vào nhóm chat ' + so + ' lớp.');
  };
  // lịch sử trận của em (tdLichSu/{uid}, hàm máy chủ ghi — 30 trận mới nhất, cả giao hữu)
  GD.lichSu = async function () {
    if (NW.laBanThu()) return [];
    try { var f = await NW.fb(), s = await f.fs.getDoc(f.fs.doc(f.db, 'tdLichSu', NW.toi.uid)); return s.exists() ? (s.data().ds || []) : []; }
    catch (e) { return []; }
  };
  var KQ = { thang: ['T', 'Thắng'], hoa: ['H', 'Hòa'], thua: ['B', 'Thua'] };
  GD.lichSuHtml = function (ds) {
    if (!ds.length) return '<div class="trong">Em chưa đấu trận nào.</div>';
    return ds.slice(0, 8).map(function (m) {
      var k = KQ[m.kq] || KQ.hoa, d = { thang: 2, hoa: 1, thua: 0 }[m.kq] || 0;
      return '<div class="gd-tran"><span class="kq ' + k[0] + '">' + k[0] + '</span><div class="gd-noi">Gặp <b>' + an(m.vsTen || '?') + '</b><small>' + an(NW.chuGio(m.luc)) + ' · ' + (m.giai ? 'Giải đấu' : 'Giao hữu') +
        (m.ly ? ' · ' + an(/^roi/.test(m.ly) ? 'có bạn rời trận' : 'có bạn mất kết nối') : '') + '</small></div><span class="ty-so">' + (m.toi || 0) + '–' + (m.ban || 0) + '</span><span class="cong">' + (m.giai ? '+' + d : '—') + '</span></div>';
    }).join('');
  };
  async function nguoiLop(lop) {
    if (NW.laBanThu()) return mau().nguoi.filter(function (n) { return n.cacLop.indexOf(lop) >= 0; });
    // đệm 1 phút (mặc định 10) — chấm online phải tươi để biết bạn nào đang ở đây
    return (await NW.nguoiTheoLop(lop, 60 * 1000)).filter(function (n) { return n.vaiTro !== 'gv'; });
  }

  // ---------- dựng trang ----------
  GD.dung = async function (khung) {
    var toi = NW.toi, la = !!toi.laThay, banThu = NW.laBanThu();
    var DS = [], TEN_LOP = {}, xemGiai = '', xemLop = '', boDem = null;
    var tenLop = function (ma) { return TEN_LOP[ma] || ma; };
    khung.innerHTML = '<div class="kp-loai-dau gd-dau" style="--m1:#E0575B;--m2:#FF9A9C"><button type="button" class="lui" id="gdLui" aria-label="Về Khám phá">' + NW.IC.lui + '</button>' +
      '<span class="hinh">' + IC.cup + '</span><div><h1>Giải đấu</h1><p>' + (la ? 'Tạo giải cho từng lớp, theo dõi bảng xếp hạng' : 'Thách đấu bạn cùng lớp · thắng +2 · hòa +1 · thua 0') + '</p></div>' +
      (la ? '<button type="button" class="gd-tao" id="gdTao">' + IC.cong + '<span>Tạo giải</span></button>' : '') + '</div><div id="gdThan"><div class="card trong">Đang tải…</div></div>';
    $('#gdLui').onclick = function () { NW.di('khampha.html'); };
    if (la) $('#gdTao').onclick = function () { popGiai(null); };
    var than = $('#gdThan');

    async function napLai() {
      (await GD.dsLop()).forEach(function (l) { TEN_LOP[l.ma] = l.ten || l.ma; });
      try { DS = await GD.ds(); } catch (e) { NW.toast(NW.chuLoiKho(e), true); DS = []; }
      var bay = Date.now();
      DS.forEach(function (g) { g._tt = GD.trangThai(g, bay); });
      DS.sort(function (a, b) { return THU_TT[a._tt] - THU_TT[b._tt] || (a._tt === 'sap' ? a.tu - b.tu : b.tu - a.tu); });
      return la ? veThay() : veHs();
    }
    GD._napLai = napLai;

    // ===== bảng xếp hạng một lớp: mọi em trong lớp (chưa đấu = 0) =====
    async function hangLop(g, lop) {
      var r = await Promise.all([GD.bang(g.id, lop), nguoiLop(lop).catch(function () { return []; })]);
      var em = r[0], ds = r[1].map(function (n) { return { n: n, r: em[n.uid] || null }; });
      Object.keys(em).forEach(function (uid) { if (!ds.some(function (x) { return x.n.uid === uid; })) ds.push({ n: { uid: uid, ten: em[uid].ten || '?' }, r: em[uid] }); });
      ds.sort(function (a, b) {
        return GD.diem(b.r) - GD.diem(a.r) || ((b.r || {}).t || 0) - ((a.r || {}).t || 0) || soTran(a.r) - soTran(b.r) || NW.khongDau(a.n.ten).localeCompare(NW.khongDau(b.n.ten));
      });
      return ds;
    }
    function bangHtml(g, ds, coSao) {
      if (!ds.length) return '<div class="trong">Lớp chưa có học sinh nào trên mạng.</div>';
      var coTran = ds.some(function (x) { return soTran(x.r) > 0; });
      return '<div class="gd-cuon"><table class="gd-bxh"><thead><tr><th>#</th><th>Học sinh</th><th class="an-dt">Trận</th><th>T · H · B</th><th>Điểm</th>' + (coSao ? '<th>Thưởng</th>' : '') + '</tr></thead><tbody>' +
        ds.map(function (x, i) {
          var r = x.r || {}, co = soTran(x.r) > 0, la1 = x.n.uid === toi.uid;
          return '<tr class="' + (la1 ? 'em' : '') + '"><td><span class="gd-hang ' + (co && i < 3 ? 'h' + (i + 1) : '') + '">' + (co ? i + 1 : '–') + '</span></td>' +
            '<td class="ten"><div>' + NW.avHtml(x.n, 'nho') + '<b>' + an(x.n.ten) + (la1 ? ' (em)' : '') + '</b></div></td>' +
            '<td class="an-dt">' + soTran(x.r) + '</td><td class="thb">' + (r.t || 0) + ' · ' + (r.h || 0) + ' · ' + (r.b || 0) + '</td><td class="diem">' + GD.diem(x.r) + '</td>' +
            (coSao ? '<td class="sao">' + (co && i < 3 && g.sao && g.sao[i] ? '+' + g.sao[i] + ' ⭐' : '') + '</td>' : '') + '</tr>';
        }).join('') + '</tbody></table></div>' + (coTran ? '' : '<p class="tiny gd-chu">Chưa có trận nào — bảng tự cập nhật sau mỗi trận.</p>');
    }
    function banHtml(ds, giaoHuu) {
      var ban = ds.map(function (x) { return x.n; }).filter(function (n) { return n.uid !== toi.uid; })
        .sort(function (a, b) { return (NW.dangOnline(b) ? 1 : 0) - (NW.dangOnline(a) ? 1 : 0) || NW.khongDau(a.ten).localeCompare(NW.khongDau(b.ten)); });
      var on = ban.filter(NW.dangOnline).length;
      return '<div class="card gd-the"><h3>' + IC.kiem + (giaoHuu ? 'Giao hữu với bạn' : 'Thách đấu bạn') + '<small>' + on + ' bạn đang online</small></h3>' +
        (ban.length ? ban.map(function (n) {
          var o = NW.dangOnline(n);
          return '<div class="gd-ban' + (o ? '' : ' vang') + '">' + NW.avHtml(n) + '<div class="gd-noi"><b>' + an(n.ten) + '</b><small>' + (o ? 'Đang online' : (n.hoatDongLuc ? 'Hoạt động ' + an(NW.chuGio(n.hoatDongLuc)) : 'Chưa online')) + '</small></div>' +
            '<button type="button" class="gd-nut-td' + (giaoHuu ? ' gh' : '') + '" data-td="' + an(n.uid) + '"' + (o ? '' : ' disabled') + '>' + IC.kiem + (giaoHuu ? 'Giao hữu' : 'Thách đấu') + '</button></div>';
        }).join('') : '<div class="trong">Lớp chưa có bạn nào khác.</div>') + '</div>';
    }
    // ⭐ Đợt 2 (v1.347.0): nút Thách đấu / Giao hữu ⇒ lời mời thật (js/thachdau.js) — ctx = { lop, giai, phut, lv, tenGiai }
    function ganNutTd(ctx, ds) {
      $$('[data-td]', than).forEach(function (b) {
        b.onclick = function () {
          var uid = b.getAttribute('data-td'), n = (ds.filter(function (x) { return x.n.uid === uid; })[0] || {}).n;
          if (n && NW.ThachDau) NW.ThachDau.moi(n, ctx);
        };
      });
    }
    function biaHtml(g) {
      return '<div class="gd-bia"><b>' + an(g.ten.toUpperCase()) + '</b><span>A SHOW SPEED</span></div>';
    }
    function chipLop(ds, chon, thuocTinh, phu) {
      return ds.length > 1 ? '<div class="gd-chip">' + ds.map(function (l) {
        return '<button type="button" ' + thuocTinh + '="' + an(l) + '" class="' + (l === chon ? 'on' : '') + '">' + an(tenLop(l)) + (phu ? '<small>' + an(phu(l)) + '</small>' : '') + '</button>';
      }).join('') + '</div>' : '';
    }

    // ⭐ Đợt 2 — thầy xem các trận ĐANG ĐẤU của giải (tranDau giai == id, trangThai 'choi') + 30 trận gần đây của lớp (bảng)
    async function dangDauHtml(g) {
      if (g._tt !== 'dang' || banThu) return '';
      var ds = [];
      try {
        var f = await NW.fb(), snap = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'tranDau'), f.fs.where('giai', '==', g.id), f.fs.where('trangThai', '==', 'choi'), f.fs.limit(30)));
        snap.forEach(function (d) { ds.push(d.data()); });
      } catch (e) { console.warn('[giải đấu] đang đấu', e); }
      return '<div class="card gd-the"><h3><span class="gd-nhay"></span>Đang đấu<small>' + ds.length + ' trận</small></h3>' +
        (ds.length ? ds.map(function (t) {
          var con = Math.max(0, Math.round(((t.ketThuc || 0) - Date.now()) / 1000));
          return '<div class="gd-tran"><div class="gd-noi">' + an(t.tenA) + ' <b>vs</b> ' + an(t.tenB) + '<small>' + an(tenLop(t.lop)) + ' · còn ' + Math.floor(con / 60) + ':' + hai(con % 60) + '</small></div>' +
            '<span class="ty-so">' + ((t.diem || {}).a || 0) + '–' + ((t.diem || {}).b || 0) + '</span></div>';
        }).join('') : '<div class="trong">Không có trận nào đang đấu.</div>') + '</div>';
    }
    function tranGanDayHtml(ds) {
      if (!ds.length) return '<div class="trong">Chưa có trận nào.</div>';
      return ds.slice(0, 12).map(function (m) {
        var kq = m.kq === 'thang' ? an(m.tenA) + ' thắng' : m.kq === 'thua' ? an(m.tenB) + ' thắng' : 'Hòa';
        return '<div class="gd-tran"><div class="gd-noi">' + an(m.tenA) + ' – ' + an(m.tenB) + '<small>' + an(NW.chuGio(m.luc)) + ' · ' + kq +
          (m.ly ? ' · ' + (/^roi/.test(m.ly) ? 'có bạn rời trận' : 'có bạn mất kết nối') : '') + '</small></div><span class="ty-so">' + (m.da || 0) + '–' + (m.db || 0) + '</span></div>';
      }).join('');
    }

    // ===== HỌC SINH =====
    async function veHs() {
      var lopEm = (toi.cacLop && toi.cacLop.length ? toi.cacLop : [toi.lop]).filter(Boolean);
      var lsHtml = GD.lichSuHtml(await GD.lichSu()), ctx = null, dsTd = [];
      var giaiCua = {};   // lớp → giải đang diễn ra của lớp đó
      DS.forEach(function (g) { if (g._tt === 'dang') g.lops.forEach(function (l) { if (lopEm.indexOf(l) >= 0 && !giaiCua[l]) giaiCua[l] = g; }); });
      var lopCo = lopEm.filter(function (l) { return giaiCua[l]; });
      if (lopCo.length) {
        if (lopCo.indexOf(xemLop) < 0) xemLop = lopCo.indexOf(toi.lop) >= 0 ? toi.lop : lopCo[0];
        var g = giaiCua[xemLop], ds = await hangLop(g, xemLop);
        var vt = 0; ds.forEach(function (x, i) { if (x.n.uid === toi.uid) vt = i; });
        var cua = (ds[vt] || {}).r, coTran = soTran(cua) > 0;
        ctx = { lop: xemLop, giai: g.id, phut: g.phut, lv: g.lv, tenGiai: g.ten }; dsTd = ds;
        than.innerHTML =
          '<div class="card gd-hero">' + biaHtml(g) + '<div class="gd-noi">' +
            '<div class="meta"><span class="gd-pill dang">Đang diễn ra</span>' + ngay(g.tu) + ' → ' + ngay(g.den) + ' · ' + g.lops.map(tenLop).map(an).join(', ') + '</div>' +
            '<h2>' + an(g.ten) + '</h2>' +
            '<div class="meta"><span class="gd-pill ghi">A Show Speed</span><span class="gd-pill ghi">' + g.phut + ' phút</span><span class="gd-pill ghi">' + an(LV[g.lv] || g.lv) + '</span>' +
              (g.sao && g.sao.some(Boolean) ? '<span class="gd-pill vang">' + IC.sao + 'Top 3 mỗi lớp: ' + g.sao.join(' · ') + ' sao</span>' : '') + '</div>' +
            '<div class="gd-luat"><div class="t"><b>+2</b><span>Thắng</span></div><div class="h"><b>+1</b><span>Hòa</span></div><div class="b"><b>0</b><span>Thua</span></div></div>' +
            '<div class="gd-toi"><span class="so">' + (coTran ? '#' + (vt + 1) : '–') + '</span><div><b>' + an(tenLop(xemLop)) + ': ' + (coTran ? 'em hạng ' + (vt + 1) + ' · ' + GD.diem(cua) + ' điểm' : 'em chưa đấu trận nào') + '</b>' +
              '<small>' + soTran(cua) + ' trận: thắng ' + ((cua || {}).t || 0) + ' · hòa ' + ((cua || {}).h || 0) + ' · thua ' + ((cua || {}).b || 0) + '</small></div></div>' +
          '</div></div>' +
          chipLop(lopCo, xemLop, 'data-lop') +
          '<div class="gd-luoi"><div class="card gd-the"><h3>' + IC.cup + 'Bảng xếp hạng ' + an(tenLop(xemLop)) + '<small>Tự cập nhật sau mỗi trận</small></h3>' + bangHtml(g, ds) + '</div>' +
          '<div class="gd-cot">' + banHtml(ds, false) + '<div class="card gd-the"><h3>Trận của em</h3>' + lsHtml + '</div></div></div>';
      } else {
        // chưa có giải nào đang mở cho lớp em ⇒ đấu giao hữu + giải vừa xong
        if (lopEm.indexOf(xemLop) < 0) xemLop = lopEm.indexOf(toi.lop) >= 0 ? toi.lop : lopEm[0];
        var ds2 = xemLop ? (await nguoiLop(xemLop).catch(function () { return []; })).map(function (n) { return { n: n, r: null }; }) : [];
        ctx = { lop: xemLop, giai: '' }; dsTd = ds2;
        var cu = DS.filter(function (x) { return x._tt === 'xong' && x.lops.indexOf(xemLop) >= 0; })[0];
        var top = cu ? (await hangLop(cu, xemLop)).filter(function (x) { return soTran(x.r) > 0; }).slice(0, 3) : [];
        var sap = DS.filter(function (x) { return x._tt === 'sap' && x.lops.some(function (l) { return lopEm.indexOf(l) >= 0; }); })[0];
        than.innerHTML =
          '<div class="card gd-chua"><span class="ic-o">' + IC.cup + '</span><div><b>Chưa có giải nào đang mở</b><p>' +
            (sap ? an(sap.ten) + ' bắt đầu lúc ' + gio(sap.tu) + ' ngày ' + ngay(sap.tu) + '. ' : '') + 'Em vẫn đấu giao hữu được với bạn đang online. Giao hữu không cộng điểm xếp hạng.</p></div></div>' +
          chipLop(lopEm, xemLop, 'data-lop') +
          '<div class="gd-luoi">' + (cu ? '<div class="card gd-the"><h3>' + IC.cup + 'Giải vừa xong</h3><div class="gd-cu"><b>' + an(cu.ten) + '</b> <span class="gd-pill xong">Đã xong</span>' +
            (top.length ? '<div class="top3">' + top.map(function (x, i) { return '<span>' + ['🥇', '🥈', '🥉'][i] + ' ' + an(x.n.ten) + ' · ' + GD.diem(x.r) + 'đ</span>'; }).join('') + '</div>' : '<p class="tiny">Giải chưa có trận nào.</p>') + '</div></div>' : '') +
          '<div class="gd-cot">' + banHtml(ds2, true) + '<div class="card gd-the"><h3>Trận của em</h3>' + lsHtml + '</div></div></div>';
      }
      $$('[data-lop]', than).forEach(function (b) { b.onclick = function () { xemLop = b.getAttribute('data-lop'); veHs(); }; });
      ganNutTd(ctx, dsTd);
    }

    // ===== THẦY =====
    async function veThay() {
      if (!DS.length) {
        than.innerHTML = '<div class="card gd-chua"><span class="ic-o">' + IC.cup + '</span><div><b>Chưa có giải nào</b><p>Bấm "Tạo giải" để mở giải đầu tiên cho các lớp.</p></div></div>';
        return;
      }
      if (!DS.some(function (g) { return g.id === xemGiai; })) xemGiai = DS[0].id;
      var g = DS.filter(function (x) { return x.id === xemGiai; })[0];
      if (g.lops.indexOf(xemLop) < 0) xemLop = g.lops[0];
      var the = DS.map(function (x) {
        var t = TT[x._tt];
        return '<button type="button" class="gd-gcard ' + x._tt + (x.id === g.id ? ' on' : '') + '" data-giai="' + an(x.id) + '"><span class="gd-gbia">' + an(x.ten.toUpperCase()) + '</span>' +
          '<span class="gd-noi"><span><span class="gd-pill ' + t[0] + '">' + t[1] + '</span></span><b>' + an(x.ten) + '</b><span class="chips">' + x.lops.map(function (l) { return '<i>' + an(tenLop(l)) + '</i>'; }).join('') + '</span>' +
          '<small>' + ngay(x.tu) + ' → ' + ngay(x.den) + ' · ' + x.phut + ' phút · ' + an(LV[x.lv] || x.lv) + '</small></span></button>';
      }).join('');
      var t = TT[g._tt];
      var tacVu = g._tt === 'dang' ? '<button type="button" class="gd-nut" data-tv="sua">' + IC.but + 'Sửa</button><button type="button" class="gd-nut do" data-tv="dong">' + IC.khoa + 'Đóng giải</button>'
        : g._tt === 'sap' ? '<button type="button" class="gd-nut" data-tv="sua">' + IC.but + 'Sửa</button><button type="button" class="gd-nut do" data-tv="xoa">Xoá</button><button type="button" class="gd-nut xanh" data-tv="mo">' + IC.play + 'Mở ngay</button>'
          // ⭐ Đợt 4 (v1.349.0, thầy chốt) — hết giờ / đã đóng ⇒ THẦY bấm thưởng và tự quyết số sao từng em (không tự thưởng)
          : g.daThuong ? '<button type="button" class="gd-nut" disabled>' + IC.sao + 'Đã thưởng sao</button>'
            : '<button type="button" class="gd-nut vang" data-tv="thuong">' + IC.sao + 'Thưởng sao</button>';
      var ct;
      if (g._tt === 'sap') {
        ct = '<div class="card gd-the gd-tt"><h3>' + IC.cup + 'Giải chưa bắt đầu</h3>' +
          '<div class="dong"><span>Tự mở lúc</span><b>' + gio(g.tu) + ' ngày ' + ngay(g.tu) + '</b></div>' +
          '<div class="dong"><span>Tự đóng lúc</span><b>' + gio(g.den) + ' ngày ' + ngay(g.den) + '</b></div>' +
          '<div class="dong"><span>Lớp tham gia</span><b>' + g.lops.map(tenLop).map(an).join(', ') + '</b></div>' +
          '<div class="dong"><span>Mỗi trận</span><b>A Show Speed · ' + g.phut + ' phút · ' + an(LV[g.lv] || g.lv) + '</b></div>' +
          '<div class="dong"><span>Thưởng top 3 mỗi lớp</span><b>' + (g.sao || []).join(' · ') + ' sao</b></div></div>';
      } else {
        var ds = await hangLop(g, xemLop);
        ct = chipLop(g.lops, xemLop, 'data-lopt') + '<div class="gd-luoi"><div class="card gd-the"><h3>' + IC.cup + 'Bảng xếp hạng ' + an(tenLop(xemLop)) + '<small>' + (g._tt === 'xong' ? 'Chốt lúc đóng giải' : 'Tự cập nhật') + '</small></h3>' + bangHtml(g, ds, true) + '</div>' +
          '<div class="gd-cot">' + (await dangDauHtml(g)) + '<div class="card gd-the"><h3>Trận gần đây<small>' + an(tenLop(xemLop)) + '</small></h3>' + tranGanDayHtml(GD.tranGanDay(g.id, xemLop)) + '</div></div></div>';
      }
      than.innerHTML = '<div class="gd-ds">' + the + '</div>' +
        '<div class="gd-ct-dau"><h2>' + an(g.ten) + '</h2><span class="gd-pill ' + t[0] + '">' + t[1] + '</span><div class="tac-vu">' + tacVu + '</div></div>' + ct;
      $$('[data-giai]', than).forEach(function (b) { b.onclick = function () { xemGiai = b.getAttribute('data-giai'); veThay(); }; });
      $$('[data-lopt]', than).forEach(function (b) { b.onclick = function () { xemLop = b.getAttribute('data-lopt'); veThay(); }; });
      $$('[data-tv]', than).forEach(function (b) {
        b.onclick = async function () {
          var k = b.getAttribute('data-tv');
          if (k === 'sua') return popGiai(g);
          if (k === 'dong') {
            if (!(await NW.hoi('Đóng ' + g.ten + '?', 'Học sinh không đấu tính điểm giải này được nữa. Bảng xếp hạng được giữ lại. Đóng xong thầy bấm "Thưởng sao" để chọn thưởng.', { ok: 'Đóng giải', nguy: true }))) return;
            return ghi(g, { dong: true }, 'Đã đóng ' + g.ten + '.');
          }
          if (k === 'thuong') return popThuong(g);
          if (k === 'mo') { GD.baoNhom(Object.assign({}, g, { tu: Date.now() }), true); return ghi(g, { tu: Date.now() }, 'Đã mở ' + g.ten + '.'); }
          if (k === 'xoa') {
            if (!(await NW.hoi('Xoá ' + g.ten + '?', 'Giải chưa bắt đầu nên chưa có trận nào.', { ok: 'Xoá', nguy: true }))) return;
            if (banThu) { mau().giai = mau().giai.filter(function (x) { return x.id !== g.id; }); NW.toast('Đã xoá giải.'); return napLai(); }
            try { var f = await NW.fb(); await f.fs.deleteDoc(f.fs.doc(f.db, 'giaiDau', g.id)); NW.toast('Đã xoá giải.'); napLai(); }
            catch (e) { NW.toast(NW.chuLoiKho(e), true); }
          }
        };
      });
    }
    // ===== ⭐ Đợt 4 — THƯỞNG SAO (thầy bấm, thầy quyết) =====
    // Mỗi lớp: các em ĐÃ ĐẤU theo thứ hạng (điểm ↓ · thắng ↓ · số trận ↑; cả ba bằng nhau = CÙNG HẠNG, cùng sao — thầy chốt).
    // Điền sẵn sao top 3 của giải, thầy sửa từng em (cả em ngoài top 3) ⇒ MỘT phiếu sao `saoDot` mỗi lớp (nguon 'dashboard', bai 'giai:<id>')
    // ⇒ hàm apDotSao cộng vào ví + đẩy "+N⭐". Số học sinh 6 chữ số lấy từ hsSo/soCai (nguoi[số].w chứa số web hs_<n>).
    function hangCung(ds) {
      var r = 0;
      return ds.map(function (x, i) {
        var tr = ds[i - 1];
        if (!tr || GD.diem(tr.r) !== GD.diem(x.r) || (tr.r || {}).t !== (x.r || {}).t || soTran(tr.r) !== soTran(x.r)) r = i + 1;
        return Object.assign({ hang: r }, x);
      });
    }
    function ngayVN() { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); }
    async function soCuaUid() {
      if (banThu) return function (uid) { return '1' + String(100000 + (+String(uid).replace(/\D/g, '') || 0)).slice(1); };
      var f = await NW.fb(), s = await f.fs.getDoc(f.fs.doc(f.db, 'hsSo', 'soCai')), nguoi = s.exists() ? (s.data().nguoi || {}) : {}, theoW = {}, theoMa = {}, idMa = {};
      var chuan = function (x) { return String(x || '').replace(/\s+/g, '').toUpperCase(); };
      Object.keys(nguoi).forEach(function (so) {
        var P = nguoi[so] || {};
        (P.w || []).forEach(function (w) { theoW[String(w)] = so; });
        if (P.ma) theoMa[chuan(P.ma)] = so;
        (P.maCu || []).forEach(function (x) { if (!theoMa[chuan(x)]) theoMa[chuan(x)] = so; });
      });
      // đường phụ (đo 15/10: w nối 161/187 em, thêm lop.json id→mã ⇒ 186/187): uid hs_<id myStudent> ⇒ mã đăng nhập ⇒ số
      try {
        var dl = await fetch((NW.CFG.GOC_DL || '../') + 'data/lop.json', { cache: 'no-cache' }).then(function (r) { return r.json(); });
        (dl.lop || []).concat(dl.khoa || []).forEach(function (L) { ((L && L.hocSinh) || []).forEach(function (h) { if (h && h.id != null && h.ma) idMa[String(h.id)] = chuan(h.ma); }); });
      } catch (e) { console.warn('[giải đấu] lop.json', e); }
      return function (uid) { var m = /^hs_(\d+)$/.exec(String(uid || '')); return m ? (theoW[m[1]] || theoMa[idMa[m[1]]] || '') : ''; };
    }
    async function popThuong(g) {
      var p = NW.popMo({ tieuDe: 'Thưởng sao · ' + g.ten, lop: 'gd-pop', html: '<div class="trong">Đang tải bảng xếp hạng…</div>' });
      var lopDs = [], timSo;
      try {
        timSo = await soCuaUid();
        for (var i = 0; i < g.lops.length; i++) lopDs.push({ lop: g.lops[i], ds: hangCung((await hangLop(g, g.lops[i])).filter(function (x) { return soTran(x.r) > 0; })) });
      } catch (e) { $('.pop-body', p).innerHTML = '<p class="gd-loi">' + an(NW.chuLoiKho(e)) + '</p>'; return; }
      var sao = g.sao || [0, 0, 0];
      $('.pop-body', p).innerHTML = '<p class="tiny" style="margin:0 0 6px">Điền sẵn top 3 mỗi lớp (' + sao.join(' · ') + ' sao). Thầy sửa số sao từng em — để 0 là không thưởng.</p>' +
        lopDs.map(function (L) {
          return '<div class="gd-th-lop"><b>' + an(tenLop(L.lop)) + '</b>' + (L.ds.length ? L.ds.map(function (x) {
            var so = timSo(x.n.uid), mac = x.hang <= 3 ? (sao[x.hang - 1] || 0) : 0;
            return '<div class="gd-th-dong" data-lop="' + an(L.lop) + '" data-uid="' + an(x.n.uid) + '" data-so="' + an(so) + '" data-hang="' + x.hang + '">' +
              '<span class="gd-hang ' + (x.hang <= 3 ? 'h' + x.hang : '') + '">' + x.hang + '</span>' + NW.avHtml(x.n, 'nho') +
              '<span class="ten"><b>' + an(x.n.ten) + '</b><small>' + GD.diem(x.r) + ' điểm · ' + (x.r.t || 0) + ' thắng · ' + soTran(x.r) + ' trận' + (so ? '' : ' · ⚠ chưa có số HS') + '</small></span>' +
              '<label class="gd-o"><input type="text" inputmode="numeric" value="' + (so ? mac : 0) + '"' + (so ? '' : ' disabled') + ' aria-label="Sao cho ' + an(x.n.ten) + '"><span>⭐</span></label></div>';
          }).join('') : '<p class="tiny">Lớp chưa có trận nào.</p>') + '</div>';
        }).join('') +
        '<label class="gd-tich"><input type="checkbox" id="gdThBao" checked> Báo kết quả vào nhóm chat các lớp</label>' +
        '<p class="gd-loi" id="gdThLoi" role="alert"></p>';
      var chan = document.createElement('div'); chan.className = 'pop-chan';
      chan.innerHTML = '<span class="gd-th-tong" id="gdThTong"></span><button type="button" class="btn soft" data-dong>Thôi</button><button type="button" class="btn primary" id="gdThOk">Thưởng sao</button>';
      p.appendChild(chan);
      $('[data-dong]', chan).onclick = NW.popDong;
      var tong = function () {
        var n = 0, em = 0;
        $$('.gd-th-dong input', p).forEach(function (i) { var v = +i.value || 0; if (v > 0 && !i.disabled) { n += v; em++; } });
        $('#gdThTong', p).textContent = em ? n + ' ⭐ cho ' + em + ' em' : 'Chưa chọn em nào';
        return { n: n, em: em };
      };
      $$('.gd-th-dong input', p).forEach(function (i) {
        i.oninput = function () {
          i.value = i.value.replace(/\D/g, '').slice(0, 3); if (+i.value > 200) i.value = '200'; tong();
          // đổi số sau khi đã bấm lần 1 ⇒ phải xác nhận lại với tổng mới
          var ok = $('#gdThOk', p); if (ok.getAttribute('data-xn')) { ok.removeAttribute('data-xn'); ok.textContent = 'Thưởng sao'; $('#gdThLoi', p).textContent = ''; }
        };
        i.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } };
      });
      tong();
      $('#gdThOk', p).onclick = async function () {
        var t = tong(); if (!t.em) { $('#gdThLoi', p).textContent = 'Thầy chưa điền sao cho em nào.'; return; }
        // xác nhận NGAY TRÊN NÚT (hộp hỏi chung NW.hoi sẽ thay mất hộp thưởng đang mở)
        var nut = this;
        if (nut.getAttribute('data-xn') !== String(t.n) + '/' + t.em) {
          nut.setAttribute('data-xn', String(t.n) + '/' + t.em); nut.textContent = 'Bấm lần nữa: thưởng ' + t.n + ' ⭐';
          $('#gdThLoi', p).textContent = 'Sao vào ví các em ngay, không tự hoàn lại được (muốn bớt thì trừ tay ở hộp Sao trên dashboard).';
          return;
        }
        nut.disabled = true;
        var theoLop = {};
        $$('.gd-th-dong', p).forEach(function (d) {
          var v = +$('input', d).value || 0, so = d.getAttribute('data-so'); if (v <= 0 || !so) return;
          var h = +d.getAttribute('data-hang'), lop = d.getAttribute('data-lop');
          (theoLop[lop] = theoLop[lop] || []).push({ so: so, n: v, viec: (h <= 3 ? 'Hạng ' + h + ' ' : 'Thưởng ') + g.ten + ' · ' + tenLop(lop), app: 'Giải đấu', _ten: $('.ten b', d).textContent, _hang: h });
        });
        try {
          if (!banThu) {
            var f = await NW.fb(), luc = Date.now();
            for (var lop in theoLop) {
              await f.fs.addDoc(f.fs.collection(f.db, 'saoDot'), { nguon: 'dashboard', lop: lop, ngay: ngayVN(), bai: 'giai:' + g.id, maBai: '',
                nhom: 'Giải đấu: ' + g.ten, ai: 'Thầy Andrew', dong: theoLop[lop].map(function (x) { return { so: x.so, n: x.n, viec: x.viec, app: x.app }; }), tao: luc });
            }
            await f.fs.updateDoc(f.fs.doc(f.db, 'giaiDau', g.id), { daThuong: true, capNhat: Date.now() });
          } else Object.assign(mau().giai.filter(function (x) { return x.id === g.id; })[0], { daThuong: true });
          if ($('#gdThBao', p) && $('#gdThBao', p).checked) baoKetQua(g, theoLop);
          NW.popDong();
          NW.toast('Đã thưởng ' + t.n + ' ⭐ cho ' + t.em + ' em — sao vào ví các em ngay.');
          napLai();
        } catch (e) { nut.disabled = false; $('#gdThLoi', p).textContent = NW.chuLoiKho(e); }
      };
    }
    // tin chúc mừng vào nhóm chat từng lớp (tin của thầy)
    async function baoKetQua(g, theoLop) {
      if (banThu) return;
      var f = await NW.fb(), HC = ['🥇', '🥈', '🥉'];
      for (var lop in theoLop) {
        var ds = theoLop[lop].slice().sort(function (a, b) { return a._hang - b._hang; });
        var chu = '🏆 Kết quả "' + g.ten + '": ' + ds.map(function (x) { return (x._hang <= 3 ? HC[x._hang - 1] + ' ' : '') + x._ten + ' +' + x.n + '⭐'; }).join(' · ') + '. Chúc mừng các em! 👏';
        try { await f.fs.addDoc(f.fs.collection(f.db, 'classChat', lop, 'messages'), { name: 'Thầy Andrew', code: 'GV', role: 'gv', text: chu.slice(0, 300), createdAt: Date.now(), may: 'gd' + Math.random().toString(36).slice(2, 10) }); }
        catch (e) { console.warn('[giải đấu] báo kết quả', lop, e); }
      }
    }
    async function ghi(g, doi, bao) {
      doi.capNhat = Date.now();
      if (banThu) { Object.assign(mau().giai.filter(function (x) { return x.id === g.id; })[0], doi); NW.toast(bao); return napLai(); }
      try { var f = await NW.fb(); await f.fs.updateDoc(f.fs.doc(f.db, 'giaiDau', g.id), doi); NW.toast(bao); napLai(); }
      catch (e) { NW.toast(NW.chuLoiKho(e), true); }
    }

    // ===== hộp tạo / sửa giải =====
    async function popGiai(g) {
      var moi = !g, dang = g && g._tt === 'dang';
      var lopDs = await GD.dsLop();
      var D = 86400e3, mai = new Date(Date.now() + D); mai.setHours(18, 0, 0, 0);
      var f0 = g ? g : { ten: '', lops: [], phut: 2, lv: 'easy', tu: mai.getTime(), den: mai.getTime() + 6 * D + 3 * 3600e3, sao: [30, 20, 10] };
      var nut = function (ten, gt, chon, tat) { return '<button type="button" data-v="' + an(gt) + '" class="' + (chon ? 'on' : '') + '"' + (tat ? ' disabled' : '') + '>' + an(ten) + '</button>'; };
      var p = NW.popMo({ tieuDe: moi ? 'Tạo giải mới' : 'Sửa ' + g.ten, lop: 'gd-pop', html:
        '<label class="lbl" for="gdTen">Tên giải</label><input type="text" id="gdTen" maxlength="40" autocomplete="off" value="' + an(f0.ten) + '" placeholder="Ví dụ: Speed Cup tuần 4">' +
        '<span class="lbl gd-lbl">Lớp tham gia · mỗi lớp một bảng xếp hạng</span><div class="gd-chon" id="gdLop">' +
          (lopDs.length ? lopDs.map(function (l) { return nut(l.ten || l.ma, l.ma, f0.lops.indexOf(l.ma) >= 0, dang && g.lops.indexOf(l.ma) >= 0); }).join('') : '<span class="tiny">Chưa có danh sách lớp (nwCauHinh/lop).</span>') + '</div>' +
        '<span class="lbl gd-lbl">Game</span><div class="gd-chon mot"><button type="button" class="on">A Show Speed</button><button type="button" disabled>Quiz · sắp có</button></div>' +
        '<div class="gd-hai"><div><span class="lbl gd-lbl">Mỗi trận</span><div class="gd-chon mot" id="gdPhut">' + PHUT.map(function (x) { return nut(x + ' phút', x, x === f0.phut, dang); }).join('') + '</div></div>' +
        '<div><span class="lbl gd-lbl">Độ khó</span><div class="gd-chon mot" id="gdLv">' + Object.keys(LV).map(function (k) { return nut(LV[k], k, k === f0.lv, dang); }).join('') + '</div></div></div>' +
        '<span class="lbl gd-lbl">Mở lúc</span><div class="gd-gio"><input type="date" class="chon-o" id="gdTuN" value="' + oNgay(f0.tu) + '"' + (dang ? ' disabled' : '') + '><input type="time" class="chon-o" id="gdTuG" value="' + gio(f0.tu) + '"' + (dang ? ' disabled' : '') + '></div>' +
        '<span class="lbl gd-lbl">Đóng lúc</span><div class="gd-gio"><input type="date" class="chon-o" id="gdDenN" value="' + oNgay(f0.den) + '"><input type="time" class="chon-o" id="gdDenG" value="' + gio(f0.den) + '"></div>' +
        '<span class="lbl gd-lbl">Thưởng sao khi đóng giải · top 3 mỗi lớp</span><div class="gd-sao">' + ['Hạng 1', 'Hạng 2', 'Hạng 3'].map(function (t, i) {
          return '<label class="gd-o"><span>' + t + '</span><input type="text" inputmode="numeric" id="gdSao' + i + '" value="' + ((f0.sao || [])[i] || 0) + '" aria-label="Sao ' + t + '"><span>⭐</span></label>';
        }).join('') + '</div>' +
        (moi ? '<label class="gd-tich"><input type="checkbox" id="gdBao" checked> Báo vào nhóm chat các lớp</label>' : '') +
        '<p class="gd-loi" id="gdLoi" role="alert"></p>',
        chan: '<button type="button" class="btn soft" data-dong>Thôi</button><button type="button" class="btn primary" id="gdOk">' + (moi ? 'Tạo giải' : 'Lưu') + '</button>' });
      $$('.gd-chon button[data-v]', p).forEach(function (b) {
        b.onclick = function () {
          if (b.disabled) return;
          if (b.parentElement.id === 'gdLop') b.classList.toggle('on');
          else $$('button', b.parentElement).forEach(function (x) { x.classList.toggle('on', x === b); });
        };
      });
      // ô số: chỉ chữ số; Enter = nhận ô; KHÔNG dùng type=number (cuộn chuột đổi số — nếp "ô nhập số liệu an toàn")
      $$('.gd-sao input', p).forEach(function (i) {
        i.oninput = function () { i.value = i.value.replace(/\D/g, '').slice(0, 3); };
        i.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } };
      });
      $('#gdTen', p).onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };
      var docGio = function (n, gg) { var d = new Date($(n, p).value + 'T' + ($(gg, p).value || '00:00')); return isNaN(d) ? 0 : d.getTime(); };
      $('#gdOk', p).onclick = async function () {
        var loi = function (m) { $('#gdLoi', p).textContent = m; };
        var ten = $('#gdTen', p).value.trim().replace(/\s+/g, ' ');
        var lops = $$('#gdLop .on', p).map(function (b) { return b.getAttribute('data-v'); });
        var tu = dang ? g.tu : docGio('#gdTuN', '#gdTuG'), den = docGio('#gdDenN', '#gdDenG');
        var sao = [0, 1, 2].map(function (i) { return Math.min(999, +$('#gdSao' + i, p).value || 0); });
        if (!ten) return loi('Thầy đặt tên cho giải nhé.');
        if (!lops.length) return loi('Chọn ít nhất một lớp tham gia.');
        if (!tu || !den) return loi('Chọn đủ ngày giờ mở và đóng.');
        if (den <= tu) return loi('Giờ đóng phải sau giờ mở.');
        if (den <= Date.now()) return loi('Giờ đóng đã qua rồi.');
        var trung = null;
        DS.forEach(function (x) {
          if (trung || (g && x.id === g.id) || x._tt === 'xong') return;
          var l = x.lops.filter(function (y) { return lops.indexOf(y) >= 0; })[0];
          if (l && tu < x.den && den > x.tu) trung = tenLop(l) + ' đang có ' + x.ten + ' trùng thời gian.';
        });
        if (trung) return loi(trung);
        var du = { ten: ten, lops: lops, game: 'aShowSpeed', phut: +$('#gdPhut .on', p).getAttribute('data-v'), lv: $('#gdLv .on', p).getAttribute('data-v'), tu: tu, den: den, sao: sao, capNhat: Date.now() };
        this.disabled = true;
        try {
          if (banThu) {
            if (moi) { du.id = 'm' + Date.now(); du.dong = false; mau().giai.push(du); } else Object.assign(mau().giai.filter(function (x) { return x.id === g.id; })[0], du);
          } else {
            var f = await NW.fb();
            if (moi) {
              Object.assign(du, { dong: false, daThuong: false, taoLuc: Date.now(), boi: toi.uid || '' });
              var r = await f.fs.addDoc(f.fs.collection(f.db, 'giaiDau'), du); du.id = r.id;
            } else await f.fs.updateDoc(f.fs.doc(f.db, 'giaiDau', g.id), du);
          }
          if (moi) xemGiai = du.id;
          if (moi && $('#gdBao', p) && $('#gdBao', p).checked) GD.baoNhom(du, tu <= Date.now());
          NW.popDong();
          NW.toast(moi ? (tu <= Date.now() ? 'Đã tạo và mở ' + ten + '.' : 'Đã tạo ' + ten + ', tự mở lúc ' + gio(tu) + ' ngày ' + ngay(tu) + '.') : 'Đã lưu thay đổi.');
          napLai();
        } catch (e) { this.disabled = false; loi(NW.chuLoiKho(e)); }
      };
      $('[data-dong]', p).onclick = NW.popDong;
      setTimeout(function () { var o = $('#gdTen', p); if (o && moi) o.focus(); }, 60);
    }

    await napLai();
    // chấm online + bảng tươi: vẽ lại mỗi 60 giây khi trang đang xem và không mở hộp nào
    boDem = setInterval(function () { if (!document.hidden && !document.querySelector('#nwPop.mo')) napLai(); }, 60 * 1000);
  };
})();
