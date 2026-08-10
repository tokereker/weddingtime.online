// src/guest.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyCaRKtx54HYM5jXB2DgtZeLciUNB7Inqjw",
    authDomain: "wedding-crm-6853f.firebaseapp.com",
    projectId: "wedding-crm-6853f",
    storageBucket: "wedding-crm-6853f.firebasestorage.app",
    messagingSenderId: "956437103756",
    appId: "1:956437103756:web:b2d27aad4e6bfded7327a9"
};

// 2. Conexión directa
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let eventDataConfig = null;
let currentEventId = null;
let currentGuestId = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('u');
    currentGuestId = urlParams.get('id');

    if (!currentEventId) {
        document.getElementById('g-event-name').innerText = "Enlace Inválido";
        document.getElementById('g-menu-text').innerText = "No se detectó un código de evento válido en tu enlace.";
        return;
    }

    iniciarEscuchaInvitado(currentEventId);
});

function iniciarEscuchaInvitado(eventId) {
    const docRef = doc(db, 'artifacts', 'weddingflow', 'users', eventId);
    
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            eventDataConfig = data.config || {};
            
            const eventType = data.eventType || "Evento";
            let nombresFormateados = currentEventId.toUpperCase().replace('Y', ' y ');
            document.getElementById('g-event-name').innerText = `${eventType} de ${nombresFormateados}`;

            const menuText = eventDataConfig.menuText || "";
            document.getElementById('g-menu-text').innerText = menuText.trim() !== "" ? menuText : "El menú será revelado pronto.";

            if (eventDataConfig.themeColor) {
                document.getElementById('guest-header').style.backgroundColor = eventDataConfig.themeColor;
            }
        } else {
            document.getElementById('g-event-name').innerText = "Evento Finalizado";
            document.getElementById('g-menu-text').innerText = "La información de este evento ya no está disponible.";
        }
    }, (error) => {
        console.error("Error de Firebase:", error);
    });
}

window.abrirLinkDJ = function() {
    if (eventDataConfig && eventDataConfig.djLink && eventDataConfig.djLink.trim() !== '') {
        window.open(eventDataConfig.djLink, '_blank');
    } else {
        Swal.fire({
            icon: 'info', title: 'Playlist Sorpresa',
            text: 'El organizador no ha habilitado peticiones de canciones, ¡prepárate para la sorpresa del DJ!',
            confirmButtonColor: eventDataConfig?.themeColor || '#3b82f6', confirmButtonText: 'Entendido'
        });
    }
};

window.llamarMesero = async function(peticion) {
    if (!currentEventId) return;
    const { value: mesa } = await Swal.fire({
        title: 'Servicio a Mesa',
        text: `Se enviará una notificación al staff para: ${peticion}. ¿En qué mesa estás sentado?`,
        input: 'number', inputAttributes: { min: 1, step: 1 }, inputPlaceholder: 'Ej. 5',
        showCancelButton: true, confirmButtonText: 'Enviar Notificación', cancelButtonText: 'Cancelar',
        confirmButtonColor: eventDataConfig?.themeColor || '#10b981'
    });

    if (mesa) {
        Swal.fire({ icon: 'success', title: '¡Aviso Enviado!', text: `El staff ha sido notificado y se dirige a la Mesa ${mesa}.`, timer: 4000, showConfirmButton: false });
    }
};
