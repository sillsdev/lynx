import { DiagnosticProvider, DocumentManager, TextDocument } from '@sillsdev/lynx';

import { AllowedCharacterChecker } from '../allowed-character/allowed-character-checker';
import { AllowedCharacterSet } from '../allowed-character/allowed-character-set';
import { PairedPunctuationChecker } from '../paired-punctuation/paired-punctuation-checker';
import { PairedPunctuationConfig } from '../paired-punctuation/paired-punctuation-config';
import { QuotationChecker } from '../quotation/quotation-checker';
import { QuotationConfig } from '../quotation/quotation-config';

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

  public createDiagnosticProviders(documentManager: DocumentManager<TextDocument>): DiagnosticProvider[] {
    return [
      this.createAllowedCharacterChecker(documentManager),
      this.createQuotationChecker(documentManager),
      this.createPairedPunctuationChecker(documentManager),
    ];
  }

  public createSelectedDiagnosticProviders(
    documentManager: DocumentManager<TextDocument>,
    selectedRules: RuleType[],
  ): DiagnosticProvider[] {
    const diagnosticProviderFactories: DiagnosticProvider[] = [];

    for (const rule of selectedRules) {
      switch (rule) {
        case RuleType.AllowedCharacters:
          diagnosticProviderFactories.push(this.createAllowedCharacterChecker(documentManager));
          break;
        case RuleType.QuotationMarkPairing:
          diagnosticProviderFactories.push(this.createQuotationChecker(documentManager));
          break;
        case RuleType.PairedPunctuation:
          diagnosticProviderFactories.push(this.createPairedPunctuationChecker(documentManager));
          break;
      }
    }

    return diagnosticProviderFactories;
  }

  private createAllowedCharacterChecker(documentManager: DocumentManager<TextDocument>): DiagnosticProvider {
    return new AllowedCharacterChecker(documentManager, this.allowedCharacterSet);
  }

  private createQuotationChecker(documentManager: DocumentManager<TextDocument>): DiagnosticProvider {
    return new QuotationChecker(documentManager, this.quotationConfig);
  }

  private createPairedPunctuationChecker(documentManager: DocumentManager<TextDocument>): DiagnosticProvider {
    return new PairedPunctuationChecker(documentManager, this.pairedPunctuationConfig);
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
