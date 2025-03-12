import {
  DiagnosticProvider,
  DocumentAccessor,
  EditFactory,
  Localizer,
  OnTypeFormattingProvider,
  ScriptureDocument,
  TextDocument,
  TextEdit,
} from '@sillsdev/lynx';

import { AllowedCharacterChecker } from '../allowed-character/allowed-character-checker';
import { AllowedCharacterSet } from '../allowed-character/allowed-character-set';
import { PairedPunctuationChecker } from '../paired-punctuation/paired-punctuation-checker';
import { PairedPunctuationConfig } from '../paired-punctuation/paired-punctuation-config';
import { PunctuationContextChecker } from '../punctuation-context/punctuation-context-checker';
import { PunctuationContextConfig } from '../punctuation-context/punctuation-context-config';
import { QuotationChecker } from '../quotation/quotation-checker';
import { QuotationConfig } from '../quotation/quotation-config';
import { QuotationCorrector } from '../quotation/quotation-corrector';

export enum RuleType {
  AllowedCharacters = 1,
  QuotationMarkPairing = 2,
  PairedPunctuation = 3,
  PunctuationContext = 4,
}

export class RuleSet {
  constructor(
    private readonly allowedCharacterSet: AllowedCharacterSet,
    private readonly quotationConfig: QuotationConfig,
    private readonly pairedPunctuationConfig: PairedPunctuationConfig,
    private readonly punctuationContextConfig: PunctuationContextConfig,
  ) {}

  public createDiagnosticProviders<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
    editFactory: EditFactory<TDoc, TEdit>,
  ): DiagnosticProvider<TEdit>[] {
    return [
      this.createAllowedCharacterChecker(localizer, documentAccessor),
      this.createQuotationChecker(localizer, documentAccessor, editFactory),
      this.createPairedPunctuationChecker(localizer, documentAccessor, editFactory),
      this.createPunctuationContextChecker(localizer, documentAccessor, editFactory),
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
        case RuleType.PunctuationContext:
          diagnosticProviderFactories.push(
            this.createPunctuationContextChecker(localizer, documentAccessor, editFactory),
          );
          break;
      }
    }

    return diagnosticProviderFactories;
  }

  private createAllowedCharacterChecker<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
  ): DiagnosticProvider<TEdit> {
    return new AllowedCharacterChecker<TDoc, TEdit>(localizer, documentAccessor, this.allowedCharacterSet);
  }

  private createQuotationChecker<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
    editFactory: EditFactory<TDoc, TEdit>,
  ): DiagnosticProvider<TEdit> {
    return new QuotationChecker<TDoc, TEdit>(localizer, documentAccessor, editFactory, this.quotationConfig);
  }

  private createPairedPunctuationChecker<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
    editFactory: EditFactory<TDoc, TEdit>,
  ): DiagnosticProvider<TEdit> {
    return new PairedPunctuationChecker<TDoc, TEdit>(
      localizer,
      documentAccessor,
      editFactory,
      this.pairedPunctuationConfig,
    );
  }

  private createPunctuationContextChecker<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
    editFactory: EditFactory<TDoc, TEdit>,
  ): DiagnosticProvider<TEdit> {
    return new PunctuationContextChecker<TDoc, TEdit>(
      localizer,
      documentAccessor,
      editFactory,
      this.punctuationContextConfig,
    );
  }

  public createOnTypeFormattingProviders<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>(
    documentAccessor: DocumentAccessor<TDoc>,
    editFactory: EditFactory<TDoc, TEdit>,
  ): OnTypeFormattingProvider<TEdit>[] {
    return [this.createQuoteCorrector(documentAccessor, editFactory)];
  }

  private createQuoteCorrector<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>(
    documentAccessor: DocumentAccessor<TDoc>,
    editFactory: EditFactory<TDoc, TEdit>,
  ): OnTypeFormattingProvider<TEdit> {
    return new QuotationCorrector<TDoc, TEdit>(documentAccessor, editFactory, this.quotationConfig);
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

  _getPunctuationContextConfig(): PunctuationContextConfig {
    return this.punctuationContextConfig;
  }
}
