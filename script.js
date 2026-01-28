let todosDados = [];
let dadosFiltrados = [];
let grafico = null;

// ================= LEITURA DO EXCEL =================

async function carregarDados() {
    // Tenta carregar o arquivo Excel. Se não encontrar, tenta carregar um mock para desenvolvimento.
    let resp = await fetch("base_dados.xlsx");
    if (!resp.ok) {
        console.warn("base_dados.xlsx não encontrado. Tentando carregar base_dados_mock.xlsx...");
        resp = await fetch("base_dados_mock.xlsx"); // Tenta carregar um mock para facilitar o desenvolvimento
        if (!resp.ok) {
            throw new Error("Erro ao baixar base_dados.xlsx ou base_dados_mock.xlsx: " + resp.status);
        }
    }

    const buffer = await resp.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const linhas = XLSX.utils.sheet_to_json(ws, { defval: "" });

    todosDados = linhas.map((row) => {
        // 1) Data
        const data = formatarData(row["Data"]);
        const { dia, mes, ano } = extrairPartesData(data);

        // 2) Total vindo do Excel (fração de dia ou número). Quero em HORAS.
        // Adicionando logs para depuração
        // console.log(`Original Total: ${row["Total"]}, Tipo: ${typeof row["Total"]}`);
        const totalHoras = horasAPartirDoExcel(row["Total"]);
        // console.log(`Convertido Total Horas: ${totalHoras}`);

        // 3) Cálculo HE 50% / 100%
        const he = calcularHorasExtras(totalHoras);

        return {
            data,
            diaSemana: row["Dia"] || "",
            entrada1: formatarHora(row["Entrada1"] || row["Entrada 1"]),
            saida1: formatarHora(row["Saida1"] || row["Saída 1"] || row["Saida 1"]),
            entrada2: formatarHora(row["Entrada2"] || row["Entrada 2"]),
            saida2: formatarHora(row["Saida2"] || row["Saída 2"] || row["Saida 2"]),
            totalHoras: Number(totalHoras.toFixed(2)), // Garante 2 casas decimais para exibição
            he50: he.he50,    // horas de HE 50%
            he100: he.he100,  // horas de HE 100%
            mes,
            ano,
        };
    }).filter(d => d.data && d.ano && d.mes); // Filtra linhas sem data válida

    dadosFiltrados = [...todosDados];
}

// ================= CONVERSÕES =================

// Excel serial -> dd/mm/aaaa
function formatarData(v) {
    if (v === "" || v == null) return "";

    // Se já é uma string no formato dd/mm/aaaa, retorna
    if (typeof v === "string" && v.match(/
^
\d{2}\/\d{2}\/\d{4}
$
/)) {
        return v;
    }

    // Se é um número serial do Excel
    if (typeof v === "number" && !isNaN(v)) {
        // O Excel começa a contar dias a partir de 1 de janeiro de 1900 (dia 1).
        // JavaScript Date começa a partir de 1 de janeiro de 1970.
        // A diferença entre 1900 e 1970 é de 70 anos, mais 1 dia para a base do Excel.
        // 25569 é o número de dias entre 1900-01-01 e 1970-01-01.
        // Ajuste para o bug de 1900 do Excel (ano bissexto)
        const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 30 de Dezembro de 1899
        const date = new Date(excelEpoch.getTime() + v * 24 * 60 * 60 * 1000);
        return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    }

    // Se for uma string em formato ISO (YYYY-MM-DD) ou similar que Date.parse entenda
    if (typeof v === "string") {
        const parsedDate = new Date(v);
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toLocaleDateString("pt-BR", { timeZone: "UTC" });
        }
    }

    return "";
}

function extrairPartesData(dataStr) {
    if (!dataStr) return { dia: null, mes: null, ano: null };
    const partes = dataStr.split("/");
    if (partes.length === 3) {
        return { dia: Number(partes[0]), mes: Number(partes[1]), ano: Number(partes[2]) };
    }
    return { dia: null, mes: null, ano: null };
}

