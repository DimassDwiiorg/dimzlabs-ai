// Import Firebase SDK (Versi Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, get, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyChgPynJA0qwgfId3c4PZMZLYSMqaaL4u0",
    authDomain: "dimzlabsai.firebaseapp.com",
    databaseURL: "https://dimzlabsai-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dimzlabsai",
    storageBucket: "dimzlabsai.firebasestorage.app",
    messagingSenderId: "675200621290",
    appId: "1:675200621290:web:76aa8222689e03a70e1593",
    measurementId: "G-4XZVPZ0DRM"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// User ID & Session ID Management
let userId = localStorage.getItem('user_id');
let userStatus = localStorage.getItem('user_status') || 'trial';
let sessionId = localStorage.getItem('session_id') || 'session_' + Math.random().toString(36).substring(7);

if (!userId) {
    userId = 'trial_' + Math.random().toString(36).substring(7);
    localStorage.setItem('user_id', userId);
    localStorage.setItem('user_status', 'trial');
}
localStorage.setItem('session_id', sessionId);

const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcome-screen');
const historyList = document.getElementById('history-list');

// Cek Status Auth saat aplikasi dimuat
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    loadHistorySidebar(); // Memuat riwayat chat dari Firebase
});

function updateAuthUI() {
    const userName = localStorage.getItem('user_name') || 'Pengunjung';
    const userNameDisplay = document.getElementById('user-name-display');
    const userBadge = document.getElementById('user-badge');
    const authBtn = document.getElementById('auth-action-btn');

    if (userNameDisplay) userNameDisplay.textContent = userName;

    if (userStatus === 'real') {
        if (userBadge) userBadge.textContent = '100 Token';
        if (authBtn) {
            authBtn.textContent = 'Keluar';
            authBtn.onclick = logout;
        }
    } else if (userStatus === 'guest') {
        if (userBadge) userBadge.textContent = '30 Token (Guest)';
        if (authBtn) {
            authBtn.textContent = 'Login Akun';
            authBtn.onclick = () => window.location.href = '/login.html';
        }
    } else {
        if (userBadge) userBadge.textContent = 'Trial (5 Token)';
        if (authBtn) {
            authBtn.textContent = 'Login';
            authBtn.onclick = () => window.location.href = '/login.html';
        }
    }
}

// LOGIKA LOGOUT DENGAN MODAL
function logout() {
    const modal = document.getElementById('logout-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    } else {
        // Fallback jika elemen tidak ditemukan
        localStorage.clear();
        window.location.reload();
    }
}

window.confirmLogout = function() {
    localStorage.clear();
    window.location.reload();
};

window.cancelLogout = function() {
    const modal = document.getElementById('logout-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// --- LOGIKA FIREBASE: RIWAYAT CHAT ---
function loadHistorySidebar() {
    const userMetaRef = ref(db, `chatMeta/${userId}`);
    onValue(userMetaRef, (snapshot) => {
        historyList.innerHTML = ''; 
        if (snapshot.exists()) {
            const metas = snapshot.val();
            const chatArray = Object.keys(metas).map(key => ({
                id: key,
                ...metas[key]
            })).sort((a, b) => b.timestamp - a.timestamp);

            chatArray.forEach(chat => {
                const btn = document.createElement('button');
                btn.className = 'w-full text-left p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/50 transition mb-2 text-sm text-gray-300 truncate';
                btn.textContent = chat.title || 'Percakapan Baru...';
                btn.onclick = () => loadChatSession(chat.id);
                historyList.appendChild(btn);
            });
        } else {
            historyList.innerHTML = `
                <div class="text-xs text-gray-500 text-center mt-6">
                    <i class="fas fa-history text-2xl mb-2 opacity-50"></i><br>
                    Belum ada riwayat
                </div>
            `;
        }
    });
}

async function loadChatSession(id) {
    sessionId = id;
    localStorage.setItem('session_id', sessionId);
    
    messagesContainer.innerHTML = '';
    welcomeScreen.classList.add('hidden');
    messagesContainer.classList.remove('hidden');

    const sessionMessagesRef = ref(db, `chatMessages/${userId}/${sessionId}`);
    const snapshot = await get(sessionMessagesRef);

    if (snapshot.exists()) {
        const messages = snapshot.val();
        const msgArray = Object.values(messages);
        msgArray.sort((a, b) => a.timestamp - b.timestamp);

        msgArray.forEach(msg => {
            appendMessage(msg.text, msg.sender, msg.imageSrc);
        });
    }
    closeSidebar();
}

async function saveMessageToFirebase(sender, text, imageSrc = null) {
    const metaRef = ref(db, `chatMeta/${userId}/${sessionId}`);
    const metaSnapshot = await get(metaRef);
    
    if (!metaSnapshot.exists() && sender === 'user') {
        let title = text ? text.substring(0, 30) : 'Mengirim Gambar';
        if (text && text.length > 30) title += '...';
        
        await set(metaRef, {
            title: title,
            timestamp: Date.now()
        });
    } else if (metaSnapshot.exists() && sender === 'user') {
        await update(metaRef, {
            timestamp: Date.now()
        });
    }

    const msgRef = ref(db, `chatMessages/${userId}/${sessionId}`);
    push(msgRef, {
        sender: sender,
        text: text || '',
        imageSrc: imageSrc || null,
        timestamp: Date.now()
    });
}

// --- LOGIKA SIDEBAR ---
const menuBtn = document.getElementById('menu-btn');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const newChatBtn = document.getElementById('new-chat-btn');

if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
    });
}

