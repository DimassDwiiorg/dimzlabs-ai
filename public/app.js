// Cek Status Auth saat aplikasi dimuat
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
});

function updateAuthUI() {
    const userStatus = localStorage.getItem('user_status') || 'trial';
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

function logout() {
    localStorage.clear();
    alert("Anda telah keluar.");
    window.location.reload();
}
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcome-screen');

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

// Chat yang sedang aktif (dipakai untuk riwayat di Firestore)
let currentChatId = sessionId;
let chatSavedToDB = false; // apakah chat ini sudah punya dokumen riwayat di Firestore

sendBtn.addEventListener('click', sendMessage);

// Kirim dengan tombol Enter
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function sendQuickMessage(text) {
    userInput.value = text;
    sendMessage();
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    welcomeScreen.classList.add('hidden');
    messagesContainer.classList.remove('hidden');

    // 1. Tampilkan Pesan User
    appendMessage(text, 'user');
    userInput.value = '';

    // 2. Disable Input & Button (Mencegah kirim beruntun saat AI berpikir)
    setInputsDisabled(true);

    // 3. Tampilkan Thinking Bubble (Indikator Loading AI)
    const thinkingElement = appendThinkingBubble();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, userId, userStatus, sessionId })
        });

        const data = await response.json();

        // Hapus Thinking Bubble
        thinkingElement.remove();

        if (response.ok) {
            // 4. Render Jawaban AI dengan Efek Ketik Smooth Per Baris
            await streamResponseSmoothly(data.response);
            // 5. Simpan riwayat chat ke Firestore
            saveMessagePairToHistory(text, data.response);
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
        // Enable kembali Input & Button
        setInputsDisabled(false);
        userInput.focus();
    }
}

// Mengunci & Membuka Input
function setInputsDisabled(disabled) {
    userInput.disabled = disabled;
    sendBtn.disabled = disabled;
    if (disabled) {
        sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// Buble Indikator Berpikir
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

// Efek Typing Per Baris Smooth (mirip Gemini)
async function streamResponseSmoothly(fullText) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'mr-auto bg-zinc-900 border border-zinc-800 text-gray-200 rounded-2xl px-4 py-3 max-w-[90%] text-sm space-y-2';
    messagesContainer.appendChild(msgDiv);

    const lines = fullText.split('\n');
    let currentText = '';

    for (let i = 0; i < lines.length; i++) {
        currentText += lines[i] + '\n';
        msgDiv.innerHTML = marked.parse(currentText);
        attachCopyButtons(msgDiv); // Pasang tombol copy di setiap code block
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 40)); // Kecepatan muncul per baris (40ms)
    }
}

