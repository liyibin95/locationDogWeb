import { MongoClient, Db, Collection } from 'mongodb';
import { LogDocument } from '@/types/log';
import { ConfigDocument } from '@/types/config';
import { MessageDocument, MessageReadDocument } from '@/types/message';
import { DeviceDocument } from '@/types/device';
import { FeedbackDocument } from '@/types/feedback';
import { AppVersionDocument } from '@/types/app-version';

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

/**
 * 获取 devices 集合（Android 设备管理），并确保索引存在
 */
let deviceIndexesCreated = false;

export async function getDevicesCollection(): Promise<Collection<DeviceDocument>> {
  const db = await getDatabase();
  const collection = db.collection<DeviceDocument>('devices');

  if (!deviceIndexesCreated) {
    try {
      const existingIndexes = await collection.indexes().catch(() => []);
      const oldDeviceIdIdx = existingIndexes.find(
        (idx) => (idx.name === 'deviceId_1' || (idx.key && (idx.key as any).deviceId)) && !idx.sparse
      );
      if (oldDeviceIdIdx?.name) {
        try {
          await collection.dropIndex(oldDeviceIdIdx.name);
        } catch {
          // ignore drop error
        }
      }

      await Promise.all([
        collection.createIndex({ deviceId: 1 }, { unique: true, sparse: true }),
        collection.createIndex({ wechatId: 1 }),
        collection.createIndex({ createdAt: -1 }),
        collection.createIndex({ points: -1 }),
        collection.createIndex({ status: 1 }),
      ]);
      deviceIndexesCreated = true;
    } catch {
      deviceIndexesCreated = true;
    }
  }

  return collection;
}

/**
 * 获取 feedbacks 集合（意见与建议反馈），并确保常用查询索引存在
 */
let feedbackIndexesCreated = false;

export async function getFeedbacksCollection(): Promise<Collection<FeedbackDocument>> {
  const db = await getDatabase();
  const collection = db.collection<FeedbackDocument>('feedbacks');

  if (!feedbackIndexesCreated) {
    try {
      await Promise.all([
        collection.createIndex({ createdAt: -1 }),
        collection.createIndex({ status: 1 }),
        collection.createIndex({ type: 1 }),
        collection.createIndex({ priority: 1 }),
        collection.createIndex({ deviceId: 1 }),
        collection.createIndex({ updatedAt: -1 }),
      ]);
      feedbackIndexesCreated = true;
    } catch {
      feedbackIndexesCreated = true;
    }
  }

  return collection;
}

/**
 * 获取 app_versions 集合（App 版本管理），并确保常用查询索引存在
 */
let appVersionIndexesCreated = false;

export async function getAppVersionsCollection(): Promise<Collection<AppVersionDocument>> {
  const db = await getDatabase();
  const collection = db.collection<AppVersionDocument>('app_versions');

  if (!appVersionIndexesCreated) {
    try {
      await Promise.all([
        collection.createIndex({ appId: 1, versionCode: -1 }),
        collection.createIndex({ appId: 1, status: 1, versionCode: -1 }),
        collection.createIndex({ appId: 1, channel: 1, status: 1 }),
        collection.createIndex({ createdAt: -1 }),
        collection.createIndex({ status: 1 }),
      ]);
      appVersionIndexesCreated = true;
    } catch {
      appVersionIndexesCreated = true;
    }
  }

  return collection;
}

export default clientPromise;

