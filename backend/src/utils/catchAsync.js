/**
 * Envuelve controladores async para delegar errores al middleware global.
 */
export function catchAsync (fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
