// Simple, safe markdown-to-React renderer for blog articles.
// Supports: headings, paragraphs, lists, links, bold, italic, code blocks.

import React from 'react';

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  const renderContent = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Headings
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-2xl font-medium text-gray-900 mt-10 mb-4">
            {trimmed.slice(4)}
          </h3>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-3xl font-medium text-gray-900 mt-12 mb-6">
            {trimmed.slice(3)}
          </h2>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-4xl font-medium text-gray-900 mt-12 mb-6">
            {trimmed.slice(2)}
          </h1>
        );
        i++;
        continue;
      }

      // Unordered lists
      if (trimmed.startsWith('- ')) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && lines[i].trim().startsWith('- ')) {
          const itemText = lines[i].trim().slice(2);
          listItems.push(
            <li key={i} className="mb-2">
              {parseInlineMarkdown(itemText)}
            </li>
          );
          i++;
        }
        elements.push(
          <ul key={`ul-${i}`} className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
            {listItems}
          </ul>
        );
        continue;
      }

      // Ordered lists
      if (/^\d+\.\s/.test(trimmed)) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
          const itemText = lines[i].trim().replace(/^\d+\.\s/, '');
          listItems.push(
            <li key={i} className="mb-2">
              {parseInlineMarkdown(itemText)}
            </li>
          );
          i++;
        }
        elements.push(
          <ol key={`ol-${i}`} className="list-decimal pl-6 mb-6 space-y-2 text-gray-700">
            {listItems}
          </ol>
        );
        continue;
      }

      // Empty lines
      if (trimmed === '') {
        i++;
        continue;
      }

      // Horizontal rule
      if (trimmed === '---') {
        elements.push(
          <hr key={i} className="my-8 border-gray-200" />
        );
        i++;
        continue;
      }

      // Paragraph
      elements.push(
        <p key={i} className="mb-6 text-gray-700 leading-relaxed">
          {parseInlineMarkdown(trimmed)}
        </p>
      );
      i++;
    }

    return elements;
  };

  return <div className="prose prose-lg max-w-none">{renderContent()}</div>;
}

// Parse inline markdown: **bold**, *italic*, [link](url), `code`
function parseInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(remaining.slice(0, boldMatch.index));
      }
      parts.push(
        <strong key={`bold-${key++}`} className="font-semibold text-gray-900">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Italic: *text*
    const italicMatch = remaining.match(/\*(.+?)\*/);
    if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) {
        parts.push(remaining.slice(0, italicMatch.index));
      }
      parts.push(
        <em key={`italic-${key++}`} className="italic">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
      continue;
    }

    // Links: [text](url)
    const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/);
    if (linkMatch && linkMatch.index !== undefined) {
      if (linkMatch.index > 0) {
        parts.push(remaining.slice(0, linkMatch.index));
      }
      parts.push(
        <a
          key={`link-${key++}`}
          href={linkMatch[2]}
          className="text-gray-900 underline hover:text-gray-600 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
      continue;
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) {
        parts.push(remaining.slice(0, codeMatch.index));
      }
      parts.push(
        <code
          key={`code-${key++}`}
          className="bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded text-sm font-mono"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }

    // No more matches, add the rest
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
