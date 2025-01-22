import {
  DiagnosticProvider,
  DiagnosticSeverity,
  DocumentManager,
  TextDocument,
  TextDocumentFactory,
} from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { QuotationDepth, QuotationDirection } from '../../src/quotation/quotation-utils';
import { RuleType } from '../../src/rule-set/rule-set';
import { StandardRuleSets } from '../../src/rule-set/standard-rule-sets';
import { StubDocumentManager } from '../test-utils';

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

      expect(quotationConfig.getPossibleQuoteDirections('\u201C')).toEqual([QuotationDirection.Opening]);
      expect(quotationConfig.getPossibleQuoteDirections('\u201D')).toEqual([QuotationDirection.Closing]);
      expect(quotationConfig.getPossibleQuoteDirections('\u2018')).toEqual([QuotationDirection.Opening]);
      expect(quotationConfig.getPossibleQuoteDirections('\u2019')).toEqual([QuotationDirection.Closing]);
      expect(quotationConfig.getPossibleQuoteDirections('"')).toEqual([
        QuotationDirection.Opening,
        QuotationDirection.Closing,
      ]);
      expect(quotationConfig.getPossibleQuoteDirections('"')).toEqual([
        QuotationDirection.Opening,
        QuotationDirection.Closing,
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
      const stubDocumentManager: DocumentManager<TextDocument> = new StubDocumentManager(new TextDocumentFactory());
      const quotationChecker: DiagnosticProvider = standardEnglishRuleSet.createSelectedDiagnosticProviders(
        stubDocumentManager,
        [RuleType.QuotationMarkPairing],
      )[0];

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
      const stubDocumentManager: DocumentManager<TextDocument> = new StubDocumentManager(new TextDocumentFactory());
      const quotationChecker: DiagnosticProvider = standardEnglishRuleSet.createSelectedDiagnosticProviders(
        stubDocumentManager,
        [RuleType.QuotationMarkPairing],
      )[0];

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
        },
        {
          code: 'incorrectly-nested-quotation-mark-level-2',
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
        },
        {
          code: 'incorrectly-nested-quotation-mark-level-2',
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
        },
        {
          code: 'incorrectly-nested-quotation-mark-level-2',
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
        },
      ]);
    });
  });
});
