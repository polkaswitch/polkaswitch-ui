const express = require('express');
const cookieSession = require('cookie-session');
const helmet = require('helmet');
var csrf = require('csurf');
const os = require('os');
var compression = require('compression');
var morgan = require('morgan');
var flash = require('connect-flash');
var _ = require('underscore');

var Sentry = require('@sentry/node');
var Tracing = require('@sentry/tracing');

var passport = require('./middleware/auth');

const isProduction = (process.env.NODE_ENV === 'production');
const app = express();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app }),
  ],

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

var defaultCsp;

if (isProduction) {
  defaultCsp = helmet.contentSecurityPolicy.getDefaultDirectives();
} else {
  defaultCsp = _.omit(
    helmet.contentSecurityPolicy.getDefaultDirectives(),
    'upgrade-insecure-requests'
  );
}

app.use(helmet.contentSecurityPolicy({
  directives: {
    ...defaultCsp,
    "img-src": ["'self'", "public-api.freshstatus.io"],
    "font-src": [
      "'self'",
      "https:",
      "data:",
      "fonts.gstatic.com"
    ],
    "style-src": [
      "'self'",
      "https:",
      "'unsafe-inline'",
      "fonts.googleapis.com"
    ],
    "script-src": [
      "'self'", "blob:",
      "cdn.polyfill.io",
      "*.mxpnl.com",
      "*.mixpanel.com",
      // mixpanel script
      "'sha256-Ek6kJj5tJB6qdv7Ix1leD6oYPx929aOB8lylPKsTDlE='"
    ],
    "default-src": [
      "'self'",
      "*.ingest.sentry.io"
    ]
  }
}));

app.use(cookieSession({
  name: 'session',
  keys: ['key1', 'key2'],
  cookie: {
    secure: true,
    httpOnly: true
  }
}));

app.use(flash());
app.use(compression());
app.enable('trust proxy');

// force HTTPS
app.use(function(request, response, next) {
  if (isProduction && !request.secure) {
    return response.redirect(
      "https://" + request.headers.host + request.url
    );
  }

  next();
});

app.set('views', __dirname + "/views");
app.set('view engine', 'ejs');

// Bodyparser middleware, extended false does not allow nested payloads
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(passport.initialize());
app.use(passport.session());

app.get('/', function(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.redirect('/login');
  }
});

app.get("/debug", function(req, res) {
    throw new Error("Test Error");
});

app.get('/login', function(req, res, next) {
  res.render('pages/login', { messages: req.flash('error') });
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: 'Invalid access credentials'
}));

app.use(function(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.status(401).send({ error: "not authenticated" });
  }
});

app.use(express.static('dist'));
app.use(express.static('public'));

app.use(function onNotFound(req, res, next) {
  res.status(404).send({ error: "not found" });
})

// The error handler must be before any other error
// middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

app.use(function onError(err, req, res, next) {
  console.error(err);
  res.status(500).send({ error: 'crash - (X_X)' })
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Listening on port ${process.env.PORT || 5000}!`);
});

process.on('SIGTERM', () => {
  debug('SIGTERM signal received: closing HTTP server')
  server.close(() => {
    debug('HTTP server closed')
  })
})
