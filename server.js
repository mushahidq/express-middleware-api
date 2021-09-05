const express = require("express")
const db = require("./database.js")
const middleware = require("./middleware.js")
const md5 = require("md5")
const multer = require("multer")
const fs = require("fs")
const cors = require("cors")
const helmet = require("helmet")
const morgan = require("morgan")

const tokenSecret = "some-secret-token"

var upload = multer({dest: "./tmp/"})

var app = express()
app.use(express.urlencoded({ extended: true}))
app.use(express.json())
app.use(helmet())
app.use(cors())
app.use(morgan('combined'))

var HTTP_PORT = 8000

function generateToken(user) {
    return jwt.sign({data: user}, tokenSecret, {expiresIn: '24h'})
}

app.listen(HTTP_PORT, () => {
    console.log(`Server running on port ${HTTP_PORT}`)
})

app.get("/", (req, res, next) => {
    res.json({"message": "Ok"})
})

//login
app.post("/login", (req, res) => {
    if (!req.body.username) {
        res.status(400).json({"error": "no username or email provided"});
        return;
    }
    if (!req.body.password) {
        res.status(400).json({"error": "no password provided"});
        return;
    }
    var sql = "select * from user where username = ? and password = ?"
    var params = [req.body.username, req.body.username]
    db.get(sql, params, (err, row) => {
        if (err) {
          res.status(400).json({"error": "error authenticating"});
          return;
        }
        else {
            if (md5(req.body.password) == row.password){
                user = {
                    email: row.email,
                    username: row.username                    
                }
                res.status(200).json({"token": generateToken(user)})
            }
            else
                res.status(403).json({"error": "incorrect password"});
        }
      });
})

//create a new user i.e. signup
app.post("/signup", (req, res, next) => {
    var errors = []
    if (!req.body.username) {
        errors.push("No username provided")
    }
    if (!req.body.email) {
        errors.push("No email provided")
    }
    if (!req.body.password) {
        errors.push("No password provided")
    }
    if (!req.body.name) {
        errors.push("No name provided")
    }
    if (errors.length){
        res.status(400).json({"error":errors.join(",")});
        return;
    }

    var data = {
        username: req.body.username,
        email: req.body.email,
        password: md5(req.body.password),
        name: req.body.name
    }

    var insert = 'INSERT INTO user (username, name, email, password) VALUES (?, ?, ?, ?)'
    var params = [data.username, data.name, data.email, data.password]
    db.run(insert, params, (err, result) => {
        if (err) {
            res.status(400).json({"error": err.message})
            return
        }
        user = {
            email: data.email,
            username: data.username,
            
        }
        res.status(200).json({"token": generateToken(user)})
        console.log(result)
    })
})

/* Endpoints for users */

//get all users
app.get("/api/users", (req, res, next) => {
    var sql = "select * from user"
    var params = []
    db.all(sql, params, (err, rows) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
      });
});

//get a single user with jwt token
app.get("/api/user/", middleware.verify, (req, res, next) => {
    var sql = "select * from user where username = ?"
    var params = [req.user.username]
    db.get(sql, params, (err, row) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":row
        })
      });
});

//update a user
app.patch("/api/user/:username", (req, res, next) => {
    var data = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password ? md5(req.body.password) : null,
        name: req.body.name ? req.body.name : null
    }
    db.run(`UPDATE user set
        username = COALESCE(?,username), 
        email = COALESCE(?,email), 
        password = COALESCE(?,password),
        name = COALESCE(?,name)
        WHERE username=?`,
        [data.username, data.email, data.password, req.body.name, req,params.username],
        function (err, result) {
            if (err){
                res.status(400).json({"error": res.message})
                return;
            }
            res.json({
                message: "success",
                data: data,
                changes: this.changes
            })
        }
    )
})

