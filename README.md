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
| `js/dangnhap.js` | Riêng màn đăng nhập (thay `js/app.js` cũ — file đó đã bỏ, còn trong git) |

⭐ `bai.html?id=<mã bài>` là đường vào một bài. Thêm `&nhu=<mã đăng nhập>` để **xem như một
em** — app myLesson dùng đường này cho nút xem nhanh, KHÔNG ghi gì vào máy.

## ⭐ v1.10.0 (23/08/2026) — TRANG QUẢN LÝ (`dashboard.html`)

Vào bằng **mã quản lý** ở màn đăng nhập, hoặc bấm tab **CLASSES** trong app myLesson. Máy nào
đã gõ đúng mã một lần thì nhớ luôn (cờ `mylesson_ql`), lần sau vào thẳng; nút **Thoát** quên đi.
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

Mọi file còn lại (`index.html`, `css/`, `js/`, `assets/`) là khung trang, rất ít khi đổi.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Màn đăng nhập (MỘT ô mã) + ngăn thông tin |
| `lop.html` · `bai.html` · `bai-sp.html` · `dashboard.html` | Xem bảng ở mục v1.9.0 bên trên |
| `css/main.css` | Design thầy duyệt 08/07/2026: light-only, teal `#0E7C6E`, thẻ bo 18px |
| `js/chung.js` · `js/dangnhap.js` | Toàn bộ logic — không framework, không thư viện ngoài |
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
`main.css` / `config.js` / `chung.js` / `dangnhap.js` là số chống cache —
quên tăng là máy học sinh chạy bản cũ (bài học bên mySpeaking, chặng 36).
⛔ Từ v1.9.0 số này nằm trong **5 trang**, sửa là phải sửa cả năm.
