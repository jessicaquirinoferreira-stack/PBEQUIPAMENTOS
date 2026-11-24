import type { IncomingMessage, ServerResponse } from 'node:http';

interface QuotePayload {
  nome: string;
  telefone: string;
  email: string;
  equipamento: string;
  cidade: string;
  prazo: string;
  descricao: string;
}

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeText(value: unknown, maxLength = 400): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

async function readJsonBody(req: VercelRequest): Promise<Partial<QuotePayload>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Partial<QuotePayload>;
  }
  if (typeof req.body === 'string') {
    return JSON.parse(req.body) as Partial<QuotePayload>;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf-8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as Partial<QuotePayload>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const body = await readJsonBody(req);
    const nome = sanitizeText(body.nome, 120);
    const telefone = sanitizeText(body.telefone, 40);
    const email = sanitizeText(body.email, 160);
    const equipamento = sanitizeText(body.equipamento, 160);
    const cidade = sanitizeText(body.cidade, 120);
    const prazo = sanitizeText(body.prazo, 120);
    const descricao = sanitizeText(body.descricao, 1200);

    const digitsOnly = telefone.replace(/\D/g, '');

    if (nome.length < 3) {
      return res.status(400).json({ error: 'Informe seu nome completo.' });
    }
    if (digitsOnly.length < 8) {
      return res.status(400).json({ error: 'Informe um telefone ou WhatsApp válido com DDD.' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Informe um endereço de e-mail válido.' });
    }
    if (!equipamento) {
      return res.status(400).json({ error: 'Selecione ou informe o equipamento desejado.' });
    }
    if (cidade.length < 2) {
      return res.status(400).json({ error: 'Informe a cidade onde o equipamento será utilizado.' });
    }
    if (!prazo) {
      return res.status(400).json({ error: 'Informe o prazo ou período estimado de locação.' });
    }
    if (descricao.length < 10) {
      return res.status(400).json({ error: 'Descreva brevemente a necessidade do projeto ou operação.' });
    }

    const now = new Date();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const protocol = `PB-${now.getFullYear()}-${randomSuffix}`;
    const receivedAt = now.toISOString();

    console.info('Novo orçamento recebido:', {
      protocol,
      receivedAt,
      nome,
      telefone,
      email,
      equipamento,
      cidade,
      prazo,
    });

    return res.status(201).json({
      ok: true,
      protocol,
      receivedAt,
      summary: {
        nome,
        equipamento,
        cidade,
        prazo,
      },
    });
  } catch (error) {
    console.error('Erro ao processar orçamento no serverless:', error);
    return res.status(500).json({
      error: 'Não foi possível registrar sua solicitação no momento. Tente novamente em instantes.',
    });
  }
}
