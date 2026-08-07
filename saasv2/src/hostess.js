// src/hostess.js
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './auth.js';

window.promptHostessLogin = async function() {
    const { value: eventId } = await Swal.fire({ title: 'Recepción Hostess', input: 'text', inputLabel: 'ID del Evento', inputPlaceholder: 'Ej: boda_carlos', showCancelButton: true, confirmButtonColor: '#3b82f6' });
    if (eventId) { 
        window.loadHostessView(eventId.toLowerCase().trim()); 
    } else {
        if (window.currentRole === 'Administrador' || window.currentRole === 'Staff' || window.currentRole === 'Soporte') { 
            window.appExitImpersonation(); 
        } else { 
            window.appLogout(); 
        }
    }
};

window.hostessSmartExit = function() {
    if (window.impersonatingId && window.currentRole !== 'Hostess') {
         document.getElementById('view-hostess').classList.add('hidden'); 
         document.getElementById('view-hostess').classList.remove('flex'); 
         window.appExitImpersonation();
    } else { window.appLogout(); }
};

window.hostessRenderLiveStats = function() {
    let totalEsperados = 0; let totalIngresados = 0; let extras = window.state.config.extras || 0; let deuda = window.state.config.totalExtrasCost || 0;
    const container = document.getElementById('hostess-live-list-container'); if(container) container.innerHTML = '';

    window.state.invitados.forEach(g => {
        let ads = parseInt(g.adultos !== undefined ? g.adultos : g.pases) || 0; let nns = parseInt(g.ninos) || 0;
        let ingA = parseInt(g.ingresadosA) || 0; let ingN = parseInt(g.ingresadosN) || 0;
        let tot = ads + nns; let ingTot = ingA + ingN;
        totalEsperados += tot; totalIngresados += ingTot;

        if(container && tot > 0) {
            let semaforoBg = 'bg-red-50 border-red-200'; let semaforoTx = 'text-red-700'; let semaforoIc = 'fa-times-circle';
            if (ingTot === tot) { semaforoBg = 'bg-emerald-50 border-emerald-200'; semaforoTx = 'text-emerald-700'; semaforoIc = 'fa-check-circle'; }
            else if (ingTot > 0) { semaforoBg = 'bg-amber-50 border-amber-200'; semaforoTx = 'text-amber-700'; semaforoIc = 'fa-exclamation-circle'; }

            const div = document.createElement('div'); div.className = `p-3 rounded-xl border ${semaforoBg} shadow-sm flex justify-between items-center`;
            div.innerHTML = `<div><p class="font-bold text-sm text-slate-800">${g.nombre}</p><p class="text-[10px] font-bold text-slate-500 mt-0.5">Grupo: ${g.grupo || '-'}</p></div><div class="text-right"><p class="font-black text-lg ${semaforoTx}"><i class="fa-solid ${semaforoIc} text-sm mr-1"></i> ${ingTot}/${tot}</p><button onclick="window.processHostessAccess(${g.id})" class="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded shadow-sm text-slate-600 font-bold hover:bg-blue-50 hover:text-blue-600 mt-1 transition">Ver / Editar</button></div>`;
            container.appendChild(div);
        }
    });
    
    let totalGeneral = totalIngresados + extras;
    document.getElementById('h-total-esperados').innerText = totalEsperados; document.getElementById('h-total-ingresados').innerText = totalIngresados; 
    document.getElementById('h-total-extras').innerText = extras; document.getElementById('h-total-general').innerText = totalGeneral;
    
    const deudaBadge = document.getElementById('h-deuda-badge');
    if (deuda > 0) { deudaBadge.innerText = `+$${deuda.toFixed(2)}`; deudaBadge.classList.remove('hidden'); } else { deudaBadge.classList.add('hidden'); }
};

