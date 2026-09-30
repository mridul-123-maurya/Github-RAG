const express = require("express");
const { searchRepository } = require("../controllers/searchController");

const router = express.Router();

router.post("/search", searchRepository);

module.exports = router;
