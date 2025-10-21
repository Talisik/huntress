/**
 * General Web Content Parser for Browser Extensions
 * 
 * A comprehensive parser that extracts clean text content from any web page
 * by removing scripts, styles, navigation, advertisements, and other non-content elements.
 * 
 * Designed specifically for browser extensions - uses native browser APIs only.
 * Falls back to jsdom for Node.js testing environments.
 */

// Browser extension - use native browser APIs, fallback to jsdom for testing
let DOMParserImpl: typeof DOMParser;

try {
    // Try browser DOMParser first (for extensions)
    if (typeof DOMParser !== 'undefined') {
        DOMParserImpl = DOMParser;
    } else {
        // Fallback to jsdom for Node.js testing
        const { JSDOM } = require('jsdom');
        DOMParserImpl = class {
            parseFromString(html: string, type: string) {
                const dom = new JSDOM(html, {
                    resources: "usable",
                    runScripts: "outside-only",
                    pretendToBeVisual: false,
                    storageQuota: 10000000,
                    virtualConsole: new (require('jsdom').VirtualConsole)()
                });
                
                // Suppress CSS errors
                dom.virtualConsole.on("error", () => {});
                dom.virtualConsole.on("warn", () => {});
                
                return dom.window.document;
            }
        } as any;
    }
} catch (e) {
    throw new Error('Neither browser DOMParser nor jsdom is available');
}

export interface GeneralParserOptions {
    removeImages?: boolean;
    removeLinks?: boolean;
    preserveFormatting?: boolean;
    minContentLength?: number;
    includeMetadata?: boolean;
    cleanHtmlOnly?: boolean; // New option: only remove noise, keep HTML structure
}

export interface ParsedContent {
    url: string | null;
    title: string | null;
    content: string | null;
    metadata: {
        description?: string;
        author?: string;
        publishDate?: string;
        language?: string;
        keywords?: string[];
        images?: string[];
        links?: string[];
    };
    wordCount: number;
    readingTime: number; // in minutes
    cleanedHtml?: string;
    cleanedFullHtml?: string; // Full HTML with noise removed but structure preserved
}

export class GeneralParser {
    private options: GeneralParserOptions;
    
    // Elements to completely remove
    private readonly REMOVE_TAGS = [
        'script', 'style', 'noscript', 'iframe', 'embed', 'object',
        'nav', 'header', 'footer', 'aside', 'menu', 'menuitem',
        'form', 'input', 'button', 'select', 'textarea', 'label',
        'canvas', 'svg', 'audio', 'video', 'source', 'track',
        'map', 'area', 'base', 'link', 'meta', 'title'
    ];
    
    // Class patterns that typically contain non-content
    private readonly REMOVE_CLASS_PATTERNS = [
        'nav', 'navigation', 'menu', 'sidebar', 'aside', 'footer', 'header',
        'advertisement', 'ads', 'ad-', 'advert', 'banner', 'promo',
        'social', 'share', 'sharing', 'follow', 'subscribe',
        'comment', 'comments', 'discussion', 'reply', 'replies',
        'related', 'recommended', 'trending', 'popular', 'most-read',
        'newsletter', 'signup', 'subscribe', 'registration',
        'cookie', 'gdpr', 'privacy', 'consent', 'modal', 'popup', 'overlay',
        'breadcrumb', 'pagination', 'pager', 'next', 'prev', 'previous',
        'widget', 'plugin', 'embed', 'outbrain', 'taboola',
        'carousel', 'slider', 'gallery', 'lightbox',
        'search', 'filter', 'sort', 'dropdown',
        'loading', 'spinner', 'placeholder',
        'error', 'warning', 'alert', 'notice',
        'print', 'email', 'pdf', 'download',
        'tag', 'tags', 'category', 'categories',
        'author-bio', 'bio', 'profile', 'avatar',
        'date', 'time', 'timestamp', 'published',
        'vote', 'rating', 'star', 'like', 'dislike',
        'toolbar', 'controls', 'player-controls'
    ];
    
