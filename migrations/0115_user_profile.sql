-- Optional profile details: the name and home address a person can save to prefill forms. `users.name` already exists.
ALTER TABLE users ADD COLUMN street TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN city TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN zip TEXT NOT NULL DEFAULT '';
