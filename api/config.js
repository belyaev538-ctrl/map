const { MAP_STATUSES } = require("../lib/map-statuses");

module.exports = function handler(_req, res) {
  return res.json({
    yandexApiKey: process.env.YANDEX_MAPS_API_KEY || "",
    mapStatuses: MAP_STATUSES,
  });
};
