# WebSocket Integration Guide - Pomodoro Sessions

## Overview
The Pomodoro routes now support real-time communication using Flask-SocketIO (WebSocket). This allows multiple users to collaborate in real-time during Pomodoro sessions.

## Server Setup

### 1. Dependencies installed:
- `Flask-SocketIO==5.3.5`
- `python-socketio==5.9.0`

### 2. WebSocket Namespace
Namespace: `/pomodoro`

## Events Reference

### Client → Server Events

#### 1. Join Session
**Event:** `join_session`
```javascript
socket.emit('join_session', {
  token: "Bearer <JWT_TOKEN>",
  session_id: 123
});
```
**Response:** `join_response`
```javascript
{
  message: "Sikeresen csatlakozva",
  session_id: 123,
  user_id: 456
}
```

#### 2. Update Task
**Event:** `update_task`
```javascript
socket.emit('update_task', {
  token: "Bearer <JWT_TOKEN>",
  session_id: 123,
  task_text: "Write documentation"
});
```
**Broadcasts:** `task_updated`
```javascript
{
  user_id: 456,
  task_text: "Write documentation",
  session_id: 123,
  timestamp: "2026-04-04T10:30:00Z"
}
```

#### 3. Leave Session
**Event:** `leave_session`
```javascript
socket.emit('leave_session', {
  token: "Bearer <JWT_TOKEN>",
  session_id: 123
});
```
**Response:** `leave_response`
```javascript
{
  message: "Sikeresen kiléptél",
  session_id: 123
}
```
**Broadcasts:** `user_left`
```javascript
{
  user_id: 456,
  session_id: 123,
  timestamp: "2026-04-04T10:35:00Z"
}
```

#### 4. Session Finished
**Event:** `session_finished`
```javascript
socket.emit('session_finished', {
  token: "Bearer <JWT_TOKEN>",
  session_id: 123
});
```
**Broadcasts:** `session_finished`
```javascript
{
  session_id: 123,
  end_time: "2026-04-04T11:00:00Z",
  timestamp: "2026-04-04T11:00:00Z"
}
```

### Server → Client Events

| Event | Description |
|-------|-------------|
| `connect_response` | Connection established |
| `join_response` | User joined session |
| `task_updated` | A user updated their task (broadcast) |
| `user_joined` | Another user joined (broadcast) |
| `user_left` | Another user left (broadcast) |
| `session_finished` | Session ended (broadcast) |
| `error` | Any error occurred |

## Frontend Example (React)

```jsx
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

function PomodoroSession({ sessionId, token }) {
  const [participants, setParticipants] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to WebSocket
    socketRef.current = io('http://localhost:5000', {
      namespace: '/pomodoro',
      auth: { token }
    });

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Connected to Pomodoro WebSocket');
      setConnected(true);
      
      // Join the session
      socketRef.current.emit('join_session', {
        token: `Bearer ${token}`,
        session_id: sessionId
      });
    });

    socketRef.current.on('connect_response', (data) => {
      console.log('Server:', data.data);
    });

    socketRef.current.on('join_response', (data) => {
      console.log('Joined session:', data);
    });

    socketRef.current.on('user_joined', (data) => {
      console.log('User joined:', data.user_id);
      // Update UI to show new participant
    });

    socketRef.current.on('task_updated', (data) => {
      console.log('Task updated:', data);
      // Update participant's task in UI
    });

    socketRef.current.on('user_left', (data) => {
      console.log('User left:', data.user_id);
      // Remove participant from UI
    });

    socketRef.current.on('session_finished', (data) => {
      console.log('Session finished:', data.end_time);
      // Show completion screen
    });

    socketRef.current.on('error', (data) => {
      console.error('Error:', data.message);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [sessionId, token]);

  const updateTask = (taskText) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('update_task', {
        token: `Bearer ${token}`,
        session_id: sessionId,
        task_text: taskText
      });
    }
  };

  const leaveSession = () => {
    if (socketRef.current && connected) {
      socketRef.current.emit('leave_session', {
        token: `Bearer ${token}`,
        session_id: sessionId
      });
    }
  };

  const finishSession = () => {
    if (socketRef.current && connected) {
      socketRef.current.emit('session_finished', {
        token: `Bearer ${token}`,
        session_id: sessionId
      });
    }
  };

  return (
    <div>
      <h2>Pomodoro Session {sessionId}</h2>
      <p>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      
      <button onClick={() => updateTask('New task')}>Update Task</button>
      <button onClick={leaveSession}>Leave Session</button>
      <button onClick={finishSession}>Finish Session</button>
    </div>
  );
}

export default PomodoroSession;
```

## Installation

1. Install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Run the server:
```bash
python app.py
```

## Frontend Setup

1. Install socket.io client:
```bash
cd frontend
npm install socket.io-client
```

2. Use the examples above in your React components.

## Notes

- Token authentication is required for all WebSocket events
- Users must first be participants of the session (created via REST API)
- Events are broadcast to all users in a session room
- Connection is established with ping/pong to maintain connection (25s interval, 60s timeout)
