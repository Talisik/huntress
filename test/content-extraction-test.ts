import { readFileSync } from 'fs';
import { join } from 'path';
import { JSDOM } from 'jsdom';

// Set up JSDOM to provide DOMParser for Node.js environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.DOMParser = dom.window.DOMParser;
global.document = dom.window.document;
global.NodeFilter = dom.window.NodeFilter;

async function testContentExtraction() {
    console.log('🧪 Testing Content Extraction with sample HTML...\n');

    try {
        // Read the sample HTML file
        const sampleHtmlPath = join(__dirname, '..', 'sample_article.html');
        const htmlContent = readFileSync(sampleHtmlPath, 'utf-8');
        
        console.log('📄 Sample HTML loaded successfully');
        console.log(`📏 HTML length: ${htmlContent.length} characters\n`);

        // Test 1: Basic DOMParser functionality
        console.log('🔍 Test 1: Basic DOMParser Functionality');
        console.log('=' .repeat(50));
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Extract title
        const titleElement = doc.querySelector('title');
        const title = titleElement ? titleElement.textContent : 'No title found';
        console.log(`📰 Title: ${title}`);
        
        // Extract meta description
        const metaDescription = doc.querySelector('meta[name="description"]');
        const description = metaDescription ? metaDescription.getAttribute('content') : 'No description found';
        console.log(`📝 Description: ${description?.substring(0, 100)}...`);
        
        // Extract author
        const metaAuthor = doc.querySelector('meta[name="author"]');
        const author = metaAuthor ? metaAuthor.getAttribute('content') : 'No author found';
        console.log(`👤 Author: ${author}`);
        
        // Extract published date
        const metaPublished = doc.querySelector('meta[property="article:published_time"]');
        const publishedDate = metaPublished ? metaPublished.getAttribute('content') : 'No date found';
        console.log(`📅 Published Date: ${publishedDate}`);
        
        // Extract article section
        const metaSection = doc.querySelector('meta[property="article:section"]');
        const section = metaSection ? metaSection.getAttribute('content') : 'No section found';
        console.log(`📂 Section: ${section}`);

        console.log('\n' + '='.repeat(50));

        // Test 2: Content extraction
        console.log('🔍 Test 2: Content Extraction');
        console.log('=' .repeat(50));
        
        // Try to find article content
        const contentSelectors = [
            'article',
            '.article-content',
            '.post-content', 
            '.entry-content',
            '.content',
            '.main-content',
            '[role="main"]',
            '.story-content',
            '.article-body',
            '.post-body'
        ];
        
        let contentFound = false;
        for (const selector of contentSelectors) {
            const elements = doc.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`✅ Found content with selector: ${selector}`);
                console.log(`📊 Number of elements: ${elements.length}`);
                
                const firstElement = elements[0];
                const textContent = firstElement.textContent || '';
                console.log(`📝 Content length: ${textContent.length} characters`);
                console.log(`📄 Content preview: ${textContent.substring(0, 200)}...`);
                contentFound = true;
                break;
            }
        }
        
        if (!contentFound) {
            console.log('❌ No content found with standard selectors');
            
            // Try paragraphs as fallback
            const paragraphs = doc.querySelectorAll('p');
            console.log(`📝 Found ${paragraphs.length} paragraphs`);
            
            if (paragraphs.length > 0) {
                const firstParagraph = paragraphs[0];
                const textContent = firstParagraph.textContent || '';
                console.log(`📄 First paragraph: ${textContent.substring(0, 200)}...`);
            }
        }

        console.log('\n' + '='.repeat(50));

        // Test 3: Image extraction
        console.log('🔍 Test 3: Image Extraction');
        console.log('=' .repeat(50));
        
        // Extract Open Graph image
        const ogImage = doc.querySelector('meta[property="og:image"]');
        const imageUrl = ogImage ? ogImage.getAttribute('content') : 'No OG image found';
        console.log(`🖼️ OG Image: ${imageUrl}`);
        
        // Extract all images
        const images = doc.querySelectorAll('img');
        console.log(`📸 Total images found: ${images.length}`);
        
        if (images.length > 0) {
            console.log('📸 First 3 images:');
            for (let i = 0; i < Math.min(3, images.length); i++) {
                const img = images[i];
                const src = img.getAttribute('src') || img.getAttribute('data-src') || 'No src';
                const alt = img.getAttribute('alt') || 'No alt';
                console.log(`   ${i + 1}. ${src} (${alt})`);
            }
        }

        console.log('\n' + '='.repeat(50));

        // Test 4: Schema.org structured data
        console.log('🔍 Test 4: Schema.org Structured Data');
        console.log('=' .repeat(50));
        
        const schemaScript = doc.querySelector('script[type="application/ld+json"]');
        if (schemaScript) {
            try {
                const schemaData = JSON.parse(schemaScript.textContent || '{}');
                console.log('✅ Schema.org data found:');
                console.log(`📰 Headline: ${schemaData.headline || 'Not found'}`);
                console.log(`👤 Author: ${schemaData.author?.name || 'Not found'}`);
                console.log(`📅 Date Published: ${schemaData.datePublished || 'Not found'}`);
                console.log(`📂 Article Section: ${schemaData.articleSection || 'Not found'}`);
                console.log(`🔑 Keywords: ${schemaData.keywords || 'Not found'}`);
            } catch (e) {
                console.log('❌ Failed to parse Schema.org data');
            }
        } else {
            console.log('❌ No Schema.org data found');
        }

        console.log('\n' + '='.repeat(50));
        console.log('🎉 Content extraction test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testContentExtraction().catch(console.error); 