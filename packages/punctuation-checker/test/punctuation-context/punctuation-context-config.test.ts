import { describe, expect, it } from 'vitest';

import { PunctuationContextConfig } from '../../src/punctuation-context/punctuation-context-config';
import { StandardRuleSets } from '../../src/rule-set/standard-rule-sets';
import { CharacterClassRegexBuilder, ContextDirection } from '../../src/utils';

describe('Builder tests', () => {
  it('correctly builds empty WhitespaceConfig objects', () => {
    const emptyContextConfig: PunctuationContextConfig = new PunctuationContextConfig.Builder().build();

    expect(emptyContextConfig.createPunctuationRegex()).toEqual(new CharacterClassRegexBuilder().makeGlobal().build());
  });

  it('correctly builds simple non-empty PunctuationContextConfig objects', () => {
    const leftPunctuationContextConfig: PunctuationContextConfig = new PunctuationContextConfig.Builder()
      .addAcceptableContextCharacters(ContextDirection.Left, ['!'], [' '])
      .build();

    expect(leftPunctuationContextConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacter('!').makeGlobal().build(),
    );
    expect(leftPunctuationContextConfig.isLeadingContextCorrect('!', ' ')).toBe(true);
    expect(leftPunctuationContextConfig.isLeadingContextCorrect('!', 'g')).toBe(false);

    const rightPunctuationContextConfig: PunctuationContextConfig = new PunctuationContextConfig.Builder()
      .addAcceptableContextCharacters(ContextDirection.Right, ['*'], [' '])
      .build();

    expect(rightPunctuationContextConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacter('*').makeGlobal().build(),
    );
    expect(rightPunctuationContextConfig.isTrailingContextCorrect('*', ' ')).toBe(true);
    expect(rightPunctuationContextConfig.isTrailingContextCorrect('*', '!')).toBe(false);

    const leftProhibitedWhitespaceConfig: PunctuationContextConfig = new PunctuationContextConfig.Builder()
      .prohibitWhitespaceForCharacters(ContextDirection.Left, ['*'])
      .build();

    expect(leftProhibitedWhitespaceConfig.isLeadingContextCorrect('*', ' ')).toBe(false);
    expect(leftProhibitedWhitespaceConfig.isLeadingContextCorrect('*', 'a')).toBe(true);

    const rightProhibitedWhitespaceConfig: PunctuationContextConfig = new PunctuationContextConfig.Builder()
      .prohibitWhitespaceForCharacters(ContextDirection.Right, ['$'])
      .build();

    expect(rightProhibitedWhitespaceConfig.isTrailingContextCorrect('$', '\t')).toBe(false);
    expect(rightProhibitedWhitespaceConfig.isTrailingContextCorrect('$', 'm')).toBe(true);
  });

  it('correctly builds complex PunctuationContextConfig with rules for leading and trailing context', () => {
    const punctuationContextConfig: PunctuationContextConfig = new PunctuationContextConfig.Builder()
      .addAcceptableContextCharacters(ContextDirection.Left, ['!', '%', '#'], [' ', '\t'])
      .addAcceptableContextCharacters(ContextDirection.Right, ['!', '%', '@'], ['\n'])
      .build();

    expect(punctuationContextConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['!', '%', '#', '@']).makeGlobal().build(),
    );
    expect(punctuationContextConfig.isLeadingContextCorrect('!', ' ')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('!', '\t')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('!', '\n')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('%', ' ')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('%', '\t')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('%', '\n')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('#', ' ')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('#', '\t')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('#', '\n')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect('!', '\n')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('!', ' ')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect('%', '\n')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('%', ' ')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect('@', '\n')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('@', ' ')).toBe(false);
  });
});

