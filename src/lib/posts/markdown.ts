import GithubSlugger from 'github-slugger';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import sanitizeHtml from 'sanitize-html';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

export type MarkdownHeading = {
  depth: number;
  slug: string;
  text: string;
};

export type RenderedMarkdown = {
  html: string;
  headings: MarkdownHeading[];
  plainText: string;
};

function extractNodeText(node: unknown): string {
  if (!node || typeof node !== 'object') {
    return '';
  }

  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }

  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map(extractNodeText).join('');
  }

  return '';
}

function collectHeadings(tree: unknown) {
  const slugger = new GithubSlugger();
  const headings: MarkdownHeading[] = [];

  visit(tree, 'heading', (node) => {
    const text = extractNodeText(node).trim();

    if (!text) {
      return;
    }

    headings.push({
      depth: node.depth,
      slug: slugger.slug(text),
      text,
    });
  });

  return headings;
}

function collectPlainText(tree: unknown) {
  const parts: string[] = [];

  visit(tree, (node) => {
    if (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code') {
      parts.push(node.value);
    }
  });

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function sanitizeRenderedHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: [...(sanitizeHtml.defaults.allowedAttributes.a ?? []), 'id'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      h1: ['id'],
      h2: ['id'],
      h3: ['id'],
      h4: ['id'],
      h5: ['id'],
      h6: ['id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

export async function renderMarkdown(markdown: string): Promise<RenderedMarkdown> {
  const parser = unified().use(remarkParse).use(remarkGfm);
  const tree = parser.parse(markdown);
  const headings = collectHeadings(tree);
  const plainText = collectPlainText(tree);

  const rendered = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(markdown);

  return {
    html: sanitizeRenderedHtml(String(rendered)),
    headings,
    plainText,
  };
}
