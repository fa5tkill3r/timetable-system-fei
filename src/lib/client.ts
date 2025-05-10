import createClient from 'openapi-fetch'
import { paths } from '@/types/schema'

export const client = createClient<paths>({
  baseUrl: import.meta.env.VITE_BACKEND_URL,
})
