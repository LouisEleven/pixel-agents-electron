export const IDLE_CHAT_SNIPPETS = [
  ['这个需求我先拆一下', '你先看下目录结构', '我等会儿补测试'],
  ['这个命名还挺顺手', '要不要顺便整理一下状态流', '先别过度设计'],
  ['这个 bug 复现出来了', '我盯下日志', '你看看是不是边界条件'],
  ['UI 这块已经顺了不少', '像素风细节挺有感觉', '再抠一下交互反馈'],
  ['我先把这段逻辑读完', '你帮我确认一下入口', '别急，先定位根因'],
  ['这个功能可以做轻一点', '先把主流程打通', '能跑起来比什么都重要'],
  ['刚才那个报错消失了', '大概率是状态没清干净', '我再验证一轮'],
  ['这个按钮位置不错', '信息层级也清楚了', '再补一点空状态提示'],
  ['我先提交一个小改动', '你帮我看下会不会影响别处', '没问题再继续扩'],
  ['这个思路挺像在带项目', '一边安排 agent 一边盯进度', '还真有点办公室味道'],
] as const;

export function pickIdleChatPair(): [string[], string[]] {
  const first = IDLE_CHAT_SNIPPETS[Math.floor(Math.random() * IDLE_CHAT_SNIPPETS.length)];
  let second = IDLE_CHAT_SNIPPETS[Math.floor(Math.random() * IDLE_CHAT_SNIPPETS.length)];
  if (IDLE_CHAT_SNIPPETS.length > 1) {
    while (second === first) {
      second = IDLE_CHAT_SNIPPETS[Math.floor(Math.random() * IDLE_CHAT_SNIPPETS.length)];
    }
  }
  return [[...first], [...second]];
}
