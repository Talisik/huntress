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
            const start_time = process.hrtime();
            const scraped_article = new NewsExtract(this.url, raw_content, false, "en", 60, undefined, {});
            const end_time = process.hrtime(start_time);
            const elapsed = end_time[0] + end_time[1] / 1e9;
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

    const start_time = process.hrtime();

    const payload = scraper_obj.get_article_extension({ raw_content: body.raw_content });

    const elapsed = process.hrtime(start_time);
    const processing_time_in_seconds = elapsed[0] + elapsed[1] / 1e9;

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

