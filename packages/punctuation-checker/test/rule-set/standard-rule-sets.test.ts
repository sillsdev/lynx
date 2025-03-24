import {
  DiagnosticProvider,
  DiagnosticSeverity,
  DocumentManager,
  Localizer,
  OnTypeFormattingProvider,
  TextDocument,
  TextDocumentFactory,
  TextEditFactory,
} from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { QuotationDepth } from '../../src/quotation/quotation-utils';
import { RuleType } from '../../src/rule-set/rule-set';
import { StandardRuleSets } from '../../src/rule-set/standard-rule-sets';
import { PairedPunctuationDirection } from '../../src/utils';
import { StubTextDocumentManager } from '../test-utils';

describe('Standard English rule set tests', () => {
  describe('Allowed character checking tests', () => {
    const standardEnglishRuleSet = StandardRuleSets.English;
    const allowedCharacterSet = standardEnglishRuleSet._getAllowedCharacterSet();

    it('rejects the empty string', () => {
      expect(allowedCharacterSet.isCharacterAllowed('')).toBe(false);
    });

    it('rejects multi-character strings', () => {
      expect(allowedCharacterSet.isCharacterAllowed('ab')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('. ')).toBe(false);
    });

    it('accepts standard English characters', () => {
      expect(allowedCharacterSet.isCharacterAllowed('a')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('t')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('z')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('A')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('F')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('Z')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('?')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed(';')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('(')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('\u201C')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('\u2019')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed(' ')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('\r')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('\t')).toBe(true);
      expect(allowedCharacterSet.isCharacterAllowed('\n')).toBe(true);
    });

    it('rejects non-standard (in the Bible translation setting) English characters', () => {
      expect(allowedCharacterSet.isCharacterAllowed('{')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('%')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('`')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('@')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('_')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('\u201F')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('\u00A0')).toBe(false);
      expect(allowedCharacterSet.isCharacterAllowed('🙓')).toBe(false);
    });
  });

  describe('Quotation checking', () => {
    const standardEnglishRuleSet = StandardRuleSets.English;
    const quotationConfig = standardEnglishRuleSet._getQuotationConfig();

    it('specifies the standard (US) English quotation marks at the standard depths', () => {
      expect(quotationConfig.createAllQuotesRegex().test('\u201C')).toBe(true);
      expect(quotationConfig.createAllQuotesRegex().test('\u201D')).toBe(true);
      expect(quotationConfig.createAllQuotesRegex().test('\u2018')).toBe(true);
      expect(quotationConfig.createAllQuotesRegex().test('\u2019')).toBe(true);
      expect(quotationConfig.createAllQuotesRegex().test('"')).toBe(true);
      expect(quotationConfig.createAllQuotesRegex().test("'")).toBe(true);
      expect(quotationConfig.createAllQuotesRegex().test('')).toBe(false);

      // alternative quotation marks (or things that can be confused with it)
      expect(quotationConfig.createAllQuotesRegex().test('\u0060')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u00AB')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u00BB')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u02BB')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u02BC')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u02BD')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u030B')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u030E')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u05F4')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u066C')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u201E')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u201F')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u201A')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u201B')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u2032')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u2033')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u2035')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u2036')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u2039')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u203A')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u226A')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u226B')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u2329')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u223A')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u275B')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u275C')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u275D')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u275E')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u275F')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u2760')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u2E42')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u3008')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u3009')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u300A')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u300B')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u301D')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u301E')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u301F')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u{1F676}')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u{1F677}')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u{1F678}')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\u{E0022}')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\uFF02')).toBe(false); // full-width variants
      expect(quotationConfig.createAllQuotesRegex().test('\uFF07')).toBe(false);
      expect(quotationConfig.createAllQuotesRegex().test('\uFF40')).toBe(false);

      expect(quotationConfig.getPossibleQuoteDepths('\u201C')).toEqual([
        QuotationDepth.Primary,
        QuotationDepth.Tertiary,
      ]);
      expect(quotationConfig.getPossibleQuoteDepths('\u201D')).toEqual([
        QuotationDepth.Primary,
        QuotationDepth.Tertiary,
      ]);
      expect(quotationConfig.getPossibleQuoteDepths('\u2018')).toEqual([
        QuotationDepth.Secondary,
        QuotationDepth.fromNumber(4),
      ]);
      expect(quotationConfig.getPossibleQuoteDepths('\u2019')).toEqual([
        QuotationDepth.Secondary,
        QuotationDepth.fromNumber(4),
      ]);
      expect(quotationConfig.getPossibleQuoteDepths('"')).toEqual([QuotationDepth.Primary, QuotationDepth.Tertiary]);
      expect(quotationConfig.getPossibleQuoteDepths("'")).toEqual([
        QuotationDepth.Secondary,
        QuotationDepth.fromNumber(4),
      ]);
      expect(quotationConfig.getPossibleQuoteDepths('\u201E')).toEqual([]);

      expect(quotationConfig.getPossibleQuoteDirections('\u201C')).toEqual([PairedPunctuationDirection.Opening]);
      expect(quotationConfig.getPossibleQuoteDirections('\u201D')).toEqual([PairedPunctuationDirection.Closing]);
      expect(quotationConfig.getPossibleQuoteDirections('\u2018')).toEqual([PairedPunctuationDirection.Opening]);
      expect(quotationConfig.getPossibleQuoteDirections('\u2019')).toEqual([PairedPunctuationDirection.Closing]);
      expect(quotationConfig.getPossibleQuoteDirections('"')).toEqual([
        PairedPunctuationDirection.Opening,
        PairedPunctuationDirection.Closing,
      ]);
      expect(quotationConfig.getPossibleQuoteDirections('"')).toEqual([
        PairedPunctuationDirection.Opening,
        PairedPunctuationDirection.Closing,
      ]);
      expect(quotationConfig.getPossibleQuoteDirections('\u201E')).toEqual([]);

      expect(quotationConfig.isQuoteAutocorrectable("'")).toBe(true);
      expect(quotationConfig.isQuoteAutocorrectable('"')).toBe(true);
      expect(quotationConfig.isQuoteAutocorrectable('\u201C')).toBe(false);
      expect(quotationConfig.isQuoteAutocorrectable('\u201D')).toBe(false);
      expect(quotationConfig.isQuoteAutocorrectable('\u2018')).toBe(false);
      expect(quotationConfig.isQuoteAutocorrectable('\u2019')).toBe(false);
      expect(quotationConfig.isQuoteAutocorrectable('\u201E')).toBe(false);
    });

    it('skips over apostrophes', () => {
      expect(quotationConfig.isQuotationMarkPotentiallyIgnoreable("'")).toBe(true);
      expect(quotationConfig.isQuotationMarkPotentiallyIgnoreable('\u2019')).toBe(true);
      expect(quotationConfig.isQuotationMarkPotentiallyIgnoreable('\u2018')).toBe(false);
      expect(quotationConfig.isQuotationMarkPotentiallyIgnoreable('"')).toBe(false);
      expect(quotationConfig.isQuotationMarkPotentiallyIgnoreable('\u201D')).toBe(false);
      expect(quotationConfig.isQuotationMarkPotentiallyIgnoreable('\u201C')).toBe(false);
      expect(quotationConfig.isQuotationMarkPotentiallyIgnoreable('\u201E')).toBe(false);

      // basic possessives
      expect(quotationConfig.shouldIgnoreQuotationMark("'", 'raham', 's ser')).toBe(true);
      expect(quotationConfig.shouldIgnoreQuotationMark('\u2019', 'raham', 's ser')).toBe(true);
      expect(quotationConfig.shouldIgnoreQuotationMark('\u201D', 'raham', 's ser')).toBe(false);
      expect(quotationConfig.shouldIgnoreQuotationMark('"', 'raham', 's ser')).toBe(false);
      expect(quotationConfig.shouldIgnoreQuotationMark("'", 'aham ', 's ser')).toBe(false);
      expect(quotationConfig.shouldIgnoreQuotationMark("'", 'raham', ' s se')).toBe(false);

      // s possessives
      expect(quotationConfig.shouldIgnoreQuotationMark("'", ' sons', ' wive')).toBe(true);
      expect(quotationConfig.shouldIgnoreQuotationMark("'", ' sonz', ' wive')).toBe(false);

      // contractions
      expect(quotationConfig.shouldIgnoreQuotationMark("'", ' they', 're not')).toBe(true);
      expect(quotationConfig.shouldIgnoreQuotationMark("'", 'hat I', 've se')).toBe(true);
      expect(quotationConfig.shouldIgnoreQuotationMark("'", 'hat I', ' ve s')).toBe(false);
      expect(quotationConfig.shouldIgnoreQuotationMark("'", 'hat I', '.ve s')).toBe(false);
    });

    it('has other various properties configured correctly', () => {
      expect(quotationConfig.shouldAllowContinuers()).toBe(false);
      expect(quotationConfig.shouldWarnForDepth(QuotationDepth.fromNumber(3))).toBe(false);
      expect(quotationConfig.shouldWarnForDepth(QuotationDepth.fromNumber(4))).toBe(true);
      expect(quotationConfig.shouldWarnForDepth(QuotationDepth.fromNumber(5))).toBe(true);
    });

    it('identifies no issues with well-formed English Biblical text', async () => {
      const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
      const localizer: Localizer = new Localizer();
      const quotationChecker: DiagnosticProvider =
        standardEnglishRuleSet.createSelectedDiagnosticProviders<TextDocument>(
          localizer,
          stubDocumentManager,
          new TextEditFactory(),
          [RuleType.QuotationMarkPairing],
        )[0];
      await quotationChecker.init();
      await localizer.init();

      expect(
        await quotationChecker.getDiagnostics(
          `So he said, “I am Abraham's servant. The Lord has greatly blessed my master, and he has become great.
          He has given him flocks and herds, silver and gold, male servants and female servants, camels and donkeys.
          And Sarah my master's wife bore a son to my master when she was old, and to him he has given all that he has.
          My master made me swear, saying, ‘You shall not take a wife for my son from the daughters of the Canaanites,
          in whose land I dwell, 38 but you shall go to my father's house and to my clan and take a wife for my son.’
          I said to my master, ‘Perhaps the woman will not follow me.’ But he said to me, ‘The Lord, before whom I have walked,
          will send his angel with you and prosper your way. You shall take a wife for my son from my clan and from my father's house.
          Then you will be free from my oath, when you come to my clan. And if they will not give her to you, you will be free from my oath.’”`,
        ),
      ).toEqual([]);

      // different apostrophe convention
      expect(
        await quotationChecker.getDiagnostics(
          `So he said, “I am Abraham’s servant.
          The Lord has greatly blessed my master, and he has become great. He has given him flocks and herds, silver and gold, male servants and female servants, camels and donkeys.
          And Sarah my master’s wife bore a son to my master when she was old, and to him he has given all that he has.
          My master made me swear, saying, ‘You shall not take a wife for my son from the daughters of the Canaanites, in whose land I dwell,
          but you shall go to my father’s house and to my clan and take a wife for my son.’
          I said to my master, ‘Perhaps the woman will not follow me.’
          But he said to me, ‘The Lord, before whom I have walked, will send his angel with you and prosper your way. You shall take a wife for my son from my clan and from my father’s house.
          Then you will be free from my oath, when you come to my clan. And if they will not give her to you, you will be free from my oath.’”`,
        ),
      ).toEqual([]);

      // Three levels of quotes
      expect(
        await quotationChecker.getDiagnostics(
          `“I came today to the spring and said, ‘O Lord, the God of my master Abraham, if now you are prospering the way that I go,
        behold, I am standing by the spring of water. Let the virgin who comes out to draw water, to whom I shall say, “Please give me a little water from your jar to drink,”
        and who will say to me, “Drink, and I will draw for your camels also,” let her be the woman whom the Lord has appointed for my master’s son.’”
        “Before I had finished speaking in my heart, behold, Rebekah came out with her water jar on her shoulder, and she went down to the spring and drew water. I said to her, ‘Please let me drink.’
        She quickly let down her jar from her shoulder and said, ‘Drink, and I will give your camels drink also.’ So I drank, and she gave the camels drink also.
        Then I asked her, ‘Whose daughter are you?’ She said, ‘The daughter of Bethuel, Nahor’s son, whom Milcah bore to him.’ So I put the ring on her nose and the bracelets on her arms.
        Then I bowed my head and worshiped the Lord and blessed the Lord, the God of my master Abraham, who had led me by the right way to take the daughter of my master’s kinsman for his son.
        Now then, if you are going to show steadfast love and faithfulness to my master, tell me; and if not, tell me, that I may turn to the right hand or to the left.”`,
        ),
      ).toEqual([]);
    });

    it('identifies intentionally planted issues into otherwise well-formed English Biblical text', async () => {
      const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
      const localizer: Localizer = new Localizer();
      const quotationChecker: DiagnosticProvider =
        standardEnglishRuleSet.createSelectedDiagnosticProviders<TextDocument>(
          localizer,
          stubDocumentManager,
          new TextEditFactory(),
          [RuleType.QuotationMarkPairing],
        )[0];
      await quotationChecker.init();
      await localizer.init();

      // The top-level closing quote has been removed
      expect(
        await quotationChecker.getDiagnostics(
          `So he said, “I am Abraham's servant. The Lord has greatly blessed my master, and he has become great.
          He has given him flocks and herds, silver and gold, male servants and female servants, camels and donkeys.
          And Sarah my master's wife bore a son to my master when she was old, and to him he has given all that he has.
          My master made me swear, saying, ‘You shall not take a wife for my son from the daughters of the Canaanites,
          in whose land I dwell, 38 but you shall go to my father's house and to my clan and take a wife for my son.’
          I said to my master, ‘Perhaps the woman will not follow me.’ But he said to me, ‘The Lord, before whom I have walked,
          will send his angel with you and prosper your way. You shall take a wife for my son from my clan and from my father's house.
          Then you will be free from my oath, when you come to my clan. And if they will not give her to you, you will be free from my oath.’`,
        ),
      ).toEqual([
        {
          code: 'unmatched-opening-quotation-mark',
          severity: DiagnosticSeverity.Error,
          range: {
            start: {
              character: 12,
              line: 0,
            },
            end: {
              character: 13,
              line: 0,
            },
          },
          message: 'Opening quotation mark with no closing mark.',
          source: 'quotation-mark-checker',
          data: '',
        },
      ]);

      // The first second level opening quote has been removed
      expect(
        await quotationChecker.getDiagnostics(
          `So he said, “I am Abraham's servant. The Lord has greatly blessed my master, and he has become great.
          He has given him flocks and herds, silver and gold, male servants and female servants, camels and donkeys.
          And Sarah my master's wife bore a son to my master when she was old, and to him he has given all that he has.
          My master made me swear, saying, You shall not take a wife for my son from the daughters of the Canaanites,
          in whose land I dwell, 38 but you shall go to my father's house and to my clan and take a wife for my son.’
          I said to my master, ‘Perhaps the woman will not follow me.’ But he said to me, ‘The Lord, before whom I have walked,
          will send his angel with you and prosper your way. You shall take a wife for my son from my clan and from my father's house.
          Then you will be free from my oath, when you come to my clan. And if they will not give her to you, you will be free from my oath.’”`,
        ),
      ).toEqual([
        {
          code: 'unmatched-closing-quotation-mark',
          severity: DiagnosticSeverity.Error,
          range: {
            start: {
              character: 573,
              line: 0,
            },
            end: {
              character: 574,
              line: 0,
            },
          },
          message: 'Closing quotation mark with no opening mark.',
          source: 'quotation-mark-checker',
          data: '',
        },
      ]);

      // A second-level closing quote has been removed
      expect(
        await quotationChecker.getDiagnostics(
          `“I came today to the spring and said, ‘O Lord, the God of my master Abraham, if now you are prospering the way that I go,
        behold, I am standing by the spring of water. Let the virgin who comes out to draw water, to whom I shall say, “Please give me a little water from your jar to drink,”
        and who will say to me, “Drink, and I will draw for your camels also,” let her be the woman whom the Lord has appointed for my master’s son.’”
        “Before I had finished speaking in my heart, behold, Rebekah came out with her water jar on her shoulder, and she went down to the spring and drew water. I said to her, ‘Please let me drink.
        She quickly let down her jar from her shoulder and said, ‘Drink, and I will give your camels drink also.’ So I drank, and she gave the camels drink also.
        Then I asked her, ‘Whose daughter are you?’ She said, ‘The daughter of Bethuel, Nahor’s son, whom Milcah bore to him.’ So I put the ring on her nose and the bracelets on her arms.
        Then I bowed my head and worshiped the Lord and blessed the Lord, the God of my master Abraham, who had led me by the right way to take the daughter of my master’s kinsman for his son.
        Now then, if you are going to show steadfast love and faithfulness to my master, tell me; and if not, tell me, that I may turn to the right hand or to the left.”`,
        ),
      ).toEqual([
        {
          code: 'unmatched-opening-quotation-mark',
          severity: DiagnosticSeverity.Error,
          range: {
            start: {
              character: 625,
              line: 0,
            },
            end: {
              character: 626,
              line: 0,
            },
          },
          message: 'Opening quotation mark with no closing mark.',
          source: 'quotation-mark-checker',
          data: '',
        },
        {
          code: 'incorrectly-nested-quotation-mark',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              character: 712,
              line: 0,
            },
            end: {
              character: 713,
              line: 0,
            },
          },
          message: 'Incorrectly nested quotation mark.',
          source: 'quotation-mark-checker',
          data: {
            depth: 2,
          },
        },
        {
          code: 'incorrectly-nested-quotation-mark',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              character: 835,
              line: 0,
            },
            end: {
              character: 836,
              line: 0,
            },
          },
          message: 'Incorrectly nested quotation mark.',
          source: 'quotation-mark-checker',
          data: {
            depth: 2,
          },
        },
        {
          code: 'incorrectly-nested-quotation-mark',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              character: 871,
              line: 0,
            },
            end: {
              character: 872,
              line: 0,
            },
          },
          message: 'Incorrectly nested quotation mark.',
          source: 'quotation-mark-checker',
          data: {
            depth: 2,
          },
        },
        {
          code: 'deeply-nested-quotation-mark',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              character: 712,
              line: 0,
            },
            end: {
              character: 713,
              line: 0,
            },
          },
          message: 'Too many levels of quotation marks. Consider rephrasing to avoid this.',
          source: 'quotation-mark-checker',
          data: '',
        },
        {
          code: 'deeply-nested-quotation-mark',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              character: 759,
              line: 0,
            },
            end: {
              character: 760,
              line: 0,
            },
          },
          message: 'Too many levels of quotation marks. Consider rephrasing to avoid this.',
          source: 'quotation-mark-checker',
          data: '',
        },
        {
          code: 'deeply-nested-quotation-mark',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              character: 835,
              line: 0,
            },
            end: {
              character: 836,
              line: 0,
            },
          },
          message: 'Too many levels of quotation marks. Consider rephrasing to avoid this.',
          source: 'quotation-mark-checker',
          data: '',
        },
        {
          code: 'deeply-nested-quotation-mark',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              character: 859,
              line: 0,
            },
            end: {
              character: 860,
              line: 0,
            },
          },
          message: 'Too many levels of quotation marks. Consider rephrasing to avoid this.',
          source: 'quotation-mark-checker',
          data: '',
        },
        {
          code: 'deeply-nested-quotation-mark',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              character: 871,
              line: 0,
            },
            end: {
              character: 872,
              line: 0,
            },
          },
          message: 'Too many levels of quotation marks. Consider rephrasing to avoid this.',
          source: 'quotation-mark-checker',
          data: '',
        },
        {
          code: 'deeply-nested-quotation-mark',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              character: 934,
              line: 0,
            },
            end: {
              character: 935,
              line: 0,
            },
          },
          message: 'Too many levels of quotation marks. Consider rephrasing to avoid this.',
          source: 'quotation-mark-checker',
          data: '',
        },
      ]);
    });
  });

  describe('Paired punctuation checking', () => {
    const standardEnglishRuleSet = StandardRuleSets.English;
    const pairedPunctuationConfig = standardEnglishRuleSet._getPairedPunctuationConfig();

    it('specifies standard paired punctuation for English', () => {
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('(')).toBe(true);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test(')')).toBe(true);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('[')).toBe(true);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test(']')).toBe(true);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('{')).toBe(true);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('}')).toBe(true);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u201C')).toBe(true);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u201D')).toBe(true);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u2018')).toBe(true);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u2019')).toBe(true);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('"')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test("'")).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u201E')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u201F')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u201A')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('<')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('>')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('`')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('/')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\\')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u2039')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u203A')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u00AB')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u00BB')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u2985')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u2986')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\uFE59')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\uFE5A')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u2E28')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u2E29')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u3008')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u3009')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u300A')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u300B')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u300C')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u300D')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u300E')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u300F')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u3010')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u3011')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u3014')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u3015')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u3016')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u3017')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u3018')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u3019')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u2997')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u2998')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\uFF08')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\uFF09')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\uFF3B')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\uFF3D')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\uFF5B')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\uFF5D')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\uFF5F')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\uFF60')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\uFF62')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\uFF63')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u23DC')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u23DD')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u23B4')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u23B5')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u23DE')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u23DF')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u23E0')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u23E1')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u275B')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u275C')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u275D')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u275E')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u2768')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u2769')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u276A')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u276B')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u2774')).toBe(false);
      expect(pairedPunctuationConfig.createAllPairedMarksRegex().test('\u2775')).toBe(false);
    });

    it('identifies no issues with well-formed English Biblical text', async () => {
      const localizer: Localizer = new Localizer();
      const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
      const pairedPunctuationChecker: DiagnosticProvider =
        standardEnglishRuleSet.createSelectedDiagnosticProviders<TextDocument>(
          localizer,
          stubDocumentManager,
          new TextEditFactory(),
          [RuleType.PairedPunctuation],
        )[0];
      await pairedPunctuationChecker.init();
      await localizer.init();

      expect(
        await pairedPunctuationChecker.getDiagnostics(`So Achish gave him the town of Ziklag (which still belongs to the kings of 
        Judah to this day), and they lived there among the Philistines for a year and four months.`),
      ).toEqual([]);

      expect(
        await pairedPunctuationChecker.getDiagnostics(`But there were some scoundrels who complained, “How can this man save us?” 
        And they scorned him and refused to bring him gifts. But Saul ignored them. [Nahash, king of the Ammonites, had been grievously 
        oppressing the people of Gad and Reuben who lived east of the Jordan River. He gouged out the right eye of each of the Israelites 
        living there, and he didn’t allow anyone to come and rescue them. In fact, of all the Israelites east of the Jordan, there wasn’t a 
        single one whose right eye Nahash had not gouged out. But there were 7,000 men who had escaped from the Ammonites, and they had 
        settled in Jabesh-gilead.]`),
      ).toEqual([]);

      expect(
        await pairedPunctuationChecker.getDiagnostics(`So David went to Baal-perazim and defeated the Philistines there. “The Lord did 
        it!” David exclaimed. “He burst through my enemies like a raging flood!” So he named that place Baal-perazim (which means 
        “the Lord who bursts through”).`),
      ).toEqual([]);
    });

    it('identifies intentionally planted issues into otherwise well-formed English Biblical text', async () => {
      const localizer: Localizer = new Localizer();
      const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
      const pairedPunctuationChecker: DiagnosticProvider =
        standardEnglishRuleSet.createSelectedDiagnosticProviders<TextDocument>(
          localizer,
          stubDocumentManager,
          new TextEditFactory(),
          [RuleType.PairedPunctuation],
        )[0];
      await pairedPunctuationChecker.init();
      await localizer.init();

      expect(
        await pairedPunctuationChecker.getDiagnostics(`So David went to Baal-perazim and defeated the Philistines there. “The Lord did 
        it!” David exclaimed. “He burst through my enemies like a raging flood!” So he named that place Baal-perazim which means 
        “the Lord who bursts through”).`),
      ).toEqual([
        {
          code: 'unmatched-closing-parenthesis',
          source: 'paired-punctuation-checker',
          severity: DiagnosticSeverity.Error,
          range: {
            start: {
              line: 0,
              character: 248,
            },
            end: {
              line: 0,
              character: 249,
            },
          },
          message: 'Closing parenthesis with no opening parenthesis.',
          data: '',
        },
      ]);
    });
  });

  describe('Punctuation context checking', () => {
    const standardEnglishRuleSet = StandardRuleSets.English;
    const punctuationContextConfig = standardEnglishRuleSet._getPunctuationContextConfig();

    it('specifies standard punctuation context rules for English', () => {
      expect(punctuationContextConfig.isLeadingContextCorrect('.', ' ')).toBe(false);
      expect(punctuationContextConfig.isLeadingContextCorrect('.', 'c')).toBe(true);
      expect(punctuationContextConfig.isLeadingContextCorrect('.', '\u201C')).toBe(true);
      expect(punctuationContextConfig.isLeadingContextCorrect('.', '\u201D')).toBe(true);
      expect(punctuationContextConfig.isLeadingContextCorrect(',', ' ')).toBe(false);
      expect(punctuationContextConfig.isLeadingContextCorrect(',', '0')).toBe(true);
      expect(punctuationContextConfig.isLeadingContextCorrect(',', '\u2019')).toBe(true);
      expect(punctuationContextConfig.isLeadingContextCorrect('\u201D', ' ')).toBe(false);
      expect(punctuationContextConfig.isLeadingContextCorrect('\u201D', '\u2019')).toBe(true);
      expect(punctuationContextConfig.isLeadingContextCorrect('\u201D', '.')).toBe(true);

      expect(punctuationContextConfig.isTrailingContextCorrect('.', ' ')).toBe(true);
      expect(punctuationContextConfig.isTrailingContextCorrect('.', '5')).toBe(true);
      expect(punctuationContextConfig.isTrailingContextCorrect('.', 'a')).toBe(false);
      expect(punctuationContextConfig.isTrailingContextCorrect('.', '\u2019')).toBe(true);
      expect(punctuationContextConfig.isTrailingContextCorrect('.', '\u201D')).toBe(true);
      expect(punctuationContextConfig.isTrailingContextCorrect('.', ')')).toBe(true);
      expect(punctuationContextConfig.isTrailingContextCorrect('.', ',')).toBe(false);
      expect(punctuationContextConfig.isTrailingContextCorrect(',', ' ')).toBe(true);
      expect(punctuationContextConfig.isTrailingContextCorrect(',', ')')).toBe(true);
      expect(punctuationContextConfig.isTrailingContextCorrect(',', ',')).toBe(false);
      expect(punctuationContextConfig.isTrailingContextCorrect(',', 'j')).toBe(false);
      expect(punctuationContextConfig.isTrailingContextCorrect(',', '\u2019')).toBe(true);
      expect(punctuationContextConfig.isTrailingContextCorrect(',', '\u201D')).toBe(true);
      expect(punctuationContextConfig.isTrailingContextCorrect(',', '.')).toBe(false);
    });

    it('identifies no issues with well-formed English Biblical text', async () => {
      const localizer: Localizer = new Localizer();
      const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
      const punctuationContextChecker: DiagnosticProvider =
        standardEnglishRuleSet.createSelectedDiagnosticProviders<TextDocument>(
          localizer,
          stubDocumentManager,
          new TextEditFactory(),
          [RuleType.PunctuationContext],
        )[0];
      await punctuationContextChecker.init();
      await localizer.init();

      expect(
        await punctuationContextChecker.getDiagnostics(`Let the young woman to whom I shall say, ‘Please let down your jar that I may drink’,
          and who shall say, ‘Drink, and I will water your camels,’ let her be the one whom you have appointed for your servant Isaac.”`),
      ).toEqual([]);
    });

    it('identifies intentionally planted issues into otherwise well-formed English Biblical text', async () => {
      const localizer: Localizer = new Localizer();
      const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
      const punctuationContextChecker: DiagnosticProvider =
        standardEnglishRuleSet.createSelectedDiagnosticProviders<TextDocument>(
          localizer,
          stubDocumentManager,
          new TextEditFactory(),
          [RuleType.PunctuationContext],
        )[0];
      await punctuationContextChecker.init();
      await localizer.init();

      expect(
        await punctuationContextChecker.getDiagnostics(`Let the young woman to whom I shall say,‘Please let down your jar that I may drink,’
          and who shall say, ‘ Drink, and I will water your camels,’ let her be the one whom you have appointed for your servant Isaac. ”`),
      ).toEqual([
        {
          code: 'incorrect-trailing-context',
          source: 'punctuation-context-checker',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              line: 0,
              character: 39,
            },
            end: {
              line: 0,
              character: 40,
            },
          },
          message: 'The punctuation mark \u201C,\u201D should not be immediately followed by \u201C\u2018\u201D.',
          data: {
            isSpaceAllowed: true,
          },
        },
        {
          code: 'incorrect-leading-context',
          source: 'punctuation-context-checker',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              line: 0,
              character: 40,
            },
            end: {
              line: 0,
              character: 41,
            },
          },
          message: 'The punctuation mark \u201C\u2018\u201D should not be immediately preceded by \u201C,\u201D.',
          data: {
            isSpaceAllowed: true,
          },
        },
        {
          code: 'incorrect-trailing-context',
          source: 'punctuation-context-checker',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              line: 0,
              character: 114,
            },
            end: {
              line: 0,
              character: 115,
            },
          },
          message: 'The punctuation mark \u201C\u2018\u201D should not be immediately followed by \u201C \u201D.',
          data: {
            isSpaceAllowed: false,
          },
        },
        {
          code: 'incorrect-leading-context',
          source: 'punctuation-context-checker',
          severity: DiagnosticSeverity.Warning,
          range: {
            start: {
              line: 0,
              character: 221,
            },
            end: {
              line: 0,
              character: 222,
            },
          },
          message: 'The punctuation mark \u201C\u201D\u201D should not be immediately preceded by \u201C \u201D.',
          data: {
            isSpaceAllowed: false,
          },
        },
      ]);
    });
  });

  describe('Smart quotes (a.k.a. quote correction)', () => {
    const standardEnglishRuleSet = StandardRuleSets.English;

    it('makes no corrections for well-formed English Biblical text', async () => {
      const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
      const quoteCorrector: OnTypeFormattingProvider =
        standardEnglishRuleSet.createOnTypeFormattingProviders<TextDocument>(
          stubDocumentManager,
          new TextEditFactory(),
        )[0];
      expect(
        await quoteCorrector.getOnTypeEdits(
          `So Pharaoh summoned Abram and said, “What is this you have done to me? Why didn't you tell me that she was your wife?
           Why did you say, ‘She is my sister,’ so that I took her to be my wife? Here is your wife! Take her and go!”`,
          { line: 0, character: 0 },
          'x',
        ),
      ).toBe(undefined);
    });

    it('corrects intentionally placed ambiguities in otherwise well-formed English Biblical text', async () => {
      const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());
      const quoteCorrector: OnTypeFormattingProvider =
        standardEnglishRuleSet.createOnTypeFormattingProviders<TextDocument>(
          stubDocumentManager,
          new TextEditFactory(),
        )[0];

      expect(
        await quoteCorrector.getOnTypeEdits(
          `The LORD who rules over all says this: “These people have said, 'The time for rebuilding the LORD's temple has not yet come.’”`,
          { line: 0, character: 65 },
          "'",
        ),
      ).toEqual([
        {
          range: {
            start: { line: 0, character: 64 },
            end: { line: 0, character: 65 },
          },
          newText: '\u2018',
        },
      ]);

      expect(
        await quoteCorrector.getOnTypeEdits(
          `The LORD who rules over all says this: “These people have said, ‘The time for rebuilding the LORD's temple has not yet come.’"`,
          { line: 0, character: 126 },
          '"',
        ),
      ).toEqual([
        {
          range: {
            start: { line: 0, character: 125 },
            end: { line: 0, character: 126 },
          },
          newText: '\u201D',
        },
      ]);
    });
  });
});
