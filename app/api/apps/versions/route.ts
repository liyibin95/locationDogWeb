import { NextRequest, NextResponse } from 'next/server';
import { getAppVersionsCollection, getLogsCollection } from '@/lib/mongodb';
import { validateAdminOrApiKey } from '@/lib/auth';
import { getOrSetCache, deleteCachePattern } from '@/lib/redis';
import { AppVersionDocument, AppVersionStatus, CreateAppVersionInput, UpdateAppVersionInput } from '@/types/app-version';
import { Filter, ObjectId, Sort } from 'mongodb';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: AppVersionStatus[] = ['published', 'draft', 'archived'];

/**
 * GET /api/apps/versions
 * 获取版本列表 (支持分页、搜索、状态筛选、渠道筛选、排序)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search')?.trim();
    const appId = searchParams.get('appId')?.trim();
    const channel = searchParams.get('channel')?.trim();
    const status = searchParams.get('status')?.trim();
    const sortBy = searchParams.get('sortBy')?.trim() || 'versionCode';
    const sortOrder = searchParams.get('sortOrder')?.trim() === 'asc' ? 1 : -1;

    const cacheKey = `cache:apps:versions:list:${page}:${limit}:${search || ''}:${appId || 'all'}:${channel || 'all'}:${status || 'all'}:${sortBy}:${sortOrder}`;

    const result = await getOrSetCache(
      cacheKey,
      async () => {
        const filter: Filter<AppVersionDocument> = {};

        if (status && status !== 'all' && VALID_STATUSES.includes(status as AppVersionStatus)) {
          filter.status = status as AppVersionStatus;
        }

        if (appId && appId !== 'all') {
          filter.appId = appId;
        }

        if (channel && channel !== 'all') {
          filter.channel = channel;
        }

        if (search) {
          const searchRegex = { $regex: search, $options: 'i' };
          const searchConditions: any[] = [
            { appId: searchRegex },
            { appName: searchRegex },
            { versionName: searchRegex },
            { fileName: searchRegex },
            { changelog: searchRegex },
          ];

          // 若输入的是数字，尝试匹配 versionCode
          const numericSearch = parseInt(search, 10);
          if (!isNaN(numericSearch)) {
            searchConditions.push({ versionCode: numericSearch });
          }

          if (ObjectId.isValid(search) && search.length === 24) {
            try {
              searchConditions.push({ _id: new ObjectId(search) });
            } catch {
              // ignore
            }
          }

          filter.$or = searchConditions;
        }

        const collection = await getAppVersionsCollection();

        let sortOptions: Sort = { versionCode: sortOrder as any, createdAt: -1 };
        if (sortBy === 'createdAt') {
          sortOptions = { createdAt: sortOrder as any };
        } else if (sortBy === 'downloadCount') {
          sortOptions = { downloadCount: sortOrder as any, versionCode: -1 };
        }

        const [total, versions] = await Promise.all([
          collection.countDocuments(filter),
          collection
            .find(filter)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        const formatted = versions.map((v) => ({
          ...v,
          _id: v._id?.toString(),
        }));

        return {
          versions: formatted,
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
        };
      },
      30
    );

    return NextResponse.json({
      success: true,
      data: result.versions,
      pagination: result.pagination,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '获取版本列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/apps/versions
 * 新建 App 版本发布记录
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const body: CreateAppVersionInput = await request.json();
    const {
      appId,
      appName = 'NextLog Android',
      versionName,
      versionCode,
      downloadUrl,
      fileName,
      fileSize,
      fileMd5,
      fileSha256,
      changelog = '',
      forceUpdate = false,
      minVersionCode,
      channel = 'default',
      status = 'published',
    } = body;

    // 参数校验
    if (!appId || !appId.trim()) {
      return NextResponse.json({ success: false, error: '应用标识 (appId) 不能为空' }, { status: 400 });
    }
    if (!versionName || !versionName.trim()) {
      return NextResponse.json({ success: false, error: '版本名称 (versionName) 不能为空，如 1.0.0' }, { status: 400 });
    }
    const cleanVersionCode = parseInt(String(versionCode), 10);
    if (isNaN(cleanVersionCode) || cleanVersionCode <= 0) {
      return NextResponse.json({ success: false, error: '版本号 (versionCode) 必须是大于 0 的整数' }, { status: 400 });
    }
    if (!downloadUrl || !downloadUrl.trim()) {
      return NextResponse.json({ success: false, error: '安装包下载地址 (downloadUrl) 不能为空' }, { status: 400 });
    }

    const collection = await getAppVersionsCollection();

    // 检查同一 appId 下是否存在重复的 versionCode
    const existing = await collection.findOne({
      appId: appId.trim(),
      versionCode: cleanVersionCode,
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `应用 (${appId.trim()}) 已存在版本号 ${cleanVersionCode} (${existing.versionName})，版本号必须递增唯一！`,
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const newVersion: AppVersionDocument = {
      appId: appId.trim(),
      appName: appName.trim() || 'NextLog Android',
      versionName: versionName.trim(),
      versionCode: cleanVersionCode,
      downloadUrl: downloadUrl.trim(),
      fileName: fileName?.trim() || undefined,
      fileSize: typeof fileSize === 'number' && fileSize > 0 ? fileSize : undefined,
      fileMd5: fileMd5?.trim() || undefined,
      fileSha256: fileSha256?.trim() || undefined,
      changelog: changelog?.trim() || '',
      forceUpdate: Boolean(forceUpdate),
      minVersionCode:
        typeof minVersionCode === 'number' && minVersionCode > 0 ? minVersionCode : undefined,
      channel: channel?.trim() || 'default',
      status: VALID_STATUSES.includes(status) ? status : 'published',
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await collection.insertOne(newVersion);

    // 清除版本缓存
    await deleteCachePattern('cache:apps:*');

    // 记录系统审计日志
    try {
      const logsCollection = await getLogsCollection();
      await logsCollection.insertOne({
        service: 'app-version-service',
        level: 'info',
        message: `发布新版本: ${newVersion.appName} v${newVersion.versionName} (${newVersion.versionCode}) [${newVersion.appId}]`,
        details: {
          versionId: insertResult.insertedId.toString(),
          versionName: newVersion.versionName,
          versionCode: newVersion.versionCode,
          forceUpdate: newVersion.forceUpdate,
          channel: newVersion.channel,
          status: newVersion.status,
        },
        createdAt: now,
      });
    } catch {
      // 忽略日志写入错误
    }

    return NextResponse.json({
      success: true,
      data: {
        ...newVersion,
        _id: insertResult.insertedId.toString(),
      },
      message: '版本发布成功',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '创建版本记录失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/apps/versions
 * 更新 App 版本记录
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const body: UpdateAppVersionInput = await request.json();
    const { _id, ...updates } = body;

    if (!_id || !ObjectId.isValid(_id)) {
      return NextResponse.json({ success: false, error: '无效的版本 ID' }, { status: 400 });
    }

    const collection = await getAppVersionsCollection();
    const existing = await collection.findOne({ _id: new ObjectId(_id) as any });

    if (!existing) {
      return NextResponse.json({ success: false, error: '未找到指定版本记录' }, { status: 404 });
    }

    const updateFields: Partial<AppVersionDocument> = {
      updatedAt: new Date(),
    };

    if (updates.appId !== undefined) updateFields.appId = updates.appId.trim();
    if (updates.appName !== undefined) updateFields.appName = updates.appName.trim();
    if (updates.versionName !== undefined) updateFields.versionName = updates.versionName.trim();
    if (updates.versionCode !== undefined) {
      const vc = parseInt(String(updates.versionCode), 10);
      if (isNaN(vc) || vc <= 0) {
        return NextResponse.json({ success: false, error: '版本号 (versionCode) 必须为正整数' }, { status: 400 });
      }
      // 检查版本号重复
      const checkDup = await collection.findOne({
        _id: { $ne: new ObjectId(_id) as any },
        appId: updateFields.appId || existing.appId,
        versionCode: vc,
      });
      if (checkDup) {
        return NextResponse.json(
          { success: false, error: `已存在相同的版本号 ${vc}` },
          { status: 409 }
        );
      }
      updateFields.versionCode = vc;
    }
    if (updates.downloadUrl !== undefined) updateFields.downloadUrl = updates.downloadUrl.trim();
    if (updates.fileName !== undefined) updateFields.fileName = updates.fileName?.trim();
    if (updates.fileSize !== undefined) updateFields.fileSize = updates.fileSize;
    if (updates.fileMd5 !== undefined) updateFields.fileMd5 = updates.fileMd5?.trim();
    if (updates.fileSha256 !== undefined) updateFields.fileSha256 = updates.fileSha256?.trim();
    if (updates.changelog !== undefined) updateFields.changelog = updates.changelog;
    if (updates.forceUpdate !== undefined) updateFields.forceUpdate = Boolean(updates.forceUpdate);
    if (updates.minVersionCode !== undefined) {
      updateFields.minVersionCode =
        updates.minVersionCode && updates.minVersionCode > 0 ? updates.minVersionCode : undefined;
    }
    if (updates.channel !== undefined) updateFields.channel = updates.channel.trim();
    if (updates.status !== undefined && VALID_STATUSES.includes(updates.status)) {
      updateFields.status = updates.status;
    }

    await collection.updateOne({ _id: new ObjectId(_id) as any }, { $set: updateFields });

    // 清理缓存
    await deleteCachePattern('cache:apps:*');

    return NextResponse.json({
      success: true,
      message: '版本记录更新成功',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '更新版本记录失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/apps/versions?id=xxx
 * 删除指定的版本记录
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await validateAdminOrApiKey(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.reason }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: '无效的版本 ID' }, { status: 400 });
    }

    const collection = await getAppVersionsCollection();
    const deleted = await collection.findOneAndDelete({ _id: new ObjectId(id) as any });

    if (!deleted) {
      return NextResponse.json({ success: false, error: '版本不存在或已被删除' }, { status: 404 });
    }

    // 清理缓存
    await deleteCachePattern('cache:apps:*');

    // 记录删除日志
    try {
      const logsCollection = await getLogsCollection();
      await logsCollection.insertOne({
        service: 'app-version-service',
        level: 'warn',
        message: `删除版本记录: ${deleted.appName} v${deleted.versionName} (${deleted.versionCode})`,
        details: { versionId: id, appId: deleted.appId },
        createdAt: new Date(),
      });
    } catch {
      // 忽略日志错误
    }

    return NextResponse.json({
      success: true,
      message: '版本记录已删除',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '删除版本失败' },
      { status: 500 }
    );
  }
}
