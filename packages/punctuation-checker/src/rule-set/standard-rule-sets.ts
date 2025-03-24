import { CharacterRegexWhitelist } from '../allowed-character/allowed-character-set';
import { PairedPunctuationConfig } from '../paired-punctuation/paired-punctuation-config';
import { PunctuationContextConfig } from '../punctuation-context/punctuation-context-config';
import { QuotationConfig } from '../quotation/quotation-config';
import { QuotationDepth } from '../quotation/quotation-utils';
import { CharacterClassRegexBuilder, ContextDirection, StringContextMatcher } from '../utils';
import { RuleSet } from './rule-set';

// I have included an "extraneous" class here, instead of exporting the
// RuleSet objects directly, because it seems clearer for classes outside
// this package to import "StandardRuleSets.English" rather than just "English"
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StandardRuleSets {
  public static English = new RuleSet(
    new CharacterRegexWhitelist(
      new CharacterClassRegexBuilder()
        .addRange('A', 'Z')
        .addRange('a', 'z')
        .addRange('0', '9')
        .addCharacters(['.', ',', '?', '/', '\\', ':', ';', '(', ')', '[', ']', '-', '–', '—', '!'])
        .addCharacters(['"', "'", '\u2018', '\u2019', '\u201C', '\u201D', '\u02BC'])
        .addCharacters([' ', '\r', '\n', '\t'])
        .addCharacters(['…'])
        .addCharacters(['\uA78C']) // Temporary additions to handle non-English Latin scripts
        .addRange('\u00C0', '\u00F6')
        .addRange('\u00F8', '\u02AF')
        .addRange('\u1E00', '\u1EFF')

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
          .setRightContext(/(^[ \n,.:;]|^$)/)
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
    new PunctuationContextConfig.Builder()
      .addAcceptableContextCharacters(
        ContextDirection.Right,
        [';', '!', '?'],
        [' ', '\n', '', '\u2019', '\u201D', ')', ']', '—'],
      )
      .addAcceptableContextCharacters(
        ContextDirection.Right,
        [')', ']'],
        [' ', '\n', '', '.', ',', '?', '!', ';', '\u2019', '\u201D', '—'],
      )
      .addAcceptableContextCharacters(
        ContextDirection.Right,
        ['\u201D', '"'],
        [' ', '\n', '', '.', ',', ';', ')', ']', '\u2019', '\u201D', '"', "'", '—'],
      )
      .addAcceptableContextCharacters(
        ContextDirection.Right,
        ["'", '\u2019'],
        [
          ' ',
          '\n',
          '',
          '.',
          ',',
          '?',
          '!',
          ';',
          ')',
          ']',
          '\u2019',
          '\u201D',
          '"',
          "'",
          'd',
          'l',
          'm',
          'r',
          's',
          't',
          'v',
          '—',
        ],
      )
      .addAcceptableContextCharacters(
        ContextDirection.Right,
        ['.', ','],
        [' ', '\n', '', '\u2019', '\u201D', ')', ']', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '—'],
      )
      .addAcceptableContextCharacters(
        ContextDirection.Right,
        [':'],
        [' ', '\n', '', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      )
      .addAcceptableContextCharacters(
        ContextDirection.Left,
        ['(', '[', '\u201C', '\u2018', '"'],
        [' ', '\n', '', '\u201C', '\u2018', '"', "'", '—'],
      )
      .prohibitWhitespaceForCharacters(ContextDirection.Right, ['(', '[', '\u201C', '\u2018'])
      .prohibitWhitespaceForCharacters(ContextDirection.Left, ['.', ',', '?', '!', ';', ':', ')', ']', '\u201D'])
      .build(),
  );
}