//delete the user with jwt token
app.delete("/api/user/", middleware.verify, (req, res, next) => {
    db.run(
        'DELETE FROM user WHERE username = ?',
        req.user.username,
        function (err, result) {
            if (err){
                res.status(400).json({"error": res.message})
                return;
            }
            res.json({"message":"deleted", changes: this.changes})
    });
})

/* Endpoints for listings */

//get all listings which are not sold
app.get("/api/listings", (req, res, next) => {
    var sql = "select * from listing where sold = 0"
    var params = []
    db.all(sql, params, (err, rows) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
      });
});

//get a listing with an id
app.get("/api/listing/:id", (req, res, next) => {
    var sql = "select * from listing where id = ?"
    var params = [req.params.id]
    db.get(sql, params, (err, row) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":row
        })
      });
});

//get all listing by current user
app.get("/api/my_listing/", middleware.verify, (req, res, next) => {
    var sql = "select * from listing where owner = ?"
    var params = [req.user.username]
    db.all(sql, params, (err, rows) => {
        if (err) {
          res.status(400).json({"error":err.message});
          return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
      });
});

//create a new listing
app.post("/api/listing", upload.single('file'), (req, res, next) => {
    var errors = []
    if (!req.body.name) {
        errors.push("No name provided")
    }
    if (!req.body.owner) {
        errors.push("No owner provided")
    }
    if (!req.body.quantity) {
        errors.push("No quantity provided")
    }
    if (!req.body.price) {
        errors.push("No price provided")
    }
    if (!req.file) {
        errors.push("No image provided")
    }
    let rating = getRating()

    var data = {
        name: req.body.name,
        owner: req.body.owner,
        quantity: req.body.quantity,
        price: req.body.price,
        rating: rating,
    }

    var insert = 'INSERT INTO listing (listing_name, owner, quantity, price, rating, sold, buyer) VALUES (?, ?, ?, ?, ?, 0, null)'
    var params = [data.name, data.owner, data.quantity, data.price, data.rating]
    db.run(insert, params, function(err, result) {
        if (err) {
            res.status(400).json({"error": err.message})
            return
        }
        var file = __dirname + '/' + this.lastID;
        fs.rename(req.file.path, file, function(err) {
            if (err) {
                console.log(err);
                res.send(500);
            }
            else {
            }
        });
        res.json({
            "message": "success",
            "data": data,
            "listing_id": this.lastID
        })
    })
    console.log(result)
})

//update a listing
app.patch("/api/listing/:listing_id", (req, res, next) => {
    var data = {
        name: req.body.name,
        price: req.body.price ? req.body.price : null,
        quantity: req.body.quantity ? req.body.quantity : null
    }
    db.run(`UPDATE user set
        listing_name = COALESCE(?,listing_name), 
        quantity = COALESCE(?,quantity), 
        price = COALESCE(?,price),
        WHERE listing_id=?`,
        [data.name, data.quantity, data.price, req,params.listing_id],
        function (err, result) {
            if (err){
                res.status(400).json({"error": res.message})
                return;
            }
            res.json({
                message: "success",
                data: data,
                changes: this.changes
            })
        }
    )
})

//delete a listing
app.delete("/api/listing/:listing_id", middleware.verify, (req, res, next) => {
    db.run(
        'DELETE FROM listing WHERE listing_id = ? and owner = ?',
        [req.params.listing_id, req.user.username],
        function (err, result) {
            if (err){
                res.status(400).json({"error": res.message})
                return;
            }
            res.json({"message":"deleted", changes: this.changes})
    });
})

//mark a listing as sold
app.get("/api/listing/sold/:listingid", (req, res, next) => {
    db.run(`UPDATE user set
        sold = 1,
        buyer = ?
        WHERE listing_id=?`,
        [req.user.username, req,params.listingid],
        function (err, result) {
            if (err){
                res.status(400).json({"error": this.message})
                return;
            }
            res.json({
                message: "success",
                data: data,
                changes: this.changes
            })
        }
    )
})

app.use((req, res) => {
    res.status(404)
})

