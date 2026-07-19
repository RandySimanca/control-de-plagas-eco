import { createContext, useContext, useState, useEffect } from 'react'
import * as configApi from '../api/configuracion.api'
import { useAuth } from './AuthContext'

const ConfigContext = createContext({})

// eslint-disable-next-line react-refresh/only-export-components
export const useConfig = () => useContext(ConfigContext)

export function ConfigProvider({ children }) {
  const { user } = useAuth()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchConfig()
    } else {
      // Usuario cerró sesión: limpiar la config
      setConfig(null)
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function fetchConfig() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const { data } = await configApi.getConfig(token)
      setConfig(data)
    } catch (err) {
      console.error('Error cargando configuración:', err)
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }

  const nombreEmpresa = config?.nombre_empresa || 'PlagControl'
  const logoUrl = config?.logo_url || null

  return (
    <ConfigContext.Provider value={{
      config,
      nombreEmpresa,
      logoUrl,
      loading,
      refetchConfig: fetchConfig
    }}>
      {children}
    </ConfigContext.Provider>
  )
}
