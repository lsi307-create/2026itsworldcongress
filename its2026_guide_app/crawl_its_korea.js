const https = require('https');
const fs = require('fs');
const path = require('path');

function cleanText(t) {
  return t.replace(/새글/g, '').replace(/\r?\n|\t/g, ' ').replace(/\s+/g, ' ').trim();
}

function crawlItsKoreaNews() {
  const url = 'https://itskorea.kr/boardList.do?type=8';
  console.log(`[Crawler] Fetching latest ITS Korea news from ${url} ...`);

  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const liRegex = /<li>[\s\S]*?<dl>[\s\S]*?<\/dl>[\s\S]*?<\/li>/gi;
      let m;
      const items = [];
      const seen = new Set();

      while ((m = liRegex.exec(data)) !== null) {
        const block = m[0];
        const aMatch = block.match(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
        if (!aMatch) continue;

        const rawUrl = aMatch[1].replace(/&amp;/g, '&');
        const rawTitle = cleanText(aMatch[2].replace(/<[^>]+>/g, ''));

        // Skip non-news or header links
        if (!rawTitle || rawTitle.length < 5 || rawTitle.includes('주 메뉴 바로가기') || seen.has(rawTitle)) continue;
        seen.add(rawTitle);

        let category = '동향';
        let cleanTitle = rawTitle;
        const catMatch = rawTitle.match(/^\[(.*?)\]\s*(.*)$/);
        if (catMatch) {
          category = catMatch[1];
          cleanTitle = catMatch[2];
        }

        const dateMatch = block.match(/(\d{4}-\d{2}-\d{2})/);
        const viewMatch = block.match(/조회\s*:\s*(\d+)/i);

        let fullUrl = rawUrl.startsWith('http')
          ? rawUrl
          : 'https://itskorea.kr/' + rawUrl.replace(/^\//, '');

        fullUrl = fullUrl.replace('itskorea.kr:443', 'itskorea.kr');

        items.push({
          fullTitle: rawTitle,
          title: cleanTitle,
          category: category,
          url: fullUrl,
          date: dateMatch ? dateMatch[1] : '2026-10-14',
          views: viewMatch ? parseInt(viewMatch[1], 10) : 0
        });
      }

      if (items.length > 0) {
        const outPath = path.join(__dirname, 'its2026_guide_app', 'its_korea_news.json');
        fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
        fs.writeFileSync(path.join(__dirname, 'its_korea_news.json'), JSON.stringify(items, null, 2), 'utf8');
        console.log(`[Crawler] Successfully saved ${items.length} news items to ${outPath}`);
      } else {
        console.warn('[Crawler] No news items extracted from response.');
      }
    });
  }).on('error', (err) => {
    console.error('[Crawler] Error fetching news:', err.message);
  });
}

crawlItsKoreaNews();
