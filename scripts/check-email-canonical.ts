/**
 * Sanity-check canonicalEmail against the addresses the signup abuse actually
 * used, plus the cases where collapsing would be wrong.
 */

import { canonicalEmail, sameInbox } from '../lib/email-canonical';

type Case = { input: string; expect: string; why: string };

const CASES: Case[] = [
  // Real addresses taken from the bot rows in the ozsystems leads table.
  {
    input: 'm.at.ec.k.enr.o.th14.01@gmail.com',
    expect: 'mateckenroth1401@gmail.com',
    why: 'gmail dots stripped',
  },
  {
    input: 'd.ave81.30.5.m.i.a@gmail.com',
    expect: 'dave81305mia@gmail.com',
    why: 'gmail dots stripped',
  },
  {
    input: 'dai.sy.u.r.i.b.e96@gmail.com',
    expect: 'daisyuribe96@gmail.com',
    why: 'gmail dots stripped',
  },
  // Tag and casing handling.
  { input: 'Foo.Bar+promo@Gmail.com', expect: 'foobar@gmail.com', why: 'case, dots and +tag' },
  { input: 'foo@googlemail.com', expect: 'foo@gmail.com', why: 'googlemail is gmail' },
  // Non-gmail must be left alone — dots and tags can be distinct mailboxes.
  {
    input: 'martin.hesselbach@krick.com',
    expect: 'martin.hesselbach@krick.com',
    why: 'non-gmail untouched',
  },
  { input: 'a.b+tag@outlook.com', expect: 'a.b+tag@outlook.com', why: 'non-gmail untouched' },
  { input: 'victoryjustin91@yahoo.com', expect: 'victoryjustin91@yahoo.com', why: 'non-gmail untouched' },
  // Degenerate input must not produce an empty local part.
  { input: '...@gmail.com', expect: '...@gmail.com', why: 'all-dots local part kept as-is' },
  { input: 'not-an-email', expect: 'not-an-email', why: 'no @ returned unchanged' },
  { input: 'trailing@', expect: 'trailing@', why: 'empty domain returned unchanged' },
  { input: '  Mixed.Case@GMAIL.COM  ', expect: 'mixedcase@gmail.com', why: 'trimmed and lowercased' },
];

let failures = 0;

for (const c of CASES) {
  const actual = canonicalEmail(c.input);
  const ok = actual === c.expect;
  if (!ok) failures++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${c.input}`);
  console.log(`      -> ${actual}${ok ? '' : `   (expected ${c.expect})`}   [${c.why}]`);
}

// The property that matters for dedup.
const pairs: Array<[string, string, boolean]> = [
  ['d.ave81.30.5.m.i.a@gmail.com', 'dave81305mia@gmail.com', true],
  ['foo.bar@gmail.com', 'foo.b.ar+x@gmail.com', true],
  ['a.b@outlook.com', 'ab@outlook.com', false],
  ['someone@gmail.com', 'someoneelse@gmail.com', false],
];

console.log('\nsameInbox:');
for (const [a, b, expected] of pairs) {
  const actual = sameInbox(a, b);
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${a}  vs  ${b}  -> ${actual}`);
}

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} FAILURES`}`);
process.exit(failures === 0 ? 0 : 1);
