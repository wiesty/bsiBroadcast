import { db, notificationConfig } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { type NextRequest } from 'next/server'

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/settings/webhooks/[id]'>) {
  const { id } = await ctx.params
  const body = await request.json()
  const configId = parseInt(id)

  const allowed = ['name', 'webhookUrl', 'enabled', 'minSeverity'] as const
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  await db.update(notificationConfig).set(update).where(eq(notificationConfig.id, configId))
  return Response.json({ success: true })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/settings/webhooks/[id]'>) {
  const { id } = await ctx.params
  await db.delete(notificationConfig).where(eq(notificationConfig.id, parseInt(id)))
  return Response.json({ success: true })
}
