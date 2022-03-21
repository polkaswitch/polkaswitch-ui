const fetchWithRetry = (url, options = {}, retries) =>
  fetch(url, options)
    .then((res) => {
      if (res.ok) {
        return res.json();
      }
      if (retries > 0) {
        return fetchWithRetry(url, options, retries - 1);
      }
      throw new Error(res.status);
    })
    .catch((error) => console.error(error.message));

export default fetchWithRetry;
