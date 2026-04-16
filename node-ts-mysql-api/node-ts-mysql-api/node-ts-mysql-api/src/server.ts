import app from './app';
import { sequelize } from './config/database';

const PORT = process.env['PORT'] ?? 4000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Sync models (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('Database synced.');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
