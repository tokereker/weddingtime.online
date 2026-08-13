// src/app.js
import './auth.js';
import './admin.js';
import './crm.js';
import './hostess.js';
import './chatbot.js';

import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './auth.js';

// Variables globales
window.unsubscribe = null;
window.currentUser = null;
window.currentRole = null;
window.currentEventType = "";
window.impersonatingId = null;
window.currentTargetGuestId = null;
window.auditLogs = [];
window.isPremiumUser = false;

window.hCurrentGuest = null;
window.hAduToEnter = 0;
window.hNinToEnter = 0;
window.hMaxAdu = 0;
window.hMaxNin = 0;

window.state = {
    invitados: [],
    mesas: [{ id: 1, nombre: "Mesa VIP" }],
    config: { capacidadMesa: 10, themeColor: '#3b82f6', extras: 0, totalExtrasCost: 0, fontFamily: 'Plus Jakarta Sans', menuText: '', djLink: '' },
    croquis: null,
    ticketBg: null,
    presupuesto: []
};

window.Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });

// Emoji picker
const picker = document.querySelector('emoji-picker');
if (picker) {
    picker.addEventListener('emoji-click', event => {
        const textarea = document.getElementById('wa-standard-msg');
        const start = textarea.selectionStart; const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + event.detail.unicode + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + event.detail.unicode.length;
        textarea.focus(); document.getElementById('emoji-picker-container').classList.add('hidden');
    });
}

// Funciones de ayuda
function getSubdomain(eventType) {
    const map = { "XV Años": "xvana", "Bautizo": "bautizo", "Primera Comunión": "comunion", "Confirmación": "confirmacion", "Primera Comunión y Confirmación": "comunion", "Cumpleaños": "cumple", "Boda": "boda" };
    return map[eventType] || "boda";
}

window.logAction = function(action) {
    const time = new Date().toLocaleString();
    window.auditLogs.unshift(`[${time}] ${action}`);
    if(window.auditLogs.length > 50) window.auditLogs.pop(); 
};

window.showAuditLog = function() {
    const list = document.getElementById('audit-list');
    if(window.auditLogs.length === 0) { list.innerHTML = '<p class="text-sm text-slate-400 italic text-center mt-10">No hay movimientos recientes registrados en esta sesión.</p>'; }
    else { list.innerHTML = window.auditLogs.map(log => `<div class="text-xs text-slate-600 border-b border-slate-200 py-2">${log}</div>`).join(''); }
    document.getElementById('audit-modal').classList.remove('hidden'); document.getElementById('audit-modal').classList.add('flex');
};

// Eventos PWA / Offline
window.addEventListener('online', () => { 
    document.body.classList.remove('offline'); 
    document.querySelectorAll('.network-status-text').forEach(el => el.innerHTML = '<i class="fa-solid fa-cloud"></i> Online (Sincronizado)');
    window.Toast.fire({icon: 'success', title: 'Conexión recuperada. Sincronizando.'});
    if(window.currentUser && window.currentRole !== 'Administrador') window.crmSave();
});

window.addEventListener('offline', () => { 
    document.body.classList.add('offline'); 
    document.querySelectorAll('.network-status-text').forEach(el => el.innerHTML = '<i class="fa-solid fa-wifi"></i> Offline (Modo Local)');
});

// UI / Themes
window.setAppStyleTheme = function(theme, guardarBaseDatos = true) {
    document.body.classList.remove('theme-midnight', 'theme-rosegold');
    if(theme === 'midnight') document.body.classList.add('theme-midnight');
    if(theme === 'rosegold') document.body.classList.add('theme-rosegold');
    
    if (guardarBaseDatos && window.state && window.state.config) {
        window.state.config.appTheme = theme;
        if(typeof window.crmSave === 'function') window.crmSave();
    }
};

