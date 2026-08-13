<template>
  <div>
    <!-- 标题 -->
    <div class="mb-5">
      <h1 class="page-title flex items-center gap-2">
        <Icon name="compass" :size="24" style="color:var(--brand)" />
        技能路线图
      </h1>
      <p class="text-muted text-sm mt-1.5">
        按「方向 → 细分赛道 → 等级（初级 / 中级 / 高级）→ 技能点」逐层拆解，告诉你每个阶段该学什么、哪些是高薪岗位硬门槛。
        先看赛道，再对照等级补能力，迷茫会少很多。
      </p>
    </div>

    <!-- 汇总卡片 -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <a-card :body-style="{ padding: '14px 16px' }">
        <div class="text-xs text-muted">技术方向</div>
        <div class="text-2xl font-extrabold mt-1 tabular-nums">{{ roadmap.length }}</div>
      </a-card>
      <a-card :body-style="{ padding: '14px 16px' }">
        <div class="text-xs text-muted">细分赛道</div>
        <div class="text-2xl font-extrabold mt-1 tabular-nums text-emerald-600">{{ totalSubTracks }}</div>
      </a-card>
      <a-card :body-style="{ padding: '14px 16px' }">
        <div class="text-xs text-muted">技能点总数</div>
        <div class="text-2xl font-extrabold mt-1 tabular-nums" style="color:var(--brand)">{{ totalSkills }}</div>
      </a-card>
      <a-card :body-style="{ padding: '14px 16px' }">
        <div class="text-xs text-muted">必会硬门槛</div>
        <div class="text-2xl font-extrabold mt-1 tabular-nums text-amber-500">{{ totalMust }}</div>
      </a-card>
    </div>

    <!-- 我的掌握度（登录后展示，免费层即可用，是学面一体闭环核心） -->
    <a-card v-if="masterySummary.loggedIn" class="mb-5" :body-style="{ padding: '16px' }">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-bold flex items-center gap-1.5">
          <Icon name="check" :size="16" style="color:var(--brand)" /> 我的掌握度
        </span>
        <span class="text-xs text-muted">已掌握 {{ masterySummary.mastered }}/{{ masterySummary.total }} · 必会 {{ masterySummary.mustMastered }}/{{ masterySummary.mustTotal }}</span>
      </div>
      <!-- 总体进度条 -->
      <div class="space-y-1 mb-3">
        <div class="flex justify-between text-xs">
          <span class="text-muted">全部技能掌握率</span>
          <span class="font-bold tabular-nums">{{ masterySummary.pct }}%</span>
        </div>
        <div class="h-2 rounded-full bg-surface overflow-hidden">
          <div class="h-full rounded-full transition-[width]" :style="{ width: masterySummary.pct + '%', background: 'var(--brand)' }"></div>
        </div>
        <div class="flex justify-between text-xs pt-1">
          <span class="text-muted">必会硬门槛完成率</span>
          <span class="font-bold tabular-nums text-amber-500">{{ masterySummary.mustPct }}%</span>
        </div>
        <div class="h-2 rounded-full bg-surface overflow-hidden">
          <div class="h-full rounded-full transition-[width]" :style="{ width: masterySummary.mustPct + '%', background: '#f59e0b' }"></div>
        </div>
      </div>
      <!-- 分方向 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div v-for="(t, id) in masterySummary.perTrack" :key="id" class="rounded-xl border border-line p-2.5">
          <div class="flex items-center gap-1.5 text-xs font-semibold truncate">
            <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: t.color }"></span>{{ t.name }}
          </div>
          <div class="text-[11px] text-muted mt-1 tabular-nums">掌握 {{ t.mastered }}/{{ t.total }} · 必会 {{ t.mustMastered }}/{{ t.mustTotal }}</div>
        </div>
      </div>
    </a-card>

    <!-- 控制条：方向 / 视图 / 搜索 -->
    <div class="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
      <div class="flex flex-wrap gap-2">
        <button v-for="t in tabs" :key="t.id" type="button" @click="activeDir = t.id"
                class="chip-tab"
                :style="activeDir === t.id
                  ? { background: tabsSolid[t.id] || t.color, color: '#fff', borderColor: 'transparent' }
                  : {}">
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full" :style="{ background: t.color }"></span>{{ t.name }}
          </span>
        </button>
      </div>

      <div class="flex items-center gap-2">
        <!-- 视图切换 -->
        <div class="flex p-0.5 rounded-xl border border-line bg-surface shrink-0">
          <button type="button" @click="view = 'tree'" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap"
                  :class="view === 'tree' ? 'bg-brand-coral text-white shadow-soft' : 'text-sub hover:text-ink'">
            <Icon name="git" :size="15" class="shrink-0" />
            树形图
          </button>
          <button type="button" @click="view = 'board'" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap"
                  :class="view === 'board' ? 'bg-brand-coral text-white shadow-soft' : 'text-sub hover:text-ink'">
            <Icon name="grid" :size="15" class="shrink-0" />
            路线图
          </button>
        </div>
        <!-- 搜索 -->
        <a-input v-model:value="kw" placeholder="搜索技能，如：性能 / RAG / 微服务" allow-clear class="w-60 sm:w-72 min-w-0">
          <template #prefix><Icon name="search" :size="15" /></template>
        </a-input>
      </div>
    </div>

    <!-- 等级图例 -->
    <div class="flex flex-wrap items-center gap-4 mb-4 text-xs text-muted">
      <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" :style="{ background: levelColor.junior }"></span>初级 · 跟做具体功能</span>
      <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" :style="{ background: levelColor.mid }"></span>中级 · 独立负责模块</span>
      <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" :style="{ background: levelColor.senior }"></span>高级 · 主导架构与选型</span>
      <span class="inline-flex items-center gap-1.5"><span class="text-amber-500 font-bold">★</span>该等级必会（高薪岗位硬门槛）</span>
    </div>

    <!-- 树形图视图 -->
    <div v-show="view === 'tree'">
      <a-card :body-style="{ padding: kw ? '8px' : '0' }">
        <div v-if="treeData.length" class="p-2">
          <SkillTreeChart :tree-data="treeData" :initial-depth="initialDepth" :dark="isDark" @node-click="openNode" />
          <p class="text-[11px] text-muted mt-1 px-2">提示：画布高度随内容自适应，直接滚动页面查看全部；点击节点可展开/收起；虚线框为「方向 / 赛道 / 等级」，小圆点为具体技能。</p>
        </div>
        <a-empty v-else description="没有匹配的技能，换个关键词试试" class="py-16" />
      </a-card>
    </div>

    <!-- 路线图（卡片）视图 -->
    <div v-show="view === 'board'">
      <div v-if="boardView.length" class="space-y-8">
        <section v-for="g in boardView" :key="g.direction.id">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-3 h-3 rounded-full" :style="{ background: g.direction.color }"></span>
            <h2 class="text-lg font-extrabold">{{ g.direction.name }}</h2>
            <span class="text-xs text-muted">· {{ g.subTracks.length }} 个细分赛道</span>
          </div>
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3 items-start">
            <a-card v-for="st in g.subTracks" :key="st.id" :body-style="{ padding: '0' }" class="overflow-hidden">
              <div class="px-4 py-3 flex items-start gap-3 border-b border-line" :style="{ background: g.direction.color + '0a' }">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0" :style="{ background: g.direction.color }">
                  <Icon :name="st.icon" :size="18" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="font-bold text-[15px] leading-tight">{{ st.name }}</div>
                  <div class="text-[11px] text-muted mt-0.5 leading-snug">{{ st.summary }}</div>
                </div>
              </div>
              <div class="grid grid-cols-3 divide-x divide-line">
                <div v-for="lv in st.levels" :key="lv.level" class="p-3">
                  <div class="flex items-center gap-1.5 mb-2">
                    <span class="w-2 h-2 rounded-full" :style="{ background: levelColor[lv.level] }"></span>
                    <span class="text-xs font-bold" :style="{ color: levelColor[lv.level] }">{{ lv.title }}</span>
                    <span class="text-[10px] text-muted ml-auto">{{ lv.skills.length }}</span>
                  </div>
                  <div class="text-[10px] text-muted mb-2 leading-snug">{{ lv.stance }}</div>
                  <div class="flex flex-col gap-1.5">
                    <button v-for="s in lv.skills" :key="s.name" type="button" @click="openSkill(s, lv, st, g.direction)"
                            :title="(s.desc || s.name) + ' · 掌握度：' + mStatus(g.direction.id, st.id, s.name)"
                            class="text-left text-[12px] leading-snug px-2 py-1.5 rounded-lg border transition flex items-start gap-1.5"
                            :class="s.must ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400' : 'border-line text-sub hover:border-brand-coral/40 hover:text-ink'">
                      <span class="w-1.5 h-1.5 rounded-full mt-1 shrink-0" :style="{ background: statusDotColor[mStatus(g.direction.id, st.id, s.name)] }"></span>
                      <span class="inline-flex items-start gap-1 flex-1 min-w-0">
                        <span v-if="s.must" class="text-amber-500 font-bold leading-none">★</span>
                        <span class="truncate">{{ s.name }}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </a-card>
          </div>
        </section>
      </div>
      <a-empty v-else description="没有匹配的技能，换个关键词试试" class="py-16" />
    </div>

    <!-- ═════════════ 详情抽屉（内联 style 版 —— 抗 antd cssinjs 覆盖） ═════════════ -->
    <a-drawer :open="!!selected" placement="right" :width="420" :closable="false" @close="selected = null"
              class="skill-detail-drawer" :body-style="{ padding: '0', overflowY: 'auto' }">
      <template v-if="selected">
        <!-- ===== 技能点详情 ===== -->
        <div v-if="selected.kind === 'skill'" style="position:relative">
          <!-- Header：渐变饰条 + 标题 + 关闭按钮 + 元标签 + 描述 -->
          <div style="position:relative">
            <div style="height:3px;background:linear-gradient(90deg,#e11d48,#be185d)"></div>
            <button type="button" style="position:absolute;top:12px;right:14px;z-index:10;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:none;background:transparent;cursor:pointer;color:#737373;transition:all .15s"
                    @click="selected = null" @mouseenter="$event.currentTarget.style.color='#e11d48'" @mouseleave="$event.currentTarget.style.color='#737373'"
                    aria-label="关闭">
              <Icon name="x" :size="16" />
            </button>
            <div style="padding:20px 20px 16px">
              <h2 style="font-size:19px;font-weight:800;color:#171717;line-height:1.25;margin:0;padding-right:32px;letter-spacing:-.01em">{{ selected.name }}</h2>
              <!-- 元标签行 -->
              <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px">
                <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;border:1px solid"
                      :style="{ borderColor: levelColor[selected.level] + '45', background: levelColor[selected.level] + '0e', color: levelColor[selected.level] }">
                  <span style="width:6px;height:6px;border-radius:50%;display:inline-block" :style="{ background: levelColor[selected.level] }"></span>{{ selected.levelTitle }}
                </span>
                <span v-if="selected.must" style="display:inline-flex;align-items:center;gap:2px;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;background:#fffbeb;color:#b45309;border:1px solid rgba(251,191,36,.7)">
                  <span style="font-size:10px">★</span> 必会
                </span>
                <span style="font-size:11px;color:#a3a3a3;margin-left:4px">{{ selected.subtrack }}</span>
              </div>
              <!-- 描述信息框 -->
              <div v-if="selected.desc" style="margin-top:12px;border-radius:10px;padding:10px 14px;background:#fafafa;border:1px solid rgba(229,229,229,.7);line-height:1.65">
                <p style="font-size:13px;color:#525252;margin:0">{{ selected.desc }}</p>
              </div>
            </div>
          </div>

          <!-- 分隔线 -->
          <div style="margin:0 20px;height:1px;background:rgba(229,229,229,.5)"></div>

          <!-- 面试题区：编号卡片列表 -->
          <div style="padding:20px 20px 12px">
            <!-- 区头 -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(225,29,72,.1)"><Icon name="code" :size="12" style="color:#e11d48"/></span>
                <span style="font-size:13.5px;font-weight:700;color:#171717">相关面试题</span>
                <span v-if="relatedCount >= 0" style="font-size:11px;color:#a3a3a3;font-weight:500">{{ relatedCount }} 道</span>
              </div>
              <a-button v-if="selected.track && selected.subtrackId && selected.name" type="link" size="small" style="padding:0 4px !important;font-size:12px !important;font-weight:600 !important"
                        :href="`/interview?mode=tree&track=${selected.track}&subtrack=${selected.subtrackId}&skill=${encodeURIComponent(selected.name)}`">
                去题库练习 <span style="opacity:.6">→</span>
              </a-button>
            </div>

            <a-empty v-if="!relatedLoading && relatedQuestions.length === 0" description="暂无相关面试题" :image="undefined" style="padding:20px 0">
              <template #description><span style="font-size:11px;color:#a3a3a3">该技能点暂无对应面试题。</span></template>
            </a-empty>
            <div v-else-if="relatedLoading && relatedQuestions.length === 0" style="padding:24px 0;text-align:center;font-size:11px;color:#a3a3a3">加载中…</div>

            <!-- 题目卡片列表 -->
            <div v-else style="display:flex;flex-direction:column;gap:8px">
              <div v-for="(rq, i) in relatedQuestions" :key="rq.id"
                   style="border-radius:12px;border:1px solid #e5e5e5;background:#fff;overflow:hidden;transition:all .2s ease;cursor:default"
                   @mouseenter="$el.style.borderColor='rgba(225,29,72,.3)';$el.style.boxShadow='0 1px 3px rgba(0,0,0,.06)'"
                   @mouseleave="$el.style.borderColor='#e5e5e5';$el.style.boxShadow='none'">
                <button type="button" style="width:100%;text-align:left;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;border:none;background:transparent;cursor:pointer"
                        @click="rq._open = !rq._open">
                  <!-- 题号方块：折叠灰 / 展开珊瑚 -->
                  <span style="flex-shrink:0;width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;margin-top:3px;transition:background .15s,color .15s,border-color .15s"
                        :style="rq._open ? { background:'#e11d48', color:'#fff', border:'1px solid #e11d48' } : { background:'#fafafa', border:'1px solid #e5e5e5', color:'#a3a3a3' }">{{ i + 1 }}</span>

                  <span style="flex:1;min-width:0">
                    <!-- 题目文本：未展开时 2 行截断 + 行内代码样式 -->
                    <span style="font-size:13px;line-height:1.65;color:#171717;display:block"
                          :style="rq._open ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }"
                          v-html="qInline(rq.q)"></span>
                    <!-- 标签行 -->
                    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px">
                      <span style="display:inline-flex;align-items:center;font-size:10px;font-weight:500;padding:2px 6px;border-radius:5px;border:1px solid"
                            :style="rq.difficulty === 'hard'
                              ? { background:'rgba(254,226,226,.8)', color:'#dc2626', border:'#fecaca' }
                              : rq.difficulty === 'medium'
                                ? { background:'rgba(254,243,199,.8)', color:'#d97706', border:'#fde68a' }
                                : { background:'rgba(248,250,252,.8)', color:'#64748b', border:'#f1f5f9' }">
                        {{ rq.difficulty === 'hard' ? '困难' : rq.difficulty === 'medium' ? '较难' : '常规' }}
                      </span>
                      <span style="display:inline-flex;align-items:center;font-size:10px;font-weight:500;padding:2px 6px;border-radius:5px;background:rgba(225,29,72,.07);color:#e11d48;border:1px solid rgba(225,29,72,.12)">{{ rq.tech }}</span>
                      <Icon :name="rq._open ? 'chevron-up' : 'chevron-down'" :size="12" style="color:rgba(115,115,115,.6);margin-left:auto;flex-shrink:0" />
                    </div>
                  </span>
                </button>
                <!-- 展开答案区 -->
                <div v-if="rq._open" style="margin:0 14px 12px -0px;border-radius:8px;border-left:2.5px solid rgba(225,29,72,.5);background:rgba(225,29,72,.04);padding:12px 14px;font-size:12.5px;line-height:1.65;color:#262626" v-html="md(rq.a)"></div>
              </div>
              <!-- 查看全部 -->
              <a-button v-if="relatedQuestions.length" type="link" size="small" block style="padding:0 !important;margin-top:4px !important;font-size:12px !important;text-align:center"
                        :href="`/interview?track=${selected.track}&q=${encodeURIComponent(selected.name)}`">
                查看全部 {{ relatedCount }} 道并练习 <span style="opacity:.6">→</span>
              </a-button>
            </div>
          </div>

          <!-- 分隔线 -->
          <div style="margin:0 20px;height:1px;background:rgba(229,229,229,.5)"></div>

          <!-- 掌握度 & 行动 -->
          <div style="padding:20px 20px 16px">
            <div style="border-radius:12px;background:linear-gradient(135deg,#fafafa,#fafafa80);border:1px solid #e5e5e5;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.04)">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#ecfdf5"><Icon name="check" :size="12" style="color:#10b981"/></span>
                  <span style="font-size:13.5px;font-weight:700;color:#171717">我的掌握度</span>
                </div>
                <span style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;border:1px solid"
                      :style="{ borderColor: statusDotColor[mStatus(selected.track, selected.subtrackId, selected.name)] + '40', background: statusDotColor[mStatus(selected.track, selected.subtrackId, selected.name)] + '0e', color: statusDotColor[mStatus(selected.track, selected.subtrackId, selected.name)] }">
                  {{ { new:'未开始', learning:'学习中', familiar:'较熟悉', mastered:'已掌握' }[mStatus(selected.track, selected.subtrackId, selected.name)] }}
                </span>
              </div>
              <div style="display:flex;gap:8px">
                <a-button v-if="auth.isLoggedIn" size="small" type="primary" :loading="markingSkill" @click="toggleMark" style="flex:1">                  {{ (masteryMap[sk(selected.track, selected.subtrackId, selected.name)]?.marked) ? '取消标记' : '标记已掌握' }}
                </a-button>
                <a-button v-else size="small" type="primary" :href="`/auth/login?redirect=${encodeURIComponent($route.fullPath)}`" style="flex:1">登录后标记</a-button>
                <a-button size="small" :href="`/exam/practice?track=${selected.track}&subtrack=${selected.subtrackId}&skill=${encodeURIComponent(selected.name)}`">去自测 →</a-button>
              </div>
            </div>
          </div>

          <!-- 分隔线 -->
          <div style="margin:0 20px;height:1px;background:rgba(229,229,229,.5)"></div>

          <!-- 推荐学习 -->
          <div style="padding:8px 20px 16px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span style="width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#eff6ff"><Icon name="book" :size="12" style="color:#3b82f6"/></span>
              <span style="font-size:13.5px;font-weight:700;color:#171717">推荐学习</span>
              <span v-if="learnLoading" style="font-size:11px;color:#a3a3a3">匹配中…</span>
            </div>
            <a-empty v-if="!learnLoading && !learnSections.length" description="暂无匹配章节" :image="undefined" style="padding:12px 0">
              <template #description><span style="font-size:11px;color:#a3a3a3">该技能暂未匹配到课程章节。</span></template>
            </a-empty>
            <div v-else style="display:flex;flex-direction:column;gap:6px">
              <NuxtLink v-for="sec in learnSections" :key="sec.id" :to="`/learn/${sec.moduleId}/${sec.chapterId}/${sec.id}`"
                        style="display:block;border-radius:8px;border:1px solid #e5e5e5;padding:10px 12px;text-decoration:none;transition:all .15s"
                        @mouseenter="$el.style.borderColor='#93c5fd';$el.style.background='#eff6ff20'"
                        @mouseleave="$el.style.borderColor='#e5e5e5';$el.style.background='transparent'">
                <div style="font-weight:500;font-size:13px;color:#171717;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ sec.title }}</div>
                <div style="font-size:11px;color:#a3a3a3;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ sec.chapterTitle }}</div>
              </NuxtLink>
            </div>
          </div>

          <!-- 延伸阅读（官方） -->
          <div v-if="selected.official && selected.official.length" style="padding:8px 20px 16px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span style="width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#f5f3ff"><Icon name="globe" :size="12" style="color:#8b5cf6"/></span>
              <span style="font-size:13.5px;font-weight:700;color:#171717">延伸阅读（官方）</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <a v-for="res in selected.official" :key="res.url" :href="res.url" target="_blank" rel="noopener noreferrer"
                 style="display:block;border-radius:8px;border:1px solid #e5e5e5;padding:10px 12px;text-decoration:none;transition:all .15s"
                 @mouseenter="$el.style.borderColor='#c4b5fd';$el.style.background='#f5f3ff25'"
                 @mouseleave="$el.style.borderColor='#e5e5e5';$el.style.background='transparent'">
                <div style="font-weight:500;font-size:13px;color:#171717;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:6px">
                  <Icon name="globe" :size="11" style="color:#a78bfa;flex-shrink:0"/>{{ res.title }}
                </div>
                <div v-if="res.note" style="font-size:11px;color:#a3a3a3;margin-top:2px;line-height:1.4">{{ res.note }}</div>
              </a>
            </div>
          </div>

          <!-- 底部元信息 -->
          <div style="padding:14px 20px;background:#fafafa80;border-top:1px solid rgba(229,229,229,.6)">
            <div style="display:flex;align-items:center;font-size:11px;color:#a3a3a3;gap:16px;flex-wrap:wrap">
              <span>赛道：<span style="color:#525252;font-weight:500">{{ selected.subtrack }}</span></span>
              <span>方向：<span style="color:#525252;font-weight:500">{{ selected.direction }}</span></span>
            </div>
          </div>
        </div>

        <!-- ===== 等级详情 ===== -->
        <div v-else-if="selected.kind === 'level'" class="relative px-5 pt-5 pb-4">
          <div class="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#e11d48] to-[#be185d]"></div>
          <h2 class="text-[18px] font-extrabold text-ink leading-tight pr-8">{{ selected.subtrack }} · {{ selected.title }}</h2>
          <span class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border mt-3"
                :style="{ borderColor: levelColor[selected.level] + '40', background: levelColor[selected.level] + '10', color: levelColor[selected.level] }">
            <span class="w-1.5 h-1.5 rounded-full" :style="{ background: levelColor[selected.level] }"></span>{{ selected.title }}
          </span>
          <p class="mt-3 text-[13.5px] leading-relaxed text-sub">{{ selected.stance }}</p>
          <div class="-mx-5 my-4 h-px bg-line/60"></div>
          <p class="text-[13px] font-bold text-ink mb-2.5">该等级技能（{{ selected.count }}）</p>
          <ul class="space-y-2">
            <li v-for="name in selected.skills" :key="name" class="text-[13px] text-sub flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface transition">
              <span class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" :style="{ background: levelColor[selected.level] }"></span>{{ name }}
            </li>
          </ul>
          <div class="text-[11px] text-muted mt-4 pt-3 border-t border-line/60">所属赛道：<span class="text-sub font-medium">{{ selected.subtrack }}</span></div>
        </div>

        <!-- ===== 赛道详情 ===== -->
        <div v-else-if="selected.kind === 'subtrack'" class="relative px-5 pt-5 pb-4">
          <div class="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#e11d48] to-[#be185d]"></div>
          <h2 class="text-[18px] font-extrabold text-ink leading-tight pr-8">{{ selected.name }}</h2>
          <p class="mt-3 text-[13.5px] leading-relaxed text-sub">{{ selected.summary }}</p>
          <div class="-mx-5 my-4 h-px bg-line/60"></div>
          <p class="text-[13px] font-bold text-ink mb-3">各等级技能数</p>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div v-for="lv in levelOrder" :key="lv" class="rounded-xl p-3 border border-line bg-surface/60">
              <div class="text-xs font-bold" :style="{ color: levelColor[lv] }">{{ levelLabel[lv] }}</div>
              <div class="text-xl font-extrabold mt-1 tabular-nums" :style="{ color: levelColor[lv] }">{{ selected.counts[lv] }}</div>
            </div>
          </div>
          <template v-if="selected.official && selected.official.length">
            <div class="my-4 h-px bg-line/60"></div>
            <p class="text-[13px] font-bold text-ink mb-2.5">官方学习资料</p>
            <div class="space-y-1.5">
              <a v-for="res in selected.official" :key="res.url" :href="res.url" target="_blank" rel="noopener noreferrer"
                 class="block rounded-lg border border-line px-3 py-2.5 text-[13px] hover:border-violet-300 hover:bg-violet-50/[.3] transition-all group">
                <div class="font-medium text-ink truncate flex items-center gap-1.5 group-hover:text-violet-600 transition-colors">
                  <Icon name="globe" :size="12" class="text-violet-400 shrink-0" />{{ res.title }}
                </div>
                <div v-if="res.note" class="text-[11px] text-muted mt-0.5 leading-snug">{{ res.note }}</div>
              </a>
            </div>
          </template>
          <div class="text-[11px] text-muted mt-4 pt-3 border-t border-line/60">技术方向：<span class="text-sub font-medium">{{ selected.direction }}</span></div>
        </div>

        <!-- ===== 方向详情 ===== -->
        <div v-else-if="selected.kind === 'direction'" class="px-5 pt-5 pb-4">
          <div class="w-12 h-12 rounded-2xl mb-4 shadow-sm" :style="{ background: selected.color }"></div>
          <p class="text-[13.5px] leading-relaxed text-sub">共 <b class="text-ink">{{ selected.subCount }}</b> 个细分赛道、<b class="text-ink">{{ selected.total }}</b> 项技能点。点击上方树形图或切换到「路线图」查看具体拆解。</p>
        </div>

        <div v-else class="px-5 pt-5 pb-4">
          <p class="text-[13.5px] text-muted leading-relaxed">这是整棵技能路线图的入口。选择某个技术方向，再沿「赛道 → 等级 → 技能」向下钻取。</p>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { roadmap, levelColor, levelLabel, buildTreeData, buildBoardView, globalStats, OFFICIAL_RESOURCES, type LevelKey, type SkillNode, type LevelGroup, type SubTrack, type Direction } from '~/data/skillRoadmap'
