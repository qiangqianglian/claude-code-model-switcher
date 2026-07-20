// 预设 CRUD（localStorage） + env 构造

const KEY = 'cc-model-presets'

// 写入 settings.json 时，6 个 *_MODEL 字段统一填同一个模型 ID（贴合实际用法）
const MODEL_FIELDS = [
  'ANTHROPIC_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'CLAUDE_CODE_SUBAGENT_MODEL'
]

// 构造完整 env 对象（供 backupAndActivate 使用）
export function makeEnv({ baseUrl, authToken, model }) {
  const env = {
    ANTHROPIC_AUTH_TOKEN: authToken,
    ANTHROPIC_BASE_URL: baseUrl
  }
  for (const f of MODEL_FIELDS) env[f] = model
  return env
}

// 旧预设（env 形态）迁移到新结构
function migrate(old) {
  if (old && Array.isArray(old.models)) return old
  const env = old?.env || {}
  return {
    id: old.id,
    name: old.name,
    baseUrl: env.ANTHROPIC_BASE_URL || '',
    authToken: env.ANTHROPIC_AUTH_TOKEN || '',
    models: [env.ANTHROPIC_MODEL].filter(Boolean),
    createdAt: old.createdAt,
    updatedAt: old.updatedAt
  }
}

export function loadPresets() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    const migrated = arr.map(migrate)
    // 若发生迁移，写回新结构
    if (JSON.stringify(migrated) !== JSON.stringify(arr)) {
      localStorage.setItem(KEY, JSON.stringify(migrated))
    }
    return migrated
  } catch {
    return []
  }
}

function savePresets(presets) {
  localStorage.setItem(KEY, JSON.stringify(presets))
}

function cleanModels(models) {
  return (models || [])
    .map((m) => String(m).trim())
    .filter((m) => m.length > 0)
    // 去重，保序
    .filter((m, i, arr) => arr.indexOf(m) === i)
}

export function createPreset(presets, { name, baseUrl, authToken, models }) {
  const now = Date.now()
  const preset = {
    id: crypto.randomUUID(),
    name: name.trim() || '未命名配置',
    baseUrl: (baseUrl || '').trim(),
    authToken: (authToken || '').trim(),
    models: cleanModels(models),
    createdAt: now,
    updatedAt: now
  }
  const next = [preset, ...presets]
  savePresets(next)
  return next
}

export function updatePreset(presets, id, { name, baseUrl, authToken, models }) {
  const next = presets.map((p) =>
    p.id === id
      ? {
          ...p,
          name: name.trim() || p.name,
          baseUrl: (baseUrl || '').trim(),
          authToken: (authToken || '').trim(),
          models: cleanModels(models),
          updatedAt: Date.now()
        }
      : p
  )
  savePresets(next)
  return next
}

export function deletePreset(presets, id) {
  const next = presets.filter((p) => p.id !== id)
  savePresets(next)
  return next
}