window.addPDFFooter = function(docInstance) {
    const pageCount = docInstance.internal.getNumberOfPages();
    const pageWidth = docInstance.internal.pageSize.getWidth();
    const pageHeight = docInstance.internal.pageSize.getHeight();
    for (let i = 1; i <= pageCount; i++) {
        docInstance.setPage(i); docInstance.setFontSize(8); docInstance.setTextColor(150); docInstance.text("Generado por tupasedigital.online", pageWidth / 2, pageHeight - 8, { align: 'center' });
    }
};

window.togglePassword = function(id) { const el = document.getElementById(id); el.type = el.type === "password" ? "text" : "password"; };

window.generateRandomPassword = function(targetId) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
    let pass = ""; for(let i=0; i<8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    const passInput = document.getElementById(targetId); passInput.type = 'text'; passInput.value = pass;
};

// Setup Clients
window.setupClientEnvironment = function(userToLoad, dataSnapshot = null) {
    window.currentUser = userToLoad;
    document.getElementById('view-login').classList.add('hidden'); document.getElementById('view-login').classList.remove('flex');
    document.getElementById('view-admin').classList.add('hidden'); document.getElementById('view-admin').classList.remove('flex');
    document.getElementById('view-crm').classList.remove('hidden'); document.getElementById('view-crm').classList.add('flex');
    document.getElementById('tpd-fab').style.display = 'flex';
    document.getElementById('user-display').innerText = window.currentRole === 'Cliente' ? 'Organizador Pro (CRM)' : window.currentRole;
    
    if (dataSnapshot && !dataSnapshot.eventType && (!window.impersonatingId)) {
        document.getElementById('welcome-modal').classList.remove('hidden'); document.getElementById('welcome-modal').classList.add('flex');
    } else { window.subscribeToUser(userToLoad); }
    if(typeof window.crmSwitchTab === 'function') window.crmSwitchTab('guests'); Swal.close();
};

window.toggleCustomEventInput = function(selectId, inputId) {
    const select = document.getElementById(selectId); const input = document.getElementById(inputId);
    if(select.value === 'Otro') { input.classList.remove('hidden'); input.focus(); } else { input.classList.add('hidden'); input.value = ''; }
};

window.saveWelcomeEventType = async function() {
    try {
        const selectVal = document.getElementById('welcome-event-type').value; let type = selectVal;
        if(selectVal === 'Otro') { type = document.getElementById('welcome-event-custom').value.trim(); if(!type) return window.Toast.fire({icon:'warning', title:'Escribe el tipo de evento'}); }
        const activeTarget = window.impersonatingId || window.currentUser;
        const docRef = doc(db, 'artifacts', 'weddingflow', 'users', activeTarget);
        await setDoc(docRef, { eventType: type }, { merge: true });
        document.getElementById('welcome-modal').classList.replace('flex', 'hidden'); window.subscribeToUser(activeTarget);
    } catch(e) { Swal.fire('Error', 'Fallo al guardar evento', 'error'); }
};

