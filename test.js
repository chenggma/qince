// 自带测试集：把对照表里的每个称呼都推断一遍。
// 运行：node test.js
const QinCe = require('./model.js');

const entries = QinCe.entries();
let correct = 0;
for (const [term, expected] of entries) {
  const result = QinCe.predict(term);
  if (result.status === 'ok' && result.gender === expected) correct += 1;
  else console.error('未通过：', term, result);
}

const refusals = ['cousin', '弟妹', '爱人', 'sibling'];
const refused = refusals.filter((term) => QinCe.predict(term).status === 'ambiguous').length;

console.log(`准确率：${correct} / ${entries.length}（${((correct / entries.length) * 100).toFixed(0)}%）`);
console.log(`应拒答的称呼：${refused} / ${refusals.length} 个被拒答`);
console.log(`参数量：${QinCe.parameters}`);

if (correct !== entries.length || refused !== refusals.length) process.exit(1);
