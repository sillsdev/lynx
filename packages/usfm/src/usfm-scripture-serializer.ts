import {
  ScriptureBook,
  ScriptureCell,
  ScriptureChapter,
  ScriptureCharacterStyle,
  ScriptureDocument,
  ScriptureMilestone,
  ScriptureNode,
  ScriptureNote,
  ScriptureOptBreak,
  ScriptureParagraph,
  ScriptureRef,
  ScriptureRow,
  ScriptureSerializer,
  ScriptureSidebar,
  ScriptureTable,
  ScriptureText,
  ScriptureVerse,
} from '@sillsdev/lynx';
import { UsfmAttribute, UsfmStylesheet, UsfmToken, UsfmTokenizer, UsfmTokenType } from '@sillsdev/machine/corpora';

export class UsfmScriptureSerializer implements ScriptureSerializer {
  private readonly tokenizer: UsfmTokenizer;

  constructor(private readonly stylesheet: UsfmStylesheet) {
    this.tokenizer = new UsfmTokenizer(stylesheet);
  }

  serialize(nodes: ScriptureNode[] | ScriptureNode): string {
    const tokens = this.toTokens(nodes, false, false);
    return this.tokenizer.detokenize(tokens, false, nodes instanceof ScriptureDocument);
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
    } else if (node instanceof ScriptureDocument) {
      yield* this.toTokens(node.children, nested, false);
    } else if (node instanceof ScriptureText) {
      let text = node.text;
      if (endOfParagraph) {
        text += ' ';
      }
      yield new UsfmToken(UsfmTokenType.Text, undefined, text);
    } else if (node instanceof ScriptureBook) {
      yield new UsfmToken(UsfmTokenType.Book, node.style, undefined, undefined, node.code);
      yield* this.toTokens(node.children, nested, false);
    } else if (node instanceof ScriptureChapter) {
      yield new UsfmToken(UsfmTokenType.Chapter, node.style, undefined, undefined, node.number);
      if (node.altNumber != null) {
        yield new UsfmToken(UsfmTokenType.Character, 'ca', undefined, 'ca*');
        yield new UsfmToken(UsfmTokenType.Text, undefined, node.altNumber);
        yield new UsfmToken(UsfmTokenType.End, 'ca*');
      }
      if (node.pubNumber != null) {
        yield new UsfmToken(UsfmTokenType.Paragraph, 'cp');
        yield new UsfmToken(UsfmTokenType.Text, undefined, node.pubNumber);
      }
    } else if (node instanceof ScriptureParagraph) {
      yield new UsfmToken(UsfmTokenType.Paragraph, node.style, undefined, node.style + '*');
      yield* this.toTokens(node.children, nested, true);
    } else if (node instanceof ScriptureVerse) {
      yield new UsfmToken(UsfmTokenType.Verse, node.style, undefined, undefined, node.number);
      if (node.altNumber != null) {
        yield new UsfmToken(UsfmTokenType.Character, 'va', undefined, 'va*');
        yield new UsfmToken(UsfmTokenType.Text, undefined, node.altNumber);
        yield new UsfmToken(UsfmTokenType.End, 'va*');
      }
      if (node.pubNumber != null) {
        yield new UsfmToken(UsfmTokenType.Character, 'vp', undefined, 'vp*');
        yield new UsfmToken(UsfmTokenType.Text, undefined, node.pubNumber);
        yield new UsfmToken(UsfmTokenType.End, 'vp*');
      }
    } else if (node instanceof ScriptureCharacterStyle) {
      let marker = node.style;
      if (nested) {
        marker = '+' + marker;
      }
      const token = new UsfmToken(UsfmTokenType.Character, marker, undefined, marker + '*');
      const attributes: UsfmAttribute[] = [];
      for (const key in node.attributes) {
        const value = node.attributes[key];
        attributes.push(new UsfmAttribute(key, value));
      }
      if (attributes.length > 0) {
        const attrToken = new UsfmToken(UsfmTokenType.Attribute, marker);
        const tag = this.stylesheet.getTag(node.style);
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
    } else if (node instanceof ScriptureMilestone) {
      let type: UsfmTokenType;
      let endMarker: string | undefined;
      if (node.isStart) {
        type = UsfmTokenType.Milestone;
        const tag = this.stylesheet.getTag(node.style);
        endMarker = tag.endMarker;
      } else {
        type = UsfmTokenType.MilestoneEnd;
        endMarker = undefined;
      }
      yield new UsfmToken(type, node.style, undefined, endMarker);
    } else if (node instanceof ScriptureNote) {
      yield new UsfmToken(UsfmTokenType.Note, node.style, undefined, node.style + '*', node.caller);
      if (node.category != null) {
        yield new UsfmToken(UsfmTokenType.Character, 'cat', undefined, 'cat*');
        yield new UsfmToken(UsfmTokenType.Text, undefined, node.category);
        yield new UsfmToken(UsfmTokenType.End, 'cat*');
      }
      yield* this.toTokens(node.children, nested, endOfParagraph);
    } else if (node instanceof ScriptureRef) {
      yield new UsfmToken(UsfmTokenType.Character, 'ref', undefined, 'ref*');
      yield new UsfmToken(UsfmTokenType.Text, undefined, `${node.display}|${node.target}`);
      yield new UsfmToken(UsfmTokenType.End, 'ref*');
    } else if (node instanceof ScriptureOptBreak) {
      yield new UsfmToken(UsfmTokenType.Text, undefined, '\\');
    } else if (node instanceof ScriptureSidebar) {
      yield new UsfmToken(UsfmTokenType.Paragraph, node.style);
      if (node.category != null) {
        yield new UsfmToken(UsfmTokenType.Character, 'esbc', undefined, 'esbc*');
        yield new UsfmToken(UsfmTokenType.Text, undefined, node.category);
        yield new UsfmToken(UsfmTokenType.End, 'esbc*');
      }
      yield* this.toTokens(node.children, nested, true);
    } else if (node instanceof ScriptureTable) {
      yield* this.toTokens(node.children, nested, false);
    } else if (node instanceof ScriptureRow) {
      yield new UsfmToken(UsfmTokenType.Paragraph, 'tr');
      yield* this.toTokens(node.children, nested, true);
    } else if (node instanceof ScriptureCell) {
      let marker = node.style;
      if (node.colSpan > 0) {
        marker += '-' + node.colSpan.toString();
      }
      yield new UsfmToken(UsfmTokenType.Character, marker);
      yield* this.toTokens(node.children, nested, endOfParagraph);
    }
  }
}