function closeSidebar() {
    if (sidebar && sidebarOverlay) {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    }
}

if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
        sessionId = 'session_' + Math.random().toString(36).substring(7);
        localStorage.setItem('session_id', sessionId);
        
        messagesContainer.innerHTML = '';
        messagesContainer.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');
        
        closeSidebar();
    });
}

// --- FITUR MODEL SELECTION (FAST vs CLAUDE) ---
let selectedModel = 'fast'; 
const modelSelectorBtn = document.getElementById('model-selector-btn');
const modelDropdown = document.getElementById('model-dropdown');
const modelText = document.getElementById('model-text');
const modelIcon = document.getElementById('model-icon');

if (modelSelectorBtn && modelDropdown) {
    modelSelectorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        modelDropdown.classList.toggle('hidden');
        modelDropdown.classList.toggle('flex');
    });

    document.addEventListener('click', () => {
        modelDropdown.classList.add('hidden');
        modelDropdown.classList.remove('flex');
    });
}

window.selectModel = function(model) {
    selectedModel = model;
    if (model === 'fast') {
        modelText.textContent = 'Fast';
        modelIcon.className = 'fas fa-bolt text-yellow-400 text-xs';
    } else if (model === 'claude') {
        modelText.textContent = 'Claude';
        modelIcon.className = 'fas fa-brain text-purple-400 text-xs';
    }
};

// --- Fitur Upload Gambar (Vision via Gemini) ---
const attachBtn = document.getElementById('attach-btn');
const imageInput = document.getElementById('image-input');
const imagePreviewWrapper = document.getElementById('image-preview-wrapper');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');

let attachedImageBase64 = null; 
let attachedImageMime = null;

if (attachBtn) attachBtn.addEventListener('click', () => imageInput.click());

if (imageInput) {
    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const [prefix, base64Data] = reader.result.split(',');
            attachedImageBase64 = base64Data;
            attachedImageMime = file.type;

            imagePreview.src = reader.result;
            imagePreviewWrapper.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    });
}

if (removeImageBtn) {
    removeImageBtn.addEventListener('click', () => {
        attachedImageBase64 = null;
        attachedImageMime = null;
        imageInput.value = '';
        imagePreviewWrapper.classList.add('hidden');
    });
}

if (sendBtn) sendBtn.addEventListener('click', sendMessage);

