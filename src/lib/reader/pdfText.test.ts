// PDF.js emits one text span per printed line. These fixtures pin the reader
// copy contract before the viewport turns a DOM range into assistance text.

import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyPdfLineBreaks, type PdfLine } from './pdfText.js';

const line = (text: string, top: number, left = 24): PdfLine => ({
  text,
  top,
  left,
  right: left + 210,
  em: 14,
  firstWordWidth: 28
});

test('PDF copy classifies ordinary wraps, CJK runs, and lowercase hyphen continuations', () => {
  assert.deepEqual(
    classifyPdfLineBreaks([line('A reader turns finite words', 20), line('into reusable models.', 36)]),
    ['space']
  );
  assert.deepEqual(classifyPdfLineBreaks([line('知识的迁移', 20), line('来自阅读。', 36)]), ['join']);
  assert.deepEqual(classifyPdfLineBreaks([line('trans-', 20), line('formation matters.', 36)]), [
    'dehyphenate'
  ]);
});

test('PDF copy preserves geometry-detected paragraph boundaries and raw-line fallbacks', () => {
  assert.deepEqual(
    classifyPdfLineBreaks([
      line('The first paragraph keeps', 20),
      line('its ordinary wrap.', 36),
      line('The next paragraph starts after a visible gap.', 78)
    ]),
    ['space', 'paragraph']
  );
  assert.deepEqual(
    classifyPdfLineBreaks([
      { text: 'first printed line', left: 0, right: 0, top: 0, em: 0, firstWordWidth: 0 },
      { text: 'second printed line', left: 0, right: 0, top: 0, em: 0, firstWordWidth: 0 }
    ]),
    ['paragraph']
  );
});
