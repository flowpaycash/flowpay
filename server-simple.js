import http from 'http';

const port = 3000;
const host = '0.0.0.0';

console.log(`Starting simple server on ${host}:${port}...`);

const server = http.createServer((req, res) => {
    console.log(`Received request: ${req.method} ${req.url}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Simple server running!', env: process.env.NODE_ENV }));
});

server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});
