console.log('🚀 === DIAGNÓSTICO COMPLETO INICIADO ===');

// Verificações iniciais
console.log('📅 Timestamp:', new Date().toISOString());
console.log('🌐 User Agent:', navigator.userAgent);
console.log('🔗 URL atual:', window.location.href);

// URL do arquivo Excel no GitHub
const EXCEL_URL = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/refs/heads/main/base_dados.xlsx';

// Usuários e senhas
const usuarios = [
    { nome: 'José Paulo', email: 'josepaulojunior@live.com', senha: 'efaro2024' },
    { nome: 'Deise Borsato', email: 'deise.silva@efaro.com', senha: 'efaro2024' },
    { nome: 'Everton Henrique', email: 'everton@efaro.com.br', senha: 'efaro2024' },
    { nome: 'Matheus Rodas', email: 'matheus@efaro.com.br', senha: 'efaro2024' }
];

let usuarioLogado = null;

// Verificar se tudo carregou
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 === VERIFICAÇÕES INICIAIS ===');
    
    // Verificar elementos HTML
    const elementos = {
        loginForm: document.getElementById('loginForm'),
        email: document.getElementById('email'),
        password: document.getElementById('password'),
        loginError: document.getElementById('loginError'),
        loginScreen: document.getElementById('loginScreen'),
        dashboard: document.getElementById('dashboard'),
        userName: document.getElementById('userName')
    };
    
    console.log('🏗️ Elementos HTML encontrados:');
    Object.keys(elementos).forEach(key => {
        console.log(`  ${key}:`, elementos[key] ? '✅ OK' : '❌ NÃO ENCONTRADO');
    });
    
    // Verificar bibliotecas
    console.log('📚 Bibliotecas carregadas:');
    console.log('  Chart.js:', typeof Chart !== 'undefined' ? '✅ OK' : '❌ NÃO CARREGADA');
    console.log('  XLSX:', typeof XLSX !== 'undefined' ? '✅ OK' : '❌ NÃO CARREGADA');
    
    if (typeof XLSX !== 'undefined') {
        console.log('  Versão XLSX:', XLSX.version || 'Desconhecida');
    }
    
    // Testar conectividade
    console.log('🌐 Testando conectividade...');
    testarConectividade();
});

// Função para testar conectividade
async function testarConectividade() {
    console.log('🔗 === TESTE DE CONECTIVIDADE ===');
    
    const urlsParaTestar = [
        'https://httpbin.org/get', // Teste básico de conectividade
        'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/refs/heads/main/base_dados.xlsx',
        'https://github.com/josepaulojuniorbi/efarohe/raw/main/base_dados.xlsx'
    ];
    
    for (let i = 0; i < urlsParaTestar.length; i++) {
        const url = urlsParaTestar[i];
        console.log(`🔗 Testando URL ${i + 1}: ${url}`);
        
        try {
            const startTime = performance.now();
            const response = await fetch(url, {
                method: 'GET',
                cache: 'no-cache'
            });
            const endTime = performance.now();
            
            console.log(`  ⏱️ Tempo de resposta: ${(endTime - startTime).toFixed(2)}ms`);
            console.log(`  📊 Status: ${response.status} ${response.statusText}`);
            console.log(`  📊 Headers:`, Object.fromEntries(response.headers.entries()));
            
            if (response.ok) {
                if (url.includes('.xlsx')) {
                    const arrayBuffer = await response.arrayBuffer();
                    console.log(`  📦 Tamanho do arquivo: ${arrayBuffer.byteLength} bytes`);
                    
                    if (arrayBuffer.byteLength > 0) {
                        console.log(`  ✅ Arquivo Excel baixado com sucesso!`);
                        // Guardar para usar depois
                        window.testeArrayBuffer = arrayBuffer;
                    } else {
                        console.log(`  ❌ Arquivo está vazio!`);
                    }
                } else {
                    console.log(`  ✅ Conectividade OK!`);
                }
            } else {
                console.log(`  ❌ Erro HTTP: ${response.status}`);
            }
        } catch (error) {
            console.log(`  💥 Erro: ${error.message}`);
        }
        
        console.log(''); // Linha em branco para separar
    }
}

