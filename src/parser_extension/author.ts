import { Compare, recursive_iterate, AuthorVariables, ENGLISH_STOP_WORDS, word_tokenize, catch_error } from './helpers';

/**
 * Get the most probable author
 */
export class Author {
    private soup: any; // This would be a proper HTML parser like jsdom or cheerio
    public names: string[];
    private stop_words: Set<string>;
    private full_date_names: string[];
    private letter_date_names: string[];
    private invalid_words: string[];
    private author_variables!: AuthorVariables;
    private author_data: Compare;

    constructor(html: string) {
        this.soup = this.createSoup(html);
        this.names = [];
        this.stop_words = ENGLISH_STOP_WORDS;
        this.full_date_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        this.letter_date_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        this.invalid_words = ["Published", "Hours", "Ago"];
        
        // CLEAN DOM
        this.__clean_html();

        // SET UP DATA FOR AUTHOR KEY COMPARISON
        this.author_data = new Compare(this.author_variables.author_keys);

        // FIND ALL PROBABLE TAG FOR AUTHORS
        for (const tag of this.author_variables.author_tags) {
            const blocks = this.soup.find_all(tag);
            const author = this.__iterate_tag(blocks);

            if (author) {
                // Author name entity logic :) MAV
                const split_author_name = author.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
                const cleaned_name = split_author_name.map(name => name.replace(/[^a-zA-Z.]/g, ' '));
                const cleaned_name_join = cleaned_name.join(' ');
                const temp = cleaned_name_join.split(' ');
                const author_names: string[] = [];
                
                for (const author_word of temp) {
                    if (this.full_date_names.includes(author_word) || 
                        this.letter_date_names.includes(author_word) || 
                        this.invalid_words.includes(author_word)) {
                        continue;
                    } else {
                        author_names.push(author_word);
                    }
                }
                
                const final_author = author_names.join(' ');
                if (final_author === "") {
                    const selector_author = this.author_selectors();
                    if (selector_author === null) {
                        this.names = ["No - Author"];
                    } else {
                        this.names = [selector_author];
                    }
                } else {
                    this.names = [final_author];
                }
                break;
            } else if (author === null) {
                const selector_author = this.author_selectors();
                if (selector_author === null) {
                    this.names = ["No - Author"];
                } else {
                    this.names = [selector_author];
                }
                break;
            }
        }
    }

    private createSoup(html: string): any {
        // This is a placeholder - you'll need to use a proper HTML parser
        // For now, we'll create a simple mock implementation
        return {
            find_all: (tag: string) => [],
            find: (tag: string, attrs?: any) => null
        };
    }

    private __iterate_tag(blocks: any[]): string | null {
        /**
         * Iterates bs4 blocks to find probable author
         */
        for (const block of blocks) {
            const attr_values = Object.values(block.attrs || {});

            for (const attr_val of attr_values) {
                if (attr_val === "" || (typeof attr_val === 'string' && attr_val.length > 20) || !attr_val) {
                    continue;
                }

                if (Array.isArray(attr_val)) {
                    const final_list = recursive_iterate(attr_val);

                    for (const val of final_list) {
                        if (val.length > 25) {
                            continue;
                        }

                        const result = this.author_data.eval(val);

                        if (result && result.length > 0) {
                            const similarity = parseInt(result[0].similarity.replace('%', ''));
                            if (similarity < 60) {
                                continue;
                            }

                            const possible_auth = block.get_text().replace(/\n/g, ' ').trim();

                            if (possible_auth === "") {
                                continue;
                            }

                            const possible_auth_tokens = word_tokenize(possible_auth);
                            const filtered_auth = possible_auth_tokens.filter(word => 
                                !this.stop_words.has(word.toLowerCase()) && 
                                !/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/.test(word)
                            );
                            const final_auth = filtered_auth.join(' ');

                            return final_auth;
                        }
                    }
                    continue;
                }

                const result = this.author_data.eval(attr_val as string);
                
                if (result && result.length > 0) {
                    const similarity = parseInt(result[0].similarity.replace('%', ''));

                    if (similarity < 60) {
                        continue;
                    }

                    const possible_auth = block.get_text().replace(/\n/g, ' ').trim();
                    
                    if (possible_auth === "") {
                        continue;
                    }

                    const possible_auth_tokens = word_tokenize(possible_auth);
                    const filtered_auth = possible_auth_tokens.filter(word => 
                        !this.stop_words.has(word.toLowerCase()) && 
                        !/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/.test(word)
                    );
                    const final_auth = filtered_auth.join(' ');

                    return final_auth;
                }
            }
        }
        return null;
    }

    private author_selectors(): string | null {
        try {
            const div_meta = this.soup.find("div", { "class": "meta" });
            if (div_meta) {
                const target_elem = div_meta.find("p", { "class": "author" });
                if (target_elem) {
                    const decom = target_elem.find("span");
                    if (decom) {
                        decom.remove();
                    }
                    const text = target_elem.get_text();
                    if (text && text !== "") {
                        return text.trim();
                    }
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    private __clean_html(): void {
        /**
         * Clean up page source
         */
        this.author_variables = new AuthorVariables();

        // DECOMPOSE TAGS WITH INVALID KEY OR MATCHING INVALID KEY
        const invalid_tags = this.soup.find_all((tag: any) => this.__is_invalid_tag(tag));
        for (const tag of invalid_tags) {
            tag.remove();
        }

        // REMOVE UNRELATED TAGS
        for (const key of this.author_variables.tags_for_decompose) {
            const tags = this.soup.find_all(key);
            for (const tag of tags) {
                tag.remove();
            }
        }

        // REMOVE UNRELATED CLASS NAMES FOR AUTHOR ELEMENTS
        const auth_wall_tags = this.soup.find_all("div", { "class": /auth-wall|author-description|author-url|timestamp-entry|author-bio/ });
        for (const tag of auth_wall_tags) {
            tag.remove();
        }

        const author_bio_tags = this.soup.find_all("p", { "class": "author-bio" });
        for (const tag of author_bio_tags) {
            tag.remove();
        }
    }

    private __is_invalid_tag(tag: any): boolean {
        /**
         * Returns the tag that contains specific invalid keyword
         * @param tag - BS4 tag/element
         */
        const INVALID_KEYS = [...this.author_variables.comment_keys, ...this.author_variables.footer_keys];
        
        // GET COMPARISON DATA
        const INVALID_KEY_DATA = new Compare(INVALID_KEYS);

        for (const [_, v] of Object.entries(tag.attrs || {})) {
            for (const key of INVALID_KEYS) {
                // SET TAG ATTRIBUTE VALUE FOR COMPARISON TO KEYS
                if (typeof v !== 'object') {
                    const comparison = INVALID_KEY_DATA.eval(v as string);
                    
                    if (key === v) {
                        return true;
                    } else if (comparison && comparison.length > 0) {
                        const similarity = parseInt(comparison[0].similarity.replace('%', ''));
                        if (similarity >= 70) {
                            return true;
                        }
                    }
                } else if (Array.isArray(v)) {
                    if (v.some(item => key === item)) {
                        return true;
                    }
                    
                    for (const _v of v) {
                        const _comparison = INVALID_KEY_DATA.eval(_v);
                        if (_comparison && _comparison.length > 0) {
                            const similarity = parseInt(_comparison[0].similarity.replace('%', ''));
                            if (similarity >= 70) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }
} 