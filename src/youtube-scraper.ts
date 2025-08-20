export interface YouTubeData {
  name: string;
  value: any;
}

export interface ScraperOptions {
  includeConsoleLog?: boolean;
}

export interface VideoInfo {
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

export class YouTubeScraper {
  public options: ScraperOptions;

  constructor(options: ScraperOptions = {}) {
    this.options = {
      includeConsoleLog: false,
      ...options
    };
  }

  /**
   * Scrapes YouTube data from HTML content using native DOM parsing for browser extensions
   * @param html - The HTML content as a string
   * @returns Array of extracted data objects
   */
  public scrape(html: string): YouTubeData[] {
    const results: YouTubeData[] = [];
    
    // For browser extensions, we can parse HTML directly
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const scripts = doc.querySelectorAll('script');
    
    for (const script of scripts) {
      const scriptContent = script.textContent || '';
      const varMatch = scriptContent.match(/var\s+(\w+)\s+=\s+(\{.+\});?/);

      if (!varMatch) continue;

      const name = varMatch[1];
      try {
        const value = JSON.parse(varMatch[2]);
        const data: YouTubeData = { name, value };
        results.push(data);

        if (this.options.includeConsoleLog) {
          console.log(name, value);
        }
      } catch (error) {
        // Skip invalid JSON
        continue;
      }
    }

    return results;
  }

  /**
   * Alternative method using regex for environments without DOM
   * @param html - The HTML content as a string
   * @returns Array of extracted data objects
   */
  public scrapeWithRegex(html: string): YouTubeData[] {
    const results: YouTubeData[] = [];
    
    // Use regex to find script tags and their content
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
      const scriptContent = match[1];
      const varMatch = scriptContent.match(/var\s+(\w+)\s+=\s+(\{.+\});?/);

      if (!varMatch) continue;

      const name = varMatch[1];
      try {
        const value = JSON.parse(varMatch[2]);
        const data: YouTubeData = { name, value };
        results.push(data);

        if (this.options.includeConsoleLog) {
          console.log(name, value);
        }
      } catch (error) {
        // Skip invalid JSON
        continue;
      }
    }

    return results;
  }

  /**
   * Extracts video information (title, description) from HTML
   * @param html - The HTML content as a string
   * @returns Video information object
   */
  public extractVideoInfo(html: string): VideoInfo {
    const ytInitialData = this.getYouTubeData(html, 'ytInitialData');
    
    if (!ytInitialData) {
      return {
        title: '',
        description: '',
        thumbnailUrl: '',
        allThumbnails: [],
        thumbnailsByQuality: {}
      };
    }

    const title = this.extractTitle(ytInitialData);
    const description = this.extractDescription(ytInitialData);
    const thumbnailUrl = this.extractThumbnailUrl(html);
    const allThumbnails = this.extractAllThumbnailUrls(html);
    const thumbnailsByQuality = this.extractThumbnailsByQuality(html);

    return { 
      title, 
      description, 
      thumbnailUrl, 
      allThumbnails, 
      thumbnailsByQuality 
    };
  }

  /**
   * Formats video information in the requested format
   * @param html - The HTML content as a string
   * @returns Formatted string with title and description
   */
  public formatVideoInfo(html: string): string {
    const videoInfo = this.extractVideoInfo(html);
    
    let formatted = '';
    
    // Add title
    if (videoInfo.title) {
      formatted += `${videoInfo.title}\n\n`;
    }
    
    // Add description
    if (videoInfo.description) {
      formatted += `${videoInfo.description}\n\n`;
    }
    
    return formatted.trim();
  }

  private extractTitle(data: any): string {
    // Try multiple paths to find the title
    const titlePaths = [
      'contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer?.title?.runs?.[0]?.text',
      'contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer?.h1?.simpleText',
      'videoDetails?.title',
      'microformat?.playerMicroformatRenderer?.title?.simpleText'
    ];

    for (const path of titlePaths) {
      const title = this.getNestedValue(data, path);
      if (title) return title;
    }

    return '';
  }

  private extractDescription(data: any): string {
    // Look for description in multiple possible locations
    const descriptionPaths = [
      'contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer?.attributedDescription?.content',  // Fixed: correct path with [1] index
      'contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results?.[0]?.itemSectionRenderer?.contents?.[0]?.backstagePostRenderer?.contentText?.runs?.[0]?.text',
      'contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results?.[0]?.itemSectionRenderer?.contents?.[0]?.expandableVideoDescriptionBodyRenderer?.attributedDescriptionBodyText?.content',
      'videoDetails?.shortDescription',
      'videoDetails?.attributedDescription?.content',
      'contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer?.description?.runs?.[0]?.text'
    ];

    for (const path of descriptionPaths) {
      const description = this.getNestedValue(data, path);
      if (description) return description;
    }

    return '';
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('?.').reduce((current, key) => {
      if (current === null || current === undefined) return null;
      
      // Handle array access like [0]
      const arrayMatch = key.match(/^\[(\d+)\]$/);
      if (arrayMatch && Array.isArray(current)) {
        const index = parseInt(arrayMatch[1]);
        return current[index];
      }
      
      return current[key];
    }, obj);
  }

