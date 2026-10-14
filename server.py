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
        "Our Website package is a one-time fee of ₹4,999 (or ₹6,999 bundled with 1 AI Agent / ₹7,999 with 2 AI Agents). "
        "It includes up to 6 custom responsive pages, contact intake form, and 30 days of complimentary ad campaign setup "
        "on 1 platform. You own 100% of your website code with zero recurring agency retainers."
    ),
    "ai agent": (
        "Our AI Agents operate 24/7 on WhatsApp or Instagram to answer customer questions, "
        "share product specs/catalogs, and capture leads while you sleep. "
        "Setup is a one-time fee of ₹1,799 for a single platform, or ₹2,799 for both WhatsApp + Instagram synchronized."
    ),
    "ad run": (
        "Our Ad Run service covers audience research, tracking setup, daily bid checks, and weekly reporting "
        "across Instagram, Facebook, Google, YouTube, or X. Management is ₹1,499/mo for 1 platform or ₹2,499/mo for 2 platforms. "
        "Important: Ad spend is paid directly by you to Meta/Google; client supplies ad creative graphics/videos."
    ),
    "pricing": (
        "Here are our transparent rates in INR:\n"
        "1. Website + AI Agent + Free Ad Run: ₹6,999 (Both AI: ₹7,999) [One-time implementation]\n"
        "2. Website + Free Ad Run: ₹4,999 [One-time development]\n"
        "3. AI Agent + Free Ad Run: ₹1,799 (Both AI: ₹2,799) [One-time setup]\n"
        "4. Ad Run Only: ₹1,499/mo (1 platform) or ₹2,499/mo (2 platforms) [Monthly recurring].\n"
        "Note: 'Free Ad Run' covers 30 days of campaign management. Direct ad spend is funded separately by the client."
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
            platform_opt = payload.get('platformOption', '')
            message = payload.get('message', '')
            
            print(f"[CONTACT INQUIRY] From: {name} | Contact: {contact_info} | Service: {service} | Option: {platform_opt} | Message: {message}")

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
