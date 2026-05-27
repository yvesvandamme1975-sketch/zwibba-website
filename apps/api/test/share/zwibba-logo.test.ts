import assert from 'node:assert/strict';
import test from 'node:test';

import { ZWIBBA_LOGO_SVG } from '../../src/share/zwibba-logo.svg';

test('ZWIBBA_LOGO_SVG is a string starting with <svg', () => {
  assert.ok(typeof ZWIBBA_LOGO_SVG === 'string');
  assert.match(ZWIBBA_LOGO_SVG.trimStart(), /^<svg[\s>]/);
});

test('ZWIBBA_LOGO_SVG keeps the green accent on the i dot', () => {
  assert.match(ZWIBBA_LOGO_SVG, /#39a935/i);
});

test('ZWIBBA_LOGO_SVG uses white for the main letters on dark backgrounds', () => {
  assert.match(ZWIBBA_LOGO_SVG, /#ffffff|#fff[^a-f0-9]/i);
});
