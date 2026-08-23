# 🎬 Realtime Movie Ticket Booking System (Backend)

Hệ thống Backend đặt vé xem phim trực tuyến thời gian thực, được xây dựng theo kiến trúc nhiều tầng (Layered Architecture: Routes -> Controllers -> Services -> Repositories) với NodeJS, Express, PostgreSQL, Prisma 7 và Socket.io.

---

## 🚀 Tính Năng Nổi Bật
- 🔐 **Xác thực & Phân quyền**: Đăng ký, Đăng nhập (JWT + Bcrypt), phân quyền Admin và Khách hàng (User).
- 🎥 **Quản lý Phim & Suất Chiếu**: Quản lý phim, thuật toán phát hiện và ngăn chặn trùng lịch chiếu trong cùng một phòng chiếu.
- 🏢 **Tự sinh sơ đồ ghế**: Thuật toán tự động sinh hàng trăm ghế theo ma trận bảng chữ cái (A1 -> E10) và lưu bằng Database Transaction (`$transaction`).
- ⏳ **Khóa giữ ghế 5 phút (Seat Hold)**: Cơ chế giữ chỗ tạm thời trong 5 phút, thuật toán dọn dẹp lười biếng (Lazy Clean) và ngăn chặn tranh chấp ghế đồng thời.
- 🎟️ **Đặt vé & Tính phụ thu**: Đặt vé bằng Transaction, tự động tính phụ thu theo hạng ghế (Standard, VIP +20k, Couple +40k).
- ⚡ **Realtime WebSocket (Socket.io)**: Đồng bộ trạng thái ghế thời gian thực (`seat:held`, `seat:released`, `seat:booked`) theo từng phòng chiếu (`Room`).

---

## 🛠️ Công Nghệ Sử Dụng
- **Ngôn ngữ & Môi trường**: Node.js, Express.js
- **Cơ sở dữ liệu**: PostgreSQL 16, Redis 7 (chạy trên Docker)
- **ORM**: Prisma 7
- **Giao thức Realtime**: Socket.io (WebSocket)
- **Bảo mật**: JWT (JSON Web Token), Bcrypt, Helmet, CORS

---

## ⚙️ Hướng Dẫn Cài Đặt & Chạy Dưới Máy (Local Setup)

### 1. Clone mã nguồn về máy
```bash
git clone https://github.com/ngophong123/Realtime-Booking-BE.git
cd Realtime-Booking-BE
npm install
