import { Diagnostic, DiagnosticFix } from '@sillsdev/lynx';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StandardFixes {
  public static punctuationRemovalFix(diagnostic: Diagnostic): DiagnosticFix {
    return {
      title: `Delete punctuation mark`,
      isPreferred: false,
      diagnostic,
      edits: [
        {
          range: diagnostic.range,
          newText: '',
        },
      ],
    };
  }

  public static punctuationReplacementFix(diagnostic: Diagnostic, replacementCharacter: string): DiagnosticFix {
    return {
      title: `Replace this character with ${replacementCharacter}`,
      isPreferred: true,
      diagnostic,
      edits: [
        {
          range: diagnostic.range,
          newText: replacementCharacter,
        },
      ],
    };
  }
}
