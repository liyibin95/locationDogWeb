import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NextLog - 分布式日志管理系统',
  description: '基于 Next.js 与 MongoDB (Vercel) 的高性能日志收集与查询平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
