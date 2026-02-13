// Storage utilities
const storage = {
    getUsers: () => {
        const data = localStorage.getItem('barcodeUsers');
        return data ? JSON.parse(data) : {};
    },
    saveUsers: (users) => {
        localStorage.setItem('barcodeUsers', JSON.stringify(users));
    }
};

// Global state
let users = storage.getUsers();
let currentBarcode = null;
let currentUser = null;
let cameraStream = null;
let photoData = null;
let scanner = null;

// Initialize
updateUserCount();

// Navigation functions
function showView(viewId) {
    document.querySelectorAll('.home-view, #scanner-view, #profile-view, #register-view, #list-view').forEach(el => {
        el.classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
}

function showHome() {
    showView('home-view');
}

function showScanner() {
    showView('scanner-view');
    initScanner();
}

function showList() {
    showView('list-view');
    renderUsersList();
}

function closeScanner() {
    stopScanner();
    showHome();
}

function closeProfile() {
    currentUser = null;
    currentBarcode = null;
    showHome();
}

function closeRegister() {
    currentBarcode = null;
    photoData = null;
    document.getElementById('input-prenom').value = '';
    document.getElementById('input-nom').value = '';
    resetCameraUI();
    showHome();
}

function closeList() {
    showHome();
}

// Scanner functions
async function initScanner() {
    try {
        document.getElementById('scanner-loading').classList.remove('hidden');
        
        if (scanner) {
            await scanner.stop();
        }

        scanner = new Html5Qrcode("scanner-region");

        // Configuration optimisée pour codes-barres
        const config = {
            fps: 30, // Augmentation du FPS pour une meilleure détection
            qrbox: function(viewfinderWidth, viewfinderHeight) {
                // Zone de scan plus large (90% de la zone visible)
                let minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                let qrboxSize = Math.floor(minEdge * 0.9);
                return {
                    width: qrboxSize,
                    height: Math.floor(qrboxSize * 0.6) // Format adapté aux codes-barres
                };
            },
            aspectRatio: 1.0,
            disableFlip: false,
            // Formats de codes-barres supportés
            formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.ITF,
                Html5QrcodeSupportedFormats.CODE_93
            ]
        };

        await scanner.start(
            { 
                facingMode: "environment",
                // Demander la meilleure résolution possible
                advanced: [
                    { zoom: 2.0 } // Zoom pour mieux lire de loin
                ]
            },
            config,
            handleScan,
            () => {} // Ignore errors
        );

        document.getElementById('scanner-loading').classList.add('hidden');
    } catch (error) {
        console.error('Scanner error:', error);
        alert('Erreur lors de l\'initialisation du scanner. Vérifiez les permissions de la caméra.');
    }
}

async function stopScanner() {
    if (scanner) {
        try {
            await scanner.stop();
        } catch (error) {
            console.error('Error stopping scanner:', error);
        }
    }
}

function handleScan(barcode) {
    stopScanner();
    currentBarcode = barcode;

    // Feedback visuel et sonore de succès
    const scannerRegion = document.getElementById('scanner-region');
    scannerRegion.style.border = '4px solid #10b981';
    
    // Vibration si disponible
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }

    // Son de succès (bip court)
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Ignorer si audio non supporté
    }

    setTimeout(() => {
        scannerRegion.style.border = '4px solid rgba(6, 182, 212, 0.5)';
        
        if (users[barcode]) {
            // User exists
            const user = users[barcode];
            const updatedUser = {
                ...user,
                scans: [...(user.scans || []), new Date().toISOString()]
            };

            users[barcode] = updatedUser;
            storage.saveUsers(users);
            currentUser = updatedUser;
            
            showProfile();
        } else {
            // New user
            showRegisterForm();
        }
    }, 300);
}

