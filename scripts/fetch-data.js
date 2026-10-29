// Baixa os dados públicos do perfil para a pasta usada pelo gen-skin.js.
// Uso: node fetch-data.js <usuario> <pasta-de-dados>
const fs = require('fs');
const path = require('path');

const [user, dir] = process.argv.slice(2);
fs.mkdirSync(dir, { recursive: true });

const headers = { 'User-Agent': 'perfil-readme' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function get(url, opts = {}) {
  const res = await fetch(url, { headers: opts.api === false ? { 'User-Agent': headers['User-Agent'] } : headers });
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  return res;
}
const save = (name, data) => fs.writeFileSync(path.join(dir, name), data);

(async () => {
  const profile = await (await get(`https://api.github.com/users/${user}`)).json();
  save('user.json', JSON.stringify(profile));

  const repos = await (await get(`https://api.github.com/users/${user}/repos?per_page=100`)).json();
  save('repos.json', JSON.stringify(repos));
  for (const r of repos.filter(r => !r.fork)) {
    save(`lang-${r.name}.json`, await (await get(r.languages_url)).text());
  }

  save('contrib.html', await (await get(`https://github.com/users/${user}/contributions`, { api: false })).text());
  save('avatar.png', Buffer.from(await (await get(`${profile.avatar_url}&s=460`, { api: false })).arrayBuffer()));

  console.log(`dados de ${user}: ${repos.length} repositórios`);
})().catch(e => { console.error(e.message); process.exit(1); });
