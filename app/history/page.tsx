import type { Metadata } from 'next'
import HistoryClient from './HistoryClient'

export const metadata: Metadata = { title: 'Verlauf — BSI Broadcast' }

export default function HistoryPage() {
  return <HistoryClient />
}
