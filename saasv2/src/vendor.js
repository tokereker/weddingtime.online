// src/vendor.js
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './auth.js';

let unsubscribeVendor = null;

// Función para el botón del Login
window.ingresarAlPanel = function() {
    const inputId = document.getElementById('input-event-id').value.trim().toLowerCase();
    if (inputId) {
        // Redirige a la misma página pero agregando el ID en la URL
        window.location.href = `proveedores.html?id=${inputId}`;
    } else {
        alert("Por favor, ingresa el ID del evento.");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        // Mostrar Login, ocultar Dashboard
        document.getElementById('view-login').classList.remove('hidden');
        document.getElementById('view-login').classList.add('flex');
        document.getElementById('view-dashboard').classList.add('hidden');
        document.getElementById('view-dashboard').classList.remove('flex');
    } else {
        // Mostrar Dashboard, ocultar Login
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-login').classList.remove('flex');
        document.getElementById('view-dashboard').classList.remove('hidden');
        document.getElementById('view-dashboard').classList.add('flex');
        
        document.getElementById('vendor-event-name').innerText = `Evento: ${eventId.toUpperCase()}`;
        iniciarEscuchaProveedor(eventId);
    }
});

function iniciarEscuchaProveedor(eventId) {
    if (unsubscribeVendor) unsubscribeVendor();
    
    const docRef = doc(db, 'artifacts', 'weddingflow', 'users', eventId);
    
    unsubscribeVendor = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            renderDashboardProveedor(data);
        } else {
            document.getElementById('vendor-event-name').innerText = "❌ Evento no encontrado";
            document.getElementById('v-adultos').innerText = "0";
            document.getElementById('v-ninos').innerText = "0";
            document.getElementById('v-alergias-list').innerHTML = '<p class="text-red-400 italic text-sm text-center py-4">Verifica que el ID sea correcto.</p>';
            document.getElementById('v-mesas-list').innerHTML = '';
        }
    }, (error) => {
        console.error("Error al conectar con la base de datos:", error);
    });
}

function renderDashboardProveedor(data) {
    const invitados = data.invitados || [];
    const mesas = data.mesas || [];
    
    let totalAdultos = 0;
    let totalNinos = 0;
    let listaAlergiasHTML = '';

    invitados.forEach(inv => {
        if (inv.status === "Confirmado") {
            totalAdultos += parseInt(inv.adultos) || 0;
            totalNinos += parseInt(inv.ninos) || 0;
            
            if (inv.observaciones && inv.observaciones.trim() !== '') {
                const nombreMesa = mesas.find(m => m.id == inv.mesa)?.nombre || "Sin Asignar";
                listaAlergiasHTML += `
                    <div class="border-b border-slate-800 py-3 last:border-0">
                        <p class="text-sm font-bold text-white">${inv.nombre} <span class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded ml-2">${nombreMesa}</span></p>
                        <p class="text-xs text-amber-400 mt-1"><i class="fa-solid fa-arrow-right text-[10px] mr-1"></i> ${inv.observaciones}</p>
                    </div>
                `;
            }
        }
    });

    document.getElementById('v-adultos').innerText = totalAdultos;
    document.getElementById('v-ninos').innerText = totalNinos;

    const contAlergias = document.getElementById('v-alergias-list');
    if (listaAlergiasHTML === '') {
        contAlergias.innerHTML = '<p class="text-slate-500 italic text-sm text-center py-4">Sin notas especiales ni alergias registradas.</p>';
    } else {
        contAlergias.innerHTML = listaAlergiasHTML;
    }

    const contMesas = document.getElementById('v-mesas-list');
    let mesasHTML = '';
    mesas.forEach(mesa => {
        let aduEnMesa = 0;
        let ninEnMesa = 0;
        invitados.filter(i => i.mesa == mesa.id && i.status === "Confirmado").forEach(i => {
            aduEnMesa += parseInt(i.adultos) || 0;
            ninEnMesa += parseInt(i.ninos) || 0;
        });

        if (aduEnMesa > 0 || ninEnMesa > 0) {
            mesasHTML += `
                <div class="bg-slate-900 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                    <span class="font-bold text-sm text-white">${mesa.nombre}</span>
                    <div class="text-xs font-bold text-slate-400">
                        <span class="text-blue-400 mr-2"><i class="fa-solid fa-user"></i> ${aduEnMesa}</span>
                        <span class="text-emerald-400"><i class="fa-solid fa-child"></i> ${ninEnMesa}</span>
                    </div>
                </div>
            `;
        }
    });
    
    contMesas.innerHTML = mesasHTML === '' ? '<p class="text-xs text-slate-500 text-center py-2">Mesas vacías</p>' : mesasHTML;
}