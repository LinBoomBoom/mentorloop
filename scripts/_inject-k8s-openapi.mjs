// 回填已抓取但尚未注入 seed 的 k8s / openapi 真实源（Wikipedia 已确认 sandbox 不可达，放弃）
// 仅对“确有真实抓取正文”的源做锚定，零编造。
import fs from 'node:fs';

const P = 'data/seed-content.json';
const s = JSON.parse(fs.readFileSync(P, 'utf8'));

function findSection(mid, sid) {
  const m = s.modules.find((x) => x.id === mid);
  if (!m) return null;
  for (const c of (m.chapters || [])) {
    const sec = (c.sections || []).find((z) => z.id === sid);
    if (sec) return sec;
  }
  return null;
}

const changed = [];

// ===== 1) be-api-s4：OpenAPI 与文档即契约 —— 升级到权威 OAI 3.1 规范 =====
const s4 = findSection('backend', 'be-api-s4');
if (s4) {
  const lines = s4.content.split('\n');
  const idx = lines.findIndex((l) => l.includes('来源（可溯源锚点）'));
  if (idx >= 0) {
    // 在已抓取 bullet 之后、空行之前插入权威规范 bullet
    let at = idx + 1;
    while (at < lines.length && lines[at].startsWith('> - ')) at++;
    lines.splice(
      at,
      0,
      '> - OpenAPI 3.1 官方规范（OpenAPI Initiative 发布，权威溯源）：https://spec.openapis.org/oas/v3.1（HTTP 200，已抓取 204125 字真实正文）'
    );
  }
  const ev = lines.findIndex((l) => l.includes('官方源印证'));
  if (ev >= 0) {
    lines[ev] =
      '> 官方源印证（代行策展真实抓取）：OpenAPI 3.1 规范以 YAML/JSON 描述路径/参数/响应/组件，是 API 契约事实标准；spec.openapis.org 为 OAI 官方发布地址，比厂商镜像更权威。';
  }
  s4.content = lines.join('\n');
  changed.push('be-api-s4: 追加 OpenAPI 3.1 官方规范(spec.openapis.org/oas/v3.1) 已抓取锚点');
}

// ===== 2) op-c3-s4：Kubernetes 架构与核心组件 —— 升级为(可溯源)并挂本会话真抓两页 =====
const k = findSection('devops', 'op-c3-s4');
if (k) {
  const lines = k.content.split('\n');
  // meta 标签升级
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('来源=官方') && !lines[i].includes('可溯源')) {
      lines[i] = lines[i].replace('来源=官方', '来源=官方(可溯源)');
    }
  }
  // 末尾追加统一格式溯源块
  lines.push('');
  lines.push('> 来源（可溯源锚点）：');
  lines.push(
    '> - Kubernetes 是什么（声明式容器编排总览）：https://kubernetes.io/docs/concepts/overview/what-is-kubernetes/（HTTP 200，已抓取 10071 字真实正文）'
  );
  lines.push(
    '> - Kubernetes 架构与核心组件（控制平面/etcd/节点）：https://kubernetes.io/docs/concepts/architecture/（HTTP 200，已抓取 11146 字真实正文）'
  );
  lines.push('');
  lines.push(
    '> 官方源印证（代行策展真实抓取）：Kubernetes 是声明式容器编排平台，控制平面由 kube-apiserver/scheduler/controller-manager/etcd 组成，节点侧由 kubelet/kube-proxy 驱动，目标是让实际状态无限逼近声明状态。'
  );
  k.content = lines.join('\n');
  changed.push('op-c3-s4: meta 升级(可溯源)+ 挂 what-is-kubernetes/architecture 两页已抓取锚点');
}

fs.writeFileSync(P, JSON.stringify(s, null, 2));
console.log('回填完成：');
changed.forEach((c) => console.log('  -', c));
