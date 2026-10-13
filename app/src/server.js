const { createApp } = require('./app');
const port = process.env.PORT || 3000;
const server = createApp().listen(port, () =>
  console.log(JSON.stringify({ time: new Date().toISOString(), level: 'info', message: `listening on ${port}` })));

// Graceful shutdown so `docker stop` / redeploys do not drop requests
['SIGTERM', 'SIGINT'].forEach(sig => process.on(sig, () => {
  console.log(JSON.stringify({ time: new Date().toISOString(), level: 'info', message: `${sig} received, shutting down` }));
  server.close(() => process.exit(0));
}));
