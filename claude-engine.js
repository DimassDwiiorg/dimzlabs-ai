// claude-engine.js
// Engine khusus untuk memanggil API Claude pihak ketiga

class ClaudeEngine {
    constructor() {
        this.apiKey = 'cmnty-3c887151abb36260dcad46b7297a33ff';
        this.baseUrl = 'https://api.cmnty.biz.id/ai/claude';
    }

    async chat(message) {
        // Melakukan request GET ke API Claude dengan menyertakan text dan apikey
        const url = `${this.baseUrl}?text=${encodeURIComponent(message)}&apikey=${this.apiKey}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Claude API Error: ${JSON.stringify(data)}`);
        }

        // Mendeteksi berbagai struktur kemungkinan respon dari API CMNTY
        let answer = data.data || data.result || data.message || data.response;
        
        // Jika jawabannya di dalam nested object (misal data.data.response)
        if (typeof answer === 'object' && answer !== null) {
            answer = answer.response || answer.text || answer.result || JSON.stringify(answer);
        }

        // Jika API membalas dengan struktur yang tidak dikenali
        if (!answer) {
            return JSON.stringify(data);
        }

        return answer.trim();
    }
}

module.exports = ClaudeEngine;
