LIVE RANK — TikTok Live

1. Instale Node.js.
2. Dê dois cliques em INICIAR.bat.
3. O painel abre em http://localhost:8091/admin.html
4. A tela da live fica em http://localhost:8091/
5. No OBS/TikTok Live Studio, adicione a tela como fonte de navegador ou captura de janela.

TESTE SEM LIVE:
- Use "Teste TAP" e "Teste Presente" no painel.
- Os rankings atualizam em tempo real.

TIKTOK:
- Informe o @ da conta que estiver AO VIVO e clique Conectar.
- O conector usa tiktok-live-connector (API não oficial).
- Likes podem não chegar em todas as lives de grande volume, pois o próprio TikTok nem sempre emite o evento individual.
- Presentes do tipo streak são processados somente quando a sequência termina, evitando contagem duplicada.

ARQUITETURA:
- server.js = servidor + TikTok + Socket.IO + ranking
- public/index.html = tela da live
- public/admin.html = painel admin
