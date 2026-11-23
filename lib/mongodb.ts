import { MongoClient, Db, Collection } from 'mongodb';
import { LogDocument } from '@/types/log';

const uri = process.env.MONGODB_URI || '';
const dbName = process.env.MONGODB_DB || 'next_log';

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!uri) {
  // If MONGODB_URI is not set, we don't throw during build time,
  // but provide a clear runtime error promise.
  clientPromise = Promise.reject(
    new Error('请配置 MONGODB_URI 环境变量（例如在 Vercel 中连接 MongoDB 或在 .env.local 中设置）。')
  );
} else {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so the connection
    // is preserved across module reloads caused by HMR.
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
}

/**
 * 获取 MongoDB 数据库实例
 */
export async function getDatabase(): Promise<Db> {
  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}

/**
 * 获取 logs 集合，并确保常用查询索引存在
 */
let indexesCreated = false;

export async function getLogsCollection(): Promise<Collection<LogDocument>> {
  const db = await getDatabase();
  const collection = db.collection<LogDocument>('logs');

  if (!indexesCreated) {
    try {
      // 针对常见查询字段创建复合或单字段索引
      await Promise.all([
        collection.createIndex({ createdAt: -1 }),
        collection.createIndex({ level: 1 }),
        collection.createIndex({ service: 1 }),
        collection.createIndex({ message: 'text' }),
      ]);
      indexesCreated = true;
    } catch {
      // 忽略索引重复创建或文本索引已有冲突等非关键警告
      indexesCreated = true;
    }
  }

  return collection;
}

export default clientPromise;
