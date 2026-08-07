// src/admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { app, db } from './auth.js';

const secondaryApp = initializeApp(app.options, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

window.loadAdminPanel = async function() {
    try {
        document.getElementById('view-login').classList.add('hidden'); document.getElementById('view-crm').classList.add('hidden');
        document.getElementById('view-admin').classList.remove('hidden'); document.getElementById('view-admin').classList.add('flex');
        document.getElementById('tpd-fab').style.display = 'none'; document.getElementById('tpd-chat-widget').style.display = 'none';
        
        if(window.currentRole === 'Staff' || window.currentRole === 'Soporte') { 
            document.getElementById('admin-creator-panel').classList.add('hidden'); 
        } else { 
            document.getElementById('admin-creator-panel').classList.remove('hidden'); 
        }
        
        const colRef = collection(db, 'artifacts', 'weddingflow', 'users');
        const snaps = await getDocs(colRef);
        const tbody = document.getElementById('admin-users-tbody');
        tbody.innerHTML = '';
        
        snaps.forEach(docSnap => {
            const d = docSnap.data(); let rol = d.role || 'Cliente'; let tipoDisplay = '';

            if (rol === 'Administrador') tipoDisplay = '<span class="text-indigo-600 font-black">Admin Global</span>';
            else if (rol === 'Staff') tipoDisplay = '<span class="text-slate-500 font-bold">Staff Agencia</span>';
            else if (rol === 'Soporte') tipoDisplay = '<span class="text-slate-500 font-bold">Soporte Técnico</span>';
            else if (rol === 'Hostess') tipoDisplay = '<span class="text-blue-500 font-bold">Staff Evento</span>';
            else if (rol === 'Cliente Web') tipoDisplay = '<span class="text-purple-600 font-black">CLIENTE WEB</span>';
            else tipoDisplay = d.eventType ? `<span class="font-bold text-slate-800">${d.eventType}</span>` : '<span class="text-amber-500 font-bold">Sin evento</span>';

            let roleCol = rol === 'Cliente' ? 'Organizador Pro (CRM)' : rol;
            let bdg = d.status === 'Suspendido' ? '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold">Suspendido</span>' : '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold">Activo</span>';
            
            let btnSt = d.status === 'Suspendido' ? `<button onclick="window.adminToggleStatus('${docSnap.id}','Activo')" class="text-emerald-500 hover:text-emerald-700 px-2 text-sm transition" title="Reactivar"><i class="fa-solid fa-play"></i></button>` : `<button onclick="window.adminToggleStatus('${docSnap.id}','Suspendido')" class="text-amber-500 hover:text-amber-700 px-2 text-sm transition" title="Suspender"><i class="fa-solid fa-pause"></i></button>`;
            let deleteBtn = window.currentRole === 'Administrador' ? `<button onclick="window.deleteClient('${docSnap.id}')" class="text-red-400 hover:text-red-600 px-2 text-sm transition" title="Borrar DB"><i class="fa-solid fa-trash-can"></i></button>` : '';

            let impBtn = ''; let premiumBtn = ''; let infoAdminBtn = '';
            if (d.role === 'Cliente' || d.role === 'Cliente Web' || d.role === 'Hostess') {
                 impBtn = `<button onclick="window.impStart('${docSnap.id}', '${d.role}')" class="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1" title="Entrar al panel de este cliente"><i class="fa-solid fa-eye"></i> Supervisar</button>`;
                 if (d.role === 'Cliente') { let isPremium = d.hasPremiumLink === true; premiumBtn = `<button onclick="window.adminTogglePremium('${docSnap.id}', ${isPremium})" class="${isPremium ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-slate-400'} transition p-2 text-xl" title="💡 Premium: Web + WA + PTO+ PDF"><i class="fa-solid fa-star"></i></button>`; }
            }

            if (d.role === 'Administrador' || d.role === 'Staff' || d.role === 'Soporte') { infoAdminBtn = `<button onclick="window.adminResetPassword('${docSnap.id}')" class="text-blue-400 hover:text-blue-600 transition p-2" title="Información de Contraseña"><i class="fa-solid fa-circle-info text-lg"></i></button>`; }

            const tr = document.createElement('tr'); tr.className = 'hover:bg-slate-50 transition border-b border-slate-50';
            tr.innerHTML = `<td class="p-4 font-bold text-slate-800">${docSnap.id} <br><span class="text-[10px] text-slate-500 uppercase tracking-wider font-medium">${tipoDisplay}</span></td><td class="p-4 font-bold text-xs text-slate-500 uppercase tracking-wide">${roleCol}</td><td class="p-4 text-center">${bdg}</td><td class="p-4 flex items-center justify-end gap-2">${impBtn} ${(impBtn || premiumBtn || infoAdminBtn) ? '<div class="h-6 w-px bg-slate-200 mx-1"></div>' : ''} ${premiumBtn} ${infoAdminBtn} ${btnSt} ${deleteBtn}</td>`;
            tbody.appendChild(tr);
        });
        Swal.close();
    } catch(e) { Swal.close(); Swal.fire({ title: 'Mensaje de Firebase', html: `Error:<br><br><b style="color:#ef4444;">${e.message}</b>`, icon: 'error' }); }
};

window.adminLoadUsers = async function() { Swal.fire({ title: 'Actualizando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false }); await window.loadAdminPanel(); Toast.fire({ icon: 'success', title: 'Panel actualizado' }); };

window.adminCreateUser = async function() {
    try {
        window.setAppStyleTheme('default', false);
        const user = document.getElementById('new-user').value.trim().toLowerCase(); const pass = document.getElementById('new-pass').value.trim(); const role = document.getElementById('new-role').value;
        if(!user || !pass) return Swal.fire('Atención', 'Rellena el ID y la contraseña.', 'warning');
        
        const pseudoEmail = `${user}@tpd.online`;
        await createUserWithEmailAndPassword(secondaryAuth, pseudoEmail, pass);
        await signOut(secondaryAuth);

        const docRef = doc(db, 'artifacts', 'weddingflow', 'users', user);
        await setDoc(docRef, { role, status: 'Activo', eventType: "", invitados: [], mesas: [{id:1,nombre:"Mesa VIP"}], config: {capacidadMesa:10, themeColor: '#3b82f6', extras: 0, totalExtrasCost: 0, fontFamily: 'Plus Jakarta Sans', menuText: '', djLink: ''}, croquis: null, hasPremiumLink: false, ticketBg: null, presupuesto: [] });
        
        document.getElementById('new-user').value = ''; document.getElementById('new-pass').value = ''; Toast.fire({icon: 'success', title: 'Usuario Registrado Seguro'}); window.loadAdminPanel();
    } catch(e) { let msg = 'Fallo al crear usuario en BD'; if(e.code === 'auth/email-already-in-use') msg = 'Este ID de usuario ya existe.'; Swal.fire('Error', msg, 'error'); }
};

window.adminTogglePremium = async function(userId, currentStatus) { try { await setDoc(doc(db, 'artifacts', 'weddingflow', 'users', userId), { hasPremiumLink: !currentStatus }, { merge: true }); window.loadAdminPanel(); Toast.fire({icon: 'success', title: !currentStatus ? '✨ Premium Activado' : 'Premium Desactivado'}); } catch(e) { Toast.fire({icon: 'error', title: 'Error de BD'}); } };
window.adminResetPassword = function(userId) { Swal.fire({ title: 'Restablecer Contraseña', icon: 'info', html: 'Como usamos correos encriptados, ve a tu consola de Firebase Auth, borra el correo de este usuario y vuelve a crearlo aquí con el mismo ID.', confirmButtonColor: '#3b82f6' }); };
window.adminToggleStatus = async function(userId, newStatus) { try { await setDoc(doc(db, 'artifacts', 'weddingflow', 'users', userId), { status: newStatus }, { merge: true }); window.loadAdminPanel(); } catch(e) {} };
window.deleteClient = function(user) { Swal.fire({ title: `¿Borrar Instancia de ${user}?`, icon: 'error', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sí, borrar base de datos' }).then(async (res) => { try { if(res.isConfirmed) { await deleteDoc(doc(db, 'artifacts', 'weddingflow', 'users', user)); Toast.fire({icon:'success', title:'Borrada'}); window.loadAdminPanel(); } } catch(e) { Swal.fire('Error', 'Fallo al borrar', 'error'); } }); };

window.impStart = async function(user, userRole) {
    try {
        if (userRole === 'Hostess') {
            const { value: eventId } = await Swal.fire({ title: 'Supervisar Hostess', input: 'text', inputLabel: 'ID del Evento', inputPlaceholder: 'Ej. boda_ana', showCancelButton: true, confirmButtonColor: '#3b82f6' });
            if (eventId) { window.loadHostessView(eventId.toLowerCase().trim()); } return;
        }
        const docRef = doc(db, 'artifacts', 'weddingflow', 'users', user); const snap = await getDoc(docRef);
        if (snap.exists()) {
             const data = snap.data();
             if (data.role === 'Cliente Web') { window.location.href = `estudio_diseno.html?user=${user}`; } else {
                 window.impersonatingId = user; document.getElementById('view-admin').classList.add('hidden'); document.getElementById('view-admin').classList.remove('flex');
                 document.getElementById('crm-impersonation-bar').classList.remove('hidden'); document.getElementById('crm-impersonation-bar').classList.add('flex');
                 document.getElementById('crm-imp-name').innerText = user; window.setupClientEnvironment(user, data);
             }
        }
    } catch(e) { Swal.fire('Error', 'Fallo al suplantar', 'error'); }
};

window.appExitImpersonation = function() {
    window.impersonatingId = null; document.getElementById('crm-impersonation-bar').classList.add('hidden'); document.getElementById('crm-impersonation-bar').classList.remove('flex');
    document.getElementById('view-crm').classList.add('hidden'); document.getElementById('view-crm').classList.remove('flex');
    document.getElementById('view-hostess').classList.add('hidden'); document.getElementById('view-hostess').classList.remove('flex');
    if (window.unsubscribe) window.unsubscribe(); window.loadAdminPanel();
};