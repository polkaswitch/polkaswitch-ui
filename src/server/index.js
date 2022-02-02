const express = require('express');
const cookieSession = require('cookie-session');
const helmet = require('helmet');
const csrf = require('csurf');
const os = require('os');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const morgan = require('morgan');
const flash = require('connect-flash');
const _ = require('underscore');

const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');

const passport = require('./middleware/auth');
// var redis = require('./middleware/redis');

const isProduction = process.env.NODE_ENV === 'production';
const app = express();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.IS_MAIN_NETWORK === 'true' ? 'production' : 'development',
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app }),
  ],
  release: `${process.env.HEROKU_APP_NAME}-${process.env.HEROKU_RELEASE_VERSION}`,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

// RequestHandler creates a separate execution context using
// domains, so that every transaction/span/breadcrumb is
// attached to its own Hub instance
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.use(morgan('dev'));

if (isProduction) {
  app.use(helmet({ contentSecurityPolicy: false }));
}

let defaultCsp;

if (isProduction) {
  defaultCsp = helmet.contentSecurityPolicy.getDefaultDirectives();
} else {
  defaultCsp = _.omit(helmet.contentSecurityPolicy.getDefaultDirectives(), 'upgrade-insecure-requests');
}

app.use(
  cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    cookie: {
      secure: true,
      httpOnly: true,
    },
  }),
);

app.use(flash());
app.use(compression());
app.enable('trust proxy');

// force HTTPS
if (process.env.FORCE_HTTPS) {
  app.use((request, response, next) => {
    if (isProduction && !request.secure) {
      return response.redirect(`https://${request.headers.host}${request.url}`);
    }

    next();
  });
}

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');

// Bodyparser middleware, extended false does not allow nested payloads
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/health', (req, res) => {
  const data = {
    uptime: process.uptime(),
    message: 'Ok',
    date: new Date(),
  };

  res.status(200).send(data);
});

if (process.env.HTTP_PASSWORD) {
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/debug', (req, res) => {
    throw new Error('Test Error');
  });

  app.get('/login', (req, res, next) => {
    res.render('pages/login', { messages: req.flash('error') });
  });

  app.post(
    '/login',
    passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/login',
      failureFlash: 'Invalid access credentials',
    }),
  );

  app.get('*', (req, res, next) => {
    if (req.user) {
      next();
    } else {
      res.redirect('/login');
    }
  });

  app.use((req, res, next) => {
    if (req.user) {
      next();
    } else {
      res.status(401).send({ error: 'not authenticated' });
    }
  });
}

app.use(express.static('dist'));
app.use(express.static('public'));

app.use('*', function (req, res) {
  var indexPath = path.join(__dirname, '../../', '/dist/index.html');

  fs.access(indexPath, fs.F_OK, (err) => {
    if (err) {
      console.error(err);

      return res.status(404).send({
        status: 404,
        error: !isProduction
          ? '/dist/index.html not found. Please make sure to run `npm run watch` for local development'
          : '/dist/index.html not found',
      });
    }

    res.sendFile(indexPath);
  });
});

app.use(function onNotFound(req, res, next) {
  res.status(404).send({
    status: 404,
    error: 'not found',
  });
});

// The error handler must be before any other error
// middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send({
    status: 500,
    error: 'crash - (X_X)',
    message: !isProduction ? err : 'n/a',
  });
});

const server = app.listen(process.env.PORT || 5000, () => {
  console.log(`ENV: IS_MAIN_NETWORK: ${process.env.IS_MAIN_NETWORK}`);
  console.log(`ENV: ${process.env.HEROKU_APP_NAME}-${process.env.HEROKU_RELEASE_VERSION}`);
  console.log(`Listening on port ${process.env.PORT || 5000}!`);
});

process.on('SIGTERM', () => {
  console.debug('SIGTERM signal received: closing HTTP server');
  server.close((err) => {
    console.debug('HTTP server closed');
    process.exit(err ? 1 : 0);
  });
});