// Profile functions
function showProfile() {
    showView('profile-view');
    
    const photoContainer = document.getElementById('profile-photo-container');
    if (currentUser.photo) {
        photoContainer.innerHTML = `<img src="${currentUser.photo}" alt="Photo" class="profile-photo">`;
    } else {
        photoContainer.innerHTML = `
            <div class="profile-photo-placeholder">
                <svg class="icon" viewBox="0 0 24 24" style="width: 48px; height: 48px;">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 010 7.75"></path>
                </svg>
            </div>
        `;
    }

    document.getElementById('profile-name').textContent = `${currentUser.prenom} ${currentUser.nom}`;
    document.getElementById('profile-code').textContent = `Code: ${currentBarcode}`;

    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    currentUser.scans.slice().reverse().forEach(scan => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-dot"></div>
            <span class="history-date">${formatDate(scan)}</span>
        `;
        historyList.appendChild(item);
    });

    document.getElementById('scan-count').textContent = currentUser.scans.length;
}

// Register functions
function showRegisterForm() {
    showView('register-view');
    document.getElementById('new-barcode-text').textContent = currentBarcode;
}

async function startCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
        });
        document.getElementById('camera-video').srcObject = cameraStream;
        
        document.getElementById('camera-controls').classList.add('hidden');
        document.getElementById('video-controls').classList.remove('hidden');
    } catch (error) {
        alert('Impossible d\'accéder à la caméra');
    }
}

function takePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('photo-canvas');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    photoData = canvas.toDataURL('image/jpeg', 0.8);
    
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    document.getElementById('preview-image').src = photoData;
    document.getElementById('video-controls').classList.add('hidden');
    document.getElementById('photo-preview').classList.remove('hidden');
}

function retakePhoto() {
    photoData = null;
    document.getElementById('photo-preview').classList.add('hidden');
    startCamera();
}

function resetCameraUI() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    document.getElementById('camera-controls').classList.remove('hidden');
    document.getElementById('video-controls').classList.add('hidden');
    document.getElementById('photo-preview').classList.add('hidden');
}

function handleRegister() {
    const prenom = document.getElementById('input-prenom').value.trim();
    const nom = document.getElementById('input-nom').value.trim();

    if (!prenom || !nom) {
        alert('Veuillez remplir tous les champs');
        return;
    }

    const newUser = {
        nom,
        prenom,
        photo: photoData || '',
        scans: [new Date().toISOString()]
    };

    users[currentBarcode] = newUser;
    storage.saveUsers(users);
    currentUser = newUser;

    document.getElementById('input-prenom').value = '';
    document.getElementById('input-nom').value = '';
    photoData = null;
    resetCameraUI();

    updateUserCount();
    showProfile();
}

// List functions
function renderUsersList() {
    const container = document.getElementById('users-list');
    const usersList = Object.entries(users);

    document.getElementById('list-count').textContent = usersList.length;

    if (usersList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg class="icon" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 010 7.75"></path>
                </svg>
                <p>Aucun code enregistré</p>
                <button onclick="closeList(); showScanner();">Scanner un code</button>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    usersList.forEach(([barcode, user]) => {
        const card = document.createElement('button');
        card.className = 'user-card';
        card.onclick = () => {
            currentBarcode = barcode;
            currentUser = user;
            showProfile();
        };

        const avatarHTML = user.photo 
            ? `<img src="${user.photo}" alt="Photo" class="user-avatar">`
            : `<div class="user-avatar-placeholder">
                 <svg class="icon icon-lg" viewBox="0 0 24 24">
                   <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                   <circle cx="9" cy="7" r="4"></circle>
                   <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                   <path d="M16 3.13a4 4 0 010 7.75"></path>
                 </svg>
               </div>`;

        card.innerHTML = `
            ${avatarHTML}
            <div class="user-info">
                <h3 class="user-name">${user.prenom} ${user.nom}</h3>
                <p class="user-barcode">${barcode}</p>
                <p class="user-scans">${user.scans.length} scan(s)</p>
            </div>
            <svg class="icon user-arrow" viewBox="0 0 24 24">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        `;

        container.appendChild(card);
    });
}

// Utility functions
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateUserCount() {
    document.getElementById('user-count').textContent = Object.keys(users).length;
}
