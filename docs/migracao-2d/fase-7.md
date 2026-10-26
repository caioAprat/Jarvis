# Robustez

DPR limitado a 2; qualidade adaptativa após 3 segundos acumulados de quadros lentos reduz uma camada de estrelas, poeira frontal e resolução para até 1. Contagem inicial: 2.550 estrelas no desktop; 690 no celular. Partículas reaproveitadas, órbitas estáticas em cacheAsTexture. Sem filtros em tempo real.

visibilitychange, IntersectionObserver e mudança de aba suspendem o desenho e os tweens da cena. Ao deixar a jornada, Lenis é destruído para não impedir scroll das telas operacionais. prefers-reduced-motion remove o loop contínuo. Perda de contexto e falha completa de atlas exibem imagem estática mantendo o HTML navegável; falha WebP tenta PNG.

Service worker v5 guarda a nova casca e atlas WebP para uso offline, preservando a lógica de push. A demonstração não registra service worker nem escreve a configuração de produção.

Validação: onze cenários de interface em verificar-ui.cjs; 140 verificações do servidor; nenhum erro JavaScript. Chromium headless usa renderização por software, portanto avisos de GPU stall ao capturar pixels não são tratados como erro do aplicativo.
