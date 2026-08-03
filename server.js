const express = require('express');
const path = require('path');
const DimzLabsAI = require('./ai-engine');
const GroqVision = require('./vision-engine');
const ClaudeEngine = require('./claude-engine'); // ENGINE BARU

const app = express();
const ai = new DimzLabsAI();
const vision = new GroqVision();
const claude = new ClaudeEngine(); // INISIALISASI ENGINE CLAUDE

// Limit dinaikkan jadi 10mb karena gambar base64 lebih besar dari teks biasa
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const userSessions = {};
// Memori riwayat percakapan sementara berdasarkan Session ID
const chatHistories = {};

app.post('/api/chat', async (req, res) => {
    // Ambil parameter model dari req.body (dikirim dari app.js)
    const { message, userId, userStatus, sessionId, image, mimeType, model } = req.body; 
    const now = Date.now();

    // Gunakan 'trial' sebagai fallback jika userStatus tidak terdeteksi
    const status = userStatus || 'trial';

    if (!userSessions[userId]) {
        let limit = 5;
        if (status === 'guest') limit = 30;
        if (status === 'real') limit = 100;

        userSessions[userId] = { 
            count: limit, 
            status: status,
            resetTime: now + 24 * 60 * 60 * 1000 
        };
    }

    const session = userSessions[userId];

    // Reset otomatis jika sudah lewat 24 jam
    if (now > session.resetTime) {
        let limit = 5;
        if (status === 'guest') limit = 30;
        if (status === 'real') limit = 100;
        userSessions[userId] = { count: limit, status: status, resetTime: now + 24 * 60 * 60 * 1000 };
    }

    // Cek Batas Trial (Gunakan res.json tanpa status 403/429 agar Vercel tidak menampilkan halaman Forbidden)
    if (session.status === 'trial' && session.count <= 0) {
        return res.json({ 
            requireLogin: true,
            response: "⚠️ Batas 5 percakapan gratis kamu sudah habis! Silakan login untuk melanjutkan." 
        });
    }

    if (session.count <= 0) {
        return res.json({ 
            response: "⚠️ Limit token harian kamu sudah habis! Silakan tunggu 24 jam." 
        });
    }

    try {
        const currentHistory = chatHistories[sessionId] || [];

        let responseText;
        if (image) {
            // Ada gambar -> lempar ke Vision API
            responseText = await vision.chatWithImage(message, image, mimeType);
        } else {
            // Chat teks biasa -> Cek model apa yang dipilih user
            if (model === 'claude') {
                responseText = await claude.chat(message);
            } else {
                // Default ke model Fast (DimzLabsAI)
                responseText = await ai.chat(message, currentHistory);
            }
        }

        // Simpan percakapan baru ke riwayat (untuk gambar, hanya simpan teksnya sebagai penanda)
        if (!chatHistories[sessionId]) chatHistories[sessionId] = [];
        const historyLabel = image ? `${message ? message + ' ' : ''}[mengirim gambar]` : message;
        chatHistories[sessionId].push({ sender: 'user', text: historyLabel });
        chatHistories[sessionId].push({ sender: 'ai', text: responseText });

        session.count--;
        res.json({ response: responseText, remainingTokens: session.count });
    } catch (err) {
        console.error('CHAT ERROR:', err);
        res.status(500).json({ error: "Gagal terhubung ke server AI.", detail: err.message });
    }
});

if (process.env.VERCEL) {
    module.exports = app;
} else {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`DimzLabsAI running on port ${PORT}`));
}
