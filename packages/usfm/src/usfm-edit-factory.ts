import {
  Range,
  ScriptureBook,
  ScriptureCell,
  ScriptureChapter,
  ScriptureCharacterStyle,
  ScriptureMilestone,
  ScriptureNode,
  ScriptureNodeType,
  ScriptureNote,
  ScriptureParagraph,
  ScriptureRef,
  ScriptureSidebar,
  ScriptureText,
  ScriptureTextEditFactory,
  ScriptureVerse,
  TextEdit,
} from '@sillsdev/lynx';
import { UsfmAttribute, UsfmStylesheet, UsfmToken, UsfmTokenizer, UsfmTokenType } from '@sillsdev/machine/corpora';

import { UsfmDocument } from './usfm-document';

export class UsfmEditFactory extends ScriptureTextEditFactory<UsfmDocument> {
  private readonly tokenizer: UsfmTokenizer;

  constructor(private readonly stylesheet: UsfmStylesheet) {
    super();
    this.tokenizer = new UsfmTokenizer(stylesheet);
  }

  createScriptureEdit(document: UsfmDocument, range: Range, nodes: ScriptureNode[] | ScriptureNode): TextEdit[] {
    return this.createTextEdit(document, range, this.serialize(nodes));
  }

  private serialize(nodes: ScriptureNode[] | ScriptureNode): string {
    const tokens = this.toTokens(nodes, false, false);
    return this.tokenizer.detokenize(tokens, false, !Array.isArray(nodes) && nodes.type === ScriptureNodeType.Document);
  }

