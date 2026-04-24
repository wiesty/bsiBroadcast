export interface NotificationPayload {
  uuid: string
  name: string
  title: string
  classification: string | null
  basescore: number | null
  cves: string[]
  productNames: string[]
  status: string | null
  noPatch: boolean
  published: Date
  url: string
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<void>
}
