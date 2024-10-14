import { Diagnostic } from 'lynx-core';
import { DiagnosticFix } from 'lynx-core/src/diagnostic/diagnostic-fix';
import { TextDocument } from 'vscode-languageserver-textdocument';

export class StandardFixes {

  public static punctuationRemovalFix(textDocument: TextDocument, diagnostic: Diagnostic): DiagnosticFix {
    return {
      title: `Delete punctuation mark`,
      isPreferred: true,
      diagnostic,
      edits: [
        {
          range: diagnostic.range,
          newText: "",
        },
      ],
    };
  }
}