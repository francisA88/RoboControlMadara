from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import secrets
import time

app = Flask(__name__)
CORS(app)  # Enables CORS for all routes

# Storage for access tokens and instructions
access_token = None
access_expiry = 0
instruction_buffer = None

def is_token_valid():
    global access_token
    if time.time() > access_expiry:
        print("No access?")
        access_token = None

    return access_token is not None and time.time() < access_expiry

def cors_perm_response(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Methods', 'GET, PUT, DELETE, POST, OPTIONS')
    response.headers.add('Access-Control-Allow-Headers', '*')
    return response

# Handle preflight (OPTIONS) requests globally
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        response = make_response()
        return cors_perm_response(response)

@app.route('/check-access', methods=['POST', "OPTIONS"])
def check_access():
    global access_token
    access_token = request.json.get("access-token")
    if is_token_valid():
        response = jsonify({"status" : "authorized"})
        return cors_perm_response(response)
    return cors_perm_response(jsonify({"status": "unauthorized"}))

@app.route('/get-access', methods=['POST', "OPTIONS"])
def get_access():
    global access_token, access_expiry
    print("got here")
    if is_token_valid():
        print("Got hereswswsws")
        return cors_perm_response(jsonify({"error": "Another user is using the arm"}))
    access_token = secrets.token_hex(16)
    access_expiry = time.time() + 300  # 5 minutes expiry
    return cors_perm_response(jsonify({"access_token": access_token}))

@app.route('/update-state', methods=['POST', 'OPTIONS'])
def update_state():
    global instruction_buffer

    data = request.json
    token = data.get("access-token")
    if not is_token_valid() or token != access_token:
        return cors_perm_response(jsonify({"status": "Unauthorized"}))

    
    instruction_buffer = {"id": data.get("id"), "value": data.get("value")}
    print(instruction_buffer)
    return cors_perm_response(jsonify({"status": "okay"}))

@app.route('/fetch', methods=['GET', "OPTIONS"])
def fetch():
    print("INstructin: ", instruction_buffer)
    if instruction_buffer is None:
        response = make_response(jsonify({"error": "No instruction available"}), 401)
        return cors_perm_response(response)
    return cors_perm_response(make_response(jsonify(instruction_buffer), 200))

if __name__ == '__main__':
    app.run(debug=True)
