const https = require('https');
const { URL } = require('url');
const zlib = require('zlib');

class DimzLabsAI {
    constructor() {
        this.apiUrl = 'https://chateverywhere.app/api/chat';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
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
        const customPrompt = `You are DimzLabsAI, a helpful, smart, and advanced AI assistant created by DimzLabs. 
Always structure your answers nicely using Markdown syntax:
- For lists, use standard Markdown bullet points (*) or numbered lists (1., 2.).
- For code snippets, always wrap them in triple backticks codeblocks with the language specified.
- For comparisons, use standard Markdown tables.
Do not use weird symbols, decorative ASCII art, or unnecessary characters. Keep it clean, concise, and easy to read.`;

        // Menyusun riwayat percakapan agar AI ingat kontek sebelumnya
        const formattedMessages = history.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text,
            pluginId: null
        }));

        // Tambahkan pesan user terbaru
        formattedMessages.push({ role: 'user', content: message, pluginId: null });

        const payload = {
            model: this.model,
            messages: formattedMessages,
            prompt: customPrompt,
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
                    'Accept': 'text/plain',
                    'user-browser-id': this.browserId,
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const encoding = res.headers['content-encoding'];
                    if (encoding === 'gzip' || encoding === 'deflate') {
                        zlib.unzip(Buffer.from(data, 'binary'), (err, decoded) => {
                            if (err) reject(err);
                            else resolve(decoded.toString().trim());
                        });
                    } else {
                        resolve(data.trim());
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