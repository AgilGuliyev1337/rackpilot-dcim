import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Bot, Send, X, Loader2, Sparkles } from 'lucide-react'
import { askAssistant, assistantStatus } from '../api/assistant'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/cn'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

const SUGGESTIONS = [
  'Which racks have available space?',
  'Which racks are overloaded on power?',
  'How many devices need warranty renewal soon?',
]

export function AssistantWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && configured === null) {
      assistantStatus()
        .then((s) => setConfigured(s.configured))
        .catch(() => setConfigured(false))
    }
  }, [open, configured])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [messages, loading])

  // Only render for authenticated users
  if (!user) return null

  const send = async (question: string) => {
    const q = question.trim()
    if (!q || loading) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await askAssistant(q)
      setConfigured(res.configured)
      setMessages((m) => [...m, { role: 'assistant', text: res.answer }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: apiErrorMessage(err) }])
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(input)
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent-600 text-white shadow-lg transition-colors hover:bg-accent-500"
          aria-label="Open AI assistant"
        >
          <Bot size={20} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-40 flex h-[30rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-surface-200 bg-white shadow-xl dark:border-surface-800 dark:bg-surface-900">
          <div className="flex items-center justify-between border-b border-surface-200 px-3 py-2.5 dark:border-surface-800">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={15} className="text-accent-500" /> Assistant
            </span>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {configured === false && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                The AI assistant is not configured. Set an OpenRouter API key
                (OPENROUTER_API_KEY) in the backend to enable it — see the README.
              </div>
            )}
            {messages.length === 0 && configured !== false && (
              <div className="space-y-2">
                <p className="text-xs text-surface-500">
                  Ask about your infrastructure. Try:
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-md border border-surface-200 px-3 py-2 text-left text-xs hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs',
                    m.role === 'user'
                      ? 'bg-accent-600 text-white'
                      : 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-200',
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-surface-500">
                <Loader2 size={14} className="animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 border-t border-surface-200 p-2 dark:border-surface-800"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="h-9 flex-1 rounded-md border border-surface-300 bg-white px-3 text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500/40 dark:border-surface-700 dark:bg-surface-900"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
