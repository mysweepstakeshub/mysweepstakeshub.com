import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime

# 1. THE SCRAPER: Where to look for prizes
def scrape_to_github():
    # REPLACE the URL below with a legit sweepstakes page you want to track
    url = "https://www.sweepsadvantage.com" 
    headers = {'User-Agent': 'Mozilla/5.0'}
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    found_sweeps = []
    
    # This looks for links that mention "Sweepstakes" or "Win"
    for link in soup.find_all('a', href=True):
        text = link.text.strip().lower()
        if "sweepstakes" in text or "win" in text:
            found_sweeps.append({
                "title": link.text.strip()[:100], # Keep title short
                "url": link['href']
            })
    
    # 2. THE WEBSITE DATA: Save for your index.html
    with open('sweeps.json', 'w') as f:
        json.dump(found_sweeps[:15], f) # Save the top 15
    
    # 3. THE EMAIL ROBOT: Create the rss.xml for your newsletter
    rss_items = ""
    for item in found_sweeps[:10]:
        rss_items += f"<item><title>{item['title']}</title><link>{item['url']}</link></item>"

    rss_content = f'<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>Daily Legit Sweeps</title><link>https://github.com</link>{rss_items}</channel></rss>'
    
    with open('rss.xml', 'w') as f:
        f.write(rss_content)
    
    print(f"Success! Found {len(found_sweeps)} sweepstakes.")
