const app = require('./app');
const config = require('./config');
const { initDatabase } = require('./models');

initDatabase()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Task Manager rodando em http://localhost:${config.port}`);
      console.log(`Admin padrão: ${config.admin.email} / ${config.admin.password}`);
    });
  })
  .catch((err) => {
    console.error('Falha ao conectar no PostgreSQL:', err.message);
    console.error('Confira DATABASE_URL e se o banco está de pé (docker compose up -d db).');
    process.exit(1);
  });