import { useMarkdown } from '~/composables/useMarkdown'

const { isDark } = useTheme()
const { md } = useMarkdown()
// 题目文本转义并把 <...> 包裹成行内代码样式（数据来自本站 API，可信；先转义再包裹防 XSS）
function qInline(text: string): string {
  const esc = (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // 非贪婪匹配整段 &lt;...&gt;；用 .*? 而非 [^&] 以避免内容含 &amp; 等实体时被截断
  return esc.replace(/&lt;(.*?)&gt;/g, '<code class="q-inline-code">&lt;$1&gt;</code>')
}
const auth = useAuthStore()
const { request } = useApi()

const tabs = [{ id: 'all', name: '全部', color: 'var(--brand)' }, ...roadmap.map(d => ({ id: d.id, name: d.name, color: d.color }))]
// 选中态实底用的加深色：teal/amber 500 级配白字对比度不足，降到 600 级保证可读
const tabsSolid: Record<string, string> = { all: '#e11d48', frontend: '#e11d48', backend: '#0d9488', devops: '#d97706', ai: '#7c3aed' }
const activeDir = ref('all')
const view = ref<'tree' | 'board'>('tree')
const kw = ref('')
const levelOrder: LevelKey[] = ['junior', 'mid', 'senior']

// ---- 统计 ----
const stats = globalStats()
const totalSkills = stats.skills
const totalSubTracks = stats.subTracks
const totalMust = stats.must

// ---- P0 技能掌握度（登录后拉取；纯前端用 roadmap 树做方向/必会聚合）----
type MStatus = 'new' | 'learning' | 'familiar' | 'mastered'
const sk = (track: string, subtrackId: string, name: string) => [track, subtrackId, name].join('::')
const masteryMap = ref<Record<string, any>>({})
async function loadMastery() {
  if (!auth.isLoggedIn) { masteryMap.value = {}; return }
  try {
    const r: any = await request('/api/skill/mastery')
    masteryMap.value = r.map || {}
  } catch (e) { /* 掌握度非关键，失败静默 */ }
}
function mStatus(track: string, subtrackId: string, name: string): MStatus {
  return (masteryMap.value[sk(track, subtrackId, name)]?.status as MStatus) || 'new'
}
const statusDotColor: Record<MStatus, string> = {
  new: '#cbd5e1',
  learning: '#3b82f6',
  familiar: '#14b8a6',
  mastered: 'var(--brand)'
}
const masterySummary = computed(() => {
  const map = masteryMap.value
  const perTrack: Record<string, any> = {}
  let total = 0, mastered = 0, mustTotal = 0, mustMastered = 0
  for (const d of roadmap) {
    perTrack[d.id] = { name: d.name, color: d.color, total: 0, mastered: 0, mustTotal: 0, mustMastered: 0 }
    for (const st of d.subTracks) for (const lv of st.levels) for (const s of lv.skills) {
      const m = map[sk(d.id, st.id, s.name)]
      total++; perTrack[d.id].total++
      if (s.must) { mustTotal++; perTrack[d.id].mustTotal++ }
      if (m && m.status === 'mastered') { mastered++; perTrack[d.id].mastered++ }
      if (s.must && m && m.status === 'mastered') { mustMastered++; perTrack[d.id].mustMastered++ }
    }
  }
  return {
    total, mastered, mustTotal, mustMastered, perTrack,
    pct: total ? Math.round(mastered / total * 100) : 0,
    mustPct: mustTotal ? Math.round(mustMastered / mustTotal * 100) : 0,
    loggedIn: auth.isLoggedIn
  }
})
onMounted(loadMastery)

// ---- 树形图 / 路线图数据（纯函数，来自数据模块）----
const treeData = computed(() => buildTreeData(activeDir.value, kw.value))
// 展开深度：全部展开（技能点默认展示）。画布高度随内容自适应，页面自然滚动，
// 不再有拖拽平移窗口；点节点可临时收起。
const initialDepth = computed(() => 999)
const boardView = computed(() => buildBoardView(activeDir.value, kw.value))

// ---- 抽屉 ----
const selected = ref<any>(null)
function openNode(meta: any) { selected.value = meta }
function openSkill(s: SkillNode, lv: LevelGroup, st: SubTrack, d: Direction) {
  selected.value = { kind: 'skill', name: s.name, desc: s.desc, must: s.must, level: lv.level, levelTitle: levelLabel[lv.level], subtrack: st.name, subtrackId: st.id, direction: d.name, track: d.id, official: OFFICIAL_RESOURCES[st.id] || [] }
}

// ---- 技能点 → 相关面试题（联动题库）----
const relatedQuestions = ref<any[]>([])
const relatedLoading = ref(false)
const relatedCount = ref(-1)
let relatedAbort: AbortController | null = null

// ---- 技能 → 学习章节（P1a「去学习」入口）----
const learnSections = ref<any[]>([])
const learnLoading = ref(false)
async function loadLearn() {
  learnSections.value = []
  const sel = selected.value
  if (!sel?.track || !sel?.name) return
  learnLoading.value = true
  try {
    const params = new URLSearchParams()
    params.set('track', sel.track)
    params.set('skill', sel.name)
    if (sel.desc) params.set('desc', sel.desc)
    if (sel.subtrackId) params.set('subtrack', sel.subtrackId)
    const r: any = await request(`/api/skill/learn?${params.toString()}`)
    learnSections.value = r.sections || []
  } catch (e) { /* 非关键 */ } finally { learnLoading.value = false }
}

// ---- 标记/取消「已掌握」（免费核心闭环）----
const markingSkill = ref(false)
async function toggleMark() {
  if (!auth.isLoggedIn || !selected.value?.track || markingSkill.value) return
  const s = selected.value
  const key = sk(s.track, s.subtrackId, s.name)
  const next = !(masteryMap.value[key]?.marked)
  markingSkill.value = true
  try {
    await request('/api/skill/mastery', { method: 'POST', body: {
      skillKey: key, track: s.track, subtrackId: s.subtrackId, skillName: s.name, marked: next
    } })
    // 乐观更新本地掌握度
    masteryMap.value = {
      ...masteryMap.value,
      [key]: { ...(masteryMap.value[key] || { status: 'new', mastered: false, practiced_total: 0, exam_total: 0, learned_total: 0 }), marked: next, status: next ? 'mastered' : 'new', mastery: next ? 100 : 0 }
    }
  } catch (e) { /* 静默 */ } finally { markingSkill.value = false }
}

watch(selected, async (sel) => {
  // 切换技能点时重置
  relatedQuestions.value = []
  relatedCount.value = -1
  relatedLoading.value = false
  if (relatedAbort) { relatedAbort.abort(); relatedAbort = null }
  learnSections.value = []
  if (sel && sel.kind === 'skill' && sel.track && sel.name) {
    // 所有技能都尝试匹配真实章节；细分赛道由 API 走确定性前缀匹配（不会回退模糊导致错配）
    loadLearn()
    relatedLoading.value = true
    const ac = new AbortController()
    relatedAbort = ac
    try {
      const url = `/api/interview/${sel.track}?q=${encodeURIComponent(sel.name)}&pageSize=15`
      const res: any = await $fetch(url, { signal: ac.signal })
      // 复用面试 API 的 bank.items（已含 q/a/keywords/tech/difficulty）
      const items = (res?.bank?.items || []).map((it: any) => ({ ...it, _open: false }))
      if (!ac.signal.aborted) {
        relatedQuestions.value = items
        relatedCount.value = items.length
      }
    } catch (e: any) {
      if (!ac.signal.aborted) relatedCount.value = 0
    } finally {
      if (!ac.signal.aborted) relatedLoading.value = false
    }
  }
})


useSeoMeta({
  title: '技能路线图 · MentorLoop',
  description: '按技术方向 → 细分赛道 → 等级（初级/中级/高级）→ 技能点逐层拆解，告诉你每个阶段该学什么、哪些是高薪岗位硬门槛。',
  ogTitle: 'MentorLoop · 技能路线图',
  ogDescription: '方向、赛道、等级、技能点四维拆解，告别学习迷茫。',
  ogType: 'website'
})
</script>
