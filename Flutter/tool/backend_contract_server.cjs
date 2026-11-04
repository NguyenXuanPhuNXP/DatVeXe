// Runs the real web Express app on an ephemeral local port, without workers.
// Checks below use only pre-database validation and authentication paths.
const path = require('node:path');
const backend = path.resolve(process.argv[2]);
require(path.join(backend, 'node_modules/dotenv')).config({ path: path.join(backend, '.env'), quiet: true });
const { app } = require(path.join(backend, 'src/app'));
const server = app.listen(0, '127.0.0.1', () => console.log('CONTRACT_PORT=' + server.address().port));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
