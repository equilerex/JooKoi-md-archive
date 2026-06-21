import { Injectable } from '@angular/core';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import { marked } from 'marked';

@Injectable({
  providedIn: 'root',
})
export class MarkdownService {
  constructor() {
    this.configureMarked();
    mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
  }

  async renderMermaid(container: HTMLElement): Promise<void> {
    const nodes = container.querySelectorAll<HTMLElement>('.mermaid:not([data-processed="true"])');
    if (!nodes.length) {
      return;
    }

    await mermaid.run({ nodes: Array.from(nodes) });
  }

  parse(content: string): string {
    try {
      const filtered = content.split('\n').filter(line => !line.trim().startsWith('import ')).join('\n');
      const result = marked.parse(filtered);
      return typeof result === 'string' ? result : String(result);
    } catch (error) {
      console.error('Failed to parse markdown:', error);
      return '<p>Error parsing markdown content</p>';
    }
  }

  parseMarkdown(content: string): string {
    return this.parse(content);
  }

  extractTitle(markdown: string): string {
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1] : 'Untitled';
  }

  sanitizeFilename(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  highlightAllCodeBlocks(): void {
    setTimeout(() => {
      document.querySelectorAll('pre code:not(.hljs)').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }, 0);
  }

  private configureMarked(): void {
    marked.use({
      renderer: {
        code: (token: any) => {
          const codeStr = this.toCodeString(token);
          let lang = this.toLanguage(token);

          if (lang === 'mermaid') {
            return `<div class="mermaid">${this.escapeHtml(codeStr)}</div>`;
          }
          let highlighted: string | null = null;

          if (lang && hljs.getLanguage(lang)) {
            try {
              highlighted = hljs.highlight(codeStr, { language: lang }).value;
            } catch (error) {
              console.warn(`Failed to highlight code with language: ${lang}`, error);
            }
          } else {
            try {
              const auto = hljs.highlightAuto(codeStr);
              highlighted = auto?.value || null;
              if (!lang && auto?.language) {
                lang = auto.language;
              }
            } catch (error) {
              console.warn('Failed to auto-highlight code', error);
            }
          }

          const safeLang = lang || 'plaintext';
          return `<pre><code class="hljs language-${safeLang}">${highlighted || this.escapeHtml(codeStr)}</code></pre>`;
        },
      },
      breaks: true,
      gfm: true,
    });
  }

  private toCodeString(code: unknown): string {
    if (typeof code === 'string') {
      return code;
    }

    if (code && typeof code === 'object') {
      if ('text' in code && typeof code.text === 'string') {
        return code.text;
      }

      if ('raw' in code && typeof code.raw === 'string') {
        return code.raw;
      }
    }

    return String(code ?? '');
  }

  private toLanguage(info: unknown): string {
    if (typeof info === 'string') {
      return info.trim().split(/\s+/)[0]?.toLowerCase() || '';
    }

    if (info && typeof info === 'object') {
      if ('lang' in info && typeof info.lang === 'string') {
        return info.lang.toLowerCase();
      }

      if ('type' in info && typeof info.type === 'string') {
        return info.type.toLowerCase();
      }

      if ('raw' in info && typeof info.raw === 'string') {
        return info.raw.toLowerCase();
      }
    }

    return '';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
