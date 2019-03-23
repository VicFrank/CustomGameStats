const fetch = require("node-fetch");

/*
  Example Response:
  "creator": "76561198112644306",
  "creator_app_id": 570,
  "consumer_app_id": 570,
  "filename": "",
  "file_size": 5506307,
  "file_url": "",
  "hcontent_file": "7500733117981047481",
  "preview_url": "https://steamuserimages-a.akamaihd.net/ugc/949597907476183662/BADFC8E52F7C724DBA32E40ACB7789875C14A206/",
  "hcontent_preview": "949597907476183662",
  "title": "Dota 2 but everything has global range and no vision",
  "description": "All right-click attacks, targetable abilities and items have global range. All unit vision is set to 100. Ward vision is 300.\nTPs also have global range and are cheaper.\n\nThis is my very first game mode that I made after seeing Baumi's tutorial. Hope you  like it!",
  "time_created": 1547417360,
  "time_updated": 1547571186,
  "visibility": 0,
  "banned": 0,
  "ban_reason": "",
  "subscriptions": 2617,
  "favorited": 109,
  "lifetime_subscriptions": 3120,
  "lifetime_favorited": 129,
  "views": 19586,
  "tags": [
    {
        "tag": "Custom Game"
    }
  ]
*/
const GetPublishedFileDetails = async gameid => {
  try {
    const url = `https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/?`;

    let result = await fetch(url, {
      method: "POST",
      body: `itemcount=1&publishedfileids[0]=${gameid}`,
      headers: { "Content-type": "application/x-www-form-urlencoded" }
    });

    const resultJSON = await result.json();
    const response = resultJSON.response;

    if (response.result && response.result == 1) {
      const publishedfiledetails = response.publishedfiledetails[0];
      return publishedfiledetails;
    } else {
      console.log("Couldn't find publishedfiledetails");
      return;
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = GetPublishedFileDetails;
