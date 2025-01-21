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
import { WhitespaceConfig } from './whitespace-config';
import { WhitespaceIssueFinderFactory } from './whitespace-issue-finder';

export const WHITESPACE_CHECKER_LOCALIZER_NAMESPACE = 'whitespace';

export class WhitespaceChecker<T extends TextDocument | ScriptureDocument> extends AbstractChecker<T> {
  constructor(
    private readonly localizer: Localizer,
    documentAccessor: DocumentAccessor<T>,
    _editFactory: EditFactory<T>,
    whitespaceConfig: WhitespaceConfig,
  ) {
    super(
      'allowed-character-set-checker',
      documentAccessor,
      new WhitespaceIssueFinderFactory(localizer, whitespaceConfig),
    );
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
  }

  protected getFixes(_document: T, _diagnostic: Diagnostic): DiagnosticFix[] {
    // no fixes available for disallowed characters
    return [];
  }
}
