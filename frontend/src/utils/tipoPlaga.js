// src/utils/tipoPlaga.js
export const parseTipoPlaga = (valor) => {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor;
    if (typeof valor === 'string') {
      const limpio = valor.replace(/^{|}$/g, '');
      if (!limpio) return [];
      return limpio.split(',').map(v => v.replace(/^"|"$/g, '').trim());
    }
    return [];
  };