  private *toTokens(
    node: ScriptureNode | readonly ScriptureNode[],
    nested: boolean,
    endOfParagraph: boolean,
  ): Iterable<UsfmToken> {
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        yield* this.toTokens(node[i] as ScriptureNode, nested, endOfParagraph && i === node.length - 1);
      }
    } else {
      node = node as ScriptureNode;
      switch (node.type) {
        case ScriptureNodeType.Document:
          yield* this.toTokens(node.children, nested, false);
          break;

        case ScriptureNodeType.Text: {
          let text = (node as ScriptureText).text;
          if (endOfParagraph) {
            text += ' ';
          }
          yield new UsfmToken(UsfmTokenType.Text, undefined, text);
          break;
        }

        case ScriptureNodeType.Book: {
          const book = node as ScriptureBook;
          yield new UsfmToken(UsfmTokenType.Book, book.style, undefined, undefined, book.code);
          yield* this.toTokens(node.children, nested, false);
          break;
        }

        case ScriptureNodeType.Chapter: {
          const chapter = node as ScriptureChapter;
          yield new UsfmToken(UsfmTokenType.Chapter, chapter.style, undefined, undefined, chapter.number);
          if (chapter.altNumber != null) {
            yield new UsfmToken(UsfmTokenType.Character, 'ca', undefined, 'ca*');
            yield new UsfmToken(UsfmTokenType.Text, undefined, chapter.altNumber);
            yield new UsfmToken(UsfmTokenType.End, 'ca*');
          }
          if (chapter.pubNumber != null) {
            yield new UsfmToken(UsfmTokenType.Paragraph, 'cp');
            yield new UsfmToken(UsfmTokenType.Text, undefined, chapter.pubNumber);
          }
          break;
        }

        case ScriptureNodeType.Paragraph: {
          const paragraph = node as ScriptureParagraph;
          yield new UsfmToken(UsfmTokenType.Paragraph, paragraph.style, undefined, paragraph.style + '*');
          yield* this.toTokens(node.children, nested, true);
          break;
        }

        case ScriptureNodeType.Verse: {
          const verse = node as ScriptureVerse;
          yield new UsfmToken(UsfmTokenType.Verse, verse.style, undefined, undefined, verse.number);
          if (verse.altNumber != null) {
            yield new UsfmToken(UsfmTokenType.Character, 'va', undefined, 'va*');
            yield new UsfmToken(UsfmTokenType.Text, undefined, verse.altNumber);
            yield new UsfmToken(UsfmTokenType.End, 'va*');
          }
          if (verse.pubNumber != null) {
            yield new UsfmToken(UsfmTokenType.Character, 'vp', undefined, 'vp*');
            yield new UsfmToken(UsfmTokenType.Text, undefined, verse.pubNumber);
            yield new UsfmToken(UsfmTokenType.End, 'vp*');
          }
          break;
        }

        case ScriptureNodeType.CharacterStyle: {
          const charStyle = node as ScriptureCharacterStyle;
          let marker = charStyle.style;
          if (nested) {
            marker = '+' + marker;
          }
          const token = new UsfmToken(UsfmTokenType.Character, marker, undefined, marker + '*');
          const attributes: UsfmAttribute[] = [];
          for (const key in charStyle.attributes) {
            const value = charStyle.attributes[key];
            attributes.push(new UsfmAttribute(key, value));
          }
          if (attributes.length > 0) {
            const attrToken = new UsfmToken(UsfmTokenType.Attribute, marker);
            const tag = this.stylesheet.getTag(charStyle.style);
            token.setAttributes(attributes, tag.defaultAttributeName);
            yield attrToken;
          }
          yield token;
          yield* this.toTokens(node.children, true, endOfParagraph);
          if (attributes.length > 0) {
            const attrToken = new UsfmToken(UsfmTokenType.Attribute, marker);
            attrToken.copyAttributes(token);
            yield attrToken;
          }
          yield new UsfmToken(UsfmTokenType.End, marker + '*');
          break;
        }

        case ScriptureNodeType.Milestone: {
          const milestone = node as ScriptureMilestone;
          let type: UsfmTokenType;
          let endMarker: string | undefined;
          if (milestone.isStart) {
            type = UsfmTokenType.Milestone;
            const tag = this.stylesheet.getTag(milestone.style);
            endMarker = tag.endMarker;
          } else {
            type = UsfmTokenType.MilestoneEnd;
            endMarker = undefined;
          }
          yield new UsfmToken(type, milestone.style, undefined, endMarker);
          break;
        }

        case ScriptureNodeType.Note: {
          const note = node as ScriptureNote;
          yield new UsfmToken(UsfmTokenType.Note, note.style, undefined, note.style + '*', note.caller);
          if (note.category != null) {
            yield new UsfmToken(UsfmTokenType.Character, 'cat', undefined, 'cat*');
            yield new UsfmToken(UsfmTokenType.Text, undefined, note.category);
            yield new UsfmToken(UsfmTokenType.End, 'cat*');
          }
          yield* this.toTokens(node.children, nested, endOfParagraph);
          break;
        }

        case ScriptureNodeType.Ref: {
          const ref = node as ScriptureRef;
          yield new UsfmToken(UsfmTokenType.Character, 'ref', undefined, 'ref*');
          yield new UsfmToken(UsfmTokenType.Text, undefined, `${ref.display}|${ref.target}`);
          yield new UsfmToken(UsfmTokenType.End, 'ref*');
          break;
        }

        case ScriptureNodeType.OptBreak:
          yield new UsfmToken(UsfmTokenType.Text, undefined, '\\');
          break;

        case ScriptureNodeType.Sidebar: {
          const sidebar = node as ScriptureSidebar;
          yield new UsfmToken(UsfmTokenType.Paragraph, sidebar.style);
          if (sidebar.category != null) {
            yield new UsfmToken(UsfmTokenType.Character, 'esbc', undefined, 'esbc*');
            yield new UsfmToken(UsfmTokenType.Text, undefined, sidebar.category);
            yield new UsfmToken(UsfmTokenType.End, 'esbc*');
          }
          yield* this.toTokens(node.children, nested, true);
          break;
        }

        case ScriptureNodeType.Table:
          yield* this.toTokens(node.children, nested, false);
          break;

        case ScriptureNodeType.Row:
          yield new UsfmToken(UsfmTokenType.Paragraph, 'tr');
          yield* this.toTokens(node.children, nested, true);
          break;

        case ScriptureNodeType.Cell: {
          const cell = node as ScriptureCell;
          let marker = cell.style;
          if (cell.colSpan > 1) {
            const cellNum = parseInt(marker.charAt(marker.length - 1));
            const endCellNum = cellNum + cell.colSpan - 1;
            marker += '-' + endCellNum.toString();
          }
          yield new UsfmToken(UsfmTokenType.Character, marker);
          yield* this.toTokens(node.children, nested, endOfParagraph);
          break;
        }
      }
    }
  }
}
