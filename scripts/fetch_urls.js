const fs = require('fs');
const urls = [
    "https://maps.app.goo.gl/7Z7jXpGD2tTyJsVR9?g_st=ac",
    "https://maps.app.goo.gl/G1UdFSzVHsvvzg7t9",
    "https://maps.app.goo.gl/cx8LajNQ5Hbr9jeo8",
    "https://maps.app.goo.gl/CdwEzuaZTkPwzkzz5",
    "https://maps.app.goo.gl/P9vTyjjS3BTzXhYj6",
    "https://maps.app.goo.gl/zaKK9KXSmhqnPdNs5"
];

async function main() {
    let result = '';
    for (const u of urls) {
        try {
            const res = await fetch(u, { method: 'HEAD', redirect: 'follow' });
            result += `URL: ${u}\nFINAL: ${res.url}\n\n`;
        } catch (e) {
            result += `Error fetching ${u}: ${e}\n\n`;
        }
    }
    fs.writeFileSync('urls_out.txt', result);
}
main();
