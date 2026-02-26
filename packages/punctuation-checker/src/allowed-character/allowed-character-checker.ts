import {
  Diagnostic,
  DiagnosticAction,
  DocumentAccessor,
  Localizer,
  ScriptureDocument,
  TextDocument,
  TextEdit,
} from '@sillsdev/lynx';

import { AbstractChecker } from '../abstract-checker';
import { createLocaleLoader } from '../utils/locale-loader';
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

    this.localizer.addNamespace(ALLOWED_CHARACTER_CHECKER_LOCALIZER_NAMESPACE, createLocaleLoader('allowed-character'));
  }

  protected getFixes(_document: TDoc, _diagnostic: Diagnostic): DiagnosticAction<TEdit>[] {
    // no fixes available for disallowed characters
    return [];
  }
}
