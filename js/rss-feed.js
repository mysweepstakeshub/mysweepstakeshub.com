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
    allSweeps.sort((a, b) => { const dateA = new Date(a.pubDate || 0); const dateB = new Date(b.pubDate || 0); return dateB - dateA; });
    return allSweeps;
}

function renderSweepstakes(sweeps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const tableBody = container.querySelector('tbody');
    if (!tableBody) return;
    if (sweeps.length === 0) { tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">No sweepstakes available. <a href="submit.html">Submit one!</a></td></tr>'; return; }
    let html = '';
    sweeps.forEach((sweep, index) => {
        const rowClass = index % 2 === 0 ? '' : 'row-alt';
        const isNew = sweep.addedDate === 'Recent';
        html += `<tr class="${rowClass}"><td><a href="${sweep.link}" target="_blank" rel="noopener">${sweep.title}</a>${isNew?' <span class="new-badge">NEW</span>':''}</td><td><a href="category.html">${sweep.category}</a></td><td>${sweep.endDate}</td><td>${sweep.frequency}</td><td>${sweep.addedDate}</td></tr>`;
    });
    tableBody.innerHTML = html;
    const countElement = document.getElementById('sweeps-count');
    if (countElement) countElement.textContent = sweeps.length;
    updateStats(sweeps);
}

function updateStats(sweeps) {
    const freqStats = document.getElementById('frequency-stats');
    if (freqStats) {
        const counts = { Single: 0, Daily: 0, '24-Hour': 0, Unlimited: 0, Weekly: 0, Monthly: 0, Other: 0, Unknown: 0 };
        sweeps.forEach(s => { const f = s.frequency; if (counts[f] !== undefined) counts[f]++; else counts['Other']++; });
        freqStats.innerHTML = `<div>Single Entries: <b>${counts.Single}</b></div><div>Daily Entries: <b>${counts.Daily}</b></div><div>24-Hour Entries: <b>${counts['24-Hour']}</b></div><div>Unlimited Entries: <b>${counts.Unlimited}</b></div><div>Weekly Entries: <b>${counts.Weekly}</b></div><div>Monthly Entries: <b>${counts.Monthly}</b></div><div>Other: <b>${counts.Other}</b></div><div>Unknown: <b>${counts.Unknown}</b></div>`;
    }
    const countEl = document.getElementById('total-sweeps');
    if (countEl) countEl.textContent = sweeps.length;
    const todayCount = document.getElementById('today-count');
    if (todayCount) todayCount.textContent = '(' + sweeps.filter(s => s.addedDate === 'Recent').length + ')';
    const weekCount = document.getElementById('week-count');
    if (weekCount) weekCount.textContent = '(' + sweeps.length + ')';
}

async function loadSweepstakes(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const tableBody = container.querySelector('tbody');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Loading sweepstakes...</td></tr>';
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) { const { data, timestamp } = JSON.parse(cached); if (Date.now() - timestamp < CACHE_TIME) { renderSweepstakes(data, containerId); return; } }
    const sweeps = await fetchAllFeeds();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: sweeps, timestamp: Date.now() }));
    renderSweepstakes(sweeps, containerId);
}

function loadSweepstakesEnding(containerId) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { data } = JSON.parse(cached);
        const ending = data.filter(s => s.endDate !== 'Unknown').sort((a, b) => (a.endDate||'').localeCompare(b.endDate||'')).slice(0, 25);
        renderSweepstakes(ending, containerId);
    } else {
        loadSweepstakes(containerId);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('rss-feed-table')) loadSweepstakes('rss-feed-table');
    document.getElementById('refresh-feed')?.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem(CACHE_KEY); loadSweepstakes('rss-feed-table'); });
});