  /**
   * Scrapes YouTube data from HTML and returns only the first match
   * @param html - The HTML content as a string
   * @returns First extracted data object or null
   */
  public scrapeFirst(html: string): YouTubeData | null {
    const results = this.scrape(html);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Scrapes YouTube data from HTML and finds a specific variable by name
   * @param html - The HTML content as a string
   * @param variableName - The name of the variable to find
   * @returns The data object if found, null otherwise
   */
  public scrapeByName(html: string, variableName: string): YouTubeData | null {
    const results = this.scrape(html);
    return results.find(data => data.name === variableName) || null;
  }

  /**
   * Gets YouTube data by variable name
   * @param html - The HTML content as a string
   * @param variableName - Name of the YouTube variable to extract
   * @returns The variable data or null
   */
  private getYouTubeData(html: string, variableName: string): any {
    const scrapedData = this.scrapeWithRegex(html);
    const data = scrapedData.find(data => data.name === variableName);
    return data?.value || null;
  }

  /**
   * Extracts ytInitialData as JSON string
   * @param html - The HTML content as a string
   * @returns JSON string of ytInitialData or null
   */
  public extractYtInitialDataJson(html: string): string | null {
    const data = this.getYouTubeData(html, 'ytInitialData');
    return data ? JSON.stringify(data, null, 2) : null;
  }

  /**
   * Extracts ytInitialPlayerResponse as JSON string
   * @param html - The HTML content as a string
   * @returns JSON string of ytInitialPlayerResponse or null
   */
  public extractYtInitialPlayerResponseJson(html: string): string | null {
    const data = this.getYouTubeData(html, 'ytInitialPlayerResponse');
    return data ? JSON.stringify(data, null, 2) : null;
  }

  /**
   * Extracts both ytInitialData and ytInitialPlayerResponse as JSON strings
   * @param html - The HTML content as a string
   * @returns Object with both JSON strings or null values
   */
  public extractAllYoutubeDataJson(html: string): {
    ytInitialData: string | null;
    ytInitialPlayerResponse: string | null;
  } {
    return {
      ytInitialData: this.extractYtInitialDataJson(html),
      ytInitialPlayerResponse: this.extractYtInitialPlayerResponseJson(html)
    };
  }

  /**
   * Extracts description from ytInitialData
   * @param html - The HTML content as a string
   * @returns The video description or empty string
   */
  public extractDescriptionFromInitialData(html: string): string {
    const data = this.getYouTubeData(html, 'ytInitialData');
    return data ? this.extractDescription(data) : '';
  }

  /**
   * Gets player response data from HTML
   * @param html - The HTML content as a string
   * @returns Player response data or null
   */
  private getPlayerResponseData(html: string): any {
    return this.getYouTubeData(html, 'ytInitialPlayerResponse');
  }

  /**
   * Gets quality score for thumbnail URL
   * @param url - The thumbnail URL
   * @returns Quality score (higher = better quality)
   */
  private getQualityScore(url: string): number {
    if (url.includes('maxresdefault')) return 5;
    if (url.includes('hqdefault')) return 4;
    if (url.includes('mqdefault')) return 3;
    if (url.includes('sddefault')) return 2;
    if (url.includes('default')) return 1;
    return 0;
  }

  /**
   * Sorts thumbnails by quality (highest first)
   * @param thumbnails - Array of thumbnail objects
   * @returns Sorted thumbnails array
   */
  private sortThumbnailsByQuality(thumbnails: any[]): any[] {
    return thumbnails.sort((a: any, b: any) => {
      return this.getQualityScore(b.url) - this.getQualityScore(a.url);
    });
  }

  /**
   * Gets thumbnails from player response data
   * @param data - Player response data
   * @returns Array of thumbnail objects
   */
  private getThumbnailsFromData(data: any): any[] {
    return data?.videoDetails?.thumbnail?.thumbnails || [];
  }

  /**
   * Extracts thumbnail URL from YouTube HTML
   * @param html - The HTML content as a string
   * @returns The highest quality thumbnail URL or empty string
   */
  public extractThumbnailUrl(html: string): string {
    const playerData = this.getPlayerResponseData(html);
    if (!playerData) return '';
    
    const thumbnails = this.getThumbnailsFromData(playerData);
    if (thumbnails.length === 0) return '';
    
    const sortedThumbnails = this.sortThumbnailsByQuality(thumbnails);
    return sortedThumbnails[0]?.url || '';
  }

  /**
   * Extracts all thumbnail URLs from YouTube HTML
   * @param html - The HTML content as a string
   * @returns Array of thumbnail URLs sorted by quality (highest first)
   */
  public extractAllThumbnailUrls(html: string): string[] {
    const playerData = this.getPlayerResponseData(html);
    if (!playerData) return [];
    
    const thumbnails = this.getThumbnailsFromData(playerData);
    const sortedThumbnails = this.sortThumbnailsByQuality(thumbnails);
    
    return sortedThumbnails.map((thumb: any) => thumb.url).filter(Boolean);
  }

  /**
   * Extracts thumbnail URLs by quality from YouTube HTML
   * @param html - The HTML content as a string
   * @returns Object with different quality thumbnail URLs
   */
  public extractThumbnailsByQuality(html: string): {
    hqdefault?: string;
    maxresdefault?: string;
    default?: string;
    mqdefault?: string;
    sddefault?: string;
  } {
    const playerData = this.getPlayerResponseData(html);
    if (!playerData) return {};
    
    const thumbnails = this.getThumbnailsFromData(playerData);
    const result: any = {};

    // Sort by width to get best quality for each type
    const sortedThumbnails = thumbnails.sort((a: any, b: any) => {
      return (b.width || 0) - (a.width || 0);
    });

    sortedThumbnails.forEach((thumb: any) => {
      const url = thumb.url;
      if (url.includes('maxresdefault') && !result.maxresdefault) result.maxresdefault = url;
      if (url.includes('hqdefault') && !result.hqdefault) result.hqdefault = url;
      if (url.includes('mqdefault') && !result.mqdefault) result.mqdefault = url;
      if (url.includes('sddefault') && !result.sddefault) result.sddefault = url;
      if (url.includes('default') && !url.includes('hqdefault') && !url.includes('maxresdefault') && !result.default) result.default = url;
    });

    return result;
  }

}

export default YouTubeScraper;