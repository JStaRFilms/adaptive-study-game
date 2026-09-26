import { readApiError } from './apiErrors';

type Message = { role: 'user' | 'assistant'; content: string };

export class ChatSession {
  private history: Message[] = [];

  constructor(private readonly systemInstruction: string) {}

  async *sendMessageStream({ message }: { message: string }): AsyncGenerator<{ text: string }> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: this.systemInstruction, messages: [...this.history, { role: 'user', content: message }] }),
    });
    if (!response.ok) throw await readApiError(response, 'Chat failed');
    if (!response.body) throw new Error('Chat failed (empty stream).');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const event of events) {
          if (!event.startsWith('data: ')) continue;
          const payload: unknown = JSON.parse(event.slice(6));
          if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') throw new Error(payload.error);
          if (payload && typeof payload === 'object' && 'text' in payload && typeof payload.text === 'string') {
            answer += payload.text;
            yield { text: payload.text };
          }
        }
        if (done) break;
      }
      if (!answer.trim()) throw new Error('The AI returned an empty chat reply.');
      this.history.push({ role: 'user', content: message }, { role: 'assistant', content: answer });
    } finally {
      reader.releaseLock();
    }
  }
}
