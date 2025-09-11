/* =========================================================
   Cálculo de HE (50% / 100%) + Renderização
   Regras do usuário (confirmadas):
   1) Sábados, domingos e feriados → 100% de tudo trabalhado (sem franquia).
   2) Em dias úteis: excedente sobre 08:48.
      - Até 00:59 → 50%
      - A partir de 01:00 → split progressivo: 60 min em 50% e o restante em 100%
   3) “Feriados” ainda não definidos → placeholder (rever depois)
   4) Planilha: após Saída2 vem “Expediente”, depois 1 coluna vazia, depois “50%” e “100%”
   5) Valores/hora: 50% = R$ 39,17 | 100% = R$ 52,23
   ========================================================= */

////////////////////////////////////////////////////////////
// CONFIG
////////////////////////////////////////////////////////////
const SHEET_ID = '1G70SDPnu_jGtbAuLJPmUrOEsEydlivo4zIrWUeIG_'; // pode manter o seu
const API_KEY = ''; // se você já usa a API v4, coloque sua chave aqui
const SHEET_NAME = 'Apontamentos';
const RANGE = 'A:J';

// Jornada e valores
const JORNADA_MIN = 8 * 60 + 48; // 08:48 = 528 minutos
const VALOR_HE_50 = 39.17;
const VALOR_HE_100 = 52.23;

// Lista de feriados (placeholder). Formato: 'dd/mm/aaaa'
const FERIADOS = [
  // '01/01/2025',
  // '21/04/2025',
];

////////////////////////////////////////////////////////////
// UTILS: Tempo, Datas, Formatação
////////////////////////////////////////////////////////////
function parseHM(hm) {
  // Aceita 'HH:mm' ou vazio
  if (!hm || typeof hm !== 'string') return null;
  const t = hm.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const horas = parseInt(m[1], 10);
  const minutos = parseInt(m[2], 10);
  if (horas < 0 || minutos < 0 || minutos > 59) return null;
  return horas * 60 + minutos;
}

