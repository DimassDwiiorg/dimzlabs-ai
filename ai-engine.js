const https = require('https');
const { URL } = require('url');
const zlib = require('zlib');

class DimzLabsAI {
    constructor() {
        this.apiUrl = 'https://chateverywhere.app/api/chat';
        // User-Agent Chrome Desktop Lengkap & Terbaru
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
        this.browserId = this._generateBrowserId();
        this.model = {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5',
            maxLength: 12000,
            tokenLimit: 4000,
            completionTokenLimit: 2500,
            deploymentName: 'gpt-35'
        };
    }

    _generateBrowserId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async chat(message, history = []) {
        // 1. Definisikan System Prompt untuk Identitas & Format Response
        const systemPromptText = `Namamu adalah DimzLabsAI. Kamu adalah asisten AI yang diciptakan dan dikembangkan oleh DimzLabs (Dimas).
Aturan Identitas:
- Jika ditanya "siapa kamu", "siapa nama kamu", "siapa pembuatmu", atau pertanyaan serupa, kamu WAJIB menjawab secara eksplisit bahwa namamu adalah DimzLabsAI buatan DimzLabs.
- Jangan pernah sekali-kali mengaku sebagai model bawaan OpenAI atau mengatakan tidak memiliki nama pribadi.

Aturan Format Jawaban:
- Selalu gunakan format Markdown yang rapi:
  * Gunakan bullet points (*) atau numbered lists (1., 2.) untuk daftar/list.
  * Gunakan triple backticks (\`\`\`language) untuk setiap kode program.
  * Gunakan tabel Markdown untuk perbandingan data.
- Jawab secara jelas, ringkas, dan profesional.`;

        // 2. Susun array messages dengan role 'system' di urutan paling awal (index 0)
        const formattedMessages = [
            {
                role: 'system',
                content: systemPromptText,
                pluginId: null
            }
        ];

        // 3. Masukkan riwayat percakapan sebelumnya
        history.forEach(msg => {
            formattedMessages.push({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text,
                pluginId: null
            });
        });

        // 4. Masukkan pesan user yang baru
        formattedMessages.push({
            role: 'user',
            content: message,
            pluginId: null
        });

        // 5. Susun Payload Request
        const payload = {
            model: this.model,
            messages: formattedMessages,
            prompt: systemPromptText,
            temperature: 0.5,
            enableConversationPrompt: true
        };

        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(this.apiUrl);
            const postData = JSON.stringify(payload);
            
            const options = {
                hostname: parsedUrl.hostname,
                port: 443,
                path: parsedUrl.pathname,
                method: 'POST',
                headers: {
                    'User-Agent': this.userAgent,
                    'Content-Type': 'application/json',
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
                    'Origin': 'https://chateverywhere.app',
                    'Referer': 'https://chateverywhere.app/',
                    'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'user-browser-id': this.browserId,
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(options, (res) => {
                let chunks = [];
                
                res.on('data', chunk => chunks.push(chunk));
                
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const encoding = res.headers['content-encoding'];

                    if (res.statusCode >= 400) {
                        return reject(new Error(`API Error HTTP ${res.statusCode}: ${buffer.toString()}`));
                    }

                    if (encoding === 'gzip' || encoding === 'deflate') {
                        zlib.unzip(buffer, (err, decoded) => {
                            if (err) reject(err);
                            else resolve(decoded.toString().trim());
                        });
                    } else if (encoding === 'br') {
                        zlib.brotliDecompress(buffer, (err, decoded) => {
                            if (err) reject(err);
                            else resolve(decoded.toString().trim());
                        });
                    } else {
                        resolve(buffer.toString().trim());
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }
}

module.exports = DimzLabsAI;
