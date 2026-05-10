#!/usr/bin/env python3
"""
WebSocket Manual Test Script for Pomodoro Sessions
Run this script to test WebSocket functionality manually.

Usage: python tests/test_websocket_manual.py
"""

import socketio
import time
import sys

# Create SocketIO client
sio = socketio.Client()

# Test configuration
SERVER_URL = 'http://localhost:5000'
NAMESPACE = '/pomodoro'

# Test data - you'll need to replace these with real values
TEST_TOKEN = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE3NzY0MzU4MDB9.dummy_token_for_testing'  # Dummy token for testing
TEST_SESSION_ID = 1  # Replace with actual session ID

@sio.event
def connect():
    print('✅ Connected to server')

@sio.event
def connect_response(data):
    print(f'📡 Server response: {data}')

@sio.event
def disconnect():
    print('❌ Disconnected from server')

@sio.event
def join_response(data):
    print(f'✅ Join response: {data}')

@sio.event
def task_updated(data):
    print(f'📝 Task updated: {data}')

@sio.event
def user_joined(data):
    print(f'👤 User joined: {data}')

@sio.event
def user_left(data):
    print(f'👋 User left: {data}')

@sio.event
def session_finished(data):
    print(f'🏁 Session finished: {data}')

@sio.event
def error(data):
    print(f'❌ Error: {data}')

def test_websocket():
    """Test WebSocket connection and events"""
    try:
        print(f'🔌 Connecting to {SERVER_URL}{NAMESPACE}...')

        # Connect to server
        sio.connect(SERVER_URL, namespaces=[NAMESPACE])
        time.sleep(2)  # Wait for connection

        # Test 1: Join session
        print('📤 Testing join_session...')
        sio.emit('join_session', {
            'token': TEST_TOKEN,
            'session_id': TEST_SESSION_ID
        }, namespace=NAMESPACE)
        time.sleep(2)

        # Test 2: Update task
        print('📤 Testing update_task...')
        sio.emit('update_task', {
            'token': TEST_TOKEN,
            'session_id': TEST_SESSION_ID,
            'task_text': 'Testing WebSocket connection'
        }, namespace=NAMESPACE)
        time.sleep(2)

        # Test 3: Leave session
        print('📤 Testing leave_session...')
        sio.emit('leave_session', {
            'token': TEST_TOKEN,
            'session_id': TEST_SESSION_ID
        }, namespace=NAMESPACE)
        time.sleep(2)

        # Disconnect
        sio.disconnect()
        print('✅ Test completed successfully!')

    except Exception as e:
        print(f'❌ Test failed: {e}')
        return False

    return True

if __name__ == '__main__':
    print('🚀 Starting WebSocket Test')
    print('Make sure your backend is running on http://localhost:5000')
    print('Update TEST_TOKEN and TEST_SESSION_ID with real values\n')

    success = test_websocket()
    sys.exit(0 if success else 1)