// src/chatbot.js

window.initEventAssistant = function() {
    const activeId = window.impersonatingId || window.currentUser || "demo_id";
    const container = document.getElementById('tpd-chat-messages');
    const titleEl = document.getElementById('tpd-chat-title');
    const evento = window.currentEventType || 'Evento';
    
    if(titleEl) titleEl.innerHTML = `<i class="fa-solid fa-brain mr-2"></i> IA: ${evento}`;
    
    const saludos = [
        `¡Hola! Qué gusto saludarte. Soy el asistente IA de tu <b>${evento}</b>. <br><br>Actualmente estoy analizando el ID <i>${activeId}</i>. ¿En qué te puedo ayudar hoy?`,
        `¡Bienvenido! Soy tu asistente de logística. <br><br>Sincronizado con <i>${activeId}</i>. Pregúntame sobre mesas, bebidas o invitados.`
    ];
    const initialMsg = saludos[Math.floor(Math.random() * saludos.length)];
    if(container) container.innerHTML = `<div class="tpd-msg bot">${initialMsg}</div>`;
};

window.toggleTPDChat = function() {
    const chat = document.getElementById('tpd-chat-widget'); 
    const fab = document.getElementById('tpd-fab');
    if(chat.style.display === 'flex') { 
        chat.style.display = 'none'; 
        fab.style.display = 'flex'; 
    } else { 
        chat.style.display = 'flex'; 
        fab.style.display = 'none'; 
        document.getElementById('tpd-chat-input').focus(); 
    }
};

window.sendTPDChat = function() {
    const input = document.getElementById('tpd-chat-input'); 
    const text = input.value.trim().toLowerCase(); 
    if(!text) return;
    
    const container = document.getElementById('tpd-chat-messages'); 
    container.innerHTML += `<div class="tpd-msg user">${input.value.trim()}</div>`; 
    input.value = ''; 
    container.scrollTop = container.scrollHeight;
    
    const loadingId = 'loading-' + Date.now(); 
    container.innerHTML += `<div id="${loadingId}" class="tpd-msg bot"><i class="fa-solid fa-spinner fa-spin"></i> Pensando...</div>`; 
    container.scrollTop = container.scrollHeight;

    setTimeout(() => {
        document.getElementById(loadingId).remove();
        
        let cAdu = 0, cNin = 0, sinMesa = 0, declinados = 0, totalPases = 0, pendientes = 0;
        window.state.invitados.forEach(g => {
            let ads = parseInt(g.adultos !== undefined ? g.adultos : g.pases) || 0; 
            let nns = parseInt(g.ninos) || 0; 
            let tot = ads + nns;
            totalPases += tot;
            if (g.status === 'Confirmado') { 
                cAdu += ads; cNin += nns; 
                if(g.mesa === 0) sinMesa += tot; 
            } else if (g.status === 'Declinado') { 
                declinados += tot; 
            } else if (g.status === 'Pendiente') { 
                pendientes += tot; 
            }
        });

        const totalConfirmados = cAdu + cNin;
        let reply = "";

        if (/resumen|estatus|como vamos|cuantos|total|estadistica/.test(text)) {
            reply = `📊 <b>Total en catálogo:</b> ${totalPases} pases.<br>✅ <b>Confirmados:</b> ${totalConfirmados} (${cAdu}A, ${cNin}N).<br>⏳ <b>Pendientes:</b> ${pendientes} pases.<br>❌ <b>Declinados:</b> ${declinados}.`;
        } 
        else if (/bebida|alcohol|pisto|chelas|cerveza|vino|botella|hielo|refresco|chupe/.test(text)) {
            if(cAdu === 0) { 
                reply = "Aún no tienes adultos confirmados para calcular la bebida."; 
            } else { 
                reply = `🍾 <b>Barra (${cAdu} Adultos):</b><br>• Destilados: <b>${Math.ceil(cAdu / 3)} bots</b>.<br>• Cervezas: <b>${Math.ceil(cAdu * 3)} pz</b>.<br>• Refresco: <b>${Math.ceil(((cAdu * 1) + (cNin * 0.5)) * 1.15)} L</b>.<br>• Hielo: <b>${Math.ceil(cAdu * 1)} kg</b>.`; 
            }
        }
        else if (/mesa|silla|acomodo|lugar|sentar|espacio/.test(text)) {
            let capacidad = window.state.mesas.length * (parseInt(window.state.config.capacidadMesa)||10);
            reply = `Tienes ${window.state.mesas.length} mesas (Capacidad: <b>${capacidad} personas</b>). Tienes <b>${totalConfirmados} confirmados</b>.`;
        }
        else if (/presupuesto|dinero|gasto|pagado|deuda|cobro|costo/.test(text)) {
            let stTotal = window.state.presupuesto.reduce((sum, item) => sum + item.costo, 0);
            let stPaid = window.state.presupuesto.reduce((sum, item) => sum + item.pagado, 0);
            reply = `💰 <b>Resumen Financiero:</b><br>• Tu evento costará aprox: <b>$${stTotal.toLocaleString('en-US')}</b><br>• Has pagado: <b>$${stPaid.toLocaleString('en-US')}</b><br>• Tienes una deuda de: <b>$${(stTotal - stPaid).toLocaleString('en-US')}</b>`;
        }
        else {
            const palabras = text.split(" ").filter(p => p.length > 2);
            let invitadoEncontrado = null;
            for (let g of window.state.invitados) {
                const nombreLower = g.nombre.toLowerCase();
                if (palabras.some(palabra => nombreLower.includes(palabra))) { invitadoEncontrado = g; break; }
            }
            if (invitadoEncontrado) {
                let mesaTexto = invitadoEncontrado.mesa === 0 ? "⚠️ Sin mesa asignada." : `✅ Mesa ${window.state.mesas.find(m=>m.id===invitadoEncontrado.mesa)?.nombre || invitadoEncontrado.mesa}.`;
                reply = `¡Encontré a <b>${invitadoEncontrado.nombre}</b>!<br>• Estatus: ${invitadoEncontrado.status}<br>• Pases: ${(invitadoEncontrado.adultos||invitadoEncontrado.pases||0)}A, ${invitadoEncontrado.ninos||0}N<br>• Grupo: ${invitadoEncontrado.grupo}<br>${mesaTexto}`;
            } else {
                reply = "Mmm... No estoy seguro de entender eso. Intenta pedirme calcular <b>bebidas</b>, ver <b>mesas</b>, buscar a alguien o <b>presupuesto</b>.";
            }
        }
        container.innerHTML += `<div class="tpd-msg bot">${reply}</div>`; 
        container.scrollTop = container.scrollHeight;
    }, 800);
};