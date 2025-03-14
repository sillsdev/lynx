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
    validateAllDocuments = false,
  ): DiagnosticProvider<TEdit>[] {
    return [
      this.createAllowedCharacterChecker(localizer, documentAccessor, validateAllDocuments),
      this.createQuotationChecker(localizer, documentAccessor, editFactory, validateAllDocuments),
      this.createPairedPunctuationChecker(localizer, documentAccessor, editFactory, validateAllDocuments),
      this.createPunctuationContextChecker(localizer, documentAccessor, editFactory, validateAllDocuments),
    ];
  }

  public createSelectedDiagnosticProviders<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
    editFactory: EditFactory<TDoc, TEdit>,
    selectedRules: RuleType[],
    validateAllDocuments = false,
  ): DiagnosticProvider<TEdit>[] {
    const diagnosticProviderFactories: DiagnosticProvider<TEdit>[] = [];

    for (const rule of selectedRules) {
      switch (rule) {
        case RuleType.AllowedCharacters:
          diagnosticProviderFactories.push(
            this.createAllowedCharacterChecker(localizer, documentAccessor, validateAllDocuments),
          );
          break;
        case RuleType.QuotationMarkPairing:
          diagnosticProviderFactories.push(
            this.createQuotationChecker(localizer, documentAccessor, editFactory, validateAllDocuments),
          );
          break;
        case RuleType.PairedPunctuation:
          diagnosticProviderFactories.push(
            this.createPairedPunctuationChecker(localizer, documentAccessor, editFactory, validateAllDocuments),
          );
          break;
        case RuleType.PunctuationContext:
          diagnosticProviderFactories.push(
            this.createPunctuationContextChecker(localizer, documentAccessor, editFactory, validateAllDocuments),
          );
          break;
      }
    }

    return diagnosticProviderFactories;
  }

  private createAllowedCharacterChecker<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
    validateAllDocuments: boolean,
  ): DiagnosticProvider<TEdit> {
    return new AllowedCharacterChecker(localizer, documentAccessor, this.allowedCharacterSet, validateAllDocuments);
  }

  private createQuotationChecker<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
    editFactory: EditFactory<TDoc, TEdit>,
    validateAllDocuments: boolean,
  ): DiagnosticProvider<TEdit> {
    return new QuotationChecker(localizer, documentAccessor, editFactory, this.quotationConfig, validateAllDocuments);
  }

  private createPairedPunctuationChecker<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
    editFactory: EditFactory<TDoc, TEdit>,
    validateAllDocuments: boolean,
  ): DiagnosticProvider<TEdit> {
    return new PairedPunctuationChecker(
      localizer,
      documentAccessor,
      editFactory,
      this.pairedPunctuationConfig,
      validateAllDocuments,
    );
  }

  private createPunctuationContextChecker<TDoc extends TextDocument | ScriptureDocument, TEdit = TextEdit>(
    localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
    editFactory: EditFactory<TDoc, TEdit>,
    validateAllDocuments: boolean,
  ): DiagnosticProvider<TEdit> {
    return new PunctuationContextChecker(
      localizer,
      documentAccessor,
      editFactory,
      this.punctuationContextConfig,
      validateAllDocuments,
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

  _getPunctuationContextConfig(): PunctuationContextConfig {
    return this.punctuationContextConfig;
  }
}
