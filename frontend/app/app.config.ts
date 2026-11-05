export default defineAppConfig({
  ui : {
    colors : { primary: 'teal', neutral: 'slate' },
    button : {
      slots : { base: 'app-control justify-center font-semibold rounded-md focus-visible:outline-[var(--app-focus)]' }
    },
    input : {
      slots : { root: 'w-full', base: 'app-control w-full bg-[var(--app-surface)] text-[var(--app-text)] ring-[var(--app-border-control)]' }
    },
    table : {
      slots : {
        root : 'app-table-surface',
        base : 'app-table',
        th   : 'px-3 py-2 text-xs font-semibold text-[var(--app-muted)] whitespace-normal',
        td   : 'px-3 py-2 text-sm text-[var(--app-text)] whitespace-normal align-top'
      }
    }
  }
})
