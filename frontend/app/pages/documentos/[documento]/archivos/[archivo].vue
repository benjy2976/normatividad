<script setup lang="ts">
import { createError } from '#imports'
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { usePublicApi } from '~/modules/documents/composables/usePublicDocuments'
import { documentTitle } from '~/modules/documents/utils/search'
import PdfTools from '~/modules/viewer/components/PdfTools.vue'
import TextTools from '~/modules/viewer/components/TextTools.vue'
import { availableRepresentations, readViewerQuery, representationKind, representationLabel, selectRepresentation } from '~/modules/viewer/utils/selection'

definePageMeta({
  layout   : false,
  validate : route => [route.params.documento, route.params.archivo].every(id => /^[1-9]\d*$/.test(String(id)) && Number.isSafeInteger(Number(id)))
})
const PdfReader = defineAsyncComponent(() => import('~/modules/viewer/components/PdfReader.client.vue'))
const TextArtifact = defineAsyncComponent(() => import('~/modules/viewer/components/TextArtifact.client.vue'))
const hydrated = ref(false)
onMounted(() => { hydrated.value = true })
const route = useRoute()
const router = useRouter()
const api = usePublicApi()
const documentId = computed(() => String(route.params.documento))
const fileId = computed(() => String(route.params.archivo))
const query = computed(() => readViewerQuery(route.query))
const { data, status, error, refresh } = await useAsyncData(
  () => `public-viewer:${documentId.value}:${fileId.value}`,
  async (_nuxt, { signal }) => {
    const [document, file] = await Promise.all([api.document(documentId.value, signal), api.file(documentId.value, fileId.value, signal)])
    if (document.data.id !== Number(documentId.value) || !availableRepresentations(file.data, Number(documentId.value), Number(fileId.value)).length) throw createError({ statusCode: 404 })
    return { document: document.data, file: file.data }
  },
  { server: false }
)
const selected = computed(() => data.value ? selectRepresentation(data.value.file, Number(documentId.value), Number(fileId.value), query.value.representation) : null)
const representations = computed(() => data.value ? availableRepresentations(data.value.file, Number(documentId.value), Number(fileId.value)) : [])
const src = computed(() => selected.value ? api.representationURL(Number(documentId.value), Number(fileId.value), selected.value.tipo) : '')
const kind = computed(() => selected.value ? representationKind(selected.value) : null)
const pageCount = ref(0)
const imageError = ref(false)
const zoom = ref('0.75')
const scale = ref(0.75)
const textReader = ref<{ copy: () => Promise<void> } | null>(null)
const textSource = ref(false)
const textState = ref<{ ready: boolean, pages: number | null, copied: boolean }>({ ready: false, pages: null, copied: false })
const textType = computed(() => selected.value?.tipo === 'jsonl' ? 'jsonl' as const : 'markdown' as const)
watch(() => [src.value, status.value], () => {
  pageCount.value = 0; imageError.value = false; zoom.value = '0.75'; scale.value = 0.75
  textSource.value = false; textState.value = { ready: false, pages: null, copied: false }
})
const unavailable = computed(() => error.value?.statusCode === 404)
function changePage(page: number, replace = false) {
  if (!Number.isSafeInteger(page) || page < 1 || (pageCount.value > 0 && page > pageCount.value)) {
    return
  }
  void router[replace ? 'replace' : 'push']({ path: route.path, query: { ...route.query, pagina: page === 1 ? undefined : String(page) } })
}
function changeRepresentation(event: Event) {
  void router.push({ path: route.path, query: { ...route.query, representacion: (event.target as HTMLSelectElement).value, pagina: undefined } })
}
useHead({ title: () => data.value ? `${data.value.file.nombre} | Visor de Normatividad` : 'Visor | Normatividad' })
</script>

