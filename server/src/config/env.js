import dotenv from 'dotenv';

dotenv.config();

const required = ['MONGO_URI', 'JWT_SECRET', 'REDIS_URL', 'OPENAI_KEY', 'S3_BUCKET'];

required.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`⚠️  Missing expected environment variable: ${key}`);
  }
});

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/moswords',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  openAiKey: process.env.OPENAI_KEY || '',
  s3: {
    bucket: process.env.S3_BUCKET || 'moswords-dev',
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY || 'minio',
    secretAccessKey: process.env.S3_SECRET_KEY || 'miniosecret',
  },
  uploads: {
    maxFileSize: Number(process.env.MAX_FILE_SIZE || 1024 * 1024 * 200)
  },
  allowedOrigin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
};
