# ⚙️ CINEVERSE - Backend Realtime Cinema Booking API

Hệ thống máy chủ dịch vụ (Backend RESTful API & WebSocket Server) hiệu năng cao cho nền tảng đặt vé xem phim trực tuyến thời gian thực **CINEVERSE Cinema**. Được xây dựng với **Node.js (Express 5)**, **Prisma ORM (PostgreSQL)**, **Redis Distributed Lock (Upstash)**, **Socket.IO** và tích hợp gửi Email tự động.

---

## 📑 Bảng Mục Lục Điều Hướng

| STT | Phân Mục | Nội Dung Chi Tiết | Lối Tắt |
| :---: | :--- | :--- | :---: |
| **01** | 🚀 **Kiến Trúc & Công Nghệ** | Node.js, Express 5, Prisma ORM, PostgreSQL, Redis, Socket.IO | [**Xem ngay**](#-kiến-trúc--công-nghệ-tech-stack) |
| **02** | 🛡️ **Hệ Thống Phân Tán & Bảo Mật** | Redis Lock chống race condition, Idempotency, JWT & Rate Limit | [**Xem ngay**](#-hệ-thống-phân-tán--bảo-mật-high-concurrency--security) |
| **03** | 🌟 **Các Phân Hệ Dịch Vụ Cốt Lõi** | **9 Module dịch vụ xử lý nghiệp vụ Backend** | [**Xem ngay**](#-các-phân-hệ-dịch-vụ-cốt-lõi-core-services) |
| ↳ | 💺 *1. Giữ Ghế & Đồng Bộ Realtime* | Redis TTL 300s, Khóa ghế phân tán, Socket Room suất chiếu | [Chi tiết](#1-dịch-vụ-giữ-ghế-thời-gian-thực-seathold--realtime) |
| ↳ | 🎟️ *2. Đặt Vé & State Machine* | Vòng đời đơn vé, Áp dụng Voucher, Audit Log checksum MD5 | [Chi tiết](#2-dịch-vụ-đặt-vé--quản-lý-đơn-hàng-booking--state-machine) |
| ↳ | 🔔 *3. Hệ Thống Thông Báo Phân Quyền* | Kênh Socket cá nhân `notification:${userId}`, tách riêng User & Admin | [Chi tiết](#3-hệ-thống-thông-báo-phân-quyền-notification-system) |
| ↳ | 🎁 *4. Quản Lý & Tặng Voucher* | Giảm % / Tiền mặt, Hạn sử dụng ngày/giờ, Tặng riêng từng User | [Chi tiết](#4-quản-lý--tặng-voucher-voucher-service) |
| ↳ | 📧 *5. Gửi Email Tự Động* | Alert đơn vé mới cho Admin, Vé ảo cho User, Alert tặng Voucher | [Chi tiết](#5-dịch-vụ-gửi-email-tự-động-email-service) |
| ↳ | 👤 *6. Xác Thực & Người Dùng* | Đăng nhập/Đăng ký JWT, Hash Bcrypt, Quản lý phân quyền Role | [Chi tiết](#6-xác-thực--phân-quyền-người-dùng-auth--users) |
| ↳ | 🎬 *7. Phim, Phòng & Suất Chiếu* | Quản lý Phim, Phòng chiếu đa dạng, Lịch chiếu linh hoạt | [Chi tiết](#7-quản-lý-dữ-liệu-rạp-movies-rooms--showtimes) |
| ↳ | 🤖 *8. Trợ Lý AI Chatbot* | Xử lý truy vấn ngôn ngữ tự nhiên, Gợi ý phim thông minh | [Chi tiết](#8-trợ-lý-ảo-ai-chatbot-ai-service) |
| ↳ | ⚙️ *9. Cấu Hình Hệ Thống* | Thanh toán QR MoMo/VietQR/ZaloPay, SMTP, Chính sách hủy vé | [Chi tiết](#9-cấu-hình-hệ-thống--thanh-toán-system-settings) |
| **04** | 📊 **Mô Hình Cơ Sở Dữ Liệu (Prisma)** | Danh sách Model Prisma và mối quan hệ thực thể (ERD) | [**Xem ngay**](#-mô-hình-cơ-sở-dữ-liệu-prisma-schema) |
| **05** | 📁 **Cấu Trúc Thư Mục Source Code** | Sơ đồ cây thư mục & kiến trúc Controller - Service - Repository | [**Xem ngay**](#-cấu-trúc-thư-mục-source-code) |
| **06** | 🛠️ **Cài Đặt & Khởi Chạy** | Cấu hình `.env`, Prisma Migrate, Khởi chạy dev & seed data | [**Xem ngay**](#-hướng-dẫn-cài-đặt--khởi-chạy) |

---

## 🚀 Kiến Trúc & Công Nghệ (Tech Stack)

| Công nghệ | Vai trò trong hệ thống |
| :--- | :--- |
| **Node.js (v18+)** | Nền tảng thực thi JavaScript phía Server với kiến trúc non-blocking I/O |
| **Express 5** | Web framework xây dựng RESTful API chuẩn mực, xử lý routing và middleware |
| **Prisma ORM (v7+)** | Quản lý schema, migrations, type-safe queries kết nối PostgreSQL |
| **PostgreSQL (Neon DB)** | Hệ quản trị cơ sở dữ liệu quan hệ mạnh mẽ, lưu trữ bền vững |
| **Redis (Upstash / IoRedis)** | In-memory cache phân tán: quản lý khóa ghế Realtime, TTL và Idempotency |
| **Socket.IO (v4+)** | Động cơ WebSocket hai chiều: đồng bộ ghế rạp theo room và bắn thông báo tức thời |
| **Nodemailer** | Dịch vụ gửi email thông báo xác nhận vé, quà tặng voucher và đơn vé mới |
| **JWT & Bcrypt** | Xác thực Token không trạng thái (Stateless), băm mật khẩu bảo mật |
| **Helmet & CORS** | Thiết lập HTTP Security Headers và cấu hình chia sẻ tài nguyên an toàn |

---

## 🛡️ Hệ Thống Phân Tán & Bảo Mật (High Concurrency & Security)

### 1. Cơ Chế Khóa Phân Tán (Redis Distributed Lock)
- Khi nhiều người dùng cùng bấm chọn hoặc đặt cùng một vị trí ghế trong cùng một phần nghìn giây, backend sử dụng **Redis Atomic Lock** (`SET key val NX PX 5000`) để đảm bảo chỉ có duy nhất 1 request đầu tiên được phép giữ ghế.
- Ngăn chặn triệt để hiện tượng **Race Condition** và **Double-booking** (đặt trùng vé).

### 2. Idempotency Key Middleware
- Header `Idempotency-Key` bảo vệ các giao dịch thanh toán và đặt vé quan trọng.
- Nếu người dùng bấm liên tục nút "Thanh Toán" do mạng lag, server chỉ thực hiện giao dịch duy nhất 1 lần và trả về kết quả đã cache từ Redis, tránh bị trừ tiền hoặc tạo đơn lặp.

### 3. State Machine & Audit Payment Log
- Quản lý trạng thái đơn vé nghiêm ngặt: `PENDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `CANCELLED`.
- Mỗi biến động trạng thái đều được ghi nhận vào bảng `PaymentLog` kèm mã băm kiểm định **MD5 Checksum** để đối soát tài chính.

---

## 🌟 Các Phân Hệ Dịch Vụ Cốt Lõi (Core Services)

### 1. Dịch Vụ Giữ Ghế Thời Gian Thực (SeatHold & Realtime)
- **Tập tin**: `seathold.service.js`, `redisLock.js`, `socket.js`
- **Chức năng**:
  - Giữ ghế tạm thời trong **300 giây (5 phút)** qua Redis TTL.
  - Tự động phát sự kiện Socket `seat:held` tới tất cả người dùng trong phòng chiếu (`room:showtime_${showtimeId}`).
  - Khi hết giờ hoặc khách bỏ chọn ghế, tự động nhả ghế và phát sự kiện `seat:freed`.

---

### 2. Dịch Vụ Đặt Vé & Quản Lý Đơn Hàng (Booking & State Machine)
- **Tập tin**: `booking.service.js`, `booking.repository.js`
- **Chức năng**:
  - Kiểm tra tính hợp lệ của ghế giữ, tính toán giá vé theo loại ghế (Standard / VIP / Couple).
  - Áp dụng Voucher giảm giá: kiểm tra ngày hết hạn, giá trị đơn hàng tối thiểu, giới hạn số lượt dùng.
  - Tạo đơn đặt vé và chuyển đổi trạng thái giao dịch an toàn với Prisma Transaction.
  - **Hủy vé trực tuyến**: Kiểm tra thời hạn quy định (trước giờ chiếu tối thiểu X tiếng). Khi hủy thành công, tự động nhả ghế Realtime để người khác có thể đặt.

---

### 3. Hệ Thống Thông Báo Phân Quyền (Notification System)
- **Tập tin**: `notification.service.js`, `notification.controller.js`
- **Chức năng**:
  - **Tài khoản Khách hàng (User)**:
    - Nhận thông báo xác nhận đặt vé: `⏳ ĐẶT VÉ THÀNH CÔNG - ĐANG CHỜ DUYỆT`.
    - Nhận thông báo khi vé được duyệt: `🎟️ VÉ XEM PHIM ĐÃ ĐƯỢC DUYỆT!`.
    - Nhận thông báo khi được tặng quà: `🎁 BẠN ĐƯỢC TẶNG VOUCHER MỚI!`.
  - **Tài khoản Quản trị viên (Admin)**:
    - Nhận thông báo độc quyền: `🔔 ĐƠN ĐẶT VÉ MỚI CẦN DUYỆT` (hiển thị đầy đủ Tên khách, Email, Phim, Ghế, Tổng tiền).
  - Phát Socket riêng tư theo kênh `notification:${userId}`, đảm bảo tính bảo mật và độc lập giữa các tài khoản.

---

### 4. Quản Lý & Tặng Voucher (Voucher Service)
- **Tập tin**: `voucher.service.js`, `voucher.repository.js`
- **Chức năng**:
  - Tạo voucher với tùy chọn: Giảm theo phần trăm (%) hoặc Giảm tiền mặt cố định (VNĐ).
  - Thiết lập chính xác **Ngày hết hạn (expireAt)** và mức chi tiêu tối thiểu.
  - **Tặng voucher cho người dùng cụ thể**: Gán `userId` vào voucher, tự động bắn thông báo chuông và gửi Email chúc mừng đến hòm thư khách hàng.

---

### 5. Dịch Vụ Gửi Email Tự Động (Email Service)
- **Tập tin**: `email.service.js`
- **Chức năng**:
  - Gửi email cảnh báo đơn đặt vé mới tới hòm thư Admin.
  - Gửi email xác nhận vé xem phim điện tử (kèm thông tin chi tiết phòng, giờ, ghế) cho Khách hàng khi đơn được phê duyệt.
  - Gửi email thông báo tặng Voucher ưu đãi kèm mã code và hạn sử dụng.

---

### 6. Xác Thực & Phân Quyền Người Dùng (Auth & Users)
- **Tập tin**: `user.service.js`, `auth.routes.js`, `auth.middleware.js`
- **Chức năng**:
  - Đăng ký, Đăng nhập với cơ chế băm mật khẩu Bcrypt (Salt rounds = 10).
  - Cấp phát JWT Access Token chứa định danh `userId` và vai trò `role` (USER / ADMIN).
  - Cập nhật thông tin hồ sơ và đổi mật khẩu tài khoản.

---

### 7. Quản Lý Dữ Liệu Rạp (Movies, Rooms & Showtimes)
- **Tập tin**: `movie.service.js`, `room.service.js`, `showtime.service.js`
- **Chức năng**:
  - CRUD Phim, phân loại phim *Đang Chiếu (NOW_SHOWING)* / *Sắp Chiếu (COMING_SOON)*.
  - CRUD Phòng Chiếu: cấu hình ma trận ghế (hàng, cột, loại ghế).
  - CRUD Suất Chiếu: tạo lịch chiếu theo khung giờ, phòng và giá vé cơ bản.

---

### 8. Trợ Lý Ảo AI Chatbot (AI Service)
- **Tập tin**: `ai.service.js`, `ai.controller.js`
- **Chức năng**:
  - Tiếp nhận câu hỏi của người dùng từ Chatbot Frontend.
  - Trích xuất dữ liệu phim đang chiếu, phòng vé và phản hồi tư vấn thông minh.

---

### 9. Cấu Hình Hệ Thống & Thanh Toán (System Settings)
- **Tập tin**: `setting.controller.js`, `payment.service.js`
- **Chức năng**:
  - Quản lý mã QR thanh toán: MoMo, VietQR / Chuyển khoản, ZaloPay.
  - Quản lý cấu hình Email SMTP.
  - Cấu hình thông tin chân trang (Footer), Hotline, Mạng xã hội và Số giờ giới hạn hủy vé (`cancellationCutoffHours`).

---

## 📊 Mô Hình Cơ Sở Dữ Liệu (Prisma Schema)

```mermaid
erDiagram
    User ||--o{ Booking : "makes"
    User ||--o{ SeatHold : "holds"
    User ||--o{ Voucher : "owns"
    User ||--o{ Notification : "receives"
    User ||--o{ PaymentLog : "logs"

    Movie ||--o{ Showtime : "schedules"
    Room ||--o{ Showtime : "hosts"
    Room ||--o{ Seat : "contains"

    Showtime ||--o{ Booking : "booked_in"
    Showtime ||--o{ SeatHold : "held_in"

    Seat ||--o{ BookingSeat : "reserved"
    Seat ||--o{ SeatHold : "locked"

    Booking ||--o{ BookingSeat : "includes"
    Booking ||--o{ PaymentLog : "audits"
```

---

## 📁 Cấu Trúc Thư Mục Source Code

```
backend/
├── prisma/
│   ├── schema.prisma           # Định nghĩa Models & Database Schema
│   └── seed.js                 # Script nạp dữ liệu mẫu ban đầu
├── src/
│   ├── config/                 # Cấu hình Prisma Client, Redis Client, Socket.IO
│   │   ├── prisma.js
│   │   ├── redis.js
│   │   └── socket.js
│   ├── controllers/            # Tầng Controller tiếp nhận và phản hồi Request
│   │   ├── ai.controller.js
│   │   ├── booking.controller.js
│   │   ├── movie.controller.js
│   │   ├── notification.controller.js
│   │   ├── payment.controller.js
│   │   ├── room.controller.js
│   │   ├── seathold.controller.js
│   │   ├── setting.controller.js
│   │   ├── showtime.controller.js
│   │   ├── user.controller.js
│   │   └── voucher.controller.js
│   ├── middlewares/            # Tầng Middleware xác thực & bảo mật
│   │   ├── admin.middleware.js
│   │   ├── auth.middleware.js
│   │   ├── idempotency.middleware.js
│   │   └── rateLimiter.middleware.js
│   ├── repositories/           # Tầng Repository tương tác trực tiếp Database
│   │   ├── booking.repository.js
│   │   ├── movie.repository.js
│   │   ├── room.repository.js
│   │   ├── seathold.repository.js
│   │   ├── showtime.repository.js
│   │   ├── user.repository.js
│   │   └── voucher.repository.js
│   ├── routes/                 # Tầng Route định tuyến Endpoint API
│   │   ├── ai.routes.js
│   │   ├── auth.routes.js
│   │   ├── booking.routes.js
│   │   ├── movie.routes.js
│   │   ├── notification.routes.js
│   │   ├── payment.routes.js
│   │   ├── room.routes.js
│   │   ├── seathold.routes.js
│   │   ├── setting.routes.js
│   │   ├── showtime.routes.js
│   │   └── voucher.routes.js
│   ├── services/               # Tầng Service xử lý Business Logic chính
│   │   ├── ai.service.js
│   │   ├── booking.service.js
│   │   ├── email.service.js
│   │   ├── movie.service.js
│   │   ├── notification.service.js
│   │   ├── payment.service.js
│   │   ├── room.service.js
│   │   ├── seathold.service.js
│   │   ├── showtime.service.js
│   │   ├── user.service.js
│   │   └── voucher.service.js
│   ├── utils/                  # Tiện ích bổ trợ (Redis Lock, State Machine)
│   │   └── redisLock.js
│   ├── app.js                  # Khởi tạo Express App & Middleware toàn cục
│   └── server.js               # HTTP Server kết hợp Socket.IO Server
├── .env                        # Biến môi trường
└── package.json                # Dependencies & scripts
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu Cầu Môi Trường
- **Node.js**: Phiên bản 18 trở lên.
- **PostgreSQL**: Cơ sở dữ liệu Cloud (Neon DB, Supabase) hoặc Local PostgreSQL.
- **Redis**: Upstash Redis hoặc Local Redis server.

### 2. Cấu Hình Biến Môi Trường (`.env`)
Tạo tệp `.env` tại thư mục gốc của `backend/`:
```env
PORT=3000
DATABASE_URL="postgresql://username:password@hostname:5432/dbname?sslmode=require"
REDIS_URL="rediss://default:password@hostname:6379"
JWT_SECRET="your_jwt_secret_key_here"
```

### 3. Cài Đặt Thư Viện
```bash
cd backend
npm install
```

### 4. Đồng Bộ Cơ Sở Dữ Liệu (Prisma Migration & Generate)
```bash
npx prisma db push
npx prisma generate
```

### 5. Nạp Dữ Liệu Mẫu (Seed Data)
```bash
npm run prisma:seed   # Hoặc: node prisma/seed.js
```

### 6. Khởi Chạy Máy Chủ Backend
- **Chế độ phát triển (Development với Nodemon)**:
  ```bash
  npm run dev
  ```
- **Chế độ triển khai (Production)**:
  ```bash
  npm start
  ```
- **Mở giao diện quản trị dữ liệu Prisma Studio**:
  ```bash
  npx prisma studio --port 5555
  ```
Máy chủ backend sẽ chạy tại: `http://localhost:3000`.
