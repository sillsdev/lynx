import { CharacterRegexWhitelist } from './allowed-character-set';
import { RuleSet } from './rule-set';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StandardRuleSets {
  public static English = new RuleSet(
    new CharacterRegexWhitelist(/[A-Za-z0-9.,?/:;()\u201C\u201D\u2018\u2019'\-! \r\n\t]/),
  );
}
