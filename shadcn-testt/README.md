# Telegram Desktop Chat Application

A modern, Telegram Desktop-styled chat application built with React, featuring real-time messaging, group management, and advanced search capabilities.

## 🚀 Features

### ✨ **Core Functionality**
- **User Authentication** - Secure signup/signin with JWT tokens
- **Real-time Chat** - Private and group messaging
- **Group Management** - Create, join, leave groups and channels
- **Smart Search** - Universal search across users, groups, and channels
- **Profile Management** - Update profile and avatar
- **Responsive Design** - Works on all devices

### 🔍 **Advanced Search (New!)**
- **Universal Search** - Search across all content types
- **Smart Results** - Combines local and API search results
- **Search Filters** - Filter by users, groups, or channels only
- **Instant Results** - Shows results as you type (like Telegram)
- **Partial Matching** - Finds results even with incomplete queries

### 👥 **Enhanced Group Management (New!)**
- **Join Groups** - One-click group joining
- **Leave Groups** - Easy group departure
- **Membership Status** - See if you're a member
- **Group Types** - Support for both groups and channels
- **Privacy Support** - Handle public and private groups

### 💬 **Chat Features**
- **Private Chats** - Direct messaging between users
- **Group Chats** - Multi-user conversations
- **Message History** - View chat history
- **Real-time Updates** - Instant message delivery
- **Reply System** - Reply to specific messages

### 🔐 **Security Features**
- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt encryption
- **Protected Routes** - All chat endpoints require auth
- **Token Expiration** - 24-hour token validity

## 🏗️ Architecture

### **Custom React Hooks**
- **`useAuth`** - Authentication and user profile management
- **`useChat`** - Chat messaging and message retrieval
- **`useGroups`** - Group and channel management
- **`useUsers`** - User search and private chat management
- **`useSearch`** - Universal search across users, groups, and channels
- **`useToast`** - User notification system

### **Component Structure**
- **`ChatApp`** - Main application orchestrator
- **`LoginScreen`** - Authentication entry point
- **`ChatSidebar`** - Left sidebar with chats and search
- **`ChatArea`** - Main chat display and input
- **`CreateGroupDialog`** - Group creation interface
- **`WelcomeScreen`** - Landing page for new users

## 🚀 Getting Started

### **Prerequisites**
- Node.js 16+ 
- PostgreSQL database
- Backend API server running on port 3000

### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd shadcn-test

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 🔌 API Integration

### **Authentication Endpoints**
```http
POST /api/auth/signup    # User registration
POST /api/auth/signin    # User login
```

### **Chat Endpoints**
```http
POST /api/chat/message           # Send message (private/group)
GET  /api/chat/messages         # Fetch messages with pagination
```

### **Group Management**
```http
POST /api/groups                 # Create new group/channel
GET  /api/groups/user           # Get user's groups
GET  /api/groups/{id}           # Get group details
POST /api/groups/members        # Add group member
```

### **User Management**
```http
GET  /api/users/{id}/profile    # Get user profile
PUT  /api/users/profile         # Update current user profile
PUT  /api/users/avatar          # Update avatar URL
POST /api/upload/avatar         # Upload avatar file
POST /api/users/private-chat    # Start private chat
GET  /api/users/private-chats   # Get private chats
```

### **Universal Search**
```http
GET /api/search                 # Universal search (users, groups, channels)
GET /api/search/advanced        # Advanced search with filters
```

## 🎨 Styling

- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Modern, accessible UI components
- **Lucide React** - Beautiful, consistent icons
- **Telegram-inspired Design** - Familiar chat interface

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Protected Routes** - All chat endpoints require authentication
- **Input Validation** - Client and server-side validation
- **Secure File Uploads** - Avatar upload with validation

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Shadcn/ui components
│   ├── ChatApp.jsx     # Main application
│   ├── ChatSidebar.jsx # Left sidebar
│   ├── ChatArea.jsx    # Chat display
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useAuth.js      # Authentication
│   ├── useChat.js      # Chat functionality
│   ├── useGroups.js    # Group management
│   ├── useUsers.js     # User management
│   ├── useSearch.js    # Search functionality
│   └── use-toast.js    # Notifications
├── lib/                 # Utility functions
└── App.jsx             # Application entry point
```

## 🔧 Configuration

### **Environment Variables**
Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:8080
```

### **Backend Requirements**
- PostgreSQL database with proper schema
- JWT secret configuration
- File upload directory setup
- WebSocket server for real-time features

## 🧪 Testing

### **API Testing**
```bash
# Test all endpoints
node test-api.js

# Test specific endpoint
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

### **Frontend Testing**
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 🚀 Future Enhancements

- **WebSocket Integration** - Real-time messaging
- **File Sharing** - Document and media sharing
- **Voice/Video Calls** - WebRTC integration
- **Message Encryption** - End-to-end encryption
- **Push Notifications** - Browser notifications
- **Mobile App** - React Native version
- **Offline Support** - Service worker implementation

## 🐛 Troubleshooting

### **Common Issues**

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check database credentials
   - Ensure proper schema exists

2. **API Endpoint Errors**
   - Verify backend server is running on port 3000
   - Check API endpoint URLs in hooks
   - Verify JWT token format

3. **Frontend Build Issues**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify environment variables

### **Debug Mode**
Enable detailed logging by setting:
```javascript
localStorage.setItem('debug', 'true')
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Built with ❤️ using React, Tailwind CSS, and Shadcn/ui**