window.hostessAddExtra = function() {
    Swal.fire({
        title: 'Registrar Extras',
        html: `
            <div class="mb-4">
                <label class="text-xs font-bold text-slate-500 text-left block mb-2">Cantidad de personas extra:</label>
                <div class="flex items-center justify-center gap-3">
                    <button type="button" onclick="document.getElementById('extra-qty-input').stepDown()" class="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition text-2xl border border-slate-200">-</button>
                    <input type="number" id="extra-qty-input" class="w-24 text-center font-black text-2xl border-2 border-slate-200 rounded-xl p-2" value="1" min="1">
                    <button type="button" onclick="document.getElementById('extra-qty-input').stepUp()" class="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition text-2xl border border-slate-200">+</button>
                </div>
            </div>
            <div class="mt-6 pt-4 border-t border-slate-100">
                <label class="text-xs font-bold text-slate-500 text-left block mb-1">Costo individual ($):</label>
                <input type="number" id="extra-cost-input" class="swal2-input !m-0 !w-full text-center" placeholder="Ej. 500" min="0">
            </div>
        `,
        showCancelButton: true, confirmButtonText: 'Registrar', confirmButtonColor: '#d97706',
        preConfirm: () => {
            const qty = parseInt(document.getElementById('extra-qty-input').value) || 1; const cost = parseFloat(document.getElementById('extra-cost-input').value) || 0;
            return { qty, cost };
        }
    }).then(r => {
        if (r.isConfirmed) {
            const cantidad = r.value.qty > 0 ? r.value.qty : 1; const costoIndiv = r.value.cost;
            window.state.config.extras = (window.state.config.extras || 0) + cantidad;
            if (costoIndiv > 0) { window.state.config.totalExtrasCost = (window.state.config.totalExtrasCost || 0) + (costoIndiv * cantidad); }
            window.crmSave(); window.hostessRenderLiveStats(); window.Toast.fire({icon: 'success', title: `${cantidad} invitados extra registrados`}); 
            window.logAction(`Hostess registró ${cantidad} extra(s) en puerta.`);
        }
    });
};

window.hostessSwitchTab = function(tab) {
    ['scanner', 'list', 'croquis'].forEach(t => {
        document.getElementById(`hview-${t}`).classList.replace('flex', 'hidden');
        document.getElementById(`htab-${t}`).className = 'flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold text-slate-400 hover:text-white transition';
    });
    document.getElementById(`hview-${tab}`).classList.replace('hidden', 'flex');
    document.getElementById(`htab-${tab}`).className = 'flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold bg-blue-600 text-white shadow-md transition';
    
    if(tab === 'croquis' || tab === 'list') { if(window.html5QrcodeScanner) { try { window.html5QrcodeScanner.stop().catch(e=>{}); } catch(err){} } }
    if(tab === 'list') window.hostessRenderLiveStats();
};

window.loadHostessView = async function(eventId) {
    Swal.fire({ title: 'Buscando evento...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    try {
        const docRef = doc(db, 'artifacts', 'weddingflow', 'users', eventId); 
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
            window.impersonatingId = eventId;
            document.getElementById('view-login').classList.add('hidden'); document.getElementById('view-admin').classList.add('hidden');
            document.getElementById('view-crm').classList.add('hidden'); document.getElementById('view-hostess').classList.remove('hidden'); document.getElementById('view-hostess').classList.add('flex');
            document.getElementById('tpd-fab').style.display = 'none'; document.getElementById('tpd-chat-widget').style.display = 'none';
            
            const data = snap.data(); const tipo = data.eventType || 'Evento'; document.getElementById('hostess-event-id').innerText = `${tipo} - ${eventId}`;
            
            window.state.invitados = data.invitados || []; window.state.mesas = data.mesas || []; window.state.croquis = data.croquis || null; window.state.config = data.config || window.state.config;
            if (window.state.croquis) { document.getElementById('hostess-croquis-img').src = window.state.croquis; document.getElementById('hostess-croquis-img').classList.remove('hidden'); document.getElementById('hostess-no-croquis').classList.add('hidden'); }
            
            window.hostessSwitchTab('scanner'); window.subscribeToUser(eventId); Swal.close();
        } else {
            Swal.fire({ title: 'Error', text: 'El ID de evento no existe.', icon: 'error' }).then(() => { window.promptHostessLogin(); });
        }
    } catch(e) { Swal.fire('Error', 'Fallo de conexión.', 'error').then(() => window.appLogout()); }
};

