import {
  Diagnostic,
  DiagnosticFix,
  DocumentAccessor,
  EditFactory,
  Localizer,
  ScriptureDocument,
  TextDocument,
} from '@sillsdev/lynx';

import { AbstractChecker } from '../abstract-checker';
import { StandardFixProvider, StandardFixProviderFactory } from '../fixes/standard-fixes';
import { WhitespaceConfig } from './whitespace-config';
import { WhitespaceDiagnosticData, WhitespaceIssueFinderFactory } from './whitespace-issue-finder';

export const WHITESPACE_CHECKER_LOCALIZER_NAMESPACE = 'whitespace';
export const LEADING_WHITESPACE_DIAGNOSTIC_CODE = 'incorrect-leading-whitespace';
export const TRAILING_WHITESPACE_DIAGNOSTIC_CODE = 'incorrect-trailing-whitespace';

export class WhitespaceChecker<T extends TextDocument | ScriptureDocument> extends AbstractChecker<T> {
  private readonly standardFixProviderFactory: StandardFixProviderFactory<T>;

  constructor(
    private readonly localizer: Localizer,
    documentAccessor: DocumentAccessor<T>,
    editFactory: EditFactory<T>,
    whitespaceConfig: WhitespaceConfig,
  ) {
    super('whitespace-checker', documentAccessor, new WhitespaceIssueFinderFactory(localizer, whitespaceConfig));
    this.standardFixProviderFactory = new StandardFixProviderFactory<T>(editFactory, localizer);
  }

  async init(): Promise<void> {
    await super.init();

    // Ideally, we'd like to be able to inject an initialization function, so that
    // tests can provide different messages, but due to the way variable dynamic imports
    // work, the namespace loading function can only appear in this file at this location
    if (!this.localizer.hasNamespace(WHITESPACE_CHECKER_LOCALIZER_NAMESPACE)) {
      this.localizer.addNamespace(
        WHITESPACE_CHECKER_LOCALIZER_NAMESPACE,
        (language: string) => import(`./locales/${language}.json`, { with: { type: 'json' } }),
      );
    }

    await this.standardFixProviderFactory.init();
  }

  protected getFixes(document: T, diagnostic: Diagnostic): DiagnosticFix[] {
    if ((diagnostic.data as WhitespaceDiagnosticData).isSpaceAllowed) {
      const standardFixProvider: StandardFixProvider<T> =
        this.standardFixProviderFactory.createStandardFixProvider(document);

      switch (diagnostic.code) {
        case LEADING_WHITESPACE_DIAGNOSTIC_CODE: {
          return [standardFixProvider.leadingSpaceInsertionFix(diagnostic)];
          break;
        }
        case TRAILING_WHITESPACE_DIAGNOSTIC_CODE: {
          return [standardFixProvider.trailingSpaceInsertionFix(diagnostic)];
          break;
        }
      }
    }
    return [];
  }
}
