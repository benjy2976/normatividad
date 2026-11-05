import assert from 'node:assert/strict'
import process from 'node:process'
import console from 'node:console'
import { spawn } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { setTimeout } from 'node:timers/promises'

const port = 39000 + Math.floor(Math.random() * 1000)
const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  env   : { ...process.env, NITRO_PORT: String(port), NITRO_HOST: '127.0.0.1' },
  stdio : ['ignore', 'pipe', 'pipe']
})
let output = ''
server.stdout.on('data', chunk => { output += chunk })
server.stderr.on('data', chunk => { output += chunk })
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await globalThis.fetch(`http://127.0.0.1:${port}/`)
      ready = true
      break
    } catch {
      if (server.exitCode !== null) break
      await setTimeout(100)
    }
  }
  assert.ok(ready, `El artefacto no arrancó: ${output}`)
  for (const path of ['/muestras', '/muestras/componentes', '/muestras/administracion', '/administracion']) {
    const response = await globalThis.fetch(`http://127.0.0.1:${port}${path}`)
    assert.equal(response.status, 404, `${path} debe quedar fuera de producción`)
    console.log(`${path}: 404`)
  }
  for (const path of ['/documentos', '/documentos/42', '/documentos/42/archivos/501']) {
    const response = await globalThis.fetch(`http://127.0.0.1:${port}${path}`)
    assert.equal(response.status, 200, `${path} debe conservar su página pública`)
    console.log(`${path}: 200 (estructura SSR, sin consultas a la API)`)
  }
  for (const file of await readdir('.output/public/_nuxt')) {
    if (!file.endsWith('.js')) continue
    const content = await readFile(`.output/public/_nuxt/${file}`, 'utf8')
    assert.ok(!content.includes('Muestras de componentes') && !content.includes('Documento de ejemplo 01'), `Contenido de muestra incluido en ${file}`)
  }
  console.log('Muestras ausentes de las rutas y de los bundles públicos de producción.')
} finally {
  server.kill('SIGTERM')
}
