import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/use-toast'
const AuthDialog = ({ onAuthSuccess }) => {
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authMode, setAuthMode] = useState('signin')
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: ''
  })
  const { signin, signup, isLoading } = useAuth()
  const { toast } = useToast()
  const handleAuth = async (e) => {
    e.preventDefault()
    try {
      if (authMode === 'signin') {
        const data = await signin({
          username: authForm.username,
          password: authForm.password
        })
        localStorage.setItem('chatToken', data.accessToken)
        localStorage.setItem('chatUser', JSON.stringify({
          id: data.id,
          username: data.username,
          email: data.email
        }))
        onAuthSuccess({
          id: data.id,
          username: data.username,
          email: data.email
        })
        setShowAuthDialog(false)
        toast({
          title: "Tizimga kirildi!",
          description: `Xush kelibsiz, ${data.username}!`
        })
      } else {
        await signup(authForm)
        toast({
          title: "Ro'yxatdan o'tildi!",
          description: "Endi tizimga kiring"
        })
        setAuthMode('signin')
      }
    } catch (error) {
      toast({
        title: "Xatolik!",
        description: error.message,
        variant: "destructive"
      })
    }
  }
  const resetAuthForm = () => {
    setAuthForm({ username: '', email: '', password: '' })
  }
  const switchMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
    resetAuthForm()
  }
  return (
    <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <User className="w-4 h-4 mr-2" />
          Tizimga kirish
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {authMode === 'signin' ? 'Tizimga kirish' : 'Ro\'yxatdan o\'tish'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <Label htmlFor="username">Foydalanuvchi nomi</Label>
            <Input
              id="username"
              value={authForm.username}
              onChange={(e) => setAuthForm(prev => ({ ...prev, username: e.target.value }))}
              required
            />
          </div>
          {authMode === 'signup' && (
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
          )}
          <div>
            <Label htmlFor="password">Parol</Label>
            <Input
              id="password"
              type="password"
              value={authForm.password}
              onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Kutilmoqda...' : (authMode === 'signin' ? 'Kirish' : 'Ro\'yxatdan o\'tish')}
          </Button>
        </form>
        <div className="text-center">
          <button
            type="button"
            onClick={switchMode}
            className="text-sm text-blue-600 hover:underline"
          >
            {authMode === 'signin' ? 'Hisobingiz yo\'qmi? Ro\'yxatdan o\'ting' : 'Hisobingiz bormi? Tizimga kiring'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default AuthDialog