// Função de login
document.getElementById('loginForm')?.addEventListener('submit', function (event) {
    event.preventDefault();
    console.log('🔐 === PROCESSO DE LOGIN ===');

    const email = document.getElementById('email').value;
    const senha = document.getElementById('password').value;

    console.log('📧 Email digitado:', email);
    console.log('�� Senha digitada:', senha ? '***' : '(vazia)');

    const usuario = usuarios.find(u => u.email === email && u.senha === senha);

    if (usuario) {
        console.log('✅ Login bem-sucedido!');
        console.log('👤 Usuário:', usuario);
        usuarioLogado = usuario;
        iniciarDashboard();
    } else {
        console.log('❌ Login falhou - credenciais inválidas');
        document.getElementById('loginError').style.display = 'block';
    }
});

// Função para inicializar o dashboard
async function iniciarDashboard() {
    console.log('🚀 === INICIALIZANDO DASHBOARD ===');
    
    try {
        // Mostrar dashboard
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('userName').textContent = usuarioLogado.nome;
        
        console.log('🎨 Interface do dashboard exibida');
        
        // Testar carregamento do Excel
        await testarExcelCompleto();
        
    } catch (error) {
        console.error('💥 Erro ao inicializar dashboard:', error);
    }
}

// Função de teste completo do Excel
async function testarExcelCompleto() {
    console.log('📊 === TESTE COMPLETO DO EXCEL ===');
    
    try {
        // Passo 1: Verificar biblioteca XLSX
        console.log('📚 Passo 1: Verificando biblioteca XLSX...');
        if (typeof XLSX === 'undefined') {
            throw new Error('❌ Biblioteca XLSX não carregada!');
        }
        console.log('✅ Biblioteca XLSX OK');
        
        // Passo 2: Baixar arquivo
        console.log('📥 Passo 2: Baixando arquivo Excel...');
        console.log('🔗 URL:', EXCEL_URL);
        
        const response = await fetch(EXCEL_URL, {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*'
            }
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            throw new Error(`❌ Erro HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log('📦 Arquivo baixado - Tamanho:', arrayBuffer.byteLength, 'bytes');
        
        if (arrayBuffer.byteLength === 0) {
            throw new Error('❌ Arquivo está vazio!');
        }
        
        // Passo 3: Verificar se é um arquivo Excel válido
        console.log('🔍 Passo 3: Verificando se é um arquivo Excel válido...');
        
        // Verificar assinatura do arquivo Excel
        const uint8Array = new Uint8Array(arrayBuffer);
        const signature = Array.from(uint8Array.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('📝 Assinatura do arquivo (primeiros 4 bytes):', signature);
        
        // Assinatura típica de arquivos ZIP/Excel: 50 4B 03 04
        if (signature === '504b0304') {
            console.log('✅ Assinatura de arquivo Excel/ZIP detectada');
        } else {
            console.log('⚠️ Assinatura não reconhecida - pode não ser um arquivo Excel válido');
        }
        
        // Passo 4: Tentar ler com XLSX
        console.log('📖 Passo 4: Lendo arquivo com biblioteca XLSX...');
        
        const workbook = XLSX.read(arrayBuffer, { 
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellText: false
        });
        
        console.log('✅ Arquivo Excel lido com sucesso!');
        console.log('📋 Abas encontradas:', workbook.SheetNames);
        console.log('📊 Número de abas:', workbook.SheetNames.length);
        
        // Passo 5: Analisar cada aba
        console.log('🔍 Passo 5: Analisando conteúdo das abas...');
        
        workbook.SheetNames.forEach((sheetName, index) => {
            console.log(`\n📄 === ABA ${index + 1}: "${sheetName}" ===`);
            
            const worksheet = workbook.Sheets[sheetName];
            
            // Obter range da planilha
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
            console.log(`📐 Range da aba: ${worksheet['!ref']}`);
            console.log(`📊 Linhas: ${range.e.r + 1}, Colunas: ${range.e.c + 1}`);
            
            // Converter para JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: '',
                raw: false
            });
            
            console.log(`📊 Linhas de dados: ${jsonData.length}`);
            
            if (jsonData.length > 0) {
                console.log(`📋 Cabeçalho (linha 1):`, jsonData[0]);
                
                if (jsonData.length > 1) {
                    console.log(`�� Linha 2:`, jsonData[1]);
                }
                
                if (jsonData.length > 2) {
                    console.log(`�� Linha 3:`, jsonData[2]);
                }
                
                // Procurar coluna com nome
                const cabecalho = jsonData[0];
                const indiceNome = cabecalho.findIndex(col => 
                    col && col.toString().toLowerCase().includes('nome')
                );
                
                if (indiceNome >= 0) {
                    console.log(`👤 Coluna "nome" encontrada no índice: ${indiceNome}`);
                    
                    // Listar todos os nomes encontrados
                    const nomes = [];
                    for (let i = 1; i < Math.min(jsonData.length, 10); i++) {
                        const nome = jsonData[i][indiceNome];
                        if (nome) {
                            nomes.push(nome);
                        }
                    }
                    console.log(`👥 Nomes encontrados (primeiros 10):`, nomes);
                    
                    // Verificar se o usuário atual está na lista
                    const nomeUsuario = usuarioLogado.nome.toLowerCase();
                    const encontrado = nomes.some(nome => 
                        nome.toString().toLowerCase().includes(nomeUsuario.split(' ')[0]) ||
                        nomeUsuario.includes(nome.toString().toLowerCase())
                    );
                    
                    if (encontrado) {
                        console.log(`✅ Usuário "${usuarioLogado.nome}" ENCONTRADO nesta aba!`);
                    } else {
                        console.log(`❌ Usuário "${usuarioLogado.nome}" NÃO encontrado nesta aba`);
                    }
                } else {
                    console.log(`❌ Coluna "nome" NÃO encontrada nesta aba`);
                    console.log(`📋 Colunas disponíveis:`, cabecalho);
                }
            } else {
                console.log(`⚠️ Aba "${sheetName}" está vazia`);
            }
        });
        
        console.log('\n🎉 === TESTE COMPLETO FINALIZADO ===');
        
        // Salvar dados para uso posterior
        window.dadosExcelTeste = workbook;
        
    } catch (error) {
        console.error('💥 ERRO NO TESTE COMPLETO:', error);
        console.error('💥 Stack trace:', error.stack);
        
        // Tentar diagnóstico adicional
        console.log('🔧 Tentando diagnóstico adicional...');
        await diagnosticoAdicional();
    }
}

// Diagnóstico adicional em caso de erro
async function diagnosticoAdicional() {
    console.log('🔧 === DIAGNÓSTICO ADICIONAL ===');
    
    try {
        // Testar URLs alternativas
        const urlsAlternativas = [
            'https://github.com/josepaulojuniorbi/efarohe/raw/main/base_dados.xlsx',
            'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/main/base_dados.xlsx'
        ];
        
        for (const url of urlsAlternativas) {
            console.log(`🔗 Testando URL alternativa: ${url}`);
            try {
                const response = await fetch(url);
                console.log(`  Status: ${response.status}`);
                if (response.ok) {
                    const size = response.headers.get('content-length');
                    console.log(`  ✅ URL alternativa funciona! Tamanho: ${size} bytes`);
                }
            } catch (e) {
                console.log(`  ❌ URL alternativa falhou: ${e.message}`);
            }
        }
        
        // Verificar CORS
        console.log('🌐 Verificando possíveis problemas de CORS...');
        
        // Verificar se estamos em localhost
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.protocol === 'file:';
        
        console.log('🏠 Executando em localhost?', isLocalhost);
        console.log('🌐 Protocol:', window.location.protocol);
        console.log('🌐 Hostname:', window.location.hostname);
        
        if (window.location.protocol === 'file:') {
            console.log('⚠️ ATENÇÃO: Executando via file:// - isso pode causar problemas de CORS!');
            console.log('💡 SOLUÇÃO: Use um servidor local (Live Server, Python -m http.server, etc.)');
        }
        
    } catch (error) {
        console.error('💥 Erro no diagnóstico adicional:', error);
    }
}

// Função para sair
function logout() {
    console.log('👋 Logout realizado');
    usuarioLogado = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loginError').style.display = 'none';
}

// Função para teste manual (adicione um botão se quiser)
window.testeManual = function() {
    console.log('🧪 Iniciando teste manual...');
    testarExcelCompleto();
};

console.log('✅ Script de diagnóstico carregado - Pronto para teste!');
