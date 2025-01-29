import { CharacterRegexWhitelist } from '../allowed-character/allowed-character-set';
import { PairedPunctuationConfig } from '../paired-punctuation/paired-punctuation-config';
import { QuotationConfig } from '../quotation/quotation-config';
import { QuotationDepth } from '../quotation/quotation-utils';
import { CharacterClassRegexBuilder, ContextDirection, StringContextMatcher } from '../utils';
import { WhitespaceConfig } from '../whitespace/whitespace-config';
import { RuleSet } from './rule-set';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StandardRuleSets {
  public static English = new RuleSet(
    new CharacterRegexWhitelist(
      new CharacterClassRegexBuilder()
        .addRange('A', 'Z')
        .addRange('a', 'z')
        .addRange('0', '9')
        .addCharacters(['.', ',', '?', '/', '\\', ':', ';', '(', ')', '-', '—', '!'])
        .addCharacters(['"', "'", '\u2018', '\u2019', '\u201C', '\u201D'])
        .addCharacters([' ', '\r', '\n', '\t'])
        .build(),
    ),
    new QuotationConfig.Builder()
      .setTopLevelQuotationMarks({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u2018',
        closingPunctuationMark: '\u2019',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .addNestedQuotationMarks({
        openingPunctuationMark: '\u2018',
        closingPunctuationMark: '\u2019',
      })
      .mapAmbiguousQuotationMark('"', '\u201C')
      .mapAmbiguousQuotationMark('"', '\u201D')
      .mapAmbiguousQuotationMark("'", '\u2018')
      .mapAmbiguousQuotationMark("'", '\u2019')
      .ignoreMatchingQuotationMarks(
        // possessives and contractions
        new StringContextMatcher.Builder()
          .setCenterContent(/^['\u2019]$/)
          .setLeftContext(/\w$/)
          .setRightContext(/^\w/)
          .build(),
      )
      .ignoreMatchingQuotationMarks(
        // for possessives ending in "s", e.g. "Moses'"
        new StringContextMatcher.Builder()
          .setCenterContent(/^['\u2019]$/)
          .setLeftContext(/\ws$/)
          .setRightContext(/^[ \n,.:;]/)
          .build(),
      )
      .setNestingWarningDepth(QuotationDepth.fromNumber(4))
      .disallowContinuers()
      .build(),
    new PairedPunctuationConfig.Builder()
      .addQuotationRule({
        openingPunctuationMark: '\u201C',
        closingPunctuationMark: '\u201D',
      })
      .addQuotationRule({
        openingPunctuationMark: '\u2018',
        closingPunctuationMark: '\u2019',
      })
      .addRule({
        openingPunctuationMark: '(',
        closingPunctuationMark: ')',
      })
      .addRule({
        openingPunctuationMark: '[',
        closingPunctuationMark: ']',
      })
      .addRule({
        openingPunctuationMark: '{',
        closingPunctuationMark: '}',
      })
      .build(),
    new WhitespaceConfig.Builder()
      .addRequiredWhitespaceRule(
        ContextDirection.Right,
        ['.', ',', ';', '!', '?'],
        [' ', '\n', '', '\u2019', '\u201D', ')', ']'],
      )
      .addRequiredWhitespaceRule(ContextDirection.Right, [')', ']'], [' ', '\n', '', '\u2019', '\u201D'])
      .addRequiredWhitespaceRule(
        ContextDirection.Right,
        ['\u201D', '"'],
        [' ', '\n', '', '.', ',', '\u2019', '\u201D', '"', "'"],
      )
      .addRequiredWhitespaceRule(
        ContextDirection.Right,
        ["'", '\u2019'],
        [' ', '\n', '', '.', ',', '\u2019', '\u201D', '"', "'", 't', 's'],
      )
      .addRequiredWhitespaceRule(
        ContextDirection.Right,
        [':'],
        [' ', '\n', '', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      )
      .addRequiredWhitespaceRule(
        ContextDirection.Left,
        ['(', '[', '\u201C', '\u2018', '"'],
        [' ', '\n', '', '\u201C', '\u2018', '"', "'"],
      )
      .addProhibitedWhitespaceRule(ContextDirection.Right, ['(', '[', '\u201C', '\u2018'])
      .addProhibitedWhitespaceRule(ContextDirection.Left, ['.', ',', ':', ';', '!', '?', ')', ']', '\u201D'])
      .build(),
  );
}
