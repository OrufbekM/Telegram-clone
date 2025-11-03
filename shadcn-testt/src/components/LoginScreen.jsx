import React from 'react'
import { MessageCircle } from 'lucide-react'
import AuthDialog from './AuthDialog'
const LoginScreen = ({ onAuthSuccess }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Chat App</h1>
          <p className="text-gray-600 dark:text-gray-300">Xabar almashish uchun tizimga kiring</p>
        </div>
        <AuthDialog onAuthSuccess={onAuthSuccess} />
      </div>
    </div>
  )
}
export default LoginScreen

