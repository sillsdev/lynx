import {
  Diagnostic,
  DiagnosticFix,
  DocumentAccessor,
  EditFactory,
  Localizer,
  ScriptureDocument,
  TextDocument,
  TextEdit,
} from '@sillsdev/lynx';

import { AbstractChecker } from '../abstract-checker';
import { StandardFixProvider, StandardFixProviderFactory } from '../fixes/standard-fixes';
import { PunctuationContextConfig } from './punctuation-context-config';
import { PunctuationContextIssueFinderFactory, WhitespaceDiagnosticData } from './punctuation-context-issue-finder';

export const PUNCTUATION_CONTEXT_CHECKER_LOCALIZER_NAMESPACE = 'punctuation-context';
export const LEADING_CONTEXT_DIAGNOSTIC_CODE = 'incorrect-leading-context';
export const TRAILING_CONTEXT_DIAGNOSTIC_CODE = 'incorrect-trailing-context';

export class PunctuationContextChecker<
  TDoc extends TextDocument | ScriptureDocument,
  TEdit = TextEdit,
> extends AbstractChecker<TDoc, TEdit> {
  private readonly standardFixProviderFactory: StandardFixProviderFactory<TDoc, TEdit>;

  constructor(
    private readonly localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
    editFactory: EditFactory<TDoc, TEdit>,
    punctuationContextConfig: PunctuationContextConfig,
  ) {
    super(
      'punctuation-context-checker',
      documentAccessor,
      new PunctuationContextIssueFinderFactory(localizer, punctuationContextConfig),
    );
    this.standardFixProviderFactory = new StandardFixProviderFactory<TDoc, TEdit>(editFactory, localizer);
  }

  async init(): Promise<void> {
    await super.init();

    // Ideally, we'd like to be able to inject an initialization function, so that
    // tests can provide different messages, but due to the way variable dynamic imports
    // work, the namespace loading function can only appear in this file at this location
    this.localizer.addNamespace(
      PUNCTUATION_CONTEXT_CHECKER_LOCALIZER_NAMESPACE,
      (language: string) => import(`./locales/${language}.json`, { with: { type: 'json' } }),
    );

    await this.standardFixProviderFactory.init();
  }

  protected getFixes(document: TDoc, diagnostic: Diagnostic): DiagnosticFix<TEdit>[] {
    // The only fix we offer is to insert a space
    if (!(diagnostic.data as WhitespaceDiagnosticData).isSpaceAllowed) {
      return [];
    }

    const standardFixProvider: StandardFixProvider<TDoc, TEdit> =
      this.standardFixProviderFactory.createStandardFixProvider(document);

    switch (diagnostic.code) {
      case LEADING_CONTEXT_DIAGNOSTIC_CODE: {
        return [standardFixProvider.leadingSpaceInsertionFix(diagnostic)];
      }
      case TRAILING_CONTEXT_DIAGNOSTIC_CODE: {
        return [standardFixProvider.trailingSpaceInsertionFix(diagnostic)];
      }
    }
    return [];
  }
}
