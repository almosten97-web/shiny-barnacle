INSERT INTO roles (name) VALUES ('admin'), ('user');

INSERT INTO permissions (name) VALUES ('read:own_profile'), ('write:own_profile'), ('read:all_profiles'), ('write:all_profiles');

INSERT INTO role_permissions (role_id, permission_id)
SELECT
  r.id AS role_id,
  p.id AS permission_id
FROM
  roles r
CROSS JOIN
  permissions p
WHERE
  (r.name = 'admin') OR
  (r.name = 'user' AND p.name LIKE '%own_profile');
