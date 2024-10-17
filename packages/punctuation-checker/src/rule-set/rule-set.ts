import { DiagnosticProvider, DocumentManager, TextDocument } from '@sillsdev/lynx';

import { AllowedCharacterChecker } from '../allowed-character-checker';
import { AllowedCharacterSet } from './allowed-character-set';

export class RuleSet {
  constructor(private readonly allowedCharacterSet: AllowedCharacterSet) {}

  public createDiagnosticProviders(documentManager: DocumentManager<TextDocument>): DiagnosticProvider[] {
    return [new AllowedCharacterChecker(documentManager, this.allowedCharacterSet)];
  }
}
