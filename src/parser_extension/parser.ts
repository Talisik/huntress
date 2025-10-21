export interface Article {
    url: string;
    raw_content: string;
}

export interface Payload {
    article_status: string;
    article_error_status?: string | null;
    [key: string]: any;
}

export function get_fqdn(url: string): string {
    try {
        const { hostname } = new URL(url);
        return hostname;
    } catch {
        return "";
    }
}

import { NewsExtract } from './extract_news';
import { GeneralParser as WebContentParser } from './general_parser';

class OnlineParser {
    url: string;
    status_code: number | null;
    page_content: string | null;

    constructor(url: string) {
        this.url = url;
        this.status_code = null;
        this.page_content = null;
    }

    get_article_extension({ raw_content }: { raw_content: string }): Payload {
        try {
            // Extracting article using raw content and NewsExtract
            const start_time = performance.now();
            const scraped_article = new NewsExtract(this.url, raw_content, false, "en", 60, undefined, {});
            const end_time = performance.now();
            const elapsed = (end_time - start_time) / 1000; // Convert to seconds
            console.log("PROCESSING PARSER TIME: ", elapsed);
            return scraped_article.get_scraper_api_response();
        } catch (e) {
            console.log("Exception OnlineParser get_article_using_raw_content", e);
            return {
                article_status: "Error",
                article_error_status: e instanceof Error ? e.message : String(e)
            };
        }
    }
}

class GeneralParser {
    url: string;
    status_code: number | null;
    page_content: string | null;

    constructor(url: string) {
        this.url = url;
        this.status_code = null;
        this.page_content = null;
    }
}

export function GeneralParserView(body: Article): {
    data: any;
    status: string;
    error_message: string | null;
    processing_time_in_seconds: number;
} {
    if (!body) {
        throw new Error("Invalid Request Parameter");
    }

    const start_time = performance.now();

    try {
        // Use GeneralParser.parseContent and output a flattened result (not deeply nested).
        const result = WebContentParser.parseContent(body.url, body.raw_content);

        const end_time = performance.now();
        const processing_time_in_seconds = (end_time - start_time) / 1000;

        // Extract hostname for website name and fqdn
        const hostname = get_fqdn(body.url);
        const websiteName = hostname.replace(/^www\./, '').split('.')[0];

        // Flatten the output object for "data"
        const payload = {
            article_title: result.title || "",
            article_content: result.content || "",
            article_website_name: websiteName,
            article_url: body.url,
            article_published_date: result.metadata.publishDate || new Date().toISOString(),
            article_images: result.metadata.images || [],
            article_videos: [], // Not supported
            article_section: [], // Not supported
            article_authors: result.metadata.author || "",
            article_fqdn: hostname,
            article_language: result.metadata.language || "en",
            article_status: result.content ? "Done" : "Error",
            article_wordCount: result.wordCount ?? (result.content ? result.content.split(/\s+/).length : 0),
            article_readingTime: result.readingTime,
            article_metadata: { ...result.metadata },
            is_article: true,
            source: "talisik_huntress",
            source_property: JSON.stringify({
                ...result,
                websiteName,
                fqdn: hostname
            }),
        };

        return {
            data: [payload],
            status: payload.article_status,
            error_message: payload.article_status === "Done" ? null : "No Content",
            processing_time_in_seconds
        };
    } catch (error) {
        const end_time = performance.now();
        const processing_time_in_seconds = (end_time - start_time) / 1000;

        const hostname = get_fqdn(body.url);
        const websiteName = hostname.replace(/^www\./, '').split('.')[0];

        return {
            data: [{
                article_title: "",
                article_website_name: websiteName,
                article_fqdn: hostname,
                article_section: [],
                article_authors: "",
                article_published_date: new Date().toISOString(),
                article_images: [],
                article_content: "",
                article_videos: [],
                article_language: "en",
                article_status: "Error",
                article_error_status: error instanceof Error ? error.message : String(error),
                article_url: body.url,
                is_article: false,
                source: "talisik_huntress",
                source_property: "",
                article_wordCount: 0,
                article_readingTime: 0,
                article_metadata: {}
            }],
            status: "Error",
            error_message: error instanceof Error ? error.message : String(error),
            processing_time_in_seconds
        };
    }
}

export function parserExtensionView(body: Article): {
    data: Payload[];
    status: string;
    error_message: string | null;
    processing_time_in_seconds: number;
} {
    if (!body) {
        throw new Error("Invalid Request Parameter");
    }

    const scraper_obj = new OnlineParser(body.url);

    const fqdn = get_fqdn(body.url);

    const start_time = performance.now();

    const payload = scraper_obj.get_article_extension({ raw_content: body.raw_content });

    const end_time = performance.now();
    const processing_time_in_seconds = (end_time - start_time) / 1000; // Convert to seconds

    if (payload.article_status === "Done") {
        return {
            data: [payload],
            status: "Done",
            error_message: null,
            processing_time_in_seconds
        };
    } else {
        return {
            data: [payload],
            status: "Error",
            error_message: payload.article_error_status || "Unknown error",
            processing_time_in_seconds
        };
    }
}

