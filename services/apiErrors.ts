export async function readApiError(response: Response, context: string): Promise<Error> {
  const body = await response.text();
  try {
    const payload: unknown = JSON.parse(body);
    if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
      return new Error(payload.error);
    }
  } catch {
    // Some error responses are plain text, including older API responses.
  }
  return new Error(body || `${context} (${response.status}).`);
}
