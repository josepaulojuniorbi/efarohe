// service-worker.js

const CACHE_NAME = 'efaro-v1';
const urlsParaCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js'
    // Adicione aqui outros arquivos estáticos que você queira cachear
];

// ===== INSTALAR SERVICE WORKER =====
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Service Worker: Cache aberto durante a instalação.');
            return cache.addAll(urlsParaCache).catch((error) => {
                console.warn('Service Worker: Falha ao cachear alguns arquivos durante a instalação:', error);
                // Continuar mesmo se alguns arquivos não forem encontrados
                return Promise.resolve();
            });
        })
    );
    self.skipWaiting(); // Força o novo Service Worker a ativar imediatamente
});

// ===== ATIVAR SERVICE WORKER =====
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deletando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Assume o controle de todas as páginas abertas
    console.log('Service Worker: Ativado e pronto para interceptar requisições.');
});

// ===== INTERCEPTAR REQUISIÇÕES =====
self.addEventListener('fetch', (event) => {
    // Ignorar requisições não-GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Para requisições do GitHub (dados Excel)
    if (event.request.url.includes('raw.githubusercontent.com')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Se a resposta for válida, clonar e armazenar em cache
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                            console.log('Service Worker: Dados do Excel atualizados no cache.');
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Se offline ou erro de rede, retornar do cache
                    console.log('Service Worker: Offline ou erro de rede, buscando dados do Excel no cache.');
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Para outros recursos (HTML, CSS, JS, etc.)
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Retorna do cache se encontrado
            if (response) {
                return response;
            }
            // Se não estiver no cache, busca na rede e armazena em cache para futuras requisições
            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            }).catch(() => {
                // Fallback para página offline ou recurso padrão
                console.log('Service Worker: Falha ao buscar recurso na rede e não encontrado no cache:', event.request.url);
                // Você pode retornar uma página offline específica aqui
                // return caches.match('/offline.html'); 
                return new Response('<h1>Você está offline!</h1><p>Não foi possível carregar o recurso.</p>', {
                    headers: { 'Content-Type': 'text/html' }
                });
            });
        })
    );
});

// ===== SINCRONIZAÇÃO EM BACKGROUND (PeriodicSync) =====
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-dados') {
        console.log('Service Worker: Evento de sincronização em background "sync-dados" acionado.');
        event.waitUntil(sincronizarDados());
    }
});

async function sincronizarDados() {
    try {
        // ATENÇÃO: Verifique se o nome do arquivo Excel no seu repositório é 'dados.xlsx'
        // Se for 'base_dados.xlsx', você precisará mudar a URL abaixo.
        const urlExcel = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/main/base_dados.xlsx';
        // Se o nome for 'base_dados.xlsx', mude para:
        // const urlExcel = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/main/base_dados.xlsx';

        const response = await fetch(urlExcel);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(urlExcel, response.clone()); // Usa a URL completa como chave

            console.log('Service Worker: Dados do Excel sincronizados com sucesso via background sync.');

            // Notificar cliente que dados foram sincronizados
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'SYNC_COMPLETO',
                    mensagem: 'Dados sincronizados com sucesso!'
                });
            });
        } else {
            console.error('Service Worker: Falha ao buscar dados do Excel para sincronização:', response.status);
        }
    } catch (error) {
        console.error('Service Worker: Erro na sincronização de dados:', error);
    }
}

// ===== NOTIFICAÇÕES PUSH =====
self.addEventListener('push', (event) => {
    const opcoes = {
        body: event.data ? event.data.text() : 'Dados atualizados!',
        icon: '📊', // Ícone para a notificação
        badge: '📊', // Ícone menor para a barra de status (Android)
        tag: 'efaro-notificacao', // Agrupa notificações
        requireInteraction: false // Notificação desaparece automaticamente
    };

    event.waitUntil(
        self.registration.showNotification('Efaro Dashboard', opcoes)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

