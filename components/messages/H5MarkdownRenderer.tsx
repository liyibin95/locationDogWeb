'use client';

import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface H5MarkdownRendererProps {
  content: string;
  theme?: 'dark' | 'light';
  onImageClick?: (url: string) => void;
  className?: string;
}

/**
 * 专为 Android App 移动端 H5 优化的富文本与 Markdown 渲染器
 * 支持：
 * - 亮色 (Light) / 暗色 (Dark) 双主题自适应
 * - 图片点击全屏大图预览（呼起原生或 H5 Lightbox）
 * - 代码块一键复制
 * - 标题、列表、引用块、表格排版与水平滚动
 * - 兼容行内与基础 HTML 标签（<br>, <b>, <span>, <u>, <img> 等）
 */
export const H5MarkdownRenderer: React.FC<H5MarkdownRendererProps> = ({
  content,
  theme = 'dark',
  onImageClick,
  className = '',
}) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  if (!content) return null;

  const isDark = theme === 'dark';

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCodeIdx(idx);
      setTimeout(() => setCopiedCodeIdx(null), 2000);
    });
  };

  // 解析行内样式：粗体、斜体、删除线、下划线、行内代码、超链接、图片、基础HTML
  const parseInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // 正则支持：图片 ![alt](url)、链接 [text](url)、粗体 **text** / __text__、斜体 *text* / _text_、删除线 ~~text~~、下划线 <u>text</u>、行内代码 `code`、<br/>
    const regex =
      /(!\[(.*?)\]\((.*?)\))|(\[(.*?)\]\((.*?)\))|(\*\*(.*?)\*\*)|(__(.*?)__)|(\*(.*?)\*)|(_(.*?)_)|(~~(.*?)~~)|(<u>(.*?)<\/u>)|(`(.*?)`)|(<br\s*\/?>)/i;

    while (remaining) {
      const match = remaining.match(regex);
      if (!match || match.index === undefined) {
        nodes.push(remaining);
        break;
      }

      const before = remaining.slice(0, match.index);
      if (before) {
        nodes.push(before);
      }

      const fullMatch = match[0];

      if (match[1]) {
        // 图片: ![alt](url)
        const alt = match[2];
        const src = match[3];
        nodes.push(
          <span
            key={`img-${keyIdx++}`}
            className="my-3 block overflow-hidden rounded-xl"
            onClick={() => onImageClick?.(src)}
          >
            <img
              src={src}
              alt={alt || '公告配图'}
              loading="lazy"
              className={`w-full max-h-96 object-contain rounded-xl border cursor-zoom-in transition-transform duration-200 active:scale-95 ${
                isDark
                  ? 'border-slate-800 bg-slate-900/80'
                  : 'border-slate-200 bg-slate-100'
              }`}
            />
            {alt && (
              <span
                className={`mt-1.5 block text-center text-[11px] ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {alt}
              </span>
            )}
          </span>
        );
      } else if (match[4]) {
        // 超链接: [text](url)
        const linkText = match[5];
        const href = match[6];
        nodes.push(
          <a
            key={`a-${keyIdx++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (typeof window !== 'undefined' && (window as any).Android?.onActionClick) {
                e.preventDefault();
                (window as any).Android.onActionClick(href, linkText);
              }
            }}
            className="inline-flex items-center space-x-0.5 text-indigo-500 hover:text-indigo-400 underline underline-offset-4 font-medium transition"
          >
            <span>{linkText}</span>
            <ExternalLink className="inline h-3 w-3 ml-0.5" />
          </a>
        );
      } else if (match[7] || match[9]) {
        // 粗体: **text** 或 __text__
        const boldText = match[8] || match[10];
        nodes.push(
          <strong
            key={`b-${keyIdx++}`}
            className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            {boldText}
          </strong>
        );
      } else if (match[11] || match[13]) {
        // 斜体: *text* 或 _text_
        const italicText = match[12] || match[14];
        nodes.push(
          <em
            key={`em-${keyIdx++}`}
            className={`italic ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
          >
            {italicText}
          </em>
        );
      } else if (match[15]) {
        // 删除线: ~~text~~
        const delText = match[16];
        nodes.push(
          <del
            key={`del-${keyIdx++}`}
            className={`line-through ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
          >
            {delText}
          </del>
        );
      } else if (match[17]) {
        // 下划线: <u>text</u>
        const underlineText = match[18];
        nodes.push(
          <span key={`u-${keyIdx++}`} className="underline underline-offset-2">
            {underlineText}
          </span>
        );
      } else if (match[19]) {
        // 行内代码: `code`
        const codeText = match[20];
        nodes.push(
          <code
            key={`code-${keyIdx++}`}
            className={`rounded px-1.5 py-0.5 font-mono text-[11px] border mx-0.5 ${
              isDark
                ? 'bg-slate-800 text-indigo-300 border-slate-700'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
            }`}
          >
            {codeText}
          </code>
        );
      } else if (match[21]) {
        // <br/> 换行
        nodes.push(<br key={`br-${keyIdx++}`} />);
      }

      remaining = remaining.slice(match.index + fullMatch.length);
    }

    return nodes;
  };

  // 块级结构逐行解析
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let elemKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. 代码块 ```
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // 跳过结束 ```
      const fullCode = codeLines.join('\n');
      const blockIdx = elemKey++;

      elements.push(
        <div
          key={`pre-${blockIdx}`}
          className={`my-3.5 overflow-hidden rounded-xl border ${
            isDark
              ? 'border-slate-800 bg-slate-950/90'
              : 'border-slate-200 bg-slate-900 text-slate-100'
          }`}
        >
          <div
            className={`flex items-center justify-between px-3.5 py-1.5 border-b text-[11px] ${
              isDark
                ? 'border-slate-800/80 bg-slate-900/60 text-slate-400'
                : 'border-slate-800 bg-slate-950 text-slate-400'
            }`}
          >
            <span className="font-mono uppercase font-semibold text-[10px]">
              {lang || 'code'}
            </span>
            <button
              onClick={() => handleCopyCode(fullCode, blockIdx)}
              className="flex items-center space-x-1 text-slate-400 hover:text-white transition px-1.5 py-0.5 rounded"
            >
              {copiedCodeIdx === blockIdx ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[10px]">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span className="text-[10px]">复制</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3.5 overflow-x-auto font-mono text-xs leading-relaxed text-indigo-300 whitespace-pre">
            {fullCode}
          </pre>
        </div>
      );
      continue;
    }

    // 2. 表格 | ... |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCols = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        const rowLines = tableLines.slice(2);

        elements.push(
          <div
            key={`table-${elemKey++}`}
            className={`my-3.5 overflow-x-auto rounded-xl border shadow-sm ${
              isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'
            }`}
          >
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b text-[11px] font-semibold ${
                  isDark
                    ? 'border-slate-800 bg-slate-800/60 text-slate-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <tr>
                  {headerCols.map((col, cIdx) => (
                    <th key={cIdx} className="px-3.5 py-2.5 whitespace-nowrap">
                      {parseInline(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className={`divide-y text-xs ${
                  isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-600'
                }`}
              >
                {rowLines.map((rLine, rIdx) => {
                  const cells = rLine
                    .split('|')
                    .slice(1, -1)
                    .map((c) => c.trim());
                  return (
                    <tr
                      key={rIdx}
                      className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/80'}
                    >
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2.5 whitespace-nowrap">
                          {parseInline(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 3. 标题 # ~ ####
    if (line.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${elemKey++}`}
          className={`mt-5 mb-2.5 text-lg font-bold pb-2 border-b leading-snug ${
            isDark ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'
          }`}
        >
          {parseInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${elemKey++}`}
          className={`mt-4 mb-2 text-base font-bold pb-1.5 border-b leading-snug ${
            isDark ? 'text-white border-slate-800/70' : 'text-slate-900 border-slate-200/80'
          }`}
        >
          {parseInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${elemKey++}`}
          className={`mt-3.5 mb-1.5 text-sm font-semibold ${
            isDark ? 'text-indigo-300' : 'text-indigo-600'
          }`}
        >
          {parseInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      elements.push(
        <h4
          key={`h4-${elemKey++}`}
          className={`mt-3 mb-1 text-xs font-semibold ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}
        >
          {parseInline(line.slice(5))}
        </h4>
      );
      i++;
      continue;
    }

    // 4. 分割线 --- 或 ***
    if (/^(\s*[-*_]\s*){3,}$/.test(line.trim())) {
      elements.push(
        <hr
          key={`hr-${elemKey++}`}
          className={`my-4 border-0 h-[1px] ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}
        />
      );
      i++;
      continue;
    }

    // 5. 引用块 >
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${elemKey++}`}
          className={`my-3 border-l-4 border-indigo-500 rounded-r-xl px-3.5 py-2.5 text-xs italic ${
            isDark
              ? 'bg-indigo-500/10 text-slate-300'
              : 'bg-indigo-50/70 text-slate-700'
          }`}
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} className={qIdx > 0 ? 'mt-1' : ''}>
              {parseInline(ql)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 6. 无序列表 - 或 * 或 +
    if (/^[\s]*[-*+]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[\s]*[-*+]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[\s]*[-*+]\s+/, ''));
        i++;
      }
      elements.push(
        <ul
          key={`ul-${elemKey++}`}
          className={`my-2.5 list-disc list-inside space-y-1.5 text-xs leading-relaxed ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="pl-1">
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. 有序列表 1. 2.
    if (/^[\s]*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[\s]*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[\s]*\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol
          key={`ol-${elemKey++}`}
          className={`my-2.5 list-decimal list-inside space-y-1.5 text-xs leading-relaxed ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="pl-1">
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 8. 空行
    if (!line.trim()) {
      i++;
      continue;
    }

    // 9. 普通段落
    elements.push(
      <p
        key={`p-${elemKey++}`}
        className={`my-2 text-xs leading-relaxed ${
          isDark ? 'text-slate-300' : 'text-slate-700'
        }`}
      >
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return (
    <div
      className={`h5-markdown-content text-xs leading-relaxed break-words ${className}`}
    >
      {elements}
    </div>
  );
};
