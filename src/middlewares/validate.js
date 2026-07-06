const R = require('../utils/response');

const validate = (schema, target = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[target], { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
    return R.error(res, 'Validation failed', errors, 422);
  }
  req[target] = value;
  next();
};

module.exports = validate;
