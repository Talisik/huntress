# Huntress - YouTube Data Scraper & Article Parser

A powerful TypeScript library for extracting structured data from YouTube pages and parsing article content from web pages. Perfect for browser extensions, web scraping projects, and data analysis tools.

## Features

- **YouTube Data Extraction**: Extract video titles, descriptions, thumbnails, and raw YouTube data objects
- **Article Content Parsing**: Parse article content, titles, authors, and metadata from web pages
- **General Web Content Parser**: Clean and extract content from any web page with noise removal
- **Multiple Output Formats**: Get structured data, formatted text, or raw JSON
- **TypeScript Support**: Full type definitions included
- **Lightweight**: No heavy dependencies, works in both browser and Node.js environments
- **Flexible**: Easy to integrate into existing projects

## 📦 Installation

```bash
npm install huntress
```

## 🛠️ Usage

### General Web Content Parsing (New!)

The `GeneralParser` class provides powerful web content extraction capabilities, perfect for browser extensions and content analysis tools.

```typescript
import { GeneralParser } from 'huntress';

// Simple static method - recommended for most use cases
const result = GeneralParser.parseContent(url, htmlString);
console.log('Title:', result.title);
console.log('Content:', result.content);
console.log('Word Count:', result.wordCount);
console.log('Reading Time:', result.readingTime, 'minutes');
console.log('Author:', result.metadata.author);
console.log('Images:', result.metadata.images);

// Advanced usage with custom options
const parser = new GeneralParser({
    removeImages: false,
    removeLinks: false,
    preserveFormatting: true,
    minContentLength: 100,
    includeMetadata: true
});

const parsed = parser.parse(htmlString, url);
console.log('Parsed content:', parsed);

// Extract only text content
const textOnly = GeneralParser.extractText(htmlString, 50);
console.log('Clean text:', textOnly);

// Extract only title
const title = GeneralParser.extractTitle(htmlString);
console.log('Page title:', title);

// Clean HTML while preserving structure
const cleanHtml = GeneralParser.cleanHtml(htmlString, {
    removeImages: false,
    removeLinks: false
});
console.log('Cleaned HTML:', cleanHtml);
```

### Browser Extension Usage

```typescript
// Perfect for browser extensions - uses native browser APIs
import { GeneralParser } from 'huntress';

// In a content script
const currentPageHtml = document.documentElement.outerHTML;
const currentUrl = window.location.href;

// Extract clean content from current page
const content = GeneralParser.parseContent(currentUrl, currentPageHtml);

// Send to background script
chrome.runtime.sendMessage({
    type: 'PAGE_CONTENT',
    data: {
        title: content.title,
        content: content.content,
        wordCount: content.wordCount,
        readingTime: content.readingTime,
        author: content.metadata.author,
        images: content.metadata.images
    }
});
```

### YouTube Data Scraping

```typescript
import { YouTubeScraper } from 'huntress';

// Create scraper instance
const scraper = new YouTubeScraper();

// Extract video information from HTML
const videoInfo = scraper.extractVideoInfo(htmlString);
console.log('Title:', videoInfo.title);
console.log('Description:', videoInfo.description);
console.log('Thumbnail:', videoInfo.thumbnailUrl);

// Get formatted output
const formatted = scraper.formatVideoInfo(htmlString);
console.log(formatted);

// Extract all YouTube data variables
const allData = scraper.scrapeWithRegex(htmlString);
console.log(`Found ${allData.length} YouTube variables`);

// Find specific data by name
const initialData = scraper.scrapeByName(htmlString, 'ytInitialData');
if (initialData) {
  console.log('ytInitialData found:', initialData.value);
}

// Extract raw JSON data
const jsonData = scraper.extractAllYoutubeDataJson(htmlString);
console.log('ytInitialData JSON:', jsonData.ytInitialData);
console.log('ytInitialPlayerResponse JSON:', jsonData.ytInitialPlayerResponse);

// Extract thumbnail URLs
const thumbnailUrl = scraper.extractThumbnailUrl(htmlString);
const allThumbnails = scraper.extractAllThumbnailUrls(htmlString);
const thumbnailsByQuality = scraper.extractThumbnailsByQuality(htmlString);

console.log('Main thumbnail:', thumbnailUrl);
console.log('All thumbnails:', allThumbnails);
console.log('High quality thumbnail:', thumbnailsByQuality.maxresdefault);
```

