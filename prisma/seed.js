require('dotenv').config();
const prisma = require('../src/config/prisma');
const roomService = require('../src/services/room.service');
const bcrypt = require('bcrypt');

async function main() {
  console.log('🌱 [SEED] Bắt đầu nạp dữ liệu mẫu vào Database CINEVERSE...');

  // 1. Dọn dẹp dữ liệu cũ theo đúng thứ tự khóa ngoại
  await prisma.bookingSeat.deleteMany();
  await prisma.seatHold.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.showtime.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.room.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.user.deleteMany();
  await prisma.paymentSetting.deleteMany();
  await prisma.emailSetting.deleteMany();
  await prisma.footerSetting.deleteMany();

  console.log('🧹 Đã xóa sạch dữ liệu cũ.');

  // 2. Tạo Người Dùng Mẫu (Users)
  const adminPasswordHash = await bcrypt.hash('giolaptrinh123@', 10);
  const userPasswordHash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'giolaptrinh@gmail.com',
      password: adminPasswordHash,
      name: 'Quản Trị Viên GioLapTrinh',
      role: 'ADMIN',
    },
  });

  const user1 = await prisma.user.create({
    data: {
      email: 'nguyenvana@gmail.com',
      password: userPasswordHash,
      name: 'Nguyễn Văn A',
      role: 'USER',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'nguyenvanb@gmail.com',
      password: userPasswordHash,
      name: 'Nguyễn Văn B',
      role: 'USER',
    },
  });

  console.log('✅ 1. Đã tạo các Users:');
  console.log('   - Admin: giolaptrinh@gmail.com | Mật khẩu: giolaptrinh123@');
  console.log('   - User A: nguyenvana@gmail.com | Mật khẩu: 123456');
  console.log('   - User B: nguyenvanb@gmail.com | Mật khẩu: 123456');

  // 3. Tạo 4 Phòng Chiếu (Rooms) & Sơ Đồ Ghế (Seats) dùng roomService
  const roomsConfig = [
    { name: 'Phòng 01 - Standard', type: 'STANDARD', rows: 6, columns: 8 },
    { name: 'Phòng 02 - IMAX Laser', type: 'IMAX', rows: 7, columns: 10 },
    { name: 'Phòng 03 - VIP Gold Class', type: 'VIP', rows: 5, columns: 6 },
    { name: 'Phòng 04 - Sweetbox Couple', type: 'COUPLE', rows: 4, columns: 6 },
  ];

  const createdRooms = [];
  for (const rc of roomsConfig) {
    const room = await roomService.createRoom(rc);
    createdRooms.push(room);
  }

  console.log(`✅ 2. Đã tạo ${createdRooms.length} phòng chiếu hoàn chỉnh sơ đồ ghế (Standard, VIP, Couple)`);

  // 4. Tạo 6 Phim Mẫu (Movies)
  const moviesData = [
    {
      title: 'Dune: Hành Tinh Cát - Phần 2',
      description: 'Paul Atreides hợp lực cùng Chani và tộc người Fremen để trả thù những kẻ đã hủy hoại gia đình mình, đứng trước sứ mệnh giải cứu vũ trụ khỏi một tương lai tăm tối.',
      duration: 166,
      releaseDate: new Date('2026-03-01'),
      posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
      status: 'NOW_SHOWING',
    },
    {
      title: 'Godzilla x Kong: Đế Chế Mới',
      description: 'Hai quái thú khổng lồ Godzilla và Kong phải hợp sức đối đầu với một mối đe dọa nguy hiểm tiềm ẩn sâu trong lòng Trái Đất, đe dọa sự tồn vong của nhân loại.',
      duration: 115,
      releaseDate: new Date('2026-03-29'),
      posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
      status: 'NOW_SHOWING',
    },
    {
      title: 'Deadpool & Wolverine',
      description: 'Cặp đôi siêu anh hùng lầy lội nhất vũ trụ Marvel tái xuất trong một hành trình xuyên đa vũ trụ đầy ắp những pha hành động mãn nhãn và tiếng cười sảng khoái.',
      duration: 127,
      releaseDate: new Date('2026-07-26'),
      posterUrl: 'https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?w=800&q=80',
      status: 'NOW_SHOWING',
    },
    {
      title: 'Mai (Trấn Thành)',
      description: 'Bộ phim tâm lý tình cảm sâu sắc của đạo diễn Trấn Thành, xoay quanh cuộc đời đầy thăng trầm và chuyện tình xúc động của cô gái tên Mai.',
      duration: 131,
      releaseDate: new Date('2026-02-10'),
      posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80',
      status: 'NOW_SHOWING',
    },
    {
      title: 'Oppenheimer',
      description: 'Tác phẩm đoạt 7 giải Oscar của đạo diễn Christopher Nolan, tái hiện cuộc đời của nhà vật lý lý thuyết J. Robert Oppenheimer - cha đẻ của bom nguyên tử.',
      duration: 180,
      releaseDate: new Date('2026-01-15'),
      posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80',
      status: 'NOW_SHOWING',
    },
    {
      title: 'Kung Fu Panda 4',
      description: 'Gấu Po bước vào chương mới của cuộc đời khi được chỉ định trở thành Thủ lĩnh Tinh thần của Thung lũng Bình Yên và phải huấn luyện một Chiến Binh Rồng mới.',
      duration: 94,
      releaseDate: new Date('2026-03-08'),
      posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80',
      status: 'NOW_SHOWING',
    },
  ];

  const createdMovies = [];
  for (const m of moviesData) {
    const movie = await prisma.movie.create({ data: m });
    createdMovies.push(movie);
  }

  console.log(`✅ 3. Đã tạo ${createdMovies.length} bộ phim chất lượng cao`);

  // 5. Tạo 2-3 Suất Chiếu (Showtimes) cho mỗi phim trong các ngày tới
  const now = new Date();
  const createdShowtimes = [];

  for (let i = 0; i < createdMovies.length; i++) {
    const movie = createdMovies[i];
    const durationMs = movie.duration * 60 * 1000;

    // Suất 1: Hôm nay
    const room1 = createdRooms[i % createdRooms.length];
    const start1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14 + (i % 5), (i * 15) % 60);
    const end1 = new Date(start1.getTime() + durationMs);

    const st1 = await prisma.showtime.create({
      data: {
        movieId: movie.id,
        roomId: room1.id,
        startTime: start1,
        endTime: end1,
        price: 85000 + (i % 3) * 20000,
      },
    });
    createdShowtimes.push(st1);

    // Suất 2: Tối hôm nay
    const room2 = createdRooms[(i + 1) % createdRooms.length];
    const start2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19 + (i % 3), (i * 20) % 60);
    const end2 = new Date(start2.getTime() + durationMs);

    const st2 = await prisma.showtime.create({
      data: {
        movieId: movie.id,
        roomId: room2.id,
        startTime: start2,
        endTime: end2,
        price: 95000 + (i % 2) * 25000,
      },
    });
    createdShowtimes.push(st2);

    // Suất 3: Ngày mai
    const room3 = createdRooms[(i + 2) % createdRooms.length];
    const start3 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 15 + (i % 4), (i * 10) % 60);
    const end3 = new Date(start3.getTime() + durationMs);

    const st3 = await prisma.showtime.create({
      data: {
        movieId: movie.id,
        roomId: room3.id,
        startTime: start3,
        endTime: end3,
        price: 90000 + (i % 3) * 15000,
      },
    });
    createdShowtimes.push(st3);
  }

  console.log(`✅ 4. Đã tạo ${createdShowtimes.length} suất chiếu (mỗi phim 3 suất phân bổ phòng Standard, IMAX, VIP, Couple)`);

  // 6. Tạo Vouchers Mẫu
  const expireDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.voucher.createMany({
    data: [
      {
        code: 'CINEVERSE2026',
        discountPercent: 20,
        minOrderAmount: 100000,
        expireAt: expireDate,
        usageLimit: 100,
        isActive: true,
      },
      {
        code: 'SUMMER50K',
        discountAmount: 50000,
        minOrderAmount: 150000,
        expireAt: expireDate,
        usageLimit: 50,
        isActive: true,
      },
      {
        code: 'WELCOME10',
        discountPercent: 10,
        minOrderAmount: 0,
        expireAt: expireDate,
        usageLimit: 200,
        isActive: true,
      },
      {
        code: 'VIPCOMBO',
        discountAmount: 30000,
        minOrderAmount: 120000,
        expireAt: expireDate,
        usageLimit: 100,
        isActive: true,
      },
      {
        code: 'VOUCHER_VAN_A',
        discountAmount: 50000,
        minOrderAmount: 0,
        expireAt: expireDate,
        usageLimit: 1,
        isActive: true,
        userId: user1.id,
      },
    ],
  });

  console.log('✅ 5. Đã tạo 5 Vouchers giảm giá mẫu');

  // 7. Tạo Cấu Hình Thanh Toán (PaymentSetting)
  await prisma.paymentSetting.create({
    data: {
      momoQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=2|99|0988889999|CINEVERSE%20CINEMA||0|0|100000|THANH%20TOAN%20VE%20XEM%20PHIM|transfer_p2p',
      vietQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://img.vietqr.io/image/TCB-190388889999-compact2.png',
      zaloPayQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ZALOPAY_CINEVERSE_OFFICIAL',
      bankAccountName: 'CONG TY CP RAP PHIM CINEVERSE',
      bankAccountNumber: '190388889999',
      bankName: 'Techcombank (Hội Sở)',
    },
  });

  // 8. Tạo Cấu Hình Email Google (EmailSetting)
  await prisma.emailSetting.create({
    data: {
      smtpEmail: 'cineverse.cinema.vn@gmail.com',
      smtpPassword: 'abcd efgh ijkl mnop',
      senderName: 'CINEVERSE Cinema',
      adminEmail: 'giolaptrinh@gmail.com',
    },
  });

  // 9. Tạo Cấu Hình Footer & Chính Sách (FooterSetting)
  await prisma.footerSetting.create({
    data: {
      termsOfService: `1. ĐIỀU KHOẢN SỬ DỤNG DỊCH VỤ CINEVERSE\n- Khách hàng có trách nhiệm bảo mật thông tin tài khoản và vé điện tử của mình.\n- Vé đã mua được hỗ trợ hủy/đổi trước giờ chiếu tối thiểu 12 tiếng.\n- Khách hàng cần xuất trình mã QR vé điện tử tại quầy soát vé trước giờ chiếu 10 phút.\n- Nghiêm cấm mọi hành vi quay phim, chụp ảnh, truyền phát trực tiếp trong phòng chiếu phim.`,
      privacyPolicy: `2. CHÍNH SÁCH BẢO MẬT THÔNG TIN\n- CINEVERSE cam kết bảo mật tuyệt đối mọi thông tin cá nhân (Họ tên, Email, Số điện thoại, Lịch sử mua vé) của khách hàng theo tiêu chuẩn an toàn dữ liệu.\n- Thông tin thanh toán (Số tài khoản, Mã QR) được mã hóa bảo mật SSL/TLS.\n- Chúng tôi không bao giờ chia sẻ dữ liệu của quý khách cho bất kỳ bên thứ ba nào vì mục đích thương mại.`,
      customerCare: `3. CHĂM SÓC KHÁCH HÀNG & HỖ TRỢ 24/7\n- Tổng đài hỗ trợ khách hàng: 1900 8888 (8:00 - 23:00 hàng ngày)\n- Email tiếp nhận khiếu nại & hỗ trợ: support@cineverse.vn\n- Hỗ trợ đổi trả vé, xử lý sự cố thanh toán và giải đáp thắc mắc dịch vụ.`,
      aboutUs: `CINEVERSE - Hệ thống rạp chiếu phim kỹ thuật số Realtime hàng đầu, mang đến trải nghiệm điện ảnh chuẩn quốc tế IMAX & VIP Gold Class.`,
      hotline: '1900 8888',
      email: 'support@cineverse.vn',
      socialFacebook: 'https://facebook.com/cineverse',
      socialYoutube: 'https://youtube.com/cineverse',
      socialZalo: 'https://zalo.me/cineverse',
    },
  });

  // 10. Tạo Thông Báo Mẫu (Notifications)
  await prisma.notification.createMany({
    data: [
      {
        userId: user1.id,
        title: '🎉 CHÀO MỪNG THÀNH VIÊN MỚI!',
        message: 'Chào mừng bạn đến với rạp phim CINEVERSE. Bạn nhận được 1 mã giảm giá 50.000đ trong ví voucher!',
        type: 'VOUCHER',
      },
      {
        userId: user1.id,
        title: '🎟️ ĐẶT VÉ THÀNH CÔNG',
        message: 'Đơn vé phim "Dune: Hành Tinh Cát - Phần 2" của bạn đã được xác nhận. Chúc bạn xem phim vui vẻ!',
        type: 'BOOKING',
      },
      {
        userId: null,
        title: '🔥 BOM TẤN MÙA HÈ',
        message: 'Suất chiếu đặc biệt Deadpool & Wolverine đã mở bán vé sớm. Đặt ngay vị trí đẹp!',
        type: 'SYSTEM',
      },
    ],
  });

  // 11. Tạo Đơn Đặt Vé Mẫu (Booking & BookingSeats)
  const sampleSeats = await prisma.seat.findMany({
    where: { roomId: createdRooms[1].id },
    take: 2,
  });

  const sampleBooking = await prisma.booking.create({
    data: {
      userId: user1.id,
      showtimeId: createdShowtimes[0].id,
      totalPrice: 240000,
      discountAmount: 0,
      paymentMethod: 'MOMO',
      status: 'CONFIRMED',
      bookingSeats: {
        create: sampleSeats.map((s) => ({
          seatId: s.id,
          price: 120000,
        })),
      },
    },
  });

  console.log(`✅ 6. Đã tạo 1 đơn đặt vé mẫu #${sampleBooking.id.slice(0, 8).toUpperCase()} cho tài khoản Nguyễn Văn A`);
  console.log('\n🎉 HOÀN TẤT SEEDING DATABASE THÀNH CÔNG RỰC RỠ QUA LỆNH `npx prisma db seed`!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi nạp seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