window.subscribeToUser = function(user) {
    if (window.unsubscribe) window.unsubscribe();
    
    const searchGuests = document.getElementById('crm-search');
    if (searchGuests) searchGuests.value = ''; 
    
    const searchTables = document.getElementById('crm-tables-search');
    if (searchTables) {
        searchTables.value = ''; 
        if (typeof window.searchInTables === 'function') window.searchInTables(); 
    }

    const docRef = doc(db, 'artifacts', 'weddingflow', 'users', user);
    
    window.unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            window.state.invitados = data.invitados || []; window.state.mesas = data.mesas || window.state.mesas; window.state.config = data.config || window.state.config;
            window.state.presupuesto = data.presupuesto || []; 
            if(!window.state.config.themeColor) window.state.config.themeColor = '#3b82f6';

            const userTheme = window.state.config.appTheme || 'default';
            window.setAppStyleTheme(userTheme, false);
            const selectTheme = document.getElementById('crm-theme-style'); if(selectTheme) selectTheme.value = userTheme;
            
            if(!window.state.config.extras) window.state.config.extras = 0;
            if(window.state.config.totalExtrasCost === undefined) window.state.config.totalExtrasCost = 0;
            if(!window.state.config.fontFamily) window.state.config.fontFamily = 'Plus Jakarta Sans';
            if(!window.state.config.menuText) window.state.config.menuText = '';
            if(!window.state.config.djLink) window.state.config.djLink = '';

            window.state.croquis = data.croquis || null; window.state.ticketBg = data.ticketBg || null;
            window.isPremiumUser = data.hasPremiumLink === true; window.currentEventType = data.eventType || window.currentEventType;
            
            const tipo = window.currentEventType || 'Evento';
            document.getElementById('crm-header-id').innerText = `${tipo} - ${user}`;
            const btnMesasName = document.getElementById('btn-mesas-event-name'); if (btnMesasName) btnMesasName.innerText = `${tipo} - ${user}`;
            
            document.documentElement.style.setProperty('--primary-color', window.state.config.themeColor);
            const colorPicker = document.getElementById('crm-theme-color'); if (colorPicker) colorPicker.value = window.state.config.themeColor;
            const fontPicker = document.getElementById('crm-font-family'); if (fontPicker) fontPicker.value = window.state.config.fontFamily;
            
            const iconEl = document.getElementById('header-main-icon');
            if (iconEl) {
                iconEl.className = 'fa-solid '; const tLower = tipo.toLowerCase();
                if (tLower.includes('boda')) iconEl.classList.add('fa-ring'); else if (tLower.includes('xv') || tLower.includes('15')) iconEl.classList.add('fa-crown');
                else if (tLower.includes('comunión') || tLower.includes('confirmación') || tLower.includes('bautizo')) iconEl.classList.add('fa-dove');
                else if (tLower.includes('cumple')) iconEl.classList.add('fa-cake-candles'); else iconEl.classList.add('fa-calendar-check');
            }
            
            const premiumDesign = document.getElementById('crm-premium-design'); if (premiumDesign) premiumDesign.style.display = window.isPremiumUser ? 'flex' : 'none';
            const tabBudget = document.getElementById('tab-budget'); if (tabBudget) tabBudget.style.display = window.isPremiumUser ? 'block' : 'none';
            const waPremiumContainer = document.getElementById('wa-premium-link-container'); const waCheckbox = document.getElementById('wa-include-link');
            if (waPremiumContainer && waCheckbox) { waPremiumContainer.style.display = window.isPremiumUser ? 'flex' : 'none'; waCheckbox.checked = window.isPremiumUser; waCheckbox.disabled = !window.isPremiumUser; }
            
            const btnAppInvitado = document.getElementById('btn-app-invitado');
            if (btnAppInvitado) { btnAppInvitado.style.display = window.isPremiumUser ? 'flex' : 'none'; }

            if(typeof window.crmRenderAll === 'function') window.crmRenderAll();
            if(typeof window.initEventAssistant === 'function') window.initEventAssistant();
            if(document.getElementById('view-hostess') && !document.getElementById('view-hostess').classList.contains('hidden')) { if(typeof window.hostessRenderLiveStats === 'function') window.hostessRenderLiveStats(); }
        }
    });
};

