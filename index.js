const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const articleCollection = client.db("Newsportal").collection("articles");
    const declineCollection = client.db("Newsportal").collection("declines");
    const publisherCollection = client
      .db("Newsportal")
      .collection("publishers");

    //====================!users api========================

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

    //!make Admin users
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //!get single user by email
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;

      if (user) {
        admin = user.role == "admin";
      }
      res.send({ admin });
    });

    //====================!articles api========================

    //!articles post
    app.post("/articles", async (req, res) => {
      const article = req.body;
      const result = await articleCollection.insertOne(article);
      res.send(result);
    });

    //!decline post
    app.post("/declines", async (req, res) => {
      const article = req.body;
      const result = await declineCollection.insertOne(article);
      res.send(result);
    });
    //!decline get
    app.get("/declines", async (req, res) => {
      const result = await declineCollection.find().toArray();
      res.send(result);
    });

    //!get article
    app.get("/articles", async (req, res) => {
      const result = await articleCollection.find().toArray();
      res.send(result);
    });

    //!status update
    app.patch("/articles/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: data.status,
        },
      };
      const result = await articleCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //====================!my article api======================
    app.get("/articles/myarticle", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };

      const result = await articleCollection.find(query).toArray();
      res.send(result);
    });

    //====================!Admin routes========================

    //====================!publisher api========================

    //!post publisher info
    app.post("/publishers", async (req, res) => {
      const publisher = req.body;
      const result = await publisherCollection.insertOne(publisher);
      res.send(result);
    });

    //!get publisher
    app.get("/publishers", async (req, res) => {
      const result = await publisherCollection.find().toArray();
      res.send(result);
    });

    //====================!admin article api========================

    //!delete articles
    app.delete("/articles/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articleCollection.deleteOne(query);
      res.send(result);
    });

    // //!approved articles
    app.patch("/articles/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;

      const query = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          status: data.status,
        },
      };
      const result = await articleCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //!get approved articles
    app.get("/article/approve", async (req, res) => {
      const query = { status: "approve" };
      const result = await articleCollection.find(query).toArray();
      res.send(result);
    });

    //!make premium articles
    app.patch("/articles/premium/:id", async (req, res) => {
      const id = req.params.id;
      const articles = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          Quality: "premium",
        },
      };
      const result = await articleCollection.updateOne(query, updateDoc);
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
