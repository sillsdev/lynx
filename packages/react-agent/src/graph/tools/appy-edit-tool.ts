import { StructuredTool, tool } from '@langchain/core/tools';
import { z } from 'zod';

export function createApplyEditTool(applyEdit: (uri: string, edits: unknown[]) => Promise<void>): StructuredTool {
  const positionSchema = z.object({ line: z.number(), character: z.number() });
  const rangeSchema = z.object({ start: positionSchema, end: positionSchema });
  return tool(
    async ({ uri, edits }) => {
      await applyEdit(uri, edits);
      return JSON.stringify({ success: true });
    },
    {
      name: 'apply_edit',
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
    },
  );
}
