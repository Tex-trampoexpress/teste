import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { toast, Toaster } from 'react-hot-toast'

function App() {
  const [currentScreen, setCurrentScreen] = useState('home')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [status, setStatus] = useState('available')
  const [avatarUrl, setAvatarUrl] = useState('')
  
  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        phone,
        password: phone // Using phone as password for simplicity
      })
      
      if (error) throw error
      setCurrentScreen('profile')
    } catch (error) {
      toast.error('Erro ao fazer login')
    }
  }

  const handleSaveProfile = async () => {
    try {
      const user = supabase.auth.user()
      if (!user) throw new Error('Usuário não autenticado')

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name,
          phone,
          avatar_url: avatarUrl,
          status
        })

      if (profileError) throw profileError

      // Save tags
      const { error: tagsError } = await supabase
        .from('service_tags')
        .upsert(
          tags.map(tag => ({
            profile_id: user.id,
            tag
          }))
        )

      if (tagsError) throw tagsError

      toast.success('Perfil salvo com sucesso!')
      setCurrentScreen('home')
    } catch (error) {
      toast.error('Erro ao salvar perfil')
    }
  }

  return (
    <>
      <Toaster />
      {/* Rest of your existing JSX, but updated to use the state variables */}
    </>
  )
}

export default App