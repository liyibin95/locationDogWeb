'use client';

import React, { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { H5AnnouncementView } from '@/components/messages/H5AnnouncementView';

function H5MessageDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  const appId = searchParams.get('appId') || undefined;
  const userId = searchParams.get('userId') || undefined;
  const channel = searchParams.get('channel') || undefined;
  const rawVersion = searchParams.get('versionCode');
  const versionCode = rawVersion ? parseInt(rawVersion, 10) : undefined;
  const rawTheme = searchParams.get('theme');
  const themeParam =
    rawTheme === 'dark' || rawTheme === 'light' || rawTheme === 'auto'
      ? rawTheme
      : 'auto';
  const hideHeader =
    searchParams.get('hideHeader') === 'true' || searchParams.get('hideHeader') === '1';
  const hideAction =
    searchParams.get('hideAction') === 'true' || searchParams.get('hideAction') === '1';
  const preview = searchParams.get('preview') === 'true';

  return (
    <H5AnnouncementView
      id={id}
      appId={appId}
      userId={userId}
      channel={channel}
      versionCode={versionCode}
      themeParam={themeParam}
      hideHeader={hideHeader}
      hideAction={hideAction}
      preview={preview}
    />
  );
}

export default function H5MessageDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
          <div className="flex items-center space-x-2 text-indigo-400 text-xs">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span>正在载入公告...</span>
          </div>
        </div>
      }
    >
      <H5MessageDetailContent />
    </Suspense>
  );
}
