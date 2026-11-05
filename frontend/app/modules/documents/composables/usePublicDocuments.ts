import { $fetch as publicFetch } from 'ofetch'
import { createPublicApi } from '../services/publicApi'
import { readSearchQuery } from '../utils/search'

export function usePublicApi() {
  const config = useRuntimeConfig()
  return createPublicApi(publicFetch, config.public.apiBase)
}

export function usePublicDocuments() {
  const route = useRoute()
  const api = usePublicApi()
  const search = computed(() => readSearchQuery(route.query))
  const key = computed(() => `public-documents:${JSON.stringify(route.query)}`)
  const documents = useAsyncData(key, (_nuxt, { signal }) => {
    if (search.value.errors.length) return Promise.resolve(null)
    return api.documents(search.value.query, signal)
  }, { server: false })
  const catalogs = useAsyncData('public-document-catalogs', (_nuxt, { signal }) => api.catalogs(signal), { server: false })
  return { search, documents, catalogs }
}
