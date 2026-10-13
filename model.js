/*
 * 亲测 QinCe 1.0 — 模型本体
 *
 * 参数量：0。没有神经网络，没有权重文件。
 * 下面这张对照表就是全部模型：每个称呼对应一条“关系链”，
 * 关系链的最后一环决定性别。
 */
(function (root) {
  'use strict';

  var VERSION = '1.0';

  // 基本关系及其性别。所有结论最终都落到这 12 个词上。
  var PRIMITIVES = {
    '父亲': '男', '母亲': '女',
    '儿子': '男', '女儿': '女',
    '哥哥': '男', '弟弟': '男', '姐姐': '女', '妹妹': '女',
    '兄弟': '男', '姐妹': '女',
    '丈夫': '男', '妻子': '女'
  };

  var FLIP = {
    '父亲': '母亲', '母亲': '父亲',
    '儿子': '女儿', '女儿': '儿子',
    '哥哥': '姐姐', '姐姐': '哥哥',
    '弟弟': '妹妹', '妹妹': '弟弟',
    '兄弟': '姐妹', '姐妹': '兄弟',
    '丈夫': '妻子', '妻子': '丈夫'
  };

  // 关系链 -> 使用这条链的称呼。每组第一个是标准称呼。
  var GROUPS = [
    ['父亲', '爸爸 爸 老爸 父亲 爹 老爹 阿爸 爹地 father dad daddy papa'],
    ['母亲', '妈妈 妈 老妈 母亲 娘 阿妈 妈咪 mother mom mum mommy mama'],

    ['父亲>父亲', '爷爷 爷 祖父'],
    ['父亲>母亲', '奶奶 奶 祖母'],
    ['母亲>父亲', '姥爷 外公 外祖父'],
    ['母亲>母亲', '姥姥 外婆 外祖母'],
    ['父亲或母亲>父亲', '阿公 grandfather grandpa granddad'],
    ['父亲或母亲>母亲', '阿嬷 阿婆 grandmother grandma granny nana'],
    ['父亲>父亲>父亲', '太爷爷 曾祖父'],
    ['父亲>父亲>母亲', '太奶奶 曾祖母'],
    ['母亲>父亲或母亲>父亲', '太姥爷'],
    ['母亲>父亲或母亲>母亲', '太姥姥'],

    ['父亲>哥哥', '伯伯 伯父 伯 大伯 大爷'],
    ['父亲>弟弟', '叔叔 叔父 叔'],
    ['父亲>姐妹', '姑姑 姑妈 姑'],
    ['父亲>姐妹>丈夫', '姑父 姑丈'],
    ['父亲>哥哥>妻子', '伯母 大娘'],
    ['父亲>弟弟>妻子', '婶婶 婶子 婶'],
    ['母亲>兄弟', '舅舅 舅'],
    ['母亲>兄弟>妻子', '舅妈 舅母 妗子'],
    ['母亲>姐妹', '姨 姨妈 阿姨'],
    ['母亲>姐妹>丈夫', '姨父 姨丈'],
    ['父亲或母亲>兄弟', 'uncle'],
    ['父亲或母亲>姐妹', 'aunt auntie'],

    ['哥哥', '哥哥 哥 兄长 兄'],
    ['弟弟', '弟弟 弟'],
    ['姐姐', '姐姐 姐'],
    ['妹妹', '妹妹 妹'],
    ['兄弟', 'brother'],
    ['姐妹', 'sister'],
    ['哥哥>妻子', '嫂子 嫂嫂 嫂'],
    ['弟弟>妻子', '弟媳'],
    ['姐姐>丈夫', '姐夫'],
    ['妹妹>丈夫', '妹夫'],

    ['丈夫', '老公 丈夫 husband'],
    ['妻子', '老婆 妻子 太太 媳妇 wife'],

    ['儿子', '儿子 son'],
    ['女儿', '女儿 闺女 daughter'],
    ['儿子>儿子', '孙子'],
    ['儿子>女儿', '孙女'],
    ['女儿>儿子', '外孙'],
    ['女儿>女儿', '外孙女'],
    ['儿子或女儿>儿子', 'grandson'],
    ['儿子或女儿>女儿', 'granddaughter'],
    ['兄弟>儿子', '侄子'],
    ['兄弟>女儿', '侄女'],
    ['姐妹>儿子', '外甥'],
    ['姐妹>女儿', '外甥女'],
    ['兄弟姐妹>儿子', 'nephew'],
    ['兄弟姐妹>女儿', 'niece'],
    ['女儿>丈夫', '女婿 son-in-law'],
    ['儿子>妻子', '儿媳 儿媳妇 daughter-in-law'],

    ['丈夫>父亲', '公公'],
    ['丈夫>母亲', '婆婆'],
    ['妻子>父亲', '岳父 丈人 老丈人'],
    ['妻子>母亲', '岳母 丈母娘'],
    ['配偶>父亲', 'father-in-law'],
    ['配偶>母亲', 'mother-in-law'],
    ['妻子>兄弟', '大舅子 小舅子'],
    ['妻子>姐妹', '大姨子 小姨子'],
    ['丈夫>兄弟', '大伯子 小叔子'],
    ['丈夫>姐妹', '大姑子 小姑子'],
    ['配偶>兄弟', 'brother-in-law'],
    ['配偶>姐妹', 'sister-in-law'],
    ['妻子>姐妹>丈夫', '连襟'],
    ['丈夫>兄弟>妻子', '妯娌'],
    ['母亲>丈夫', 'stepfather stepdad'],
    ['父亲>妻子', 'stepmother stepmom'],

    ['父亲>兄弟>儿子', '堂哥 堂弟 堂兄'],
    ['父亲>兄弟>女儿', '堂姐 堂妹'],
    ['姑、舅或姨>儿子', '表哥 表弟 表兄'],
    ['姑、舅或姨>女儿', '表姐 表妹']
  ];

  // 称呼本身不带性别，模型拒答。
  var AMBIGUOUS = {
    'cousin': { reason: '英语的 cousin 不区分男女，也不区分堂表。', suggest: ['表哥', '表姐', '堂弟', '堂妹'] },
    'sibling': { reason: 'sibling 泛指兄弟姐妹，不区分男女。', suggest: ['哥哥', '妹妹'] },
    'parent': { reason: 'parent 泛指父亲或母亲。', suggest: ['爸爸', '妈妈'] },
    'child': { reason: 'child 泛指儿子或女儿。', suggest: ['儿子', '女儿'] },
    'kid': { reason: 'kid 泛指儿子或女儿。', suggest: ['儿子', '女儿'] },
    'spouse': { reason: 'spouse 泛指丈夫或妻子。', suggest: ['老公', '老婆'] },
    'partner': { reason: 'partner 不区分男女。', suggest: ['老公', '老婆'] },
    'grandparent': { reason: 'grandparent 泛指祖父母、外祖父母中的任何一位。', suggest: ['爷爷', '姥姥'] },
    'grandchild': { reason: 'grandchild 泛指孙辈。', suggest: ['孙子', '外孙女'] },
    'relative': { reason: 'relative 泛指任何亲戚。', suggest: ['二舅', '姑妈'] },
    '孩子': { reason: '“孩子”泛指儿子或女儿。', suggest: ['儿子', '女儿'] },
    '小孩': { reason: '“小孩”泛指儿子或女儿。', suggest: ['儿子', '女儿'] },
    '宝宝': { reason: '“宝宝”不区分男女。', suggest: ['儿子', '女儿'] },
    '娃': { reason: '“娃”不区分男女。', suggest: ['儿子', '女儿'] },
    '父母': { reason: '“父母”同时指父亲和母亲两个人。', suggest: ['爸爸', '妈妈'] },
    '家长': { reason: '“家长”泛指父亲或母亲。', suggest: ['爸爸', '妈妈'] },
    '亲戚': { reason: '“亲戚”泛指任何亲属。', suggest: ['二舅', '姑妈'] },
    '家属': { reason: '“家属”泛指任何家庭成员。', suggest: ['老公', '老婆'] },
    '长辈': { reason: '“长辈”泛指辈分高的任何亲属。', suggest: ['爷爷', '姑妈'] },
    '晚辈': { reason: '“晚辈”泛指辈分低的任何亲属。', suggest: ['侄子', '外甥女'] },
    '兄弟姐妹': { reason: '“兄弟姐妹”包含四种亲属，男女都有。', suggest: ['哥哥', '妹妹'] },
    '表亲': { reason: '“表亲”泛指表兄弟姐妹。', suggest: ['表哥', '表妹'] },
    '堂亲': { reason: '“堂亲”泛指堂兄弟姐妹。', suggest: ['堂哥', '堂妹'] },
    '爱人': { reason: '“爱人”可以指丈夫，也可以指妻子。', suggest: ['老公', '老婆'] },
    '对象': { reason: '“对象”不区分男女。', suggest: ['老公', '老婆'] },
    '配偶': { reason: '“配偶”可以指丈夫，也可以指妻子。', suggest: ['老公', '老婆'] },
    '伴侣': { reason: '“伴侣”不区分男女。', suggest: ['老公', '老婆'] },
    '亲家': { reason: '“亲家”泛指子女配偶的父母，男女都有。', suggest: ['公公', '岳母'] },
    '弟妹': { reason: '“弟妹”可能指弟弟的妻子，也可能指弟弟和妹妹。', suggest: ['弟媳', '妹妹'] }
  };

  var SELF = ['我', '自己', '本人', '我自己', '我本人', '你', 'me', 'myself', 'i', 'self'];

  // 可以叠在称呼前面、但不改变性别的前缀。
  var MODIFIERS = {
    '大': '表示排行', '二': '表示排行', '三': '表示排行', '四': '表示排行', '五': '表示排行',
    '六': '表示排行', '七': '表示排行', '八': '表示排行', '九': '表示排行', '十': '表示排行',
    '小': '表示排行或年纪', '幺': '表示排行', '老': '是口语前缀',
    '亲': '强调血缘', '干': '表示认的亲', '后': '表示再婚关系', '继': '表示再婚关系',
    '表': '表示表亲', '堂': '表示堂亲'
  };

  var TABLE = {};     // 称呼 -> 关系链（数组）
  var SYNONYMS = {};  // 称呼 -> 同一条关系链上的其他称呼
  var CANONICAL = { zh: {}, en: {} }; // 关系链 -> 标准称呼，中英文各一份
  GROUPS.forEach(function (g) {
    var chain = g[0].split('>');
    var terms = g[1].split(' ');
    terms.forEach(function (term) {
      TABLE[term] = chain;
      SYNONYMS[term] = terms.filter(function (other) { return other !== term; });
      var lang = /[\u4e00-\u9fff]/.test(term) ? 'zh' : 'en';
      if (!CANONICAL[lang][g[0]]) CANONICAL[lang][g[0]] = term;
    });
  });

  function normalize(input) {
    var t = String(input == null ? '' : input).trim().toLowerCase();
    t = t.replace(/[?？!！。.,，、;；:："“”'‘’()（）]/g, '');
    if (/[\u4e00-\u9fff]/.test(t)) {
      t = t.replace(/\s+/g, '');
    } else {
      t = t.replace(/\s+/g, ' ').replace(/^(my|your|his|her|our|their)\s+/, '');
      t = t.replace(/\s+in\s+law$/, '-in-law').replace(/^step[- ]/, 'step');
    }
    return t;
  }

  function stripPossessive(t) {
    var m = t.match(/^(我|你|他|她|咱|俺)(们)?(的|家)?(.+)$/);
    return m ? m[4] : t;
  }

  function genderOf(chain) {
    return PRIMITIVES[chain[chain.length - 1]];
  }

  // 找到“如果性别相反，应该叫什么”。
  function counterpart(chain, lang) {
    var canon = CANONICAL[lang] || CANONICAL.zh;
    var flipped = chain.slice();
    flipped[flipped.length - 1] = FLIP[flipped[flipped.length - 1]];
    var key = flipped.join('>');
    if (canon[key]) return canon[key];
    var loose = flipped.map(function (s) {
      return s === '哥哥' || s === '弟弟' ? '兄弟' : s === '姐姐' || s === '妹妹' ? '姐妹' : s;
    }).join('>');
    return canon[loose] || null;
  }

  function lookup(t) {
    if (Object.prototype.hasOwnProperty.call(TABLE, t)) {
      return { base: t, modifiers: [] };
    }
    // 去掉最多两层前缀再查，例如“大表哥”“二舅”“干妈”。
    var mods = [];
    var rest = t;
    for (var i = 0; i < 2; i++) {
      var head = rest.charAt(0);
      if (!MODIFIERS[head] || rest.length < 2) break;
      mods.push(head);
      rest = rest.slice(1);
      if (Object.prototype.hasOwnProperty.call(AMBIGUOUS, rest)) return null;
      if (Object.prototype.hasOwnProperty.call(TABLE, rest)) {
        return { base: rest, modifiers: mods.slice() };
      }
    }
    return null;
  }

  function predict(input) {
    var raw = String(input == null ? '' : input).trim();
    var t = normalize(raw);
    if (!t) return { status: 'empty', raw: raw, term: t };
    if (SELF.indexOf(t) !== -1) return { status: 'self', raw: raw, term: t };
    var isZh = /[\u4e00-\u9fff]/.test(t);
    if (isZh) t = stripPossessive(t);

    // 英语的 great- 每出现一次，关系链往上多一代。
    var greats = 0;
    if (!isZh) {
      var gm = t.match(/^((?:great[- ])+)(.+)$/);
      if (gm) { greats = gm[1].match(/great/g).length; t = gm[2]; }
    }

    if (Object.prototype.hasOwnProperty.call(AMBIGUOUS, t) && !Object.prototype.hasOwnProperty.call(TABLE, t)) {
      return { status: 'ambiguous', raw: raw, term: t, reason: AMBIGUOUS[t].reason, suggest: AMBIGUOUS[t].suggest };
    }

    var hit = lookup(t);
    if (!hit) return { status: 'unknown', raw: raw, term: t };

    var chain = TABLE[hit.base].slice();
    if (greats) {
      if (!/^grand/.test(hit.base)) return { status: 'unknown', raw: raw, term: t };
      var up = /^grand(son|daughter)$/.test(hit.base) ? '儿子或女儿' : '父亲或母亲';
      for (var k = 0; k < greats; k++) chain.unshift(up);
      t = new Array(greats + 1).join('great-') + t;
    }
    return {
      status: 'ok',
      raw: raw,
      term: t,
      lang: isZh ? 'zh' : 'en',
      base: hit.base,
      modifiers: hit.modifiers.map(function (m) { return { char: m, meaning: MODIFIERS[m] }; }),
      chain: chain.slice(),
      terminal: chain[chain.length - 1],
      gender: genderOf(chain),
      steps: chain.map(function (step) { return { name: step, gender: PRIMITIVES[step] || null }; }),
      synonyms: greats ? [] : SYNONYMS[hit.base].slice(),
      counterpart: greats ? null : counterpart(chain, isZh ? 'zh' : 'en')
    };
  }

  function entries() {
    return Object.keys(TABLE).map(function (term) { return [term, genderOf(TABLE[term])]; });
  }

  var api = {
    version: VERSION,
    predict: predict,
    entries: entries,
    size: Object.keys(TABLE).length,
    parameters: 0
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.QinCe = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
