/**
 * plugins/custom/slash-menu/slash-menu-pinyin.ts — slash 菜单拼音匹配
 *
 * 内置紧凑拼音表仅覆盖默认中文菜单文案用字,零依赖零体积负担;
 * 未收录汉字(如自定义菜单项的生僻字)不参与拼音候选,直接子串匹配不受影响。
 * 多音字按菜单文案语境取音(如「行内代码」的「行」取 xíng)。
 */

/** 菜单文案用字拼音表(读音为该字在菜单语境下的读音)。 */
const PINYIN_BY_CHAR: Readonly<Record<string, string>> = {
  标: 'biao',
  题: 'ti',
  无: 'wu',
  序: 'xu',
  有: 'you',
  列: 'lie',
  任: 'ren',
  务: 'wu',
  表: 'biao',
  引: 'yin',
  用: 'yong',
  块: 'kuai',
  注: 'zhu',
  折: 'zhe',
  叠: 'die',
  行: 'xing',
  内: 'nei',
  代: 'dai',
  码: 'ma',
  链: 'lian',
  接: 'jie',
  普: 'pu',
  通: 'tong',
  格: 'ge',
  数: 'shu',
  据: 'ju',
  视: 'shi',
  频: 'pin',
  音: 'yin',
  网: 'wang',
  页: 'ye',
  书: 'shu',
  签: 'qian',
  第: 'di',
  三: 'san',
  嵌: 'qian',
  公: 'gong',
  式: 'shi',
  图: 'tu',
  片: 'pian',
  方: 'fang',
  入: 'ru',
  插: 'cha',
  媒: 'mei',
  体: 'ti'
};

/** 是否为 CJK 汉字(判断未收录字符是否值得留候选)。 */
const isHanChar = (char: string): boolean => /[\u4e00-\u9fff]/.test(char);

/** 拼音匹配候选:全拼串 + 首字母串(空白剔除,ASCII 原样小写保留)。 */
interface PinyinCandidates {
  /** 全拼串(如「标题 1」→ biaoti1)。 */
  full: string;
  /** 首字母串(如「标题 1」→ bt1)。 */
  initials: string;
}

/**
 * 生成文本的拼音匹配候选。
 * 已收录汉字转拼音;ASCII 原样保留;未收录汉字跳过(该字不参与拼音命中)。
 */
const buildPinyinCandidates = (text: string): PinyinCandidates => {
  let full = '';
  let initials = '';
  for (const char of text) {
    if (/\s/.test(char)) {
      continue;
    }
    const pinyin = PINYIN_BY_CHAR[char];
    if (pinyin) {
      full += pinyin;
      initials += pinyin[0];
    } else if (!isHanChar(char)) {
      const lower = char.toLowerCase();
      full += lower;
      initials += lower;
    }
  }
  return { full, initials };
};

/**
 * 判断字段是否命中查询词:直接子串,或拼音全拼/首字母子串。
 * 调用方已把查询词转为小写,text 需为原始字段文本。
 */
export const matchesSlashQuery = (text: string, normalizedQuery: string): boolean => {
  if (text.toLowerCase().includes(normalizedQuery)) {
    return true;
  }
  const { full, initials } = buildPinyinCandidates(text);
  return full.includes(normalizedQuery) || initials.includes(normalizedQuery);
};
