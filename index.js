const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const stripe = require("stripe")(process.env.ACCESS_TOKEN_SECRET);
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const cors = require("cors");

//!middleware
app.use(
  cors({
    credentials: true,
    origin: [
      "https://newspaper-website-f1698.firebaseapp.com",
      "https://newspaper-website-f1698.web.app",
      "http://localhost:5173",
    ],
  })
);
app.use(express.json());

//!JWT VERIFICATION
const verifyToken = async (req, res, next) => {
  // console.log("inside verify token", req.headers);

  if (!req.headers.authorization) {
    return res.status(401).send({ message: "forbidden access" });
  }
  const token = req.headers.authorization.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
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

    app.get("/details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articleCollection.findOne(query);
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

    //====================!premium article api======================

    //!===================premium get using query====================

    // app.get("/premium", async (req, res) => {
    //   const quality = req.query.Quality;
    //   const query = { Quality: quality };
    //   const result = await articleCollection.find(query).toArray();
    //   console.log(result);
    //   res.send(result);
    // });

    // //!===================premium get using params====================
    app.get("/premium/:id", verifyToken, async (req, res) => {
      const premium = req.params.id;
      const query = { Quality: premium };
      const result = await articleCollection.find(query).toArray();
      res.send(result);
    });

    //====================!my article api======================
    app.get("/articles/myarticle", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await articleCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/articles/update/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articleCollection.findOne(query);
      res.send(result);
    });

    //!delete api myarticle
    app.delete("/articles/myarticle/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articleCollection.deleteOne(query);
      res.send(result);
    });

    //!update my article

    app.patch("/articles/update/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          title: data.title,
          image: data.image,
          publisher: data.publisher,
          tag: data.tag,
          description: data.description,
        },
      };
      const result = await articleCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //!disabled premium

    app.get("/users/premiumUser/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
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

    //!==========================payment
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: price * 100,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const data = req.body;

      const updateDoc = {
        $set: {
          premiumTaken: data.premiumTaken,
          price: data.amount,
          transactionId: data.transactionId,
          time: data.time,
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    //!=========================profile edit ========================
    app.patch("/user/profile/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const data = req.body;
      const updateDoc = {
        $set: {
          name: data.name,
          image: data.image,
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
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
  const token = jwt.sign(user, process.env.JWT_SECRET_KEY, {
    expiresIn: "250h",
  });
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
