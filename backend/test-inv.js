import { pool } from './src/config/database.js';
import * as service from './src/modules/productos/productos.tecnicos.service.js';

async function test() {
  try {
    const data = await service.getInventarioTecnico('27b05d73-0ae7-4617-bbb9-451085f0fecf');
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
test();
