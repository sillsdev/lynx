import { DiagnosticProviderFactory, DocumentManager } from 'lynx-core';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { BasicCheckerConfig } from '../abstract-checker';
import { AllowedCharacterChecker } from '../allowed-character-checker';
import { AllowedCharacterSet } from './allowed-character-set';

export class RuleSet {
  constructor(private readonly allowedCharacterSet: AllowedCharacterSet) {}

  public createDiagnosticProviderFactories(
    config: () => BasicCheckerConfig,
  ): DiagnosticProviderFactory<TextDocument>[] {
    return [
      (documentManager: DocumentManager<TextDocument>) =>
        new AllowedCharacterChecker(documentManager, config, this.allowedCharacterSet),
    ];
  }
}