function minutesToHM(min) {
  if (min == null) return '';
  const sign = min < 0 ? '-' : '';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function currencyBRL(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseDateBR(d) {
  // Aceita 'dd/mm/aaaa' ou ISO 'aaaa-mm-dd'
  if (!d || typeof d !== 'string') return null;
  const s = d.trim();
  let dia, mes, ano;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/');
    dia = parseInt(dd, 10);
    mes = parseInt(mm, 10) - 1;
    ano = parseInt(yyyy, 10);
    return new Date(ano, mes, dia);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return new Date(s);
  }
  return null;
}

function isWeekend(dateStr, diaStr) {
  // Preferência: calcular pelo campo Data
  const dt = parseDateBR(dateStr);
  if (dt) {
    const wd = dt.getDay(); // 0=Dom, 6=Sáb
    if (wd === 0 || wd === 6) return true;
  }
  // Fallback: coluna "Dia" textual (ex.: "Sáb", "Dom", etc.)
  if (diaStr) {
    const d = diaStr.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    if (d.startsWith('sab') || d.startsWith('sáb') || d.startsWith('dom')) return true;
  }
  return false;
}

function isFeriado(dateStr) {
  const dt = parseDateBR(dateStr);
  if (!dt) return false;
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  const br = `${dd}/${mm}/${yyyy}`;
  return FERIADOS.includes(br);
}

function somaIntervalo(e, s) {
  const ei = parseHM(e);
  const si = parseHM(s);
  if (ei == null || si == null) return 0;
  const dur = si - ei;
  return Math.max(0, dur); // evita negativos se dados vierem invertidos
}

////////////////////////////////////////////////////////////
// CÁLCULOS PRINCIPAIS
////////////////////////////////////////////////////////////
function calcExpediente(e1, s1, e2, s2) {
  // Soma dos dois intervalos de trabalho
  const i1 = somaIntervalo(e1, s1);
  const i2 = somaIntervalo(e2, s2);
  return i1 + i2;
}

function calcHEDia({ data, dia, e1, s1, e2, s2 }) {
  const expedienteMin = calcExpediente(e1, s1, e2, s2);

  const fimDeSemana = isWeekend(data, dia);
  const feriado = isFeriado(data);

  let q50Min = 0;
  let q100Min = 0;

  if (fimDeSemana || feriado) {
    // Regra 1: sábado/domingo/feriado → 100% sobre TUDO
    q100Min = expedienteMin;
    q50Min = 0;
  } else {
    // Dias úteis → excedente sobre 08:48
    const excedente = Math.max(0, expedienteMin - JORNADA_MIN);
    if (excedente > 0) {
      if (excedente < 60) {
        q50Min = excedente;
        q100Min = 0;
      } else {
        q50Min = 60; // primeira hora
        q100Min = excedente - 60; // restante
      }
    }
  }

  // Valores em R$
  const val50 = (q50Min / 60) * VALOR_HE_50;
  const val100 = (q100Min / 60) * VALOR_HE_100;

  return {
    data,
    dia,
    e1,
    s1,
    e2,
    s2,
    expedienteMin,
    expedienteHM: minutesToHM(expedienteMin),
    q50Min,
    q100Min,
    q50HM: minutesToHM(q50Min),
    q100HM: minutesToHM(q100Min),
    val50,
    val100,
  };
}

////////////////////////////////////////////////////////////
/**
 * Leitura do Google Sheets
 * Preferência: API v4 (requere API_KEY) — lê intervalo "Apontamentos!A:J"
 * Fallback opcional: CSV publicado — descomente se quiser usar
 */
////////////////////////////////////////////////////////////
async function fetchSheetValues() {
  if (API_KEY) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME + '!' + RANGE)}?key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Erro ao buscar planilha via API: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    return json.values || [];
  } else {
    // Se preferir usar CSV publicado (sem API):
    // 1) Publique a aba "Apontamentos" como CSV
    // 2) Descomente o bloco abaixo
    /*
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
    const res = await fetch(csvUrl);
    if (!res.ok) {
      throw new Error(`Erro ao buscar planilha via CSV: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    return parseCSV(text); // retorna como array de arrays
    */
    throw new Error('API_KEY não configurada e fallback CSV desativado. Informe API_KEY ou habilite o bloco de CSV.');
  }
}

// Parser CSV simples (se usar fallback). Retorna array de arrays.
function parseCSV(text) {
  // Parser simplificado para dados sem aspas complexas.
  const rows = text.split(/\r?\n/).filter(Boolean);
  return rows.map((r) => r.split(',').map((c) => c.trim()));
}

////////////////////////////////////////////////////////////
// RENDERIZAÇÃO
////////////////////////////////////////////////////////////
function ensureContainers() {
  let tabela = document.getElementById('tabela');
  let totais = document.getElementById('totais');

  if (!tabela) {
    tabela = document.createElement('div');
    tabela.id = 'tabela';
    document.body.appendChild(tabela);
  }
  if (!totais) {
    totais = document.createElement('div');
    totais.id = 'totais';
    document.body.appendChild(totais);
  }
  return { tabela, totais };
}

