import { readFileSync } from 'fs';
import { YouTubeScraper } from '../src/youtube-scraper';

async function simpleTest() {
  try {
    // Read the sample HTML file
    const html = readFileSync('./sample-youtube.html', 'utf8');
    
    // Create scraper instance
    const scraper = new YouTubeScraper();
    
    console.log('=== Simple YouTube Scraper Test ===\n');
    
    // Test 1: Extract video information from HTML string
    console.log('1. Extracting video information from HTML...');
    const videoInfo = scraper.extractVideoInfo(html);

    console.log('✅ Video Title:', videoInfo.title);
    console.log('✅ Description:', videoInfo.description ? videoInfo.description.substring(0, 100) + (videoInfo.description.length > 100 ? '...' : '') : '(none)');
    console.log('✅ Thumbnail URL:', videoInfo.thumbnailUrl || '(none)');
    if (Array.isArray(videoInfo.allThumbnails) && videoInfo.allThumbnails.length > 0) {
      console.log('✅ All Thumbnails:', videoInfo.allThumbnails.length, 'found');
      console.log('   First thumbnail:', videoInfo.allThumbnails[0]);
    } else {
      console.log('✅ All Thumbnails: none found');
    }
    if (videoInfo.thumbnailsByQuality && Object.keys(videoInfo.thumbnailsByQuality).length > 0) {
      console.log('✅ Thumbnails by quality:', Object.keys(videoInfo.thumbnailsByQuality).join(', '));
    } else {
      console.log('✅ Thumbnails by quality: none found');
    }
    // Test 2: Get formatted output
    console.log('\n2. Getting formatted output...');
    const formatted = scraper.formatVideoInfo(html);
    console.log('✅ Formatted output (first 300 chars):');
    console.log(formatted.substring(0, 300) + '...');
    
    // Test 3: Extract specific data using regex method
    console.log('\n3. Extracting specific YouTube data...');
    const allData = scraper.scrapeWithRegex(html);
    console.log(`✅ Found ${allData.length} YouTube variables`);
    
    const initialData = allData.find(data => data.name === 'ytInitialData');
    if (initialData) {
      console.log('✅ ytInitialData found');
      
      // Test description extraction from ytInitialData
      const description = scraper.extractDescriptionFromInitialData(html);
      if (description) {
        console.log('✅ Description found in ytInitialData:');
        console.log('   Length:', description.length, 'characters');
        console.log('   Preview:', description.substring(0, 100) + '...');
      } else {
        console.log('❌ No description found in ytInitialData');
      }
    }
    
    const playerResponse = allData.find(data => data.name === 'ytInitialPlayerResponse');
    if (playerResponse) {
      console.log('✅ ytInitialPlayerResponse found');
    }
    
    // Test 4: Extract JSON data
    console.log('\n4. Extracting JSON data...');
    const ytInitialDataJson = scraper.extractYtInitialDataJson(html);
    if (ytInitialDataJson) {
      console.log('✅ ytInitialData JSON extracted');
      console.log('   Size:', ytInitialDataJson.length, 'characters');
    } else {
      console.log('❌ ytInitialData JSON not found');
    }
    
    const ytInitialPlayerResponseJson = scraper.extractYtInitialPlayerResponseJson(html);
    if (ytInitialPlayerResponseJson) {
      console.log('✅ ytInitialPlayerResponse JSON extracted');
      console.log('   Size:', ytInitialPlayerResponseJson.length, 'characters');
    } else {
      console.log('❌ ytInitialPlayerResponse JSON not found');
    }
    
    // Test 5: Extract all JSON data at once
    console.log('\n5. Extracting all JSON data...');
    const allJsonData = scraper.extractAllYoutubeDataJson(html);
    console.log('✅ All JSON data extracted:');
    console.log('   ytInitialData:', allJsonData.ytInitialData ? 'Found' : 'Not found');
    console.log('   ytInitialPlayerResponse:', allJsonData.ytInitialPlayerResponse ? 'Found' : 'Not found');
    
    // Test 6: Extract thumbnail URLs
    console.log('\n6. Extracting thumbnail URLs...');
    const thumbnailUrl = scraper.extractThumbnailUrl(html);
    const allThumbnails = scraper.extractAllThumbnailUrls(html);
    const thumbnailsByQuality = scraper.extractThumbnailsByQuality(html);
    
    console.log('✅ Thumbnail extraction results:');
    console.log('   Main thumbnail URL:', thumbnailUrl ? 'Found' : 'Not found');
    console.log('   All thumbnails count:', allThumbnails.length);
    console.log('   Quality thumbnails:', Object.keys(thumbnailsByQuality).filter(key => thumbnailsByQuality[key as keyof typeof thumbnailsByQuality]).length, 'types');
    
    if (thumbnailUrl) {
      console.log('   Sample thumbnail:', thumbnailUrl.substring(0, 80) + '...');
    }
    
    // Test 7: Verify thumbnail data in video info
    console.log('\n7. Verifying thumbnail data in video info...');
    console.log('✅ Video info thumbnail data:');
    console.log('   Thumbnail URL:', videoInfo.thumbnailUrl ? 'Found' : 'Not found');
    console.log('   All thumbnails count:', videoInfo.allThumbnails?.length || 0);
    console.log('   Quality thumbnails:', Object.keys(videoInfo.thumbnailsByQuality || {}).filter(key => videoInfo.thumbnailsByQuality?.[key as keyof typeof videoInfo.thumbnailsByQuality]).length, 'types');
    
    console.log('\n🎉 Simple test completed successfully!');
    console.log('\n📋 Usage in your extension:');
    console.log('const scraper = new YouTubeScraper();');
    console.log('const videoInfo = scraper.extractVideoInfo(htmlString);');
    console.log('const formatted = scraper.formatVideoInfo(htmlString);');
    console.log('const jsonData = scraper.extractAllYoutubeDataJson(htmlString);');
    console.log('const thumbnailUrl = scraper.extractThumbnailUrl(htmlString);');
    console.log('const allThumbnails = scraper.extractAllThumbnailUrls(htmlString);');
    
  } catch (error) {
    console.error('❌ Error in simple test:', error);
  }
}

// Run the test
simpleTest(); 