window.startScanner = function() {
    document.getElementById('btn-start-scanner').classList.add('hidden');
    window.html5QrcodeScanner = new Html5Qrcode("reader");
    window.html5QrcodeScanner.start(
        { facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            try {
                const url = new URL(decodedText); const gId = parseInt(url.searchParams.get("id"));
                if(gId) { window.html5QrcodeScanner.stop(); document.getElementById('btn-start-scanner').classList.remove('hidden'); window.processHostessAccess(gId); }
            } catch(e) {}
        }, (err) => {}
    ).catch(err => {
        document.getElementById('btn-start-scanner').classList.remove('hidden');
        Swal.fire('Cámara Bloqueada', 'Por favor permite el acceso a la cámara.', 'warning');
    });
};

window.hostessManualSearch = function() {
    const query = document.getElementById('hostess-search').value.toLowerCase();
    const res = document.getElementById('hostess-search-results'); res.innerHTML = '';
    if(query.length < 2) return;
    window.state.invitados.filter(g => g.nombre.toLowerCase().includes(query)).forEach(g => {
        const btn = document.createElement('button'); btn.className = 'w-full bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-lg text-left text-sm font-bold flex justify-between items-center transition mb-1';
        btn.innerHTML = `<span>${g.nombre}</span> <i class="fa-solid fa-arrow-right text-blue-400"></i>`;
        btn.onclick = () => window.processHostessAccess(g.id); res.appendChild(btn);
    });
};

window.processHostessAccess = function(gId) {
    const g = window.state.invitados.find(x => x.id === gId); if(!g) return Swal.fire('Error', 'Invitado no encontrado.', 'error');
    if(navigator.vibrate) navigator.vibrate([100, 50, 100]);

    let totalA = parseInt(g.adultos !== undefined ? g.adultos : g.pases) || 0; let totalN = parseInt(g.ninos) || 0;
    let ingA = parseInt(g.ingresadosA) || 0; let ingN = parseInt(g.ingresadosN) || 0;

    window.hMaxAdu = totalA - ingA; window.hMaxNin = totalN - ingN;

    if (window.hMaxAdu <= 0 && window.hMaxNin <= 0) {
        if(navigator.vibrate) navigator.vibrate([300, 100, 300]);
        return Swal.fire({ title: '¡Acceso Denegado!', text: 'Este grupo ya utilizó todos sus pases registrados.', icon: 'error', confirmButtonColor: '#ef4444' });
    }

    window.hCurrentGuest = g; window.hAduToEnter = window.hMaxAdu > 0 ? window.hMaxAdu : 0; window.hNinToEnter = window.hMaxNin > 0 ? window.hMaxNin : 0;
    document.getElementById('hr-name').innerText = g.nombre;
    const mName = g.mesa === 0 ? "Sin Asignar" : (window.state.mesas.find(m => m.id === g.mesa)?.nombre || "Desconocida");
    document.getElementById('hr-table').innerText = mName;
    document.getElementById('hr-adu-status').innerText = `Han entrado ${ingA} de ${totalA}`; document.getElementById('hr-nin-status').innerText = `Han entrado ${ingN} de ${totalN}`;
    document.getElementById('hr-nin-row').style.display = totalN > 0 ? 'flex' : 'none';

    window.updateEntryUI();

    const modal = document.getElementById('hostess-result-modal'); const box = document.getElementById('hostess-result-box');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    setTimeout(() => { box.classList.remove('scale-95', 'opacity-0'); box.classList.add('scale-100', 'opacity-100'); }, 10);
    document.getElementById('hostess-search').value = ''; document.getElementById('hostess-search-results').innerHTML = '';
};

window.adjEntry = function(tipo, val) {
    if (tipo === 'adu') { window.hAduToEnter += val; if(window.hAduToEnter < 0) window.hAduToEnter = 0; if(window.hAduToEnter > window.hMaxAdu) window.hAduToEnter = window.hMaxAdu; } 
    else { window.hNinToEnter += val; if(window.hNinToEnter < 0) window.hNinToEnter = 0; if(window.hNinToEnter > window.hMaxNin) window.hNinToEnter = window.hMaxNin; }
    window.updateEntryUI();
};

window.updateEntryUI = function() {
    document.getElementById('hr-adu-entering').innerText = window.hAduToEnter; document.getElementById('hr-nin-entering').innerText = window.hNinToEnter;
    const btn = document.getElementById('hr-confirm-btn');
    if (window.hAduToEnter === 0 && window.hNinToEnter === 0) { btn.classList.replace('bg-blue-600', 'bg-slate-400'); btn.disabled = true; } else { btn.classList.replace('bg-slate-400', 'bg-blue-600'); btn.disabled = false; }
};

