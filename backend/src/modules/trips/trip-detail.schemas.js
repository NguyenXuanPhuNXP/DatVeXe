const { z } = require("zod");

const tripIdSchema = z.string().trim().min(1).max(30);

module.exports = { tripIdSchema };