import { describe, expect, it } from 'vitest';

import { CharacterClassRegexBuilder, ContextDirection } from '../../src/utils';
import { WhitespaceConfig } from '../../src/whitespace/whitespace-config';

describe('Builder tests', () => {
  it('correctly builds empty WhitespaceConfig objects', () => {
    const emptyWhitespaceConfig: WhitespaceConfig = new WhitespaceConfig.Builder().build();

    expect(emptyWhitespaceConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().makeGlobal().build(),
    );
  });

  it('correctly builds simple non-empty WhitespaceConfig objects', () => {
    const leftWhitespaceConfig: WhitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(ContextDirection.Left, ['!'], [' '])
      .build();

    expect(leftWhitespaceConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacter('!').makeGlobal().build(),
    );
    expect(leftWhitespaceConfig.isLeadingWhitespaceCorrect('!', ' ')).toBe(true);
    expect(leftWhitespaceConfig.isLeadingWhitespaceCorrect('!', 'g')).toBe(false);

    const rightWhitespaceConfig: WhitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(ContextDirection.Right, ['*'], [' '])
      .build();

    expect(rightWhitespaceConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacter('*').makeGlobal().build(),
    );
    expect(rightWhitespaceConfig.isTrailingWhitespaceCorrect('*', ' ')).toBe(true);
    expect(rightWhitespaceConfig.isTrailingWhitespaceCorrect('*', '!')).toBe(false);

    const leftProhibitedWhitespaceConfig: WhitespaceConfig = new WhitespaceConfig.Builder()
      .addProhibitedWhitespaceRule(ContextDirection.Left, ['*'])
      .build();

    expect(leftProhibitedWhitespaceConfig.isLeadingWhitespaceCorrect('*', ' ')).toBe(false);
    expect(leftProhibitedWhitespaceConfig.isLeadingWhitespaceCorrect('*', 'a')).toBe(true);

    const rightProhibitedWhitespaceConfig: WhitespaceConfig = new WhitespaceConfig.Builder()
      .addProhibitedWhitespaceRule(ContextDirection.Right, ['$'])
      .build();

    expect(rightProhibitedWhitespaceConfig.isTrailingWhitespaceCorrect('$', '\t')).toBe(false);
    expect(rightProhibitedWhitespaceConfig.isTrailingWhitespaceCorrect('$', 'm')).toBe(true);
  });

  it('correctly builds complex WhitespaceConfig with rules for leading and trailing whitespace', () => {
    const whitespaceConfig: WhitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(ContextDirection.Left, ['!', '%', '#'], [' ', '\t'])
      .addRequiredWhitespaceRule(ContextDirection.Right, ['!', '%', '@'], ['\n'])
      .build();

    expect(whitespaceConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['!', '%', '#', '@']).makeGlobal().build(),
    );
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('!', ' ')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('!', '\t')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('!', '\n')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('%', ' ')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('%', '\t')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('%', '\n')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('#', ' ')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('#', '\t')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('#', '\n')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('!', '\n')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('!', ' ')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('%', '\n')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('%', ' ')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('@', '\n')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('@', ' ')).toBe(false);
  });
});

