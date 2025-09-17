# Chat API Dokumentatsiyasi

Bu API chat uchun ishlatiladi va foydalanuvchilar autentifikatsiya qilmagan bo'lsa chatda yozishlari mumkin emas.

## 🔐 Autentifikatsiya

### Foydalanuvchi ro'yxatdan o'tish
```http
POST /api/auth/signup
Content-Type: application/json

{
  "username": "foydalanuvchi_nomi",
  "email": "email@example.com",
  "password": "parol123"
}
```

**Javob:**
```json
{
  "message": "User registered successfully!",
  "user": {
    "id": 1,
    "username": "foydalanuvchi_nomi",
    "email": "email@example.com"
  }
}
```

### Tizimga kirish
```http
POST /api/auth/signin
Content-Type: application/json

{
  "username": "foydalanuvchi_nomi",
  "password": "parol123"
}
```

**Javob:**
```json
{
  "id": 1,
  "username": "foydalanuvchi_nomi",
  "email": "email@example.com",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 💬 Chat API

**Eslatma:** Barcha chat endpointlari autentifikatsiya talab qiladi!

### Xabar yuborish (Group yoki Private)
```http
POST /api/chat/message
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "content": "Salom! Bu mening xabarim",
  "chatType": "group", // yoki "private"
  "chatId": 1, // Group ID yoki PrivateChat ID
  "replyToMessageId": null // Ixtiyoriy
}
```

**Javob:**
```json
{
  "message": "Message sent successfully!",
  "data": {
    "id": 1,
    "content": "Salom! Bu mening xabarim",
    "chatType": "group",
    "chatId": 1,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "user": {
      "id": 1,
      "username": "foydalanuvchi_nomi",
      "firstName": "Ism",
      "lastName": "Familiya",
      "avatar": "avatar_url"
    }
  }
}
```

### Xabarlarni olish
```http
GET /api/chat/messages?chatType=group&chatId=1&limit=50&offset=0
Authorization: Bearer <JWT_TOKEN>
```

**Javob:**
```json
{
  "messages": [
    {
      "id": 1,
      "content": "Salom! Bu mening xabarim",
      "chatType": "group",
      "chatId": 1,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "user": {
        "id": 1,
        "username": "foydalanuvchi_nomi",
        "firstName": "Ism",
        "lastName": "Familiya",
        "avatar": "avatar_url"
      }
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

## 👥 Group/Kanal API

**Eslatma:** Barcha group endpointlari autentifikatsiya talab qiladi!

### Yangi group/kanal yaratish
```http
POST /api/groups
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "name": "Mening guruxim",
  "description": "Bu mening guruxim haqida ma'lumot",
  "type": "group", // yoki "channel"
  "isPrivate": false
}
```

### Foydalanuvchining guruhlarini olish
```http
GET /api/groups/user
Authorization: Bearer <JWT_TOKEN>
```

**Javob:**
```json
{
  "groups": [
    {
      "id": 1,
      "name": "Mening guruxim",
      "description": "Guruh tavsifi",
      "type": "group",
      "isPrivate": false,
      "memberCount": 5,
      "members": [
        {
          "id": 1,
          "username": "admin",
          "firstName": "Admin",
          "lastName": "User",
          "avatar": "/uploads/avatars/admin.jpg",
          "groupMembers": {
            "role": "creator",
            "joinedAt": "2024-01-15T10:30:00.000Z"
          }
        }
      ]
    }
  ]
}
```

### Group tafsilotlarini olish
```http
GET /api/groups/1
Authorization: Bearer <JWT_TOKEN>
```

**Javob:**
```json
{
  "group": {
    "id": 1,
    "name": "Mening guruxim",
    "description": "Guruh tavsifi",
    "type": "group",
    "isPrivate": false,
    "memberCount": 5,
    "members": [
      {
        "id": 1,
        "username": "admin",
        "firstName": "Admin",
        "lastName": "User",
        "avatar": "/uploads/avatars/admin.jpg",
        "groupMembers": {
          "role": "creator",
          "joinedAt": "2024-01-15T10:30:00.000Z"
        }
      }
    ]
  }
}
```

### Guruh holatini tekshirish (Frontend uchun)
```http
GET /api/groups/1/status
Authorization: Bearer <JWT_TOKEN>
```

**Bu endpoint frontend da guruhga kirganda pastda qanday button ko'rsatishni aniqlaydi:**
- **Qo'shilmagan** → "Qo'shilish" buttoni
- **Qo'shilgan** → "Xabar yozish" va "Chiqish" buttonlari

### A'zo qo'shish (Admin/Admin uchun)
```http
POST /api/groups/members
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "groupId": 1,
  "userId": 2,
  "role": "member" // "member", "admin", "creator"
}
```

### Guruhga qo'shilish
```http
POST /api/groups/join
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "groupId": 1
}
```

**Javob (ochiq guruh):**
```json
{
  "message": "Successfully joined the group!",
  "joined": true
}
```

**Javob (maxfiy guruh):**
```json
{
  "message": "Join request sent! Waiting for admin approval.",
  "joined": false,
  "requiresApproval": true
}
```

### Guruh holatini tekshirish
```http
GET /api/groups/1/status
Authorization: Bearer <JWT_TOKEN>
```

**Javob (qo'shilmagan):**
```json
{
  "isMember": false,
  "canJoin": true,
  "group": {
    "id": 1,
    "name": "Mening guruxim",
    "type": "group",
    "isPrivate": false,
    "memberCount": 5
  }
}
```

**Javob (qo'shilgan):**
```json
{
  "isMember": true,
  "role": "member",
  "joinedAt": "2024-01-15T10:30:00.000Z",
  "canLeave": true,
  "group": {
    "id": 1,
    "name": "Mening guruxim",
    "type": "group",
    "isPrivate": false,
    "memberCount": 5
  }
}
```

### Guruhdan chiqish
```http
DELETE /api/groups/1/leave
Authorization: Bearer <JWT_TOKEN>
```

**Javob:**
```json
{
  "message": "Successfully left the group!"
}
```

## 🔍 Search API

### Universal qidiruv (Foydalanuvchilar, Guruhlar, Kanallar)
```http
GET /api/search?query=test&type=all
Authorization: Bearer <JWT_TOKEN>
```

**Query parametrlari:**
- `query` - Qidiruv so'zi (2 ta belgidan ko'p)
- `type` - Qidiruv turi:
  - `all` - Hammasini qidirish (default)
  - `users` - Faqat foydalanuvchilarni
  - `groups` - Faqat guruhlarni
  - `channels` - Faqat kanallarni
  - `groups_only` - Faqat guruhlarni (kanallarsiz)

**Javob:**
```json
{
  "query": "test",
  "type": "all",
  "results": {
    "users": [
      {
        "id": 1,
        "username": "testuser",
        "firstName": "Test",
        "lastName": "User",
        "avatar": "/uploads/avatars/avatar.jpg",
        "isOnline": true,
        "lastSeen": "2024-01-15T10:30:00.000Z"
      }
    ],
    "groups": [
      {
        "id": 1,
        "name": "Test Group",
        "description": "Test group description",
        "type": "group",
        "isPrivate": false,
        "avatar": "/uploads/avatars/group.jpg",
        "memberCount": 5,
        "creator": {
          "id": 1,
          "username": "admin",
          "firstName": "Admin",
          "lastName": "User",
          "avatar": "/uploads/avatars/admin.jpg"
        }
      }
    ]
  },
  "total": {
    "users": 1,
    "groups": 1,
    "channels": 0
  }
}
```

### Advanced qidiruv (Guruhlar va Kanallar uchun)
```http
GET /api/search/advanced?query=test&type=group&isPrivate=false&minMembers=5&maxMembers=100
Authorization: Bearer <JWT_TOKEN>
```

**Query parametrlari:**
- `query` - Qidiruv so'zi
- `type` - `group` yoki `channel`
- `isPrivate` - `true` yoki `false`
- `minMembers` - Minimal a'zolar soni
- `maxMembers` - Maksimal a'zolar soni

## 👤 User API

### Foydalanuvchilarni qidirish (Eski usul)
```http
GET /api/users/search?query=username
Authorization: Bearer <JWT_TOKEN>
```

### Foydalanuvchi profilini olish
```http
GET /api/users/1/profile
Authorization: Bearer <JWT_TOKEN>
```

### Profilni yangilash
```http
PUT /api/users/profile
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "firstName": "Yangi ism",
  "lastName": "Yangi familiya",
  "bio": "Yangi bio",
  "phone": "+998901234567"
}
```

### Avatar yangilash
```http
PUT /api/users/avatar
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "avatar": "https://example.com/avatar.jpg"
}
```

### Avatar yuklash (File upload)
```http
POST /api/upload/avatar
Content-Type: multipart/form-data

Form data:
- avatar: [image file]
```

**Javob:**
```json
{
  "message": "Avatar uploaded!",
  "url": "/uploads/avatars/avatar-1234567890.jpg",
  "filename": "avatar-1234567890.jpg"
}
```

**Eslatma:** Avatar URL ni user profilida saqlash uchun `/api/users/avatar` endpoint dan foydalaning.

### Private chat boshlash
```http
POST /api/users/private-chat
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "targetUserId": 2
}
```

### Private chatlarni olish
```http
GET /api/users/private-chats
Authorization: Bearer <JWT_TOKEN>
```

## 🔒 Xavfsizlik

- **bcrypt** bilan parollar hash qilinadi
- **JWT token** 24 soat amal qiladi
- Barcha chat endpointlari `Authorization` header talab qiladi
- Tokensiz so'rovlar **403 Forbidden** xatosi qaytaradi

## 🚀 Serverni ishga tushirish

```bash
# Dependencelarni o'rnatish
npm install

# Serverni ishga tushirish
npm start

# Development uchun
npm run dev
```

## 🧪 API ni sinab ko'rish

```bash
# Test scriptini ishga tushirish
node test-api.js
```

## 📊 Ma'lumotlar bazasi

### Users Table
- `id` - Primary key
- `username` - Foydalanuvchi nomi (unique)
- `email` - Email manzil (unique)
- `password` - Hashlangan parol
- `firstName` - Ism
- `lastName` - Familiya
- `avatar` - Avatar rasm URL
- `bio` - Biografiya
- `phone` - Telefon raqam
- `isOnline` - Online holat
- `lastSeen` - Oxirgi ko'rinish vaqti
- `isActive` - Faol holat

### Messages Table
- `id` - Primary key
- `content` - Xabar matni
- `userId` - Foydalanuvchi ID (foreign key)
- `chatType` - Chat turi (private/group)
- `chatId` - Chat ID (Group ID yoki PrivateChat ID)
- `replyToMessageId` - Javob berilayotgan xabar ID
- `timestamp` - Xabar vaqti

### Groups Table
- `id` - Primary key
- `name` - Group nomi
- `description` - Group tavsifi
- `type` - Group turi (group/channel)
- `isPrivate` - Maxfiy group
- `creatorId` - Yaratuvchi ID (foreign key)
- `avatar` - Group avatar
- `memberCount` - A'zolar soni

### GroupMembers Table
- `id` - Primary key
- `groupId` - Group ID (foreign key)
- `userId` - Foydalanuvchi ID (foreign key)
- `role` - A'zo roli (member/admin/creator)
- `joinedAt` - Qo'shilgan vaqt
- `isActive` - Faol holat

### PrivateChats Table
- `id` - Primary key
- `user1Id` - Birinchi foydalanuvchi ID (foreign key)
- `user2Id` - Ikkinchi foydalanuvchi ID (foreign key)
- `lastMessageId` - Oxirgi xabar ID
- `lastMessageAt` - Oxirgi xabar vaqti
- `isActive` - Faol holat

- **PostgreSQL** ma'lumotlar bazasi
- **Sequelize** ORM

## 🌐 WebSocket

Real-time chat uchun WebSocket server `ws://localhost:8080` manzilida ishlaydi.

## ❌ Xatolik kodlari

- **400** - Noto'g'ri so'rov
- **401** - Noto'g'ri token
- **403** - Token yo'q
- **404** - Foydalanuvchi topilmadi
- **500** - Server xatosi
