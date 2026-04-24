import type { Metadata } from 'next'
import ProductsClient from './ProductsClient'

export const metadata: Metadata = { title: 'Produkte — BSI Broadcast' }

export default function ProductsPage() {
  return <ProductsClient />
}
