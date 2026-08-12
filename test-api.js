async function test() {
  try {
    // Login
    const loginRes = await fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@plagcontrol.com',
        password: 'Admin123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login success');

    // Get products
    const res = await fetch('http://localhost/api/productos-catalogo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('Products:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
