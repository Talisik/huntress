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
    removeClasses?: boolean; // New option: remove class attributes from HTML elements
    removeIds?: boolean; // New option: remove id attributes from HTML elements
    removeStyles?: boolean; // New option: remove style attributes from HTML elements
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
        'nav', 'header', 'aside', 'menu', 'menuitem', // Removed 'footer' - we'll handle it smartly
        'form', 'input', 'button', 'select', 'textarea', 'label',
        'canvas', 'svg', 'audio', 'video', 'source', 'track',
        'map', 'area', 'base', 'link', 'meta', 'title'
    ];
    
    // Class patterns that typically contain non-content
    private readonly REMOVE_CLASS_PATTERNS = [
        'nav', 'navigation', 'menu', 'sidebar', 'aside', 'header', // Removed 'footer' - handle smartly
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
        'nav', 'navigation', 'menu', 'sidebar', 'header', // Removed 'footer' - handle smartly
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
            removeClasses: false, // Keep classes by default
            removeIds: false, // Keep IDs by default
            removeStyles: false, // Keep inline styles by default
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
     * Extract metadata from the document with robust fallbacks
     */
    private extractMetadata(doc: Document, url?: string): any {
        const metadata: any = {};
        
        // Description with fallback hierarchy
        const descriptionSources = [
            () => doc.querySelector('meta[property="og:description"]')?.getAttribute('content'),
            () => doc.querySelector('meta[name="description"]')?.getAttribute('content'),
            () => doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content'),
            () => {
                // Try structured data
                try {
                    const jsonLd = doc.querySelector('script[type="application/ld+json"]');
                    if (jsonLd && jsonLd.textContent) {
                        const data = JSON.parse(jsonLd.textContent);
                        return data.description;
                    }
                } catch (e) {}
                return null;
            },
            () => {
                // First paragraph as fallback
                const firstP = doc.querySelector('article p, main p, .content p, p');
                const text = firstP?.textContent?.trim();
                return text && text.length > 50 && text.length < 300 ? text : null;
            }
        ];
        
        for (const source of descriptionSources) {
            try {
                const desc = source();
                if (desc && desc.trim().length > 10) {
                    metadata.description = desc.trim();
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        // Author with robust fallback hierarchy
        const authorSources = [
            () => doc.querySelector('meta[name="author"]')?.getAttribute('content'),
            () => doc.querySelector('meta[property="article:author"]')?.getAttribute('content'),
            () => doc.querySelector('meta[name="twitter:creator"]')?.getAttribute('content'),
            () => {
                // Try structured data
                try {
                    const jsonLd = doc.querySelector('script[type="application/ld+json"]');
                    if (jsonLd && jsonLd.textContent) {
                        const data = JSON.parse(jsonLd.textContent);
                        if (data.author) {
                            return typeof data.author === 'string' ? data.author : data.author.name;
                        }
                    }
                } catch (e) {}
                return null;
            },
            () => doc.querySelector('[rel="author"]')?.textContent?.trim(),
            () => doc.querySelector('.author, .byline, .article-author, .post-author')?.textContent?.trim(),
            () => doc.querySelector('[class*="author"], [class*="byline"]')?.textContent?.trim()
        ];
        
        for (const source of authorSources) {
            try {
                const author = source();
                if (author && author.length > 1 && author.length < 100) {
                    // Clean author text (remove "By " prefix, etc.)
                    metadata.author = author.replace(/^(by\s+|author:\s*)/i, '').trim();
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        // Publish date with fallback hierarchy
        const dateSources = [
            () => doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content'),
            () => doc.querySelector('meta[name="date"]')?.getAttribute('content'),
            () => doc.querySelector('meta[name="publish_date"]')?.getAttribute('content'),
            () => doc.querySelector('time[datetime]')?.getAttribute('datetime'),
            () => doc.querySelector('time[pubdate]')?.getAttribute('datetime'),
            () => {
                // Try structured data
                try {
                    const jsonLd = doc.querySelector('script[type="application/ld+json"]');
                    if (jsonLd && jsonLd.textContent) {
                        const data = JSON.parse(jsonLd.textContent);
                        return data.datePublished || data.dateCreated;
                    }
                } catch (e) {}
                return null;
            },
            () => {
                // Look for date patterns in text
                const dateSelectors = ['.date, .published, .publish-date, .article-date, .post-date'];
                for (const selector of dateSelectors) {
                    const el = doc.querySelector(selector);
                    if (el) {
                        const text = el.textContent?.trim();
                        // Simple date pattern matching
                        const dateMatch = text?.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{1,2}, \d{4}/);
                        if (dateMatch) return dateMatch[0];
                    }
                }
                return null;
            }
        ];
        
        for (const source of dateSources) {
            try {
                const date = source();
                if (date) {
                    metadata.publishDate = date;
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        // Language with fallbacks
        metadata.language = doc.querySelector('html[lang]')?.getAttribute('lang')?.split('-')[0] || 
                           doc.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') || 
                           'en'; // Default to English
        
        // Keywords with fallbacks
        const keywordsSources = [
            () => doc.querySelector('meta[name="keywords"]')?.getAttribute('content'),
            () => doc.querySelector('meta[property="article:tag"]')?.getAttribute('content'),
            () => {
                // Extract from structured data
                try {
                    const jsonLd = doc.querySelector('script[type="application/ld+json"]');
                    if (jsonLd && jsonLd.textContent) {
                        const data = JSON.parse(jsonLd.textContent);
                        return data.keywords || (data.about && data.about.map((item: any) => item.name).join(', '));
                    }
                } catch (e) {}
                return null;
            }
        ];
        
        for (const source of keywordsSources) {
            try {
                const keywords = source();
                if (keywords) {
                    metadata.keywords = keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        // Images with robust extraction
        const images: string[] = [];
        
        // Priority order: og:image, twitter:image, article images, all images
        const imageSources = [
            () => doc.querySelector('meta[property="og:image"]')?.getAttribute('content'),
            () => doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
            () => {
                const articleImages = doc.querySelectorAll('article img[src], main img[src], .content img[src]');
                return Array.from(articleImages).map(img => img.getAttribute('src')).filter(Boolean);
            },
            () => {
                const allImages = doc.querySelectorAll('img[src]');
                return Array.from(allImages).map(img => img.getAttribute('src')).filter(Boolean);
            }
        ];
        
        for (const source of imageSources) {
            try {
                const result = source();
                const urls = Array.isArray(result) ? result : [result];
                
                for (const src of urls) {
                    if (src && this.isValidImageUrl(src, url)) {
                        const resolvedUrl = this.resolveUrl(src, url);
                        if (!images.includes(resolvedUrl)) {
                            images.push(resolvedUrl);
                        }
                    }
                }
                
                if (images.length >= 5) break; // Limit to first 5 images
            } catch (e) {
                continue;
            }
        }
        
        if (images.length > 0) {
            metadata.images = images;
        }
        
        // Links (if not removed)
        if (!this.options.removeLinks) {
            const links: string[] = [];
            const linkElements = doc.querySelectorAll('a[href]');
            linkElements.forEach(link => {
                const href = link.getAttribute('href');
                if (href && this.isValidUrl(href) && !href.startsWith('#')) {
                    const resolvedUrl = this.resolveUrl(href, url);
                    if (!links.includes(resolvedUrl) && links.length < 20) { // Limit to 20 links
                        links.push(resolvedUrl);
                    }
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
        
        // Process footers smartly - extract useful info, remove noise
        this.processFooters(doc);
        
        // Clean HTML attributes if requested
        this.cleanAttributes(doc);
        
        // Remove empty elements
        this.removeEmptyElements(doc);
    }

    /**
     * Clean HTML attributes (class, id, style) from elements if requested
     */
    private cleanAttributes(doc: Document): void {
        if (!this.options.removeClasses && !this.options.removeIds && !this.options.removeStyles) {
            return; // Nothing to clean
        }

        // Get all elements in the document
        const allElements = doc.querySelectorAll('*');
        
        allElements.forEach(element => {
            // Remove class attributes
            if (this.options.removeClasses && element.hasAttribute('class')) {
                element.removeAttribute('class');
            }
            
            // Remove id attributes
            if (this.options.removeIds && element.hasAttribute('id')) {
                element.removeAttribute('id');
            }
            
            // Remove style attributes
            if (this.options.removeStyles && element.hasAttribute('style')) {
                element.removeAttribute('style');
            }
        });
    }

    /**
     * Smart footer processing - extract useful information, remove noise
     */
    private processFooters(doc: Document): void {
        const footers = doc.querySelectorAll('footer, [class*="footer"], [id*="footer"]');
        
        footers.forEach(footer => {
            // Check if footer contains valuable information
            const footerText = footer.textContent || '';
            const hasValuableInfo = this.hasValuableFooterInfo(footerText);
            
            if (hasValuableInfo) {
                // Keep footer but clean out noise elements within it
                this.cleanFooterNoise(footer);
            } else {
                // Remove the entire footer if it's just noise
                footer.remove();
            }
        });
    }
    
    /**
     * Check if footer contains valuable information worth keeping
     */
    private hasValuableFooterInfo(text: string): boolean {
        const valuablePatterns = [
            // Contact information
            /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone numbers
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
            /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Place|Pl)\b/i, // Addresses
            
            // Business information
            /\b(?:LLC|Inc|Corp|Corporation|Ltd|Limited|Company|Co\.)\b/i, // Company suffixes
            /\b(?:Founded|Established|Since)\s+\d{4}\b/i, // Founded dates
            /\b(?:Copyright|©)\s*\d{4}/i, // Copyright with year
            
            // Location information
            /\b[A-Z][a-z]+,\s*[A-Z]{2}\s+\d{5}\b/, // City, State ZIP
            /\b\d{1,5}\s+[A-Za-z\s]+,\s*[A-Z][a-z]+/i, // Street address with city
            
            // Legal/Important information
            /\b(?:Terms of Service|Privacy Policy|Legal Notice|Disclaimer)\b/i,
            /\b(?:All rights reserved|Trademark|Patent)\b/i,
            
            // Business hours/operational info
            /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday).*\d{1,2}:\d{2}/i, // Business hours
            /\b(?:Open|Closed|Hours).*\d{1,2}:\d{2}/i, // Operating hours
            
            // Substantial content (not just links)
            /\b(?:About|Mission|Vision|Values|History|Team|Leadership|Careers|Jobs)\b/i
        ];
        
        // Check if text contains valuable patterns
        const hasValuablePattern = valuablePatterns.some(pattern => pattern.test(text));
        
        // Also check for substantial content (more than just navigation links)
        const words = text.trim().split(/\s+/).filter(word => word.length > 2);
        const hasSubstantialContent = words.length > 20; // At least 20 meaningful words
        
        // Check link-to-text ratio (if mostly links, probably not valuable)
        const linkCount = (text.match(/\b(?:Home|About|Contact|Services|Products|Blog|News|Help|Support|FAQ|Login|Register|Subscribe)\b/gi) || []).length;
        const isNotJustNavigation = linkCount < words.length * 0.3; // Less than 30% navigation words
        
        return hasValuablePattern || (hasSubstantialContent && isNotJustNavigation);
    }
    
    /**
     * Clean noise elements from within a valuable footer
     */
    private cleanFooterNoise(footer: Element): void {
        // Remove obvious noise elements within the footer
        const noiseSelectors = [
            '.social', '.share', '.newsletter', '.signup',
            '.advertisement', '.ads', '.banner', '.promo',
            '.cookie', '.gdpr', '.consent',
            'form', 'input[type="email"]', 'input[type="text"]', 'button[type="submit"]'
        ];
        
        noiseSelectors.forEach(selector => {
            const elements = footer.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        // Remove navigation-only sections within footer
        const navSections = footer.querySelectorAll('nav, .nav, .navigation, .menu');
        navSections.forEach(nav => {
            const navText = nav.textContent || '';
            const isJustNavigation = /^(?:Home|About|Contact|Services|Products|Blog|News|Help|Support|FAQ|Login|Register|Subscribe|\s|,|•|·|\|)+$/i.test(navText.trim());
            
            if (isJustNavigation) {
                nav.remove();
            }
        });
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
     * Extract the main title from the document with robust fallbacks
     */
    private extractTitle(doc: Document): string | null {
        // Robust fallback hierarchy for title extraction
        const titleSources = [
            // 1. OpenGraph title (most reliable for articles)
            () => doc.querySelector('meta[property="og:title"]')?.getAttribute('content'),
            
            // 2. Twitter card title
            () => doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
            
            // 3. Structured data (JSON-LD)
            () => {
                try {
                    const jsonLd = doc.querySelector('script[type="application/ld+json"]');
                    if (jsonLd && jsonLd.textContent) {
                        const data = JSON.parse(jsonLd.textContent);
                        return data.headline || data.name || data.title;
                    }
                } catch (e) {
                    // Ignore JSON parsing errors
                }
                return null;
            },
            
            // 4. Article-specific selectors
            () => doc.querySelector('h1.title, h1.article-title, h1.post-title, h1.entry-title')?.textContent?.trim(),
            
            // 5. Article context selectors
            () => doc.querySelector('article h1, .article-header h1, .post-header h1')?.textContent?.trim(),
            
            // 6. First meaningful H1
            () => {
                const h1Elements = doc.querySelectorAll('h1');
                for (const h1 of h1Elements) {
                    const text = h1.textContent?.trim();
                    if (text && text.length > 10 && text.length < 200) {
                        return text;
                    }
                }
                return null;
            },
            
            // 7. Document title (cleaned)
            () => {
                const title = doc.querySelector('title')?.textContent?.trim();
                if (title) {
                    // Clean common title patterns: "Title | Site Name" or "Title - Site Name"
                    return title.split(/[|\-–—]/)[0].trim();
                }
                return null;
            },
            
            // 8. Any title-like class
            () => doc.querySelector('.title, .article-title, .post-title, .page-title')?.textContent?.trim(),
            
            // 9. Last resort: first heading of any level
            () => doc.querySelector('h1, h2, h3')?.textContent?.trim()
        ];
        
        // Try each source in order until we find a valid title
        for (const source of titleSources) {
            try {
                const title = source();
                if (title && title.length > 3 && title.length < 300) {
                    return title;
                }
            } catch (e) {
                // Continue to next source if this one fails
                continue;
            }
        }
        
        // Ultimate fallback: "Untitled Page"
        return "Untitled Page";
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
     * Extract the main content from the document with robust fallbacks
     */
    private extractContent(doc: Document): string | null {
        // Robust content extraction with multiple fallback strategies
        const contentStrategies = [
            // Strategy 1: Semantic content selectors
            () => {
                for (const selector of this.CONTENT_SELECTORS) {
                    const contentEl = doc.querySelector(selector);
                    if (contentEl) {
                        const content = this.extractTextFromElement(contentEl);
                        if (content && content.length >= (this.options.minContentLength || 50)) {
                            return content;
                        }
                    }
                }
                return null;
            },
            
            // Strategy 2: Largest text block with good content score
            () => {
                const candidates = doc.querySelectorAll('div, section, article, main');
                let bestElement: Element | null = null;
                let bestScore = 0;
                
                candidates.forEach(el => {
                    const text = el.textContent || '';
                    const score = this.calculateContentScore(el, text);
                    
                    if (score > bestScore && text.length >= (this.options.minContentLength || 50)) {
                        bestScore = score;
                        bestElement = el;
                    }
                });
                
                return bestElement ? this.extractTextFromElement(bestElement) : null;
            },
            
            // Strategy 3: Text density analysis - find element with highest text-to-markup ratio
            () => {
                const candidates = doc.querySelectorAll('div, section, article, main, p');
                let bestElement: Element | null = null;
                let bestDensity = 0;
                
                candidates.forEach(el => {
                    const textLength = (el.textContent || '').length;
                    const htmlLength = el.innerHTML.length;
                    const density = htmlLength > 0 ? textLength / htmlLength : 0;
                    
                    if (density > bestDensity && textLength >= (this.options.minContentLength || 50)) {
                        bestDensity = density;
                        bestElement = el;
                    }
                });
                
                return bestElement ? this.extractTextFromElement(bestElement) : null;
            },
            
            // Strategy 4: Paragraph aggregation - collect all meaningful paragraphs
            () => {
                const paragraphs = doc.querySelectorAll('p');
                const meaningfulParagraphs: string[] = [];
                
                paragraphs.forEach(p => {
                    const text = p.textContent?.trim();
                    if (text && text.length > 30 && !this.isLikelyNavigation(text)) {
                        meaningfulParagraphs.push(text);
                    }
                });
                
                const combined = meaningfulParagraphs.join('\n\n');
                return combined.length >= (this.options.minContentLength || 50) ? combined : null;
            },
            
            // Strategy 5: Body content with aggressive noise removal
            () => {
                if (doc.body) {
                    const bodyClone = doc.body.cloneNode(true) as Element;
                    
                    // Remove all known noise elements (footer handled separately)
                    const noiseSelectors = [
                        'nav', 'header', 'aside', 'form', 'script', 'style',
                        '.nav', '.navigation', '.menu', '.sidebar', '.header',
                        '.ads', '.advertisement', '.social', '.share', '.comments',
                        '.related', '.recommended', '.newsletter', '.popup', '.modal'
                    ];
                    
                    noiseSelectors.forEach(selector => {
                        const elements = bodyClone.querySelectorAll(selector);
                        elements.forEach(el => el.remove());
                    });
                    
                    const content = this.extractTextFromElement(bodyClone);
                    return content && content.length >= (this.options.minContentLength || 50) ? content : null;
                }
                return null;
            },
            
            // Strategy 6: Last resort - raw body text
            () => {
                const bodyText = doc.body?.textContent?.trim();
                if (bodyText && bodyText.length >= (this.options.minContentLength || 20)) {
                    // Basic cleanup
                    return bodyText
                        .replace(/\s+/g, ' ')
                        .replace(/\n\s*\n/g, '\n')
                        .trim();
                }
                return null;
            }
        ];
        
        // Try each strategy until we get usable content
        for (const strategy of contentStrategies) {
            try {
                const content = strategy();
                if (content && content.trim().length > 0) {
                    return content;
                }
            } catch (e) {
                // Continue to next strategy if this one fails
                continue;
            }
        }
        
        // Ultimate fallback: return something, even if minimal
        return doc.body?.textContent?.trim() || "No content found";
    }
    
    /**
     * Check if text is likely navigation/UI element
     */
    private isLikelyNavigation(text: string): boolean {
        const navPatterns = [
            /^(home|about|contact|login|register|search|menu|nav)$/i,
            /^(next|previous|more|less|show|hide|toggle)$/i,
            /^(share|like|tweet|pin|email)$/i,
            /^(subscribe|sign up|newsletter)$/i,
            /^\d+$/, // Just numbers
            /^[^\w\s]+$/, // Just symbols
            /^.{1,3}$/ // Very short text
        ];
        
        return navPatterns.some(pattern => pattern.test(text.trim()));
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
        
        // Remove any remaining unwanted elements from the clone (footer handled separately)
        const unwantedSelectors = [
            'script', 'style', 'nav', 'header', 'aside',
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
        
        // Remove any remaining unwanted elements from the clone (footer handled separately)
        const unwantedSelectors = [
            'script', 'style', 'nav', 'header', 'aside',
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
     * Extract ALL text content with minimal filtering (more aggressive extraction)
     */
    public static parseAllContent(url: string, html: string): ParsedContent {
        const parser = new GeneralParser({
            removeImages: false,
            removeLinks: false,
            preserveFormatting: true,
            minContentLength: 1, // Accept even very short text
            includeMetadata: true,
            cleanHtmlOnly: false
        });
        return parser.parse(html, url);
    }

    /**
     * Extract EVERYTHING - raw text with only basic cleanup (maximum extraction)
     */
    public static extractEverything(url: string, html: string): ParsedContent {
        if (!html || typeof html !== 'string') {
            throw new Error('Invalid HTML content provided');
        }

        const parser = new DOMParserImpl();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Only remove scripts and styles - keep everything else
        const scriptsAndStyles = doc.querySelectorAll('script, style, noscript');
        scriptsAndStyles.forEach(el => el.remove());
        
        // Get ALL text from body
        const allText = doc.body?.textContent || doc.documentElement.textContent || '';
        
        // Basic cleanup only
        const cleanedText = allText
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
            .trim();
        
        // Extract basic metadata
        const title = doc.querySelector('title')?.textContent?.trim() || 
                     doc.querySelector('h1')?.textContent?.trim() || 
                     'Untitled Page';
        
        const wordCount = cleanedText.split(/\s+/).filter(word => word.length > 0).length;
        const readingTime = Math.ceil(wordCount / 200);
        
        return {
            url: url || null,
            title,
            content: cleanedText,
            metadata: {
                language: doc.querySelector('html[lang]')?.getAttribute('lang') || 'en'
            },
            wordCount,
            readingTime
        };
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

    /**
     * Parse content with clean HTML (no classes, IDs, or styles)
     */
    public static parseCleanContent(url: string, html: string): ParsedContent {
        const parser = new GeneralParser({
            removeImages: false,
            removeLinks: false,
            preserveFormatting: true,
            minContentLength: 10,
            includeMetadata: true,
            cleanHtmlOnly: false,
            removeClasses: true,  // Remove all class attributes
            removeIds: true,      // Remove all id attributes
            removeStyles: true    // Remove all style attributes
        });
        return parser.parse(html, url);
    }

    /**
     * Parse content with minimal HTML (only remove classes)
     */
    public static parseMinimalContent(url: string, html: string): ParsedContent {
        const parser = new GeneralParser({
            removeImages: false,
            removeLinks: false,
            preserveFormatting: true,
            minContentLength: 10,
            includeMetadata: true,
            cleanHtmlOnly: false,
            removeClasses: true,  // Remove only class attributes
            removeIds: false,     // Keep IDs
            removeStyles: false   // Keep styles
        });
        return parser.parse(html, url);
    }
}