### Article Content Parsing

```typescript
import { parserExtensionView, GeneralParserView, Article } from 'huntress';

// Prepare article data
const articleData: Article = {
  url: 'https://example.com/article',
  raw_content: '<html>...</html>' // Raw HTML content of the article
};

// Option 1: Advanced parsing with NewsExtract (more comprehensive)
const advancedResult = parserExtensionView(articleData);

if (advancedResult.status === 'Done') {
  const parsedData = advancedResult.data[0];
  console.log('Article Title:', parsedData.article_title);
  console.log('Article Content:', parsedData.article_content);
  console.log('Authors:', parsedData.article_authors);
  console.log('Published Date:', parsedData.article_published_date);
  console.log('Images:', parsedData.article_images);
  console.log('Processing Time:', advancedResult.processing_time_in_seconds);
} else {
  console.error('Error:', advancedResult.error_message);
}

// Option 2: General parsing (faster, simpler)
const generalResult = GeneralParserView(articleData);

if (generalResult.status === 'Done') {
  const parsedData = generalResult.data[0];
  console.log('Article Title:', parsedData.article_title);
  console.log('Article Content:', parsedData.article_content);
  console.log('Article Website:', parsedData.article_website_name);
  console.log('Article FQDN:', parsedData.article_fqdn);
  console.log('Word Count:', parsedData.article_wordCount);
  console.log('Reading Time:', parsedData.article_readingTime, 'minutes');
  console.log('Language:', parsedData.article_language);
  console.log('Processing Time:', generalResult.processing_time_in_seconds);
} else {
  console.error('Error:', generalResult.error_message);
}
```

## 📚 API Reference

### GeneralParser Class

A comprehensive web content parser that removes noise and extracts clean content from any web page.

#### Constructor
```typescript
new GeneralParser(options?: GeneralParserOptions)
```

**Options:**
```typescript
interface GeneralParserOptions {
    removeImages?: boolean;        // Remove all images (default: false)
    removeLinks?: boolean;         // Remove all links (default: false)
    preserveFormatting?: boolean;  // Keep HTML formatting (default: true)
    minContentLength?: number;     // Minimum content length (default: 50)
    includeMetadata?: boolean;     // Extract metadata (default: true)
    cleanHtmlOnly?: boolean;       // Only clean HTML, don't extract text (default: false)
}
```

#### Static Methods (Recommended)

##### `GeneralParser.parseContent(url: string, html: string): ParsedContent`
Main method for parsing web content. Returns comprehensive parsed data.

##### `GeneralParser.extractText(html: string, minLength?: number): string | null`
Extract only clean text content without metadata.

##### `GeneralParser.extractTitle(html: string): string | null`
Extract only the page title.

##### `GeneralParser.cleanHtml(html: string, options?: GeneralParserOptions): string | null`
Clean HTML by removing noise while preserving structure.

#### Instance Methods

##### `parse(html: string, url?: string): ParsedContent`
Parse HTML content and return structured data.

#### Return Type

```typescript
interface ParsedContent {
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
    cleanedFullHtml?: string;
}
```

### YouTubeScraper Class

#### Constructor
```typescript
new YouTubeScraper(options?: ScraperOptions)
```

**Options:**
- `includeConsoleLog?: boolean` - Enable console logging during scraping (default: false)

#### Methods

##### `extractVideoInfo(html: string): VideoInfo`
Extracts video title, description, and thumbnail information from YouTube HTML.

**Returns:**
```typescript
interface VideoInfo {
  title: string;
  description: string;
  thumbnailUrl?: string;
  allThumbnails?: string[];
  thumbnailsByQuality?: {
    hqdefault?: string;
    maxresdefault?: string;
    default?: string;
    mqdefault?: string;
    sddefault?: string;
  };
}
```

