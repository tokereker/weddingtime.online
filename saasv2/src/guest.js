// src/guest.js
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './auth.js';

let eventDataConfig = null;
let currentEventId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Obtenemos el parámetro 'e' de la URL (Ej: invitado.html?e=boda_carlos)
    const urlParams = new URLSearchParams(window.location.search);
    currentEventId = urlParams.get('e');

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
            
            // Actualizar Nombre del Evento (si el CRM lo tiene guardado, si no, usa el ID)
            const eventType = data.eventType || "Evento";
            document.getElementById('g-event-name').innerText = `${eventType}`;

            // Actualizar Menú
            const menuText = eventDataConfig.menuText || "";
            document.getElementById('g-menu-text').innerText = menuText.trim() !== "" ? menuText : "El menú será revelado pronto.";

            // Adaptar el color del encabezado al color elegido por el organizador en el CRM
            if (eventDataConfig.themeColor) {
                document.getElementById('guest-header').style.backgroundColor = eventDataConfig.themeColor;
            }

        } else {
            document.getElementById('g-event-name').innerText = "Evento Finalizado";
            document.getElementById('g-menu-text').innerText = "La información de este evento ya no está disponible.";
        }
    }, (error) => {
        console.error("Error al conectar:", error);
    });
}

// Abrir enlace de Spotify / Formulario
window.abrirLinkDJ = function() {
    if (eventDataConfig && eventDataConfig.djLink && eventDataConfig.djLink.trim() !== '') {
        // Asegurar que abra en una nueva pestaña
        window.open(eventDataConfig.djLink, '_blank');
    } else {
        Swal.fire({
            icon: 'info',
            title: 'Playlist Sorpresa',
            text: 'El organizador no ha habilitado peticiones de canciones, ¡prepárate para la sorpresa del DJ!',
            confirmButtonColor: eventDataConfig?.themeColor || '#3b82f6',
            confirmButtonText: 'Entendido'
        });
    }
};

// Función para interactuar con el staff (Módulo de Mesero)
window.llamarMesero = async function(peticion) {
    if (!currentEventId) return;

    // Primero le pedimos al usuario que confirme su número de mesa
    const { value: mesa } = await Swal.fire({
        title: 'Servicio a Mesa',
        text: `Se enviará una notificación al staff para: ${peticion}. ¿En qué mesa estás sentado?`,
        input: 'number',
        inputAttributes: {
            min: 1,
            step: 1
        },
        inputPlaceholder: 'Ej. 5',
        showCancelButton: true,
        confirmButtonText: 'Enviar Notificación',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: eventDataConfig?.themeColor || '#10b981'
    });

    if (mesa) {
        // Aquí simulamos el envío con una alerta de éxito. 
        // En Fase 3, aquí usaríamos addDoc() a Firestore para que suene en el Hostess App.
        Swal.fire({
            icon: 'success',
            title: '¡Aviso Enviado!',
            text: `El staff ha sido notificado y se dirige a la Mesa ${mesa}.`,
            timer: 4000,
            showConfirmButton: false
        });
    }
};