describe('PuncuationContextConfig tests', () => {
  it('produces a regular expression for punctuation with context rules', () => {
    let punctuationContextConfig: PunctuationContextConfig = new PunctuationContextConfig.Builder()
      .addAcceptableContextCharacters(ContextDirection.Left, ['&'], [])
      .build();
    expect(punctuationContextConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['&']).makeGlobal().build(),
    );

    punctuationContextConfig = new PunctuationContextConfig.Builder()
      .addAcceptableContextCharacters(ContextDirection.Right, ['*'], [])
      .build();
    expect(punctuationContextConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['*']).makeGlobal().build(),
    );

    punctuationContextConfig = new PunctuationContextConfig.Builder()
      .addAcceptableContextCharacters(ContextDirection.Left, ['!', '@', '#'], [])
      .build();
    expect(punctuationContextConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['!', '@', '#']).makeGlobal().build(),
    );

    punctuationContextConfig = new PunctuationContextConfig.Builder()
      .addAcceptableContextCharacters(ContextDirection.Right, ['(', '{', '['], [])
      .build();
    expect(punctuationContextConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['(', '{', '[']).makeGlobal().build(),
    );

    punctuationContextConfig = new PunctuationContextConfig.Builder()
      .addAcceptableContextCharacters(ContextDirection.Left, ['%', '#', '$'], [])
      .addAcceptableContextCharacters(ContextDirection.Right, ['@', '<', '?'], [])
      .build();
    expect(punctuationContextConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['%', '#', '$', '@', '<', '?']).makeGlobal().build(),
    );

    punctuationContextConfig = new PunctuationContextConfig.Builder()
      .addAcceptableContextCharacters(ContextDirection.Left, ['!', '!'], [])
      .addAcceptableContextCharacters(ContextDirection.Right, ['!', '!'], [])
      .build();
    expect(punctuationContextConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['!']).makeGlobal().build(),
    );

    punctuationContextConfig = new PunctuationContextConfig.Builder()
      .addAcceptableContextCharacters(ContextDirection.Left, ['!', '@', '#'], [' '])
      .addAcceptableContextCharacters(ContextDirection.Right, ['$', '^', '&'], [' '])
      .prohibitWhitespaceForCharacters(ContextDirection.Left, ['#', '*'])
      .prohibitWhitespaceForCharacters(ContextDirection.Right, ['$', '(', ')'])
      .build();
    expect(punctuationContextConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder()
        .addCharacters(['!', '@', '#', '$', '^', '&', '*', '(', ')'])
        .makeGlobal()
        .build(),
    );
  });

  it('considers characters around punctuation marks with no listed rules to be correct', () => {
    const punctuationContextConfig: PunctuationContextConfig = StandardRuleSets.English._getPunctuationContextConfig();

    expect(punctuationContextConfig.isLeadingContextCorrect('*', ' ')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('*', ' ')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('*', '\t')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('*', '\t')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('*', 'G')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('*', 'G')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('*', '')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('*', '')).toBe(true);
  });

  it('correctly determines whether leading context is correct', () => {
    const punctuationContextConfig: PunctuationContextConfig = StandardRuleSets.English._getPunctuationContextConfig();

    expect(punctuationContextConfig.isLeadingContextCorrect('(', ' ')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('[', ' ')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u201C', ' ')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u2018', ' ')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('"', ' ')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect("'", ' ')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('(', '\n')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u2018', '\n')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u201C', '')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('"', '')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('(', '\u201C')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u201C', '\u201C')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u2018', '\u201C')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('"', '\u201C')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect("'", '\u201C')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u201C', '\u2018')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u2018', '\u2018')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('"', '\u2018')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect("'", '\u2018')).toBe(true);
    expect(punctuationContextConfig.isLeadingContextCorrect('(', '\t')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('[', '\t')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u201C', '\t')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u2018', '\t')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('(', 'M')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('[', 'M')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u201C', 'M')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u2018', 'M')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('(', '[')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('[', '(')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u201C', '(')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u2018', '(')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u201C', '\u201D')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u2018', '\u201D')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('.', ' ')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect(')', ' ')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u201D', ' ')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('.', '\t')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect(')', '\t')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u201D', '\t')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('.', '\t')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect(')', '\u2003')).toBe(false);
    expect(punctuationContextConfig.isLeadingContextCorrect('\u201D', '\u2003')).toBe(false);
  });

  it('correctly determines whether trailing context is correct', () => {
    const punctuationContextConfig: PunctuationContextConfig = StandardRuleSets.English._getPunctuationContextConfig();

    expect(punctuationContextConfig.isTrailingContextCorrect('.', ' ')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect(',', ' ')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('?', ' ')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect(')', ' ')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('\u2019', ' ')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect(':', ' ')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect(':', '\n')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect(';', '\n')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('!', '\n')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect(']', '\n')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('\u201D', '\n')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('.', '')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('\u201D', '')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect(':', '5')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('.', ')')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect(',', ')')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('.', '\u201D')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('"', '\u201D')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('\u201D', "'")).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect(')', '\u201D')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('\u201D', ')')).toBe(true);
    expect(punctuationContextConfig.isTrailingContextCorrect('.', '\t')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect(')', '\t')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect('\u2019', '\t')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect(',', 'a')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect(';', 'a')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect('\u201D', 'a')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect('.', ':')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect(')', '-')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect('(', ' ')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect('\u201C', ' ')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect('(', '\t')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect('\u201C', '\t')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect('(', '\u2003')).toBe(false);
    expect(punctuationContextConfig.isTrailingContextCorrect('\u201C', '\u2003')).toBe(false);
  });

  it('allows prohibited whitespace rules to take precedence over required context rules', () => {
    const prohibitedWhitespaceConfig: PunctuationContextConfig = new PunctuationContextConfig.Builder()
      .addAcceptableContextCharacters(ContextDirection.Left, ['$', '*'], [' '])
      .addAcceptableContextCharacters(ContextDirection.Right, ['#', '@'], [' '])
      .prohibitWhitespaceForCharacters(ContextDirection.Left, ['*'])
      .prohibitWhitespaceForCharacters(ContextDirection.Right, ['@'])
      .build();

    expect(prohibitedWhitespaceConfig.isLeadingContextCorrect('$', ' ')).toBe(true);
    expect(prohibitedWhitespaceConfig.isLeadingContextCorrect('*', ' ')).toBe(false);
    expect(prohibitedWhitespaceConfig.isTrailingContextCorrect('#', ' ')).toBe(true);
    expect(prohibitedWhitespaceConfig.isTrailingContextCorrect('@', ' ')).toBe(false);
  });
});
