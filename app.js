const products = [
  { id: 'itaipava50', brand: 'Itaipava', variant: '50 L', badge: 'IT' },
  { id: 'brahma30', brand: 'Brahma', variant: '30 L', badge: 'BR' },
  { id: 'brahma50', brand: 'Brahma', variant: '50 L', badge: 'BR' },
  { id: 'vinho30', brand: 'Vinho', variant: '30 L', badge: 'VI' },
  { id: 'vinho50', brand: 'Vinho', variant: '50 L', badge: 'VI' },
  { id: 'oxigenio', brand: 'Oxigênio', variant: 'Cilindro', badge: 'OX' }
];

const states = [
  { id: 'full', label: 'Cheio' },
  { id: 'half', label: 'Metade' },
  { id: 'empty', label: 'Vazio' }
];

const STOCK_KEY = 'estoque_barris_atual_v2';
const HISTORY_KEY = 'estoque_barris_historico_v2';
let stock = JSON.parse(localStorage.getItem(STOCK_KEY) || '{}');

products.forEach(p => {
  if (!stock[p.id]) stock[p.id] = {};
  states.forEach(s => {
    if (!Number.isInteger(stock[p.id][s.id]) || stock[p.id][s.id] < 0) stock[p.id][s.id] = 0;
  });
});

const grid = document.getElementById('stockGrid');
const totalUnits = document.getElementById('totalUnits');
const toast = document.getElementById('toast');

function persist(){ localStorage.setItem(STOCK_KEY, JSON.stringify(stock)); }
function productTotal(id){ return states.reduce((sum,s)=>sum + stock[id][s.id],0); }
function total(){ return products.reduce((sum,p)=>sum + productTotal(p.id),0); }
function stateTotal(stateId){ return products.reduce((sum,p)=>sum + stock[p.id][stateId],0); }
function showToast(msg){ toast.textContent=msg;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800); }

function renderStock(){
  grid.innerHTML = products.map(p => `
    <article class="stock-card">
      <div class="brand">
        <div class="brand-badge">${p.badge}</div>
        <div><h3>${p.brand}</h3><p>Barril ${p.variant}</p></div>
      </div>
      ${states.map(s => `
        <div class="status-row">
          <div class="status-name">${s.label}</div>
          <button data-action="minus" data-id="${p.id}" data-state="${s.id}" aria-label="Diminuir ${s.label}">−</button>
          <div class="status-count">${stock[p.id][s.id]}</div>
          <button class="plus" data-action="plus" data-id="${p.id}" data-state="${s.id}" aria-label="Adicionar ${s.label}">+</button>
        </div>
      `).join('')}
      <div class="card-total">Total: <strong>${productTotal(p.id)} unidades</strong></div>
    </article>`).join('');

  totalUnits.textContent = total();
  document.getElementById('totalFull').textContent = stateTotal('full');
  document.getElementById('totalHalf').textContent = stateTotal('half');
  document.getElementById('totalEmpty').textContent = stateTotal('empty');
}

grid.addEventListener('click', e => {
  const btn = e.target.closest('button[data-id]'); if (!btn) return;
  const {id,state,action} = btn.dataset;
  if (action === 'plus') stock[id][state]++;
  else stock[id][state] = Math.max(0, stock[id][state]-1);
  persist(); renderStock();
});

function localDateKey(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatDate(key){ const [y,m,d]=key.split('-'); return `${d}/${m}/${y}`; }
function formatProductLine(p,snapshot){
  const x=snapshot[p.id]||{full:0,half:0,empty:0};
  return `${p.brand} ${p.variant}: Cheio ${x.full||0} | Metade ${x.half||0} | Vazio ${x.empty||0}`;
}
function getHistory(){ return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]'); }
function setHistory(h){ localStorage.setItem(HISTORY_KEY,JSON.stringify(h)); }

function renderHistory(){
  const h=getHistory(), box=document.getElementById('history');
  if(!h.length){box.innerHTML='<div class="empty">Nenhum registro salvo ainda.</div>';return;}
  box.innerHTML=h.map(item=>`
    <article class="history-item">
      <div class="history-item-head"><strong>${formatDate(item.date)}</strong><span>${item.total} unidades</span></div>
      <p>${products.map(p=>formatProductLine(p,item.stock)).join('\n')}</p>
    </article>`).join('');
}

document.getElementById('saveDay').addEventListener('click',()=>{
  const date=localDateKey(); let h=getHistory();
  const entry={date,total:total(),stock:JSON.parse(JSON.stringify(stock)),savedAt:new Date().toISOString()};
  const idx=h.findIndex(x=>x.date===date);
  if(idx>=0)h[idx]=entry;else h.unshift(entry);
  h.sort((a,b)=>b.date.localeCompare(a.date));setHistory(h);renderHistory();showToast('Estoque do dia salvo');
});

document.getElementById('shareWhatsApp').addEventListener('click',()=>{
  const lines=[
    `*Estoque de Barris — ${formatDate(localDateKey())}*`,'',
    ...products.map(p=>{
      const x=stock[p.id];
      return `• *${p.brand} ${p.variant}*\n  Cheio: ${x.full} | Metade: ${x.half} | Vazio: ${x.empty}`;
    }),
    '',
    `*Resumo:* Cheios ${stateTotal('full')} | Metade ${stateTotal('half')} | Vazios ${stateTotal('empty')}`,
    `*Total geral: ${total()} barris*`
  ];
  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`,'_blank');
});

document.getElementById('resetStock').addEventListener('click',()=>{
  if(!confirm('Zerar todas as unidades do estoque atual?'))return;
  products.forEach(p=>states.forEach(s=>stock[p.id][s.id]=0));
  persist();renderStock();showToast('Estoque atual zerado');
});
document.getElementById('clearHistory').addEventListener('click',()=>{
  if(!confirm('Apagar todo o histórico salvo?'))return;
  localStorage.removeItem(HISTORY_KEY);renderHistory();showToast('Histórico apagado');
});

renderStock();renderHistory();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
