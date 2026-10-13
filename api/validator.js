/**
 * Strict Input Schema Validator for SIMPLE Agency Platform
 */

const REGEX_PATTERNS = {
  NAME: /^[a-zA-Z\s.'-]{2,100}$/,
  PHONE: /^\+?[0-9\s-]{7,18}$/,
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
  SAFE_TEXT: /^[\s\S]{0,500}$/
};

function validateSchema(data, schema, disallowUnknown = false) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Request body must be a valid JSON object.'] };
  }

  const errors = [];
  const schemaKeys = Object.keys(schema);

  for (const field of schemaKeys) {
    const rules = schema[field];
    const value = data[field];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field "${field}" is required.`);
      continue;
    }

    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (typeof value !== rules.type) {
      errors.push(`Field "${field}" must be of type ${rules.type}, received ${typeof value}.`);
      continue;
    }

    if (rules.type === 'string') {
      const trimmed = value.trim();

      if (rules.minLength && trimmed.length < rules.minLength) {
        errors.push(`Field "${field}" must be at least ${rules.minLength} characters.`);
      }

      if (rules.maxLength && trimmed.length > rules.maxLength) {
        errors.push(`Field "${field}" must not exceed ${rules.maxLength} characters.`);
      }

      if (rules.regex && !rules.regex.test(trimmed)) {
        errors.push(rules.regexError || `Field "${field}" format is invalid.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

const bookingSchema = {
  name: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100,
    regex: REGEX_PATTERNS.NAME,
    regexError: 'Full name contains invalid characters. Use letters and spaces only.'
  },
  phone: {
    type: 'string',
    required: true,
    minLength: 7,
    maxLength: 18,
    regex: REGEX_PATTERNS.PHONE,
    regexError: 'Phone/WhatsApp number format is invalid.'
  },
  email: {
    type: 'string',
    required: false,
    maxLength: 120,
    regex: REGEX_PATTERNS.EMAIL,
    regexError: 'Email format is invalid.'
  },
  service: {
    type: 'string',
    required: false,
    maxLength: 150
  },
  planName: {
    type: 'string',
    required: false,
    maxLength: 150
  },
  platformOption: {
    type: 'string',
    required: false,
    maxLength: 80
  },
  message: {
    type: 'string',
    required: false,
    maxLength: 500,
    regex: REGEX_PATTERNS.SAFE_TEXT
  }
};

module.exports = {
  validateSchema,
  bookingSchema,
  REGEX_PATTERNS
};