if (userInput) {
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

window.sendQuickMessage = function(text) {
    userInput.value = text;
    sendMessage();
};

async function sendMessage() {
    const text = userInput.value.trim();
    const hasImage = !!attachedImageBase64;

    if (!text && !hasImage) return;

    welcomeScreen.classList.add('hidden');
    messagesContainer.classList.remove('hidden');

    const imgSrc = hasImage ? imagePreview.src : null;
    appendMessage(text, 'user', imgSrc);
    
    // SIMPAN KE FIREBASE (Pesan User)
    saveMessageToFirebase('user', text, imgSrc);

    userInput.value = '';

    const imageToSend = attachedImageBase64;
    const mimeToSend = attachedImageMime;
    attachedImageBase64 = null;
    attachedImageMime = null;
    imageInput.value = '';
    imagePreviewWrapper.classList.add('hidden');

    setInputsDisabled(true);

    const thinkingElement = appendThinkingBubble();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                userId, userStatus, sessionId,
                image: imageToSend,
                mimeType: mimeToSend,
                model: selectedModel // <-- KIRIM PILIHAN MODEL KE SERVER
            })
        });

        const data = await response.json();

        thinkingElement.remove();

        if (response.ok) {
            await streamResponseSmoothly(data.response);
            // SIMPAN KE FIREBASE (Jawaban AI)
            saveMessageToFirebase('ai', data.response);
        } else if (data.requireLogin) {
            appendMessage(`⚠️ ${data.error}`, 'ai');
            setTimeout(() => {
                alert("Batas percakapan habis! Silakan login terlebih dahulu.");
                window.location.href = '/login.html';
            }, 1500);
        } else {
            appendMessage(`⚠️ ${data.error}`, 'ai');
        }
    } catch (e) {
        if (thinkingElement) thinkingElement.remove();
        appendMessage("⚠️ Gagal terhubung ke server.", 'ai');
    } finally {
        setInputsDisabled(false);
        userInput.focus();
    }
}

function setInputsDisabled(disabled) {
    userInput.disabled = disabled;
    sendBtn.disabled = disabled;
    if (disabled) {
        sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function appendThinkingBubble() {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'mr-auto bg-zinc-900 border border-zinc-800 text-gray-200 rounded-2xl px-4 py-3 max-w-[90%] text-sm flex items-center space-x-1';
    msgDiv.innerHTML = `
        <span class="text-xs text-gray-400 mr-2">DimzLabsAI berpikir</span>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return msgDiv;
}

async function streamResponseSmoothly(fullText) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'mr-auto bg-zinc-900 border border-zinc-800 text-gray-200 rounded-2xl px-4 py-3 max-w-[90%] text-sm space-y-2';
    messagesContainer.appendChild(msgDiv);

    const lines = fullText.split('\n');
    let currentText = '';

    for (let i = 0; i < lines.length; i++) {
        currentText += lines[i] + '\n';
        msgDiv.innerHTML = marked.parse(currentText);
        attachCopyButtons(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 40)); 
    }
}

function appendMessage(text, sender, imageSrc = null) {
    if (sender === 'user') {
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'ml-auto flex flex-col items-end space-y-2 max-w-[80%] w-fit';

        if (imageSrc) {
            const img = document.createElement('img');
            img.src = imageSrc;
            img.className = 'rounded-2xl max-h-60 object-contain shadow-md';
            wrapperDiv.appendChild(img);
        }

        if (text) {
            const textDiv = document.createElement('div');
            // WARNA ABU-ABU CERAH, BUBBLE TERPISAH
            textDiv.className = 'bg-zinc-700 text-white rounded-3xl px-5 py-2.5 text-sm w-fit shadow-sm';
            textDiv.textContent = text;
            wrapperDiv.appendChild(textDiv);
        }

        messagesContainer.appendChild(wrapperDiv);
    } else {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'mr-auto bg-zinc-900 border border-zinc-800 text-gray-200 rounded-2xl px-4 py-3 max-w-[90%] text-sm space-y-2';
        
        if (text) {
            msgDiv.innerHTML = marked.parse(text);
            attachCopyButtons(msgDiv);
        }
        
        messagesContainer.appendChild(msgDiv);
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function attachCopyButtons(container) {
    const codeBlocks = container.querySelectorAll('pre');
    codeBlocks.forEach((pre) => {
        if (pre.querySelector('.copy-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.innerHTML = '<i class="far fa-copy"></i> Copy';
        
        btn.addEventListener('click', () => {
            const code = pre.querySelector('code').innerText;
            navigator.clipboard.writeText(code).then(() => {
                btn.innerHTML = '<i class="fas fa-check text-green-400"></i> Copied!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="far fa-copy"></i> Copy';
                }, 2000);
            });
        });

        pre.appendChild(btn);
    });
}
