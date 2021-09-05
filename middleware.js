const jwt = require("jsonwebtoken")
const tokenSecret = "some-secret-token"

exports.verify = (req, res, next) => {
    const token = req.headers.authorization
    if (!token)
        res.status(403).json({"error": "no token provided"})
    else {
        jwt.verify(token.split(" ")[1], tokenSecret, (err, value) => {
            if (err)
                res.status(500).json({"error": "failed to authenticate token"})
            req.username = value.data
            next()
        })
    }
}