describe('Whitespace config tests', () => {
  it('produces a regular expression for punctuation with whitespace rules', () => {
    let whitespaceConfig: WhitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(ContextDirection.Left, ['&'], [])
      .build();
    expect(whitespaceConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['&']).makeGlobal().build(),
    );

    whitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(ContextDirection.Right, ['*'], [])
      .build();
    expect(whitespaceConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['*']).makeGlobal().build(),
    );

    whitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(ContextDirection.Left, ['!', '@', '#'], [])
      .build();
    expect(whitespaceConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['!', '@', '#']).makeGlobal().build(),
    );

    whitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(ContextDirection.Right, ['(', '{', '['], [])
      .build();
    expect(whitespaceConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['(', '{', '[']).makeGlobal().build(),
    );

    whitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(ContextDirection.Left, ['%', '#', '$'], [])
      .addRequiredWhitespaceRule(ContextDirection.Right, ['@', '<', '?'], [])
      .build();
    expect(whitespaceConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['%', '#', '$', '@', '<', '?']).makeGlobal().build(),
    );

    whitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(ContextDirection.Left, ['!', '!'], [])
      .addRequiredWhitespaceRule(ContextDirection.Right, ['!', '!'], [])
      .build();
    expect(whitespaceConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder().addCharacters(['!']).makeGlobal().build(),
    );

    whitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(ContextDirection.Left, ['!', '@', '#'], [' '])
      .addRequiredWhitespaceRule(ContextDirection.Right, ['$', '^', '&'], [' '])
      .addProhibitedWhitespaceRule(ContextDirection.Left, ['#', '*'])
      .addProhibitedWhitespaceRule(ContextDirection.Right, ['$', '(', ')'])
      .build();
    expect(whitespaceConfig.createPunctuationRegex()).toEqual(
      new CharacterClassRegexBuilder()
        .addCharacters(['!', '@', '#', '$', '^', '&', '*', '(', ')'])
        .makeGlobal()
        .build(),
    );
  });

  it('considers whitespace around punctuation marks with no listed rules to be correct', () => {
    const whitespaceConfig: WhitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(
        ContextDirection.Right,
        ['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'],
        [' ', '\n'],
      )
      .addRequiredWhitespaceRule(ContextDirection.Left, ['(', '[', '\u201C', '\u2018'], [' ', '\n'])
      .addProhibitedWhitespaceRule(ContextDirection.Right, ['(', '[', '\u201C', '\u2018'])
      .addProhibitedWhitespaceRule(ContextDirection.Left, ['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'])
      .build();

    expect(whitespaceConfig.isLeadingWhitespaceCorrect('*', ' ')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('*', ' ')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('*', '\t')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('*', '\t')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('*', 'G')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('*', 'G')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('*', '')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('*', '')).toBe(true);
  });

  it('correctly determines whether leading whitespace is correct', () => {
    const whitespaceConfig: WhitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(
        ContextDirection.Right,
        ['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'],
        [' ', '\n'],
      )
      .addRequiredWhitespaceRule(ContextDirection.Left, ['(', '[', '\u201C', '\u2018'], [' ', '\n'])
      .addProhibitedWhitespaceRule(ContextDirection.Right, ['(', '[', '\u201C', '\u2018'])
      .addProhibitedWhitespaceRule(ContextDirection.Left, ['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'])
      .build();

    expect(whitespaceConfig.isLeadingWhitespaceCorrect('(', ' ')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('[', ' ')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u201C', ' ')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u2018', ' ')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('(', '\n')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('[', '\n')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u201C', '\n')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u2018', '\n')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('(', '\t')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('[', '\t')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u201C', '\t')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u2018', '\t')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('(', 'M')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('[', 'M')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u201C', 'M')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u2018', 'M')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('(', '[')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('[', '(')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u201C', '(')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u2018', '(')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('(', '')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('[', '')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u201C', '')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u2018', '')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('.', ' ')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect(')', ' ')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u201D', ' ')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('.', '\t')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect(')', '\t')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u201D', '\t')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('.', '\t')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect(')', '\u2003')).toBe(false);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('\u201D', '\u2003')).toBe(false);
  });

  it('correctly determines whether trailing whitespace is correct', () => {
    const whitespaceConfig: WhitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(
        ContextDirection.Right,
        ['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'],
        [' ', '\n'],
      )
      .addRequiredWhitespaceRule(ContextDirection.Left, ['(', '[', '\u201C', '\u2018'], [' ', '\n'])
      .addProhibitedWhitespaceRule(ContextDirection.Right, ['(', '[', '\u201C', '\u2018'])
      .addProhibitedWhitespaceRule(ContextDirection.Left, ['.', ',', ':', ';', '!', '?', ')', ']', '\u201D', '\u2019'])
      .build();

    expect(whitespaceConfig.isTrailingWhitespaceCorrect('.', ' ')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect(',', ' ')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('?', ' ')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect(')', ' ')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('\u2019', ' ')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect(':', '\n')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect(';', '\n')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('!', '\n')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect(']', '\n')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('\u201D', '\n')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('.', '\t')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect(')', '\t')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('\u2019', '\t')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect(',', 'a')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect(';', 'a')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('\u201D', 'a')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('.', ':')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect(',', ')')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect(')', '-')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('.', '')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('\u201D', '')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('(', ' ')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('\u201C', ' ')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('(', '\t')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('\u201C', '\t')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('(', '\u2003')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('\u201C', '\u2003')).toBe(false);
  });

  it('allows prohibited whitespace rules to take precedence over required whitespace rules', () => {
    const whitespaceConfig: WhitespaceConfig = new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(ContextDirection.Left, ['$', '*'], [' '])
      .addRequiredWhitespaceRule(ContextDirection.Right, ['#', '@'], [' '])
      .addProhibitedWhitespaceRule(ContextDirection.Left, ['*'])
      .addProhibitedWhitespaceRule(ContextDirection.Right, ['@'])
      .build();

    expect(whitespaceConfig.isLeadingWhitespaceCorrect('$', ' ')).toBe(true);
    expect(whitespaceConfig.isLeadingWhitespaceCorrect('*', ' ')).toBe(false);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('#', ' ')).toBe(true);
    expect(whitespaceConfig.isTrailingWhitespaceCorrect('@', ' ')).toBe(false);
  });
});
