javascript
/* === MY SWEEPSTAKES HUB - RSS FEED AGGREGATOR v2 === */

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const RSS_FEEDS = [
    { name: 'Contest Bee', url: 'https://www.contestbee.com/sweepstakes-and-contests/feed/', category: 'Various' },
    { name: 'Sweepstakes Fanatics', url: 'https://www.sweepstakesfanatics.com/feed/', category: 'Various' },
    { name: 'Contest Girl', url: 'https://www.contestgirl.com/feed', category: 'Various' }
];

const CACHE_KEY = 'sweepstakes_rss_cache';
const CACHE_TIME = 30 * 60 * 1000;

function parseRSS(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');
    const items = xml.querySelectorAll('item');
    const sweeps = [];
    items.forEach(item => {
        const title = item.querySelector('title')?.textContent || 'No Title';
        const link = item.querySelector('link')?.textContent || '#';
        const description = item.querySelector('description')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        const category = item.querySelector('category')?.textContent || 'Various';
        let endDate = '';
        const endMatch = description.match(/Ends?\s*:?\s*([A-Z][a-z]+ \d{1,2},? \d{4})/i) || description.match(/([A-Z][a-z]+ \d{1,2},? \d{4})/i);
        if (endMatch) endDate = endMatch[1];
        let frequency = 'Single';
        if (description.toLowerCase().includes('daily entry') || description.toLowerCase().includes('enter daily')) frequency = 'Daily';
        else if (description.toLowerCase().includes('weekly')) frequency = 'Weekly';
        else if (description.toLowerCase().includes('monthly')) frequency = 'Monthly';
        else if (description.toLowerCase().includes('unlimited')) frequency = 'Unlimited';
        let formattedDate = '';
        if (pubDate) { const d = new Date(pubDate); formattedDate = (d.getMonth()+1).toString().padStart(2,'0')+'/'+d.getDate().toString().padStart(2,'0')+'/'+d.getFullYear().toString().slice(2); }
        let formattedEnd = '';
        if (endDate) { const d = new Date(endDate); if (!isNaN(d.getTime())) formattedEnd = (d.getMonth()+1).toString().padStart(2,'0')+'/'+d.getDate().toString().padStart(2,'0')+'/'+d.getFullYear().toString().slice(2); }
        sweeps.push({ title: title.replace(/&#8220;/g,'"').replace(/&#8221;/g,'"').replace(/&#8217;/g,"'"), link, category, endDate: formattedEnd || 'Unknown', frequency, addedDate: formattedDate || 'Recent', description: description.replace(/<[^>]*>/g,'').substring(0,200)+'...' });
    });
    return sweeps;
}

async function fetchFeed(feed) {
    try {
        const proxyUrl = CORS_PROXY + encodeURIComponent(feed.url);
        const response = await fetch(proxyUrl);
        const text = await response.text();
        const sweeps = parseRSS(text);
        sweeps.forEach(s => s.source = feed.name);
        return sweeps;
    } catch (err) { console.warn(`Failed to fetch ${feed.name}:`, err.message); return []; }
}

async function fetchAllFeeds() {
    const allSweeps = [];
    const results = await Promise.allSettled(RSS_FEEDS.map(feed => fetchFeed(feed)));
    results.forEach(result => { if (result.status === 'fulfilled') allSweeps.push(...result.value); });
    allSweeps.sort((a, b) => { const dateA = new Date(a.pubDate || 0); const dateB = new Date(b.pubDate || 0