    // ID patterns that typically contain non-content
    private readonly REMOVE_ID_PATTERNS = [
        'nav', 'navigation', 'menu', 'sidebar', 'footer', 'header',
        'ads', 'advertisement', 'banner', 'promo',
        'social', 'share', 'comments', 'related',
        'newsletter', 'signup', 'modal', 'popup',
        'breadcrumb', 'pagination', 'search',
        'cookie', 'gdpr', 'consent'
    ];
    
    // Content selectors in order of preference
    private readonly CONTENT_SELECTORS = [
        'article',
        '[role="main"]',
        'main',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.content',
        '.main-content',
        '.story-content',
        '.article-body',
        '.post-body',
        '.articleBody',
        '.articleContent',
        '.text-content',
        '.body-content',
        '.page-content',
        '.single-content',
        '.blog-content',
        '.news-content'
    ];

    constructor(options: GeneralParserOptions = {}) {
        this.options = {
            removeImages: false,
            removeLinks: false, // Keep links for browser extensions
            preserveFormatting: true,
            minContentLength: 50, // Lower threshold for extensions
            includeMetadata: true,
            cleanHtmlOnly: false,
            ...options
        };
    }

    /**
     * Parse HTML content and extract clean text
     */
    public parse(html: string, url?: string): ParsedContent {
        if (!html || typeof html !== 'string') {
            throw new Error('Invalid HTML content provided');
        }

        const parser = new DOMParserImpl();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract metadata first (before cleaning)
        const metadata = this.options.includeMetadata ? this.extractMetadata(doc, url) : {};
        
        // Clean the document
        this.cleanDocument(doc);
        
        // If cleanHtmlOnly is true, return the cleaned HTML instead of extracting text
        if (this.options.cleanHtmlOnly) {
            let cleanedFullHtml = doc.documentElement.outerHTML;
            let cleanedHtml = doc.body?.innerHTML;
            const title = this.extractTitle(doc);
            const textContent = doc.body?.textContent || '';
            const wordCount = this.countWords(textContent);
            const readingTime = Math.ceil(wordCount / 200);
            
            // Remove HTML comments from output
            if (cleanedFullHtml) {
                cleanedFullHtml = cleanedFullHtml.replace(/<!--[\s\S]*?-->/g, '');
            }
            if (cleanedHtml) {
                cleanedHtml = cleanedHtml.replace(/<!--[\s\S]*?-->/g, '');
            }
            
            return {
                url: url || null,
                title,
                content: textContent,
                metadata,
                wordCount,
                readingTime,
                cleanedHtml,
                cleanedFullHtml
            };
        }
        
        // Extract title
        const title = this.extractTitle(doc);
        
        // Extract main content with HTML tags preserved
        const content = this.extractContentWithHtml(doc);
        
        // Calculate reading metrics based on text content
        const textContent = this.extractContent(doc);
        const wordCount = this.countWords(textContent || '');
        const readingTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words per minute
        
        // Remove HTML comments from final output
        let cleanedHtml = this.options.preserveFormatting ? doc.body?.innerHTML : undefined;
        let cleanedFullHtml = this.options.cleanHtmlOnly ? doc.documentElement.outerHTML : undefined;
        
        if (cleanedHtml) {
            cleanedHtml = cleanedHtml.replace(/<!--[\s\S]*?-->/g, '');
        }
        if (cleanedFullHtml) {
            cleanedFullHtml = cleanedFullHtml.replace(/<!--[\s\S]*?-->/g, '');
        }
        
        return {
            url: url || null,
            title,
            content,
            metadata,
            wordCount,
            readingTime,
            cleanedHtml,
            cleanedFullHtml
        };
    }

