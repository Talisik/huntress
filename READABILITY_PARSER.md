# Readability Parser

A new parser extension that uses Mozilla's Readability.js library to extract clean article content from web pages.

## Features

- Uses Mozilla's proven Readability algorithm (same as Firefox Reader Mode)
- Extracts clean article content, removing ads, navigation, and other noise
- Comprehensive metadata extraction (title, authors, published date, images, etc.)
- Consistent response format matching existing parser APIs
- Full TypeScript support with proper type definitions
- Robust error handling

## Installation

The required dependency `@mozilla/readability` is already included in the package.

## Usage

### Basic Usage

```typescript
import { readabilityParserView } from 'talisik-huntress';

const result = await readabilityParserView({
    url: 'https://example.com/article',
    raw_content: htmlContent
});

console.log(result);
```

### Direct Function Usage

```typescript
import { extractWithReadability } from 'talisik-huntress';

const result = await extractWithReadability(url, htmlContent);
```

## Response Format

The function returns a response in the exact format specified:

```typescript
{
    data: [payload],
    status: "Done" | "Error",
    error_message: null | string,
    processing_time_in_seconds: number
}
```

### Payload Structure

The payload contains all the required fields:

```typescript
{
    article_title: string,
    article_website_name: string,
    article_fqdn: string,
    article_section: string[] | null,
    article_authors: string[] | null,
    article_published_date: string | null,
    article_images: string[] | null,
    article_content: string | null,
    article_videos: any[],
    article_language: string,
    article_status: "Done" | "Error",
    article_error_status: string | null,
    article_url: string
}
```

## Advantages of Readability.js

1. **Proven Algorithm**: Uses the same algorithm as Firefox Reader Mode
2. **Clean Content**: Excellent at removing ads, navigation, sidebars, and other noise
3. **Consistent Results**: More reliable than custom selectors for unknown websites
4. **Metadata Extraction**: Automatically extracts titles, authors, and other metadata
5. **Language Detection**: Detects article language automatically
6. **Performance**: Fast processing with minimal overhead

## Comparison with Existing Parsers

| Feature | Readability Parser | NewsExtract | GeneralParser |
|---------|-------------------|-------------|---------------|
| Content Quality | Excellent | Good | Good |
| Metadata Extraction | Comprehensive | Comprehensive | Basic |
| Website Compatibility | Universal | Site-specific | Universal |
| Performance | Fast | Medium | Fast |
| Noise Removal | Excellent | Good | Basic |

## Error Handling

The parser includes comprehensive error handling:

- Invalid URLs are handled gracefully
- Malformed HTML is processed safely
- Network errors are caught and reported
- Processing errors return structured error responses

## Testing

Run the test suite to verify functionality:

```bash
npm run test
npx ts-node test/readability-parser-test.ts
```

## Examples

See `examples/readability-usage.ts` for complete usage examples.

## Integration

The readability parser is exported from the main package and can be used alongside existing parsers:

```typescript
import { 
    readabilityParserView,
    parserExtensionView,
    GeneralParserView 
} from 'talisik-huntress';

// Use the most appropriate parser for your needs
const readabilityResult = await readabilityParserView(body);
const newsExtractResult = await parserExtensionView(body);
const generalResult = await GeneralParserView(body);
```
