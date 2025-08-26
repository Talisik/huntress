import { readFileSync } from 'fs';
import { join } from 'path';
import { JSDOM } from 'jsdom';
import { NewsExtract } from '../src/parser_extension/extract_news';
import { parserExtensionView } from '../src/parser_extension/parser';

// Set up JSDOM to provide DOMParser for Node.js environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.DOMParser = dom.window.DOMParser;
global.document = dom.window.document;
global.NodeFilter = dom.window.NodeFilter;

async function testArticleParser() {
    console.log('🧪 Testing Article Parser with sample HTML...\n');

    try {
        // Read the sample HTML file
        const sampleHtmlPath = join(__dirname, '..', 'sample_article.html');
        const htmlContent = readFileSync(sampleHtmlPath, 'utf-8');
        
        console.log('📄 Sample HTML loaded successfully');
        console.log(`📏 HTML length: ${htmlContent.length} characters\n`);

        // Test 1: Direct NewsExtract usage
        console.log('🔍 Test 1: Direct NewsExtract Usage');
        console.log('=' .repeat(50));
        
        const newsExtract = new NewsExtract(
            'https://www.philstar.com/headlines/2025/08/26/2468195/nartatez-named-pnp-chief-after-torres-relief',
            htmlContent,
            false, // js
            'en',   // lang
            60,     // timeout
            'philstar.com', // fqdn
            null    // regex
        );

        const result = newsExtract.get_scraper_api_response();
        
        console.log('✅ NewsExtract Results:');
        console.log(`📰 Title: ${result.article_title}`);
        console.log(`🌐 FQDN: ${result.article_fqdn}`);
        console.log(`📅 Published Date: ${result.article_published_date}`);
        console.log(`👥 Authors: ${result.article_authors?.join(', ') || 'None'}`);
        console.log(`🖼️ Images: ${result.article_images?.length || 0} found`);
        console.log(`🎥 Videos: ${result.article_videos?.length || 0} found`);
        console.log(`🌍 Language: ${result.article_language}`);
        console.log(`📊 Status: ${result.article_status}`);
        console.log(`🔧 Parser Used: ${newsExtract.parser}`);
        console.log(`📝 Content Length: ${result.article_content?.length || 0} characters`);
        console.log(`📂 Sections: ${result.article_section?.join(', ') || 'None'}`);
        
        if (result.article_content) {
            console.log('\n📄 Content Preview (All):');
            console.log(result.article_content);
        }

        console.log('\n' + '='.repeat(50));

        // Test 2: parserExtensionView usage
        console.log('🔍 Test 2: parserExtensionView Usage');
        console.log('=' .repeat(50));

        const articleData = {
            url: 'https://www.philstar.com/headlines/2025/08/26/2468195/nartatez-named-pnp-chief-after-torres-relief',
            raw_content: htmlContent
        };

        const extensionResult = await parserExtensionView(articleData);

        console.log('✅ parserExtensionView Results:');
        // Pretty-print each data object for readability
        if (Array.isArray(extensionResult.data)) {
            extensionResult.data.forEach((item, idx) => {
                console.log(`🗂️ Data [${idx}]:\n${JSON.stringify(item, null, 2)}`);
            });
        } else {
            console.log('🗂️ Data:', JSON.stringify(extensionResult.data, null, 2));
        }
        console.log(`📊 Status: ${extensionResult.status}`);
        console.log(`⏱️ Processing Time: ${extensionResult.processing_time_in_seconds.toFixed(3)} seconds`);
        console.log(`❌ Error Message: ${extensionResult.error_message || 'None'}`);

        console.log('\n' + '='.repeat(50));

        // Test 3: Test different FQDN scenarios
        console.log('🔍 Test 3: Different FQDN Scenarios');
        console.log('=' .repeat(50));

        const testFqdns = [
            'philstar.com',
            'sunstar.com.ph',
            'showbizportal.net',
            'therebelsweetheart.com',
            'lifeiskulayful.com',
            'bilyonaryo.com'
        ];

        for (const fqdn of testFqdns) {
            console.log(`\n🌐 Testing FQDN: ${fqdn}`);
            
            const fqdnExtract = new NewsExtract(
                'https://example.com/test-article',
                htmlContent,
                false,
                'en',
                60,
                fqdn,
                null
            );

            const fqdnResult = fqdnExtract.get_scraper_api_response();
            console.log(`   📊 Status: ${fqdnResult.article_status}`);
            console.log(`   🔧 Parser: ${fqdnExtract.parser || 'None'}`);
            console.log(`   📝 Content Length: ${fqdnResult.article_content?.length || 0} chars`);
        }

        console.log('\n' + '='.repeat(50));

        // Test 4: Test with base64 encoded content
        console.log('🔍 Test 4: Base64 Encoded Content');
        console.log('=' .repeat(50));

        const base64Content = Buffer.from(htmlContent).toString('base64');
        const base64Extract = new NewsExtract(
            'https://www.philstar.com/headlines/2025/08/26/2468195/nartatez-named-pnp-chief-after-torres-relief',
            base64Content,
            false,
            'en',
            60,
            'philstar.com',
            null
        );

        const base64Result = base64Extract.get_scraper_api_response();
        console.log('✅ Base64 Decoding Results:');
        console.log(`📊 Status: ${base64Result.article_status}`);
        console.log(`📰 Title: ${base64Result.article_title}`);
        console.log(`📝 Content Length: ${base64Result.article_content?.length || 0} characters`);

        console.log('\n' + '='.repeat(50));

        // Test 5: Error handling
        console.log('🔍 Test 5: Error Handling');
        console.log('=' .repeat(50));

        try {
            // Test with invalid URL
            const invalidExtract = new NewsExtract(
                '', // Invalid URL
                htmlContent,
                false,
                'en',
                60,
                'philstar.com',
                null
            );
        } catch (error) {
            console.log('✅ Invalid URL Error Caught:', (error as Error).message);
        }

        try {
            // Test with no HTML content
            const noContentExtract = new NewsExtract(
                'https://example.com',
                '', // No content
                false,
                'en',
                60,
                'philstar.com',
                null
            );
        } catch (error) {
            console.log('✅ No Content Error Caught:', (error as Error).message);
        }

        console.log('\n' + '='.repeat(50));
        console.log('🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testArticleParser().catch(console.error); 