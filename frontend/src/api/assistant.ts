import { api } from './client'

export interface AssistantResponse {
  configured: boolean
  answer: string
}

export async function assistantStatus(): Promise<{ configured: boolean }> {
  const { data } = await api.get<{ configured: boolean }>('/assistant/status')
  return data
}

export async function askAssistant(question: string): Promise<AssistantResponse> {
  const { data } = await api.post<AssistantResponse>('/assistant/ask', { question })
  return data
}
