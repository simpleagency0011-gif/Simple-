/**
 * Strict Input Schema Validator
 * 
 * Rejection Policy:
 * Rejects any payload that does NOT strictly adhere to type, length, and format constraints.
 * Disallows unknown properties (mass assignment prevention).
 * Returns early with 400 Bad Request — never silently ignores or partially escapes bad inputs.
 */

// Universal Regex Patterns
const REGEX_PATTERNS = {
  NAME: /^[a-zA-Z\s.'-]{2,100}$/,
  PHONE: /^\+?[0-9\s-]{7,16}$/,
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
  SAFE_TEXT: /^[a-zA-Z0-9\s.,'?!@#%&()_+-]{1,300}$/,
  BUSINESS_NAME: /^[a-zA-Z0-9\s.,'&-]{2,120}$/,
  PRICE_FORMAT: /^[₹$€£\d,.\s+/a-zA-Z-]{2,50}$/,
  PASSWORD_COMPLEXITY: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&#^()_+-]{8,128}$/
};

// Approved Packages Enum
const APPROVED_PLANS = [
  'Website + AI Agent + Free Ad Run',
  'Website + Free Ad Run',
  'AI Agent + Free Ad Run',
  'Ad Campaign Management Only',
  'Website + AI Agent',
  'Custom Plan'
];

/**
 * Validate object against schema
 */
function validateSchema(data, schema, disallowUnknown = true) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Request body must be a valid JSON object.'] };
  }

  const errors = [];
  const dataKeys = Object.keys(data);
  const schemaKeys = Object.keys(schema);

  // Check for unknown keys (Mass Assignment Protection)
  if (disallowUnknown) {
    for (const key of dataKeys) {
      if (!schemaKeys.includes(key)) {
        errors.push(`Unknown or prohibited property: "${key}".`);
      }
    }
  }

  // Validate declared fields
  for (const field of schemaKeys) {
    const rules = schema[field];
    const value = data[field];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field "${field}" is required.`);
      continue;
    }

    if (value === undefined || value === null || value === '') {
      continue; // Optional field omitted
    }

    // Type check
    if (typeof value !== rules.type) {
      errors.push(`Field "${field}" must be of type ${rules.type}, received ${typeof value}.`);
      continue;
    }

    // String constraints
    if (rules.type === 'string') {
      const trimmed = value.trim();

      if (rules.minLength && trimmed.length < rules.minLength) {
        errors.push(`Field "${field}" must be at least ${rules.minLength} characters.`);
      }

      if (rules.maxLength && trimmed.length > rules.maxLength) {
        errors.push(`Field "${field}" must not exceed ${rules.maxLength} characters.`);
      }

      if (rules.enum && !rules.enum.includes(trimmed)) {
        errors.push(`Field "${field}" contains an unapproved option. Allowed: ${rules.enum.join(', ')}.`);
      }

      if (rules.regex && !rules.regex.test(trimmed)) {
        errors.push(rules.regexError || `Field "${field}" does not match required security format.`);
      }
    }

    // Number constraints
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`Field "${field}" must be greater than or equal to ${rules.min}.`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`Field "${field}" must not exceed ${rules.max}.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// 1. Booking Ingestion Schema
const bookingSchema = {
  name: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100,
    regex: REGEX_PATTERNS.NAME,
    regexError: 'Full name contains invalid characters. Use letters, spaces, and hyphens only.'
  },
  phone: {
    type: 'string',
    required: true,
    minLength: 7,
    maxLength: 16,
    regex: REGEX_PATTERNS.PHONE,
    regexError: 'Phone number format is invalid. Must contain 7 to 15 digits.'
  },
  email: {
    type: 'string',
    required: true,
    minLength: 5,
    maxLength: 120,
    regex: REGEX_PATTERNS.EMAIL,
    regexError: 'Email format is invalid.'
  },
  business: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 120,
    regex: REGEX_PATTERNS.BUSINESS_NAME,
    regexError: 'Business name contains prohibited characters.'
  },
  planName: {
    type: 'string',
    required: true,
    enum: APPROVED_PLANS
  },
  planPrice: {
    type: 'string',
    required: false,
    minLength: 2,
    maxLength: 50,
    regex: REGEX_PATTERNS.PRICE_FORMAT,
    regexError: 'Plan price format is invalid.'
  },
  note: {
    type: 'string',
    required: false,
    maxLength: 300,
    regex: REGEX_PATTERNS.SAFE_TEXT,
    regexError: 'Note contains unsupported or prohibited characters.'
  }
};

// 2. Auth Login Schema
const authLoginSchema = {
  email: {
    type: 'string',
    required: true,
    regex: REGEX_PATTERNS.EMAIL,
    regexError: 'Please provide a valid email address.'
  },
  password: {
    type: 'string',
    required: true,
    minLength: 8,
    maxLength: 128
  }
};

// 3. Auth Signup Schema
const authSignupSchema = {
  name: {
    type: 'string',
    required: true,
    regex: REGEX_PATTERNS.NAME,
    regexError: 'Name must contain only valid alphabetic characters.'
  },
  email: {
    type: 'string',
    required: true,
    regex: REGEX_PATTERNS.EMAIL,
    regexError: 'Invalid email address.'
  },
  phone: {
    type: 'string',
    required: true,
    regex: REGEX_PATTERNS.PHONE,
    regexError: 'Invalid mobile/WhatsApp phone number.'
  },
  password: {
    type: 'string',
    required: true,
    minLength: 8,
    maxLength: 128,
    regex: REGEX_PATTERNS.PASSWORD_COMPLEXITY,
    regexError: 'Password must be 8-128 characters and include at least one uppercase letter, one lowercase letter, and one number.'
  }
};

// 4. Password Reset Schema
const authResetPasswordSchema = {
  email: {
    type: 'string',
    required: true,
    regex: REGEX_PATTERNS.EMAIL,
    regexError: 'Invalid email address.'
  }
};

module.exports = {
  validateSchema,
  bookingSchema,
  authLoginSchema,
  authSignupSchema,
  authResetPasswordSchema,
  APPROVED_PLANS
};
