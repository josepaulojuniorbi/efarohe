let todosDados = [];
let filtrados = [];
let grafico;

async function carregarDados() {
  const resp = await fetch("base_dados.xlsx");
  const buf = await resp.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

  todosDados = raw.map((r) => {
    const data = formatarData(r["Data"]);
    const total = calcularTotalHoras(r);
    const { he50, he100 } = calcularHorasExtras(total);
    return {
      data,
      dia: r["Dia"] || "",
      entrada1: formatarHora(r["Entrada1"]),
      saida1: formatarHora(r["Saida1"]),
      entrada2: formatarHora(r["Entrada2"]),
      saida2: formatarHora(r["Saida2"]),
      total,
      he50,
      he100,
    };
  });
  filtrados = [...todosDados];
  atualizarDashboard();
}

function formatarData(v) {
  if (typeof v === "number") {
    const date = new Date((v - 25569) * 86400 * 1000);
    return date.toLocaleDateString("pt-BR");
  }
  return v;
}

function formatarHora(v) {
  if (typeof v === "number") {
    const totalMin = Math.round(v * 1440);
    const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
    const m = String(totalMin % 60).padStart(2, "0");
    return `${h}:${m}`;
  }
  return v || "";
}

// Suponha que cálculo de total/hora extra vem do total de horas no Excel
function calcularTotalHoras(r) {
  const val = Number(r["Total"] || r["total"] || 0);
  return Number(val.toFixed(2));
}

// Exemplo: qualquer valor acima de 8h vira HE
function calcularHorasExtras(totalHoras) {
  if (!totalHoras) return { he50: 0, he100: 0 };
  const excesso = Math.max(totalHoras - 8, 0);
  return { he50: Math.min(excesso, 2), he100: Math.max(excesso - 2, 0) };
}

function atualizarDashboard() {
  const soma50 = filtrados.reduce((a, b) => a + b.he50, 0);
  const soma100 = filtrados.reduce((a, b) => a + b.he100, 0);
  document.getElementById("he50sum").textContent = soma50.toFixed(2) + "h";
  document.getElementById("he100sum").textContent = soma100.toFixed(2) + "h";
  document.getElementById("totalHE").textContent =
    (soma50 + soma100).toFixed(2) + "h";
  preencherTabela();
  desenharGrafico();
}

function preencherTabela() {
  const tb = document.querySelector("#dataTable tbody");
  tb.innerHTML = "";
  filtrados.forEach((d) => {
    tb.innerHTML += `<tr>
      <td>${d.data}</td><td>${d.dia}</td>
      <td>${d.entrada1}</td><td>${d.saida1}</td>
      <td>${d.entrada2}</td><td>${d.saida2}</td>
      <td>${d.total}</td><td>${d.he50}</td><td>${d.he100}</td></tr>`;
  });
}

function desenharGrafico() {
  const ctx = document.getElementById("heChart");
 José — você fez **tudo certo em termos de estrutura**, mas o que as imagens mostram confirma três coisas técnicas:

---

### 🔍 Diagnóstico

1. **O Service Worker zumbi (#146)** ainda intercepta o cache.  
   → É ele quem continua servindo uma versão **antiga** do seu `script.js`, anterior às correções (por isso as horas seguem em 0.05, o gráfico não atualiza e o CSS é simples).  
   → Ele também impede atualizações de `xlsx.min.js` e `styles.css`.

2. **O layout** que aparece (“tela branca, retângulo cinza, sem filtros”) é o HTML antigo que está sendo entregue pelo cache do SW.  

3. **As fórmulas HE50/100** e total estão usando números brutos do Excel (`0,05` = 1h12min, etc) porque a função que converte e calcula nunca está sendo executada — novamente, porque o navegador está rodando o código **velho**.

---

### ✅ Solução Executiva Passo a Passo

#### **Etapa 1 — Eliminar o Service Worker zumbi**
Visualmente, a tela que você mostrou (`Status #146 tentando instalar`) comprova isso.

Faça o seguinte *nessa ordem precisa*:

1. **No seu site**, abra `F12 → Application (Aplicativo) → Service Workers`.  
   Localize o escopo `https://josepaulojuniorbi.github.io/` ► clique em **“Cancelar registro”**.  
   Espere o botão sumir.
2. Marque “Bypass para a rede”.
3. Vá em “Armazenamento” (Storage) na esquerda e clique no botão **“Limpar dados do site” (Clear site data)**.
4. Feche COMPLETAMENTE o navegador (todas as janelas, inclusive anônimas).
5. Reabra o navegador.  
   Pronto — o SW não vai mais servir versões antigas (ele só se reinstala se existir o arquivo `service-worker.js` no repositório, e nós já removemos).

---

#### **Etapa 2 — Recolocar o código atualizado**
O código que você tem no branch `main` não é o que eu te passei ✅  
Baixe os três arquivos **novos**, bem como `xlsx.min.js`, e envie assim à raiz do repositório:

