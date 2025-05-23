import {
  Diagnostic,
  DiagnosticFix,
  DocumentAccessor,
  Localizer,
  ScriptureDocument,
  TextDocument,
  TextEdit,
} from '@sillsdev/lynx';

import { AbstractChecker } from '../abstract-checker';
import { AllowedCharacterIssueFinderFactory } from './allowed-character-issue-finder';
import { AllowedCharacterSet } from './allowed-character-set';

export const ALLOWED_CHARACTER_CHECKER_LOCALIZER_NAMESPACE = 'allowedCharacters';

export class AllowedCharacterChecker<
  TDoc extends TextDocument | ScriptureDocument,
  TEdit = TextEdit,
> extends AbstractChecker<TDoc, TEdit> {
  constructor(
    private readonly localizer: Localizer,
    documentAccessor: DocumentAccessor<TDoc>,
    allowedCharacterSet: AllowedCharacterSet,
    validateAllDocuments = false,
  ) {
    super(
      'allowed-character-set-checker',
      documentAccessor,
      new AllowedCharacterIssueFinderFactory(localizer, allowedCharacterSet),
      validateAllDocuments,
    );
  }

  async init(): Promise<void> {
    await super.init();

    // Ideally, we'd like to be able to inject an initialization function, so that
    // tests can provide different messages, but due to the way variable dynamic imports
    // work, the namespace loading function can only appear in this file at this location
    this.localizer.addNamespace(
      ALLOWED_CHARACTER_CHECKER_LOCALIZER_NAMESPACE,
      (language: string) => import(`./locales/${language}.json`, { with: { type: 'json' } }),
    );
  }

  protected getFixes(_document: TDoc, _diagnostic: Diagnostic): DiagnosticFix<TEdit>[] {
    // no fixes available for disallowed characters
    return [];
  }
}
