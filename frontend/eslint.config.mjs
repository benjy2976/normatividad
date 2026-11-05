import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import ts from 'typescript-eslint'
import vue from 'eslint-plugin-vue'

export default ts.config(
  { ignores: ['.nuxt/**', '.output/**', 'node_modules/**', 'app/types/api.d.ts', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files           : ['**/*.vue'],
    languageOptions : {
      parserOptions : { parser: ts.parser },
      globals       : { HTMLElement: 'readonly', IntersectionObserver: 'readonly', Event: 'readonly', HTMLSelectElement: 'readonly' }
    },
    rules : {
      'vue/multi-word-component-names' : 'off',
      'vue/max-attributes-per-line'    : ['error', {
        singleline : { max: 5 },
        multiline  : { max: 1 }
      }],
      'vue/html-self-closing' : ['error', {
        html : { void: 'always', normal: 'never', component: 'always' },
        svg  : 'always',
        math : 'always'
      }],
      'vue/html-indent'       : ['error', 2],
      'vue/block-tag-newline' : ['error', {
        singleline    : 'always',
        multiline     : 'always',
        maxEmptyLines : 0,
        blocks        : { template: { singleline: 'always', multiline: 'always' } }
      }],
      'vue/singleline-html-element-content-newline' : ['error', {
        ignoreWhenNoAttributes : false,
        ignoreWhenEmpty        : true
      }],
      'vue/multiline-html-element-content-newline' : ['error', { ignoreWhenEmpty: true }],
      'vue/first-attribute-linebreak'              : ['error', { singleline: 'ignore', multiline: 'below' }]
    }
  },
  {
    plugins : { '@stylistic': stylistic },
    rules   : {
      '@stylistic/indent'      : ['error', 2],
      '@stylistic/key-spacing' : ['error', {
        singleLine : { beforeColon: false, afterColon: true },
        multiLine  : { beforeColon: true, afterColon: true, align: 'colon' }
      }]
    },
    languageOptions : {
      globals : {
        defineNuxtConfig : 'readonly',
        defineAppConfig  : 'readonly',
        definePageMeta   : 'readonly',
        useHead          : 'readonly',
        useRoute         : 'readonly',
        useRouter        : 'readonly',
        useRuntimeConfig : 'readonly',
        useAsyncData     : 'readonly',
        $fetch           : 'readonly',
        computed         : 'readonly',
        reactive         : 'readonly',
        watch            : 'readonly'
      }
    }
  }
)
