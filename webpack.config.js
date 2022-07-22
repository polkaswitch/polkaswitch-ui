const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const SentryWebpackPlugin = require('@sentry/webpack-plugin');
require('dotenv').config();

const outputDirectory = 'dist';

module.exports = (env) => {
  console.log(env);
  console.log(`ENV: IS_MAIN_NETWORK: ${process.env.IS_MAIN_NETWORK}`);
  console.log(`ENV: IS_CLAIM_DOMAIN: ${process.env.IS_CLAIM_DOMAIN}`);
  console.log(`ENV: ${process.env.HEROKU_APP_NAME}-${process.env.HEROKU_RELEASE_VERSION}`);

  const isProduction = !!env.production;
  const isMainNetwork = !!process.env.IS_MAIN_NETWORK;
  const isClaimDomain = process.env.IS_CLAIM_DOMAIN === 'true';

  if (isProduction) {
    console.log('Using PRODUCTION config');
  } else {
    console.log('Using DEVELOPMENT config');
  }

  let plugins = [
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
    new HtmlWebpackPlugin({
      template: './src/client/index.html',
      hash: false,
    }),
    new webpack.EnvironmentPlugin({
      IS_PRODUCTION: !!isProduction,
      IS_MAIN_NETWORK: isMainNetwork,
      IS_CLAIM_DOMAIN: isClaimDomain,
      SENTRY_JS_DSN: false,
      HEROKU_RELEASE_VERSION: false,
      HEROKU_APP_NAME: false,
    }),
    new NodePolyfillPlugin(),
  ];

  if (isProduction && process.env.HEROKU_APP_NAME && process.env.SENTRY_AUTH_TOKEN) {
    plugins.push(
      new SentryWebpackPlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: 'swing-xyz',
        project: 'frontend',
        release: process.env.HEROKU_APP_NAME + '-' + process.env.HEROKU_RELEASE_VERSION,
        deploy: {
          env: isMainNetwork ? 'production' : 'development',
        },
        dryRun: !isProduction,

        // webpack-specific configuration
        include: './dist',
      }),
    );
  } else {
    console.log('Sentry not configured - skipped');
  }

  return {
    entry: ['babel-polyfill', './src/client/js/index.js'],
    output: {
      path: path.join(__dirname, outputDirectory),
      filename: 'bundle.[contenthash].js',
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
          },
        },
        {
          test: /\.(scss|css)$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
              },
            },
          ],
        },
        {
          test: /\.(png|jpg|gif|woff|woff2|eot|ttf|otf|svg)$/,
          use: ['file-loader'],
        },
      ],
    },
    resolve: {
      extensions: ['*', '.js', '.jsx'],
      fallback: {
        fs: false,
        net: false,
        tls: false,
      },
    },
    devServer: {
      port: 3000,
      open: true,
      historyApiFallback: true,
      proxy: {
        '/api': 'http://localhost:8080',
      },
    },
    devtool: isProduction ? 'source-map' : 'inline-source-map',
    plugins: plugins,
    experiments: {
      topLevelAwait: true,
    },
  };
};