// Lê a coluna "Total" e devolve HORAS (não fração de dia)
function horasAPartirDoExcel(v) {
    if (v === "" || v == null) return 0;

    // Número do Excel: fração de dia (0.5 = 12h, 0.05 ~ 1,2h)
    if (typeof v === "number" && !isNaN(v)) {
        const horas = v * 24;
        return Number(horas.toFixed(4)); // Manter alta precisão para cálculos
    }

    // Texto "8", "8,5", "8.25", "8:30"
    if (typeof v === "string") {
        // Tenta converter formato de hora (HH:MM)
        if (v.includes(":")) {
            const [h, m] = v.split(":").map(Number);
            if (!isNaN(h) && !isNaN(m)) {
                return Number((h + m / 60).toFixed(4));
            }
        }
        // Tenta converter número com vírgula ou ponto
        const num = Number(v.replace(",", "."));
        if (!isNaN(num)) return Number(num.toFixed(4));
    }

    return 0;
}

// Conversão horários de entrada/saída
function formatarHora(v) {
    if (v === "" || v == null) return "";

    // já vem 07:30 etc
    if (typeof v === "string" && v.includes(":")) {
        // Valida se é um formato HH:MM válido
        const [h, m] = v.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m) && h >= 0 && h < 24 && m >= 0 && m < 60) {
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        }
    }

    // número Excel (fração de dia)
    if (typeof v === "number" && !isNaN(v)) {
        // Garante que o número seja positivo antes de calcular
        const safeV = Math.max(0, v);
        const totalMin = Math.round(safeV * 24 * 60);
        const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
        const m = String(totalMin % 60).padStart(2, "0");
        return `${h}:${m}`;
    }

    return String(v); // Retorna como string se não conseguir formatar
}

// Regra de HE:
// - 8h normais
// - primeiras 2h de excesso = HE 50%
// - restante = HE 100%
function calcularHorasExtras(totalHoras) {
    const jornada = 8;
    const excesso = Math.max(0, totalHoras - jornada);
    const he50 = Math.min(excesso, 2);
    const he100 = Math.max(0, excesso - 2);
    return {
        he50: Number(he50.toFixed(2)),
        he100: Number(he100.toFixed(2)),
    };
}

// ================= FILTROS =================

const filterMonth = document.getElementById("filterMonth");
const filterYear = document.getElementById("filterYear");
const applyBtn  = document.getElementById("applyFilters");
const clearBtn  = document.getElementById("clearFilters");

// Verifica se os elementos existem antes de adicionar event listeners
if (applyBtn) {
    applyBtn.addEventListener("click", aplicarFiltros);
}
if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        if (filterMonth) filterMonth.value = "";
        if (filterYear) filterYear.value  = "";
        dadosFiltrados = [...todosDados];
        atualizarDashboard();
    });
}


function popularAnos() {
    if (!filterYear) return; // Garante que o elemento existe

    // Limpa opções existentes, exceto a primeira ("Todos os anos")
    while (filterYear.options.length > 1) {
        filterYear.remove(1);
    }

    const anos = [...new Set(todosDados.map((d) => d.ano).filter(Boolean))].sort((a, b) => a - b);
    anos.forEach((ano) => {
        const opt = document.createElement("option");
        opt.value = ano;
        opt.textContent = ano;
        filterYear.appendChild(opt);
    });
}

function aplicarFiltros() {
    const mSel = filterMonth && filterMonth.value ? Number(filterMonth.value) : null;
    const aSel = filterYear && filterYear.value ? Number(filterYear.value) : null;

    dadosFiltrados = todosDados.filter((d) => {
        let ok = true;
        if (mSel !== null) ok = ok && d.mes === mSel;
        if (aSel !== null) ok = ok && d.ano === aSel;
        return ok;
    });

    atualizarDashboard();
}

// ================= DASHBOARD =================

function atualizarDashboard() {
    // Verifica se os elementos existem antes de tentar atualizar
    const totalRegistrosEl = document.getElementById("totalRegistros");
    if (totalRegistrosEl) totalRegistrosEl.textContent = dadosFiltrados.length;

    const totalHE50  = dadosFiltrados.reduce((s, d) => s + d.he50, 0);
    const totalHE100 = dadosFiltrados.reduce((s, d) => s + d.he100, 0);
    const totalHE    = totalHE50 + totalHE100;

    const totalHE50El = document.getElementById("totalHE50");
    if (totalHE50El) totalHE50El.textContent  = totalHE50.toFixed(2)  + "h";
    const totalHE100El = document.getElementById("totalHE100");
    if (totalHE100El) totalHE100El.textContent = totalHE100.toFixed(2) + "h";
    const totalHEEl = document.getElementById("totalHE");
    if (totalHEEl) totalHEEl.textContent    = totalHE.toFixed(2)    + "h";

    preencherTabela();
    desenharGraficoMensalComTendencia();
}

