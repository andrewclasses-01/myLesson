# Lesson in Andrew Classes — trang bài tập của học sinh

Trang web tĩnh cho học sinh **Andrew Classes** vào làm bài tập.
Một link duy nhất cho mọi lớp, mọi buổi: **https://andrewclasses-01.github.io/myLesson/**

Học sinh gõ **tên lớp + tên mình** → thấy mọi bài của lớp mình → bấm vào bài là chơi ngay trong
trang (game lấy từ [AWord](https://andrewclasses-01.github.io/AWord/), video lấy từ Google Drive).

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
| `index.html` | 3 màn: đăng nhập → trang lớp → trang một bài |
| `css/main.css` | Design thầy duyệt 08/07/2026: light-only, teal `#0E7C6E`, thẻ bo 18px |
| `js/app.js` | Toàn bộ logic — không framework, không thư viện ngoài |
| `config.js` | Tên site + địa chỉ AWord |
| `assets/fonts.css` | Montserrat (Việt hoá) nhúng base64 — trang chạy cả khi mất mạng |
| `assets/avatar.jpg` | Ảnh chibi Teacher Andrew (kiêm favicon) |

## Vì sao AWord phải ở CÙNG tài khoản GitHub

`andrewclasses-01.github.io/myLesson/` và `andrewclasses-01.github.io/AWord/` là **cùng một nhà**,
nên trang này nhúng game AWord và truyền sẵn tên học sinh sang được:
`AWord/play.html?g=<mã bài giao>&n=<TÊN EM>`.

Nhờ vậy các em không phải gõ tên → bảng xếp hạng và báo cáo của thầy không còn tên viết sai.
**Chuyển web sang tài khoản GitHub khác là mất tính năng này.**

## Chạy thử ở máy

```
python -m http.server 8130 --directory "D:\APP AND DATA\myLesson Web"
```
rồi mở http://localhost:8130
