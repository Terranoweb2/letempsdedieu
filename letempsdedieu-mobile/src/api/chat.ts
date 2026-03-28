export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

const API_URL = 'https://voietv.org/api/chat';

const CONNECTION_TIMEOUT_MS = 10000;

export async function streamChat(
  model: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  // Connection timeout: abort if no response within 10 seconds
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), CONNECTION_TIMEOUT_MS);

  // Combine user abort signal with timeout abort signal
  const combinedSignal = abortSignal
    ? anySignal([abortSignal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ model, messages }),
      signal: combinedSignal,
      keepalive: true,
    });

    // First byte received — clear the connection timeout
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === '' || trimmed === 'data: [DONE]') {
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);

            // Handle OpenAI-compatible SSE format
            const content =
              parsed?.choices?.[0]?.delta?.content ??
              parsed?.content ??
              parsed?.delta?.content ??
              null;

            if (content) {
              callbacks.onChunk(content);
            }
          } catch {
            // If parsing fails, try using the raw text after "data: "
            if (jsonStr && jsonStr !== '[DONE]') {
              try {
                // Might be a simple {content: "..."} format
                const simpleJson = JSON.parse(jsonStr);
                if (simpleJson.content) {
                  callbacks.onChunk(simpleJson.content);
                }
              } catch {
                // Not valid JSON, skip
              }
            }
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
        const jsonStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(jsonStr);
          const content =
            parsed?.choices?.[0]?.delta?.content ??
            parsed?.content ??
            parsed?.delta?.content ??
            null;
          if (content) {
            callbacks.onChunk(content);
          }
        } catch {
          // skip
        }
      }
    }

    callbacks.onDone();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      // Distinguish between user abort and timeout
      if (timeoutController.signal.aborted && !(abortSignal?.aborted)) {
        callbacks.onError(new Error('La connexion a expire. Le serveur met trop de temps a repondre.'));
        return;
      }
      callbacks.onDone();
      return;
    }
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Combine multiple AbortSignals into one that aborts when any of them aborts.
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), {
      once: true,
    });
  }
  return controller.signal;
}
