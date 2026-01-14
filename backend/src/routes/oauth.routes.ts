import { Router } from 'express';
import passport from 'passport';
import oauthService from '../services/OAuthService';
import logger from '../config/logger';

const router = Router();

/**
 * Google OAuth Routes
 */
router.get(
  '/google',
  passport.authenticate('google', { session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  (req, res) => {
    try {
      const user = req.user as any;
      const token = oauthService.generateToken(user.id);
      
      logger.info(`Google OAuth success for user: ${user.email}`);
      
      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&provider=google`);
    } catch (error) {
      logger.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  }
);

/**
 * LinkedIn OAuth Routes
 */
router.get(
  '/linkedin',
  passport.authenticate('linkedin', { session: false })
);

router.get(
  '/linkedin/callback',
  passport.authenticate('linkedin', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  (req, res) => {
    try {
      const user = req.user as any;
      const token = oauthService.generateToken(user.id);
      
      logger.info(`LinkedIn OAuth success for user: ${user.email}`);
      
      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&provider=linkedin`);
    } catch (error) {
      logger.error('LinkedIn OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  }
);

/**
 * GitHub OAuth Routes
 */
router.get(
  '/github',
  passport.authenticate('github', { session: false })
);

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  (req, res) => {
    try {
      const user = req.user as any;
      const token = oauthService.generateToken(user.id);
      
      logger.info(`GitHub OAuth success for user: ${user.email}`);
      
      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&provider=github`);
    } catch (error) {
      logger.error('GitHub OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  }
);

export default router;