// Demo
window.startDemoEnvironment = async function() {
    const now = new Date();
    const dia = now.getDate(); const mes = now.getMonth() + 1; const hora = now.getHours();
    const pinCalculado = (dia * mes * 100) + hora;

    const { value: pinIngresado } = await Swal.fire({
        title: 'Acceso Modo Demostración',
        html: `
            <p class="text-sm text-slate-600 mb-4">Por seguridad, solicita tu PIN de acceso a través de nuestro WhatsApp oficial.</p>
            <a href="https://wa.me/5212202662703?text=Hola,%20me%20gustar%C3%ADa%20solicitar%20el%20PIN%20de%20acceso%20para%20la%20demostraci%C3%B3n%20del%20sistema." target="_blank" class="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 px-4 rounded-xl transition mb-4 shadow-md w-full no-underline transform active:scale-95">
                <i class="fa-brands fa-whatsapp text-xl"></i> Pedir PIN por WhatsApp
            </a>
        `,
        input: 'password', 
        inputPlaceholder: 'Ingresa el PIN numérico',
        showCancelButton: true, confirmButtonColor: '#3b82f6', cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Verificar PIN', cancelButtonText: 'Cancelar'
    });

    if (!pinIngresado) return;
    const llaveUsos = `demo_uses_${pinIngresado}`;
    let intentosRealizados = parseInt(localStorage.getItem(llaveUsos) || '0');

    if (intentosRealizados >= 2) { return Swal.fire({ title: 'Demostración Finalizada', text: 'Has agotado las 2 oportunidades.', icon: 'warning' }); }

    if (parseInt(pinIngresado) === pinCalculado || pinIngresado === '7777') {
        localStorage.setItem(llaveUsos, intentosRealizados + 1);

        window.currentUser = "demo_local";
        window.currentRole = "Cliente";
        window.currentEventType = "Evento";
        window.state = { 
            invitados: [ { id: 1, nombre: "Familia Bustamante", grupo: "Familia", telefono: "2202662703", adultos: 2, ninos: 1, status: "Confirmado", mesa: 1, observaciones: "Silla alta" } ], 
            mesas: [{ id: 1, nombre: "Mesa VIP" }], 
            config: { capacidadMesa: 10, themeColor: '#3b82f6', extras: 0, totalExtrasCost: 0, fontFamily: 'Plus Jakarta Sans', menuText: '', djLink: '' }, 
            croquis: null, ticketBg: null, presupuesto: []
        };
        window.isPremiumUser = true;
        const premiumDesign = document.getElementById('crm-premium-design'); if (premiumDesign) premiumDesign.style.display = window.isPremiumUser ? 'flex' : 'none';
        const tabBudget = document.getElementById('tab-budget'); if (tabBudget) tabBudget.style.display = window.isPremiumUser ? 'block' : 'none';
        const btnAppInvitado = document.getElementById('btn-app-invitado'); if (btnAppInvitado) btnAppInvitado.style.display = window.isPremiumUser ? 'flex' : 'none';

        document.getElementById('view-login').classList.add('hidden'); document.getElementById('view-login').classList.remove('flex');
        document.getElementById('view-crm').classList.remove('hidden'); document.getElementById('view-crm').classList.add('flex');
        document.getElementById('tpd-fab').style.display = 'flex';
        document.getElementById('user-display').innerText = "Organizador Pro (DEMO)";
        document.getElementById('crm-header-id').innerText = `${window.currentEventType} -${window.currentUser}`;
        
        if(typeof window.crmRenderAll === 'function') window.crmRenderAll(); 
        if(typeof window.initEventAssistant === 'function') window.initEventAssistant(); 
        window.logAction("Inició sesión en Modo Demo Local.");
        window.Toast.fire({ icon: 'success', title: `¡Modo Demo!` });
    } else { Swal.fire({ title: 'Acceso Denegado', text: 'PIN incorrecto.', icon: 'error' }); }
};

window.mostrarPinDemo = function() {
    let usos = parseInt(localStorage.getItem('demo_pin_uses') || '0');
    const now = new Date(); const dia = now.getDate(); const mes = now.getMonth() + 1; const hora = now.getHours();
    const pinCalculado = (dia * mes * 100) + hora;
    
    usos++; localStorage.setItem('demo_pin_uses', usos.toString());
    Swal.fire({
        title: 'PIN de Demostración',
        html: `<div class="bg-blue-50 border border-blue-100 rounded-2xl py-4 mb-4"><span class="text-4xl font-black text-blue-600 tracking-widest">${pinCalculado}</span></div>`,
        icon: 'info', confirmButtonText: '<i class="fa-solid fa-copy"></i> Copiar', confirmButtonColor: '#10b981'
    }).then((res) => { if(res.isConfirmed) { navigator.clipboard.writeText(pinCalculado.toString()); window.Toast.fire({ icon: 'success', title: 'PIN copiado' }); } });
};
