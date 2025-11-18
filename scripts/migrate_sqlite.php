<?php
// scripts/migrate_sqlite.php
// Run migrations to align sqlite schema with expected structures.
require_once __DIR__ . '/../sqlite_helper.php';
require_once __DIR__ . '/../log.php';

app_log('INFO', 'Starting SQLite migrations');
$db = sqlite_init();

// Migrate variant.lots into lots table
$result = sqlite_migrate_variant_lots();
if ($result) app_log('INFO', 'Migrated variant lots into lots table');
else app_log('WARN', 'No variant lots migrated or migration failed');

// Migrate users -> profiles
$result2 = sqlite_migrate_users_to_profiles();
if ($result2) app_log('INFO', 'Migrated users to profiles');
else app_log('WARN', 'No users migrated or migration failed');

echo "Migration complete\n";

?>