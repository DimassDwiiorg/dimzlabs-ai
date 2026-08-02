// gemini-engine.js
// Engine khusus untuk fitur "baca gambar" (vision).
// Dipanggil HANYA saat user mengirim gambar. Chat teks biasa tetap pakai ai-engine.js (chateverywhere).

class GeminiVision {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        // gemini-2.0-flash: cepat, gratis, dan sudah mendukung image understanding.
        this.model = 'gemini-2.0-flash';
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

        this.systemPromptText = `Namamu adalah DimzLabsAI. Kamu adalah asisten AI yang diciptakan dan dikembangkan oleh DimzLabs (Dimas).
Aturan Identitas:
- Jika ditanya "siapa kamu", "siapa nama kamu", "siapa pembuatmu", atau pertanyaan serupa, kamu WAJIB menjawab secara eksplisit bahwa namamu adalah DimzLabsAI buatan DimzLabs.
- Jangan pernah sekali-kali mengaku sebagai Gemini atau model bawaan Google.

Aturan Format Jawaban:
- Gunakan format Markdown yang rapi (bullet, numbered list, tabel bila perlu, code block untuk kode).
- Jawab jelas, ringkas, dan profesional.
- Kamu sedang menerima sebuah gambar dari user. Analisis gambar tersebut sesuai pertanyaan user.`;
    }

    async chatWithImage(message, imageBase64, mimeType = 'image/jpeg') {
        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY belum diatur di environment variable server.');
        }

        const userPrompt = message && message.trim().length > 0
            ? message
            : 'Tolong jelaskan apa yang ada di gambar ini.';

        const payload = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: `${this.systemPromptText}\n\nPertanyaan user: ${userPrompt}` },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: imageBase64
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.5
            }
        };

        const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            const errMsg = data?.error?.message || JSON.stringify(data);
            throw new Error(`Gemini API Error: ${errMsg}`);
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('Gemini tidak mengembalikan jawaban teks (kemungkinan diblokir safety filter).');
        }

        return text.trim();
    }
}

module.exports = GeminiVision;
