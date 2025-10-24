// TypeScript port of the provided NewsExtract class, with dummy implementations for dependencies
import { catch_error, unicode, NewsVariables } from './helpers';
import { Author } from './author';

type NewsExtractOptions = {
    url: string;
    source?: string;
    js?: boolean;
    lang?: string;
    timeout?: number;
    fqdn?: string;
    regex?: any;
};

type NewsExtractData = {
    article_title: string | null;
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
};

class NewsExtract {
    url: string;
    html: string | undefined = undefined;
    lang: string = "en";
    timeout: number = 60;
    fqdn: string | undefined = undefined;
    regex: any;
    scraped: boolean;
    attr_invalid_keys: string[];
    attr_id_invalid_keys: string[];
    content_variables: any;
    parser: string | null;
    raw_html: string | null;
    is_published_date_correct: boolean | null;
    title: string | null = null;
    authors: string[] | null = null;
    publish_date: string | null = null;
    images: string[] | null = null;
    content: string | null = null;
    videos: any[] = [];
    language: string = "en";
    article_sections: string[] | null = null;
    news_variables: NewsVariables;

    constructor(
        url: string,
        source?: string,
        js: boolean = false,
        lang: string = "en",
        timeout: number = 60,
        fqdn?: string,
        regex?: any
    ) {
        if (!url || typeof url !== "string") {
            throw new Error("Invalid URL passed");
        }

        // Initialize NewsVariables
        this.news_variables = new NewsVariables();
        this.attr_invalid_keys = ["sidebar", "footer", "ads"];
        this.attr_id_invalid_keys = ["cookie-law-info-bar", "login-form"];
        this.content_variables = { tags_for_decompose: this.news_variables.tags_for_decompose };

        this.regex = regex;
        this.fqdn = fqdn;
        this.url = url;
        this.lang = lang;
        this.timeout = timeout;
        this.scraped = false;
        this.parser = null;
        this.raw_html = null;
        this.is_published_date_correct = null;

        // Handle HTML source - could be base64 encoded or raw HTML
        let html: string | undefined = source;
        if (source) {
            // Check if it looks like base64 (alphanumeric with = padding)
            const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
            if (base64Pattern.test(source) && source.length > 100) {
                try {
                    // Try to decode as base64 using browser-compatible method
                    html = atob(source);
                } catch (e) {
                    html = source;
                }
            } else {
                // Use as raw HTML
                html = source;
            }
        }
        this.html = html;

        if (!this.html) {
            throw new Error("No Page Source passed");
        }
        if (js && !this.html) {
            throw new Error("Page source required for dynamic pages.");
        }

        // Clean HTML
        const clean_html = this.__clean_html(this.html, js);
        const content_clean_html = this.__clean_html_parser(clean_html || "");
        this.raw_html = content_clean_html ? String(content_clean_html) : null;

        // Extract article data using newspaper3k-like extractor
        const article = this.__get_newspaper3k_extract(this.html || "");
        
        try {
            // Set class variables using extracted data
            this.title = this.__get_title(article?.title || null, article);

            this.authors = this.__get_authors(article?.authors || null, article, this.html);

            this.publish_date = this.__get_publish_date(null, article, this.html);
            this.is_published_date_correct = this.publish_date !== null;

            this.images = this.__get_images(article, clean_html);

            // Content parser using extracted article text
            const content_instance = this.__get_and_validate_content_parser({ text: article?.text || null }, article, clean_html);
            this.content = this.__get_content(content_instance, article, js);

            // Videos from article
            this.videos = article && article.movies ? article.movies : [];

            // Language from article
            this.language = article && article.meta_lang ? article.meta_lang : "en";
            if (!this.language) this.language = "en";

            this.scraped = true;

            this.article_sections = this.extract_article_sections(clean_html || "");
        } catch (e) {
            console.error("Error in NewsExtract constructor:", e);
        }
    }

    extract_article_sections(soup: string): string[] | null {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(soup, "text/html");

            // Try to find meta[property="article:section"]
            let articleSectionMeta = doc.querySelector('meta[property="article:section"]');
            if (!articleSectionMeta) {
                articleSectionMeta = doc.querySelector('meta[property="og:article:section"]');
            }

            if (articleSectionMeta) {
                const metaContent = articleSectionMeta.getAttribute("content");
                if (metaContent && metaContent.trim() !== "") {
                    // TODO: Use regex split for multiple separators (e.g., "and", ",", etc.)
                    return metaContent.split(",").map(s => s.trim()).filter(Boolean);
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } catch (e) {
            console.log(e, "extract_article_section method Exception");
            return null;
        }
    }

        __get_newspaper3k_extract(page_source: string): any {
        try {
            if (page_source) {
                // Since we're getting HTML directly from the extension, we can parse it directly
                // without needing the full newspaper3k library
                const parser = new DOMParser();
                const doc = parser.parseFromString(page_source, 'text/html');
                
                // Extract title
                const titleElement = doc.querySelector('title') || doc.querySelector('h1') || doc.querySelector('.article-title');
                const title = titleElement ? titleElement.textContent?.trim() || '' : '';
                
                // Extract text content
                const contentElements = doc.querySelectorAll('p, article, .content, .article-content, .post-content');
                const text = Array.from(contentElements)
                    .map((el: Element) => el.textContent || '')
                    .join('\n')
                    .trim();
                
                // Extract meta language
                const langElement = doc.querySelector('html[lang]');
                const meta_lang = langElement ? langElement.getAttribute('lang') || 'en' : 'en';
                
                // Extract meta data (published time)
                const metaPublished = doc.querySelector('meta[property="article:published_time"], meta[name="article:published_time"]');
                const meta_data = metaPublished ? {
                    article: {
                        published_time: metaPublished.getAttribute('content')
                    }
                } : {};
                
                // Extract authors
                const authorElements = doc.querySelectorAll('meta[name="author"], .author, [rel="author"], .byline');
                const authors = Array.from(authorElements)
                    .map((el: Element) => el.textContent || el.getAttribute('content') || '')
                    .filter(author => author.trim() !== '');
                
                // Extract top image
                const imageElement = doc.querySelector('meta[property="og:image"], .article-image img, .content img, .post-image img');
                const top_image = imageElement ? 
                    (imageElement.getAttribute('content') || imageElement.getAttribute('src') || '') : '';
                
                // Extract videos (if any)
                const videoElements = doc.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]');
                const movies = Array.from(videoElements).map((video: Element) => ({
                    src: video.getAttribute('src') || video.getAttribute('data-src') || '',
                    type: video.tagName.toLowerCase()
                }));
                
                return {
                    title,
                    text,
                    meta_lang,
                    meta_data,
                    authors: authors.length > 0 ? authors : ["No - Author"],
                    top_image,
                    movies
                };
            } else {
                console.log("❌ News paper is none");
                return null;
            }
        } catch (e) {
            console.log("❌ Exception in newspaper 3k:", e);
            return null;
        }
    }

