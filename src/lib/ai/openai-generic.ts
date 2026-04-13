type ProviderErrorShape = {
  error?: {
    message?: string;
  };
};

type ChatCompletionTextPart = {
  text?: string;
};

type ChatCompletionMessage = {
  content?: string | ChatCompletionTextPart[];
};

type ChatCompletionChoice = {
  delta?: {
    content?: string | ChatCompletionTextPart[];
  };
  message?: ChatCompletionMessage;
};

type ChatCompletionResponse = {
  choices?: ChatCompletionChoice[];
};

export type CompatibleTextRequest = {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '');
}

function buildProviderUrl(baseUrl: string, path: string) {
  return `${normalizeBaseUrl(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`;
}

async function parseProviderError(response: Response) {
  const fallbackMessage = `请求 AI 服务失败（HTTP ${response.status}）`;

  try {
    const data = await response.json() as ProviderErrorShape;
    return data.error?.message?.trim() || fallbackMessage;
  } catch {
    const text = await response.text();
    return text.trim() || fallbackMessage;
  }
}

function extractTextContent(content: ChatCompletionMessage['content']) {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content.map((item) => item?.text ?? '').join('').trim();
}

function extractDeltaContent(choice?: ChatCompletionChoice) {
  if (!choice) {
    return '';
  }

  const deltaContent = choice.delta?.content;

  if (typeof deltaContent === 'string') {
    return deltaContent;
  }

  if (Array.isArray(deltaContent)) {
    return deltaContent.map((item) => item?.text ?? '').join('');
  }

  return extractTextContent(choice.message?.content);
}

export function extractJsonBlock(text: string) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) ?? text.match(/```\s*([\s\S]*?)\s*```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }

  return text.trim();
}

export async function generateCompatibleText(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: CompatibleTextRequest,
) {
  const response = await fetch(buildProviderUrl(baseUrl, '/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.7,
      messages: [
        {
          role: 'system',
          content: input.systemPrompt,
        },
        {
          role: 'user',
          content: input.userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await parseProviderError(response));
  }

  const data = await response.json() as ChatCompletionResponse;
  const rawText = extractTextContent(data.choices?.[0]?.message?.content);

  if (!rawText) {
    throw new Error('AI 服务没有返回可读取的文本内容');
  }

  return rawText;
}

export async function* streamCompatibleText(
  baseUrl: string,
  apiKey: string,
  model: string,
  input: CompatibleTextRequest,
) {
  const response = await fetch(buildProviderUrl(baseUrl, '/chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.7,
      stream: true,
      messages: [
        {
          role: 'system',
          content: input.systemPrompt,
        },
        {
          role: 'user',
          content: input.userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await parseProviderError(response));
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const data = await response.json() as ChatCompletionResponse;
    const rawText = extractTextContent(data.choices?.[0]?.message?.content);

    if (!rawText) {
      throw new Error('AI 服务没有返回可读取的文本内容');
    }

    yield rawText;
    return;
  }

  if (!response.body) {
    throw new Error('AI 服务没有返回可读取的流式内容');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? '';

    for (const eventText of events) {
      const dataLines = eventText
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .filter(Boolean);

      for (const dataLine of dataLines) {
        if (dataLine === '[DONE]') {
          return;
        }

        const payload = JSON.parse(dataLine) as ChatCompletionResponse;
        const content = extractDeltaContent(payload.choices?.[0]);

        if (content) {
          yield content;
        }
      }
    }
  }
}
