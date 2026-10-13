/* 亲测 QinCe — 页面逻辑与鉴定报告生成 */
(function () {
  'use strict';

  var Q = window.QinCe;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var form = $('#ask');
  var input = $('#term');
  var goBtn = $('#go');
  var hint = $('#ask-hint');
  var reportSection = $('#report');
  var paper = $('#paper');
  var HINT_DEFAULT = hint.textContent;
  var REPEAT = 1000;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var serial = 0;
  var busy = false;

  /* ---------- 小工具 ---------- */

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') el.className = attrs[k];
        else if (k === 'text') el.textContent = attrs[k];
        else el.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function svg(tag, attrs, children) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    (children || []).forEach(function (c) {
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function pad(n, len) { return String(n).padStart(len, '0'); }
  function fmt(n) { return n.toLocaleString('en-US'); }
  function ms(n) { return n < 0.1 ? '不到 0.1 毫秒' : '约 ' + n.toFixed(1) + ' 毫秒'; }
  function opposite(g) { return g === '男' ? '女' : '男'; }

  var FLIP = {
    '父亲': '母亲', '母亲': '父亲', '儿子': '女儿', '女儿': '儿子',
    '哥哥': '姐姐', '姐姐': '哥哥', '弟弟': '妹妹', '妹妹': '弟弟',
    '兄弟': '姐妹', '姐妹': '兄弟', '丈夫': '妻子', '妻子': '丈夫'
  };

  function reportNumber(now) {
    serial += 1;
    return 'QC-' + now.getFullYear() + pad(now.getMonth() + 1, 2) + pad(now.getDate(), 2) + '-' + pad(serial, 4);
  }

  function timeText(now) {
    return now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日 ' +
      pad(now.getHours(), 2) + ':' + pad(now.getMinutes(), 2) + ':' + pad(now.getSeconds(), 2);
  }

  /* ---------- 各项证据 ---------- */

  // 字形分析：记录在案，但不采信。
  var GLYPH = [
    { chars: '妈姥奶姑姨婶嫂姐妹婆娘媳妻婿妗嬷妯娌', says: '女', note: '含“女”字旁' },
    { chars: '女', says: '女', note: '就是“女”字' },
    { chars: '母', says: '女', note: '就是“母”字' },
    { chars: '爸爷爹', says: '男', note: '含“父”字头' },
    { chars: '父', says: '男', note: '就是“父”字' },
    { chars: '舅甥', says: '男', note: '含“男”字' },
    { chars: '男', says: '男', note: '就是“男”字' }
  ];

  function glyphEvidence(r) {
    if (r.lang !== 'zh') {
      return {
        title: '词形分析',
        tag: '不适用',
        used: false,
        paras: ['英语称呼没有偏旁部首，本项不适用。']
      };
    }
    var seen = {};
    var found = [];
    Array.from(r.term).forEach(function (ch) {
      if (seen[ch]) return;
      seen[ch] = true;
      GLYPH.forEach(function (g) {
        if (g.chars.indexOf(ch) !== -1) found.push({ ch: ch, says: g.says, note: g.note });
      });
    });
    var paras = [];
    if (!found.length) {
      paras.push('“' + r.term + '”中没有带“女”“父”“男”“母”的字，本项无线索。');
    } else {
      paras.push(found.map(function (f) { return '“' + f.ch + '”' + f.note; }).join('；') + '。');
      var agree = found.filter(function (f) { return f.says === r.gender; }).length;
      if (agree === found.length) paras.push('字形线索与结论一致。');
      else if (agree === 0) paras.push('字形线索与结论相反。');
      else paras.push('字形线索相互矛盾。');
    }
    paras.push('字形作为证据并不可靠（“女婿”两个字都带“女”）。本模型不采信字形，本项仅记录在案。');
    return { title: '字形分析', tag: '未采信', used: false, paras: paras };
  }

  function buildEvidence(r) {
    var list = [];
    var desc = r.chain.join('的');
    var opp = opposite(r.gender);

    // 1 称谓定义
    var def = r.lang === 'zh'
      ? '在汉语亲属称谓中，“' + r.base + '”的定义是：' + desc + '。'
      : '在英语亲属称谓中，“' + r.term + '”对应的关系是：' + desc + '。';
    var p1 = [def];
    r.modifiers.forEach(function (m) {
      p1.push('前缀“' + m.char + '”' + m.meaning + '，不改变性别。本报告按“' + r.base + '”处理。');
    });
    list.push({ title: '称谓定义', tag: '支持结论', used: true, paras: p1 });

    // 2 关系链推导
    list.push({
      title: '关系链推导',
      tag: '支持结论',
      used: true,
      chain: ['你'].concat(r.chain),
      steps: r.steps,
      paras: [
        '从“你”出发，经过 ' + r.chain.length + ' 步到达“' + r.terminal + '”。',
        '关系链的终点决定性别。“' + r.terminal + '”为' + r.gender + '性，中间各环的性别不影响结论。'
      ]
    });

    // 3 备择假设检验
    var flipped = r.chain.slice();
    flipped[flipped.length - 1] = FLIP[r.terminal];
    var flippedDesc = flipped.join('的');
    var p3 = ['备择假设：“' + r.term + '”为' + opp + '性。'];
    if (r.counterpart && !r.modifiers.length) {
      p3.push('在该假设下，这位亲属是' + flippedDesc + '，应称为“' + r.counterpart + '”。而送检称呼是“' + r.term + '”。');
    } else if (r.counterpart) {
      p3.push('在该假设下，这位亲属是' + flippedDesc + '，应归入“' + r.counterpart + '”一类。而送检称呼是“' + r.term + '”。');
    } else {
      p3.push('在该假设下，这位亲属是' + flippedDesc + '，不会被称为“' + r.term + '”。');
    }
    p3.push('两者不符，备择假设被排除。');
    list.push({ title: '备择假设检验', tag: '支持结论', used: true, paras: p3 });

    // 4 重复性检验（真的跑 1000 次）
    var same = 0;
    var t0 = performance.now();
    for (var i = 0; i < REPEAT; i++) {
      var again = Q.predict(r.raw);
      if (again.status === 'ok' && again.gender === r.gender) same++;
    }
    var dt = performance.now() - t0;
    list.push({
      title: '重复性检验',
      tag: same === REPEAT ? '支持结论' : '未通过',
      used: same === REPEAT,
      bar: { same: same, total: REPEAT, gender: r.gender, opp: opp },
      paras: [
        '对同一份检材独立重复推断 ' + fmt(REPEAT) + ' 次：' + r.gender + ' ' + fmt(same) + ' 次，' + opp + ' ' + fmt(REPEAT - same) + ' 次，拒答 0 次。总用时' + ms(dt) + '。'
      ]
    });

    // 5 同义称呼交叉验证（逐个真的推断一遍）
    if (r.synonyms.length) {
      var agreeing = r.synonyms.filter(function (term) {
        var other = Q.predict(term);
        return other.status === 'ok' && other.gender === r.gender;
      });
      list.push({
        title: '同义称呼交叉验证',
        tag: agreeing.length === r.synonyms.length ? '支持结论' : '未通过',
        used: agreeing.length === r.synonyms.length,
        paras: [
          '与“' + r.base + '”指向同一位亲属的其他称呼共 ' + r.synonyms.length + ' 个：' + r.synonyms.join('、') + '。',
          '逐一独立推断，' + agreeing.length + ' 个结果为' + r.gender + '性，' + (r.synonyms.length - agreeing.length) + ' 个不一致。'
        ]
      });
    } else {
      list.push({
        title: '同义称呼交叉验证',
        tag: '不适用',
        used: false,
        paras: ['对照表中没有与“' + r.term + '”指向同一位亲属的其他称呼，本项无法进行。']
      });
    }

    // 6 字形
    list.push(glyphEvidence(r));
    return list;
  }

  function buildAmbiguousEvidence(r) {
    var refused = 0;
    var t0 = performance.now();
    for (var i = 0; i < REPEAT; i++) {
      if (Q.predict(r.raw).status === 'ambiguous') refused++;
    }
    var dt = performance.now() - t0;
    return [
      { title: '称谓定义', tag: '无法定性', used: false, paras: [r.reason, '称呼本身不携带性别信息。'] },
      {
        title: '备择假设检验', tag: '无法定性', used: false,
        paras: ['假设这位亲属为男性：与送检称呼相容，无法排除。', '假设这位亲属为女性：与送检称呼相容，无法排除。']
      },
      {
        title: '重复性检验', tag: '结果稳定', used: false,
        paras: ['对同一份检材独立重复推断 ' + fmt(REPEAT) + ' 次，模型 ' + fmt(refused) + ' 次拒答。总用时' + ms(dt) + '。']
      },
      {
        title: '处理意见', tag: '建议补充送检', used: false, suggest: r.suggest,
        paras: ['为了保证已出具结论的准确率，模型对本检材拒答。建议改送更具体的称呼：']
      }
    ];
  }

  /* ---------- 报告排版 ---------- */

  function stamp(char, refused) {
    var s = svg('svg', { class: 'stamp' + (refused ? ' stamp-refused' : ''), viewBox: '0 0 120 120', role: 'img', 'aria-label': refused ? '拒答' : '鉴定结果：' + char });
    s.appendChild(svg('circle', { cx: 60, cy: 60, r: 54, fill: 'none', 'stroke-width': 5 }));
    s.appendChild(svg('circle', { cx: 60, cy: 60, r: 45, fill: 'none', 'stroke-width': 1.5 }));
    s.appendChild(svg('text', { x: 60, y: refused ? 72 : 80, 'text-anchor': 'middle', 'font-size': refused ? 34 : 58, 'font-weight': 900 }, [char]));
    return s;
  }

  function metaItem(label, value) {
    return h('div', { class: 'meta-item' }, [h('dt', { text: label }), h('dd', { text: value })]);
  }

  function sampleRows(r) {
    var chars = Array.from(r.term);
    var codes = chars.map(function (c) { return 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'); }).join(' ');
    var bytes = new TextEncoder().encode(r.term).length;
    var rows = [
      ['送检称呼', r.raw],
      ['标准化后', r.term],
      ['检材类型', '文字，共 ' + chars.length + ' 个字符'],
      ['Unicode 码位', codes],
      ['UTF-8 字节数', String(bytes)],
      ['生物样本', '未采集']
    ];
    var tbody = h('tbody');
    rows.forEach(function (row) {
      tbody.appendChild(h('tr', null, [h('th', { scope: 'row', text: row[0] }), h('td', { text: row[1] })]));
    });
    return h('table', { class: 'sample' }, [tbody]);
  }

  function evidenceBlock(ev, index) {
    var body = h('div', { class: 'ev-body' });
    var head = h('div', { class: 'ev-head' }, [
      h('h4', { text: ev.title }),
      h('span', { class: 'ev-tag' + (ev.used ? ' ev-tag-used' : ''), text: ev.tag })
    ]);
    body.appendChild(head);
    ev.paras.forEach(function (p) { body.appendChild(h('p', { text: p })); });

    if (ev.chain) {
      var chain = h('ol', { class: 'chain', 'aria-label': '关系链' });
      ev.chain.forEach(function (step, i) {
        chain.appendChild(h('li', { class: i === ev.chain.length - 1 ? 'chain-end' : '', text: step }));
      });
      body.appendChild(chain);
    }
    if (ev.steps) {
      var tb = h('tbody');
      ev.steps.forEach(function (step, i) {
        var last = i === ev.steps.length - 1;
        tb.appendChild(h('tr', { class: last ? 'loci-end' : '' }, [
          h('td', { text: '第 ' + (i + 1) + ' 步' }),
          h('td', { text: step.name }),
          h('td', { text: step.gender || '不确定' }),
          h('td', { text: last ? '是' : '否' })
        ]));
      });
      body.appendChild(h('div', { class: 'table-scroll loci-wrap' }, [
        h('table', { class: 'loci' }, [
          h('thead', null, [h('tr', null, [
            h('th', { scope: 'col', text: '步骤' }),
            h('th', { scope: 'col', text: '关系' }),
            h('th', { scope: 'col', text: '该环性别' }),
            h('th', { scope: 'col', text: '决定结论' })
          ])]),
          tb
        ])
      ]));
    }
    if (ev.bar) {
      var pct = (ev.bar.same / ev.bar.total) * 100;
      var bar = h('div', { class: 'bar', role: 'img', 'aria-label': ev.bar.gender + ' ' + ev.bar.same + ' 次，' + ev.bar.opp + ' ' + (ev.bar.total - ev.bar.same) + ' 次' }, [
        h('div', { class: 'bar-fill', style: 'width:' + pct + '%' })
      ]);
      body.appendChild(bar);
      body.appendChild(h('div', { class: 'bar-legend' }, [
        h('span', { text: ev.bar.gender + ' ' + fmt(ev.bar.same) }),
        h('span', { text: ev.bar.opp + ' ' + fmt(ev.bar.total - ev.bar.same) })
      ]));
    }
    if (ev.suggest) {
      var row = h('div', { class: 'suggest' });
      ev.suggest.forEach(function (term) {
        var b = h('button', { type: 'button', class: 'pick', 'data-term': term, text: term });
        row.appendChild(b);
      });
      body.appendChild(row);
    }
    return h('li', { class: 'ev' }, [h('span', { class: 'ev-num', 'aria-hidden': 'true', text: String(index + 1) }), body]);
  }

  function renderReport(r) {
    var now = new Date();
    var number = reportNumber(now);
    var ok = r.status === 'ok';
    var evidence = ok ? buildEvidence(r) : buildAmbiguousEvidence(r);
    var usedCount = evidence.filter(function (e) { return e.used; }).length;

    var conclusionText = ok
      ? '支持“' + r.term + '”为' + r.gender + '性。'
      : '无法就“' + r.term + '”出具性别结论。';
    var copyText = ok
      ? '经亲测 QinCe ' + Q.version + ' 鉴定：“' + r.term + '”为' + r.gender + '性，性别概率 100.0000%。报告编号 ' + number + '。'
      : '经亲测 QinCe ' + Q.version + ' 鉴定：无法就“' + r.term + '”出具性别结论。报告编号 ' + number + '。';

    paper.textContent = '';

    // 抬头
    paper.appendChild(h('header', { class: 'paper-head' }, [
      h('div', { class: 'paper-brand' }, [
        h('span', { class: 'paper-org', text: '亲测 QinCe' }),
        h('h2', { id: 'paper-title', text: '亲属性别鉴定报告' })
      ]),
      h('dl', { class: 'meta' }, [
        metaItem('报告编号', number),
        metaItem('受理时间', timeText(now)),
        metaItem('模型版本', 'QinCe ' + Q.version),
        metaItem('鉴定方法', '称谓关系链分析')
      ])
    ]));

    // 一、检材
    paper.appendChild(h('section', { class: 'sec' }, [
      h('h3', { text: '一、检材信息' }),
      sampleRows(r)
    ]));

    // 二、结论
    var stats = h('dl', { class: 'stats' }, ok ? [
      metaItem('性别概率', '100.0000%'),
      metaItem('关系链长度', r.chain.length + ' 步'),
      metaItem('采信证据', usedCount + ' 项'),
      metaItem('未采信', (evidence.length - usedCount) + ' 项')
    ] : [
      metaItem('性别概率', '无法给出'),
      metaItem('处理结果', '拒答'),
      metaItem('采信证据', '0 项'),
      metaItem('影响准确率', '否')
    ]);
    paper.appendChild(h('section', { class: 'sec sec-verdict' }, [
      h('h3', { text: '二、鉴定结论' }),
      h('div', { class: 'verdict' }, [
        h('div', { class: 'verdict-text' }, [
          h('p', { class: 'verdict-line', text: conclusionText }),
          h('p', { class: 'verdict-note', text: ok
            ? '性别概率由称谓定义直接得出，不是统计估计。'
            : '称呼本身不带性别信息，模型选择不回答。' })
        ]),
        stamp(ok ? r.gender : '拒答', !ok)
      ]),
      stats
    ]));

    // 三、证据
    var evList = h('ol', { class: 'ev-list' });
    evidence.forEach(function (ev, i) { evList.appendChild(evidenceBlock(ev, i)); });
    paper.appendChild(h('section', { class: 'sec' }, [
      h('h3', { text: '三、证据与论证' }),
      evList
    ]));

    // 四、声明
    paper.appendChild(h('section', { class: 'sec' }, [
      h('h3', { text: '四、声明' }),
      h('ul', { class: 'decl' }, [
        h('li', { text: '本报告只对送检称呼负责，不对称呼所指的人负责。' }),
        h('li', { text: '结论由称谓定义得出，全程未采集、未检测任何生物样本。' }),
        h('li', { text: '如对结论有异议，建议直接询问当事人。' })
      ]),
      h('div', { class: 'sign' }, [
        h('div', null, [h('span', { class: 'sign-label', text: '鉴定人' }), h('span', { class: 'sign-name', text: 'QinCe ' + Q.version + '（自动签发）' })]),
        h('div', null, [h('span', { class: 'sign-label', text: '复核人' }), h('span', { class: 'sign-name', text: '无' })])
      ])
    ]));

    // 操作
    var copyBtn = h('button', { type: 'button', class: 'act', text: '复制结论' });
    copyBtn.addEventListener('click', function () {
      var done = function () {
        copyBtn.textContent = '已复制结论';
        setTimeout(function () { copyBtn.textContent = '复制结论'; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(copyText).then(done, function () { fallbackCopy(copyText); done(); });
      } else { fallbackCopy(copyText); done(); }
    });
    var printBtn = h('button', { type: 'button', class: 'act act-primary', text: '打印或存为 PDF' });
    printBtn.addEventListener('click', function () { window.print(); });
    paper.appendChild(h('div', { class: 'acts' }, [printBtn, copyBtn]));

    paper.setAttribute('aria-labelledby', 'paper-title');
    reportSection.hidden = false;
    paper.classList.remove('paper-in');
    void paper.offsetWidth;
    paper.classList.add('paper-in');
    reportSection.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    paper.focus({ preventScroll: true });

    if (ok) markTree(r);
  }

  function fallbackCopy(text) {
    var ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;opacity:0;left:-999px' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* 忽略 */ }
    document.body.removeChild(ta);
  }

  /* ---------- 家谱 ---------- */

  function markTree(r) {
    $$('.node', $('#tree')).forEach(function (node) {
      if (node.dataset.term !== r.term || node.querySelector('.node-seal')) return;
      node.appendChild(h('span', { class: 'node-seal', 'aria-hidden': 'true', text: r.gender }));
      node.setAttribute('aria-label', r.term + '，已鉴定：' + r.gender);
    });
    var done = $$('.node-seal', $('#tree')).length;
    $('#tree-note').textContent = done === 10 ? '全家 10 位都已鉴定。' : '已鉴定 ' + done + ' / 10 位';
  }

  /* ---------- 提交 ---------- */

  function setHint(text, isError) {
    hint.textContent = text;
    hint.classList.toggle('ask-hint-error', !!isError);
  }

  function run(value) {
    if (busy) return;
    var r = Q.predict(value);

    if (r.status === 'empty') { setHint('先输入一个称呼。', true); input.focus(); return; }
    if (r.status === 'self') { setHint('不支持鉴定你本人。建议询问家人。', true); return; }
    if (r.status === 'unknown') {
      setHint('“' + r.raw + '”不在亲属图谱里。换一个亲属称呼，比如“姥姥”。', true);
      input.focus();
      input.select();
      return;
    }

    busy = true;
    goBtn.disabled = true;
    var steps = ['正在接收检材', '正在查表', '正在复核 ' + fmt(REPEAT) + ' 次'];
    var gap = reduceMotion ? 0 : 260;
    steps.forEach(function (s, i) { setTimeout(function () { setHint(s + '…', false); goBtn.textContent = '鉴定中'; }, gap * i); });
    setTimeout(function () {
      renderReport(r);
      busy = false;
      goBtn.disabled = false;
      goBtn.textContent = '开始鉴定';
      setHint(r.status === 'ok' ? '鉴定完成，报告在下方。' : '模型拒答，说明见下方报告。', false);
    }, gap * steps.length);
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); run(input.value); });
  input.addEventListener('input', function () { if (hint.classList.contains('ask-hint-error')) setHint(HINT_DEFAULT, false); });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-term]');
    if (!btn) return;
    var term = btn.dataset.term;
    input.value = term === '我' ? '我' : term;
    run(term);
  });

  /* ---------- 基准测试：页面加载时真的跑一遍 ---------- */

  (function bench() {
    var entries = Q.entries();
    var correct = 0;
    var t0 = performance.now();
    entries.forEach(function (e) {
      var r = Q.predict(e[0]);
      if (r.status === 'ok' && r.gender === e[1]) correct++;
    });
    var dt = performance.now() - t0;
    var randomHits = entries.filter(function (e) { return (Math.random() < 0.5 ? '男' : '女') === e[1]; }).length;

    $('#b-acc').textContent = ((correct / entries.length) * 100).toFixed(0) + '%（' + correct + ' / ' + entries.length + '）';
    $('#b-time').textContent = ms(dt);
    $('#b-rand').textContent = ((randomHits / entries.length) * 100).toFixed(1) + '%（' + randomHits + ' / ' + entries.length + '）';
    $$('.js-size').forEach(function (el) { el.textContent = String(Q.size); });
  })();
})();
