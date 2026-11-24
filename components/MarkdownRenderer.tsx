'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * 轻量级、无外部依赖的 Markdown 富文本渲染器
 * 针对系统公告、通知、版本更新日志进行了排版优化
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  if (!content) return null;

  // 解析行内样式：粗体、斜体、删除线、行内代码、超链接、图片
  const parseInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // 正则匹配：图片、链接、粗体、斜体、删除线、行内代码
    const regex =
      /(!\[(.*?)\]\((.*?)\))|(\[(.*?)\]\((.*?)\))|(\*\*(.*?)\*\*)|(__(.*?)__)|(\*(.*?)\*)|(_(.*?)_)|(~~(.*?)~~)|(`(.*?)`)/;

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
          <img
            key={`img-${keyIdx++}`}
            src={src}
            alt={alt || 'image'}
            loading="lazy"
            className="my-2.5 max-h-80 max-w-full rounded-xl border border-slate-700/80 bg-slate-950 object-contain shadow-lg"
          />
        );
      } else if (match[4]) {
        // 链接: [text](url)
        const linkText = match[5];
        const href = match[6];
        nodes.push(
          <a
            key={`a-${keyIdx++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300 transition"
          >
            {linkText}
          </a>
        );
      } else if (match[7] || match[9]) {
        // 粗体: **text** 或 __text__
        const boldText = match[8] || match[10];
        nodes.push(
          <strong key={`b-${keyIdx++}`} className="font-bold text-white">
            {boldText}
          </strong>
        );
      } else if (match[11] || match[13]) {
        // 斜体: *text* 或 _text_
        const italicText = match[12] || match[14];
        nodes.push(
          <em key={`em-${keyIdx++}`} className="italic text-slate-300">
            {italicText}
          </em>
        );
      } else if (match[15]) {
        // 删除线: ~~text~~
        const delText = match[16];
        nodes.push(
          <del key={`del-${keyIdx++}`} className="line-through text-slate-500">
            {delText}
          </del>
        );
      } else if (match[17]) {
        // 行内代码: `code`
        const codeText = match[18];
        nodes.push(
          <code
            key={`code-${keyIdx++}`}
            className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-indigo-300 border border-slate-700"
          >
            {codeText}
          </code>
        );
      }

      remaining = remaining.slice(match.index + fullMatch.length);
    }

    return nodes;
  };

  // 块级结构解析
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
      i++; // 跳过结尾 ```
      elements.push(
        <div key={`pre-${elemKey++}`} className="my-2.5 rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs overflow-x-auto">
          {lang && (
            <div className="mb-1 text-[10px] text-slate-500 font-semibold uppercase">{lang}</div>
          )}
          <pre className="text-indigo-300 whitespace-pre">{codeLines.join('\n')}</pre>
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
        const rowLines = tableLines.slice(2); // 跳过第二行对齐线 | --- |

        elements.push(
          <div key={`table-${elemKey++}`} className="my-2.5 overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-[11px] font-semibold text-slate-300 border-b border-slate-700">
                <tr>
                  {headerCols.map((col, cIdx) => (
                    <th key={cIdx} className="px-3 py-2">
                      {parseInline(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-300">
                {rowLines.map((rLine, rIdx) => {
                  const cells = rLine
                    .split('|')
                    .slice(1, -1)
                    .map((c) => c.trim());
                  return (
                    <tr key={rIdx} className="hover:bg-slate-800/40">
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2">
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
        <h1 key={`h1-${elemKey++}`} className="my-3 text-lg font-bold text-white border-b border-slate-800 pb-1.5">
          {parseInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${elemKey++}`} className="my-2.5 text-base font-bold text-white border-b border-slate-800/60 pb-1">
          {parseInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${elemKey++}`} className="my-2 text-sm font-semibold text-indigo-300">
          {parseInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${elemKey++}`} className="my-1.5 text-xs font-semibold text-slate-200">
          {parseInline(line.slice(5))}
        </h4>
      );
      i++;
      continue;
    }

    // 4. 分割线 --- 或 ***
    if (/^(\s*[-*_]\s*){3,}$/.test(line.trim())) {
      elements.push(<hr key={`hr-${elemKey++}`} className="my-3 border-slate-800" />);
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
          className="my-2.5 border-l-4 border-indigo-500 bg-indigo-500/5 px-3 py-2 text-xs italic text-slate-300 rounded-r-lg"
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
        <ul key={`ul-${elemKey++}`} className="my-2 list-disc list-inside space-y-1 text-xs text-slate-300">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
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
        <ol key={`ol-${elemKey++}`} className="my-2 list-decimal list-inside space-y-1 text-xs text-slate-300">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
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
      <p key={`p-${elemKey++}`} className="my-1.5 text-xs text-slate-300 leading-relaxed">
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return (
    <div className={`markdown-body text-xs text-slate-300 leading-relaxed space-y-1 ${className}`}>
      {elements}
    </div>
  );
};
