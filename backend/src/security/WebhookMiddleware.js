export const verifyWebhookSecret = (req, res, next) => {
  const secret = req.headers["x-internal-secret"];
  if (secret !== process.env.WEBHOOK_SECRET_KEY) {
    return res.status(403).json({ message: "Forbidden: Invalid Secret" });
  }
  next();
};
