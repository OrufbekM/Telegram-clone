# Storage Migration: localStorage to sessionStorage

This document explains the changes made to properly separate persistent data from session-only data in the Telegram-copy application.

## Problem

Previously, the application was storing all data in `localStorage`, which meant:
- Chat sessions persisted after browser close
- Message caches accumulated over time
- User-scoped temporary data was never cleaned up
- Users would see stale chat data after restarting the browser

## Solution

We've implemented a proper storage separation strategy:

### Persistent Data (localStorage)
- `chatToken`: Authentication token that should persist across sessions
- `chatUser`: User profile data that should persist across sessions

### Session Data (sessionStorage)
- Current chat selection
- Message caches
- Sidebar data caches (groups, channels, private chats)
- Group/channel memberships
- Any other temporary UI state

## Changes Made

### 1. Created Storage Utility (`src/utils/storageUtils.js`)
A centralized utility that:
- Automatically determines correct storage type based on data
- Provides migration support for existing localStorage entries
- Includes cleanup functionality
- Offers both automatic and manual storage methods

### 2. Updated Components
All components now use the storage utility instead of direct localStorage calls:

- `AuthDialog.jsx`: Authentication data (persistent)
- `ChatApp.jsx`: Current chat and caches (session) + auth data (persistent)  
- `ChatArea.jsx`: Message caches and chat data (session) + auth tokens (persistent)
- `ChatSidebar.jsx`: All sidebar caches and data (session) + auth tokens (persistent)
- `ProfileDialog.jsx`: User profile updates (persistent) + logout cleanup
- `CreateGroupDialog.jsx`: Auth tokens (persistent)
- `CreateChannelDialog.jsx`: Auth tokens (persistent)
- `GroupInfoDialog.jsx`: Auth tokens (persistent)

### 3. Added Cleanup Functionality (`src/utils/cleanupStorage.js`)
- Removes old localStorage entries that should be in sessionStorage
- Runs automatically on first application load
- Can be run manually if needed
- Provides detailed console logging

## Usage

### For New Code
```javascript
import { storage } from '../utils/storageUtils';

// For authentication data (persistent)
storage.setPersistent('chatToken', token);
const token = storage.getPersistent('chatToken');

// For session data (temporary)
storage.setSession('messages_123', JSON.stringify(messages));
const messages = storage.getSession('messages_123');

// Auto-detect (recommended)
storage.setItem(key, value); // Automatically chooses correct storage
const value = storage.getItem(key); // Automatically looks in correct storage
```

### Manual Cleanup
```javascript
import cleanupOldLocalStorage from '../utils/cleanupStorage';
cleanupOldLocalStorage(); // Run manual cleanup if needed
```

## Benefits

1. **Proper Session Management**: Chat sessions don't persist after browser close
2. **Better Privacy**: Temporary chat data is cleared when browser closes
3. **Reduced Storage Bloat**: Message caches and temporary data are cleared automatically
4. **Improved Performance**: Less data to manage and transfer
5. **Automatic Migration**: Existing users get their localStorage cleaned up automatically

## What Users Will Notice

- After browser restart, they'll need to select a chat again (intended behavior)
- No stale message caches or outdated chat states
- Authentication remains persistent (they won't need to log in again)
- Overall cleaner and more predictable chat experience

## Development Notes

- All localStorage calls have been replaced with storage utility calls
- The cleanup runs automatically on first page load
- Migration is handled transparently for existing users
- Console logging helps debug storage-related issues during development

## Testing

To verify the changes work correctly:

1. Open browser dev tools → Application → Storage
2. Before: You should see many localStorage entries
3. After: Only `chatToken` and `chatUser` should remain in localStorage
4. Session data should be in sessionStorage instead
5. After browser restart: sessionStorage should be empty, localStorage should still have auth data

---

**Note**: This migration ensures the chat application behaves more like a traditional messaging app where sessions are temporary but authentication persists.
