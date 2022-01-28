const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(
  new LocalStrategy((username, password, done) => {
    if (
      username == process.env.HTTP_USER
      && password == process.env.HTTP_PASSWORD
    ) {
      return done(null, 1);
    }
    return done(null, false);
  }),
);

module.exports = passport;
