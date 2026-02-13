import { describe, expect, it } from 'vitest';

import { arePunctuationMarksConsecutive, CharacterClassRegexBuilder, StringContextMatcher } from '../src/utils';

describe('CharacterClassRegexBuilder tests', () => {
  it('creates basic character classes correctly', () => {
    const singleLetterRegex: RegExp = new CharacterClassRegexBuilder().addCharacter('a').build();
    expect(singleLetterRegex).toEqual(/[a]/u);

    const multiLetterRegex: RegExp = new CharacterClassRegexBuilder()
      .addCharacter('a')
      .addCharacter('b')
      .addCharacter('c')
      .build();
    expect(multiLetterRegex).toEqual(/[abc]/u);
  });

  it('creates ranges correctly', () => {
    const singleRangeRegex: RegExp = new CharacterClassRegexBuilder().addRange('a', 'z').build();
    expect(singleRangeRegex).toEqual(/[a-z]/u);

    const multiRangeRegex: RegExp = new CharacterClassRegexBuilder().addRange('a', 'z').addRange('0', '9').build();
    expect(multiRangeRegex).toEqual(/[a-z0-9]/u);
  });

  it('combined characters and ranges', () => {
    const rangeFirstRegex: RegExp = new CharacterClassRegexBuilder().addRange('a', 'z').addCharacter('T').build();
    expect(rangeFirstRegex).toEqual(/[a-zT]/u);

    const characterFirstRegex: RegExp = new CharacterClassRegexBuilder().addCharacter('T').addRange('a', 'z').build();
    expect(characterFirstRegex).toEqual(/[Ta-z]/u);

    const sandwichedCharacterRegex: RegExp = new CharacterClassRegexBuilder()
      .addRange('a', 'z')
      .addCharacter('T')
      .addRange('0', '9')
      .build();
    expect(sandwichedCharacterRegex).toEqual(/[a-zT0-9]/u);

    const sandwichedRangeRegex: RegExp = new CharacterClassRegexBuilder()
      .addCharacter('T')
      .addRange('a', 'z')
      .addCharacter('S')
      .build();
    expect(sandwichedRangeRegex).toEqual(/[Ta-zS]/u);
  });

  it('escapes special characters', () => {
    const dashRegex: RegExp = new CharacterClassRegexBuilder().addCharacter('-').build();
    // ESLint errors on the escaped dash, but the two regexes are not equal if it is removed
    // eslint-disable-next-line no-useless-escape
    expect(dashRegex).toEqual(/[\-]/u);

    const potentiallyAmbiguousDashRegex: RegExp = new CharacterClassRegexBuilder()
      .addCharacter('a')
      .addCharacter('-')
      .addCharacter('z')
      .build();
    expect(potentiallyAmbiguousDashRegex).toEqual(/[a\-z]/u);

    const closingBracketRegex: RegExp = new CharacterClassRegexBuilder().addCharacter(']').build();
    expect(closingBracketRegex).toEqual(/[\]]/u);

    const variousSpecialCharacterRegex: RegExp = new CharacterClassRegexBuilder()
      .addCharacter('.')
      .addCharacter('?')
      .addCharacter('(')
      .addCharacter(')')
      .addCharacter('-')
      .addCharacter('+')
      .addCharacter('[')
      .addCharacter(']')
      .addCharacter('\\')
      .build();
    expect(variousSpecialCharacterRegex).toEqual(/[.?()\-+[\]\\]/u);
  });

  it('uses the global (g) flag appropriately', () => {
    const globalRegex: RegExp = new CharacterClassRegexBuilder().addCharacter('a').makeGlobal().build();
    expect(globalRegex).toEqual(/[a]/gu);

    const nonGlobalRegex: RegExp = new CharacterClassRegexBuilder().addCharacter('a').build();
    expect(nonGlobalRegex).toEqual(/[a]/u);
  });
});