##### `formatVideoInfo(html: string): string`
Returns formatted video information as a string with title and description.

##### `scrape(html: string): YouTubeData[]`
DOM-based scraping method for browser environments.

##### `scrapeWithRegex(html: string): YouTubeData[]`
Regex-based scraping method for Node.js environments.

##### `scrapeByName(html: string, variableName: string): YouTubeData | null`
Finds a specific YouTube variable by name.

##### `extractYtInitialDataJson(html: string): string | null`
Extracts ytInitialData as formatted JSON string.

##### `extractYtInitialPlayerResponseJson(html: string): string | null`
Extracts ytInitialPlayerResponse as formatted JSON string.

##### `extractAllYoutubeDataJson(html: string): { ytInitialData: string | null, ytInitialPlayerResponse: string | null }`
Extracts both major YouTube data objects as JSON strings.

##### `extractThumbnailUrl(html: string): string`
Extracts the main thumbnail URL from YouTube HTML.

##### `extractAllThumbnailUrls(html: string): string[]`
Extracts all available thumbnail URLs from YouTube HTML.

##### `extractThumbnailsByQuality(html: string): { hqdefault?: string, maxresdefault?: string, default?: string, mqdefault?: string, sddefault?: string }`
Extracts thumbnail URLs organized by quality.

### Article Parser

#### `parserExtensionView(body: Article)`

Advanced article parsing using NewsExtract engine. Provides comprehensive content extraction with detailed metadata.

**Parameters:**
```typescript
interface Article {
  url: string;
  raw_content: string;
}
```

**Returns:**
```typescript
{
  data: Payload[];
  status: string;
  error_message: string | null;
  processing_time_in_seconds: number;
}
```

#### `GeneralParserView(body: Article)`

General web content parsing using GeneralParser engine. Faster and simpler alternative to NewsExtract.

**Parameters:**
```typescript
interface Article {
  url: string;
  raw_content: string;
}
```

**Returns:**
```typescript
{
  data: [{
    article_title: string;
    article_content: string;
    article_website_name: string;
    article_url: string;
    article_published_date: string;
    article_images: string[];
    article_videos: string[];
    article_section: string[];
    article_authors: string;
    article_fqdn: string;
    article_language: string;
    article_status: string;
    article_error_status: string | null;
    article_wordCount: number;
    article_readingTime: number;
    article_metadata: object;
    is_article: boolean;
    source: string;
    source_property: string;
  }];
  status: string;
  error_message: string | null;
  processing_time_in_seconds: number;
}
```

**Common Payload Fields:**
- `article_title`: Article title
- `article_content`: Main article content
- `article_authors`: Author name(s)
- `article_published_date`: Publication date
- `article_images`: Array of image URLs
- `article_website_name`: Website name
- `article_fqdn`: Domain name
- `article_section`: Article sections/categories
- `article_language`: Content language
- `article_status`: Processing status ("Done" or "Error")
- `article_wordCount`: Word count (GeneralParserView only)
- `article_readingTime`: Estimated reading time in minutes (GeneralParserView only)

### Interfaces

```typescript
interface YouTubeData {
  name: string;
  value: any;
}

interface ScraperOptions {
  includeConsoleLog?: boolean;
}

interface VideoInfo {
  title: string;
  description: string;
  thumbnailUrl?: string;
  allThumbnails?: string[];
  thumbnailsByQuality?: {
    hqdefault?: string;
    maxresdefault?: string;
    default?: string;
    mqdefault?: string;
    sddefault?: string;
  };
}

interface Article {
  url: string;
  raw_content: string;
}

interface Payload {
  article_status: string;
  article_error_status?: string | null;
  article_title?: string;
  article_content?: string;
  article_authors?: string[];
  article_published_date?: string;
  article_images?: string[];
  article_website_name?: string;
  article_fqdn?: string;
  article_section?: string[];
  article_language?: string;
  [key: string]: any;
}
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/your-username/huntress.git
cd huntress

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

### Project Structure
```