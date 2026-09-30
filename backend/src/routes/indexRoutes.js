const express = require("express");
const { indexRepository } = require("../controllers/indexController");

const router = express.Router();

router.post("/index", indexRepository);

// Also maintain backward compatibility for old prototype route POST /api/files
router.post("/files", indexRepository);

module.exports = router;
