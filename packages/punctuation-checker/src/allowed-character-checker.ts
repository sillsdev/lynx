import { Diagnostic, DocumentManager } from "lynx-core";
import { DiagnosticFix } from "lynx-core/src/diagnostic/diagnostic-fix";
import { TextDocument } from "vscode-languageserver-textdocument";
import { AbstractChecker, BasicCheckerConfig } from "./abstract-checker";
import { AllowedCharacterSet } from "./rule-set/allowed-character-set";
import { DiagnosticFactory } from "./diagnostic-factory";

export class AllowedCharacterChecker extends AbstractChecker {

    constructor(documentManager: DocumentManager<TextDocument>,
                config: () => BasicCheckerConfig,
                private readonly allowedCharacterSet: AllowedCharacterSet) {
      super('allowed-character-set-checker', documentManager, config);
    }

    protected validateTextDocument(textDocument: TextDocument): Diagnostic[] {
      const settings: BasicCheckerConfig = this.config();
      const diagnosticFactory: DiagnosticFactory = new DiagnosticFactory(this.id, textDocument);

      throw new Error("Method not implemented.");
    }
    protected getFixes(textDocument: TextDocument, diagnostic: Diagnostic): DiagnosticFix[] {
        throw new Error("Method not implemented.");
    }
    
}

class AllowedCharacterIssueFinder {
   
  public produceDiagnostics(textDocument: TextDocument) {
    
  }
}