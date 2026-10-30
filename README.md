# Lesson in Andrew Classes — trang bài tập của học sinh

Trang web tĩnh cho học sinh **Andrew Classes** vào làm bài tập.
Một link duy nhất cho mọi lớp, mọi buổi: **https://andrewclasses.com**
(link cũ `andrewclasses-01.github.io/myLesson/` tự chuyển hướng về đây; file `CNAME` +
4 bản ghi A `185.199.108-111.153` ở portal.inet.vn, Bảo vệ/proxy TẮT)

Học sinh gõ **MỘT mã riêng của mình** (thầy đặt trong myStudent, tab Lớp học) → trang tự biết
em nào, lớp nào → thấy mọi bài của lớp mình → bấm vào bài là chơi ngay trong trang
(game lấy từ [AWord](https://aword.andrewclasses.com/), bài nghe lấy từ kho `myLesson-audio`).
Ngay cạnh mỗi game có **bảng xếp hạng cả lớp** đọc thẳng điểm từ kho AWord.

**Thầy** gõ **mã quản lý** ở cùng ô đó thì vào `dashboard.html` (trang quản lý, đang dựng).
Mã quản lý cất trong `config.js` dạng **băm SHA-256** (`QUAN_LY_BAM`) — đọc file không suy
ngược ra mã. ⚠️ Không phải bảo mật thật, chỉ chặn người tình cờ đọc file.

## ⭐ v1.451.0 (30/10/2026) — BÀI TRONG SÁCH: dấu máy KHÔNG BAO GIỜ bị khuất ngoài khung trang *(bản mới nhất)*

Thầy chụp NTK10: dấu ✓/✕ máy đặt bên trái chữ cái em khoanh, chữ sát gáy sách ⇒ dấu rơi ra ngoài khung tự cắt (`may.cat`), chỉ còn một mẩu ở mép.
`js/cham-sach.js?v=17`: `khungAnh(ban, w, h)` = phần trang đang hiện (toạ độ ảnh gốc) ⇒ truyền vào `hinhDau(m, w, h, kh)` ở mọi chỗ vẽ (ảnh chính,
ảnh nhỏ, CHỤP LỖI/ĐẠT, con trỏ) và đo (bấm/kéo/nhấp nháy, `kichCo().kh`). Dấu máy không lọt khung ⇒ nhỏ lại 80% và dịch dần (16 nấc) về phía chữ cái
tới khi lọt — được đè lên "A. B. C. D."; mọi dấu cuối cùng kẹp trong khung. Đo bàn thử 5 trang có 40 dấu từng lọt ngoài: 0 điểm màu dấu chạm mép.

## ⭐ v1.450.0 (30/10/2026) — BÀI TRONG SÁCH: cột tên không cuộn ngang · ô ảnh nhỏ cố định · dấu ĐÃ SỬA · bấm đúp ĐẠT mọi trường hợp

Thầy "ok build" 30/10. `js/cham-sach.js?v=16` + máy chủ app `8b4d990` (ĐÃ DEPLOY `duyetSach` + `kiemSach`):
- **Cột tên em** `fit-content(360px)`: tự rộng theo hàng dài nhất (tên 1 dòng + nhãn đủ chữ), quá 360px thì tên xuống dòng; tắt cuộn ngang.
- **Cột ảnh nhỏ**: số x/y lên đầu cột; mỗi trang một Ô CỐ ĐỊNH (thẻ nền riêng, ảnh 160px + "TRANG n") xếp từ trên xuống trong `.cs-tn-ds`;
  thừa chỗ để trống, nhiều trang thì cuộn (giữ vị trí cuộn khi vẽ lại, chuyển trang ⇒ cuộn ô đang xem vào tầm nhìn). Màn ≤1100px: hàng ngang.
- **Dấu ĐÃ SỬA** (`loai:"dasua"`): khung vuông xanh lá chữ ĐÃ SỬA. Nút công cụ sau ? (gắn câu ✕ đang chọn trong bảng, không thì câu ✕ gần nhất);
  chuột phải vào ✕ ⇒ "Đánh ĐÃ SỬA" (đặt bên TRÁI ✕ — lề trang; không vừa phần trang đang hiện ⇒ bên phải). Câu có ĐÃ SỬA TÍNH NHƯ ĐÚNG (`loaiCau`):
  không chặn ĐẠT, bảng AI hiện khung xanh + chữ em gạch ngang, ảnh nhỏ/nhóm trang xanh khi hết lỗi, lời nhắn không nhắc. ✕ vẫn giữ trên ảnh.
  Cỡ + nét chỉnh trong ⚙. Máy chủ `luuChamSach` lưu `loai` nguyên như gửi ⇒ không phải đổi.
- **Bấm đúp ĐẠT = XÁC NHẬN ĐẠT mọi trường hợp** (còn ✕, thiếu dấu, thiếu trang, em chưa nộp gì — em gửi qua Zalo): nút chỉ `disabled` lúc đang ghi;
  chưa sẵn sàng ⇒ lớp `khoa`, bấm một lần chỉ nhắc. Gọi `duyetSach {tat:true, tt:"dat", tay:true, ten}` ⇒ máy chủ ghi `datTay {luc, thieu}` + `xong:true`
  (chưa có tài liệu ⇒ tạo mới). Danh sách: "ĐÃ ĐẠT · QUA ZALO" khi thiếu trang. BỎ ĐẠT / TRẢ LẠI một trang ⇒ gỡ `datTay`; kiemSach giữ xong khi còn `datTay`.
- Bàn thử: `ban-thu-tab-sach.html` (`cham-sach-tab-thu.js?v=9`, hàm giả hiểu `tay`). Thử máy chủ: scratchpad `thu_dat_tay.js` 9/9 (Firestore giả).

## ⭐ v1.449.0 (29/10/2026) — BÀI TRONG SÁCH: cột ảnh nhỏ các trang · nút lên thanh trên · cột AI tự gọn · Alt kéo dấu · TỰ CẮT phần thừa

Thầy duyệt trên bàn thử `D:\OTHERS\CLAUDE\myLesson - thiet ke nop sach\ban-thu-tab-sach.html` rồi chốt. `js/cham-sach.js?v=15`:
- **Cột ảnh nhỏ** (150px, giữa danh sách em và ảnh chấm) thay hàng nút TRANG: ảnh nhỏ vẽ cả dấu + nét thầy (cập nhật sau mỗi lần lưu), viền xanh / vàng / đỏ,
  "TRANG n" cách ảnh 7px, vạch mảnh giữa các trang, chân cột **x/y** (trang đang xem / tổng). Mỗi ô `container-type:size` ⇒ ảnh + chữ co theo ô, không cuộn.
- **CHỤP LỖI · ĐẠT + thông tin** (dòng khoá, trạng thái lưu, giờ nộp) lên góc trái thanh trên; công cụ vẽ bên phải. **Bỏ dải dưới cùng.**
- Trang chấm nhúng trong tab: bỏ dải "CHẤM BÀI SÁCH · …" — `dashboard.html` `hqSachTt()` đưa "Chấm bài sách · <bài> · Trang …" lên dải tab, sát ⚙ (điện thoại ẩn).
- **Cột CHẤM THAM KHẢO tự gọn** 3 nấc (`vuaAi`: g1 bỏ dòng hướng dẫn/chú thích + dòng sát · g2 giấu dòng ghi (rê chuột vẫn đọc) · g3 chữ nhỏ) tới khi đủ mọi câu không cuộn; đổi cỡ khung ⇒ chọn lại.
- **Giữ Alt** = kéo dấu như Ctrl, dù đang chọn công cụ nào (`keoPhim`); chặn Alt nhảy vào menu Chrome khi trang chấm mở.
- **Tự cắt phần thừa** (máy chủ app `may.cat` = khung trang dò bằng Vision, tỉ lệ theo ảnh gốc): `catCv` ⇒ khung trên canvas đã xoay; canvas trên màn chỉ là khung
  (`S.cat`), mọi toạ độ dấu/nét giữ theo canvas đầy đủ (`kichCo`, `toaDo` cộng độ dời). Ảnh nhỏ + ảnh CHỤP LỖI / TRẢ LẠI / ĐẠT (`dungTrang`) cũng cắt. Không có `cat` ⇒ trọn ảnh.
  Bài nộp trước: mở em có trang chưa có khung ⇒ `buKhung` gọi hàm `catSach` (mỗi em một lần/phiên, lỗi ⇒ im lặng) rồi đọc lại bài.

## ⭐ v1.448.1 (29/10/2026) — BÀI TRONG SÁCH: ảnh trang ở KHUNG CHẤM GIỮA co trọn khung, không phải cuộn

- Thầy mở Chrome thấy ảnh khung giữa vẫn to, phải cuộn (v1.448.0 chỉ làm pop-up CHỤP LỖI). `js/cham-sach.js` (?v=14): `.cs-vung` container `size`,
  `.cs-ve` `fit-content` canh giữa, `#csCv` `max-width:100cqw; max-height:100cqh` (giữ tỉ lệ) ⇒ ảnh vừa cả ngang lẫn cao. Nhãn `.cs-canh` nổi (absolute) không chiếm chỗ.
- ≤ 1100px (cột xếp dọc): `.cs-giua` cao `max(420px, 100vh − 140px)` — thiếu chiều cao xác định thì `cqh` = 0 ⇒ ảnh biến mất.
- Thử bàn thử 1600×860 (khung 882×562 ⇒ ảnh 407×542) và 900×700 (791×417 ⇒ 298×397), không thanh cuộn.

## ⭐ v1.448.0 (29/10/2026) — BÀI TRONG SÁCH: trả lại ⇄ chấp nhận lại (có xác nhận) · CHỤP LỖI vừa khung + cuộn tới trang lỗi · bấm đúp ĐẠT

Thầy 29/10 (xem bài NTK10 trên dashboard):
- `js/cham-sach.js` (?v=13) pop-up CHỤP LỖI: nút TRẢ LẠI TRANG n ⇄ **ĐÃ TRẢ LẠI TRANG n** (nền đỏ) — đã trả vẫn bấm được ⇒ **CHẤP NHẬN LẠI** = `duyetSach { trang, tt:'dat' }`
  (máy chủ sẵn có, không deploy). Cả hai chiều hỏi **pop-up nhỏ** `hoiNho` (Esc / HUỶ / bấm nền = thôi); hỏi BỎ ĐẠT cũng dùng `hoiNho`.
- Mở CHỤP LỖI ⇒ tự cuộn tới **trang đầu tiên có lỗi** (✕ sai · ? chưa chắc · máy chặn).
- Mỗi trang cao ĐÚNG khung pop-up (`.cs-pop-than` container `size`, hàng `100cqh`), ảnh co trọn ⇒ luôn thấy cả trang, mọi cỡ màn hình (≤ 640px: ảnh 72cqh, cột phải xuống dưới).
- `ttTrang`: trang đã trả lại vẫn đếm câu sai (trước in "Không có câu sai").
- Nút ĐẠT bị khoá CHỈ vì còn câu chưa có dấu (không có ✕) ⇒ không `disabled` nữa mà lớp `khoa` (mờ): bấm một lần = nhắc, **bấm đúp = vẫn ghi ĐẠT**
  (ca: xoá dấu máy rồi đặt dấu tay không gắn được câu).
- Thử: bàn thử `D:\OTHERS\CLAUDE\myLesson - thiet ke nop sach\ban-thu-tab-sach.html` (cham-sach-tab-thu.js = bản chép + `__hamGia`).

## ⭐ v1.447.1 (29/10/2026) — AWARD cả lớp: nút "Chỉ em đủ bài" đứng TRƯỚC "Cả lớp"

- Thầy 29/10: trong AWARD đặt "Chỉ em đủ bài" trước, "Cả lớp" sau. `js/sao-xh.js` đảo 2 nút `data-apt` (mặc định vẫn Chỉ em đủ bài); `sao-xh.js?v=6`.

## ⭐ v1.447.0 (29/10/2026) — ⭐ CẢ LỚP: AWARD chọn được "Cả lớp" / "Chỉ em đủ bài"

Thầy 29/10: PUNISHMENT cả lớp đã có "Cả lớp / Chỉ em thiếu bài" nhưng AWARD thì chưa ⇒ muốn thưởng cả lớp TRỪ các em thiếu bài.
- `js/sao-xh.js` `moLop`: khi lớp còn em thiếu bài, tab AWARD hiện hàng chọn **Cả lớp (N)** / **Chỉ em đủ bài (N − thiếu)** — MẶC ĐỊNH "Chỉ em đủ bài".
  Trạng thái riêng `st.apT` (PUNISHMENT vẫn `st.ap`, mặc định Cả lớp). Lớp đủ bài hết ⇒ không hiện hàng chọn (như cũ).
- Lý do gợi ý đổi theo đối tượng: "Chỉ em đủ bài" dùng `gy.thuongDu` (HOÀN THÀNH ĐỦ BÀI · NỘP BÀI ĐÚNG HẠN · LUYỆN TẬP CHĂM CHỈ — không nói "cả lớp");
  "Cả lớp" giữ 3 lý do CẢ LỚP cũ. Đổi đối tượng ⇒ chọn lại lý do đầu. Nút chốt ghi đúng số em (VD "THƯỞNG 1 SAO · 17 EM"); danh sách rỗng ⇒ không làm gì.
- `dashboard.html`: `sao-xh.js?v=5`. Thử: bàn thử tạm (đã xoá) 5 em, 1 em thiếu ⇒ thưởng chỉ 4 em có sao tạm, em thiếu 0; PUNISHMENT không đổi.

## ⭐ v1.446.0 (29/10/2026) — HỘP "QUẢN LÝ GIẢI ĐẤU" (đổi tên Quản lý thách đấu): 4 thẻ · dải + ⚙ · theo dõi trận / em / xếp hạng

Mẫu thầy duyệt `D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\quan-tri-ass-v2\index.html` (v1 = các phương án bố cục). Thầy chốt 29/10: đặt TRONG menu cũ, đổi tên,
4 thẻ ngang có số cơ bản, bấm thẻ ⇒ dải thông số + nút ⚙ Cài đặt cuối dải (thiết đặt KHÔNG bày ra ngoài nữa) + các tab; xếp hạng có Mùa + Mọi thời đại; Luyện tập chỉ bật/tắt.
- `js/td-ql.js`: bỏ cột trái. Đầu hộp: "Học sinh bị chặn" (đếm đỏ) + ✕. 4 thẻ Giao hữu · Đấu giải · Luyện tập · Xếp hạng (trạng thái chế độ + Hôm nay/Đang đấu/Tổng).
  Dải: trạng thái · lớp · bắt buộc xong trận · trận/em/bỏ dở hôm nay · tổng (xh: mùa, còn N ngày, số 1). ⚙ mở BẢNG GẬP: thẻ chế độ của đúng thẻ đang chọn
  (Lưu/Huỷ như cũ) + xh: toàn bộ js/xh-ql.js (mùa, tạo/tạm dừng/chốt & phát sao). Đổi thẻ khi còn chưa lưu ⇒ hỏi. `TdQl.mo({ the })` mở thẳng thẻ.
- `js/td-xem.js` (MỚI) — tab: Tất cả trận (Hôm nay/Hôm qua/7 ngày/chọn ngày · tìm tên · lớp · chỉ bỏ dở; cờ rời trận/mất kết nối/không tính điểm/gửi quá nhanh;
  xh có cột ± điểm hạng) ⇒ Chi tiết trận (tỉ số, kết quả, ± hạng, DÒNG THỜI GIAN từng từ theo giây trên/dưới, 2 cột từ, bỏ lỡ, xem như khán giả) ·
  Học sinh (tìm ⇒ hồ sơ: lọc loại, T/H/B, bỏ dở, cao nhất mùa, đường điểm hạng mùa theo trận, đối thủ hay gặp, lịch sử ≤200 trận; gộp uid cũ cùng tên+lớp) ·
  Bảng xếp hạng (xh: từng mùa — đủ mọi em, hạng theo SUẤT như xh-ql — hoặc Mọi thời đại; gh/giai: mọi thời đại của loại đó; ⬇ Tải Excel .xls) ·
  Giải đang chạy (bấm lớp ⇒ GiaiPop) · Các mùa · Luyện tập: chỉ thông tin.
- Đọc kho KHÔNG cần chỉ mục ghép: tranDau theo `taoLuc` (một trường) rồi lọc ở máy; em = `nguoi array-contains-any`; mùa = xhMua/{mua}/em.
  MỌI THỜI ĐẠI = tài liệu `nwCauHinh/tdTong` (luật nwCauHinh sẵn có: thầy ghi, em đăng nhập đọc) — mở tab Học sinh/Bảng xếp hạng thì cộng dồn trận có
  `xongLuc` > `moc` (lần ĐẦU đọc hết mọi trận đã chốt, vài nghìn lượt đọc, một lần). Thầy không vào bảng.
- Menu cột trái (`js/nw-thanh.js?v=41`) đổi chữ + biểu tượng cúp. `td-ql.js?v=6`, `td-xem.js?v=1`, `td-ql.css?v=3`.
- Thử: bàn thử tạm (đã xoá) ?thu=1 — 4 thẻ, dải, ⚙ (xh kèm mùa), chặn em, mọi tab, chi tiết, hồ sơ, mùa/mọi thời đại. ⬜ CHƯA đọc kho thật bằng phiên thầy (auto mode chặn khoá quản trị).

## ⭐ v1.445.0 (29/10/2026) — DẢI A SHOW SPEED Ở KHUNG CHAT DASHBOARD: nút ĐẤU mờ + 📊

Thầy hỏi 29/10 vì ô chat dashboard không có nút Tìm trận (học sinh thì ĐÃ có “⚡ ĐẤU” — bản thầy cố ý giấu từ v1.438.0). Thầy chốt:
- `js/dang-dau.js` dải C bản thầy (`dau:false`): vẫn vẽ nút ⚡ ĐẤU nhưng `disabled` (mờ, xám, không bấm) + nút 📊 `data-ddn-td` (chỉ khi trang có `window.TdQl` = dashboard)
  ⇒ `TdQl.mo({ the: 'xh' })`. Thầy vào trang lớp (`thayvao`) không có TdQl ⇒ chỉ nút mờ.
- `js/td-ql.js` `mo(o)`: `o.the === 'xh'` ⇒ mở thẳng mục Mùa xếp hạng (tạm, tới khi hộp “Quản lý giải đấu” mẫu `XEP HANG MUA - thiet ke\quan-tri-ass-v2` lên).
- `dang-dau.js?v=5` (dashboard · lop · khoa · nw/tinnhan), `td-ql.js?v=5`. Thử bàn thử tinnhan ?thu=1: nút mờ bấm không chuyển trang, 📊 gọi đúng {the:'xh'}, khung 400/700px không tràn.

## ⭐ v1.444.0 (28/10/2026) — A SHOW SPEED: BẮT BUỘC HOÀN THÀNH TRẬN

Thầy chốt (nghiên cứu `D:\OTHERS\CLAUDE\DAU GAME ONLINE - thiet ke\NGHIEN CUU CHAN BO TRAN 28-10-2026.md`), đi cặp máy chủ myLesson (tdDoi/tdTu/tdNhip/tdQuet đã deploy):
- Máy chủ: trận vào `choi` ⇒ đọc công tắc `nwCauHinh/thachDau.tro.ass.<gh|giai|xh>.buoc` (thiếu = BẬT) ⇒ ghi KHOÁ TRẬN `nwUsers/{uid}.tranDang {id, ketThuc, xh}`
  cho em (không khoá thầy) + trận mang `buoc`, `khoa`. `chot` gỡ khoá. Em không tự xoá được (luật nwUsers sẵn có — đo 403).
- `js/giu-tran.js` (nạp ở lop · khoa · bai · bai-sp · sp-chitiet · index · nw/*): em mở trang / tab hiện lại / Back ⇒ thấy khoá + trận còn `choi` ⇒ `location.replace`
  về `nw/tran.html` hoặc `nw/xhtran.html`. Quyết theo trangThai trận, không tin đồng hồ máy em. Khung nhúng không tự chuyển.
- `nw/js/tran.js` + `nw/js/xh-tran.js`: trận `buoc` chưa chốt ⇒ không nút Rời trận / nút nhà (xếp hạng: ✕ giấu giữ chỗ), giữ Back (pushState), máy tính hỏi khi
  đóng tab. Luyện tập không đổi. Bàn thử: `?thu=1&buoc=1`.
- Dashboard "Quản lý thách đấu" (`js/td-ql.js`): Giao hữu · Đấu giải · Xếp hạng có hàng **Bắt buộc hoàn thành trận** Bật/Tắt.
- Thử: `node tools/thu-tran-that.js` 22/22 (thêm 4 phép khoá trận) · bàn thử 2 trang trận + dashboard · trận thật trên kho: mở nw/khampha.html giữa trận ⇒ về trận.

## ⭐ v1.443.0 (28/10/2026) — Ô VIDEO: vòng xoay nạp + "Yêu cầu xem" khoá thẻ bên dưới

Thầy chốt (đi cặp app myLesson v2.193.0 + myStudio v0.12.4):
- Bấm phát: khung phim GIẤU (`.game.dang-nap`, opacity 0) + vòng xoay teal `.vd-nap` tới khi trình phát báo `play` ⇒ hình và tiếng ra cùng lúc.
- **"Yêu cầu xem"** (khối `yc:1`, app mặc định bật): `khoaSauVideoDoc` — mọi thẻ đứng SAU video chưa xem hết (cả bài STAGE) bị giấu, thay bằng
  dòng chờ `.card.st-cho.vd-khoa` "BÀI n · tên · 🔒 XEM HẾT VIDEO ĐỂ MỞ". Xem hết (`daXongVideoDoc`) ⇒ mở ngay (một lần, không tải lại).
  Bài đẩy trước v2.193.0 không có `yc` ⇒ không khoá (thầy đẩy lại bài để bật).
- Test (bàn thử xem trước, phim live): 2 thẻ act sau video hiện dòng chờ; bấm phát ⇒ vòng xoay ⇒ phim; giả xem hết ⇒ 2 thẻ mở đủ (bìa READY + bảng).

## ⭐ v1.442.0 (28/10/2026) — Ô VIDEO: KHOÁ TUA tới đoạn chưa xem

Thầy chốt: chưa xem hết thì không cho tua tới đoạn chưa xem — kéo lên thì chấm đang phát nhảy về vị trí xem liền xa nhất; xem hết mới tua tuỳ ý.
- `bai.html veKhoiVideoDoc`: `mocLienVideoDoc` = cuối khúc đã xem liền từ giây 0 (`DOAN_XONG['vo<o>'][0]`, tính cả tiến độ trên máy chủ ⇒
  mở lại bài vẫn tua được tới chỗ đã xem). `guiKhoaTua` gửi `{lenh:'khoaTua', t}` lúc trình phát `ready` + mỗi nhịp `progress`; xem hết ⇒
  `t:null`. Trình phát myDocument (myStudio v0.12.3, kho `33f19ba`) tự chặn ngay khi kéo. Lưới an toàn cho trình phát cũ (`keoVeMoc`):
  `progress`/`play` có t quá mốc + 2,5 s ⇒ gửi `seek` về mốc.
- Test (bàn thử xem trước, phim live): xem tới 0:30 ⇒ bấm thanh phim 70 % ⇒ đứng 0:31; lùi về 0:10 được, khúc vẫn liền [0,37]; giả xem hết ⇒
  bấm 70 % ⇒ 2:02.

## ⭐ v1.441.0 (28/10/2026) — Ô VIDEO: bìa chỉ còn nút phát + thanh đã xem không chữ

Thầy chốt mẫu v1 kiểu A (`D:\OTHERS\CLAUDE\myLesson - thiet ke o video\mau-v1.html`):
- Bìa video (`bai.html veKhoiVideoDoc`): bỏ READY, tên phim, tên em, lớp ⇒ một nút phát tròn teal 68px giữa ảnh bìa (ảnh tối nhẹ .28).
- Dòng "ĐÃ XEM x% · …" ⇒ thanh `.vd-xem` KHÔNG chữ, chép khuôn thanh đoạn bài giảng (ray 8px + chấm tròn teal viền trắng + bong bóng %).
  Chưa xong tối đa 99%; xem hết ⇒ cả thanh xanh lá, bong bóng "✓ 100%". Rê chuột = lời nhắc "tua không tính".
- Test: bàn thử xem trước (B2B): bìa đúng mẫu, bấm phát ⇒ phim chạy + 5 %, giả xem hết ⇒ xanh lá ✓ 100%.

## ⭐ v1.440.0 (28/10/2026) — Khối VIDEO myDocument trên trang bài + dòng VIDEO ở dashboard

Thầy chốt (đi cặp app myLesson v2.192.0 ô VIDEO + myStudio v0.12.2): video bài nói mẫu (phim vẽ bằng code trên
document.andrewclasses.com) gắn vào ô bài tập; em phải XEM HẾT mới xong.
- `bai.html`: khối `{loai:'video', src, doc, giay, poster, o}` ⇒ `veKhoiVideoDoc` (bìa poster + READY ⇒ khung 16:9 nhúng
  `?nhung=1`, chờ trình phát báo `ready` rồi gửi `play`). Đếm giờ xem THẬT từ tin `progress` của khung phim: chỉ cộng khúc khi t
  tăng đều (0 < Δ ≤ 2,5 s và đồng hồ thật trôi ≥ 0,6·Δ) ⇒ tua không tính; dừng giữ mốc. Khúc vào `DOAN_XONG['vo<o>']` ⇒ đi chung
  `lessonVideoTienDo/<mã em>__<bài>` trường `khuc` (luật SẴN CÓ — không kho mới, không luật mới). XONG = phủ ≥ tổng − 2 s.
  Khối video Drive cũ `{driveId}` giữ nguyên.
- `dashboard.html` tab BÀI TẬP: dòng VIDEO "x/N đã xem hết" (`docVideoDocCuaBai` đọc 1 lượt / em, 6 luồng; rê chuột = tên em
  chưa xem hết; ngưỡng tổng − 2,5 s vì danh mục làm tròn giây).
- Chưa làm: trang lớp `lop.html` chưa đếm video vào x/N của thẻ; chưa có "bỏ qua em ở riêng dòng video".
- Test: bàn thử xem trước (đăng nhập giả em thử, B2B) — bấm READY tự phát, 9 s ⇒ 5 %, tua tới 165 s ⇒ phần tua không tính (13 %),
  hết phim cộng tới cuối; `daXongVideoDoc` đúng 3 ca; bộ đọc dashboard thử bằng Node với kho giả (xem hết ⇒ xong, xem 50 s ⇒ chưa).

## ⭐ v1.439.0 (28/10/2026) — Trận ĐANG ĐẤU: trận bắt đầu trước ở trên

Thầy chốt: mọi nơi xem trận đang đấu, trận diễn ra TRƯỚC xếp trên, trận mới hiện ở dưới (khoá `batDau`, thiếu thì `ketThuc`).
- `js/dang-dau.js` (thanh A, bong bóng B, dải chat C): bỏ "cặp của em đứng đầu + nhiều điểm trước".
- `nw/js/xephang.js` tab/thẻ Đang đấu sảnh xếp hạng: bỏ "hạng cao trước".
- `js/the-td.js` dải ghim giải trong chat: bỏ "trận của giải trước + mới nhất trước".
- `js/thanh-giai.js`, `js/giai-pop.js`, `nw/js/giaidau.js`: trước đây không xếp (theo thứ tự kho) ⇒ nay xếp theo giờ bắt đầu.
- ?v=: dang-dau 4 · thanh-giai 4 · the-td 21 · xephang 10 · giai-pop 4 · giaidau 20.

## ⭐ v1.438.0 (28/10/2026) — DẢI A SHOW SPEED đầu khung chat nhóm lớp

Mẫu thầy chốt: `D:\OTHERS\CLAUDE\XEP HANG MUA - thiet ke\dang-dau-chat-v1\index.html`.
- `js/dang-dau.js` kiểu C `DangDau.chat(el, {dau})`: dải dưới tên lớp, đứng yên khi cuộn tin. Khung hẹp = avatar + "N trận" (bấm xổ / điện thoại tấm trượt); khung ≥ 560px (container query) = các cặp chạy ngang + ﹀. KHÔNG có trận vẫn hiện A SHOW SPEED + ⚡ ĐẤU NGAY. Dashboard (thầy): không nút Đấu, bấm trận mở tab mới.
- `js/chat-ui.js` tuỳ chọn `dangDau()` + `doiCao()`: chèn dải một lần ngay trên khung tin, phòng không phải nhóm lớp thì ẩn.
- Gắn ở: lop.html, khoa.html (cộng chiều cao dải vào `--san-chat`), dashboard.html (nạp dang-dau.js), nw/js/chat.js `taoKhuonLop` (trang Tin nhắn + hộp tin nhắn nổi). Dùng chung một vòng hỏi 10 giây với thanh A + bong bóng B.
- ?v=: chat-ui 28 · dang-dau 3 · tn-pop 17 · nw/js/chat.js 41.

## ⭐ v1.437.1 (28/10/2026) — CHÉP NHANH: "thiếu bài" chỉ tính các bảng tab XẾP HẠNG

Ca A2B LISTENING SKILL (2 act + worksheet 2 trang + nghe): cả 18 em bị kê vì worksheet, thầy chỉ muốn Kim Ngân + Phúc Hưng (26/30).
- `hqDsThieuBai`: chỉ act (điểm cao nhất ÷ tối đa) + bước không điểm của lesson CHƯƠNG — y các bảng XẾP HẠNG. Bỏ worksheet (BÀI NỘP) và bài nghe.

## ⭐ v1.437.0 (28/10/2026) — CHÉP NHANH danh sách em (icon góc dưới phải hộp chi tiết bài)

- `dashboard.html` nút `#hqChep` (chỉ icon chữ T) trong `#bmHop`, hiện ở mọi tab / mọi dạng bài. Bấm = chép **HS Thiếu bài**; chuột phải = menu **HS Thiếu bài** / **HS Chưa luyện tập**.
- Dòng: `1. Anh Thư @Anh` — tên như bảng (dài > 10 thì viết tắt), @ = chữ đầu tên bỏ dấu ("Đ.N.B.An" ⇒ @An).
- Thiếu bài (`hqDsThieuBai`): em đang tính có % < 100% (99% vẫn thiếu), thiếu nhiều trước, bằng nhau theo sĩ số. % = trung bình mục trong phạm vi đang xem: act = điểm cao nhất ÷ tối đa (`hqPhanAct`, luật lượt y `hqBxhAct`), worksheet = trang nộp ÷ số trang, lesson CHƯƠNG + mọi bước không điểm (xong/chưa). Mục em bị ✕ riêng không tính. Bước CHƯƠNG chưa đọc xong ⇒ báo bấm lại.
- Chưa luyện tập (`hqDsChuaLuyen`): `hqTongEm` = 0 (y cột TỔNG THỜI GIAN).

## ⭐ v1.436.0 (28/10/2026) — BÀI TRONG SÁCH: bấm ĐẠT là ghi ngay, CHỤP ẢNH khi đã đạt, bấm lại để BỎ ĐẠT

- `js/cham-sach.js` (?v=12): ĐẠT chưa tích = nền TRẮNG chữ đen (khoá thì mờ), bấm ⇒ `duyetSach {tat:true, tt:'dat'}` NGAY (không pop-up) ⇒ nút xanh "ĐẠT ✓".
- Đã ĐẠT ⇒ nút trái đổi CHỤP LỖI → **CHỤP ẢNH** (sáng) ⇒ pop-up chụp ảnh ĐẠT (`moDat`, nay CHỈ chụp, không ghi). Chưa đạt / có lỗi ⇒ CHỤP LỖI như cũ.
- Bấm lại ĐẠT khi đã đạt ⇒ pop-up hỏi "Bỏ ĐẠT bài của …?" ⇒ BỎ ĐẠT ⇒ `duyetSach {tat:true, tt:'bo'}` (máy chủ app `96cb9bd`: gỡ duyet ĐẠT, trả `dat` về kết quả máy theo `duyet.datMay`).
- ⛔ BỎ ĐẠT cần DEPLOY hàm `duyetSach` bản mới: `npx -y firebase-tools deploy --only functions:duyetSach --project aword-70dae` (trong `myLesson\app\may-chu`). Chưa deploy thì bấm BỎ ĐẠT báo "Chưa bỏ ĐẠT được".

## ⭐ v1.435.0 (28/10/2026) — BÀI TRONG SÁCH: nút ĐẠT ✓ + danh sách em có ảnh, xếp nhóm

- `js/cham-sach.js` (?v=11) `capNut`: chưa chấm ĐẠT ⇒ nút chỉ chữ "ĐẠT" (bỏ icon); thầy đã bấm ĐẠT (mọi trang `duyet.tt==='dat'`) ⇒ "ĐẠT ✓" (dấu bên phải), CHỤP LỖI mờ, dòng khoá "✓ Thầy đã chấm ĐẠT"; bấm ĐẠT lại vẫn mở chụp ảnh ĐẠT.
- `veDs`: ảnh em (`em[].av`, dashboard truyền `A.avUrl(lớp gốc, tên)`; thiếu ảnh ⇒ chữ tắt) · xếp nhóm CHỜ CHẤM → ĐÃ TRẢ LẠI → CHƯA NỘP → ĐÃ ĐẠT (tên xanh lá), trong nhóm giữ thứ tự sĩ số (`THU_NHOM`).

## ⭐ v1.434.0 (28/10/2026) — tab BÀI TRONG SÁCH (trang chấm bài sách nằm trong hộp chi tiết)

Thầy chốt: trang chấm bài sách không còn là pop-up riêng mà là một tab của hộp chi tiết bài, ngay sau BÀI TẬP.
- `dashboard.html`: tab `sach` "Bài trong sách" (icon sách mở) — chỉ hiện ở bài có bước `loai:'sach'` + `nopAnh`; nhiều bước ⇒ chip chọn bước (`HQ.sachBt`). `hqTabSach` vẽ khung, `hqSauVeSach` gắn trang chấm; `hqVeLai` KHÔNG vẽ lại ruột tab khi trang chấm đã gắn đúng bài/bước (`hqSachConNguyen`) ⇒ dữ liệu tab khác về dần không xoá nét đang vẽ. Rời tab / đóng hộp / đổi bài ⇒ `ChamSach.dong()` (lưu hết).
- Hàng bước trên thẻ bài bỏ 📷, chỉ còn "BƯỚC n"; bấm vẫn được = LỐI TẮT mở hộp chi tiết ở tab BÀI TRONG SÁCH (`HQ_MO_TAB` ⇒ `moBaiModal`).
- `js/cham-sach.js` (?v=10): `mo({nhung: khung})` ⇒ trang chấm nằm trong khung (bỏ nền phủ, nút đóng, khoá cuộn); `dong()` trả về body; `ChamSach.nhung()`, `ChamSach.coLop()`. Esc: lớp nổi của trang chấm (menu, cỡ, đang kẻ, pop-up chụp) đóng trước, hết lớp thì Esc về chuỗi đóng của dashboard.
- Bàn thử: `D:\OTHERS\CLAUDE\myLesson - thiet ke nop sach\ban-thu-tab-sach.html` (8 ảnh thật, khung tab giả).

## ⭐ v1.433.0 (27/10/2026) — VÍ SAO ĐƯỢC ÂM

Thầy: trừ được nhiều hơn số sao đang có ⇒ số âm đỏ, dấu − trước.
- `js/sao-dash.js`: `ganCT.gioiHan` chỉ kẹp ±tranTay (bỏ kẹp ≥ −số đang có, bỏ khoá nút −N); hàm `soSao(n)` tô đỏ số âm (`.sd-am` ở `css/sao-dash2.css`) — ô tổng lớp, cột sao, pop-up ±, Ví sao một em, Lịch sử ví. `js/sao-xh.js` bỏ `Math.max(0,…)` ví tạm.
- ⛔ Đi kèm hàm máy chủ `apDotSao` (kho app `may-chu/functions/sao.js`) bỏ kẹp ví về 0 — PHẢI deploy hàm thì ví mới âm thật. Chi tiết: `myLesson/GHI CHU DU AN.md` chặng 27/10.

## ⭐ v1.432.0 (27/10/2026) — XẾP HẠNG theo GIỜ LÀM THẬT + cắt giờ CHỒNG tab

Ca Minh Anh A1-B (CÂU BỊ ĐỘNG): bảng act 81:30 cho 6/30 mà TỔNG luyện tập 58 phút — bảng act lấy đồng hồ game (gồm lúc treo tab), tổng lấy giờ hoạt động.
- `dashboard.html` `hqBxhAct`: cột giờ + hoà điểm = `l.giayTho` (giờ HOẠT ĐỘNG của lượt, trước khi cắt chồng) — đảo v1.144.0 (thầy chốt 27/10).
- `hqGioAct` = bọc `hqGioActTho` + `hqHeSoChong(ten)`: gom lượt mọi act của bài (`HQ.act`) theo khoảng `[bd, kt]` (vào ván → nhịp ghi cuối); cụm chồng nhau có tổng giờ > độ dài cụm ⇒ chia tỉ lệ cho vừa. Cờ `l.chong` + tooltip "đã trừ phần làm CÙNG LÚC". Nhớ trong một lượt vẽ (`HQ_CHONG`, xoá bằng setTimeout 0).
- Đi kèm AWord Đợt 588 (phím đè giữ không tính, chạm chờ 30 s).
- ⚠️ Pop-up 🏆 / `lop.html` / `bai.html` / `khoa.html` (`A.xepHangAct`, kho scores) VẪN đồng hồ game. Video/nghe không vào phép cắt chồng.

## ⭐  v1.372.0 (17/10/2026) — HỘP ⚔ CHAT LỚP 2 BƯỚC (Đấu giải · Giao hữu · Luyện tập)

Mẫu thầy chốt `D:\OTHERS\CLAUDE\GIAI DAU THE - thiet ke\mau-v9-chat-dau` phương án A.
- `js/the-td.js` `TheTD_moChon` viết lại (lớp CSS tiền tố `td-`, `.td-hop`): menu = thẻ neon **Đấu giải** (tên giải · hạng em · bạn online · đếm lùi tổng giờ) + **Giao hữu** (amber) + **Luyện tập** (xanh dương).
  Học sinh + giải đang mở ⇒ Đấu giải sáng ⇒ danh sách bạn (trận tính giải, không liệt kê thầy); giải sắp mở / chưa có ⇒ thẻ MỜ + lý do (bấm hiện chú nhỏ); THẦY ⇒ MỜ "Thầy không tham gia giải đấu".
  Giao hữu học sinh = bạn online + hàng Thầy (2 phút Easy, `giai:''` không điểm — luật cho phép lúc nào cũng được); thầy = caiHtml + em online, tab mới như cũ. ESC / bấm ngoài đóng; focus bàn phím vào hộp.
- **Luyện tập với máy**: `nw/tran.html?luyen=1&may=1|2|3&phut=2|3|5&bo=n|g&giai=&lop=` (`LUYEN` trong `nw/js/tran.js`, dùng bộ máy của bàn thử: không tạo tranDau, không gọi máy chủ, không ghi gì). `bo=g` đọc `giaiDau/{giai}.bo`. Máy Chậm/Vừa/Nhanh = nhịp tìm từ 9–15 / 5,5–10 / 3,2–6 giây. Cuối ván "PRACTICE · NO POINTS" + Exit / Play again.
- Bàn thử: `nw/tinnhan.html?thu=1|thay&tt=dang|sap|none`. the-td.js?v=11 (mọi trang), tran.js?v=6, config.js 1.372.0.

## ⭐ v1.371.0 (17/10/2026) — THẺ GIẢI ĐẤU NEON + luật giải tạo từ myLesson *(Đợt 1 + Đợt 4 của "giải đấu tạo từ app")*

Thầy duyệt `mau-v8-the-neon` + "ok build" (hồ sơ: `D:\OTHERS\CLAUDE\GIAI DAU THE - thiet ke\`: KE HOACH BUILD, HOP DONG DU LIEU - 3 kho).

- **Thẻ giải** (`js/the-giai.js` + `css/the-giai.css`, mọi lớp CSS tiền tố `tg-`, thẻ KHÔNG mang class `.the`): thẻ mũi tên neon, vạch thời gian
  mép trên đầu mờ tia sáng, đường đua CẢ LỚP ba làn không chồng nhau (mọi em trong lớp có chấm, em 0 điểm vẫn có), đếm lùi TỔNG GIỜ `52:56:30`,
  em thấy mình viền ngọc + nhãn EM, thầy 2 nút icon; 3 trạng thái sắp/đang/đã đóng (đã đóng chưa thưởng ⇒ nút sao vàng). Bảng `GAME = { aShowSpeed }`
  chọn theo `giaiDau.game`. Gắn ô `#cumGiai` NGOÀI `#cotBai`: `lop.html`/`khoa.html` bọc `<div class="cot-trai">` (cumGiai + cotBai), `dashboard.html` trước `#theListDs`.
  Giải đang · sắp (gần nhất) · đã đóng chưa thưởng · thưởng xong còn 3 ngày (tính từ `capNhat`) rồi ẩn; tối đa 3 thẻ; học sinh chỉ 1 thẻ "đã đóng".
  Nguồn nghe giải dùng chung với dải ghim (`TheTD.giaiCuaLop/kho/toi` — chỉ XUẤT thêm, dải ghim không đổi). Đồng hồ nhích mỗi giây, đổi lớp (dashboard) tự nạp.
- **Bấm thẻ** ⇒ `nw/giaidau.html?giai=<id>&lop=<mã lớp>[&lam=thuong|sua|mo]` (em: cùng tab; thầy: tab mới). Trang Giải đấu (`nw/js/giaidau.js` v14) đọc 3 tham số:
  chọn đúng giải/lớp; thầy + `lam` ⇒ bấm sẵn nút (Thưởng sao ⇒ hộp popThuong; Mở ngay hỏi xác nhận).
- **Giải `nguon:'mylesson'`** (tạo từ app): form Sửa của web khoá tên/lớp/bộ chữ/phút/độ khó + dòng chú "Giải này tạo từ myLesson, đổi thông số ở app"; chỉ ghi `tu/den/sao/capNhat`.
- **Luật Firestore** `tools/dang-luat-giai-dau-v2.js` (thêm ĐÚNG 4 khoá `hinhThuc, assignment(6 ký tự), nguon, buoi{lop,dayId}` vào hasOnly của giaiDau): `--xem | --bien-dich | --dang | --kiem | --lui <ruleset>`.
- Bàn thử (chỉ localhost): `?thu=1` (em) / `?thu=thay` (thầy) + `&tt=sap|dang|xong|thuong` ở bất kỳ trang nào nạp `the-giai.js`.
- `config.js` 1.371.0 (`?v=272` lop/khoa, `?v=276` dashboard, `?v=18` nw/giaidau), `the-td.js?v=10`, `the-giai.js?v=1`, `the-giai.css?v=1`, `giaidau.js?v=14`.

## ⭐ v1.118.0 (19/09/2026) — "CHỜ MỞ KHÓA" cho bài STAGE quá hạn còn em chưa xong

Thầy duyệt mẫu 19/09 rồi build. Ca: chặng đang chạy đã HẾT HẠN, còn em chưa xong nên chặng kế chưa mở.

- **Luật chung** `A.changChoMo(cac)` (`js/chung.js?v=52`, cả 6 trang): chặng đang chạy còn em thiếu **và còn chặng
  sau** ⇒ "chờ mở khoá"; chặng CUỐI quá hạn vẫn HẾT HẠN. Giờ do ĐỒNG HỒ quyết (cờ `data-chomo` đặt lúc vẽ, tới 0
  mới đổi chữ) — đứng SAU "LỚP ĐANG HỌC".
- **Thẻ trang lớp + dashboard**: ô hạn "CHỜ MỞ KHÓA" nháy cứng 2 pha (đỏ/chữ trắng ↔ hồng/chữ đỏ, 1,2 s); cột icon
  học sinh thiếu bài nháy nền đỏ 0,7 s. Class `.t-han.cho-mo` / `.the.cho-mo` do `aoChoMo()` bật mỗi giây.
- **Trang bài**: ô hạn đầu trang cùng nếp (`HAN_CHO_MO`); bìa READY của act thuộc chặng đó (`.game-cover.cho-mo`):
  READY góc dưới trái, tên em góc dưới phải, giữa = "CẢ LỚP ĐANG CHỜ EM, HÃY HOÀN THÀNH BÀI TẬP CỦA MÌNH NHÉ!"
  (em chưa xong) hoặc "ĐANG CHỜ MỞ KHÓA BỞI:" + chip avatar các bạn + "EM HÃY NHẮC NHỞ VÀ HƯỚNG DẪN GIÚP BẠN NHÉ!"
  (em đã xong hết act của chặng). Chỉ bấm NÚT READY mới nạp act.
- ⛔ `lop.html` · `bai.html` · `dashboard.html` **không nạp `css/main.css`** (chỉ `index.html`) — dựng mẫu mà nạp
  thêm là mũi ▶ của thẻ bị `.play` màn đăng nhập đè cụt.
- `config.js` `PHIEN_BAN` 1.115.1 → **1.118.0** (hai đợt v1.116/v1.117 quên bump), tag `config.js?v=91`.
- **v1.118.1** (thầy test thật): ô hạn đầu trang bài in **"STAGE 1: 00:00 • 19/9"** thay "Hạn chặng 1: …" (tràn ô
  86–92px điện thoại; class `.stage-han` co chữ riêng dòng này ở ≤620/≤380px); chip avatar trên bìa: ảnh
  `position:absolute` phủ kín ô tròn (trước nửa ảnh nửa chữ); **BỎ** nháy nền đỏ cột icon thiếu bài (thầy: quá
  xấu) — cột icon về hào quang `tic-do` cũ. `?v=92`.

## ⭐ v1.20.0 (26/08/2026) — SỬA HẠN RIÊNG TỪNG THẺ TRÊN DASHBOARD *(bản mới nhất)*

> ⚠️ Nhãn *"(bản đang chạy)"* ở mục v1.15.0 bên dưới là **nhãn cũ chưa gỡ** — các mục
> v1.16.0…v1.19.0 chỉ được ghi trong `BAN GIAO.md` của repo app. Bản mới nhất là mục này.

Thầy chốt 26/08/2026: *"có một hôm đặc biệt cần điều chỉnh riêng, không phải mặc định"*.

- Ruột mỗi thẻ bài trên `dashboard.html` có ô **"Hạn riêng cho thẻ này"** — chọn ngày + giờ,
  bấm **Đặt hạn này**. Đầu thẻ đeo huy hiệu **"đã chỉnh riêng"**, thẻ không bị đóng lại.
- Bấm **Về hạn mặc định** là quay lại hạn thầy đặt trong app lúc đẩy bài.
- **Hạn sửa THẮNG kể cả khi app đẩy lại bài đó** (thầy chốt) — app không biết gì về kho này.

**Cách chạy:** kho `lessonHan` trên Firestore (project `aword-70dae`, dùng chung với AWord).
`js/chung.js` nạp bảng đó ngay trong `napDuLieu()` nên **cả bốn trang** (`index` · `lop` · `bai`
· `dashboard`) đều thấy; `mocHan()`/`chuHan()` hỏi `hanCua()` — hạn sửa trước, `bai.json` sau.

- ⚠️ **Cần dán thêm một khối luật Firestore** (`lessonHan`) — file hướng dẫn:
  `D:\APP AND DATA\myLesson-data\tai-lieu\LUAT FIRESTORE CAN DAN (26-08 THEM HAN SUA).md`.
  **Chưa dán thì không hỏng gì** — mọi trang chạy y bản cũ, chỉ là chưa đặt hạn riêng được.
- ⛔ Mã tài liệu là `b_` + mã bài đã thay ký tự lạ, nhưng **khoá thật là trường `baiId`** —
  bên đọc tra theo trường đó (mã bài có thể chứa `/` mà Firestore cấm trong mã tài liệu).
- ⛔ `napHanSua()` bọc **cả thân hàm** trong `try`: `fetch()` có thể **ném ngay tại chỗ**, mà
  cú ném đó xuyên thẳng qua `Promise.all` trong `napDuLieu()` ⇒ mất sạch dữ liệu cả bốn trang.

Bên app đi kèm: **myLesson app v2.3.0** — Cài đặt có mục **"Hạn nộp mặc định"** khai thứ học +
giờ hạn cho từng lớp (cất trên trạm, ba máy dùng chung), dùng để điền sẵn ô hạn khi dựng thẻ.

---

## ⭐ v1.15.0 (25/08/2026) — THẺ TRANG LỚP + VÍ SAO + ĐĂNG XUẤT *(bản đang chạy)*

> Hồ sơ đầy đủ của **cả cụm 3 app** (app myLesson · AWord · web này) nằm ở
> `myLesson/app/BAN GIAO.md` — phiên mới đọc file đó trước.

- **Nhãn thanh tiến trình trên thẻ lớp**: `PRONUNCIATION` rút thành **`PRONUNC`** — **CHỈ ở
  `lop.html`** (`A.tenO(ten, true)`); `bai.html` gọi không cờ nên **giữ chữ đầy đủ** (thầy chốt).
- Hàm mới **`canhNhanO()`** trong `lop.html`: đo chữ thật rồi giãn `letter-spacing` cho
  `WORDS 1` · `WORDS 2` **rộng bằng** `PRONUNC`, sau đó hạ biến `--cot-ten` xuống đúng bề ngang
  đó ⇒ chỗ dôi ra rơi hết vào THANH. Đo thật ở 1280px: cột tên **112 → 66px**, thanh **409 →
  455px**; ca chật nhất (thẻ gấp 375px + cột CHƯA XONG BÀI) thanh còn 48px, không nhãn nào bị cắt.
  ⛔ Đổi cỡ chữ nhãn thì quét kiểm lại CẢ hai bề ngang màn hình.
- **Ví sao luôn hiện, kể cả 0 sao** (cả 3 trang): hai dòng `display:none !important` của v1.9.0
  đã bỏ, số giả `350` trong sidebar đổi thành `0`. ⚠️ **Chưa có kho sao thật** — khi nào có thì
  chỉ việc đổ số vào `.sao-hieu` và `.vi-to .so`, không phải sửa CSS.
- Mục cuối menu: **"Đổi bạn khác" → "Đăng xuất"** (chú thích *Đăng xuất ID Andrew Classes*),
  việc làm không đổi (`A.thoat()` rồi về `index.html`).

## ⭐ v1.14.0 (24/08/2026) — "ĐÃ XONG BÀI" = ĐỦ ĐIỂM TỐI ĐA

Bốn hàm dùng chung trong `js/chung.js`, **ba trang gọi vào đúng đó, đừng vá lẻ**:
`A.chuanDiem(ma)` · `A.xongAct(dsDiem, ten, chuan)` · `A.tenBai/tenDang/coTenRieng` · `A.tenO`.
⛔ Đổi định nghĩa "xong" là đổi **ở ba chỗ cùng lúc** (`lop.html` thanh tiến trình ·
`bai.html` màu tên + huy chương · `dashboard.html` đếm "chưa xong").
⛔⛔ "Điểm tối đa" **không phải lúc nào cũng 100%**: anagram chế độ `bonus` chấm theo CHỮ CÁI nên
đỉnh là **200%**; Gameshow và bài bật trừ điểm thì `tru:true` = **nộp là xong**.

## ⭐ v1.9.0 (23/08/2026) — MỘT TRANG THÀNH NHIỀU TRANG

Trước v1.9.0 cả web là một file `index.html` + `js/app.js` với 3 màn. Từ v1.9.0, bộ mẫu
thầy chốt ở `mau-web` đã thành trang thật, mỗi màn một trang:

| Trang | Vai trò |
|---|---|
| `index.html` | Chỉ còn màn ĐĂNG NHẬP (+ ngăn thông tin). Vào được thì chuyển sang trang dưới |
| `lop.html` | Trang chính của lớp — cột thẻ bài tập + khung chat (chat đang khoá, chưa có kho tin) |
| `bai.html` | Một bài tập — **dùng chung cho WORDS · DICTS · READING**, khác nhau chỉ ở `khoi[]` |
| `bai-sp.html` | Bài SPEAKING SLIDE (Canva + danh sách tự báo nộp video) |
| `dashboard.html` | **Trang quản lý của thầy** (v1.10.0) — xem mục ngay dưới |
| `js/chung.js` | Dùng chung: đọc dữ liệu · danh tính em · điểm AWord · hạn nộp |
| `js/nw-dangnhap.js` | Riêng màn đăng nhập (`js/dangnhap.js` cũ đã xoá v1.411.0, còn trong git) |

⭐ `bai.html?id=<mã bài>` là đường vào một bài. Thêm `&nhu=<mã đăng nhập>` để **xem như một
em** — app myLesson dùng đường này cho nút xem nhanh, KHÔNG ghi gì vào máy.

## ⭐ v1.10.0 (23/08/2026) — TRANG QUẢN LÝ (`dashboard.html`)

⭐ **Từ v1.176.0** vào dashboard CHỈ bằng phiên thầy (ID quản trị + mật khẩu + mã 6 số, `js/thay.js`); gõ ID ở màn
đăng nhập chỉ chỉ đường sang đây. **v1.411.0** đã bỏ hẳn cờ nhớ máy `mylesson_ql` (đoạn dưới là lịch sử).
(Lịch sử v1.10.0: vào bằng **mã quản lý**, máy gõ đúng một lần thì nhớ bằng cờ `mylesson_ql`.)
⭐ **Từ app myLesson v1.20.0**, tab CLASSES chạy trang này **ngay trong app** (webview) và **tự
đặt cờ `mylesson_ql`** nên không hỏi mã. ⛔ Vì thế **đừng đổi id `#cong` / `#trang`** và đừng đổi
tên khoá cờ — app dò đúng hai thứ đó để biết cửa hỏi mã còn hiện hay không.

Ba tầng, xoay quanh câu hỏi thầy hỏi mỗi ngày — *bài nào sắp hết hạn mà lớp còn nhiều em chưa làm*:

1. **Dải số** — lớp · học sinh · bài đang giao · bài đã đẩy · em chưa có mã.
2. **CẦN NHẮC** (trên cùng) — mọi lớp, bài có hạn trong khoảng −3 ➜ +10 ngày, xếp gấp trước,
   kèm số em chưa xong và nút **Chép tên em chưa xong** (dán thẳng vào Zalo; máy không cho chép
   tự động thì mở hộp để bôi đen chép tay).
3. **Theo lớp** — chọn lớp → từng bài: hạn + đồng hồ + thanh tiến độ; bấm mở ra thấy từng act
   (template · mã · bao nhiêu em xong), dòng bài viết tay, và **ai chưa xong / ai đã xong**.
   Nút **Xem trang của học sinh** mở đúng trang đó như một em đang thấy.

Cột phải: **sinh nhật 7 ngày tới** · **em chưa có mã** · **top của lớp** đang chọn.

⚠️ **Tốn hạn mức Firebase**: mỗi act là một lượt đọc kho điểm AWord. Trang CHỈ đọc điểm của
(a) bài trong khoảng hạn −3 ➜ +10 ngày và (b) lớp đang chọn, đọc tối đa 6 lượt cùng lúc, và
`js/chung.js` còn nhớ 60 giây. ⛔ Đừng sửa thành "đọc hết mọi bài mọi lớp cho tiện".

⚠️ Ba thứ CHƯA có dữ liệu thật nên đang ẩn/khoá, đừng tưởng là lỗi: **ví sao** (ẩn hẳn),
**chat lớp** (khoá, hiện dòng "đang xây dựng"), **tên bài đẹp + giờ hạn** (app Đợt 2 mới gõ
được; tạm lấy DẠNG bài và cuối ngày buổi học).

## Ai cập nhật trang này

Không ai sửa tay. Toàn bộ nội dung do **app myLesson** trên máy thầy ghi ra rồi đẩy lên:

```
data/lop.json   ← lớp + học sinh (app lấy từ myStudent)
data/bai.json   ← bài của từng lớp
```

⭐ **Từ web v1.119.0 (21/09/2026)** hai file trên còn có **bản sao sống trên Firestore** — kho `lessonWeb`
(`lessonWeb/lop` + `lessonWeb/bai_<LỚP>`, ruột trong trường chuỗi `json`). App ghi kho này TRƯỚC (1–3 giây
là học sinh thấy), GitHub Pages chỉ còn là sao lưu + lịch sử. `js/chung.js napDuLieu()` đọc cả hai nguồn và
lấy bản có `capNhat` mới hơn; Firestore hỏng thì trang chạy y như trước bằng hai file tĩnh. Phép thử:
`node tools/thu-kho-web.js`. Hồ sơ: `app/BAN GIAO.md` ➕ 21/09 đợt 20.

Mọi file còn lại (`index.html`, `css/`, `js/`, `assets/`) là khung trang, rất ít khi đổi.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Màn đăng nhập (MỘT ô mã) + ngăn thông tin |
| `lop.html` · `bai.html` · `bai-sp.html` · `dashboard.html` | Xem bảng ở mục v1.9.0 bên trên |
| `css/main.css` | Design thầy duyệt 08/07/2026: light-only, teal `#0E7C6E`, thẻ bo 18px |
| `js/chung.js` · `js/nw-dangnhap.js` | Toàn bộ logic — không framework, không thư viện ngoài |
| `config.js` | Tên site + số phiên bản + địa chỉ AWord + kho điểm Firebase (khóa công khai) |
| `assets/fonts.css` | Montserrat (Việt hoá) nhúng base64 — trang chạy cả khi mất mạng |
| `assets/avatar-tron.jpg` | Ảnh Teacher Andrew (kiêm favicon + icon bấm mở menu ở màn đăng nhập, v1.8.0) |
| `assets/avatar.jpg` | Ảnh chibi cũ — hết dùng từ v1.8.0, GIỮ LẠI không xoá (đường lùi) |

## Vì sao AWord phải ở CÙNG tài khoản GitHub

`andrewclasses-01.github.io/myLesson/` và `andrewclasses-01.github.io/AWord/` là **cùng một nhà**,
nên trang này nhúng game AWord và truyền sẵn tên học sinh sang được:
`AWord/play.html?g=<mã bài giao>&n=<TÊN EM>`.

Nhờ vậy các em không phải gõ tên → bảng xếp hạng và báo cáo của thầy không còn tên viết sai.
**Chuyển web sang tài khoản GitHub khác là mất tính năng này.**

## Chạy thử ở máy

```
python -m http.server 8130 --directory "E:\LAP TRINH APP\myLesson\web"
```
rồi mở http://localhost:8130

## ⚠ Sửa css/js/config là PHẢI tăng `?v=` trong index.html

GitHub Pages + trình duyệt học sinh giữ cache khoảng 10 phút. Số `?v=` sau
`main.css` / `config.js` / `chung.js` / `nw-dangnhap.js` là số chống cache —
quên tăng là máy học sinh chạy bản cũ (bài học bên mySpeaking, chặng 36).
⛔ Từ v1.9.0 số này nằm trong **5 trang**, sửa là phải sửa cả năm.
