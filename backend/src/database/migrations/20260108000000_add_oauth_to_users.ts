import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // OAuth provider fields
    table.string('oauth_provider', 50).nullable().comment('OAuth provider: google, linkedin, github');
    table.string('oauth_id', 255).nullable().comment('OAuth provider user ID');
    table.text('oauth_access_token').nullable().comment('OAuth access token (encrypted)');
    table.text('oauth_refresh_token').nullable().comment('OAuth refresh token (encrypted)');
    table.timestamp('oauth_token_expires_at').nullable().comment('OAuth token expiration');
    table.string('avatar_url', 500).nullable().comment('User profile picture URL');
    
    // Make password optional for OAuth users
    table.string('password_hash', 255).nullable().alter();
    
    // Add indexes for OAuth lookups
    table.index(['oauth_provider', 'oauth_id'], 'idx_oauth_provider_id');
    table.index('email', 'idx_email');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropIndex(['oauth_provider', 'oauth_id'], 'idx_oauth_provider_id');
    table.dropIndex('email', 'idx_email');
    
    table.dropColumn('oauth_provider');
    table.dropColumn('oauth_id');
    table.dropColumn('oauth_access_token');
    table.dropColumn('oauth_refresh_token');
    table.dropColumn('oauth_token_expires_at');
    table.dropColumn('avatar_url');
    
    // Restore password_hash as required
    table.string('password_hash', 255).notNullable().alter();
  });
}
