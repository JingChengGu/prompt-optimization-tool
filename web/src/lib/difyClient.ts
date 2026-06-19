import { z } from 'zod'

const DifyOutputSchema = z.object({
  data: z.object({
    outputs: z.record(z.string(), z.unknown()),
  }),
})

export async function callDify(
  apiKey: string,
  inputs: Record<string, string>
): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/dify/workflows/run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs,
      response_mode: 'blocking',
      user: 'twinx-optimizer',
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }
  const raw: unknown = await response.json()
  const parsed = DifyOutputSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`Unexpected Dify response shape: ${parsed.error.message}`)
  }
  return parsed.data.data.outputs
}

export function extractStringOutput(outputs: Record<string, unknown>, key: string): string {
  const val = outputs[key]
  if (typeof val !== 'string') {
    throw new Error(`Expected string at outputs.${key}, got ${typeof val}`)
  }
  return val
}
