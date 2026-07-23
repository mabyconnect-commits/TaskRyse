// Vercel Serverless Function entry for the Taskryse API.
//
// On Vercel there is no long-lived `app.listen()` — instead the platform invokes an
// exported (req, res) handler per request. An Express app instance *is* such a handler,
// so we build it once (reused across warm invocations) and export it.
//
// vercel.json rewrites every /api/* request to this function; the Express app mounts
// its routes at /api/v1, so req.url like "/api/v1/tasks" matches unchanged.
const { createApp } = require('../src/app');

const app = createApp();

module.exports = app;
