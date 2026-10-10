import { createContentLoader } from 'vitepress'
export default createContentLoader('games/**/*.md', {
  includeSrc: true,
  transform(pages) { return pages.map(page => ({ url: page.url, title: page.frontmatter.title || page.src?.match(/^# (.+)$/m)?.[1] || 'Wiki 首页', category: page.frontmatter.category || '概览', text: (page.src || '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '') })) }
})
