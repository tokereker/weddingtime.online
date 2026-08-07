// src/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 1. Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCaRKtx54HYM5jXB2DgtZeLciUNB7Inqjw",
    authDomain: "wedding-crm-6853f.firebaseapp.com",
    databaseURL: "https://wedding-crm-6853f-default-rtdb.firebaseio.com",
    projectId: "wedding-crm-6853f",
    storageBucket: "wedding-crm-6853f.firebasestorage.app",
    messagingSenderId: "956437103756",
    appId: "1:956437103756:web:b2d27aad4e6bfded7327a9"
};

// 2. Inicialización de Servicios
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Variables Globales de Sesión
window.currentUser = null;
window.currentRole = null;
window.impersonatingId = null;

// 3. Lógica de Inicio de Sesión
window.appLogin = async function() {
    const userRaw = document.getElementById('login-user').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value.trim();

    if (!userRaw || !pass) return Swal.fire('Error', 'Ingresa ID y contraseña.', 'error');
    Swal.fire({ title: 'Autenticando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    let emailsToTry = [];
    if (userRaw.includes('@')) { 
        emailsToTry.push(userRaw); 
    } else {
        if (userRaw === 'admin' || userRaw === 'root') { 
            emailsToTry.push('admin@tpd.online', 'adminadmin@tpd.online'); 
        } else { 
            emailsToTry.push(`${userRaw}admin@tpd.online`, `${userRaw}@tpd.online`); 
        }
    }

    let loginSuccess = false;
    for (let email of emailsToTry) {
        try { 
            await signInWithEmailAndPassword(auth, email, pass); 
            loginSuccess = true; 
            break; 
        } catch (e) {}
    }

    if (!loginSuccess) { 
        Swal.close(); 
        return Swal.fire({ title: 'Acceso Rechazado', text: 'Las credenciales son incorrectas.', icon: 'error' }); 
    }
};

// 4. Persistencia y Manejo de Estado (Listener)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if(!window.impersonatingId) Swal.fire({ title: 'Cargando tu espacio...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
        
        let dbUserId = user.email.split('@')[0].replace(/admin$/, '');
        if(user.email === 'admin@tpd.online' || user.email === 'adminadmin@tpd.online') dbUserId = 'admin';

        try {
            const docRef = doc(db, 'artifacts', 'weddingflow', 'users', dbUserId);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'Suspendido') { 
                    await signOut(auth); 
                    Swal.close(); 
                    return Swal.fire('Acceso Suspendido', 'Tu cuenta se encuentra suspendida.', 'warning'); 
                }
                
                window.currentRole = data.role || 'Cliente';
                
                // Redirecciones según el rol
                if (window.currentRole === 'Hostess') { 
                    Swal.close(); 
                    window.promptHostessLogin(); 
                    return; 
                }
                if (window.currentRole === 'Administrador' || window.currentRole === 'Staff' || window.currentRole === 'Soporte') { 
                    await window.loadAdminPanel(); 
                } else if (window.currentRole === 'Cliente Web') { 
                    window.location.href = `estudio_diseno.html?user=${dbUserId}`; 
                } else { 
                    window.setupClientEnvironment(dbUserId, data); 
                }
            } else {
                if (dbUserId === 'admin' || dbUserId === 'root') { 
                    window.currentRole = 'Administrador'; 
                    await window.loadAdminPanel(); 
                    return; 
                }
                Swal.close(); 
                Swal.fire('Error', 'Usuario no encontrado en la base de datos.', 'error');
            }
        } catch (error) { 
            Swal.close(); 
            Swal.fire('Error', 'Fallo al leer la base de datos.', 'error'); 
        }
    }
});

// 5. Cierre de Sesión
window.appLogout = async function() {
    window.setAppStyleTheme('default', false);
    if(window.unsubscribe) window.unsubscribe();
    if(window.html5QrcodeScanner) { 
        try { window.html5QrcodeScanner.stop().catch(e=>{}); } catch(err){} 
    }
    
    await signOut(auth);
    
    window.currentUser = null; 
    window.currentRole = null; 
    window.impersonatingId = null; 
    window.auditLogs = []; 
    
    document.getElementById('login-user').value = ''; 
    document.getElementById('login-pass').value = '';
    
    // Ocultar vistas
    ['view-admin', 'view-crm', 'view-hostess', 'crm-impersonation-bar', 'welcome-modal', 'ticket-modal', 'wa-standard-modal', 'hostess-result-modal', 'audit-modal'].forEach(id => {
        const el = document.getElementById(id);
        if(el) { el.classList.add('hidden'); el.classList.remove('flex'); }
    });
    
    // Mostrar Login
    const loginView = document.getElementById('view-login');
    if (loginView) { loginView.classList.remove('hidden'); loginView.classList.add('flex'); }

    const fab = document.getElementById('tpd-fab'); 
    const chat = document.getElementById('tpd-chat-widget');
    if(fab) fab.style.display = 'none'; 
    if(chat) chat.style.display = 'none';
};