    /**
     * Extract metadata from the document
     */
    private extractMetadata(doc: Document, url?: string): any {
        const metadata: any = {};
        
        // Description
        const descMeta = doc.querySelector('meta[name="description"], meta[property="og:description"]');
        if (descMeta) {
            metadata.description = descMeta.getAttribute('content');
        }
        
        // Author
        const authorMeta = doc.querySelector('meta[name="author"], meta[property="article:author"]');
        if (authorMeta) {
            metadata.author = authorMeta.getAttribute('content');
        } else {
            // Try to find author in common selectors
            const authorSelectors = ['.author', '.byline', '[rel="author"]', '.article-author'];
            for (const selector of authorSelectors) {
                const authorEl = doc.querySelector(selector);
                if (authorEl && authorEl.textContent) {
                    metadata.author = authorEl.textContent.trim();
                    break;
                }
            }
        }
        
        // Publish date
        const dateMeta = doc.querySelector('meta[property="article:published_time"], meta[name="date"]');
        if (dateMeta) {
            metadata.publishDate = dateMeta.getAttribute('content');
        } else {
            const timeEl = doc.querySelector('time[datetime]');
            if (timeEl) {
                metadata.publishDate = timeEl.getAttribute('datetime');
            }
        }
        
        // Language
        const langEl = doc.querySelector('html[lang]');
        if (langEl) {
            metadata.language = langEl.getAttribute('lang');
        }
        
        // Keywords
        const keywordsMeta = doc.querySelector('meta[name="keywords"]');
        if (keywordsMeta) {
            const keywords = keywordsMeta.getAttribute('content');
            if (keywords) {
                metadata.keywords = keywords.split(',').map(k => k.trim()).filter(Boolean);
            }
        }
        
        // Images
        const images: string[] = [];
        const imgElements = doc.querySelectorAll('img[src]');
        imgElements.forEach(img => {
            const src = img.getAttribute('src');
            if (src && this.isValidImageUrl(src, url)) {
                images.push(this.resolveUrl(src, url));
            }
        });
        if (images.length > 0) {
            metadata.images = images;
        }
        
        // Links
        if (!this.options.removeLinks) {
            const links: string[] = [];
            const linkElements = doc.querySelectorAll('a[href]');
            linkElements.forEach(link => {
                const href = link.getAttribute('href');
                if (href && this.isValidUrl(href)) {
                    links.push(this.resolveUrl(href, url));
                }
            });
            if (links.length > 0) {
                metadata.links = links;
            }
        }
        
        return metadata;
    }

    /**
     * Clean the document by removing unwanted elements
     */
    private cleanDocument(doc: Document): void {
        // Remove HTML comments first
        this.removeComments(doc);
        
        // Remove unwanted tags
        this.REMOVE_TAGS.forEach(tag => {
            const elements = doc.querySelectorAll(tag);
            elements.forEach(el => el.remove());
        });
        
        // Remove elements with unwanted classes
        this.REMOVE_CLASS_PATTERNS.forEach(pattern => {
            const elements = doc.querySelectorAll(`[class*="${pattern}"]`);
            elements.forEach(el => el.remove());
        });
        
        // Remove elements with unwanted IDs
        this.REMOVE_ID_PATTERNS.forEach(pattern => {
            const elements = doc.querySelectorAll(`[id*="${pattern}"]`);
            elements.forEach(el => el.remove());
        });
        
        // Remove hidden elements
        const hiddenElements = doc.querySelectorAll('[style*="display:none"], [style*="display: none"], [hidden]');
        hiddenElements.forEach(el => el.remove());
        
        // Remove elements with minimal text content that are likely navigation/UI
        const allElements = doc.querySelectorAll('div, span, section, aside');
        allElements.forEach(el => {
            const text = el.textContent || '';
            const trimmedText = text.trim();
            
            // Remove if it's very short and contains common UI patterns
            if (trimmedText.length < 50) {
                const uiPatterns = [
                    /^(menu|nav|search|login|sign in|register|subscribe|follow|share|like|comment|reply|next|previous|more|less|show|hide|close|open|toggle)$/i,
                    /^(home|about|contact|privacy|terms|cookies|help|support|faq)$/i,
                    /^(facebook|twitter|instagram|linkedin|youtube|pinterest|reddit)$/i,
                    /^\d+$/, // Just numbers
                    /^[^\w\s]+$/, // Just symbols
                ];
                
                if (uiPatterns.some(pattern => pattern.test(trimmedText))) {
                    el.remove();
                }
            }
        });
        
        // Remove images if requested
        if (this.options.removeImages) {
            const images = doc.querySelectorAll('img, picture, figure');
            images.forEach(img => img.remove());
        }
        
        // Remove links if requested
        if (this.options.removeLinks) {
            const links = doc.querySelectorAll('a');
            links.forEach(link => {
                // Replace link with its text content
                const textNode = doc.createTextNode(link.textContent || '');
                link.parentNode?.replaceChild(textNode, link);
            });
        }
        
        // Remove empty elements
        this.removeEmptyElements(doc);
    }