    __clean_html_parser(page_source?: string): any {
        /**
         * Clean up page source
         */
        if (page_source) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(page_source, 'text/html');
            
            // REMOVE UNRELATED TAGS
            for (const tag of this.content_variables.tags_for_decompose) {
                const elements = doc.querySelectorAll(tag);
                elements.forEach(el => el.remove());
            }

            // REMOVE UNRELATED CLASS NAMES
            const classPatterns = [
                'sidebar', 'post-footer', 'cli-privacy-content-text', 'cli-privacy-overview',
                'related-content', 'related-post', 'copyrights', 'widget-content', 'modal-dialog',
                'jeg_postblock_9', 'sectioncontent', 'fc-ab-root', 'author-bio'
            ];
            
            for (const pattern of classPatterns) {
                const elements = doc.querySelectorAll(`div[class*="${pattern}"]`);
                elements.forEach(el => el.remove());
            }

            const specificClasses = ['ticker-news', 'author-lead', 'main-image__title'];
            for (const className of specificClasses) {
                const elements = doc.querySelectorAll(`div.${className}`);
                elements.forEach(el => el.remove());
            }

            const idPatterns = [
                'magone-labels', 'mvp-post-add-wrap', 'login-form', 'cookie-law-info-bar',
                'car-insurance-quote-modal', 'kommentarContainer', 'lee-registration-wall'
            ];
            
            for (const pattern of idPatterns) {
                const elements = doc.querySelectorAll(`div[id*="${pattern}"]`);
                elements.forEach(el => el.remove());
            }

            const specificIds = ['cf-content'];
            for (const id of specificIds) {
                const elements = doc.querySelectorAll(`div#${id}`);
                elements.forEach(el => el.remove());
            }

            const tableElements = doc.querySelectorAll('tbody#CycleTable-ExpertFeed');
            tableElements.forEach(el => el.remove());

            const logoElements = doc.querySelectorAll('a[id*="logo"]');
            logoElements.forEach(el => el.remove());

            return doc;
        }
        return null;
    }

    __clean_html(html?: string, js: boolean = false): string | null {
        /**
         * Private method to clean page source
         * @param html - page source to clean
         * @param js - True if dynamic page else False
         */
        try {
            if (!html) {
                return null;
            }
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // REMOVE ALL UNRELATED TAGS FROM SOURCE
            const tags_for_decompose = this.news_variables.tags_for_decompose;

            for (const tag of tags_for_decompose) {
                const elements = doc.querySelectorAll(tag);
                elements.forEach(el => el.remove());
            }

            // looping for all classes that have main-sidebar name on it
            for (const key of this.attr_invalid_keys) {
                const elements = doc.querySelectorAll(`div.${key}`);
                elements.forEach(el => el.remove());
            }

            for (const key of this.attr_id_invalid_keys) {
                const elements = doc.querySelectorAll(`div#${key}`);
                elements.forEach(el => el.remove());
            }

            const newsPartElements = doc.querySelectorAll('p.News-Part');
            newsPartElements.forEach(el => el.remove());

            const hiddenElements = doc.querySelectorAll('div[style*="display:none"], span[style*="display:none"]');
            hiddenElements.forEach(el => el.remove());

            if (this.regex) {
                const urls = doc.querySelectorAll('a[href]');
                Array.from(urls).forEach(url => {
                    const href = url.getAttribute('href');
                    if (href && this.regex.includes && this.regex.includes.some((pattern: string) => 
                        new RegExp(pattern).test(new URL(href, this.url).href))) {
                        url.remove();
                    }
                });
            }

            // Remove specific IDs
            const specificIds = ['check-also-box', 'related_posts', 'myForm3', 'grid-more'];
            for (const id of specificIds) {
                const elements = doc.querySelectorAll(`section#${id}, form#${id}`);
                elements.forEach(el => el.remove());
            }

            // Special use case
            const mainContentLinks = doc.querySelectorAll('a#main-content');
            mainContentLinks.forEach(el => el.remove());

            // yahoo selectors
            if (this.fqdn === "ph.news.yahoo.com" || this.fqdn === "ph.yahoo.com") {
                const yahooTag = doc.querySelector('div.caas-body');
                if (yahooTag) {
                    const tags = yahooTag.querySelectorAll('p');
                    if (tags.length > 0) {
                        tags[tags.length - 1].remove();
                    }
                }
            }

            if (this.fqdn === "headtopics.com") {
                const videoElements = doc.querySelectorAll('div.Video');
                videoElements.forEach(el => el.remove());
                
                const speechTag = doc.querySelector('p.speech');
                if (speechTag) speechTag.remove();
                
                const newsPartElements = doc.querySelectorAll('p.News-Part');
                newsPartElements.forEach(el => el.remove());
            }

            if (this.fqdn === "beamstart.com") {
                console.log("Cleaning...");
                const colElements = doc.querySelectorAll('div.col-sm-5');
                colElements.forEach(el => {
                    if (el.textContent && el.textContent.length > 0) el.remove();
                });
            }

            if (js) {
                // This would need to be implemented based on your invalid tag logic
                // const invalidTags = doc.querySelectorAll(/* your invalid tag selector */);
                // invalidTags.forEach(el => el.remove());
            }

            return doc.documentElement.outerHTML;
        } catch (e) {
            console.log("Exception __clean_html", e);
            return null;
        }
    }

    __get_title(_title: string | null, article: any): string | null {
        /**
         * Generate news title
         */
        
        const title = catch_error('None', () => {
            if (_title) return unicode(_title);
            if (article && article.title) return unicode(article.title);
            return null;
        });

        const substring = this.news_variables.invalid_title_keys;
        
        if (!title) {
            return null;
        }
        
        for (const string of substring) {
            const match = catch_error('None', () => {
                return title.toLowerCase().indexOf(string.toLowerCase()) !== -1;
            });

            if (match) return null;
        }
        
        return title;
    }

    __get_authors(_author: string[] | null, article: any, page_source: string): string[] | null {
        // If we already have authors from other sources, use them
        if (_author && _author.length > 0) return _author;
        if (article && article.authors && article.authors.length > 0) return article.authors;
        
        // Otherwise, extract authors from the HTML
        try {
            const author_extractor = new Author(page_source);
            return author_extractor.names;
        } catch (e) {
            return ["No - Author"];
        }
    }

    __get_publish_date(_date: any, article: any, page_source: string): string | null {
        /**
         * Generate news publish date
         */
        try {
            let article_date: Date | null = null;
            
            // Check if article has meta_data with published_time
            if (article && 
                article.meta_data && 
                article.meta_data.article && 
                article.meta_data.article.published_time) {
                
                const published_time = article.meta_data.article.published_time;
                if (published_time instanceof Date) {
                    article_date = published_time;
                } else {
                    // Parse string date to Date object
                    article_date = new Date(String(published_time));
                    // Check if the date is valid
                    if (isNaN(article_date.getTime())) {
                        article_date = null;
                    }
                }
            }
            
            // GET BOTH DATES
            const newspaper3k_pub_date = article_date;
            // const global_parser_pub_date = _date; // TODO: implement if needed
            
            if (newspaper3k_pub_date !== null) {
                let publish_date = newspaper3k_pub_date.toISOString();
                const pub_date_via_url = this.extract_date_via_url(this.url);
                
                // console.log("pub_date_via_url", pub_date_via_url);
                publish_date = newspaper3k_pub_date.toISOString();
                // console.log("using newspaper3k date extractor");
                
                if (pub_date_via_url !== null) {
                    if (pub_date_via_url.substring(0, 10) !== publish_date.substring(0, 10)) {
                        publish_date = pub_date_via_url;
                    }
                }
                return publish_date;
            } else if (newspaper3k_pub_date === null) {
                const custom_date_extractor = this.main_date_extractor(page_source, this.url);
                // console.log("custom date:", custom_date_extractor);
                if (custom_date_extractor !== null) {
                    // console.log("Using custom date extractor");
                    return custom_date_extractor;
                } else {
                    return null;
                }
            } else {
                // console.log("Using date created from API");
                return null;
            }
        } catch (e) {
            console.log("__get_publish_date func", e);
            return null;
        }
    }

    // Helper method to extract date from URL
    extract_date_via_url(url: string): string | null {
        try {
            // Extract date patterns from URL
            const datePatterns = [
                /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/g,  // YYYY-MM-DD or YYYY/MM/DD
                /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/g,  // MM/DD/YYYY or MM-DD-YYYY
                /(\d{4})(\d{2})(\d{2})/g               // YYYYMMDD
            ];
            
            for (const pattern of datePatterns) {
                const matches = url.match(pattern);
                if (matches) {
                    const match = matches[0];
                    let date: Date;
                    
                    if (match.length === 8) {
                        // YYYYMMDD format
                        const year = parseInt(match.substring(0, 4));
                        const month = parseInt(match.substring(4, 6)) - 1; // Month is 0-indexed
                        const day = parseInt(match.substring(6, 8));
                        date = new Date(year, month, day);
                    } else {
                        // Try to parse as ISO string or other formats
                        date = new Date(match);
                    }
                    
                    if (!isNaN(date.getTime())) {
                        return date.toISOString();
                    }
                }
            }
            return null;
        } catch (e) {
            console.log("extract_date_via_url error:", e);
            return null;
        }
    }

    // Helper method for custom date extraction
    main_date_extractor(page_source: string, url: string): string | null {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(page_source, 'text/html');
            
            // Look for various date meta tags
            const dateSelectors = [
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
            
            for (const selector of dateSelectors) {
                const elements = doc.querySelectorAll(selector);
                Array.from(elements).forEach(element => {
                    const dateValue = element.getAttribute('content') || 
                                    element.getAttribute('datetime') || 
                                    element.textContent;
                    
                    if (dateValue) {
                        const date = new Date(dateValue);
                        if (!isNaN(date.getTime())) {
                            return date.toISOString();
                        }
                    }
                });
            }
            
            return null;
        } catch (e) {
            console.log("main_date_extractor error:", e);
            return null;
        }
    }

    __get_images(article: any, clean_html: string | null): string[] | null {
        /**
         * Generate news images
         */
        let images: string[] = [];
        try {
            if (article) {
                // Try to get top_image from article, fallback to []
                images = catch_error('list', () => {
                    if (article.top_image) {
                        return Array.isArray(article.top_image) ? article.top_image : [article.top_image];
                    }
                    return [];
                }) || [];
                
                // Post-processing: filter out non-http and logo/favicon/icon/pdf
                if (images.length > 0) {
                    images = images.filter(image => typeof image === "string" && image.startsWith('http'));
                    if (images.length > 0) {
                        const match = images[0].match(/logo|favicon|icon|pdf/i);
                        if (match && match.length >= 1) {
                            images = [];
                        }
                    } else {
                        images = [];
                    }
                } else {
                    images = [];
                }
            }
        } catch (e) {
            console.log("__get_images | Images Logic Error", e);
        }
        return images;
    }

    __get_and_validate_content_parser(content: any, article: any, clean_html: string | null): string | null {
        /**
         * FUNCTION: This function gets and validates all content parsers.
         * The order of returning the content is: Selector Parser => NewsPaper3k Extractor => Content Parser => None
         */
        try {
            // First priority: FQDN-specific selectors
            if (this.fqdn && this.html && this.fqdn_selectors(this.html, this.fqdn)) {
                const article_content = this.fqdn_selectors(this.html, this.fqdn);
                if (article_content !== null) {
                    this.parser = "Selector Parser";
                    return article_content;
                }
            }
            
            // Second priority: Article text from newspaper3k-like extractor
            if (article && article.text && article.text !== null && article.text !== "") {
                this.parser = "NewsPaper3k Parser";
                return article.text;
            }
            
            // Third priority: Content text from other sources
            if (content !== null && content !== "") {
                if (content.text !== null && content.text !== "") {
                    this.parser = "Content Parser";
                    return content.text;
                } else {
                    // Try selector parser as fallback
                    if (this.html && this.fqdn) {
                        const article_content = this.fqdn_selectors(this.html, this.fqdn);
                        if (article_content !== null) {
                            this.parser = "Selector Parser";
                            return article_content;
                        }
                    }
                    this.parser = null;
                    return null;
                }
            } else {
                // Try selector parser as fallback
                if (this.html && this.fqdn) {
                    const article_content = this.fqdn_selectors(this.html, this.fqdn);
                    if (article_content !== null) {
                        this.parser = "Selector Parser";
                        return article_content;
                    }
                }
                this.parser = null;
                return null;
            }
        } catch (e) {
            console.log("__get_and_validate_content_parser", e);
            return null;
        }
    }

    // Helper method to extract content from HTML using browser DOM APIs
    extract_content_from_html(html: string): string | null {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Remove unwanted elements first
            this.clean_html_for_content(doc);
            
            // Try multiple content selectors in order of preference
            const contentSelectors = [
                'article',
                '.article-content',
                '.post-content', 
                '.entry-content',
                '.content',
                '.main-content',
                '[role="main"]',
                '.story-content',
                '.article-body',
                '.post-body',
                '.articleBody',
                '.articleContent'
            ];
            
            for (const selector of contentSelectors) {
                const elements = doc.querySelectorAll(selector);
                if (elements.length > 0) {
                    const content = this.extract_text_from_elements(Array.from(elements));
                    if (content && content.trim().length > 100) {
                        return this.clean_extracted_content(content);
                    }
                }
            }
            
            // Try to find the main content area by looking for the largest text block
            const allElements = doc.querySelectorAll('div, section, article');
            let bestContent = '';
            let bestLength = 0;
            
            allElements.forEach(element => {
                const text = element.textContent || '';
                const cleanedText = text.trim()
                    .replace(/\s+/g, ' ')
                    .replace(/\n\s*\n/g, '\n')
                    .trim();
                
                // Skip if it contains too much navigation/advertisement content
                const noisePatterns = [
                    /advertisement/gi,
                    /need a wellness break/gi,
                    /sign up for/gi,
                    /view more/gi,
                    /most popular/gi,
                    /recommended for you/gi,
                    /loading content/gi,
                    /at a glance/gi,
                    /brand talk/gi,
                    /sports/gi,
                    /showbiz/gi,
                    /lifestyle/gi,
                    /opinion/gi,
                    /hashtag/gi,
                    /pinoy abroad/gi,
                    /scitech/gi
                ];
                
                const hasNoise = noisePatterns.some(pattern => pattern.test(cleanedText));
                
                if (!hasNoise && cleanedText.length > bestLength && cleanedText.length > 200) {
                    bestContent = cleanedText;
                    bestLength = cleanedText.length;
                }
            });
            
            if (bestContent) {
                return this.clean_extracted_content(bestContent);
            }
            
            // Fallback: extract from paragraphs
            const paragraphs = doc.querySelectorAll('p');
            if (paragraphs.length > 0) {
                const content = this.extract_text_from_elements(Array.from(paragraphs));
                if (content && content.trim().length > 100) {
                    return this.clean_extracted_content(content);
                }
            }
            
            return null;
        } catch (e) {
            console.log("extract_content_from_html error:", e);
            return null;
        }
    }

    // Helper method to clean HTML for content extraction
    clean_html_for_content(doc: Document): void {
        // Remove unwanted tags
        const unwantedTags = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'sidebar', 'advertisement', 'ads', 'iframe'];
        unwantedTags.forEach(tag => {
            const elements = doc.querySelectorAll(tag);
            elements.forEach(el => el.remove());
        });
        
        // Remove elements with unwanted classes
        const unwantedClasses = [
            'sidebar', 'footer', 'header', 'nav', 'menu', 'advertisement', 'ads',
            'related', 'comments', 'social', 'share', 'newsletter', 'popup',
            'cookie', 'banner', 'modal', 'overlay', 'sticky', 'widget',
            'recommended', 'trending', 'most-read', 'outbrain', 'carousel',
            'newsletter-widget', 'at_a_glance', 'brand-talk', 'showbiz',
            'lifestyle', 'opinion', 'hashtag', 'pinoy-abroad', 'scitech'
        ];
        
        unwantedClasses.forEach(className => {
            const elements = doc.querySelectorAll(`[class*="${className}"]`);
            elements.forEach(el => el.remove());
        });
        
        // Remove elements with unwanted IDs
        const unwantedIds = [
            'sidebar', 'footer', 'header', 'nav', 'comments', 'ads',
            'trending_most_read_container', 'carousel_compact_top_container',
            'newsletter-widget-container', 'at_a_glance_container'
        ];
        unwantedIds.forEach(id => {
            const elements = doc.querySelectorAll(`#${id}`);
            elements.forEach(el => el.remove());
        });
        
        // Remove elements with specific text patterns
        const unwantedTextPatterns = [
            'advertisement', 'advertisement', 'Need a wellness break?',
            'Sign up for', 'VIEW MORE', 'Most Popular', 'Other Stories',
            'Recommended for you', 'LOADING CONTENT', 'At a Glance',
            'Brand Talk', 'Sports', 'Pinoy Abroad', 'SciTech', 'Showbiz',
            'Lifestyle', 'Opinion', 'Hashtag'
        ];
        
        // Remove elements containing unwanted text
        const allElements = doc.querySelectorAll('*');
        allElements.forEach(el => {
            const text = el.textContent || '';
            if (unwantedTextPatterns.some(pattern => text.includes(pattern))) {
                // Check if this is a substantial element (not just a small text node)
                if (el.children.length > 0 || text.length > 50) {
                    el.remove();
                }
            }
        });
        
        // Remove CSS and JavaScript content
        const styleElements = doc.querySelectorAll('style');
        styleElements.forEach(el => el.remove());
        
        const scriptElements = doc.querySelectorAll('script');
        scriptElements.forEach(el => el.remove());
    }

    // Helper method to extract and clean text from elements
    extract_text_from_elements(elements: Element[]): string {
        const texts: string[] = [];
        
        elements.forEach(element => {
            // Remove unwanted child elements
            const unwantedSelectors = [
                'script', 'style', 'nav', 'header', 'footer', 'aside', 
                'advertisement', 'ads', 'iframe', '.widget', '.newsletter',
                '.related', '.trending', '.recommended', '.outbrain'
            ];
            unwantedSelectors.forEach(selector => {
                const unwantedElements = element.querySelectorAll(selector);
                unwantedElements.forEach(el => el.remove());
            });
            
            // Get text content
            const text = element.textContent || '';
            const cleanedText = text.trim()
                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
                .trim();
            
            // Filter out unwanted text patterns
            const unwantedPatterns = [
                /advertisement/gi,
                /need a wellness break\?/gi,
                /sign up for/gi,
                /view more/gi,
                /most popular/gi,
                /other stories/gi,
                /recommended for you/gi,
                /loading content/gi,
                /at a glance/gi,
                /brand talk/gi,
                /sports/gi,
                /pinoy abroad/gi,
                /scitech/gi,
                /showbiz/gi,
                /lifestyle/gi,
                /opinion/gi,
                /hashtag/gi,
                /^\d+\s+\d+\s+\d+\s+\d+\s+\d+Share.*$/gm, // Navigation numbers
                /Filtered by:.*$/gm, // Filter text
                /Tags:.*$/gm, // Tags section
                /Next Story.*$/gm, // Next story links
                /var\s+.*=.*;.*$/gm, // JavaScript variables
                /function\s*\(.*\).*$/gm, // JavaScript functions
                /\.\w+\s*\{[^}]*\}/gm, // CSS rules
            ];
            
            let filteredText = cleanedText;
            unwantedPatterns.forEach(pattern => {
                filteredText = filteredText.replace(pattern, '');
            });
            
            // Clean up extra whitespace
            filteredText = filteredText
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .trim();
            
            if (filteredText.length > 100 && !filteredText.match(/^[0-9\s]+$/)) { // Only include substantial text, not just numbers
                texts.push(filteredText);
            }
        });
        
        return texts.join('\n\n');
    }

    // FQDN-specific content selectors
    fqdn_selectors(page_source: string, fqdn: string): string | null {
        if (fqdn === "sunstar.com.ph") {
            return this.sunstar_content_selectors(page_source);
        } else if (fqdn === "showbizportal.net") {
            return this.showbizportal_content_selectors(page_source);
        } else if (fqdn === "therebelsweetheart.com") {
            return this.therebelsweetheart_content_selectors(page_source);
        } else if (fqdn === "lifeiskulayful.com") {
            return this.lifeiskulayful_content_selectors(page_source);
        } else if (fqdn === "bilyonaryo.com") {
            const cleaned_html = this.remove_related_links(page_source);
            return this.bilyonaryo_content_selectors(cleaned_html);
        } else {
            return null;
        }
    }

    // Specific content selector methods
    philstarlife_content_selectors(page_source: string): string | null {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(page_source, 'text/html');
            const divElements = doc.querySelectorAll("div[class*='content']");
            const contents: string[] = [];
            
            divElements.forEach(elem => {
                const textNodes = this.getTextNodes(elem);
                contents.push(...textNodes);
            });
            
            const article_content = contents.join('\n');
            if (article_content !== "" && article_content !== null) {
                return this.clean_extracted_content(article_content);
            }
            return null;
        } catch (e) {
            console.log("philstarlife Exception", e);
            return null;
        }
    }

    lifeiskulayful_content_selectors(page_source: string): string | null {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(page_source, 'text/html');
            const divElement = doc.querySelector("div[itemprop='blogPost']");
            if (divElement) {
                const pTags = divElement.querySelectorAll("p");
                const article_content = Array.from(pTags)
                    .map(p => p.textContent || '')
                    .join('\n');
                return this.clean_extracted_content(article_content);
            }
            return null;
        } catch (e) {
            console.log("lifeiskulayful Exception", e);
            return null;
        }
    }

    bilyonaryo_content_selectors(page_source: string): string | null {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(page_source, 'text/html');
            const divElement = doc.querySelector("section.elementor-section.elementor-inner-section.elementor-element.elementor-element-68d3afca.elementor-section-boxed.elementor-section-height-default.elementor-section-height-default");
            if (divElement) {
                const pTags = divElement.querySelectorAll("p");
                const article_content = Array.from(pTags)
                    .map(p => p.textContent || '')
                    .join('\n');
                return this.clean_extracted_content(article_content);
            }
            return null;
        } catch (e) {
            console.log("bilyonaryo Exception", e);
            return null;
        }
    }

    therebelsweetheart_content_selectors(page_source: string): string | null {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(page_source, 'text/html');
            const article_content = doc.querySelector("div.entry-content");
            if (article_content) {
                const content = article_content.textContent || '';
                return this.clean_extracted_content(content);
            }
            return null;
        } catch (e) {
            console.log("therebelsweetheart Exception", e);
            return null;
        }
    }

    sunstar_content_selectors(page_source: string): string | null {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(page_source, 'text/html');
            const article_content = doc.querySelector('div.articleBody.articleContent p');
            if (article_content) {
                const content = article_content.textContent || '';
                return this.clean_extracted_content(content);
            }
            return null;
        } catch (e) {
            console.log("Sunstar Exception", e);
            return null;
        }
    }

    showbizportal_content_selectors(page_source: string): string | null {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(page_source, 'text/html');
            const article_content = doc.querySelector("div#adsense-target");
            if (article_content) {
                const content = article_content.textContent || '';
                return this.clean_extracted_content(content);
            }
            return null;
        } catch (e) {
            console.log("showbiz portal err", e);
            return null;
        }
    }

    // Helper method to get text nodes
    getTextNodes(element: Element): string[] {
        const texts: string[] = [];
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null
        );
        
        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent?.trim();
            if (text && text.length > 0) {
                texts.push(text);
            }
        }
        
        return texts;
    }

    // Helper method to remove related links (placeholder)
    remove_related_links(page_source: string): string {
        // This is a placeholder - implement based on your needs
        return page_source;
    }

    __get_content(_content: string | null, article: any, js: boolean = false): string | null {
        /**
         * Generate news content
         */
        if (_content !== null) {
            let content = unicode(_content.replace(/'/g, '').split(' ').join(' '));
            
            // Post-process content to remove noise
            content = this.clean_extracted_content(content);
            
            return content;
        } else {
            return null;
        }
    }

    // New method to clean extracted content
    clean_extracted_content(content: string): string {
        if (!content) return '';
        
        // First, remove CSS blocks entirely
        content = content.replace(/\.[a-zA-Z_][\w\-]*\s*\{[^}]*\}/g, '');
        content = content.replace(/@[a-zA-Z_][\w\-]*\s*\{[^}]*\}/g, '');
        content = content.replace(/\#[a-zA-Z_][\w\-]*\s*\{[^}]*\}/g, '');
        
        // Remove CSS property patterns more aggressively
        content = content.replace(/[a-zA-Z\-]+\s*:\s*[^;{}]+;?/g, '');
        
        // Remove JavaScript arrow functions and incomplete assignments
        content = content.replace(/\([^)]*\)\s*=>\s*[^;]+/g, '');
        content = content.replace(/\s*=\s*"[^"]*";\s*/g, '');
        content = content.replace(/\s*=\s*<[^>]*>[^<]*<\/[^>]*>;\s*/g, '');
        content = content.replace(/\([^)]*\)\s*=>\s*\w+\s*===/g, '');
        
        // Remove JavaScript function definitions and code blocks
        content = content.replace(/function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g, '');
        content = content.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, ''); // Remove /* */ comments
        content = content.replace(/\/\/.*$/gm, ''); // Remove // comments
        content = content.replace(/\w+\s*\.\s*\w+\s*=\s*[^;]+;/g, ''); // Remove property assignments
        content = content.replace(/\w+\s*\.\s*appendChild\([^)]*\);?/g, ''); // Remove appendChild calls
        content = content.replace(/\w+\s*\.\s*innerHTML\s*=\s*[^;]+;?/g, ''); // Remove innerHTML assignments
        
        // Remove JavaScript patterns
        content = content.replace(/document\.[a-zA-Z]+\([^)]*\)/g, '');
        content = content.replace(/window\.[a-zA-Z]+\([^)]*\)/g, '');
        content = content.replace(/\w+\s*=\s*\w+\s*\|\|\s*\[\]/g, '');
        content = content.replace(/\.push\([^)]*\)/g, '');
        content = content.replace(/addEventListener\([^)]*\)/g, '');
        content = content.replace(/querySelector[All]*\([^)]*\)/g, '');
        content = content.replace(/createElement\([^)]*\)/g, '');
        content = content.replace(/insertBefore\([^)]*\)/g, '');
        content = content.replace(/insertAdjacentHTML\([^)]*\)/g, '');
        
        // Remove unwanted patterns more aggressively
        const unwantedPatterns = [
            // CSS selectors and rules
            /\.[a-zA-Z_][\w\-]*\s*>\s*\.[a-zA-Z_][\w\-]*/g,
            /\.[a-zA-Z_][\w\-]*\s*,\s*\.[a-zA-Z_][\w\-]*/g,
            /\.[a-zA-Z_][\w\-]*\s+\.[a-zA-Z_][\w\-]*/g,
            /\#[a-zA-Z_][\w\-]*\s*>\s*\.[a-zA-Z_][\w\-]*/g,
            /\.tdi_\d+/g,
            /\.wpb_wrapper/g,
            /\.tdc-elements/g,
            /\.vc_column-inner/g,
            /\.tdb_single_/g,
            /\.td-theme-wrap/g,
            /\.td-block-/g,
            /\.td-post-/g,
            /\.td-icon-/g,
            /\.td-social-/g,
            /\.addtoany_/g,
            /\.a2a_/g,
            
            // JavaScript variables and functions
            /block_tdi_\d+\./g,
            /tdBlocksArray\./g,
            /adsbygoogle/g,
            /window\.adsbygoogle/g,
            
            // Social media buttons and sharing
            /FacebookTwitterPinterestWhatsApp/g,
            /Facebook.*Twitter.*Pinterest.*WhatsApp/g,
            /const\s+publicNoticesLink\s*=/g,
            /const\s+businessLinkExists\s*=/g,
            /Array\.from\([^)]*\)\.find/g,
            /Array\.from\([^)]*\)\.some/g,
            /\.textContent\.trim\(\)/g,
            /businessLink\.className/g,
            /businessLink\.href/g,
            /businessLink\.innerHTML/g,
            /sep\.className/g,
            /insertBefore\([^)]*\)/g,
            
            // More JavaScript patterns
            /const\s+\w+\s*=\s*\[.*\]/g,
            /if\s*\([^)]*\)\s*\{/g,
            /if\s*\([^)]*\s*&&\s*[^)]*$/g, // Incomplete if statements
            /\}\s*else\s*\{/g,
            /\.includes\([^)]*\)/g,
            /\.style\.display\s*=/g,
            /li\.textContent\.trim\(\)/g,
            
            // Arrow functions and incomplete assignments
            /\([^)]*\)\s*=>\s*[^;]+/g,
            /\s*=\s*"[^"]*";\s*/g,
            /\s*=\s*<[^>]*>[^<]*<\/[^>]*>;\s*/g,
            /\([^)]*\)\s*=>\s*\w+\s*===/g,
            /a\s*=>\s*a\s*===\s*"[^"]*"/g,
            /\s*=\s*"tdb-[^"]*"/g,
            /\s*=\s*"td-[^"]*"/g,
            
            // JavaScript function definitions and DOM manipulation
            /function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g,
            /\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g,
            /\/\/.*$/gm,
            /\w+\s*\.\s*appendChild\([^)]*\);?/g,
            /\w+\s*\.\s*innerHTML\s*=\s*[^;]+;?/g,
            /\w+\s*\.\s*className\s*=\s*[^;]+;?/g,
            /\w+\s*\.\s*src\s*=\s*[^;]+;?/g,
            /\w+\s*\.\s*allowFullscreen\s*=\s*[^;]+;?/g,
            /\w+\s*\.\s*controls\s*=\s*[^;]+;?/g,
            /\w+\s*\.\s*autoplay\s*=\s*[^;]+;?/g,
            /openVideoModal\([^)]*\)/g,
            /close\.className/g,
            /close\.innerHTML/g,
            /contentElement\./g,
            /wrapper\.appendChild/g,
            /modal\.appendChild/g,
            
            // Configuration and data patterns
            /td_column_number\s*=/g,
            /block_type\s*=/g,
            /found_posts\s*=/g,
            /header_color\s*=/g,
            /ajax_pagination_infinite_stop\s*=/g,
            /max_num_pages\s*=/g,
            
            // Advertisement patterns
            /Discover\s+more/g,
            /ArtTelevisionPortable\s+speakers/g,
            /CadburyMilkManila/g,
            /Online\s+TV\s+streaming\s+services/g,
            /TVMusicEntertainment\s+center/g,
            /Soybean/g,
            
            // Navigation and UI elements
            /^\d+\s+\d+\s+\d+\s+\d+\s+\d+Share.*$/gm,
            /Filtered by:.*$/gm,
            /Tags:.*$/gm,
            /Next Story.*$/gm,
            /VIEW MORE.*$/gm,
            /Most Popular.*$/gm,
            /Other Stories.*$/gm,
            /Recommended for you.*$/gm,
            /LOADING CONTENT.*$/gm,
            /LOAD MORE ARTICLES.*$/gm,
            /RETRY LOADING.*$/gm,
            
            // Advertisement and newsletter content
            /advertisement/gi,
            /Need a wellness break\?.*$/gm,
            /Sign up for.*$/gm,
            /Stay up-to-date.*$/gm,
            /Please enter a valid email address.*$/gm,
            /Your email is safe with us.*$/gm,
            
            // Section headers
            /At a Glance.*$/gm,
            /Brand Talk.*$/gm,
            /Sports.*$/gm,
            /Pinoy Abroad.*$/gm,
            /SciTech.*$/gm,
            /Showbiz.*$/gm,
            /Lifestyle.*$/gm,
            /Opinion.*$/gm,
            /Hashtag.*$/gm,
            /News.*$/gm,
            /Money.*$/gm,
            
            // CSS and JavaScript - more aggressive
            /\.\w+\s*\{[^}]*\}/gm,
            /var\s+.*=.*;.*$/gm,
            /function\s*\(.*\).*$/gm,
            /csell_zoneid.*$/gm,
            /csell_article_tags.*$/gm,
            /crowdyPage.*$/gm,
            /csell_isMobile.*$/gm,
            /csellViewsJson.*$/gm,
            /\.AR_\d+.*$/gm,
            /\.ob-widget.*$/gm,
            /background-image.*$/gm,
            /background-size.*$/gm,
            /width:\d+px.*$/gm,
            /height:\d+px.*$/gm,
            /padding:.*$/gm,
            /margin:.*$/gm,
            /color:.*$/gm,
            /font-size:.*$/gm,
            /font-family:.*$/gm,
            /text-decoration:.*$/gm,
            /display:.*$/gm,
            /box-sizing:.*$/gm,
            /@media.*$/gm,
            /-webkit-.*$/gm,
            /-moz-.*$/gm,
            /border:.*$/gm,
            /overflow:.*$/gm,
            /position:.*$/gm,
            /float:.*$/gm,
            /clear:.*$/gm,
            /flex:.*$/gm,
            /justify-content:.*$/gm,
            /align-items:.*$/gm,
            /font-weight:.*$/gm,
            /border-radius:.*$/gm,
            /filter:.*$/gm,
            /transform:.*$/gm,
            /transition:.*$/gm,
            /animation:.*$/gm,
            /z-index:.*$/gm,
            /opacity:.*$/gm,
            /visibility:.*$/gm,
            /cursor:.*$/gm,
            /text-align:.*$/gm,
            /vertical-align:.*$/gm,
            /line-height:.*$/gm,
            /letter-spacing:.*$/gm,
            /text-transform:.*$/gm,
            /white-space:.*$/gm,
            /word-wrap:.*$/gm,
            /word-break:.*$/gm,
            /text-overflow:.*$/gm,
            /list-style:.*$/gm,
            /table-layout:.*$/gm,
            /border-collapse:.*$/gm,
            /caption-side:.*$/gm,
            /empty-cells:.*$/gm,
            /content:.*$/gm,
            /quotes:.*$/gm,
            /counter-reset:.*$/gm,
            /counter-increment:.*$/gm,
            /resize:.*$/gm,
            /outline:.*$/gm,
            /outline-offset:.*$/gm,
            /box-shadow:.*$/gm,
            /text-shadow:.*$/gm,
            /clip:.*$/gm,
            /clip-path:.*$/gm,
            /mask:.*$/gm,
            /mask-image:.*$/gm,
            /mask-mode:.*$/gm,
            /mask-repeat:.*$/gm,
            /mask-position:.*$/gm,
            /mask-clip:.*$/gm,
            /mask-origin:.*$/gm,
            /mask-size:.*$/gm,
            /mask-composite:.*$/gm,
            /mask-border:.*$/gm,
            /mask-border-source:.*$/gm,
            /mask-border-mode:.*$/gm,
            /mask-border-slice:.*$/gm,
            /mask-border-width:.*$/gm,
            /mask-border-outset:.*$/gm,
            /mask-border-repeat:.*$/gm,
            /mask-border:.*$/gm,
            
            // HTML entities and formatting
            /&[a-zA-Z0-9#]+;/g,
            /\\n\s*\\n/g,
            /\\t/g,
            /\\"/g,
            /\\\\/g,
            
            // Empty lines and excessive whitespace
            /^\s*$/gm,
            /\n\s*\n\s*\n/g,
            
            // Specific website noise
            /×/g,
            /‹›/g,
            /◀/g,
            /▶/g,
            
            // Technical content
            /url\([^)]*\)/g,
            /https?:\/\/[^\s]+/g,
            /data-src="[^"]*"/g,
            /data-widget-id="[^"]*"/g,
            /data-ob-template="[^"]*"/g,
            /typeof\s+[^;]+/g,
            /OBR\.extern\.researchWidget\(\)/g,
        ];
        
        let cleanedContent = content;
        
        // Apply all patterns
        unwantedPatterns.forEach(pattern => {
            cleanedContent = cleanedContent.replace(pattern, '');
        });
        
        // Remove lines that contain too much technical content
        const lines = cleanedContent.split('\n');
        const filteredLines = lines.filter(line => {
            const trimmed = line.trim();
            
            // Skip lines that are too short
            if (trimmed.length < 20) return false;
            
            // Skip lines that are just numbers or symbols
            if (trimmed.match(/^[0-9\s\-_×‹›◀▶]+$/)) return false;
            
            // Skip lines that are CSS selectors or rules
            if (trimmed.match(/^\.[a-zA-Z_][\w\-]*\s*[>,\s]/)) return false;
            if (trimmed.match(/^\#[a-zA-Z_][\w\-]*\s*[>,\s]/)) return false;
            if (trimmed.match(/^[a-zA-Z\-]+\s*:\s*[^;{}]+;?\s*$/)) return false;
            if (trimmed.match(/\{[^}]*\}/)) return false;
            
            // Skip lines that contain CSS class names
            if (trimmed.match(/\.tdi_\d+|\.wpb_wrapper|\.tdc-elements|\.vc_column|\.tdb_|\.td-/)) return false;
            
            // Skip JavaScript lines
            if (trimmed.match(/document\.|window\.|addEventListener|querySelector|createElement/)) return false;
            if (trimmed.match(/block_tdi_\d+|tdBlocksArray|adsbygoogle/)) return false;
            if (trimmed.match(/const\s+\w+\s*=|Array\.from\(|\.textContent\.trim\(\)|\.className\s*=|\.href\s*=|\.innerHTML\s*=/)) return false;
            if (trimmed.match(/if\s*\(.*\)\s*\{|else\s*\{|\}\s*else/)) return false;
            if (trimmed.match(/if\s*\([^)]*\s*&&\s*[^)]*$/)) return false; // Incomplete if statements
            if (trimmed.match(/FacebookTwitterPinterestWhatsApp|Discover\s+more|CadburyMilkManila/)) return false;
            if (trimmed.match(/td_column_number|block_type|found_posts|header_color|max_num_pages/)) return false;
            
            // Skip arrow functions and incomplete assignments
            if (trimmed.match(/\([^)]*\)\s*=>\s*\w+\s*===/)) return false;
            if (trimmed.match(/^\s*=\s*"[^"]*";\s*$/)) return false;
            if (trimmed.match(/^\s*=\s*<[^>]*>/)) return false;
            if (trimmed.match(/a\s*=>\s*a\s*===\s*"[^"]*"/)) return false;
            if (trimmed.match(/^\s*=\s*"tdb-|^\s*=\s*"td-/)) return false;
            
            // Skip JavaScript function definitions and DOM manipulation
            if (trimmed.match(/function\s+\w+\s*\([^)]*\)\s*\{/)) return false;
            if (trimmed.match(/\/\*.*\*\/|\/\/.*/)) return false;
            if (trimmed.match(/\w+\s*\.\s*(appendChild|innerHTML|className|src|allowFullscreen|controls|autoplay)\s*=/)) return false;
            if (trimmed.match(/openVideoModal|contentElement\.|wrapper\.|modal\./)) return false;
            if (trimmed.match(/close\.className|close\.innerHTML/)) return false;
            
            // Skip lines with too much technical content
            const technicalPatterns = [
                /\.\w+\s*\{/,
                /var\s+/,
                /function\s*\(/,
                /csell_/,
                /\.AR_/,
                /\.ob-/,
                /background-/,
                /width:/,
                /height:/,
                /padding:/,
                /margin:/,
                /color:/,
                /font-/,
                /text-/,
                /display:/,
                /box-/,
                /@media/,
                /-webkit-/,
                /-moz-/,
                /border:/,
                /overflow:/,
                /position:/,
                /float:/,
                /clear:/,
                /flex:/,
                /justify-/,
                /align-/,
                /font-weight:/,
                /border-radius:/,
                /filter:/,
                /transform:/,
                /transition:/,
                /animation:/,
                /z-index:/,
                /opacity:/,
                /visibility:/,
                /cursor:/,
                /text-align:/,
                /vertical-align:/,
                /line-height:/,
                /letter-spacing:/,
                /text-transform:/,
                /white-space:/,
                /word-/,
                /text-overflow:/,
                /list-style:/,
                /table-/,
                /border-collapse:/,
                /caption-side:/,
                /empty-cells:/,
                /content:/,
                /quotes:/,
                /counter-/,
                /resize:/,
                /outline:/,
                /box-shadow:/,
                /text-shadow:/,
                /clip:/,
                /mask:/,
                /url\(/,
                /data-/,
                /typeof/,
                /OBR\./,
            ];
            
            const hasTechnicalContent = technicalPatterns.some(pattern => pattern.test(trimmed));
            return !hasTechnicalContent;
        });
        
        // Join lines and clean up
        cleanedContent = filteredLines.join('\n')
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();
        
        return cleanedContent;
    }

    get_scraper_api_response(): NewsExtractData {
        if (!this.scraped) throw new Error("Article not scraped");
        return {
            article_title: this.title,
            article_website_name: "",
            article_fqdn: this.fqdn || this.get_fqdn(this.url),
            article_section: this.article_sections,
            article_authors: this.authors,
            article_published_date: this.publish_date,
            article_images: this.images,
            article_content: this.content,
            article_videos: this.videos,
            article_language: this.language,
            article_status: this.content ? "Done" : "Error",
            article_error_status: this.content ? null : "No Content",
            article_url: this.url
        };
    }

    // Dummy get_fqdn
    get_fqdn(url: string): string {
        try {
            return new URL(url).hostname;
        } catch {
            return "";
        }
    }
}

export { NewsExtract, NewsExtractOptions, NewsExtractData };
