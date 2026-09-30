const express = require("express");
const { askQuestion } = require("../controllers/askController");

const router = express.Router();

router.post("/ask", askQuestion);

module.exports = router;