function renderTabela(linhas) {
  const { tabela } = ensureContainers();

  const thead = `
    <thead>
      <tr>
        <th>Data</th>
        <th>Dia</th>
        <th>Entrada1</th>
        <th>Saída1</th>
        <th>Entrada2</th>
        <th>Saída2</th>
        <th>Expediente</th>
        <th>Quant. 50%</th>
        <th>Quant. 100%</th>
        <th>Valor 50%</th>
        <th>Valor 100%</th>
      </tr>
    </thead>
  `;

  const tbodyRows = linhas.map(l => `
    <tr>
      <td>${l.data || ''}</td>
      <td>${l.dia || ''}</td>
      <td>${l.e1 || ''}</td>
      <td>${l.s1 || ''}</td>
      <td>${l.e2 || ''}</td>
      <td>${l.s2 || ''}</td>
      <td>${l.expedienteHM}</td>
      <td>${l.q50HM}</td>
      <td>${l.q100HM}</td>
      <td>${currencyBRL(l.val50)}</td>
      <td>${currencyBRL(l.val100)}</td>
    </tr>
  `).join('');

  const tableHTML = `
    <table border="1" cellspacing="0" cellpadding="6">
      ${thead}
      <tbody>
        ${tbodyRows}
      </tbody>
    </table>
  `;

  tabela.innerHTML = tableHTML;
}

function renderTotais(linhas) {
  const { totais } = ensureContainers();

  const total50Min = linhas.reduce((acc, l) => acc + (l.q50Min || 0), 0);
  const total100Min = linhas.reduce((acc, l) => acc + (l.q100Min || 0), 0);
  const totalVal50 = linhas.reduce((acc, l) => acc + (l.val50 || 0), 0);
  const totalVal100 = linhas.reduce((acc, l) => acc + (l.val100 || 0), 0);

  const totalHM50 = minutesToHM(total50Min);
  const totalHM100 = minutesToHM(total100Min);

  const html = `
    <div style="margin-top: 12px;">
      <strong>Totais</strong><br>
      - Quantidade 50%: ${totalHM50} | Valor 50%: ${currencyBRL(totalVal50)}<br>
      - Quantidade 100%: ${totalHM100} | Valor 100%: ${currencyBRL(totalVal100)}<br>
      <hr>
      <strong>Valor Total: ${currencyBRL(totalVal50 + totalVal100)}</strong>
    </div>
  `;

  totais.innerHTML = html;
}

////////////////////////////////////////////////////////////
// PIPELINE: Buscar → Mapear → Calcular → Renderizar
////////////////////////////////////////////////////////////
async function carregarECalcular() {
  const values = await fetchSheetValues();
  if (!values || values.length === 0) {
    console.warn('Planilha sem dados.');
    renderTabela([]);
    renderTotais([]);
    return;
  }

  // Espera layout: A:J → Data, Dia, Entrada1, Saída1, Entrada2, Saída2, Expediente, (vazia), 50%, 100%
  // Vamos ignorar as colunas G:J da planilha (recalculamos tudo do lado da aplicação)
  // Remover cabeçalho se existir
  const header = values[0] || [];
  const hasHeader = (header[0] || '').toString().toLowerCase().includes('data');
  const linhas = hasHeader ? values.slice(1) : values;

  const linhasCalculadas = linhas
    .map(row => {
      // Garante pelo menos F colunas
      const [
        colA, // Data
        colB, // Dia
        colC, // Entrada1
        colD, // Saída1
        colE, // Entrada2
        colF  // Saída2
      ] = [
        row[0] || '',
        row[1] || '',
        row[2] || '',
        row[3] || '',
        row[4] || '',
        row[5] || ''
      ].map(v => (typeof v === 'string' ? v.trim() : v));

      // Ignora linhas completamente vazias
      const allEmpty = [colA, colB, colC, colD, colE, colF].every(x => !x);
      if (allEmpty) return null;

      return calcHEDia({
        data: colA,
        dia: colB,
        e1: colC,
        s1: colD,
        e2: colE,
        s2: colF
      });
    })
    .filter(Boolean);

  renderTabela(linhasCalculadas);
  renderTotais(linhasCalculadas);
}

////////////////////////////////////////////////////////////
// BOOT
////////////////////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', () => {
  carregarECalcular().catch(err => {
    console.error('Erro no processamento:', err);
    const { tabela, totais } = ensureContainers();
    tabela.innerHTML = `<div style="color:#b00">Erro: ${err.message}</div>`;
    totais.innerHTML = '';
  });
});
