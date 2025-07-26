const { verifyToken } = require("@clerk/clerk-sdk-node");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const payload = await verifyToken(token, {
      secretKey: "sk_test_IFPyaWZUpB4GjtxnehFwaGeTyBA4NB0S3UhEedcHD1",
    });
    req.auth = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
