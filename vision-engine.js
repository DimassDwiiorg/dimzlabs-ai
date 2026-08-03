// vision-engine.js
// Engine khusus untuk fitur "baca gambar" (vision), sekarang pakai Groq (gratis, no credit card).
// Dipanggil HANYA saat user mengirim gambar. Chat teks biasa tetap pakai ai-engine.js (chateverywhere).

class GroqVision {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
        // Model vision Groq saat ini (preview). Kalau suatu saat error "model_decommissioned",
        // cek model vision terbaru di: https://console.groq.com/docs/models (filter by "vision")
        this.model = 'qwen/qwen3.6-27b';
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

        this.systemPromptText = `Namamu adalah DimzLabsAI. Kamu adalah asisten AI yang diciptakan dan dikembangkan oleh DimzLabs (Dimas).
Aturan Identitas:
- Jika ditanya "siapa kamu", "siapa nama kamu", "siapa pembuatmu", atau pertanyaan serupa, kamu WAJIB menjawab secara eksplisit bahwa namamu adalah DimzLabsAI buatan DimzLabs.
- Jangan pernah sekali-kali mengaku sebagai Qwen, Llama, Groq, atau model bawaan pihak lain.

Aturan Format Jawaban:
- Gunakan format Markdown yang rapi (bullet, numbered list, tabel bila perlu, code block untuk kode).
- LANGSUNG berikan jawaban akhirnya saja, jangan tampilkan proses analisis/langkah berpikir internal.
- Jawaban harus singkat, padat, jelas, dan profesional.
- Kamu sedang menerima sebuah gambar dari user. Analisis gambar tersebut sesuai pertanyaan user.`;
    }

    async chatWithImage(message, imageBase64, mimeType = 'image/jpeg') {
        if (!this.apiKey) {
            throw new Error('GROQ_API_KEY belum diatur di environment variable server.');
        }

        const userPrompt = message && message.trim().length > 0
            ? message
            : 'Tolong jelaskan apa yang ada di gambar ini.';

        const payload = {
            model: this.model,
            temperature: 0.5,
            messages: [
                { role: 'system', content: this.systemPromptText },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userPrompt },
                        {
                            type: 'image_url',
                            image_url: { url: `data:${mimeType};base64,${imageBase64}` }
                        }
                    ]
                }
            ]
        };

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            const errMsg = data?.error?.message || JSON.stringify(data);
            throw new Error(`Groq API Error: ${errMsg}`);
        }

        const text = data?.choices?.[0]?.message?.content;

        if (!text) {
            throw new Error('Groq tidak mengembalikan jawaban teks.');
        }

        return text.trim();
    }
}

module.exports = GroqVision;
