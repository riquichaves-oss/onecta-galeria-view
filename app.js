/* Galeria Somente Visualização (robusta a variações do JSON)
   - Busca em itens.json
   - Sem estoque / sem edição
   - Filtros por “com foto / sem foto”
   - Render simples e rápido
*/

const el = (sel) => document.querySelector(sel);
const grid = el("#grid");
const input = el("#q");
const onlyPhoto = el("#only-photo");
const noPhoto = el("#no-photo");
const counter = el("#counter");

let DATA = [];
let VIEW = [];

/* Normaliza campos com acentos e variações */
function normalizeItem(raw) {
  const lowerKeys = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k.toLowerCase(), v])
  );

  const codigo =
    raw.codigo ?? raw.Código ?? lowerKeys.codigo ?? lowerKeys.code ?? lowerKeys.sku;

  const desc =
    raw["descrição"] ??
    raw["Descrição"] ??
    lowerKeys["descrição"] ??
    lowerKeys["descricao"] ??
    lowerKeys.description ??
    "";

  const custo =
    raw.custo ?? raw.Custo ?? lowerKeys.custo ?? lowerKeys.price ?? lowerKeys.valor;

  return {
    codigo: String(codigo || "").trim(),
    descricao: String(desc || "").trim(),
    custo: custo !== undefined && custo !== null && custo !== "" ? Number(custo) : null
  };
}

/* Tenta descobrir lista de itens dentro do JSON (items, itens, unid, etc.) */
function extractItems(json) {
  if (Array.isArray(json)) return json;
  const keys = Object.keys(json || {});
  const candidate = ["items", "itens", "unid", "produtos", "dados"];
  for (const k of candidate) {
    const kk = keys.find((x) => x.toLowerCase() === k);
    if (kk && Array.isArray(json[kk])) return json[kk];
  }
  // Se não achou, retorna vazio
  return [];
}

/* Checa se a foto existe
   - Ajuste “paths” se você usa outra pasta/nome de arquivo
*/
async function hasPhoto(sku) {
  const candidates = [
    `fotos/${sku}.jpg`,
    `fotos/${sku}.png`,
    `fotos/${sku}.jpeg`,
    `${sku}.jpg`,     // raiz (opcional)
    `${sku}.png`
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url;
    } catch (_) {}
  }
  return null;
}

/* Renderização */
function render(list) {
  grid.innerHTML = "";
  counter.textContent = `${list.length.toLocaleString("pt-BR")} item(ns)`;

  for (const p of list) {
    const card = document.createElement("div");
    card.className = "card";

    const sku = document.createElement("div");
    sku.className = "sku";
    sku.textContent = p.codigo || "—";

    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = p.descricao || "sem descrição";

    card.appendChild(sku);
    card.appendChild(desc);

    if (typeof p.custo === "number" && !Number.isNaN(p.custo)) {
      const price = document.createElement("div");
      price.className = "price";
      price.textContent = `Custo: R$ ${p.custo.toFixed(2)}`;
      card.appendChild(price);
    }

    if (p._fotoURL) {
      const a = document.createElement("a");
      a.href = p._fotoURL;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "ver foto";
      a.style.color = "#0ea5e9";
      a.style.marginTop = "6px";
      card.appendChild(a);
    } else {
      const small = document.createElement("div");
      small.style.color = "#9aa4b2";
      small.style.fontSize = "12px";
      small.textContent = "sem foto";
      small.style.marginTop = "6px";
      card.appendChild(small);
    }

    grid.appendChild(card);
  }
}

/* Filtro de busca + checkboxes */
function applyFilter() {
  const q = (input.value || "").toLowerCase();
  let list = DATA.filter((p) => {
    const hay =
      (p.codigo || "").toLowerCase() + " " + (p.descricao || "").toLowerCase();
    return hay.includes(q);
  });

  if (onlyPhoto.checked) list = list.filter((p) => !!p._fotoURL);
  if (noPhoto.checked) list = list.filter((p) => !p._fotoURL);

  VIEW = list;
  render(VIEW);
}

/* Carregamento */
async function boot() {
  try {
    const res = await fetch("itens.json", { cache: "no-store" });
    const json = await res.json();

    const rawList = extractItems(json);
    const normalized = rawList.map(normalizeItem).filter((x) => x.codigo);

    // Checa fotos em paralelo (até 10 por vez pra não sobrecarregar)
    const pool = [...normalized];
    const result = [];
    const MAX = 10;

    async function worker() {
      while (pool.length) {
        const item = pool.shift();
        item._fotoURL = await hasPhoto(item.codigo);
        result.push(item);
      }
    }
    await Promise.all(Array.from({ length: MAX }, worker));

    DATA = result;
    applyFilter();
  } catch (err) {
    console.error("Falha ao carregar itens.json:", err);
    grid.innerHTML =
      "<div style='color:#ef4444'>Erro ao carregar itens.json. Confirme que o arquivo está na raiz do site e que a Vercel está servindo a pasta '.' como saída.</div>";
  }
}

input.addEventListener("input", applyFilter);
onlyPhoto.addEventListener("change", applyFilter);
noPhoto.addEventListener("change", applyFilter);

boot();
