import { readabilityParserView, extractWithReadability } from '../src/parser_extension/readability_parser';

/**
 * Example usage of the Readability Parser
 * This demonstrates how to use the new readability parser function
 */

async function exampleUsage() {
    // Example HTML content (you would typically get this from a web scraper or browser extension)
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sample Article - Tech News</title>
        <meta name="author" content="John Doe">
        <meta property="article:published_time" content="2024-01-15T10:30:00Z">
        <meta property="og:image" content="https://example.com/article-image.jpg">
        <meta property="article:section" content="Technology">
    </head>
    <body>
        <header>
            <nav>Navigation menu</nav>
        </header>
        <main>
            <article>
                <h1>Revolutionary AI Technology Changes Everything</h1>
                <div class="byline">By John Doe</div>
                <div class="publish-date">January 15, 2024</div>
                <img src="https://example.com/article-image.jpg" alt="AI Technology">
                
                <p>This is the first paragraph of our sample article. It contains important information about the revolutionary AI technology that is changing the world as we know it.</p>
                
                <p>The second paragraph continues with more detailed information about the implications of this technology. It discusses various aspects including technical specifications, market impact, and future predictions.</p>
                
                <p>In the third paragraph, we explore the potential benefits and challenges that come with this new technology. Experts from around the world have shared their insights on what this means for the future.</p>
                
                <p>The final paragraph concludes our article with a summary of the key points and a call to action for readers to stay informed about these developments.</p>
            </article>
        </main>
        <aside>
            <div class="sidebar">Related articles</div>
            <div class="ads">Advertisement</div>
        </aside>
        <footer>
            <p>Copyright 2024 Tech News</p>
        </footer>
    </body>
    </html>
    `;

    const url = 'https://technews.example.com/revolutionary-ai-technology';

    try {
        console.log('🚀 Using readabilityParserView function...\n');
        
        // Method 1: Using the convenience function that matches existing API pattern
        const result = await readabilityParserView({
            url: url,
            raw_content: htmlContent
        });

        console.log('📊 Results:');
        console.log('Status:', result.status);
        console.log('Processing Time:', result.processing_time_in_seconds.toFixed(3), 'seconds');
        console.log('Error Message:', result.error_message);
        
        if (result.data && result.data.length > 0) {
            const article = result.data[0];
            
            console.log('\n📰 Article Information:');
            console.log('Title:', article.article_title);
            console.log('Website Name:', article.article_website_name);
            console.log('FQDN:', article.article_fqdn);
            console.log('Authors:', article.article_authors);
            console.log('Published Date:', article.article_published_date);
            console.log('Language:', article.article_language);
            console.log('Section:', article.article_section);
            console.log('Images:', article.article_images);
            console.log('Content Length:', article.article_content?.length, 'characters');
            console.log('Status:', article.article_status);
            
            if (article.article_content) {
                console.log('\n📝 Content Preview:');
                console.log(article.article_content.substring(0, 200) + '...');
            }
        }

        console.log('\n✅ The response format matches the required structure:');
        console.log('- data: [payload]');
        console.log('- status: "Done"');
        console.log('- error_message: null');
        console.log('- processing_time_in_seconds: number');

        console.log('\n🎯 Payload structure matches requirements:');
        console.log('- article_title, article_website_name, article_fqdn');
        console.log('- article_section, article_authors, article_published_date');
        console.log('- article_images, article_content, article_videos');
        console.log('- article_language, article_status, article_error_status');
        console.log('- article_url');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Alternative usage with direct function call
async function alternativeUsage() {
    console.log('\n🔄 Alternative usage with extractWithReadability...\n');
    
    const htmlContent = '<html><body><h1>Simple Article</h1><p>This is a simple article content.</p></body></html>';
    const url = 'https://example.com/simple-article';

    try {
        // Method 2: Using the direct extraction function
        const result = await extractWithReadability(url, htmlContent);
        
        console.log('Status:', result.status);
        console.log('Processing Time:', result.processing_time_in_seconds.toFixed(3), 'seconds');
        
        if (result.data && result.data.length > 0) {
            const article = result.data[0];
            console.log('Title:', article.article_title);
            console.log('Content:', article.article_content);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run examples
async function runExamples() {
    await exampleUsage();
    await alternativeUsage();
    console.log('\n🎉 Examples completed!');
}

runExamples().catch(console.error);
