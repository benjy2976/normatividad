import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const parser = new MarkdownIt({ html: false, linkify: false, breaks: true }).disable('image')

export function renderMarkdown(source: string) {
  return DOMPurify.sanitize(parser.render(source), {
    ALLOWED_TAGS    : ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'em', 'strong', 's', 'hr', 'br', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a'],
    ALLOWED_ATTR    : ['href', 'title', 'start'],
    ALLOW_DATA_ATTR : false,
    ALLOW_ARIA_ATTR : false
  })
}
