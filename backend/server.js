// backend/server.js
const app = require('./src/app');

// Railway assigns PORT dynamically — NEVER hardcode this
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Nofom API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