    /**
     * Remove HTML comments from the document
     */
    private removeComments(doc: Document): void {
        const walker = doc.createTreeWalker(
            doc.documentElement,
            8 // NodeFilter.SHOW_COMMENT
        );

        const comments: Comment[] = [];
        let node;
        while (node = walker.nextNode()) {
            comments.push(node as Comment);
        }

        // Remove all comments
        comments.forEach(comment => {
            if (comment.parentNode) {
                comment.parentNode.removeChild(comment);
            }
        });
    }

    /**
     * Remove empty elements recursively
     */
    private removeEmptyElements(doc: Document): void {
        let removed = true;
        while (removed) {
            removed = false;
            const elements = doc.querySelectorAll('*');
            elements.forEach(el => {
                if (el.children.length === 0 && (!el.textContent || el.textContent.trim() === '')) {
                    // Don't remove certain self-closing tags
                    if (!['img', 'br', 'hr', 'input', 'meta', 'link'].includes(el.tagName.toLowerCase())) {
                        el.remove();
                        removed = true;
                    }
                }
            });
        }
    }

    /**
     * Extract the main title from the document
     */
    private extractTitle(doc: Document): string | null {
        // Try different title selectors in order of preference
        const titleSelectors = [
            'h1.title',
            'h1.article-title',
            'h1.post-title',
            'h1.entry-title',
            '.article-header h1',
            '.post-header h1',
            'article h1',
            'h1',
            '.title',
            '.article-title',
            '.post-title'
        ];
        
        for (const selector of titleSelectors) {
            const titleEl = doc.querySelector(selector);
            if (titleEl && titleEl.textContent) {
                const title = titleEl.textContent.trim();
                if (title.length > 10 && title.length < 200) {
                    return title;
                }
            }
        }
        
        return null;
    }

    /**
     * Extract the main content from the document with HTML tags preserved
     */
    private extractContentWithHtml(doc: Document): string | null {
        // Try content selectors in order of preference
        for (const selector of this.CONTENT_SELECTORS) {
            const contentEl = doc.querySelector(selector);
            if (contentEl) {
                const content = this.extractHtmlFromElement(contentEl);
                const textLength = (contentEl.textContent || '').length;
                if (content && textLength >= (this.options.minContentLength || 100)) {
                    return content;
                }
            }
        }
        
        // Fallback: find the element with the most text content
        const candidates = doc.querySelectorAll('div, section, article');
        let bestElement: Element | null = null;
        let bestScore = 0;
        
        candidates.forEach(el => {
            const text = el.textContent || '';
            const score = this.calculateContentScore(el, text);
            
            if (score > bestScore && text.length >= (this.options.minContentLength || 100)) {
                bestScore = score;
                bestElement = el;
            }
        });
        
        if (bestElement) {
            return this.extractHtmlFromElement(bestElement);
        }
        
        // Final fallback: extract from body
        if (doc.body) {
            const textLength = (doc.body.textContent || '').length;
            if (textLength >= (this.options.minContentLength || 100)) {
                return this.extractHtmlFromElement(doc.body);
            }
        }
        
        return null;
    }

