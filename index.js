const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const cors = require("cors");

//!middleware
app.use(cors());
app.use(express.json());

//!JWT VERIFICATION
app.verifyToken = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized-access" });
  }

  //   if (!req.headers.authorization) {
  //     return res.status(401).send({ message: "forbidden access" });
  //   }
  //   const token = req.headers.authorization.split(" ")[1];

  //   jwt.verify(token, process.env.ACCESS_SECRET, (err, decoded) => {
  //     if (err) {
  //       return res.status(401).send({ message: "forbidden access" });
  //     }
  //     req.decoded = decoded;
  //     next();
  //   });

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized-access" });
    }

    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yrssrk8.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const usersCollection = client.db("Newsportal").collection("users");

    //!sent user info in db when login
    app.post("/users", async (req, res) => {
      const users = req.body;
      const email = { email: users.email };
      
      const existingEmail = await usersCollection.findOne(email);
      
      if (existingEmail) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await usersCollection.insertOne(users);
      res.send(result);
    });

    //!get users info
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

//!JWT AUTHENTICATION
app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, secret, { expiresIn: "250h" });
  res.send({ token });
});

app.get("/", (req, res) => {
  res.send("Assignments 12 Server Side Applications");
});

//! Error Handler Api Code & middleware
app.all("*", (req, res, next) => {
  const error = new Error(`The requested url is Invalid : [${req.url}]`);
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 404).json({
    message: error.message,
  });
});

app.listen(port, () => {
  console.log(`assignment-12 running on this port :,${port}`);
});
