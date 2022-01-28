window.Metrics = {
  identify(userid) {
    if (window.mixpanel) {
      window.mixpanel.identify(userid);
    }
  },

  track(key, props) {
    if (window.mixpanel) {
      window.mixpanel.track(key, props);
    }
  },
};

export default window.Metrics;
