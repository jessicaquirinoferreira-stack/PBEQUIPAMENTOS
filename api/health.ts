import type { IncomingMessage, ServerResponse } from 'node:http';

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

export default function handler(_req: IncomingMessage, res: VercelResponse) {
  res.status(200).json({ status: 'ok' });
}
