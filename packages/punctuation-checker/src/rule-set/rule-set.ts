import { DiagnosticProvider, DocumentManager, TextDocument } from '@sillsdev/lynx';

import { AllowedCharacterChecker } from '../allowed-character-checker';
import { AllowedCharacterSet } from './allowed-character-set';

export enum RuleType {
  AllowedCharacters = 1,
}

export class RuleSet {
  constructor(private readonly allowedCharacterSet: AllowedCharacterSet) {}

  public createDiagnosticProviders(documentManager: DocumentManager<TextDocument>): DiagnosticProvider[] {
    return [this.createAllowedCharacterChecker(documentManager)];
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
      }
    }

    return diagnosticProviderFactories;
  }

  private createAllowedCharacterChecker(documentManager: DocumentManager<TextDocument>): DiagnosticProvider {
    return new AllowedCharacterChecker(documentManager, this.allowedCharacterSet);
  }

  _getAllowedCharacterSet(): AllowedCharacterSet {
    return this.allowedCharacterSet;
  }
}
