import { runInitialImport } from '@/lib/bsi/sync'

export async function POST() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send({ type: 'start' })

        const imported = await runInitialImport((done, total, newCount) => {
          send({ type: 'progress', done, total, imported: newCount })
        })

        send({ type: 'done', imported })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        send({ type: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
