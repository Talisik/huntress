# Huntress - YouTube Data Scraper

A powerful TypeScript library for extracting structured data from YouTube pages. Perfect for browser extensions, web scraping projects, and data analysis tools.

## �� Features

- **Dual Parsing Methods**: DOM-based parsing for browser environments and regex-based parsing for Node.js
- **Comprehensive Data Extraction**: Extract video titles, descriptions, and raw YouTube data objects
- **Multiple Output Formats**: Get structured data, formatted text, or raw JSON
- **TypeScript Support**: Full type definitions included
- **Lightweight**: No heavy dependencies, works in both browser and Node.js environments
- **Flexible**: Easy to integrate into existing projects

## 📦 Installation

```bash
npm install huntress-youtube-scraper
```

## 🛠️ Usage

### Basic Usage

```typescript
import { YouTubeScraper } from 'huntress-youtube-scraper';

// Create scraper instance
const scraper = new YouTubeScraper();

// Extract video information from HTML
const videoInfo = scraper.extractVideoInfo(htmlString);
console.log('Title:', videoInfo.title);
console.log('Description:', videoInfo.description);

// Get formatted output
const formatted = scraper.formatVideoInfo(htmlString);
console.log(formatted);
```

### Advanced Usage

```typescript
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
```

### Browser Extension Usage

```typescript
// In a browser extension content script
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

## �� API Reference

### YouTubeScraper Class

#### Constructor
```typescript
new YouTubeScraper(options?: ScraperOptions)
```

**Options:**
- `includeConsoleLog?: boolean` - Enable console logging during scraping (default: false)

#### Methods

##### `extractVideoInfo(html: string): VideoInfo`
Extracts video title and description from YouTube HTML.

**Returns:**
```typescript
interface VideoInfo {
  title: string;
  description: string;
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
}
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/Talisik/huntress.git
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
│   ├── index.ts              # Main entry point
│   └── youtube-scraper.ts    # Core scraper implementation
├── test/
│   └── simple-test.ts        # Test suite
├── dist/                     # Compiled output
└── sample-youtube.html       # Sample data for testing
```

## 🧪 Testing

Run the test suite with the included sample data:

```bash
npm test
```

The test will:
- Extract video information from sample HTML
- Test all major scraping methods
- Validate JSON extraction
- Demonstrate usage patterns

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

##  Changelog

### v1.0.0
- Initial release
- DOM and regex-based scraping methods
- Video information extraction
- JSON data extraction
- TypeScript support

##  Related Projects

- [YouTube Data API](https://developers.google.com/youtube/v3) - Official YouTube API
- [Puppeteer](https://pptr.dev/) - Headless Chrome automation
- [Cheerio](https://cheerio.js.org/) - Server-side jQuery implementation

## 📞 Support

If you encounter any issues or have questions:

1. Check the [test file](test/simple-test.ts) for usage examples
2. Open an issue on GitHub
3. Review the API documentation above

---

**Note**: This library is designed for educational and research purposes. Please respect YouTube's Terms of Service and robots.txt when scraping data.
```

This README provides:

1. **Clear description** of what the library does
2. **Installation instructions** for npm
3. **Comprehensive usage examples** for different scenarios
4. **Complete API reference** with all methods and interfaces
5. **Development setup** instructions
6. **Testing information**
7. **Contributing guidelines**
8. **Professional formatting** with emojis and clear sections

The README is tailored to your specific library and includes all the functionality I found in your code. Would you like me to modify any sections or add additional information?
