javascript
/* === MY SWEEPSTAKES HUB - RSS FEED AGGREGATOR === */

// CORS proxy (free public service - use your own for production)
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// Sweepstakes RSS feeds to pull from
const RSS_FEEDS = [
    {
        name: 'Contest Bee',
        url: 'https://www.contestbee.com/sweepstakes-and-contests/feed/',
        category: 'Various'
    },
    {
        name: 'Sweepstakes Fanatics',
        url: 'https://www.sweepstakesfanatics.com/feed/',
        category: 'Various'
    },
    {
        name: 'Contest Girl',
        url: 'https://www.contestgirl.com/feed',
        category: 'Various'
    }
];

// Cache data in localStorage for 30 minutes
const CACHE_KEY = 'sweepstakes_rss_cache';
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes

// Parse RSS XML into sweepstakes objects
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

        // Extract end date from description if possible
        let endDate = '';
        const endMatch = description.match(/Ends?\s*:?\s*([A-Z][a-z]+ \d{1,2},? \d{4})/i) ||
                         description.match(/([A-Z][a-z]+ \d{1,2},? \d{4})/i);
        if (endMatch) {
            endDate = endMatch[1];
        }

        // Determine entry frequency from description
        let frequency = 'Single';
        if (description.toLowerCase().includes('daily entry') || description.toLowerCase().includes('enter daily')) {
            frequency = 'Daily';
        } else if (description.toLowerCase().includes('weekly')) {
            frequency = 'Weekly';
        } else if (description.toLowerCase().includes('monthly')) {
            frequency = 'Monthly';
        } else if (description.toLowerCase().includes('unlimited')) {
            frequency = 'Unlimited';
        }

        // Format date
        let formattedDate = '';
        if (pubDate) {
            const d = new Date(pubDate);
            formattedDate = (d.getMonth() + 1).toString().padStart(2, '0') + '/' +
                           d.getDate().toString().padStart(2, '0') + '/' +
                           d.getFullYear().toString().slice(2);
        }

        // Format end date
        let formattedEnd = '';
        if (endDate) {
            const d = new Date(endDate);
            if (!isNaN(d.getTime())) {
                formattedEnd = (d.getMonth() + 1).toString().padStart(2, '0') + '/' +
                              d.getDate().toString().padStart(2, '0') + '/' +
                              d.getFullYear().toString().slice(2);
            }
        }

        sweeps.push({
            title: title.replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').replace(/&#8217;/g, "'"),
            link: link,
            category: category,
            endDate: formattedEnd || 'Unknown',
            frequency: frequency,
            addedDate: formattedDate || 'Recent',
            description: description.replace(/<[^>]*>/g, '').substring(0, 200) + '...'
        });
    });

    return sweeps;
}

// Fetch a single RSS feed through proxy
async function fetchFeed(feed) {
    try {
        const proxyUrl = CORS_PROXY + encodeURIComponent(feed.url);
        const response = await fetch(proxyUrl);
        const text = await response.text();
        const sweeps = parseRSS(text);

        // Add source name to each sweep
        sweeps.forEach(s => s.source = feed.name);

        return sweeps;
    } catch (err) {
        console.warn(`Failed to fetch ${feed.name}:`, err.message);
        return [];
    }
}

// Fetch all feeds
async function fetchAllFeeds() {
    const allSweeps = [];
    const results = await Promise.allSettled(
        RSS_FEEDS.map(feed => fetchFeed(feed))
    );

    results.forEach(result => {
        if (result.status === 'fulfilled') {
            allSweeps.push(...result.value);
        }
    });

    // Sort by date (newest first)
    allSweeps.sort((a, b) => {
        const dateA = new Date(a.pubDate || 0);
        const dateB = new Date(b.pubDate || 0);
        return dateB - dateA;
    });

    return allSweeps;
}

// Render sweepstakes to the table
function renderSweepstakes(sweeps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const tableBody = container.querySelector('tbody');
    if (!tableBody) return;

    if (sweeps.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px;">
                    No sweepstakes available right now. <a href="submit.html">Submit one!</a>
                </td>
            </tr>`;
        return;
    }

    let html = '';
    sweeps.forEach((sweep, index) => {
        const rowClass = index % 2 === 0 ? '' : 'row-alt';
        const isNew = sweep.addedDate === 'Recent' || sweep.addedDate.includes('/26/');

        html += `
            <tr class="${rowClass}">
                <td>
                    <a href="${sweep.link}" target="_blank" rel="noopener">${sweep.title}</a>
                    ${isNew ? '<span class="new-badge">NEW</span>' : ''}
                </td>
                <td><a href="category.html">${sweep.category}</a></td>
                <td>${sweep.endDate}</td>
                <td>${sweep.frequency}</td>
                <td>${sweep.addedDate}</td>
            </tr>`;
    });

    tableBody.innerHTML = html;

    // Update count
    const countElement = document.getElementById('sweeps-count');
    if (countElement) {
        countElement.textContent = sweeps.length;
    }
}

// Load with cache
async function loadSweepstakes(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Show loading
    const tableBody = container.querySelector('tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px;">
                    Loading sweepstakes...
                </td>
            </tr>`;
    }

    // Check cache
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TIME) {
            renderSweepstakes(data, containerId);
            return;
        }
    }

    // Fetch fresh data
    const sweeps = await fetchAllFeeds();

    // Cache it
    localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: sweeps,
        timestamp: Date.now()
    }));

    renderSweepstakes(sweeps, containerId);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadSweepstakes('rss-feed-table');
});
