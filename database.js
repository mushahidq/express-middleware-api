var sqlite3 = require('sqlite3').verbose()
var md5 = require('md5')

const DBSOURCE = "db.sqlite"

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        console.log(err.message)
        throw err
    }
    else {
        console.log('Connected to the SQLite database.')
        db.run(`CREATE TABLE user (
                username text PRIMARY KEY,
                name text NOT NULL,
                email text UNIQUE NOT NULL,
                password text NOT NULL,
                CONSTRAINT email_unique UNIQUE(email),
            )`, 
            (err) => {
                if(err) {

                }
                else {
                    var insert = 'INSERT INTO USER (username, name, email, password) VALUES (?, ?, ?, ?)'
                    //db.run(insert, ["user1", "user1", "user1@example.com", md5("user1123456")])
                    //db.run(insert, ["user2", "user2", "user2@example.com", md5("user2123456")])
                }
            }
        )
        db.run(`CREATE TABLE listing (
                listing_id integer PRIMARY KEY AUTOINCREMENT,
                listing_name text NOT NULL,
                owner text NOT NULL,
                quantity integer NOT NULL,
                price integer NOT NULL,
                rating integer NOT NULL,
                sold integer NOT NULL,
                buyer text,
                CONSTRAINT listing_unique UNIQUE(listing_name, owner),
            )`, 
            (err) => {
                if(err) {

                }
                else {
                    //var insert = 'INSERT INTO listing (listing_name, owner, quantity, price, rating, sold, buyer) VALUES (?, ?, ?, ?, ?, ?, ?)'
                }
            }
        )
    }
})