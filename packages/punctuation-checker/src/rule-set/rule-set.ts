import { DiagnosticProvider, DocumentManager } from "lynx-core";
import { AllowedCharacterChecker } from "../allowed-character-checker";
import { AllowedCharacterSet } from "./allowed-character-set";
import { BasicCheckerConfig } from "../abstract-checker";
import { TextDocument } from "vscode-languageserver-textdocument";

export class RuleSet {

    constructor(private readonly allowedCharacterSet: AllowedCharacterSet) {

    }

    public createDiagnosticProviders(documentManager: DocumentManager<TextDocument>,
                                     config: () => BasicCheckerConfig): DiagnosticProvider[] {
        return [
            new AllowedCharacterChecker(documentManager, config, this.allowedCharacterSet),
        ]
    }
}