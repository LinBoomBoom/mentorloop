/**
 * 叶子登记脚手架（宪章第三条操作化）
 * 输入一个具体工具/版本/配置（leaf）的元信息，生成符合规范的 section 草稿：
 *   > 时效块（4.1）+ V1 六段式骨架（3.2）+ 相关知识图谱互链提示（杜绝孤岛）
 * 草稿仅作"待补全模板"，人工填实后经 inject_any.mjs 注入对应父章。
 * 零 schema 漂移：只在 markdown 内容层工作。
 *
 * 用法：
 *   node leaf_register.mjs --module devops --parent op-c8 \
 *        --title "Backstage 软件目录与脚手架" --source 官方 --risk 高 --version "Backstage 1.x"
 */
import { localDate } from './skilltree.config.mjs';

// 解析 --key value（value 可含空格，收集到下一个 -- 之前的所有词）
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const key = a.slice(2);
  const vals = [];
  let j = i + 1;
  while (j < process.argv.length && !process.argv[j].startsWith('--')) {
    vals.push(process.argv[j]);
    j++;
  }
  args[key] = vals.join(' ').trim();
  i = j - 1;
}
const moduleId = args.module || 'devops';
const parent = args.parent || 'op-c8';
const title = args.title || '（请填写叶子标题，如 React 19 的 use hook）';
const source = args.source || '官方';
const risk = ['高', '中', '低'].includes(args.risk) ? args.risk : '中';
const version = args.version || '（锚定版本，如 React 19；纯原理填 无）';
const today = localDate();

const slug = title.replace(/[^\w一-龥]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
const sectionId = `${parent}-l-${slug}`;

const draft = `> 时效 | 核验=${today} | 风险=${risk} | 版本=${version} | 来源=${source}

## 心智模型
（一句话：这个工具/技术是什么、解决什么具体问题。锚定 ${source}。）

## 核心知识点（锚定官方）
- 要点 1（锚定 <官方文档/源码链接>）
- 要点 2
- 要点 3

## 为什么重要
（它在工程/面试里为什么被考？解决了什么痛点？）

## 常见坑
- 坑 1：现象 → 根因 → 规避
- 坑 2

## 动手自测
- [ ] 动手任务 1（可验证的小实验）
- [ ] 动手任务 2

## 面试视角
- 基础考点：…
- 高频追问：…（为什么 / 对比 X / 什么场景不适用）

## 相关知识图谱
- 前置：[doc:${moduleId}/${parent}/<前置节 id>]
- 对比：[doc:${moduleId}/<同类技术节 id>]
- 后续：[doc:${moduleId}/<进阶节 id>]
`;

console.log('=== 叶子草稿（宪章第三条合规模板）===');
console.log('建议 sectionId: ' + sectionId);
console.log('挂载位置: ' + moduleId + ' / ' + parent + ' 章下（新增 section）');
console.log('—— 复制以下内容到 docs/ 审稿稿，填实后经 inject_any.mjs 注入 ——\n');
console.log(draft);
console.log('—— 提示：注入前确认本叶子不与现有 330 节重复（宪章 3.1 #4：重复则增强旧节而非新增）——');
