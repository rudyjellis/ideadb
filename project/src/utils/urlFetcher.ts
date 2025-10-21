interface FetchResult {
  success: boolean;
  content: string;
  error?: string;
}

export async function fetchUrlContent(url: string): Promise<FetchResult> {
  try {
    if (!url || !isValidUrl(url)) {
      return {
        success: false,
        content: '',
        error: 'Invalid URL format',
      };
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; IdeaExtractor/1.0)',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        content: '',
        error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();
    const extractedContent = extractContentFromHtml(html, url);

    if (!extractedContent) {
      return {
        success: false,
        content: '',
        error: 'Could not extract content from the page',
      };
    }

    return {
      success: true,
      content: extractedContent,
    };
  } catch (error) {
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Failed to fetch URL',
    };
  }
}

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

function extractContentFromHtml(html: string, url: string): string {
  const urlObj = new URL(url);

  if (urlObj.hostname.includes('ideabrowser.com')) {
    return extractFromIdeaBrowser(html);
  }

  return extractGenericContent(html);
}

function extractFromIdeaBrowser(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const contentSelectors = [
    'article',
    '[role="main"]',
    '.idea-content',
    '.content',
    'main',
  ];

  for (const selector of contentSelectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = cleanText(element.textContent || '');
      if (text.length > 100) {
        return text;
      }
    }
  }

  const body = doc.querySelector('body');
  if (body) {
    return cleanText(body.textContent || '');
  }

  return '';
}

function extractGenericContent(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const scriptsAndStyles = doc.querySelectorAll('script, style, nav, header, footer, aside');
  scriptsAndStyles.forEach(el => el.remove());

  const contentSelectors = [
    'article',
    '[role="main"]',
    '.content',
    '.post-content',
    '.article-content',
    'main',
  ];

  for (const selector of contentSelectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = cleanText(element.textContent || '');
      if (text.length > 100) {
        return text;
      }
    }
  }

  const body = doc.querySelector('body');
  if (body) {
    return cleanText(body.textContent || '');
  }

  return '';
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}
