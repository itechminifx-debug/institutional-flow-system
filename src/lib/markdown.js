// ============================================================
// MARKDOWN RENDERER — lightweight, no dependencies
// ============================================================
// Supports: headers, bold, italic, code, code blocks, lists,
// blockquotes, links, images, horizontal rules, checkboxes.
// Not a full CommonMark parser — just what a trader needs.
// ============================================================

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Render inline Markdown (bold, italic, code, links, images)
 */
function renderInline(text) {
  let out = escapeHtml(text);

  // Images: ![alt](url)
  out = out.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="rounded-lg border border-gray-700 my-2 max-w-full" />'
  );

  // Links: [text](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>'
  );

  // Bold: **text** or __text__
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong class="text-white font-bold">$1</strong>');

  // Italic: *text* or _text_
  out = out.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  out = out.replace(/_([^_]+)_/g, '<em class="italic">$1</em>');

  // Inline code: `code`
  out = out.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-800 text-pink-300 px-1 py-0.5 rounded text-xs font-mono">$1</code>'
  );

  // Strikethrough: ~~text~~
  out = out.replace(/~~([^~]+)~~/g, '<s class="line-through text-gray-500">$1</s>');

  return out;
}

/**
 * Render full Markdown content to HTML
 */
export function renderMarkdown(markdown) {
  if (!markdown) return "";

  const lines = markdown.split("\n");
  const output = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let inList = false;
  let listType = null;

  const flushList = () => {
    if (inList) {
      output.push(listType === "ul" ? "</ul>" : "</ol>");
      inList = false;
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine;

    // Code blocks (``` ... ```)
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        output.push(
          `<pre class="bg-black border border-gray-800 rounded-lg p-3 overflow-x-auto my-3"><code class="text-xs font-mono text-green-300">${escapeHtml(codeBuffer.join("\n"))}</code></pre>`
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Blank line
    if (trimmed === "") {
      flushList();
      continue;
    }

    // Horizontal rule
    if (/^(---+|\*\*\*+|___+)$/.test(trimmed)) {
      flushList();
      output.push('<hr class="border-gray-800 my-4" />');
      continue;
    }

    // Headers
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      flushList();
      const level = headerMatch[1].length;
      const text = renderInline(headerMatch[2]);
      const sizes = {
        1: "text-2xl font-bold text-white mt-6 mb-3",
        2: "text-xl font-bold text-white mt-5 mb-2",
        3: "text-lg font-bold text-white mt-4 mb-2",
        4: "text-base font-bold text-gray-200 mt-3 mb-1",
        5: "text-sm font-bold text-gray-200 mt-2 mb-1",
        6: "text-xs font-bold text-gray-300 mt-2 mb-1",
      };
      output.push(`<h${level} class="${sizes[level]}">${text}</h${level}>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      const text = renderInline(trimmed.slice(2));
      output.push(
        `<blockquote class="border-l-4 border-blue-700 bg-blue-950/20 pl-3 py-2 my-2 italic text-gray-300">${text}</blockquote>`
      );
      continue;
    }

    // Checkbox list: - [ ] or - [x]
    const checkboxMatch = trimmed.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (checkboxMatch) {
      flushList();
      const checked = checkboxMatch[1].toLowerCase() === "x";
      const text = renderInline(checkboxMatch[2]);
      output.push(
        `<div class="flex items-start gap-2 my-1 text-sm"><span class="mt-0.5 ${checked ? "text-green-400" : "text-gray-500"}">${checked ? "☑" : "☐"}</span><span class="${checked ? "line-through text-gray-500" : "text-gray-300"}">${text}</span></div>`
      );
      continue;
    }

    // Unordered list: - * +
    const ulMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        flushList();
        output.push('<ul class="list-disc list-inside space-y-1 my-2 ml-2 text-sm text-gray-300">');
        inList = true;
        listType = "ul";
      }
      output.push(`<li>${renderInline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list: 1. 2. etc.
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        flushList();
        output.push('<ol class="list-decimal list-inside space-y-1 my-2 ml-2 text-sm text-gray-300">');
        inList = true;
        listType = "ol";
      }
      output.push(`<li>${renderInline(olMatch[1])}</li>`);
      continue;
    }

    // Regular paragraph
    flushList();
    output.push(`<p class="text-sm text-gray-300 leading-relaxed my-2">${renderInline(line)}</p>`);
  }

  // Close any open code block
  if (inCodeBlock && codeBuffer.length > 0) {
    output.push(
      `<pre class="bg-black border border-gray-800 rounded-lg p-3 overflow-x-auto my-3"><code class="text-xs font-mono text-green-300">${escapeHtml(codeBuffer.join("\n"))}</code></pre>`
    );
  }
  flushList();

  return output.join("\n");
}

/**
 * Strip Markdown for plain text preview (for list views)
 */
export function stripMarkdown(markdown, maxLength = 160) {
  if (!markdown) return "";

  let text = markdown
    .replace(/```[\s\S]*?```/g, "[code]")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "[image]")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~`#]/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();

  if (text.length > maxLength) {
    text = text.slice(0, maxLength).trim() + "…";
  }
  return text;
}

/**
 * Extract headings from a markdown body (for TOC)
 */
export function extractHeadings(markdown) {
  if (!markdown) return [];
  const headings = [];
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.trim().match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].replace(/[*_`]/g, "").trim(),
        id: match[2].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      });
    }
  }
  return headings;
}