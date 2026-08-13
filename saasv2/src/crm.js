// src/crm.js
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './auth.js';

// 1. GUARDADO Y CARGA DE DATOS (NÚCLEO)
window.crmSave = async function() {
    try {
        const act = window.impersonatingId || window.currentUser;
        if(act === 'demo_local') return;
        const docRef = doc(db, 'artifacts', 'weddingflow', 'users', act);
        await setDoc(docRef, { 
            invitados: window.state.invitados, 
            mesas: window.state.mesas, 
            config: window.state.config, 
            croquis: window.state.croquis, 
            ticketBg: window.state.ticketBg || null, 
            presupuesto: window.state.presupuesto 
        }, { merge: true });
    } catch(e) { 
        console.error('Fallo crmSave', e); 
        window.Toast.fire({icon: 'error', title: 'Aviso: Guardado local (Offline)'}); 
    }
};

window.crmRenderAll = function() { 
    window.crmRenderGuests(); 
    window.crmRenderTables(); 
    window.crmRenderStats(); 
    window.crmRenderBudget(); 
};

window.crmLoadData = async function() { 
    const btn = document.activeElement; if(btn) btn.blur(); 
    document.getElementById('crm-search').value = ''; 
    Swal.fire({ title: 'Sincronizando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    try {
        const act = window.impersonatingId || window.currentUser;
        if(act === 'demo_local') { Swal.close(); return window.Toast.fire({icon: 'success', title:'Todo OK en local'}); }
        const snap = await getDoc(doc(db, 'artifacts', 'weddingflow', 'users', act));
        if(snap.exists()) {
            const data = snap.data();
            window.state.invitados = data.invitados || []; 
            window.state.mesas = data.mesas || window.state.mesas; 
            window.state.config = data.config || window.state.config; 
            window.state.croquis = data.croquis || null; 
            window.state.ticketBg = data.ticketBg || null; 
            window.state.presupuesto = data.presupuesto || []; 
            window.isPremiumUser = data.hasPremiumLink === true;
            window.crmRenderAll(); 
            Swal.close(); 
            window.Toast.fire({icon:'success', title:'Base de datos sincronizada'}); 
            window.logAction("Sincronización forzada con la nube completada.");
        } else { 
            Swal.close(); 
            window.Toast.fire({icon:'error', title:'Error al sincronizar'}); 
        }
    } catch(e) { Swal.fire('Error', 'Fallo al sincronizar', 'error'); }
};

window.crmUpdateConfig = function(k, v) { 
    if(['capacidadMesa', 'capacity', 'eventDuration', 'flowersPerTable'].includes(k)) { 
        window.state.config[k] = parseInt(v) || 0; 
    } else { 
        window.state.config[k] = v; 
    }
    window.crmSave(); 
    if(k === 'capacity' || k === 'capacidadMesa') window.crmRenderTables(); 
    if(['eventStartTime', 'eventDuration', 'musicMain', 'musicDinner', 'musicTorna', 'flowersPerTable'].includes(k)) window.crmRenderStats(); 
};

window.crmSwitchTab = function(tab) {
    const searchGuests = document.getElementById('crm-search');
    if (searchGuests && searchGuests.value !== '') {
        searchGuests.value = ''; 
        if (typeof window.crmRenderGuests === 'function') window.crmRenderGuests(); 
    }
    
    const searchTables = document.getElementById('crm-tables-search');
    if (searchTables && searchTables.value !== '') {
        searchTables.value = ''; 
        if (typeof window.searchInTables === 'function') window.searchInTables(); 
    }
    
    ['guests', 'tables', 'stats', 'budget'].forEach(t => {
        const sec = document.getElementById(`crm-sec-${t}`); 
        if(sec) { sec.classList.remove('flex'); sec.classList.add('hidden'); }
        const tabBtn = document.getElementById(`tab-${t}`);
        if(tabBtn) { tabBtn.classList.replace('text-blue-600', 'text-slate-500'); tabBtn.classList.replace('border-blue-600', 'border-transparent'); }
    });
    const activeSec = document.getElementById(`crm-sec-${tab}`); 
    if(activeSec) { activeSec.classList.remove('hidden'); activeSec.classList.add('flex'); }
    const activeTabBtn = document.getElementById(`tab-${tab}`);
    if(activeTabBtn) { activeTabBtn.classList.replace('text-slate-500', 'text-blue-600'); activeTabBtn.classList.replace('border-transparent', 'border-blue-600'); }
    
    if(tab === 'tables') window.crmRenderTables(); 
    if(tab === 'stats') window.crmRenderStats(); 
    if(tab === 'budget') window.crmRenderBudget();
};

// 2. MÓDULO DE INVITADOS
window.openAddGuestModal = function() {
    const mesaSelect = document.getElementById('modal-guest-mesa');
    mesaSelect.innerHTML = '<option value="0">Sin Asignar</option>' + window.state.mesas.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('');
    document.getElementById('modal-guest-name').value = ''; 
    document.getElementById('modal-guest-phone').value = ''; 
    document.getElementById('modal-guest-ads').value = '1'; 
    document.getElementById('modal-guest-kids').value = '0'; 
    document.getElementById('modal-guest-obs').value = '';
    document.getElementById('add-guest-modal').classList.remove('hidden'); 
    document.getElementById('add-guest-modal').classList.add('flex');
    setTimeout(()=>document.getElementById('modal-guest-name').focus(), 100);
};

window.saveModalGuest = function() {
    const name = document.getElementById('modal-guest-name').value.trim(); 
    const group = document.getElementById('modal-guest-group').value;
    const phone = document.getElementById('modal-guest-phone').value.trim(); 
    const pasesA = parseInt(document.getElementById('modal-guest-ads').value) || 1;
    const pasesN = parseInt(document.getElementById('modal-guest-kids').value) || 0; 
    const status = document.getElementById('modal-guest-status').value;
    const mesa = parseInt(document.getElementById('modal-guest-mesa').value) || 0; 
    const obs = document.getElementById('modal-guest-obs').value.trim();

    if (!name) return window.Toast.fire({icon: 'warning', title: 'El nombre es obligatorio'});
    window.state.invitados.push({ id: Date.now(), nombre: name, grupo: group, telefono: phone, adultos: pasesA, pases: pasesA, ninos: pasesN, status: status, mesa: mesa, observaciones: obs });
    document.getElementById('add-guest-modal').classList.replace('flex', 'hidden'); 
    window.crmSave(); 
    window.crmRenderAll(); 
    window.Toast.fire({ icon: 'success', title: 'Invitado Guardado' });
    window.logAction(`Agregó un nuevo invitado manualmente: ${name}`);
};

window.crmRenderGuests = function() {
    const tbody = document.getElementById('crm-guests-tbody'); if(!tbody) return;
    const term = document.getElementById('crm-search').value.toLowerCase(); tbody.innerHTML = '';
    const optionsGrupo = ["Familia", "Amigos", "Trabajo", "Conocidos", "Otros"];

    window.state.invitados.filter(g => g.nombre.toLowerCase().includes(term)).forEach(g => {
        const tr = document.createElement('tr'); tr.className = 'hover:bg-slate-50 transition border-b border-slate-50';
        let stColor = g.status === 'Confirmado' ? 'text-emerald-700 bg-emerald-100 border-emerald-200' : (g.status === 'Declinado' ? 'text-red-700 bg-red-100 border-red-200' : 'text-amber-700 bg-amber-100 border-amber-200');
        let ads = parseInt(g.adultos !== undefined ? g.adultos : g.pases) || 0; let nns = parseInt(g.ninos) || 0;

        tr.innerHTML = `
            <td class="p-4 text-center w-12"><input type="checkbox" class="g-cb w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" value="${g.id}"></td>
            <td class="p-4"><div class="flex items-center gap-2 font-bold text-slate-800">${g.nombre} <button onclick="window.editGuestName(${g.id})" class="text-slate-400 hover:text-blue-600 transition"><i class="fa-solid fa-pencil text-xs"></i></button></div></td>
            <td class="p-4"><select onchange="window.crmUpdateGuest(${g.id}, 'grupo', this.value)" class="border border-slate-200 p-1.5 text-xs rounded-lg w-28 outline-none text-slate-700 bg-white cursor-pointer font-bold focus:border-blue-500 transition">${optionsGrupo.map(opt => `<option value="${opt}" ${g.grupo===opt?'selected':''}>${opt}</option>`).join('')}</select></td>
            <td class="p-4"><input type="text" value="${g.telefono || ''}" onchange="window.crmUpdateGuest(${g.id}, 'telefono', this.value)" placeholder="10 Digitos" class="border border-slate-200 p-1.5 text-xs rounded-lg w-28 outline-none focus:border-blue-500 transition"></td>
            <td class="p-4 text-center"><div class="inline-flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden"><button onclick="window.crmUpdateGuest(${g.id}, 'adultos', ${ads - 1})" class="px-2 py-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200 font-bold transition">-</button><input type="number" min="0" value="${ads}" onchange="window.crmUpdateGuest(${g.id}, 'adultos', this.value)" class="w-10 text-center font-bold bg-transparent outline-none p-0 m-0 text-xs text-slate-700"><button onclick="window.crmUpdateGuest(${g.id}, 'adultos', ${ads + 1})" class="px-2 py-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200 font-bold transition">+</button></div></td>
            <td class="p-4 text-center"><div class="inline-flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden"><button onclick="window.crmUpdateGuest(${g.id}, 'ninos', ${nns - 1})" class="px-2 py-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200 font-bold transition">-</button><input type="number" min="0" value="${nns}" onchange="window.crmUpdateGuest(${g.id}, 'ninos', this.value)" class="w-10 text-center font-bold bg-transparent outline-none p-0 m-0 text-xs text-slate-700"><button onclick="window.crmUpdateGuest(${g.id}, 'ninos', ${nns + 1})" class="px-2 py-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200 font-bold transition">+</button></div></td>
            <td class="p-4 text-center"><select onchange="window.crmUpdateGuest(${g.id}, 'status', this.value)" class="border p-1.5 text-xs rounded-lg outline-none ${stColor} font-bold cursor-pointer transition"><option value="Pendiente" ${g.status==='Pendiente'?'selected':''}>⏳ Pendiente</option><option value="Confirmado" ${g.status==='Confirmado'?'selected':''}>✅ Confirmado</option><option value="Declinado" ${g.status==='Declinado'?'selected':''}>❌ Declinado</option></select></td>
            <td class="p-4"><input type="text" value="${g.observaciones || ''}" onchange="window.crmUpdateGuest(${g.id}, 'observaciones', this.value)" placeholder="Notas..." class="border border-slate-200 p-1.5 text-xs rounded-lg w-40 outline-none focus:border-blue-500 transition"></td>
            <td class="p-4 text-center"><div class="flex justify-center gap-2"><button onclick="window.showTicketVisual(${g.id})" class="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 w-8 h-8 rounded-lg shadow-sm text-sm font-bold transition flex items-center justify-center"><i class="fa-solid fa-qrcode"></i></button><button onclick="window.openLocalGeneratorModal(${g.id})" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 w-8 h-8 rounded-lg shadow-sm text-sm font-bold transition flex items-center justify-center"><i class="fa-brands fa-whatsapp text-lg"></i></button></div></td>
        `;
        tbody.appendChild(tr);
    });
};

window.crmUpdateGuest = function(id, field, value) {
    const guest = window.state.invitados.find(g => g.id === id); if (!guest) return;
    if (field === 'pases' || field === 'adultos' || field === 'ninos') { 
        value = parseInt(value) || 0; if(value < 0) value = 0; guest[field] = value; 
        if (field === 'adultos') guest.pases = value; if (field === 'pases') guest.adultos = value; 
    } else { guest[field] = value; }
    window.crmRenderGuests(); window.crmSave();
    window.logAction(`Actualizó un campo de ${guest.nombre}`);
};

window.editGuestName = function(id) {
    const guest = window.state.invitados.find(g => g.id === id); if (!guest) return;
    Swal.fire({ title: 'Editar Nombre', input: 'text', inputValue: guest.nombre, showCancelButton: true, confirmButtonColor: '#3b82f6', cancelButtonText: 'Cancelar', confirmButtonText: 'Actualizar' }).then((result) => {
        if (result.isConfirmed && result.value.trim() !== '') { 
            guest.nombre = result.value.trim(); window.crmRenderGuests(); window.crmSave(); 
            window.Toast.fire({ icon: 'success', title: 'Nombre actualizado' }); 
            window.logAction(`Editó nombre a ${guest.nombre}`); 
        }
    });
};

window.crmDeleteSelected = function() {
    const selected = Array.from(document.querySelectorAll('.g-cb:checked')).map(cb => parseInt(cb.value));
    if (selected.length === 0) return window.Toast.fire({ icon: 'info', title: 'Selecciona al menos uno' });
    Swal.fire({ title: '¿Borrar Selección?', text: `Se borrarán ${selected.length} invitados.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' })
    .then((r) => { 
        if (r.isConfirmed) { 
            window.state.invitados = window.state.invitados.filter(g => !selected.includes(g.id)); 
            window.crmSave(); window.crmRenderAll(); 
            window.Toast.fire({ icon: 'success', title: 'Borrados' }); 
            window.logAction(`Eliminó ${selected.length} invitados.`); 
        } 
    });
};

window.crmDeleteAllGuests = function() {
    if (window.state.invitados.length === 0) return;
    Swal.fire({ title: '¡PELIGRO!', text: '¿Vaciar TODA la lista?', icon: 'error', showCancelButton: true, confirmButtonColor: '#ef4444' })
    .then((r) => { 
        if (r.isConfirmed) { 
            window.state.invitados = []; window.crmSave(); window.crmRenderAll(); 
            window.Toast.fire({ icon: 'success', title: 'Vaciada' }); 
            window.logAction(`VACIÓ toda la base de datos de invitados.`); 
        } 
    });
};

// 3. MÓDULO DE MESAS Y CROQUIS (Acomodo)
window.searchInTables = function() {
    const query = document.getElementById('crm-tables-search').value.toLowerCase().trim();
    const unassignedCards = document.querySelectorAll('#crm-unassigned-list .guest-card');
    unassignedCards.forEach(card => {
        const name = card.innerText.toLowerCase();
        if (name.includes(query)) {
            card.style.display = ''; 
        } else {
            card.style.display = 'none';
        }
    });
    const tables = document.querySelectorAll('#crm-tables-grid > div'); 
    tables.forEach(table => {
        const guestsInTable = table.querySelectorAll('.guest-card');
        guestsInTable.forEach(guest => {
            const guestName = guest.innerText.toLowerCase();
            if (guestName.includes(query)) {
                guest.style.opacity = '1';
                if (query !== '') {
                    guest.style.border = '2px solid #3b82f6'; 
                    guest.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.3)';
                } else {
                    guest.style.border = 'none'; 
                    guest.style.boxShadow = 'none';
                }
            } else {
                guest.style.opacity = query !== '' ? '0.2' : '1';
                guest.style.border = 'none';
                guest.style.boxShadow = 'none';
            }
        });
    });
};

window.assignTable = function(gId, tId) { window.state.invitados.find(g => g.id === gId).mesa = parseInt(tId); window.crmSave(); window.crmRenderTables(); };
window.addMultipleTables = function() { 
    let qty = parseInt(document.getElementById('num-tables-add').value) || 1; 
    for(let i=0; i<qty; i++) window.state.mesas.push({ id: Date.now() + i, nombre: `Mesa ${window.state.mesas.length + 1}` }); 
    window.crmSave(); window.crmRenderTables(); 
    window.Toast.fire({icon: 'success', title: `${qty} mesas agregadas`}); 
    window.logAction(`Agregó ${qty} mesas nuevas.`); 
};
window.deleteTable = function(id) { 
    window.state.mesas = window.state.mesas.filter(m => m.id !== id); 
    window.state.invitados.forEach(g => { if(g.mesa === id) g.mesa = 0; }); 
    window.crmSave(); window.crmRenderTables(); window.logAction(`Eliminó una mesa.`); 
};
window.deleteAllTables = function() { 
    if(!window.state.mesas.length) return; 
    Swal.fire({ title: '¿Borrar todas las mesas?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' }).then((r) => { 
        if(r.isConfirmed) { window.state.mesas = []; window.state.invitados.forEach(g => g.mesa = 0); window.crmSave(); window.crmRenderTables(); window.logAction(`Eliminó TODAS las mesas.`); } 
    }); 
};
window.renameTable = function(id) { 
    const m = window.state.mesas.find(x => x.id === id); 
    Swal.fire({ title: 'Renombrar Mesa', input: 'text', inputValue: m.nombre, showCancelButton: true, confirmButtonColor: '#3b82f6' }).then(r => { 
        if(r.isConfirmed && r.value) { m.nombre = r.value.trim(); window.crmSave(); window.crmRenderTables(); window.logAction(`Renombró una mesa a ${m.nombre}.`); } 
    }); 
};

window.randomizeTables = function() {
    if (!window.state.mesas.length) return Swal.fire('Atención', 'Debes crear mesas primero antes de acomodar.', 'info');
    const cap = parseInt(window.state.config.capacidadMesa) || 10; 
    let unassigned = window.state.invitados.filter(g => g.mesa === 0);
    
    unassigned.sort((a, b) => {
        if (a.grupo === b.grupo) {
            let sizeA = (parseInt(a.adultos!==undefined?a.adultos:a.pases)||0) + (parseInt(a.ninos)||0);
            let sizeB = (parseInt(b.adultos!==undefined?b.adultos:b.pases)||0) + (parseInt(b.ninos)||0);
            return sizeB - sizeA;
        }
        return a.grupo.localeCompare(b.grupo);
    });

    unassigned.forEach(g => {
        let pases = (parseInt(g.adultos !== undefined ? g.adultos : g.pases) || 0) + (parseInt(g.ninos) || 0);
        let target = window.state.mesas.find(m => {
            let guestsInTable = window.state.invitados.filter(i => i.mesa === m.id);
            let cur = guestsInTable.reduce((s,i) => s + (parseInt(i.adultos!==undefined?i.adultos:i.pases)||0) + (parseInt(i.ninos)||0), 0);
            let hasSameGroup = guestsInTable.some(i => i.grupo === g.grupo);
            return (cur + pases) <= cap && hasSameGroup;
        });

        if (!target) {
            target = window.state.mesas.find(m => {
                let cur = window.state.invitados.filter(i => i.mesa === m.id).reduce((s,i) => s + (parseInt(i.adultos!==undefined?i.adultos:i.pases)||0) + (parseInt(i.ninos)||0), 0);
                return (cur + pases) <= cap;
            });
        }
        if (target) g.mesa = target.id;
    });
    window.crmSave(); window.crmRenderTables(); 
    window.Toast.fire({icon:'success', title:'Llenado Inteligente Completado'});
    window.logAction("Ejecutó el Llenado Inteligente de Mesas.");
};

window.allowDrop = function(ev) { ev.preventDefault(); ev.currentTarget.classList.add('dragover'); };
window.leaveDrop = function(ev) { ev.currentTarget.classList.remove('dragover'); };
window.dragGuest = function(ev, id) { ev.dataTransfer.setData("text/plain", id); setTimeout(() => ev.target.classList.add('dragging'), 0); };
window.dropGuest = function(ev, tableId) { 
    ev.preventDefault(); ev.currentTarget.classList.remove('dragover'); 
    const gId = parseInt(ev.dataTransfer.getData("text/plain")); if (!gId) return; 
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging')); 
    window.state.invitados.find(g => g.id === gId).mesa = parseInt(tableId); 
    window.crmSave(); window.crmRenderTables(); 
};

// 4. CROQUIS Y RENDERIZADO DE MESAS
window.uploadCroquis = function(e) {
    const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
    reader.onload = function(ev) {
        const img = new Image();
        img.onload = function() {
            const MAX_WIDTH = 800; const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
            const canvas = document.createElement('canvas'); canvas.width = img.width * scale; canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            window.state.croquis = canvas.toDataURL('image/jpeg', 0.8); window.crmSave(); window.renderCroquisThumbnail(); window.Toast.fire({icon:'success', title:'Croquis Subido Exitosamente'});
            window.logAction("Subió un nuevo croquis de salón.");
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
};

window.renderCroquisThumbnail = function() {
    const container = document.getElementById('croquis-preview-container'); const thumb = document.getElementById('croquis-thumbnail');
    if (window.state.croquis) { thumb.src = window.state.croquis; container.classList.remove('hidden'); container.classList.add('flex'); } else { container.classList.add('hidden'); container.classList.remove('flex'); thumb.src = ''; }
};

window.deleteCroquis = function() { window.state.croquis = null; window.crmSave(); window.renderCroquisThumbnail(); window.Toast.fire({icon:'info', title:'Croquis eliminado'}); };
window.viewCroquisFull = function() { if(window.state.croquis) { Swal.fire({ imageUrl: window.state.croquis, imageAlt: 'Croquis del Salón', showConfirmButton: true, confirmButtonText: 'Cerrar', width: '90%', background: 'transparent', backdrop: `rgba(0,0,0,0.8)` }); } };

window.crmRenderTables = function() {
    window.renderCroquisThumbnail(); const cap = window.state.config.capacidadMesa || 10; document.getElementById('crm-table-cap').value = cap;
    const cont = document.getElementById('crm-tables-grid'); const unassignedList = document.getElementById('crm-unassigned-list');
    cont.innerHTML = ''; unassignedList.innerHTML = ''; let pasesSinAsignar = 0;

    window.state.invitados.filter(g => g.mesa === 0).forEach(g => {
        let ads = parseInt(g.adultos !== undefined ? g.adultos : g.pases) || 0; let nns = parseInt(g.ninos) || 0; pasesSinAsignar += (ads + nns);
        unassignedList.appendChild(createGuestCard(g, true));
    });
    document.getElementById('crm-unassigned-badge').innerText = `${pasesSinAsignar} pases`;

    window.state.mesas.forEach(mesa => {
        const mesaDiv = document.createElement('div'); mesaDiv.className = 'bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[280px] table-dropzone transition-all duration-200';
        mesaDiv.setAttribute('ondragover', 'window.allowDrop(event)'); mesaDiv.setAttribute('ondragleave', 'window.leaveDrop(event)'); mesaDiv.setAttribute('ondrop', `window.dropGuest(event, ${mesa.id})`);
        
        const guestsInTable = window.state.invitados.filter(g => g.mesa === mesa.id);
        let pasesMesa = guestsInTable.reduce((sum, g) => sum + (parseInt(g.adultos !== undefined ? g.adultos : g.pases) || 0) + (parseInt(g.ninos) || 0), 0);
        let badgeColor = pasesMesa > cap ? 'bg-red-100 text-red-700' : (pasesMesa === cap ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700');

        mesaDiv.innerHTML = `
            <div class="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center rounded-t-2xl cursor-pointer hover:bg-slate-100 transition" onclick="window.renameTable(${mesa.id})" title="Renombrar Mesa">
                <span class="font-bold text-slate-700 truncate w-2/3 flex items-center gap-2"><i class="fa-solid fa-chair text-slate-300"></i> ${mesa.nombre}</span>
                <span class="text-xs px-2.5 py-1 rounded-full font-bold ${badgeColor} shadow-sm">${pasesMesa}/${cap}</span>
            </div>
            <div class="flex-1 p-2 overflow-y-auto space-y-2 bg-slate-50/30 custom-scrollbar"></div>
            <div class="p-2 border-t border-slate-100 bg-white rounded-b-2xl flex justify-center">
                <button onclick="window.deleteTable(${mesa.id})" class="text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50 font-bold uppercase tracking-wider transition px-3 py-1.5 rounded-lg"><i class="fa-solid fa-trash-can mr-1"></i> Borrar</button>
            </div>
        `;
        const listContainer = mesaDiv.querySelector('.flex-1'); guestsInTable.forEach(g => listContainer.appendChild(createGuestCard(g, false))); cont.appendChild(mesaDiv);
    });
};

function createGuestCard(g, isUnassigned) {
    let ads = parseInt(g.adultos !== undefined ? g.adultos : g.pases) || 0; let nns = parseInt(g.ninos) || 0;
    const card = document.createElement('div'); card.className = 'guest-card bg-white p-2 rounded-xl shadow-sm border border-slate-200 text-sm flex justify-between items-center z-10 hover:border-blue-300 transition-colors';
    card.setAttribute('draggable', 'true'); card.setAttribute('ondragstart', `window.dragGuest(event, ${g.id})`); card.setAttribute('ondragend', `this.classList.remove('dragging')`);
    
    let extraHTML = isUnassigned ? `<select onchange="window.assignTable(${g.id}, this.value)" class="text-[10px] border border-slate-200 rounded-lg outline-none w-20 bg-slate-50 font-bold text-slate-600 ml-1 cursor-pointer py-1"><option value="0">Mesa...</option>${window.state.mesas.map(m => `<option value="${m.id}" ${g.mesa===m.id?'selected':''}>${m.nombre}</option>`).join('')}</select>` : `<button onclick="window.assignTable(${g.id}, 0)" class="text-slate-300 hover:text-red-500 hover:bg-red-50 transition px-2 py-1 rounded-lg" title="Quitar"><i class="fa-solid fa-times"></i></button>`;

    card.innerHTML = `<div class="flex items-center gap-2 overflow-hidden flex-1"><i class="fa-solid fa-grip-vertical text-slate-300 text-xs cursor-grab px-1 shrink-0"></i><div class="truncate"><p class="font-bold text-slate-700 text-xs truncate" title="${g.nombre}">${g.nombre}</p><div class="flex gap-1.5 mt-1">${ads > 0 ? `<span class="text-[9px] bg-blue-50 text-blue-600 px-1.5 rounded flex items-center gap-1 font-bold"><i class="fa-solid fa-user text-[8px]"></i> ${ads}</span>` : ''}${nns > 0 ? `<span class="text-[9px] bg-purple-50 text-purple-600 px-1.5 rounded flex items-center gap-1 font-bold"><i class="fa-solid fa-child text-[8px]"></i> ${nns}</span>` : ''}</div></div></div>${extraHTML}`;
    return card;
}

// 5. MÓDULO DE PRESUPUESTO
window.crmRenderBudget = function() {
    const tbody = document.getElementById('budget-tbody'); 
    if(tbody) tbody.innerHTML = '';
    const emptyState = document.getElementById('budget-empty');
    
    const menuText = document.getElementById('cfg-menu-text');
    if (menuText) menuText.value = window.state.config.menuText || '';
    
    const djLink = document.getElementById('cfg-dj-link');
    if (djLink) djLink.value = window.state.config.djLink || '';

    if(!window.state.presupuesto) window.state.presupuesto = [];
    
    let total = 0; let paid = 0;
    window.state.presupuesto.forEach(item => {
        if(!item.abonos) item.abonos = [];
        let totalAbonado = item.abonos.reduce((sum, abono) => sum + abono.monto, 0);
        if (totalAbonado === 0 && item.pagado > 0) totalAbonado = item.pagado;
        
        total += item.costo; paid += totalAbonado;
        const remaining = item.costo - totalAbonado;
        
        let badge = remaining <= 0 ? `<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold text-[10px]">Liquidado</span>` : `<span class="bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold text-[10px]">Debe $${remaining.toLocaleString('en-US')}</span>`;

        let historialHTML = item.abonos.length > 0 ? `<div class="mt-2 space-y-1">` + item.abonos.map(a => `<div class="text-[9px] text-slate-500 bg-slate-100 px-2 py-1 rounded flex justify-between"><span>${a.fecha} - ${a.metodo}</span> <span class="font-bold text-emerald-600">+$${a.monto}</span></div>`).join('') + `</div>` : '';

        const tr = document.createElement('tr'); tr.className = 'hover:bg-slate-50 transition border-b border-slate-50';
        tr.innerHTML = `
            <td class="p-4 align-top"><p class="font-bold text-slate-800 text-xs">${item.concepto}</p>${historialHTML}</td>
            <td class="p-4 text-right align-top"><p class="font-black text-slate-700">$${item.costo.toLocaleString('en-US')}</p></td>
            <td class="p-4 text-right align-top"><p class="font-black text-emerald-600">$${totalAbonado.toLocaleString('en-US')}</p></td>
            <td class="p-4 text-center align-top">${badge}</td>
            <td class="p-4 text-center flex items-center justify-center gap-2 align-top">
                <button onclick="window.addAbono(${item.id})" class="text-emerald-500 hover:text-emerald-700 transition bg-emerald-50 px-2 py-1 rounded shadow-sm text-xs font-bold" title="Abonar">+ Abono</button>
                <button onclick="window.editBudgetItem(${item.id})" class="text-slate-400 hover:text-blue-500 transition"><i class="fa-solid fa-pencil text-xs"></i></button>
                <button onclick="window.deleteBudgetItem(${item.id})" class="text-slate-400 hover:text-red-500 transition"><i class="fa-solid fa-trash-can text-xs"></i></button>
            </td>
        `;
        if(tbody) tbody.appendChild(tr);
    });

    if(window.state.presupuesto.length === 0) { 
        if(emptyState) emptyState.classList.remove('hidden'); 
    } else { 
        if(emptyState) emptyState.classList.add('hidden'); 
    }
    
    const budgetTotal = document.getElementById('budget-total');
    if(budgetTotal) budgetTotal.innerText = `$${total.toLocaleString('en-US')}`;
    
    const budgetPaid = document.getElementById('budget-paid');
    if(budgetPaid) budgetPaid.innerText = `$${paid.toLocaleString('en-US')}`;
    
    const budgetDebt = document.getElementById('budget-debt');
    if(budgetDebt) budgetDebt.innerText = `$${(total - paid).toLocaleString('en-US')}`;
};

window.addAbono = function(id) {
    const item = window.state.presupuesto.find(i => String(i.id) === String(id)); 
    if(!item) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    Swal.fire({
        title: '<h3 class="text-xl font-black text-slate-800 flex items-center justify-center gap-2 mt-2"><i class="fa-solid fa-plus text-emerald-500"></i> Registrar Abono</h3>',
        html: `
            <p class="text-xs text-slate-500 mb-4 font-bold bg-slate-100 py-2 rounded-lg">Concepto: <span class="text-slate-700">${item.concepto}</span></p>
            <div class="space-y-4 px-2 text-left">
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monto a abonar ($)</label>
                    <div class="relative">
                        <i class="fa-solid fa-dollar-sign absolute left-4 top-3.5 text-emerald-500"></i>
                        <input type="number" id="swal-abono-monto" class="w-full border-2 border-slate-200 rounded-xl p-3 pl-8 outline-none focus:border-emerald-500 transition font-medium text-sm text-slate-700 bg-slate-50 focus:bg-white text-center" min="1" placeholder="Ej. 1500">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha</label>
                        <input type="date" id="swal-abono-fecha" class="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 transition font-medium text-xs text-slate-700 bg-slate-50 focus:bg-white text-center" value="${today}">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Método</label>
                        <select id="swal-abono-metodo" class="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-500 transition font-medium text-xs text-slate-700 bg-slate-50 focus:bg-white cursor-pointer">
                            <option value="Efectivo">Efectivo</option>
                            <option value="Transferencia">Transferencia</option>
                        </select>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true, 
        confirmButtonText: '<i class="fa-solid fa-check"></i> Guardar Abono', 
        confirmButtonColor: '#10b981',
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'rounded-3xl border border-slate-100 shadow-2xl',
            confirmButton: 'rounded-xl font-bold px-5 py-2.5',
            cancelButton: 'rounded-xl font-bold px-5 py-2.5'
        },
        preConfirm: () => {
            const monto = parseFloat(document.getElementById('swal-abono-monto').value) || 0;
            const fecha = document.getElementById('swal-abono-fecha').value;
            const metodo = document.getElementById('swal-abono-metodo').value;
            if (monto <= 0) { Swal.showValidationMessage('El monto debe ser mayor a 0'); return false; }
            return { monto, fecha, metodo };
        }
    }).then(r => {
        if(r.isConfirmed) {
            if(!item.abonos) item.abonos = [];
            item.abonos.push(r.value);
            if (typeof window.crmSave === 'function') window.crmSave(); 
            if (typeof window.crmRenderBudget === 'function') window.crmRenderBudget(); 
            window.Toast.fire({icon:'success', title:'Abono registrado'}); 
            window.logAction(`Registró abono de $${r.value.monto} a ${item.concepto}`);
        }
    });
};

window.addBudgetItem = function() {
    Swal.fire({
        title: '<h3 class="text-2xl font-black text-slate-800 flex items-center justify-center gap-2 mt-2"><i class="fa-solid fa-file-invoice-dollar text-blue-500"></i> Nuevo Gasto</h3>',
        html: `
            <div class="space-y-4 text-left px-2 mt-4">
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Concepto o Proveedor</label>
                    <div class="relative">
                        <i class="fa-solid fa-pen absolute left-4 top-3.5 text-slate-400"></i>
                        <input id="swal-b-concepto" type="text" class="w-full border-2 border-slate-200 rounded-xl p-3 pl-10 outline-none focus:border-blue-500 transition font-medium text-sm text-slate-700 bg-slate-50 focus:bg-white" placeholder="Ej: DJ, Salón, Banquete...">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Total ($)</label>
                        <div class="relative">
                            <i class="fa-solid fa-dollar-sign absolute left-4 top-3.5 text-slate-400"></i>
                            <input type="number" id="swal-b-costo" class="w-full border-2 border-slate-200 rounded-xl p-3 pl-8 outline-none focus:border-blue-500 transition font-medium text-sm text-slate-700 bg-slate-50 focus:bg-white text-center" value="0" min="0">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pagado ($)</label>
                        <div class="relative">
                            <i class="fa-solid fa-hand-holding-dollar absolute left-4 top-3.5 text-emerald-500"></i>
                            <input type="number" id="swal-b-pagado" class="w-full border-2 border-slate-200 rounded-xl p-3 pl-10 outline-none focus:border-emerald-500 transition font-medium text-sm text-slate-700 bg-slate-50 focus:bg-white text-center" value="0" min="0">
                        </div>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true, 
        confirmButtonText: '<i class="fa-solid fa-check"></i> Guardar', 
        confirmButtonColor: '#3b82f6',
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#94a3b8',
        customClass: {
            popup: 'rounded-3xl border border-slate-100 shadow-2xl',
            confirmButton: 'rounded-xl font-bold px-6 py-2.5',
            cancelButton: 'rounded-xl font-bold px-6 py-2.5'
        },
        preConfirm: () => {
            const concepto = document.getElementById('swal-b-concepto').value.trim();
            const costo = parseFloat(document.getElementById('swal-b-costo').value) || 0;
            const pagado = parseFloat(document.getElementById('swal-b-pagado').value) || 0;
            if(!concepto) { Swal.showValidationMessage('Escribe el concepto del gasto'); return false; }
            return { concepto, costo, pagado };
        }
    }).then(r => {
        if(r.isConfirmed) {
            if(!window.state.presupuesto) window.state.presupuesto = [];
            window.state.presupuesto.push({ id: Date.now(), concepto: r.value.concepto, costo: r.value.costo, pagado: r.value.pagado });
            if (typeof window.crmSave === 'function') window.crmSave(); 
            if (typeof window.crmRenderBudget === 'function') window.crmRenderBudget(); 
            window.Toast.fire({icon:'success', title:'Gasto registrado'}); 
            window.logAction(`Registró un gasto: ${r.value.concepto}`);
        }
    });
};

window.editBudgetItem = function(id) {
    const item = window.state.presupuesto.find(i => String(i.id) === String(id)); 
    if(!item) return;
    
    Swal.fire({
        title: '<h3 class="text-2xl font-black text-slate-800 flex items-center justify-center gap-2 mt-2"><i class="fa-solid fa-pen text-blue-500"></i> Editar Gasto</h3>',
        html: `
            <div class="space-y-4 text-left px-2 mt-4">
                <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Concepto o Proveedor</label>
                    <div class="relative">
                        <i class="fa-solid fa-pen absolute left-4 top-3.5 text-slate-400"></i>
                        <input id="swal-b-concepto" type="text" class="w-full border-2 border-slate-200 rounded-xl p-3 pl-10 outline-none focus:border-blue-500 transition font-medium text-sm text-slate-700 bg-slate-50 focus:bg-white" value="${item.concepto}">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Total ($)</label>
                        <div class="relative">
                            <i class="fa-solid fa-dollar-sign absolute left-4 top-3.5 text-slate-400"></i>
                            <input type="number" id="swal-b-costo" class="w-full border-2 border-slate-200 rounded-xl p-3 pl-8 outline-none focus:border-blue-500 transition font-medium text-sm text-slate-700 bg-slate-50 focus:bg-white text-center" value="${item.costo}" min="0">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monto Pagado ($)</label>
                        <div class="relative">
                            <i class="fa-solid fa-hand-holding-dollar absolute left-4 top-3.5 text-emerald-500"></i>
                            <input type="number" id="swal-b-pagado" class="w-full border-2 border-slate-200 rounded-xl p-3 pl-10 outline-none focus:border-emerald-500 transition font-medium text-sm text-slate-700 bg-slate-50 focus:bg-white text-center" value="${item.pagado}" min="0">
                        </div>
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true, 
        confirmButtonText: '<i class="fa-solid fa-check"></i> Actualizar', 
        confirmButtonColor: '#3b82f6',
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#94a3b8',
        customClass: {
            popup: 'rounded-3xl border border-slate-100 shadow-2xl',
            confirmButton: 'rounded-xl font-bold px-6 py-2.5',
            cancelButton: 'rounded-xl font-bold px-6 py-2.5'
        },
        preConfirm: () => {
            const concepto = document.getElementById('swal-b-concepto').value.trim();
            const costo = parseFloat(document.getElementById('swal-b-costo').value) || 0;
            const pagado = parseFloat(document.getElementById('swal-b-pagado').value) || 0;
            if(!concepto) { Swal.showValidationMessage('Escribe el concepto'); return false; }
            return { concepto, costo, pagado };
        }
    }).then(r => {
        if(r.isConfirmed) {
            item.concepto = r.value.concepto; 
            item.costo = r.value.costo; 
            item.pagado = r.value.pagado;
            
            if (typeof window.crmSave === 'function') window.crmSave(); 
            if (typeof window.crmRenderBudget === 'function') window.crmRenderBudget(); 
            
            window.Toast.fire({icon:'success', title:'Actualizado'}); 
            window.logAction(`Actualizó un gasto: ${r.value.concepto}`);
        }
    });
};

window.deleteBudgetItem = function(id) {
    Swal.fire({ 
        title: '¿Borrar Gasto?', 
        text: "Esta acción no se puede deshacer.",
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonText: '<i class="fa-solid fa-trash-can"></i> Sí, borrar',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'rounded-3xl',
            confirmButton: 'rounded-xl font-bold px-5 py-2.5',
            cancelButton: 'rounded-xl font-bold px-5 py-2.5'
        }
    }).then(r => {
        if(r.isConfirmed) { 
            window.state.presupuesto = window.state.presupuesto.filter(i => String(i.id) !== String(id)); 
            
            if (typeof window.crmSave === 'function') window.crmSave(); 
            if (typeof window.crmRenderBudget === 'function') window.crmRenderBudget(); 
            
            window.logAction(`Borró un registro de gasto.`); 
            window.Toast.fire({icon:'success', title:'Borrado'});
        }
    });
};


// 6. ESTADÍSTICAS Y CRONOGRAMA
window.crmRenderStats = function() {
    let totalGeneral = 0, conf = 0, decl = 0, ninosTotales = 0, adultosTotales = 0, recuperados = 0;
    window.state.invitados.forEach(g => {
        let ads = parseInt(g.adultos !== undefined ? g.adultos : g.pases) || 0; let nns = parseInt(g.ninos) || 0; let tot = ads + nns; totalGeneral += tot; 
        if(g.status === 'Confirmado') { conf += tot; adultosTotales += ads; ninosTotales += nns; } 
        if(g.status === 'Declinado') { decl += tot; recuperados += tot; }
    });
    
    document.getElementById('cfg-hora').value = window.state.config.eventStartTime || "20:00"; document.getElementById('cfg-duracion').value = window.state.config.eventDuration || 5;
    document.getElementById('cfg-musica-cena').value = window.state.config.musicDinner || "Playlist"; document.getElementById('cfg-musica-baile').value = window.state.config.musicMain || "DJ";
    document.getElementById('cfg-musica-torna').value = window.state.config.musicTorna || "Ninguno"; document.getElementById('cfg-flores').value = window.state.config.flowersPerTable || 15;

    document.getElementById('st-tot').innerText = totalGeneral; document.getElementById('st-conf').innerText = conf; document.getElementById('st-decl').innerText = decl; 
    document.getElementById('st-adu').innerText = adultosTotales; document.getElementById('st-nin').innerText = ninosTotales; document.getElementById('st-recup').innerText = recuperados;
    
    const dul = Math.ceil((adultosTotales * 3.0) + (ninosTotales * 4.5));
    document.getElementById('st-dul-tot').innerText = dul; document.getElementById('st-dul-sal').innerText = Math.ceil(dul * 0.35) + ' pz'; document.getElementById('st-dul-cho').innerText = Math.ceil(dul * 0.25) + ' pz'; document.getElementById('st-dul-pos').innerText = Math.ceil(dul * 0.20) + ' pz'; document.getElementById('st-dul-gra').innerText = Math.ceil(dul * 0.20) + ' pz';
    document.getElementById('st-bot').innerText = Math.ceil(adultosTotales / 3) + ' bts'; document.getElementById('st-cer').innerText = Math.ceil(adultosTotales * 3) + ' pz'; document.getElementById('st-ref').innerText = Math.ceil(((adultosTotales * 1) + (ninosTotales * 0.5)) * 1.15) + ' L'; document.getElementById('st-hie').innerText = Math.ceil(adultosTotales * 1) + ' kg';
    document.getElementById('rec-parejas').innerText = Math.ceil((adultosTotales / 2) * 1.10) + ' pz'; document.getElementById('rec-sandalias').innerText = Math.ceil((adultosTotales * 0.5) * 1.10) + ' prs'; document.getElementById('rec-anticruda').innerText = Math.ceil(adultosTotales * 0.6) + ' pz';

    const numMesas = window.state.mesas.length; const floresMesa = parseInt(window.state.config.flowersPerTable) || 15;
    document.getElementById('st-centros').innerText = numMesas; document.getElementById('st-flores-totales').innerText = numMesas * floresMesa;

    window.generateTimeline(adultosTotales);
};

window.generateTimeline = function(adultosTotales) {
    let startTime = window.state.config.eventStartTime; if (typeof startTime !== 'string' || !startTime.includes(':')) { startTime = "20:00"; }
    let duration = parseInt(window.state.config.eventDuration) || 5; let mainMusic = window.state.config.musicMain || 'DJ'; let dinnerMusic = window.state.config.musicDinner || 'Playlist'; let tornaMusic = window.state.config.musicTorna || 'Ninguno';

    let staffCount = 3; if (mainMusic === 'Grupo Versátil' || mainMusic === 'Ambos') staffCount += 10; else if (mainMusic === 'DJ') staffCount += 2;
    if (dinnerMusic === 'Saxofón' || dinnerMusic === 'Violín') staffCount += 1; else if (dinnerMusic === 'Grupo Jazz') staffCount += 4;
    document.getElementById('st-staff-meals').innerText = staffCount;

    let snackCount = 0; if (tornaMusic !== 'Ninguno' && duration >= 5) { snackCount = Math.ceil(adultosTotales * 0.6); }
    document.getElementById('st-torna-snacks').innerText = snackCount;

    let [hours, minutes] = startTime.split(':').map(Number); let time = new Date(); time.setHours(hours, minutes, 0);
    function formatTime(d) { return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }); }
    function addMinutes(d, mins) { return new Date(d.getTime() + mins * 60000); }

    let html = "";
    const addEvent = (tStr, title, desc) => { html += `<div class="flex gap-4 items-start timeline-event"><div class="w-16 shrink-0 text-right pt-0.5"><span class="text-xs font-black text-teal-600 time-val">${tStr}</span></div><div class="w-4 h-4 rounded-full bg-teal-100 border-2 border-teal-500 shrink-0 mt-1"></div><div class="pb-4 border-l-2 border-teal-100 pl-4 -ml-2.5 flex-1 desc-val"><p class="text-sm font-bold text-slate-800">${title}</p>${desc ? `<p class="text-[10px] text-slate-500 mt-1">${desc}</p>` : ''}</div></div>`; };

    let t1 = formatTime(time); time = addMinutes(time, 45); addEvent(t1, "Recepción de Invitados", dinnerMusic !== 'Ninguno' ? `Música de fondo: ${dinnerMusic}` : '');
    t1 = formatTime(time); time = addMinutes(time, 90); addEvent(t1, "Cena / Banquete", "Tiempo sugerido de 1.5 horas.");
    t1 = formatTime(time); time = addMinutes(time, 30); addEvent(t1, "Protocolo, Brindis y Vals", "Momento emotivo central.");
    t1 = formatTime(time); let partyMinutes = (duration * 60) - 45 - 90 - 30; if (tornaMusic !== 'Ninguno' && partyMinutes > 60) { partyMinutes -= 60; }
    if (partyMinutes > 0) { time = addMinutes(time, partyMinutes); if (mainMusic === 'Grupo Versátil' || mainMusic === 'Ambos') { addEvent(t1, "Inicio de Baile", "Tandas sugeridas: 45 min Grupo Versátil / 15 min DJ."); } else { addEvent(t1, "Inicio de Baile", "Set completo de DJ."); } }
    if (tornaMusic !== 'Ninguno') { t1 = formatTime(time); time = addMinutes(time, 60); addEvent(t1, "Tornaboda / Trasnoche", `Entrada de ${tornaMusic} y apertura de snacks.`); }
    addEvent(formatTime(time), "Fin del Evento", "Desalojo del salón.");

    document.getElementById('st-timeline').innerHTML = html;
};

// 7. EXPORTACIONES E IMPORTACIONES
window.downloadExcelTemplate = function() { const ws = XLSX.utils.json_to_sheet([{"Nombre": "Familia Ejemplo (Borrar)", "Adultos": 2, "Niños": 1, "WhatsApp": "1234567890", "Grupo": "Familia"}]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Plantilla"); XLSX.writeFile(wb, `Plantilla_Invitados.xlsx`); };

window.crmExportExcel = function() {
    if(!window.state.invitados.length) return window.Toast.fire({icon:'warning', title:'Lista vacía'});
    const data = window.state.invitados.map(g => ({ "Nombre": g.nombre, "WhatsApp": g.telefono||"", "Grupo": g.grupo, "Adultos": g.adultos, "Niños": g.ninos, "Status": g.status, "Mesa": g.mesa === 0 ? "Sin Asignar" : (window.state.mesas.find(m => m.id === g.mesa)?.nombre || g.mesa) }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Invitados"); XLSX.writeFile(wb, `Lista_${window.impersonatingId||window.currentUser}.xlsx`);
    window.logAction("Exportó invitados a Excel.");
};

window.crmExportPDF = function() {
    if(!window.state.invitados.length) return window.Toast.fire({icon:'warning', title:'Lista vacía'});
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.text(`Lista de Acceso (Puerta) - ${window.impersonatingId||window.currentUser}`, 14, 15);
    const body = window.state.invitados.map(g => [g.nombre, `${g.adultos !== undefined ? g.adultos : g.pases}A, ${g.ninos}N`, g.status, g.mesa===0?'-':window.state.mesas.find(m=>m.id===g.mesa)?.nombre, '']);
    doc.autoTable({ startY: 20, head: [['Nombre', 'Pases', 'Status', 'Mesa', 'Firma']], body: body, theme: 'grid', headStyles: { fillColor: [59, 130, 246] } }); window.addPDFFooter(doc); doc.save(`Puerta_${window.impersonatingId||window.currentUser}.pdf`);
    window.logAction("Exportó Lista de Puerta a PDF.");
};

window.crmExportTablesPDF = function() {
    if(!window.state.mesas.length) return; const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.text(`Acomodo de Mesas - ${window.impersonatingId||window.currentUser}`, 14, 15); let y = 25;
    window.state.mesas.forEach(t => {
        const gt = window.state.invitados.filter(g => g.mesa === t.id); if(!gt.length) return;
        doc.setFontSize(12); doc.setTextColor(59, 130, 246); doc.text(`${t.nombre} (${gt.reduce((s,g)=>s+(g.adultos!==undefined?g.adultos:g.pases)+g.ninos,0)} pax)`, 14, y); y+=5;
        doc.autoTable({ startY: y, head: [['Invitado', 'Pases']], body: gt.map(g=>[g.nombre, `${g.adultos!==undefined?g.adultos:g.pases}A, ${g.ninos}N`]), theme: 'plain' });
        y = doc.lastAutoTable.finalY + 10; if(y>270){ doc.addPage(); y=20; }
    }); window.addPDFFooter(doc); doc.save(`Mesas_${window.impersonatingId||window.currentUser}.pdf`);
    window.logAction("Exportó Acomodo de Mesas a PDF.");
};

window.exportStatsExcel = function() {
    const stats = [
        { Categoria: "Asistencia", Item: "Lugares Totales", Valor: document.getElementById('st-tot').innerText },
        { Categoria: "Asistencia", Item: "Confirmados", Valor: document.getElementById('st-conf').innerText },
        { Categoria: "Staff / Extras", Item: "Snacks Trasnoche", Valor: document.getElementById('st-torna-snacks').innerText }
    ];
    const ws = XLSX.utils.json_to_sheet(stats); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Logistica"); XLSX.writeFile(wb, `Logistica_${window.impersonatingId||window.currentUser}.xlsx`);
};

window.exportStatsPDF = function() {
    try {
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); const eventId = window.impersonatingId || window.currentUser || "Evento";
        doc.setFontSize(16); doc.setTextColor(59, 130, 246); doc.text(`Reporte de Logistica y Proveedores - ${eventId}`, 14, 15);

        let y = 25;
        const addTable = (title, body, color) => {
            if(y > 250) { doc.addPage(); y = 20; }
            doc.setFontSize(12); doc.setTextColor(50, 50, 50); doc.text(title, 14, y);
            doc.autoTable({ startY: y + 3, head: [['Concepto', 'Cantidad / Detalle']], body: body, theme: 'grid', headStyles: { fillColor: color } });
            y = doc.lastAutoTable.finalY + 10;
        };

        addTable('Asistencia General', [
            ['Lugares Totales Esperados', document.getElementById('st-tot').innerText],
            ['Confirmados (Adultos/Niños)', `${document.getElementById('st-adu').innerText} / ${document.getElementById('st-nin').innerText}`],
            ['Declinados', document.getElementById('st-decl').innerText],
            ['Pases Recuperados (Libres)', document.getElementById('st-recup').innerText]
        ], [59, 130, 246]); 
        
        addTable('Decoracion y Flores', [
            ['Centros de Mesa Requeridos', document.getElementById('st-centros').innerText],
            ['Flores Totales Estimadas', document.getElementById('st-flores-totales').innerText]
        ], [225, 29, 72]); 
        
        window.addPDFFooter(doc); doc.save(`Logistica_${eventId}.pdf`);
    } catch(e) { console.error(e); Swal.fire('Error', 'No se pudo generar PDF', 'error'); }
};

window.crmImportExcel = function(e) {
    const f = e.target.files[0]; if(!f) return; const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = new Uint8Array(ev.target.result); const wb = XLSX.read(data, {type: 'array'});
            const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval: ""}); let count = 0;
            json.forEach((r, i) => {
                let nom = ''; let a = 0; let n = 0; let tel = ''; let grp = 'Otros';
                for (let k in r) {
                    const kl = k.toLowerCase().trim();
                    if(kl.includes('nombre') || kl.includes('invitado') || kl.includes('familia')) nom = r[k];
                    else if(kl.includes('adulto') || kl.includes('pase')) a = parseInt(r[k]) || 0;
                    else if(kl.includes('niño') || kl.includes('nino') || kl.includes('menor')) n = parseInt(r[k]) || 0;
                    else if(kl.includes('tel') || kl.includes('whats') || kl.includes('cel')) tel = String(r[k]).replace(/[^0-9]/g, '');
                    else if(kl.includes('grupo')) grp = r[k] || 'Otros';
                }
                if(nom && nom.trim() !== '' && !nom.includes('Borrar')) {
                    if(a === 0 && n === 0) a = 1;
                    window.state.invitados.push({ id: Date.now()+i, nombre: nom, adultos: a, ninos: n, mesa: 0, status: 'Pendiente', telefono: tel, grupo: grp }); count++;
                }
            });
            window.crmSave(); window.crmRenderAll(); Swal.fire('Éxito', `Importados ${count} registros`, 'success'); 
            window.logAction(`Importó ${count} invitados desde Excel.`);
        } catch(err) { Swal.fire('Error', 'Archivo no válido. Descarga la plantilla.', 'error'); }
    }; 
    reader.readAsArrayBuffer(f); e.target.value = '';
};

// 8. TICKET QR, WA Y NOTIFICACIONES
window.uploadTicketBg = function(e) {
    const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
    reader.onload = function(ev) {
        const img = new Image();
        img.onload = function() {
            const MAX_WIDTH = 600; const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
            const canvas = document.createElement('canvas'); canvas.width = img.width * scale; canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            window.state.ticketBg = canvas.toDataURL('image/jpeg', 0.85); window.crmSave(); window.Toast.fire({icon:'success', title:'Fondo del Pase guardado globalmente'});
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file); e.target.value = '';
};

window.removeTicketBg = function() {
    if(!window.state.ticketBg) return window.Toast.fire({icon:'info', title:'No hay fondo asignado'});
    window.state.ticketBg = null; window.crmSave(); window.Toast.fire({icon:'success', title:'Fondo removido. Se usará el color base.'});
};

window.downloadNativeTicket = function() {
    const { jsPDF } = window.jspdf; 
    const pdf = new jsPDF({ 
        orientation: 'portrait', unit: 'mm', format: [80, 115], 
        encryption: { userPermissions: ["print", "high-resolution-print"], ownerPassword: "SECURE_" + Math.random().toString(36).slice(-8) }
    });

    const activeColor = window.state.config.themeColor || '#3b82f6';
    if (window.isPremiumUser && window.state.ticketBg) {
        pdf.addImage(window.state.ticketBg, 'JPEG', 0, 0, 80, 109.5); pdf.setFillColor(15, 23, 42); pdf.setGState(new pdf.GState({opacity: 0.65})); pdf.rect(0, 0, 80, 109.5, 'F');
        pdf.setGState(new pdf.GState({opacity: 1.0})); pdf.setFillColor(activeColor); pdf.rect(0, 109.5, 80, 5.5, 'F');
    } else { pdf.setFillColor(activeColor); pdf.rect(0, 0, 80, 115, 'F'); }
    
    pdf.setTextColor(255, 255, 255); pdf.setFont(undefined, 'bold'); pdf.setFontSize(16); pdf.text(document.getElementById('ticket-event-name').innerText, 40, 18, { align: 'center' });
    pdf.setFontSize(10); pdf.text("Pase de Acceso Oficial", 40, 26, { align: 'center' });
    
    const qrCanvas = document.querySelector('#ticket-qrcode canvas');
    if (qrCanvas) { const qrData = qrCanvas.toDataURL("image/png"); pdf.setFillColor(255, 255, 255); pdf.rect(22, 33, 36, 36, 'F'); pdf.addImage(qrData, 'PNG', 23, 34, 34, 34); }
    
    pdf.setFontSize(14); pdf.text(document.getElementById('ticket-guest-name').innerText, 40, 78, { align: 'center' });
    pdf.setFontSize(10); pdf.text(document.getElementById('ticket-guest-passes').innerText, 40, 85, { align: 'center' });
    
    const tableText = document.getElementById('ticket-guest-table').innerText;
    pdf.setFontSize(9);
    pdf.setFillColor(255, 255, 255); pdf.setGState(new pdf.GState({opacity: 0.15})); pdf.rect(20, 88, 40, 6, 'F'); pdf.setGState(new pdf.GState({opacity: 1.0}));
    pdf.text(tableText, 40, 92.5, { align: 'center' });

    pdf.setFontSize(7); pdf.setTextColor(255, 255, 255); pdf.text("tupasedigital.online", 40, 113.5, { align: 'center' });
    pdf.save(`Pase_${document.getElementById('ticket-guest-name').innerText}.pdf`);
    window.logAction(`Descargó en PDF el pase de ${document.getElementById('ticket-guest-name').innerText}`);
};

window.sendTicketWAAntiBlock = function() {
    const newTab = window.open('about:blank', '_blank'); window.downloadNativeTicket();
    const guest = window.state.invitados.find(g => g.id === window.currentTargetGuestId);
    if (!guest || !guest.telefono) { newTab.close(); return window.Toast.fire({icon:'warning', title:'Invitado sin teléfono asignado'}); }
    
    let phone = String(guest.telefono).replace(/\D/g, '');
    if (phone.length === 10) phone = '52' + phone;

    const msg = encodeURIComponent(`¡Hola ${guest.nombre}! Aquí tienes tu Pase de Acceso Oficial. ¡Nos vemos pronto! ✨`);
    setTimeout(() => { newTab.location.href = `https://api.whatsapp.com/send?phone=${phone}&text=${msg}`; }, 600);
    window.logAction(`Envió pase PDF por WA a ${guest.nombre}`);
};

window.showTicketVisual = function(id) {
    window.currentTargetGuestId = id; const guest = window.state.invitados.find(g => g.id === id); if(!guest) return;
    const bgImageLayer = document.getElementById('ticket-bg-image'); const overlayLayer = document.getElementById('ticket-dark-overlay'); const headerBg = document.getElementById('ticket-header-bg');
    
    headerBg.style.backgroundColor = window.state.config.themeColor || '#3b82f6';
    if (window.isPremiumUser && window.state.ticketBg) {
        bgImageLayer.src = window.state.ticketBg; bgImageLayer.classList.remove('opacity-0'); bgImageLayer.classList.add('opacity-100'); overlayLayer.classList.remove('hidden');
    } else { bgImageLayer.src = ''; bgImageLayer.classList.remove('opacity-100'); bgImageLayer.classList.add('opacity-0'); overlayLayer.classList.add('hidden'); }

    document.getElementById('ticket-event-name').innerText = window.currentEventType === 'Otro' ? 'Evento Especial' : window.currentEventType;
    document.getElementById('ticket-guest-name').innerText = guest.nombre;
    
    let ads = parseInt(guest.adultos !== undefined ? guest.adultos : guest.pases) || 0; let nns = parseInt(guest.ninos) || 0;
    document.getElementById('ticket-guest-passes').innerText = `${ads + nns} Pases`;
    
    const tableName = guest.mesa === 0 ? "Sin Asignar" : (window.state.mesas.find(m => m.id === guest.mesa)?.nombre || "Mesa VIP");
    document.getElementById('ticket-guest-table').innerText = tableName;

    const qrContainer = document.getElementById('ticket-qrcode'); qrContainer.innerHTML = ''; 
    const activeTarget = window.impersonatingId || window.currentUser; 
    
    const map = { "XV Años": "xvana", "Bautizo": "bautizo", "Primera Comunión": "comunion", "Confirmación": "confirmacion", "Primera Comunión y Confirmación": "comunion", "Cumpleaños": "cumple", "Boda": "boda" };
    const subdominio = map[window.currentEventType] || "boda";
    const enlaceDinamico = `${subdominio}${activeTarget}`.replace(/\s+/g, '').toLowerCase();
    
    const hubUrl = `https://${enlaceDinamico}.tupasedigital.online/invitado.html?u=${activeTarget}&id=${guest.id}`;
    
    new QRCode(qrContainer, { text: hubUrl, width: 140, height: 140, colorDark : "#1e293b", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H });
    
    document.getElementById('ticket-modal').classList.remove('hidden'); document.getElementById('ticket-modal').classList.add('flex');
};

window.openLocalGeneratorModal = function(id) { window.currentTargetGuestId = id; document.getElementById('wa-standard-modal').classList.remove('hidden'); document.getElementById('wa-standard-modal').classList.add('flex'); window.applyLocalTemplate(); };

window.applyLocalTemplate = function() {
    try {
        if(!window.currentTargetGuestId) return; const guest = window.state.invitados.find(g => g.id === window.currentTargetGuestId); if(!guest) throw new Error("Invitado no encontrado");
        const tone = document.getElementById('local-tone-select').value; const includeLink = document.getElementById('wa-include-link').checked;
        const eventoDinamico = { "Boda": "nuestra boda", "XV Años": "los XV años", "Bautizo": "el bautizo", "Primera Comunión": "la primera comunión", "Confirmación": "la confirmación", "Cumpleaños": "el cumpleaños" }[window.currentEventType] || `nuestra celebración de ${window.currentEventType || 'evento'}`;
        
        let ads = parseInt(guest.adultos !== undefined ? guest.adultos : guest.pases) || 1; let nns = parseInt(guest.ninos) || 0;
        let txtAdultos = ads === 1 ? "*1 pase para adulto*" : `*${ads} pases para adultos*`; let txtNinos = nns === 0 ? "" : (nns === 1 ? " y *1 pase infantil*" : ` y *${nns} pases infantiles*`);
        let txtPases = `${txtAdultos}${txtNinos}`; let msg = "";

        if (guest.status === 'Declinado') { msg = `¡Hola *${guest.nombre}*! 🥺 Nos da mucha tristeza saber que no podrán acompañarnos a ${eventoDinamico}, pero agradecemos muchísimo el tiempo que tomaste para avisarnos. ¡Un abrazo enorme! ✨`; } 
        else if (guest.status === 'Pendiente') {
            if (tone === 'formal') { msg = `Estimado/a *${guest.nombre}*, esperamos que se encuentre muy bien. Le escribimos para recordarle amablemente que tenemos reservados ${txtPases} para ${eventoDinamico} 🥂. Nos encantaría saber si contaremos con su valiosa presencia. ¡Por favor, confirme su asistencia! ✨🎩`; } 
            else if (tone === 'casual') { msg = `¡Qué onda *${guest.nombre}*! 👋 Paso a recordarte que te apartamos ${txtPases} para festejar ${eventoDinamico} 🥳. ¡Ojalá sí puedas venir! Échame un mensajito para confirmar, ¿va? 😎`; } 
            else { msg = `¡Hola *${guest.nombre}*! 💖 Estamos súper emocionados por ${eventoDinamico} y queremos recordarte que tienes reservados ${txtPases} con muchísimo cariño 🥰. Como aún no tenemos tu confirmación, queríamos pedirte que nos avises. ¡Nos haría muchísima ilusión! 🎉✨`; }
        } else {
            if (tone === 'formal') { msg = `Estimado/a *${guest.nombre}*, es un honor para nosotros informarle que tiene reservados ${txtPases} para ${eventoDinamico} 🥂. Su presencia será muy especial e importante para nosotros. ¡Le esperamos con gran entusiasmo! ✨🎩`; } 
            else if (tone === 'casual') { msg = `¡Qué onda *${guest.nombre}*! 👋 Ya está todo listo y preparado. Te recordamos que tienes ${txtPases} para ${eventoDinamico} 🥳. ¡Prepárate para disfrutar muchísimo, nos vemos pronto! 😎`; } 
            else { msg = `¡Hola *${guest.nombre}*! 🎉 Estamos contando los días y nos llena de alegría saber que compartiremos este momento contigo. Te compartimos que tienes apartados ${txtPases} para ${eventoDinamico} 💖. ¡No podemos esperar para abrazarte! 🥰✨`; }
        }

        if (includeLink && guest.status !== 'Declinado') {
            const activeTarget = window.impersonatingId || window.currentUser; 
            const map = { "XV Años": "xvana", "Bautizo": "bautizo", "Primera Comunión": "comunion", "Confirmación": "confirmacion", "Primera Comunión y Confirmación": "comunion", "Cumpleaños": "cumple", "Boda": "boda" };
            const subdominio = map[window.currentEventType] || "boda";
            const enlaceDinamico = `${subdominio}${activeTarget}`.replace(/\s+/g, '').toLowerCase();
            msg += `\n\n👉 *Consulta tu Pase Digital y Ubicaciones aquí:*\nhttps://${enlaceDinamico}.tupasedigital.online/index2.html?u=${activeTarget}&id=${guest.id}`;
        }

        const msgEl = document.getElementById('wa-standard-msg'); msgEl.value = msg;
        msgEl.style.transition = 'background-color 0.3s ease'; msgEl.style.backgroundColor = '#d1fae5'; setTimeout(() => { msgEl.style.backgroundColor = ''; }, 400);
        
        document.getElementById('wa-standard-send-btn').onclick = function() {
            if(!guest.telefono) return window.Toast.fire({icon:'warning', title:'El invitado no tiene WhatsApp registrado'});
            let phone = String(guest.telefono).replace(/\D/g, '');
            if(phone.length === 10) phone = '52' + phone; 

            window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msgEl.value)}`, '_blank');
            document.getElementById('wa-standard-modal').classList.replace('flex', 'hidden');
            window.logAction(`Envió mensaje predeterminado de WA a ${guest.nombre}`);
        };
    } catch (err) { console.error(err); }
};

window.crmEnvioMasivoWA = async function() {
    const invitadosValidos = window.state.invitados.filter(g => g.telefono && g.telefono.length >= 10 && g.status !== 'Declinado');
    
    if(invitadosValidos.length === 0) return window.Toast.fire({icon: 'warning', title: 'No hay invitados con teléfono válido'});
    
    const { isConfirmed } = await Swal.fire({
        title: 'Envío Masivo',
        text: `Se enviará mensaje a ${invitadosValidos.length} invitados. Asegúrate de permitir ventanas emergentes (pop-ups).`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Iniciar Envío'
    });

    if (isConfirmed) {
        let delay = 0;
        invitadosValidos.forEach((guest) => {
            setTimeout(() => {
                let phone = String(guest.telefono).replace(/\D/g, '');
                if (phone.length === 10) phone = '52' + phone;
                let msg = encodeURIComponent(`¡Hola ${guest.nombre}! Te recordamos que tu invitación para nuestro evento está lista. Por favor confirma tu asistencia. ✨`);
                window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank');
            }, delay);
            delay += 2500; 
        });
        window.logAction(`Inició envío masivo a ${invitadosValidos.length} contactos.`);
    }
};
