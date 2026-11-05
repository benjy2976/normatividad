<script setup lang="ts">
import DocumentAttachments from '~/modules/documents/components/DocumentAttachments.vue'
import { usePublicApi } from '~/modules/documents/composables/usePublicDocuments'
import { documentTitle, formatDate } from '~/modules/documents/utils/search'

definePageMeta({ layout: 'public', validate: route => /^[1-9]\d*$/.test(String(route.params.documento)) })
const route = useRoute()
const api = usePublicApi()
const id = computed(() => String(route.params.documento))
const { data, status, error, refresh } = await useAsyncData(
  () => `public-document:${id.value}`,
  (_nuxt, { signal }) => api.document(id.value, signal),
  { server: false }
)
const notFound = computed(() => error.value?.statusCode === 404)
useHead({ title: () => data.value ? `${documentTitle(data.value.data)} | Normatividad` : 'Documento | Normatividad' })
</script>

<template>
  <div class="detail-page">
    <NuxtLink class="back-link" to="/documentos">← Volver al buscador</NuxtLink>
    <div v-if="status === 'idle' || status === 'pending'" class="state-panel" role="status">
      Consultando documento…
    </div>
    <section v-else-if="error" class="state-panel" :role="notFound ? 'status' : 'alert'">
      <h1>
        {{ notFound ? 'Documento no encontrado' : 'No pudimos consultar el documento' }}
      </h1>
      <p>
        {{ notFound ? 'El documento no está disponible para consulta pública.' : 'Inténtalo nuevamente en unos momentos.' }}
      </p>
      <UButton v-if="!notFound" color="neutral" variant="outline" @click="refresh()">
        Reintentar consulta
      </UButton>
    </section>
    <article v-else-if="data" class="document-detail">
      <p class="eyebrow">
        {{ data.data.tipoDocumento?.descripcion || 'Documento normativo' }}
      </p>
      <h1>
        {{ documentTitle(data.data) }}
      </h1>
      <dl class="metadata-grid">
        <div>
          <dt>
            Número
          </dt><dd>
            {{ data.data.numero }}
          </dd>
        </div>
        <div>
          <dt>
            Año
          </dt><dd>
            {{ data.data.anio || 'No registrado' }}
          </dd>
        </div>
        <div>
          <dt>
            Fecha
          </dt><dd>
            {{ formatDate(data.data.fecha) }}
          </dd>
        </div>
        <div>
          <dt>
            Sigla
          </dt><dd>
            {{ data.data.sigla?.sigla || 'No registrada' }}
          </dd>
        </div>
        <div>
          <dt>
            Proceso
          </dt><dd>
            {{ data.data.proceso?.descripcion || 'No registrado' }}
          </dd>
        </div>
        <div v-if="data.data.version">
          <dt>
            Versión
          </dt><dd>
            {{ data.data.version }}
          </dd>
        </div>
        <div v-if="data.data.correlativo !== null">
          <dt>
            Correlativo
          </dt><dd>
            {{ data.data.correlativo }}
          </dd>
        </div>
      </dl>
      <section class="detail-attachments" aria-labelledby="document-files-heading">
        <DocumentAttachments :key="id" :document-id="Number(id)" presentation="detail" />
      </section>
      <section v-if="data.data.descripcion">
        <h2>
          Descripción
        </h2><p class="preserve-lines">
          {{ data.data.descripcion }}
        </p>
      </section>
      <section v-if="data.data.observacion">
        <h2>
          Observación
        </h2><p class="preserve-lines">
          {{ data.data.observacion }}
        </p>
      </section>
    </article>
  </div>
</template>
