const { createApp } = require('./app');
const config = require('./lib/config');
const prisma = require('./lib/prisma');

const app = createApp();

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Taskryse API listening on :${config.port} (${config.nodeEnv})`);
});

async function shutdown() {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
