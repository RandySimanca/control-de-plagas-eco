import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Bug, Mail, Loader2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) {
      toast.error('Ingresa tu correo electrónico')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) throw error

      setSent(true)
      toast.success('Enlace de recuperación enviado')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Error al enviar de correo de recuperación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-dark-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-600/30 mb-4">
            <Bug className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">PlagControl</h1>
          <p className="text-primary-300 mt-1">Recuperación de Contraseña</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-dark-900">Solicitud Procesada</h2>
              <p className="text-dark-500 text-sm">
                Hemos procesado tu solicitud. Si existe una cuenta asociada a este correo, te enviaremos un enlace para restablecer tu contraseña.<br/><br/>
                Por favor revisa tu bandeja de entrada y, si no lo encuentras, verifica la carpeta de spam.
              </p>
              <Link to="/login" className="btn-primary w-full block mt-6 py-3">
                Volver a Iniciar Sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-dark-900 mb-2">Recuperar Acceso</h2>
              <p className="text-sm text-dark-500 mb-6">Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label-field" htmlFor="email">Correo electrónico</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="tu@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
                
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Mail className="w-4 h-4" /> Enviar enlace</>}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="inline-flex items-center gap-1 text-sm text-dark-500 hover:text-dark-900 font-medium transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Volver a Iniciar Sesión
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
