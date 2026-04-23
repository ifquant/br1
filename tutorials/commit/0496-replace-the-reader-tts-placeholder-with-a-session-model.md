# 0496: replace the reader TTS placeholder with a session model

这次改动的目标不是把声音真正播出来，而是先把 reader 里的 `TTS` 从“一个只会显示图标的占位按钮”变成“一个有状态、有动作的会话模型”。这样后面接入 Web Speech、系统 TTS 或其他引擎时，只需要往同一条控制链上接客户端，不需要再推倒重来。

## 改了什么

- 新增 `src/lib/reader/tts.ts`，把朗读状态拆成 `unavailable`、`idle`、`speaking`、`paused`、`error`
- 在同一个模型里补齐 `start`、`pause`、`resume`、`stop` 四个动作
- 让 `ReaderStage` 把这个会话状态传给 `ReaderHeaderBar`
- 让 header 里的 TTS 控件根据当前状态切换图标、文案和可执行动作
- 在清单里把 P1-2.1 标记为完成，并写明这次只做到会话模型，没接真正的朗读引擎

## 为什么这样做

最容易走偏的地方，是把“能点按钮”误当成“功能已经存在”。这次没有直接接任何 TTS 客户端，而是先把状态机立住。这样 UI 可以明确显示“不可用”或“错误”，不会假装已经在朗读。

初学者可以记一个简单规律：**先做状态模型，再做副作用**。如果状态机没立住，后面的 Web Speech、系统 TTS、错误回退都会变得很难收口。

## 验证

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`

## 没有包含

- 没有接 Web Speech
- 没有接系统 TTS
- 没有做真实语音播放或音频队列
