export const CAPTION_CHAR_LIMIT = 110;
export const CAPTION_LINE_LIMIT = 3;

export type CaptionView = { text: string; collapsed: boolean };

export const collapseCaption = (
  caption: string,
  charLimit: number = CAPTION_CHAR_LIMIT,
  lineLimit: number = CAPTION_LINE_LIMIT,
): CaptionView => {
  const lines = caption.split("\n");
  const byLines = lines.length > lineLimit ? lines.slice(0, lineLimit).join("\n") : caption;
  const tooManyLines = byLines.length < caption.length;
  if (byLines.length <= charLimit) {
    return { text: tooManyLines ? byLines.trimEnd() : caption, collapsed: tooManyLines };
  }
  const head = byLines.slice(0, charLimit);
  const lastSpace = head.search(/\s\S*$/);
  const cut = lastSpace > charLimit / 2 ? head.slice(0, lastSpace) : head;
  return { text: cut.trimEnd(), collapsed: true };
};
