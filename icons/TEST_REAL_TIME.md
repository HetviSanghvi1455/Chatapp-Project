<<<<<<< HEAD
# Testing Real-Time Chat Functionality

## Quick Test Steps

### 1. Start Both Applications
```bash
# Terminal 1 - Start Server
cd live-chat-server
npm start

# Terminal 2 - Start Client  
cd live-chat-client
npm start
```

### 2. Check Server Console
Look for these messages:
```
Server is Running...
Server is Connected to Database
User connected: [socket-id]
User [user-id] joined room: user:[user-id]
```

### 3. Check Browser Console
Open browser console and look for:
```
Initializing socket connection for user: [user-id]
Socket connected, joining user room: [user-id]
Initializing sidebar socket connection for user: [user-id]
Sidebar socket connected, joining user room: [user-id]
```

### 4. Test Real-Time Messaging
1. **Open two browser windows** (or incognito + normal)
2. **Login with different users** in each window
3. **Start a chat** between the two users
4. **Send a message** from User A
5. **Check User B's console** for:
   ```
   Received new message: [message-content]
   Adding message to current chat: [message-content]
   ```

### 5. Check Server Console for Broadcasting
When User A sends a message, look for:
```
Broadcasting message to users: [user-ids]
Emitting new:message to user:[user-id]
```

## Troubleshooting

### If Messages Don't Appear in Real-Time:

1. **Check Socket Connection Status**
   - Browser console should show "Socket connected"
   - Server console should show "User connected"

2. **Verify User Rooms**
   - Server console should show "User [id] joined room: user:[id]"
   - Each user should be in their own room

3. **Check Message Broadcasting**
   - Server console should show "Broadcasting message to users"
   - Should show "Emitting new:message to user:[id]"

4. **Verify Event Reception**
   - Client console should show "Received new message"
   - Should show "Adding message to current chat"

### Common Issues:

1. **"Socket.IO not available"** in server console
   - Restart the server
   - Check if socket.io is properly imported

2. **No "User connected" messages**
   - Check if client is connecting to correct port (8080)
   - Verify CORS settings

3. **Messages not broadcasting**
   - Check if users are properly joined to rooms
   - Verify chat.users array contains correct user IDs

4. **Client not receiving events**
   - Check if socket connection is established
   - Verify event listener names match server events

## Debug Commands

### Server Console:
- Look for socket connection logs
- Check message broadcasting logs
- Verify user room assignments

### Client Console:
- Check socket connection status
- Verify event reception
- Check message processing

### Network Tab:
- Look for WebSocket connections
- Check for failed requests
- Verify CORS headers
=======
# Testing Real-Time Chat Functionality

## Quick Test Steps

### 1. Start Both Applications
```bash
# Terminal 1 - Start Server
cd live-chat-server
npm start

# Terminal 2 - Start Client  
cd live-chat-client
npm start
```

### 2. Check Server Console
Look for these messages:
```
Server is Running...
Server is Connected to Database
User connected: [socket-id]
User [user-id] joined room: user:[user-id]
```

### 3. Check Browser Console
Open browser console and look for:
```
Initializing socket connection for user: [user-id]
Socket connected, joining user room: [user-id]
Initializing sidebar socket connection for user: [user-id]
Sidebar socket connected, joining user room: [user-id]
```

### 4. Test Real-Time Messaging
1. **Open two browser windows** (or incognito + normal)
2. **Login with different users** in each window
3. **Start a chat** between the two users
4. **Send a message** from User A
5. **Check User B's console** for:
   ```
   Received new message: [message-content]
   Adding message to current chat: [message-content]
   ```

### 5. Check Server Console for Broadcasting
When User A sends a message, look for:
```
Broadcasting message to users: [user-ids]
Emitting new:message to user:[user-id]
```

## Troubleshooting

### If Messages Don't Appear in Real-Time:

1. **Check Socket Connection Status**
   - Browser console should show "Socket connected"
   - Server console should show "User connected"

2. **Verify User Rooms**
   - Server console should show "User [id] joined room: user:[id]"
   - Each user should be in their own room

3. **Check Message Broadcasting**
   - Server console should show "Broadcasting message to users"
   - Should show "Emitting new:message to user:[id]"

4. **Verify Event Reception**
   - Client console should show "Received new message"
   - Should show "Adding message to current chat"

### Common Issues:

1. **"Socket.IO not available"** in server console
   - Restart the server
   - Check if socket.io is properly imported

2. **No "User connected" messages**
   - Check if client is connecting to correct port (8080)
   - Verify CORS settings

3. **Messages not broadcasting**
   - Check if users are properly joined to rooms
   - Verify chat.users array contains correct user IDs

4. **Client not receiving events**
   - Check if socket connection is established
   - Verify event listener names match server events

## Debug Commands

### Server Console:
- Look for socket connection logs
- Check message broadcasting logs
- Verify user room assignments

### Client Console:
- Check socket connection status
- Verify event reception
- Check message processing

### Network Tab:
- Look for WebSocket connections
- Check for failed requests
- Verify CORS headers
>>>>>>> 594d3b6b06fb7016060d793786bbccb77db42e0d
