import {
  DiagnosticProvider,
  DocumentManager,
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

export enum RuleType {
  AllowedCharacters = 1,
  QuotationMarkPairing = 2,
  PairedPunctuation = 3,
}

export class RuleSet {
  constructor(
    private readonly allowedCharacterSet: AllowedCharacterSet,
    private readonly quotationConfig: QuotationConfig,
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
  ) {}

  public createDiagnosticProviders(
    localizer: Localizer,
    documentManager: DocumentManager<TextDocument>,
  ): DiagnosticProvider[] {
    return [
      this.createAllowedCharacterChecker(localizer, documentManager),
      this.createQuotationChecker(localizer, documentManager),
      this.createPairedPunctuationChecker(localizer, documentManager),
    ];
  }

  public createSelectedDiagnosticProviders(
    localizer: Localizer,
    documentManager: DocumentManager<TextDocument | ScriptureDocument>,
    selectedRules: RuleType[],
  ): DiagnosticProvider[] {
    const diagnosticProviderFactories: DiagnosticProvider[] = [];

    for (const rule of selectedRules) {
      switch (rule) {
        case RuleType.AllowedCharacters:
          diagnosticProviderFactories.push(this.createAllowedCharacterChecker(localizer, documentManager));
          break;
        case RuleType.QuotationMarkPairing:
          diagnosticProviderFactories.push(this.createQuotationChecker(localizer, documentManager));
          break;
        case RuleType.PairedPunctuation:
          diagnosticProviderFactories.push(this.createPairedPunctuationChecker(localizer, documentManager));
          break;
      }
    }

    return diagnosticProviderFactories;
  }

  private createAllowedCharacterChecker(
    localizer: Localizer,
    documentManager: DocumentManager<TextDocument>,
  ): DiagnosticProvider {
    return new AllowedCharacterChecker(localizer, documentManager, this.allowedCharacterSet);
  }

  private createQuotationChecker(
    localizer: Localizer,
    documentManager: DocumentManager<TextDocument>,
  ): DiagnosticProvider {
    return new QuotationChecker(localizer, documentManager, this.quotationConfig);
  }

  private createPairedPunctuationChecker(
    localizer: Localizer,
    documentManager: DocumentManager<TextDocument>,
  ): DiagnosticProvider {
    return new PairedPunctuationChecker(localizer, documentManager, this.pairedPunctuationConfig);
  }

  public createOnTypeFormattingProviders(documentManager: DocumentManager<TextDocument>): OnTypeFormattingProvider[] {
    return [this.createQuoteCorrector(documentManager)];
  }

  private createQuoteCorrector(documentManager: DocumentManager<TextDocument>): OnTypeFormattingProvider {
    return new QuotationCorrector(documentManager, this.quotationConfig);
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
}
