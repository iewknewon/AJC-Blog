import type { BlogPost } from '../posts/types';

type WechatExportInput = {
  post: BlogPost;
  html: string;
  siteTitle: string;
  siteUrl: string;
  author?: string;
};

export type WechatExportResult = {
  html: string;
  plainText: string;
  filename: string;
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function collapseWhitespace(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

function stripHtml(input: string) {
  return collapseWhitespace(input.replace(/<[^>]+>/g, ' '));
}

function slugToFilename(slug: string) {
  return `${slug || 'wechat-article'}-wechat.html`;
}

function prependStyleAttribute(tag: string, style: string, attributes = '') {
  const normalizedAttributes = attributes || '';
  const styleMatch = normalizedAttributes.match(/\sstyle="([^"]*)"/i);

  if (!styleMatch) {
    return `<${tag}${normalizedAttributes} style="${style}">`;
  }

  const mergedStyle = `${styleMatch[1].trimEnd()}; ${style}`.replace(/;\s*;/g, ';');

  return `<${tag}${normalizedAttributes.replace(styleMatch[0], ` style="${mergedStyle}"`)}>`;
}

function addStyleToTag(html: string, tag: string, style: string) {
  const pattern = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
  return html.replace(pattern, (_, attributes = '') => prependStyleAttribute(tag, style, attributes));
}

function absolutizeRelativeAttributes(html: string, siteUrl: string, attribute: 'href' | 'src') {
  const pattern = new RegExp(`${attribute}="(\\/[^"]*)"`, 'gi');

  return html.replace(pattern, (_, path) => `${attribute}="${new URL(path, siteUrl).toString()}"`);
}

function stripLeadingTitleHeading(html: string) {
  return html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, '');
}

function styleWechatBody(html: string, siteUrl: string) {
  let content = stripLeadingTitleHeading(html);
  content = absolutizeRelativeAttributes(content, siteUrl, 'href');
  content = absolutizeRelativeAttributes(content, siteUrl, 'src');
  content = addStyleToTag(content, 'p', 'margin: 1.1em 0; color: #1f2329; font-size: 16px; line-height: 1.8;');
  content = addStyleToTag(content, 'h1', 'margin: 1.8em 0 0.8em; font-size: 26px; line-height: 1.35; font-weight: 700; color: #111827;');
  content = addStyleToTag(content, 'h2', 'margin: 1.7em 0 0.75em; padding-left: 0.75em; border-left: 4px solid #16a34a; font-size: 22px; line-height: 1.45; font-weight: 700; color: #111827;');
  content = addStyleToTag(content, 'h3', 'margin: 1.5em 0 0.65em; font-size: 18px; line-height: 1.55; font-weight: 700; color: #111827;');
  content = addStyleToTag(content, 'blockquote', 'margin: 1.25em 0; padding: 0.9em 1em; border-left: 4px solid #86efac; background: #f0fdf4; color: #14532d;');
  content = addStyleToTag(content, 'ul', 'margin: 1em 0; padding-left: 1.4em; color: #1f2329;');
  content = addStyleToTag(content, 'ol', 'margin: 1em 0; padding-left: 1.4em; color: #1f2329;');
  content = addStyleToTag(content, 'li', 'margin: 0.45em 0; line-height: 1.8;');
  content = addStyleToTag(content, 'pre', 'margin: 1.2em 0; padding: 1em; border-radius: 12px; background: #0f172a; color: #f8fafc; overflow-x: auto; font-size: 14px; line-height: 1.7;');
  content = addStyleToTag(content, 'code', 'padding: 0.12em 0.35em; border-radius: 6px; background: #f3f4f6; color: #be123c; font-size: 0.92em;');
  content = content.replace(/<pre([^>]*)><code([^>]*)>/gi, '<pre$1><code$2 style="padding: 0; background: transparent; color: inherit; border-radius: 0;">');
  content = addStyleToTag(content, 'a', 'color: #2563eb; text-decoration: underline; word-break: break-word;');
  content = addStyleToTag(content, 'img', 'display: block; width: 100%; max-width: 100%; height: auto; margin: 1.4em auto; border-radius: 14px;');
  content = addStyleToTag(content, 'hr', 'margin: 2em 0; border: 0; border-top: 1px solid #d1d5db;');
  content = addStyleToTag(content, 'table', 'width: 100%; margin: 1.2em 0; border-collapse: collapse; font-size: 14px;');
  content = addStyleToTag(content, 'th', 'padding: 0.7em; border: 1px solid #d1d5db; background: #f8fafc; text-align: left;');
  content = addStyleToTag(content, 'td', 'padding: 0.7em; border: 1px solid #d1d5db; text-align: left;');

  return content;
}

function buildMetadataLine(post: BlogPost, author?: string) {
  const parts = [
    author ? `作者：${author}` : '',
    post.updatedAt ? `更新：${post.updatedAt.toISOString().slice(0, 10)}` : '',
    post.tags.length ? `标签：${post.tags.join(' / ')}` : '',
  ].filter(Boolean);

  return parts.join(' ｜ ');
}

export function buildWechatExport(input: WechatExportInput): WechatExportResult {
  const metadataLine = buildMetadataLine(input.post, input.author);
  const canonicalUrl = new URL(`/blog/${input.post.slug}/`, input.siteUrl).toString();
  const bodyHtml = styleWechatBody(input.html, input.siteUrl);
  const html = `
<section style="max-width: 720px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; color: #1f2329; background: #ffffff;">
  <header style="margin-bottom: 28px;">
    <div style="display: inline-block; padding: 4px 10px; border-radius: 999px; background: #ecfdf5; color: #166534; font-size: 12px; letter-spacing: 0.08em;">${escapeHtml(input.siteTitle)}</div>
    <h1 style="margin: 16px 0 12px; font-size: 30px; line-height: 1.32; font-weight: 800; color: #111827;">${escapeHtml(input.post.title)}</h1>
    <p style="margin: 0 0 14px; color: #4b5563; font-size: 16px; line-height: 1.8;">${escapeHtml(input.post.description)}</p>
    ${metadataLine ? `<p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.7;">${escapeHtml(metadataLine)}</p>` : ''}
    ${input.post.cover ? `<p style="margin: 22px 0 0;"><img src="${escapeHtml(input.post.cover)}" alt="${escapeHtml(input.post.title)} 封面图" style="display: block; width: 100%; max-width: 100%; height: auto; border-radius: 18px;" /></p>` : ''}
  </header>
  <article>
    ${bodyHtml}
  </article>
  <footer style="margin-top: 36px; padding-top: 18px; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px; line-height: 1.8;">本文整理自 ${escapeHtml(input.siteTitle)}，如需回看原始排版，可访问原文链接。</p>
    <p style="margin: 0;"><a href="${escapeHtml(canonicalUrl)}" style="color: #2563eb; text-decoration: underline; word-break: break-word;">${escapeHtml(canonicalUrl)}</a></p>
  </footer>
</section>`.trim();

  const plainText = [
    input.post.title,
    input.post.description,
    stripHtml(bodyHtml),
    `原文链接：${canonicalUrl}`,
  ].filter(Boolean).join('\n\n');

  return {
    html,
    plainText,
    filename: slugToFilename(input.post.slug),
  };
}
