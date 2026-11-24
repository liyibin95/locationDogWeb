import { MongoClient, Db, Collection } from 'mongodb';
import { LogDocument } from '@/types/log';
import { ConfigDocument } from '@/types/config';
import { MessageDocument, MessageReadDocument } from '@/types/message';

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
let logIndexesCreated = false;

export async function getLogsCollection(): Promise<Collection<LogDocument>> {
  const db = await getDatabase();
  const collection = db.collection<LogDocument>('logs');

  if (!logIndexesCreated) {
    try {
      // 针对常见查询字段创建复合或单字段索引
      await Promise.all([
        collection.createIndex({ createdAt: -1 }),
        collection.createIndex({ level: 1 }),
        collection.createIndex({ service: 1 }),
        collection.createIndex({ message: 'text' }),
      ]);
      logIndexesCreated = true;
    } catch {
      logIndexesCreated = true;
    }
  }

  return collection;
}

/**
 * 获取 configs 集合（配置中心），并确保索引存在
 */
let configIndexesCreated = false;

export async function getConfigsCollection(): Promise<Collection<ConfigDocument>> {
  const db = await getDatabase();
  const collection = db.collection<ConfigDocument>('configs');

  if (!configIndexesCreated) {
    try {
      await Promise.all([
        collection.createIndex({ key: 1, appId: 1, group: 1, environment: 1 }, { unique: true }),
        collection.createIndex({ appId: 1 }),
        collection.createIndex({ group: 1 }),
        collection.createIndex({ isEnabled: 1 }),
        collection.createIndex({ updatedAt: -1 }),
      ]);
      configIndexesCreated = true;
    } catch {
      configIndexesCreated = true;
    }
  }

  return collection;
}

/**
 * 获取 messages 集合（消息中心），并确保索引存在
 */
let messageIndexesCreated = false;

export async function getMessagesCollection(): Promise<Collection<MessageDocument>> {
  const db = await getDatabase();
  const collection = db.collection<MessageDocument>('messages');

  if (!messageIndexesCreated) {
    try {
      await Promise.all([
        collection.createIndex({ appId: 1, status: 1, publishAt: -1 }),
        collection.createIndex({ type: 1 }),
        collection.createIndex({ isPopup: 1 }),
        collection.createIndex({ targetType: 1 }),
        collection.createIndex({ expireAt: 1 }),
      ]);
      messageIndexesCreated = true;
    } catch {
      messageIndexesCreated = true;
    }
  }

  return collection;
}

/**
 * 获取 message_reads 集合（已读记录）
 */
let messageReadIndexesCreated = false;

export async function getMessageReadsCollection(): Promise<Collection<MessageReadDocument>> {
  const db = await getDatabase();
  const collection = db.collection<MessageReadDocument>('message_reads');

  if (!messageReadIndexesCreated) {
    try {
      await Promise.all([
        collection.createIndex({ messageId: 1, userId: 1 }, { unique: true }),
        collection.createIndex({ userId: 1 }),
      ]);
      messageReadIndexesCreated = true;
    } catch {
      messageReadIndexesCreated = true;
    }
  }

  return collection;
}

export default clientPromise;

