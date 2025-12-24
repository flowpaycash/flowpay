#!/usr/bin/env python3
"""
FLOWPay - Servidor de Desenvolvimento
Serve arquivos estáticos com MIME types corretos
"""

import http.server
import socketserver
import os
import mimetypes
from pathlib import Path

# Configurar MIME types corretos
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('application/manifest+json', '.webmanifest')

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)
    
    def end_headers(self):
        # Adicionar headers de segurança e CORS para desenvolvimento
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()
    
    def guess_type(self, path):
        """Override para garantir MIME types corretos"""
        base, ext = os.path.splitext(path)
        
        # Mapeamento manual de extensões para MIME types
        mime_map = {
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.mjs': 'application/javascript',
            '.json': 'application/json',
            '.html': 'text/html',
            '.htm': 'text/html',
            '.xml': 'text/xml',
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject',
            '.otf': 'font/otf',
            '.webmanifest': 'application/manifest+json',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.pdf': 'application/pdf',
            '.zip': 'application/zip',
            '.tar': 'application/x-tar',
            '.gz': 'application/gzip'
        }
        
        if ext.lower() in mime_map:
            return mime_map[ext.lower()]
        
        # Fallback para o método padrão
        return super().guess_type(path)

def run_server(port=8000):
    """Inicia o servidor na porta especificada"""
    with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
        print(f"🚀 FLOWPay - Servidor rodando em http://localhost:{port}")
        print(f"📁 Diretório: {os.getcwd()}")
        print(f"🔧 MIME types configurados corretamente")
        print(f"⏹️  Pressione Ctrl+C para parar")
        print("-" * 50)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Servidor parado pelo usuário")
            httpd.shutdown()

if __name__ == "__main__":
    import sys
    
    # Verificar se foi passada uma porta específica
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("❌ Porta inválida. Usando porta padrão 8000")
    
    run_server(port)
