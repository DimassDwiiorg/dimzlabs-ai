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

// --- Fitur Upload Gambar (Vision via Gemini) ---
const attachBtn = document.getElementById('attach-btn');
const imageInput = document.getElementById('image-input');
const imagePreviewWrapper = document.getElementById('image-preview-wrapper');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');

let attachedImageBase64 = null; // base64 murni (tanpa prefix data:...)
let attachedImageMime = null;

attachBtn.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        // reader.result formatnya "data:image/png;base64,AAAA..."
        const [prefix, base64Data] = reader.result.split(',');
        attachedImageBase64 = base64Data;
        attachedImageMime = file.type;

        imagePreview.src = reader.result;
        imagePreviewWrapper.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
});

removeImageBtn.addEventListener('click', () => {
    attachedImageBase64 = null;
    attachedImageMime = null;
    imageInput.value = '';
    imagePreviewWrapper.classList.add('hidden');
});

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
    const hasImage = !!attachedImageBase64;

    // Butuh minimal salah satu: teks ATAU gambar
    if (!text && !hasImage) return;

    welcomeScreen.classList.add('hidden');
    messagesContainer.classList.remove('hidden');

    // 1. Tampilkan Pesan User (dengan thumbnail gambar kalau ada)
    appendMessage(text, 'user', hasImage ? imagePreview.src : null);
    userInput.value = '';

    // Simpan gambar untuk dikirim, lalu langsung bersihkan area preview
    const imageToSend = attachedImageBase64;
    const mimeToSend = attachedImageMime;
    attachedImageBase64 = null;
    attachedImageMime = null;
    imageInput.value = '';
    imagePreviewWrapper.classList.add('hidden');

    // 2. Disable Input & Button (Mencegah kirim beruntun saat AI berpikir)
    setInputsDisabled(true);

    // 3. Tampilkan Thinking Bubble (Indikator Loading AI)
    const thinkingElement = appendThinkingBubble();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                userId, userStatus, sessionId,
                image: imageToSend,
                mimeType: mimeToSend
            })
        });

        const data = await response.json();

        // Hapus Thinking Bubble
        thinkingElement.remove();

        if (response.ok) {
            // 4. Render Jawaban AI dengan Efek Ketik Smooth Per Baris
            await streamResponseSmoothly(data.response);
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

function appendMessage(text, sender, imageSrc = null) {
    if (sender === 'user') {
        // Membuat container utama untuk pesan user (rata kanan)
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'ml-auto flex flex-col items-end space-y-2 max-w-[80%] w-fit';

        // Jika ada gambar, tampilkan gambar TANPA bubble background
        if (imageSrc) {
            const img = document.createElement('img');
            img.src = imageSrc;
            // Styling gambar agar melengkung rapi seperti Gemini
            img.className = 'rounded-2xl max-h-60 object-contain shadow-md';
            wrapperDiv.appendChild(img);
        }

        // Jika ada teks, tampilkan dalam bubble tersendiri di bawah gambar
        if (text) {
            const textDiv = document.createElement('div');
            // Warna diubah menjadi bg-zinc-700 agar sedikit lebih cerah dari sebelumnya
            textDiv.className = 'bg-zinc-700 text-white rounded-3xl px-5 py-2.5 text-sm w-fit shadow-sm';
            textDiv.textContent = text;
            wrapperDiv.appendChild(textDiv);
        }

        messagesContainer.appendChild(wrapperDiv);
    } else {
        // Tampilan untuk pesan AI (tetap sama seperti sebelumnya)
        const msgDiv = document.createElement('div');
        msgDiv.className = 'mr-auto bg-zinc-900 border border-zinc-800 text-gray-200 rounded-2xl px-4 py-3 max-w-[90%] text-sm space-y-2';
        
        if (text) {
            msgDiv.innerHTML = marked.parse(text);
            attachCopyButtons(msgDiv);
        }
        
        messagesContainer.appendChild(msgDiv);
    }

    // Scroll otomatis ke paling bawah
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
