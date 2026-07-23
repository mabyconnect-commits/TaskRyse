// Parse and validate a request body against a zod schema, throwing a ZodError
// (handled centrally) on failure.
function parseBody(schema, body) {
  return schema.parse(body || {});
}

module.exports = { parseBody };
