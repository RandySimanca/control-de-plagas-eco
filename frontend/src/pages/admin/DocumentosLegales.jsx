import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { FileText, Upload, Trash2, FilePlus, Loader2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { confirmDelete, successAlert } from '../../lib/alerts'

export default function DocumentosLegales() {
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [archivo, setArchivo] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('documentos_legales')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setDocumentos(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Error cargando documentos')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!archivo || !nombre.trim()) return
    
    setUploading(true)
    try {
      const fileExt = archivo.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `legales/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, archivo)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath)

      const { data: newDoc, error: dbError } = await supabase
        .from('documentos_legales')
        .insert({
          nombre: nombre.trim(),
          url: publicUrl,
          storage_path: filePath
        })
        .select()
        .single()

      if (dbError) throw dbError

      setDocumentos(prev => [newDoc, ...prev])

      await successAlert('¡Subido!', 'Documento subido con éxito')
      setNombre('')
      setArchivo(null)
      e.target.reset()
      load()
    } catch (err) {
      toast.error('Error al subir documento: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function descargarDoc(doc) {
    try {
      const { data, error } = await supabase.storage
        .from('documentos')
        .download(doc.storage_path)

      if (error) throw error

      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      const safeName = doc.nombre.replace(/[^a-z0-0]/gi, '_').toLowerCase()
      a.download = `${safeName}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error(err)
      toast.error('Error al descargar documento')
    }
  }

  async function handleDelete(doc) {
    const isConfirmed = await confirmDelete('¿Estás seguro de eliminar este documento?', 'El archivo ya no estará disponible para visualización.')
    if (!isConfirmed) return

    try {
      // 1. Delete from storage
      await supabase.storage.from('documentos').remove([doc.storage_path])
      // 2. Delete from DB
      await supabase.from('documentos_legales').delete().eq('id', doc.id)
      
      setDocumentos(documentos.filter(d => d.id !== doc.id))
      await successAlert('Eliminado', 'El documento legal ha sido eliminado.')
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Documentación Legal</h1>
          <p className="page-subtitle">Certificaciones, permisos y políticas de la empresa para visualización de clientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulario de Carga */}
        <div className="md:col-span-1">
          <div className="card sticky top-24">
            <h2 className="text-lg font-bold text-dark-900 mb-4 flex items-center gap-2">
              <FilePlus className="w-5 h-5 text-primary-600" /> Nuevo Documento
            </h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="label-field">Nombre del Documento</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ej: Cámara de Comercio" 
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label-field">Archivo (PDF)</label>
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="input-field py-1.5" 
                  onChange={e => setArchivo(e.target.files[0])}
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={uploading} 
                className="btn-primary w-full"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><Upload className="w-5 h-5" /> Subir PDF</>}
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Documentos */}
        <div className="md:col-span-2">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
          ) : documentos.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="w-12 h-12 text-dark-200 mx-auto mb-3" />
              <p className="text-dark-500">No hay documentos legales cargados aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documentos.map(doc => (
                <div key={doc.id} className="card flex items-center justify-between p-4 group transition-all hover:border-primary-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-dark-900">{doc.nombre}</h3>
                      <p className="text-xs text-dark-400">Subido el {new Date(doc.created_at).toLocaleDateString('es')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => descargarDoc(doc)}
                      className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Descargar Documento"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(doc)} 
                      className="p-2 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
