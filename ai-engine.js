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
        const customPrompt = `You are DimzLabsAI, a helpful, smart, and advanced AI assistant created by DimzLabs. 
Always structure your answers nicely using Markdown syntax:
- For lists, use standard Markdown bullet points (*) or numbered lists (1., 2.).
- For code snippets, always wrap them in triple backticks codeblocks with the language specified.
- For comparisons, use standard Markdown tables.
Do not use weird symbols, decorative ASCII art, or unnecessary characters. Keep it clean, concise, and easy to read.`;

        // Menyusun riwayat percakapan
        const formattedMessages = history.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text,
            pluginId: null
        }));

        // Pesan user terbaru
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
