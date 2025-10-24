import { readabilityParserView, extractWithReadability } from '../src/parser_extension/readability_parser';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { ReadabilityResponse } from '../src/parser_extension/readability_parser';

interface TestResult {
    filename: string;
    function_response: ReadabilityResponse;
}

interface TestSummary {
    test_timestamp: string;
    total_files_tested: number;
    successful_extractions: number;
    failed_extractions: number;
    average_processing_time: number;
    results: TestResult[];
}

async function testAllHtmlFiles() {
    console.log('🧪 Testing Readability Parser with all HTML files...\n');

    const htmlFiles = [
        '11.html',
        'sample-gma.html', 
        'sample_article.html',
        'sample-youtube.html'
    ];

    const testResults: TestResult[] = [];
    let totalProcessingTime = 0;
    let successfulExtractions = 0;

    for (const filename of htmlFiles) {
        console.log(`📄 Testing with ${filename}...`);
        
        try {
            const htmlPath = join(__dirname, '..', filename);
            const htmlContent = readFileSync(htmlPath, 'utf-8');
            
            // Generate appropriate test URLs based on filename
            let testUrl: string;
            switch (filename) {
                case 'sample-gma.html':
                    testUrl = 'https://www.gmanetwork.com/news/sample-article';
                    break;
                case 'sample-youtube.html':
                    testUrl = 'https://www.youtube.com/watch?v=sample';
                    break;
                case '11.html':
                    testUrl = 'https://example.com/article-11';
                    break;
                default:
                    testUrl = `https://example.com/${filename.replace('.html', '')}`;
            }

            // Test the readabilityParserView function
            const result = await readabilityParserView({
                url: testUrl,
                raw_content: htmlContent
            });

            totalProcessingTime += result.processing_time_in_seconds;

            if (result.status === 'Done') {
                successfulExtractions++;
            }

            const testResult: TestResult = {
                filename,
                function_response: result
            };

            testResults.push(testResult);

            // Display summary info
            const article = result.data && result.data.length > 0 ? result.data[0] : null;
            console.log(`✅ ${filename}: ${result.status} (${result.processing_time_in_seconds.toFixed(3)}s)`);
            console.log(`   Title: ${article?.article_title || 'N/A'}`);
            console.log(`   Content Length: ${article?.article_content?.length || 0} characters`);
            console.log(`   Authors: ${article?.article_authors?.join(', ') || 'N/A'}`);

        } catch (error) {
            console.error(`❌ Failed to test ${filename}:`, error);
            
            // Create an error response in the same format as the function would return
            const errorResponse: ReadabilityResponse = {
                data: [{
                    article_title: '',
                    article_website_name: '',
                    article_fqdn: '',
                    article_section: null,
                    article_authors: null,
                    article_published_date: null,
                    article_images: null,
                    article_content: null,
                    article_videos: [],
                    article_language: 'en',
                    article_status: 'Error',
                    article_error_status: error instanceof Error ? error.message : String(error),
                    article_url: `https://example.com/${filename}`
                }],
                status: 'Error',
                error_message: error instanceof Error ? error.message : String(error),
                processing_time_in_seconds: 0
            };
            
            const errorResult: TestResult = {
                filename,
                function_response: errorResponse
            };
            
            testResults.push(errorResult);
        }
    }

    // Create test summary
    const testSummary: TestSummary = {
        test_timestamp: new Date().toISOString(),
        total_files_tested: htmlFiles.length,
        successful_extractions: successfulExtractions,
        failed_extractions: htmlFiles.length - successfulExtractions,
        average_processing_time: totalProcessingTime / htmlFiles.length,
        results: testResults
    };

    // Write results to JSON file
    const outputPath = join(__dirname, '..', 'readability-test-results.json');
    writeFileSync(outputPath, JSON.stringify(testSummary, null, 2), 'utf-8');

    console.log('\n📊 Test Summary:');
    console.log(`Total files tested: ${testSummary.total_files_tested}`);
    console.log(`Successful extractions: ${testSummary.successful_extractions}`);
    console.log(`Failed extractions: ${testSummary.failed_extractions}`);
    console.log(`Average processing time: ${testSummary.average_processing_time.toFixed(3)} seconds`);
    console.log(`\n💾 Results saved to: ${outputPath}`);

    return testSummary;
}

// Test with error handling
async function testErrorHandling() {
    console.log('\n🧪 Testing Error Handling...\n');

    try {
        // Test with invalid input
        const result = await readabilityParserView({
            url: 'invalid-url',
            raw_content: '<html><body><p>Minimal content</p></body></html>'
        });

        console.log('✅ Error Handling Test Results:');
        console.log('Status:', result.status);
        console.log('Error Message:', result.error_message);
        console.log('Processing Time:', result.processing_time_in_seconds.toFixed(3), 'seconds');

        if (result.data && result.data.length > 0) {
            const article = result.data[0];
            console.log('Article Status:', article.article_status);
            console.log('Article Error Status:', article.article_error_status);
        }

    } catch (error) {
        console.error('❌ Error handling test failed:', error);
    }
}

// Run tests
async function runTests() {
    const summary = await testAllHtmlFiles();
    await testErrorHandling();
    console.log('\n🎉 All tests completed!');
    
    // Display final summary
    console.log('\n📋 Final Test Report:');
    console.log('='.repeat(50));
    summary.results.forEach(result => {
        const response = result.function_response;
        const article = response.data && response.data.length > 0 ? response.data[0] : null;
        
        console.log(`${result.filename}: ${response.status} (${response.processing_time_in_seconds.toFixed(3)}s)`);
        if (article?.article_title) {
            console.log(`  📰 "${article.article_title}"`);
        }
        if (article?.article_content && article.article_content.length > 0) {
            console.log(`  📝 ${article.article_content.length} characters extracted`);
        }
        if (response.error_message) {
            console.log(`  ❌ ${response.error_message}`);
        }
        console.log('');
    });
}

runTests().catch(console.error);
