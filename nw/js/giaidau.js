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

   ⭐ v1.351.0 (15/10/2026 tối, thầy) —
     · SỬA GIẢI ĐANG CHẠY: đổi được lớp, phút, độ khó, bộ từ, giờ đóng, sao (giờ mở đã qua thì giữ). Trận đang đấu không đổi;
       lời mời mới theo thông số mới (luật tdGiaiMo so phút/độ khó với giải).
     · BỘ TỪ = một act AWord WORDS (thư viện users/{AW_UID}/items của thầy — luật tools/dang-luat-giai-dau-bo.js cho phiên
       thầy-từ-app đọc) + tuỳ chọn như Fight của A Show Speed: bộ gợi ý (ENG1/ENG2/VI1/VI2) · chế độ One word / Word list /
       Free words · số ô (One word 8/12/16) · Word list only (Free words). Chép vào giải: `bo` { id, ten, che, o, chiBo, bien,
       bienTen, tu[{w, m}] } — máy chủ (tran-dau.js) dựng bàn từ đây, không đọc lại act. Không chọn act ⇒ 16 chữ ngẫu nhiên như cũ.
     · "Đang đấu" (thầy + học sinh) có nút THEO DÕI ⇒ tran.html?id=…&xem=1.
   ============================================================ */
(function () {
  'use strict';
  var $ = NW.$, $$ = NW.$$, an = NW.chuAnToan;
  var GD = NW.GiaiDau = {};
  var PHUT = [2, 3, 5], LV = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  var CHE = { one: 'One word', list: 'Word list', free: 'Free words' }, SO_O = [8, 12, 16];
  var AW_UID = 'tpD5VivTD6g4NVceix4Zf3Ibefp1';   // chủ thư viện AWord (tài khoản Google của thầy)
  var BIEN_TEN = { eng1: 'ENG1', eng2: 'ENG2', vi1: 'VI1', vi2: 'VI2' };
  // một dòng mô tả cách đấu của giải: "A Show Speed · 2 phút · Easy" | "… · Free words · 7 JOB / WORDS"
  GD.cachDau = function (g) { return g.bo ? (CHE[g.bo.che] || 'Bộ từ') + ' · ' + (g.bo.ten || '') : (LV[g.lv] || g.lv); };
  var TT = { dang: ['dang', 'Đang diễn ra'], sap: ['sap', 'Sắp diễn ra'], xong: ['xong', 'Đã xong'] };
  var THU_TT = { dang: 0, sap: 1, xong: 2 };
  var IC_DH = '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>';   // v1.375.0 nút Giới hạn chơi
  var IC = {
    cup:'<svg class="ic" viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/></svg>',
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
        { id: 'm4', ten: 'Speed Cup tuần 4', lops: ['A1C', 'NTK9', 'B2B'], game: 'aShowSpeed', phut: 3, lv: 'medium', tu: dau.getTime() + 6 * D, den: dau.getTime() + 12 * D + 3 * 3600e3, sao: [30, 20, 10], dong: false, nguon: 'mylesson', hinhThuc: 'cap' },
        { id: 'm2', ten: 'Speed Cup tuần 2', lops: ['A1C'], game: 'aShowSpeed', phut: 2, lv: 'easy', tu: dau.getTime() - 9 * D, den: dau.getTime() - 3 * D, sao: [30, 20, 10], dong: false }
      ],
      bang: {
        'm3/A1C': { hs_0: { t: 3, h: 1, b: 1 }, hs_1: { t: 4, h: 0, b: 2 }, hs_2: { t: 3, h: 2, b: 0 }, hs_3: { t: 2, h: 1, b: 2 }, hs_4: { t: 2, h: 0, b: 3 } },
        'm3/NTK9': { hs_6: { t: 3, h: 0, b: 1 }, hs_0: { t: 2, h: 1, b: 0 }, hs_1: { t: 1, h: 1, b: 2 } },
        'm2/A1C': { hs_2: { t: 7, h: 0, b: 1 }, hs_0: { t: 5, h: 2, b: 2 }, hs_1: { t: 5, h: 1, b: 3 }, hs_3: { t: 3, h: 2, b: 3 } }
      },
      tran: {
        'm3/A1C': [
          { id: 'x1', a: 'hs_1', b: 'hs_2', tenA: 'Gia Bảo', tenB: 'Bảo Nam', da: 12, db: 9, kq: 'thang', ly: '', luc: bay - 6e5 },
          { id: 'x2', a: 'hs_0', b: 'hs_3', tenA: 'BẠN THỬ', tenB: 'Thảo Vy', da: 14, db: 9, kq: 'thang', ly: '', luc: bay - 18e5 },
          { id: 'x3', a: 'hs_2', b: 'hs_4', tenA: 'Bảo Nam', tenB: 'Khánh Linh', da: 8, db: 8, kq: 'hoa', ly: '', luc: bay - 36e5 }
        ]
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
    if (NW.laBanThu()) { TRAN_LOP[gid + '/' + lop] = (mau().tran || {})[gid + '/' + lop] || []; return mau().bang[gid + '/' + lop] || {}; }
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
      GD.cachDau(g) + ' · thắng +2, hòa +1. Vào Khám phá → Giải đấu, hoặc bấm ⚔ ngay trong nhóm chat để thách đấu bạn đang online. Giải đóng lúc ' + gio(g.den) + ' ngày ' + ngay(g.den) + '.';
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
        (m.ly ? ' · ' + an(/^roi/.test(m.ly) ? 'có bạn rời trận' : 'có bạn mất kết nối') : '') + (m.kt ? ' · không tính điểm (đã đủ trận hôm nay)' : '') +
        '</small></div><span class="ty-so">' + (m.toi || 0) + '–' + (m.ban || 0) + '</span><span class="cong">' + (m.giai && !m.kt ? '+' + d : '—') + '</span></div>';
    }).join('');
  };
  async function nguoiLop(lop) {
    if (NW.laBanThu()) return mau().nguoi.filter(function (n) { return n.cacLop.indexOf(lop) >= 0; });
    // đệm 1 phút (mặc định 10) — chấm online phải tươi để biết bạn nào đang ở đây
    return (await NW.nguoiTheoLop(lop, 60 * 1000)).filter(function (n) { return n.vaiTro !== 'gv' && !n.nghiHoc; });   // v1.350.0 bỏ em đã nghỉ học
  }

  // ⭐ v1.362.0 (16/10/2026, thầy) — ĐANG ĐẤU: bạn còn mở tab trận (tdDangDau/{uid} nhịp 30 giây, nw/js/tran.js) ⇒ { uid: 1 }
  GD.dangDau = async function () {
    if (NW.laBanThu()) return { hs_2: 1 };
    try {
      var f = await NW.fb(), s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'tdDangDau'), f.fs.where('luc', '>', Date.now() - 75000), f.fs.limit(200))), r = {};
      s.forEach(function (d) { r[d.id] = 1; });
      return r;
    } catch (e) { return {}; }
  };
  GD._dd = {};
  // nút Thách đấu / Giao hữu + dòng trạng thái của một bạn (online · đang đấu · lần hoạt động cuối)
  function ttBan(n) {
    var o = NW.dangOnline(n), d = !!GD._dd[n.uid];
    return { khoa: !o || d, chu: d ? '⚔ Đang đấu — chờ bạn thoát trận' : o ? 'Đang online' : (n.hoatDongLuc ? 'Hoạt động ' + NW.chuGio(n.hoatDongLuc) : 'Chưa online'), d: d };
  }

  // ---------- dựng trang ----------
  GD.dung = async function (khung) {
    var toi = NW.toi, la = !!toi.laThay, banThu = NW.laBanThu();
    var DS = [], TEN_LOP = {}, xemGiai = '', xemLop = '', boDem = null;
    var tenLop = function (ma) { return TEN_LOP[ma] || ma; };
    khung.innerHTML = '<div class="kp-loai-dau gd-dau" style="--m1:#E0575B;--m2:#FF9A9C"><button type="button" class="lui" id="gdLui" aria-label="Về Khám phá">' + NW.IC.lui + '</button>' +
      '<span class="hinh">' + IC.cup + '</span><div><h1>Giải đấu</h1><p>' + (la ? 'Tạo giải cho từng lớp, theo dõi bảng xếp hạng' : 'Thách đấu bạn cùng lớp · thắng +2 · hòa +1 · thua 0') + '</p></div>' +
      (la ? '<button type="button" class="gd-tao" id="gdGh" title="Giới hạn giờ chơi và số trận">' + IC_DH + '<span>Giới hạn chơi</span></button>' +
        '<button type="button" class="gd-tao" id="gdTao">' + IC.cong + '<span>Tạo giải</span></button>' : '') + '</div><div id="gdThan"><div class="card trong">Đang tải…</div></div>';
    $('#gdLui').onclick = function () { NW.di('khampha.html'); };
    if (la) { $('#gdTao').onclick = function () { popGiai(null); }; $('#gdGh').onclick = popGioiHan; }
    var than = $('#gdThan');

    // ⭐ v1.375.0 (19/10/2026) — GIỚI HẠN CHƠI (js/the-td.js GioiHan · luật tools/dang-luat-gioi-han-choi.js · hàm tdDoi)
    //   Học sinh: khối đầu trang "hôm nay còn N trận" + nhắc 22:45 / giờ nghỉ đêm. Thầy: hộp sửa caiDat/choiGame + ai chơi nhiều nhất hôm nay.
    async function ghKhoi(gid) {
      var GH = window.GioiHan; if (!GH || la) return '';
      await GH.napCai(); GH.css();
      if (GH.dem()) return '<div class="gd-gh"><div class="gh-nhac">🌙 <span>Giờ nghỉ đêm (<b>' + GH.gioChu(GH.cai.nghiTu) + ' – ' + GH.gioChu(GH.cai.nghiDen) + '</b>) — giải đấu, giao hữu và luyện tập mở lại lúc <b>' + GH.gioChu(GH.cai.nghiDen) + '</b> sáng. Đi ngủ thôi!</span></div></div>';
      if (!GH.cai.bat) return '';
      var ph = await GH.phieu(toi.uid), con = GH.conTran(ph), cg = gid ? GH.conGiai(ph, gid) : -1;
      return '<div class="gd-gh">' + GH.nhacHtml() + '<div class="gh-nhac xam">🎮 <span>' + (con ? 'Hôm nay em còn <b>' + con + '/' + GH.cai.tranNgay + '</b> trận' : 'Hôm nay em đã chơi đủ <b>' + GH.cai.tranNgay + '</b> trận — mai đấu tiếp nhé!') +
        (cg >= 0 && con ? (cg ? ' · giải còn <b>' + cg + '/' + GH.cai.giaiNgay + '</b> trận tính điểm (cùng một bạn tối đa ' + GH.cai.capNgay + ')' : ' · đã đủ <b>' + GH.cai.giaiNgay + '</b> trận tính điểm hôm nay, đấu thêm không cộng bảng') : '') +
        ' · nghỉ đêm ' + GH.gioChu(GH.cai.nghiTu) + ' – ' + GH.gioChu(GH.cai.nghiDen) + '</span></div></div>';
    }
    async function popGioiHan() {
      var GH = window.GioiHan; if (!GH) return NW.toast('Chưa tải được phần giới hạn chơi — tải lại trang.', true);
      var c = Object.assign({}, await GH.napCai(true));
      var o = function (id, ten, gt, goi) { return '<label class="gd-o gd-gh-o"><span>' + ten + '</span><input type="text" inputmode="numeric" id="' + id + '" value="' + gt + '" aria-label="' + an(ten) + '"><span>' + goi + '</span></label>'; };
      var p = NW.popMo({ tieuDe: 'Giới hạn chơi', lop: 'gd-pop', html:
        '<p class="tiny">Áp cho trận học sinh với học sinh (giải + giao hữu). Trận có thầy tự do. Luyện tập với máy chỉ nghỉ đêm. Máy chủ chặn thật — đồng hồ máy em lệch cũng không lách được.</p>' +
        '<label class="gd-tich"><input type="checkbox" id="ghBat"' + (c.bat ? ' checked' : '') + '> Bật giới hạn</label>' +
        '<span class="lbl gd-lbl">Nghỉ đêm (giờ Việt Nam) · nhắc trước 15 phút</span><div class="gd-sao">' + o('ghTu', 'Từ', c.nghiTu, 'giờ') + o('ghDen', 'Đến', c.nghiDen, 'giờ sáng') + '</div>' +
        '<span class="lbl gd-lbl">Mỗi em mỗi ngày</span><div class="gd-sao gd-gh-mot">' + o('ghTran', 'Chơi tối đa (giải + giao hữu)', c.tranNgay, 'trận') + o('ghGiai', 'Giải chỉ tính điểm', c.giaiNgay, 'trận đầu') +
          o('ghCap', 'Cùng một bạn tính điểm tối đa', c.capNgay, 'trận') + '</div>' +
        '<div class="gd-gh-thong" id="ghThong"><p class="tiny">Đang xem hôm nay ai chơi nhiều…</p></div>' +
        '<p class="gd-loi" id="ghLoi" role="alert"></p>',
        chan: '<button type="button" class="btn soft" data-dong>Thôi</button><button type="button" class="btn primary" id="ghOk">Lưu</button>' });
      // Enter = nhận ô (lưu) · cuộn chuột không đổi số (ô chữ thường)
      $$('input[inputmode="numeric"]', p).forEach(function (x) { x.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('#ghOk', p).click(); } }); });
      // hôm nay: bao nhiêu em đã đấu + ai nhiều trận nhất (phiếu tdHan của hôm nay)
      (async function () {
        var el = $('#ghThong', p); if (!el) return;
        if (banThu) { el.innerHTML = '<p class="tiny">Bàn thử: hôm nay 12 em đã đấu · nhiều nhất: Gia Bảo 18 trận, Bảo Nam 15 trận.</p>'; return; }
        try {
          var f = await NW.fb(), s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'tdHan'), f.fs.where('ngay', '==', GH.ngay()), f.fs.limit(300))), ds = [];
          s.forEach(function (d) { ds.push({ uid: d.id, so: d.data().so || 0 }); });
          ds.sort(function (a, b) { return b.so - a.so; });
          var top = ds.slice(0, 5), ten = {};
          await Promise.all(top.map(function (x) { return f.fs.getDoc(f.fs.doc(f.db, 'nwUsers', x.uid)).then(function (u) { ten[x.uid] = (u.exists() && u.data().ten) || x.uid; })['catch'](function () { ten[x.uid] = x.uid; }); }));
          el.innerHTML = '<p class="tiny">Hôm nay: <b>' + ds.length + '</b> em đã đấu' + (top.length ? ' · nhiều nhất: ' + top.map(function (x) { return an(ten[x.uid]) + ' ' + x.so + ' trận'; }).join(', ') : '') + '.</p>';
        } catch (e) { el.innerHTML = '<p class="tiny">Chưa đọc được số trận hôm nay.</p>'; }
      })();
      $('#ghOk', p).onclick = async function () {
        var so = function (id) { var v = String($('#' + id, p).value).trim(); return /^\d{1,3}$/.test(v) ? +v : NaN; };
        var m = { bat: $('#ghBat', p).checked, nghiTu: so('ghTu'), nghiDen: so('ghDen'), tranNgay: so('ghTran'), giaiNgay: so('ghGiai'), capNgay: so('ghCap') };
        var loi = !(m.nghiTu >= 0 && m.nghiTu <= 23 && m.nghiDen >= 0 && m.nghiDen <= 23) ? 'Giờ nghỉ phải từ 0 đến 23.'
          : !(m.tranNgay >= 1 && m.tranNgay <= 200) ? 'Số trận mỗi ngày từ 1 đến 200.'
          : !(m.giaiNgay >= 1 && m.giaiNgay <= 200) ? 'Số trận tính điểm từ 1 đến 200.'
          : !(m.capNgay >= 1 && m.capNgay <= 50) ? 'Số trận cùng một bạn từ 1 đến 50.' : '';
        if (loi) { $('#ghLoi', p).textContent = loi; return; }
        if (banThu) { GH.cai = Object.assign({}, GH.MAC, m); NW.popDong(); return NW.toast('Bàn thử: đã lưu (không ghi kho).'); }
        var nut = this; nut.disabled = true;
        try {
          var f = await NW.fb();
          await f.fs.setDoc(f.fs.doc(f.db, 'caiDat', 'choiGame'), Object.assign({}, m, { capNhat: Date.now() }));
          await GH.napCai(true);
          NW.popDong(); NW.toast('Đã lưu giới hạn chơi — áp ngay cho lời mời mới.');
        } catch (e) { nut.disabled = false; $('#ghLoi', p).textContent = NW.chuLoiKho(e); }
      };
    }

    async function napLai() {
      (await GD.dsLop()).forEach(function (l) { TEN_LOP[l.ma] = l.ten || l.ma; });
      try { DS = await GD.ds(); } catch (e) { NW.toast(NW.chuLoiKho(e), true); DS = []; }
      if (!la) GD._dd = await GD.dangDau();
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
      return GiaiGhi.sapXep(ds);   // v1.380.0 — luật xếp chung (js/giai-ghi.js): em đã đấu trước, em 0 trận xuống cuối
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
          var o = NW.dangOnline(n), tt = ttBan(n);
          return '<div class="gd-ban' + (o ? '' : ' vang') + (tt.d ? ' dd' : '') + '" data-ban="' + an(n.uid) + '">' + NW.avHtml(n) + '<div class="gd-noi"><b>' + an(n.ten) + '</b><small>' + an(tt.chu) + '</small></div>' +
            '<button type="button" class="gd-nut-td' + (giaoHuu ? ' gh' : '') + '" data-td="' + an(n.uid) + '"' + (tt.khoa ? ' disabled' : '') + '>' + IC.kiem + (giaoHuu ? 'Giao hữu' : 'Thách đấu') + '</button></div>';
        }).join('') : '<div class="trong">Lớp chưa có bạn nào khác.</div>') + '</div>';
    }
    // ⭐ Đợt 2 (v1.347.0): nút Thách đấu / Giao hữu ⇒ lời mời thật (js/thachdau.js) — ctx = { lop, giai, phut, lv, tenGiai }
    function ganNutTd(ctx, ds) {
      // ⭐ v1.362.0 — 30 giây hỏi lại ai đang đấu, sửa TẠI CHỖ dòng trạng thái + nút (không vẽ lại cả trang)
      clearInterval(GD._ddHen);
      GD._ddHen = setInterval(async function () {
        if (!document.querySelector('[data-ban]')) return;
        GD._dd = await GD.dangDau();
        $$('[data-ban]', than).forEach(function (el) {
          var n = (ds.filter(function (x) { return x.n.uid === el.getAttribute('data-ban'); })[0] || {}).n; if (!n) return;
          var tt = ttBan(n), b = el.querySelector('[data-td]'), sm = el.querySelector('.gd-noi small');
          el.classList.toggle('dd', tt.d); if (sm) sm.textContent = tt.chu; if (b) b.disabled = tt.khoa;
        });
      }, 30000);
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
    // ⭐ v1.351.0 — học sinh cũng thấy (chỉ lớp em: truy vấn phải lọc lop để luật hsLop chứng minh được) + nút THEO DÕI
    async function dangDauHtml(g, lop) {
      if (g._tt !== 'dang') return '';
      var ds = [];
      if (banThu) ds = [{ id: 'mau-dang', a: 'hs_2', b: 'hs_3', tenA: 'Bảo Nam', tenB: 'Thảo Vy', lop: lop || g.lops[0], diem: { a: 8, b: 6 }, ketThuc: Date.now() + 75e3 }];
      else try {
        var f = await NW.fb(), w = [f.fs.where('giai', '==', g.id), f.fs.where('trangThai', '==', 'choi')];
        if (!toi.laThay) w.push(f.fs.where('lop', '==', lop));
        var snap = await f.fs.getDocs(f.fs.query.apply(null, [f.fs.collection(f.db, 'tranDau')].concat(w, [f.fs.limit(30)])));
        snap.forEach(function (d) { var t = d.data(); if ((t.ketThuc || 0) > Date.now() - 15000) ds.push(Object.assign({ id: d.id }, t)); });
      } catch (e) { console.warn('[giải đấu] đang đấu', e); }
      if (!toi.laThay && !ds.length) return '';
      return '<div class="card gd-the"><h3><span class="gd-nhay"></span>Đang đấu<small>' + ds.length + ' trận</small></h3>' +
        (ds.length ? ds.map(function (t) {
          var con = Math.max(0, Math.round(((t.ketThuc || 0) - Date.now()) / 1000)), minh = t.a === toi.uid || t.b === toi.uid;
          return '<div class="gd-tran"><div class="gd-noi">' + an(t.tenA) + ' <b>vs</b> ' + an(t.tenB) + '<small>' + an(tenLop(t.lop)) + ' · còn ' + Math.floor(con / 60) + ':' + hai(con % 60) + '</small></div>' +
            '<span class="ty-so">' + ((t.diem || {}).a || 0) + '–' + ((t.diem || {}).b || 0) + '</span>' +
            (minh ? '' : '<button type="button" class="gd-xem" data-xem="' + an(t.id) + '">Theo dõi</button>') + '</div>';
        }).join('') : '<div class="trong">Không có trận nào đang đấu.</div>') + '</div>';
    }
    function ganXem() {
      $$('[data-xem]', than).forEach(function (b) {
        b.onclick = function () { var id = b.getAttribute('data-xem'); NW.di('tran.html?id=' + encodeURIComponent(id) + '&xem=1' + (banThu ? '&thu=1&che=free' : '')); };
      });
    }
    // ⭐ v1.350.0 — thầy HUỶ KẾT QUẢ một trận (vd 2 em đấu "dàn xếp"): trừ lại thắng/hòa/thua của 2 em trong bảng lớp, trận gạch ngang.
    //   Chỉ khi giải CHƯA thưởng sao (thưởng rồi thì bảng đã chốt). Lịch sử riêng của 2 em (tdLichSu) giữ nguyên.
    function tranGanDayHtml(ds, g, lop) {
      if (!ds.length) return '<div class="trong">Chưa có trận nào.</div>';
      var duocHuy = toi.laThay && g && !g.daThuong;
      return ds.slice(0, 12).map(function (m) {
        var kq = m.kq === 'thang' ? an(m.tenA) + ' thắng' : m.kq === 'thua' ? an(m.tenB) + ' thắng' : 'Hòa';
        if (m.huy) return '<div class="gd-tran gd-da-huy"><div class="gd-noi">' + an(m.tenA) + ' – ' + an(m.tenB) + '<small>' + an(NW.chuGio(m.luc)) + ' · ' + kq + '</small></div>' +
          '<span class="ty-so">' + (m.da || 0) + '–' + (m.db || 0) + '</span><span class="gd-huy-nhan">Đã huỷ</span></div>';
        return '<div class="gd-tran"><div class="gd-noi">' + an(m.tenA) + ' – ' + an(m.tenB) + '<small>' + an(NW.chuGio(m.luc)) + ' · ' + kq +
          (m.ly ? ' · ' + (/^roi/.test(m.ly) ? 'có bạn rời trận' : 'có bạn mất kết nối') : '') +
          (m.ka && m.kb ? ' · không tính điểm' : m.ka || m.kb ? ' · không tính điểm cho ' + an(m.ka ? m.tenA : m.tenB) : '') + '</small></div><span class="ty-so">' + (m.da || 0) + '–' + (m.db || 0) + '</span>' +
          (duocHuy && m.id ? '<button type="button" class="gd-huy" data-huytran="' + an(m.id) + '" data-lop="' + an(lop) + '">Huỷ kết quả</button>' : '') + '</div>';
      }).join('');
    }
    async function huyTran(g, lop, id) {
      if (banThu) {
        var ds0 = (mau().tran || {})[g.id + '/' + lop] || [], m0 = ds0.filter(function (x) { return x.id === id; })[0], b0 = mau().bang[g.id + '/' + lop] || {};
        if (m0 && !m0.huy) { truTran(b0, m0); m0.huy = true; }
        NW.toast('Đã huỷ kết quả trận, điểm 2 bạn đã trừ lại.'); return napLai();
      }
      try {
        await GiaiGhi.huyTran(await NW.fb(), g.id, lop, id);   // v1.380.0 — đường ghi chung js/giai-ghi.js (pop-up dashboard dùng cùng)
        NW.toast('Đã huỷ kết quả trận, điểm 2 bạn đã trừ lại.'); napLai();
      } catch (e) { NW.toast(NW.chuLoiKho(e), true); }
    }
    function truTran(em, m) { GiaiGhi.truTran(em, m); }

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
        var gh1 = await ghKhoi(g.id);
        than.innerHTML = gh1 +
          '<div class="card gd-hero">' + biaHtml(g) + '<div class="gd-noi">' +
            '<div class="meta"><span class="gd-pill dang">Đang diễn ra</span>' + ngay(g.tu) + ' → ' + ngay(g.den) + ' · ' + g.lops.map(tenLop).map(an).join(', ') + '</div>' +
            '<h2>' + an(g.ten) + '</h2>' +
            '<div class="meta"><span class="gd-pill ghi">A Show Speed</span><span class="gd-pill ghi">' + g.phut + ' phút</span><span class="gd-pill ghi">' + an(g.bo ? CHE[g.bo.che] || 'Bộ từ' : LV[g.lv] || g.lv) + '</span>' +
              (g.bo ? '<span class="gd-pill ghi">Bộ từ: ' + an(g.bo.ten || '') + '</span>' : '') +
              (g.sao && g.sao.some(Boolean) ? '<span class="gd-pill vang">' + IC.sao + 'Top 3 mỗi lớp: ' + g.sao.join(' · ') + ' sao</span>' : '') + '</div>' +
            '<div class="gd-luat"><div class="t"><b>+2</b><span>Thắng</span></div><div class="h"><b>+1</b><span>Hòa</span></div><div class="b"><b>0</b><span>Thua</span></div></div>' +
            '<div class="gd-toi"><span class="so">' + (coTran ? '#' + (vt + 1) : '–') + '</span><div><b>' + an(tenLop(xemLop)) + ': ' + (coTran ? 'em hạng ' + (vt + 1) + ' · ' + GD.diem(cua) + ' điểm' : 'em chưa đấu trận nào') + '</b>' +
              '<small>' + soTran(cua) + ' trận: thắng ' + ((cua || {}).t || 0) + ' · hòa ' + ((cua || {}).h || 0) + ' · thua ' + ((cua || {}).b || 0) + '</small></div></div>' +
          '</div></div>' +
          chipLop(lopCo, xemLop, 'data-lop') +
          '<div class="gd-luoi"><div class="card gd-the"><h3>' + IC.cup + 'Bảng xếp hạng ' + an(tenLop(xemLop)) + '<small>Tự cập nhật sau mỗi trận</small></h3>' + bangHtml(g, ds) + '</div>' +
          '<div class="gd-cot">' + (await dangDauHtml(g, xemLop)) + banHtml(ds, false) + '<div class="card gd-the"><h3>Trận của em</h3>' + lsHtml + '</div></div></div>';
      } else {
        // chưa có giải nào đang mở cho lớp em ⇒ đấu giao hữu + giải vừa xong
        if (lopEm.indexOf(xemLop) < 0) xemLop = lopEm.indexOf(toi.lop) >= 0 ? toi.lop : lopEm[0];
        var ds2 = xemLop ? (await nguoiLop(xemLop).catch(function () { return []; })).map(function (n) { return { n: n, r: null }; }) : [];
        ctx = { lop: xemLop, giai: '' }; dsTd = ds2;
        var cu = DS.filter(function (x) { return x._tt === 'xong' && x.lops.indexOf(xemLop) >= 0; })[0];
        var top = cu ? (await hangLop(cu, xemLop)).filter(function (x) { return soTran(x.r) > 0; }).slice(0, 3) : [];
        var sap = DS.filter(function (x) { return x._tt === 'sap' && x.lops.some(function (l) { return lopEm.indexOf(l) >= 0; }); })[0];
        var gh2 = await ghKhoi('');
        than.innerHTML = gh2 +
          '<div class="card gd-chua"><span class="ic-o">' + IC.cup + '</span><div><b>Chưa có giải nào đang mở</b><p>' +
            (sap ? an(sap.ten) + ' bắt đầu lúc ' + gio(sap.tu) + ' ngày ' + ngay(sap.tu) + '. ' : '') + (window.GioiHan && GioiHan.ghDong ? '🔒 Giao hữu đang tạm đóng — thầy Andrew sẽ mở lại trong mùa sau. Em vẫn luyện tập với máy được ở nút ⚔ trong nhóm chat lớp.'   // v1.414.0
              : 'Em vẫn đấu giao hữu được với bạn đang online. Giao hữu không cộng điểm xếp hạng.') + '</p></div></div>' +
          chipLop(lopEm, xemLop, 'data-lop') +
          '<div class="gd-luoi">' + (cu ? '<div class="card gd-the"><h3>' + IC.cup + 'Giải vừa xong</h3><div class="gd-cu"><b>' + an(cu.ten) + '</b> <span class="gd-pill xong">Đã xong</span>' +
            (top.length ? '<div class="top3">' + top.map(function (x, i) { return '<span>' + ['🥇', '🥈', '🥉'][i] + ' ' + an(x.n.ten) + ' · ' + GD.diem(x.r) + 'đ</span>'; }).join('') + '</div>' : '<p class="tiny">Giải chưa có trận nào.</p>') + '</div></div>' : '') +
          '<div class="gd-cot">' + banHtml(ds2, true) + '<div class="card gd-the"><h3>Trận của em</h3>' + lsHtml + '</div></div></div>';
      }
      $$('[data-lop]', than).forEach(function (b) { b.onclick = function () { xemLop = b.getAttribute('data-lop'); veHs(); }; });
      ganNutTd(ctx, dsTd); ganXem();
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
          '<small>' + ngay(x.tu) + ' → ' + ngay(x.den) + ' · ' + x.phut + ' phút · ' + an(GD.cachDau(x)) + '</small></span></button>';
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
          '<div class="dong"><span>Mỗi trận</span><b>A Show Speed · ' + g.phut + ' phút · ' + an(GD.cachDau(g)) + '</b></div>' +
          (g.bo ? '<div class="dong"><span>Bộ từ</span><b>' + an(g.bo.ten || '') + ' · ' + (g.bo.tu || []).length + ' từ · gợi ý ' + an(g.bo.bienTen || 'mặc định') +
            (g.bo.che === 'one' ? ' · ' + (g.bo.o || 12) + ' ô' : '') + (g.bo.che === 'free' ? (g.bo.chiBo !== false ? ' · chỉ từ trong bộ' : ' · mọi từ có nghĩa') : '') + '</b></div>' : '') +
          '<div class="dong"><span>Thưởng top 3 mỗi lớp</span><b>' + (g.sao || []).join(' · ') + ' sao</b></div></div>';
      } else {
        var ds = await hangLop(g, xemLop);
        ct = chipLop(g.lops, xemLop, 'data-lopt') + '<div class="gd-luoi"><div class="card gd-the"><h3>' + IC.cup + 'Bảng xếp hạng ' + an(tenLop(xemLop)) + '<small>' + (g._tt === 'xong' ? 'Chốt lúc đóng giải' : 'Tự cập nhật') + '</small></h3>' + bangHtml(g, ds, true) + '</div>' +
          '<div class="gd-cot">' + (await dangDauHtml(g, xemLop)) + '<div class="card gd-the"><h3>Trận gần đây<small>' + an(tenLop(xemLop)) + '</small></h3>' + tranGanDayHtml(GD.tranGanDay(g.id, xemLop), g, xemLop) + '</div></div></div>';
      }
      than.innerHTML = '<div class="gd-ds">' + the + '</div>' +
        '<div class="gd-ct-dau"><h2>' + an(g.ten) + '</h2><span class="gd-pill ' + t[0] + '">' + t[1] + '</span><div class="tac-vu">' + tacVu + '</div>' +
        // ⭐ v1.351.0 — thông số đang chạy, nhìn là biết (bấm Sửa để đổi)
        '<p class="gd-ts">A Show Speed · ' + g.phut + ' phút · ' + an(GD.cachDau(g)) + ' · ' + g.lops.map(tenLop).map(an).join(', ') + ' · đóng ' + gio(g.den) + ' ngày ' + ngay(g.den) + '</p></div>' + ct;
      $$('[data-giai]', than).forEach(function (b) { b.onclick = function () { xemGiai = b.getAttribute('data-giai'); veThay(); }; });
      $$('[data-lopt]', than).forEach(function (b) { b.onclick = function () { xemLop = b.getAttribute('data-lopt'); veThay(); }; });
      ganXem();
      // Huỷ kết quả: bấm 2 lần ngay trên nút (không mở hộp hỏi)
      $$('[data-huytran]', than).forEach(function (b) {
        b.onclick = function () {
          if (!b.classList.contains('xn')) { b.classList.add('xn'); b.textContent = 'Bấm lần nữa để huỷ'; setTimeout(function () { if (document.contains(b)) { b.classList.remove('xn'); b.textContent = 'Huỷ kết quả'; } }, 4000); return; }
          b.disabled = true; huyTran(g, b.getAttribute('data-lop'), b.getAttribute('data-huytran'));
        };
      });
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
    // v1.380.0 — hangCung / soCuaUid / ghi phiếu sao / báo kết quả chuyển sang js/giai-ghi.js (pop-up giải trên dashboard dùng cùng)
    function hangCung(ds) { return GiaiGhi.hangCung(ds); }
    async function soCuaUid() {
      if (banThu) return function (uid) { return '1' + String(100000 + (+String(uid).replace(/\D/g, '') || 0)).slice(1); };
      // đường phụ (đo 15/10: w nối 161/187 em, thêm lop.json id→mã ⇒ 186/187): uid hs_<id myStudent> ⇒ mã đăng nhập ⇒ số
      return GiaiGhi.soCuaUid(await NW.fb(), NW.CFG.GOC_DL || '../');
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
          if (!banThu) await GiaiGhi.thuong(await NW.fb(), g, theoLop);   // v1.380.0 — đường ghi chung js/giai-ghi.js
          else Object.assign(mau().giai.filter(function (x) { return x.id === g.id; })[0], { daThuong: true });
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
      return GiaiGhi.baoKetQua(await NW.fb(), g, theoLop);
    }
    async function ghi(g, doi, bao) {
      doi.capNhat = Date.now();
      if (banThu) { Object.assign(mau().giai.filter(function (x) { return x.id === g.id; })[0], doi); NW.toast(bao); return napLai(); }
      try { var f = await NW.fb(); await f.fs.updateDoc(f.fs.doc(f.db, 'giaiDau', g.id), doi); NW.toast(bao); napLai(); }
      catch (e) { NW.toast(NW.chuLoiKho(e), true); }
    }

    // ===== hộp tạo / sửa giải =====
    async function popGiai(g) {
      var moi = !g, dang = g && g._tt === 'dang', tuApp = !!(g && g.nguon === 'mylesson');   /* v1.371.0: giải tạo từ app myLesson ⇒ web chỉ sửa giờ/sao */
      var lopDs = await GD.dsLop();
      var D = 86400e3, mai = new Date(Date.now() + D); mai.setHours(18, 0, 0, 0);
      var f0 = g ? g : { ten: '', lops: [], phut: 2, lv: 'easy', tu: mai.getTime(), den: mai.getTime() + 6 * D + 3 * 3600e3, sao: [30, 20, 10] };
      var bo0 = f0.bo || null;
      // ⭐ v1.351.0 — bộ từ đang chọn trong hộp: act (bản đầy đủ đọc từ thư viện, hoặc null = giữ bo cũ) + tuỳ chọn
      var BO = { act: null, id: bo0 ? bo0.id : '', ten: bo0 ? bo0.ten : '', so: bo0 ? (bo0.tu || []).length : 0, bien: bo0 ? bo0.bien || '' : '',
        bienDs: bo0 && bo0.bien ? [bo0.bien] : [], che: bo0 ? bo0.che : 'free', o: bo0 ? bo0.o || 12 : 12, chiBo: bo0 ? bo0.chiBo !== false : true,
        goiY: bo0 ? bo0.goiY !== false : true, giong: bo0 ? !!bo0.giong : false, coGiong: bo0 ? !!bo0.giong : false };
      // act có clip giọng đọc cho bộ gợi ý này không (VOICE của AWord: chỉ bộ tiếng Anh có clip)
      var clipCua = function (it, k) { var x = k && it.voices && it.voices[k]; return (x && x.voice) || (!k ? it.voice || '' : ''); };
      var actCoGiong = function (a, k) { return !!(a && a.content.items.some(function (it) { return clipCua(it, k); })); };
      var nut = function (ten, gt, chon, tat) { return '<button type="button" data-v="' + an(gt) + '" class="' + (chon ? 'on' : '') + '"' + (tat ? ' disabled' : '') + '>' + an(ten) + '</button>'; };
      var p = NW.popMo({ tieuDe: moi ? 'Tạo giải mới' : 'Sửa ' + g.ten, lop: 'gd-pop', html:
        (dang ? '<p class="gd-chu-dang">Giải đang chạy: đổi gì cũng chỉ áp cho trận MỚI — trận đang đấu giữ nguyên, bảng xếp hạng giữ nguyên.</p>' : '') +
        '<label class="lbl" for="gdTen">Tên giải</label><input type="text" id="gdTen" maxlength="40" autocomplete="off" value="' + an(f0.ten) + '" placeholder="Ví dụ: Speed Cup tuần 4">' +
        '<span class="lbl gd-lbl">Lớp tham gia · mỗi lớp một bảng xếp hạng</span><div class="gd-chon" id="gdLop">' +
          (lopDs.length ? lopDs.map(function (l) { return nut(l.ten || l.ma, l.ma, f0.lops.indexOf(l.ma) >= 0); }).join('') : '<span class="tiny">Chưa có danh sách lớp (nwCauHinh/lop).</span>') + '</div>' +
        '<span class="lbl gd-lbl">Game</span><div class="gd-chon mot"><button type="button" class="on">A Show Speed</button><button type="button" disabled>Quiz · sắp có</button></div>' +
        // ⭐ v1.351.0 — BỘ TỪ: 16 chữ ngẫu nhiên (như cũ) | act AWord WORDS + tuỳ chọn như Fight
        '<span class="lbl gd-lbl">Bộ chữ của trận</span><div class="gd-chon mot" id="gdNguon">' + nut('16 chữ ngẫu nhiên', 'ngau', !bo0) + nut('Act AWord WORDS', 'act', !!bo0) + '</div>' +
        '<div class="gd-bo" id="gdBo"' + (bo0 ? '' : ' hidden') + '>' +
          '<div class="gd-act"><div class="gd-noi"><b id="gdActTen">' + (bo0 ? an(bo0.ten) : 'Chưa chọn act') + '</b><small id="gdActSo">' + (bo0 ? BO.so + ' từ' : 'Bấm "Chọn act" để lấy bộ từ trong thư viện AWord') + '</small></div>' +
            '<button type="button" class="gd-nut" id="gdActMo">Chọn act…</button></div>' +
          '<div class="gd-thuvien" id="gdTv" hidden><input type="search" id="gdTvTim" placeholder="Tìm act (vd 7 JOB, DS-S4)…" autocomplete="off"><div class="gd-tv-ds" id="gdTvDs"><div class="trong">Đang tải thư viện…</div></div></div>' +
          '<span class="lbl gd-lbl">Gợi ý (bộ chữ của act)</span><div class="gd-chon mot" id="gdBien"></div>' +
          '<span class="lbl gd-lbl">A Show Speed mode</span><div class="gd-chon mot" id="gdChe">' + Object.keys(CHE).map(function (k) { return nut(CHE[k], k, k === BO.che); }).join('') + '</div>' +
          '<div class="gd-hai"><div id="gdOHop"><span class="lbl gd-lbl">Letters · One word</span><div class="gd-chon mot" id="gdO">' + SO_O.map(function (n) { return nut(String(n), n, n === BO.o); }).join('') + '</div></div>' +
          '<div id="gdChiBoHop"><span class="lbl gd-lbl">Free words</span><label class="gd-tich"><input type="checkbox" id="gdChiBo"' + (BO.chiBo ? ' checked' : '') + '> Word list only</label></div></div>' +
          '<p class="tiny gd-chu-bo" id="gdCheChu"></p>' +
          // ⭐ v1.352.0 — gợi ý lật chữ (y Fight) + giọng đọc gợi ý (VOICE)
          '<label class="gd-tich"><input type="checkbox" id="gdGoiY"' + (BO.goiY ? ' checked' : '') + '> Gợi ý lật chữ: 15 giây không ai tìm thêm từ ⇒ lật thêm 1 chữ (lật hết thì bỏ từ đó)</label>' +
          '<label class="gd-tich" id="gdGiongHop"><input type="checkbox" id="gdGiong"' + (BO.giong ? ' checked' : '') + '> Gợi ý bằng GIỌNG ĐỌC (VOICE): ẩn chữ gợi ý, em bấm loa để nghe</label>' +
        '</div>' +
        '<div class="gd-hai"><div><span class="lbl gd-lbl">Mỗi trận</span><div class="gd-chon mot" id="gdPhut">' + PHUT.map(function (x) { return nut(x + ' phút', x, x === f0.phut); }).join('') + '</div></div>' +
        '<div id="gdLvHop"' + (bo0 ? ' hidden' : '') + '><span class="lbl gd-lbl">Độ khó (16 chữ ngẫu nhiên)</span><div class="gd-chon mot" id="gdLv">' + Object.keys(LV).map(function (k) { return nut(LV[k], k, k === f0.lv); }).join('') + '</div></div></div>' +
        '<span class="lbl gd-lbl">Mở lúc' + (dang ? ' · đã mở' : '') + '</span><div class="gd-gio"><input type="date" class="chon-o" id="gdTuN" value="' + oNgay(f0.tu) + '"' + (dang ? ' disabled' : '') + '><input type="time" class="chon-o" id="gdTuG" value="' + gio(f0.tu) + '"' + (dang ? ' disabled' : '') + '></div>' +
        '<span class="lbl gd-lbl">Đóng lúc</span><div class="gd-gio"><input type="date" class="chon-o" id="gdDenN" value="' + oNgay(f0.den) + '"><input type="time" class="chon-o" id="gdDenG" value="' + gio(f0.den) + '"></div>' +
        '<span class="lbl gd-lbl">Thưởng sao khi đóng giải · top 3 mỗi lớp</span><div class="gd-sao">' + ['Hạng 1', 'Hạng 2', 'Hạng 3'].map(function (t, i) {
          return '<label class="gd-o"><span>' + t + '</span><input type="text" inputmode="numeric" id="gdSao' + i + '" value="' + ((f0.sao || [])[i] || 0) + '" aria-label="Sao ' + t + '"><span>⭐</span></label>';
        }).join('') + '</div>' +
        (moi ? '<label class="gd-tich"><input type="checkbox" id="gdBao" checked> Báo vào nhóm chat các lớp</label>' : '') +
        '<p class="gd-loi" id="gdLoi" role="alert"></p>',
        chan: '<button type="button" class="btn soft" data-dong>Thôi</button><button type="button" class="btn primary" id="gdOk">' + (moi ? 'Tạo giải' : 'Lưu') + '</button>' });
      function ganChon(hop) {
        $$('button[data-v]', hop).forEach(function (b) {
          b.onclick = function () {
            if (b.disabled) return;
            if (b.parentElement.id === 'gdLop') b.classList.toggle('on');
            else $$('button', b.parentElement).forEach(function (x) { x.classList.toggle('on', x === b); });
            if (b.parentElement.id === 'gdNguon' || b.parentElement.id === 'gdChe') veBo();
          };
        });
      }
      $$('.gd-chon', p).forEach(ganChon);
      // ----- khu bộ từ -----
      var CHE_GIAI = { one: 'Mỗi bàn MỘT từ: gợi ý + chữ của từ lẫn chữ mồi; ai ghép đúng trước +1.',
        list: 'Mỗi bàn tối đa 5 từ, ô chữ như phím (bấm lại được); mỗi từ đúng +1.',
        free: 'Mỗi bàn giấu 2–3 từ trong 16 chữ; từ của bài điểm ×2. Tắt "Word list only" thì mọi từ tiếng Anh có nghĩa cũng có điểm.' };
      function veBo() {
        var laAct = $('#gdNguon .on', p).getAttribute('data-v') === 'act', che = $('#gdChe .on', p).getAttribute('data-v');
        $('#gdBo', p).hidden = !laAct; $('#gdLvHop', p).hidden = laAct;
        $('#gdOHop', p).classList.toggle('tat', che !== 'one'); $('#gdChiBoHop', p).classList.toggle('tat', che !== 'free');
        $('#gdCheChu', p).textContent = CHE_GIAI[che] || '';
        $('#gdBien', p).innerHTML = (BO.bienDs.length ? BO.bienDs : ['']).map(function (k) { return k ? nut(BIEN_TEN[k] || k.toUpperCase(), k, k === BO.bien) : '<button type="button" class="on" disabled>Gợi ý của act</button>'; }).join('');
        ganChon($('#gdBien', p));
        $$('#gdBien button[data-v]', p).forEach(function (b) { var cu = b.onclick; b.onclick = function () { cu(); BO.bien = b.getAttribute('data-v'); veBo(); }; });
        // giọng đọc chỉ bật được khi act có clip cho bộ gợi ý đang chọn
        var coG = BO.act ? actCoGiong(BO.act, BO.bien) : (bo0 && BO.bien === (bo0.bien || '') ? BO.coGiong : true);
        $('#gdGiongHop', p).classList.toggle('tat', !coG);
        if (!coG) $('#gdGiong', p).checked = false;
      }
      veBo();
      // thư viện AWord: act WORDS (có content.items[{word}]) — đọc MỘT lần mỗi lần mở hộp
      var TV = null;
      async function napThuVien() {
        if (TV) return TV;
        if (banThu) {
          TV = [{ id: 'a1', title: '7 JOB / WORDS', content: { variants: ['eng1', 'eng2', 'vi1', 'vi2'], items: [{ word: 'doctor', clue: 'bác sĩ', clues: { eng1: 'a person who treats sick people', vi1: 'bác sĩ' }, voices: { eng1: { voice: 'clipmau1' } } }, { word: 'nurse', clue: 'y tá', clues: { eng1: 'a person who cares for patients', vi1: 'y tá' } }, { word: 'farmer', clue: 'nông dân' }] } },
            { id: 'a2', title: '1 BODY PARTS / WORDS', content: { items: [{ word: 'head', clue: 'đầu' }, { word: 'hand', clue: 'bàn tay' }] } }];
          return TV;
        }
        var f = await NW.fb();
        var s = await f.fs.getDocs(f.fs.query(f.fs.collection(f.db, 'users', AW_UID, 'items'), f.fs.where('kind', '==', 'act')));
        TV = [];
        s.forEach(function (d) {
          var a = d.data(), it = a.content && a.content.items;
          if (a.trashed || !Array.isArray(it) || !it.length || !it.some(function (x) { return x && x.word; })) return;
          TV.push(Object.assign({ id: d.id }, a));
        });
        // act WORDS lên đầu, mới sửa trước
        TV.sort(function (a, b) { return (/WORDS/i.test(b.title || '') - /WORDS/i.test(a.title || '')) || (b.updatedAt || 0) - (a.updatedAt || 0); });
        return TV;
      }
      function veThuVien() {
        var tim = NW.khongDau($('#gdTvTim', p).value.trim()).toLowerCase(), ds = (TV || []).filter(function (a) { return !tim || NW.khongDau(a.title || '').toLowerCase().indexOf(tim) >= 0; });
        $('#gdTvDs', p).innerHTML = ds.length ? ds.slice(0, 60).map(function (a) {
          return '<button type="button" data-act="' + an(a.id) + '"><b>' + an(a.title || '(không tên)') + '</b><small>' + a.content.items.length + ' từ' + (a.content.variants ? ' · ' + a.content.variants.map(function (k) { return BIEN_TEN[k] || k; }).join(' ') : '') + '</small></button>';
        }).join('') : '<div class="trong">Không thấy act nào.</div>';
        $$('[data-act]', p).forEach(function (b) {
          b.onclick = function () {
            var a = TV.filter(function (x) { return x.id === b.getAttribute('data-act'); })[0]; if (!a) return;
            BO.act = a; BO.id = a.id; BO.ten = a.title || ''; BO.so = a.content.items.length;
            BO.bienDs = (a.content.variants || []).filter(function (k) { return k !== 'pron'; });
            BO.bien = BO.bienDs.indexOf(BO.bien) >= 0 ? BO.bien : (BO.bienDs.indexOf('vi1') >= 0 ? 'vi1' : BO.bienDs[0] || '');
            $('#gdActTen', p).textContent = BO.ten; $('#gdActSo', p).textContent = BO.so + ' từ';
            $('#gdTv', p).hidden = true; veBo();
          };
        });
      }
      $('#gdActMo', p).onclick = async function () {
        var tv = $('#gdTv', p); tv.hidden = !tv.hidden; if (tv.hidden) return;
        try { await napThuVien(); veThuVien(); $('#gdTvTim', p).focus(); }
        catch (e) { $('#gdTvDs', p).innerHTML = '<div class="trong">Chưa đọc được thư viện AWord: ' + an(NW.chuLoiKho(e)) + '. Thầy đăng nhập Google đúng tài khoản AWord (hoặc mở từ app myLesson sau khi đăng luật mới).</div>'; }
      };
      $('#gdTvTim', p).oninput = veThuVien;
      $('#gdTvTim', p).onkeydown = function (e) { if (e.key === 'Enter') e.preventDefault(); };
      // act → bộ từ chép vào giải
      async function dungBo() {
        var che = $('#gdChe .on', p).getAttribute('data-v'), o = +$('#gdO .on', p).getAttribute('data-v'), chiBo = $('#gdChiBo', p).checked;
        var a = BO.act, goiY = $('#gdGoiY', p).checked, giong = $('#gdGiong', p).checked;
        // giữ act cũ mà đổi bộ gợi ý / mới bật giọng đọc ⇒ đọc lại act từ thư viện (giải chỉ cất gợi ý + clip của MỘT bộ)
        if (!a && bo0 && (BO.bien !== (bo0.bien || '') || (giong && !bo0.giong))) {
          var tv = await napThuVien(); a = tv.filter(function (x) { return x.id === bo0.id; })[0] || null;
          if (!a) throw new Error('Không thấy act ' + bo0.ten + ' trong thư viện nữa — thầy chọn lại act.');
        }
        if (!a) return Object.assign({}, bo0, { che: che, o: o, chiBo: chiBo, goiY: goiY, giong: giong && !!bo0.giong });
        var k = BO.bien;
        var tu = a.content.items.map(function (it) {
          var m = k && it.clues && it.clues[k] != null ? it.clues[k] : it.clue;
          var x = { w: String(it.word || '').trim().slice(0, 40), m: String(m || '').trim().slice(0, 200) }, v = giong ? clipCua(it, k) : '';
          if (v) x.v = String(v).slice(0, 60);
          return x;
        }).filter(function (x) { return /[A-Za-z]/.test(x.w); }).slice(0, 300);
        if (!tu.length) throw new Error('Act này không có từ nào.');
        return { id: a.id, ten: String(a.title || '').slice(0, 80), che: che, o: o, chiBo: chiBo, bien: k || '', bienTen: k ? BIEN_TEN[k] || k.toUpperCase() : '', tu: tu,
          goiY: goiY, giong: giong && tu.some(function (x) { return x.v; }) };
      }
      // ô số: chỉ chữ số; Enter = nhận ô; KHÔNG dùng type=number (cuộn chuột đổi số — nếp "ô nhập số liệu an toàn")
      $$('.gd-sao input', p).forEach(function (i) {
        i.oninput = function () { i.value = i.value.replace(/\D/g, '').slice(0, 3); };
        i.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } };
      });
      $('#gdTen', p).onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };
      var docGio = function (n, gg) { var d = new Date($(n, p).value + 'T' + ($(gg, p).value || '00:00')); return isNaN(d) ? 0 : d.getTime(); };
      /* ⭐ v1.371.0 — giải TẠO TỪ myLesson (nguon=='mylesson'): web chỉ cho đổi giờ mở/đóng + sao; tên, lớp, bộ chữ, phút, độ khó… khoá lại, đổi ở app */
      if (tuApp) {
        $$('#gdTen, #gdActMo, #gdGoiY, #gdGiong, #gdChiBo', p).forEach(function (el) { el.disabled = true; });
        $$('.gd-chon button', p).forEach(function (b) { b.disabled = true; });
        var chuApp = document.createElement('p'); chuApp.className = 'gd-chu-dang'; chuApp.textContent = 'Giải này tạo từ myLesson, đổi thông số ở app. Ở đây chỉ đổi được giờ mở/đóng và sao thưởng (và Đóng giải / Thưởng sao).';
        var thanP = $('.pop-body', p); thanP.insertBefore(chuApp, thanP.firstChild);
      }
      $('#gdOk', p).onclick = async function () {
        var loi = function (m) { $('#gdLoi', p).textContent = m; };
        var ten = $('#gdTen', p).value.trim().replace(/\s+/g, ' ');
        var lops = $$('#gdLop .on', p).map(function (b) { return b.getAttribute('data-v'); });
        var tu = dang ? g.tu : docGio('#gdTuN', '#gdTuG'), den = docGio('#gdDenN', '#gdDenG');
        var sao = [0, 1, 2].map(function (i) { return Math.min(999, +$('#gdSao' + i, p).value || 0); });
        var laAct = $('#gdNguon .on', p).getAttribute('data-v') === 'act';
        if (!ten) return loi('Thầy đặt tên cho giải nhé.');
        if (!lops.length) return loi('Chọn ít nhất một lớp tham gia.');
        if (laAct && !BO.act && !bo0) return loi('Thầy chọn act AWord WORDS cho bộ từ (hoặc chọn "16 chữ ngẫu nhiên").');
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
        var nutOk = this; nutOk.disabled = true;
        var bo = null;
        if (laAct) { try { bo = await dungBo(); } catch (e) { nutOk.disabled = false; return loi(e.message || String(e)); } }
        var du = { ten: ten, lops: lops, game: 'aShowSpeed', phut: +$('#gdPhut .on', p).getAttribute('data-v'), lv: $('#gdLv .on', p).getAttribute('data-v'), tu: tu, den: den, sao: sao, capNhat: Date.now() };
        // chỉ ghi khoá `bo` khi có bộ từ / cần xoá bộ cũ (giải 16 chữ ngẫu nhiên giữ đúng dạng cũ — lưu được cả khi luật mới chưa đăng)
        if (bo) du.bo = bo; else if (bo0) du.bo = null;
        /* v1.371.0: giải từ app ⇒ chỉ ghi giờ + sao (không đụng tên/lớp/bộ chữ/phút/độ khó) */
        if (tuApp) du = { tu: tu, den: den, sao: sao, capNhat: Date.now() };
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
          NW.toast(moi ? (tu <= Date.now() ? 'Đã tạo và mở ' + ten + '.' : 'Đã tạo ' + ten + ', tự mở lúc ' + gio(tu) + ' ngày ' + ngay(tu) + '.') : 'Đã lưu thay đổi' + (dang ? ' — áp cho các trận mới.' : '.'));
          napLai();
        } catch (e) {
          nutOk.disabled = false;
          var ma = String((e && (e.code || e.message)) || '');
          loi(bo && ma.indexOf('permission') >= 0 ? 'Chưa lưu được bộ từ: luật Firestore mới (tools/dang-luat-giai-dau-bo.js) chưa đăng.' : NW.chuLoiKho(e));
        }
      };
      $('[data-dong]', p).onclick = NW.popDong;
      setTimeout(function () { var o = $('#gdTen', p); if (o && moi) o.focus(); }, 60);
    }

    /* ⭐ v1.371.0 — THẺ GIẢI (js/the-giai.js) mở trang này kèm ?giai=<id>&lop=<mã lớp>&lam=thuong|sua|mo|dong: chọn đúng giải/lớp; THẦY + lam ⇒ bấm sẵn nút tương ứng (Thưởng sao → hộp popThuong) */
    var qs = new URLSearchParams(location.search), qGiai = qs.get('giai') || '', qLop = qs.get('lop') || '', qLam = qs.get('lam') || '';
    if (qGiai) xemGiai = qGiai; if (qLop) xemLop = qLop;
    await napLai();
    if (la && qGiai && qLam) {
      try { history.replaceState(null, '', location.pathname); } catch (e) { }
      var nutLam = $('[data-tv="' + qLam + '"]', than);
      if (nutLam && DS.some(function (x) { return x.id === qGiai; })) {
        if (qLam === 'mo') { if (await NW.hoi('Mở giải ngay?', 'Giải sẽ mở cho học sinh ngay bây giờ và báo vào nhóm chat các lớp.', { ok: 'Mở ngay' })) nutLam.click(); }
        else nutLam.click();
      }
    }
    // chấm online + bảng tươi: vẽ lại mỗi 60 giây khi trang đang xem và không mở hộp nào
    boDem = setInterval(function () { if (!document.hidden && !document.querySelector('#nwPop.mo')) napLai(); }, 60 * 1000);
  };
})();
