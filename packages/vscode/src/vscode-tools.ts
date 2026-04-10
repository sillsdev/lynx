import type { DeepAgentToolDefinition } from '@sillsdev/lynx-deep-agent';
import * as vscode from 'vscode';
import { z } from 'zod';

const positionSchema = z.object({ line: z.number(), character: z.number() });
const rangeSchema = z.object({ start: positionSchema, end: positionSchema });

export function createVscodeContextTools(): DeepAgentToolDefinition[] {
  return [
    {
      name: 'get_active_selection',
      description:
        'Returns the selected text and its range in the active editor. Returns empty text if there is no selection.',
      schema: z.object({}),
      execute(_args: unknown) {
        const editor = vscode.window.activeTextEditor;
        if (editor == null) {
          return Promise.resolve(JSON.stringify({ error: 'No active editor.' }));
        }
        const { selection } = editor;
        return Promise.resolve(
          JSON.stringify({
            text: editor.document.getText(selection),
            start: { line: selection.start.line, character: selection.start.character },
            end: { line: selection.end.line, character: selection.end.character },
          }),
        );
      },
    },
    {
      name: 'edit_document',
      description:
        'Applies a list of text edits to a document. Each edit replaces the text in a range with new text. Use this tool to make changes to documents instead of `edit_file`.',
      schema: z.object({
        uri: z.string().describe('The URI of the document to edit.'),
        edits: z
          .array(
            z.object({
              range: rangeSchema.describe('The range of text to replace.'),
              newText: z.string().describe('The replacement text.'),
            }),
          )
          .describe('The text edits to apply.'),
      }),
      async execute({
        uri,
        edits,
      }: {
        uri: string;
        edits: {
          range: { start: { line: number; character: number }; end: { line: number; character: number } };
          newText: string;
        }[];
      }) {
        const docUri = vscode.Uri.parse(uri);
        const wsEdit = new vscode.WorkspaceEdit();
        wsEdit.set(
          docUri,
          edits.map(
            (e) =>
              new vscode.TextEdit(
                new vscode.Range(
                  new vscode.Position(e.range.start.line, e.range.start.character),
                  new vscode.Position(e.range.end.line, e.range.end.character),
                ),
                e.newText,
              ),
          ),
        );
        const success = await vscode.workspace.applyEdit(wsEdit);
        return JSON.stringify({ success });
      },
    },
  ];
}
