import {
  DiagnosticProvider,
  DocumentAccessor,
  EditFactory,
  Localizer,
  OnTypeFormattingProvider,
  ScriptureDocument,
  TextDocument,
} from '@sillsdev/lynx';

import { AllowedCharacterChecker } from '../allowed-character/allowed-character-checker';
import { AllowedCharacterSet } from '../allowed-character/allowed-character-set';
import { PairedPunctuationChecker } from '../paired-punctuation/paired-punctuation-checker';
import { PairedPunctuationConfig } from '../paired-punctuation/paired-punctuation-config';
import { QuotationChecker } from '../quotation/quotation-checker';
import { QuotationConfig } from '../quotation/quotation-config';
import { QuotationCorrector } from '../quotation/quotation-corrector';
import { WhitespaceChecker } from '../whitespace/whitespace-checker';
import { WhitespaceConfig } from '../whitespace/whitespace-config';

export enum RuleType {
  AllowedCharacters = 1,
  QuotationMarkPairing = 2,
  PairedPunctuation = 3,
  Whitespace = 4,
}

export class RuleSet {
  constructor(
    private readonly allowedCharacterSet: AllowedCharacterSet,
    private readonly quotationConfig: QuotationConfig,
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
    private readonly whitespaceConfig: WhitespaceConfig,
  ) {}

  public createDiagnosticProviders<T extends TextDocument | ScriptureDocument>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<T>,
    editFactory: EditFactory<T>,
  ): DiagnosticProvider[] {
    return [
      this.createAllowedCharacterChecker(localizer, documentAccessor),
      this.createQuotationChecker(localizer, documentAccessor, editFactory),
      this.createPairedPunctuationChecker(localizer, documentAccessor, editFactory),
      this.createWhitespaceChecker(localizer, documentAccessor, editFactory),
    ];
  }

  public createSelectedDiagnosticProviders<T extends TextDocument | ScriptureDocument>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<T>,
    editFactory: EditFactory<T>,
    selectedRules: RuleType[],
  ): DiagnosticProvider[] {
    const diagnosticProviderFactories: DiagnosticProvider[] = [];

    for (const rule of selectedRules) {
      switch (rule) {
        case RuleType.AllowedCharacters:
          diagnosticProviderFactories.push(this.createAllowedCharacterChecker(localizer, documentAccessor));
          break;
        case RuleType.QuotationMarkPairing:
          diagnosticProviderFactories.push(this.createQuotationChecker(localizer, documentAccessor, editFactory));
          break;
        case RuleType.PairedPunctuation:
          diagnosticProviderFactories.push(
            this.createPairedPunctuationChecker(localizer, documentAccessor, editFactory),
          );
          break;
        case RuleType.Whitespace:
          diagnosticProviderFactories.push(this.createWhitespaceChecker(localizer, documentAccessor, editFactory));
          break;
      }
    }

    return diagnosticProviderFactories;
  }

  private createAllowedCharacterChecker<T extends TextDocument | ScriptureDocument>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<T>,
  ): DiagnosticProvider {
    return new AllowedCharacterChecker(localizer, documentAccessor, this.allowedCharacterSet);
  }

  private createQuotationChecker<T extends TextDocument | ScriptureDocument>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<T>,
    editFactory: EditFactory<T>,
  ): DiagnosticProvider {
    return new QuotationChecker(localizer, documentAccessor, editFactory, this.quotationConfig);
  }

  private createPairedPunctuationChecker<T extends TextDocument | ScriptureDocument>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<T>,
    editFactory: EditFactory<T>,
  ): DiagnosticProvider {
    return new PairedPunctuationChecker<T>(localizer, documentAccessor, editFactory, this.pairedPunctuationConfig);
  }

  private createWhitespaceChecker<T extends TextDocument | ScriptureDocument>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<T>,
    editFactory: EditFactory<T>,
  ): DiagnosticProvider {
    return new WhitespaceChecker<T>(localizer, documentAccessor, editFactory, this.whitespaceConfig);
  }

  public createOnTypeFormattingProviders<T extends TextDocument | ScriptureDocument>(
    documentAccessor: DocumentAccessor<T>,
    editFactory: EditFactory<T>,
  ): OnTypeFormattingProvider[] {
    return [this.createQuoteCorrector(documentAccessor, editFactory)];
  }

  private createQuoteCorrector<T extends TextDocument | ScriptureDocument>(
    documentAccessor: DocumentAccessor<T>,
    editFactory: EditFactory<T>,
  ): OnTypeFormattingProvider {
    return new QuotationCorrector(documentAccessor, editFactory, this.quotationConfig);
  }

  _getAllowedCharacterSet(): AllowedCharacterSet {
    return this.allowedCharacterSet;
  }

  _getQuotationConfig(): QuotationConfig {
    return this.quotationConfig;
  }

  _getPairedPunctuationConfig(): PairedPunctuationConfig {
    return this.pairedPunctuationConfig;
  }

  _getWhitespaceConfig(): WhitespaceConfig {
    return this.whitespaceConfig;
  }
}