function preencherTabela() {
    const tbody = document.querySelector("#dataTable tbody");
    if (!tbody) return; // Garante que o tbody existe
    tbody.innerHTML = "";

    dadosFiltrados.forEach((d) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${d.data}</td>
            <td>${d.diaSemana}</td>
            <td>${d.entrada1}</td>
            <td>${d.saida1}</td>
            <td>${d.entrada2}</td>
            <td>${d.saida2}</td>
            <td>${d.totalHoras.toFixed(2)}</td>
            <td>${d.he50.toFixed(2)}</td>
            <td>${d.he100.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ================= GRÁFICO: VARIAÇÃO MENSAL + LINHA DE TENDÊNCIA =================

function desenharGraficoMensalComTendencia() {
    const ctx = document.getElementById("heChart");
    if (!ctx) return;

    // 1) Agregar HE total por mês/ano
    const mapa = new Map(); // chave "2024-01" => { label: "01/2024", total: X }

    dadosFiltrados.forEach((d) => {
        if (!d.ano || !d.mes) return;
        const chave = `${d.ano}-${String(d.mes).padStart(2, "0")}`;
        const label = `${String(d.mes).padStart(2, "0")}/${d.ano}`;
        const heTotal = d.he50 + d.he100;

        if (!mapa.has(chave)) {
            mapa.set(chave, { label, total: 0 });
        }
        mapa.get(chave).total += heTotal;
    });

    const chavesOrdenadas = [...mapa.keys()].sort();
    const labels  = chavesOrdenadas.map((k) => mapa.get(k).label);
    const valores = chavesOrdenadas.map((k) => Number(mapa.get(k).total.toFixed(2)));

    // Se não houver dados, não desenha o gráfico
    if (valores.length === 0) {
        if (grafico) {
            grafico.destroy();
            grafico = null;
        }
        // Opcional: exibir uma mensagem "Sem dados para o gráfico"
        // ctx.innerHTML = '<p style="color: var(--muted); text-align: center;">Sem dados para exibir o gráfico.</p>';
        return;
    }

    const tendencia = calcularTendenciaLinear(valores);

    if (grafico) grafico.destroy(); // Destrói o gráfico anterior para redesenhar

    grafico = new Chart(ctx, {
        data: {
            labels,
            datasets: [
                {
                    type: "bar",
                    label: "HE Total (h) por mês",
                    data: valores,
                    backgroundColor: "rgba(34, 197, 94, 0.7)",
                    borderRadius: 6,
                    yAxisID: "y",
                },
                {
                    type: "line",
                    label: "Tendência (HE)",
                    data: tendencia,
                    borderColor: "rgba(250, 204, 21, 1)",
                    borderWidth: 2,
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3,
                    yAxisID: "y",
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: "#e5f5e9", maxRotation: 0, minRotation: 0 },
                    grid: { display: false },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "#e5f5e9" },
                    grid: { color: "rgba(148, 163, 184, 0.2)" },
                },
            },
            plugins: {
                legend: {
                    labels: { color: "#e5f5e9" },
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2) + 'h';
                            }
                            return label;
                        }
                    }
                }
            },
        },
    });
}

// regressão linear simples
function calcularTendenciaLinear(valores) {
    const n = valores.length;
    if (n === 0) return [];

    const xs = Array.from({ length: n }, (_, i) => i + 1); // x-values from 1 to n
    const ys = valores; // y-values are the actual HE totals

    const somaX  = xs.reduce((a, b) => a + b, 0);
    const somaY  = ys.reduce((a, b) => a + b, 0);
    const somaXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const somaX2 = xs.reduce((a, x) => a + x * x, 0);

    const denom = n * somaX2 - somaX * somaX;
    if (denom === 0) { // Evita divisão por zero se todos os x forem iguais (e.g., n=1)
        return ys.map(() => somaY / n); // Retorna a média dos valores
    }

    const a = (n * somaXY - somaX * somaY) / denom; // Slope
    const b = (somaY - a * somaX) / n; // Y-intercept

    return xs.map((x) => Number((a * x + b).toFixed(2)));
}

// ================= INICIALIZAÇÃO =================

window.addEventListener("load", async () => {
    try {
        await carregarDados();
        popularAnos();
        aplicarFiltros(); // Aplica filtros iniciais (todos os dados) e atualiza o dashboard
    } catch (e) {
        console.error("Erro fatal ao carregar dados ou inicializar:", e);
        alert("Erro ao carregar dados. Verifique o console para mais detalhes.");
    }
});
