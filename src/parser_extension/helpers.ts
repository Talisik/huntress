// Helper functions for news extraction

const errors: { [key: string]: any } = {
    'None': null,
    'list': [],
    'dict': {},
    'article_error': 'Error'
};

/**
 * Catching errors with default fallback
 * @param default_key - Key value on error dict - 'None', 'list', 'dict' (String)
 * @param func - Lambda function to execute
 * @param handle - Error handler function (optional)
 * @returns Result of func or default error value
 */
export function catch_error<T>(default_key: string, func: () => T, handle?: (e: any) => any): T | null {
    try {
        return func();
    } catch (e) {
        // log.error(e)
        // print(traceback.format_exc())
        return errors[default_key] || null;
    }
}

/**
 * Returns a unidecoded string
 * Note: In TypeScript/JavaScript, we don't need unidecode for basic unicode handling
 * This is a simplified version that strips whitespace
 */
export function unicode(text: string): string {
    return text.trim();
}

/**
 * Sleep method at random seconds
 * @param min - Minimum seconds
 * @param max - Max seconds
 */
export function rand_sleep(min: number = 5, max: number = 10): void {
    const RANDOM_SEC = Math.floor(Math.random() * (max - min + 1)) + min;
    const DIFF = (Math.floor(Math.random() * 2) + 1) - Math.random();
    const SLEEP_TIME = (RANDOM_SEC - DIFF) * 1000; // Convert to milliseconds
    
    // Note: In Node.js, you might want to use setTimeout or a proper sleep library
    // For now, this is a placeholder
    console.log(`Sleeping for ${SLEEP_TIME}ms`);
}

/**
 * Recursively iterate through nested arrays
 * @param tags - Array to iterate (can be nested)
 * @returns Flattened array
 */
export function recursive_iterate(tags: any[]): any[] {
    const result: any[] = [];
    for (const tag of tags) {
        if (Array.isArray(tag)) {
            result.push(...recursive_iterate(tag));
        } else {
            result.push(tag);
        }
    }
    return result;
}

/**
 * Compare Module which checks for content relativity using trigram algorithm.
 */
export class Compare {
    private inputs: string[];
    private words: string[];
    private word_trigram_count: number[];
    private trigrams: { [key: string]: number[] };
    private trigrams_count: number[];
    private trigrams_matches: number;

    constructor(words_list: string[] = []) {
        this.inputs = words_list;
        this.words = [];
        this.word_trigram_count = [];
        this.trigrams = {};
        this.trigrams_count = [];
        this.trigrams_matches = 0;

        for (let i = 0; i < this.inputs.length; i++) {
            this.__set(this.inputs[i]);
        }
    }

    /**
     * Callback function to split word to trigram
     */
    private __to_trigram(word: string, _callback?: (trigram: string) => void): void {
        const data = ("  " + word + "  ").toUpperCase();
        for (let i = 0; i < data.length - 2; i++) {
            const trigram = data.substring(i, i + 3);
            if (_callback && trigram.length === 3) {
                _callback(trigram);
            }
        }
    }

    /**
     * Instantiate Compare
     */
    private __set(word: string): void {
        if (word === null || word === "" || this.words.includes(word)) {
            return;
        }
        
        this.trigrams_count.push(0);
        this.words.push(word);
        this.word_trigram_count.push(0);
        const word_index = this.words.length - 1;

        const callback = (arg: string) => {
            let words_for_trigram: number[];
            try {
                words_for_trigram = this.trigrams[arg] || [];
            } catch {
                words_for_trigram = [];
            }

            if (!words_for_trigram.includes(word_index)) {
                words_for_trigram.push(word_index);
            }

            // store trigram and add count
            this.trigrams[arg] = words_for_trigram;
            this.word_trigram_count[word_index]++;
        };

        this.__to_trigram(word, callback);
    }

    /**
     * Evaluate word or phrase
     */
    eval(word: string, _callback?: (trigram: string) => void): Array<{word: string, matches: number, similarity: string}> {
        const result: Array<{word: string, matches: number, similarity: string}> = [];
        const word_matches: number[] = [];
        this.trigrams_matches = 0;

        for (let i = 0; i < this.words.length; i++) {
            word_matches.push(0);
        }

        const callback = (arg: string) => {
            try {
                const words_for_trigram = this.trigrams[arg];
                this.trigrams_matches++;

                for (let i = 0; i < words_for_trigram.length; i++) {
                    const word_index = words_for_trigram[i];
                    this.trigrams_count[word_index]++;

                    if (word_matches[word_index] === undefined) {
                        word_matches[word_index] = 0;
                    }

                    word_matches[word_index]++;
                }
            } catch (e) {
                // print("callback func", e)
            }
        };

        this.__to_trigram(word, callback);

        for (let i = 0; i < this.trigrams_count.length; i++) {
            const count = this.word_trigram_count[i];
            const percentage = (word_matches[i] / count) * 100;
            const similarity = Math.round(percentage) + "%";

            if (percentage >= 49) {
                result.push({
                    'word': this.words[i],
                    'matches': word_matches[i],
                    'similarity': similarity
                });
            }
        }

        return result.sort((a, b) => b.matches - a.matches);
    }
}