<template>
  <NuxtLayout name="viewer">
    <template #tools>
      <NuxtLink :to="`/documentos/${documentId}`" class="viewer-tool-button viewer-document-link" aria-label="Ver ficha del documento" title="Ver descripción y datos del documento"><UIcon name="i-lucide-file-text" aria-hidden="true" /><span>Ficha</span></NuxtLink>
      <template v-if="hydrated && data && !error && status === 'success'">
        <div class="viewer-heading">
          <h1>
            {{ data.file.nombre }}
          </h1>
          <p>
            Tomo {{ data.file.tomo }} · {{ documentTitle(data.document) }}
          </p>
        </div>
        <PdfTools
          v-if="kind === 'pdf' && selected && !query.errors.length"
          v-model:zoom="zoom"
          :page="query.page"
          :pages="pageCount"
          :scale="scale"
          @page-change="changePage" />
        <TextTools
          v-if="kind === 'text' && selected && !query.errors.length"
          v-model:source="textSource"
          :type="textType"
          :page="query.page"
          :pages="textState.pages ?? data.file.cantidadPaginas ?? null"
          :ready="textState.ready"
          :copied="textState.copied"
          @page-change="changePage"
          @copy="textReader?.copy()" />
      </template>
    </template>
    <template #actions>
      <template v-if="hydrated && data && !error && status === 'success' && representations.length && !query.errors.length">
        <label for="representation" class="visually-hidden">Versión</label>
        <select id="representation" class="viewer-select" :value="selected?.tipo ?? ''" @change="changeRepresentation">
          <option v-if="!selected" value="" disabled>
            Elegir versión
          </option>
          <option v-for="representation in representations" :key="representation.tipo" :value="representation.tipo">
            {{ representationLabel(representation.tipo) }}
          </option>
        </select>
        <template v-if="selected">
          <a :href="`${src}?disposition=attachment`" class="viewer-tool-button" :aria-label="`Descargar ${data.file.nombre} · versión completa`" title="Descargar versión completa (todas las páginas)"><UIcon name="i-lucide-download" aria-hidden="true" /></a>
          <a
            v-if="kind !== 'download'"
            :href="src"
            class="viewer-tool-button"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir archivo en otra pestaña"
            title="Abrir archivo en otra pestaña"><UIcon name="i-lucide-external-link" aria-hidden="true" /></a>
        </template>
      </template>
    </template>
    <div class="file-viewer">
      <section v-if="query.errors.length" class="viewer-state" role="alert">
        <h1>
          Revisa la dirección del visor
        </h1>
        <p v-for="message in query.errors" :key="message">
          {{ message }}
        </p>
        <UButton color="neutral" variant="outline" :to="route.path">
          Usar la vista predeterminada
        </UButton>
      </section>
      <div v-else-if="!hydrated || status === 'idle' || status === 'pending'" class="viewer-state" role="status">
        Consultando archivo…
      </div>
      <section v-else-if="error" class="viewer-state" :role="unavailable ? 'status' : 'alert'">
        <h1>
          {{ unavailable ? 'Archivo no disponible' : 'No pudimos consultar el archivo' }}
        </h1>
        <p>
          {{ unavailable ? 'El archivo no está disponible para consulta pública.' : 'Inténtalo nuevamente en unos momentos.' }}
        </p>
        <UButton v-if="!unavailable" color="neutral" variant="outline" @click="refresh()">
          Reintentar consulta
        </UButton>
      </section>
      <section v-else-if="!selected" class="viewer-state" role="status">
        <h1>
          Representación no disponible
        </h1>
        <p>
          La versión solicitada no está disponible para este archivo.
        </p>
        <UButton color="neutral" variant="outline" :to="route.path">
          Usar la vista predeterminada
        </UButton>
      </section>
      <template v-else-if="kind === 'pdf'">
        <ClientOnly>
          <PdfReader
            :key="src"
            v-model:zoom="zoom"
            :src="src"
            :page="query.page"
            @pages="pageCount = $event"
            @scale="scale = $event"
            @page-change="changePage"
            @page-visible="changePage($event, true)" />
          <template #fallback>
            <div class="viewer-state" role="status">
              Preparando visor…
            </div>
          </template>
        </ClientOnly>
      </template>
      <ClientOnly v-else-if="kind === 'text'">
        <TextArtifact
          :key="src"
          ref="textReader"
          :src="src"
          :label="representationLabel(selected.tipo)"
          :type="textType"
          :page="query.page"
          :source="textSource"
          @state="textState = $event"
          @page-change="changePage" />
        <template #fallback>
          <div class="viewer-state" role="status">
            Preparando texto…
          </div>
        </template>
      </ClientOnly>
      <div v-else-if="kind === 'image'" class="image-viewport">
        <div v-if="imageError" class="viewer-state" role="alert">
          <p>
            No pudimos mostrar esta imagen.
          </p>
          <UButton color="neutral" variant="outline" @click="refresh()">
            Reintentar consulta
          </UButton>
        </div>
        <img v-else :key="src" :src="src" :alt="data?.file.nombre" @error="imageError = true"/>
      </div>
      <section v-else class="viewer-state" role="status">
        <h2>
          Vista previa no disponible para este formato
        </h2>
        <p>
          Puedes descargar el archivo para abrirlo con una aplicación compatible.
        </p>
        <a :href="`${src}?disposition=attachment`" class="file-icon">Descargar archivo</a>
      </section>
    </div>
  </NuxtLayout>
</template>
