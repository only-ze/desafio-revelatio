function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) return next(result.error);
    req.valid = { ...req.valid, [source]: result.data };
    next();
  };
}

module.exports = validate;