    /**
     * Extract the main content from the document
     */
    private extractContent(doc: Document): string | null {
        // Try content selectors in order of preference
        for (const selector of this.CONTENT_SELECTORS) {
            const contentEl = doc.querySelector(selector);
            if (contentEl) {
                const content = this.extractTextFromElement(contentEl);
                if (content && content.length >= (this.options.minContentLength || 100)) {
                    return content;
                }
            }
        }
        
        // Fallback: find the element with the most text content
        const candidates = doc.querySelectorAll('div, section, article');
        let bestElement: Element | null = null;
        let bestScore = 0;
        
        candidates.forEach(el => {
            const text = el.textContent || '';
            const score = this.calculateContentScore(el, text);
            
            if (score > bestScore && text.length >= (this.options.minContentLength || 100)) {
                bestScore = score;
                bestElement = el;
            }
        });
        
        if (bestElement) {
            return this.extractTextFromElement(bestElement);
        }
        
        // Final fallback: extract from body
        if (doc.body) {
            const content = this.extractTextFromElement(doc.body);
            if (content && content.length >= (this.options.minContentLength || 100)) {
                return content;
            }
        }
        
        return null;
    }

    /**
     * Calculate a score for how likely an element contains main content
     */
    private calculateContentScore(element: Element, text: string): number {
        let score = text.length;
        
        // Bonus for paragraph tags
        const paragraphs = element.querySelectorAll('p');
        score += paragraphs.length * 50;
        
        // Bonus for content-related classes
        const className = element.className.toLowerCase();
        const contentKeywords = ['content', 'article', 'post', 'story', 'text', 'body'];
        contentKeywords.forEach(keyword => {
            if (className.includes(keyword)) {
                score += 100;
            }
        });
        
        // Penalty for navigation-related classes
        const navKeywords = ['nav', 'menu', 'sidebar', 'footer', 'header', 'ads', 'comment'];
        navKeywords.forEach(keyword => {
            if (className.includes(keyword)) {
                score -= 200;
            }
        });
        
        // Penalty for too many links relative to text
        const links = element.querySelectorAll('a');
        const linkRatio = links.length / Math.max(text.length / 100, 1);
        if (linkRatio > 0.3) {
            score -= linkRatio * 100;
        }
        
        return Math.max(0, score);
    }

