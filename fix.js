const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');
html = html.replace(/\\`/g, '`');
html = html.replace(/\\\$/g, '$');
fs.writeFileSync('public/index.html', html);
console.log('Fixed syntax in public/index.html');
