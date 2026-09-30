const app = require("./app");
const { PORT } = require("./config/env");

app.listen(PORT, () => {
    console.log(`GitHub RAG backend server running on http://localhost:${PORT}`);
});