describe('StringContextMatcher tests', () => {
  it('recognizes strings that match the center pattern', () => {
    const basicMatcher: StringContextMatcher = new StringContextMatcher.Builder().setCenterContent(/g/).build();

    expect(basicMatcher.doesStringMatchIgnoringContext('golf')).toBe(true);
    expect(basicMatcher.doesStringMatchIgnoringContext('ball')).toBe(false);

    const characterClassMatcher: StringContextMatcher = new StringContextMatcher.Builder()
      .setCenterContent(/[gmx]/)
      .build();

    expect(characterClassMatcher.doesStringMatchIgnoringContext('golf')).toBe(true);
    expect(characterClassMatcher.doesStringMatchIgnoringContext('six')).toBe(true);
    expect(characterClassMatcher.doesStringMatchIgnoringContext('ball')).toBe(false);

    const fullStringMatcher: StringContextMatcher = new StringContextMatcher.Builder().setCenterContent(/^f$/).build();

    expect(fullStringMatcher.doesStringMatchIgnoringContext('f')).toBe(true);
    expect(fullStringMatcher.doesStringMatchIgnoringContext('fred')).toBe(false);
  });

  it('recognizes strings along with their left/right context', () => {
    const basicMatcher: StringContextMatcher = new StringContextMatcher.Builder()
      .setCenterContent(/g/)
      .setLeftContext(/c/)
      .setRightContext(/i/)
      .build();

    expect(basicMatcher.doesContextMatch('cat', 'igloo')).toBe(true);
    expect(basicMatcher.doesContextMatch('dog', 'igloo')).toBe(false);
    expect(basicMatcher.doesContextMatch('cat', 'green')).toBe(false);
    expect(basicMatcher.doesStringAndContextMatch('golf', 'cat', 'igloo')).toBe(true);
    expect(basicMatcher.doesStringAndContextMatch('red', 'cat', 'igloo')).toBe(false);
    expect(basicMatcher.doesStringAndContextMatch('golf', 'dog', 'igloo')).toBe(false);
    expect(basicMatcher.doesStringAndContextMatch('golf', 'dog', 'half')).toBe(false);
  });
});

describe('arePunctuationMarksConsecutive tests', () => {
  it('identifies when the second punctuation mark immediately follows the first', () => {
    const enclosingRange = {
      start: {
        line: 1,
        character: 1,
      },
      end: {
        line: 1,
        character: 10,
      },
    };
    expect(
      arePunctuationMarksConsecutive(
        {
          startIndex: 4,
          endIndex: 5,
          enclosingRange: enclosingRange,
          text: '\u201c',
          leftContext: '',
          rightContext: '',
        },
        {
          startIndex: 5,
          endIndex: 6,
          text: '\u201c',
          enclosingRange: enclosingRange,
          leftContext: '',
          rightContext: '',
        },
      ),
    ).toBe(true);

    expect(
      arePunctuationMarksConsecutive(
        {
          startIndex: 5,
          endIndex: 6,
          enclosingRange: enclosingRange,
          text: '\u201c',
          leftContext: '',
          rightContext: '',
        },
        {
          startIndex: 4,
          endIndex: 5,
          text: '\u201c',
          enclosingRange: enclosingRange,
          leftContext: '',
          rightContext: '',
        },
      ),
    ).toBe(false);

    const differentEnclosingRange = {
      start: {
        line: 2,
        character: 1,
      },
      end: {
        line: 5,
        character: 10,
      },
    };
    expect(
      arePunctuationMarksConsecutive(
        {
          startIndex: 4,
          endIndex: 5,
          enclosingRange: enclosingRange,
          text: '\u201c',
          leftContext: '',
          rightContext: '',
        },
        {
          startIndex: 4,
          endIndex: 5,
          text: '\u201c',
          enclosingRange: differentEnclosingRange,
          leftContext: '',
          rightContext: '',
        },
      ),
    ).toBe(false);
  });
});
