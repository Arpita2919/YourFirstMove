import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile, VerifyCallback } from 'passport-google-oauth20';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User';
import ProductivityStreak from '../models/ProductivityStreak';
import UserPreference from '../models/UserPreference';
import authService from './AuthService';
import logger from '../config/logger';

export interface OAuthProfile {
  provider: 'google' | 'linkedin' | 'github';
  id: string;
  email: string;
  name: string;
  avatar?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export class OAuthService {
  constructor() {
    this.initializeStrategies();
    logger.info('OAuthService initialized');
  }

  /**
   * Initialize all OAuth strategies
   */
  private initializeStrategies(): void {
    logger.info('Initializing OAuth strategies...');
    
    // Google OAuth Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      logger.info('Configuring Google OAuth strategy');
      passport.use(
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
            scope: ['profile', 'email'],
          },
          async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: VerifyCallback) => {
            try {
              const oauthProfile: OAuthProfile = {
                provider: 'google',
                id: profile.id,
                email: profile.emails?.[0]?.value || '',
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
                accessToken,
                refreshToken,
                expiresAt: refreshToken ? new Date(Date.now() + 3600 * 1000) : undefined,
              };
              
              const user = await this.handleOAuthLogin(oauthProfile);
              done(null, user);
            } catch (error) {
              done(error as Error);
            }
          }
        )
      );
      logger.info('Google OAuth strategy configured successfully');
    } else {
      logger.warn('Google OAuth credentials not found in environment variables');
    }

    // LinkedIn OAuth Strategy
    if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
      logger.info('Configuring LinkedIn OAuth strategy');
      passport.use(
        new LinkedInStrategy(
          {
            clientID: process.env.LINKEDIN_CLIENT_ID,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
            callbackURL: `${process.env.BACKEND_URL}/api/auth/linkedin/callback`,
            scope: ['r_emailaddress', 'r_liteprofile'],
          },
          async (accessToken: string, refreshToken: string, profile: any, done: any) => {
            try {
              const oauthProfile: OAuthProfile = {
                provider: 'linkedin',
                id: profile.id,
                email: profile.emails?.[0]?.value || '',
                name: profile.displayName,
                avatar: profile.photos?.[0]?.value,
                accessToken,
                refreshToken,
                expiresAt: refreshToken ? new Date(Date.now() + 3600 * 1000) : undefined,
              };
              
              const user = await this.handleOAuthLogin(oauthProfile);
              done(null, user);
            } catch (error) {
              done(error as Error);
            }
          }
        )
      );
      logger.info('LinkedIn OAuth strategy configured successfully');
    } else {
      logger.warn('LinkedIn OAuth credentials not found in environment variables');
    }

    // GitHub OAuth Strategy
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      logger.info('Configuring GitHub OAuth strategy');
      passport.use(
        new GitHubStrategy(
          {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: `${process.env.BACKEND_URL}/api/auth/github/callback`,
            scope: ['user:email'],
          },
          async (accessToken: string, refreshToken: string, profile: any, done: any) => {
            try {
              const oauthProfile: OAuthProfile = {
                provider: 'github',
                id: profile.id,
                email: profile.emails?.[0]?.value || '',
                name: profile.displayName || profile.username || '',
                avatar: profile.photos?.[0]?.value,
                accessToken,
                refreshToken,
                expiresAt: refreshToken ? new Date(Date.now() + 3600 * 1000) : undefined,
              };
              
              const user = await this.handleOAuthLogin(oauthProfile);
              done(null, user);
            } catch (error) {
              done(error as Error);
            }
          }
        )
      );
      logger.info('GitHub OAuth strategy configured successfully');
    } else {
      logger.warn('GitHub OAuth credentials not found in environment variables');
    }
    
    logger.info('OAuth strategies initialization complete');
  }

  /**
   * Handle OAuth login - Create new user or link to existing account
   * This implements the critical user linking logic
   */
  async handleOAuthLogin(profile: OAuthProfile): Promise<User> {
    try {
      logger.info(`OAuth login attempt: ${profile.provider} - ${profile.email}`);

      // Step 1: Check if user exists with this OAuth provider and ID
      let user = await User.query()
        .findOne({
          oauth_provider: profile.provider,
          oauth_id: profile.id,
        });

      if (user) {
        // User exists with this OAuth account - update tokens
        logger.info(`Existing OAuth user found: ${user.email}`);
        user = await this.updateOAuthTokens(user, profile);
        return user;
      }

      // Step 2: Check if user exists with this email (account linking scenario)
      user = await User.query().findOne({ email: profile.email });

      if (user) {
        // Email exists - Link OAuth account to existing user
        logger.info(`Linking OAuth account to existing user: ${user.email}`);
        
        // Check if user already has a different OAuth provider
        if (user.oauth_provider && user.oauth_provider !== profile.provider) {
          throw new Error(
            `This email is already linked to ${user.oauth_provider}. Please use that provider to sign in.`
          );
        }

        // Link OAuth account
        user = await user.$query().patchAndFetch({
          oauth_provider: profile.provider,
          oauth_id: profile.id,
          oauth_access_token: profile.accessToken,
          oauth_refresh_token: profile.refreshToken,
          oauth_token_expires_at: profile.expiresAt,
          avatar_url: profile.avatar || user.avatar_url,
        });

        return user;
      }

      // Step 3: Create new user with OAuth account
      logger.info(`Creating new OAuth user: ${profile.email}`);
      user = await this.createOAuthUser(profile);
      
      return user;
    } catch (error) {
      logger.error('OAuth login error:', error);
      throw error;
    }
  }

  /**
   * Create a new user from OAuth profile
   */
  private async createOAuthUser(profile: OAuthProfile): Promise<User> {
    // Create user
    const user = await User.query().insertAndFetch({
      email: profile.email,
      name: profile.name,
      oauth_provider: profile.provider,
      oauth_id: profile.id,
      oauth_access_token: profile.accessToken,
      oauth_refresh_token: profile.refreshToken,
      oauth_token_expires_at: profile.expiresAt,
      avatar_url: profile.avatar,
      password_hash: undefined, // No password for OAuth users
    });

    // Create default productivity streak
    await ProductivityStreak.query().insert({
      user_id: user.id,
      current_streak: 0,
      longest_streak: 0,
    });

    // Create default preferences
    await UserPreference.query().insert({
      user_id: user.id,
      theme: 'light',
      notification_enabled: true,
      notification_timing: 30,
    });

    logger.info(`OAuth user created: ${user.email} via ${profile.provider}`);
    return user;
  }

  /**
   * Update OAuth tokens for existing user
   */
  private async updateOAuthTokens(user: User, profile: OAuthProfile): Promise<User> {
    return user.$query().patchAndFetch({
      oauth_access_token: profile.accessToken,
      oauth_refresh_token: profile.refreshToken || user.oauth_refresh_token,
      oauth_token_expires_at: profile.expiresAt,
      avatar_url: profile.avatar || user.avatar_url,
    });
  }

  /**
   * Generate JWT token for OAuth user
   */
  generateToken(userId: number): string {
    return authService.generateToken(userId);
  }
}

// Create and export singleton instance - this triggers initialization
const oauthServiceInstance = new OAuthService();
export default oauthServiceInstance;
