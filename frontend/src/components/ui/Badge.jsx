export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-slate-700 text-slate-300',
    success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    error: 'bg-red-500/10 text-red-500 border border-red-500/20',
    info: 'bg-sky-500/10 text-sky-500 border border-sky-500/20',
    primary: 'bg-primary-500/10 text-primary-500 border border-primary-500/20'
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
