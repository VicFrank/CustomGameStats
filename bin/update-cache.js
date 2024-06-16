const fetch = require("node-fetch");
// send a request to the homepage to update the cache

let hitHomepage = async () => {
  const route = "https://www.customgamestats.com/";

  try {
    const response = await fetch(route);
    console.log("Cache updated");
  } catch (error) {
    console.log("Error updating cache");
  }
};

(async function () {
  await hitHomepage();
})();
