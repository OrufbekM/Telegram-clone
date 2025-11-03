import React from 'react'
import { Button } from './ui/button'
import { MessageCircle, Plus, Search } from 'lucide-react'
const WelcomeScreen = ({ onCreateGroup, onSearchUsers }) => {
  return (
    <div className="flex-1 flex items-center justify-center dark:bg-gray-900">
      <div className="text-center display-flex ">
        <MessageCircle className="w-24 h-24 text-gray-300 mx-auto mb-6 dark:text-blue-900" />
        <div className='text-center'>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2 dark:text-white">Xush kelibsiz!</h2>
          <p className="text-gray-500 mb-6 dark:text-gray-400">Chatlashish uchun chap paneldan chat yoki guruhni tanlang</p>
        </div>
      </div>
    </div>
  )
}
export default WelcomeScreen

