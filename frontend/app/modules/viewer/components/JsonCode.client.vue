<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { basicSetup, EditorView } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { json } from '@codemirror/lang-json'
import { tags } from '@lezer/highlight'

const props = defineProps<{ text: string }>()
const host = ref<HTMLElement>()
let editor: EditorView | undefined
const colors = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--app-code-property)' },
  { tag: tags.string, color: 'var(--app-code-string)' },
  { tag: tags.number, color: 'var(--app-code-number)' },
  { tag: [tags.bool, tags.null], color: 'var(--app-code-literal)' }
])
onMounted(() => {
  editor = new EditorView({
    parent     : host.value,
    doc        : props.text,
    extensions : [
      basicSetup, json(), syntaxHighlighting(colors), EditorState.readOnly.of(true),
      EditorView.editable.of(false), EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': 'JSON de la página', 'aria-readonly': 'true', tabindex: '0' }),
      EditorState.phrases.of({ 'Fold line': 'Plegar línea', 'Unfold line': 'Desplegar línea', 'Folded lines': 'Líneas plegadas', 'Unfold': 'Desplegar', 'Find': 'Buscar', 'Replace': 'Reemplazar', 'next': 'siguiente', 'previous': 'anterior', 'all': 'todos', 'match case': 'distinguir mayúsculas', 'regexp': 'expresión regular', 'by word': 'palabra completa', 'close': 'cerrar', 'Go to line': 'Ir a línea', 'go': 'Ir' }),
      EditorView.theme({
        '&'                                                             : { height: '100%', backgroundColor: 'var(--app-surface)', color: 'var(--app-text)' },
        '&.cm-focused'                                                  : { outline: '2px solid var(--app-focus)', outlineOffset: '-2px' },
        '.cm-scroller'                                                  : { overflow: 'auto', fontFamily: 'ui-monospace, monospace', fontSize: '13px', lineHeight: '1.6' },
        '.cm-content'                                                   : { padding: '12px 0' },
        '.cm-gutters, .cm-panels'                                       : { backgroundColor: 'var(--app-soft)', color: 'var(--app-muted)', borderColor: 'var(--app-border)' },
        '.cm-activeLine, .cm-activeLineGutter'                          : { backgroundColor: 'transparent' },
        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground' : { backgroundColor: 'var(--app-table-row-hover-bg)' },
        '.cm-foldPlaceholder'                                           : { backgroundColor: 'var(--app-soft)', color: 'var(--app-text)', borderColor: 'var(--app-border-control)' }
      })
    ]
  })
})
watch(() => props.text, text => {
  editor?.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: text }, selection: { anchor: 0 } })
  editor?.scrollDOM.scrollTo(0, 0)
})
onBeforeUnmount(() => editor?.destroy())
</script>

<template>
  <div ref="host" class="artifact-json artifact-text" ></div>
</template>
