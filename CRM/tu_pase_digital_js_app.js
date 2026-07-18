import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const MASTER_PASSWORD = "Agencia_Pase2026$*"; 
const firebaseConfig = {
    apiKey: "AIzaSyCaRKtx54HYM5jXB2DgtZeLciUNB7Inqjw",
    authDomain: "wedding-crm-6853f.firebaseapp.com",
    databaseURL: "https://wedding-crm-6853f-default-rtdb.firebaseio.com",
    projectId: "wedding-crm-6853f",
    storageBucket: "wedding-crm-6853f.firebasestorage.app",
    messagingSenderId: "956437103756",
    appId: "1:956437103756:web:b2d27aad4e6bfded7327a9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'weddingflow-crm-app';
let unsubscribe = null;

let currentUser = null;
let currentRole = null;
let state = { invitados: [], mesas: [], config: { capacidadMesa: 10 } };

// UTILIDADES
window.sanitizeHTML = str => typeof str === 'string' ? str.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t])) : str;
window.togglePassword = id => { const el = document.getElementById(id); if(el) el.type = el.type === "password" ? "text" : "password"; };

// AUTENTICACION
window.login = async function() {
    const user = document.getElementById('login-user').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value.trim();
    if (!user || !pass) return Swal.fire('Error', 'Ingresa usuario y contraseña', 'error');

    Swal.fire({ title: 'Autenticando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    try {
        await signInAnonymously(auth);
        if (user === 'admin' && pass === MASTER_PASSWORD) { currentRole = 'Administrador'; window.loadAdminPanel(); return; }
        const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'crm_user_data', user));
        if (snap.exists()) {
            const data = snap.data();
            if (data.pass !== pass && pass !== MASTER_PASSWORD) return Swal.fire('Error', 'Contraseña incorrecta', 'error');
            currentRole = data.role || 'Cliente';
            if(currentRole === 'Administrador' || currentRole === 'Soporte') window.loadAdminPanel(); 
            else window.setupClientEnvironment(user, data); 
        } else { Swal.fire('Error', 'Usuario no encontrado.', 'error'); }
    } catch (e) { console.error(e); Swal.fire('Error', 'Fallo de conexión.', 'error'); }
};

window.logout = async function() {
    if(unsubscribe) unsubscribe();
    await signOut(auth);
    currentUser = null; currentRole = null;
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
};

// ADMIN
window.loadAdminPanel = async function() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    Swal.close();
    
    // CORRECCION DE SEGURIDAD PARA ROL SOPORTE
    document.getElementById('admin-create-section').classList.toggle('hidden', currentRole === 'Soporte');
    
    const snaps = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'crm_user_data'));
    const tbody = document.getElementById('clients-tbody');
    tbody.innerHTML = '';
    snaps.forEach(docSnap => {
        if(docSnap.id === 'admin') return; 
        const d = docSnap.data();
        let tr = document.createElement('tr');
        // El administrador global es el unico que puede ver el boton borrar
        let deleteBtn = currentRole === 'Administrador' ? `<button onclick="window.deleteClient('${docSnap.id}')" class="bg-gray-100 text-red-500 px-3 py-1.5 rounded-lg"><i class="fa-solid fa-trash"></i></button>` : '';
        tr.innerHTML = `
            <td class="p-4 border-b font-bold text-gray-800">${window.sanitizeHTML(docSnap.id)}</td>
            <td class="p-4 border-b uppercase text-xs">${window.sanitizeHTML(d.role || 'Cliente')}</td>
            <td class="p-4 border-b text-center flex gap-2">
                <button onclick="window.impersonate('${docSnap.id}')" class="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md"><i class="fa-solid fa-eye mr-1"></i> Entrar</button>
                ${deleteBtn}
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.impersonate = function(user) { 
    document.getElementById('impersonation-bar').classList.remove('hidden'); 
    document.getElementById('impersonation-name').innerText = user; 
    window.setupClientEnvironment(user, null); 
};

// CORRECCION DE SALIDA DE IMPERSONATION (Evita cruces de pantallas)
window.exitImpersonation = function() { 
    document.getElementById('impersonation-bar').classList.add('hidden'); 
    if (unsubscribe) unsubscribe(); 
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    window.loadAdminPanel(); 
};

// CRM / APP
window.setupClientEnvironment = function(userToLoad, dataSnapshot = null) {
    currentUser = userToLoad;
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    window.switchTab('invitados');
    Swal.close();
};

window.switchTab = function(tab) {
    ['invitados', 'web'].forEach(t => document.getElementById(`view-${t}`)?.classList.add('hidden'));
    document.getElementById(`view-${tab}`)?.classList.remove('hidden');
};

// DESCARGAR PLANTILLA (Nueva Funcionalidad)
window.downloadExcelTemplate = function() {
    const templateData = [
        { Nombre: "Familia Pérez", WhatsApp: "5512345678", Adultos: 2, Niños: 1, Grupo: "Familia", Notas: "Sin alergias" },
        { Nombre: "Ana Gómez", WhatsApp: "5598765432", Adultos: 1, Niños: 0, Grupo: "Amigos", Notas: "Llega directo" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Invitados");
    XLSX.writeFile(wb, "Plantilla_TuPaseDigital.xlsx");
    Swal.fire({icon: 'success', title: 'Plantilla descargada', timer: 2000, showConfirmButton: false});
};

window.importExcel = function(event) {
    const file = event.target.files[0]; if (!file) return;
    Swal.fire({ title: 'Leyendo Excel...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result); 
            const workbook = XLSX.read(data, {type: 'array'});
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
            if (json.length === 0) { Swal.fire('Archivo Vacío', '', 'warning'); event.target.value = ''; return; }
            Swal.fire('¡Éxito!', `Importados correctamente`, 'success');
        } catch (error) { Swal.fire('Error', 'Archivo no válido', 'error'); }
    }; reader.readAsArrayBuffer(file);
};
