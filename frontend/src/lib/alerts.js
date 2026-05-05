import Swal from 'sweetalert2'

export const confirmDelete = async (title = '¿Estás seguro?', text = 'Esta acción no se puede deshacer') => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true
  })
  return result.isConfirmed
}

export const successAlert = (title, text = '') => {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: '#0ea5e9',
    timer: 2000,
    timerProgressBar: true
  })
}
