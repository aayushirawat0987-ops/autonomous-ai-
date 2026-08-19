const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('public/index.html', 'utf-8');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.sendTo(console);

try {
  const dom = new JSDOM(html, { runScripts: "dangerously", virtualConsole });
} catch (e) {
  console.error("JSDOM Error:", e);
}
