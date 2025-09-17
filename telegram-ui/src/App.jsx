import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import ChatApp from './components/ChatApp'
import LoginScreen from './components/LoginScreen'
import NotFound from './components/NotFound'
import ToastContainer from './components/ToastContainer'
import ConfirmDialog from './components/ConfirmDialog'
import { useToast } from './hooks/use-toast'
import { useConfirm } from './hooks/useConfirm'
import { initAlertService } from './services/alertService'
import './App.css'
function RequireAuth({ children }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('chatToken') : null
  const location = useLocation()
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
function ValidChatRoute() {
  const { chatId } = useParams()
  if (!/^\d+$/.test(chatId)) {
    return <NotFound />
  }
  return <ChatApp />
}
function App() {
  const { toasts, dismiss, toast } = useToast()
  const { confirm, confirmState, closeConfirm, handleConfirm } = useConfirm()
  useEffect(() => {
    initAlertService(toast, confirm)
  }, [toast, confirm])
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<LoginScreen onAuthSuccess={() => window.location.replace('/chat')} />} />
        <Route path="/chat" element={<RequireAuth><ChatApp /></RequireAuth>} />
        <Route path="/chat/:chatId" element={<RequireAuth><ValidChatRoute /></RequireAuth>} />
        <Route path="/" element={<Navigate to={localStorage.getItem('chatToken') ? '/chat' : '/login'} replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {}
      <ConfirmDialog
        open={confirmState.isOpen}
        onOpenChange={closeConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
export default App

