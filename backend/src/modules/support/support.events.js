const { EventEmitter } = require("node:events");

// shortcut: events stay in one API process; use a shared pub/sub before running multiple instances.
const supportEvents = new EventEmitter();
module.exports = { supportEvents };
