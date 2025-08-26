# Huntress - YouTube Data Scraper & Article Parser

A powerful TypeScript library for extracting structured data from YouTube pages and parsing article content from web pages. Perfect for browser extensions, web scraping projects, and data analysis tools.

## Features

- **YouTube Data Extraction**: Extract video titles, descriptions, thumbnails, and raw YouTube data objects
- **Article Content Parsing**: Parse article content, titles, authors, and metadata from web pages
- **Multiple Output Formats**: Get structured data, formatted text, or raw JSON
- **TypeScript Support**: Full type definitions included
- **Lightweight**: No heavy dependencies, works in both browser and Node.js environments
- **Flexible**: Easy to integrate into existing projects

## 📦 Installation

```bash
npm install huntress
```

## 🛠️ Usage

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
import { parserExtensionView, Article } from 'huntress';

// Prepare article data
const articleData: Article = {
  url: 'https://example.com/article',
  raw_content: '<html>...</html>' // Raw HTML content of the article
};

// Parse article content
const result = parserExtensionView(articleData);

if (result.status === 'Done') {
  const parsedData = result.data[0];
  console.log('Article Title:', parsedData.article_title);
  console.log('Article Content:', parsedData.article_content);
  console.log('Authors:', parsedData.article_authors);
  console.log('Published Date:', parsedData.article_published_date);
  console.log('Images:', parsedData.article_images);
  console.log('Processing Time:', result.processing_time_in_seconds);
} else {
  console.error('Error:', result.error_message);
}
```

### Browser Extension Usage

```typescript
// In a browser extension content script
import { YouTubeScraper } from 'huntress';

const scraper = new YouTubeScraper({ includeConsoleLog: true });

// Get current page HTML
const html = document.documentElement.outerHTML;

// Extract video information
const videoInfo = scraper.extractVideoInfo(html);

// Send data to background script
chrome.runtime.sendMessage({
  type: 'VIDEO_DATA',
  data: videoInfo
});
```

## 📚 API Reference

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

Parses article content from raw HTML and returns structured data.

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

**Payload includes:**
- `article_title`: Article title
- `article_content`: Main article content
- `article_authors`: Array of author names
- `article_published_date`: Publication date
- `article_images`: Array of image URLs
- `article_website_name`: Website name
- `article_fqdn`: Domain name
- `article_section`: Article sections/categories
- `article_language`: Content language
- `article_status`: Processing status

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
huntress/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── youtube-scraper.ts          # YouTube scraper implementation
│   └── parser_extension/
│       ├── parser.ts               # Article parser main logic
│       ├── extract_news.ts         # News extraction logic
│       ├── author.ts               # Author extraction
│       └── helpers.ts              # Helper functions
├── test/
│   ├── simple-test.ts              # YouTube scraper tests
│   ├── article-parser-test.ts      # Article parser tests
│   └── content-extraction-test.ts  # Content extraction tests
├── dist/                           # Compiled output
├── sample-youtube.html             # Sample YouTube data
└── sample_article.html             # Sample article data
```

## 🧪 Testing

Run the test suite with the included sample data:

```bash
npm test
```

The tests will:
- Extract video information from sample YouTube HTML
- Test article parsing with sample article HTML
- Validate JSON extraction
- Demonstrate usage patterns for both YouTube and article parsing

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Changelog

### v1.0.0
- Initial release
- YouTube data extraction with DOM and regex methods
- Article content parsing with metadata extraction
- Video information extraction (title, description, thumbnails)
- JSON data extraction from YouTube pages
- TypeScript support

### v1.1.0

- Online Parsers

## 🔗 Related Projects

- [YouTube Data API](https://developers.google.com/youtube/v3) - Official YouTube API
- [Puppeteer](https://pptr.dev/) - Headless Chrome automation
- [Cheerio](https://cheerio.js.org/) - Server-side jQuery implementation

## 📞 Support

If you encounter any issues or have questions:

1. Check the [test files](test/) for usage examples
2. Open an issue on GitHub
3. Review the API documentation above

---

**Note**: This library is designed for educational and research purposes. Please respect websites' Terms of Service and robots.txt when scraping data.