window.confirmHostessEntry = function() {
    if(!window.hCurrentGuest) return;
    window.hCurrentGuest.ingresadosA = (parseInt(window.hCurrentGuest.ingresadosA) || 0) + window.hAduToEnter; window.hCurrentGuest.ingresadosN = (parseInt(window.hCurrentGuest.ingresadosN) || 0) + window.hNinToEnter;
    window.crmSave(); window.closeHostessResult(); window.Toast.fire({icon: 'success', title: `Registrado: ${window.hAduToEnter} Adultos, ${window.hNinToEnter} Niños`}); window.hostessRenderLiveStats();
    window.logAction(`Ingreso registrado: ${window.hCurrentGuest.nombre} (${window.hAduToEnter}A, ${window.hNinToEnter}N)`);
};

window.closeHostessResult = function() {
    const modal = document.getElementById('hostess-result-modal'); const box = document.getElementById('hostess-result-box');
    box.classList.remove('scale-100', 'opacity-100'); box.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.replace('flex', 'hidden'); }, 200);
};

window.hostessExportReportPDF = function() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); const eventId = window.impersonatingId || window.currentUser || "Evento";
    
    doc.setFontSize(16); doc.setTextColor(37, 99, 235); doc.text(`Reporte de Recepcion (Hostess) - ${eventId}`, 14, 15);
    
    let totalEsperados = 0, totalIngresados = 0;
    window.state.invitados.forEach(g => {
        let ads = parseInt(g.adultos !== undefined ? g.adultos : g.pases) || 0; let nns = parseInt(g.ninos) || 0;
        let ingA = parseInt(g.ingresadosA) || 0; let ingN = parseInt(g.ingresadosN) || 0;
        if (g.status === 'Confirmado' || g.status === 'Pendiente') { totalEsperados += (ads + nns); } totalIngresados += (ingA + ingN);
    });
    
    let extras = window.state.config.extras || 0; let deuda = window.state.config.totalExtrasCost || 0; let totalGeneral = totalIngresados + extras;

    doc.setFontSize(12); doc.setTextColor(50, 50, 50); doc.text(`Resumen Numerico Final:`, 14, 25);
    doc.setFontSize(10); doc.text(`- Invitados esperados en lista: ${totalEsperados}`, 14, 32); doc.text(`- Invitados que ingresaron de la lista: ${totalIngresados}`, 14, 38);
    doc.text(`- Personas extra cobradas en puerta: ${extras}`, 14, 44); doc.text(`- TOTAL DE PERSONAS EN EL SALON: ${totalGeneral}`, 14, 50);
    if (deuda > 0) { doc.setTextColor(220, 38, 38); doc.text(`- Costo Acumulado de Extras (Deuda): $${deuda.toFixed(2)}`, 14, 56); }

    const body = [];
    window.state.invitados.forEach(g => {
        let tot = (parseInt(g.adultos !== undefined ? g.adultos : g.pases) || 0) + (parseInt(g.ninos) || 0); let ing = (parseInt(g.ingresadosA) || 0) + (parseInt(g.ingresadosN) || 0);
        if (ing > 0) { const mesaNombre = g.mesa === 0 ? "Sin Asignar" : (window.state.mesas.find(m => m.id === g.mesa)?.nombre || "Desconocida"); body.push([g.nombre, g.grupo || '-', tot, ing, mesaNombre]); }
    });

    doc.autoTable({ startY: deuda > 0 ? 65 : 60, head: [['Familia / Invitado', 'Grupo', 'Pases', 'Ingresaron', 'Mesa']], body: body, theme: 'grid', headStyles: { fillColor: [37, 99, 235] } });

    let finalY = doc.lastAutoTable.finalY || 65; if (finalY > 240) { doc.addPage(); finalY = 20; }
    doc.setFontSize(10); doc.setTextColor(50, 50, 50); doc.text("________________________________________________", 105, finalY + 40, { align: "center" });
    doc.setFontSize(9); doc.text("Firma de Conformidad (Organizador / Cliente)", 105, finalY + 45, { align: "center" });
    window.addPDFFooter(doc); doc.save(`Corte_Hostess_${eventId}.pdf`);
    window.logAction("Hostess descargó el reporte final en PDF.");
};