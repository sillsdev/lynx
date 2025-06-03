import {
  DiagnosticProvider,
  DocumentManager,
  Localizer,
  OnTypeFormattingProvider,
  ScriptureDocument,
  TextDocument,
  TextDocumentFactory,
  TextEditFactory,
} from '@sillsdev/lynx';
import { UsfmDocumentFactory, UsfmEditFactory } from '@sillsdev/lynx-usfm';
import { UsfmStylesheet } from '@sillsdev/machine/corpora';
import { describe, expect, it } from 'vitest';

import { RuleSet } from '../../src';
import { AllowedCharacterSet, CharacterRegexWhitelist } from '../../src/allowed-character/allowed-character-set';
import { PairedPunctuationConfig } from '../../src/paired-punctuation/paired-punctuation-config';
import { PunctuationContextConfig } from '../../src/punctuation-context/punctuation-context-config';
import { QuotationConfig } from '../../src/quotation/quotation-config';
import { RuleType } from '../../src/rule-set/rule-set';
import { CharacterClassRegexBuilder } from '../../src/utils';
import { StubScriptureDocumentManager, StubTextDocumentManager } from '../test-utils';

const defaultLocalizer: Localizer = new Localizer();

describe('DiagnosticProviderFactory tests', () => {
  const stubDocumentManager: DocumentManager<TextDocument> = new StubTextDocumentManager(new TextDocumentFactory());

  const allowedCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(
    new CharacterClassRegexBuilder().addRange('B', 'Y').build(),
  );
  const quotationConfig: QuotationConfig = new QuotationConfig.Builder()
    .setTopLevelQuotationMarks({
      openingPunctuationMark: '\u201E',
      closingPunctuationMark: '\u201F',
    })
    .mapAmbiguousQuotationMark('+', '\u201E')
    .mapAmbiguousQuotationMark('+', '\u201F')
    .build();
  const pairedPunctuationConfig: PairedPunctuationConfig = new PairedPunctuationConfig.Builder()
    .addRule({
      openingPunctuationMark: '<',
      closingPunctuationMark: '>',
    })
    .build();
  const puncutationContextConfig: PunctuationContextConfig = new PunctuationContextConfig.Builder()
    .addProhibitedLeadingPattern(['{'], /[^ ]/)
    .addProhibitedTrailingPattern(['}'], /[^ ]/)
    .build();

  it('creates all known checkers when createDiagnosticProviderFactories is called', async () => {
    const ruleSet: RuleSet = new RuleSet(
      allowedCharacterSet,
      quotationConfig,
      pairedPunctuationConfig,
      puncutationContextConfig,
    );
    const diagnosticProviders: DiagnosticProvider[] = ruleSet.createDiagnosticProviders<TextDocument>(
      defaultLocalizer,
      stubDocumentManager,
      new TextEditFactory(),
    );
    for (const diagnosticProvider of diagnosticProviders) {
      await diagnosticProvider.init();
    }
    await defaultLocalizer.init();

    // ensure we get the right type of checkers
    expect(diagnosticProviders[0].id).toEqual('allowed-character-set-checker');
    expect(diagnosticProviders[1].id).toEqual('quotation-mark-checker');
    expect(diagnosticProviders[2].id).toEqual('paired-punctuation-checker');
    expect(diagnosticProviders[3].id).toEqual('punctuation-context-checker');

    // ensure that they're the checkers we specified
    expect(await diagnosticProviders[0].getDiagnostics('A')).toHaveLength(1);
    expect(await diagnosticProviders[0].getDiagnostics('B')).toHaveLength(0);

    expect(await diagnosticProviders[1].getDiagnostics('\u201E\u201F')).toHaveLength(0);
    expect(await diagnosticProviders[1].getDiagnostics('\u201E')).toHaveLength(1);

    expect(await diagnosticProviders[2].getDiagnostics('<')).toHaveLength(1);
    expect(await diagnosticProviders[2].getDiagnostics('<>')).toHaveLength(0);

    expect(await diagnosticProviders[3].getDiagnostics('h{')).toHaveLength(1);
    expect(await diagnosticProviders[3].getDiagnostics(' {')).toHaveLength(0);
  });

  it('creates the appropriate checker when passed a rule type', async () => {
    const ruleSet: RuleSet = new RuleSet(
      allowedCharacterSet,
      quotationConfig,
      pairedPunctuationConfig,
      puncutationContextConfig,
    );

    // ensure that we get the right type of checkers
    expect(
      ruleSet.createSelectedDiagnosticProviders<TextDocument>(
        new Localizer(),
        stubDocumentManager,
        new TextEditFactory(),
        [RuleType.AllowedCharacters],
      )[0].id,
    ).toEqual('allowed-character-set-checker');
    expect(
      ruleSet.createSelectedDiagnosticProviders<TextDocument>(
        new Localizer(),
        stubDocumentManager,
        new TextEditFactory(),
        [RuleType.QuotationMarkPairing],
      )[0].id,
    ).toEqual('quotation-mark-checker');
    expect(
      ruleSet.createSelectedDiagnosticProviders<TextDocument>(
        new Localizer(),
        stubDocumentManager,
        new TextEditFactory(),
        [RuleType.PairedPunctuation],
      )[0].id,
    ).toEqual('paired-punctuation-checker');
    expect(
      ruleSet.createSelectedDiagnosticProviders<TextDocument>(
        new Localizer(),
        stubDocumentManager,
        new TextEditFactory(),
        [RuleType.PunctuationContext],
      )[0].id,
    ).toEqual('punctuation-context-checker');

    // Arbitrary order
    expect(
      ruleSet.createSelectedDiagnosticProviders<TextDocument>(
        new Localizer(),
        stubDocumentManager,
        new TextEditFactory(),
        [
          RuleType.PairedPunctuation,
          RuleType.PunctuationContext,
          RuleType.QuotationMarkPairing,
          RuleType.AllowedCharacters,
        ],
      )[0].id,
    ).toEqual('paired-punctuation-checker');
    expect(
      ruleSet.createSelectedDiagnosticProviders<TextDocument>(
        new Localizer(),
        stubDocumentManager,
        new TextEditFactory(),
        [
          RuleType.PairedPunctuation,
          RuleType.PunctuationContext,
          RuleType.QuotationMarkPairing,
          RuleType.AllowedCharacters,
        ],
      )[1].id,
    ).toEqual('punctuation-context-checker');
    expect(
      ruleSet.createSelectedDiagnosticProviders<TextDocument>(
        new Localizer(),
        stubDocumentManager,
        new TextEditFactory(),
        [
          RuleType.PairedPunctuation,
          RuleType.PunctuationContext,
          RuleType.QuotationMarkPairing,
          RuleType.AllowedCharacters,
        ],
      )[2].id,
    ).toEqual('quotation-mark-checker');
    expect(
      ruleSet.createSelectedDiagnosticProviders<TextDocument>(
        new Localizer(),
        stubDocumentManager,
        new TextEditFactory(),
        [
          RuleType.PairedPunctuation,
          RuleType.PunctuationContext,
          RuleType.QuotationMarkPairing,
          RuleType.AllowedCharacters,
        ],
      )[3].id,
    ).toEqual('allowed-character-set-checker');

    // ensure that they're the checkers we specified
    const diagnosticProviders: DiagnosticProvider[] = ruleSet.createSelectedDiagnosticProviders<TextDocument>(
      defaultLocalizer,
      stubDocumentManager,
      new TextEditFactory(),
      [
        RuleType.AllowedCharacters,
        RuleType.QuotationMarkPairing,
        RuleType.PairedPunctuation,
        RuleType.PunctuationContext,
      ],
    );
    for (const diagnosticProvider of diagnosticProviders) {
      await diagnosticProvider.init();
    }
    await defaultLocalizer.init();

    expect(await diagnosticProviders[0].getDiagnostics('A')).toHaveLength(1);
    expect(await diagnosticProviders[0].getDiagnostics('B')).toHaveLength(0);

    expect(await diagnosticProviders[1].getDiagnostics('\u201E\u201F')).toHaveLength(0);
    expect(await diagnosticProviders[1].getDiagnostics('\u201E')).toHaveLength(1);

    expect(await diagnosticProviders[2].getDiagnostics('<>')).toHaveLength(0);
    expect(await diagnosticProviders[2].getDiagnostics('<')).toHaveLength(1);

    expect(await diagnosticProviders[3].getDiagnostics('h{')).toHaveLength(1);
    expect(await diagnosticProviders[3].getDiagnostics(' {')).toHaveLength(0);
  });

  it('creates all known on-type formatters when createOnTypeFormattingProviders is called', async () => {
    const ruleSet: RuleSet = new RuleSet(
      allowedCharacterSet,
      quotationConfig,
      pairedPunctuationConfig,
      puncutationContextConfig,
    );
    const onTypeFormatters: OnTypeFormattingProvider[] = ruleSet.createOnTypeFormattingProviders<TextDocument>(
      stubDocumentManager,
      new TextEditFactory(),
    );

    expect(onTypeFormatters.length).toEqual(1);

    expect(onTypeFormatters[0].id).toEqual('quote-corrector');

    expect(await onTypeFormatters[0].getOnTypeEdits('A', { line: 0, character: 1 }, '')).toBe(undefined);
    expect(await onTypeFormatters[0].getOnTypeEdits('+A', { line: 0, character: 1 }, '')).toHaveLength(1);
    expect(await onTypeFormatters[0].getOnTypeEdits('+A+', { line: 0, character: 1 }, '')).toHaveLength(1);
    expect(await onTypeFormatters[0].getOnTypeEdits('+A+', { line: 0, character: 3 }, '')).toHaveLength(1);
  });

  it('also accepts a ScriptureDocument factory', async () => {
    const stylesheet = new UsfmStylesheet('usfm.sty');
    const stubScriptureDocumentManager: DocumentManager<ScriptureDocument> = new StubScriptureDocumentManager(
      new UsfmDocumentFactory(stylesheet),
    );

    const ruleSet: RuleSet = new RuleSet(
      allowedCharacterSet,
      quotationConfig,
      pairedPunctuationConfig,
      puncutationContextConfig,
    );
    const diagnosticProviders: DiagnosticProvider[] = ruleSet.createDiagnosticProviders<ScriptureDocument>(
      defaultLocalizer,
      stubScriptureDocumentManager,
      new UsfmEditFactory(stylesheet),
    );
    for (const diagnosticProvider of diagnosticProviders) {
      await diagnosticProvider.init();
    }
    await defaultLocalizer.init();

    expect(await diagnosticProviders[0].getDiagnostics('\\c 1 \\v 1 BADTEXT')).toHaveLength(1);
    expect(await diagnosticProviders[0].getDiagnostics('\\c 1 \\v 1 BDTEXT')).toHaveLength(0);

    const onTypeFormatters: OnTypeFormattingProvider[] = ruleSet.createOnTypeFormattingProviders<ScriptureDocument>(
      stubScriptureDocumentManager,
      new UsfmEditFactory(stylesheet),
    );
    expect(await onTypeFormatters[0].getOnTypeEdits('\\c 1 \\v 1 +A+', { line: 0, character: 11 }, '')).toHaveLength(1);
    expect(await onTypeFormatters[0].getOnTypeEdits('\\c 1 \\v 1 +A+', { line: 0, character: 12 }, '')).toHaveLength(0);
    expect(await onTypeFormatters[0].getOnTypeEdits('\\c 1 \\v 1 +A+', { line: 0, character: 13 }, '')).toHaveLength(1);
  });
});
