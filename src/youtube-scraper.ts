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
  transcript: string;
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
   * Scrapes YouTube data from HTML content using native DOM parsing
   * @param html - The HTML content as a string
   * @returns Array of extracted data objects
   */
  public scrape(html: string): YouTubeData[] {
    const results: YouTubeData[] = [];
    
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
   * Extracts video information (title, description, transcript) from HTML
   * @param html - The HTML content as a string
   * @returns Video information object
   */
  public extractVideoInfo(html: string): VideoInfo {
    // Try DOM parsing first, fallback to regex
    let scrapedData: YouTubeData[];
    try {
      scrapedData = this.scrape(html);
    } catch (error) {
      // Fallback to regex method if DOM is not available
      scrapedData = this.scrapeWithRegex(html);
    }

    const ytInitialData = scrapedData.find(data => data.name === 'ytInitialData')?.value;
    
    if (!ytInitialData) {
      return {
        title: '',
        description: '',
        transcript: ''
      };
    }

    const title = this.extractTitle(ytInitialData);
    const description = this.extractDescription(ytInitialData);
    const transcript = this.extractTranscript(ytInitialData);

    return { title, description, transcript };
  }

  /**
   * Formats video information in the requested format
   * @param html - The HTML content as a string
   * @returns Formatted string with title, description, and transcript
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
    
    // Add transcript
    if (videoInfo.transcript) {
      formatted += videoInfo.transcript;
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
    // Look for description in the structured description content
    const descriptionPaths = [
      'contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results?.[0]?.itemSectionRenderer?.contents?.[0]?.backstagePostRenderer?.contentText?.runs?.[0]?.text',
      'contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results?.[0]?.itemSectionRenderer?.contents?.[0]?.expandableVideoDescriptionBodyRenderer?.attributedDescriptionBodyText?.content',
      'videoDetails?.shortDescription'
    ];

    for (const path of descriptionPaths) {
      const description = this.getNestedValue(data, path);
      if (description) return description;
    }

    return '';
  }

  private extractTranscript(data: any): string {
    // Look for transcript data
    const transcriptPaths = [
      'contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results?.[0]?.itemSectionRenderer?.contents?.[0]?.videoDescriptionTranscriptSectionRenderer?.transcriptRendererBody?.transcriptBodyRenderer?.cueGroups'
    ];

    for (const path of transcriptPaths) {
      const transcriptData = this.getNestedValue(data, path);
      if (transcriptData && Array.isArray(transcriptData)) {
        return this.formatTranscript(transcriptData);
      }
    }

    return '';
  }

  private formatTranscript(cueGroups: any[]): string {
    const transcriptLines: string[] = [];

    for (const cueGroup of cueGroups) {
      const cues = cueGroup?.transcriptCueGroupRenderer?.cues;
      if (cues && Array.isArray(cues)) {
        for (const cue of cues) {
          const transcriptCueRenderer = cue?.transcriptCueRenderer;
          if (transcriptCueRenderer) {
            const startMs = transcriptCueRenderer?.startOffsetMs || 0;
            const text = transcriptCueRenderer?.cue?.simpleText || '';
            
            if (text) {
              const timestamp = this.formatTimestamp(startMs);
              transcriptLines.push(`${timestamp}: ${text}`);
            }
          }
        }
      }
    }

    return transcriptLines.join('\n');
  }

  private formatTimestamp(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
}

export default YouTubeScraper;