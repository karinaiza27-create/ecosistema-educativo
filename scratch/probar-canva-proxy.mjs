async function test() {
  const res = await fetch("https://reciclaje-y-manejo-adecuado-de-residuos.my.canva.site");
  const html = await res.text();
  const re = /(?:src|href)=["']([^"']+\.(?:js|css))["']/g;
  let match;
  const assets = [];
  while ((match = re.exec(html)) !== null) {
    assets.push(match[1]);
  }
  console.log("Assets count:", assets.length, "First:", assets[0]);
  if (assets[0]) {
    const full = assets[0].startsWith("http") ? assets[0] : new URL(assets[0], "https://reciclaje-y-manejo-adecuado-de-residuos.my.canva.site").href;
    const r = await fetch(full, { method: "HEAD" });
    console.log(full, "CORS:", r.headers.get("access-control-allow-origin"));
  }
}
test().catch(console.error);