    /**
     * Extract HTML from an element while removing noise elements
     */
    private extractHtmlFromElement(element: Element): string {
        // Clone the element to avoid modifying the original
        const clone = element.cloneNode(true) as Element;
        
        // Remove any remaining unwanted elements from the clone
        const unwantedSelectors = [
            'script', 'style', 'nav', 'header', 'footer', 'aside',
            '.advertisement', '.ads', '.social', '.share', '.comments',
            '.related', '.recommended', '.newsletter', '.popup'
        ];
        
        unwantedSelectors.forEach(selector => {
            const elements = clone.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        // Get HTML content
        let html = clone.innerHTML || '';
        
        // Remove HTML comments from the HTML string (more comprehensive)
        html = html.replace(/<!--[\s\S]*?-->/g, '');
        
        // Clean up excessive whitespace while preserving structure
        html = html
            .replace(/>\s+</g, '><') // Remove whitespace between tags
            .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
            .trim();
        
        return html;
    }

    /**
     * Extract clean text from an element
     */
    private extractTextFromElement(element: Element): string {
        // Clone the element to avoid modifying the original
        const clone = element.cloneNode(true) as Element;
        
        // Remove any remaining unwanted elements from the clone
        const unwantedSelectors = [
            'script', 'style', 'nav', 'header', 'footer', 'aside',
            '.advertisement', '.ads', '.social', '.share', '.comments',
            '.related', '.recommended', '.newsletter', '.popup'
        ];
        
        unwantedSelectors.forEach(selector => {
            const elements = clone.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        // Remove HTML comments from the clone first
        if (clone.ownerDocument) {
            this.removeComments(clone.ownerDocument);
        }
        
        // Get text content
        let text = clone.textContent || '';
        
        // Clean up the text
        text = text
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
            .trim();
        
        // Remove common noise patterns
        const noisePatterns = [
            /^(Advertisement|Sponsored|Promoted)$/gm,
            /^(Share|Like|Tweet|Pin|Email)$/gm,
            /^(Next|Previous|Continue Reading)$/gm,
            /^(Tags?:|Categories?:|Filed Under:).*$/gm,
            /^(Related Articles?|You May Also Like|Recommended).*$/gm,
            /^\d+\s+(shares?|likes?|comments?)$/gm,
            /^(Subscribe|Sign up|Newsletter).*$/gm
        ];
        
        noisePatterns.forEach(pattern => {
            text = text.replace(pattern, '');
        });
        
        // Final cleanup
        text = text
            .replace(/\n\s*\n/g, '\n')
            .trim();
        
        return text;
    }

    /**
     * Count words in text
     */
    private countWords(text: string): number {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Check if a URL is valid
     */
    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return url.startsWith('/') || url.startsWith('#');
        }
    }

    /**
     * Check if an image URL is valid and not an icon/logo
     */
    private isValidImageUrl(src: string, baseUrl?: string): boolean {
        if (!src) return false;
        
        // Skip data URLs, icons, and logos
        if (src.startsWith('data:') || 
            src.includes('icon') || 
            src.includes('logo') || 
            src.includes('favicon') ||
            src.includes('sprite')) {
            return false;
        }
        
        // Check file extension
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const hasImageExtension = imageExtensions.some(ext => 
            src.toLowerCase().includes(ext)
        );
        
        return hasImageExtension || this.isValidUrl(src);
    }

    /**
     * Resolve relative URLs to absolute URLs
     */
    private resolveUrl(url: string, baseUrl?: string): string {
        if (!baseUrl || url.startsWith('http')) {
            return url;
        }
        
        try {
            return new URL(url, baseUrl).href;
        } catch {
            return url;
        }
    }

    /**
     * Simple static method - just provide URL and HTML, get clean content
     * This is the main method you should use for browser extensions
     */
    public static parseContent(url: string, html: string): ParsedContent {
        const parser = new GeneralParser({
            removeImages: false,
            removeLinks: false, // Keep links for browser extensions
            preserveFormatting: true,
            minContentLength: 10,
            includeMetadata: true,
            cleanHtmlOnly: false
        });
        return parser.parse(html, url);
    }

    /**
     * Static method for quick parsing (legacy - use parseContent instead)
     */
    public static parse(html: string, url?: string, options?: GeneralParserOptions): ParsedContent {
        const parser = new GeneralParser(options);
        return parser.parse(html, url);
    }

    /**
     * Extract only text content without metadata
     */
    public static extractText(html: string, minLength: number = 100): string | null {
        const parser = new GeneralParser({ 
            includeMetadata: false, 
            minContentLength: minLength 
        });
        const result = parser.parse(html);
        return result.content;
    }

    /**
     * Extract title only
     */
    public static extractTitle(html: string): string | null {
        const parser = new GeneralParser({ includeMetadata: false });
        const result = parser.parse(html);
        return result.title;
    }

    /**
     * Clean HTML by removing noise but keeping structure
     */
    public static cleanHtml(html: string, options?: Omit<GeneralParserOptions, 'cleanHtmlOnly'>): string | null {
        const parser = new GeneralParser({ 
            ...options,
            cleanHtmlOnly: true 
        });
        const result = parser.parse(html);
        return result.cleanedFullHtml || null;
    }
}
