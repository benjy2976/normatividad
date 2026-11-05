import { createResolver, defineNuxtModule, extendPages } from 'nuxt/kit'

const resolver = createResolver(import.meta.url)
const developmentSamples = defineNuxtModule({
  setup(_options, nuxt) {
    if (!nuxt.options.dev) return
    const resolver = createResolver(import.meta.url)
    extendPages(pages => {
      pages.push(
        { name: 'samples-components', path: '/muestras/componentes', alias: ['/muestras'], file: resolver.resolve('app/dev/pages/components.vue') },
        { name: 'samples-administration', path: '/muestras/administracion', file: resolver.resolve('app/dev/pages/administration.vue') }
      )
    })
  }
})

export default defineNuxtConfig({
  compatibilityDate : '2025-07-15',
  devtools          : { enabled: true },
  modules           : ['@nuxt/ui', developmentSamples],
  ui                : { fonts: false },
  colorMode         : {
    preference  : 'light',
    fallback    : 'light',
    storage     : 'cookie',
    storageKey  : 'normatividad-theme',
    cookieAttrs : { sameSite: 'lax', maxAge: 31536000, path: '/' }
  },
  icon : {
    provider     : 'none',
    clientBundle : { scan: true, icons: ['lucide:sun', 'lucide:moon', 'lucide:loader-circle', 'lucide:download', 'lucide:external-link', 'lucide:file-text', 'lucide:plus', 'lucide:minus'] }
  },
  css   : ['~/assets/main.css'],
  nitro : {
    publicAssets : ['cmaps', 'standard_fonts', 'wasm'].map(directory => ({
      dir     : resolver.resolve(`node_modules/pdfjs-dist/${directory}`),
      baseURL : `/pdf-assets/${directory}`,
      maxAge  : 31536000
    }))
  },
  runtimeConfig : {
    public : { apiBase: '/resources' }
  },
  app : {
    head : {
      htmlAttrs : { lang: 'es' },
      title     : 'Normatividad | Gobierno Regional de Huánuco',
      meta      : [{ name: 'description', content: 'Consulta pública de documentos normativos del Gobierno Regional de Huánuco.' }]
    }
  }
})
