import { DiagnosticProvider, DocumentManager, TextDocument, TextDocumentFactory } from '@sillsdev/lynx';
import { describe, expect, it } from 'vitest';

import { RuleSet } from '../../src';
import { AllowedCharacterSet, CharacterRegexWhitelist } from '../../src/allowed-character/allowed-character-set';
import { PairedPunctuationConfig } from '../../src/paired-punctuation/paired-punctuation-config';
import { QuotationConfig } from '../../src/quotation/quotation-config';
import { RuleType } from '../../src/rule-set/rule-set';
import { CharacterClassRegexBuilder } from '../../src/utils';
import { StubDocumentManager } from '../test-utils';

describe('DiagnosticProviderFactory tests', () => {
  const stubDocumentManager: DocumentManager<TextDocument> = new StubDocumentManager(new TextDocumentFactory());

  const allowedCharacterSet: AllowedCharacterSet = new CharacterRegexWhitelist(
    new CharacterClassRegexBuilder().addRange('B', 'Y').build(),
  );
  const quotationConfig: QuotationConfig = new QuotationConfig.Builder()
    .setTopLevelQuotationMarks({
      openingPunctuationMark: '\u201E',
      closingPunctuationMark: '\u201F',
    })
    .build();
  const pairedPunctuationConfig: PairedPunctuationConfig = new PairedPunctuationConfig.Builder()
    .addRule({
      openingPunctuationMark: '<',
      closingPunctuationMark: '>',
    })
    .build();

  it('creates all known checkers when createDiagnosticProviderFactories is called', async () => {
    const ruleSet: RuleSet = new RuleSet(allowedCharacterSet, quotationConfig, pairedPunctuationConfig);
    const diagnosticProviders: DiagnosticProvider[] = ruleSet.createDiagnosticProviders(stubDocumentManager);

    // ensure we get the right type of checkers
    expect(diagnosticProviders[0].id).toEqual('allowed-character-set-checker');
    expect(diagnosticProviders[1].id).toEqual('quotation-mark-checker');
    expect(diagnosticProviders[2].id).toEqual('paired-punctuation-checker');

    // ensure that they're the checkers we specified
    expect(await diagnosticProviders[0].getDiagnostics('A')).toHaveLength(1);
    expect(await diagnosticProviders[0].getDiagnostics('B')).toHaveLength(0);

    expect(await diagnosticProviders[1].getDiagnostics('\u201E\u201F')).toHaveLength(0);
    expect(await diagnosticProviders[1].getDiagnostics('\u201E')).toHaveLength(1);

    expect(await diagnosticProviders[2].getDiagnostics('<')).toHaveLength(1);
    expect(await diagnosticProviders[2].getDiagnostics('<>')).toHaveLength(0);
  });

  it('creates the appropriate checker when passed a rule type', async () => {
    const ruleSet: RuleSet = new RuleSet(allowedCharacterSet, quotationConfig, pairedPunctuationConfig);

    // ensure that we get the right type of checkers
    expect(ruleSet.createSelectedDiagnosticProviders(stubDocumentManager, [RuleType.AllowedCharacters])[0].id).toEqual(
      'allowed-character-set-checker',
    );
    expect(
      ruleSet.createSelectedDiagnosticProviders(stubDocumentManager, [RuleType.QuotationMarkPairing])[0].id,
    ).toEqual('quotation-mark-checker');
    expect(ruleSet.createSelectedDiagnosticProviders(stubDocumentManager, [RuleType.PairedPunctuation])[0].id).toEqual(
      'paired-punctuation-checker',
    );
    expect(
      ruleSet.createSelectedDiagnosticProviders(stubDocumentManager, [
        RuleType.PairedPunctuation,
        RuleType.QuotationMarkPairing,
        RuleType.AllowedCharacters,
      ])[0].id,
    ).toEqual('paired-punctuation-checker');
    expect(
      ruleSet.createSelectedDiagnosticProviders(stubDocumentManager, [
        RuleType.PairedPunctuation,
        RuleType.QuotationMarkPairing,
        RuleType.AllowedCharacters,
      ])[1].id,
    ).toEqual('quotation-mark-checker');
    expect(
      ruleSet.createSelectedDiagnosticProviders(stubDocumentManager, [
        RuleType.PairedPunctuation,
        RuleType.QuotationMarkPairing,
        RuleType.AllowedCharacters,
      ])[2].id,
    ).toEqual('allowed-character-set-checker');

    // ensure that they're the checkers we specified
    expect(
      await ruleSet
        .createSelectedDiagnosticProviders(stubDocumentManager, [RuleType.AllowedCharacters])[0]
        .getDiagnostics('A'),
    ).toHaveLength(1);
    expect(
      await ruleSet
        .createSelectedDiagnosticProviders(stubDocumentManager, [RuleType.AllowedCharacters])[0]
        .getDiagnostics('B'),
    ).toHaveLength(0);

    expect(
      await ruleSet
        .createSelectedDiagnosticProviders(stubDocumentManager, [RuleType.QuotationMarkPairing])[0]
        .getDiagnostics('\u201E\u201F'),
    ).toHaveLength(0);
    expect(
      await ruleSet
        .createSelectedDiagnosticProviders(stubDocumentManager, [RuleType.QuotationMarkPairing])[0]
        .getDiagnostics('\u201E'),
    ).toHaveLength(1);

    expect(
      await ruleSet
        .createSelectedDiagnosticProviders(stubDocumentManager, [RuleType.PairedPunctuation])[0]
        .getDiagnostics('<>'),
    ).toHaveLength(0);
    expect(
      await ruleSet
        .createSelectedDiagnosticProviders(stubDocumentManager, [RuleType.PairedPunctuation])[0]
        .getDiagnostics('<'),
    ).toHaveLength(1);
  });
});