function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'user' 
        ? 'ml-auto bg-blue-600 text-white rounded-2xl px-4 py-2.5 max-w-[80%] w-fit text-sm'
        : 'mr-auto bg-zinc-900 border border-zinc-800 text-gray-200 rounded-2xl px-4 py-3 max-w-[90%] text-sm space-y-2';

    if (sender === 'ai') {
        msgDiv.innerHTML = marked.parse(text);
        attachCopyButtons(msgDiv);
    } else {
        msgDiv.textContent = text;
    }

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Pasang Tombol Copy Code Otomatis di Setiap Blok Kode
function attachCopyButtons(container) {
    const codeBlocks = container.querySelectorAll('pre');
    codeBlocks.forEach((pre) => {
        if (pre.querySelector('.copy-btn')) return; // Mencegah tombol ganda

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

// ===================================================================
// RIWAYAT CHAT (Firebase Firestore)
// ===================================================================

const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const chatHistoryList = document.getElementById('chat-history-list');

// Menunggu window.chatDB siap (diset oleh script module Firebase di index.html)
function waitForChatDB() {
    if (window.chatDB) return Promise.resolve(window.chatDB);
    return new Promise((resolve) => {
        window.addEventListener('chatdb-ready', () => resolve(window.chatDB), { once: true });
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    sidebarOverlay.classList.remove('hidden');
    refreshChatList();
}

function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    sidebarOverlay.classList.add('hidden');
}

sidebarToggleBtn?.addEventListener('click', openSidebar);
sidebarCloseBtn?.addEventListener('click', closeSidebar);
sidebarOverlay?.addEventListener('click', closeSidebar);

// Tombol "Chat Baru": mulai sesi baru, kosongkan layar
newChatBtn?.addEventListener('click', () => {
    currentChatId = 'chat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    sessionId = currentChatId;
    localStorage.setItem('session_id', sessionId);
    chatSavedToDB = false;

    messagesContainer.innerHTML = '';
    messagesContainer.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');

    closeSidebar();
});

// Render daftar riwayat chat di sidebar
async function refreshChatList() {
    chatHistoryList.innerHTML = '<p class="text-xs text-gray-500 text-center mt-6">Memuat...</p>';
    try {
        const chatDB = await waitForChatDB();
        const chats = await chatDB.getChats(userId);

        if (!chats.length) {
            chatHistoryList.innerHTML = '<p class="text-xs text-gray-500 text-center mt-6">Belum ada riwayat chat.</p>';
            return;
        }

        chatHistoryList.innerHTML = '';
        chats.forEach((chat) => {
            const isActive = chat.id === currentChatId;
            const item = document.createElement('div');
            item.className = 'group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm cursor-pointer transition ' +
                (isActive ? 'bg-zinc-800 text-white' : 'text-gray-300 hover:bg-zinc-900');
            item.innerHTML = `
                <span class="truncate pr-2">${escapeHtml(chat.title || 'Percakapan')}</span>
                <button class="delete-chat-btn opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 shrink-0">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            `;
            item.addEventListener('click', (e) => {
                if (e.target.closest('.delete-chat-btn')) return;
                loadChat(chat.id);
            });
            item.querySelector('.delete-chat-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('Hapus percakapan ini?')) return;
                await chatDB.deleteChat(userId, chat.id);
                if (chat.id === currentChatId) newChatBtn.click();
                refreshChatList();
            });
            chatHistoryList.appendChild(item);
        });
    } catch (err) {
        console.warn('Gagal memuat riwayat chat:', err);
        chatHistoryList.innerHTML = '<p class="text-xs text-red-400 text-center mt-6">Gagal memuat riwayat.</p>';
    }
}

// Buka salah satu chat lama dari sidebar
async function loadChat(chatId) {
    currentChatId = chatId;
    sessionId = chatId;
    localStorage.setItem('session_id', sessionId);
    chatSavedToDB = true;

    try {
        const chatDB = await waitForChatDB();
        const messages = await chatDB.getMessages(userId, chatId);

        messagesContainer.innerHTML = '';
        if (messages.length) {
            welcomeScreen.classList.add('hidden');
            messagesContainer.classList.remove('hidden');
            messages.forEach((m) => appendMessage(m.text, m.sender));
        } else {
            welcomeScreen.classList.remove('hidden');
            messagesContainer.classList.add('hidden');
        }
    } catch (err) {
        console.warn('Gagal membuka riwayat chat:', err);
    }

    closeSidebar();
}

// Simpan sepasang pesan (user + AI) ke Firestore setelah balasan sukses
async function saveMessagePairToHistory(userText, aiText) {
    try {
        const chatDB = await waitForChatDB();

        if (!chatSavedToDB) {
            const title = userText.length > 40 ? userText.slice(0, 40) + '…' : userText;
            await chatDB.createChatIfNeeded(userId, currentChatId, title);
            chatSavedToDB = true;
        } else {
            await chatDB.touchChat(userId, currentChatId);
        }

        await chatDB.addMessage(userId, currentChatId, 'user', userText);
        await chatDB.addMessage(userId, currentChatId, 'ai', aiText);
    } catch (err) {
        console.warn('Gagal menyimpan riwayat chat:', err);
    }
}

// Saat halaman dibuka, lanjutkan chat terakhir (jika ada) tanpa perlu buka sidebar
(async () => {
    try {
        const chatDB = await waitForChatDB();
        const messages = await chatDB.getMessages(userId, currentChatId);
        if (messages.length) {
            chatSavedToDB = true;
            welcomeScreen.classList.add('hidden');
            messagesContainer.classList.remove('hidden');
            messages.forEach((m) => appendMessage(m.text, m.sender));
        }
    } catch (err) {
        console.warn('Gagal memuat chat terakhir:', err);
    }
})();
