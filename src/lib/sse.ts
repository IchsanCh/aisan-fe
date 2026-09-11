export interface ParsedSSEEvent {
  event: string;
  data: string;
}

// Gin's c.SSEvent nulis format standar:
//   event: <nama>
//   data: <json>
//   \n\n
// EventSource bawaan browser gak bisa dipake buat endpoint ini karena butuh
// POST + header Authorization (EventSource cuma bisa GET tanpa header custom).
// Jadi kita parse manual dari ReadableStream hasil fetch().
export async function* parseSSEStream(
  response: Response,
): AsyncGenerator<ParsedSSEEvent> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length > 0) {
        yield { event: eventName, data: dataLines.join("\n") };
      }
    }
  }
}
