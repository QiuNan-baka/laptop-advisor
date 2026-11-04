/**
 * embedding 向量化层 —— 语义检索的地基
 *
 * 【为什么需要它】
 * 词法检索（BM25）只能命中"字面相同"的词：用户问「待机时间长」，库里有「电池 80Wh」
 * 却一个词都对不上，就搜不到。embedding 把一段文字压成一串数字（向量），
 * 「待机时间长」和「续航久 / 电池大」意思相近，向量也相近，用余弦相似度一比就能命中。
 *
 * 【为什么只用 DashScope】
 * 向量化是一个和「生成回答」完全不同的模型（text-embedding-v3），各家接口、维度、
 * 含义都不一样，混用会乱。所以我们固定用通义千问的 embedding，复用已有的
 * DASHSCOPE_API_KEY，不新增任何 Key。没配 Key 时 hasEmbedding() 返回 false，
 * 上层自动回退词法检索——继续守住「无 Key 也能跑」的铁律。
 */

/** 通义千问 embedding 的 OpenAI 兼容入口 */
const EMBEDDING_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-v3";
const TIMEOUT_MS = 15_000;
/** DashScope embedding 单次请求最多 10 条 */
const BATCH = 10;

function embeddingKey(): string {
  const v = process.env.DASHSCOPE_API_KEY;
  return typeof v === "string" ? v.trim() : "";
}

/** 当前有没有可用的 embedding（决定语义检索走不走第 1 层） */
export function hasEmbedding(): boolean {
  const off = process.env.RAG_EMBEDDING;
  if (off && off.toLowerCase() === "off") return false;
  return embeddingKey().length > 0;
}

/**
 * 一批文字 → 一批向量。自动分批，每批不超过 BATCH 条。
 * 失败会抛错，由调用方决定回退（这是「AI 安全可控」的降级点）。
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = embeddingKey();
  if (!key) throw new Error("未配置 DASHSCOPE_API_KEY，无法做语义检索");

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    out.push(...(await embedBatch(batch, key)));
  }
  return out;
}

async function embedBatch(texts: string[], key: string): Promise<number[][]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(EMBEDDING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`embedding 接口返回 ${res.status}${body ? `：${body.slice(0, 200)}` : ""}`);
    }

    const json = (await res.json()) as {
      data?: { index?: number; embedding?: number[] }[];
    };
    const data = json.data ?? [];
    if (data.length !== texts.length) {
      throw new Error("embedding 返回条数与输入不一致");
    }
    // 服务端可能乱序返回，按 index 排回来
    return data
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((d) => d.embedding ?? []);
  } finally {
    clearTimeout(timer);
  }
}
