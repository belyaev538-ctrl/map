const projectsHandler = require("./projects");

module.exports = async function handler(req, res) {
  return projectsHandler(req, res);
};
