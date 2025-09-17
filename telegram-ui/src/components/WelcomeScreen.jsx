import React from 'react'
import { Button } from './ui/button'
import { MessageCircle, Plus, Search } from 'lucide-react'
const WelcomeScreen = ({ onCreateGroup, onSearchUsers }) => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <MessageCircle className="w-24 h-24 text-gray-300 mx-auto mb-6" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Xush kelibsiz!</h2>
        <p className="text-gray-500 mb-6">Chatlashish uchun chap paneldan chat yoki guruhni tanlang</p>
        <div className="flex items-center justify-center space-x-4">
        </div>
      </div>
    </div>
  )
}
export default WelcomeScreen

