#!/usr/bin/env python3
"""
SIMPLE Agency Local Web Server
Serves the React + Tailwind SPA and provides API endpoints for Contact and AI Chat.
"""

import http.server
import socketserver
import json
import os
import sys
import urllib.parse

PORT = int(os.environ.get("PORT", 5173))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

FAQ_RESPONSES = {
    "website": (
        "We build modern, ultra-responsive websites tailored for your business that look stunning "
        "on every phone, tablet, and computer. Our packages start at ₹12,999 (discounted from ₹14,999) "
        "and even include a FREE Ad Run!"
    ),
    "ai agent": (
        "Our AI Agents operate 24/7 on WhatsApp or Instagram to instantly answer customer questions, "
        "share product details, take inquiries, and capture leads while you sleep. "
        "Single platform starts at ₹6,999 (regular ₹8,999), or both platforms for ₹7,999 (regular ₹9,999)."
    ),
    "ad run": (
        "We run and optimize your ads across Instagram, Facebook, YouTube, and X. "
        "Please note: we manage, target, and optimize the ad runs; client provides the ad creatives. "
        "Standalone ad running is ₹1,599/mo for 1 platform or ₹2,699/mo for 2 platforms."
    ),
    "pricing": (
        "Here are our current limited period discounted packages:\n"
        "1. Website + AI Agent + Free Ad Run (Best Value): ₹11,999 (was ₹14,999)\n"
        "2. Website + Free Ad Run (up to 6 pages): ₹6,999 (was ₹9,999)\n"
        "3. AI Agent + Free Ad Run: ₹3,999 (was ₹5,999)\n"
        "4. Ad Run Only: ₹1,599/mo (was ₹2,499/mo)."
    ),
    "contact": (
        "You can reach us directly:\n"
        "• Email: simple.agency0011@gmail.com\n"
        "• Instagram: @simple____agency\n"
        "• Or submit an inquiry through the Contact section on our website!"
    )
}

class SimpleHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            payload = json.loads(post_data.decode('utf-8'))
        except Exception:
            payload = {}

        if parsed.path == '/api/contact':
            # Handle contact form submission
            name = payload.get('name', 'Anonymous')
            contact_info = payload.get('phone', '')
            service = payload.get('service', 'General Inquiry')
            message = payload.get('message', '')
            
            print(f"[CONTACT INQUIRY] From: {name} | Contact: {contact_info} | Service: {service} | Message: {message}")

            response_data = {
                "status": "success",
                "message": f"Thank you {name}! We received your inquiry and our team will get in touch with you shortly."
            }
            self._send_json(response_data)
            return

        elif parsed.path == '/api/chat':
            # Handle AI Chatbot response
            user_msg = payload.get('message', '').lower().strip()
            reply = "I'm the SIMPLE AI Assistant! I can help you with our Website Development, 24/7 AI Agents, Ad Run Services, and Pricing packages. How can I help your business today?"

            if any(k in user_msg for k in ["site", "website", "web", "page", "developer"]):
                reply = FAQ_RESPONSES["website"]
            elif any(k in user_msg for k in ["ai", "agent", "bot", "whatsapp", "instagram", "chat"]):
                reply = FAQ_RESPONSES["ai agent"]
            elif any(k in user_msg for k in ["ad", "ads", "run", "meta", "campaign", "marketing"]):
                reply = FAQ_RESPONSES["ad run"]
            elif any(k in user_msg for k in ["price", "cost", "pricing", "plan", "package", "rate", "inr", "rupee"]):
                reply = FAQ_RESPONSES["pricing"]
            elif any(k in user_msg for k in ["contact", "phone", "email", "call", "reach", "hire", "number"]):
                reply = FAQ_RESPONSES["contact"]

            self._send_json({"reply": reply})
            return

        self.send_error(404, "Endpoint not found")

    def _send_json(self, data, code=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def end_headers(self):
        # Enable efficient caching for static assets, keep HTML revalidated
        if self.path.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico', '.mp4')):
            self.send_header('Cache-Control', 'public, max-age=86400')
        else:
            self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    # Try preferred port 5173, fallback if in use
    for port_candidate in [5173, 3000, 8080, 8000]:
        try:
            with ThreadingHTTPServer(('0.0.0.0', port_candidate), SimpleHandler) as httpd:
                print(f"[SIMPLE SERVER] Running at http://localhost:{port_candidate} and http://127.0.0.1:{port_candidate}")
                sys.stdout.flush()
                httpd.serve_forever()
                break
        except OSError as e:
            print(f"Port {port_candidate} busy, trying next...")
            continue
