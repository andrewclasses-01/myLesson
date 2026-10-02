/* ═══════════════════════════════════════════════════════════════
   mySpeaking — SPEAKING TEAM CHECK
   App bắt lỗi video thuyết trình cho học sinh (GitHub Pages)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const CFG = window.MYSPEAKING_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  // ─── Danh sách lớp — mô hình 1 LINK CHUNG + đăng nhập theo lớp ───
  // Nguồn: kho Firestore `spBuoi` (ưu tiên) rồi "bộ não" Apps Script ?config=1.
  // (02/09/2026 — bảo mật A5) File tĩnh data/classes.json ĐÃ BỎ khỏi kho PUBLIC: nó chứa mã
  // lớp + tên học sinh + link video, ai cũng tải được. Đừng thêm lại.
  // Cấu trúc: { classes: [ { id, name, classCode, code, lesson, topic, teams:[{team, video, members[]}], pairs:[{checker, checked}] } ] }
  let CLASSES = { classes: [] };
  const session = { class: null };   // lớp đang chọn sau khi đăng nhập

  // ─── State ───
  const state = {
    student: '', myTeam: '',
    className: '', classCode: '',
    lesson: '', topic: '',
    checkedTeam: '',
    members: [],
    videoUrl: '', videoId: '',
    errors: [],   // {min, sec, section, who, type, sentence, detail, explain}  (type = Grammar/Pronunciation/Information)
    timers: [],   // {name, sMin, sSec, eMin, eSec}
    submitted: false,
    wasSubmitted: false,   // CHẶNG 29: đã từng nộp ít nhất 1 lần (giữ bài trong "My submitted checks" kể cả khi đang mở khoá sửa)
    khoFs: false,          // (Đợt Firebase) buổi này nằm ở KHO NÀO: true = Firestore, false = bộ não cũ
    buoiId: '',            // mã buổi LOP_BAI trong Firestore (chỉ có nghĩa khi khoFs)
    clips: [],             // (Đợt 3) video MỌI đội [{t: số đội, v: link}] — pop-up "All team videos"
    // (Đợt B 27/08/2026) MÔ HÌNH 2 — bản tổng lỗi thống nhất + màn phản biện:
    moHinh: 1,             // 1 = nhiều-lần-nộp (baiNop, buổi cũ) · 2 = bản tổng sống (tongLoi)
    cheDo: 'cham',         // 'cham' = chấm đội được phân công · 'phanbien' = xem lỗi đội mình + tích
  };
  let editingIndex = -1;
  let fType = '';
  const IT_LOI = 15;          // CHẶNG 35: từ NGƯỠNG này trở xuống = "ít lỗi" → tô đỏ + hỏi lại lần nữa

  const SCRIPT_URL = CFG.SCRIPT_URL || '';
  let saveKey = 'myspeaking_manual';   // đặt lại khi biết videoUrl (sau bước chọn tên)

  // ═══════════════ KHO FIRESTORE (Đợt Firebase 26/08/2026 — thầy chốt "chuyển trọn") ═══════════════
  // Kho MỚI cho cấu hình buổi + bài nộp: Firestore project aword-70dae (chung AWord/myLesson).
  //   spBuoi/{LOP_BAI}              — cấu hình một buổi (teams/pairs/video/mã)
  //   spBuoi/{LOP_BAI}/baiNop/{sid} — MỖI LƯỢT NỘP = 1 tài liệu
  // Đi bằng REST thuần (fetch + API key công khai) — không nạp SDK, không thêm thư viện.
  // Bộ não Apps Script cũ GIỮ NGUYÊN làm đường lùi cho buổi CŨ trong Google Sheets:
  // đăng nhập ưu tiên buổi Firestore (nhanh <1s), buổi cũ vẫn hiện sau khi bộ não trả lời.
  // ⛔ CHƯA DÁN LUẬT FIRESTORE (khối spBuoi/baiNop) thì mọi lượt gọi ở đây bị từ chối —
  //    web tự rơi về đường cũ, không vỡ gì. Luật ở: myLesson-data\tai-lieu\LUAT FIRESTORE CAN DAN.md
  const FS_CFG = CFG.FIREBASE || null;
  const FS_GOC = FS_CFG
    ? 'https://firestore.googleapis.com/v1/projects/' + FS_CFG.projectId + '/databases/(default)/documents'
    : '';
  const fsKey = () => '?key=' + (FS_CFG ? FS_CFG.apiKey : '');

  // ⭐⭐ 02/10/2026 (myLesson web v1.228.0 — khoá đọc người ngoài GĐ4, thầy chốt): trang này DỜI VỀ andrewclasses.com/speaking/
  // và dùng CHUNG phiên đăng nhập ID + mật khẩu của myLesson (../js/nw-phien.js). Luật kho: chỉ em ĐÚNG LỚP (đăng nhập) đọc
  // được buổi; tài liệu em GHI (baiNop/tongLoi/phanHoi/cumPhieu) phải mang `ma` = mã trong vé. ĐỌC: cửa chung ../js/app-check.js
  // tự gắn vé (js/ve-doc.js). GHI: gắn vé ở đây (nw-phien tieuDe; lượt keepalive lúc đóng tab dùng vé có sẵn tieuDeNgay).
  async function veGhi(keepalive) {
    if (!window.NWP) return {};
    if (keepalive) { try { return NWP.tieuDeNgay() || {}; } catch (e) { return {}; } }
    try { return (await NWP.tieuDe()) || {}; } catch (e) { return {}; }
  }
  // Tài liệu CỦA EM (có chủ) thì đóng dấu mã em; `cum` dùng chung cả đội ⇒ không đóng.
  const LA_CUA_EM = /\/(baiNop|tongLoi|phanHoi|cumPhieu)(\/|$)/;

  // Mã buổi LOP_BAI — ⛔ PHẢI Y HỆT maBuoi() trong kho-fs.js (app máy tính) + lop.html (myLesson).
  function maBuoi(classCode, lesson) {
    const lop = String(classCode || '').replace(/\s+/g, '').trim().toUpperCase();
    const bai = String(lesson || '').replace(/\s+/g, ' ').trim().toUpperCase().replace(/\//g, '-');
    return lop + '_' + bai;
  }

  // Đổi qua lại giữa JS và định dạng giá trị của Firestore REST
  function fsMa(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(fsMa) } };
    if (typeof v === 'object') {
      const fields = {};
      Object.keys(v).forEach((k) => { fields[k] = fsMa(v[k]); });
      return { mapValue: { fields } };
    }
    return { stringValue: String(v) };
  }
  function fsGiai(f) {
    if (!f || typeof f !== 'object') return null;
    if ('stringValue' in f) return f.stringValue;
    if ('integerValue' in f) return parseInt(f.integerValue, 10);
    if ('doubleValue' in f) return f.doubleValue;
    if ('booleanValue' in f) return f.booleanValue;
    if ('nullValue' in f) return null;
    if ('arrayValue' in f) return ((f.arrayValue && f.arrayValue.values) || []).map(fsGiai);
    if ('mapValue' in f) {
      const o = {};
      const fields = (f.mapValue && f.mapValue.fields) || {};
      Object.keys(fields).forEach((k) => { o[k] = fsGiai(fields[k]); });
      return o;
    }
    return null;
  }
  function fsGiaiDoc(doc) {
    const o = {};
    const fields = (doc && doc.fields) || {};
    Object.keys(fields).forEach((k) => { o[k] = fsGiai(fields[k]); });
    if (doc && doc.name) o._id = String(doc.name).split('/').pop();
    return o;
  }

  // Mọi buổi đang mở (mọi lớp) → hình dạng Y HỆT phần tử CLASSES.classes của bộ não cũ,
  // kèm cờ `_kho:'fs'` để các bước sau biết bài này nộp vào đâu.
  async function buoiDangMoFs() {
    if (!FS_GOC) return [];
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'spBuoi' }],
        where: { fieldFilter: { field: { fieldPath: 'active' }, op: 'EQUAL', value: { booleanValue: true } } },
        limit: 50,
      },
    };
    const r = await fetch(FS_GOC + ':runQuery' + fsKey(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('FS_' + r.status);
    const ds = await r.json();
    return (Array.isArray(ds) ? ds : []).filter((x) => x.document).map((x) => {
      const b = fsGiaiDoc(x.document);
      return {
        id: (b.classCode || '') + '-' + (b.lesson || ''),
        name: b.className || ('CLASS ' + (b.classCode || '')),
        classCode: b.classCode || '', code: b.code || '',
        lesson: b.lesson || '', topic: b.topic || b.lesson || '',
        teams: (b.teams || []).map((t) => ({ team: t.team, video: t.video || '', members: t.members || [] })),
        pairs: b.pairs || [],
        _kho: 'fs',
        _moHinh: b.moHinh === 2 ? 2 : 1,   // (Đợt B) buổi bản-tổng-lỗi hay buổi nhiều-lần-nộp
      };
    });
  }

  // Các lượt nộp CỦA CHÍNH EM trong một buổi (khôi phục bài + đếm "nộp thiếu")
  async function baiCuaEmFs(buoiId, student) {
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'baiNop' }],
        where: { fieldFilter: { field: { fieldPath: 'student' }, op: 'EQUAL', value: { stringValue: String(student || '') } } },
        limit: 100,
      },
    };
    const r = await fetch(FS_GOC + '/spBuoi/' + encodeURIComponent(buoiId) + ':runQuery' + fsKey(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('FS_' + r.status);
    const ds = await r.json();
    return (Array.isArray(ds) ? ds : []).filter((x) => x.document).map((x) => fsGiaiDoc(x.document))
      .sort((a, b) => String(a.sid || '') < String(b.sid || '') ? 1 : -1);   // mới nhất trước
  }

  // Ghi MỘT lượt nộp. `documentId` = sid ⇒ tạo mới rõ ràng (luật chỉ cho create, cấm sửa/xoá).
  async function nopFs(buoiId, sid, duLieu) {
    const fields = {};
    if (state.ma) duLieu = Object.assign({}, duLieu, { ma: state.ma });   // 02/10/2026 GĐ4 — luật bắt ma = vé
    Object.keys(duLieu).forEach((k) => { fields[k] = fsMa(duLieu[k]); });
    const r = await fetch(FS_GOC + '/spBuoi/' + encodeURIComponent(buoiId) + '/baiNop' + fsKey() +
      '&documentId=' + encodeURIComponent(sid), {
      method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, await veGhi(false)), body: JSON.stringify({ fields }),
    });
    if (!r.ok) {
      let msg = 'FS_' + r.status;
      try { const j = await r.json(); msg = (j.error && j.error.message) || msg; } catch (e) {}
      throw new Error(msg);
    }
    return true;
  }

  // ═══════════════ (Đợt B 27/08/2026) MÔ HÌNH 2 — BẢN TỔNG LỖI + PHẢN BIỆN ═══════════════
  // Thầy chốt 26/08 khuya: từ buổi mô hình 2 (spBuoi có `moHinh: 2`, app đẩy từ v1.7.0):
  //   spBuoi/{id}/tongLoi/{slug-em-chấm}  — MỖI EM CHẤM = MỘT bản tổng SỐNG (create+update),
  //     errors[] mang {id, trangThai: 'song'|'an'|'go', ketLuan: ''|'keep'|'agree', ...6 mục cũ}
  //     'an' = em tự xoá (ẨN nhưng GIỮ VẾT) · 'go' = được Agree (gỡ bắt lỗi, giữ vết, mờ+gạch)
  //   spBuoi/{id}/phanHoi/{errId__slug-em-tích} — MỖI PHIẾU = 1 tài liệu {y:'dongY'|'phanDoi',
  //     lyDo (bắt buộc khi phản đối — LUẬT kho chặn, không chỉ giao diện), voter, chuLoi, ...}
  // Buổi CŨ (mô hình 1 / Sheets) giữ NGUYÊN đường baiNop nhiều-lần-nộp phía trên — đừng gỡ.
  // ⛔ Luật khối 4 (tongLoi + phanHoi) phải dán TRƯỚC khi buổi mô hình 2 chạy thật:
  //    myLesson-data\tai-lieu\LUAT FIRESTORE CAN DAN (27-08 THEM PHAN BIEN).md

  // Trạng thái riêng của mô hình 2 (không nằm trong `state` để autosave localStorage nhẹ)
  const m2 = {
    serverBan: '',   // JSON {errors,timers} ĐÃ đồng bộ lần cuối — so để biết "có sửa chưa gửi"
    serverIds: {},   // map id lỗi -> JSON lỗi đã đồng bộ (vẽ icon uploaded từng ô)
    phanHoi: [],     // mọi phiếu phản hồi của buổi liên quan tới màn đang mở
    disOn: false,    // nút DISAGREEMENT đang bật (dồn câu tranh chấp lên đầu)
    dsCham: [],      // (phản biện) [{chuLoi, err}] — lỗi đội mình bị chấm, gom từ mọi em bên đội chấm
    votes: {},       // (phản biện) phiếu CỦA CHÍNH EM đang sửa: {errId: {y, lyDo}}
    votesServer: '', // JSON votes đã đồng bộ lần cuối
    daNopLanNao: false,
    nhanXanh: 'UPDATED',   // (Đợt SUBMIT/UPDATE) chữ hiện khi nút XANH LÁ — 'SUBMITTED' chỉ đúng
                            // MỘT LẦN ngay sau lượt gửi ĐẦU TIÊN, các lượt sau luôn 'UPDATED'.
    // (Đợt ALL/MINE, màn phản biện) 'all' = mọi lỗi cả đội · 'mine' = chỉ lỗi ghi tên em ·
    // 'conflict' = (02/09/2026) chỉ những câu CHÍNH CHỦ ĐÃ NHẬN mà đồng đội vẫn cãi hộ.
    // ⛔ Trước đây là cờ `locMine` hai trạng thái — đổi sang chuỗi 3 trạng thái, đừng để sót
    // chỗ nào còn so `m2.locMine` (đã rà: nguồn danh sách · dấu chưa-xác-nhận · badge · nút).
    loc: 'all',
    vuaGuiPb: [],   // (Đợt STT xanh/xám) errId vừa gửi xong trong 1 giây gần nhất — hiện icon thay số
    draftPb: {},   // (Đợt lưu nháp) errId -> nội dung đang gõ dở CHƯA gửi, nạp/lưu vào localStorage
  };

  // Bỏ dấu tiếng Việt + về chữ-số-thường — dùng cho tên file avatar + khớp tên
  function khongDauTen(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }
  // Mã tài liệu tongLoi/phanHoi trên kho — PHẢI bỏ dấu kiểu slugAvatar, ⛔ đừng dùng slugKey
  // (slugKey chỉ gọt [^A-Z0-9] nên CẮT MẤT chữ có dấu: 'HÀ'->'H', 'THẢO'->'THO' — đã cắn khi test).
  const slugHs = (s) => slugAvatar(s);
  function slugAvatar(s) {
    return khongDauTen(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'hs';
  }
  // Ảnh avatar dùng CHUNG kho web andrewclasses.com (xuất từ myStudent — Đợt B).
  // Hỏng/thiếu ảnh -> onerror tự thay bằng vòng tròn chữ tắt (initialsOf có sẵn).
  // ⛔ Thư mục LỚP: bỏ HẾT ký tự không phải chữ-số — "B2B" (speaking) và "B2-B" (myStudent)
  //    phải ra CÙNG một thư mục `b2b`. Script xuất ảnh (myLesson app tools/xuat-avatar.py)
  //    dùng Y HỆT luật này — đổi một bên là đổi CẢ HAI.
  const AVATAR_GOC = 'https://andrewclasses.com/assets/avatar/';
  function avLopSlug() {
    return khongDauTen(tenLopNgan(state.className) || state.classCode).replace(/[^a-z0-9]/g, '');
  }
  function avatarUrl(ten) {
    return AVATAR_GOC + avLopSlug() + '/' + slugAvatar(ten) + '.jpg';
  }

  /* ══ ⭐ 03/09/2026 — ẢNH ĐẠI DIỆN LẤY TỪ KHO, KHÔNG CÒN NEO VÀO TÊN ══════════════
     Sự cố 02/09: myStudent đổi tên 64 em từ tên gọi ngắn sang tên đầy đủ
     ("THƯ" → "MINH THƯ"); ảnh trên web đặt tên FILE THEO TÊN nên 48 em mất ảnh,
     câm lặng. Màn này còn dễ dính hơn myLesson: buổi speaking giữ TÊN TẠI LÚC TẠO
     BUỔI, nên buổi cũ mãi mang tên ngắn kể cả sau khi danh sách đã đổi tên.

     Cách chữa — hai lớp, giống hệt myLesson (`myLesson/web/js/chung.js`):
       ① LỚP NỀN: ảnh file `andrewclasses.com/assets/avatar/<lop>/<ten>.jpg` như cũ.
       ② ĐÈ LÊN: kho `lessonAvatar/{lop-slug}` — MỘT tài liệu cho cả lớp, ảnh xếp
          theo MÃ SỐ em (myLesson app đẩy lên sau mỗi lượt đồng bộ danh sách).
     Ở đây KHÔNG có mã số em (gói `?goi=` chỉ mang tên), nên dò bằng `avTenKhop`:
     bằng nhau HOẶC là ĐUÔI của nhau — chính luật đuôi này khớp được "THƯ" của buổi
     cũ với "MINH THƯ" trên kho.
     💸 1 lượt đọc cho CẢ LỚP + đệm (04/09: đệm sống qua các phiên, xem khối ngay dưới)
     (LUẬT 8). ⛔ Đừng tách mỗi em một tài liệu.
     ⛔ Luật này CHÉP Ở HAI NƠI với `myLesson/web/js/chung.js` — sửa một bên sửa cả hai. */
  /* ⭐⭐ 04/09/2026 (`?v=47`) — ĐỆM ẢNH SỐNG QUA CÁC PHIÊN, HỎI MỐC TRƯỚC KHI TẢI
     Bản chép Y HỆT khối v1.59.0 bên `myLesson/web/js/chung.js` — sửa một bên sửa cả hai.
     Đo thật 04/09 trên kho đang chạy: gói ảnh một lớp nặng 33–62 KB. Bản cũ đệm bằng
     `sessionStorage` hạn 10 phút ⇒ đóng tab là mất sạch, mở lại tải trọn 52 KB dù cả
     tuần không em nào đổi ảnh. Nay:
       ① `localStorage` — ảnh sống qua các lần đóng/mở trình duyệt.
       ② Quá hạn kiểm thì hỏi RIÊNG mốc `luc` bằng `?mask.fieldPaths=luc` — đo được
          **254 byte** thay vì 57.869 byte. Mốc giống bản trong máy ⇒ dùng luôn ảnh cũ.
     💸 ⛔ SỐ LƯỢT ĐỌC KHÔNG ĐỔI — Firestore tính tiền theo TÀI LIỆU, hỏi mốc hay hỏi
        trọn gói đều là 1 lượt (LUẬT 8). Cái tiết kiệm là BĂNG THÔNG + tốc độ hiện ảnh.
     ⛔ KHOÁ MỚI `sp_av2` (bản cũ `sp_av1` ở sessionStorage, để nguyên cho chết theo tab):
        trùng khoá là bản mới đọc phải hình dạng cũ (không có `kiem`/`tai`). */
  const AV_KIEM_GIAY = 600;         // trong 10 phút: tin thẳng ảnh trong máy, không hỏi mạng
  const AV_HAN_GIAY = 86400;        // quá 24 giờ: tải lại trọn gói dù mốc có vẻ giống
  const KHOA_AV = 'sp_av2';
  let AV_KHO = null;          // { "<id>": {t, a} } đã nạp cho lớp của buổi này
  // ⛔⛔ CHỐT CHỐNG HỎI LẠI LIÊN TỤC (bắt được lúc chạy thử 03/09 bên myLesson).
  // `batAvatarKho()` được gọi ở CẢ BA màn (`datAvatarDauTrang` gọi mỗi lần đổi màn).
  // Kho 403 (luật chưa dán) hay mất mạng thì không có gì để đệm ⇒ mỗi lần đổi màn lại
  // bắn thêm một lượt hỏi kho. Nhớ RIÊNG mốc hỏng và im 60 giây — vẫn không đệm nội
  // dung rỗng, chỉ đệm cái sự "vừa hỏi hụt".
  const AV_HONG = {};
  const AV_HONG_GIAY = 60;
  const AV_RAM = {};          // bản nhớ trong RAM, khỏi đọc + parse 52 KB mỗi lượt gọi
  const AV_BAY = {};          // lượt hỏi ĐANG BAY: hai màn gọi cùng lúc chỉ tốn 1 lượt đọc

  function avTenKhop(a, b) {
    const x = khongDauTen(a).replace(/\s+/g, ' ').trim();
    const y = khongDauTen(b).replace(/\s+/g, ' ').trim();
    if (!x || !y) return false;
    if (x === y) return true;
    return x.length > y.length ? x.slice(-(y.length + 1)) === (' ' + y)
                               : y.slice(-(x.length + 1)) === (' ' + x);
  }

  // Còn trong hạn không? Đồng hồ máy lệch về TƯƠNG LAI cũng coi như hết hạn (hiệu số âm)
  // — thà hỏi lại một lượt còn hơn đóng băng ảnh cũ vĩnh viễn trên máy đó.
  function avConHan(moc, giay) {
    if (typeof moc !== 'number') return false;
    const d = Date.now() - moc;
    return d >= 0 && d < giay * 1000;
  }

  // Bản đang giữ trong máy: { luc, kiem, tai, em }. `luc` = mốc của KHO (do app đóng),
  // `kiem` = lần cuối đối chiếu mốc, `tai` = lần cuối tải trọn gói.
  function docAvatarMay(slug) {
    if (AV_RAM[slug]) return AV_RAM[slug];
    try {
      const o = JSON.parse(localStorage.getItem(KHOA_AV + ':' + slug) || 'null');
      if (o && o.em && typeof o.em === 'object') { AV_RAM[slug] = o; return o; }
    } catch (e) {}
    return null;
  }

  function ghiAvatarMay(slug, o) {
    AV_RAM[slug] = o;
    let chuoi;
    try { chuoi = JSON.stringify(o); } catch (e) { return; }
    try { localStorage.setItem(KHOA_AV + ':' + slug, chuoi); return; } catch (e) {}
    // Hết chỗ: dọn ảnh của các lớp KHÁC rồi thử lại đúng MỘT lần. Vẫn hỏng thì thôi —
    // bản RAM ở trên vẫn chạy tốt cho phiên này, chỉ là lần mở sau phải tải lại.
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.indexOf(KHOA_AV + ':') === 0 && k !== KHOA_AV + ':' + slug)
          localStorage.removeItem(k);
      }
      localStorage.setItem(KHOA_AV + ':' + slug, chuoi);
    } catch (e) {}
  }

  // Mốc `luc` của kho. 404 (lớp chưa từng được đẩy ảnh) trả 0 — và bản trong máy của
  // lớp đó cũng mang `luc: 0`, nên hai bên khớp nhau, không tải lại vô ích.
  function avMoc(j) {
    const v = j && j.fields && j.fields.luc;
    return (v && (Number(v.integerValue || v.doubleValue) || 0)) || 0;
  }

  function avBoc(j) {
    const em = {}, f = (j.fields && j.fields.em && j.fields.em.mapValue
                        && j.fields.em.mapValue.fields) || {};
    Object.keys(f).forEach((id) => {
      const g = (f[id].mapValue && f[id].mapValue.fields) || {};
      const a = g.a && g.a.stringValue;
      if (a) em[id] = { t: (g.t && g.t.stringValue) || '', a };
    });
    return { em, luc: avMoc(j) };
  }

  async function napAvatarKho() {
    const slug = avLopSlug();
    if (!FS_GOC || !slug) return {};
    const cu = docAvatarMay(slug);

    // ① Vừa kiểm trong 10 phút — dùng thẳng, không đụng tới mạng.
    if (cu && avConHan(cu.kiem, AV_KIEM_GIAY)) return cu.em;
    // ② Kho vừa hỏi hụt — im 60 giây. Có bản cũ thì vẫn xài (ảnh cũ hơn hẳn không ảnh).
    if (AV_HONG[slug] && avConHan(AV_HONG[slug], AV_HONG_GIAY)) return cu ? cu.em : {};
    // ③ Đang có lượt hỏi bay — bám vào nó, đừng bắn thêm lượt đọc thứ hai.
    if (AV_BAY[slug]) return AV_BAY[slug];

    const goc = FS_GOC + '/lessonAvatar/' + encodeURIComponent(slug) + fsKey();

    const doc = async (u) => {
      const r = await fetch(u, { cache: 'no-store' });
      // 404 = lớp chưa từng được đẩy ảnh lên kho. KHÔNG phải lỗi — lớp nền lo tiếp.
      if (r.status === 404) return { fields: {} };
      if (!r.ok) return null;
      return r.json();
    };

    const taiDu = async () => {
      const j = await doc(goc);
      if (!j) { AV_HONG[slug] = Date.now(); return cu ? cu.em : {}; }
      delete AV_HONG[slug];
      const b = avBoc(j), gio = Date.now();
      // ⛔ CHỈ ghi khi đọc được thật — ghi cả lượt hỏng là đóng băng bảng rỗng.
      ghiAvatarMay(slug, { luc: b.luc, kiem: gio, tai: gio, em: b.em });
      return b.em;
    };

    const chay = (async () => {
      if (!cu || !avConHan(cu.tai, AV_HAN_GIAY)) return taiDu();
      // Hỏi RIÊNG mốc `luc` — 254 byte. Giống mốc đang giữ thì đóng lại dấu `kiem`
      // và dùng luôn ảnh cũ; khác (hoặc đọc không ra mốc) mới tải trọn gói.
      const j = await doc(goc + '&mask.fieldPaths=luc');
      if (!j) { AV_HONG[slug] = Date.now(); return cu.em; }
      delete AV_HONG[slug];
      if (avMoc(j) !== cu.luc) return taiDu();
      ghiAvatarMay(slug, { luc: cu.luc, kiem: Date.now(), tai: cu.tai, em: cu.em });
      return cu.em;
    })();

    AV_BAY[slug] = chay
      .catch(() => { AV_HONG[slug] = Date.now(); return cu ? cu.em : {}; })
      .then((em) => { delete AV_BAY[slug]; return em; });
    return AV_BAY[slug];
  }

  // Mọi tên trong roster LỚP hiện tại (mọi đội, không chỉ đội đang hiện trên màn) — dùng để
  // LOẠI TRỪ khi một tên tắt mập mờ (mục đích: một em không thể vừa là "SONG NGỌC" đội 1 vừa
  // là "NGỌC" đội 4 — hai đội viên KHÁC TÊN trong cùng buổi chắc chắn là hai người khác nhau).
  // Ưu tiên `CLASSES` (nạp lúc mở trang, còn sống cả sau F5) hơn `session.class` (chỉ có ngay
  // sau lượt đăng nhập kiểu cũ, KHÔNG có khi vào thẳng từ gói myLesson — xem `vaoThangTuGoi`).
  function rosterTens() {
    let cls = (CLASSES.classes || []).find((c) => state.classCode &&
      String(c.classCode || '').toLowerCase() === String(state.classCode).toLowerCase());
    if (!cls) cls = (CLASSES.classes || []).find((c) => (c.name || c.id) === state.className);
    if (!cls) cls = session.class;
    if (!cls || !Array.isArray(cls.teams)) return null;
    const tens = [];
    cls.teams.forEach((t) => (t.members || []).forEach((m) => { if (m) tens.push(m); }));
    return tens.length ? tens : null;
  }

  // Đè ảnh kho lên mọi ô đã vẽ. Ô nào cũng mang `data-av-em`.
  // ⛔ Dấu đặt trên Ô, KHÔNG trên <img>: `onerror="this.remove()"` gỡ hẳn thẻ ảnh khi
  //    thiếu, đánh dấu lên đó là mất manh mối của đúng những em đang cần cứu nhất.
  // ⭐ (09/09/2026) Tên tắt MẬP MỜ (khớp ≥2 ảnh trong kho — lớp có cả "LINH NHI" lẫn "THẢO
  // NHI" mà buổi chỉ ghi tắt "NHI") trước đây BỎ LUÔN cho an toàn (đừng đoán bừa gắn nhầm mặt
  // — bài học từ ca "KIM NGÂN"/"KHÁNH NGÂN"), nên em vẫn ra chữ tắt dù kho đã có ảnh thật. Nay
  // hai VÒNG: ① tên khớp CHẮC CHẮN (đúng 1 ảnh) nhận trước, đánh dấu ảnh đó đã bị CHIẾM; ② tên
  // còn mập mờ thử lại, LOẠI những ảnh đã bị CHIẾM — còn đúng 1 thì chắc chắn đúng người (bằng
  // suy luận roster, không phải đoán ảnh). Vẫn mập mờ sau khi loại thì GIỮ NGUYÊN bỏ qua.
  function deAvatarKho() {
    if (!AV_KHO) return 0;
    const ids = Object.keys(AV_KHO);
    if (!ids.length) return 0;
    const o = document.querySelectorAll('[data-av-em]');
    if (!o.length) return 0;

    const tenCanTra = {};
    (rosterTens() || []).forEach((t) => { tenCanTra[t] = 1; });
    for (let i = 0; i < o.length; i++) {
      const t = o[i].getAttribute('data-av-em');
      if (t) tenCanTra[t] = 1;
    }
    const dsTen = Object.keys(tenCanTra);
    const idChiem = {}, tenRaId = {};
    dsTen.forEach((ten) => {
      const khop = ids.filter((id) => avTenKhop(AV_KHO[id].t, ten));
      if (khop.length === 1) { tenRaId[ten] = khop[0]; idChiem[khop[0]] = 1; }
    });
    dsTen.forEach((ten) => {
      if (tenRaId[ten]) return;
      const khop = ids.filter((id) => avTenKhop(AV_KHO[id].t, ten) && !idChiem[id]);
      if (khop.length === 1) tenRaId[ten] = khop[0];
    });

    let de = 0;
    for (let i = 0; i < o.length; i++) {
      const el = o[i], ten = el.getAttribute('data-av-em');
      const id = ten && tenRaId[ten];
      if (!id) continue;
      let img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (!img) {
        img = document.createElement('img');
        img.alt = '';
        img.className = 'absolute inset-0 w-full h-full object-cover';
        el.insertBefore(img, el.firstChild);
      }
      const moi = 'data:image/jpeg;base64,' + AV_KHO[id].a;
      if (img.getAttribute('src') !== moi) { img.setAttribute('src', moi); de++; }
    }
    return de;
  }

  // Bật một lần cho cả trang: nạp kho rồi đè, và đè lại mỗi khi màn vẽ thêm ô mới.
  // ⛔ CHỈ theo dõi `childList`, TUYỆT ĐỐI KHÔNG theo dõi `attributes`: chính hàm đè
  //    đổi `src`, theo dõi attributes là nó tự gọi lại mình vô tận.
  let avTai = null, avHen = null;
  async function batAvatarKho() {
    AV_KHO = await napAvatarKho();
    deAvatarKho();
    if (avTai) return;
    try {
      avTai = new MutationObserver(() => {
        if (avHen) return;
        avHen = setTimeout(() => { avHen = null; deAvatarKho(); }, 250);
      });
      avTai.observe(document.body, { childList: true, subtree: true });
    } catch (e) { /* trình duyệt cổ: vẫn có lượt đè đầu tiên ở trên */ }
  }

  // ⭐ (02/09/2026 — thầy chốt) Ảnh tròn góc trái thanh tím = AVATAR CỦA CHÍNH EM đang đăng
  // nhập (trước là ảnh thầy `img/avatar-tron.jpg`). Dùng đúng kho ảnh + đúng hàm `avatarUrl()`
  // của avatar phiếu phản biện nên không đẻ thêm đường ảnh mới.
  // ⛔ Thiếu ảnh thì `onerror` GỠ hẳn thẻ <img> để lộ vòng tròn chữ tắt phía sau — đừng đổi
  // sang `display:none`, ảnh hỏng vẫn chiếm chỗ và che mất chữ.
  // ⛔ Gọi hàm này SAU khi `state.student`/`state.className` đã có; gọi sớm thì `avatarUrl()`
  // ghép ra đường lớp rỗng, ảnh 404 và em nào cũng ra chữ tắt.
  function datAvatarDauTrang() {
    const img = $('hdAvatar'), chu = $('hdAvatarChu');
    if (!img || !state.student) return;
    if (chu) chu.textContent = initialsOf(state.student);
    img.onerror = function () { img.remove(); };
    img.src = avatarUrl(state.student);
    img.alt = state.student;
    // ⭐ 03/09/2026 — dấu để `deAvatarKho()` đè ảnh mới nhất từ kho. Đặt trên Ô BAO
    // (thẻ cha), không trên <img>: `onerror` ngay trên kia gỡ hẳn thẻ ảnh khi thiếu.
    if (img.parentNode && img.parentNode.setAttribute) {
      img.parentNode.setAttribute('data-av-em', state.student);
    }
    batAvatarKho();
  }

  // Mã lỗi ổn định — phiếu phản biện bám theo mã này kể cả khi em chấm sửa chữ trong câu
  function taoErrId() {
    return Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
  }

  async function fsGet(duong) {
    const r = await fetch(FS_GOC + duong + fsKey(), { cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('FS_' + r.status);
    return fsGiaiDoc(await r.json());
  }
  // `mask` (tuỳ chọn) = danh sách TÊN TRƯỜNG cần ghi; trường nào không kể tên thì trên kho GIỮ
  // NGUYÊN — đúng cách `kho-fs.js` bên app máy tính đã làm (`ghiDoc(duong, data, mask)`).
  // ⛔ Không có mask thì Firestore ghi đè CẢ TÀI LIỆU (LUẬT 9️⃣): thiếu trường nào là XOÁ trường đó.
  // `tuyChon.keepalive` (⭐ 05/09/2026 — tự lưu): gói đi nốt dù trang vừa bị ẩn/đóng (bấm Home trên
  // iPhone, đóng tab). ⛔ Trình duyệt chỉ nhận thân gói ≤ ~64 KB cho kiểu này — `tlDayVoi()` tự kiểm cỡ.
  async function fsPatch(duong, duLieu, mask, tuyChon) {
    const fields = {};
    // 02/10/2026 GĐ4 — tài liệu của em mang `ma` (luật bắt ma = vé); có mask thì thêm 'ma' vào mask.
    if (state.ma && LA_CUA_EM.test(duong)) {
      duLieu = Object.assign({}, duLieu, { ma: state.ma });
      if (mask && mask.indexOf('ma') < 0) mask = mask.concat(['ma']);
    }
    Object.keys(duLieu).forEach((k) => { fields[k] = fsMa(duLieu[k]); });
    let q = fsKey();
    (mask || []).forEach((f) => { q += '&updateMask.fieldPaths=' + encodeURIComponent(f); });
    const keepalive = !!(tuyChon && tuyChon.keepalive);
    const r = await fetch(FS_GOC + duong + q, {
      method: 'PATCH', headers: Object.assign({ 'Content-Type': 'application/json' }, await veGhi(keepalive)), body: JSON.stringify({ fields }),
      keepalive: !!(tuyChon && tuyChon.keepalive),
    });
    if (!r.ok) {
      let msg = 'FS_' + r.status;
      try { const j = await r.json(); msg = (j.error && j.error.message) || msg; } catch (e) {}
      throw new Error(msg);
    }
    return true;
  }
  async function fsQuery(buoiId, collectionId, filterField, filterVal, limit) {
    const q = { from: [{ collectionId }], limit: limit || 1000 };
    if (filterField) {
      q.where = { fieldFilter: { field: { fieldPath: filterField }, op: 'EQUAL', value: { stringValue: String(filterVal) } } };
    }
    const r = await fetch(FS_GOC + '/spBuoi/' + encodeURIComponent(buoiId) + ':runQuery' + fsKey(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: q }),
    });
    if (!r.ok) throw new Error('FS_' + r.status);
    const ds = await r.json();
    return (Array.isArray(ds) ? ds : []).filter((x) => x.document).map((x) => fsGiaiDoc(x.document));
  }

  const tongLoiLay = (buoiId, slug) => fsGet('/spBuoi/' + encodeURIComponent(buoiId) + '/tongLoi/' + encodeURIComponent(slug));
  const tongLoiGhi = (buoiId, slug, d, mask, tuyChon) => fsPatch('/spBuoi/' + encodeURIComponent(buoiId) + '/tongLoi/' + encodeURIComponent(slug), d, mask, tuyChon);
  const phanHoiGhi = (buoiId, phId, d, tuyChon) => fsPatch('/spBuoi/' + encodeURIComponent(buoiId) + '/phanHoi/' + encodeURIComponent(phId), d, null, tuyChon);

  /* ═══ ⛔⛔ 04/09/2026 — CHỐT CHỐNG MẤT BÀI ═══
     (đọc `GHI CHU DU AN.md` mục "CHẶNG — 04/09/2026" trước khi sửa khối này)
     CHUYỆN ĐÃ XẢY RA: em TIẾN (B1AH) mất 23 câu, em KHÁNH NGÂN (A2B) mất 32 câu. Máy cũ còn
     NHÁP CŨ trong localStorage (khoá `myspeaking_<TÊN>_<link video>` không bao giờ hết hạn) —
     mở bài trên máy đó rồi bấm Keep/Accept là `tongLoiGhi` ĐẨY NGUYÊN mảng lỗi trong RAM máy
     đó lên kho, nuốt sạch mẻ làm ở máy khác. Cứu được em Tiến chỉ vì Firestore giữ bản cũ
     ĐÚNG 1 TIẾNG (`versionRetentionPeriod=3600s`, đọc lại bằng tham số `readTime`).

     LUẬT MỚI: mọi lượt ghi `tongLoi` phải đi qua đây. Đọc bản trên kho rồi GỘP theo MÃ LỖI —
     lỗi nào có trên kho mà máy này không có thì GIỮ NGUYÊN, thêm lại vào. KHÔNG BAO GIỜ để
     một lượt ghi làm mất một lỗi đã nằm trên kho.
     ⛔ Đọc kho hỏng thì KHÔNG GHI (ném lỗi) — thà báo "lưu không được, thử lại" còn hơn ghi đè
     mù. Ghi mù đúng là cái đã làm mất bài của hai em.
     ⛔ Xếp thêm vào CUỐI mảng là đủ: `renderErrors` xếp lại theo mốc giờ trong video (`tSec`),
     thứ tự trong mảng không ảnh hưởng gì tới cái học sinh nhìn thấy. */
  const KHO_TUOI = 5000;      // ms — bản kho đọc trong 5 giây gần đây thì dùng lại, khỏi tốn lượt đọc
  let m2KhoErrors = null;     // mảng lỗi ĐANG CÓ trên kho theo hiểu biết mới nhất
  let m2KhoDocLuc = 0;        // mốc lần ĐỌC THẬT gần nhất (⛔ ghi xong không đụng mốc này)
  function m2QuenKho() { m2KhoErrors = null; m2KhoDocLuc = 0; }

  /* ⭐ 05/09/2026 (tự lưu) — hai đổi nhỏ, luật gốc GIỮ NGUYÊN:
     ① Đang NGHE KHO (`tl.ngheSong`, onSnapshot đẩy mọi thay đổi về trong ~1 giây) thì bản đệm
        coi như LUÔN tươi ⇒ không phải đọc kho trước mỗi lượt ghi. Bộ nghe chết là quay về đọc.
     ② Gộp bằng `gopLoi()`: mã có ở CẢ HAI bên thì bản có `suaLuc` mới hơn thắng (trước: máy ghi
        sau thắng nguyên mảng). Mã chỉ kho có thì vẫn THÊM LẠI như cũ — không bao giờ mất câu. */
  async function tongLoiGhiAnToan(buoiId, slug, duLieu, tuyChon) {
    const khoTuoi = tl.ngheSong ? Infinity : KHO_TUOI;
    if (!m2KhoErrors || (Date.now() - m2KhoDocLuc) >= khoTuoi) {
      // Ném thẳng lỗi ra ngoài cho `tlChay`/`submitM2`/`guiNgamKetLuan` báo "lưu không được".
      const kho = await tongLoiLay(buoiId, slug);
      m2KhoErrors = ((kho && kho.errors) || []).map(chuanLoi);
      m2KhoDocLuc = Date.now();
    }
    const g = gopLoi(duLieu.errors || [], m2KhoErrors);
    const banGhi = Object.assign({}, duLieu, { errors: g.errors });
    // Kèm `updateMask` liệt kê ĐÚNG mấy trường mình gửi: trường nào NƠI KHÁC đặt (app thầy,
    // đợt sau…) thì trên kho giữ nguyên, không bị lượt ghi này xoá theo (LUẬT 9️⃣).
    await tongLoiGhi(buoiId, slug, banGhi, Object.keys(banGhi), tuyChon);
    m2KhoErrors = g.errors.map(chuanLoi);      // vừa ghi xong thì kho ĐÚNG BẰNG cái này
    return { errors: g.errors, themLai: g.them, doi: g.doi };
  }

  /* Gộp hai mảng lỗi theo MÃ: giữ MỌI mã ở cả hai bên. Mã có ở cả hai thì bản có `suaLuc` mới
     hơn thắng; bằng nhau (kể cả cả hai = 0, bản cũ chưa có mốc) thì bên `uuTien` thắng.
     Trả về: errors (bên uuTien giữ thứ tự, mã chỉ `kia` có nối vào cuối) · them (mã chỉ kia có)
     · doi (số mã mà bản `kia` thắng). ⛔ Không đụng vào object — trả đúng object của bên thắng. */
  function gopLoi(uuTien, kia) {
    const banKia = {};
    (kia || []).forEach((e) => { if (e && e.id) banKia[e.id] = e; });
    const co = {};
    let doi = 0;
    const errors = (uuTien || []).map((e) => {
      if (e.id) co[e.id] = 1;
      const k = e.id && banKia[e.id];
      if (k && (+k.suaLuc || 0) > (+e.suaLuc || 0)) { doi++; return k; }
      return e;
    });
    const them = (kia || []).filter((e) => e && e.id && !co[e.id]);
    return { errors: errors.concat(them), them, doi };
  }

  /* Lượt ghi vừa rồi có nhặt lại được lỗi cũ ⇒ đổ vào bảng đang mở để em ấy THẤY NGAY.
     ⛔ PHẢI gọi TRƯỚC `m2GhiNhanDongBo()` — hàm đó chụp ảnh `state.errors`, chụp lúc bảng còn
     thiếu thì nút SUBMIT vàng nhấp nháy mãi vì bảng lệch bản kho. Trả về SỐ câu nhặt lại được. */
  function m2NhanLaiLoi(kq) {
    if (!kq || !kq.themLai || !kq.themLai.length) return 0;
    state.errors = kq.errors;
    return kq.themLai.length;
  }
  function m2BaoNhanLai(n) {
    if (!n) return;
    toast('Recovered ' + n + ' mistake' + (n > 1 ? 's' : '') + ' from your other device ✓', 'info');
  }

  /* ═══════════════════════════════════════════════════════════════════════════════════════
     ⭐⭐⭐ 05/09/2026 — TỰ LƯU LIÊN TỤC, KHÔNG CẦN BẤM SUBMIT (thầy chốt "ok build")
     ═══════════════════════════════════════════════════════════════════════════════════════
     Hồ sơ: DU LIEU TONG HOP\PHUONG AN TU LUU SP CHECK — 05-09-2026.md (phương án B).
     CHỈ áp cho MÔ HÌNH 2 + màn CHẤM (`tl.bat`). Buổi cũ (Sheets) · màn PHẢN BIỆN · hai màn
     TRÙNG giữ nguyên đường cũ.

     CÁCH CHẠY:
       · 5 sự kiện (Add this mistake · Save changes · Delete this mistake · Keep Issue ·
         Accept Appeal) → `luuNgay()` → hàng đợi MỘT LÀN `tlChay()`: đang ghi thì lượt sau chờ,
         tới lượt thì gửi trạng thái MỚI NHẤT (nhiều thay đổi dồn thành một lượt ghi).
       · Mở bài là NGHE KHO (`tlNoiKho`, onSnapshot trên ĐÚNG 1 tài liệu của em): kho đổi (kể
         cả từ máy khác) là bảng đổi theo trong ~1 giây, bản đệm `m2KhoErrors` luôn tươi ⇒ lượt
         ghi không phải đọc kho trước.
       · Rời app (chuyển app / Home iPhone / đóng tab) → `tlDayVoi()` đẩy nốt bằng keepalive;
         quay lại → `tlDocLai()` đọc kho một phát cho chắc. Chữ đang gõ dở trong form GIỮ.
       · ⛔ KHÔNG còn nháp localStorage, KHÔNG còn pop-up "Two versions found". Nháp cũ còn
         trong máy được gom MỘT LẦN (chỉ thêm) ở `startM2` rồi xoá khoá.
       · ⛔ Gói ghi KHÔNG gửi `daNop` (không trang nào đọc cờ này — mọi bảng thầy coi "có tài
         liệu tongLoi = đã nộp" và cộng số lỗi sống trực tiếp).
       · Mạng hỏng: KHÔNG nuốt — dòng trạng thái đỏ "Not saved — retrying", thử lại 5s/15s/30s,
         `beforeunload` vẫn hỏi lại khi còn thứ chưa ghi. Luật 04/09 giữ nguyên: đọc kho hỏng
         thì không ghi.
     BẪY:
       · `gopLoi` dùng `suaLuc` từng lỗi: hai máy sửa cùng một câu thì bản mới hơn thắng. Mốc
         này là đồng hồ máy trần (web không có `nowChuan`) — máy sai giờ nhiều ngày sẽ "thắng oan";
         chấp nhận vì hai máy thường là của cùng một em.
       · Sau khi ghi, kho bắn snapshot về CHÍNH máy này — `tlApDung` so dấu vân tay, không đổi
         gì thì không vẽ lại, không toast nhầm "từ máy khác".
       · keepalive: thân gói ≤ ~64 KB — bài rất dài thì `tlDayVoi` bỏ qua, tin vào lượt thường
         (vốn đã ghi ngay lúc bấm, nên hiếm khi còn gì chờ). */
  /* ⭐⭐ `?v=57` — TỰ LƯU CHO MÀN PHẢN BIỆN CÁ NHÂN (thầy chốt 05/09 chiều).
     Dùng CHUNG khối `tl` này, khác nhau ở `tl.che`:
       · 'cham'     → ghi MỘT tài liệu `tongLoi/{em}` (mảng errors) — luồng gốc `?v=55`.
       · 'phanbien' → ghi NHIỀU tài liệu `phanHoi/{errId__em}`, mỗi phiếu một tài liệu, nên KHÔNG
                      cần `gopLoi`/`tongLoiGhiAnToan`: hai phiếu khác nhau không bao giờ đè nhau.
     ⛔ BỐN KHÁC BIỆT ĐÃ THỐNG NHẤT VỚI THẦY, đừng "dọn cho giống màn chấm":
       ① Phiếu DISAGREE **chỉ lên kho khi em bấm nút máy bay** (thầy chốt), KHÔNG tự gửi theo nhịp
          gõ. Lý do kỹ thuật đi kèm: luật kho CẤM phiếu `phanDoi` có `lyDo` rỗng (403) — bấm
          DISAGREE mà ghi ngay là bị từ chối. `tlGhiPb()` tự bỏ qua mọi phiếu chưa đủ lý do.
       ② Nút SUBMIT bỏ hẳn (như màn chấm). `#pbThieuModal` + `submitPb`/`submitPbThatSu` do đó
          KHÔNG còn đường gọi — giữ lại làm lịch sử. Việc nhắc "còn N câu chưa xác nhận" nay do
          badge `#btnPbThieu` lo (luôn hiện, bấm là cuộn tới câu đó).
       ③ Đổi ý DISAGREE → AGREE: **GIỮ nguyên `lyDo` trên kho** và vẫn HIỆN dòng đó, nhưng xám mờ
          + gạch ngang (thầy chốt: thấy được "đã từng nhận xét rồi rút"). Xem `renderErrorsPb`.
       ④ Nghe kho CẢ collection `phanHoi` của buổi ⇒ bạn cùng đội vừa bỏ phiếu là badge
          UNCONFIRMED trên máy em tự tụt. (`startPb` vốn đã đọc hết collection này một lượt,
          nên lần đầu không tốn thêm lượt đọc nào.) */
  const tl = {
    bat: false,       // chế độ tự lưu đang bật (mô hình 2: màn chấm hoặc màn phản biện)
    che: 'cham',      // 'cham' | 'phanbien' — quyết định lượt ghi đi đường nào
    can: false,       // có thay đổi CHƯA đẩy lên kho
    dangGhi: false,   // đang có một lượt ghi chạy
    hong: false,      // lượt ghi gần nhất hỏng (đang chờ thử lại)
    lanThu: 0,        // số lần hỏng liên tiếp — chọn nhịp thử lại
    hen: null,        // timer thử lại
    luuLuc: 0,        // mốc lần lưu THÀNH CÔNG gần nhất (hiện "Auto saved HH:MM")
    nghe: null,       // hàm huỷ onSnapshot
    ngheSong: false,  // bộ nghe đang sống ⇒ bản đệm kho luôn tươi
    xoaNhapKhi: '',   // khoá localStorage cần xoá SAU KHI gom nháp cũ lên kho thành công
  };

  function gioNgan(ms) {
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes());
  }
  // Dòng trạng thái giữa thanh đầu trang (#hdLuu) — nhỏ, xanh lá khi đã lưu (thầy chốt)
  // `?v=56` (thầy chốt trên iPhone): icon đứng cố định bên trái (đổi ✓ / vòng xoay / tam giác theo
  // `data-kieu` bằng CSS trong index.html), chữ chỉ còn "Saved 09:45" / "Saving…" — bỏ chữ "Auto".
  function datTrangThaiLuu(kieu, chu) {
    const o = $('hdLuu');
    if (!o) return;
    o.dataset.kieu = kieu;
    const c = $('hdLuuChu');
    if (c) c.textContent = chu; else o.textContent = chu;
    o.classList.remove('hidden');
  }
  function capNhatTrangThaiLuu() {
    if (!tl.bat) return;
    if (tl.dangGhi || tl.can) { datTrangThaiLuu(tl.hong ? 'hong' : 'dang', tl.hong ? 'Not saved — retrying…' : 'Saving…'); return; }
    /* ⭐ `?v=57` — màn phản biện: phiếu DISAGREE chưa gõ lý do thì KHÔNG ghi được (luật kho cấm).
       Phải nói thẳng ra, đừng hiện "Saved" cho em tưởng đã xong — đúng nếp [[bay-bao-ok-gia]]. */
    const cho = tl.che === 'phanbien' ? demPhieuChoLyDo() : 0;
    if (cho) { datTrangThaiLuu('cho', cho + ' reason' + (cho > 1 ? 's' : '') + ' needed'); return; }
    if (tl.luuLuc) datTrangThaiLuu('xong', 'Saved ' + gioNgan(tl.luuLuc));
    else datTrangThaiLuu('san', 'Saved');   // vừa mở bài: bảng đang hiện đúng là bản trên kho
  }

  function tlBat(on, che) {
    tl.bat = !!on;
    tl.che = che === 'phanbien' ? 'phanbien' : 'cham';
    $('appScreen').classList.toggle('tu-luu', tl.bat);
    if (!tl.bat) { tlHuyNghe(); clearTimeout(tl.hen); tl.hen = null; $('hdLuu').classList.add('hidden'); return; }
    tl.can = false; tl.dangGhi = false; tl.hong = false; tl.lanThu = 0; tl.luuLuc = 0; tl.xoaNhapKhi = '';
    clearTimeout(tl.hen); tl.hen = null;
    capNhatTrangThaiLuu();
  }

  // Gói ghi — y như `submitM2` cũ TRỪ `daNop` (xem đầu khối). Mọi trường đều nằm trong danh sách
  // `hasOnly` của luật kho 04/09, nên KHÔNG cần sửa luật.
  function tlGoi() {
    return {
      student: state.student, myTeam: state.myTeam, checkedTeam: state.checkedTeam,
      videoUrl: state.videoUrl, videoId: state.videoId,
      classCode: state.classCode, lesson: state.lesson,
      errors: state.errors, timers: cleanTimers(), capNhatLuc: Date.now(),
    };
  }

  // Cửa DUY NHẤT các sự kiện gọi vào
  function luuNgay() {
    if (!tl.bat) return;
    tl.can = true;
    capNhatTrangThaiLuu();
    tlChay();
  }

  async function tlChay(tuyChon) {
    if (!tl.bat || tl.dangGhi || !tl.can) return;
    clearTimeout(tl.hen); tl.hen = null;
    tl.dangGhi = true; tl.can = false;
    capNhatTrangThaiLuu();
    let ok = false;
    try {
      if (tl.che === 'phanbien') {
        await tlGhiPb(tuyChon);
        ok = true;
        tl.hong = false; tl.lanThu = 0; tl.luuLuc = Date.now();
        renderErrorsPb();
      } else {
      const kq = await tongLoiGhiAnToan(state.buoiId, slugHs(state.student), tlGoi(), tuyChon);
      ok = true;
      tl.hong = false; tl.lanThu = 0; tl.luuLuc = Date.now();
      m2.daNopLanNao = true; state.submitted = true; state.wasSubmitted = true;
      // Gộp lại với bảng ĐANG có (em có thể vừa thêm câu trong lúc chờ ghi) rồi vẽ lại để icon ✓ hiện đủ
      m2GhiNhanKho(m2KhoErrors);
      if (!tlApDung(kq.errors)) renderErrors();
      if (tl.xoaNhapKhi) { try { localStorage.removeItem(tl.xoaNhapKhi); } catch (e) {} tl.xoaNhapKhi = ''; }
      }
    } catch (e) {
      tl.can = true; tl.hong = true; tl.lanThu++;
      if (tl.lanThu === 1) toast('Could not save (' + e.message + ') — nothing was lost, I will keep retrying. Check your internet.', 'err');
      tlHenThuLai();
    }
    tl.dangGhi = false;
    capNhatTrangThaiLuu();
    if (ok && tl.can) tlChay();   // có thay đổi dồn lại trong lúc ghi → ghi tiếp ngay
  }
  function tlHenThuLai() {
    clearTimeout(tl.hen);
    const cho = [5000, 15000, 30000][Math.min(tl.lanThu - 1, 2)];
    tl.hen = setTimeout(() => { tl.hen = null; tlChay(); }, cho);
  }

  /* Đổ một BẢN KHO vào bảng đang mở: bảng đang có được ưu tiên (chữ vừa sửa mà chưa kịp ghi vẫn
     giữ), câu chỉ kho có thì thêm vào, câu kho sửa MỚI HƠN thì lấy bản kho. Chỉ vẽ lại khi có
     gì đổi thật (so dấu vân tay) — snapshot dội lại sau chính lượt ghi của mình thì im lặng.
     Trả về true nếu đã vẽ lại. */
  function tlApDung(khoErrors) {
    const g = gopLoi(state.errors, khoErrors || []);
    const truoc = state.errors.map(vanTayLoi).join('|');
    const sau = g.errors.map(vanTayLoi).join('|');
    if (truoc === sau) return false;
    state.errors = g.errors;
    renderErrors();   // tự gọi capNhatNutDis + capNhatNutSubmit(→trạng thái) ở mô hình 2
    const n = g.them.length + g.doi;
    if (n) toast('Synced ' + n + ' change' + (n > 1 ? 's' : '') + ' from your other device ✓', 'info');
    return true;
  }
  // Nhận một tài liệu kho (từ onSnapshot hoặc lượt đọc REST) — `null` = chưa có bài trên kho
  function tlNhanKho(d) {
    const kho = ((d && d.errors) || []).map(chuanLoi);
    m2KhoErrors = kho;
    m2KhoDocLuc = Date.now();
    if (d) m2.daNopLanNao = true;
    m2GhiNhanKho(kho);
    tlApDung(kho);
  }

  // SDK Firestore nạp MỘT lần cho cả trang (màn trùng `trNoiKho` có bản nạp riêng, cố ý không đụng)
  let sdkKhoP = null;
  function laySdkKho() {
    if (sdkKhoP) return sdkKhoP;
    sdkKhoP = (async () => {
      const SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
      const appMod = await import(SDK + '/firebase-app.js');
      const fsMod = await import(SDK + '/firebase-firestore.js');
      let app;
      try { app = appMod.getApp(); } catch (e) {
        app = appMod.initializeApp({
          apiKey: (CFG.FIREBASE || {}).apiKey, projectId: (CFG.FIREBASE || {}).projectId,
          authDomain: ((CFG.FIREBASE || {}).projectId || '') + '.firebaseapp.com',
          appId: (CFG.FIREBASE || {}).appId, messagingSenderId: (CFG.FIREBASE || {}).messagingSenderId,   // 27/09/2026: cho App Check
        });
      }
      // 02/10/2026 GĐ4 — kho chỉ cho em đăng nhập đọc ⇒ chờ Auth khôi phục phiên (../js/ve-doc.js) rồi mới nghe.
      if (window.__veDocSan) { try { await window.__veDocSan; } catch (e) { } }
      return { fsMod, db: fsMod.getFirestore(app) };
    })();
    sdkKhoP.catch(() => { sdkKhoP = null; });
    return sdkKhoP;
  }
  async function tlNoiKho() {
    tlHuyNghe();
    if (!state.buoiId || !CFG.FIREBASE) return;
    try {
      const { fsMod, db } = await laySdkKho();
      if (!tl.bat || tl.nghe) return;   // rời màn / đã nối trong lúc chờ nạp SDK
      const ref = fsMod.doc(db, 'spBuoi', state.buoiId, 'tongLoi', slugHs(state.student));
      tl.nghe = fsMod.onSnapshot(ref, (snap) => {
        if (snap.metadata && snap.metadata.fromCache) return;   // chỉ tin bản từ MÁY CHỦ
        tl.ngheSong = true;
        tlNhanKho(snap.exists() ? (snap.data() || {}) : null);
      }, () => {
        // Bộ nghe chết (luật từ chối / mạng): bản đệm hết được coi là tươi ⇒ lượt ghi tự đọc
        // kho trước như luật 04/09; `tlDocLai` (quay lại app) sẽ nối lại.
        tl.ngheSong = false; tl.nghe = null;
      });
    } catch (e) { tl.ngheSong = false; }
  }
  function tlHuyNghe() {
    if (tl.nghe) { try { tl.nghe(); } catch (e) {} }
    tl.nghe = null; tl.ngheSong = false;
  }

  // Quay lại app: đọc kho một phát (không tin bộ nhớ đệm), nối lại bộ nghe nếu đã chết, ghi nốt phần chờ
  async function tlDocLai() {
    if (!tl.bat || !state.buoiId) return;
    if (!tl.nghe) { if (tl.che === 'phanbien') tlNoiKhoPb(); else tlNoiKho(); }
    if (tl.che === 'phanbien') {
      try { tlNhanPhieuKho(await fsQuery(state.buoiId, 'phanHoi', '', '', 3000)); }
      catch (e) { /* mạng chưa về — lượt ghi kế tiếp sẽ báo đỏ, không nuốt */ }
    } else {
      try { tlNhanKho(await tongLoiLay(state.buoiId, slugHs(state.student))); }
      catch (e) { /* mạng chưa về — lượt ghi kế tiếp sẽ báo đỏ, không nuốt */ }
    }
    if (tl.can && !tl.dangGhi) tlChay();
  }
  // Rời app: còn thứ chưa ghi thì đẩy vội bằng keepalive — CHỈ khi bản đệm còn tươi (đang nghe
  // kho, hoặc vừa đọc ≤ KHO_TUOI) để không phải đọc kho trước (đọc là quá muộn, trang đã ẩn).
  function tlDayVoi() {
    if (!tl.bat || !tl.can || tl.dangGhi) return;
    // Màn phản biện: mỗi phiếu là một tài liệu riêng, ghi thẳng không cần đọc kho trước ⇒ đẩy được
    // ngay. Gói cũng bé (một phiếu ≤ 300 ký tự lý do) nên không lo trần 64 KB của keepalive.
    if (tl.che === 'phanbien') { tlChay({ keepalive: true }); return; }
    if (!m2KhoErrors) return;
    if (!tl.ngheSong && (Date.now() - m2KhoDocLuc) >= KHO_TUOI) return;
    if (JSON.stringify(state.errors).length > 55000) return;   // quá cỡ keepalive (~64 KB) — để lượt thường lo
    tlChay({ keepalive: true });
  }

  /* ══════ `?v=57` — PHẦN RIÊNG CỦA MÀN PHẢN BIỆN ══════════════════════════════════════════
     Phiếu nào đang chờ lý do (bấm DISAGREE nhưng chưa gõ/gửi) ⇒ KHÔNG ghi được, dòng trạng thái
     phải nói "N reasons needed". ⛔ Đây không phải lỗi — đúng luật kho (`phanDoi` bắt buộc `lyDo`). */
  function phieuGuiDuoc(v) {
    return !!v && (v.y === 'dongY' || !!String(v.lyDo || '').trim());
  }
  function demPhieuChoLyDo() {
    return Object.keys(m2.votes || {}).filter((id) => !phieuGuiDuoc(m2.votes[id]) && !daDongBoPhieu(id)).length;
  }
  /* Một lượt ghi phản biện: so `m2.votes` với `m2.votesServer`, ghi TỪNG phiếu đã đổi.
     ⛔ `votesServer` cập nhật THEO TỪNG PHIẾU (không gán cả cục): phiếu chờ lý do vẫn nằm trong
        `m2.votes` mà chưa hề lên kho — gán cả cục là nói dối rằng nó đã đồng bộ.
     ⛔ Hỏng giữa chừng thì các phiếu ghi xong TRƯỚC đó vẫn được ghi nhận (đã lên kho thật), phần
        còn lại ném lỗi ra cho `tlChay` báo đỏ + hẹn thử lại. */
  async function tlGhiPb(tuyChon) {
    const sv = JSON.parse(m2.votesServer || '{}');
    const doi = Object.keys(m2.votes).filter((id) =>
      phieuGuiDuoc(m2.votes[id]) && JSON.stringify(m2.votes[id]) !== JSON.stringify(sv[id]));
    if (!doi.length) return 0;
    let xong = 0;
    try {
      for (const id of doi) {
        const it = m2.dsCham.find((x) => x.err.id === id);
        const v = m2.votes[id];
        await phanHoiGhi(state.buoiId, id + '__' + slugHs(state.student), {
          errId: id,
          chuLoi: it ? it.chuLoi : '',
          voter: state.student,
          voterTeam: state.myTeam,
          y: v.y,
          // ⭐ (thầy chốt) đổi ý DISAGREE → AGREE thì GIỮ NGUYÊN lý do cũ trên kho làm dấu vết;
          // `renderErrorsPb` hiện nó xám mờ + gạch ngang.
          lyDo: String(v.lyDo || '').trim(),
          luc: Date.now(),
        }, tuyChon);
        sv[id] = v;
        xong++;
        // Phiếu của chính em trong bảng chung — thay tại chỗ để avatar/dòng lý do hiện ngay
        m2.phanHoi = m2.phanHoi.filter((p) => !(p.errId === id && p.voter === state.student));
        m2.phanHoi.push({ errId: id, chuLoi: it ? it.chuLoi : '', voter: state.student,
          voterTeam: state.myTeam, y: v.y, lyDo: String(v.lyDo || '').trim(), luc: Date.now() });
      }
    } finally {
      m2.votesServer = JSON.stringify(sv);   // ghi nhận đúng phần ĐÃ lên kho, kể cả khi hỏng giữa chừng
    }
    return xong;
  }

  /* Nhận danh sách phiếu MỚI NHẤT của cả buổi (từ onSnapshot hoặc lượt đọc lại):
     · `m2.phanHoi` = bản kho (phiếu của mọi người) ⇒ badge UNCONFIRMED cả đội tự tụt.
     · Phiếu của CHÍNH EM: phiếu nào ở máy này ĐÃ đồng bộ thì lấy bản kho (máy khác vừa đổi);
       phiếu nào đang sửa dở/chờ gửi thì GIỮ bản máy này, không để snapshot nuốt mất. */
  function tlNhanPhieuKho(ds) {
    const cu = JSON.parse(m2.votesServer || '{}');
    m2.phanHoi = Array.isArray(ds) ? ds : [];
    const sv = {};
    let doiTuMayKhac = 0;
    m2.phanHoi.filter((p) => p.voter === state.student).forEach((p) => {
      const kho = { y: p.y, lyDo: p.lyDo || '' };
      sv[p.errId] = kho;
      const dangCo = m2.votes[p.errId];
      const chuaGui = dangCo && JSON.stringify(dangCo) !== JSON.stringify(cu[p.errId] || null);
      if (chuaGui) return;                                   // máy này đang sửa dở → giữ nguyên
      if (JSON.stringify(dangCo || null) !== JSON.stringify(kho)) doiTuMayKhac++;
      m2.votes[p.errId] = kho;
    });
    m2.votesServer = JSON.stringify(sv);
    renderErrorsPb();
    capNhatTrangThaiLuu();
    if (doiTuMayKhac) {
      toast('Synced ' + doiTuMayKhac + ' vote' + (doiTuMayKhac > 1 ? 's' : '') + ' from your other device ✓', 'info');
    }
  }

  // Nghe CẢ collection `phanHoi` của buổi (thầy chốt ④). `startPb` vốn đã đọc hết một lượt nên
  // lần đầu không tốn thêm lượt đọc; sau đó chỉ tính lượt cho tài liệu thật sự đổi.
  async function tlNoiKhoPb() {
    tlHuyNghe();
    if (!state.buoiId || !CFG.FIREBASE) return;
    try {
      const { fsMod, db } = await laySdkKho();
      if (!tl.bat || tl.nghe) return;   // rời màn / đã nối trong lúc chờ nạp SDK
      const goc = fsMod.collection(db, 'spBuoi', state.buoiId, 'phanHoi');
      tl.nghe = fsMod.onSnapshot(goc, (snap) => {
        if (snap.metadata && snap.metadata.fromCache) return;   // chỉ tin bản từ MÁY CHỦ
        tl.ngheSong = true;
        const ds = [];
        snap.forEach((d) => { const o = d.data() || {}; o._id = d.id; ds.push(o); });
        tlNhanPhieuKho(ds);
      }, () => { tl.ngheSong = false; tl.nghe = null; });
    } catch (e) { tl.ngheSong = false; }
  }

  // Chuẩn hoá một lỗi mô hình 2 (bản cũ trong kho có thể thiếu trường mới)
  function chuanLoi(er) {
    return {
      id: String(er.id || taoErrId()),
      trangThai: er.trangThai === 'an' || er.trangThai === 'go' ? er.trangThai : 'song',
      ketLuan: er.ketLuan === 'keep' || er.ketLuan === 'agree' ? er.ketLuan : '',
      min: +er.min || 0, sec: +er.sec || 0, section: '',
      who: String(er.who || ''), type: String(er.type || ''),
      sentence: String(er.sentence || ''), detail: String(er.detail || ''), explain: String(er.explain || ''),
      suaLuc: +er.suaLuc || 0,   // ⭐ 05/09/2026 — mốc sửa gần nhất (ms), `gopLoi` lấy bản mới hơn; bản cũ = 0
    };
  }
  // Dấu vân tay MỘT lỗi — chuẩn hoá trước khi so, vì object trong `state.errors` (do form dựng) và
  // object đọc từ kho (qua `chuanLoi`) có THỨ TỰ KHOÁ khác nhau dù nội dung y hệt.
  function vanTayLoi(e) { return JSON.stringify(chuanLoi(e)); }
  // Ảnh chụp phần SẼ GHI LÊN KHO — so sánh chuỗi = biết có gì chưa gửi
  function m2ChupCham() {
    return JSON.stringify({ e: state.errors, t: cleanTimers() });
  }
  function m2GhiNhanDongBo() {
    m2.serverBan = m2ChupCham();
    m2.serverIds = {};
    state.errors.forEach((e) => { if (e.id) m2.serverIds[e.id] = vanTayLoi(e); });
  }
  // ⭐ 05/09/2026 (tự lưu) — ghi nhận theo BẢN KHO (từ onSnapshot / lượt đọc lại), không theo bảng RAM
  function m2GhiNhanKho(kho) {
    m2.serverIds = {};
    (kho || []).forEach((e) => { if (e && e.id) m2.serverIds[e.id] = vanTayLoi(e); });
    m2.serverBan = JSON.stringify({ e: (kho || []).map(chuanLoi), t: cleanTimers() });
  }
  function m2LoiDaDongBo(e) {
    return !!(e.id && m2.serverIds[e.id] === vanTayLoi(e));
  }
  function m2CoSuaChuaGui() {
    if (state.moHinh !== 2) return false;
    /* ⛔⛔ `?v=61` — VÁ LỖI CŨ (có từ `?v=44`, chưa ai bắt được vì ít người đóng tab ở đây):
       hai màn TRÙNG cũng là mô hình 2 nhưng KHÔNG đụng gì tới `m2`/`state.errors`, nên dòng
       cuối `m2ChupCham() !== m2.serverBan` LUÔN đúng ⇒ đóng tab là trình duyệt hiện hộp
       "Rời trang? Thay đổi có thể không được lưu" dù chẳng có gì chờ ghi. Nói sai sự thật, mà
       lại đúng lúc ta vừa hứa với các em là mọi thứ tự lưu.
       ⇒ Ở hai màn này, "còn thứ chưa gửi" = HÀNG ĐỢI GHI còn món, chứ không đo bằng `m2`. */
    if (state.cheDo === 'kiemtratrung' || state.cheDo === 'xacnhantrung') {
      return !!(trLuu.cho.length || trLuu.dangGhi);
    }
    if (tl.bat) return tl.can || tl.dangGhi;   // ⭐ 05/09/2026 — tự lưu: "chưa gửi" = còn lượt ghi chưa xong
    if (state.cheDo === 'phanbien') return JSON.stringify(m2.votes) !== m2.votesServer;
    return m2ChupCham() !== m2.serverBan;
  }

  // Nút SUBMIT/UPDATE 3 màu + CHỮ (thầy chốt, đợt 2): TRẮNG "SUBMIT" chưa gửi lần nào, chưa sửa
  // gì · XANH LÁ "SUBMITTED"/"UPDATED" đã gửi, không có gì chờ · VÀNG nhấp nháy to-nhỏ "SUBMIT"/
  // "UPDATE" có sửa chưa gửi. "SUBMIT" chỉ hiện TRƯỚC lần nộp đầu tiên — sau đó mãi mãi là
  // "UPDATE" (đọc theo `daCo`/`m2.daNopLanNao`, cờ này set 1 lần rồi giữ mãi). Chỉ áp mô hình 2.
  function capNhatNutSubmit() {
    if (state.moHinh !== 2) return;
    if (tl.bat) { capNhatTrangThaiLuu(); return; }   // ⭐ 05/09/2026 — tự lưu: nút Submit đã ẩn, chỉ còn dòng trạng thái
    const b = $('btnSubmit');
    b.classList.remove('bg-emerald-500', 'hover:bg-emerald-400', 'bg-white', 'text-emerald-700',
      'hover:bg-emerald-50', 'nut-vang-nhay', 'bg-amber-400', 'hover:bg-amber-300', 'text-slate-900');
    const daCo = state.cheDo === 'phanbien' ? (m2.votesServer !== '' && m2.votesServer !== '{}') : m2.daNopLanNao;
    let chu;
    if (m2CoSuaChuaGui()) {
      b.classList.add('bg-amber-400', 'hover:bg-amber-300', 'text-slate-900', 'nut-vang-nhay');
      chu = daCo ? 'UPDATE' : 'SUBMIT';
    } else if (daCo) {
      b.classList.add('bg-emerald-500', 'hover:bg-emerald-400');
      chu = m2.nhanXanh || 'UPDATED';
    } else {
      b.classList.add('bg-white', 'text-emerald-700', 'hover:bg-emerald-50');
      chu = 'SUBMIT';
    }
    const nhanChu = b.querySelector('span');
    if (nhanChu) nhanChu.textContent = chu; else b.textContent = chu;
    b.title = chu;
  }

  // Pop-up loading chặn thao tác (vào bài + SUBMIT — thầy chốt phải có)
  function loadingHien(chu) {
    $('m2LoadText').textContent = chu || 'Loading…';
    $('m2LoadModal').classList.remove('hidden');
    $('m2LoadModal').classList.add('flex');
    refreshIcons();
  }
  function loadingAn() {
    $('m2LoadModal').classList.add('hidden');
    $('m2LoadModal').classList.remove('flex');
  }

  /* ⛔ 04/09/2026 — KHÔNG ĐỌC ĐƯỢC BÀI TRÊN KHO thì hỏi hẳn, đừng lặng lẽ coi như chưa có bài.
     Trả 'thulai' (gọi lại startM2) hoặc 'offline' (ghi chép tạm trên máy; lượt lưu vẫn bị
     `tongLoiGhiAnToan` chặn cho tới khi đọc được kho, nên không có đường nào ghi đè mù). */
  function hoiKhoHong() {
    return new Promise((chot) => {
      const m = $('khoHongModal');
      m.classList.remove('hidden'); m.classList.add('flex');
      refreshIcons();
      const dong = (kq) => { m.classList.add('hidden'); m.classList.remove('flex'); chot(kq); };
      $('btnKhoThuLai').onclick = () => dong('thulai');
      $('btnKhoOffline').onclick = () => dong('offline');
    });
  }

  // ⛔ 05/09/2026 — `moTaBanCham()` (mô tả hai bản cho pop-up "Two versions found") ĐÃ GỠ cùng pop-up đó.

  // Mã lượt nộp yyMMdd-HHmmss-<3 số>, giờ VN — ⛔ CÙNG ĐỊNH DẠNG makeSid trong Code.gs
  // (sid là "khoá thời gian" của cả hệ: so chuỗi = so thời gian, python khử trùng theo nó).
  function taoSid() {
    const t = new Date(Date.now() + 7 * 3600 * 1000);
    const p = (n) => String(n).padStart(2, '0');
    return String(t.getUTCFullYear()).slice(2) + p(t.getUTCMonth() + 1) + p(t.getUTCDate()) +
      '-' + p(t.getUTCHours()) + p(t.getUTCMinutes()) + p(t.getUTCSeconds()) +
      '-' + Math.floor(Math.random() * 900 + 100);
  }
  // 'dd/MM/yyyy HH:mm' từ chuỗi ISO — cùng dạng chữ `luc` mà bộ não cũ trả về cho pop-up lịch sử
  function gioDep(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const p = (n) => String(n).padStart(2, '0');
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  // ─── Lưu / khôi phục tạm (localStorage) ───
  let saveTimer = null;
  function autosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      state.savedAt = new Date().toISOString();   // CHẶNG 29: mốc lưu — xếp danh sách "bài đã nộp"
      // ⭐ 05/09/2026 (thầy chốt) — TỰ LƯU thì KHÔNG còn nháp trong máy: kho là gốc duy nhất. Nháp máy
      // chính là thứ đã đè mất bài hai em hôm 04/09 (máy cũ mở lại là nháp cũ đè bản mới).
      if (!tl.bat) { try { localStorage.setItem(saveKey, JSON.stringify(state)); } catch (e) {} }
      // (Đợt B) mọi thay đổi đều đi qua autosave → cập nhật màu nút SUBMIT tại đây một thể
      if (state.moHinh === 2) capNhatNutSubmit();
    }, 300);
  }
  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(saveKey)); } catch (e) { return null; }
  }

  // ═══════════════ CHẶNG 33 — MỖI HỌC SINH MỘT Ô NHỚ RIÊNG ═══════════════
  // ⛔ LỖI CŨ ĐÃ TRẢ GIÁ: khoá lưu chỉ theo LINK VIDEO (`myspeaking_<video>`). Hai em CÙNG ĐỘI thì
  // chấm CÙNG một video ⇒ dùng CHUNG một ô nhớ. Em B đăng nhập trên cùng máy: app không nạp bài của
  // em A (có so tên) NHƯNG autosave của em B GHI ĐÈ lên ô đó ⇒ bài + lịch sử của em A MẤT SẠCH.
  // Nay khoá = tên em + link video ⇒ ai lưu bài nấy, và lịch sử lọc theo tên (xem submittedSaves).
  // Bài lưu bằng khoá CŨ vẫn đọc lại được: submittedSaves đọc mọi khoá `myspeaking_` rồi lọc theo
  // trường `student` nằm TRONG dữ liệu, không dựa vào hình dạng khoá.
  function slugKey(s) {
    return String(s || '').trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9\-]/g, '') || 'HS';
  }
  function makeSaveKey(student, videoUrl) {
    return 'myspeaking_' + slugKey(student) + '_' + String(videoUrl || 'manual').slice(-60);
  }

  // ─── Toast ───
  function toast(msg, kind) {
    const t = $('toast'), inner = $('toastInner');
    inner.className = 'rounded-2xl px-5 py-3 shadow-2xl text-white font-bold text-sm flex items-center gap-2 slidein ' +
      (kind === 'err' ? 'bg-rose-600' : kind === 'info' ? 'bg-indigo-600' : 'bg-emerald-600');
    inner.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toast._h);
    toast._h = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  // ═══════════════ VIDEO ═══════════════
  const video = { mode: 'none', yt: null, el: null, ready: false };

  function parseVideoUrl(url) {
    if (!url) return null;
    url = url.trim();
    let m = url.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
    if (m) return { type: 'youtube', id: m[1] };
    m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || url.match(/drive\.google\.com\/(?:open|uc).*[?&]id=([\w-]+)/);
    if (m) return { type: 'drive', id: m[1] };
    if (/^https?:\/\/.+\.(mp4|webm|m4v|mov)(\?|$)/i.test(url)) return { type: 'direct', url: url };
    return { type: 'unknown', url: url };
  }

  function setVideoStatus(html) {
    $('videoStatus').innerHTML = html;
    fitVideoInfo();
    // Đo LẦN NỮA sau khi bố cục ổn định: lúc vừa gán chữ, khung video (desktop giãn theo lưới,
    // mobile chờ video vào) có thể chưa đúng bề ngang cuối cùng ⇒ đo sớm sẽ hạ cỡ chữ oan.
    clearTimeout(setVideoStatus._t);
    setVideoStatus._t = setTimeout(fitVideoInfo, 350);
  }

  // ═══════════════ CHẶNG 34 — DÒNG DƯỚI VIDEO LUÔN GỌN 1 DÒNG ═══════════════
  // ⛔ 05/09/2026 (thầy chốt): dòng "LỚP · TEAM · thành viên" ĐÃ BỎ HẲN khỏi khung video —
  // hàm `videoInfoHtml()` gỡ theo, ba lời gọi đổi thành `setVideoStatus('')`.
  // ⚠️ `tenLopNgan()` thì PHẢI GIỮ: `avLopSlug()` dùng nó để dựng slug lớp cho KHO ẢNH ĐẠI DIỆN.
  //    Gỡ nhầm là ảnh đại diện của cả lớp hỏng CÂM LẶNG (không có lỗi nào bắn ra).
  // Ô `#videoStatus` GIỮ LẠI vì còn dùng cho chữ trạng thái lúc tải video ("Loading YouTube…",
  // "Trying to play directly from Drive…"), và tự biến mất khi rỗng nhờ `#videoStatus:empty`.
  // `fitVideoInfo()` giữ nguyên để chữ trạng thái đó không bao giờ tràn dòng.
  function tenLopNgan(s) {
    return String(s || '').replace(/^\s*(CLASS|L[ớơo]p)\s+/i, '').trim();   // "CLASS B1AH" → "B1AH"
  }
  function fitVideoInfo() {
    const el = $('videoStatus');
    if (!el || !el.firstChild) return;
    const MAX = window.innerWidth >= 1024 ? 14 : 13, MIN = 9;
    let px = MAX;
    el.style.fontSize = px + 'px';
    // + 1px dung sai: scrollWidth/clientWidth hay lệch 1px do bo tròn phân số
    while (px > MIN && el.scrollWidth > el.clientWidth + 1) {
      px -= 0.5;
      el.style.fontSize = px + 'px';
    }
  }

  // ─── Khung điều khiển video LUÔN HIỆN (nút gốc của trình duyệt tự ẩn — không cấm được,
  //     nên tự vẽ khung rời: play/pause + thời gian + thanh tua, không bao giờ ẩn) ───
  const vc = { dragging: false, playing: null, poll: null };
  function fmtClock(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function vcShow() { const el = $('videoCtrl'); el.classList.remove('hidden'); el.classList.add('flex'); }
  function vcSetPlaying(p) {
    if (vc.playing === p) return;
    vc.playing = p;
    $('vcPlay').innerHTML = '<i data-lucide="' + (p ? 'pause' : 'play') + '" class="w-5 h-5 pointer-events-none"></i>';
    refreshIcons();
  }
  // Tô phần ĐÃ CHẠY màu đỏ trên thanh tua (custom range không có accent-fill sẵn)
  function vcFill(pct) {
    pct = Math.max(0, Math.min(100, pct || 0));
    $('vcSeek').style.background = 'linear-gradient(to right, #e11d48 ' + pct + '%, #e2e8f0 ' + pct + '%)';
  }
  function vcUpdate(cur, dur) {
    if (!vc.dragging && dur) { $('vcSeek').value = Math.round((cur / dur) * 1000); }
    if (!vc.dragging) vcFill(dur ? (cur / dur) * 100 : 0);
    $('vcCur').textContent = fmtClock(cur);
    $('vcDur').textContent = fmtClock(dur);
  }
  function vcDuration() {
    if (video.mode === 'html5' && video.el) return video.el.duration || 0;
    if (video.mode === 'youtube' && video.yt && video.ready) { try { return video.yt.getDuration() || 0; } catch (e) { return 0; } }
    return 0;
  }
  // Video ĐANG PHÁT tới đâu → ô MIN/SEC chạy theo tới đó; PAUSE thì dừng để HS chỉnh tay
  function syncTimeFields(cur) {
    const s = Math.max(0, Math.floor(cur || 0));
    $('fMin').value = Math.floor(s / 60);
    $('fSec').value = s % 60;
    autoPickStudent(s);
  }

  // Khoảng thời gian nói của 1 HS (null nếu chưa nhập đủ 4 ô)
  function timerRangeOf(t) {
    if (['sMin', 'sSec', 'eMin', 'eSec'].some((k) => String(t[k]).trim() === '')) return null;
    return { s: (parseInt(t.sMin, 10) || 0) * 60 + (parseInt(t.sSec, 10) || 0), e: (parseInt(t.eMin, 10) || 0) * 60 + (parseInt(t.eSec, 10) || 0) };
  }
  // Video đang ở trong khoảng nói của HS nào → tự sáng tên HS đó
  function autoPickStudent(cur) {
    if (!state.members.length) return;
    for (let i = 0; i < state.timers.length; i++) {
      const r = timerRangeOf(state.timers[i]);
      if (r && cur >= r.s && cur <= r.e) {
        if (fWhoSel !== state.timers[i].name) { fWhoSel = state.timers[i].name; renderWhoBtns(); }
        return;
      }
    }
  }

  // Chỉnh tay MIN/SEC (Enter hoặc click ra ngoài) → video nhảy theo
  function seekVideoTo(t) {
    t = Math.max(0, t || 0);
    const d = vcDuration();
    if (d) t = Math.min(t, Math.max(0, d - 0.2));
    if (video.mode === 'html5' && video.el) video.el.currentTime = t;
    else if (video.mode === 'youtube' && video.yt && video.ready) { try { video.yt.seekTo(t, true); } catch (e) {} }
    // chế độ dự phòng (iframe): không seek được video Drive — HS dùng thanh kéo + SET TIME
    vcUpdate(t, d);
    autoPickStudent(Math.floor(t));
  }
  function manualTimeSeek() {
    seekVideoTo((parseInt($('fMin').value, 10) || 0) * 60 + (parseInt($('fSec').value, 10) || 0));
  }

  // ═══ ⭐ 05/09/2026 (thầy chốt) — LÙI / TIẾN 5 GIÂY ═══════════════════════════════════════
  // Hai nút hai bên nút play, để em nhích lại một chút mà nghe kỹ chỗ nghi có lỗi.
  // ⛔ Lấy mốc hiện tại từ CHÍNH TRÌNH PHÁT (`vcNow()`), đừng lấy từ ô MIN/SEC của form: hai
  //    chỗ đó KHÔNG bằng nhau — ô MIN/SEC còn bị lùi 3 giây khi thêm lỗi mới (`REWIND_SEC`),
  //    và em sửa tay được. Lấy nhầm là mỗi lần bấm tua video lại nhảy về chỗ khác.
  // ⛔ Không đụng tới chế độ dự phòng (iframe Drive): ở đó `seekVideoTo` vốn không tua được,
  //    nên hai nút này tự vô hại — HS vẫn dùng thanh kéo tay + SET TIME như cũ.
  const NHICH_SEC = 5;
  function vcNow() {
    if (video.mode === 'html5' && video.el) return video.el.currentTime || 0;
    if (video.mode === 'youtube' && video.yt && video.ready) {
      try { return video.yt.getCurrentTime() || 0; } catch (e) { return 0; }
    }
    return 0;
  }
  function vcNhich(giay) {
    seekVideoTo(Math.max(0, vcNow() + giay));
  }

  // ═══ (04/09/2026 — thầy chốt) BẤM Ô GIỜ TRONG DANH SÁCH LỖI ═══════════════════════════
  // Bấm một cái = nhảy tới giây đó rồi CHẠY (bấm lại câu cũ cũng vậy: về đúng giây đó chạy
  // tiếp) · bấm ĐÚP = tạm dừng.
  // ⛔ Bấm đúp bao giờ cũng bắn ra HAI lần bấm đơn trước, nên không thể xử lý thẳng: phải hẹn
  // ~250ms rồi mới chạy, cú bấm thứ hai tới trong khoảng đó thì HUỶ hẹn và dừng video. Xử lý
  // thẳng là mỗi lần bấm đúp video lại giật chạy một nhịp rồi mới dừng.
  let erSeekHen = null;
  function chayVideo() {
    if (video.mode === 'html5' && video.el) { try { video.el.play(); } catch (e) {} }
    else if (video.mode === 'youtube' && video.yt && video.ready) { try { video.yt.playVideo(); } catch (e) {} }
  }
  function dungVideo() {
    if (video.mode === 'html5' && video.el) { try { video.el.pause(); } catch (e) {} }
    else if (video.mode === 'youtube' && video.yt && video.ready) { try { video.yt.pauseVideo(); } catch (e) {} }
  }
  function bamOGio(giay) {
    if (erSeekHen) {                       // cú thứ hai trong 250ms = bấm đúp ⇒ chỉ dừng
      clearTimeout(erSeekHen); erSeekHen = null;
      dungVideo();
      return;
    }
    erSeekHen = setTimeout(() => {
      erSeekHen = null;
      seekVideoTo(giay);
      chayVideo();
    }, 250);
  }
  function vcAttachHtml5(v) {
    vcShow();
    v.addEventListener('timeupdate', () => {
      vcUpdate(v.currentTime, v.duration);
      if (!v.paused) syncTimeFields(v.currentTime);
    });
    // Click thẳng vào thanh gốc của video (kể cả khi ĐANG DỪNG) → MIN/SEC nhảy theo ngay
    v.addEventListener('seeked', () => {
      vcUpdate(v.currentTime, v.duration);
      if (v.paused) syncTimeFields(v.currentTime);
    });
    v.addEventListener('durationchange', () => vcUpdate(v.currentTime, v.duration));
    v.addEventListener('play', () => vcSetPlaying(true));
    v.addEventListener('pause', () => vcSetPlaying(false));
    vcUpdate(v.currentTime, v.duration);
    vcSetPlaying(!v.paused);
  }
  function vcAttachYouTube() {
    vcShow();
    clearInterval(vc.poll);
    vc.poll = setInterval(() => {
      try {
        const playing = video.yt.getPlayerState() === 1;
        vcUpdate(video.yt.getCurrentTime() || 0, video.yt.getDuration() || 0);
        vcSetPlaying(playing);
        if (playing) syncTimeFields(video.yt.getCurrentTime() || 0);
      } catch (e) {}
    }, 300);
  }

  function initVideo() {
    const box = $('videoContainer');
    const p = parseVideoUrl(state.videoUrl);
    if (!p) {
      box.innerHTML = '<div class="w-full h-full flex items-center justify-center text-slate-400 text-sm bg-slate-900 rounded-2xl">No video yet</div>';
      return;
    }
    if (p.type === 'youtube') initYouTube(box, p.id);
    else if (p.type === 'drive') initDriveDirect(box, p.id);
    else if (p.type === 'direct') initHtml5(box, [p.url], null);
    else {
      box.innerHTML = '<div class="w-full h-full flex items-center justify-center text-slate-400 text-sm bg-slate-900 rounded-2xl px-6 text-center">Couldn\'t recognise the video link. Please use a YouTube or Google Drive link.</div>';
    }
  }

  // — YouTube (đọc thời gian chính xác qua IFrame API) —
  function initYouTube(box, id) {
    video.mode = 'youtube';
    box.innerHTML = '<div id="ytPlayer"></div>';
    setVideoStatus('<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Loading YouTube…');
    refreshIcons();
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = function () {
      video.yt = new YT.Player('ytPlayer', {
        videoId: id,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            video.ready = true;
            setVideoStatus('');   // ⬅ 05/09: bỏ dòng "LỚP · TEAM · thành viên" (thầy chốt)
            vcAttachYouTube();
            refreshIcons();
          },
        },
      });
    };
  }

  // — Drive phát trực tiếp, tự fallback sang iframe + đồng hồ —
  // Lưu ý: file >100MB bị Google chặn bằng trang "Virus scan warning" (chỉ chặn
  // trình duyệt — Google nhận diện qua User-Agent), nên 2 endpoint download chỉ
  // chạy được với file nhỏ. Drive API + key là đường chính thống cho file lớn.
  function initDriveDirect(box, id) {
    const candidates = [];
    if (CFG.DRIVE_API_KEY) {
      candidates.push('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media&key=' + CFG.DRIVE_API_KEY);
    }
    candidates.push(
      'https://drive.usercontent.google.com/download?id=' + id + '&export=download&confirm=t',
      'https://drive.google.com/uc?export=download&id=' + id
    );
    setVideoStatus('<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Trying to play directly from Drive…');
    refreshIcons();
    initHtml5(box, candidates, () => initDriveIframe(box, id));
  }

  function initHtml5(box, candidates, onAllFail) {
    video.mode = 'html5';
    let i = 0;
    box.innerHTML = '';
    const v = document.createElement('video');
    v.controls = true; v.playsInline = true; v.preload = 'metadata';
    box.appendChild(v);
    video.el = v;
    let settled = false;
    let guard = null;

    function tryNext() {
      if (settled) return;
      if (i >= candidates.length) {
        settled = true;
        clearTimeout(guard);
        if (onAllFail) onAllFail();
        return;
      }
      v.src = candidates[i++];
      clearTimeout(guard);
      // Chờ lâu hơn (25s): lỗi thật (403/format) đã bắn 'error' NGAY nên fallback vẫn nhanh khi hỏng;
      // timeout chỉ cứu trường hợp mạng CHẬM tải metadata file lớn — thà chờ còn hơn rơi dự phòng nhầm.
      guard = setTimeout(() => { if (!video.ready) tryNext(); }, 25000);
      v.load();
    }
    v.addEventListener('error', tryNext);
    v.addEventListener('loadedmetadata', () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      video.ready = true;
      setVideoStatus('');   // ⬅ 05/09: bỏ dòng "LỚP · TEAM · thành viên" (thầy chốt)
      vcAttachHtml5(v);
      refreshIcons();
    });
    tryNext();
  }

  // — Fallback: iframe Drive + THANH KÉO tay (iframe Drive không cho JS đọc giờ phát) —
  // HS xem giờ trên trình phát Drive, kéo thanh cho khớp, bấm SET TIME để đưa vào MIN/SEC.
  function initDriveIframe(box, id) {
    video.mode = 'stopwatch';   // giữ tên mode = chế độ dự phòng (iframe + thanh kéo tay)
    video.el = null;
    box.innerHTML = '<iframe src="https://drive.google.com/file/d/' + id + '/preview" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    const wrap = $('stopwatchWrap');
    wrap.classList.remove('hidden'); wrap.classList.add('flex');
    swFill();
    setVideoStatus('');   // ⬅ 05/09: bỏ dòng "LỚP · TEAM · thành viên" (thầy chốt)
    refreshIcons();
  }
  // Tô phần đã qua XANH DƯƠNG trên thanh kéo dự phòng
  function swFill() {
    const el = $('swSeek'); if (!el) return;
    const pct = (el.value - el.min) / (el.max - el.min) * 100;
    el.style.background = 'linear-gradient(to right, #2563eb ' + pct + '%, #dbeafe ' + pct + '%)';
  }
  // Đốm sáng bay từ điểm (x0,y0) tới ô đích rồi tan
  function flyLight(x0, y0, toEl) {
    const b = toEl.getBoundingClientRect();
    const x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
    const dot = document.createElement('div');
    dot.style.cssText = 'position:fixed;left:0;top:0;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:9999px;background:radial-gradient(circle,#93c5fd,#2563eb);box-shadow:0 0 14px 5px rgba(37,99,235,.8);z-index:9999;pointer-events:none';
    document.body.appendChild(dot);
    const anim = dot.animate([
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(1)', opacity: 1 },
      { transform: 'translate(' + ((x0 + x1) / 2) + 'px,' + (Math.min(y0, y1) - 46) + 'px) scale(1.5)', opacity: 1, offset: .55 },
      { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.25)', opacity: 0 }
    ], { duration: 650, easing: 'cubic-bezier(.35,0,.2,1)' });
    anim.onfinish = () => dot.remove();
  }
  function flashEl(el) { el.classList.remove('time-flash'); void el.offsetWidth; el.classList.add('time-flash'); }
  // Bấm SET TIME: đưa giờ thanh kéo → MIN/SEC kèm ánh sáng bay
  function swSetTime() {
    const secs = parseInt($('swSeek').value, 10) || 0;
    const el = $('swSeek'), r = el.getBoundingClientRect();
    const frac = (el.value - el.min) / (el.max - el.min);
    flyLight(r.left + frac * r.width, r.top + r.height / 2, $('fMin'));
    setTimeout(() => {
      $('fMin').value = Math.floor(secs / 60); $('fSec').value = secs % 60;
      flashEl($('fMin')); flashEl($('fSec'));
      autoPickStudent(secs);
    }, 430);
  }

  // ═══════════════ FORM BẮT LỖI ═══════════════
  // Chọn HS có lỗi = DÃY NÚT TÊN — CHỈ các thành viên đã xác định (không Whole team / Someone else).
  // Luôn xếp vừa 1 HÀNG: flex + flex-1 chia đều, chữ nhỏ, truncate chống tràn.
  // Bấm ai người đó sáng, 1 thời điểm chỉ 1 tên (1 người nói tại 1 thời điểm).
  let fWhoSel = '';
  // Ô nhập thời gian nói nhỏ dưới tên (min:sec → min:sec) — type=text + inputmode để không có nút spin chiếm chỗ
  // ⛔ 05/09/2026 — ĐÃ GỠ `T_IN` + `timerCellHtml()` (4 ô giờ nói dưới mỗi tên học sinh),
  // thầy chốt bỏ hẳn. Luật CSS `.tIn` trong index.html cũng đã gỡ theo. Đừng dựng lại.
  function buildStudentField() {
    const wrap = $('fStudentWrap');
    if (state.members.length) {
      // ⛔ 05/09/2026 (thầy chốt) — CHỈ CÒN HÀNG NÚT TÊN. Bốn ô giờ nói dưới mỗi tên
      // (`timerCellHtml`) ĐÃ BỎ HẲN, đừng dựng lại. Ba hệ quả đã lường trước:
      //   ① app máy tính mất nguồn "bảng giờ nói từng em" (`nguoncham.js` ①) — sẽ suy từ
      //      mốc các lỗi đã bắt trong MỘT ĐỢT RIÊNG (thầy chốt: chấp nhận gần đúng);
      //   ② `autoPickStudent()` (tự sáng tên em theo mốc video) chỉ còn chạy ở buổi CŨ đã
      //      có timers trên kho — buổi mới thì em tự bấm tên, không sao;
      //   ③ trường `timers` trong bài nộp VẪN GIỮ NGUYÊN (nạp sao gửi vậy): buổi cũ còn dữ
      //      liệu thật trên kho, bỏ trường đi là `fsPatch` ghi đè mất sạch — xem LUẬT 9️⃣.
      const cols = state.members.map((n) =>
        '<div class="flex-1 min-w-0">' +
        '<button type="button" data-who="' + escapeHtml(n) + '" class="whoBtn">' + escapeHtml(n) + '</button>' +
        '</div>'
      ).join('');
      wrap.innerHTML = '<div class="flex gap-1.5">' + cols + '</div>';
      renderWhoBtns();
    } else {
      wrap.innerHTML = '<input id="fWho" type="text" placeholder="Name of the student" class="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">';
    }
  }
  function renderWhoBtns() {
    document.querySelectorAll('.whoBtn').forEach((b) => {
      const on = b.dataset.who === fWhoSel;
      b.className = 'whoBtn w-full min-w-0 rounded-lg border-2 px-1 py-2 text-[11px] sm:text-xs font-bold leading-tight transition truncate text-center ' +
        (on ? TYPE_ON : TYPE_OFF);   // chọn tên = KHUNG VÀNG y hệt phần TYPE
    });
  }
  // Nháy viền đỏ ô/khu vực còn thiếu (giống lối báo "thiếu ô giờ" lúc Submit).
  // Chỉ báo bằng toast thì HS đang nhìn chỗ khác không biết thiếu mục nào.
  function flashBox(el) {
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    el.classList.add('ring-2', 'ring-red-400', 'rounded-xl');
    setTimeout(() => el.classList.remove('ring-2', 'ring-red-400', 'rounded-xl'), 1600);
  }
  function flashStudentField() { flashBox($('fStudentWrap')); }
  function flashTypeField() { document.querySelectorAll('.errType').forEach(flashBox); }
  function getWho() {
    if (!state.members.length) { const el = $('fWho'); return el ? el.value.trim() : ''; }
    return fWhoSel;
  }
  function setWho(val) {
    if (!state.members.length) { const el = $('fWho'); if (el) el.value = val; return; }
    fWhoSel = state.members.includes(val) ? val : '';
    renderWhoBtns();
  }

  // Nút loại lỗi: mặc định cả 3 NỀN TRẮNG, chọn thì KHUNG VÀNG (badge trong danh sách vẫn giữ màu riêng)
  const TYPE_ON = 'border-amber-400 bg-amber-50 text-slate-900 shadow shadow-amber-200';
  const TYPE_OFF = 'border-slate-200 bg-white text-slate-700 hover:border-slate-300';
  // TYPE lưu bằng TIẾNG ANH (khớp mẫu mới của thầy: Grammar / Pronunciation / Information)
  const TYPE_STYLE = {
    // CHẶNG 33: `short` = chữ cái dùng cho ô ĐẾM ở đầu khung Mistakes found (G/P/I).
    // Lý do: trên điện thoại nhỏ, "Pronunciation: 5" + "Information: 2" đẩy ô cuối LÒI RA NGOÀI khung.
    'Grammar': { badge: 'bg-blue-100 text-blue-700', short: 'G' },
    'Pronunciation': { badge: 'bg-emerald-100 text-emerald-700', short: 'P' },
    'Information': { badge: 'bg-amber-100 text-amber-700', short: 'I' },
  };
  // ?v=66 (27/09/2026, rà XSS sau tấn công Tr0ngX): `type` đọc từ `tongLoi` của HS KHÁC (kho ghi không cần đăng nhập)
  // rồi nối thẳng vào innerHTML ở renderErrors/renderErrorsPb/trNhanLoai ⇒ stored XSS chéo học sinh. Nay escape luôn.
  const typeLabel = (t) => escapeHtml(t == null ? '' : String(t));
  function renderTypeBtns() {
    document.querySelectorAll('.errType').forEach((b) => {
      b.className = 'errType rounded-lg border-2 px-0.5 sm:px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight transition flex flex-row items-center justify-center gap-1.5 ' +
        (fType === b.dataset.type ? TYPE_ON : TYPE_OFF);
    });
  }

  // Ô textarea (SENTENCE / MISTAKE / EXPLANATION) tự giãn cao theo nội dung để xem HẾT chữ
  function autoGrow(el) { if (!el) return; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  function autoGrowAll() { ['fSentence', 'fDetail', 'fExplain'].forEach((id) => autoGrow($(id))); }

  function clearErrForm() {
    // XOÁ MIN/SEC sau khi thêm/sửa: tránh HS thêm 2 lỗi mà chưa chọn lại thời gian.
    // (Video đang PHÁT sẽ tự điền lại MIN/SEC theo giờ hiện tại ngay — không sao.)
    $('fMin').value = ''; $('fSec').value = '';
    $('fSentence').value = ''; $('fDetail').value = ''; $('fExplain').value = '';
    autoGrowAll();
    fType = ''; renderTypeBtns();
    editingIndex = -1;
    $('btnCancelEdit').classList.add('hidden');
    capNhatNhanNutThem();
    xoaNhapTamCham();   // (Đợt lưu nháp) form trống lại thì dọn luôn ô nhớ nháp, khỏi vương lại
  }

  // ⭐ (02/09/2026 — thầy chốt) CHỮ TRÊN NÚT ĐỎ nói đúng việc nó sắp làm:
  //   không sửa gì            → "Add this mistake"  (đỏ, thêm mới)
  //   đang sửa, còn chữ       → "Save changes"      (đỏ, lưu lại)
  //   đang sửa, TRỐNG cả 3 ô  → "Delete this mistake" (đỏ sẫm — đường xoá DUY NHẤT còn lại)
  // Xoá trắng 3 ô chính là lời xác nhận, nên không hỏi thêm pop-up nào nữa; muốn huỷ thì bấm
  // Cancel ngay bên cạnh, lỗi còn nguyên như cũ.
  function dangDinhXoa() {
    return editingIndex >= 0 && !$('fSentence').value.trim() &&
      !$('fDetail').value.trim() && !$('fExplain').value.trim();
  }
  function capNhatNhanNutThem() {
    const nhan = $('btnAddErrLabel');
    const nut = $('btnAddErr');
    if (!nhan || !nut) return;
    const xoa = dangDinhXoa();
    nhan.textContent = xoa ? 'Delete this mistake' : (editingIndex >= 0 ? 'Save changes' : 'Add this mistake');
    nut.classList.toggle('bg-rose-700', xoa);
    nut.classList.toggle('hover:bg-rose-800', xoa);
    nut.classList.toggle('bg-rose-500', !xoa);
    nut.classList.toggle('hover:bg-rose-600', !xoa);
    const ic = nut.querySelector('[data-lucide]');
    if (ic && ic.dataset.lucide !== (xoa ? 'trash-2' : 'plus-circle')) {
      ic.dataset.lucide = xoa ? 'trash-2' : 'plus-circle';
      refreshIcons();
    }
  }

  // Xoá MỀM một lỗi (mô hình 2 giữ vết `an` cho thầy phân tích; buổi cũ thì cắt hẳn khỏi mảng)
  function xoaLoiDangSua() {
    const i = editingIndex;
    if (i < 0 || i >= state.errors.length) return;
    if (state.moHinh === 2) { state.errors[i].trangThai = 'an'; state.errors[i].suaLuc = Date.now(); }
    else state.errors.splice(i, 1);
    clearErrForm();
    renderErrors();
    if (state.moHinh === 2) capNhatNutSubmit();
    autosave();
    luuNgay();   // ⭐ 05/09/2026 — sự kiện "Delete this mistake" = lưu lên kho ngay
    toast('Mistake deleted', 'info');
  }

  // (Đợt lưu nháp form CHẤM) đừng để HS gõ dở SENTENCE/MISTAKE/EXPLANATION mà lỡ thoát/tải lại
  // trang là mất sạch — lưu tạm dưới khoá RIÊNG theo saveKey (mỗi HS/mỗi video một ô nhớ, giống
  // luật CHẶNG 33), KHÔNG trộn vào state.errors thật nên không ảnh hưởng logic Submit sẵn có.
  function khoaNhapTamCham() { return saveKey + '_nhaptam'; }
  function luuNhapTamCham() {
    try {
      localStorage.setItem(khoaNhapTamCham(), JSON.stringify({
        min: $('fMin').value, sec: $('fSec').value, who: fWhoSel, type: fType,
        sentence: $('fSentence').value, detail: $('fDetail').value, explain: $('fExplain').value,
      }));
    } catch (e) {}
  }
  function xoaNhapTamCham() { try { localStorage.removeItem(khoaNhapTamCham()); } catch (e) {} }
  function khoiPhucNhapTamCham() {
    let nhap;
    try { nhap = JSON.parse(localStorage.getItem(khoaNhapTamCham()) || 'null'); } catch (e) { nhap = null; }
    if (!nhap) return;
    const coGi = nhap.sentence || nhap.detail || nhap.explain || nhap.who || nhap.type || nhap.min !== '' || nhap.sec !== '';
    if (!coGi || editingIndex >= 0) return;   // đang sửa lỗi có sẵn thì đừng đè nháp lên
    $('fMin').value = nhap.min || ''; $('fSec').value = nhap.sec || '';
    setWho(nhap.who || ''); fType = nhap.type || ''; renderTypeBtns();
    $('fSentence').value = nhap.sentence || ''; $('fDetail').value = nhap.detail || ''; $('fExplain').value = nhap.explain || '';
    autoGrowAll();
  }

  // Khi THÊM lỗi mới: LUÔN lùi 3 giây (HS nghe thấy lỗi rồi mới gõ nên mốc thật sớm hơn ~3s).
  // KHÔNG lùi khi SỬA lỗi cũ (mốc đã được lùi từ lần thêm rồi).
  const REWIND_SEC = 3;
  function addOrUpdateError() {
    if (reviewLocked) return;   // CHẶNG 29: đang XEM bài đã nộp — muốn sửa phải bấm "Edit & submit again"
    // ⭐ (02/09/2026) ĐANG SỬA mà xoá trắng cả 3 ô chữ = em muốn XOÁ câu này. Phải chặn TRƯỚC
    // mọi cửa kiểm tra bên dưới, nếu không 3 ô rỗng sẽ bị báo "please write the SENTENCE…"
    // và em không tài nào xoá được. Xoá thiếu ô (còn 1-2 ô có chữ) thì rơi xuống nhánh kiểm
    // tra như cũ — đó là sửa hỏng, không phải ý muốn xoá.
    if (dangDinhXoa()) { xoaLoiDangSua(); return; }
    const sentence = $('fSentence').value.trim();
    const detail = $('fDetail').value.trim();
    const explain = $('fExplain').value.trim();
    // BẮT BUỘC ĐỦ 6 MỤC (chặng 24-25) — kiểm theo ĐÚNG THỨ TỰ TRÊN FORM để HS sửa từ trên xuống:
    // STUDENT → TIME → TYPE → SENTENCE → MISTAKE → EXPLANATION.
    // Trước đây bỏ trống được → 39/97 dòng thật thiếu tên, có dòng thiếu giờ ⇒ app máy tính không
    // ghép được lỗi với người/với mốc video.
    const minRaw = $('fMin').value.trim();
    const secRaw = $('fSec').value.trim();
    if (!getWho()) { toast('Please choose WHO made the mistake!', 'err'); flashStudentField(); return; }
    if (minRaw === '' || secRaw === '') {
      toast('Please fill in the TIME (MIN and SEC) of the mistake!', 'err');
      flashBox($('fMin')); flashBox($('fSec'));
      (minRaw === '' ? $('fMin') : $('fSec')).focus();
      return;
    }
    if (!fType) { toast('Please choose a TYPE!', 'err'); flashTypeField(); return; }
    if (!sentence) { toast('Please write the SENTENCE that has the mistake!', 'err'); flashBox($('fSentence')); $('fSentence').focus(); return; }
    if (!detail) { toast('Please describe the MISTAKE!', 'err'); flashBox($('fDetail')); $('fDetail').focus(); return; }
    if (!explain) { toast('Please write the EXPLANATION!', 'err'); flashBox($('fExplain')); $('fExplain').focus(); return; }

    let mn = Math.max(0, parseInt(minRaw, 10) || 0);
    let sc = Math.max(0, parseInt(secRaw, 10) || 0);
    if (editingIndex < 0) {
      const tot = Math.max(0, mn * 60 + sc - REWIND_SEC);   // LUÔN lùi 3s khi thêm mới
      mn = Math.floor(tot / 60); sc = tot % 60;
    }
    const err = {
      min: mn, sec: sc,
      section: '',   // ô SECTION đã bỏ (chặng 11) — giữ field rỗng để cấu trúc Excel/Sheet không đổi
      who: getWho(),
      type: fType,
      sentence: sentence,   // MỚI (chặng 15): câu chứa lỗi
      detail: detail,
      explain: explain,
    };
    // (Đợt B) mã lỗi ỔN ĐỊNH + trạng thái: SỬA giữ nguyên mã cũ (phiếu phản biện bám theo mã),
    // THÊM MỚI sinh mã mới. Trường thừa vô hại với mô hình 1 (sheet/Excel chỉ đọc đúng cột của nó).
    if (editingIndex >= 0) {
      const cu = state.errors[editingIndex] || {};
      err.id = cu.id || taoErrId();
      err.trangThai = cu.trangThai === 'go' ? 'go' : 'song';
      err.ketLuan = cu.ketLuan || '';
    } else {
      err.id = taoErrId();
      err.trangThai = 'song';
      err.ketLuan = '';
    }
    err.suaLuc = Date.now();   // ⭐ 05/09/2026 — mốc sửa: hai máy cùng sửa một câu thì bản mới hơn thắng (`gopLoi`)
    if (editingIndex >= 0) { state.errors[editingIndex] = err; toast('Mistake updated ✓'); }
    else { state.errors.push(err); toast('Mistake added ✓ (' + state.errors.length + ' total)'); }
    clearErrForm();
    renderErrors();
    autosave();
    luuNgay();   // ⭐ 05/09/2026 — sự kiện "Add this mistake" / "Save changes" = lưu lên kho ngay
  }

  // ═══ ⭐ 05/09/2026 (thầy chốt) — ĐIỆN THOẠI: HAI CHẾ ĐỘ **CHECK** / **LIST** ══════════════
  // CHECK = khung nhập lỗi · LIST = danh sách lỗi đã bắt. Khung VIDEO nằm ngoài cả hai, nên
  // đổi qua lại thì video vẫn ở nguyên chỗ, không tải lại, không mất mốc đang xem.
  // ⛔ CHỈ đổi class trên #appScreen — việc ẩn/hiện do CSS trong media query lo (xem index.html).
  //    Đừng gán .hidden bằng JS cho #errFormCard/#errListCard: desktop phải hiện CẢ HAI, mà
  //    .hidden thì không có media query nào gỡ được ⇒ máy tính mất luôn một khung.
  // ═══ ⛔⛔ 05/09/2026 — BÁM THEO **KHUNG NHÌN THẬT** (iPhone: bàn phím ĐẨY CẢ TRANG LÊN) ═══
  // Thầy bấm thử lần 2 (ảnh 01:29): khoá `height:100dvh` VẪN chưa đủ — bật bàn phím là thanh
  // đầu trang + hai nút CHECK/LIST + video vẫn trôi khỏi màn.
  //
  // VÌ SAO: Safari trên iPhone **không thu nhỏ trang** khi bàn phím hiện. Nó giữ nguyên khung
  // bố cục (`100dvh` vẫn là chiều cao MÀN, không trừ bàn phím) rồi **đẩy cả trang lên** ở tầng
  // "visual viewport" cho lộ ô đang gõ. Cú đẩy đó nằm NGOÀI tầm với của CSS — `height:100dvh`,
  // `overflow:hidden`, `position:fixed` hay `sticky` đều không cản được.
  //
  // CÁCH CHỮA: đo bằng `window.visualViewport` (phần màn CÒN THẤY ĐƯỢC sau khi trừ bàn phím)
  // rồi ép `#appScreen` cao đúng bấy nhiêu. Trang không còn gì thừa để Safari đẩy nữa; thêm
  // `window.scrollTo(0,0)` làm chốt cho trường hợp nó vẫn cố đẩy.
  //
  // ⛔ ĐỪNG chữa bằng `transform: translateY(...)` để kéo trang xuống: `transform` tạo khung
  //    quy chiếu mới, mọi pop-up `position:fixed` bên trong (submitModal, khoHongModal…) sẽ
  //    neo nhầm vào #appScreen thay vì màn hình — đúng cái bẫy "fixed trong khối có transform".
  // ⛔ CHỈ áp dụng dưới 1024px; máy tính trả `height` về cho CSS lo, không đụng inline style.
  // ⭐ `?v=61` — dùng CHUNG cho HAI khung màn: `#appScreen` (chấm + phản biện) và `#trungScreen`
  // (KIỂM TRA TRÙNG / XÁC NHẬN TRÙNG). Cùng một bệnh thì cùng một thuốc — trước `?v=61` màn
  // trùng vẫn là `min-h-screen` + `sticky`, đúng y cách đã hỏng ở màn chấm.
  // ⛔ Nắn CẢ HAI mỗi lượt: màn đang ẩn cũng phải được TRẢ inline style về rỗng, kẻo lần sau
  //    mở ra nó còn giữ `top`/`height` đo được lúc bàn phím đang bật.
  function theoKhungNhin() {
    const vv = window.visualViewport;
    if (!vv) return;
    theoKhungNhinMot($('appScreen'), vv);
    theoKhungNhinMot($('trungScreen'), vv);
  }
  function theoKhungNhinMot(ap, vv) {
    if (!ap) return;
    if (window.innerWidth >= 1024) { ap.style.height = ''; ap.style.top = ''; return; }
    ap.style.height = Math.round(vv.height) + 'px';
    // ⛔⛔ DÒNG SỐNG CÒN (05/09 lần 3): Safari **đẩy cả trang lên** khi bàn phím hiện — visual
    // viewport lệch khỏi layout viewport một đoạn `offsetTop`. Chỉ đặt `height` là chưa đủ:
    // phần trên (thanh tím đầu trang) bị đẩy khuất, phần dưới hụt ra ĐÚNG BẰNG `offsetTop`,
    // thành vệt trắng trên bàn phím. Phải **dịch cả khung xuống** đúng bấy nhiêu.
    // ⛔ `window.scrollTo(0,0)` KHÔNG kéo lại được — đây không phải cuộn trang thường. Bản
    //    `?v=52`/`?v=53` dùng nó nên vệt dưới còn nguyên; đừng quay lại cách đó.
    ap.style.top = Math.round(vv.offsetTop) + 'px';
  }
  // ⭐ 05/09/2026 (thầy chốt) — ĐO LẠI MỘT LƯỢT NỮA SAU 350ms.
  // Bàn phím iOS **trượt lên có hoạt cảnh**, và cái thanh phụ của nó (hàng icon chìa khoá / thẻ /
  // vị trí) hiện SAU một nhịp. `visualViewport.resize` bắn ngay từ đầu hoạt cảnh nên con số đầu
  // tiên còn DƯ ra đúng phần thanh phụ đó ⇒ để lại một vệt trắng ngay trên bàn phím (thầy bắt
  // được ở ảnh 01:36). Đo lại khi mọi thứ đứng yên thì lấy được số cuối cùng.
  // ⛔ Giữ CẢ HAI lượt đo, đừng bỏ lượt ngay: chỉ đo trễ thì màn giật một nhịp mới co lại.
  let henKhungNhin = null;
  function theoKhungNhinTre() {
    theoKhungNhin();
    clearTimeout(henKhungNhin);
    henKhungNhin = setTimeout(theoKhungNhin, 350);
  }

  // ⛔ Màn PHẢN BIỆN không có form ⇒ bỏ qua (CSS cũng đã có chốt `:not(.pb-mode)`).
  let dsChe = 'check';
  function datCheDoDs(che) {
    if (state.cheDo === 'phanbien') return;
    dsChe = (che === 'list') ? 'list' : 'check';
    const el = $('appScreen');
    el.classList.toggle('ds-check', dsChe === 'check');
    el.classList.toggle('ds-list', dsChe === 'list');
    // Ba đường vào màn chấm đều đi qua đây ⇒ đo lại khung nhìn một lượt ngay khi màn hiện ra
    // (lúc `noiSuKien()` chạy thì #appScreen còn đang ẩn, đo được cũng không có nghĩa).
    theoKhungNhin();
    document.querySelectorAll('#dsTab .dsBtn').forEach((b) => {
      const on = b.dataset.ds === dsChe;
      b.classList.toggle('bg-indigo-600', on);
      b.classList.toggle('text-white', on);
      b.classList.toggle('text-slate-500', !on);
    });
  }
  // Số trên nút LIST = đúng số câu đang hiện trong danh sách (câu đã xoá 'an' không tính).
  function capNhatSoDs(n) {
    const o = $('dsSo');
    if (!o) return;
    o.textContent = n;
    o.classList.toggle('hidden', !n);
  }

  function renderErrors() {
    if (state.cheDo === 'phanbien') { renderErrorsPb(); return; }
    const list = $('errList');
    const m2Mode = state.moHinh === 2;
    // (Đợt B) mô hình 2: 'an' (em tự xoá) KHÔNG hiện.
    let ds = state.errors.map((e, i) => ({ e, i }));
    if (m2Mode) ds = ds.filter((x) => x.e.trangThai !== 'an');
    ds.sort((a, b) => (tSec(a.e) - tSec(b.e)));
    // ⭐ (Đợt Keep/Accept 02/09/2026 — thầy chốt) SỐ THỨ TỰ CHUẨN: chốt SỐ ngay tại đây, trên
    // danh sách xếp thuần theo mốc giờ, TRƯỚC khi dồn câu. Bản cũ in `pos + 1` = vị trí SAU KHI
    // dồn ⇒ bật nút REQUIREMENT một cái là cả bảng nhảy số, thầy và học sinh không còn đối
    // chiếu "câu số mấy" với nhau được. Nay số bám theo CÂU, dồn kiểu gì cũng đứng yên.
    const sttChuan = {};
    ds.forEach((x, k) => { sttChuan[x.e.id || ('#' + x.i)] = k + 1; });
    // Bật nút REQUIREMENT thì câu còn tranh chấp THẬT + chưa xử lý dồn lên đầu (thầy chốt).
    // ⛔ Câu đã Accept ('go') KHÔNG còn bị đẩy xuống cuối như bản cũ — thầy chốt cho em đổi ý
    // thoải mái, mà chìm xuống đáy danh sách thì em không tìm lại nổi để bấm lại.
    if (m2Mode && m2.disOn) {
      const hang = (x) => (!x.e.ketLuan && tranhChapThat(x.e) ? 0 : 1);
      ds.sort((a, b) => hang(a) - hang(b) || (tSec(a.e) - tSec(b.e)));
    }
    list.innerHTML = ds.map(({ e, i }) => {
      const st = TYPE_STYLE[e.type] || { badge: 'bg-slate-100 text-slate-600' };
      const daGo = m2Mode && e.trangThai === 'go';
      const phieu = m2Mode ? phieuCuaLoi(e.id) : [];
      // (Đợt khung vàng) MỌI lỗi có ≥1 phiếu phản đối → viền vàng — KHÔNG tự tắt dù đã KEEP/AGREE
      // (thầy chốt: giữ như dấu vết lịch sử, badge KEPT/RELEASED đã đánh dấu riêng phần đã quyết).
      const phieuPhanDoi = phieu.filter((p) => p.y === 'phanDoi');
      // ⭐ (Đợt CHÍNH CHỦ QUYẾT) tranh chấp THẬT mới được viền vàng + 2 nút. Chính chủ đã tự
      // nhận thì câu coi như chốt: lý do cãi hộ của đồng đội VẪN HIỆN bình thường (thầy chốt)
      // nhưng chỉ còn là tham khảo, ô sang viền xanh lá như mọi câu đã ngã ngũ.
      const conTranhChap = m2Mode && tranhChapThat(e);
      // ⭐ (Đợt viền xanh lá — thầy chốt) câu đã có người AGREE mà không còn tranh chấp ⇒ viền
      // XANH LÁ DÀY BẰNG viền vàng, nền để trắng (chỉ ô tranh chấp mới có nền vàng).
      const daNgaNgu = m2Mode && !conTranhChap && phieu.some((p) => p.y === 'dongY');
      // Icon uploaded (chấm xanh trái ô): câu này ĐÃ nằm trên kho đúng y bản đang thấy
      const daLuu = m2Mode && m2LoiDaDongBo(e);
      // (Đợt viền dày hơn) đổi hẳn ĐỘ DÀY viền cho câu tranh chấp (border-4) thay vì chỉ đổi màu
      // trên viền 1px cũ — viền mỏng amber-400 quá mờ, khó nhận ra giữa các ô khác.
      return '<div class="slidein rounded-2xl p-3.5 transition group ' +
        (daGo ? 'err-go ' : '') +
        (conTranhChap ? 'border-4 border-amber-400 bg-amber-100/60' :
          daNgaNgu ? 'border-4 border-emerald-400' :
            'border border-slate-200' + (daGo ? '' : ' hover:border-indigo-300')) + '">' +
        '<div class="flex items-center gap-2 flex-wrap">' +
        (m2Mode ? '<span class="shrink-0 w-4 h-4 rounded-full flex items-center justify-center ' +
          (daLuu ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400') + '" title="' +
          (daLuu ? 'Saved to server' : 'Not saved yet') + '"><i data-lucide="' + (daLuu ? 'check' : 'arrow-up') + '" class="w-2.5 h-2.5 pointer-events-none"></i></span>' : '') +
        // CHẶNG 33: STT đứng TRƯỚC mốc giờ. Đánh theo THỨ TỰ THỜI GIAN → khớp cách đánh số của
        // file Excel bên app máy tính. (02/09/2026) lấy từ bảng `sttChuan` chốt sẵn ở trên,
        // KHÔNG dùng vị trí sau khi dồn — xem chú thích chỗ dựng bảng đó.
        '<span class="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center">' + (sttChuan[e.id || ('#' + i)] || '') + '</span>' +
        // ⭐ (04/09/2026 — thầy chốt) Ô giờ BẤM ĐƯỢC y như màn phản biện (`data-pbseek`):
        // bấm = nhảy tới giây đó rồi chạy · bấm lại = về đúng giây đó chạy tiếp · ĐÚP = tạm dừng.
        '<button data-erseek="' + tSec(e) + '" title="Bấm để xem đoạn này · bấm đúp để dừng" ' +
          'class="font-mono font-bold text-sm bg-slate-900 text-white rounded-lg px-2 py-0.5 hover:bg-indigo-700 transition">' + fmtTime(e) + '</button>' +
        (e.section ? '<span class="text-xs font-bold text-slate-500">Section ' + escapeHtml(e.section) + '</span>' : '') +
        '<span class="text-xs font-bold rounded-full px-2.5 py-1 ' + st.badge + '">' + typeLabel(e.type) + '</span>' +
        (e.who ? '<span class="text-xs font-semibold text-slate-600 flex items-center gap-1">👤 ' + escapeHtml(e.who) + '</span>' : '') +
        (daGo ? '<span class="text-[10px] font-extrabold text-slate-400 border border-slate-300 rounded-full px-2 py-0.5">RELEASED</span>' : '') +
        (m2Mode && e.ketLuan === 'keep' ? '<span class="text-[10px] font-extrabold text-rose-500 border border-rose-300 rounded-full px-2 py-0.5">KEPT</span>' : '') +
        '<span class="ml-auto flex items-center gap-1">' +
        // (Đợt B) avatar người chấp nhận (nền xanh) / phản đối (nền đỏ) — bấm mở pop-up nội dung
        (phieu.length ? '<span class="flex items-center mr-1">' + phieu.map((p) => avatarVong(p.voter, p.y, e.id)).join('') + '</span>' : '') +
        // ⛔ (02/09/2026 — thầy chốt) NÚT THÙNG RÁC ĐÃ BỎ, đừng dựng lại. Xoá nay đi qua nút bút
        // chì: xoá trắng cả 3 ô SENTENCE/MISTAKE/EXPLANATION thì nút đỏ tự thành "Delete this
        // mistake" (xem `capNhatNhanNutThem()`), vừa chậm lại một nhịp vừa bắt em nhìn kỹ câu
        // mình sắp bỏ. Nút bút chì vẫn LUÔN hiện kể cả câu đã Accept — em còn sửa chữ được.
        '<span class="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">' +
        '<button data-edit="' + i + '" class="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600"><i data-lucide="pencil" class="w-4 h-4 pointer-events-none"></i></button>' +
        '</span>' +
        '</span></div>' +
        // CHẶNG 35 (thầy chốt): thứ tự SENTENCE → MISTAKE → EXPLANATION, mỗi dòng một kiểu chữ:
        // câu chứa lỗi = ĐEN đậm NGHIÊNG · lỗi = ĐỎ đậm thường · giải thích = XANH LÁ đậm thường.
        (e.sentence ? '<div class="mt-1.5 text-sm font-bold italic text-slate-900">“' + escapeHtml(e.sentence) + '”</div>' : '') +
        '<div class="mt-0.5 text-sm font-bold text-rose-600">' + escapeHtml(e.detail) + '</div>' +
        (e.explain ? '<div class="mt-0.5 text-sm font-bold text-emerald-600">' + escapeHtml(e.explain) + '</div>' : '') +
        // (Đợt khung vàng) hiện đủ TỪNG DÒNG "TÊN: lý do" của mọi người đã phản đối, không chỉ avatar
        (phieuPhanDoi.length ? '<div class="mt-2 pt-2 border-t ' +
          (conTranhChap ? 'border-amber-200' : 'border-slate-200') + ' space-y-1">' +
          phieuPhanDoi.map((p) => '<div class="text-xs font-bold ' +
            (conTranhChap ? 'text-amber-700' : 'text-slate-400') + '"><b>' +
            escapeHtml(p.voter) + '</b>: ' + escapeHtml(p.lyDo || '(no reason given)') + '</div>').join('') +
          // Chính chủ đã tự nhận ⇒ mấy dòng cãi hộ này chỉ còn là tham khảo (thầy chốt: VẪN
          // HIỆN bình thường, chỉ hạ màu cho khỏi tưởng là còn việc phải xử).
          (conTranhChap ? '' :
            '<div class="text-[10px] font-bold text-slate-400 italic">' +
            escapeHtml(e.who || '') + ' agreed — the notes above are for reference only.</div>') +
          '</div>' : '') +
        // ⭐ (02/09/2026 — thầy chốt) HAI NÚT quyết định, hàng CUỐI CÙNG trong ô, mỗi nút gần nửa
        // chiều ngang. CHỈ hiện ở ô còn tranh chấp THẬT — ô không ai cãi thì chẳng có gì để giữ
        // hay nhường. Bấm được cả sau khi đã gửi: đổi ý xong nút góc phải tự sang vàng UPDATE.
        (conTranhChap ? '<div class="mt-2.5 flex gap-2">' +
          '<button data-ka="keep" data-err="' + escapeHtml(e.id) + '"' +
          ' class="flex-1 rounded-xl border-2 py-1.5 text-xs font-extrabold transition ' +
          (e.ketLuan === 'keep' ? 'border-amber-500 bg-amber-500 text-white'
            : 'border-amber-300 text-amber-700 hover:bg-amber-50' + (e.ketLuan === 'agree' ? ' ka-mo' : '')) +
          '">Keep Issue</button>' +
          '<button data-ka="agree" data-err="' + escapeHtml(e.id) + '"' +
          ' class="flex-1 rounded-xl border-2 py-1.5 text-xs font-extrabold transition ' +
          (e.ketLuan === 'agree' ? 'border-blue-600 bg-blue-600 text-white'
            : 'border-blue-300 text-blue-700 hover:bg-blue-50' + (e.ketLuan === 'keep' ? ' ka-mo' : '')) +
          '">Accept Appeal</button>' +
          '</div>' : '') +
        '</div>';
    }).join('');
    $('errEmpty').style.display = ds.length ? 'none' : '';
    capNhatSoDs(ds.length);   // ⭐ 05/09: số đỏ trên nút LIST của điện thoại

    // đếm theo loại (badge tab đã bỏ cùng tab bar ở chặng 12)
    // CHẶNG 33: dùng CHỮ CÁI G/P/I (không phải tên đầy đủ) — tên đầy đủ làm ô cuối lòi ra ngoài
    // khung trên điện thoại nhỏ. Chữ cái in đậm + `whitespace-nowrap` để không bao giờ vỡ dòng.
    // (Đợt B) mô hình 2: chỉ đếm câu CÒN SỐNG — câu 'go'/'an' không tính (thầy chốt).
    const counts = {};
    (m2Mode ? state.errors.filter((e) => e.trangThai === 'song') : state.errors)
      .forEach((e) => { counts[e.type] = (counts[e.type] || 0) + 1; });
    $('errStats').innerHTML = Object.keys(TYPE_STYLE)
      .filter((t) => counts[t])
      .map((t) => '<span title="' + typeLabel(t) + '" class="rounded-full px-2 py-1 font-extrabold whitespace-nowrap ' +
        TYPE_STYLE[t].badge + '">' + TYPE_STYLE[t].short + ': ' + counts[t] + '</span>').join('');
    if (m2Mode) { capNhatNutDis(); capNhatNutSubmit(); }

    // ⛔ (02/09/2026) nút "Delete all" đã bỏ hẳn — xem chú thích trong index.html chỗ khung này.
    refreshIcons();
  }
  function tSec(e) { return (parseInt(e.min, 10) || 0) * 60 + (parseInt(e.sec, 10) || 0); }
  // ⛔ (02/09/2026) `sortedPositionOf()` ĐÃ GỠ cùng pop-up hỏi xoá — nó là chỗ DUY NHẤT gọi.
  // Nhân tiện nó vốn ĐẾM SAI: xếp trên `state.errors` NGUYÊN VẸN, tính cả câu đã ẩn ('an'),
  // nên số "#mấy" trong pop-up lệch với số hiện trên màn. Số thứ tự nay chốt một chỗ duy nhất
  // là bảng `sttChuan` trong `renderErrors()` — đừng dựng lại hàm đếm thứ hai.
  function fmtTime(e) {
    if (e.min === '' && e.sec === '') return '--:--';
    return String(e.min || 0).padStart(2, '0') + ':' + String(e.sec || 0).padStart(2, '0');
  }

  // ═══════════════ TIMER (thời gian nói) ═══════════════
  // ⛔ 05/09/2026: KHÔNG CÒN Ô NHẬP nào cho phần này (thầy chốt bỏ 4 ô dưới mỗi tên). Khối này
  // giữ lại thuần để KHÔNG LÀM MẤT dữ liệu cũ: bài buổi trước trên kho có timers thật, nạp
  // vào rồi gửi lại y nguyên — bỏ trường đi là `fsPatch` ghi đè xoá sạch (LUẬT 9️⃣).
  // timers LUÔN = đúng danh sách thành viên đội được chấm (không thêm/bớt/đổi tên).
  // Khôi phục bài dở: khớp theo TÊN (0 là giá trị hợp lệ nên không dùng || '').
  function initTimers(saved) {
    const val = (v) => (v === undefined || v === null) ? '' : v;
    state.timers = state.members.map((m) => {
      const old = (saved || []).find((t) => t.name === m) || {};
      return { name: m, sMin: val(old.sMin), sSec: val(old.sSec), eMin: val(old.eMin), eSec: val(old.eSec) };
    });
  }

  // ⛔ 05/09/2026 — ĐÃ GỠ BỐN HÀM KIỂM Ô GIỜ NÓI, đừng dựng lại:
  //     missingTimerFields · markMissingTimers · markBadTimerRows · validateTimerRanges
  // Chúng phục vụ 4 ô giờ dưới mỗi tên, mà bộ ô đó đã bỏ hẳn (thầy chốt) ⇒ không còn gì để
  // kiểm, và nếu để nguyên hai tầng chặn trong `openSubmitModal()` thì KHÔNG AI NỘP ĐƯỢC BÀI.
  // `initTimers()` + `cleanTimers()` thì GIỮ: bài buổi cũ trên kho vẫn có timers thật, nạp
  // sao gửi vậy để lượt ghi mới không xoá mất chúng (LUẬT 9️⃣ — fsPatch ghi đè cả tài liệu).
  // `timerRangeOf()` cũng giữ vì `autoPickStudent()` còn dùng cho buổi cũ.

  // ═══════════════ NỘP BÀI ═══════════════
  function cleanTimers() {
    return state.timers.filter((t) => t.name.trim() || t.sMin !== '' || t.eMin !== '' || t.sSec !== '' || t.eSec !== '');
  }

  function openSubmitModal() {
    // (Đợt B) màn PHẢN BIỆN: Submit = gửi các phiếu đồng ý/phản đối, không có tóm tắt/timers
    if (state.cheDo === 'phanbien') { submitPb(); return; }
    // (Đợt B) mô hình 2 ĐÃ nộp lần nào thì cho gửi cập nhật kể cả khi đã xoá hết câu (đồng bộ vết xoá)
    const chuaCoGi = state.moHinh === 2
      ? (!state.errors.length && !m2.daNopLanNao)
      : !state.errors.length;
    if (chuaCoGi) { toast('No mistakes to submit yet. Watch the video closely!', 'err'); return; }
    // ⛔ 05/09/2026 — HAI TẦNG CHẶN THEO Ô GIỜ NÓI ĐÃ GỠ, cùng đợt bỏ 4 ô giờ dưới tên.
    // BẮT BUỘC gỡ, không phải dọn cho gọn: ô nhập đã biến mất thì hai tầng đó không bao giờ
    // qua được nữa ⇒ giữ lại là KHOÁ CỨNG nút Submit của cả lớp. Bốn hàm phục vụ chúng
    // (missingTimerFields / markMissingTimers / markBadTimerRows / validateTimerRanges) cũng
    // đã gỡ khỏi file — xem chú thích tại chỗ cũ của chúng.
    // CHẶNG 35 (thầy chốt): icon ĐƠN SẮC (bỏ emoji nhiều màu) · BỎ dòng "Students timed" ·
    // số lỗi ≤ ÍT_LỖI thì tô ĐỎ và khi bấm Submit sẽ hỏi thêm một lần nữa.
    const it = (name) => '<i data-lucide="' + name + '" class="w-4 h-4 text-slate-400 shrink-0"></i>';
    // (Đợt B) mô hình 2: đếm câu CÒN SỐNG; nộp lại = CẬP NHẬT bản tổng (không đẻ bản mới)
    const soLoi = state.moHinh === 2
      ? state.errors.filter((e) => e.trangThai === 'song').length
      : state.errors.length;
    const few = soLoi <= IT_LOI;
    const s = $('submitSummary');
    s.innerHTML =
      '<div class="flex items-center gap-2">' + it('user') + '<span>Checked by: <b>' + escapeHtml(state.student) + '</b>' + (state.myTeam ? ' (' + escapeHtml(state.myTeam) + ')' : '') + '</span></div>' +
      (state.checkedTeam ? '<div class="flex items-center gap-2">' + it('users') + '<span>Team checked: <b>' + escapeHtml(state.checkedTeam) + '</b></span></div>' : '') +
      '<div class="flex items-center gap-2">' + it('flag') + '<span>Mistakes found: <b class="' + (few ? 'text-rose-600' : '') + '">' + soLoi + '</b></span></div>' +
      (state.submitted ? '<div class="flex items-center gap-2 text-slate-500">' + it('info') + '<span>' +
        (state.moHinh === 2 ? 'You\'ve already submitted — this will update your saved check.'
                            : 'You\'ve already submitted once — submitting again creates a new copy.') + '</span></div>' : '');
    $('submitModal').classList.remove('hidden');
    $('submitModal').classList.add('flex');
    refreshIcons();
  }
  function closeSubmitModal() {
    $('submitModal').classList.add('hidden');
    $('submitModal').classList.remove('flex');
  }

  // (Đợt Firebase) NỘP VÀO FIRESTORE — 1 lượt nộp = 1 tài liệu, mã sid làm tên tài liệu.
  // Lưới "nộp thiếu" (CHẶNG 32) tự đếm ở đây: xem lượt gần nhất của chính em trước khi ghi —
  // lượt mới ÍT LỖI HƠN thì VẪN ghi (không bao giờ chặn bài), chỉ trả cờ để nhắc.
  async function submitFs(payload) {
    let canhBao = null;
    try {
      const cu = await baiCuaEmFs(state.buoiId, state.student);
      if (cu.length) {
        const truoc = (cu[0].errors || []).length;
        if (payload.errors.length < truoc) canhBao = { truoc, nay: payload.errors.length };
      }
    } catch (e) { /* lưới phụ — hỏng thì thôi, không được cản bài nộp */ }
    const sid = taoSid();
    await nopFs(state.buoiId, sid, {
      sid,
      submittedAt: payload.submittedAt,
      classCode: payload.classCode, lesson: payload.lesson,
      student: payload.student, myTeam: payload.myTeam,
      checkedTeam: payload.checkedTeam,
      videoUrl: payload.videoUrl, videoId: payload.videoId,
      errors: payload.errors, timers: payload.timers,
      createdAt: Date.now(),
    });
    return { ok: true, saved: payload.errors.length, submissionId: sid, canhBaoNopThieu: canhBao };
  }

  async function submit() {
    // (Đợt B) mô hình 2: MỘT phát ghi cả bản tổng (create hay update như nhau) + pop-up loading
    if (state.moHinh === 2) { submitM2(); return; }
    closeSubmitModal();
    if (!state.khoFs && !SCRIPT_URL) {
      toast('The app isn\'t connected to Google Sheets yet — please tap "Export Excel" and send the file to your teacher!', 'err');
      return;
    }
    const btn = $('btnSubmit');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Submitting…';
    refreshIcons();
    try {
      const payload = {
        submittedAt: new Date().toISOString(),
        classCode: state.classCode, className: state.className,
        lesson: state.lesson, topic: state.topic,
        student: state.student, myTeam: state.myTeam,
        checkedTeam: state.checkedTeam,
        videoUrl: state.videoUrl, videoId: state.videoId,
        errors: state.errors, timers: cleanTimers(),
      };
      let out;
      if (state.khoFs) {
        // Kho mới: buổi do app đẩy lên Firestore thì bài nộp cũng vào Firestore —
        // KHÔNG rơi về Sheets kẻo dữ liệu một buổi nằm hai kho.
        out = await submitFs(payload);
      } else {
        const res = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
        out = await res.json();
      }
      if (!out.ok) throw new Error(out.error || 'unknown');
      state.submitted = true;
      state.wasSubmitted = true;   // CHẶNG 29: cờ ĐÃ TỪNG NỘP — giữ bài trong "My submitted checks" kể cả khi mở khoá sửa
      autosave();
      // (CHẶNG 32) bộ não báo lượt này ÍT LỖI HƠN lượt gần nhất → nhắc (bài VẪN đã ghi, không chặn)
      if (out.canhBaoNopThieu && typeof out.canhBaoNopThieu.truoc === 'number') {
        $('fewerNow').textContent = out.canhBaoNopThieu.nay;
        $('fewerBefore').textContent = out.canhBaoNopThieu.truoc;
        $('fewerModal').classList.remove('hidden');
        $('fewerModal').classList.add('flex');
        refreshIcons();
      } else {
        toast('🎉 Submitted successfully! Thank you.');
      }
    } catch (e) {
      toast('Submission failed (' + e.message + '). Try again or tap Export Excel to send to your teacher.', 'err');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Submit';
      refreshIcons();
    }
  }

  // ═══════════════ EXPORT EXCEL (khớp mẫu SPEAKING TEAM CHECK FORM mới — TIẾNG ANH) ═══════════════
  // 2 sheet khớp mẫu mới của thầy:
  //   TIMER: STUDENT | MIN START | SEC START | MIN END | SEC END
  //   FORM : NO | MIN | SEC | STUDENT | TYPE | SENTENCE | MISTAKE | EXPLANATION | CHECKER
  /* ⭐ `?v=63` (06/09/2026, rà soát đêm) — THƯ VIỆN EXCEL NẠP KHI BẤM, KHÔNG NẠP SẴN.
     `xlsx.full.min.js` nặng 325 KB (đã gzip) và từng nằm CHẶN trong <head> của index.html, trong
     khi cả trang chỉ dùng nó ở đúng hàm này — việc của thầy, học sinh trên iPhone không bao giờ
     bấm. Nay tải lúc cần; tải hỏng thì báo rõ, không nuốt. */
  const XLSX_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  let napXlsxP = null;
  function napXLSX() {
    if (window.XLSX) return Promise.resolve();
    if (!napXlsxP) {
      napXlsxP = new Promise((ok, hong) => {
        const s = document.createElement('script');
        s.src = XLSX_URL;
        s.onload = () => ok();
        s.onerror = () => { napXlsxP = null; hong(new Error('Could not load the Excel library')); };
        document.head.appendChild(s);
      });
    }
    return napXlsxP;
  }
  async function exportExcel() {
    try { await napXLSX(); } catch (e) { toast(e.message + ' — check your internet and try again', 'err'); return; }
    const wb = XLSX.utils.book_new();

    // Sheet TIMER (thời gian nói)
    const timerAoa = [['STUDENT', 'MIN START', 'SEC START', 'MIN END', 'SEC END']];
    cleanTimers().forEach((t) => timerAoa.push([t.name, num(t.sMin), num(t.sSec), num(t.eMin), num(t.eSec)]));
    const wsT = XLSX.utils.aoa_to_sheet(timerAoa);
    wsT['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsT, 'TIMER');

    // Sheet FORM (bảng bắt lỗi)
    const formAoa = [['NO', 'MIN', 'SEC', 'STUDENT', 'TYPE', 'SENTENCE', 'MISTAKE', 'EXPLANATION', 'CHECKER']];
    state.errors.slice().sort((a, b) => tSec(a) - tSec(b)).forEach((e, idx) => {
      formAoa.push([idx + 1, num(e.min), num(e.sec), e.who, e.type, e.sentence, e.detail, e.explain, state.student]);
    });
    const wsF = XLSX.utils.aoa_to_sheet(formAoa);
    wsF['!cols'] = [{ wch: 5 }, { wch: 6 }, { wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 42 }, { wch: 40 }, { wch: 45 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsF, 'FORM');

    const name = 'SPEAKING CHECK' +
      (state.checkedTeam ? ' - ' + state.checkedTeam : '') +
      ' - ' + (state.student || 'Student') + '.xlsx';
    XLSX.writeFile(wb, name.replace(/[\\/:*?"<>|]/g, ''));
    toast('Excel file exported ✓');
  }
  function num(v) { return v === '' || v == null ? null : (parseInt(v, 10) || 0); }

  // ═══════════════ TIỆN ÍCH ═══════════════
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function refreshIcons() { if (window.lucide) lucide.createIcons(); }

  // ═══════════════ KHỞI ĐỘNG — luồng 1 LINK CHUNG + đăng nhập lớp ═══════════════

  // Tải danh sách lớp + bài đang chạy.
  // (Đợt Firebase) ƯU TIÊN kho FIRESTORE — trả lời dưới 1 giây, thầy ra bài mới là thấy ngay.
  // Bộ não Apps Script cũ vẫn được hỏi NGẦM PHÍA SAU (8-40 giây) rồi GHÉP THÊM những lớp chưa
  // có buổi Firestore — buổi cũ trong Google Sheets vẫn đăng nhập được, chỉ hiện muộn hơn.
  // Lớp ĐÃ có buổi Firestore thì buổi Sheets cùng lớp bị che (kho mới thắng, tránh nộp lệch kho).
  // Cả hai kho hỏng thì CLASSES giữ nguyên `{classes: []}` — màn đăng nhập báo chưa có lớp.
  // (02/09/2026) Không còn dự phòng file tĩnh data/classes.json (đã bỏ khỏi kho PUBLIC).
  async function loadClasses() {
    let coFs = false;
    try {
      const ds = await buoiDangMoFs();
      if (ds.length) { CLASSES = { classes: ds }; fixClassNames(); coFs = true; }
    } catch (e) { /* chưa dán luật / mạng — coi như kho mới trống */ }

    // Bộ não cũ: có buổi Firestore rồi thì hỏi NGẦM (không chờ); chưa có gì thì đành chờ như xưa
    const hoiGas = async () => {
      if (!SCRIPT_URL) return false;
      try {
        const r = await fetch(SCRIPT_URL + '?config=1&_=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) return false;
        const j = await r.json();
        if (!(j && Array.isArray(j.classes) && j.classes.length)) return false;
        const daCo = {};
        (CLASSES.classes || []).forEach((c) => { daCo[String(c.classCode || '').toUpperCase()] = 1; });
        const them = j.classes.filter((c) => !daCo[String(c.classCode || '').toUpperCase()]);
        if (them.length) { CLASSES.classes = (CLASSES.classes || []).concat(them); fixClassNames(); }
        return true;
      } catch (e) { return false; }
    };

    if (coFs) { hoiGas(); return; }     // kho mới có bài → vào ngay, kho cũ ghép thêm sau
    if (await hoiGas()) return;
    CLASSES = { classes: [] };
  }
  // (CHẶNG 32) UI là 100% tiếng Anh nhưng cột NAME trong sheet CẤU HÌNH đang là "Lớp B2B"…
  // → chuẩn hoá NGAY KHI NẠP: "Lớp X" thành "CLASS X" (sheet giữ nguyên, chỉ đổi hiển thị).
  function fixClassNames() {
    (CLASSES.classes || []).forEach((c) => {
      if (c && c.name) c.name = String(c.name).replace(/^L[ớơo]?p\s+/i, 'CLASS ');
    });
  }

  // Màn 1 — đăng nhập lớp: HS TỰ GÕ mã lớp (classCode) + mã (code)
  function initLoginScreen() {
    if (!(CLASSES.classes || []).length) {
      toast('Chưa có buổi speaking nào đang mở. Thầy cần mở buổi trong app mySpeaking.', 'err');
    }
  }

  function showLoginErr() { $('loginErrModal').classList.remove('hidden'); $('loginErrModal').classList.add('flex'); }
  function hideLoginErr() { $('loginErrModal').classList.add('hidden'); $('loginErrModal').classList.remove('flex'); }

  function handleLogin() {
    const cv = $('inpClass').value.trim().toLowerCase();
    const code = $('inpCode').value.trim().toLowerCase();
    // phải khớp CẢ classCode LẪN code mới vào được
    const cls = (CLASSES.classes || []).find((c) =>
      String(c.classCode || '').toLowerCase() === cv && String(c.code || '').toLowerCase() === code);
    if (!cls) { showLoginErr(); return; }
    session.class = cls;
    renderIdentify();
    $('loginScreen').classList.add('hidden');
    $('identifyScreen').classList.remove('hidden');
    refreshIcons();
  }

  // Màn 2 — chọn tên: 2 ô CẠNH NHAU — Your Team (nạp đội) + Your Name (KHÓA đến khi chọn team)
  function renderIdentify() {
    const cls = session.class;
    $('identHeader').innerHTML =
      '<h2 class="text-lg font-extrabold text-slate-900 leading-tight">' + escapeHtml(cls.name) +
      (cls.topic ? ' — ' + escapeHtml(cls.topic) : '') + '</h2>' +
      '<p class="text-sm text-slate-500 mt-0.5">Pick your team, then choose your name.</p>';
    $('selTeam').innerHTML = '<option value="">— Team —</option>' +
      (cls.teams || []).map((t) => '<option value="' + t.team + '">TEAM ' + t.team + '</option>').join('');
    resetNameSelect();
    $('identPick').classList.remove('hidden');
    $('identConfirm').classList.add('hidden');
  }
  // Ô Your Name về rỗng + KHÓA (mờ) — dùng khi chưa chọn team
  function resetNameSelect() {
    const sn = $('selName');
    sn.innerHTML = '<option value="">— Name —</option>';
    sn.value = '';
    sn.disabled = true;
    sn.classList.add('bg-slate-100', 'text-slate-400');
    sn.classList.remove('bg-white', 'text-slate-800');
    $('selTeam').value = '';
  }
  // Chọn Team → nạp tên đội đó vào Your Name + MỞ KHÓA
  function onTeamChange() {
    const teamNo = $('selTeam').value;
    const sn = $('selName');
    if (!teamNo) { resetNameSelect(); return; }
    const team = (session.class.teams || []).find((t) => String(t.team) === String(teamNo));
    sn.innerHTML = '<option value="">— Name —</option>' +
      ((team && team.members) || []).map((m) => '<option value="' + escapeHtml(m) + '">' + escapeHtml(m) + '</option>').join('');
    sn.value = '';
    sn.disabled = false;
    sn.classList.remove('bg-slate-100', 'text-slate-400');
    sn.classList.add('bg-white', 'text-slate-800');
  }

  function initialsOf(name) {
    const p = String(name).trim().split(/\s+/).filter(Boolean);
    return ((p[0] || '')[0] + (p.length > 1 ? (p[p.length - 1] || '')[0] : '')).toUpperCase();
  }
  // Ảnh HS (dữ liệu chuẩn sau): lớp có thể có "photos": {"TÊN": "url"}; chưa có thì hiện chữ cái đầu
  function photoFor(cls, name) { return (cls.photos && cls.photos[name]) || ''; }
  function setStartEnabled(on) {
    const b = $('btnStartCheck');
    b.disabled = !on;
    b.classList.toggle('opacity-50', !on);
    b.classList.toggle('cursor-not-allowed', !on);
  }

  // Chọn tên → tính đội mình + đội phải chấm → màn xác nhận (ảnh + cam kết)
  function handleNamePick(teamNo, name) {
    const cls = session.class;
    const pair = (cls.pairs || []).find((p) => Number(p.checker) === Number(teamNo));
    if (!pair) { toast('This team has no video to check yet.', 'err'); return; }
    const checked = (cls.teams || []).find((t) => Number(t.team) === Number(pair.checked));
    if (!checked) { toast('Missing the team to check.', 'err'); return; }

    state.student = name;
    state.myTeam = 'TEAM ' + teamNo;
    state.checkedTeam = 'TEAM ' + pair.checked;
    state.members = checked.members || [];
    state.videoUrl = checked.video || '';
    const vp = parseVideoUrl(state.videoUrl);
    state.videoId = (vp && vp.id) ? vp.id : '';   // mã video (để bộ não/app máy tính ghép đúng video)
    state.lesson = cls.lesson || cls.topic || '';
    state.topic = cls.topic || cls.lesson || '';
    state.className = cls.name || cls.id;
    state.classCode = cls.classCode || cls.id;    // khóa route tới đúng file lớp
    state.khoFs = cls._kho === 'fs';              // (Đợt Firebase) buổi này nộp vào kho nào
    state.buoiId = state.khoFs ? maBuoi(state.classCode, state.lesson) : '';
    state.moHinh = state.khoFs && cls._moHinh === 2 ? 2 : 1;   // (Đợt B) bản tổng lỗi hay nhiều-lần-nộp
    state.cheDo = 'cham';                         // đường đăng nhập cũ chỉ có màn chấm
    // (Đợt 3) video mọi đội — cho pop-up "All team videos" khi bấm logo
    state.clips = (cls.teams || []).map((t) => ({ t: t.team, v: t.video || '' }));
    saveKey = makeSaveKey(state.student, state.videoUrl);

    // ảnh HS: dùng ảnh thật nếu có, tạm thời hiện chữ cái đầu
    const photo = photoFor(cls, name);
    const ph = $('identPhoto');
    if (photo) { ph.style.backgroundImage = 'url("' + photo + '")'; ph.textContent = ''; }
    else { ph.style.backgroundImage = ''; ph.textContent = initialsOf(name); }

    $('identName').textContent = name;
    $('identTeams').innerHTML = 'You are in <b>Team ' + teamNo + '</b> · You will check <b>Team ' + pair.checked + '</b>';
    $('identNoteTitle').textContent = name + ', Andrew has something for you.';

    $('chkAgree').checked = false;
    setStartEnabled(false);

    $('identPick').classList.add('hidden');
    $('identConfirm').classList.remove('hidden');
    renderReviewSection();   // (CHẶNG 32) lịch sử bài đã nộp hiện Ở TRANG NÀY (thầy chốt chuyển từ màn đăng nhập sang)
    refreshIcons();
  }

  // ═══════════════ VÀO THẲNG TỪ myLesson (20/08/2026) ═══════════════
  // Trang lớp bên myLesson (lesson.andrewclasses.com) có thẻ SPEAKING CHECK. Bấm thẻ, bên đó hỏi
  // bộ não xem em thuộc đội nào / chấm đội nào, rồi mở tab sang đây kèm GÓI dữ liệu trên link:
  //     index.html?goi=<base64url của JSON>
  // Có gói thì BỎ CẢ BA MÀN (mã lớp · chọn team+tên · xác nhận) và vào thẳng bài — thầy chốt.
  //
  // ⛔ VÀO BẰNG GÓI THÌ KHÔNG GỌI loadClasses(): bộ não đo được 8-40 giây, mà mọi thứ cần biết đã
  //    nằm trong gói rồi. Gọi lại là mất trắng cái nhanh vừa đổi được.
  // ⛔ `goi.ten` là TÊN TRONG BUỔI (lấy từ `teams[].members`, vd "PHONG"), KHÔNG phải tên đầy đủ
  //    bên myStudent ("CHẤN PHONG"). Bài nộp + ô nhớ localStorage PHẢI dùng tên này, đúng như khi
  //    em tự chọn tên ở màn 2 — đổi sang tên đầy đủ là lệch hết với sheet cũ.
  // ⛔ Đường vào cũ (gõ mã lớp) GIỮ NGUYÊN 100%: lớp nào chưa nối vẫn dùng bình thường.
  // ⛔ Gói hỏng / thiếu trường thì im lặng rơi về màn đăng nhập, đừng chặn học sinh.
  function docGoi() {
    try {
      const raw = new URLSearchParams(location.search).get('goi');
      if (!raw) return null;
      const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
      const g = JSON.parse(decodeURIComponent(escape(atob(b64))));
      if (!g || g.v !== 1) return null;
      if (!g.ten || !g.team || !g.cham || !g.video) return null;
      return g;
    } catch (e) {
      if (window.console) console.warn('goi hong:', e);
      return null;
    }
  }

  function vaoThangTuGoi(g) {
    state.student = g.ten;                       // tên TRONG BUỔI — xem cảnh báo ở trên
    state.myTeam = 'TEAM ' + g.team;
    state.checkedTeam = 'TEAM ' + g.cham;
    state.members = Array.isArray(g.members) ? g.members : [];
    state.videoUrl = g.video || '';
    const vp = parseVideoUrl(state.videoUrl);
    state.videoId = (vp && vp.id) ? vp.id : '';
    state.lesson = g.lesson || '';
    state.topic = g.topic || g.lesson || '';
    state.className = g.tenLop || g.classCode || '';
    state.classCode = g.classCode || '';
    state.khoFs = g.kho === 'fs';                 // (Đợt Firebase) myLesson báo buổi nằm kho nào
    state.buoiId = state.khoFs ? maBuoi(state.classCode, state.lesson) : '';
    // (Đợt B) gói mang cờ mô hình + chế độ: mh=2 là buổi bản-tổng-lỗi; pb=1 là màn PHẢN BIỆN
    // (myLesson khi đó gửi video/members của CHÍNH ĐỘI EM, không phải đội bị chấm).
    state.moHinh = state.khoFs && g.mh === 2 ? 2 : 1;
    // ⭐ 03/09/2026 — hai chế độ MỚI, cùng đi qua `?goi=` như hai cái cũ:
    //   kt:1 = KIỂM TRA TRÙNG (đội BỊ CHẤM gộp lỗi trùng) — myLesson gửi video ĐỘI EM
    //   xn:1 = XÁC NHẬN TRÙNG (đội CHẤM bỏ phiếu)         — myLesson gửi video ĐỘI BỊ CHẤM
    // ⛔ Chỉ nhận khi mô hình 2 + có buổi Firestore: buổi cũ (Google Sheets) không có kho
    //    `cum` nào để đọc, vào là màn trắng trơn.
    state.cheDo = state.moHinh !== 2 ? 'cham'
      : g.kt === 1 ? 'kiemtratrung'
        : g.xn === 1 ? 'xacnhantrung'
          : g.pb === 1 ? 'phanbien' : 'cham';
    // (Đợt 3) gói mang video mọi đội; gói cũ không có thì pop-up tự hỏi kho Firestore
    state.clips = Array.isArray(g.clips) ? g.clips : [];
    // ⭐ 03/09 — `cb` = đội ĐANG CHẤM đội em (khác `cham` = đội EM đi chấm). Chỉ màn
    // KIỂM TRA TRÙNG cần, để ghi "cụm này TEAM mấy sẽ bỏ phiếu"; thiếu thì bỏ dòng đó.
    state.chamBoi = g.cb ? 'TEAM ' + g.cb : '';
    saveKey = makeSaveKey(state.student, state.videoUrl) + (state.cheDo === 'phanbien' ? '_pb' : '');
    if (state.cheDo === 'kiemtratrung' || state.cheDo === 'xacnhantrung') { startTrung(); return; }
    if (state.cheDo === 'phanbien') { startPb(); return; }
    start();
  }

  function start() {
    // (Đợt B) Buổi MÔ HÌNH 2: bản trên KHO là gốc — bắt buộc loading kéo bản tổng về trước,
    // localStorage chỉ còn là lưới đỡ (nháp chưa gửi thì hỏi, không âm thầm đè).
    if (state.moHinh === 2) { startM2(); return; }
    // state.student / myTeam / checkedTeam / members / videoUrl / topic đã set ở handleNamePick
    // khôi phục bài dở nếu cùng người
    const saved = loadSaved();
    let savedTimers = null;
    if (saved && saved.student === state.student) {
      state.errors = saved.errors || [];
      savedTimers = saved.timers;
      state.submitted = !!saved.submitted;
      state.wasSubmitted = !!(saved.wasSubmitted || saved.submitted);   // CHẶNG 29: giữ bài trong "My submitted checks"
      if (state.errors.length) toast('Restored ' + state.errors.length + ' mistakes you logged earlier ✓', 'info');
    }
    setReviewLock(false);   // vào theo đường đăng nhập = chế độ làm bài bình thường

    // dựng UI chính
    // Nút người chấm: "HOANG · T1" (tên · đội của người chấm) — bỏ icon, cỡ = nút Export
    const myTeamNo = String(state.myTeam || '').replace(/[^0-9]/g, '');
    $('hdStudent').textContent = state.student + (myTeamNo ? ' · T' + myTeamNo : '');
    datAvatarDauTrang();   // (02/09/2026) ảnh tròn góc trái = avatar CHÍNH EM, không phải ảnh thầy
    $('hdTopic').textContent = state.topic || 'Watch · spot mistakes · improve together';
    initTimers(savedTimers);      // timers TRƯỚC — buildStudentField vẽ ô thời gian từ timers
    buildStudentField();
    renderErrors();
    initVideo();

    $('loginScreen').classList.add('hidden');
    $('identifyScreen').classList.add('hidden');
    $('appScreen').classList.remove('hidden');
    // ⭐ 05/09/2026 — điện thoại vào màn là ở chế độ CHECK.
    // ⛔ PHẢI đặt Ở CẢ HAI CHỖ: buổi MÔ HÌNH 2 hiện màn qua `dungManChinh()`, còn buổi CŨ
    //    (Google Sheets) đi thẳng đường này và KHÔNG gọi hàm đó. Thiếu một chỗ là buổi cũ
    //    hiện CẢ HAI khung chồng nhau và hai nút không nút nào sáng — đã vấp thật khi kiểm.
    datCheDoDs('check');
    autosave();
    refreshIcons();
    maybeRestoreFromServer(saved);   // (CHẶNG 32) máy này trống mà em ĐÃ nộp ở máy khác → kéo bài về
  }

  // ═══════════════ (Đợt B) MÀN CHẤM BÀI — MÔ HÌNH 2: VÀO BÀI LÀ KÉO BẢN TỔNG VỀ ═══════════════
  // Thầy chốt: "khi đăng nhập làm bài bắt buộc có bước loading và show hết các câu đã check
  // được lần trước ra" — bản trên KHO là gốc; máy có NHÁP chưa gửi thì HỎI, không âm thầm đè.
  function dungManChinh() {
    const myTeamNo = String(state.myTeam || '').replace(/[^0-9]/g, '');
    $('hdStudent').textContent = state.student + (myTeamNo ? ' · T' + myTeamNo : '');
    datAvatarDauTrang();   // (02/09/2026) ảnh tròn góc trái = avatar CHÍNH EM, không phải ảnh thầy
    // ⭐ `?v=60` (thầy chốt) — BỎ tiền tố "REBUTTAL · " ở màn phản biện, chỉ để tên bài.
    $('hdTopic').textContent = state.topic || 'Watch · spot mistakes · improve together';
    $('appScreen').classList.toggle('pb-mode', state.cheDo === 'phanbien');
    $('appScreen').classList.toggle('tu-luu', tl.bat);   // ⭐ 05/09/2026 — chỉ màn chấm mô hình 2 mới ẩn Submit
    $('loginScreen').classList.add('hidden');
    $('identifyScreen').classList.add('hidden');
    $('appScreen').classList.remove('hidden');
    // ⭐ 05/09/2026 — điện thoại vào màn là ở chế độ CHECK (khung nhập lỗi). Đặt ở đây, sau
    // khi `pb-mode` đã chốt, vì `datCheDoDs()` tự bỏ qua khi đang là màn phản biện.
    datCheDoDs('check');
    refreshIcons();
  }

  // ⭐⭐ 05/09/2026 — VIẾT LẠI cho TỰ LƯU (xem khối `tl` ở trên). Bản cũ (hỏi "Two versions found"
  // khi nháp máy ≠ bản kho) nằm ở Backup/truoc-v55-05-09/app.js. Nay: KHO LÀ GỐC DUY NHẤT.
  async function startM2() {
    setReviewLock(false);
    tlBat(true);
    dungManChinh();
    loadingHien('Loading your saved check…');
    let serverDoc = null;
    m2QuenKho();
    tlHuyNghe();
    try {
      serverDoc = await tongLoiLay(state.buoiId, slugHs(state.student));
      // Đọc được rồi thì DÙNG LUÔN làm bản kho đã biết — lượt lưu đầu tiên khỏi phải đọc lại.
      m2KhoErrors = ((serverDoc && serverDoc.errors) || []).map(chuanLoi);
      m2KhoDocLuc = Date.now();
    } catch (e) {
      /* ⛔ 04/09/2026 — TRƯỚC ĐÂY NUỐT LỖI Ở ĐÂY: mạng chập/kho từ chối là coi như "chưa có bản
         trên kho", lấy nháp máy làm bản chính rồi ghi đè lên bài thật. Nay HỎI EM hẳn hoi.
         (Làm bài tiếp vẫn an toàn: `tongLoiGhiAnToan` không đọc được kho thì KHÔNG ghi.) */
      loadingAn();
      const chon = await hoiKhoHong();
      if (chon === 'thulai') { startM2(); return; }
      loadingHien('Loading your saved check…');
    }
    try {
      m2.phanHoi = await fsQuery(state.buoiId, 'phanHoi', 'chuLoi', state.student, 2000);
    } catch (e) { m2.phanHoi = []; }

    const svErrors = ((serverDoc && serverDoc.errors) || []).map(chuanLoi);
    const svTimers = (serverDoc && serverDoc.timers) || [];
    m2.daNopLanNao = !!serverDoc;

    // ⭐ (thầy chốt) NHÁP CŨ còn trong máy (bản trước ?v=55 lưu localStorage): gom MỘT LẦN — chỉ
    // THÊM câu mà kho chưa có (mã có ở cả hai thì bản kho thắng), rồi xoá khoá. Không hỏi, không
    // pop-up. An toàn vì xoá là xoá MỀM (mã trên kho không bao giờ biến mất) và gộp chỉ thêm.
    const saved = loadSaved();
    let nhapThem = [];
    if (saved && saved.student === state.student) {
      const co = {};
      svErrors.forEach((e) => { co[e.id] = 1; });
      nhapThem = (saved.errors || []).map(chuanLoi).filter((e) => !co[e.id]);
    }
    state.errors = svErrors.concat(nhapThem);
    state.submitted = m2.daNopLanNao;
    state.wasSubmitted = m2.daNopLanNao;
    initTimers(svTimers.length ? svTimers : ((saved && saved.timers) || []));
    m2GhiNhanKho(svErrors);
    buildStudentField();
    renderErrors();
    khoiPhucNhapTamCham();   // (Đợt lưu nháp) form chưa Add có sẵn nội dung cũ thì nạp lại
    initVideo();
    capNhatNutDis();
    capNhatTrangThaiLuu();
    refreshIcons();
    loadingAn();
    const soSong = state.errors.filter((e) => e.trangThai === 'song').length;
    if (soSong) toast('Loaded your check: ' + soSong + ' mistake' + (soSong > 1 ? 's' : '') + ' ✓', 'info');
    if (nhapThem.length) {
      tl.xoaNhapKhi = saveKey;   // xoá nháp máy SAU KHI gom lên kho thành công (ghi hỏng thì còn để thử lại)
      toast('Found ' + nhapThem.length + ' unsaved mistake' + (nhapThem.length > 1 ? 's' : '') + ' on this device — saving to the server…', 'info');
      luuNgay();
    } else if (saved) {
      try { localStorage.removeItem(saveKey); } catch (e) {}
    }
    tlNoiKho();   // từ đây kho đổi là bảng đổi theo (kể cả từ máy khác)
  }

  // ═══════════════ (Đợt B) MÀN PHẢN BIỆN — xem lỗi ĐỘI MÌNH bị chấm + tích từng câu ═══════════════
  // Gói ?goi= mang pb:1 (myLesson gửi video/members của CHÍNH đội em). Mỗi câu: cặp tích
  // Đồng ý / Phản đối LOẠI TRỪ NHAU, phản đối BẮT BUỘC lý do; phiếu ĐỘC LẬP theo từng em.
  /* ⭐⭐ `?v=59` (thầy chốt) — MÀN PHẢN BIỆN MỘT CỘT: dời dải nút lọc + badge + số đếm ra khỏi đầu
     khung "Mistakes found", đưa lên thành TẦNG 2 riêng (`#pbBar`, ngay trên video).
     ⛔ DỜI chứ không chép: màn CHẤM vẫn cần đúng ba phần tử này ở chỗ cũ, mà mỗi lần mở trang chỉ
        vào MỘT màn nên không bao giờ cần cả hai nơi cùng lúc.
     ⛔ `appendChild` giữ nguyên phần tử ⇒ listener gắn trực tiếp (`$('btnPbLoc').addEventListener`
        trong `noiSuKien`) KHÔNG mất, và mọi chỗ vẽ vẫn tìm theo id như cũ.
     ⛔ Gọi lại nhiều lần vô hại (phần tử đã ở đúng chỗ thì `appendChild` không đổi gì). */
  function pbDungThanh() {
    const bar = $('pbBar'), trai = $('pbBarTrai'), phai = $('pbBarPhai');
    if (!bar || !trai || !phai) return;
    const loc = $('btnPbLoc'), thieu = $('btnPbThieu'), stats = $('errStats');
    if (loc) trai.appendChild(loc);
    if (thieu) phai.appendChild(thieu);     // badge đứng ĐẦU nửa phải (thầy chốt)
    if (stats) phai.appendChild(stats);
    bar.classList.remove('hidden');
  }

  async function startPb() {
    setReviewLock(false);
    tlBat(true, 'phanbien');   // ⭐ `?v=57` — tự lưu: ẩn nút Submit, hiện dòng trạng thái
    dungManChinh();
    pbDungThanh();             // ⭐ `?v=59` — dựng tầng 2 TRƯỚC khi vẽ, để `veNutLocPb` đo đúng chỗ mới
    loadingHien('Loading the mistakes on your team…');
    try {
      const docs = await fsQuery(state.buoiId, 'tongLoi', 'checkedTeam', state.myTeam, 200);
      m2.dsCham = [];
      docs.forEach((d) => {
        ((d.errors || []).map(chuanLoi)).forEach((er) => {
          if (er.trangThai !== 'an') m2.dsCham.push({ chuLoi: String(d.student || d._id), err: er });
        });
      });
      m2.dsCham.sort((a, b) => tSec(a.err) - tSec(b.err));
    } catch (e) { m2.dsCham = []; }
    try {
      m2.phanHoi = await fsQuery(state.buoiId, 'phanHoi', '', '', 3000);
    } catch (e) { m2.phanHoi = []; }

    // Phiếu CỦA CHÍNH EM đổ vào bảng đang sửa
    m2.votes = {};
    m2.phanHoi.filter((p) => p.voter === state.student).forEach((p) => {
      m2.votes[p.errId] = { y: p.y, lyDo: p.lyDo || '' };
    });
    m2.votesServer = JSON.stringify(m2.votes);
    // (Đợt lưu nháp) nạp lại chữ đang gõ dở CHƯA gửi của MÁY này, buổi này, em này. Câu nào có
    // nháp mà CHƯA từng bấm DISAGREE (m2.votes chưa có, vì chưa gửi thật lần nào) thì tự chọn
    // DISAGREE hộ — không thì ô nhập (đang giữ nháp) không hiện ra vì nút chưa ở trạng thái chọn.
    try { m2.draftPb = JSON.parse(localStorage.getItem(khoaNhapTamPb()) || '{}'); } catch (e) { m2.draftPb = {}; }
    Object.keys(m2.draftPb).forEach((id) => { if (m2.draftPb[id] && !m2.votes[id]) m2.votes[id] = { y: 'phanDoi', lyDo: '' }; });

    loadingAn();
    initVideo();
    renderErrorsPb();
    capNhatTrangThaiLuu();
    refreshIcons();
    tlNoiKhoPb();   // ⭐ `?v=57` — từ đây bạn cùng đội bỏ phiếu là badge UNCONFIRMED tự tụt
    if (!m2.dsCham.length) toast('No mistakes on your team yet — the other team may not have submitted.', 'info');
    // (Đợt cuộn tới câu chưa xác nhận) mở màn phản biện: hiện bình thường 1 giây cho em định
    // hình đã, rồi mới tự cuộn tới câu đầu tiên chưa xác nhận (không có thì im lặng, không cuộn).
    setTimeout(cuonToiCauChuaXacNhan, 1000);
  }

  // Vòng tròn avatar (ảnh thật từ kho web; hỏng ảnh → chữ tắt). kind: 'dongY' xanh · 'phanDoi' đỏ
  function avatarVong(ten, kind, errId) {
    const nen = kind === 'phanDoi' ? 'bg-rose-500 ring-rose-300' : 'bg-emerald-500 ring-emerald-300';
    return '<button data-pv="' + escapeHtml(errId) + '__' + escapeHtml(ten) + '"' +
      ' data-av-em="' + escapeHtml(ten) + '" title="' + escapeHtml(ten) + '"' +
      ' class="pv-av relative w-7 h-7 rounded-full ring-2 ' + nen + ' text-white text-[9px] font-extrabold' +
      ' flex items-center justify-center overflow-hidden shrink-0 -ml-1.5 first:ml-0">' +
      '<img src="' + escapeHtml(avatarUrl(ten)) + '" alt="" class="absolute inset-0 w-full h-full object-cover"' +
      ' onerror="this.remove()">' +
      '<span class="pointer-events-none">' + escapeHtml(initialsOf(ten)) + '</span></button>';
  }
  function phieuCuaLoi(errId) { return m2.phanHoi.filter((p) => p.errId === errId); }

  // ═══ (Đợt CHÍNH CHỦ QUYẾT — 02/09/2026, thầy chốt) ═══════════════════════════════════════
  // LUẬT: lỗi ghi tên bạn A mà CHÍNH BẠN A đã bấm AGREE ⇒ coi như CHỐT là lỗi thật. Phiếu
  // DISAGREE của đồng đội lúc đó chỉ còn giá trị THAM KHẢO, KHÔNG làm câu đó thành tranh chấp
  // nữa: không đòi người chấm bấm Keep/Accept, không tính vào REQUIREMENT, bên trang thầy
  // (myLesson `sp-chitiet.html`) cũng không xếp vào "Cần thầy quyết".
  //
  // ⛔ Vì sao chỉ có MỘT dạng bất đồng trong đội: `renderErrorsPb()` chỉ vẽ nút AGREE cho CHÍNH
  // CHỦ (`laCuaMinh`), đồng đội chỉ có nút DISAGREE. Nên không bao giờ có ca ngược lại
  // (chính chủ cãi mà đồng đội nhận hộ) — đừng phí công xử lý ca đó.
  //
  // ⛔ ĐỔI LUẬT Ở ĐÂY LÀ PHẢI ĐỔI CẢ `myLesson/web/sp-chitiet.html` (hàm `chinhChuDaNhan`/
  // `tranhChap` bên đó là bản sao của bộ này). Tab "Kết quả" app mySpeaking CỐ Ý chưa theo —
  // thầy sẽ dựng lại tab đó sau, số của nó lệch là BIẾT TRƯỚC, không phải lỗi.
  function tenBang(a, b) {
    return !!a && !!b && String(a).trim().toUpperCase() === String(b).trim().toUpperCase();
  }
  // Chính chủ (người bị ghi tên trong e.who) đã tự nhận lỗi?
  function chinhChuDaNhan(e) {
    return !!e.who && phieuCuaLoi(e.id).some((p) => p.y === 'dongY' && tenBang(p.voter, e.who));
  }
  // Còn tranh chấp THẬT: có người phản đối VÀ chính chủ chưa tự nhận.
  function tranhChapThat(e) {
    return phieuCuaLoi(e.id).some((p) => p.y === 'phanDoi') && !chinhChuDaNhan(e);
  }
  // Bất đồng TRONG ĐỘI: chính chủ đã nhận nhưng đồng đội vẫn cãi hộ (rất hiếm).
  function batDongTrongDoi(e) {
    return chinhChuDaNhan(e) &&
      phieuCuaLoi(e.id).some((p) => p.y === 'phanDoi' && !tenBang(p.voter, e.who));
  }

  // Hoạt cảnh chữ "bay" từ ô nhập lên đầu danh sách phản biện (cùng khuôn Web Animations API
  // với flyLight() — bong bóng rời rạc, tự xoá sau khi chạy, không đụng DOM thật của danh sách).
  function flyPhanBien(fromEl, toEl, text) {
    const r0 = fromEl.getBoundingClientRect(), r1 = toEl.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.textContent = text;
    ghost.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;font:700 11px/1.4 inherit;' +
      'color:#B45309;background:#FEF3C7;border:1px solid #FCD34D;border-radius:10px;padding:6px 10px;' +
      'left:' + r0.left + 'px;top:' + r0.top + 'px;width:' + Math.min(r0.width, 260) + 'px;box-shadow:0 6px 16px rgba(0,0,0,.18)';
    document.body.appendChild(ghost);
    const dx = r1.left - r0.left, dy = r1.top - r0.top;
    const anim = ghost.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(' + (dx * .6) + 'px,' + (dy * .6 - 30) + 'px) scale(.95)', opacity: 1, offset: .6 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.85)', opacity: 0 }
    ], { duration: 550, easing: 'cubic-bezier(.3,0,.2,1)' });
    anim.onfinish = () => ghost.remove();
  }
  // Bấm icon gửi cạnh ô nhập lý do phản đối: chốt lại m2.votes[errId].lyDo, bay lên danh sách,
  // rồi vẽ lại (danh sách + ô nhập rỗng lại) — thầy chốt: nội dung KHÔNG hiện thường trực trong ô,
  // chỉ hiện trong danh sách phía trên sau khi đã bấm gửi. Sửa lại = bấm bút → gõ lại → gửi lại,
  // dòng cũ trong danh sách tự bị THAY (cùng 1 khoá errId, không đẻ dòng thứ hai).
  function guiPhanBienMotCau(errId) {
    const el = document.querySelector('[data-pblydo="' + errId + '"]');
    if (!el) return;
    const text = el.value.trim();
    if (!text) {
      toast('Please write WHY you disagree — every disagree needs a reason!', 'err');
      el.classList.add('ring-2', 'ring-rose-400'); el.focus();
      return;
    }
    m2.votes[errId] = { y: 'phanDoi', lyDo: text };
    suaNhapTamPb(errId, '');   // đã gửi thật rồi thì xoá nháp cục bộ (nội dung giờ nằm ở m2.votes)
    const dich = document.querySelector('[data-pbrebut="' + errId + '"]') || el.closest('[data-pbrow]');
    if (dich) flyPhanBien(el, dich, text);
    capNhatNutSubmit();
    renderErrorsPb();
    // ⭐ `?v=57` (thầy chốt ①) — ĐÂY là lúc DUY NHẤT phiếu DISAGREE lên kho: em đã gõ lý do và
    // bấm nút máy bay. Không tự gửi theo nhịp gõ.
    luuNgay();
  }
  // (Đợt lưu nháp) mỗi câu 1 ô nhớ riêng trong cùng khoá localStorage (map errId->chữ đang gõ
  // dở CHƯA gửi) — khoá theo buổi+em nên đổi máy/tải lại trang không mất, tách bạch hẳn với
  // m2.votes (giá trị ĐÃ gửi thật). Đợt cũ cố tình KHÔNG cho m2 vào autosave() vì nặng — bảng
  // nháp nhỏ này để lưu riêng, không đụng luật đó.
  function khoaNhapTamPb() { return 'myspeaking_draftpb_' + state.buoiId + '_' + state.student; }
  function luuNhapTamPbMap() { try { localStorage.setItem(khoaNhapTamPb(), JSON.stringify(m2.draftPb || {})); } catch (e) {} }
  function suaNhapTamPb(errId, text) {
    if (!m2.draftPb) m2.draftPb = {};
    if (text) m2.draftPb[errId] = text; else delete m2.draftPb[errId];
    luuNhapTamPbMap();
  }
  // (Đợt STT xanh/xám) so phiếu CỤC BỘ của đúng 1 câu với bản đã đồng bộ lần cuối (cùng cách
  // diff `doi` trong submitPbThatSu, chỉ khác là soi TỪNG errId thay vì cả cục JSON) — true = câu
  // này KHÔNG có gì chờ gửi (đã cập nhật hoặc chưa hề đụng tới, cả hai đều coi là "đã update").
  function daDongBoPhieu(errId) {
    const cu = JSON.parse(m2.votesServer || '{}');
    return JSON.stringify(m2.votes[errId] || null) === JSON.stringify(cu[errId] || null);
  }

  // ─── (Đợt B) BẢNG PHẢN BIỆN ───
  function renderErrorsPb() {
    const list = $('errList');
    // (Đợt lọc ALL/MINE) 'mine' → chỉ lỗi CỦA CHÍNH EM (who === tên em)
    // (02/09/2026) 'conflict' → chỉ câu chính chủ đã nhận mà đồng đội vẫn cãi hộ
    const nguon = m2.loc === 'mine' ? m2.dsCham.filter((x) => x.err.who === state.student)
      : m2.loc === 'conflict' ? m2.dsCham.filter((x) => batDongTrongDoi(x.err))
        : m2.dsCham;
    const song = nguon.filter((x) => x.err.trangThai === 'song');
    const go = nguon.filter((x) => x.err.trangThai === 'go');
    const thuTu = song.concat(go);   // câu đã gỡ chìm xuống cuối (thầy chốt)
    list.innerHTML = thuTu.map((x, pos) => {
      const e = x.err;
      const st = TYPE_STYLE[e.type] || { badge: 'bg-slate-100 text-slate-600' };
      const daGo = e.trangThai === 'go';
      const v = m2.votes[e.id] || null;
      const phieuKhac = phieuCuaLoi(e.id).filter((p) => p.voter !== state.student);
      // ⭐ `?v=57` (thầy chốt ③) — lấy MỌI phiếu CÓ LÝ DO, kể cả phiếu nay đã là 'dongY': người
      // đó từng phản đối rồi rút, dòng lý do vẫn hiện nhưng xám mờ + gạch ngang.
      const phieuKhacCoLyDo = phieuKhac.filter((p) => String(p.lyDo || '').trim());
      const chonY = v && v.y === 'dongY', chonN = v && v.y === 'phanDoi';
      // (Đợt yêu cầu mới) Lỗi CỦA CHÍNH EM (e.who === tên em) BẮT BUỘC phải AGREE/DISAGREE mới
      // nộp được — lỗi của đồng đội vẫn TUỲ Ý (xem chặn ở submitPb()). So chuỗi y hệt cách app
      // đã so `p.voter === state.student` ở startPb() — cùng một mảng tên thành viên, không lệch.
      const laCuaMinh = !!(e.who && state.student && e.who === state.student);
      const canVoteBatBuoc = laCuaMinh && !daGo && !v;
      // (Đợt cuộn tới câu chưa xác nhận) đánh dấu ĐÚNG nghĩa "chưa chốt" theo ALL/MINE đang xem:
      // MINE = chưa vote (canVoteBatBuoc, luôn = lỗi của chính mình vì danh sách đã lọc sẵn) ·
      // ALL = chủ nhân lỗi (e.who, có thể là bạn khác) CHƯA có phiếu nào trên kho.
      const chuaXacNhan = !daGo && e.who &&
        (m2.loc === 'mine' ? canVoteBatBuoc : !m2.phanHoi.some((p) => p.errId === e.id && p.voter === e.who));
      // (Đợt viền dày hơn) "border" 1px cũ + "ring-2" chỉ 2px NGOÀI viền — nhìn mờ, khó nhận ra.
      // Đổi hẳn ĐỘ DÀY viền theo từng trường hợp (không cộng "border" nền + "border-4" chồng lên,
      // 2 lớp cùng đặt border-width dễ ăn nhau lung tung tuỳ thứ tự nạp CSS của Tailwind CDN).
      // (Đợt bỏ nền vàng khi đã vote) viền VÀNG dày áp cho MỌI lỗi của chính em — dù đã
      // AGREE/DISAGREE hay chưa — để luôn nổi bật giữa danh sách; NHƯNG nền vàng đặc chỉ còn
      // dành riêng cho câu CHƯA vote (canVoteBatBuoc — "cần chú ý"), đã vote rồi thì bỏ nền,
      // chỉ còn viền, mới phân biệt được câu đã xong với câu chưa (thầy chốt, đợt polish 4).
      return '<div class="slidein rounded-2xl p-3.5 transition ' +
        (daGo ? 'border border-slate-200 err-go' :
          laCuaMinh ? 'border-4 border-amber-400' + (canVoteBatBuoc ? ' bg-amber-100/70' : '') :
          'border border-slate-200 hover:border-indigo-300') +
        '" data-pbrow="' + escapeHtml(e.id) + '"' + (chuaXacNhan ? ' data-pbunconfirmed="1"' : '') + '>' +
        '<div class="flex items-center gap-2 flex-wrap">' +
        // (Đợt STT xanh đậm nổi bật hơn) xanh lá ĐẬM (nền + chữ trắng) = câu này đã đồng bộ (hoặc
        // chưa hề đụng tới) · xám nhạt = có sửa cục bộ chưa gửi · vừa Submit xong thì đứng icon ✓
        // đúng 1 giây (cùng nền xanh đậm, chỉ khác nội dung) rồi mới về số.
        (function(){
          const vuaGui = m2.vuaGuiPb.indexOf(e.id) >= 0;
          const dongBo = daDongBoPhieu(e.id);
          return '<span class="shrink-0 w-6 h-6 rounded-full font-extrabold text-xs flex items-center justify-center ' +
            (vuaGui || dongBo ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400') + '">' +
            (vuaGui ? '<i data-lucide="check" class="w-3.5 h-3.5 pointer-events-none"></i>' : (pos + 1)) + '</span>';
        })() +
        '<button data-pbseek="' + tSec(e) + '" class="font-mono font-bold text-sm bg-slate-900 text-white rounded-lg px-2 py-0.5 hover:bg-indigo-700 transition">' + fmtTime(e) + '</button>' +
        '<span class="text-xs font-bold rounded-full px-2.5 py-1 ' + st.badge + '">' + typeLabel(e.type) + '</span>' +
        (laCuaMinh
      ? '<span class="text-xs font-extrabold text-amber-700 bg-amber-100 rounded-full px-2.5 py-1 flex items-center gap-1">⭐ YOUR MISTAKE' + (canVoteBatBuoc ? ' — vote required' : '') + '</span>'
      : (e.who ? '<span class="text-xs font-semibold text-slate-600 flex items-center gap-1">👤 ' + escapeHtml(e.who) + '</span>' : '')) +
        (daGo ? '<span class="text-[10px] font-extrabold text-slate-400 border border-slate-300 rounded-full px-2 py-0.5">REMOVED</span>' : '') +
        '<span class="ml-auto flex items-center">' + phieuKhac.map((p) => avatarVong(p.voter, p.y, e.id)).join('') + '</span>' +
        '</div>' +
        (e.sentence ? '<div class="mt-1.5 text-sm font-bold italic text-slate-900">“' + escapeHtml(e.sentence) + '”</div>' : '') +
        '<div class="mt-0.5 text-sm font-bold text-rose-600">' + escapeHtml(e.detail) + '</div>' +
        (e.explain ? '<div class="mt-0.5 text-sm font-bold text-emerald-600">' + escapeHtml(e.explain) + '</div>' : '') +
        // (Đợt danh sách phản biện) CHÍNH CHỦ (phiếu của chính em, đã GỬI thật) luôn đứng đầu,
        // tên tô vàng; người khác xếp sau, tên trung tính. Chỉ hiện khi đã có lý do THẬT (không
        // hiện phiếu 'phanDoi' rỗng — nghĩa là mới bấm DISAGREE nhưng chưa gõ/gửi gì).
        (function(){
          // ⭐ `?v=57` (thầy chốt ③) — `rut` = phiếu nay đã là AGREE nhưng còn lý do cũ: VẪN HIỆN,
          // chữ nhỏ + xám mờ + GẠCH NGANG ("đã từng nhận xét nhưng đã bỏ"). Không cho sửa nữa
          // (đang đồng ý thì chẳng còn gì để cãi) nên nút bút chì cũng ẩn theo.
          const minh = (v && String(v.lyDo || '').trim())
            ? [{ voter: state.student, lyDo: v.lyDo, minh: true, rut: v.y === 'dongY' }] : [];
          const ds = minh.concat(phieuKhacCoLyDo.map((p) => ({ voter: p.voter, lyDo: p.lyDo, minh: false, rut: p.y === 'dongY' })));
          if (!ds.length) return '';
          return '<div class="mt-2 space-y-1" data-pbrebut="' + escapeHtml(e.id) + '">' +
            ds.map((d) => '<div class="flex items-start gap-1.5 ' + (d.rut ? 'text-[11px]' : 'text-xs') + '">' +
              '<b class="font-extrabold shrink-0 ' +
              (d.rut ? 'text-slate-300 line-through' : (d.minh ? 'text-amber-600' : 'text-slate-700')) + '">' + escapeHtml(d.voter) + '</b>' +
              '<span class="font-bold flex-1 ' + (d.rut ? 'text-slate-300 line-through' : 'text-amber-700') + '">: ' + escapeHtml(d.lyDo) + '</span>' +
              (d.minh && !d.rut ? '<button data-pbedit="' + escapeHtml(e.id) + '" title="Edit" class="shrink-0 text-slate-400 hover:text-indigo-600 p-0.5"><i data-lucide="pencil" class="w-3 h-3 pointer-events-none"></i></button>' : '') +
              '</div>').join('') +
            '</div>';
        })() +
        '<div class="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">' +
        '<span class="text-[11px] font-bold text-slate-400">Checked by ' + escapeHtml(x.chuLoi) + '</span>' +
        (daGo ? '' :
          '<span class="ml-auto flex items-center gap-1.5">' +
          // (Đợt "chỉ chính chủ AGREE") lỗi KHÔNG phải của mình → không được AGREE, chỉ DISAGREE
          (laCuaMinh ? '<button data-pbvote="dongY" data-err="' + escapeHtml(e.id) + '" class="rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold transition ' +
          (chonY ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50') + '">✓ AGREE</button>' : '') +
          '<button data-pbvote="phanDoi" data-err="' + escapeHtml(e.id) + '" class="rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold transition ' +
          (chonN ? 'border-rose-500 bg-rose-500 text-white' : 'border-rose-300 text-rose-600 hover:bg-rose-50') + '">✗ DISAGREE</button>' +
          '</span>') +
        '</div>' +
        // (Đợt ô gửi riêng) ô nhập KHÔNG bao giờ tự điền lại nội dung đã gửi (chỉ trống hoặc đang
        // sửa qua nút bút) — gõ xong bấm icon gửi mới đẩy lên danh sách phía trên (xem guiPhanBienMotCau).
        (chonN && !daGo ?
          // (Đợt icon gửi trần) bỏ hẳn khung nút màu — chỉ còn icon, ĐÈ TUYỆT ĐỐI lên góc phải ô
          // nhập (position:absolute + top-1/2 -translate-y-1/2) nên LUÔN đứng giữa theo chiều cao
          // thật của ô bất kể ô cao thêm bao nhiêu do autogrow, cỡ icon không đổi theo. Ô nhập
          // chừa chỗ bên phải (pr-9) để chữ không đè lên icon.
          '<div class="mt-2 relative">' +
          '<textarea data-pblydo="' + escapeHtml(e.id) + '" rows="1" maxlength="300" placeholder="Why do you disagree? (required)"' +
          // (Đợt cỡ chữ tối thiểu) text-xs (12px) như mọi ô nhập khác trong app — luật CSS chung
          // `input, select, textarea{font-size:16px!important}` dưới 1024px đã TỰ ép lên 16px
          // đúng ngưỡng iOS cần để không tự zoom (CLAUDE.md CHẶNG 18), khỏi cần ép cứng ở đây và
          // làm to hơn mức cần trên desktop — cùng cách fSentence/fDetail/fExplain đang dùng.
          // (Đợt sửa lệch icon — NGUYÊN NHÂN THẬT) <textarea> mặc định display:inline-block, nằm
          // trong dòng chữ có line-height kế thừa (24px) nên khung cha .relative bị PHÌNH thêm
          // ~6px "khoảng trống dưới đáy" (đúng họ lỗi <img> lọt hình kinh điển) — icon canh giữa
          // đúng theo khung cha (đã phình) nên NHÌN lệch xuống so với ô nhập thật. Thêm "block"
          // là ép ô nhập ra khỏi dòng chữ, khung cha hết phình, đo lại lệch tâm = 0px chính xác.
          ' class="autogrow block w-full rounded-xl border border-rose-300 pl-3 pr-9 py-2 text-xs leading-snug focus:outline-none focus:ring-2 focus:ring-rose-400">' +
          // (Đợt lưu nháp) chữ đang gõ dở CHƯA gửi nạp lại từ m2.draftPb — KHÔNG phải nội dung
          // đã gửi thật (v.lyDo), hai nguồn tách bạch hẳn nhau.
          escapeHtml((m2.draftPb && m2.draftPb[e.id]) || '') + '</textarea>' +
          // (Đợt sửa lệch icon) THIẾU flex items-center justify-center là thủ phạm: SVG trong
          // <button> mặc định canh theo baseline CHỮ (như <img> giữa dòng text) — luôn để hở một
          // khoảng dưới đáy do "descender", nên NHÌN thấy icon thấp hơn tâm dù bản thân <button>
          // đã đúng giữa qua top-1/2/-translate-y-1/2. Thêm flex ép SVG căn giữa theo HỘP, hết lệch.
          '<button data-pbsend="' + escapeHtml(e.id) + '" title="Send" class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center leading-none text-red-500 hover:text-red-600 transition">' +
          '<i data-lucide="send-horizontal" class="w-4 h-4 pointer-events-none"></i></button>' +
          '</div>' : '') +
        '</div>';
    }).join('');
    $('errEmpty').style.display = thuTu.length ? 'none' : '';
    // G/P/I đếm các câu CÒN SỐNG của đội mình
    const counts = {};
    song.forEach((x) => { counts[x.err.type] = (counts[x.err.type] || 0) + 1; });
    $('errStats').innerHTML = Object.keys(TYPE_STYLE).filter((t) => counts[t])
      .map((t) => '<span title="' + typeLabel(t) + '" class="rounded-full px-2 py-1 font-extrabold whitespace-nowrap ' +
        TYPE_STYLE[t].badge + '">' + TYPE_STYLE[t].short + ': ' + counts[t] + '</span>').join('');
    capNhatBadgeThieuPb();
    veNutLocPb();
    // (Đợt lưu nháp) ô nào vừa nạp lại nháp nhiều dòng thì giãn cao luôn, khỏi cụt còn 1 dòng
    document.querySelectorAll('[data-pblydo]').forEach(autoGrow);
    refreshIcons();
  }

  // (Đợt lọc ALL/MINE) nút thay hẳn tiêu đề "Mistakes found" ở màn phản biện — bấm đổi
  // ALL ↔ MINE, chữ trên nút LUÔN là trạng thái ĐANG hiện (không phải trạng thái sẽ đổi tới).
  // (Đợt hiện số câu) "ALL • 120" / "MINE • 65" — số luôn đỏ dù nút đang sáng hay xám, đếm ĐÚNG
  // số dòng sẽ hiện ra khi bấm sang bên đó (m2.dsCham đủ cả — không phải lọc theo trạng thái vote).
  function veNutLocPb() {
    const wrap = $('btnPbLoc');
    if (!wrap) return;
    const btAll = wrap.querySelector('[data-loc="all"]');
    const btMine = wrap.querySelector('[data-loc="mine"]');
    const btCf = wrap.querySelector('[data-loc="conflict"]');
    const sang = 'bg-indigo-600 text-white';
    const mo = 'bg-white text-slate-300';
    const nAll = m2.dsCham.length;
    const nMine = m2.dsCham.filter((x) => x.err.who === state.student).length;
    btAll.className = 'px-3.5 py-1.5 transition ' + (m2.loc === 'all' ? sang : mo);
    btMine.className = 'px-3.5 py-1.5 transition ' + (m2.loc === 'mine' ? sang : mo);
    btAll.innerHTML = 'ALL <span class="text-red-500">• ' + nAll + '</span>';
    btMine.innerHTML = 'MINE <span class="text-red-500">• ' + nMine + '</span>';
    // ⭐ (02/09/2026 — thầy chốt) ô GIỮA chỉ hiện khi thật sự có bất đồng trong đội (rất hiếm).
    // Số 0 thì ẩn hẳn — và nếu đang đứng ở chế độ đó mà bất đồng vừa hết (bạn kia rút phiếu
    // phản đối) thì phải TỰ ĐƯA VỀ 'all', không thì em kẹt trên một danh sách rỗng không lối ra.
    if (btCf) {
      const nCf = m2.dsCham.filter((x) => batDongTrongDoi(x.err)).length;
      btCf.classList.toggle('hidden', !nCf);
      if (!nCf && m2.loc === 'conflict') { m2.loc = 'all'; renderErrorsPb(); return; }
      btCf.className = 'px-3.5 py-1.5 transition border-x-2 border-slate-300 ' +
        (m2.loc === 'conflict' ? 'bg-amber-500 text-white' : 'bg-white text-slate-300') +
        (nCf ? '' : ' hidden');
      btCf.innerHTML = 'CONFLICT <span class="text-red-500">• ' + nCf + '</span>';   // `?v=59` rút gọn (thầy chốt)
    }
  }

  // Danh sách lỗi CỦA CHÍNH EM (who === tên em) chưa AGREE/DISAGREE — dùng chung cho badge cố định
  // (capNhatBadgeThieuPb) và hộp hỏi lại lúc Submit (submitPb). Câu đã 'go' (đồng đội đã Agree/gỡ)
  // thì bỏ qua, không còn vote được nữa.
  function layThieuBatBuocPb() {
    return m2.dsCham.filter((x) => x.err.trangThai !== 'go' &&
      x.err.who && state.student && x.err.who === state.student && !m2.votes[x.err.id]);
  }
  // (Đợt badge theo ALL/MINE) danh sách lỗi CHƯA CHỐT của CẢ ĐỘI — mỗi lỗi tính theo đúng chủ
  // nhân (e.who), tra trên KHO đã đồng bộ (m2.phanHoi, có phiếu của MỌI thành viên chứ không
  // riêng em) vì em không biết bạn khác đang gõ dở gì trên máy họ — chỉ tính được cái đã GỬI THẬT.
  function layChuaChotCaDoi() {
    return m2.dsCham.filter((x) => x.err.trangThai !== 'go' && x.err.who &&
      !m2.phanHoi.some((p) => p.errId === x.err.id && p.voter === x.err.who));
  }
  function demChuaChotCaDoi() { return layChuaChotCaDoi().length; }
  // (Đợt cuộn tới câu chưa xác nhận) bấm badge UNCONFIRMED, mở màn phản biện, hoặc đổi ALL/MINE
  // đều gọi hàm này — cuộn tới câu ĐẦU TIÊN đang đánh dấu data-pbunconfirmed="1" (render đã tự
  // gắn đúng nghĩa "chưa chốt" theo ĐÚNG chế độ ALL/MINE đang xem, xem renderErrorsPb()).
  function cuonToiCauChuaXacNhan() {
    const el = document.querySelector('[data-pbunconfirmed="1"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  // Badge cố định luôn hiện trên đầu khung "Mistakes found" ở màn phản biện — bấm ALL thì đếm
  // CẢ ĐỘI, bấm MINE thì chỉ đếm của chính em (thầy chốt: KHÔNG chặn Submit, chỉ nhắc thường trực).
  function capNhatBadgeThieuPb() {
    const b = $('btnPbThieu');
    if (!b) return;
    const hien = state.moHinh === 2 && state.cheDo === 'phanbien';
    b.classList.toggle('hidden', !hien);
    if (!hien) return;
    // 'mine' đếm phần bắt buộc của chính em; 'all' và 'conflict' đều đếm cả đội (ô TEAM
    // CONFLICT chỉ là một lát cắt để nhìn, không đổi nghĩa "còn ai chưa xác nhận").
    const n = m2.loc === 'mine' ? layThieuBatBuocPb().length : demChuaChotCaDoi();
    b.textContent = n ? ('UNCONFIRMED: ' + n) : 'ALL CONFIRMED ✓';
    b.className = 'mx-2 rounded-full px-3 py-1 text-xs font-extrabold transition ' +
      (n ? 'bg-amber-500 text-white hover:bg-amber-600 cursor-pointer' : 'bg-emerald-100 text-emerald-700');
  }

  // Nộp phiếu phản biện — cửa kiểm tra: lý do phản đối thiếu vẫn CHẶN cứng (dữ liệu không hợp lệ);
  // còn lỗi của CHÍNH EM chưa AGREE/DISAGREE hết thì KHÔNG chặn nữa (thầy chốt, đợt 2) — chỉ hỏi
  // lại qua #pbThieuModal, bấm "Submit anyway" mới gọi submitPbThatSu() gửi thật.
  async function submitPb() {
    const thieuLyDo = Object.keys(m2.votes).filter((id) => m2.votes[id].y === 'phanDoi' && !String(m2.votes[id].lyDo || '').trim());
    if (thieuLyDo.length) {
      toast('Please write WHY you disagree — every disagree needs a reason!', 'err');
      const o = document.querySelector('[data-pblydo="' + thieuLyDo[0] + '"]');
      if (o) { o.focus(); o.classList.add('ring-2', 'ring-rose-400'); }
      return;
    }
    const thieuBatBuoc = layThieuBatBuocPb();
    if (thieuBatBuoc.length) {
      $('pbThieuN').textContent = thieuBatBuoc.length;
      $('pbThieuS').textContent = thieuBatBuoc.length > 1 ? 's' : '';
      $('pbThieuModal').classList.remove('hidden');
      $('pbThieuModal').classList.add('flex');
      refreshIcons();
      return;
    }
    await submitPbThatSu();
  }
  // Phần GỬI THẬT — tách riêng khỏi các cửa kiểm tra ở trên để nút "Submit anyway" của
  // #pbThieuModal gọi thẳng, bỏ qua chốt bắt buộc vote hết.
  async function submitPbThatSu() {
    const cu = JSON.parse(m2.votesServer || '{}');
    const doi = Object.keys(m2.votes).filter((id) => JSON.stringify(m2.votes[id]) !== JSON.stringify(cu[id]));
    if (!doi.length) { toast('Nothing new to submit.', 'info'); return; }
    const laLanDauTien = !(m2.votesServer && m2.votesServer !== '{}');
    loadingHien('Saving your feedback…');
    try {
      for (const id of doi) {
        const it = m2.dsCham.find((x) => x.err.id === id);
        await phanHoiGhi(state.buoiId, id + '__' + slugHs(state.student), {
          errId: id,
          chuLoi: it ? it.chuLoi : '',
          voter: state.student,
          voterTeam: state.myTeam,
          y: m2.votes[id].y,
          lyDo: String(m2.votes[id].lyDo || '').trim(),
          luc: Date.now(),
        });
      }
      m2.votesServer = JSON.stringify(m2.votes);
      m2.nhanXanh = laLanDauTien ? 'SUBMITTED' : 'UPDATED';
      // vẽ lại để avatar/phiếu vừa gửi hiện chắc chắn + nút về xanh lá
      m2.phanHoi = m2.phanHoi.filter((p) => p.voter !== state.student);
      Object.keys(m2.votes).forEach((id) => {
        const it = m2.dsCham.find((x) => x.err.id === id);
        m2.phanHoi.push({ errId: id, chuLoi: it ? it.chuLoi : '', voter: state.student, voterTeam: state.myTeam, y: m2.votes[id].y, lyDo: m2.votes[id].lyDo || '' });
      });
      // (Đợt STT xanh/xám) mọi câu VỪA GỬI đứng icon ✓ đúng 1 giây rồi mới về số xanh lá
      m2.vuaGuiPb = doi.slice();
      loadingAn();
      renderErrorsPb();
      capNhatNutSubmit();
      toast('🎉 Feedback submitted — thank you!');
      setTimeout(() => { m2.vuaGuiPb = []; renderErrorsPb(); }, 1000);
    } catch (e) {
      loadingAn();
      toast('Could not save (' + e.message + '). Please try again.', 'err');
    }
  }

  // ─── (Đợt B) NỘP BẢN TỔNG (màn chấm, mô hình 2) — MỘT phát ghi cả bản, pop-up loading ───
  async function submitM2() {
    closeSubmitModal();
    loadingHien('Saving your check…');
    const laLanDauTien = !m2.daNopLanNao;   // (Đợt SUBMIT/UPDATE) chốt SUBMITTED/UPDATED TRƯỚC khi cờ đổi true
    try {
      // ⛔ 04/09/2026 — ĐI QUA CHỐT AN TOÀN, đừng gọi thẳng `tongLoiGhi` (xem khối chú thích ở đó)
      const kq = await tongLoiGhiAnToan(state.buoiId, slugHs(state.student), {
        student: state.student, myTeam: state.myTeam, checkedTeam: state.checkedTeam,
        videoUrl: state.videoUrl, videoId: state.videoId,
        classCode: state.classCode, lesson: state.lesson,
        errors: state.errors, timers: cleanTimers(),
        daNop: true, capNhatLuc: Date.now(),
      });
      const nhatLai = m2NhanLaiLoi(kq);
      m2.daNopLanNao = true;
      m2.nhanXanh = laLanDauTien ? 'SUBMITTED' : 'UPDATED';
      m2GhiNhanDongBo();
      state.submitted = true;
      state.wasSubmitted = true;
      autosave();
      loadingAn();
      renderErrors();          // icon uploaded xanh hiện đủ ở từng ô
      capNhatNutSubmit();
      toast('🎉 Submitted successfully! Thank you.');
      m2BaoNhanLai(nhatLai);
    } catch (e) {
      loadingAn();
      toast('Submission failed (' + e.message + '). Nothing on the server was changed — check your '
        + 'internet and press SUBMIT again, or tap Export Excel to send it to your teacher.', 'err');
    }
  }

  // Gửi NGẦM các kết luận Keep/Agree (thầy chốt: bấm lại nút DISAGREEMENT cũng gửi dữ liệu lên)
  async function guiNgamKetLuan() {
    if (!m2CoSuaChuaGui()) return;
    const laLanDauTien = !m2.daNopLanNao;
    try {
      // ⛔ 04/09/2026 — ĐI QUA CHỐT AN TOÀN. Chính đường này (bấm Keep/Accept) đã ghi đè mất
      // bài của em Tiến sáng 04/09, vì nó lưu NGẦM nên không ai kịp thấy gì.
      const kq = await tongLoiGhiAnToan(state.buoiId, slugHs(state.student), {
        student: state.student, myTeam: state.myTeam, checkedTeam: state.checkedTeam,
        videoUrl: state.videoUrl, videoId: state.videoId,
        classCode: state.classCode, lesson: state.lesson,
        errors: state.errors, timers: cleanTimers(),
        daNop: true, capNhatLuc: Date.now(),
      });
      const nhatLai = m2NhanLaiLoi(kq);
      m2.daNopLanNao = true;
      m2.nhanXanh = laLanDauTien ? 'SUBMITTED' : 'UPDATED';
      m2GhiNhanDongBo();
      renderErrors();
      capNhatNutSubmit();
      toast('Saved ✓', 'info');
      m2BaoNhanLai(nhatLai);
    } catch (e) { toast('Could not save (' + e.message + ') — nothing was changed on the server. '
      + 'Check your internet, then press SUBMIT.', 'err'); }
  }

  // ─── (Đợt B) NÚT REQUIREMENT — đếm câu CÒN VIỆC PHẢI XỬ (thầy chốt) ───
  // (02/09/2026) Đổi tên hiển thị DISAGREEMENT → REQUIREMENT: chữ cũ tả CÁI ĐÃ XẢY RA (bị cãi),
  // chữ mới tả VIỆC EM PHẢI LÀM — đúng bản chất nút này hơn. Bấm Keep/Accept một câu là số tụt
  // một; hết việc thì đổi hẳn sang "NO REQUIREMENT" xanh lá nhạt, cố ý mờ cho khỏi hút mắt.
  // ⭐ Đếm theo `tranhChapThat` — chính chủ đã tự nhận thì KHÔNG còn là việc của người chấm.
  function demTranhChap() {
    return state.errors.filter((e) => e.trangThai === 'song' && !e.ketLuan && tranhChapThat(e)).length;
  }
  function capNhatNutDis() {
    const b = $('btnDisagree');
    if (!b) return;
    // Buổi chưa từng có ai phản đối câu nào thì ẩn hẳn nút (không hiện "NO REQUIREMENT" cho
    // mọi em) — chỉ ai từng bị cãi mới thấy dòng báo đã xử xong.
    const hien = state.moHinh === 2 && state.cheDo === 'cham' &&
      state.errors.some((e) => phieuCuaLoi(e.id).some((p) => p.y === 'phanDoi'));
    b.classList.toggle('hidden', !hien);
    if (!hien) { m2.disOn = false; return; }
    const n = demTranhChap();
    b.textContent = n > 0 ? ('REQUIREMENT: ' + n) : 'NO REQUIREMENT';
    // Hào quang đỏ chỉ đi cùng lúc CÒN VIỆC. Hết việc mà vẫn nhấp nháy đỏ quanh chữ
    // "NO REQUIREMENT" thì đúng là tự mâu thuẫn — bắt được lúc chụp màn hình kiểm thử.
    b.className = 'mx-2 rounded-full px-3 py-1 text-xs font-extrabold transition ' +
      (n > 0 ? 'text-white bg-rose-600 hover:bg-rose-500' : 'bg-emerald-50 text-emerald-300 hover:text-emerald-500') +
      (m2.disOn && n > 0 ? ' dis-halo' : '');
  }

  // ─── (Đợt B) POP-UP NHỎ CẠNH AVATAR — nội dung phản biện + Keep/Agree ───
  let kaDangXu = null;   // { errId, hanhDong: 'keep'|'agree' } đang chờ xác nhận
  function moPopPhanHoi(nut, errId, voter) {
    const p = phieuCuaLoi(errId).find((x) => x.voter === voter);
    if (!p) return;
    const e = state.errors.find((x) => x.id === errId);
    const pop = $('pbPop');
    const laPhanDoi = p.y === 'phanDoi';
    pop.innerHTML =
      '<div class="flex items-center gap-2 mb-1.5">' +
      '<span data-av-em="' + escapeHtml(voter) + '" class="w-6 h-6 rounded-full ' + (laPhanDoi ? 'bg-rose-500' : 'bg-emerald-500') + ' text-white text-[9px] font-extrabold flex items-center justify-center overflow-hidden relative">' +
      '<img src="' + escapeHtml(avatarUrl(voter)) + '" alt="" class="absolute inset-0 w-full h-full object-cover" onerror="this.remove()">' +
      '<span>' + escapeHtml(initialsOf(voter)) + '</span></span>' +
      '<b class="text-xs">' + escapeHtml(voter) + '</b>' +
      '<span class="text-[10px] font-extrabold ' + (laPhanDoi ? 'text-rose-600' : 'text-emerald-600') + '">' +
      (laPhanDoi ? 'DISAGREES' : 'AGREES') + '</span>' +
      '<button id="pbPopX" class="ml-auto text-slate-400 hover:text-slate-600 font-bold px-1">✕</button></div>' +
      // ⛔ (02/09/2026 — thầy chốt) HAI NÚT KEEP/AGREE ĐÃ DỜI RA HÀNG CUỐI CỦA CHÍNH Ô LỖI
      // ("Keep Issue" / "Accept Appeal", xem renderErrors). Pop-up này nay CHỈ để đọc lý do —
      // đừng dựng lại nút ở đây, hai chỗ cùng làm một việc là sớm muộn lệch nhau.
      (laPhanDoi ? '<div class="text-xs text-slate-700 whitespace-pre-wrap">' + escapeHtml(p.lyDo || '') + '</div>' : '');
    pop.classList.remove('hidden');
    const r = nut.getBoundingClientRect();
    const w = 290;
    pop.style.left = Math.max(8, Math.min(r.left - w + r.width + 8, window.innerWidth - w - 8)) + 'px';
    pop.style.top = Math.min(r.bottom + 8, window.innerHeight - 180) + 'px';
    $('pbPopX').onclick = dongPopPhanHoi;
  }
  function dongPopPhanHoi() { $('pbPop').classList.add('hidden'); }

  // ⭐ (02/09/2026 — thầy chốt) GHI KẾT LUẬN. Tách hẳn khỏi phần hỏi-chốt vì nay hai nút xử
  // khác nhau: "Keep Issue" bấm là ăn ngay (giữ nguyên hiện trạng, không mất gì), "Accept
  // Appeal" vẫn hỏi lại một nhịp (em đang tự bỏ một lỗi mình bắt được = tự trừ điểm đội mình).
  //
  // ĐỔI Ý: bấm nút kia lúc nào cũng được, kể cả sau khi đã gửi. Đổi từ 'agree' về 'keep' thì
  // phải trả `trangThai` từ 'go' về 'song' — quên chỗ này là câu sống lại mà vẫn gạch ngang mờ.
  // Bấm lại đúng nút đang chọn = không làm gì (tránh nhấp nháy vô nghĩa).
  function datKetLuan(errId, hanhDong) {
    const e = state.errors.find((x) => x.id === errId);
    if (!e || e.ketLuan === hanhDong) return;
    e.ketLuan = hanhDong;
    e.trangThai = hanhDong === 'agree' ? 'go' : 'song';
    e.suaLuc = Date.now();
    renderErrors();
    capNhatNutDis();
    capNhatNutSubmit();
    autosave();
    luuNgay();   // ⭐ 05/09/2026 — sự kiện "Keep Issue" / "Accept Appeal" = lưu lên kho ngay (hết cảnh "nhớ bấm UPDATE")
    toast(hanhDong === 'agree'
      ? 'Mistake released ✓ — your teacher still sees the full history.'
      : 'Kept ✓ — your teacher will decide in class.', 'info');
  }

  // Chỉ còn "Accept Appeal" đi qua cửa hỏi-chốt này (thầy chốt 02/09/2026)
  function hoiKetLuan(errId, hanhDong) {
    dongPopPhanHoi();
    kaDangXu = { errId, hanhDong };
    const e = state.errors.find((x) => x.id === errId);
    $('kaTitle').textContent = hanhDong === 'agree' ? 'Accept the rebuttal?' : 'Keep this mistake?';
    $('kaText').innerHTML = hanhDong === 'agree'
      ? 'The mistake <b>“' + escapeHtml((e && (e.detail || e.sentence)) || '') + '”</b> will be <b>released</b> — it stays visible (crossed out) but no longer counts. Your teacher still sees the full history.'
      : 'You will <b>keep</b> the mistake <b>“' + escapeHtml((e && (e.detail || e.sentence)) || '') + '”</b>. It stays disputed — your teacher will decide in class.';
    $('btnKaOk').textContent = hanhDong === 'agree' ? 'Agree ✓' : 'Keep it';
    $('btnKaOk').className = 'flex-1 text-white rounded-xl py-2.5 font-bold text-sm ' +
      (hanhDong === 'agree' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-rose-600 hover:bg-rose-500');
    $('kaModal').classList.remove('hidden');
    $('kaModal').classList.add('flex');
    refreshIcons();
  }
  function dongKaModal() { $('kaModal').classList.add('hidden'); $('kaModal').classList.remove('flex'); kaDangXu = null; }
  function chotKetLuan() {
    if (!kaDangXu) return;
    const xu = kaDangXu;
    dongKaModal();
    datKetLuan(xu.errId, xu.hanhDong);
  }

  // ═══════════════ CHẶNG 32→35 — BÀI ĐÃ NỘP: HỎI TRƯỚC, KHÔNG TỰ MỞ ═══════════════
  // Vì sao có cửa này: bài đang làm chỉ nằm trong localStorage TỪNG MÁY. Em nộp ở máy A, hôm sau mở
  // máy B thì form TRỐNG — em thêm 2 lỗi rồi Submit là chỉ gửi PHẦN BỔ SUNG (ca PHONG mất 16 lỗi).
  // CHẶNG 35 (thầy chốt sau khi dùng thử): bản cũ TỰ NHẢY RA + tự khoá xem làm HS giật mình.
  // Nay: hỏi bằng pop-up "tìm thấy N bản nộp lúc … — muốn xem bản nào?"; chọn bản → mở CHẾ ĐỘ XEM;
  // bấm "start a new check" → làm bài MỚI TINH. Nộp thêm lần nữa thì lần sau danh sách có N+1 bản.
  // LUẬT AN TOÀN: mạng hỏng / quá 8 giây / bộ não bản cũ → vào làm bài BÌNH THƯỜNG, không chặn HS.
  let serverSubs = [];   // các lượt nộp lấy về từ kho (mới nhất trước)
  async function maybeRestoreFromServer(saved) {
    if (!state.khoFs && !SCRIPT_URL) return;
    // Máy này đã có dấu vết bài của chính em (lỗi đã lưu hoặc từng nộp) → ưu tiên bản máy, không hỏi mạng
    if (saved && saved.student === state.student && ((saved.errors || []).length || saved.wasSubmitted)) return;
    try {
      let subs = [];
      if (state.khoFs) {
        // (Đợt Firebase) kho mới trả lời dưới 1 giây — mỗi tài liệu là một lượt nộp sẵn hình dạng
        subs = (await baiCuaEmFs(state.buoiId, state.student)).map((d) => ({
          sid: d.sid || d._id, luc: gioDep(d.submittedAt), errors: d.errors || [], timers: d.timers || [],
        }));
      } else {
        const ctl = new AbortController();
        const tm = setTimeout(() => ctl.abort(), 8000);
        const u = SCRIPT_URL + '?mine=1&classCode=' + encodeURIComponent(state.classCode) +
          '&lesson=' + encodeURIComponent(state.lesson) + '&student=' + encodeURIComponent(state.student) +
          '&_=' + Date.now();
        const r = await fetch(u, { cache: 'no-store', signal: ctl.signal });
        clearTimeout(tm);
        if (!r.ok) return;
        const j = await r.json();
        if (!j || !j.ok) return;
        // Bộ não bản CŨ chỉ trả `errors` gộp → dựng thành 1 lượt để vẫn hỏi được (đường lùi)
        subs = Array.isArray(j.lansNop) ? j.lansNop : [];
        if (!subs.length && (j.errors || []).length) subs = [{ luc: '', errors: j.errors, timers: j.timers || [] }];
      }
      subs = subs.filter((s) => s && (s.errors || []).length);
      if (!subs.length) return;                 // em chưa nộp gì → làm bài mới, không làm phiền
      if (state.errors.length) return;          // trong lúc chờ mạng em đã kịp thêm lỗi → đừng chen ngang
      serverSubs = subs;
      showHistoryModal();
    } catch (e) { /* mạng/kho hỏng → làm bài bình thường, không làm phiền */ }
  }

  function showHistoryModal() {
    const n = serverSubs.length;
    $('histTitle').innerHTML = 'We found <b>' + n + '</b> submitted check' + (n > 1 ? 's' : '') +
      ' from <b>' + escapeHtml(state.student) + '</b>.';
    $('histList').innerHTML = serverSubs.map((s, i) => {
      const cnt = (s.errors || []).length;
      return '<button data-sub="' + i + '" class="w-full text-left rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition px-3.5 py-2.5">' +
        '<div class="font-bold text-sm text-slate-800">' + (s.luc ? escapeHtml(s.luc) : 'Earlier submission') + '</div>' +
        '<div class="text-xs text-slate-500 mt-0.5">' + cnt + ' mistake' + (cnt > 1 ? 's' : '') + '</div>' +
        '</button>';
    }).join('');
    $('historyModal').classList.remove('hidden');
    $('historyModal').classList.add('flex');
    refreshIcons();
  }
  function hideHistoryModal() { $('historyModal').classList.add('hidden'); $('historyModal').classList.remove('flex'); }

  // Mở MỘT lượt nộp đã chọn → chế độ XEM (muốn sửa thì bấm "Edit & submit again" như chặng 29)
  function openServerSub(i) {
    const s = serverSubs[i];
    hideHistoryModal();
    if (!s) return;
    state.errors = (s.errors || []).map((er) => ({
      min: +er.min || 0, sec: +er.sec || 0, section: '',
      who: String(er.who || ''), type: String(er.type || ''),
      sentence: String(er.sentence || ''), detail: String(er.detail || ''), explain: String(er.explain || ''),
    }));
    state.submitted = true;
    state.wasSubmitted = true;
    if ((s.timers || []).length) initTimers(s.timers);
    buildStudentField();
    renderErrors();
    setReviewLock(true);
    autosave();
    toast('Opened your check with ' + state.errors.length + ' mistakes ✓', 'info');
  }

  // (switchTab đã bỏ chặng 12 — chỉ còn một khối Mistakes, thời gian nói nằm trong form)

  // ═══════════════ CHẶNG 29 — XEM LẠI BÀI ĐÃ NỘP (không cần đăng nhập, cùng thiết bị) ═══════════════
  // Bài đã Submit vẫn nằm nguyên trong localStorage (cờ submitted/wasSubmitted). Màn đăng nhập liệt kê
  // các bài đó → bấm mở CHẾ ĐỘ XEM (khoá form, ẩn sửa/xoá, ẩn Submit). Muốn sửa phải bấm
  // "Edit & submit again" và XÁC NHẬN qua modal (thầy chốt) — mở khoá xong nhớ Submit lại.
  let reviewLocked = false;

  // CHẶNG 33: CHỈ trả bài CỦA CHÍNH EM ĐANG ĐĂNG NHẬP (thầy chốt: "lịch sử của ai làm thì đúng
  // tên người đó mới xem được"). Lọc theo trường `student` bên TRONG dữ liệu → bài lưu bằng khoá
  // cũ (chỉ có link video) vẫn nhận đúng chủ.
  function submittedSaves(onlyStudent) {
    const want = String(onlyStudent || '').trim().toUpperCase();
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.indexOf('myspeaking_') !== 0) continue;
      try {
        const s = JSON.parse(localStorage.getItem(k));
        if (!s || !(s.submitted || s.wasSubmitted) || !s.student) continue;
        if (want && String(s.student).trim().toUpperCase() !== want) continue;
        out.push({ key: k, s: s });
      } catch (e) {}
    }
    out.sort((a, b) => String(b.s.savedAt || '').localeCompare(String(a.s.savedAt || '')));
    return out;
  }

  function renderReviewSection() {
    const list = submittedSaves(state.student);   // CHẶNG 33: chỉ bài của chính em đang chọn tên
    const sec = $('reviewSection');
    if (!list.length) { sec.classList.add('hidden'); return; }
    $('reviewList').innerHTML = list.slice(0, 6).map(({ key, s }) => {
      const d = s.savedAt ? new Date(s.savedAt) : null;
      const when = d ? String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') : '';
      return '<button data-review="' + escapeHtml(key) + '" class="w-full text-left rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition px-3.5 py-2.5">' +
        '<div class="flex items-center gap-2">' +
        '<span class="font-bold text-sm text-slate-800 truncate">' + escapeHtml(s.topic || s.lesson || 'Speaking check') + '</span>' +
        '<span class="ml-auto text-[11px] font-bold text-slate-400 shrink-0">' + when + '</span></div>' +
        '<div class="text-xs text-slate-500 mt-0.5">' + escapeHtml(s.student) + ' · ' + escapeHtml(s.myTeam || '') +
        ' checked ' + escapeHtml(s.checkedTeam || '') + ' · ' + (s.errors || []).length + ' mistakes</div>' +
        '</button>';
    }).join('');
    sec.classList.remove('hidden');
    refreshIcons();
  }

  function openReview(key) {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(key)); } catch (e) {}
    if (!saved || !saved.student) { toast('Cannot open this saved check.', 'err'); return; }
    saveKey = key;
    state.student = saved.student || ''; state.myTeam = saved.myTeam || '';
    state.className = saved.className || ''; state.classCode = saved.classCode || '';
    state.lesson = saved.lesson || ''; state.topic = saved.topic || '';
    state.checkedTeam = saved.checkedTeam || '';
    state.members = saved.members || [];
    state.videoUrl = saved.videoUrl || ''; state.videoId = saved.videoId || '';
    state.errors = saved.errors || [];
    state.submitted = !!saved.submitted;
    state.wasSubmitted = !!(saved.wasSubmitted || saved.submitted);
    state.khoFs = !!saved.khoFs;
    state.buoiId = saved.buoiId || '';
    state.moHinh = saved.moHinh === 2 ? 2 : 1;   // (Đợt B) xem lại bài mô hình 2 vẫn lọc đúng câu ẩn/gỡ
    state.cheDo = 'cham';
    state.clips = Array.isArray(saved.clips) ? saved.clips : [];   // (Đợt 3) pop-up video

    // dựng UI y hệt start() nhưng từ dữ liệu đã lưu — video YouTube phát bình thường, không cần server
    const myTeamNo = String(state.myTeam || '').replace(/[^0-9]/g, '');
    $('hdStudent').textContent = state.student + (myTeamNo ? ' · T' + myTeamNo : '');
    datAvatarDauTrang();   // (02/09/2026) ảnh tròn góc trái = avatar CHÍNH EM, không phải ảnh thầy
    $('hdTopic').textContent = state.topic || '';
    initTimers(saved.timers);
    buildStudentField();
    renderErrors();
    initVideo();
    setReviewLock(true);

    $('loginScreen').classList.add('hidden');
    $('identifyScreen').classList.add('hidden');   // (CHẶNG 32) lịch sử nay nằm ở trang xác nhận → phải ẩn cả màn này
    $('appScreen').classList.remove('hidden');
    // ⭐ 05/09/2026 — đường thứ BA vào màn chấm (XEM LẠI bài đã nộp). Xem chú thích ở `start()`:
    // ba đường đều phải đặt chế độ CHECK, thiếu đường nào là đường đó hiện chồng hai khung.
    datCheDoDs('check');
    refreshIcons();
  }

  function setReviewLock(on) {
    reviewLocked = on;
    $('appScreen').classList.toggle('review-locked', on);
    $('reviewBanner').classList.toggle('hidden', !on);
    $('btnSubmit').classList.toggle('hidden', on);
    // ⛔ (02/09/2026) dòng khoá nút "Delete all" đã gỡ cùng lúc với nút đó. Hai nút Keep Issue /
    // Accept Appeal trong ô lỗi bị khoá bằng CSS `#appScreen.review-locked #errList [data-ka]`
    // (index.html), không cần đụng JS ở đây.
  }
  function hideEditAgainModal() { $('editAgainModal').classList.add('hidden'); $('editAgainModal').classList.remove('flex'); }

  // ═══════════════ (Đợt 3 Firebase) POP-UP VIDEO CẢ LỚP — bấm logo là mở ═══════════════
  // Thầy chốt 26/08/2026: học sinh xem được bài của CÁC ĐỘI KHÁC để học hỏi tham khảo.
  // Nguồn video (theo thứ tự): state.clips (đường đăng nhập lấy từ teams; gói ?goi=
  // mang sẵn từ myLesson) → hỏi kho Firestore spBuoi (link cũ chưa có clips) → báo hiền.
  // Đường "về trang đăng nhập" cũ của logo DỜI vào nút nhỏ trong pop-up (vẫn hỏi
  // trước nếu còn dữ liệu chưa submit — không đổi lưới an toàn cũ).
  let vidChon = 0;   // đội đang xem trong pop-up

  async function layClips() {
    if (Array.isArray(state.clips) && state.clips.length) return state.clips;
    if (state.khoFs && state.buoiId && FS_GOC) {
      try {
        const r = await fetch(FS_GOC + '/spBuoi/' + encodeURIComponent(state.buoiId) + fsKey());
        if (r.ok) {
          const b = fsGiaiDoc(await r.json());
          state.clips = (b.teams || []).map((t) => ({ t: t.team, v: t.video || '' }));
          autosave();
          return state.clips;
        }
      } catch (e) { /* mạng hỏng — báo hiền bên dưới */ }
    }
    return state.clips || [];
  }

  // Khung phát cho một link: YouTube -> iframe nocookie; Drive -> iframe preview;
  // còn lại -> nút mở tab mới (không đoán bừa cách nhúng).
  function vidKhung(url) {
    const p = parseVideoUrl(url);
    if (p && p.type === 'youtube') {
      return '<iframe class="w-full h-full" src="https://www.youtube-nocookie.com/embed/' + p.id +
        '?rel=0" title="Team video" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    }
    if (p && p.type === 'drive') {
      return '<iframe class="w-full h-full" src="https://drive.google.com/file/d/' + p.id +
        '/preview" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    }
    // ?v=66 (27/09/2026, rà XSS): url có thể tới từ tham số `?goi=` trên URL hoặc kho ⇒ chỉ cho bấm khi là http(s),
    // chặn `javascript:` (escapeHtml không chặn được scheme).
    if (!/^https?:\/\//i.test(String(url || ''))) {
      return '<div class="w-full h-full flex items-center justify-center text-white/70 text-sm font-bold">Video link is not valid.</div>';
    }
    return '<div class="w-full h-full flex items-center justify-center">' +
      '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener" ' +
      'class="bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl px-4 py-2">Open video ↗</a></div>';
  }

  function veVidTabs(clips) {
    $('vidTabs').innerHTML = clips.map((c) => {
      const co = !!c.v;
      const minh = 'TEAM ' + c.t === state.myTeam;
      const cham = 'TEAM ' + c.t === state.checkedTeam;
      const on = Number(c.t) === Number(vidChon);
      return '<button data-vid="' + escapeHtml(String(c.t)) + '"' + (co ? '' : ' disabled') +
        ' class="rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition ' +
        (on ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
            : co ? 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                 : 'border-slate-100 bg-slate-50 text-slate-300') + '">' +
        'TEAM ' + escapeHtml(String(c.t)) +
        (minh ? ' · mine' : (cham ? ' · checking' : '')) + '</button>';
    }).join('');
  }

  async function moVideosModal() {
    const clips = (await layClips()).filter((c) => c && c.t);
    const co = clips.filter((c) => c.v);
    if (!co.length) {
      toast('No team videos to watch here yet.', 'info');
      return;
    }
    // Mặc định mở video của đội MÌNH (xem lại bài mình trước) — không có thì đội đầu tiên
    const minh = co.find((c) => 'TEAM ' + c.t === state.myTeam);
    vidChon = (minh || co[0]).t;
    veVidTabs(clips);
    $('vidBox').innerHTML = vidKhung((clips.find((c) => Number(c.t) === Number(vidChon)) || co[0]).v);
    $('videosModal').classList.remove('hidden');
    $('videosModal').classList.add('flex');
    refreshIcons();
  }
  function dongVideosModal() {
    $('videosModal').classList.add('hidden');
    $('videosModal').classList.remove('flex');
    $('vidBox').innerHTML = '';        // gỡ iframe = dừng hẳn tiếng video trong pop-up
  }

  // ─── Gắn sự kiện ───
  document.addEventListener('DOMContentLoaded', async () => {
    refreshIcons();
    // ⭐⭐ 02/10/2026 (GĐ4, thầy chốt) BỎ HẲN đường vào riêng (gõ mã lớp + chọn tên): CHỈ vào bằng gói từ trang lớp
    // myLesson (nút SP CHECK) + PHIÊN đăng nhập myLesson của ĐÚNG em đó. loadClasses/initLoginScreen giữ làm lịch sử.
    const goi = docGoi();
    if (!goi) { chanVao('Em vào SPEAKING CHECK từ trang lớp của em trên myLesson nhé.', 'Về trang lớp'); return; }
    if (!(await kiemPhienEm(goi))) return;
    noiSuKien();
    vaoThangTuGoi(goi);
  });

  // Phiên đăng nhập myLesson của ĐÚNG em trong gói ⇒ state.ma = mã trong vé. Sai/thiếu ⇒ chặn, KHÔNG ghi gì.
  async function kiemPhienEm(goi) {
    try {
      if (!window.NWP) throw new Error('thieu-nw-phien');
      const u = await NWP.userHienTai();
      if (!u) { chanVao('Em đăng nhập myLesson trước, rồi bấm SP CHECK trên trang lớp nhé.', 'Đăng nhập'); return false; }
      const r = await u.getIdTokenResult();
      const ma = String((r.claims && r.claims.ma) || '').replace(/\s+/g, '').toUpperCase();
      if (!ma || r.claims.hs !== true) { chanVao('Tài khoản đang đăng nhập không phải tài khoản học sinh.', 'Đăng nhập'); return false; }
      if (goi.ma && String(goi.ma).replace(/\s+/g, '').toUpperCase() !== ma) {
        chanVao('Máy này đang đăng nhập tài khoản của bạn khác. Em đăng nhập đúng tài khoản của em rồi vào lại nhé.', 'Đăng nhập');
        return false;
      }
      state.ma = ma;
      return true;
    } catch (e) {
      console.warn('[speaking] không kiểm được phiên', e);
      chanVao('Chưa kiểm được đăng nhập (mạng chập chờn?). Em tải lại trang nhé.', 'Tải lại');
      return false;
    }
  }
  // Màn chặn đơn giản: một câu + một nút (về trang lớp / đăng nhập myLesson / tải lại).
  function chanVao(chu, nut) {
    const den = nut === 'Tải lại' ? location.href : '../index.html';
    document.body.style.cssText = 'margin:0;padding:0;width:auto;min-width:0;max-width:none;overflow:auto';
    document.body.innerHTML = '<div style="min-height:100vh;width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;padding:24px;' +
      'font-family:\'Be Vietnam Pro\',system-ui,sans-serif;background:#F4F7FB"><div style="max-width:420px;text-align:center">' +
      '<img src="img/logo-site.png" alt="" style="width:64px;height:64px;margin:0 auto 16px;display:block">' +
      '<p style="font-size:17px;font-weight:600;color:#1E293B;line-height:1.5;margin:0 0 20px"></p>' +
      '<a style="display:inline-block;background:#2563EB;color:#fff;font-weight:700;padding:12px 22px;border-radius:12px;text-decoration:none"></a>' +
      '</div></div>';
    document.querySelector('p').textContent = chu;
    const a = document.querySelector('a');
    a.textContent = nut; a.href = den;
  }

  // Mọi tay nghe sự kiện của trang. Tách ra thành hàm vì nay có HAI đường vào:
  // đường cũ (đăng nhập lớp) và đường mới (gói từ myLesson) — cả hai đều phải nối.
  function noiSuKien() {
    // CHẶNG 29 (CHẶNG 32 chuyển chỗ): danh sách bài đã nộp — nay dựng lúc VÀO TRANG XÁC NHẬN
    // (handleNamePick gọi renderReviewSection), không dựng ở màn đăng nhập nữa.
    $('reviewList').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-review]');
      if (b) openReview(b.dataset.review);
    });
    $('btnEditAgain').addEventListener('click', () => { $('editAgainModal').classList.remove('hidden'); $('editAgainModal').classList.add('flex'); });
    $('btnEditAgainCancel').addEventListener('click', hideEditAgainModal);
    $('btnEditAgainOk').addEventListener('click', () => {
      hideEditAgainModal();
      setReviewLock(false);
      state.submitted = false;   // để cảnh báo rời trang + tóm tắt Submit hoạt động đúng; wasSubmitted vẫn giữ bài trong danh sách
      autosave();
      toast('You can edit now — press Submit again when you finish!', 'info');
    });

    // Màn đăng nhập lớp
    $('btnLogin').addEventListener('click', handleLogin);
    $('inpClass').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
    $('inpCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
    $('btnLoginErrOk').addEventListener('click', hideLoginErr);
    // Màn chọn tên: chọn Your Team → mở khóa Your Name; chọn Your Name → sang xác nhận ngay
    $('btnBackLogin').addEventListener('click', () => {
      $('identifyScreen').classList.add('hidden');
      $('loginScreen').classList.remove('hidden');
    });
    $('selTeam').addEventListener('change', onTeamChange);
    $('selName').addEventListener('change', () => {
      const teamNo = $('selTeam').value, name = $('selName').value;
      if (teamNo && name) handleNamePick(teamNo, name);
    });
    // Cam kết: phải tích mới bấm Start được
    $('chkAgree').addEventListener('change', (e) => setStartEnabled(e.target.checked));
    $('btnStartCheck').addEventListener('click', start);
    $('btnBackNames').addEventListener('click', renderIdentify);

    document.querySelectorAll('.errType').forEach((b) => b.addEventListener('click', () => { fType = b.dataset.type; renderTypeBtns(); luuNhapTamCham(); }));

    // Ô SENTENCE / MISTAKE / EXPLANATION tự giãn cao khi gõ để xem hết chữ + lưu nháp cục bộ
    ['fSentence', 'fDetail', 'fExplain'].forEach((id) => $(id).addEventListener('input', (e) => { autoGrow(e.target); luuNhapTamCham(); }));

    // Nút chọn HS có lỗi (delegation — wrap tồn tại sẵn, nút dựng lại sau mỗi buildStudentField)
    $('fStudentWrap').addEventListener('click', (ev) => {
      const b = ev.target.closest('.whoBtn');
      if (!b) return;
      fWhoSel = (fWhoSel === b.dataset.who) ? '' : b.dataset.who;  // bấm lại tên đang sáng = bỏ chọn
      renderWhoBtns();
      luuNhapTamCham();
    });

    // Khung điều khiển video luôn hiện
    $('vcPlay').addEventListener('click', () => {
      if (video.mode === 'html5' && video.el) { video.el.paused ? video.el.play() : video.el.pause(); }
      else if (video.mode === 'youtube' && video.yt && video.ready) {
        try { video.yt.getPlayerState() === 1 ? video.yt.pauseVideo() : video.yt.playVideo(); } catch (e) {}
      }
    });
    // ⭐ 05/09/2026 (thầy chốt) — hai nút LÙI / TIẾN 5 giây hai bên nút play
    $('vcBack5').addEventListener('click', () => vcNhich(-NHICH_SEC));
    $('vcFwd5').addEventListener('click', () => vcNhich(NHICH_SEC));
    $('vcSeek').addEventListener('input', (e) => {
      vc.dragging = true;
      vcFill(e.target.value / 10);   // 0..1000 → 0..100% — phần đã chạy đỏ theo tay kéo
      $('vcCur').textContent = fmtClock((e.target.value / 1000) * vcDuration());  // xem trước mốc khi kéo
    });
    $('vcSeek').addEventListener('change', (e) => {
      vc.dragging = false;
      const t = (e.target.value / 1000) * vcDuration();
      if (video.mode === 'html5' && video.el) video.el.currentTime = t;
      else if (video.mode === 'youtube' && video.yt && video.ready) { try { video.yt.seekTo(t, true); } catch (e2) {} }
      syncTimeFields(t);   // kéo thanh tua (KỂ CẢ khi video đang DỪNG) → MIN/SEC nhảy theo ngay
    });

    // Chỉnh tay MIN/SEC: Enter hoặc click ra ngoài → video nhảy theo (2 chiều với syncTimeFields)
    ['fMin', 'fSec'].forEach((id) => {
      $(id).addEventListener('change', manualTimeSeek);
      $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); manualTimeSeek(); e.target.blur(); } });
    });

    // (Đợt 3) Bấm logo → POP-UP VIDEO CẢ LỚP (thầy chốt 26/08). Đang ở màn đăng
    // nhập/chọn tên (chưa vào bài) thì giữ nếp cũ: về trang chủ.
    $('btnHome').addEventListener('click', () => {
      if ($('appScreen').classList.contains('hidden')) {
        window.location.href = window.location.pathname;
        return;
      }
      moVideosModal();
    });
    // Đường "về trang đăng nhập" dời vào nút nhỏ trong pop-up — lưới cũ giữ nguyên:
    // còn dữ liệu chưa submit thì hỏi trước rồi mới cho đi.
    $('btnVidExit').addEventListener('click', () => {
      dongVideosModal();
      // (Đợt B) mô hình 2: "chưa gửi" = có SỬA chưa đồng bộ (kể cả phiếu phản biện)
      const unsubmitted = state.moHinh === 2
        ? m2CoSuaChuaGui()
        : (state.errors.length && !state.submitted);
      if (unsubmitted) { $('leaveModal').classList.remove('hidden'); $('leaveModal').classList.add('flex'); }
      else window.location.href = window.location.pathname;
    });
    $('btnVidClose').addEventListener('click', dongVideosModal);
    $('videosModal').addEventListener('click', (ev) => { if (ev.target.id === 'videosModal') dongVideosModal(); });
    $('vidTabs').addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-vid]');
      if (!b || b.disabled) return;
      vidChon = b.dataset.vid;
      const clips = await layClips();
      veVidTabs(clips);
      const c = clips.find((x) => String(x.t) === String(vidChon));
      if (c && c.v) $('vidBox').innerHTML = vidKhung(c.v);
    });
    $('btnLeaveCancel').addEventListener('click', () => { $('leaveModal').classList.add('hidden'); $('leaveModal').classList.remove('flex'); });
    $('btnLeaveOk').addEventListener('click', () => { window.location.href = window.location.pathname; });

    $('btnAddErr').addEventListener('click', addOrUpdateError);
    $('btnCancelEdit').addEventListener('click', clearErrForm);

    // ── (Đợt B) sự kiện của mô hình 2 + màn phản biện ──
    // Avatar phản hồi (màn chấm): bấm mở pop-up nhỏ nội dung phản biện + Keep/Agree
    $('errList').addEventListener('click', (ev) => {
      const av = ev.target.closest('[data-pv]');
      if (av) {
        const phan = av.dataset.pv.split('__');
        moPopPhanHoi(av, phan[0], phan.slice(1).join('__'));
        ev.stopPropagation();
        return;
      }
      // ⭐ (02/09/2026) Hai nút Keep Issue / Accept Appeal ngay trong ô lỗi (màn NGƯỜI CHẤM).
      // Keep ăn ngay; Accept qua một nhịp hỏi lại. Bấm được cả sau khi đã gửi — đổi ý thoải mái.
      const ka = ev.target.closest('[data-ka]');
      if (ka) {
        if (ka.dataset.ka === 'agree') hoiKetLuan(ka.dataset.err, 'agree');
        else datKetLuan(ka.dataset.err, 'keep');
        return;
      }
      // (phản biện) bấm mốc giờ → video nhảy đúng đoạn bị chấm
      const seek = ev.target.closest('[data-pbseek]');
      if (seek) { seekVideoTo(+seek.dataset.pbseek || 0); return; }
      // (04/09/2026) màn BẮT LỖI: ô giờ bấm = xem đoạn đó · đúp = dừng (xem `bamOGio`)
      const erSeek = ev.target.closest('[data-erseek]');
      if (erSeek) { bamOGio(+erSeek.dataset.erseek || 0); return; }
      // (phản biện) cặp tích Đồng ý / Phản đối — loại trừ nhau, phiếu của CHÍNH EM
      const vote = ev.target.closest('[data-pbvote]');
      if (vote) {
        const id = vote.dataset.err;
        const cu = m2.votes[id] || { y: '', lyDo: '' };
        m2.votes[id] = { y: vote.dataset.pbvote, lyDo: cu.lyDo || '' };
        renderErrorsPb();
        capNhatNutSubmit();
        /* ⭐ `?v=57` — AGREE (và ca hiếm "bấm lại DISAGREE khi lý do cũ còn") ghi ngay lên kho.
           DISAGREE lần đầu chưa có lý do thì `tlGhiPb` tự bỏ qua, dòng trạng thái đổi sang
           "1 reason needed" — em phải gõ rồi bấm máy bay (thầy chốt ①). */
        luuNgay();
        if (vote.dataset.pbvote === 'phanDoi') {
          const o = document.querySelector('[data-pblydo="' + id + '"]');
          if (o && !o.value.trim()) o.focus();
        }
        return;
      }
      // (Đợt ô gửi riêng) icon gửi cạnh ô lý do phản đối — chốt lại + bay lên danh sách
      const pbSend = ev.target.closest('[data-pbsend]');
      if (pbSend) { guiPhanBienMotCau(pbSend.dataset.pbsend); return; }
      // (Đợt ô gửi riêng) icon bút trên dòng phản biện CỦA CHÍNH EM — nạp lại vào ô nhập để sửa
      const pbEdit = ev.target.closest('[data-pbedit]');
      if (pbEdit) {
        const id = pbEdit.dataset.pbedit;
        const cur = m2.votes[id];
        const o = document.querySelector('[data-pblydo="' + id + '"]');
        if (o) {
          o.value = cur ? cur.lyDo : ''; autoGrow(o); o.focus();
          suaNhapTamPb(id, o.value);   // (Đợt lưu nháp) set .value bằng JS không tự bắn 'input'
        }
        return;
      }
      const edit = ev.target.closest('[data-edit]');
      if (edit) {
        const i = +edit.dataset.edit;
        const e = state.errors[i];
        // ⭐ 05/09/2026 — điện thoại: bấm bút chì ở chế độ LIST thì câu đó nhảy vào khung sửa
        // VÀ màn tự về chế độ CHECK.
        // ⛔ PHẢI ĐỔI CHẾ ĐỘ TRƯỚC khi gán chữ + gọi `autoGrowAll()`. Đặt sau là ba ô
        //    SENTENCE/MISTAKE/EXPLANATION bị CẮT CỤT: lúc đo, khung form còn đang ẩn
        //    (`display:none`) nên `scrollHeight` = 0 ⇒ ô bị khoá cao 0px, hiện ra mới thấy
        //    chữ tràn khỏi ô. Đã vấp thật khi kiểm — cùng họ với bẫy "đo layout quá sớm".
        datCheDoDs('check');
        $('fMin').value = e.min; $('fSec').value = e.sec;
        setWho(e.who); fType = e.type; renderTypeBtns();
        $('fSentence').value = e.sentence || ''; $('fDetail').value = e.detail; $('fExplain').value = e.explain;
        autoGrowAll();
        editingIndex = i;
        $('btnCancelEdit').classList.remove('hidden');
        capNhatNhanNutThem();   // (02/09/2026) tự chọn chữ "Save changes" / "Delete this mistake"
        $('fSentence').focus();
      }
      // ⛔ (02/09/2026) tay bắt [data-del] đã gỡ cùng nút thùng rác — xoá nay nằm trong
      // addOrUpdateError() (xoá trắng cả 3 ô khi đang sửa). Đừng dựng lại đường xoá thứ hai.
    });

    // ⛔ 05/09/2026 — tay bắt gõ vào 4 ô giờ nói (`[data-tt]` trong #fStudentWrap) ĐÃ GỠ cùng
    // bộ ô đó. Khung tên học sinh nay chỉ còn hàng nút, không có ô nhập nào.

    // ═══ ⭐ 05/09/2026 (thầy chốt) — ĐIỆN THOẠI: NÚT CHECK / LIST + BÀN PHÍM ẢO ═══════════
    $('dsTab').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-ds]');
      if (b) datCheDoDs(b.dataset.ds);
    });
    // Bàn phím ảo bật lên ⇒ video co về 0 để vừa nhìn chữ đang gõ vừa còn chỗ cho bàn phím.
    // ⛔ Bắt bằng focusin/focusout của CHÍNH khung nhập lỗi, KHÔNG dùng `visualViewport`: mỗi
    //    máy Android báo một kiểu (có máy không đổi chiều cao khung nhìn), còn focus thì máy
    //    nào cũng có. Đổi ô này sang ô kia trong cùng khung vẫn bắn focusout rồi focusin ngay
    //    sau đó, nên video sẽ nháy một nhịp — chốt lại bằng hẹn 120ms rồi mới co lại.
    let banPhimHen = null;
    const datBanPhim = (bat, o) => {
      clearTimeout(banPhimHen);
      banPhimHen = setTimeout(() => {
        $('appScreen').classList.toggle('go-banphim', bat);
        theoKhungNhinTre();   // đo lại cả lượt trễ — thanh phụ bàn phím hiện sau một nhịp
        // Bàn phím vừa lên: đưa ô đang gõ vào tầm nhìn của khung cuộn. Chờ thêm một nhịp cho
        // bàn phím trượt lên xong rồi mới cuộn — cuộn sớm là đo nhầm chỗ.
        if (bat && o) setTimeout(() => { try { o.scrollIntoView({ block: 'nearest' }); } catch (e) {} }, 250);
      }, 120);
    };
    $('errFormCard').addEventListener('focusin', (ev) => {
      if (ev.target.matches('input, textarea')) datBanPhim(true, ev.target);
    });
    $('errFormCard').addEventListener('focusout', (ev) => {
      if (ev.target.matches('input, textarea')) datBanPhim(false);
    });
    /* ⭐ `?v=59` (thầy chốt) — MÀN PHẢN BIỆN cũng phải co video khi bàn phím ảo bật. Ô gõ ở màn
       này là textarea lý do nằm TRONG danh sách lỗi (`#errList`), không phải trong `#errFormCard`
       (màn phản biện ẩn hẳn thẻ đó) — nên phải có tay bắt riêng, không thì gõ lý do trên iPhone
       là bàn phím che mất ô đang gõ. Dùng chung `datBanPhim` nên nhịp chống nháy 120ms vẫn y hệt. */
    $('errList').addEventListener('focusin', (ev) => {
      if (state.cheDo === 'phanbien' && ev.target.matches('textarea')) datBanPhim(true, ev.target);
    });
    $('errList').addEventListener('focusout', (ev) => {
      if (state.cheDo === 'phanbien' && ev.target.matches('textarea')) datBanPhim(false);
    });

    // ⛔ Bám theo khung nhìn thật — xem chú thích ở `theoKhungNhin()`. Bàn phím lên/xuống, xoay
    // máy, thanh địa chỉ Safari co giãn đều bắn vào đây.
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', theoKhungNhinTre);
      window.visualViewport.addEventListener('scroll', theoKhungNhin);
    }
    window.addEventListener('orientationchange', () => setTimeout(theoKhungNhinTre, 300));
    window.addEventListener('resize', theoKhungNhinTre);
    theoKhungNhin();

    // Thanh kéo DỰ PHÒNG: kéo → giờ hiển thị chạy theo; SET TIME → đưa vào MIN/SEC kèm ánh sáng bay
    $('swSeek').addEventListener('input', () => { $('swCur').textContent = fmtClock(parseInt($('swSeek').value, 10) || 0); swFill(); });
    $('swSet').addEventListener('click', swSetTime);

    // (CHẶNG 32) đóng pop-up "nộp ít hơn lần trước"
    $('btnFewerOk').addEventListener('click', () => { $('fewerModal').classList.add('hidden'); $('fewerModal').classList.remove('flex'); });

    // ⛔ (02/09/2026 — thầy chốt) HAI CỤM TAY BẮT XOÁ CŨ ĐÃ GỠ HẲN cùng với #delOneModal,
    // #delAllModal và nút "Delete all". Xoá một lỗi nay nằm gọn trong `addOrUpdateError()`:
    // đang sửa + xoá trắng cả 3 ô SENTENCE/MISTAKE/EXPLANATION → nút đỏ thành "Delete this
    // mistake". Luật XOÁ MỀM (mô hình 2 đánh dấu `an`, kho giữ vết) chép nguyên sang bên đó.

    // ⭐ (02/09/2026) 3 ô chữ đổi là phải soi lại chữ trên nút đỏ — xoá trắng đủ 3 ô thì nút
    // chuyển sang "Delete this mistake", gõ lại một chữ là quay về "Save changes" ngay.
    ['fSentence', 'fDetail', 'fExplain'].forEach((id) => {
      $(id).addEventListener('input', capNhatNhanNutThem);
    });

    // (CHẶNG 35) pop-up hỏi bài đã nộp: chọn 1 bản để XEM, hoặc bỏ qua để làm bài mới tinh
    $('histList').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-sub]');
      if (b) openServerSub(+b.dataset.sub);
    });
    $('btnHistNew').addEventListener('click', () => {
      hideHistoryModal();
      toast('Starting a brand-new check — good luck! 🔍', 'info');
    });

    // (CHẶNG 34) xoay ngang/dọc điện thoại hay kéo cỡ cửa sổ → tính lại cỡ chữ dòng dưới video
    let fitTimer = null;
    window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitVideoInfo, 120); });

    $('btnExport').addEventListener('click', exportExcel);
    $('btnSubmit').addEventListener('click', openSubmitModal);
    $('btnSubmitCancel').addEventListener('click', closeSubmitModal);
    // (CHẶNG 35) ít lỗi quá thì HỎI THÊM một lần nữa trước khi gửi thật
    $('btnSubmitOk').addEventListener('click', () => {
      // (Đợt B) mô hình 2 đếm câu CÒN SỐNG; đã nộp rồi thì cập nhật không cần hỏi thêm vụ ít lỗi
      const soLoi = state.moHinh === 2
        ? state.errors.filter((e) => e.trangThai === 'song').length
        : state.errors.length;
      if (soLoi <= IT_LOI && !(state.moHinh === 2 && m2.daNopLanNao)) {
        closeSubmitModal();
        $('fewMistakesN').textContent = soLoi;
        $('fewMistakesS').textContent = soLoi === 1 ? '' : 's';   // "1 mistake" chứ không "1 mistakes"
        $('fewMistakesModal').classList.remove('hidden');
        $('fewMistakesModal').classList.add('flex');
        refreshIcons();
        return;
      }
      submit();
    });
    const closeFew = () => { $('fewMistakesModal').classList.add('hidden'); $('fewMistakesModal').classList.remove('flex'); };
    $('btnFewReturn').addEventListener('click', closeFew);   // quay lại soi tiếp, KHÔNG gửi
    $('btnFewSubmit').addEventListener('click', () => { closeFew(); submit(); });

    // (Đợt phản biện 2) hộp hỏi lại khi Submit mà còn lỗi của chính em chưa AGREE/DISAGREE
    const closePbThieu = () => { $('pbThieuModal').classList.add('hidden'); $('pbThieuModal').classList.remove('flex'); };
    $('btnPbThieuCancel').addEventListener('click', closePbThieu);
    $('btnPbThieuOk').addEventListener('click', () => { closePbThieu(); submitPbThatSu(); });

    // ── (Đợt B) các sự kiện còn lại của mô hình 2 ──
    // (Đợt ô gửi riêng) Ô lý do phản đối (màn phản biện) — CHỈ tự giãn cao + bỏ viền đỏ báo lỗi
    // lúc gõ; KHÔNG còn ghi thẳng vào m2.votes mỗi phím gõ nữa — phải bấm icon gửi mới chốt
    // (guiPhanBienMotCau), nội dung không hiện thường trực trong ô (thầy chốt).
    $('errList').addEventListener('input', (ev) => {
      const o = ev.target.closest('[data-pblydo]');
      if (!o) return;
      o.classList.remove('ring-2', 'ring-rose-400');
      autoGrow(o);
      suaNhapTamPb(o.dataset.pblydo, o.value);   // (Đợt lưu nháp) gõ tới đâu lưu tạm tới đó
    });
    // Enter (không giữ Shift) trong ô lý do = gửi luôn, khỏi phải với chuột sang icon gửi
    $('errList').addEventListener('keydown', (ev) => {
      const o = ev.target.closest('[data-pblydo]');
      if (!o || ev.key !== 'Enter' || ev.shiftKey) return;
      ev.preventDefault();
      guiPhanBienMotCau(o.dataset.pblydo);
    });

    // Nút DISAGREEMENT: bật = sáng + nhấp nháy hào quang + dồn câu tranh chấp lên đầu;
    // bấm LẦN NỮA (tắt) = gửi ngầm các kết luận Keep/Agree lên kho (thầy chốt).
    $('btnDisagree').addEventListener('click', () => {
      m2.disOn = !m2.disOn;
      renderErrors();
      // ⭐ 05/09/2026 — tự lưu đã ghi ngay lúc bấm Keep/Accept, không còn gì để gửi ngầm ở đây
      if (!m2.disOn && !tl.bat) guiNgamKetLuan();
    });

    // (Đợt lọc ALL/MINE, màn phản biện) nút dài chia ba — bấm ô nào thì chuyển sang ô đó
    $('btnPbLoc').addEventListener('click', (ev) => {
      const nut = ev.target.closest('[data-loc]');
      if (!nut) return;
      m2.loc = nut.dataset.loc;
      renderErrorsPb();
      // (Đợt cuộn tới câu chưa xác nhận) đổi ALL/MINE: hiện bình thường 1 giây rồi mới tự cuộn
      setTimeout(cuonToiCauChuaXacNhan, 1000);
    });
    // (Đợt cuộn tới câu chưa xác nhận) bấm thẳng badge UNCONFIRMED = cuộn NGAY, khỏi chờ 1 giây
    $('btnPbThieu').addEventListener('click', cuonToiCauChuaXacNhan);

    // Pop-up xác nhận Keep/Agree
    $('btnKaCancel').addEventListener('click', dongKaModal);
    $('btnKaOk').addEventListener('click', chotKetLuan);

    // Pop-up nhỏ nội dung phản biện: bấm ra ngoài là đóng
    document.addEventListener('click', (ev) => {
      const pop = $('pbPop');
      if (pop.classList.contains('hidden')) return;
      if (!pop.contains(ev.target) && !ev.target.closest('[data-pv]')) dongPopPhanHoi();
    });

    // Rời trang (đóng tab / F5 / bấm link ngoài) khi còn thứ chưa gửi → trình duyệt hỏi lại
    window.addEventListener('beforeunload', (ev) => {
      if (state.moHinh === 2 && m2CoSuaChuaGui()) { ev.preventDefault(); ev.returnValue = ''; }
    });
    // ⭐ 05/09/2026 (thầy chốt) — TỰ LƯU: rời app (chuyển app · bấm Home iPhone · đóng tab) thì ĐẨY VỘI
    // phần chưa ghi bằng gói keepalive; quay lại thì ĐỌC KHO LẠI (kho là gốc; chữ đang gõ dở trong
    // form vẫn giữ nguyên). iPhone bấm Home KHÔNG bắn `beforeunload`, nên hai tay bắt này là bắt buộc.
    document.addEventListener('visibilitychange', () => {
      if (!tl.bat) return;
      if (document.visibilityState === 'visible') tlDocLai(); else tlDayVoi();
    });
    window.addEventListener('pagehide', () => { if (tl.bat) tlDayVoi(); });
  }

  /* ══════════════════════════════════════════════════════════════════════════════════════
     ⭐⭐⭐ 03/09/2026 — GỘP LỖI TRÙNG: hai màn KIỂM TRA TRÙNG + XÁC NHẬN TRÙNG
     ══════════════════════════════════════════════════════════════════════════════════════
     VÌ SAO CÓ: 4 em cùng soi một video nên MỘT lỗi hay bị 3-4 em cùng bắt. Đo thật 03/09:
     A2B 464 dòng → 341 · B2A 626 → 421 sau khi gộp phần chắc chắn trùng. Hệ quả cũ: đội bị
     chấm phải Agree/Disagree từng dòng trùng, còn điểm đội chấm phồng theo số người soi kỹ.

     LUẬT THẦY CHỐT (03/09, sau 6 vòng duyệt bản mẫu):
       · Thầy Andrew chỉ GỢI Ý trên TỪNG DÒNG RỜI — không bao giờ tự gom sẵn thành cụm.
       · Đội bị chấm tự gộp, tự bấm GỬI ĐỀ NGHỊ; gửi rồi thì cụm khoá lại (đội kia đang vote).
       · Đội chấm bỏ phiếu ĐỘC LẬP TỪNG CỤM; bên nhiều phiếu hơn thắng, KHÔNG cần đủ đội.
       · HOÀ thì TREO — máy không phá hoà, hai bên tự bàn rồi ai đó đổi phiếu.
       · Số thứ tự lỗi là SỐ ĐỊNH DANH, đặt một lần theo thời gian, không đánh lại khi gộp.
       · Màn chấm bài cá nhân + phản biện cá nhân GIỮ NGUYÊN 100%, không đụng một dòng nào.

     ⛔ HỌC SINH KHÔNG BAO GIỜ THẤY CHỮ "MÁY"/"AI" — mọi nhãn là "THẦY ANDREW GỢI Ý".
     ⛔ Hai kho `cum` + `cumPhieu` phải DÁN LUẬT trước (myLesson-data\tai-lieu\LUAT FIRESTORE
        CAN DAN (03-09 THEM CUM LOI TRUNG).md). Chưa dán thì màn báo lỗi tử tế, không vỡ.
     ══════════════════════════════════════════════════════════════════════════════════════ */

  const tr = {
    ds: [],          // mọi lỗi liên quan, ĐÃ đánh số định danh `stt`, xếp theo thời gian
    cum: [],         // [{_id, doiBiCham, ids[], ten, ai[], daGui, luc}]
    phieu: [],       // [{_id, cumId, voter, voterTeam, y, luc}]
    tich: {},        // {errId:1} — các ô đang tích ở cột trái (chỉ trong máy em)
    goiY: {},        // {errId:true} — thầy Andrew gợi ý là trùng
    nhomGoiY: {},    // {errId: số nhóm} — để kẻ vạch ngăn hai nhóm gợi ý nằm liền nhau
    /* ⛔ `?v=61` — bỏ `moKhoa` (cụm đã gửi mà em bấm bút để sửa lại): không còn cụm nào bị
       khoá nữa vì bước công bố đã bỏ. */
    doi: '',         // 'TEAM n' — đội đang xét (bị chấm)
    cot: 'trai',     // đang xem bảng nào: 'trai' = MISTAKES · 'phai' = GROUPS (mọi cỡ màn)
    locXn: 'all',    // màn XÁC NHẬN TRÙNG lọc gì: 'all' = mọi cụm · 'can' = cụm còn hoà phiếu
    xoa: null,       // [cumId, errId] đang chờ xác nhận bỏ khỏi cụm
    nghe: [],        // các hàm huỷ onSnapshot
    videoSan: false,
  };

  const cumGhi = (buoiId, id, d) => fsPatch('/spBuoi/' + encodeURIComponent(buoiId) + '/cum/' + encodeURIComponent(id), d);
  const cumPhieuGhi = (buoiId, id, d) => fsPatch('/spBuoi/' + encodeURIComponent(buoiId) + '/cumPhieu/' + encodeURIComponent(id), d);
  function taoCumId() {
    return 'c' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1296).toString(36);
  }

  /* ═══════════════════════════════════════════════════════════════════════════════════════
     ⭐⭐⭐ `?v=61` (thầy chốt "ok build" 05/09) — DÒNG TRẠNG THÁI SAVED/SAVING CHO MÀN TRÙNG
     ═══════════════════════════════════════════════════════════════════════════════════════
     ⛔⛔ ĐÂY KHÔNG PHẢI "thêm tự lưu". Đã mổ code 05/09: màn này VỐN ĐÃ tự lưu — `trGhiCum()`
     được gọi ở 4 chỗ, cụm lên kho NGAY khi em thao tác. Cái thật sự thiếu là **em không biết
     thao tác đã lên kho hay chưa**: ghi hỏng chỉ hiện một cái toast rồi biến mất.
     ⇒ Khối này CHỈ lo ba việc: xếp hàng · BÁO trạng thái · THỬ LẠI khi hỏng. Không đổi lúc nào
       ghi, không đổi ghi cái gì.

     Cách chạy: mọi lượt ghi đi qua `trXepGhi(duong, id, d)` → hàng đợi MỘT LÀN `trChayGhi()`.
     ⭐ Hàng đợi dồn theo ĐÍCH (`duong/id`): bấm liên tiếp vào cùng một cụm thì lượt sau ĐÈ lên
       lượt trước còn đang chờ, chỉ ghi một lần bản mới nhất — khỏi đốt lượt ghi (LUẬT 8️⃣).
     ⛔ Hỏng thì KHÔNG nuốt: dòng đỏ "Not saved — retrying…" + thử lại 5s / 15s / 30s, và món
       hỏng được TRẢ LẠI đầu hàng đợi. Đúng nếp [[bay-bao-ok-gia]] — đừng bao giờ để em thấy
       "Saved" trong khi kho chưa nhận. */
  const trLuu = {
    bat: false,      // đang ở màn KIỂM TRA TRÙNG (màn xác nhận không bật dòng này)
    cho: [],         // [{khoa, duong, id, d}] — hàng đợi, dồn theo `khoa` = duong + '/' + id
    dangGhi: false,
    hong: false,
    lanThu: 0,
    hen: null,
    luuLuc: 0,       // mốc lần ghi THÀNH CÔNG gần nhất
  };

  function trLuuBat(on) {
    trLuu.bat = !!on;
    clearTimeout(trLuu.hen); trLuu.hen = null;
    trLuu.cho = []; trLuu.dangGhi = false; trLuu.hong = false; trLuu.lanThu = 0; trLuu.luuLuc = 0;
    if (!trLuu.bat) { $('trLuu').classList.add('hidden'); return; }
    trTrangThai();
  }

  function trTrangThai() {
    if (!trLuu.bat) return;
    const o = $('trLuu'), c = $('trLuuChu');
    if (!o) return;
    let kieu = 'san', chu = 'Saved';
    if (trLuu.dangGhi || trLuu.cho.length) {
      kieu = trLuu.hong ? 'hong' : 'dang';
      chu = trLuu.hong ? 'Not saved — retrying…' : 'Saving…';
    } else if (trLuu.luuLuc) {
      kieu = 'xong'; chu = 'Saved ' + gioNgan(trLuu.luuLuc);
    }
    o.dataset.kieu = kieu;
    if (c) c.textContent = chu;
    o.classList.remove('hidden');
  }

  /* Cửa DUY NHẤT mọi lượt ghi của màn trùng đi vào. */
  function trXepGhi(duong, id, d) {
    const khoa = duong + '/' + id;
    const cu = trLuu.cho.filter((x) => x.khoa === khoa)[0];
    if (cu) cu.d = d; else trLuu.cho.push({ khoa, duong, id, d });
    trTrangThai();
    trChayGhi();
  }

  async function trChayGhi() {
    if (trLuu.dangGhi || !trLuu.cho.length) return;
    clearTimeout(trLuu.hen); trLuu.hen = null;
    trLuu.dangGhi = true;
    trTrangThai();
    const m = trLuu.cho.shift();
    try {
      if (m.duong === 'cumPhieu') await cumPhieuGhi(state.buoiId, m.id, m.d);
      else await cumGhi(state.buoiId, m.id, m.d);
      trLuu.hong = false; trLuu.lanThu = 0; trLuu.luuLuc = Date.now();
      trLuu.dangGhi = false;
      trTrangThai();
      trChayGhi();
    } catch (e) {
      /* ⛔ TRẢ MÓN HỎNG VỀ ĐẦU hàng đợi — bỏ đi là mất thao tác của em trong im lặng.
         Nếu trong lúc chờ em lại sửa đúng cụm đó thì bản mới đã nằm trong hàng, giữ bản mới. */
      if (!trLuu.cho.some((x) => x.khoa === m.khoa)) trLuu.cho.unshift(m);
      trLuu.hong = true;
      trLuu.dangGhi = false;
      trLuu.lanThu++;
      trTrangThai();
      const cho = trLuu.lanThu === 1 ? 5000 : trLuu.lanThu === 2 ? 15000 : 30000;
      clearTimeout(trLuu.hen);
      trLuu.hen = setTimeout(trChayGhi, cho);
    }
  }

  /* Chuyển giữa hai bảng MISTAKES / GROUPS (tầng ②). ⭐ `?v=61`: nay là đường DUY NHẤT đổi
     bảng, ở MỌI cỡ màn — lưới 2 cột của máy tính đã bỏ hẳn (thầy chốt "luôn là dạng 1 cột"). */
  function trDatCot(cot) {
    tr.cot = cot === 'phai' ? 'phai' : 'trai';
    const trai = tr.cot === 'trai';
    $('ktTrai').classList.toggle('hidden', !trai);
    $('ktPhai').classList.toggle('hidden', trai);
    Array.prototype.forEach.call($('trTab').children, (x) => {
      const on = x.dataset.trcot === tr.cot;
      x.className = on ? 'bg-slate-900 text-white' : 'bg-white text-slate-500';
    });
  }

  /* Vào màn. Hai chế độ khác nhau ở CHỖ ĐỨNG NHÌN, còn dữ liệu là một:
       kiemtratrung → đội em BỊ chấm ⇒ tr.doi = đội em
       xacnhantrung → em đi chấm     ⇒ tr.doi = đội em chấm */
  async function startTrung() {
    const kt = state.cheDo === 'kiemtratrung';
    tr.doi = kt ? state.myTeam : state.checkedTeam;
    $('loginScreen').classList.add('hidden');
    $('identifyScreen').classList.add('hidden');
    $('appScreen').classList.add('hidden');
    $('trungScreen').classList.remove('hidden');
    $('trTitle').textContent = kt ? 'KIỂM TRA TRÙNG · lỗi của ' + tr.doi
      : 'XÁC NHẬN TRÙNG · ' + tr.doi + ' đề nghị';
    /* ⛔ 03/09 (thầy chốt) — DÒNG PHỤ CHỈ GHI TÊN BÀI. Mọi câu giảng giải kiểu "gộp những lỗi
       các đội khác bắt trùng nhau" đã BỎ: màn càng sạch càng tốt, để các em tự khám phá. */
    $('trSub').textContent = state.topic || state.lesson || '';
    const soDoi = String(state.myTeam || '').replace(/[^0-9]/g, '');
    $('trWho').textContent = state.student + (soDoi ? ' · T' + soDoi : '');
    datAvatarTrung();
    $('ktWrap').classList.toggle('hidden', !kt);
    $('xnWrap').classList.toggle('hidden', kt);
    /* ⭐ `?v=62` — tầng ② nay CẢ HAI MÀN đều có, chỉ khác ruột:
         KIỂM TRA TRÙNG → `#trTab` (ALL MISTAKES / GROUPS)
         XÁC NHẬN TRÙNG → `#xnTab` (YÊU CẦU XEM XÉT / CẦN BỎ PHIẾU) + `#xnKq` (2 ô kết quả) */
    $('trBar').classList.remove('hidden');
    $('trTab').classList.toggle('hidden', !kt);
    $('xnTab').classList.toggle('hidden', kt);
    $('xnKq').classList.toggle('hidden', kt);
    if (kt) trDatCot('trai'); else trDatLocXn('all');   // thầy chốt: XN mở ra đứng ở TẤT CẢ
    /* ⭐ `?v=62` — dòng trạng thái Saved/Saving nay bật cho CẢ HAI màn (thầy chốt): màn
       XÁC NHẬN TRÙNG cũng ghi kho (mỗi lượt bỏ phiếu là một tài liệu `cumPhieu`). */
    trLuuBat(true);
    trVideo();
    batAvatarKho();
    refreshIcons();
    /* Đo khung nhìn NGAY khi màn vừa hiện: lúc `noiTayTrung()` chạy thì #trungScreen còn ẩn,
       đo được cũng vô nghĩa. Cùng nếp `datCheDoDs()` của màn chấm. */
    theoKhungNhin();

    loadingHien(kt ? 'Loading the mistakes on your team…' : 'Loading the groups to vote on…');
    try {
      await trNapLoi();
      await trNoiKho();
    } catch (e) {
      loadingAn();
      trBaoLoi(e);
      return;
    }
    loadingAn();
    trVe();
    /* Gợi ý chạy SAU khi đã vẽ xong (thầy chốt nếp "đẩy sẵn + đổ sau"): em thấy danh sách
       ngay, nhãn gợi ý nhảy vào sau vài giây. Chỉ màn KIỂM TRA TRÙNG mới cần gợi ý. */
    if (kt) trChayGoiY();
  }

  function trBaoLoi(e) {
    const chu = String((e && e.message) || e || '');
    const khoaChua = /_40[13]/.test(chu);   // 401/403 = luật chưa dán
    $('xnWrap').classList.remove('hidden');
    $('ktWrap').classList.add('hidden');
    $('xnWrap').innerHTML = '<div class="bg-white rounded-3xl border border-slate-200 p-6 text-center">' +
      '<div class="font-extrabold text-slate-900 mb-1">' +
      (khoaChua ? 'Phần này chưa mở' : 'Chưa đọc được dữ liệu') + '</div>' +
      '<div class="text-sm text-slate-600">' + (khoaChua
        ? 'Em báo thầy Andrew mở khoá phần gộp lỗi trùng giúp nhé.'
        : 'Em thử tải lại trang; nếu vẫn vậy thì báo thầy Andrew (' + escapeHtml(chu) + ').') +
      '</div></div>';
  }

  /* ── Đọc lỗi ────────────────────────────────────────────────────────────────────────
     Mọi bản chấm SOI VÀO đội `tr.doi` (`tongLoi.checkedTeam == tr.doi`) — cùng câu hỏi
     mà màn phản biện đang dùng, nên kho đã có sẵn chỉ mục, không phải tạo thêm.
     Câu 'an' (em chấm tự xoá) bỏ hẳn; câu 'go' (đã được Accept) GIỮ nhưng không cho gộp
     — nó không còn tính điểm nữa, gộp vào chỉ làm rối. */
  async function trNapLoi() {
    const docs = await fsQuery(state.buoiId, 'tongLoi', 'checkedTeam', tr.doi, 200);
    const ds = [];
    docs.forEach((d) => {
      (d.errors || []).map(chuanLoi).forEach((er) => {
        if (er.trangThai === 'an' || er.trangThai === 'go') return;
        ds.push({
          id: er.id, cham: String(d.student || d._id || ''), who: er.who, type: er.type,
          t: tSec(er), cau: er.sentence, loi: er.detail, gt: er.explain,
        });
      });
    });
    ds.sort((a, b) => a.t - b.t || String(a.id).localeCompare(String(b.id)));
    ds.forEach((x, i) => { x.stt = i + 1; });   // SỐ ĐỊNH DANH — xem luật ở đầu khối
    tr.ds = ds;
  }

  /* ── Nghe kho, đổi là thấy ngay ─────────────────────────────────────────────────────
     Cả đội làm cùng lúc: A kéo câu sang cụm thì B phải thấy câu đó biến khỏi danh sách
     NGAY, không phải tải lại trang (thầy chốt). Dùng onSnapshot của SDK; ghi thì vẫn đi
     REST `fsPatch` như mọi chỗ khác — ghi xong onSnapshot tự bắn về, một chiều dữ liệu.
     ⛔ HAI phép nghe này CHỈ chạy trong hai màn này, tuyệt đối không đưa vào đường mở
        trang (LUẬT 8: Firestore tính tiền theo SỐ TÀI LIỆU, cả cụm 3 app xài chung hạn mức). */
  async function trNoiKho() {
    const SDK = 'https://www.gstatic.com/firebasejs/12.9.0';
    const appMod = await import(SDK + '/firebase-app.js');
    const fsMod = await import(SDK + '/firebase-firestore.js');
    let app;
    try { app = appMod.getApp(); } catch (e) {
      app = appMod.initializeApp({
        apiKey: (CFG.FIREBASE || {}).apiKey, projectId: (CFG.FIREBASE || {}).projectId,
        authDomain: ((CFG.FIREBASE || {}).projectId || '') + '.firebaseapp.com',
        appId: (CFG.FIREBASE || {}).appId, messagingSenderId: (CFG.FIREBASE || {}).messagingSenderId,   // 27/09/2026: cho App Check
      });
    }
    if (window.__veDocSan) { try { await window.__veDocSan; } catch (e) { } }   // 02/10/2026 GĐ4 — chờ Auth
    const db = fsMod.getFirestore(app);
    const goc = fsMod.collection(db, 'spBuoi', state.buoiId, 'cum');
    const q = fsMod.query(goc, fsMod.where('doiBiCham', '==', tr.doi));
    await new Promise((ok, hong) => {
      let lanDau = true;
      tr.nghe.push(fsMod.onSnapshot(q, (snap) => {
        tr.cum = [];
        snap.forEach((d) => { const o = d.data() || {}; o._id = d.id; tr.cum.push(o); });
        /* Cụm giải tán = `ids` rỗng (luật kho cấm xoá tài liệu) — lọc ở đây một lần cho
           mọi chỗ vẽ khỏi phải nhớ. */
        tr.cum = tr.cum.filter((c) => (c.ids || []).length > 1)
          .sort((a, b) => (a.luc || 0) - (b.luc || 0));
        if (lanDau) { lanDau = false; ok(); } else trVe();
      }, (e) => { if (lanDau) { lanDau = false; hong(e); } }));
    });
    const qp = fsMod.query(fsMod.collection(db, 'spBuoi', state.buoiId, 'cumPhieu'));
    tr.nghe.push(fsMod.onSnapshot(qp, (snap) => {
      tr.phieu = [];
      snap.forEach((d) => { const o = d.data() || {}; o._id = d.id; tr.phieu.push(o); });
      trVe();
    }, () => { /* phiếu đọc hỏng thì coi như chưa ai bỏ — không chặn cả màn */ }));
  }

  /* ── Gợi ý của thầy Andrew ──────────────────────────────────────────────────────────
     Chỉ chạy trên những lỗi CHƯA vào cụm nào (gộp rồi thì gợi ý là thừa). */
  async function trChayGoiY() {
    if (!window.SPTrung) return;
    const daVao = {};
    tr.cum.forEach((c) => (c.ids || []).forEach((i) => { daVao[i] = 1; }));
    const conLai = tr.ds.filter((x) => !daVao[x.id]);
    if (conLai.length < 2) return;
    /* Pop-up "THẦY ANDREW ĐANG TÌM" chỉ chớp qua (so chữ xong trong vài mili giây) — vẫn giữ
       để em biết máy vừa làm gì, và để chỗ này còn nguyên nếu sau này có tầng chạy lâu hơn. */
    $('ktLoad').classList.remove('hidden'); $('ktLoad').classList.add('flex');
    try {
      const kq = await window.SPTrung.goiY(conLai);
      tr.goiY = kq.danhDau || {};
      tr.nhomGoiY = kq.nhom || {};
    } catch (e) { tr.goiY = {}; tr.nhomGoiY = {}; }
    $('ktLoad').classList.add('hidden'); $('ktLoad').classList.remove('flex');
    trVe();
  }

  /* ── Vẽ ─────────────────────────────────────────────────────────────────────────── */
  function trLoi(id) { return tr.ds.filter((x) => x.id === id)[0]; }
  function trCumCua(id) { return tr.cum.filter((c) => (c.ids || []).indexOf(id) >= 0)[0] || null; }
  function trAv(ten) {
    return '<span class="tr-av ' + trMauAv(ten) + '" data-av-em="' + escapeHtml(ten) + '" title="' + escapeHtml(ten) + '">' +
      '<img src="' + escapeHtml(avatarUrl(ten)) + '" alt="" onerror="this.remove()">' +
      '<span class="pointer-events-none">' + escapeHtml(initialsOf(ten)) + '</span></span>';
  }
  const TR_MAU = ['bg-emerald-500', 'bg-blue-500', 'bg-orange-500', 'bg-rose-500'];
  function trMauAv(ten) {
    let h = 0; const s = String(ten || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return TR_MAU[h % TR_MAU.length];
  }
  /* Ba mục một dòng, phân biệt bằng MÀU. `gon` = bỏ phần giải thích (pop-up chọn cụm). */
  function trChi(x, gon) {
    return '<div class="tr-chi">' +
      (x.cau ? '<i>“' + escapeHtml(x.cau) + '”</i>' : '') +
      '<b>' + escapeHtml(x.loi) + '</b>' +
      (!gon && x.gt ? '<u>' + escapeHtml(x.gt) + '</u>' : '') + '</div>';
  }
  function trNhanLoai(t) {
    const st = TYPE_STYLE[t] || { badge: 'bg-slate-100 text-slate-600' };
    return '<span class="text-[10.5px] font-bold rounded-full px-2 py-0.5 ' + st.badge + '">' + typeLabel(t) + '</span>';
  }
  const TR_IC_TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  /* ⛔ `?v=61` — ba icon TR_IC_UP (dấu đã gửi) · TR_IC_BUT (nút bút) · TR_IC_KHOA đã GỠ cùng
     bước công bố. Luật CSS `.tr-up` / `.tr-but` / `.tr-cum.moKhoa` / `.tr-cum.daGui` trong
     index.html nay không còn phần tử nào mang — để lại cũng vô hại, nhưng đừng tưởng còn dùng. */

  function trVe() {
    if (state.cheDo === 'kiemtratrung') { trVeKt(); } else { trVeXn(); }
    refreshIcons();
    /* Ảnh đại diện mới nhất từ kho `lessonAvatar` — `batAvatarKho` dựng MutationObserver
       nên mọi ô `[data-av-em]` vẽ thêm sau đều tự được đè, không phải gọi lại mỗi lần vẽ. */
  }

  function trVeKt() {
    const daVao = {};
    tr.cum.forEach((c) => (c.ids || []).forEach((i) => { daVao[i] = 1; }));
    const conLai = tr.ds.filter((x) => !daVao[x.id]);
    /* ⭐ Lỗi ĐÃ VÀO CỤM thì BIẾN MẤT khỏi danh sách (thầy chốt): mỗi lỗi chỉ nằm MỘT nơi,
       không thì nhìn tưởng hai lỗi khác nhau. */
    /* ⭐ 03/09 (thầy chốt) — VẠCH NGĂN GIỮA HAI NHÓM GỢI Ý NẰM LIỀN NHAU.
       `tr.nhomGoiY[errId]` do `SPTrung.goiY` trả về. Hai ô xanh cạnh nhau mà KHÁC số nhóm thì
       chèn vạch: không có nó, bốn ô xanh liên tiếp trông y như một cụm và em tích nhầm cả bốn. */
    let nhomTruoc = null;
    $('ktDs').innerHTML = conLai.map((x) => {
      const goiy = tr.goiY[x.id], tich = !!tr.tich[x.id];
      const nhom = goiy ? (tr.nhomGoiY[x.id] || null) : null;
      const canNgan = nhom != null && nhomTruoc != null && nhom !== nhomTruoc;
      nhomTruoc = nhom;
      return (canNgan ? '<div class="tr-ngan"><span>nhóm khác</span></div>' : '') +
        '<div class="tr-o ' + (goiy ? 'goiy' : 'mo') + (tich ? ' tich' : '') + '" data-trloi="' + escapeHtml(x.id) + '">' +
        '<div class="flex items-center gap-2 flex-wrap">' +
          '<span class="tr-tick">' + TR_IC_TICK + '</span>' +
          '<span class="tr-stt">' + x.stt + '</span>' +
          '<button data-trseek="' + x.t + '" class="font-mono text-xs font-bold bg-slate-900 hover:bg-indigo-700 transition text-white rounded-md px-1.5 py-0.5">' + fmtClock(x.t) + '</button>' +
          trNhanLoai(x.type) +
          (goiy ? '<span class="text-[10px] font-extrabold text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">THẦY ANDREW GỢI Ý</span>' : '') +
          '<span class="ml-auto text-[10.5px] font-bold text-slate-400">' + escapeHtml(x.cham) + '</span>' +
        '</div>' + trChi(x) + '</div>';
    }).join('') || '<div class="text-sm text-slate-400 px-2 py-6 text-center">Mọi lỗi đều đã được xếp vào cụm.</div>';

    $('ktCum').innerHTML = tr.cum.map((c) => trKhungCum(c, false)).join('') ||
      '<div class="text-sm text-slate-400 px-2 py-6 text-center">Chưa có cụm lỗi gộp nào.</div>';

    const nTich = Object.keys(tr.tich).length;
    $('ktViec').classList.toggle('hidden', nTich === 0);
    $('ktViec').classList.toggle('flex', nTich > 0);
    $('ktTao').style.display = nTich >= 2 ? '' : 'none';
    /* ⭐ `?v=61` — có cụm nào là thêm vào được. Trước đây chỉ liệt kê cụm CHƯA GỬI, nhưng nay
       bước công bố đã bỏ (thầy chốt) nên mọi cụm đều sửa được. */
    $('ktThem').style.display = tr.cum.length ? '' : 'none';
    $('ktSoTich').textContent = nTich;
    /* ⭐ `?v=62` (thầy chốt) — HAI CON SỐ NẰM LUÔN TRONG TÊN NÚT, dải đếm rời đã bỏ.
       ⛔ Chỉ đặt `textContent` của hai <span> con: `trDatCot()` viết lại `className` của NÚT
          nên phần chữ bên trong phải nằm ở thẻ riêng, đừng gán `innerHTML` cho cả nút. */
    $('trSoLoi').textContent = conLai.length;
    $('trSoCum').textContent = tr.cum.length;
  }

  /* Một khung cụm. `voteMode` = màn XÁC NHẬN TRÙNG (có hai nút phiếu, không có nút bỏ dòng). */
  function trKhungCum(c, voteMode) {
    const ids = (c.ids || []).slice().sort((a, b) => {
      const A = trLoi(a), B = trLoi(b);
      return ((A && A.stt) || 0) - ((B && B.stt) || 0);
    });
    /* ⭐⭐ `?v=61` (thầy chốt) — MÀN KIỂM TRA TRÙNG KHÔNG CÒN BƯỚC CÔNG BỐ.
       Trước đây khung cụm mang ba trạng thái: xanh dương = đang soạn · xanh lá = đã gửi ·
       cam = mở khoá sửa lại. Nay bỏ hẳn nút SAVE nên cụm nào cũng lên kho ngay và ai cũng sửa
       được ⇒ khung LUÔN xanh dương, KHÔNG dấu mũi tên gửi, KHÔNG nút bút, nút ✕ luôn hiện.
       ⛔ Ba màu xanh lá / xám / cam CHỈ còn nghĩa ở màn XÁC NHẬN TRÙNG (kết quả bỏ phiếu). */
    let vo = '', dau = '';
    if (voteMode) {
      const ok = trPhieuCua(c._id, 'gop'), no = trPhieuCua(c._id, 'khong');
      vo = ok.length > no.length ? 'chot' : no.length > ok.length ? 'khong' : (ok.length ? 'hoa' : '');
      dau = vo === 'chot' ? 'SỐ ĐÔNG GỘP' : vo === 'khong' ? 'SỐ ĐÔNG KHÔNG GỘP'
        : vo === 'hoa' ? 'HOÀ PHIẾU · ĐANG TREO' : escapeHtml(tr.doi) + ' xin gộp · ' + ids.length + ' dòng';
    } else {
      dau = ids.length + ' dòng = 1 lỗi';
    }
    return '<div class="tr-cum ' + vo + '">' +
      '<div class="tr-cum-dau"><span class="trai">' + dau + '</span>' +
        '<span class="giua">' + (c.ai || []).map(trAv).join('') + '</span>' +
        '<span class="phai">' + escapeHtml(c.ten || '') + '</span></div>' +
      ids.map((id) => {
        const x = trLoi(id);
        if (!x) return '';
        return '<div class="tr-cum-o">' +
          '<span class="tr-stt mt-0.5">' + x.stt + '</span>' +
          '<button data-trseek="' + x.t + '" class="font-mono text-[11px] font-bold bg-slate-900 hover:bg-indigo-700 transition text-white rounded-md px-1.5 py-0.5 mt-0.5 flex-none">' + fmtClock(x.t) + '</button>' +
          '<div class="min-w-0"><div class="text-[10.5px] text-slate-500 leading-none">' + trNhanLoai(x.type) +
            ' <span class="font-bold">' + escapeHtml(x.cham) + '</span> chấm' +
            (x.cham === state.student ? ' <span class="text-amber-600 font-extrabold">· của em</span>' : '') + '</div>' +
            trChi(x) + '</div>' +
          /* ⭐ `?v=61` — nút ✕ LUÔN hiện ở màn KIỂM TRA TRÙNG (cụm không còn bị khoá). */
          (voteMode ? '' : '<button class="bo" data-trbo="' + escapeHtml(c._id) + '|' + escapeHtml(id) + '" title="Bỏ khỏi cụm">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" class="w-3 h-3"><path d="M6 6l12 12M18 6L6 18"/></svg></button>') +
        '</div>';
      }).join('') +
      (voteMode ? trHaiNutPhieu(c) : '') +
    '</div>';
  }

  function trPhieuCua(cumId, y) {
    return tr.phieu.filter((p) => p.cumId === cumId && p.y === y).map((p) => p.voter);
  }
  function trPhieuToi(cumId) {
    const p = tr.phieu.filter((x) => x.cumId === cumId && x.voter === state.student)[0];
    return (p && p.y) || '';
  }
  /* Hai nút phiếu: SỐ TO trong nút + avatar người đã bỏ ở dưới.
     ⛔ Không kèm dòng hướng dẫn nào (thầy chốt: các em tự bấm, tự thấy số đổi, tự hiểu). */
  function trHaiNutPhieu(c) {
    const ok = trPhieuCua(c._id, 'gop'), no = trPhieuCua(c._id, 'khong'), toi = trPhieuToi(c._id);
    /* ⭐ `?v=62` (thầy chốt) — BÊN THUA VỀ ĐEN TRẮNG cho dễ nhìn. Hoà phiếu (kể cả 0–0) thì
       KHÔNG bên nào xám: chưa phân định thì đừng vẽ như đã phân định. */
    const kq = trKetQuaCum(c);
    const mot = (loai, nhan, ai) =>
      '<button class="' + loai + (toi === loai2y(loai) ? ' minh' : '') +
        (kq !== 'hoa' && kq !== loai2y(loai) ? ' xam' : '') +
        '" data-trvote="' + loai2y(loai) + '" data-trcum="' + escapeHtml(c._id) + '">' +
        '<span class="so">' + ai.length + '</span>' +
        '<span class="ruot"><span class="nhan">' + nhan + '</span>' +
        '<span class="avs">' + ai.map(trAv).join('') + '</span></span></button>';
    return '<div class="tr-phieu">' +
      mot('ok', 'ĐỒNG Ý GỘP', ok) + mot('no', 'KHÔNG GỘP', no) + '</div>';
  }
  /* Tên class trên nút (`ok`/`no`) ↔ giá trị phiếu ghi vào kho (`gop`/`khong`). Hai bộ tên này
     đã lệch nhau từ 03/09; giữ nguyên để khỏi phải đụng dữ liệu cũ trên kho. */
  function loai2y(loai) { return loai === 'ok' ? 'gop' : 'khong'; }

  /* ⭐⭐ `?v=62` (thầy chốt) — KẾT QUẢ MỘT CỤM, tính theo CẢ ĐỘI chứ không theo từng em:
       'gop'   = số đông đồng ý gộp
       'khong' = số đông không gộp
       'hoa'   = **CHƯA PHÂN ĐỊNH** (bằng phiếu, kể cả 0–0) ⇒ đây là "CẦN BỎ PHIẾU"
     ⛔ Thầy chốt: **chỉ cần MỘT phiếu lệch là xong một ô**, không cần cả đội bỏ phiếu.
        Vì thế mọi thành viên trong đội thấy CÙNG một con số, và em vừa bỏ phiếu đầu tiên
        (1–0) là cụm đó rớt khỏi danh sách CẦN BỎ PHIẾU ngay — thầy đã duyệt cách này. */
  function trKetQuaCum(c) {
    const ok = trPhieuCua(c._id, 'gop').length, no = trPhieuCua(c._id, 'khong').length;
    return ok > no ? 'gop' : no > ok ? 'khong' : 'hoa';
  }

  /* Đổi giữa hai nút lọc của màn XÁC NHẬN TRÙNG. Cùng khuôn `trDatCot()` của màn kia. */
  function trDatLocXn(loc) {
    tr.locXn = loc === 'can' ? 'can' : 'all';
    Array.prototype.forEach.call($('xnTab').children, (x) => {
      const on = x.dataset.xnloc === tr.locXn;
      x.className = on ? 'bg-slate-900 text-white' : 'bg-white text-slate-500';
    });
    trVeXn();
  }

  function trVeXn() {
    /* Đội chấm CHỈ thấy cụm đã GỬI — cụm đang soạn là việc riêng của đội kia.
       (Từ `?v=61` mọi cụm mới đều `daGui:true`; chốt này giữ để buổi CŨ còn cụm nháp
       `daGui:false` thì vẫn không lòi sang đội chấm.) */
    const ds = tr.cum.filter((c) => c.daGui);
    const kq = ds.map(trKetQuaCum);
    const can = ds.filter((c, i) => kq[i] === 'hoa');
    $('xnSoAll').textContent = ds.length;
    $('xnSoCan').textContent = can.length;
    $('xnSoGop').textContent = kq.filter((k) => k === 'gop').length;
    $('xnSoKhong').textContent = kq.filter((k) => k === 'khong').length;
    /* Danh sách xếp theo THỜI GIAN TẠO CỤM — `trNoiKho()` đã sort theo `luc` sẵn rồi. */
    const hien = tr.locXn === 'can' ? can : ds;
    const trong = tr.locXn === 'can'
      ? 'Không còn cụm nào chờ phiếu — cả đội xong rồi ✓'
      : 'Chưa có cụm nào chờ em.';
    $('xnWrap').innerHTML =
      '<div class="space-y-3">' + (hien.map((c) => trKhungCum(c, true)).join('') ||
        '<div class="tr-khung text-center text-sm text-slate-400 py-6">' + trong + '</div>') +
      '</div>';
  }

  /* ── Thao tác ───────────────────────────────────────────────────────────────────── */
  function trGhiCum(c) {
    /* ⛔ LUẬT 9️⃣ — ghi ĐỦ MỌI TRƯỜNG. `fsPatch` không có updateMask nên nó ghi đè cả tài
       liệu; thiếu một trường là trường đó bay mất, mà chẳng có gì báo.
       ⭐⭐ `?v=61` (thầy chốt) — `daGui` LUÔN ghi `true`: bước công bố đã bỏ, đội chấm thấy
       cụm NGAY khi đội bị chấm vừa tạo. Trường vẫn phải gửi vì luật kho đòi đủ 6 trường.
       ⛔ Ghi nay đi qua HÀNG ĐỢI `trXepGhi` (dồn theo cụm, thử lại khi hỏng, có dòng trạng
          thái) — đừng gọi thẳng `cumGhi` nữa, gọi thẳng là em không thấy Saving/Saved. */
    trXepGhi('cum', c._id, {
      doiBiCham: tr.doi, ids: c.ids || [], ten: c.ten || '',
      ai: c.ai || [], daGui: true, luc: c.luc || Date.now(),
    });
  }
  function trThemToi(c) {
    c.ai = c.ai || [];
    if (c.ai.indexOf(state.student) < 0) c.ai.push(state.student);
  }
  /* Tên cụm = chỗ sai ngắn nhất trong cụm — đủ để nhận ra cụm nào là cụm nào. */
  function trDatTen(ids) {
    const chu = ids.map((i) => (trLoi(i) || {}).loi || '').filter(Boolean)
      .sort((a, b) => a.length - b.length)[0] || '';
    return chu.length > 60 ? chu.slice(0, 57) + '…' : chu;
  }

  /* ⛔⛔⛔ LUẬT 21/07/2026 ĐÃ ĐƯỢC THẦY GỠ **RIÊNG CHO WEB HỌC SINH** (05/09, `?v=61`).
     Luật cũ: *một cụm không được chứa hai dòng của CÙNG MỘT NGƯỜI CHẤM* — một em không ghi
     lại cùng một lỗi hai lần, hai dòng giống nhau ở hai mốc giờ nghĩa là NGƯỜI NÓI SAI HAI
     LẦN, phải đếm 2 (bản gốc `tools/danhgia.py cung_mot_loi_duoc`, từng nuốt mất 13 dòng).
     Thầy chốt: ở màn KIỂM TRA TRÙNG các em **được gộp cả loại đó**, và tầng gợi ý cũng
     **gợi ý cả hai loại** (đã gỡ điều kiện tương ứng ở `js/trung.js xetDuoc`).
     ⛔⛔ HỆ QUẢ THẦY ĐÃ BIẾT VÀ CHẤP NHẬN: hai lần nói sai do cùng một bạn bắt nay có thể
        thành MỘT lỗi ⇒ số lỗi trừ của đội bị chấm giảm thêm so với hồi 03/09.
     ⛔⛔ APP MÁY TÍNH GIỮ NGUYÊN LUẬT — thầy chỉ nói web học sinh. Đừng đem thay đổi này sang
        `mySpeaking/app/tools/danhgia.py`.
     Hàm dưới GIỮ LẠI làm lịch sử, hiện KHÔNG còn ai gọi. */
  function trTrungNguoiCham(ids) {
    const gap = {};
    for (let i = 0; i < ids.length; i++) {
      const x = trLoi(ids[i]);
      if (!x) continue;
      if (gap[x.cham]) return x.cham;
      gap[x.cham] = 1;
    }
    return '';
  }

  /* ⭐⭐ `?v=63` (06/09/2026, rà soát đêm) — MỘT CÂU CHỈ ĐƯỢC NẰM TRONG MỘT CỤM SỐNG.
     Đo thật trên kho: B2A_MOLDY FOOD có 2 câu, A2B_BEAVERS AND DAMS có 4 câu nằm trong HAI cụm
     được gộp cùng lúc (cùng một em tạo hai cụm cách nhau ~17 giây; một ca cách 0,2 giây = bấm
     đúp). Hậu quả bên app: `chotloi.js::gopBuoi()` đếm câu đó hai lần (bộ thử đỏ 878≠876), và
     câu là DÒNG CHÍNH của cụm này nhưng là DÒNG PHỤ `boQua` của cụm kia ⇒ CHỐT KẾT QUẢ ghi
     `trangThai:'go'` gỡ oan. Gốc: hai hàm dưới lấy nguyên các ô đang tích mà không hỏi "câu này
     đã có cụm chưa" (`trCumCua()` có sẵn từ lâu nhưng chưa ai dùng ở đây); từ `?v=61` cụm không
     khoá nữa nên càng dễ trùng. Nay: câu đã thuộc một cụm còn sống (≥ 2 câu) thì BỎ QUA và báo
     em biết; kèm chống bấm đúp 400 ms (bẫy E8). Cụm đã trùng sẵn trên kho thì app tự lo khi CHỐT
     (v1.32.0: một câu chỉ thuộc cụm tạo sớm nhất). */
  function trIdsRanh(ids) {
    return ids.filter((id) => {
      const c = trCumCua(id);
      return !(c && (c.ids || []).length > 1);
    });
  }
  let trMocBam = 0;   // mốc cú bấm tạo/thêm cụm gần nhất — cú thứ hai trong 400 ms bị nuốt
  function trBamDon() {
    const t = Date.now();
    if (t - trMocBam < 400) return false;
    trMocBam = t;
    return true;
  }
  function trBaoBoQua(soBo) {
    if (soBo > 0) toast(soBo + ' lỗi đã nằm trong cụm khác — bỏ qua, không gộp lại', 'info');
  }

  function trTaoCum() {
    if (!trBamDon()) return;
    const tatCa = Object.keys(tr.tich);
    const ids = trIdsRanh(tatCa);
    trBaoBoQua(tatCa.length - ids.length);
    if (ids.length < 2) { tr.tich = {}; trVe(); return; }
    /* ⭐ `?v=61` — `daGui: true` ngay từ lúc tạo: bỏ hẳn bước công bố (thầy chốt). */
    const c = { _id: taoCumId(), ids, ten: trDatTen(ids), ai: [state.student], daGui: true, luc: Date.now() };
    tr.tich = {};
    /* ⛔ Ghi KHÔNG còn `await`: hàng đợi `trXepGhi` lo phần lên kho và báo Saving/Saved.
       Hỏng thì dòng trạng thái đỏ + tự thử lại, KHÔNG nuốt lặng. */
    trGhiCum(c);
    toast('Đã gộp ' + ids.length + ' lỗi thành 1 cụm ✓', 'ok');
  }

  function trThemVaoCum(cumId) {
    if (!trBamDon()) return;
    const c = tr.cum.filter((x) => x._id === cumId)[0];
    if (!c) return;   // ⭐ `?v=61` — bỏ chốt `c.daGui`: cụm nào cũng thêm vào được
    /* `?v=63`: câu đã ở trong CHÍNH cụm này thì không tính là "cụm khác"; câu đang ở cụm khác
       còn sống thì bỏ qua + báo (xem chú thích trên `trIdsRanh`). */
    const moi = Object.keys(tr.tich).filter((i) => (c.ids || []).indexOf(i) < 0);
    const ids = trIdsRanh(moi);
    trBaoBoQua(moi.length - ids.length);
    if (!ids.length) {
      tr.tich = {};
      $('trPopCum').classList.add('hidden'); $('trPopCum').classList.remove('flex');
      trVe();
      return;
    }
    ids.forEach((i) => { if ((c.ids || []).indexOf(i) < 0) c.ids.push(i); });
    trThemToi(c);
    c.ten = c.ten || trDatTen(c.ids);
    tr.tich = {};
    $('trPopCum').classList.add('hidden'); $('trPopCum').classList.remove('flex');
    trGhiCum(c);
  }

  function trBoKhoiCum(cumId, errId) {
    const c = tr.cum.filter((x) => x._id === cumId)[0];
    if (!c) return;
    /* ⭐ `?v=61` — bỏ chốt "chưa mở khoá thì không cho đụng" và bỏ luôn việc trả cụm về
       CHƯA GỬI: không còn trạng thái gửi/chưa gửi nữa, cụm luôn sửa được.
       ⚠️ Đội chấm có thể đang bỏ phiếu trên bản cũ — thầy đã biết và chấp nhận khi chốt
          "bỏ hẳn bước công bố". Đừng tự dựng lại cơ chế khoá. */
    c.ids = (c.ids || []).filter((i) => i !== errId);
    trThemToi(c);
    /* Còn dưới 2 dòng thì cụm tự giải tán — ghi `ids` RỖNG chứ KHÔNG xoá tài liệu
       (luật kho cấm xoá; cùng nếp `lessonNghi` bên myLesson). */
    if (c.ids.length < 2) c.ids = [];
    trGhiCum(c);
  }

  /* ⭐ `?v=62` — bỏ phiếu nay cũng đi qua HÀNG ĐỢI: em thấy Saving… / Saved y như hai màn kia,
     và mạng hỏng thì tự thử lại thay vì một cái toast rồi thôi. */
  function trBoPhieu(cumId, y) {
    const cu = trPhieuToi(cumId);
    const moi = cu === y ? '' : y;      // bấm lại đúng nút đang chọn = rút phiếu
    trXepGhi('cumPhieu', cumId + '__' + slugHs(state.student), {
      cumId, voter: state.student, voterTeam: state.myTeam, y: moi, luc: Date.now(),
    });
  }

  function trChuLoi(e) {
    const s = String((e && e.message) || e || '');
    return /40[13]/.test(s) ? 'Phần này chưa được mở khoá — em báo thầy Andrew nhé.'
      : 'Chưa gửi được, em thử lại (' + s + ')';
  }

  /* Pop-up chọn cụm. ⭐ `?v=61` — liệt kê MỌI cụm (trước chỉ liệt kê cụm chưa gửi): bước
     công bố đã bỏ nên không còn cụm nào bị khoá. */
  function trMoPopCum() {
    const ds = tr.cum;
    $('tpcSo').textContent = Object.keys(tr.tich).length;
    $('tpcDs').innerHTML = ds.length ? ds.map((c) => {
      const ids = (c.ids || []).slice().sort((a, b) => ((trLoi(a) || {}).stt || 0) - ((trLoi(b) || {}).stt || 0));
      return '<div class="tpc-o"><div class="tpc-dau"><span>' + ids.length + ' dòng</span>' +
        '<button class="tpc-them" data-trthem="' + escapeHtml(c._id) + '">THÊM VÀO ĐÂY</button>' +
        '<span class="ten">' + escapeHtml(c.ten || '') + '</span></div>' +
        ids.map((id) => {
          const x = trLoi(id);
          if (!x) return '';
          return '<div class="tpc-dong"><span class="tr-stt">' + x.stt + '</span>' +
            '<span class="font-mono text-[11px] font-bold bg-slate-900 text-white rounded-md px-1.5 py-0.5 mt-0.5 flex-none">' + fmtClock(x.t) + '</span>' +
            '<div class="min-w-0">' + trChi(x, true) + '</div></div>';
        }).join('') + '</div>';
    }).join('') : '<div class="text-sm text-slate-400 text-center py-6">Chưa có cụm nào đang soạn. Tích 2 lỗi rồi bấm NEW GROUP.</div>';
    $('trPopCum').classList.remove('hidden'); $('trPopCum').classList.add('flex');
  }

  /* ── Thanh tiếng (KHÔNG có hình) ─────────────────────────────────────────────────
     Vẫn là chính video YouTube của buổi, chỉ giấu khung hình 1px. Link không phải
     YouTube (buổi cũ dùng Drive) thì ẩn luôn thanh này — không có gì để nghe. */
  function trVideo() {
    const p = parseVideoUrl(state.videoUrl);
    /* Không phải YouTube (buổi cũ dùng Drive) ⇒ ẩn CẢ dải thanh tiếng.
       ⭐ `?v=61` — gọi thẳng `#trDaiTieng` thay cho lối trèo `closest('div').parentNode` cũ:
          lối trèo đó đếm đúng số tầng của bố cục CŨ, đổi bố cục là nó ẩn nhầm khối khác. */
    if (!p || p.type !== 'youtube') { $('trDaiTieng').classList.add('hidden'); return; }
    $('trDaiTieng').classList.remove('hidden');
    $('trungVideo').innerHTML = '<div id="trYt"></div>';
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    const dung = () => {
      tr.yt = new YT.Player('trYt', {
        videoId: p.id, playerVars: { rel: 0, playsinline: 1 },
        events: { onReady: () => { tr.videoSan = true; trNhipVideo(); } },
      });
    };
    if (window.YT && window.YT.Player) dung(); else window.onYouTubeIframeAPIReady = dung;
  }
  /* ⛔ 03/09 — VẼ ICON BẰNG SVG THẬT, KHÔNG dùng `<i data-lucide>` ở đây.
     Nhịp này chạy 400ms/lần và gán `innerHTML`; thẻ `data-lucide` chỉ thành hình khi có ai gọi
     `lucide.createIcons()`, mà gọi lại mỗi 400ms thì phí. Bản trước để `data-lucide` nên nút
     hiện ra là một vòng tròn TRỐNG TRƠN — thầy chụp lại được. Vẽ thẳng SVG là hết chuyện. */
  /* ⭐ `?v=61` — về `w-4 h-4` cho khớp nút 34px của `#videoCtrl` bên màn chấm (trước là nút
     40px viền tím nên icon 20px). */
  const TR_IC_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 pointer-events-none" style="margin-left:2px"><path d="M7 4.5v15l12-7.5z"/></svg>';
  const TR_IC_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 pointer-events-none"><rect x="6.5" y="4.5" width="4" height="15" rx="1"/><rect x="13.5" y="4.5" width="4" height="15" rx="1"/></svg>';

  function trNhipVideo() {
    let phatCu = null;
    setInterval(() => {
      if (!tr.videoSan || !tr.yt) return;
      try {
        const cur = tr.yt.getCurrentTime() || 0, dur = tr.yt.getDuration() || 0;
        const phat = tr.yt.getPlayerState() === 1;
        /* Chỉ vẽ lại icon khi TRẠNG THÁI ĐỔI — đỡ đập DOM 2,5 lần mỗi giây. */
        if (phat !== phatCu) {
          phatCu = phat;
          $('trPlay').innerHTML = phat ? TR_IC_PAUSE : TR_IC_PLAY;
        }
        if (!tr.keo && dur) $('trSeek').value = Math.round((cur / dur) * 1000);
        $('trCur').textContent = fmtClock(cur);
        $('trDur').textContent = fmtClock(dur);
      } catch (e) {}
    }, 400);
  }
  function trToiGiay(s) {
    if (!tr.videoSan || !tr.yt) return;
    try { tr.yt.seekTo(Math.max(0, s - 1), true); tr.yt.playVideo(); } catch (e) {}
  }
  /* Nhích tương đối — nút −5s / +5s. Không tự phát: em đang dừng để đọc thì cứ để dừng. */
  function trNhich(giay) {
    if (!tr.videoSan || !tr.yt) return;
    try {
      const cur = tr.yt.getCurrentTime() || 0;
      const dur = tr.yt.getDuration() || 0;
      tr.yt.seekTo(Math.max(0, Math.min(dur || 1e9, cur + giay)), true);
    } catch (e) {}
  }

  function datAvatarTrung() {
    $('trAvatarChu').textContent = initialsOf(state.student);
    const img = $('trAvatar');
    img.src = avatarUrl(state.student);
    img.dataset.avEm = state.student;
    img.onerror = () => { img.remove(); };
  }

  /* ── Bắt tay bấm ───────────────────────────────────────────────────────────────── */
  function noiTayTrung() {
    $('ktDs').addEventListener('click', (ev) => {
      const nutGio = ev.target.closest('[data-trseek]');
      if (nutGio) { ev.stopPropagation(); trToiGiay(+nutGio.dataset.trseek); return; }
      const o = ev.target.closest('[data-trloi]');
      if (!o) return;
      const id = o.dataset.trloi;
      if (tr.tich[id]) delete tr.tich[id]; else tr.tich[id] = 1;
      trVeKt();
    });
    $('ktCum').addEventListener('click', (ev) => {
      const nutGio = ev.target.closest('[data-trseek]');
      if (nutGio) { trToiGiay(+nutGio.dataset.trseek); return; }
      /* ⛔ `?v=61` — tay bắt `[data-trmokhoa]` (nút bút mở khoá cụm) đã GỠ cùng nút bút:
         không còn cụm nào bị khoá nữa. */
      const bo = ev.target.closest('[data-trbo]');
      if (!bo) return;
      tr.xoa = bo.dataset.trbo.split('|');
      $('trPopXoa').classList.remove('hidden'); $('trPopXoa').classList.add('flex');
    });
    $('xnWrap').addEventListener('click', (ev) => {
      const nutGio = ev.target.closest('[data-trseek]');
      if (nutGio) { trToiGiay(+nutGio.dataset.trseek); return; }
      const v = ev.target.closest('[data-trvote]');
      if (v) trBoPhieu(v.dataset.trcum, v.dataset.trvote);
    });
    $('ktTao').addEventListener('click', trTaoCum);
    $('ktThem').addEventListener('click', trMoPopCum);
    /* ⛔ `?v=61` — nút SAVE (`#btnTrGui` → `trGuiDeNghi`) ĐÃ GỠ HẲN khỏi HTML lẫn tay bắt.
       Nó vốn KHÔNG phải nút lưu mà là nút CÔNG BỐ (`daGui:true` + khoá cụm); thầy chốt 05/09
       bỏ hẳn bước đó, cụm lên kho và hiện cho đội chấm ngay khi vừa tạo. */
    $('tpcDong').addEventListener('click', () => {
      $('trPopCum').classList.add('hidden'); $('trPopCum').classList.remove('flex');
    });
    $('trPopCum').addEventListener('click', (ev) => {
      if (ev.target === $('trPopCum')) {
        $('trPopCum').classList.add('hidden'); $('trPopCum').classList.remove('flex'); return;
      }
      const b = ev.target.closest('[data-trthem]');
      if (b) trThemVaoCum(b.dataset.trthem);
    });
    $('tpxKhong').addEventListener('click', () => {
      $('trPopXoa').classList.add('hidden'); $('trPopXoa').classList.remove('flex');
    });
    $('tpxCo').addEventListener('click', () => {
      $('trPopXoa').classList.add('hidden'); $('trPopXoa').classList.remove('flex');
      if (tr.xoa) trBoKhoiCum(tr.xoa[0], tr.xoa[1]);
      tr.xoa = null;
    });
    $('trPlay').addEventListener('click', () => {
      if (!tr.videoSan || !tr.yt) return;
      try { if (tr.yt.getPlayerState() === 1) tr.yt.pauseVideo(); else tr.yt.playVideo(); } catch (e) {}
    });
    $('trLui').addEventListener('click', () => trNhich(-5));
    $('trToi').addEventListener('click', () => trNhich(5));
    $('trSeek').addEventListener('input', () => { tr.keo = true; });
    $('trSeek').addEventListener('change', () => {
      tr.keo = false;
      if (!tr.videoSan || !tr.yt) return;
      try { tr.yt.seekTo((+$('trSeek').value / 1000) * (tr.yt.getDuration() || 0), true); } catch (e) {}
    });
    $('trTab').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-trcot]');
      if (b) trDatCot(b.dataset.trcot);
    });
    $('xnTab').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-xnloc]');
      if (b) trDatLocXn(b.dataset.xnloc);
    });
  }
  noiTayTrung();
})();
