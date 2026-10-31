async function main() {
  const res = await fetch("https://cute-zabaione-72c640.netlify.app");
  const html = await res.text();
  console.log("HTML length:", html.length);
  const re = /(?:src|href)=["']([^"']+)["']/g;
  let match;
  const assets = new Set();
  while ((match = re.exec(html)) !== null) {
    const url = match[1];
    if (!url.startsWith("http") && !url.startsWith("#") && !url.startsWith("mailto:")) {
      assets.add(url);
    }
  }
  console.log("Assets:", Array.from(assets));
}
main().catch(console.error);
