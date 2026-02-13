const MARKDOWN_PATTERN = /(^\s{0,3}#{1,6}\s)|(\*\*[^*]+\*\*)|(__[^_]+__)|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(^\s*[-*+]\s+)|(^\s*\d+\.\s+)/m;
const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

const escapeHtml = (value) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const decodeHtmlEntities = (value) => {
  if (typeof window === 'undefined') return value;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const renderInlineMarkup = (line) => {
  return line
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
};

const markdownToHtml = (value) => {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const output = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      output.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      output.push('</ol>');
      inOl = false;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      closeLists();
      return;
    }

    const bulletMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    if (bulletMatch) {
      if (inOl) {
        output.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        output.push('<ul>');
        inUl = true;
      }
      output.push(`<li>${renderInlineMarkup(escapeHtml(bulletMatch[1]))}</li>`);
      return;
    }

    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (inUl) {
        output.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        output.push('<ol>');
        inOl = true;
      }
      output.push(`<li>${renderInlineMarkup(escapeHtml(orderedMatch[1]))}</li>`);
      return;
    }

    closeLists();

    const headingMatch = line.match(/^\s*(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      output.push(`<h${level}>${renderInlineMarkup(escapeHtml(headingMatch[2]))}</h${level}>`);
      return;
    }

    const quoteMatch = line.match(/^\s*>\s+(.+)$/);
    if (quoteMatch) {
      output.push(`<blockquote>${renderInlineMarkup(escapeHtml(quoteMatch[1]))}</blockquote>`);
      return;
    }

    output.push(`<p>${renderInlineMarkup(escapeHtml(line))}</p>`);
  });

  closeLists();
  return output.join('');
};

const isSafeUrl = (value) => {
  return /^(https?:\/\/|mailto:|\/|#)/i.test(value);
};

const sanitizeHtml = (value) => {
  if (typeof window === 'undefined') return value;

  const safeTags = new Set([
    'a', 'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div',
    'img', 'video', 'audio', 'source', 'hr'
  ]);

  const template = document.createElement('template');
  template.innerHTML = value;

  template.content.querySelectorAll('*').forEach((element) => {
    const tagName = element.tagName.toLowerCase();

    if (!safeTags.has(tagName)) {
      element.replaceWith(document.createTextNode(element.textContent || ''));
      return;
    }

    [...element.attributes].forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value.trim();
      const allowedAttrs = new Set(['href', 'src', 'alt', 'title', 'target', 'rel', 'controls']);

      if (!allowedAttrs.has(attrName) || attrName.startsWith('on') || attrName === 'style') {
        element.removeAttribute(attr.name);
        return;
      }

      if ((attrName === 'href' || attrName === 'src') && !isSafeUrl(attrValue)) {
        element.removeAttribute(attr.name);
      }
    });

    if (tagName === 'a') {
      element.setAttribute('rel', 'noopener noreferrer');
      if (!element.getAttribute('target')) {
        element.setAttribute('target', '_blank');
      }
    }
  });

  return template.innerHTML;
};

export const toSafeRichHtml = (content) => {
  if (typeof content !== 'string' || !content.trim()) return '';

  const decoded = decodeHtmlEntities(content.trim());
  if (HTML_TAG_PATTERN.test(decoded)) {
    return sanitizeHtml(decoded);
  }

  if (MARKDOWN_PATTERN.test(decoded)) {
    return sanitizeHtml(markdownToHtml(decoded));
  }

  return sanitizeHtml(markdownToHtml(decoded));
};
