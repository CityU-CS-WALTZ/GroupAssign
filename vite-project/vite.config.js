import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
    server: {
        port: 3000,
        open: true,
        proxy: {
            '/save': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                selfHandleResponse: true,
                bypass: (req, res, proxyOptions) => {
                    req.on('data', (chunk) => {
                        const data = chunk.toString();
                        console.log(data);
                        fs.writeFileSync('./public/task.csv', data);
                        res.end('ok');
                    });
                }
            },
        },
    },
})