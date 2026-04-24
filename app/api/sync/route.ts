import { runSync } from '@/lib/bsi/sync'

export async function POST() {
  try {
    const result = await runSync()
    return Response.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
