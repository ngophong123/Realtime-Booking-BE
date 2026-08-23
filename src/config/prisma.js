const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

//Tạo Pool kết nối PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Khởi tạo bộ chuyển đổi giữa Prisma và Driver pg
const adapter = new PrismaPg(pool);

// Tạo instance Prisma Client sử dụng apdater trên
const prisma = new PrismaClient({adapter});

module.exports = prisma;