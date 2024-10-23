import { DiagnosticProviderFactory, DocumentManager } from 'lynx-core';
import { AllowedCharacterChecker } from '../allowed-character-checker';
import { AllowedCharacterSet } from './allowed-character-set';
import { BasicCheckerConfig } from '../abstract-checker';
import { TextDocument } from 'vscode-languageserver-textdocument';

export enum RuleType {
  AllowedCharacters = 1,
}

export class RuleSet {
  constructor(private readonly allowedCharacterSet: AllowedCharacterSet) {}

  public createDiagnosticProviderFactories(
    config: () => BasicCheckerConfig,
  ): DiagnosticProviderFactory<TextDocument>[] {
    return [this.createAllowedCharacterChecker(config)];
  }

  public createSelectedDiagnosticProviderFactories(
    config: () => BasicCheckerConfig,
    selectedRules: RuleType[],
  ): DiagnosticProviderFactory<TextDocument>[] {
    const diagnosticProviderFactories: DiagnosticProviderFactory<TextDocument>[] = [];

    for (const rule of selectedRules) {
      switch (rule) {
        case RuleType.AllowedCharacters:
          diagnosticProviderFactories.push(this.createAllowedCharacterChecker(config));
      }
    }

    return diagnosticProviderFactories;
  }

  private createAllowedCharacterChecker(config: () => BasicCheckerConfig): DiagnosticProviderFactory<TextDocument> {
    return (documentManager: DocumentManager<TextDocument>) =>
      new AllowedCharacterChecker(documentManager, config, this.allowedCharacterSet);
  }

  _getAllowedCharacterSet(): AllowedCharacterSet {
    return this.allowedCharacterSet;
  }
}
