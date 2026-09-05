/** Decode complete TXT bytes before parsing so chapter offsets refer to displayed text. */
export const decodePlainText = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder().decode(bytes);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // ponytail: unmarked legacy encodings are ambiguous. GB18030 covers the
    // Chinese TXT baseline; add an explicit encoding picker for other corpora.
    return new TextDecoder('gb18030').decode(bytes);
  }
};

const number = '[ 　零〇一二三四五六七八九十0-9][ 　零〇一二三四五六七八九十百千万0-9]*';
// Chapter units accept attached titles. Measure-word units require a separator:
// 第一封 信件 is a heading, while 第一封信 is ordinary prose.
const chineseHeading = new RegExp(`^第${number}(?:[章节回讲篇话][：:、 　()0-9]*[^\\n-]{0,36}|[卷本册部封](?:[：:、 　()][：:、 　()0-9]*[^\\n-]{0,36})?)$`, 'u');
const prefaceHeading = /^(?:楔子|前言|简介|引言|序言|序章|总论|概论|后记|番外篇|番外|外传)(?:[：: 　]+[^\n-]{0,36})?$/u;
const englishHeading = /^(?:(?:chapter|part|section|book|volume|act)[ .]*(?:\d+|[IVXLCDM]+)(?=$|[\s:.,\-–—])|(?:prologue|epilogue|introduction|foreword|preface|afterword)(?=$|[\s:.,\-–—]))[^\n]{0,50}$/iu;
const chineseFallbackHeading = /^(?:[一二三四五六七八九十][零〇一二三四五六七八九十百千万]?[：:、 　][^\n-]{0,36}|\d+(?:[：:、. 　][^\n]{0,16})?)$/u;
const englishFallbackHeading = /^(?:\d+\.\d+(?:\.\d+)* ?[A-Z][^\n]{0,80}|\d+[A-Z][^\n]{0,80})$/u;

/** Return source offsets only: all preamble, whitespace and scene breaks stay intact. */
export const parsePlainTextChapters = (text: string): Array<{ label: string; start: number }> => {
  const headings: Array<{ label: string; start: number }> = [];
  const fallback: typeof headings = [];
  const fallbackHeading = /\p{Script=Han}/u.test(text) ? chineseFallbackHeading : englishFallbackHeading;
  let inCode = false;
  for (const match of text.matchAll(/[^\r\n]+|\r\n|\r|\n/g)) {
    const label = match[0].trim();
    // Match the existing TXT code renderer's triple-backtick fence boundary.
    if (/^```([A-Za-z0-9_-]+)?\s*$/.test(match[0])) {
      inCode = !inCode;
      continue;
    }
    if (inCode || !label) continue;
    const heading = { label, start: match.index! };
    if (chineseHeading.test(label) || prefaceHeading.test(label) || englishHeading.test(label)) {
      headings.push(heading);
    } else if (!/^\d{4}\s*(?:年|[./-]\s*\d{1,2})/u.test(label) && fallbackHeading.test(label)) {
      fallback.push(heading);
    }
  }
  // Like the upstream fallback chain, numbered lines are used only if explicit
  // headings are absent. Dividers never create a new chapter.
  return headings.length ? headings : fallback;
};
