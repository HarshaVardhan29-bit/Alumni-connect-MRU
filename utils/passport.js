const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) return done(new Error('No email from Google'), null);

        // Check if user already exists (by googleId or email)
        let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

        if (user) {
          // Link googleId if they registered with email before
          if (!user.googleId) {
            user.googleId = profile.id;
            if (!user.avatar && profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
            }
            await user.save({ validateBeforeSave: false });
          }
          return done(null, user);
        }

        // New user — create with Google profile
        const nameParts = profile.displayName?.split(' ') || ['User'];
        user = await User.create({
          googleId:  profile.id,
          firstName: nameParts[0] || 'User',
          lastName:  nameParts.slice(1).join(' ') || '',
          email,
          avatar:    profile.photos?.[0]?.value || '',
          role:      'student', // default role
          password:  null,
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

module.exports = passport;