/**
 * NewsVariables dataclass equivalent
 */
export class NewsVariables {
    invalid_keys: string[] = [
        'privacy', 'newsletter', 'modal', 'subscription', 
        'related-articles', 'recommended-posts', 'asset-below', 'card'
    ];
    
    tags_for_decompose: string[] = [
        'script', 'select', 'forms', 'template', 'button', 
        'aside', 'nav', 'footer', 'style', 'noscript'
    ];
    
    invalid_title_keys: string[] = [
        "page not found", "attention required!", "Página no encontrada"
    ];
}

/**
 * AuthorVariables dataclass equivalent
 */
export class AuthorVariables {
    comment_keys: string[] = ["COMMENT"];
    footer_keys: string[] = ["FOOTER", "SOCIAL", "SHARE", "FACEBOOK", "TWITTER"];
    author_keys: string[] = ["AUTHOR", "BYLINE"];
    tags_for_decompose: string[] = ["nav", "script", "time", "footer", "table", "li"];
    author_tags: string[] = ["span", "a", "p", "div"];
}

/**
 * English stop words from the provided file
 */
export const ENGLISH_STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't", 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', "can't", 'cannot', 'could', "couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing', "don't", 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll", "he's", 'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's", 'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its', 'itself', "let's", 'me', 'more', 'most', "mustn't", 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', "shan't", 'she', "she'd", "she'll", "she's", 'should', "shouldn't", 'so', 'some', 'such', 'than', 'that', "that's", 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', "there's", 'these', 'they', "they'd", "they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', "weren't", 'what', "what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's", 'whom', 'why', "why's", 'with', "won't", 'would', "wouldn't", 'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Tagalog stop words from the provided file
 */
export const TAGALOG_STOP_WORDS = new Set([
    'akin', 'aking', 'ako', 'alin', 'am', 'amin', 'aming', 'ang', 'ano', 'anumang', 'apat', 'at', 'atin', 'ating', 'ay', 'bababa', 'bago', 'bakit', 'bawat', 'bilang', 'dahil', 'dalawa', 'dapat', 'din', 'dito', 'doon', 'gagawin', 'gayunman', 'ginagawa', 'ginawa', 'ginawang', 'gumawa', 'gusto', 'habang', 'hanggang', 'hindi', 'huwag', 'iba', 'ibaba', 'ibabaw', 'ibig', 'ikaw', 'ilagay', 'ilalim', 'ilan', 'inyong', 'isa', 'isang', 'itaas', 'ito', 'iyo', 'iyon', 'iyong', 'ka', 'kahit', 'kailangan', 'kailanman', 'kami', 'kanila', 'kanilang', 'kanino', 'kanya', 'kanyang', 'kapag', 'kapwa', 'karamihan', 'katiyakan', 'katulad', 'kaya', 'kaysa', 'ko', 'kong', 'kulang', 'kumuha', 'kung', 'laban', 'lahat', 'lamang', 'likod', 'lima', 'maaari', 'maaaring', 'maging', 'mahusay', 'makita', 'marami', 'marapat', 'masyado', 'may', 'mayroon', 'mga', 'minsan', 'mismo', 'mula', 'muli', 'na', 'nabanggit', 'naging', 'nagkaroon', 'nais', 'nakita', 'namin', 'napaka', 'narito', 'nasaan', 'ng', 'ngayon', 'ni', 'nila', 'nilang', 'nito', 'niya', 'niyang', 'noon', 'o', 'pa', 'paano', 'pababa', 'paggawa', 'pagitan', 'pagkakaroon', 'pagkatapos', 'palabas', 'pamamagitan', 'panahon', 'pangalawa', 'para', 'paraan', 'pareho', 'pataas', 'pero', 'pumunta', 'pumupunta', 'sa', 'saan', 'sabi', 'sabihin', 'sarili', 'sila', 'sino', 'siya', 'tatlo', 'tayo', 'tulad', 'tungkol', 'una', 'walang'
]);

/**
 * Simple word tokenization
 */
export function word_tokenize(text: string): string[] {
    return text.split(/\s+/).filter(word => word.length > 0);
}

/**
 * Name entity function placeholder
 * Note: This would need to be implemented with actual API calls
 */
export function name_entity(authors: string[]): string[] {
    if (!Array.isArray(authors)) {
        throw new TypeError("Authors must be a list");
    }

    if (authors.length === 0) {
        return [];
    }

    // Placeholder implementation - would need actual API integration
    const filtered_authors: string[] = [];
    
    for (const author of authors) {
        // This would make actual API calls to name entity service
        // For now, just return the original authors
        if (author && !filtered_authors.includes(author)) {
            filtered_authors.push(author);
        }
    }

    if (filtered_authors.length > 2) {
        return filtered_authors.slice(0, 2);
    }

    return filtered_authors;
} 