import type { GeneratedVisualPlanItem } from './openai-compatible';

export type AppliedInlineIllustration = GeneratedVisualPlanItem & {
  imageUrl: string;
  previewUrl: string;
  creator?: string;
  license?: string;
  sourceUrl?: string;
  providerLabel?: string;
  selectionReason?: string;
};

type HeadingAnchor = {
  lineIndex: number;
  heading: string;
};

function normalizeHeadingText(input: string) {
  return input
    .replace(/[`*_~>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function escapeMarkdownAlt(input: string) {
  return input.replace(/[[\]]/g, '');
}

function buildIllustrationBlock(illustration: AppliedInlineIllustration) {
  const lines = [`![${escapeMarkdownAlt(illustration.alt)}](${illustration.imageUrl})`];

  if (illustration.caption) {
    lines.push('', `> 配图说明：${illustration.caption}`);
  }

  const attributionParts = [
    illustration.creator ? `作者：${illustration.creator}` : '',
    illustration.license ? `许可：${illustration.license}` : '',
    illustration.sourceUrl ? `[查看来源](${illustration.sourceUrl})` : '',
  ].filter(Boolean);

  if (attributionParts.length) {
    lines.push('', `> 图片来源：${attributionParts.join('，')}`);
  }

  return lines.join('\n');
}

function collectHeadingAnchors(lines: string[]) {
  const anchors: HeadingAnchor[] = [];

  lines.forEach((line, index) => {
    const matched = line.match(/^#{2,3}\s+(.+)$/);

    if (!matched) {
      return;
    }

    anchors.push({
      lineIndex: index,
      heading: normalizeHeadingText(matched[1]),
    });
  });

  return anchors;
}

function chooseAnchor(
  illustration: AppliedInlineIllustration,
  anchors: HeadingAnchor[],
  usedAnchors: Set<number>,
) {
  const normalizedHeading = normalizeHeadingText(illustration.heading);
  const exactMatch = anchors.find((anchor) => anchor.heading === normalizedHeading && !usedAnchors.has(anchor.lineIndex));

  if (exactMatch) {
    return exactMatch;
  }

  return anchors.find((anchor) => !usedAnchors.has(anchor.lineIndex)) ?? null;
}

export function injectInlineIllustrations(markdown: string, illustrations: AppliedInlineIllustration[]) {
  if (!illustrations.length) {
    return markdown;
  }

  const lines = markdown.split(/\r?\n/);
  const anchors = collectHeadingAnchors(lines);
  const usedAnchors = new Set<number>();
  const insertions = new Map<number, AppliedInlineIllustration[]>();
  const appendLater: AppliedInlineIllustration[] = [];

  illustrations.forEach((illustration) => {
    const anchor = chooseAnchor(illustration, anchors, usedAnchors);

    if (!anchor) {
      appendLater.push(illustration);
      return;
    }

    usedAnchors.add(anchor.lineIndex);
    const existing = insertions.get(anchor.lineIndex) ?? [];
    existing.push(illustration);
    insertions.set(anchor.lineIndex, existing);
  });

  const result: string[] = [];

  lines.forEach((line, index) => {
    result.push(line);

    const planned = insertions.get(index);

    if (!planned?.length) {
      return;
    }

    planned.forEach((illustration) => {
      result.push('', buildIllustrationBlock(illustration), '');
    });
  });

  if (appendLater.length) {
    appendLater.forEach((illustration) => {
      result.push('', buildIllustrationBlock(illustration), '');
    });
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
