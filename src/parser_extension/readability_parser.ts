import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface ReadabilityPayload {
    article_title: string;
    article_website_name: string;
    article_fqdn: string;
    article_section: string[] | null;
    article_authors: string[] | null;
    article_published_date: string | null;
    article_images: string[] | null;
    article_content: string | null;
    article_videos: any[];
    article_language: string;
    article_status: string;
    article_error_status: string | null;
    article_url: string;
}

export interface ReadabilityResponse {
    data: ReadabilityPayload[];
    status: string;
    error_message: string | null;
    processing_time_in_seconds: number;
}

/**
 * Extract article content using Mozilla's Readability.js library
 * @param url - The URL of the article
 * @param htmlContent - The raw HTML content of the page
 * @returns Promise<ReadabilityResponse> - Structured response with article data
 */
export async function extractWithReadability(url: string, htmlContent: string): Promise<ReadabilityResponse> {
    const startTime = performance.now();

    try {
        if (!url || !htmlContent) {
            throw new Error('URL and HTML content are required');
        }

        // Parse the HTML using JSDOM
        const dom = new JSDOM(htmlContent, { url });
        const document = dom.window.document;

        // Use Readability to parse the document
        const reader = new Readability(document);
        const article = reader.parse();

        if (!article) {
            throw new Error('Failed to parse the article content using Readability');
        }

        // Extract additional metadata from the document
        const getFqdn = (url: string): string => {
            try {
                return new URL(url).hostname;
            } catch {
                return '';
            }
        };

        const getWebsiteName = (fqdn: string): string => {
            return fqdn.replace(/^www\./, '').split('.')[0];
        };

        const extractPublishedDate = (doc: Document): string | null => {
            const selectors = [
                'meta[property="article:published_time"]',
                'meta[name="article:published_time"]',
                'meta[property="og:published_time"]',
                'meta[name="date"]',
                'meta[name="pubdate"]',
                'meta[name="publishdate"]',
                'time[datetime]',
                '[class*="date"]',
                '[class*="time"]'
            ];

            for (const selector of selectors) {
                const element = doc.querySelector(selector);
                if (element) {
                    const dateValue = element.getAttribute('content') || 
                                    element.getAttribute('datetime') || 
                                    element.textContent;
                    
                    if (dateValue) {
                        const date = new Date(dateValue);
                        if (!isNaN(date.getTime())) {
                            return date.toISOString();
                        }
                    }
                }
            }
            return null;
        };

        const extractImages = (doc: Document): string[] => {
            const images: string[] = [];
            
            // Try to get main image from meta tags
            const ogImage = doc.querySelector('meta[property="og:image"]');
            if (ogImage) {
                const imageUrl = ogImage.getAttribute('content');
                if (imageUrl && imageUrl.startsWith('http')) {
                    images.push(imageUrl);
                }
            }

            // Get other images from the article content
            const articleImages = doc.querySelectorAll('article img, .content img, .article-content img');
            articleImages.forEach(img => {
                const src = img.getAttribute('src');
                if (src && src.startsWith('http') && !images.includes(src)) {
                    // Filter out logos, favicons, icons, and ads
                    if (!src.match(/logo|favicon|icon|ad|banner/i)) {
                        images.push(src);
                    }
                }
            });

            return images.slice(0, 5); // Limit to 5 images
        };

        const extractSections = (doc: Document): string[] | null => {
            const sectionMeta = doc.querySelector('meta[property="article:section"], meta[property="og:article:section"]');
            if (sectionMeta) {
                const content = sectionMeta.getAttribute('content');
                if (content && content.trim() !== '') {
                    return content.split(',').map(s => s.trim()).filter(Boolean);
                }
            }
            return null;
        };

        const extractAuthors = (article: any, doc: Document): string[] | null => {
            const authors: string[] = [];
            
            // First try Readability's byline
            if (article.byline) {
                authors.push(article.byline);
            }

            // Try meta tags
            const authorMeta = doc.querySelector('meta[name="author"]');
            if (authorMeta) {
                const author = authorMeta.getAttribute('content');
                if (author && !authors.includes(author)) {
                    authors.push(author);
                }
            }

            // Try structured data
            const authorElements = doc.querySelectorAll('[rel="author"], .author, .byline');
            authorElements.forEach(el => {
                const authorText = el.textContent?.trim();
                if (authorText && !authors.includes(authorText)) {
                    authors.push(authorText);
                }
            });

            return authors.length > 0 ? authors : null;
        };

        const fqdn = getFqdn(url);
        const websiteName = getWebsiteName(fqdn);
        const publishedDate = extractPublishedDate(document);
        const images = extractImages(document);
        const sections = extractSections(document);
        const authors = extractAuthors(article, document);
        const language = document.documentElement.lang || article.lang || 'en';

        // Construct the payload
        const payload: ReadabilityPayload = {
            article_title: article.title || '',
            article_website_name: websiteName,
            article_fqdn: fqdn,
            article_section: sections,
            article_authors: authors,
            article_published_date: publishedDate,
            article_images: images.length > 0 ? images : null,
            article_content: article.textContent || article.content || null,
            article_videos: [], // Readability doesn't extract videos by default
            article_language: language,
            article_status: (article.textContent || article.content) ? "Done" : "Error",
            article_error_status: (article.textContent || article.content) ? null : "No Content",
            article_url: url
        };

        const endTime = performance.now();
        const processingTimeInSeconds = (endTime - startTime) / 1000;

        return {
            data: [payload],
            status: "Done",
            error_message: null,
            processing_time_in_seconds: processingTimeInSeconds
        };

    } catch (error) {
        const endTime = performance.now();
        const processingTimeInSeconds = (endTime - startTime) / 1000;

        let fqdn = '';
        let websiteName = '';
        try {
            fqdn = url ? new URL(url).hostname : '';
            websiteName = fqdn.replace(/^www\./, '').split('.')[0];
        } catch {
            fqdn = '';
            websiteName = '';
        }

        const errorPayload: ReadabilityPayload = {
            article_title: '',
            article_website_name: websiteName,
            article_fqdn: fqdn,
            article_section: null,
            article_authors: null,
            article_published_date: null,
            article_images: null,
            article_content: null,
            article_videos: [],
            article_language: 'en',
            article_status: "Error",
            article_error_status: error instanceof Error ? error.message : String(error),
            article_url: url
        };

        return {
            data: [errorPayload],
            status: "Error",
            error_message: error instanceof Error ? error.message : String(error),
            processing_time_in_seconds: processingTimeInSeconds
        };
    }
}

/**
 * Convenience function that matches the existing API pattern
 * @param body - Object containing url and raw_content
 * @returns Promise<ReadabilityResponse> - Structured response with article data
 */
export async function readabilityParserView(body: { url: string; raw_content: string }): Promise<ReadabilityResponse> {
    if (!body || !body.url || !body.raw_content) {
        throw new Error("Invalid Request Parameter - url and raw_content are required");
    }

    return extractWithReadability(body.url, body.raw_content);
}
